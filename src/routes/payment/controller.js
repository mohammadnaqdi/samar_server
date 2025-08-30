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
    link = "verify2",
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
        // console.log("response", response);

        if (response.data.Status === 0) {
            return response.data.Accesstoken;
        }
        console.log("response", response.data);
        return null;
    } catch (error) {
        console.error("Error while generating sepehr bank token:", error);
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
        console.log("bank", bank);
        const bankGate =
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
        console.log("bankGate", bankGate);
        if (!bankGate) {
            return this.response({
                res,
                code: 404,
                message: "bankGate not find",
            });
        }
        const studentId = req.query.studentId;
        let desc = req.query.desc;

        const student = await this.Student.findById(
            studentId,
            "studentCode name lastName serviceDistance"
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
            "amount title desc distancePrice"
        ).lean();
        let amount2 = 0;
        if (invoice2) {
            if (invoice2.distancePrice && invoice2.distancePrice.length > 0) {
                const matchedPricing = invoice2.distancePrice.find(function (
                    priceItem
                ) {
                    return (
                        priceItem.maxDistance * 1000 >= student.serviceDistance
                    );
                });
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
            if (title === "") {
                title = invoice2.title;
            }
        }
        if (amount === 0 && amount2 === 0) {
            return this.response({
                res,
                code: 404,
                message: "invoice not find",
            });
        }

        if (student) {
            desc = title + " " + student.name + " " + student.lastName;
        }

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

        console.log("amount", amount);
        console.log("amount2", amount2);
        console.log("desc", desc);
        try {
            let newTr = new this.Transactions({
                userId: req.user._id,
                amount: amount + amount2,
                bank: bankGate.type,
                desc,
                queueCode: 0,
                stCode: student.studentCode,
                agencyId,
                phone: req.user.phone,
            });
            await newTr.save();

            if (bankGate.type === "SADERAT") {
                //**********************************************SADERAT******************************************************* */
                let token = await generateSepehrToken(
                    amount + amount2,
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
            } else if (bankGate.type === "MELLAT") {
                //**********************************************MELLAT******************************************************* */
                let token = await generateMellatToken(
                    amount + amount2,
                    newTr.authority,
                    "0",
                    bankGate.terminal,
                    bankGate.userName,
                    bankGate.userPass,
                    "",
                    "callBack",
                    req.user.phone
                );
                console.log("token.return mellat", token.return);
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
                const zarinpal = Zarin.create(bankGate.terminal, false);

                const response = await zarinpal.PaymentRequest({
                    Amount: (amount + amount2) / 10,
                    // CallbackURL: "http://192.168.0.122:9000/api/pay/verify",
                    CallbackURL: `https://server.mysamar.ir/api/pay/callBack`,
                    Description: desc,
                    Email: "",
                    Mobile: req.user.phone,
                });
                if (response.status === 100) {
                    newTr.authorityZarin = response.authority;
                    await newTr.save();
                    // res.redirect(https://panel.${process.env.URL}/finance);
                    res.json({
                        message: response.url,
                    });
                    return;
                }
                res.status(201).json({
                    status: "Error",
                    message: "خطای بانک",
                });
                return;
            }
            return this.response({
                res,
                code: 404,
                message: "type of bank not find",
            });
        } catch (e) {
            console.log("sepehr bank error", e);
            res.status(201).json({
                status: "Error",
                message: "خطای بانک",
            });
            return;
        }
        // } catch (error) {
        //     console.error("Error while 00020:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }
    async payment2(req, res) {
        if (
            req.query.amount === undefined ||
            req.query.desc === undefined ||
            req.query.stCode === undefined ||
            req.query.queueCode === undefined
        ) {
            return this.response({
                res,
                code: 214,
                message: "amount & desc stCode queueCode need",
            });
        }
        // const socket = req.query.socket;

        let amount = parseInt(req.query.amount);
        const stCode = req.query.stCode;
        let desc = req.query.desc;

        const student = await this.Student.findOne({
            studentCode: stCode,
        }).lean();

        if (student) {
            desc = req.query.desc + " " + student.name + " " + student.lastName;
        }

        const queueCode = parseInt(req.query.queueCode);
        let payQueue = await this.PayQueue.findOne(
            { code: queueCode, studentId: student._id },
            "amount agencyId type title"
        ).lean();
        if (!payQueue) {
            return this.response({
                res,
                code: 404,
                message: "payQueue not find",
            });
        }
        const docListSanad = await this.DocListSanad.findOne(
            {
                $and: [
                    {
                        $or: [
                            { accCode: "003005" + stCode },
                            { forCode: "003005" + stCode },
                        ],
                    },
                    { mId: queueCode },
                    { type: "invoice" },
                ],
            },
            ""
        ).lean();
        if (docListSanad) {
            return this.response({
                res,
                code: 203,
                message: "this queue is paid refresh please",
            });
        }
        // const payAction = await this.PayAction.find({
        //     queueCode,
        //     studentCode: req.query.stCode,
        //     delete: false,
        // });
        // if (payAction.length > 0) {
        //     return this.response({
        //         res,
        //         code: 210,
        //         message: "this queue is paid refresh please",
        //     });
        // }

        const agencyId = payQueue.agencyId;
        const agency = await this.Agency.findById(agencyId, "settings name");
        if (agency) {
            desc = desc + " شرکت " + agency.name;
        }
        console.log("payQueue", payQueue);

        if (amount < 10000) {
            console.log("amount < 10000", amount);
            return this.response({
                res,
                code: 203,
                message: "amount not enough",
            });
        }

        console.log("amount", amount);
        console.log("desc", desc);
        try {
            const bankGate = await this.BankGate.findOne({
                agencyId,
                type: { $ne: "CARD" },
                active: true,
            }).lean();
            if (!bankGate) {
                return res.status(404).json({
                    message: "No bankGate available for this agency!",
                });
            }

            if (bankGate.type === "MELLAT") {
                const newTr = new this.Transactions({
                    userId: req.user._id,
                    amount: amount,
                    bank: "MELLAT",
                    desc: desc,
                    queueCode: queueCode,
                    stCode: stCode,
                    agencyId,
                    phone: mobile,
                });
                await newTr.save();
                let token = await generateMellatToken(
                    amount,
                    newTr.authority,
                    "0",
                    bankGate.terminal,
                    bankGate.userName,
                    bankGate.userPass,
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
            } else if (bankGate.type === "SADERAT") {
                const newTr = new this.Transactions({
                    userId: req.user._id,
                    amount: amount,
                    bank: "SADERAT",
                    desc: desc,
                    queueCode: queueCode,
                    stCode: stCode,
                    agencyId,
                    phone: mobile,
                });
                await newTr.save();
                let token = await generateSepehrToken(
                    amount,
                    newTr.authority,
                    "saderatCallback",
                    mobile,
                    bankGate.terminal
                );
                if (!token) {
                    return res.status(201).json({
                        message: `خطای بانک ${bankGate.bankName}`,
                    });
                }

                return res.json({
                    success: true,
                    message: `https://pay.mysamar.ir?TerminalID=${TERMINAL}&token=${token}`,
                });
            }
            const newTr = new this.Transactions({
                userId: req.user._id,
                amount: amount,
                authority: invoice,
                desc,
                queueCode,
                stCode,
                agencyId,
                phone: mobile,
            });
            await newTr.save();
            let token = await generateSepehrToken(amount, newTr.authority);
            if (!token) {
                token = await generateSepehrToken(amount, newTr.authority);
            }
            if (!token) {
                return res.status(201).json({
                    message: "خطای بانک",
                });
            }

            return res.json({
                success: true,
                message: `https://mysamar.ir/downloads/index.html?TerminalID=99018831&token=${token}`,
            });

            // return res.send(`
            //     <html>
            //     <body onload="document.getElementById('paymentForm').submit();">
            //         <form id="paymentForm" action="https://sepehr.shaparak.ir:8080/Pay" method="POST">
            //             <input type="hidden" name="TerminalID" value="${TERMINAL}">
            //             <input type="hidden" name="token" value="${token}">
            //             <noscript>
            //                 <input type="submit" value="Click here if you are not redirected">
            //             </noscript>
            //         </form>
            //     </body>
            //     </html>
            // `);
            // const response = await zarinpal.PaymentRequest({
            //     Amount: amount / 10,
            //     // CallbackURL: "http://192.168.0.122:9000/api/pay/verify",
            //     CallbackURL: callBackUrl,
            //     Description: desc,
            //     Email: '',
            //     Mobile: req.user.phone,
            // });
            // if (response.status === 100) {
            //     const newTr = new this.Transactions({
            //         userId: req.user._id,
            //         amount: amount,
            //         authority: response.authority,
            //         desc,
            //         queueCode,
            //         stCode,
            //         agencyId,
            //     });
            //     await newTr.save();
            //     // res.redirect(https://panel.${process.env.URL}/finance);
            //     res.json({
            //         message: response.url,
            //     });
            //     return;
            // }
            // res.status(201).json({
            //     status: "Error",
            //     message: "خطای بانک",
            // });
            // return;
        } catch (e) {
            console.log("sepehr bank error", e);
            res.status(201).json({
                status: "Error",
                message: "خطای بانک",
            });
            return;
        }
        // } catch (error) {
        //     console.error("Error while 00020:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }

    async payment(req, res) {
        if (
            req.query.amount === undefined ||
            req.query.desc === undefined ||
            req.query.stCode === undefined ||
            req.query.queueCode === undefined
        ) {
            return this.response({
                res,
                code: 214,
                message: "amount & desc stCode queueCode need",
            });
        }
        const socket = req.query.socket;

        let amount = parseInt(req.query.amount);
        const stCode = req.query.stCode;
        let desc = req.query.desc;

        const student = await this.Student.findOne({ studentCode: stCode });

        if (student) {
            desc = req.query.desc + " " + student.name + " " + student.lastName;
        }

        const queueCode = parseInt(req.query.queueCode);
        let payQueue = await this.PayQueue.findOne(
            { code: queueCode },
            "amount amount03 amount37 amount7i merchentId agencyId type"
        );
        if (!payQueue) {
            return this.response({
                res,
                code: 404,
                message: "payQueue not find",
            });
        }
        const docListSanad = await this.DocListSanad.findOne(
            {
                $and: [
                    {
                        $or: [
                            { accCode: "003005" + stCode },
                            { forCode: "003005" + stCode },
                        ],
                    },
                    { mId: queueCode },
                    { type: "invoice" },
                ],
            },
            ""
        ).lean();
        if (docListSanad) {
            return this.response({
                res,
                code: 203,
                message: "this queue is paid refresh please",
            });
        }
        // const payAction = await this.PayAction.find({
        //     queueCode,
        //     studentCode: req.query.stCode,
        //     delete: false,
        // });
        // if (payAction.length > 0) {
        //     return this.response({
        //         res,
        //         code: 210,
        //         message: "this queue is paid refresh please",
        //     });
        // }

        if (payQueue.amount03 != -1 && payQueue.amount03 != undefined) {
            if (student.serviceDistance <= 3000) {
                payQueue.amount = payQueue.amount03;
            } else if (student.serviceDistance <= 7000) {
                payQueue.amount = payQueue.amount37;
            } else {
                payQueue.amount = payQueue.amount7i;
            }
        }

        let merchent = "";
        // const radMerchent = "59e4cc62-98ba-4057-a809-bc25a4decc9b";
        if (payQueue.merchentId != null && payQueue.merchentId.length === 36) {
            merchent = payQueue.merchentId;
        } else {
            return this.response({
                res,
                code: 400,
                message: "merchent not find",
            });
        }
        const zarinpal = Zarin.create(merchent, false);
        let agencyId = payQueue.agencyId;
        let agency;
        if (agencyId != null) {
            agency = await this.Agency.findById(agencyId, "settings name");
            if (agency) {
                desc = desc + " شرکت " + agency.name;
            }
        }
        // console.log("agency", agency);
        if (!agency) {
            // console.log(" student.school",  student.school);
            const school = await this.School.findById(
                student.school,
                "agencyId"
            ).lean();
            if (school) {
                agency = await this.Agency.findById(
                    school.agencyId,
                    "settings name"
                );
                if (agency) {
                    desc = desc + " شرکت " + agency.name;
                }
            }
        }
        console.log("amount", amount);
        // console.log("desc", desc);
        if (!payQueue) {
            return this.response({
                res,
                code: 404,
                message: "Pay Queue not find",
            });
        }
        if (amount < 10000) {
            return this.response({
                res,
                code: 203,
                message: "amount not enough",
            });
        }
        if (
            payQueue.amount > 0 &&
            amount != payQueue.amount &&
            payQueue.type != 7
        ) {
            return this.response({
                res,
                code: 204,
                message: "amount not correct",
            });
        }
        if (payQueue.amount < 0 || payQueue.type === 7) {
            let kol = "003";
            let moeen = "005";
            const code = kol + moeen + stCode;
            let remaining = 0;
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
            // console.log("result[0]", result[0]);
            remaining = result[0] === undefined ? 0 : result[0].total;

            console.log("remaining remaining", remaining);
            if (remaining > 10000) {
                amount =
                    (Math.abs(payQueue.amount) * Math.abs(remaining)) / 100;
                amount = financial(amount);
                if (amount < 10000) {
                    return this.response({
                        res,
                        code: 203,
                        message: "amount not enough",
                    });
                }
            } else {
                return this.response({
                    res,
                    code: 205,
                    message: "remaining is not bed",
                });
            }
        }
        // console.log("amount", amount);
        // const url = config.get("url.address3");
        if (!desc.includes("شرکت")) {
            desc = desc + " " + process.env.URL;
        }
        try {
            let callBackUrl = `https://node.${process.env.URL}/api/pay/verify`;
            if (socket != undefined && socket === "socket") {
                callBackUrl = `https://socket.${process.env.URL}/api/pay/verify`;
                console.log("callBackUrl", callBackUrl);
            }
            const response = await zarinpal.PaymentRequest({
                Amount: amount / 10,
                // CallbackURL: "http://192.168.0.122:9000/api/pay/verify",
                CallbackURL: callBackUrl,
                Description: desc,
                Email: "",
                Mobile: req.user.phone,
            });
            if (response.status === 100) {
                const newTr = new this.Transactions({
                    userId: req.user._id,
                    amount: amount,
                    authority: response.authority,
                    desc,
                    queueCode,
                    stCode,
                    agencyId,
                    phone: req.user.phone,
                });
                await newTr.save();
                // res.redirect(https://panel.${process.env.URL}/finance);
                res.json({
                    message: response.url,
                });
                return;
            }
            res.status(201).json({
                status: "Error",
                message: "خطای بانک",
            });
            return;
        } catch (e) {
            console.log("zarinpall error", e);
            res.status(201).json({
                status: "Error",
                message: "خطای بانک",
            });
            return;
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

    // async setActionPay(req, res) {
    //     try {
    //         const { agencyId, queueCode, amount, desc, studentCode, sanadNum } =
    //             req.body;
    //         const docSanad = await this.DocSanad.findOne(
    //             { agencyId, sanadId: sanadNum },
    //             ""
    //         );
    //         if (!docSanad) {
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "docSanad not find",
    //             });
    //         }
    //         let payAction = new this.PayAction({
    //             setter: req.user._id,
    //             queueCode,
    //             amount,
    //             desc,
    //             isOnline: false,
    //             studentCode,
    //             docSanadNum: sanadNum,
    //             docSanadId: docSanad._id,
    //             agencyId,
    //         });
    //         await payAction.save();

    //         return this.response({
    //             res,
    //             data: payAction.id,
    //         });
    //     } catch (error) {
    //         console.error("Error while 00023:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async showMorePay(req, res) {
        try {
            const { setter, transaction, sanad, agencyId } = req.body;
            console.log("showMorePay body=", req.body);
            let user = await this.User.findById(setter, "name lastName phone");
            if (!user) {
                user = await this.Parent.findById(
                    setter,
                    "name lastName phone"
                );
            }
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
                "note system atf faree sanadDate"
            );
            let docList = [];
            if (docSanad) {
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

    // async setActionPayWithWallet(req, res) {
    //     try {
    //         const { queueCode, studentCode } = req.body;
    //         const agencyId = ObjectId.createFromHexString(req.body.agencyId);
    //         let payQueue = await this.PayQueue.findOne({ code: queueCode });
    //         if (!payQueue) {
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "payQueue not find",
    //             });
    //         }
    //         if (payQueue.amount03 != -1 && payQueue.amount03 != undefined) {
    //             if (student.serviceDistance <= 3000) {
    //                 payQueue.amount = payQueue.amount03;
    //             } else if (student.serviceDistance <= 7000) {
    //                 payQueue.amount = payQueue.amount37;
    //             } else {
    //                 payQueue.amount = payQueue.amount7i;
    //             }
    //         }
    //         const amount = payQueue.amount;
    //         const agency = await this.Agency.findById(agencyId, "settings");
    //         const student = await this.Student.findOne(
    //             { studentCode },
    //             "name lastName"
    //         );
    //         let name = "دانش آموز";

    //         if (!student || !agency) {
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "student or agency not find",
    //             });
    //         }
    //         const docListSanad = await this.DocListSanad.findOne({
    //             $and: [
    //                 {
    //                     $or: [
    //                         { accCode: "003005" + studentCode },
    //                         { forCode: "003005" + studentCode },
    //                     ],
    //                 },
    //                 { mId: queueCode },
    //                 { type: "invoice" },
    //             ],
    //         }).lean();
    //         if (docListSanad) {
    //             return this.response({
    //                 res,
    //                 code: 203,
    //                 message: "this queue is paid refresh please",
    //             });
    //         }
    //         name = student.name + " " + student.lastName + " کد " + studentCode;
    //         const wallet = agency.settings.find(
    //             (obj) => obj.wallet != undefined
    //         ).wallet;
    //         // console.log("setting", agency.settings);
    //         const costCode = agency.settings.find(
    //             (obj) => obj.cost != undefined
    //         ).cost;
    //         if (!costCode || !wallet) {
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "costCode || wallet not find",
    //             });
    //         }
    //         let mandeh = 0;
    //         const result = await this.DocListSanad.aggregate([
    //             {
    //                 $match: {
    //                     accCode: wallet,
    //                     agencyId: agencyId,
    //                 },
    //             },
    //             {
    //                 $group: {
    //                     _id: null,
    //                     total: {
    //                         $sum: {
    //                             $subtract: ["$bed", "$bes"],
    //                         },
    //                     },
    //                 },
    //             },
    //         ]);
    //         // console.log("result",result);
    //         mandeh = result[0]?.total || 0;
    //         if (amount > mandeh) {
    //             return this.response({
    //                 res,
    //                 code: 205,
    //                 message: "The account balance is insufficient",
    //             });
    //         }
    //         const desc = `پرداخت ${payQueue.title} از کیف پول بابت دانش آموز ${name}`;
    //         let doc = new this.DocSanad({
    //             agencyId,
    //             note: desc,
    //             sanadDate: new Date(),
    //             system: 3,
    //             definite: false,
    //             lock: true,
    //             editor: req.user._id,
    //         });
    //         await doc.save();
    //         let docPaid = new this.DocListSanad({
    //             agencyId,
    //             titleId: doc.id,
    //             doclistId: doc.sanadId,
    //             row: 1,
    //             bed: amount,
    //             bes: 0,
    //             note: desc,
    //             accCode: costCode,
    //             mId: doc.sanadId,
    //             peigiri: studentCode,
    //             sanadDate: new Date(),
    //         });
    //         await docPaid.save();
    //         await new this.DocListSanad({
    //             agencyId,
    //             titleId: doc.id,
    //             doclistId: doc.sanadId,
    //             row: 2,
    //             bed: 0,
    //             bes: amount,
    //             note: desc,
    //             accCode: wallet,
    //             mId: queueCode,
    //             type: "invoice",
    //             forCode: "003005" + studentCode,
    //             peigiri: studentCode,
    //             sanadDate: new Date(),
    //         }).save();

    //         // let payAction = new this.PayAction({
    //         //     setter: req.user._id,
    //         //     queueCode,
    //         //     amount,
    //         //     desc,
    //         //     isOnline: false,
    //         //     studentCode,
    //         //     docSanadNum: doc.sanadId,
    //         //     docSanadId: doc._id,
    //         //     agencyId,
    //         // });
    //         // await payAction.save();
    //         if (payQueue.type === 1) {
    //             let student = await this.Student.findOne({
    //                 studentCode: studentCode,
    //             });
    //             if (student.state < 2) {
    //                 student.state = 2;
    //                 student.stateTitle = "در انتظار پیش پرداخت";
    //                 await student.save();
    //             }
    //         }

    //         await new this.OperationLog({
    //             userId: req.user._id,
    //             name: req.user.name + " " + req.user.lastName,
    //             agencyId,
    //             targetIds: [student._id],
    //             targetTable: "student",
    //             sanadId: doc.sanadId,
    //             actionName: "setActionPayWithWallet",
    //             actionNameFa: "تایید اطلاعات و ثبت پرداخت از کیف پول",
    //             desc: desc,
    //         }).save();
    //         return this.response({
    //             res,
    //             data: { docPaid: docPaid, sanadId: doc.sanadId },
    //         });
    //     } catch (error) {
    //         console.error("Error while setActionPayWithWallet:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }
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
                "name lastName studentCode state stateTitle serviceDistance"
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
                        if (
                            invoice.distancePrice &&
                            invoice.distancePrice.length > 0
                        ) {
                            const matchedPricing = invoice.distancePrice.find(
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
                                    invoice.distancePrice[
                                        invoice.distancePrice.length - 1
                                    ].amount;
                            }
                        } else {
                            amount2 = invoice.amount;
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
                        if (
                            invoice.distancePrice &&
                            invoice.distancePrice.length > 0
                        ) {
                            const matchedPricing = invoice.distancePrice.find(
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
                                    invoice.distancePrice[
                                        invoice.distancePrice.length - 1
                                    ].amount;
                            }
                        } else {
                            amount2 = invoice.amount;
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

    // async setPayQueue(req, res) {
    //     try {
    //         const {
    //             id,
    //             amount,
    //             title,
    //             active,
    //             desc,
    //             schools,
    //             grades,
    //             students,
    //             optinal,
    //             maxDate,
    //             merchentId,
    //             listAccCode,
    //             listAccName,

    //             type,
    //         } = req.body;
    //         let { amount03, amount37, amount7i } = req.body;
    //         if (!amount03) {
    //             amount03 = -1;
    //         }
    //         if (!amount37) {
    //             amount37 = -1;
    //         }
    //         if (!amount7i) {
    //             amount7i = -1;
    //         }

    //         const confirmInfo = req.body.confirmInfo ?? true;
    //         const confirmPrePaid = req.body.confirmPrePaid ?? true;

    //         const agencyId =
    //             req.body.agencyId.trim() === "" ? null : req.body.agencyId;
    //         if (agencyId === null && !req.user.isadmin) {
    //             return this.response({
    //                 res,
    //                 code: 214,
    //                 message: "agency need",
    //             });
    //         }
    //         if (id === "0") {
    //             let code = 1;
    //             const lastQu = await this.PayQueue.find({})
    //                 .sort({ code: -1 })
    //                 .limit(1);
    //             if (lastQu.length > 0) {
    //                 code = lastQu[0].code + 1;
    //             }
    //             let payQueue = new this.PayQueue({
    //                 agencyId,
    //                 setter: req.user._id,
    //                 code,
    //                 amount,
    //                 amount03,
    //                 amount37,
    //                 amount7i,
    //                 maxDate,
    //                 merchentId,
    //                 title,
    //                 active,
    //                 desc,
    //                 schools,
    //                 grades,
    //                 students,
    //                 optinal,
    //                 confirmInfo,
    //                 confirmPrePaid,
    //                 listAccCode,
    //                 listAccName,
    //                 type,
    //             });
    //             await payQueue.save();
    //             return this.response({
    //                 res,
    //                 message: "new insert",
    //                 data: { code, id: payQueue.id },
    //             });
    //         }

    //         const pay = await this.PayQueue.findByIdAndUpdate(id, {
    //             amount,
    //             amount03,
    //             amount37,
    //             amount7i,
    //             title,
    //             active,
    //             desc,
    //             merchentId,
    //             schools,
    //             maxDate,
    //             grades,
    //             students,
    //             optinal,
    //             active,
    //             confirmInfo,
    //             confirmPrePaid,
    //             listAccCode,
    //             listAccName,
    //         });
    //         if (!pay) {
    //             this.response({
    //                 res,
    //                 code: 404,
    //                 message: "not find",
    //             });
    //             return;
    //         }
    //         return this.response({
    //             res,
    //             message: "update",
    //             data: { code: pay.code, id },
    //         });
    //     } catch (error) {
    //         console.error("Error while 00028:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }
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

            console.log("distancePrice", distancePrice);
            console.log("id", id);
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

    async getPayQueue(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const type = req.query.type || "other";
            const ag =
                req.query.agencyId.trim() === "" ? null : req.body.agencyId;
            if (ag === null || ag === "null") {
                const pays = await this.PayQueue.find({ agencyId: null });
                this.response({
                    res,
                    data: pays,
                });
                return;
            }
            let qu = [
                { agencyId: ObjectId.createFromHexString(req.query.agencyId) },
            ];
            console.log("type", type);
            if (type === "other") {
                qu.push({ $or: [{ type: "optional" }, { type: "force" }] });
            } else {
                qu.push({ type: type });
            }
            const pays = await this.PayQueue.find({ $and: qu });
            return this.response({
                res,
                data: pays,
            });
        } catch (error) {
            console.error("Error while 00029:", error);
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
            console.log("type", type);
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
                "studentCode service serviceNum serviceCost state gradeId school serviceDistance"
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
            if (pays.length == 0) {
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
            const { agencyId, studentId, cardNumber, refId, amount, payDate } =
                req.body;
            const isSheba = req.body.isSheba || false;
            console.log("isSheba", isSheba);

            let student = await this.Student.findById(studentId).session(
                session
            );

            if (!student) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 404,
                    message: "student not found",
                });
            }

            const distance = student.serviceDistance;

            const invoice = await this.Invoice.findOne({
                agencyId,
                type: "registration",
                active: true,
            })
                .session(session)
                .lean();

            let amountReg = invoice ? invoice.amount : 0;

            const invoice2 = await this.Invoice.findOne({
                agencyId,
                type: "prePayment",
                active: true,
            })
                .session(session)
                .lean();

            let amount2 = 0;
            if (invoice2) {
                if (
                    invoice2.distancePrice &&
                    invoice2.distancePrice.length > 0
                ) {
                    const matchedPricing = invoice2.distancePrice.find(
                        (priceItem) => priceItem.maxDistance * 1000 >= distance
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

            // ---- Handle Registration Payment ----
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
                    });
                } else {
                    payQueue.isPaid = true;
                    payQueue.isSetAuto = true;
                    payQueue.payDate = payDate;
                    payQueue.cardNumber = cardNumber;
                    payQueue.isSheba = isSheba;
                    payQueue.refId = refId;
                }
                await payQueue.save({ session });
            }

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
                    });
                } else {
                    prePayment.isPaid = true;
                    prePayment.isSetAuto = true;
                    prePayment.payDate = payDate;
                    prePayment.cardNumber = cardNumber;
                    prePayment.isSheba = isSheba;
                    prePayment.refId = refId;
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
