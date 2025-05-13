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

                    await new this.PayAction({
                        setter: tr.userId,
                        agencyId: tr.agencyId,
                        transaction: tr.id,
                        queueCode: tr.queueCode,
                        amount: tr.amount,
                        desc: tr.desc,
                        isOnline: true,
                        studentCode: tr.stCode,
                        docSanadNum: num,
                        docSanadId: id,
                    }).save();

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
                res.redirect(
                    `https://pay.${process.env.URL}/pay.html?amount=${transAction.amount}&transaction=${transAction.invoiceid}&id=${transAction.stCode}`
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
                        `https://pay.samar-rad.ir/duplicate.html?amount=${responseData.ReturnId}&transaction=${req.body.invoiceid}`
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

                    await new this.PayAction({
                        setter: tr.userId,
                        transaction: tr.id,
                        agencyId: tr.agencyId,
                        queueCode: tr.queueCode,
                        amount: tr.amount,
                        desc: tr.desc,
                        isOnline: true,
                        studentCode: tr.stCode,
                        docSanadNum: num,
                        docSanadId: id,
                    }).save();

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
                        `https://pay.${process.env.URL}/pay.html?amount=${responseData.ReturnId}&transaction=${req.body.invoiceid}&id=${tr.stCode}`
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
                        bes: transAction.amount,
                        note: `شارژ کیف پول به شماره پیگیری ${response.RefID}`,
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
                        note: `شارژ کیف پول به شماره پیگیری ${response.RefID}`,
                        accCode: wallet,
                        peigiri: infoNum,
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
