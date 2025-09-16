const controller = require("../controller");
const axios = require("axios");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Zarin = require("zarinpal-checkout");
const soap = require("soap");

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

        return response.data.data.fee;
    } catch (error) {
        console.error("خطا در محاسبه کارمزد:", error.response.data);
        return 0;
    }
}

async function generateTejaratToken(amount, orderId, pin) {
    const wsdl =
        "https://pec.shaparak.ir/NewIPGServices/Sale/SaleService.asmx?WSDL";

    const params = {
        LoginAccount: pin,
        Amount: amount,
        OrderId: orderId,
        CallBackUrl: "https://server.mysamar.ir/api/pay/callback",
        // AdditionalData: JSON.stringify(addData),
        Originator: "",
    };

    // console.log("params", params);

    try {
        const client = await soap.createClientAsync(wsdl);
        const [result] = await client.SalePaymentRequestAsync({
            requestData: params,
        });
        console.log("Tejarat response", result);
        const res = result.SalePaymentRequestResult;

        if (res && Number(res.Status) === 0 && res.Token) {
            return res.Token;
        } else {
            console.error("PEC error:", res);
            return null;
        }
    } catch (err) {
        console.error(
            "SOAP lib error:",
            err && err.message ? err.message : err
        );
        return null;
    }
}

