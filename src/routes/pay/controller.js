const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const config = require("config");
const Zarin = require("zarinpal-checkout");
var fs = require("fs");
const persianDate = require("persian-date");
const axios = require("axios");
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;

const NID = "0934454299";
const CLIENT = "samar";
const ENCODED_TOKEN = "c2FtYXI6bG52VERSMnBlZDJMcTJORDZvRWg=";
const REDIRECT_URL = "https://mysamar.ir/api/fin/getAuthorization";
const { v4: uuidv4 } = require("uuid");
function addTokenTime() {
    const now = new Date();
    return new Date(now.getTime() + 864000000);
}
async function makeHttpsGet(url, authToken) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: "GET",
            headers: {
                Authorization: `Basic ${authToken}`,
            },
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve({ status: res.statusCode, data }));
        });

        req.on("error", reject);
        req.end();
    });
}

async function verifySMS(code, mobile, nid, trackId) {
    try {
        const body = JSON.stringify({
            mobile,
            otp: code,
            nid,
            trackId,
        });

        const verifyUrl = "https://api.finnotech.ir/dev/v2/oauth2/verify/sms";
        const parsedVerifyUrl = new URL(verifyUrl);

        const verifyOptions = {
            hostname: parsedVerifyUrl.hostname,
            path: parsedVerifyUrl.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${ENCODED_TOKEN}`,
                "Content-Length": Buffer.byteLength(body),
            },
        };

        // ✅ First request: Verify SMS OTP
        const verifyResponse = await new Promise((resolve, reject) => {
            const reqVerify = https.request(verifyOptions, (resVerify) => {
                let data = "";
                resVerify.on("data", (chunk) => (data += chunk));
                resVerify.on("end", () =>
                    resolve({ status: resVerify.statusCode, data })
                );
            });
            reqVerify.on("error", reject);
            reqVerify.write(body);
            reqVerify.end();
        });

        console.log("Verify SMS raw:", verifyResponse.data);

        let verifyParsed;
        try {
            verifyParsed = JSON.parse(verifyResponse.data);
        } catch (err) {
            console.error("Failed to parse verify SMS JSON:", err);
            return { token: null, refresh_token: null };
        }

        if (verifyParsed.status !== "DONE") {
            console.error("Error while verifySMS:", verifyParsed);
            return { token: null, refresh_token: null };
        }

        // ✅ Extract OTP code for token request
        const otpCode = verifyParsed.result.code;

        // ✅ Now request access token
        const tokenBody = JSON.stringify({
            grant_type: "authorization_code",
            code: otpCode,
            auth_type: "SMS",
            redirect_uri: REDIRECT_URL,
        });

        const tokenUrl = "https://api.finnotech.ir/dev/v2/oauth2/token";
        const parsedTokenUrl = new URL(tokenUrl);

        const tokenOptions = {
            hostname: parsedTokenUrl.hostname,
            path: parsedTokenUrl.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${ENCODED_TOKEN}`,
                "Content-Length": Buffer.byteLength(tokenBody),
            },
        };

        const tokenResponse = await new Promise((resolve, reject) => {
            const reqToken = https.request(tokenOptions, (resToken) => {
                let data = "";
                resToken.on("data", (chunk) => (data += chunk));
                resToken.on("end", () =>
                    resolve({ status: resToken.statusCode, data })
                );
            });
            reqToken.on("error", reject);
            reqToken.write(tokenBody);
            reqToken.end();
        });

        console.log("Token raw response:", tokenResponse.data);

        let tokenParsed;
        try {
            tokenParsed = JSON.parse(tokenResponse.data);
        } catch (err) {
            console.error("Failed to parse token JSON:", err);
            return { token: null, refresh_token: null };
        }

        if (tokenParsed.status === "DONE") {
            return {
                token: tokenParsed.result.value,
                refresh_token: tokenParsed.result.refreshToken,
            };
        } else {
            console.error("Error while getting sms token:", tokenParsed);
            return { token: null, refresh_token: null };
        }
    } catch (error) {
        console.error("Error while verifySMS:", error.message || error);
        return { token: null, refresh_token: null };
    }
}
async function getToken() {
    try {
        const url = "https://api.finnotech.ir/dev/v2/oauth2/token";

        const body = {
            grant_type: "client_credentials",
            nid: NID,
            scopes: "credit:sayad-transfers-chain-inquiry:post,card:information:get",
        };

        const response = await axios.post(url, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + ENCODED_TOKEN,
            },
        });

        console.log("Response from token:", response.data);

        if (response.data.responseCode === "FN-BRFH-20000000000") {
            return {
                token: response.data.result.value,
                refresh_token: response.data.result.refreshToken,
            };
        } else {
            console.error("Error while getting token:", response.data);
            return {
                token: null,
                refresh_token: null,
            };
        }
    } catch (err) {
        console.error("Error while getting token:", err.response);
        return {
            token: null,
            refresh_token: null,
        };
    }
}
module.exports = new (class extends controller {
    //for we dont need to create a new object only export directly a class

    async verify(req, res) {
        // console.log("req.query", JSON.stringify(req.query));
        const { Authority, Status } = req.query;

        const transAction = await this.Transactions.findOne({
            authority: Authority,
        });
        console.log("verify Authority=", Authority);
        if (!transAction) {
            // res.writeHead(404);
            // res.end();
            // res.json({
            //     status: "Failure",
            //     message: "The page you're looking for, doesn't exist!",
            // });
            res.writeHead(404, { "Content-Type": "text/html" });
            var html = fs.readFileSync("src/routes/pay/unsuccess.html");
            res.end(html);
            return;
        }
        try {
            if (transAction.done && transAction.state === 1) {
                __ioSocket.emit(transAction.stCode, {
                    queueCode: transAction.queueCode,
                });
                // res.writeHead(200, { "Content-Type": "text/html" });
                // var html = fs.readFileSync("src/routes/pay/success.html");
                // res.end(html);
                res.redirect(`https://app.${process.env.URL}`);
                return;
            }
        } catch (error) {
            res.redirect(`https://app.${process.env.URL}`);
            return;
        }
        console.log("Status", Status === "OK");
        if (Status === "OK" || Status === "ok" || Status === "Ok") {
            const pq = await this.PayQueue.findOne({
                code: transAction.queueCode,
            });

            let merchent = "";
            const radMerchent = "59e4cc62-98ba-4057-a809-bc25a4decc9b";
            if (pq) {
                if (pq.merchentId != null && pq.merchentId.length === 36) {
                    merchent = pq.merchentId;
                } else {
                    merchent = radMerchent;
                }
            } else {
                merchent = radMerchent;
            }
            try {
                let response;
                const zarinpal = Zarin.create(merchent, false);
                response = await zarinpal.PaymentVerification({
                    Amount: transAction.amount / 10,
                    Authority: Authority,
                });
                // console.log("response", response);
                if (!response) {
                    res.writeHead(404, { "Content-Type": "text/html" });
                    var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                    res.end(html);
                    return;
                }
                if (!(response.status === 100 || response.status === 101)) {
                    response = await zarinpal.PaymentVerification({
                        Amount: transAction.amount,
                        Authority: Authority,
                    });
                    // console.log("response", response);
                }
                if (response.status === 100 || response.status === 101) {
                    // console.log("response", JSON.stringify(response));
                    const tr = await this.Transactions.findByIdAndUpdate(
                        transAction._id,
                        {
                            refID: response.RefID,
                            done: true,
                            state: 1,
                        }
                    );

                    const agencyId = tr.agencyId;
                    const payQueue = await this.PayQueue.findOne(
                        { code: tr.queueCode },
                        "confirmInfo merchentId confirmPrePaid listAccCode listAccName"
                    );
                    let student = await this.Student.findOne({
                        studentCode: tr.stCode,
                    });
                    const studentName = student.name;
                    // console.log("payQueue", payQueue);
                    // console.log("student.state", student.state);
                    let agencyName = "";
                    if (student.state < 3) {
                        const school = await this.School.findById(
                            student.school,
                            "agencyId"
                        );
                        if (school) {
                            // agencyName = agency.name;
                            let kol = "003";
                            let moeen = "005";
                            await this.LevelAccDetail.findOneAndUpdate(
                                { accCode: student.studentCode },
                                {
                                    agencyId: school.agencyId,
                                }
                            );
                            await this.ListAcc.findOneAndUpdate(
                                { codeLev3: student.studentCode },
                                {
                                    agencyId: school.agencyId,
                                    code: kol + moeen + student.studentCode,
                                    codeLev2: moeen,
                                    codeLev1: kol,
                                }
                            );
                        }
                    }
                    if (payQueue.confirmInfo) {
                        if (student.state < 2) {
                            student.state = 2;
                            student.stateTitle = "تایید اطلاعات";
                            await student.save();
                        }
                    }
                    if (payQueue.confirmPrePaid) {
                        if (student.state < 3) {
                            student.state = 3;
                            student.stateTitle = "تایید پیش پرداخت";
                            await student.save();
                        }
                    }

                    let num = 0;
                    let id;
                    if (agencyId != undefined || agencyId != null) {
                        const bank = payQueue.listAccCode;
                        const bankName = payQueue.listAccName;
                        let kol = "003";
                        let moeen = "005";

                        const auth = tr.authority;
                        const checkExist = await this.CheckInfo.countDocuments({
                            agencyId,
                            type: 6,
                            serial: auth,
                        });

                        if (checkExist > 0) {
                            // return res.status(503).json({ error: "the serial is duplicated" });
                            console.log("the serial is duplicated");
                            return this.response({
                                res,
                                data: transAction,
                            });
                        }
                        const aa = bank.substring(6);

                        persianDate.toLocale("en");
                        var SalMali = new persianDate().format("YY");
                        const checkMax = await this.CheckInfo.find(
                            { agencyId },
                            "infoId"
                        )
                            .sort({ infoId: -1 })
                            .limit(1);
                        let numCheck = 1;
                        if (checkMax.length > 0) {
                            numCheck = checkMax[0].infoId + 1;
                        }
                        const infoNum = `${SalMali}-${numCheck}`;
                        let checkInfo = new this.CheckInfo({
                            agencyId,
                            editor: tr.userId,
                            infoId: numCheck,
                            infoNum,
                            seCode: "0",
                            branchCode: "",
                            branchName: "",
                            bankName: bankName,
                            serial: auth,
                            type: 6,
                            rowCount: 2,
                            infoDate: new Date(),
                            infoMoney: tr.amount,
                            accCode: bank,
                            ownerHesab: "",
                            desc: tr.desc,
                        });
                        await checkInfo.save();

                        let doc = new this.DocSanad({
                            agencyId,
                            note: tr.desc,
                            sanadDate: new Date(),
                            system: 2,
                            definite: false,
                            lock: true,
                            editor: tr.userId,
                        });
                        const code = kol + moeen + tr.stCode;
                        await doc.save();
                        num = doc.sanadId;
                        id = doc.id;
                        await new this.DocListSanad({
                            agencyId,
                            titleId: doc.id,
                            doclistId: doc.sanadId,
                            row: 1,
                            bed: tr.amount,
                            bes: 0,
                            isOnline: true,
                            mId: doc.sanadId,
                            mode: "pay",
                            note: ` ${tr.desc} به شماره پیگیری ${response.RefID}`,
                            accCode: bank,
                            peigiri: infoNum,
                        }).save();

                        await new this.DocListSanad({
                            agencyId,
                            titleId: doc.id,
                            doclistId: doc.sanadId,
                            row: 2,
                            bed: 0,
                            bes: tr.amount,
                            isOnline: true,
                            mId: tr.queueCode,
                            type: "invoice",
                            note: ` ${tr.desc} به شماره پیگیری ${response.RefID}`,
                            accCode: code,
                            peigiri: infoNum,
                        }).save();
                        await new this.CheckHistory({
                            agencyId,
                            infoId: checkInfo.id,
                            editor: tr.userId,
                            row: 1,
                            toAccCode: bank,
                            fromAccCode: code,
                            money: tr.amount,
                            status: 6,
                            desc: ` ${tr.desc} به شماره پیگیری ${response.RefID}`,
                            sanadNum: doc.sanadId,
                        }).save();
                    }

                    // await new this.PayAction({
                    //     setter: tr.userId,
                    //     agencyId: tr.agencyId,
                    //     transaction: tr.id,
                    //     queueCode: tr.queueCode,
                    //     amount: tr.amount,
                    //     desc: tr.desc,
                    //     isOnline: true,
                    //     studentCode: tr.stCode,
                    //     docSanadNum: num,
                    //     docSanadId: id,
                    // }).save();

                    __ioSocket.emit(tr.stCode, { queueCode: tr.queueCode });
                    //send sms
                    // if (tr.agencyId === null) {
                    //     const text = `مبلغ ${tr.amount} بابت ${tr.desc}`;
                    //     const postData = {
                    //         UserName: amootUser,
                    //         Password: amootPass,
                    //         SendDateTime: getFormattedDateTime(new Date()),
                    //         SMSMessageText: text,
                    //         LineNumber: "service",
                    //         Mobiles: "09151156929",
                    //     };

                    //     let config = {
                    //         method: "post",
                    //         url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                    //         headers: {
                    //             Authorization: amoot_t,
                    //             "Content-Type":
                    //                 "application/x-www-form-urlencoded",
                    //         },
                    //         data: postData,
                    //     };

                    //     axios(config)
                    //         .then(function (response) {
                    //             console.log(JSON.stringify(response.data));
                    //         })
                    //         .catch(function (error) {
                    //             console.log(error);
                    //         });
                    // }

                    //end send sms
                    // res.json({
                    //   transAction,
                    // });
                    res.redirect(`https://app.${process.env.URL}`);
                    // res.writeHead(200, { "Content-Type": "text/html" });
                    // var html = fs.readFileSync("src/routes/pay/success.html");
                    // res.end(html);
                    return;
                }
            } catch (error) {
                console.error("Error while 00021:", error);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }
            try {
                await this.Transactions.findByIdAndUpdate(transAction._id, {
                    done: true,
                    state: 2,
                });
                // res.json({
                //     status: "Failure",
                //     message: "The page you're looking for, doesn't exist!",
                // });
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            } catch (error) {
                console.error("Error while 00021:", error);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }
        } else {
            try {
                // res.json({
                //     status: "Canceled",
                //     message: "Payment was canceled by the user.",
                // });
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            } catch (error) {
                console.error("Error while 00021:", error);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }
        }
    }

    async verify2(req, res) {
        console.log("req.query", JSON.stringify(req.query));
        const {
            amount,
            invoiceid,
            cardnumber,
            rrn,
            tracenumber,
            digitalreceipt,
            issuerbank,
            respcode,
        } = req.body;
        console.log(req.body);

        const transAction = await this.Transactions.findOne({
            authority: invoiceid.toString(),
        });
        console.log("verify Authority=", invoiceid);
        if (!transAction) {
            // res.writeHead(404);
            // res.end();
            // res.json({
            //     status: "Failure",
            //     message: "The page you're looking for, doesn't exist!",
            // });
            res.writeHead(404, { "Content-Type": "text/html" });
            var html = fs.readFileSync("src/routes/pay/unsuccess.html");
            res.end(html);
            return;
        }
        try {
            if (transAction.done && transAction.state === 1) {
                __ioSocket.emit(transAction.stCode, {
                    queueCode: transAction.queueCode,
                });
                // res.writeHead(200, { "Content-Type": "text/html" });
                // var html = fs.readFileSync("src/routes/pay/success.html");
                // res.end(html);
                //mysamar.ir/downloads/pay.html
                https: res.redirect(
                    `https://${process.env.URL}/downloads/pay.html?amount=${transAction.amount}&transaction=${transAction.invoiceid}&id=${transAction.stCode}`
                );
                return;
            }
        } catch (error) {
            res.json({
                status: "Failure",
                message: "The page you're looking for, doesn't exist!",
            });
            return;
        }
        console.log(respcode);
        const checkResp = respcode == 0;
        console.log("respcode", checkResp);
        if (checkResp) {
            // const pq = await this.PayQueue.findOne({
            //     code: transAction.queueCode,
            // });
            console.log("im here");

            try {
                const url =
                    "https://sepehr.shaparak.ir:8081/V1/PeymentApi/Advice";

                const payload = {
                    digitalreceipt: digitalreceipt,
                    Tid: 99018831,
                };

                let response = await axios.post(url, payload, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                console.log("response", response.data);

                let responseData = response.data;

                if (responseData.Status === "Duplicate") {
                    return res.redirect(
                        `https://${process.env.URL}/downloads/duplicate.html?amount=${responseData.ReturnId}&transaction=${req.body.invoiceid}`
                    );
                }
                // const zarinpal = Zarin.create(merchent, false);
                // response = await zarinpal.PaymentVerification({
                //     Amount: transAction.amount / 10,
                //     Authority: Authority,
                // });
                // console.log("response", response);
                // if (!response) {
                //     res.writeHead(404, { "Content-Type": "text/html" });
                //     var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                //     res.end(html);
                //     return;
                // }
                if (responseData.Status === "NOk") {
                    response = await axios.post(url, payload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
                    responseData = response.data;
                    console.log("nok", response.data);
                    // console.log("response", response);
                }
                if (
                    responseData.Status === "Ok" ||
                    responseData.Status === "OK"
                ) {
                    // console.log("response", JSON.stringify(response));
                    const tr = await this.Transactions.findByIdAndUpdate(
                        transAction._id,
                        {
                            refID: digitalreceipt,
                            issuerbank,
                            cardnumber,
                            tracenumber,
                            rrn,
                            done: true,
                            state: 1,
                        }
                    );
                    console.log("tr", tr);

                    const agencyId = tr.agencyId;
                    const payQueue = await this.PayQueue.findOne(
                        { code: tr.queueCode },
                        "confirmInfo merchentId confirmPrePaid listAccCode listAccName"
                    );
                    let student = await this.Student.findOne({
                        studentCode: tr.stCode,
                    });
                    if (student.state < 3) {
                        school;
                        let kol = "003";
                        let moeen = "005";
                        const school = await this.School.findById(
                            student.school,
                            "agencyId"
                        );
                        if (school) {
                            await this.LevelAccDetail.findOneAndUpdate(
                                { accCode: student.studentCode },
                                {
                                    agencyId: school.agencyId,
                                }
                            );
                            await this.ListAcc.findOneAndUpdate(
                                { codeLev3: student.studentCode },
                                {
                                    agencyId: school.agencyId,
                                    code: kol + moeen + student.studentCode,
                                    codeLev2: moeen,
                                    codeLev1: kol,
                                }
                            );
                        }
                    }
                    if (payQueue.confirmInfo) {
                        if (student.state < 2) {
                            student.state = 2;
                            student.stateTitle = "تایید اطلاعات";
                            await student.save();
                        }
                    }
                    if (payQueue.confirmPrePaid) {
                        if (student.state < 3) {
                            student.state = 3;
                            student.stateTitle = "تایید پیش پرداخت";
                            await student.save();
                        }
                    }

                    console.log("ddddd");

                    let num = 0;
                    let id;
                    if (agencyId != undefined || agencyId != null) {
                        const bank = payQueue.listAccCode;
                        const bankName = payQueue.listAccName;
                        let kol = "003";
                        let moeen = "005";
                        const auth = tr.authority;
                        const checkExist = await this.CheckInfo.countDocuments({
                            agencyId,
                            type: 6,
                            serial: auth,
                        });

                        if (checkExist > 0) {
                            // return res.status(503).json({ error: "the serial is duplicated" });
                            console.log("the serial is duplicated");
                            return this.response({
                                res,
                                data: transAction,
                            });
                        }
                        // const aa = bank.substring(6);

                        persianDate.toLocale("en");
                        var SalMali = new persianDate().format("YY");
                        const checkMax = await this.CheckInfo.find(
                            { agencyId },
                            "infoId"
                        )
                            .sort({ infoId: -1 })
                            .limit(1);
                        let numCheck = 1;
                        if (checkMax.length > 0) {
                            numCheck = checkMax[0].infoId + 1;
                        }
                        const infoNum = `${SalMali}-${numCheck}`;
                        let checkInfo = new this.CheckInfo({
                            agencyId,
                            editor: tr.userId,
                            infoId: numCheck,
                            infoNum,
                            seCode: "0",
                            branchCode: "",
                            branchName: "",
                            bankName: bankName,
                            serial: auth,
                            type: 6,
                            rowCount: 2,
                            infoDate: new Date(),
                            infoMoney: tr.amount,
                            accCode: bank,
                            ownerHesab: "",
                            desc: tr.desc,
                        });
                        await checkInfo.save();

                        let doc = new this.DocSanad({
                            agencyId,
                            note: tr.desc,
                            sanadDate: new Date(),
                            system: 2,
                            definite: false,
                            lock: true,
                            editor: tr.userId,
                        });

                        const code = kol + moeen + tr.stCode;
                        await doc.save();
                        num = doc.sanadId;
                        id = doc.id;
                        await new this.DocListSanad({
                            agencyId,
                            titleId: doc.id,
                            doclistId: doc.sanadId,
                            row: 1,
                            bed: tr.amount,
                            bes: 0,
                            isOnline: true,
                            mId: doc.sanadId,
                            note: ` ${tr.desc} به شماره پیگیری ${digitalreceipt}`,
                            accCode: bank,
                            peigiri: infoNum,
                        }).save();

                        await new this.DocListSanad({
                            agencyId,
                            titleId: doc.id,
                            doclistId: doc.sanadId,
                            row: 2,
                            bed: 0,
                            bes: tr.amount,
                            isOnline: true,
                            mId: tr.queueCode,
                            type: "invoice",
                            note: ` ${tr.desc} به شماره پیگیری ${digitalreceipt}`,
                            accCode: code,
                            peigiri: infoNum,
                        }).save();
                        await new this.CheckHistory({
                            agencyId,
                            infoId: checkInfo.id,
                            editor: tr.userId,
                            row: 1,
                            toAccCode: bank,
                            fromAccCode: code,
                            money: tr.amount,
                            status: 6,
                            desc: ` ${tr.desc} به شماره پیگیری ${digitalreceipt}`,
                            sanadNum: doc.sanadId,
                        }).save();
                    }

                    console.log("before pay");

                    // await new this.PayAction({
                    //     setter: tr.userId,
                    //     transaction: tr.id,
                    //     agencyId: tr.agencyId,
                    //     queueCode: tr.queueCode,
                    //     amount: tr.amount,
                    //     desc: tr.desc,
                    //     isOnline: true,
                    //     studentCode: tr.stCode,
                    //     docSanadNum: num,
                    //     docSanadId: id,
                    // }).save();

                    //send sms
                    // if (tr.agencyId === null) {
                    //     const text = `مبلغ ${tr.amount} بابت ${tr.desc}`;
                    //     const postData = {
                    //         UserName: amootUser,
                    //         Password: amootPass,
                    //         SendDateTime: getFormattedDateTime(new Date()),
                    //         SMSMessageText: text,
                    //         LineNumber: "service",
                    //         Mobiles: "09151156929",
                    //     };

                    //     let config = {
                    //         method: "post",
                    //         url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                    //         headers: {
                    //             Authorization: amoot_t,
                    //             "Content-Type":
                    //                 "application/x-www-form-urlencoded",
                    //         },
                    //         data: postData,
                    //     };

                    //     axios(config)
                    //         .then(function (response) {
                    //             console.log(JSON.stringify(response.data));
                    //         })
                    //         .catch(function (error) {
                    //             console.log(error);
                    //         });
                    // }

                    //end send sms
                    // res.json({
                    //   transAction,
                    // });
                    res.redirect(
                        `https://${process.env.URL}/downloads/pay.html?amount=${responseData.ReturnId}&transaction=${req.body.invoiceid}&id=${tr.stCode}`
                    );
                    // res.end(html);
                    return;
                }
            } catch (error) {
                console.error("Error while 000212:", error);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }
            try {
                await this.Transactions.findByIdAndUpdate(transAction._id, {
                    done: true,
                    state: 2,
                });
                // res.json({
                //     status: "Failure",
                //     message: "The page you're looking for, doesn't exist!",
                // });
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            } catch (error) {
                console.error("Error while 000212:", error);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }
        } else {
            try {
                // res.json({
                //     status: "Canceled",
                //     message: "Payment was canceled by the user.",
                // });
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            } catch (error) {
                console.error("Error while 000212:", error);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }
        }
    }

    async verifyPrePayment(req, res) {
        // console.log("req.query", JSON.stringify(req.query));
        const {
            amount,
            invoiceid,
            cardnumber,
            rrn,
            tracenumber,
            digitalreceipt,
            issuerbank,
            respcode,
        } = req.body;
        console.log(req.body);

        const session = await this.Transactions.startSession();
        let transAction;
        // console.log("amount", amount);
        // console.log("invoiceid", invoiceid);
        // console.log("cardnumber", cardnumber);
        // console.log("rrn", rrn);
        // console.log("tracenumber", tracenumber);
        // console.log("issuerbank", issuerbank);
        // console.log("respcode", respcode);
        try {
            transAction = await this.Transactions.findOne({
                authority: invoiceid.toString(),
            }).session(session);

            if (!transAction) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                session.endSession();
                return;
            }
            console.log("verify transAction.done=", transAction.done);
            console.log("verify transAction.state=", transAction.state);
            if (transAction.done && transAction.state === 1) {
                res.redirect(
                    `https://app.${process.env.URL}/?st=${transAction.stCode}`
                );
                session.endSession();
                return;
            }

            const checkResp = respcode == 0;
            console.log("checkResp", checkResp);
            if (!checkResp) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                session.endSession();
                return;
            }

            await session.withTransaction(async () => {
                const agencySet = await this.AgencySet.findOne(
                    { agencyId: transAction.agencyId },
                    "tId defHeadLine"
                ).session(session);
                let tid = 99018831;
                let bankCode = "";
                console.log("agencySet", agencySet);
                if (agencySet && agencySet.tId) {
                    tid = agencySet.tId;
                }
                if (
                    agencySet &&
                    agencySet.defHeadLine &&
                    agencySet.defHeadLine.length > 0
                ) {
                    for (const item of agencySet.defHeadLine) {
                        if (item.title === "payGatewayHesab") {
                            bankCode = item.code;
                            break;
                        }
                    }
                }
                console.log("bankCode", bankCode);
                const tr = await this.Transactions.findByIdAndUpdate(
                    transAction._id,
                    {
                        refID: digitalreceipt,
                        issuerbank,
                        cardnumber,
                        tracenumber,
                        rrn,
                        done: true,
                        state: 1,
                        amount: amount,
                    },
                    { new: true, session }
                );

                let amountpaid = tr.amount;
                const agencyId = tr.agencyId;
                const agency = await this.Agency.findById(
                    agencyId,
                    "settings"
                ).session(session);
                if (!agency) {
                    console.error("agency not find in verifyPrePay");
                    res.writeHead(404, { "Content-Type": "text/html" });
                    var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                    res.end(html);
                    session.endSession();
                    return;
                }

                let student = await this.Student.findOne({
                    studentCode: tr.stCode,
                }).session(session);
                if (!student) {
                    console.error("student not find in verifyPrePay");
                    res.writeHead(404, { "Content-Type": "text/html" });
                    var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                    res.end(html);
                    session.endSession();
                    return;
                }
                console.log("bankCode", bankCode);

                let invoice = await this.Invoice.findOne({
                    agencyId: agencyId,
                    type: "registration",
                    active: true,
                })
                    .lean()
                    .session(session);

                let amountReg = 0;
                let confirmInfo = true;
                if (invoice) {
                    console.log("invoice.amount", invoice.amount);
                    amountReg = invoice.amount;
                    confirmInfo = invoice.confirmInfo;
                }

                let invoice2 = await this.Invoice.findOne({
                    agencyId: agencyId,
                    type: "prePayment",
                    active: true,
                })
                    .lean()
                    .session(session);
                let amount2 = 0;
                if (invoice2) {
                    amount2 = invoice2.amount;
                }
                console.log("amount2", amount2);
                console.log("student.state", student.state);
                console.log("confirmInfo", confirmInfo);

                if (confirmInfo && student.state < 2) {
                    student.state = 2;
                    student.stateTitle = "تایید اطلاعات";
                    await student.save({ session });
                }

                if (student.state < 3) {
                    student.state = 3;
                    student.stateTitle = "تایید پیش پرداخت";
                    await student.save({ session });
                }
                console.log("amountReg", amountReg);
                console.log("amountpaid", amountpaid);
                if (amountReg > 0 && amountpaid >= amountReg) {
                    amountpaid = amountpaid - amountReg;
                    let payQueue = await this.PayQueue.findOne({
                        studentId: student._id,
                        type: "registration",
                    }).session(session);

                    if (!payQueue) {
                        payQueue = new this.PayQueue({
                            inVoiceId: invoice._id,
                            code: invoice.code,
                            agencyId: agencyId,
                            studentId: student._id,
                            setter: tr.userId,
                            type: invoice.type,
                            amount: invoice.amount,
                            title: invoice.title,
                            maxDate: invoice.maxDate,
                            isPaid: true,
                            authority: tr.authority,
                            payDate: new Date(),
                        });
                        await payQueue.save({ session });
                    } else {
                        payQueue.done = true;
                        payQueue.payDate = new Date();
                        payQueue.authority = tr.authority;

                        await payQueue.save({ session });
                    }
                    console.log("payQueue=", payQueue.code);

                    const wallet = agency.settings.find(
                        (obj) => obj.wallet != undefined
                    ).wallet;
                    const costCode = agency.settings.find(
                        (obj) => obj.cost != undefined
                    ).cost;
                    if (!costCode || !wallet) {
                        throw new Error("costCode || wallet not found");
                    }
                    console.log("wallet", wallet);
                    const desc = `پرداخت ${payQueue.title} از کیف پول بابت دانش آموز ${student.name} ${student.lastName}`;
                    let doc = new this.DocSanad({
                        agencyId,
                        note: desc,
                        sanadDate: new Date(),
                        system: 3,
                        definite: false,
                        lock: true,
                        editor: tr.userId,
                    });
                    await doc.save({ session });

                    let docPaid = new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 1,
                        bed: amountReg,
                        bes: 0,
                        note: desc,
                        accCode: costCode,
                        mId: doc.sanadId,
                        isOnline: true,
                        peigiri: student.studentCode,
                        sanadDate: new Date(),
                    });
                    await docPaid.save({ session });

                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 2,
                        bed: 0,
                        bes: amountReg,
                        note: desc,
                        accCode: wallet,
                        mId: payQueue.code,
                        isOnline: true,
                        type: "invoice",
                        forCode: "003005" + student.studentCode,
                        peigiri: student.studentCode,
                        sanadDate: new Date(),
                    }).save({ session });
                }

                console.log("ddddd amountpaid", amountpaid);

                if (bankCode != "" && amountpaid > 0 && invoice2) {
                    let prePayment = await this.PayQueue.findOne({
                        agencyId: agency._id,
                        studentId: student._id,
                        type: "prePayment",
                    }).session(session);

                    if (!prePayment) {
                        prePayment = new this.PayQueue({
                            inVoiceId: invoice2._id,
                            code: invoice2.code,
                            agencyId: agency._id,
                            studentId: student._id,
                            setter: tr.userId,
                            type: invoice2.type,
                            amount: invoice2.amount,
                            title: invoice2.title,
                            maxDate: invoice2.maxDate,
                            isPaid: true,
                            payDate: new Date(),
                            authority: tr.authority,
                        });
                        await prePayment.save({ session });
                    } else {
                        prePayment.done = true;
                        prePayment.payDate = new Date();
                        prePayment.authority = tr.authority;
                        await prePayment.save({ session });
                    }

                    console.log("prePayment==", prePayment.code);
                    const bank = bankCode;
                    const bankName = "بانک شرکت";
                    let kol = "003";
                    let moeen = "005";
                    const auth = tr.authority;
                    // const checkExist = await this.CheckInfo.countDocuments({
                    //   agencyId,
                    //   type: 6,
                    //   serial: auth,
                    // }).session(session);

                    // if (checkExist > 0) {
                    //    console.error("checkExist",checkExist);
                    // }
                    console.log("xxxxxxxxxxx22222222");
                    persianDate.toLocale("en");
                    var SalMali = new persianDate().format("YY");
                    const checkMax = await this.CheckInfo.find(
                        { agencyId },
                        "infoId"
                    )
                        .sort({ infoId: -1 })
                        .limit(1)
                        .session(session);
                    let numCheck = 1;
                    if (checkMax.length > 0) {
                        numCheck = checkMax[0].infoId + 1;
                    }
                    const infoNum = `${SalMali}-${numCheck}`;
                    let checkInfo = new this.CheckInfo({
                        agencyId,
                        editor: tr.userId,
                        infoId: numCheck,
                        infoNum,
                        seCode: "0",
                        branchCode: "",
                        branchName: "",
                        bankName: bankName,
                        serial: auth,
                        type: 6,
                        rowCount: 2,
                        infoDate: new Date(),
                        infoMoney: tr.amount,
                        accCode: bank,
                        ownerHesab: "",
                        desc: tr.desc,
                    });
                    await checkInfo.save({ session });
                    console.log("tr.desc", tr.desc);
                    let doc = new this.DocSanad({
                        agencyId,
                        note: tr.desc,
                        sanadDate: new Date(),
                        system: 2,
                        definite: false,
                        lock: true,
                        editor: tr.userId,
                    });

                    await doc.save({ session });
                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 1,
                        bed: tr.amount,
                        bes: 0,
                        isOnline: true,
                        mId: doc.sanadId,
                        note: ` ${tr.desc} به شماره پیگیری ${digitalreceipt}`,
                        accCode: bank,
                        peigiri: infoNum,
                        isOnline: true,
                    }).save({ session });

                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 2,
                        bed: 0,
                        bes: tr.amount,
                        isOnline: true,
                        mId: prePayment.code,
                        type: "invoice",
                        forCode: "003005" + student.studentCode,
                        note: ` ${tr.desc} به شماره پیگیری ${digitalreceipt}`,
                        accCode: "003005" + student.studentCode,
                        peigiri: infoNum,
                    }).save({ session });
                    console.log("doc.sanadId", doc.sanadId);
                    console.log("checkInfo.id", checkInfo.id);
                    await new this.CheckHistory({
                        agencyId,
                        infoId: checkInfo.id,
                        editor: tr.userId,
                        row: 1,
                        toAccCode: bank,
                        fromAccCode: "003005" + student.studentCode,
                        money: tr.amount,
                        status: 6,
                        desc: ` ${tr.desc} به شماره پیگیری ${digitalreceipt}`,
                        sanadNum: doc.sanadId,
                    }).save({ session });
                }

                const url =
                    "https://sepehr.shaparak.ir:8081/V1/PeymentApi/Advice";
                const payload = {
                    digitalreceipt: digitalreceipt,
                    Tid: tid,
                };
                let response = await axios.post(url, payload, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                console.log("response vvvvvvvvvvvvvvvvvvery=", response.data);

                let responseData = response.data;
                if (responseData.Status === "NOk") {
                    response = await axios.post(url, payload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
                    responseData = response.data;
                    console.log("nok", response.data);
                }

                if (
                    responseData.Status === "Ok" ||
                    responseData.Status === "OK" ||
                    responseData.Status === "Duplicate"
                ) {
                    console.log("end pay");
                    res.redirect(
                        `https://${process.env.URL}/downloads/pay.html?amount=${responseData.ReturnId}&transaction=${req.body.invoiceid}&id=${tr.stCode}`
                    );
                } else {
                    throw new Error("Payment verification failed");
                }
            });
        } catch (error) {
            console.error("Error while verifyPrePayment:", error);
            res.status(500).json({
                error: error.message || "Internal Server Error.",
            });
        } finally {
            session.endSession();
        }
    }

    async verifyCo(req, res) {
        console.log("req.query", JSON.stringify(req.query));
        const auth = req.query.Authority;

        let transAction = await this.Transactions.findOne({
            authority: auth,
        });
        console.log("transAction", transAction);
        if (!transAction) {
            res.writeHead(404, { "Content-Type": "text/html" });
            var html = fs.readFileSync("src/routes/pay/unsuccess.html");
            res.end(html);
            return;
            // return this.response({
            //     res,
            //     code: 404,
            //     message: "transAction not find",
            // });
        }
        if (transAction.queueCode != 0) {
            res.writeHead(404, { "Content-Type": "text/html" });
            var html = fs.readFileSync("src/routes/pay/unsuccess.html");
            res.end(html);
            return;
            // return this.response({
            //     res,
            //     code: 404,
            //     message: "transAction not find",
            // });
        }
        if (transAction.done && transAction.state === 1) {
            return res.redirect(`https://panel.${process.env.URL}/finance`);
            // return this.response({
            //     res,
            //     data: transAction,
            // });
        }
        try {
            const zarinpal = Zarin.create(
                "59e4cc62-98ba-4057-a809-bc25a4decc9b",
                false
            );

            let response = await zarinpal.PaymentVerification({
                Amount: transAction.amount / 10,
                Authority: auth,
            });
            console.log("response", response);
            if (!(response.status === 100 || response.status === 101)) {
                response = await zarinpal.PaymentVerification({
                    Amount: transAction.amount,
                    Authority: auth,
                });
            }
            if (response.status === 100 || response.status === 101) {
                // console.log("response", JSON.stringify(response));

                const agencyId = transAction.agencyId;

                if (agencyId != undefined || agencyId != null) {
                    const agency = await this.Agency.findById(
                        agencyId,
                        "settings name admin"
                    );

                    //send sms
                    var tarikh = new persianDate().format("YY/M/D");
                    var saat = new persianDate().format("H:m");
                    const text = `شارژ پنل ${agency.name} در تاریخ ${tarikh}
                    ساعت ${saat}
                    مبلغ ${transAction.amount} انجام گردید`;

                    const postData = {
                        UserName: amootUser,
                        Password: amootPass,
                        SendDateTime: getFormattedDateTime(new Date()),
                        SMSMessageText: text,
                        LineNumber: "service",
                        Mobiles: "09151156929",
                    };

                    let config = {
                        method: "post",
                        url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                        headers: {
                            Authorization: amoot_t,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        data: postData,
                    };

                    // axios(config)
                    //     .then(function (response) {
                    //         console.log(JSON.stringify(response.data));
                    //     })
                    //     .catch(function (error) {
                    //         console.log(error);
                    //     });
                    await axios.request(config);
                    // axios(config)
                    //     .then(function (response) {
                    //         console.log("axios verifyCo", "then");
                    //     })
                    //     .catch(function (error) {
                    //         console.log("axios verifyCo error", error);
                    //     });
                    const user = await this.User.findById(
                        agency.admin,
                        "phone lastName"
                    );
                    if (user) {
                        const text2 = `آقا/ خانم ${user.lastName} گرامی
            پنل سرویس مدارس سمر شما در تاریخ ${tarikh} به مبلغ ${transAction.amount} ریال شارژ گردید
            `;

                        const postData = {
                            UserName: amootUser,
                            Password: amootPass,
                            SendDateTime: getFormattedDateTime(new Date()),
                            SMSMessageText: text2,
                            LineNumber: "service",
                            Mobiles: user.phone,
                        };

                        let config = {
                            method: "post",
                            url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                            headers: {
                                Authorization: amoot_t,
                                "Content-Type":
                                    "application/x-www-form-urlencoded",
                            },
                            data: postData,
                        };
                        await axios.request(config);
                        // axios(config)
                        //     .then(function (response) {
                        //         console.log("axios 2 verifyCo", "then");
                        //     })
                        //     .catch(function (error) {
                        //         console.log("axios 2 verifyCo error", error);
                        //     });
                    }

                    //end send sms

                    const wallet = agency.settings.find(
                        (obj) => obj.wallet != undefined
                    ).wallet;
                    const bank = transAction.stCode;

                    console.log("wallet", wallet);

                    const checkExist = await this.CheckInfo.countDocuments({
                        agencyId,
                        type: 6,
                        serial: auth,
                    });

                    if (checkExist > 0) {
                        // return res.status(503).json({ error: "the serial is duplicated" });
                        console.log("the serial is duplicated");
                        // return this.response({
                        //     res,
                        //     data: transAction,
                        // });
                        return res.redirect(
                            `https://panel.${process.env.URL}/finance`
                        );
                    }
                    const aa = bank.substring(6);
                    const level = await this.LevelAccDetail.findOne(
                        { accCode: aa, agencyId },
                        "accName"
                    );
                    if (!level) {
                        return this.response({
                            res,
                            code: 403,
                            message: "level is null!",
                        });
                    }
                    persianDate.toLocale("en");
                    var SalMali = new persianDate().format("YY");
                    const checkMax = await this.CheckInfo.find(
                        { agencyId },
                        "infoId"
                    )
                        .sort({ infoId: -1 })
                        .limit(1);
                    let numCheck = 1;
                    if (checkMax.length > 0) {
                        numCheck = checkMax[0].infoId + 1;
                    }
                    const infoNum = `${SalMali}-${numCheck}`;
                    let checkInfo = new this.CheckInfo({
                        agencyId,
                        editor: transAction.userId,
                        infoId: numCheck,
                        infoNum,
                        seCode: "0",
                        branchCode: "",
                        branchName: "",
                        bankName: level.accName,
                        serial: auth,
                        type: 6,
                        rowCount: 1,
                        infoDate: new Date(),
                        infoMoney: transAction.amount,
                        accCode: bank,
                        ownerHesab: "",
                        desc: "هزینه شارژ کیف پول",
                    });
                    await checkInfo.save();
                    let sanad = await this.DocSanad.find(
                        { agencyId },
                        "sanadId"
                    )
                        .sort({
                            sanadId: -1,
                        })
                        .limit(1);

                    let doc = new this.DocSanad({
                        agencyId,
                        note: "هزینه شارژ کیف پول",
                        sanadDate: new Date(),
                        system: 2,
                        definite: false,
                        lock: true,
                        editor: transAction.userId,
                    });
                    await doc.save();
                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 1,
                        bed: 0,
                        mId: doc.sanadId,
                        bes: transAction.amount,
                        note: `شارژ کیف پول به شماره پیگیری ${response.RefID}`,
                        accCode: bank,
                        peigiri: infoNum,
                        sanadDate: new Date(),
                    }).save();

                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 2,
                        bed: transAction.amount,
                        bes: 0,
                        mId: doc.sanadId,
                        note: `شارژ کیف پول به شماره پیگیری ${response.RefID}`,
                        accCode: wallet,
                        peigiri: infoNum,
                        sanadDate: new Date(),
                    }).save();
                    await new this.CheckHistory({
                        agencyId,
                        infoId: checkInfo.id,
                        editor: transAction.userId,
                        row: 1,
                        toAccCode: wallet,
                        fromAccCode: bank,
                        money: transAction.amount,
                        status: 6,
                        desc: `شارژ کیف پول به شماره پیگیری ${response.RefID}`,
                        sanadNum: doc.sanadId,
                        sanadDate: new Date(),
                    }).save();

                    transAction.refID = response.RefID;
                    transAction.state = 1;
                    transAction.queueCode = doc.sanadId;
                    transAction.done = true;
                    await transAction.save();
                    // return this.response({
                    //     res,
                    //     data: transAction,
                    // });
                    return res.redirect(
                        `https://panel.${process.env.URL}/finance`
                    );
                }
                return this.response({
                    res,
                    code: 403,
                    message: "agencyid is null!",
                });
            }

            transAction.state = 2;
            await transAction.save();
            // return this.response({
            //     res,
            //     data: transAction,
            // });
            return res.redirect(`https://panel.${process.env.URL}/finance`);
        } catch (error) {
            console.error("Error while 00027:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async verifyCoBank(req, res) {
        const {
            amount,
            invoiceid,
            cardnumber,
            rrn,
            tracenumber,
            digitalreceipt,
            issuerbank,
            respcode,
        } = req.body;
        console.log(req.body);

        const session = await this.Transactions.startSession();
        let transAction;
        try {
            transAction = await this.Transactions.findOne({
                authority: invoiceid.toString(),
            }).session(session);

            if (!transAction) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                session.endSession();
                return;
            }
            console.log("verify transAction.done=", transAction.done);
            console.log("verify transAction.state=", transAction.state);
            if (transAction.done && transAction.state === 1) {
                res.redirect(`https://panel.${process.env.URL}/finance`);
                session.endSession();
                return;
            }
            const checkResp = respcode == 0;
            console.log("verifyCoBank checkResp", checkResp);
            if (!checkResp) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                session.endSession();
                return;
            }
            await session.withTransaction(async () => {
                const tr = await this.Transactions.findByIdAndUpdate(
                    transAction._id,
                    {
                        refID: digitalreceipt,
                        issuerbank,
                        cardnumber,
                        tracenumber,
                        rrn,
                        done: true,
                        state: 1,
                        amount: amount,
                    },
                    { new: true, session }
                );
                const agencyId = transAction.agencyId;
                const agency = await this.Agency.findById(
                    agencyId,
                    "settings name admin"
                ).session(session);

                //send sms
                var tarikh = new persianDate().format("YY/M/D");
                var saat = new persianDate().format("H:m");
                const text = `شارژ پنل ${agency.name} در تاریخ ${tarikh}
                    ساعت ${saat}
                    مبلغ ${transAction.amount} انجام گردید`;

                const postData = {
                    UserName: amootUser,
                    Password: amootPass,
                    SendDateTime: getFormattedDateTime(new Date()),
                    SMSMessageText: text,
                    LineNumber: "service",
                    Mobiles: "09151156929",
                };

                let config = {
                    method: "post",
                    url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                    headers: {
                        Authorization: amoot_t,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data: postData,
                };

                // axios(config)
                //     .then(function (response) {
                //         console.log(JSON.stringify(response.data));
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //     });
                await axios.request(config);
                // axios(config)
                //     .then(function (response) {
                //         console.log("axios verifyCo", "then");
                //     })
                //     .catch(function (error) {
                //         console.log("axios verifyCo error", error);
                //     });
                const user = await this.User.findById(
                    agency.admin,
                    "phone lastName"
                );
                if (user) {
                    const text2 = `آقا/ خانم ${user.lastName} گرامی
            پنل سرویس مدارس سمر شما در تاریخ ${tarikh} به مبلغ ${transAction.amount} ریال شارژ گردید
            `;

                    const postData = {
                        UserName: amootUser,
                        Password: amootPass,
                        SendDateTime: getFormattedDateTime(new Date()),
                        SMSMessageText: text2,
                        LineNumber: "service",
                        Mobiles: user.phone,
                    };

                    let config = {
                        method: "post",
                        url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                        headers: {
                            Authorization: amoot_t,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        data: postData,
                    };
                    await axios.request(config);
                    // axios(config)
                    //     .then(function (response) {
                    //         console.log("axios 2 verifyCo", "then");
                    //     })
                    //     .catch(function (error) {
                    //         console.log("axios 2 verifyCo error", error);
                    //     });
                }

                //end send sms

                const wallet = agency.settings.find(
                    (obj) => obj.wallet != undefined
                ).wallet;
                const bank = transAction.stCode;

                console.log("wallet", wallet);

                const aa = bank.substring(6);
                const level = await this.LevelAccDetail.findOne(
                    { accCode: aa, agencyId },
                    "accName"
                );
                if (!level) {
                    return this.response({
                        res,
                        code: 403,
                        message: "level is null!",
                    });
                }
                persianDate.toLocale("en");
                var SalMali = new persianDate().format("YY");
                const checkMax = await this.CheckInfo.find(
                    { agencyId },
                    "infoId"
                )
                    .sort({ infoId: -1 })
                    .limit(1);
                let numCheck = 1;
                if (checkMax.length > 0) {
                    numCheck = checkMax[0].infoId + 1;
                }
                const infoNum = `${SalMali}-${numCheck}`;
                let checkInfo = new this.CheckInfo({
                    agencyId,
                    editor: tr.userId,
                    infoId: numCheck,
                    infoNum,
                    seCode: "0",
                    branchCode: "",
                    branchName: "",
                    bankName: level.accName,
                    serial: digitalreceipt,
                    type: 6,
                    rowCount: 1,
                    infoDate: new Date(),
                    infoMoney: tr.amount,
                    accCode: bank,
                    ownerHesab: "",
                    desc: "هزینه شارژ کیف پول",
                });
                await checkInfo.save();

                let doc = new this.DocSanad({
                    agencyId,
                    note: "هزینه شارژ کیف پول",
                    sanadDate: new Date(),
                    system: 2,
                    definite: false,
                    lock: true,
                    editor: tr.userId,
                });
                await doc.save();
                await new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: 1,
                    bed: 0,
                    mId: doc.sanadId,
                    bes: tr.amount,
                    isOnline: true,
                    note: `شارژ کیف پول به شماره پیگیری ${digitalreceipt}`,
                    accCode: bank,
                    peigiri: invoiceid,
                    sanadDate: new Date(),
                }).save();

                await new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: 2,
                    bed: tr.amount,
                    bes: 0,
                    mId: doc.sanadId,
                    isOnline: true,
                    note: `شارژ کیف پول به شماره پیگیری ${digitalreceipt}`,
                    accCode: wallet,
                    peigiri: invoiceid,
                    sanadDate: new Date(),
                }).save();
                await new this.CheckHistory({
                    agencyId,
                    infoId: checkInfo.id,
                    editor: tr.userId,
                    row: 1,
                    toAccCode: wallet,
                    fromAccCode: bank,
                    money: tr.amount,
                    status: 6,
                    desc: `شارژ کیف پول به شماره پیگیری ${response.RefID}`,
                    sanadNum: doc.sanadId,
                    sanadDate: new Date(),
                }).save();

                // return this.response({
                //     res,
                //     data: transAction,
                // });

                const url =
                    "https://sepehr.shaparak.ir:8081/V1/PeymentApi/Advice";
                const payload = {
                    digitalreceipt: digitalreceipt,
                    Tid: 99018831
                };
                let response = await axios.post(url, payload, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                console.log("response vvvvvvvvvvvvvvvvvvery=", response.data);

                let responseData = response.data;
                if (responseData.Status === "NOk") {
                    response = await axios.post(url, payload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
                    responseData = response.data;
                    console.log("nok", response.data);
                }

                if (
                    responseData.Status === "Ok" ||
                    responseData.Status === "OK" ||
                    responseData.Status === "Duplicate"
                ) {
                    console.log("end pay");
                    return res.redirect(
                        `https://panel.${process.env.URL}/finance`
                    );
                } else {
                    throw new Error("Payment verification failed");
                }
            });
        } catch (error) {
            console.error("Error while verifyPrePayment:", error);
            res.status(500).json({
                error: error.message || "Internal Server Error.",
            });
        } finally {
            session.endSession();
        }
    }

    async verifyCoCharge(req, res) {
        console.log("req.query", JSON.stringify(req.query));
        const auth = req.query.Authority;

        let transAction = await this.Transactions.findOne({
            authority: auth,
        });
        console.log("transAction", transAction);
        if (!transAction) {
            res.writeHead(404, { "Content-Type": "text/html" });
            var html = fs.readFileSync("src/routes/pay/unsuccess.html");
            res.end(html);
            return;
            // return this.response({
            //     res,
            //     code: 404,
            //     message: "transAction not find",
            // });
        }
        if (transAction.queueCode != -1) {
            res.writeHead(404, { "Content-Type": "text/html" });
            var html = fs.readFileSync("src/routes/pay/unsuccess.html");
            res.end(html);
            return;
            // return this.response({
            //     res,
            //     code: 404,
            //     message: "transAction not find",
            // });
        }
        if (transAction.done && transAction.state === 1) {
            return res.redirect(`https://panel.${process.env.URL}/finance`);
            // return this.response({
            //     res,
            //     data: transAction,
            // });
        }
        try {
            const zarinpal = Zarin.create(
                "59e4cc62-98ba-4057-a809-bc25a4decc9b",
                false
            );

            let response = await zarinpal.PaymentVerification({
                Amount: transAction.amount / 10,
                Authority: auth,
            });
            console.log("response", response);
            if (!(response.status === 100 || response.status === 101)) {
                response = await zarinpal.PaymentVerification({
                    Amount: transAction.amount / 10,
                    Authority: auth,
                });
            }
            if (response.status === 100 || response.status === 101) {
                // console.log("response", JSON.stringify(response));

                const agencyId = transAction.agencyId;

                if (agencyId != undefined || agencyId != null) {
                    const agency = await this.Agency.findById(
                        agencyId,
                        "settings name admin"
                    );

                    //send sms
                    var tarikh = new persianDate().format("YY/M/D");
                    var saat = new persianDate().format("H:m");
                    const text = `تسویه اعتبار پنل  ${agency.name}
        در تاریخ ${tarikh}
        ساعت ${saat}
        مبلغ ${transAction.amount}
        انجام گردید`;

                    const postData = {
                        UserName: amootUser,
                        Password: amootPass,
                        SendDateTime: getFormattedDateTime(new Date()),
                        SMSMessageText: text,
                        LineNumber: "service",
                        Mobiles: "09151156929",
                    };

                    let config = {
                        method: "post",
                        url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                        headers: {
                            Authorization: amoot_t,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        data: postData,
                    };

                    // axios(config)
                    //     .then(function (response) {
                    //         console.log(JSON.stringify(response.data));
                    //     })
                    //     .catch(function (error) {
                    //         console.log(error);
                    //     });
                    await axios.request(config);
                    // axios(config)
                    //     .then(function (response) {
                    //         console.log("axios verifyCo", "then");
                    //     })
                    //     .catch(function (error) {
                    //         console.log("axios verifyCo error", error);
                    //     });
                    const user = await this.User.findById(
                        agency.admin,
                        "phone lastName"
                    );
                    if (user) {
                        const text2 = `آقا/ خانم ${user.lastName} گرامی
            پنل سرویس مدارس سمر شما در تاریخ ${tarikh} به مبلغ ${transAction.amount} ریال افزایش اعتبار یافت
            `;

                        const postData = {
                            UserName: amootUser,
                            Password: amootPass,
                            SendDateTime: getFormattedDateTime(new Date()),
                            SMSMessageText: text2,
                            LineNumber: "service",
                            Mobiles: user.phone,
                        };

                        let config = {
                            method: "post",
                            url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                            headers: {
                                Authorization: amoot_t,
                                "Content-Type":
                                    "application/x-www-form-urlencoded",
                            },
                            data: postData,
                        };
                        await axios.request(config);
                        // axios(config)
                        //     .then(function (response) {
                        //         console.log("axios 2 verifyCo", "then");
                        //     })
                        //     .catch(function (error) {
                        //         console.log("axios 2 verifyCo error", error);
                        //     });
                    }

                    //end send sms

                    const charge = agency.settings.find(
                        (obj) => obj.charge !== undefined
                    ).charge;
                    const bank = transAction.stCode;

                    console.log("charge", charge);

                    const checkExist = await this.CheckInfo.countDocuments({
                        agencyId,
                        type: 6,
                        serial: auth,
                    });

                    if (checkExist > 0) {
                        // return res.status(503).json({ error: "the serial is duplicated" });
                        console.log("the serial is duplicated");
                        // return this.response({
                        //     res,
                        //     data: transAction,
                        // });
                        return res.redirect(
                            `https://panel.${process.env.URL}/finance`
                        );
                    }
                    const aa = bank.substring(6);
                    const level = await this.LevelAccDetail.findOne(
                        { accCode: aa, agencyId },
                        "accName"
                    );
                    if (!level) {
                        return this.response({
                            res,
                            code: 403,
                            message: "level is null!",
                        });
                    }
                    persianDate.toLocale("en");
                    var SalMali = new persianDate().format("YY");
                    const checkMax = await this.CheckInfo.find(
                        { agencyId },
                        "infoId"
                    )
                        .sort({ infoId: -1 })
                        .limit(1);
                    let numCheck = 1;
                    if (checkMax.length > 0) {
                        numCheck = checkMax[0].infoId + 1;
                    }
                    const infoNum = `${SalMali}-${numCheck}`;
                    let checkInfo = new this.CheckInfo({
                        agencyId,
                        editor: transAction.userId,
                        infoId: numCheck,
                        infoNum,
                        seCode: "0",
                        branchCode: "",
                        branchName: "",
                        bankName: level.accName,
                        serial: auth,
                        type: 6,
                        rowCount: 1,
                        infoDate: new Date(),
                        infoMoney: transAction.amount,
                        accCode: bank,
                        ownerHesab: "",
                        desc: "هزینه تسویه اعتبار",
                    });
                    await checkInfo.save();

                    let doc = new this.DocSanad({
                        agencyId,
                        note: "هزینه تسویه اعتبار پنل",
                        sanadDate: new Date(),
                        system: 2,
                        definite: false,
                        lock: true,
                        editor: transAction.userId,
                    });
                    await doc.save();
                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 1,
                        bed: 0,
                        mId: doc.sanadId,
                        bes: transAction.amount,
                        note: `افزایش اعتبار پنل به شماره پیگیری ${response.RefID}`,
                        accCode: bank,
                        peigiri: infoNum,
                    }).save();

                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 2,
                        bed: transAction.amount,
                        bes: 0,
                        mId: doc.sanadId,
                        note: `افزایش اعتبار پنل به شماره پیگیری ${response.RefID}`,
                        accCode: charge,
                        peigiri: infoNum,
                    }).save();
                    await new this.CheckHistory({
                        agencyId,
                        infoId: checkInfo.id,
                        editor: transAction.userId,
                        row: 1,
                        toAccCode: charge,
                        fromAccCode: bank,
                        money: transAction.amount,
                        status: 6,
                        desc: `شارژ کیف پول به شماره پیگیری ${response.RefID}`,
                        sanadNum: doc.sanadId,
                    }).save();

                    transAction.refID = response.RefID;
                    transAction.state = 1;
                    transAction.queueCode = doc.sanadId;
                    transAction.done = true;
                    await transAction.save();
                    // return this.response({
                    //     res,
                    //     data: transAction,
                    // });
                    return res.redirect(
                        `https://panel.${process.env.URL}/finance`
                    );
                }
                return this.response({
                    res,
                    code: 403,
                    message: "agencyid is null!",
                });
            }

            transAction.state = 2;
            await transAction.save();
            // return this.response({
            //     res,
            //     data: transAction,
            // });
            return res.redirect(`https://panel.${process.env.URL}/finance`);
        } catch (error) {
            console.error("Error while verifyCoCharge:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async sendNotifSocket(req, res) {
        try {
            const studentCodes = req.body.studentCodes;
            const notif = await this.Notification.findById(
                req.body.notifID,
                "agencyId type title text link pic updatedAt"
            );
            if (!notif) {
                return res.json({
                    code: 404,
                    message: "notif not find",
                });
            }
            if (studentCodes.length > 0) {
                console.log("sendNotifSocket to:", studentCodes.length);

                for (var st of studentCodes) {
                    __ioSocket.emit(`st${st}`, notif);
                }
            }

            return res.json({
                message: "sent",
            });
        } catch (error) {
            console.error("Error while verifyCoCharge:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async sayadTransfersChainInquiry(req, res) {
        try {
            const { sayadId, nid } = req.query;

            if (!sayadId || sayadId == "" || !nid || nid == "") {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid sayadId or nid!",
                });
            }

            const trackId = uuidv4();

            const { token, refresh_token } = await getToken();
            if (!token || !refresh_token) {
                console.log("Faild to generate auth token!");
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }

            const url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/sayadTransfersChainInquiry?trackId=${trackId}`;

            const body = {
                sayadId,
                chequeType: "1",
                idCode: nid,
            };

            const response = await axios.post(url, body, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token,
                },
            });

            if (response.data.responseCode === "FN-CTKZ-20003200000") {
                return res.json({ chain: response.data.result.chain });
            } else {
                console.error("Error while sayadChequeInquiry:", response.data);
                return res.status(500).json({ message: "Failure" });
            }
        } catch (error) {
            console.error("Error while sayadChequeInquiry:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sendSMSAuthorization(req, res) {
        try {
            const { phone } = req.query;

            if (!phone || phone == "") {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid phone!",
                });
            }

            const scopes = "credit:sms-sayady-cheque-inquiry:get";
            const url = `https://api.finnotech.ir/dev/v2/oauth2/authorize?client_id=${CLIENT}&response_type=code&redirect_uri=${REDIRECT_URL}&scope=${scopes}&mobile=${phone}&auth_type=SMS`;

            const response = await makeHttpsGet(url, ENCODED_TOKEN);

            console.log("Raw response:", response.data);

            let parsed;
            try {
                parsed = JSON.parse(response.data);
            } catch (err) {
                console.error(
                    "Failed to parse response from sendSMSAuthorization:",
                    err
                );
                return res
                    .status(500)
                    .json({ message: "Invalid JSON from API" });
            }

            if (parsed.responseCode === "FN-BRFH-20000000000") {
                return res.json({ trackId: parsed.result.trackId });
            } else {
                console.error("Error while SendSMSAuthorization:", parsed);
                return res.status(500).json({ message: "Could not send code" });
            }
        } catch (error) {
            console.error("Request Error:", error.message);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sayadChequeInquiry(req, res) {
        try {
            const { sayadId, code, mobile, nid, trackId } = req.body;
            if (
                !sayadId ||
                sayadId == "" ||
                !code ||
                code == "" ||
                !mobile ||
                mobile == "" ||
                !nid ||
                nid == "" ||
                !trackId ||
                trackId == ""
            ) {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid input!",
                });
            }

            let idType = 1;

            let token = "";
            const now = new Date();
            const user = req.user;
            const expiry = new Date(user.fin_token_expiry);

            if (expiry && expiry > now) {
                token = user.fin_token;
            } else {
                const generated_token = await verifySMS(
                    code,
                    mobile,
                    nid,
                    trackId
                );
                if (!generated_token.token || !generated_token.refresh_token) {
                    console.log("Faild to generate sms token!");
                    return res
                        .status(500)
                        .json({ error: "Internal Server Error." });
                }
                token = generated_token.token;

                const timeAdded = addTokenTime();

                const findUser = await this.User.findById(user._id);
                findUser.fin_token = generated_token.token;
                findUser.fin_refresh_token = generated_token.refresh_token;
                findUser.fin_token_expiry = timeAdded;
                await findUser.save();
                req.user = findUser;
            }

            const url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/users/${nid}/sms/sayadChequeInquiry?sayadId=${sayadId}&idType=${idType}`;

            const parsedUrl = new URL(url);

            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            const apiResponse = await new Promise((resolve, reject) => {
                const reqApi = https.request(options, (resApi) => {
                    let data = "";
                    resApi.on("data", (chunk) => (data += chunk));
                    resApi.on("end", () =>
                        resolve({ status: resApi.statusCode, data })
                    );
                });

                reqApi.on("error", (err) => reject(err));
                reqApi.end();
            });

            console.log("Raw response:", apiResponse.data);

            let parsed;
            try {
                parsed = JSON.parse(apiResponse.data);
            } catch (err) {
                console.error(
                    "Failed to parse JSON from sayadChequeInquiry:",
                    err
                );
                return res
                    .status(500)
                    .json({ message: "Invalid JSON from API" });
            }

            if (parsed.responseCode === "FN-CTKZ-20000200000") {
                return res.json({ data: parsed.result });
            } else {
                console.error("Error while sayadChequeInquiry:", parsed);
                return res
                    .status(500)
                    .json({ message: "Could not fetch data", details: parsed });
            }
        } catch (error) {
            console.error(
                "Error while sayadChequeInquiry:",
                error.message || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getCardInformation(req, res) {
        try {
            const { card } = req.query;

            const token = await getToken();

            const url =
                "https://api.finnotech.ir/mpg/v2/clients/samar/cards/" + card;

            const response = await axios.get(url, {
                headers: {
                    Authorization: "Bearer " + token,
                },
            });

            console.log(response.data);

            return res.json({ message: response.data });
        } catch (error) {
            console.error(
                "Error while getCardInformation:",
                error.message || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();

function financial(x) {
    x = x / 10000;
    x = Number.parseFloat(x).toFixed();
    x = x * 10000;
    return x;
}
function getFormattedDateTime(date) {
    if (!(date instanceof Date)) {
        throw new TypeError("Input must be a Date object");
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // zero-pad month
    const day = String(date.getDate()).padStart(2, "0"); // zero-pad day
    const hour = String(date.getHours()).padStart(2, "0"); // zero-pad hour
    const minute = String(date.getMinutes()).padStart(2, "0"); // zero-pad minute
    const second = String(date.getSeconds()).padStart(2, "0"); // zero-pad second

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
