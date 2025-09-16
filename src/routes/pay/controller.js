const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const config = require("config");
const soap = require("soap");
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
const TERMINALsadert = 99018831;
const TERMINALmellat = 8551948;
const userPassMellat = 15806659;
const urlVerifySaderat = "https://sepehr.shaparak.ir:8081/V1/PeymentApi/Advice";
const urlVerifyMellat = "https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl";

async function calculateFee(merchant_id, amount) {
    try {
        const response = await axios.post(
            "https://payment.zarinpal.com/pg/v4/payment/feeCalculation.json",
            {
                merchant_id,
                amount,
                currency: "IRR",
            }
        );
        console.log("کارمزد:", response.data.data.fee, "ریال");

        return response.data.data.suggested_amount;
    } catch (error) {
        console.error("خطا در محاسبه کارمزد:", error.response.data);
        return 0;
    }
}

function getDate() {
    const now = new Date();

    const localDate = now
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")
        .toString();
    const localTime = now
        .toTimeString()
        .slice(0, 8)
        .replace(/:/g, "")
        .toString();

    return { localDate, localTime };
}

async function generateMellatToken(
    amount,
    orderId,
    payerId,
    terminalID,
    userName,
    userPassword,
    additionalData,
    link = "mellatCallback",
    CellNumber
) {
    try {
        if (!amount || amount < 10000) {
            amount = 10000;
        }

        const { localDate, localTime } = getDate();

        const args = {
            terminalId: parseInt(terminalID),
            userName,
            userPassword,
            orderId: parseInt(orderId),
            amount,
            localDate,
            localTime,
            additionalData,
            mobileNo: CellNumber,
            callBackUrl: `https://server.mysamar.ir/api/pay/${link}`,
            payerId: parseInt(payerId),
        };

        var options = {
            overrideRootElement: {
                namespace: "ns1",
            },
        };

        return new Promise((resolve, reject) => {
            soap.createClient(
                "https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl",
                options,
                (err, client) => {
                    client.bpPayRequest(args, (err, result, body) => {
                        if (err) {
                            console.error(
                                "Error while generating mallet bank token:",
                                err
                            );
                            return null;
                        }

                        return resolve(result);
                    });
                }
            );
        });
    } catch (error) {
        console.error("Error while generating mellat bank token:", error);
        return null;
    }
}
// FOR ALL BANK
async function verifyPaidBankNew(
    typeBank,
    digitalreceipt,
    terminalID,
    rrn,
    userName,
    userPassword,
    amount,
    invoice
) {
    try {
        if (typeBank === "SEPEHR") {
            const url = "https://sepehr.shaparak.ir:8081/V1/PeymentApi/Advice";
            const payload = {
                digitalreceipt: digitalreceipt,
                Tid: terminalID,
            };
            let response = await axios.post(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
 
            let responseData = response.data;
 
            console.log("Sepehr gate verify response", responseData);
 
            if (responseData.Status === "NOk") {
                response = await axios.post(url, payload, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                responseData = response.data;
                console.log("nok", response.data);
                throw new Error("response Sepehr verification failed");
            }
 
            if (
                (responseData.Status === "Ok" ||
                    responseData.Status === "OK" ||
                    responseData.Status === "Duplicate") &&
                responseData.ReturnId.toString() === amount.toString()
            ) {
                return true;
            } else {
                throw new Error("Sepehr Payment verification failed");
            }
        } else if (typeBank === "BPM") {
            const args = {
                terminalId: terminalID,
                userName: userName,
                userPassword: userPassword,
                orderId: invoice,
                saleOrderId: invoice,
                saleReferenceId: rrn,
            };
 
            var options = {
                overrideRootElement: {
                    namespace: "ns1",
                },
            };
 
            const resVerify = await new Promise((resolve, reject) => {
                soap.createClient(
                    "https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl",
                    options,
                    (err, client) => {
                        client.bpVerifyRequest(args, (err, result, body) => {
                            if (err) {
                                console.error("varify paid bank", err);
                                return reject(err);
                            }
                            return resolve(result);
                        });
                    }
                );
            });
 
            if (resVerify.return == 0) {
                return true;
            }
            return false;
        } else if (typeBank === "FCP") {
            const verifyUrl =
                "https://fcp.shaparak.ir/ref-payment/RestServices/mts/verifyMerchantTrans/";
            const body = {
                WSContext: { UserId: userName, Password: userPassword },
                Token: rrn,
                RefNum: digitalreceipt,
            };
 
            const res = await axios.post(verifyUrl, body);
 
            if (res.data.Result === "erSucceed" && res.data.Amount !== "") {
                return true;
            }
            console.log("FCP gate response:", res);
            console.error(
                "Error while verifying FCP gate transaction:",
                res.data
            );
            return false;
        } else if (typeBank === "SEP") {
            const url =
                "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction";
            const body = {
                RefNum: digitalreceipt,
                TerminalNumber: terminalID,
            };
            const resp = await axios.post(url, body);
            console.log("SEP response:", resp.data);
            if (resp.data.ResultCode === 0) {
                return true;
            } else {
                return false;
            }
        } else if (typeBank === "PEC") {
            const client = await soap.createClientAsync(
                "https://pec.shaparak.ir/NewIPGServices/Confirm/ConfirmService.asmx?WSDL"
            );
 
            const params = {
                LoginAccount: terminalID,
                Token: rrn,
            };
 
            const [result] = await client.ConfirmPaymentAsync({
                requestData: params,
            });
 
            console.log("PEC response", result);
            const confirmRes = result.ConfirmPaymentResult;
 
            if (confirmRes.Status === 0) {
                return true;
            } else {
                return false;
            }
        }
        console.log("No gate found for verifyPaidBankNew", typeBank);
        return false;
    } catch (error) {
        console.error("Error while varifyPaidBankNew:", error);
        return false;
    }
}
// FOR ALL BANK
async function varifyPaidBank(
    typeBank,
    digitalreceipt,
    terminalID,
    rrn,
    userName,
    userPassword,
    amount,
    invoice
) {
    try {
        if (typeBank === "SADERAT") {
            const url = "https://sepehr.shaparak.ir:8081/V1/PeymentApi/Advice";
            const payload = {
                digitalreceipt: digitalreceipt,
                Tid: terminalID,
            };
            let response = await axios.post(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            // console.log("response varifyPaidBank SADERAT=", response.data);

            let responseData = response.data;
            if (responseData.Status === "NOk") {
                response = await axios.post(url, payload, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                responseData = response.data;
                console.log("nok", response.data);
                throw new Error("response shaparak verification failed");
            }

            if (
                (responseData.Status === "Ok" ||
                    responseData.Status === "OK" ||
                    responseData.Status === "Duplicate") &&
                responseData.ReturnId.toString() === amount.toString()
            ) {
                console.log("end verification");
                return true;
            } else {
                throw new Error("Payment verification failed");
            }
        } else if (typeBank === "MELLAT") {
            const args = {
                terminalId: terminalID,
                userName: userName,
                userPassword: userPassword,
                orderId: invoice,
                saleOrderId: invoice,
                saleReferenceId: rrn,
            };

            var options = {
                overrideRootElement: {
                    namespace: "ns1",
                },
            };

            const resVerify = await new Promise((resolve, reject) => {
                soap.createClient(
                    "https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl",
                    options,
                    (err, client) => {
                        client.bpVerifyRequest(args, (err, result, body) => {
                            if (err) {
                                console.error("varify paid bank", err);
                                return reject(err);
                            }
                            return resolve(result);
                        });
                    }
                );
            });

            if (resVerify.return == 0) {
                return true;
            }
            return false;
        } else if (typeBank === "MEHR") {
            const verifyUrl =
                "https://fcp.shaparak.ir/ref-payment/RestServices/mts/verifyMerchantTrans/";
            const body = {
                WSContext: { UserId: userName, Password: userPassword },
                Token: rrn,
                RefNum: digitalreceipt,
            };

            const res = await axios.post(verifyUrl, body);
            console.log("MEHR bank response:", res);

            if (res.data.Result === "erSucceed" && res.data.Amount !== "") {
                return true;
            }
            console.log("MEHR bank response:", res);
            console.error(
                "Error while verifying MEHR bank transaction:",
                res.data
            );
            return false;
        } else if (typeBank === "SAMAN") {
            const url =
                "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction";
            const body = {
                RefNum: digitalreceipt,
                TerminalNumber: terminalID,
            };
            const resp = await axios.post(url, body);
            console.log("respo from smana:", resp.data);
            if (resp.data.ResultCode === 0) {
                return true;
            } else {
                return false;
            }
            // const url =
            //     "https://sep.shaparak.ir/payments/referencepayment.asmx?WSDL";
            // const params = { String_1: digitalreceipt, String_2: terminalID };

            // return new Promise((resolve, reject) => {
            //     soap.createClient(url, function (err, client) {
            //         if (err) {
            //             console.error(
            //                 "Error while creating SAMAN client:",
            //                 err
            //             );
            //             return resolve(false);
            //         }
            //         client.verifyTransaction(params, function (err, res) {
            //             try {
            //                 if (err) {
            //                     console.error(
            //                         "Error while verifying SAMAN transaction:",
            //                         err
            //                     );
            //                     return resolve(false);
            //                 }
            //                 console.log(res);
            //                 const value = res.result.$value;
            //                 if (value.toString() === amount.toString()) {
            //                     return resolve(true);
            //                 } else {
            //                     console.error(
            //                         "Transaction amount mismatch:",
            //                         res.result
            //                     );
            //                     return resolve(false);
            //                 }
            //             } catch (e) {
            //                 console.error("Error inside verifyTransaction:", e);
            //                 return resolve(false);
            //             }
            //         });
            //     });
            // });
        } else if (typeBank === "TEJARAT") {
            const client = await soap.createClientAsync(
                "https://pec.shaparak.ir/NewIPGServices/Confirm/ConfirmService.asmx?WSDL"
            );

            const params = {
                LoginAccount: terminalID,
                Token: rrn,
            };

            const [result] = await client.ConfirmPaymentAsync({
                requestData: params,
            });

            console.log("result of tejarat", result);
            const confirmRes = result.ConfirmPaymentResult;

            if (confirmRes.Status === 0) {
                return true;
            } else {
                return false;
            }
        }
        console.log("varify paid  not find typeBank", typeBank);
        return false;
    } catch (error) {
        console.error("Error while varifyPaidBank:", error);
        return false;
    }
}

module.exports = new (class extends controller {

    
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
                ).session(session);

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
                // console.log("amount2", amount2);
                // console.log("student.state", student.state);
                // console.log("confirmInfo", confirmInfo);

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

                    const wallet = agency.settings.find(
                        (obj) => obj.wallet != undefined
                    ).wallet;
                    const costCode = agency.settings.find(
                        (obj) => obj.cost != undefined
                    ).cost;
                    if (!costCode || !wallet) {
                        throw new Error("costCode || wallet not found");
                    }

                    const desc = `پرداخت ${payQueue.title} آنلاین بابت دانش آموز ${student.name} ${student.lastName}`;
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
                    const auth = tr.authority;
                    // const checkExist = await this.CheckInfo.countDocuments({
                    //   agencyId,
                    //   type: 6,
                    //   serial: auth,
                    // }).session(session);

                    // if (checkExist > 0) {
                    //    console.error("checkExist",checkExist);
                    // }
                    // console.log("xxxxxxxxxxx22222222");
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
                        infoMoney: amountpaid,
                        accCode: bank,
                        ownerHesab: "",
                        desc: tr.desc,
                    });
                    await checkInfo.save({ session });
                    // console.log("tr.desc", tr.desc);
                    // console.log("ddddd amountpaid", amountpaid);
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
                        bed: amountpaid,
                        bes: 0,
                        isOnline: true,
                        mId: doc.sanadId,
                        note: ` ${tr.desc} به شماره پیگیری ${invoiceid}`,
                        accCode: bank,
                        peigiri: digitalreceipt,
                        isOnline: true,
                    }).save({ session });

                    await new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: 2,
                        bed: 0,
                        bes: amountpaid,
                        isOnline: true,
                        mId: prePayment.code,
                        type: "invoice",
                        forCode: "003005" + student.studentCode,
                        note: ` ${tr.desc} به شماره پیگیری ${invoiceid}`,
                        accCode: "003005" + student.studentCode,
                        peigiri: digitalreceipt,
                    }).save({ session });
                    // console.log("doc.sanadId", doc.sanadId);
                    // console.log("checkInfo.id", checkInfo.id);
                    await new this.CheckHistory({
                        agencyId,
                        infoId: checkInfo.id,
                        editor: tr.userId,
                        row: 1,
                        toAccCode: bank,
                        fromAccCode: "003005" + student.studentCode,
                        money: amountpaid,
                        status: 6,
                        desc: ` ${tr.desc} به شماره پیگیری ${invoiceid}`,
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

                // console.log("response=", response.data);

                let responseData = response.data;
                if (responseData.Status === "NOk") {
                    response = await axios.post(url, payload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
                    responseData = response.data;
                    // console.log("nok", response.data);
                    throw new Error("response shaparak verification failed");
                }

                if (
                    (responseData.Status === "Ok" ||
                        responseData.Status === "OK" ||
                        responseData.Status === "Duplicate") &&
                    responseData.ReturnId.toString() === amount.toString()
                ) {
                    res.redirect(
                        `https://${process.env.URL}/downloads/pay.html?amount=${responseData.ReturnId}&transaction=${req.body.invoiceid}&id=${tr.stCode}&bank=${tr.bank}`
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
            console.log("response", response.data);
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
                    // var saat = new persianDate().format("H:m");
                    const text = `شارژ پنل ${agency.name} در تاریخ ${tarikh}
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
                    if (transAction.phone && transAction.phone.length === 11) {
                        const text2 = `پنل سمر شما در تاریخ ${tarikh} به مبلغ ${transAction.amount} ریال شارژ گردید`;

                        const postData = {
                            UserName: amootUser,
                            Password: amootPass,
                            SendDateTime: getFormattedDateTime(new Date()),
                            SMSMessageText: text2,
                            LineNumber: "service",
                            Mobiles: transAction.phone,
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
    async saderatCallback(req, res) {
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
        // console.log(req.body);

        const session = await this.Transactions.startSession();
        let transAction;
        try {
            transAction = await this.Transactions.findOne({
                authority: invoiceid.toString(),
            }).session(session);

            if (!transAction) {
                await session.abortTransaction();
                session.endSession();
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            }
            console.log("verify transAction.done=", transAction.done);
            console.log("verify transAction.state=", transAction.state);
            if (transAction.done && transAction.state === 1) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect(`https://panel.${process.env.URL}/finance`);
            }
            const checkResp = respcode == 0;
            console.log("saderatCallback checkResp", checkResp);
            if (!checkResp) {
                await session.abortTransaction();
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

                const wallet = agency.settings.find(
                    (obj) => obj.wallet != undefined
                ).wallet;
                const bank = transAction.stCode;

                // console.log("wallet", wallet);

                const aa = bank.substring(6);
                const level = await this.LevelAccDetail.findOne(
                    { accCode: aa, agencyId },
                    "accName"
                ).session(session);
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
                await checkInfo.save({ session });

                let doc = new this.DocSanad({
                    agencyId,
                    note: "هزینه شارژ کیف پول",
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
                    bed: 0,
                    mId: doc.sanadId,
                    bes: tr.amount,
                    isOnline: true,
                    note: `شارژ کیف پول به شماره پیگیری ${invoiceid}`,
                    accCode: bank,
                    peigiri: digitalreceipt,
                    sanadDate: new Date(),
                }).save({ session });

                await new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: 2,
                    bed: tr.amount,
                    bes: 0,
                    mId: doc.sanadId,
                    isOnline: true,
                    note: `شارژ کیف پول به شماره پیگیری ${invoiceid}`,
                    accCode: wallet,
                    peigiri: digitalreceipt,
                    sanadDate: new Date(),
                }).save({ session });
                await new this.CheckHistory({
                    agencyId,
                    infoId: checkInfo.id,
                    editor: tr.userId,
                    row: 1,
                    toAccCode: wallet,
                    fromAccCode: bank,
                    money: tr.amount,
                    status: 6,
                    desc: `شارژ کیف پول به شماره پیگیری ${invoiceid}`,
                    sanadNum: doc.sanadId,
                    sanadDate: new Date(),
                }).save({ session });

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

                // console.log("response vvvvvvvvvvvvvvvvvvery=", response.data);

                let responseData = response.data;
                if (responseData.Status === "NOk") {
                    response = await axios.post(url, payload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
                    responseData = response.data;
                }

                if (
                    responseData.Status === "Ok" ||
                    responseData.Status === "OK" ||
                    responseData.Status === "Duplicate"
                ) {
                    var tarikh = new persianDate().format("YY/M/D");
                    // var saat = new persianDate().format("H:m");
                    const text = `شارژ پنل ${agency.name} در تاریخ ${tarikh}
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
                    const user = await this.User.findById(
                        agency.admin,
                        "phone lastName"
                    ).session(session);
                    if (transAction.phone && transAction.phone.length === 11) {
                        const text2 = `پنل سمر شما در تاریخ ${tarikh} به مبلغ ${transAction.amount} ریال شارژ گردید`;

                        const postData = {
                            UserName: amootUser,
                            Password: amootPass,
                            SendDateTime: getFormattedDateTime(new Date()),
                            SMSMessageText: text2,
                            LineNumber: "service",
                            Mobiles: transAction.phone,
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

                    return res.redirect(
                        `https://panel.${process.env.URL}/finance`
                    );
                } else {
                    throw new Error("Payment verification failed");
                }
            });
        } catch (error) {
            await session.abortTransaction();
            console.error("Error while verifying saderat transaction:", error);
            return res.status(500).json({
                error: "Error while verifying saderat transaction",
            });
        } finally {
            session.endSession();
        }
    }

    async mellatCallback(req, res) {
        const {
            RefId,
            ResCode,
            SaleOrderId,
            SaleReferenceId,
            CardHolderInfo,
            CardHolderPan,
            FinalAmount,
        } = req.body;

        const amount = FinalAmount;
        const invoiceid = SaleOrderId;
        const cardnumber = CardHolderPan;
        const rrn = "";
        const tracenumber = "";
        const digitalreceipt = RefId;
        const issuerbank = "";
        const respcode = ResCode;

        const session = await this.Transactions.startSession();
        let transAction;
        try {
            transAction = await this.Transactions.findOne({
                authority: invoiceid.toString(),
            }).session(session);

            if (!transAction) {
                res.writeHead(404, { "Content-Type": "text/html" });
                await session.abortTransaction();
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                session.endSession();
                return;
            }

            // console.log("verify transAction.done=", transAction.done);
            // console.log("verify transAction.state=", transAction.state);
            if (transAction.done && transAction.state === 1) {
                await session.abortTransaction();
                res.redirect(`https://panel.${process.env.URL}/finance`);
                session.endSession();
                return;
            }
            const checkResp = respcode == 0;
            // console.log("saderatCallback checkResp", checkResp);
            if (!checkResp) {
                res.writeHead(404, { "Content-Type": "text/html" });
                await session.abortTransaction();
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

                const wallet = agency.settings.find(
                    (obj) => obj.wallet != undefined
                ).wallet;
                const bank = transAction.stCode;

                const aa = bank.substring(6);
                const level = await this.LevelAccDetail.findOne(
                    { accCode: aa, agencyId },
                    "accName"
                ).session(session);
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
                await checkInfo.save({ session });

                let doc = new this.DocSanad({
                    agencyId,
                    note: "هزینه شارژ کیف پول",
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
                    bed: 0,
                    mId: doc.sanadId,
                    bes: tr.amount,
                    isOnline: true,
                    note: `شارژ کیف پول به شماره پیگیری ${invoiceid}`,
                    accCode: bank,
                    peigiri: digitalreceipt,
                    sanadDate: new Date(),
                }).save({ session });

                await new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: 2,
                    bed: tr.amount,
                    bes: 0,
                    mId: doc.sanadId,
                    isOnline: true,
                    note: `شارژ کیف پول به شماره پیگیری ${invoiceid}`,
                    accCode: wallet,
                    peigiri: digitalreceipt,
                    sanadDate: new Date(),
                }).save({ session });
                await new this.CheckHistory({
                    agencyId,
                    infoId: checkInfo.id,
                    editor: tr.userId,
                    row: 1,
                    toAccCode: wallet,
                    fromAccCode: bank,
                    money: tr.amount,
                    status: 6,
                    desc: `شارژ کیف پول به شماره پیگیری ${invoiceid}`,
                    sanadNum: doc.sanadId,
                    sanadDate: new Date(),
                }).save({ session });

                const args = {
                    terminalId: TERMINALmellat,
                    userName: TERMINALmellat,
                    userPassword: userPassMellat,
                    orderId: SaleOrderId,
                    saleOrderId: SaleOrderId,
                    saleReferenceId: SaleReferenceId,
                };

                var options = {
                    overrideRootElement: {
                        namespace: "ns1",
                    },
                };

                const resVerify = await new Promise((resolve, reject) => {
                    soap.createClient(
                        "https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl",
                        options,
                        (err, client) => {
                            client.bpVerifyRequest(
                                args,
                                (err, result, body) => {
                                    if (err) {
                                        //console.log(err);
                                        reject(err);
                                    }
                                    return resolve(result);
                                }
                            );
                        }
                    );
                });

                if (resVerify.return == 0) {
                    var tarikh = new persianDate().format("YY/M/D");
                    var saat = new persianDate().format("H:m");
                    const text = `شارژ پنل ${agency.name} در تاریخ ${tarikh}
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

                    await axios.request(config);
                    const user = await this.User.findById(
                        agency.admin,
                        "phone lastName"
                    ).session(session);
                    if (tr.phone && tr.phone.length === 11) {
                        const text2 = `پنل سمر شما در تاریخ ${tarikh} به مبلغ ${transAction.amount} ریال شارژ گردید`;

                        const postData = {
                            UserName: amootUser,
                            Password: amootPass,
                            SendDateTime: getFormattedDateTime(new Date()),
                            SMSMessageText: text2,
                            LineNumber: "service",
                            Mobiles: tr.phone,
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
                    }

                    await session.commitTransaction();
                    session.endSession();

                    return res.redirect(
                        `https://panel.${process.env.URL}/finance`
                    );
                } else {
                    await session.abortTransaction();
                    console.error(
                        "Failed to verify mellat transaction:",
                        resVerify
                    );
                    return res.status(400).json({
                        error: "Mellat bank error, failed to verify transaction",
                    });
                }
            });
        } catch (error) {
            await session.abortTransaction();
            console.error("Error while verifyPrePayment:", error);
            return res.status(500).json({
                error: "Mellat bank error, failed to verify transaction",
            });
        } finally {
            session.endSession();
        }
    }

    async paymentCoBank(req, res) {
        // console.log("paymentCorrrrrr")
        if (
            req.query.amount === undefined ||
            req.query.agencyId === undefined ||
            req.query.mobile === undefined ||
            req.query.userId === undefined ||
            req.query.bankListAcc === undefined
        ) {
            return this.response({
                res,
                code: 214,
                message:
                    "amount & agencyId & mobile & userId & bankListAcc need",
            });
        }
        let amount = parseInt(req.query.amount);
        const agencyId = req.query.agencyId;
        const mobile = req.query.mobile;
        const bankListAcc = req.query.bankListAcc;
        const agency = await this.Agency.findById(agencyId).lean();
        if (amount < 10000) {
            return this.response({
                res,
                code: 203,
                message: "amount not enough",
            });
        }
        // console.log("amountXXX", amount);
        if (!agency || agency.settings === null) {
            return this.response({
                res,
                code: 404,
                message: "company not find",
            });
        }
        // console.log("ip",`https://panel.${process.env.URL}/finance`)
        try {
            const desc = "شارژ آنلاین کیف شرکت " + agency.name;

            // if (bankGate.type === "MELLAT") {
            const newTr = new this.Transactions({
                userId: req.query.userId,
                amount: amount,
                bank: "MELLAT",
                desc: desc,
                queueCode: 0,
                stCode: bankListAcc,
                agencyId,
                phone: mobile,
            });
            await newTr.save();
            let token = await generateMellatToken(
                amount,
                newTr.authority,
                "0",
                TERMINALmellat,
                TERMINALmellat,
                userPassMellat,
                "",
                "mellatCallback",
                mobile
            );

            const spl = token.return;
            if (!token) {
                return res.status(201).json({
                    message: `خطای بانک ${bankGate.bankName}`,
                });
            }
            if (spl.split(",").length < 2) {
                return res.status(201).json({
                    message: `خطای بانک ${bankGate.bankName}`,
                });
            }
            return res.json({
                success: true,
                message: `https://pay.mysamar.ir/mellat.html?RefId=${
                    spl.split(",")[1]
                }&MobileNo=${mobile}`,
            });
            // }
            // else if (bankGate.type === "SADERAT") {
            // const newTr = new this.Transactions({
            //     userId: req.query.userId,
            //     amount: amount,
            //     bank: "SADERAT",
            //     desc: desc,
            //     queueCode: 0,
            //     stCode: bankListAcc,
            //     agencyId,
            // });
            // await newTr.save();
            // let token = await generateSepehrToken(
            //     amount,
            //     newTr.authority,
            //     "saderatCallback",
            //     mobile,
            //     bankGate.terminal
            // );
            // if (!token) {
            //     return res.status(201).json({
            //         message: `خطای بانک ${bankGate.bankName}`,
            //     });
            // }

            // return res.json({
            //     success: true,
            //     message: `https://pay.mysamar.ir?TerminalID=${TERMINALsadert}&token=${token}`,
            // });
            // }
        } catch (error) {
            console.error("Error while paymentCoBank:", error);
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
            // console.log("response", response);
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
    // FOR ALL BANK
    async callBack(req, res) {
        let amount = 0;
        let authority = "";
        let cardNumber = "";
        let rrn = "";
        let traceNumber = "";
        let digitalReceipt = "";
        let bankName = "";
        let respCode = "";
        let typeBank = "";
        // console.log("waiting for tejarat:", req.body);
        if (
            "RefId" in req.body &&
            "ResCode" in req.body &&
            "CardHolderPan" in req.body &&
            "FinalAmount" in req.body
        ) {
            // Body For MELLAT
            typeBank = "MELLAT";
            const {
                RefId,
                ResCode,
                SaleOrderId,
                SaleReferenceId,
                CardHolderInfo,
                CardHolderPan,
                FinalAmount,
            } = req.body;

            console.log("req.body", req.body);
            amount = FinalAmount;
            authority = SaleOrderId;
            cardNumber = CardHolderPan;
            respCode = ResCode;
            digitalReceipt = RefId;
            rrn = SaleReferenceId;
            traceNumber = CardHolderInfo;
        } else if (
            "amount" in req.body &&
            "invoiceid" in req.body &&
            "digitalReceipt" in req.body
        ) {
            // Body For SADERAT
            typeBank = "SADERAT";
            amount = req.body.amount;
            authority = req.body.invoiceid;
            cardNumber = req.body.cardnumber;
            rrn = req.body.rrn;
            traceNumber = req.body.tracenumber;
            digitalReceipt = req.body.digitalReceipt;
            respCode = req.body.respcode;
            bankName = req.body.issuerbank;
        } else if ("Authority" in req.query && "Status" in req.query) {
            // Body For ZARIN
            typeBank = "ZARIN";

            const { Authority, Status } = req.query;
            amount = 0;
            authority = Authority;
            if (!(Status === "OK" || Status === "ok" || Status === "Ok")) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            }
        } else if ("ResNum" in req.query && "transactionAmount" in req.query) {
            console.log("Req body from callback", req.query);

            const {
                ResNum,
                RefNum,
                TraceNo,
                CardMaskPan,
                State,
                transactionAmount,
                token,
            } = req.query;

            typeBank = "MEHR";
            amount = transactionAmount;
            authority = ResNum;
            cardNumber = CardMaskPan;
            traceNumber = TraceNo;
            digitalReceipt = RefNum;
            rrn = token;
            if (!(State === "OK" || State === "ok" || State === "Ok")) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                return res.end(html);
            }
        } else if (req.query.HashedCardNumber && req.query.Rrn) {
            console.log("Req body from callback saman", req.query);

            const {
                State,
                Status,
                ResNum,
                MID,
                RefNum,
                TraceNo,
                Rrn,
                Amount,
                Wage,
                HashedCardNumber,
                SecurePan,
                TerminalId,
            } = req.query;

            typeBank = "SAMAN";
            amount = Amount;
            authority = ResNum;
            cardNumber = SecurePan;
            traceNumber = TraceNo;
            digitalReceipt = RefNum;
            rrn = Rrn;
            if (!(State === "OK" || State === "ok" || State === "Ok")) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                return res.end(html);
            }
        } else if (req.body.status && req.body.Token) {
            const {
                Token,
                OrderId,
                TerminalNo,
                RRN,
                status,
                HashCardNumber,
                Amount,
            } = req.body;
            console.log("TEJARAT calloback", req.body);

            const normalizeAmount = (amountStr) => {
                return parseInt(amountStr.replace(/[^\d]/g, ""), 10);
            };

            typeBank = "TEJARAT";
            amount = normalizeAmount(Amount);
            authority = OrderId;
            cardNumber = HashCardNumber;
            rrn = Token;
            digitalReceipt = RRN;
            if (status != "0") {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                return res.end(html);
            }
        } else {
            return res.status(400).json({ error: "Invalid request body" });
        }

        let transAction;
        try {
            transAction = await this.Transactions.findOne({
                $or: [
                    { authority: authority.toString() },
                    { authorityZarin: authority.toString(), bank: "ZARIN" },
                ],
            });
            if (!transAction) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            }

            // console.log("verify transAction.done=", transAction.done);
            // console.log("verify transAction.state=", transAction.state);
            if (transAction.done && transAction.state === 1) {
                if (transAction.stCode === "") {
                    return res.redirect(
                        `https://panel.${process.env.URL}/finance`
                    );
                } else {
                    return res.redirect(
                        `https://app.${process.env.URL}/?st=${transAction.stCode}`
                    );
                }
            }
            const checkResp = respCode == 0;
            // console.log("saderatCallback checkResp", checkResp);
            if (!checkResp) {
                res.writeHead(404, { "Content-Type": "text/html" });
                var html = fs.readFileSync("src/routes/pay/unsuccess.html");
                res.end(html);
                return;
            }
            if (transAction.stCode === "") {
                //dodo
            } else {
                 if (
                    transAction.payQueueId == null ||
                    transAction.payQueueId.toString() === ""
                ) {
                    await this.verifyPrePaymentStudent(
                        res,
                        transAction,
                        traceNumber,
                        amount,
                        authority,
                        cardNumber,
                        rrn,
                        digitalReceipt,
                        bankName,
                        typeBank
                    );
                } else {
                    await this.verifyPaymentStudent(
                        res,
                        transAction,
                        traceNumber,
                        amount,
                        authority,
                        cardNumber,
                        rrn,
                        digitalReceipt,
                        bankName,
                        typeBank
                    );
                }
            }
        } catch (error) {
            console.error("Error while verifyPrePayment:", error);
            return res.status(500).json({
                error: "Mellat bank error, failed to verify transaction",
            });
        }
    }
    // FOR ALL BANK
    async verifyPrePaymentStudent(
        res,
        transAction,
        traceNumber,
        amount,
        authority,
        cardnumber,
        rrn,
        digitalreceipt,
        issuerbank,
        typeBank
    ) {
        const session = await this.Transactions.startSession();
        try {
            await session.withTransaction(
                async () => {
                    const agencyId = transAction.agencyId;
                    const  agency =this.Agency.findById(agencyId, "settings").session(
                            session
                        );
                    let bankGate;
                    if(transAction.payGateId === null || transAction.payGateId.toString().trim()===''){
                            bankGate = await this.BankGate.findOne({
                            agencyId,
                            type: typeBank,
                        }).session(session);
                        }else{
                            bankGate=await this.PayGate.findById(transAction.payGateId,'-schools').session(session);
                        }
                    // console.log("bankGate", bankGate);
                    if (!agency || !bankGate) {
                        throw new Error("Agency or bankGate not found");
                    }
                    const tid = bankGate.terminal;
                    const bankCode = bankGate.hesab;
                    if (typeBank === "ZARIN") {
                        let response;
                        const zarinpal = Zarin.create(bankGate.terminal, false);
                        const am = transAction.amount + transAction.zarinFee;
                        amount = transAction.amount;
                        response = await zarinpal.PaymentVerification({
                            Amount: am / 10,
                            Authority: authority,
                        });
                        // console.log("response", response);

                        if (
                            !(
                                response.status === 100 ||
                                response.status === 101
                            )
                        ) {
                            response = await zarinpal.PaymentVerification({
                                Amount: am,
                                Authority: authority,
                            });
                            // console.log("response", response);
                        }
                        if (
                            response.status === 100 ||
                            response.status === 101
                        ) {
                            digitalreceipt = response.RefID;
                        } else {
                            throw new Error("zarinpal verification failed");
                        }
                    }

                    console.log("tr amount", amount);
                    // Update transaction
                    const tr = await this.Transactions.findByIdAndUpdate(
                        transAction._id,
                        {
                            refID: digitalreceipt,
                            issuerbank,
                            cardnumber,
                            traceNumber,
                            rrn,
                            done: true,
                            state: 1,
                            amount: amount,
                        },
                        { new: true, session }
                    );
                    // console.log("tr after", tr);

                    if (!tr) {
                        throw new Error("Transaction not found");
                    }

                    let amountpaid = tr.amount;
                    const student = await this.Student.findOne({
                        studentCode: tr.stCode,
                    }).session(session);

                    if (!student) {
                        throw new Error("Student not found");
                    }

                    // Fetch invoices in parallel
                    const [invoice, invoice2] = await Promise.all([
                        this.Invoice.findOne({
                            agencyId,
                            type: "registration",
                            active: true,
                        })
                            .lean()
                            .session(session),
                        this.Invoice.findOne({
                            agencyId,
                            type: "prePayment",
                            active: true,
                        })
                            .lean()
                            .session(session),
                    ]);

                    let amountReg = invoice?.amount || 0;
                    let confirmInfo = invoice?.confirmInfo || false;
                    // let amount2 = invoice2?.amount || 0;

                    // Update student state
                    if (confirmInfo && student.state < 2) {
                        student.state = 2;
                        student.stateTitle = "تایید اطلاعات";
                    }
                    if (student.state < 3) {
                        student.state = 3;
                        student.stateTitle = "تایید پیش پرداخت";
                    }
                    await student.save({ session });

                    // Handle registration payment
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
                                agencyId,
                                studentId: student._id,
                                setter: tr.userId,
                                type: invoice.type,
                                amount: invoice.amount,
                                title: invoice.title,
                                maxDate: invoice.maxDate,
                                isPaid: true,
                                isSetAuto: true,
                                authority: tr.authority,
                                payDate: new Date(),
                            });
                        } else {
                            payQueue.isPaid = true;
                            payQueue.isSetAuto = true;
                            payQueue.payDate = new Date();
                            payQueue.authority = tr.authority;
                        }
                        await payQueue.save({ session });

                        const wallet = agency.settings.find(
                            (obj) => obj.wallet
                        )?.wallet;
                        const costCode = agency.settings.find(
                            (obj) => obj.cost
                        )?.cost;

                        if (!costCode || !wallet) {
                            throw new Error("costCode or wallet not found");
                        }

                        const desc = `پرداخت ${payQueue.title} آنلاین بابت دانش آموز ${student.name} ${student.lastName}`;
                        const doc = new this.DocSanad({
                            agencyId,
                            note: desc,
                            sanadDate: new Date(),
                            system: 3,
                            definite: false,
                            lock: true,
                            editor: tr.userId,
                        });
                        await doc.save({ session });

                        await Promise.all([
                            new this.DocListSanad({
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
                            }).save({ session }),
                            new this.DocListSanad({
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
                            }).save({ session }),
                        ]);
                    }

                    // Handle pre-payment
                    if (bankCode && amountpaid > 0 && invoice2) {
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
                                amount: amountpaid,
                                title: invoice2.title,
                                maxDate: invoice2.maxDate,
                                isPaid: true,
                                isSetAuto: true,
                                payDate: new Date(),
                                authority: tr.authority,
                            });
                        } else {
                            prePayment.isPaid = true;
                            prePayment.isSetAuto = true;
                            prePayment.payDate = new Date();
                            prePayment.authority = tr.authority;
                        }
                        await prePayment.save({ session });

                        const bankName = "بانک شرکت";
                        const auth = tr.authority;
                        persianDate.toLocale("en");
                        const SalMali = new persianDate().format("YY");
                        const checkMax = await this.CheckInfo.find(
                            { agencyId },
                            "infoId"
                        )
                            .sort({ infoId: -1 })
                            .limit(1)
                            .session(session);
                        const numCheck =
                            checkMax.length > 0 ? checkMax[0].infoId + 1 : 1;
                        const infoNum = `${SalMali}-${numCheck}`;

                        const checkInfo = new this.CheckInfo({
                            agencyId,
                            editor: tr.userId,
                            infoId: numCheck,
                            infoNum,
                            seCode: "0",
                            branchCode: "",
                            branchName: "",
                            bankName,
                            serial: auth,
                            type: 6,
                            rowCount: 2,
                            infoDate: new Date(),
                            infoMoney: amountpaid,
                            accCode: bankCode,
                            ownerHesab: "",
                            desc: tr.desc,
                        });
                        await checkInfo.save({ session });

                        const doc = new this.DocSanad({
                            agencyId,
                            note: tr.desc,
                            sanadDate: new Date(),
                            system: 2,
                            definite: false,
                            lock: true,
                            editor: tr.userId,
                        });
                        await doc.save({ session });

                        await Promise.all([
                            new this.DocListSanad({
                                agencyId,
                                titleId: doc.id,
                                doclistId: doc.sanadId,
                                row: 1,
                                bed: amountpaid,
                                bes: 0,
                                isOnline: true,
                                mId: doc.sanadId,
                                note: `${tr.desc} به شماره پیگیری ${authority}`,
                                accCode: bankCode,
                                peigiri: digitalreceipt,
                            }).save({ session }),
                            new this.DocListSanad({
                                agencyId,
                                titleId: doc.id,
                                doclistId: doc.sanadId,
                                row: 2,
                                bed: 0,
                                bes: amountpaid,
                                isOnline: true,
                                mId: prePayment.code,
                                type: "invoice",
                                forCode: "003005" + student.studentCode,
                                note: `${tr.desc} به شماره پیگیری ${authority}`,
                                accCode: "003005" + student.studentCode,
                                peigiri: digitalreceipt,
                            }).save({ session }),
                            new this.CheckHistory({
                                agencyId,
                                infoId: checkInfo.id,
                                editor: tr.userId,
                                row: 1,
                                toAccCode: bankCode,
                                fromAccCode: "003005" + student.studentCode,
                                money: amountpaid,
                                status: 6,
                                desc: `${tr.desc} به شماره پیگیری ${authority}`,
                                sanadNum: doc.sanadId,
                            }).save({ session }),
                        ]);
                    }

                    if (typeBank !== "ZARIN") {
                         const isNew=tr.payGateId===null || tr.payGateId.toString().trim()==='';
                        const done =isNew?await verifyPaidBankNew(
                            typeBank,
                            digitalreceipt,
                            tid,
                            rrn,
                            bankGate.userName,
                            bankGate.userPass,
                            tr.amount,
                            tr.authority
                        ) :await varifyPaidBank(
                            typeBank,
                            digitalreceipt,
                            tid,
                            rrn,
                            bankGate.userName,
                            bankGate.userPass,
                            tr.amount,
                            tr.authority
                        ) ;

                        if (!done) {
                            throw new Error("Payment verification failed");
                        }
                    }

                    return res.redirect(
                        `https://${
                            process.env.URL
                        }/downloads/pay.html?amount=${amount}&transaction=${authority}&id=${
                            tr.stCode
                        }&bank=${bankGate.bankName || transAction.bank}`
                    );
                },
                {
                    // Transaction options
                    readConcern: { level: "snapshot" },
                    writeConcern: { w: "majority" },
                }
            );
        } catch (error) {
            console.error("Error in verifyPrePayment:", error);
            res.redirect(`https://pay.mysamar.ir/failed.html`);
            return;
        } finally {
            await session.endSession();
        }
    }

    // FOR ALL BANK
    async verifyPaymentStudent(
        res,
        transAction,
        traceNumber,
        amount,
        authority,
        cardnumber,
        rrn,
        digitalreceipt,
        issuerbank,
        typeBank
    ) {
        const session = await this.Transactions.startSession();
        try {
            await session.withTransaction(
                async () => {
                    // console.log("verifyPaymentStudent", transAction.payQueueId);
                    const agencyId = transAction.agencyId;
                    let payQueue = await this.PayQueue.findById(
                        transAction.payQueueId
                    ).session(session);
                    if (!payQueue) {
                        throw new Error("payQueue not found");
                    }
                    let invoice = await this.Invoice.findById(
                        payQueue.inVoiceId
                    ).session(session);
                    if (!invoice) {
                        throw new Error("invoice not found");
                    }
                    // console.log("payQueue", payQueue.authority);
                    let bankGate;
                    if (payQueue.type === "registration") {
                        bankGate = {
                            type: "MELLAT",
                            terminal: "8551948",
                            userName: "8551948",
                            userPass: "15806659",
                            hesab: "001003000000016",
                            bankName: "ملت",
                            bankCode: "MEL",
                        };
                    } else {
                        if(transAction.payGateId === null || transAction.payGateId.toString().trim()===''){
                            bankGate = await this.BankGate.findOne({
                            agencyId,
                            type: typeBank,
                        }).session(session);
                        }else{
                            bankGate=await this.PayGate.findById(transAction.payGateId,'-schools').session(session);
                        }
                    }

                    // console.log("bankGate", bankGate);
                    if (!bankGate) {
                        throw new Error(" bankGate not found");
                    }
                    const tid = bankGate.terminal;
                    const bankCode = bankGate.hesab;
                    if (!bankCode || bankCode.toString().trim() === "") {
                        throw new Error("bankCode not defaind");
                    }

                    if (typeBank === "ZARIN") {
                        let response;
                        const zarinpal = Zarin.create(bankGate.terminal, false);
                        const am = transAction.amount + transAction.zarinFee;
                        amount = transAction.amount;
                        response = await zarinpal.PaymentVerification({
                            Amount: am / 10,
                            Authority: authority,
                        });
                        console.log("zarinpal response", response);

                        if (
                            !(
                                response.status === 100 ||
                                response.status === 101
                            )
                        ) {
                            response = await zarinpal.PaymentVerification({
                                Amount: am,
                                Authority: authority,
                            });
                            console.log(
                                "response after zarinpal retry",
                                response
                            );
                        }
                        if (
                            response.status === 100 ||
                            response.status === 101
                        ) {
                            digitalreceipt = response.RefID;
                        } else {
                            throw new Error("zarinpal verification failed");
                        }
                    }

                    // console.log("tr amount", amount);
                    const tr = await this.Transactions.findByIdAndUpdate(
                        transAction._id,
                        {
                            refID: digitalreceipt,
                            issuerbank,
                            cardnumber,
                            traceNumber,
                            rrn,
                            done: true,
                            state: 1,
                            amount: amount,
                        },
                        { new: true, session }
                    );
                    // console.log("tr after", tr);

                    if (!tr) {
                        throw new Error("Transaction not found");
                    }

                    const student = await this.Student.findOne({
                        studentCode: tr.stCode,
                    }).session(session);

                    if (!student) {
                        throw new Error("Student not found");
                    }

                    let confirmInfo = invoice?.confirmInfo || false;
                    let confirmPrePaid = invoice?.confirmPrePaid || false;
                    // let amount2 = invoice2?.amount || 0;

                    // Update student state
                    if (confirmInfo && student.state < 2) {
                        student.state = 2;
                        student.stateTitle = "تایید اطلاعات";
                    }
                    if (confirmPrePaid && student.state < 3) {
                        student.state = 3;
                        student.stateTitle = "تایید پیش پرداخت";
                    }
                    await student.save({ session });
                    payQueue.isPaid = true;
                    payQueue.isSetAuto = true;
                    payQueue.payDate = new Date();
                    payQueue.authority = tr.authority;
                    await payQueue.save({ session });

                    if (invoice.type != "registration") {
                        const bankName = "بانک شرکت";
                        const auth = tr.authority;
                        persianDate.toLocale("en");
                        const SalMali = new persianDate().format("YY");
                        const checkMax = await this.CheckInfo.find(
                            { agencyId },
                            "infoId"
                        )
                            .sort({ infoId: -1 })
                            .limit(1)
                            .session(session);
                        const numCheck =
                            checkMax.length > 0 ? checkMax[0].infoId + 1 : 1;
                        const infoNum = `${SalMali}-${numCheck}`;

                        const checkInfo = new this.CheckInfo({
                            agencyId,
                            editor: tr.userId,
                            infoId: numCheck,
                            infoNum,
                            seCode: "0",
                            branchCode: "",
                            branchName: "",
                            bankName,
                            serial: auth,
                            type: 6,
                            rowCount: 2,
                            infoDate: new Date(),
                            infoMoney: tr.amount,
                            accCode: bankCode,
                            ownerHesab: "",
                            desc: tr.desc,
                        });
                        await checkInfo.save({ session });

                        const doc = new this.DocSanad({
                            agencyId,
                            note: tr.desc,
                            sanadDate: new Date(),
                            system: 2,
                            definite: false,
                            lock: true,
                            editor: tr.userId,
                        });
                        await doc.save({ session });

                        await Promise.all([
                            new this.DocListSanad({
                                agencyId,
                                titleId: doc.id,
                                doclistId: doc.sanadId,
                                row: 1,
                                bed: tr.amount,
                                bes: 0,
                                isOnline: true,
                                mId: doc.sanadId,
                                note: `${tr.desc} به شماره پیگیری ${authority}`,
                                accCode: bankCode,
                                peigiri: digitalreceipt,
                            }).save({ session }),
                            new this.DocListSanad({
                                agencyId,
                                titleId: doc.id,
                                doclistId: doc.sanadId,
                                row: 2,
                                bed: 0,
                                bes: tr.amount,
                                isOnline: true,
                                mId: payQueue.code,
                                type: "invoice",
                                forCode: "003005" + student.studentCode,
                                note: `${tr.desc} به شماره پیگیری ${authority}`,
                                accCode: "003005" + student.studentCode,
                                peigiri: digitalreceipt,
                            }).save({ session }),
                            new this.CheckHistory({
                                agencyId,
                                infoId: checkInfo.id,
                                editor: tr.userId,
                                row: 1,
                                toAccCode: bankCode,
                                fromAccCode: "003005" + student.studentCode,
                                money: tr.amount,
                                status: 6,
                                desc: `${tr.desc} به شماره پیگیری ${authority}`,
                                sanadNum: doc.sanadId,
                            }).save({ session }),
                        ]);
                    } else {
                        let prePayment = await this.PayQueue.findOne({
                            agencyId: student.agencyId,
                            studentId: student._id,
                            type: "prePayment",
                        }).session(session);
                        // console.log("!prePayment", !prePayment);
                        if (!prePayment) {
                            let invoice2 = await this.Invoice.findOne({
                                agencyId: student.agencyId,
                                type: "prePayment",
                                active: true,
                            }).lean();
                            // console.log("!invoice2", !invoice2);
                            let amount2 = 0;
                            if (invoice2) {
                                let findSchool = false;
                                if (invoice2.schools.length > 0) {
                                    for (var sc of invoice2.schools) {
                                        if (
                                            sc.id.toString() ===
                                            student.school.toString()
                                        ) {
                                            amount2 = sc.amount;
                                            findSchool = true;
                                        }
                                    }
                                }
                                if (!findSchool) {
                                    if (
                                        invoice2.distancePrice &&
                                        invoice2.distancePrice.length > 0
                                    ) {
                                        const matchedPricing =
                                            invoice2.distancePrice.find(
                                                function (priceItem) {
                                                    return (
                                                        priceItem.maxDistance *
                                                            1000 >=
                                                        student.serviceDistance
                                                    );
                                                }
                                            );
                                        if (matchedPricing) {
                                            amount2 = matchedPricing.amount;
                                        } else {
                                            amount2 =
                                                invoice2.distancePrice[
                                                    invoice2.distancePrice
                                                        .length - 1
                                                ].amount;
                                        }
                                    } else {
                                        amount2 = invoice2.amount;
                                    }
                                }
                            }
                            prePayment = new this.PayQueue({
                                inVoiceId: invoice2._id,
                                code: invoice2.code,
                                agencyId: student.agencyId,
                                studentId: student._id,
                                setter: tr.userId,
                                type: invoice2.type,
                                amount: amount2,
                                title: invoice2.title,
                                maxDate: invoice2.maxDate,
                            });
                            await prePayment.save({ session });
                        }
                    }

                    if (typeBank !== "ZARIN") {
                        const isNew=tr.payGateId===null || tr.payGateId.toString().trim()==='';
                        const done =isNew?await verifyPaidBankNew(
                            typeBank,
                            digitalreceipt,
                            tid,
                            rrn,
                            bankGate.userName,
                            bankGate.userPass,
                            tr.amount,
                            tr.authority
                        ) :await varifyPaidBank(
                            typeBank,
                            digitalreceipt,
                            tid,
                            rrn,
                            bankGate.userName,
                            bankGate.userPass,
                            tr.amount,
                            tr.authority
                        ) ;

                        if (!done) {
                            throw new Error("Payment verification failed");
                        }
                    }
                    const url = `https://${
                        process.env.URL
                    }/downloads/pay.html?amount=${amount}&transaction=${authority}&id=${
                        tr.stCode
                    }&bank=${bankGate.bankName || transAction.bank}`;
                    // console.log("url",url);
                    return res.redirect(url);
                },
                {
                    // Transaction options
                    readConcern: { level: "snapshot" },
                    writeConcern: { w: "majority" },
                }
            );
        } catch (error) {
            console.error("Error in verifyPaymentStudent:", error);
            res.redirect(`https://pay.mysamar.ir/failed.html`);
            return;
        } finally {
            await session.endSession();
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