async function generateMellatToken(
    amount,
    orderId,
    payerId,
    terminalID,
    userName,
    userPassword,
    additionalData,
    link = "callback",
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
                        console.log("result in generate mellat", result);
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

async function generateSepehrToken(
    amount,
    invoice,
    link = "callback",
    CellNumber,
    terminalID
) {
    try {
        if (!amount || amount < 10000) {
            amount = 10000;
        }
        const URL = "https://sepehr.shaparak.ir:8081/V1/PeymentApi/GetToken";

        const data = {
            Amount: amount,
            callbackUrl: `https://server.mysamar.ir/api/pay/${link}`,
            invoiceID: invoice,
            terminalID,
            payload: "",
            CellNumber,
        };

        const response = await axios.post(URL, data, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.data.Status === 0) {
            return response.data.Accesstoken;
        }
        return null;
    } catch (error) {
        console.error("Error while generating sepehr bank token:", error);
        return null;
    }
}

async function generateMehrToken(
    amount,
    reserveNum,
    username,
    password,
    mobileNo
) {
    try {
        if (!amount || amount < 10000) {
            amount = 10000;
        }

        const body = {
            WSContext: { UserId: username, Password: password },
            TransType: "EN_GOODS",
            ReserveNum: reserveNum,
            Amount: amount,
            RedirectUrl: "https://hoshmand-seir.ir/callback.php",
            MobileNo: mobileNo,
            UserId: mobileNo,
        };

        const response = await axios.post(
            "https://fcp.shaparak.ir/ref-payment/RestServices/mts/generateTokenWithNoSign/",
            body
        );

        const token = response.data.Token;
        if (token && token !== "") {
            return token;
        }
        return null;
    } catch (error) {
        console.error("Error while generating mehr bank token:", error);
        return null;
    }
}

async function generateSamanToken(
    amount,
    reserveNum,
    terminalId,
    phone,
    callback
) {
    try {
        if (!amount || amount < 10000) {
            amount = 10000;
        }
        let redirect = `https://${callback}/saman.php`;

        if (callback.includes("mysamar")) {
            redirect = "https://server.mysamar.ir/api/pay/callback";
        }

        const url = "https://sep.shaparak.ir/onlinepg/onlinepg";

        const body = {
            action: "token",
            TerminalId: terminalId,
            Amount: amount,
            ResNum: reserveNum,
            RedirectUrl: redirect,
            CellNumber: phone,
        };

        const response = await axios.post(url, body);
        const token = response.data.token;
        if (!token) {
            return null;
        }
        return token;
    } catch (error) {
        console.error("Error while generating saman bank token:", error);
        return null;
    }
}

module.exports = new (class extends controller {
    async prePaymentLink(req, res) {
        if (
            req.query.agencyId === undefined ||
            req.query.studentId === undefined
        ) {
            return this.response({
                res,
                code: 214,
                message: "agencyId , studentId  need",
            });
        }
        const agencyId = req.query.agencyId;
        const bank = req.query.bank || "";
        // console.log("bank", bank);
        let bankGate =
            bank.trim() === ""
                ? await this.PayGate.findOne({
                      agencyId,
                      active: true,
                      type: { $ne: "CARD" },
                  })
                : await this.PayGate.findOne({
                      agencyId,
                      active: true,
                      type: bank.trim(),
                  });
        // console.log("bankGate", bankGate);
        if (!bankGate) {
            bankGate =
                bank.trim() === ""
                    ? await this.BankGate.findOne({
                          agencyId,
                          active: true,
                          type: { $ne: "CARD" },
                      })
                    : await this.BankGate.findOne({
                          agencyId,
                          active: true,
                          type: bank.trim(),
                      });
        }
        if (!bankGate) {
            return this.response({
                res,
                code: 400,
                message: "bankGate not find",
            });
        }
        const studentId = req.query.studentId;
        let desc = req.query.desc;

        const student = await this.Student.findById(
            studentId,
            "studentCode name lastName serviceDistance school"
        ).lean();

        if (!student) {
            return this.response({
                res,
                code: 404,
                message: "student not find",
            });
        }
        let invoice = await this.Invoice.findOne(
            {
                agencyId: agencyId,
                type: "registration",
                active: true,
            },
            "amount title desc"
        ).lean();
        let amount = 0;
        let title = "";
        if (invoice) {
            amount = invoice.amount;
            title = invoice.title;
        }
        let invoice2 = await this.Invoice.findOne(
            {
                agencyId: agencyId,
                type: "prePayment",
                active: true,
            },
            "amount title desc distancePrice schools"
        ).lean();
        let amount2 = 0;
        if (invoice2) {
            let findSchool = false;
            if (invoice2.schools.length > 0) {
                for (var sc of invoice2.schools) {
                    if (sc.id.toString() === student.school.toString()) {
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
                    const matchedPricing = invoice2.distancePrice.find(
                        function (priceItem) {
                            return (
                                priceItem.maxDistance * 1000 >=
                                student.serviceDistance
                            );
                        }
                    );
                    if (matchedPricing) {
                        amount2 = matchedPricing.amount;
                    } else {
                        amount2 =
                            invoice2.distancePrice[
                                invoice2.distancePrice.length - 1
                            ].amount;
                    }
                } else {
                    amount2 = invoice2.amount;
                }
            }
            if (title === "") {
                title = invoice2.title;
            }
        }
        if (amount === 0 && amount2 === 0) {
            return this.response({
                res,
                code: 203,
                message: "invoice not find",
            });
        }

        desc = title + " " + student.name + " " + student.lastName;

        let agency = await this.Agency.findById(agencyId, "settings name");
        if (agency) {
            desc = desc + " شرکت " + agency.name;
        } else {
            return this.response({
                res,
                code: 404,
                message: "agency not find",
            });
        }

        if (amount + amount2 < 10000) {
            console.log("amount < 10000", amount);
            return this.response({
                res,
                code: 203,
                message: "amount not enough",
            });
        }

        let newAmount = Math.ceil(amount + amount2);

        // console.log("amount", amount);
        // console.log("amount2", amount2);
        // console.log("desc", desc);
        // if (bankGate.type === "MEHR" || bankGate.type === "SAMAN") {
        //     amount = 5000;
        //     amount2 = 5000;
        // }
        // if (
        //   req.user._id == "686e0cf5ee410a203824a9d5" ||
        //   req.user._id == "687e1a4464a746341a0085b5"
        // ) {
        //   newAmount = 30000;
        // }
        try {
            let newTr = new this.Transactions({
                userId: req.user._id,
                amount: newAmount,
                bank: bankGate.type,
                desc,
                queueCode: 0,
                stCode: student.studentCode,
                agencyId,
                phone: req.user.phone,
            });
            await newTr.save();

            console.log("bankGate.type", bankGate.type);
            if (bankGate.type === "SADERAT" || bankGate.type === "SEPEHR") {
                //**********************************************SADERAT******************************************************* */
                let token = await generateSepehrToken(
                    newAmount,
                    newTr.authority,
                    "callBack",
                    req.user.phone,
                    bankGate.terminal
                );
                if (!token) {
                    return res.status(201).json({
                        message: "خطای بانک",
                    });
                }

                return res.json({
                    success: true,
                    message: `https://pay.samar-rad.ir?TerminalID=${bankGate.terminal}&token=${token}`,
                });
            } else if (bankGate.type === "MELLAT" || bankGate.type === "BPM") {
                //**********************************************MELLAT******************************************************* */
                let token = await generateMellatToken(
                    newAmount,
                    newTr.authority,
                    "0",
                    bankGate.terminal,
                    bankGate.userName,
                    bankGate.userPass,
                    "",
                    "callBack",
                    req.user.phone
                );
                const spl = token.return;
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }
                console.log("spl mellat", spl);

                return res.json({
                    success: true,
                    message: `https://pay.mysamar.ir/mellat.html?RefId=${
                        spl.split(",")[1]
                    }&MobileNo=${req.user.phone}`,
                });
            } else if (bankGate.type === "ZARIN") {
                //**********************************************ZARIN******************************************************* */
                if (!bankGate.callback || bankGate.callback == "") {
                    return res.status(201).json({
                        status: "Error",
                        message: "خطای بانک",
                    });
                }
                const zarinpal = Zarin.create(bankGate.terminal, false);
                console.log("newAmount", newAmount);
                let fee = await calculateFee(bankGate.terminal, newAmount);
                console.log("fee", fee);
                const am = newAmount / 10 + fee / 10;
                console.log("amount with fee", am);
                const response = await zarinpal.PaymentRequest({
                    Amount: Math.ceil(am),
                    // CallbackURL: "http://192.168.0.122:9000/api/pay/verify",
                    // CallbackURL: `https://server.mysamar.ir/api/pay/callBack`,
                    CallbackURL: `https://${bankGate.callback}/callback.php`,
                    Description: desc,
                    Email: "",
                    Mobile: req.user.phone,
                });
                newTr.zarinFee = fee;
                await newTr.save();
                if (response.status === 100) {
                    newTr.authorityZarin = response.authority;
                    await newTr.save();
                    // res.redirect(https://panel.${process.env.URL}/finance);
                    res.json({
                        message: response.url,
                    });
                    return;
                }
                return res.status(201).json({
                    status: "Error",
                    message: "خطای بانک",
                });
            } else if (bankGate.type === "MEHR" || bankGate.type === "FCP") {
                //**********************************************MEHR******************************************************* */
                let token = await generateMehrToken(
                    newAmount,
                    newTr.authority,
                    bankGate.userName,
                    bankGate.userPass,
                    req.user.phone
                );
                // console.log("token mehr", token);
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }

                return res.json({
                    success: true,
                    message: `https://fcp.shaparak.ir/_ipgw_/payment/?token=${token}&lang=fa`,
                });
            } else if (bankGate.type === "SAMAN" || bankGate.type === "SEP") {
                //**********************************************SAMAN******************************************************* */
                let token = await generateSamanToken(
                    newAmount,
                    newTr.authority,
                    bankGate.terminal,
                    req.user.phone,
                    bankGate.callback
                );
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }

                return res.json({
                    success: true,
                    message: `https://pay.mysamar.ir/saman.html?token=${token}`,
                });
            } else if (bankGate.type === "TEJARAT" || bankGate.type === "PEC") {
                //**********************************************TEJARAT******************************************************* */
                let token = await generateTejaratToken(
                    newAmount,
                    newTr.authority,
                    bankGate.terminal
                );
                // console.log("token mehr", token);
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }

                return res.json({
                    success: true,
                    message: `https://pec.shaparak.ir/NewIPG/?Token="${token}`,
                });
            }
            return this.response({
                res,
                code: 404,
                message: "type of bank not find",
            });
        } catch (e) {
            console.log("bank error", e);
            return res.status(201).json({
                status: "Error",
                message: "خطای بانک",
            });
        }
        // } catch (error) {
        //     console.error("Error while 00020:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }
    async paymentLink(req, res) {
        if (req.query.id === undefined) {
            return this.response({
                res,
                code: 214,
                message: "id  need",
            });
        }
        const bank = req.query.bank || "";
        const payQueue = await this.PayQueue.findById(req.query.id);
        if (!payQueue) {
            return this.response({
                res,
                code: 404,
                message: "payQueue not find",
            });
        }
        // console.log("payQueue tr:", payQueue);
        // console.log("payQueue code:", payQueue.code);

        const studentId = payQueue.studentId;
        let agencyId = payQueue.agencyId;

        const student = await this.Student.findById(
            studentId,
            "studentCode name lastName serviceDistance school"
        ).lean();

        if (!student) {
            return this.response({
                res,
                code: 404,
                message: "student not find",
            });
        }

        const doclistSanad = await this.DocListSanad.findOne({
            $and: [
                {
                    $or: [
                        { accCode: "003005" + student.studentCode },
                        { forCode: "003005" + student.studentCode },
                    ],
                },
                { mId: payQueue.code },
                { type: "invoice" },
            ],
        });
        if (doclistSanad) {
            return this.response({
                res,
                code: 210,
                message: "this invoice is paid",
            });
        }

        // console.log("bank", bank);
        let bankGate;
        if (payQueue.type != "registration") {
            bankGate =
                bank.trim() === ""
                    ? await this.PayGate.findOne({
                          agencyId,
                          active: true,
                          type: { $ne: "CARD" },
                      })
                    : await this.PayGate.findOne({
                          agencyId,
                          active: true,
                          type: bank.trim(),
                      });
            // console.log("bankGate", bankGate);
            if (!bankGate) {
                bankGate =
                    bank.trim() === ""
                        ? await this.BankGate.findOne({
                              agencyId,
                              active: true,
                              type: { $ne: "CARD" },
                          })
                        : await this.BankGate.findOne({
                              agencyId,
                              active: true,
                              type: bank.trim(),
                          });
            }
            if (!bankGate) {
                return this.response({
                    res,
                    code: 400,
                    message: "bankGate not find",
                });
            }
        }
        let amount = payQueue.amount;
        // /*for test dodo*/amount=10000;
        console.log("amount", amount);
        if (amount < 10000) {
            return this.response({
                res,
                code: 203,
                message: "amount not enough",
            });
        }

        let desc = payQueue.title + " " + student.name + " " + student.lastName;

        let agency = await this.Agency.findById(agencyId, "settings name");
        if (agency) {
            desc = desc + " شرکت " + agency.name;
        } else {
            return this.response({
                res,
                code: 404,
                message: "agency not find",
            });
        }

        if (payQueue.type === "registration") {
            agencyId = null;
            bankGate = {
                type: "MELLAT",
                terminal: "8551948",
                userName: "8551948",
                userPass: "15806659",
                hesab: "001003000000016",
                bankName: "ملت",
                bankCode: "MEL",
            };
        }

        try {
            let newTr = new this.Transactions({
                userId: req.user._id,
                amount: amount,
                bank: bankGate.type,
                desc,
                queueCode: payQueue.code,
                stCode: student.studentCode,
                agencyId,
                phone: req.user.phone,
                payQueueId: payQueue._id,
            });
            await newTr.save();

            if (bankGate.type === "SADERAT" || bankGate.type === "SEPEHR") {
                //****************************************SADERAT************************************************** */
                let token = await generateSepehrToken(
                    payQueue.amount,
                    newTr.authority,
                    "callBack",
                    req.user.phone,
                    bankGate.terminal
                );
                if (!token) {
                    return res.status(201).json({
                        message: "خطای بانک",
                    });
                }

                return res.json({
                    success: true,
                    message: `https://pay.samar-rad.ir?TerminalID=${bankGate.terminal}&token=${token}`,
                });
            } else if (bankGate.type === "MELLAT" || bankGate.type === "BPM") {
                //**********************************************MELLAT******************************************************* */
                let token = await generateMellatToken(
                    amount,
                    newTr.authority,
                    payQueue.code.toString(),
                    bankGate.terminal,
                    bankGate.userName,
                    bankGate.userPass,
                    "",
                    "callBack",
                    req.user.phone
                );
                const spl = token.return;
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }

                return res.json({
                    success: true,
                    message: `https://pay.mysamar.ir/mellat.html?RefId=${
                        spl.split(",")[1]
                    }&MobileNo=${req.user.phone}`,
                });
            } else if (bankGate.type === "ZARIN") {
                //**********************************************ZARIN******************************************************* */
                const zarinpal = Zarin.create(bankGate.terminal, false);
                let fee = await calculateFee(bankGate.terminal, amount);
                console.log("fee", fee);
                const am = amount / 10 + fee / 10;
                console.log("amount with fee", am);
                const response = await zarinpal.PaymentRequest({
                    Amount: Math.ceil(am),
                    // CallbackURL: "http://192.168.0.122:9000/api/pay/verify",
                    // CallbackURL: `https://server.mysamar.ir/api/pay/callBack`,
                    CallbackURL: `https://${bankGate.callback}/callback.php`,
                    Description: desc,
                    Email: "",
                    Mobile: req.user.phone,
                });
                newTr.zarinFee = fee;
                await newTr.save();
                if (response.status === 100) {
                    newTr.authorityZarin = response.authority;
                    await newTr.save();
                    // res.redirect(https://panel.${process.env.URL}/finance);
                    res.json({
                        message: response.url,
                    });
                    return;
                }
                return res.status(201).json({
                    status: "Error",
                    message: "خطای بانک",
                });
            } else if (bankGate.type === "MEHR" || bankGate.type === "FCP") {
                //**********************************************MEHR******************************************************* */
                let token = await generateMehrToken(
                    amount,
                    newTr.authority,
                    bankGate.userName,
                    bankGate.userPass,
                    req.user.phone
                );
                // console.log("token mehr", token);
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }

                return res.json({
                    success: true,
                    message: `https://fcp.shaparak.ir/_ipgw_/payment/?token=${token}&lang=fa`,
                });
            } else if (bankGate.type === "SAMAN" || bankGate.type === "SEP") {
                //**********************************************SAMAN******************************************************* */
                if (
                    req.user._id.toString() === "6870dfa9fecc5f4e41844ca1" ||
                    req.user._id.toString() === "686e0cf5ee410a203824a9d5" ||
                    req.user._id.toString() === "687e1a4464a746341a0085b5"
                ) {
                    amount = 100000;
                }
                let token = await generateSamanToken(
                    amount,
                    newTr.authority,
                    bankGate.terminal,
                    req.user.phone,
                    bankGate.callback
                );
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }
                console.log("tk from saman bank:", token);

                let re = `https://${bankGate.callback}/saman.html?token=${token}`;

                if (bankGate.callback.includes("mysamar")) {
                    re = `https://pay.mysamar.ir/saman.html?token=${token}`;
                }

                return res.json({
                    success: true,
                    message: re,
                });
            } else if (bankGate.type === "TEJARAT" || bankGate.type === "PEC") {
                //**********************************************TEJARAT******************************************************* */
                // amount = 120000;
                // console.log(bankGate);
                let token = await generateTejaratToken(
                    amount,
                    newTr.authority,
                    bankGate.terminal
                );
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }

                return res.json({
                    success: true,
                    message: `https://pec.shaparak.ir/NewIPG/?Token=${token}`,
                });
            }
            return this.response({
                res,
                code: 404,
                message: "type of bank not find",
            });
        } catch (e) {
            console.log("bank error", e);
            return res.status(201).json({
                status: "Error",
                message: "خطای بانک",
            });
        }
        // } catch (error) {
        //     console.error("Error while 00020:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }
    async paymentCo(req, res) {
        // console.log("paymentCorrrrrr")
        if (
            req.query.amount === undefined ||
            req.query.agencyId === undefined ||
            req.query.mobile === undefined ||
            req.query.bankListAcc === undefined
        ) {
            return this.response({
                res,
                code: 214,
                message: "amount & agencyId & mobile & bankListAcc need",
            });
        }
        const amount = parseInt(req.query.amount);
        const agencyId = req.query.agencyId;
        const mobile = req.query.mobile;
        const bankListAcc = req.query.bankListAcc;
        const agency = await this.Agency.findById(agencyId);
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
            const zarinpal = Zarin.create(
                "59e4cc62-98ba-4057-a809-bc25a4decc9b",
                false
            );
            // console.log("zarinpal",zarinpal)
            const desc = "شارژ کیف شرکت " + agency.name;
            // console.log("desc",desc)https://panel.${process.env.URL}/finance
            console.log(
                "ip",
                `https://server.${process.env.URL}/api/pay/verifyCo`
            );
            const response = await zarinpal.PaymentRequest({
                Amount: amount / 10,
                // CallbackURL: "http://localhost:63594/finance",
                CallbackURL: `https://server.${process.env.URL}/api/pay/verifyCo`,
                Description: desc,
                Email: "",
                Mobile: mobile,
            });
            // console.log("response",response)
            if (response.status === 100) {
                const newTr = new this.Transactions({
                    userId: req.user._id,
                    amount: amount,
                    authority: response.authority,
                    desc: desc,
                    queueCode: 0,
                    stCode: bankListAcc,
                    agencyId,
                    phone: mobile,
                });
                await newTr.save();
                // res.redirect(response.url);
                res.json({
                    message: response.url,
                });
                return;
            }
            res.status(500).json({
                status: "Error",
                message: "خطای بانکی رخ داده است...",
            });
            return;
        } catch (error) {
            console.error("Error while 00022:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async paymentChargeAdmin(req, res) {
        // console.log("paymentCorrrrrr")
        if (
            req.query.amount === undefined ||
            req.query.agencyId === undefined ||
            req.query.mobile === undefined ||
            req.query.bankListAcc === undefined
        ) {
            return this.response({
                res,
                code: 214,
                message: "amount & agencyId & mobile & bankListAcc need",
            });
        }
        const amount = parseInt(req.query.amount);
        const agencyId = req.query.agencyId;
        const mobile = req.query.mobile;
        const bankListAcc = req.query.bankListAcc;
        const agency = await this.Agency.findById(agencyId);
        if (amount < 1000) {
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
            const zarinpal = Zarin.create(
                "59e4cc62-98ba-4057-a809-bc25a4decc9b",
                false
            );
            // console.log("zarinpal",zarinpal)
            const desc = " تسویه اعتبار دریافتی توسط " + agency.name;
            // console.log("desc",desc)https://panel.${process.env.URL}/finance
            console.log(
                "ip",
                `https://socket.${process.env.URL}/api/pay/VerifyCoCharge`
            );
            const response = await zarinpal.PaymentRequest({
                Amount: amount / 10,
                // CallbackURL: "http://localhost:63594/finance",
                CallbackURL: `https://socket.${process.env.URL}/api/pay/VerifyCoCharge`,
                Description: desc,
                Email: "",
                Mobile: mobile,
            });
            // console.log("response",response)
            if (response.status === 100) {
                const newTr = new this.Transactions({
                    userId: req.user._id,
                    amount: amount,
                    authority: response.authority,
                    desc: desc,
                    queueCode: -1,
                    stCode: bankListAcc,
                    agencyId,
                    phone: mobile,
                });
                await newTr.save();
                // res.redirect(response.url);
                res.json({
                    message: response.url,
                });
                return;
            }
            res.status(500).json({
                status: "Error",
                message: "خطای بانکی رخ داده است...",
            });
            return;
        } catch (error) {
            console.error("Error while paymentChargeAdmin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async showMorePay(req, res) {
        try {
            const { setter, transaction, sanad, agencyId } = req.body;
            // console.log("showMorePay body=", req.body);

            let transAction = null;
            if (transaction != null && transaction != "") {
                transAction = await this.Transactions.findOne(
                    { authority: transaction },
                    "authority refID amount desc updatedAt"
                );
            }
            const docSanad = await this.DocSanad.findOne(
                {
                    sanadId: sanad,
                    agencyId: ObjectId.createFromHexString(agencyId),
                },
                "note system atf faree sanadDate editor"
            );
            let user;
            let docList = [];
            if (docSanad) {
                user = await this.User.findById(
                    docSanad.editor,
                    "name lastName phone"
                );
                if (!user) {
                    user = await this.Parent.findById(
                        docSanad.editor,
                        "name lastName phone"
                    );
                }
                // console.log("showMorePay user=", user);
                const doclistSanad = await this.DocListSanad.find(
                    { titleId: docSanad.id },
                    "note bed bes accCode type"
                );

                for (var doc of doclistSanad) {
                    if (doc.accCode.substring(0, 6) === "003005") {
                        const student = await this.Student.findOne(
                            { studentCode: doc.accCode.substring(6) },
                            "name lastName"
                        );
                        if (student) {
                            const name = student.name + " " + student.lastName;
                            docList.push({
                                name,
                                accCode: doc.accCode,
                                note: doc.note,
                                bed: doc.bed,
                                bes: doc.bes,
                            });
                        } else {
                            docList.push({
                                name: "دانش آموز ؟؟",
                                accCode: doc.accCode,
                                note: doc.note,
                                bed: doc.bed,
                                bes: doc.bes,
                            });
                        }
                    } else {
                        const listAcc = await this.ListAcc.findOne({
                            agencyId,
                            code: doc.accCode,
                        });
                        let name = "";
                        if (listAcc) {
                            const levelDet = await this.LevelAccDetail.findOne(
                                { agencyId, accCode: listAcc.codeLev3 },
                                "accName"
                            );
                            if (levelDet) {
                                name = levelDet.accName;
                            }
                        }
                        docList.push({
                            name,
                            accCode: doc.accCode,
                            note: doc.note,
                            bed: doc.bed,
                            bes: doc.bes,
                        });
                    }
                }
            }

            return this.response({
                res,
                data: { user, transAction, docSanad, docList },
            });
        } catch (error) {
            console.error("Error while showMorePay:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async payRegistrationWithWallet(req, res) {
        try {
            const { studentId } = req.body;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            let payQueue = await this.PayQueue.findOne({
                studentId,
                agencyId,
                type: "registration",
            });
            if (!payQueue) {
                return this.response({
                    res,
                    code: 404,
                    message: "payQueue not find",
                });
            }
            const amount = payQueue.amount;
            const agency = await this.Agency.findById(agencyId, "settings");
            const student = await this.Student.findById(
                studentId,
                "name lastName studentCode state stateTitle serviceDistance school"
            );
            let name = "دانش آموز";

            if (!student || !agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "student or agency not find",
                });
            }
            const docListSanad = await this.DocListSanad.findOne({
                $and: [
                    {
                        $or: [
                            { accCode: "003005" + student.studentCode },
                            { forCode: "003005" + student.studentCode },
                        ],
                    },
                    { mId: payQueue.code },
                    { type: "invoice" },
                ],
            }).lean();
            if (docListSanad) {
                if (payQueue.type === "registration") {
                    if (student.state < 2) {
                        student.state = 2;
                        student.stateTitle = "در انتظار پیش پرداخت";
                        await student.save();
                    }
                }
                payQueue.cardNumber = "";
                payQueue.refId = "";
                payQueue.isPaid = true;
                await payQueue.save();
                const prePayment = await this.PayQueue.findOne({
                    agencyId: agency._id,
                    studentId: student._id,
                    type: "prePayment",
                });
                if (!prePayment || prePayment.delete) {
                    const invoice = await this.Invoice.findOne({
                        agencyId: agency._id,
                        type: "prePayment",
                        delete: false,
                    });
                    if (invoice) {
                        let amount2 = 0;
                        let findSchool = false;
                        if (invoice.schools.length > 0) {
                            for (var sc of invoice.schools) {
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
                                invoice.distancePrice &&
                                invoice.distancePrice.length > 0
                            ) {
                                const matchedPricing =
                                    invoice.distancePrice.find(function (
                                        priceItem
                                    ) {
                                        return (
                                            priceItem.maxDistance * 1000 >=
                                            student.serviceDistance
                                        );
                                    });
                                if (matchedPricing) {
                                    amount2 = matchedPricing.amount;
                                } else {
                                    amount2 =
                                        invoice.distancePrice[
                                            invoice.distancePrice.length - 1
                                        ].amount;
                                }
                            } else {
                                amount2 = invoice.amount;
                            }
                        }

                        let payQueue = new this.PayQueue({
                            inVoiceId: invoice._id,
                            code: invoice.code,
                            agencyId: agency._id,
                            studentId: student._id,
                            setter: req.user._id,
                            type: invoice.type,
                            amount: amount2,
                            title: invoice.title,
                            maxDate: invoice.maxDate,
                            isPaid: false,
                        });
                        await payQueue.save();
                    }
                }
                return this.response({
                    res,
                    data: {
                        docPaid: docListSanad,
                        sanadId: docListSanad.doclistId,
                    },
                });
            }
            name =
                student.name +
                " " +
                student.lastName +
                " کد " +
                student.studentCode;
            const wallet = agency.settings.find(
                (obj) => obj.wallet != undefined
            ).wallet;
            // console.log("setting", agency.settings);
            const costCode = agency.settings.find(
                (obj) => obj.cost != undefined
            ).cost;
            if (!costCode || !wallet) {
                return this.response({
                    res,
                    code: 404,
                    message: "costCode || wallet not find",
                });
            }
            let mandeh = 0;
            const result = await this.DocListSanad.aggregate([
                {
                    $match: {
                        accCode: wallet,
                        agencyId: agencyId,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $subtract: ["$bed", "$bes"],
                            },
                        },
                    },
                },
            ]);
            // console.log("result",result);
            mandeh = result[0]?.total || 0;
            if (amount > mandeh) {
                return this.response({
                    res,
                    code: 205,
                    message: "The account balance is insufficient",
                });
            }
            const desc = `پرداخت ${payQueue.title} از کیف پول بابت دانش آموز ${name}`;
            let doc = new this.DocSanad({
                agencyId,
                note: desc,
                sanadDate: new Date(),
                system: 3,
                definite: false,
                lock: true,
                editor: req.user._id,
            });
            await doc.save();

            let docPaid = new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 1,
                bed: amount,
                bes: 0,
                note: desc,
                accCode: costCode,
                mId: doc.sanadId,
                peigiri: payQueue.refId || "",
                sanadDate: new Date(),
            });
            await docPaid.save();
            await new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 2,
                bed: 0,
                bes: amount,
                note: desc,
                accCode: wallet,
                mId: payQueue.code,
                type: "invoice",
                forCode: "003005" + student.studentCode,
                peigiri: payQueue.cardNumber || "",
                sanadDate: new Date(),
            }).save();
            payQueue.isPaid = true;
            payQueue.payDate = new Date();
            payQueue.cardNumber = "";
            payQueue.refId = "";
            await payQueue.save();

            // let payAction = new this.PayAction({
            //     setter: req.user._id,
            //     queueCode,
            //     amount,
            //     desc,
            //     isOnline: false,
            //     studentCode,
            //     docSanadNum: doc.sanadId,
            //     docSanadId: doc._id,
            //     agencyId,
            // });
            // await payAction.save();
            if (payQueue.type === "registration") {
                if (student.state < 2) {
                    student.state = 2;
                    student.stateTitle = "در انتظار پیش پرداخت";
                    await student.save();
                }
                const prePayment = await this.PayQueue.findOne({
                    agencyId: agency._id,
                    studentId: student._id,
                    type: "prePayment",
                });
                if (!prePayment || prePayment.delete) {
                    const invoice = await this.Invoice.findOne({
                        agencyId: agency._id,
                        type: "prePayment",
                        delete: false,
                    });
                    if (invoice) {
                        let amount2 = 0;
                        let findSchool = false;
                        if (invoice.schools.length > 0) {
                            for (var sc of invoice.schools) {
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
                                invoice.distancePrice &&
                                invoice.distancePrice.length > 0
                            ) {
                                const matchedPricing =
                                    invoice.distancePrice.find(function (
                                        priceItem
                                    ) {
                                        return (
                                            priceItem.maxDistance * 1000 >=
                                            student.serviceDistance
                                        );
                                    });
                                if (matchedPricing) {
                                    amount2 = matchedPricing.amount;
                                } else {
                                    amount2 =
                                        invoice.distancePrice[
                                            invoice.distancePrice.length - 1
                                        ].amount;
                                }
                            } else {
                                amount2 = invoice.amount;
                            }
                        }
                        let payQueue = new this.PayQueue({
                            inVoiceId: invoice._id,
                            code: invoice.code,
                            agencyId: agency._id,
                            studentId: student._id,
                            setter: req.user._id,
                            type: invoice.type,
                            amount: amount2,
                            title: invoice.title,
                            maxDate: invoice.maxDate,
                            isPaid: false,
                        });
                        await payQueue.save();
                    }
                }
            }

            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId,
                targetIds: [student._id],
                targetTable: "student",
                sanadId: doc.sanadId,
                actionName: "payRegistrationWithWallet",
                actionNameFa: "تایید اطلاعات و ثبت پرداخت از کیف پول",
                desc: desc,
            }).save();
            return this.response({
                res,
                data: { docPaid: docPaid, sanadId: doc.sanadId },
            });
        } catch (error) {
            console.error("Error while setActionPayWithWallet:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getWalletAmount(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const agency = await this.Agency.findById(agencyId, "settings");
            const wallet = agency.settings.find(
                (obj) => obj.wallet != undefined
            ).wallet;
            // console.log("setting", agency.settings);
            const costCode = agency.settings.find(
                (obj) => obj.cost != undefined
            ).cost;
            if (!costCode || !wallet) {
                return this.response({
                    res,
                    code: 404,
                    message: "costCode || wallet not find",
                });
            }
            let mandeh = 0;
            const result = await this.DocListSanad.aggregate([
                {
                    $match: {
                        accCode: wallet,
                        agencyId: agencyId,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $subtract: ["$bed", "$bes"],
                            },
                        },
                    },
                },
            ]);
            // console.log("result",result);
            mandeh = result[0]?.total || 0;

            return this.response({
                res,
                data: mandeh,
            });
        } catch (error) {
            console.error("Error while 00026:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async insertInvoice(req, res) {
        try {
            const {
                id,
                amount,
                title,
                active,
                desc,
                schools,
                maxDate,
                confirmInfo,
                confirmPrePaid,
                type,
                distancePrice,
            } = req.body;
            const isDelete = req.body.delete;
            const fixPrice = req.body.fixPrice;

            // console.log("distancePrice", distancePrice);
            // console.log("id", id);
            const agencyId =
                req.body.agencyId.trim() === "" ? null : req.body.agencyId;
            const counter = req.body.counter || 0;
            if (type === "registration" && !req.user.isSuperAdmin) {
                return this.response({
                    res,
                    code: 405,
                    message: "cant access ",
                });
            }
            if (!mongoose.isValidObjectId(id)) {
                let payQueue = new this.Invoice({
                    agencyId,
                    setter: req.user._id,
                    amount,
                    maxDate,
                    title,
                    active,
                    desc,
                    schools,
                    counter,
                    confirmInfo,
                    confirmPrePaid,
                    type,
                    delete: isDelete,
                    fixPrice,
                    distancePrice,
                });
                await payQueue.save();
                return this.response({
                    res,
                    message: "new insert",
                    data: { code: payQueue.code, id: payQueue.id },
                });
            }

            const payQueue = await this.Invoice.findByIdAndUpdate(
                id,
                {
                    setter: req.user._id,
                    amount,
                    maxDate,
                    title,
                    active,
                    desc,
                    schools,
                    counter,
                    confirmPrePaid,
                    delete: isDelete,
                    fixPrice,
                    distancePrice,
                },
                { new: true }
            );
            if (payQueue.type != "installment") {
                await this.PayQueue.updateMany(
                    {
                        code: payQueue.code,
                        isPaid: false,
                        isSetAuto: true,
                        agencyId: payQueue.agencyId,
                    },
                    {
                        amount,
                        maxDate,
                        title,
                        counter,
                        confirmPrePaid,
                        delete: isDelete,
                    }
                );
            }

            return this.response({
                res,
                message: "update",
                data: { code: payQueue.code, id: payQueue.id },
            });
        } catch (error) {
            console.error("Error while insertInvoice:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAgencyInvoices(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return this.response({
                    res,
                    code: 614,
                    message: "agencyId need",
                });
            }
            const pays = await this.Invoice.find({
                agencyId: req.query.agencyId,
                delete: false,
                active: true,
            });
            return this.response({
                res,
                data: pays,
            });
        } catch (error) {
            console.error("Error while getAgencyInvoices:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getInvoceId(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const type = req.query.type || "other";
            let qu = [
                { agencyId: ObjectId.createFromHexString(req.query.agencyId) },
            ];
            if (type === "other") {
                qu.push({ $or: [{ type: "optional" }, { type: "force" }] });
            } else {
                qu.push({ type: type });
            }
            const pays = await this.Invoice.find({ $and: qu }).sort({
                counter: 1,
            });
            return this.response({
                res,
                data: pays,
            });
        } catch (error) {
            console.error("Error while getInvoceId:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getPayHistory(req, res) {
        try {
            if (
                req.query.queueCode === undefined ||
                req.query.studentCode === undefined ||
                req.query.studentId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "queueCode studentId studentCode need",
                });
            }
            const queueCode = parseInt(req.query.queueCode);
            const studentCode = req.query.studentCode;
            const studentId = req.query.studentId;
            // console.log("queueCode",queueCode);
            // console.log("studentCode",studentCode);
            // console.log("studentId",studentId);
            const docListSanad = await this.DocListSanad.findOne({
                $and: [
                    {
                        $or: [
                            { accCode: "003005" + studentCode },
                            { forCode: "003005" + studentCode },
                        ],
                    },
                    { mId: queueCode },
                    { type: "invoice" },
                ],
            }).lean();
            //  console.log("docListSanad",docListSanad);
            if (!docListSanad) {
                return this.response({
                    res,
                    code: 404,
                    message: "sanad not find",
                });
            }
            const payQueue = await this.PayQueue.findOne({
                code: queueCode,
                studentId,
            });

            let transAction = null;
            if (docListSanad.isOnline && payQueue) {
                transAction = await this.Transactions.findOne({
                    authority: payQueue.authority,
                    done: true,
                });
            }
            return this.response({
                res,
                data: { action: docListSanad, transAction },
            });
        } catch (error) {
            console.error("Error while 00030:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setInstallments(req, res) {
        try {
            if (req.query.agencyId === undefined || !req.query.schoolId) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId schoolId need",
                });
            }
            const schoolId = req.query.schoolId;
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const installments = await this.Invoice.find({
                agencyId,
                type: "installment",
                delete: false,
            });
            if (installments.length === 0) {
                return this.response({
                    res,
                    code: 203,
                    message: "installments not set",
                });
            }

            const school = await this.School.findOne({
                _id: schoolId,
                agencyId,
            });
            if (!school) {
                return this.response({
                    res,
                    code: 404,
                    message: "school not find",
                });
            }
            const students = await this.Student.find(
                {
                    school: school._id,
                    state: 4,
                    delete: false,
                },
                "studentCode"
            ).lean();
            for (var student of students) {
                const studentCode = student.studentCode;
                let remaining = 0;
                console.log("studentCode", studentCode);
                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            accCode: "003005" + studentCode,
                            agencyId,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            // totalbed: { $sum: '$bed' },
                            // totalbes: { $sum: '$bes' }
                            total: {
                                $sum: {
                                    $subtract: ["$bed", "$bes"],
                                },
                            },
                        },
                    },
                ]);
                console.log("result", result);
                remaining = result[0] === undefined ? 0 : result[0].total;
                if (remaining > 100000) {
                    const oldPq = await this.PayQueue.find({
                        studentId: student._id,
                        type: "installment",
                    });
                    let counterPay = [];
                    if (oldPq.length > 0) {
                        if (!oldPq[0].isSetAuto) {
                            continue;
                        }
                        for (var op of oldPq) {
                            if (!op.isPaid) {
                                await this.PayQueue.findByIdAndDelete(op._id);
                            } else {
                                counterPay.push(op.counter);
                            }
                        }
                    }
                    let invoices = installments;
                    for (var i = 0; i < invoices.length; i++) {
                        for (var cp of counterPay) {
                            if (cp === invoices[i].counter) {
                                invoices.splice(i, 1);
                                i--;
                                break;
                            }
                        }
                    }
                    if (invoices.length === 0) {
                        invoices.push(installments[installments.length - 1]);
                    }
                    const everyPrice = Math.round(remaining / invoices.length);
                    for (var invoice of invoices) {
                        await new this.PayQueue({
                            inVoiceId: invoice._id,
                            code: invoice.code,
                            agencyId: agencyId,
                            studentId: student._id,
                            setter: req.user._id,
                            type: invoice.type,
                            counter: invoice.counter,
                            amount: everyPrice,
                            title: invoice.title,
                            maxDate: invoice.maxDate,
                            isPaid: false,
                        }).save();
                    }
                }
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while setInstallments:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setInstallmentByParent(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const studentId = ObjectId.createFromHexString(req.body.studentId);
            const prices = req.body.prices;
            const codes = req.body.codes;
            const installments = await this.Invoice.find({
                agencyId,
                type: "installment",
                delete: false,
            });
            if (installments.length === 0) {
                return this.response({
                    res,
                    code: 203,
                    message: "installments not set",
                });
            }
            console.log("installments.length", installments.length);
            console.log("prices", prices.length);
            if (installments.length != prices.length) {
                return this.response({
                    res,
                    code: 202,
                    message: "installments.length != prices.length",
                });
            }

            const student = await this.Student.findOne(
                {
                    _id: studentId,
                    state: 4,
                    delete: false,
                },
                "studentCode"
            ).lean();
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }
            const studentCode = student.studentCode;
            let remaining = 0;
            console.log("studentCode", studentCode);
            const result = await this.DocListSanad.aggregate([
                {
                    $match: {
                        accCode: "003005" + studentCode,
                        agencyId,
                    },
                },
                {
                    $group: {
                        _id: null,
                        // totalbed: { $sum: '$bed' },
                        // totalbes: { $sum: '$bes' }
                        total: {
                            $sum: {
                                $subtract: ["$bed", "$bes"],
                            },
                        },
                    },
                },
            ]);
            console.log("result", result);
            remaining = result[0] === undefined ? 0 : result[0].total;
            if (remaining > 100000) {
                const oldPq = await this.PayQueue.find({
                    studentId: student._id,
                    type: "installment",
                });
                let counterPay = [];
                if (oldPq.length > 0) {
                    // if (!oldPq[0].isSetAuto) {
                    //     continue;
                    // }
                    for (var op of oldPq) {
                        if (!op.isPaid) {
                            await this.PayQueue.findByIdAndDelete(op._id);
                        } else {
                            counterPay.push(op.counter);
                        }
                    }
                }
                let invoices = installments;
                for (var i = 0; i < invoices.length; i++) {
                    for (var cp of counterPay) {
                        if (cp === invoices[i].counter) {
                            invoices.splice(i, 1);
                            i--;
                            break;
                        }
                    }
                }
                if (invoices.length === 0) {
                    invoices.push(installments[installments.length - 1]);
                }
                if (invoices[0].fixPrice) {
                    const everyPrice = Math.round(remaining / invoices.length);
                    for (var invoice of invoices) {
                        await new this.PayQueue({
                            inVoiceId: invoice._id,
                            code: invoice.code,
                            agencyId: agencyId,
                            studentId: student._id,
                            setter: req.user._id,
                            type: invoice.type,
                            counter: invoice.counter,
                            amount: everyPrice,
                            title: invoice.title,
                            maxDate: invoice.maxDate,
                            isPaid: false,
                        }).save();
                    }
                } else {
                    let allPrice = 0;
                    for (var p of prices) {
                        allPrice = allPrice + p;
                    }
                    if (allPrice != remaining) {
                        return this.response({
                            res,
                            code: 202,
                            message: "allPrice != remaining",
                        });
                    }

                    for (var m = 0; m < invoices.length; m++) {
                        var invoice = invoices[m];
                        let prc = prices[m] || 0;
                        for (var i = 0; i < codes.length; i++) {
                            if (codes[i] == invoice.code) {
                                prc = prices[i];
                                break;
                            }
                        }
                        await new this.PayQueue({
                            inVoiceId: invoice._id,
                            code: invoice.code,
                            agencyId: agencyId,
                            studentId: student._id,
                            setter: req.user._id,
                            type: invoice.type,
                            counter: invoice.counter,
                            amount: prc,
                            title: invoice.title,
                            maxDate: invoice.maxDate,
                            isPaid: false,
                            delete: prc === 0 ? true : false,
                        }).save();
                    }
                }
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while setInstallmentsByParent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setInstallmentForStudent(req, res) {
        try {
            const { id, codes, amounts, deletes, agencyId } = req.body;
            if (
                codes.length !== amounts.length ||
                codes.length !== deletes.length
            ) {
                return this.response({
                    res,
                    code: 214,
                    message:
                        "counters and amounts and deletes must be same length",
                });
            }
            for (var i = 0; i < codes.length; i++) {
                if (
                    codes[i] === undefined ||
                    amounts[i] === undefined ||
                    deletes[i] === undefined
                ) {
                    return this.response({
                        res,
                        code: 214,
                        message:
                            "codes and amounts and deletes must be defined",
                    });
                }
                const invoice = await this.Invoice.findOne({
                    agencyId,
                    type: "installment",
                    code: codes[i],
                });
                if (invoice) {
                    let payQueue = await this.PayQueue.findOne({
                        inVoiceId: invoice._id,
                        studentId: id,
                    });
                    if (payQueue) {
                        if (!payQueue.isPaid) {
                            payQueue.amount = amounts[i];
                            payQueue.delete = deletes[i];
                            payQueue.isSetAuto = false;
                            await payQueue.save();
                        } else {
                            payQueue.isSetAuto = false;
                            await payQueue.save();
                        }
                    } else {
                        if (!deletes[i]) {
                            await new this.PayQueue({
                                inVoiceId: invoice._id,
                                code: invoice.code,
                                agencyId: agencyId,
                                studentId: id,
                                setter: req.user._id,
                                type: invoice.type,
                                counter: invoice.counter,
                                amount: amounts[i],
                                title: invoice.title,
                                maxDate: invoice.maxDate,
                                isPaid: false,
                                isSetAuto: false,
                            }).save();
                        }
                    }
                }
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while setInstallmentForStudent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getOnlinePayHistory(req, res) {
        try {
            if (req.query.studentCode === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "studentCode need",
                });
            }
            const stCode = req.query.studentCode;
            const codes = await this.ListAcc.find(
                { codeLev3: stCode },
                "code"
            ).distinct("code");
            let transActions = await this.Transactions.find({ stCode });
            for (var cd of codes) {
                const ta = await this.Transactions.find({ stCode: cd });
                transActions.push(...ta);
            }
            return this.response({
                res,
                data: transActions,
            });
        } catch (error) {
            console.error("Error while 00031:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getStudentPays(req, res) {
        try {
            if (
                req.query.studentId === undefined ||
                req.query.studentId.toString().trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "studentId need",
                });
            }
            const studentId = req.query.studentId;
            let student = await this.Student.findById(
                studentId,
                "studentCode service serviceNum serviceCost state gradeId school serviceDistance agencyId"
            );
            if (!student) {
                return this.response({
                    res,
                    code: 414,
                    message: "student not find",
                });
            }
            const school = await this.School.findById(
                student.school,
                "agencyId"
            ).lean();

            let agencyId = null;
            if (school) {
                agencyId = school.agencyId;
            }
            let kol = "003";
            let moeen = "005";
            let code = kol + moeen + student.studentCode;
            let remaining = 0;
            if (agencyId != null) {
                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            accCode: code,
                            agencyId: agencyId,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalbed: { $sum: "$bed" },
                            totalbes: { $sum: "$bes" },
                            // total: {
                            //     $sum: {
                            //         $subtract: ["$bed", "$bes"],
                            //     },
                            // },
                        },
                    },
                ]);
                remaining =
                    result[0] === undefined
                        ? 0
                        : result[0].totalbed - result[0].totalbes;
            }
            let qr = [];
            qr.push({ delete: false });
            let payQueues = await this.PayQueue.find({
                studentId,
                delete: false,
            }).sort({
                counter: 1,
                maxDate: 1,
            });

            var pays = [];
            for (var payQueue of payQueues) {
                const doclistSanad = await this.DocListSanad.findOne({
                    $and: [
                        {
                            $or: [{ accCode: code }, { forCode: code }],
                        },
                        { mId: payQueue.code },
                        { type: "invoice" },
                    ],
                });
                if (!doclistSanad) {
                    if (payQueue.isPaid && payQueue.authority !== "") {
                        let dls = {
                            _id: "",
                            titleId: "",
                            isOnline: true,
                            bes: payQueue.amount,
                            mId: payQueue.code,
                            note:
                                payQueue.title +
                                " پرداخت شده به حساب رادرایانه",
                            authority: payQueue.authority,
                            accCode: "003005" + student.studentCode,
                            sanadDate: payQueue.payDate,
                            doclistId: 0,
                        };
                        pays.push({ payQueue, doclistSanad: dls });
                        continue;
                    }
                    pays.push({ payQueue, doclistSanad: null });
                    continue;
                }
                const cheque = await this.SayadCheque.findOne(
                    { sanadId: doclistSanad.doclistId },
                    "status payQueueDate"
                ).lean();
                pays.push({ payQueue, doclistSanad: doclistSanad, cheque });
                if (!payQueue.isPaid) {
                    payQueue.isPaid = true;
                    payQueue.payDate = doclistSanad.createdAt;
                    await payQueue.save();
                }
            }
            if (pays.length === 0) {
                const invoice = await this.Invoice.findOne({
                    agencyId,
                    type: "registration",
                    delete: false,
                });
                if (invoice) {
                    let payQueue = new this.PayQueue({
                        inVoiceId: invoice._id,
                        code: invoice.code,
                        agencyId,
                        studentId: student._id,
                        setter: req.user._id,
                        type: invoice.type,
                        amount: invoice.amount,
                        title: invoice.title,
                        maxDate: invoice.maxDate,
                        isPaid: false,
                    });
                    await payQueue.save();
                    pays.push({ payQueue, doclistSanad: null });
                }
            }
            // console.log("pays.length", pays.length);
            // console.log("pays[0].type", pays[0].payQueue.type);
            if (pays.length === 1 && pays[0].payQueue.type === "registration") {
                let invoice2 = await this.Invoice.findOne({
                    agencyId: student.agencyId,
                    type: "prePayment",
                    active: true,
                }).lean();

                let amount2 = 0;
                if (invoice2) {
                    let findSchool = false;
                    if (invoice2.schools.length > 0) {
                        for (var sc of invoice2.schools) {
                            if (
                                sc.id.toString() === student.school.toString()
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
                            const matchedPricing = invoice2.distancePrice.find(
                                function (priceItem) {
                                    return (
                                        priceItem.maxDistance * 1000 >=
                                        student.serviceDistance
                                    );
                                }
                            );
                            if (matchedPricing) {
                                amount2 = matchedPricing.amount;
                            } else {
                                amount2 =
                                    invoice2.distancePrice[
                                        invoice2.distancePrice.length - 1
                                    ].amount;
                            }
                        } else {
                            amount2 = invoice2.amount;
                        }
                    }
                    let prePayment = new this.PayQueue({
                        inVoiceId: invoice2._id,
                        code: invoice2.code,
                        agencyId: student.agencyId,
                        studentId: student._id,
                        setter: req.user._id,
                        type: invoice2.type,
                        amount: amount2,
                        title: invoice2.title,
                        maxDate: invoice2.maxDate,
                    });
                    await prePayment.save();
                    pays.push({ payQueue: prePayment, doclistSanad: null });
                }
            }

            return this.response({
                res,
                data: { pays, remaining },
            });
        } catch (error) {
            console.error("Error while getStudentPays:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setStudentPayCard(req, res) {
        const session = await this.Student.startSession();
        session.startTransaction();

        try {
            const {
                payGateId,
                agencyId,
                studentId,
                cardNumber,
                refId,
                amount,
                payDate,
            } = req.body;
            const isSheba = req.body.isSheba || false;
            console.log("payGateId", payGateId);

            let student = await this.Student.findById(studentId).session(
                session
            );

            if (!student) {
                const pq = await this.PayQueue.findById(studentId).session(
                    session
                );
                if (pq) {
                    student = await this.Student.findById(pq.studentId).session(
                        session
                    );
                }
                if (!student) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 404,
                        message: "student not found",
                    });
                }
            }

            const distance = student.serviceDistance;
            let paySeparation = false;
            const agency = await this.Agency.findById(
                student.agencyId,
                "paySeparation"
            ).session(session);
            if (agency) {
                paySeparation = agency.paySeparation || false;
            }
            let amountReg = 0;
            if (!paySeparation) {
                const invoice = await this.Invoice.findOne({
                    agencyId,
                    type: "registration",
                    active: true,
                })
                    .session(session)
                    .lean();

                amountReg = invoice ? invoice.amount : 0;
                if (amountReg > 0) {
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
                            setter: req.user._id,
                            type: invoice.type,
                            amount: invoice.amount,
                            title: invoice.title,
                            maxDate: invoice.maxDate,
                            isPaid: true,
                            isSetAuto: true,
                            payDate,
                            cardNumber,
                            isSheba,
                            refId,
                            bank: payGateId,
                        });
                    } else {
                        payQueue.isPaid = true;
                        payQueue.isSetAuto = true;
                        payQueue.payDate = payDate;
                        payQueue.cardNumber = cardNumber;
                        payQueue.isSheba = isSheba;
                        payQueue.refId = refId;
                        payQueue.bank = payGateId;
                    }
                    await payQueue.save({ session });
                }
            }

            const invoice2 = await this.Invoice.findOne({
                agencyId,
                type: "prePayment",
                active: true,
            })
                .session(session)
                .lean();

            let amount2 = 0;
            if (invoice2) {
                let findSchool = false;
                if (invoice2.schools.length > 0) {
                    for (var sc of invoice2.schools) {
                        if (sc.id.toString() === student.school.toString()) {
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
                        const matchedPricing = invoice2.distancePrice.find(
                            (priceItem) =>
                                priceItem.maxDistance * 1000 >= distance
                        );
                        amount2 = matchedPricing
                            ? matchedPricing.amount
                            : invoice2.distancePrice[
                                  invoice2.distancePrice.length - 1
                              ].amount;
                    } else {
                        amount2 = invoice2.amount;
                    }
                }
            }

            // ---- Handle Registration Payment ----

            // ---- Handle PrePayment ----
            if (amount - amountReg > 0 && amount2 > 0) {
                let prePayment = await this.PayQueue.findOne({
                    agencyId,
                    studentId: student._id,
                    type: "prePayment",
                }).session(session);

                if (!prePayment) {
                    prePayment = new this.PayQueue({
                        inVoiceId: invoice2._id,
                        code: invoice2.code,
                        agencyId,
                        studentId: student._id,
                        setter: req.user._id,
                        type: invoice2.type,
                        amount: amount - amountReg,
                        title: invoice2.title,
                        maxDate: invoice2.maxDate,
                        isPaid: true,
                        isSetAuto: true,
                        payDate,
                        cardNumber,
                        isSheba,
                        refId,
                        bank: payGateId,
                    });
                } else {
                    prePayment.isPaid = true;
                    prePayment.isSetAuto = true;
                    prePayment.payDate = payDate;
                    prePayment.cardNumber = cardNumber;
                    prePayment.isSheba = isSheba;
                    prePayment.refId = refId;
                    prePayment.bank = payGateId;
                }
                await prePayment.save({ session });
            }
            student.state = 1;
            student.stateTitle = "در انتظار تایید اطلاعات";
            await student.save({ session });
            await session.commitTransaction();
            session.endSession();

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error while setStudentPayCard:", error);
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
