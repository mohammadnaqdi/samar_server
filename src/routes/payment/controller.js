const controller = require("../controller");
const axios = require("axios");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Zarin = require("zarinpal-checkout");

const TERMINAL = 99018831;

function generateRandom6Digit() {
    return Math.floor(100000 + Math.random() * 900000);
}

function generateInvoice(min = 11111111, max = 99999999) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateToken(amount, invoice) {
    try {
        if (!amount || (amount > 100000 && amount < 1000)) {
            amount = 10000;
        }
        if (!invoice || (invoice < 100000 && invoice > 10000000000)) {
            invoice = generateRandom6Digit();
        }
        const URL = "https://sepehr.shaparak.ir:8081/V1/PeymentApi/GetToken";

        const data = {
            Amount: amount,
            callbackUrl: `https://socket.${process.env.URL}/api/pay/verify2`,
            invoiceID: invoice,
            terminalID: TERMINAL,
            payload: "",
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
        console.error("Error while generating bank token:", error);
    }
}

module.exports = new (class extends controller {
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
        const payAction = await this.PayAction.find({
            queueCode,
            studentCode: req.query.stCode,
            delete: false,
        });
        if (payAction.length > 0) {
            return this.response({
                res,
                code: 210,
                message: "this queue is paid refresh please",
            });
        }

        if (payQueue.amount03 != -1 && payQueue.amount03 != undefined) {
            if (student.serviceDistance <= 3000) {
                payQueue.amount = payQueue.amount03;
            } else if (student.serviceDistance <= 7000) {
                payQueue.amount = payQueue.amount37;
            } else {
                payQueue.amount = payQueue.amount7i;
            }
        }

        let agencyId = payQueue.agencyId;
        let agency;
        if (agencyId != null) {
            agency = await this.Agency.findById(agencyId, "settings name");
            if (agency) {
                desc = desc + " شرکت " + agency.name;
            }
        }
        console.log(agency);

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

            // console.log("agency", agency);
        }
        console.log("payQueue", payQueue);
        if (!payQueue) {
            console.log("log here1");

            return this.response({
                res,
                code: 404,
                message: "Pay Queue not find",
            });
        }
        if (amount < 10000) {
            console.log("log here2");
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
            console.log("log here3");

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
            console.log("code", code);
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
            let invoice = generateInvoice();

            const check = await this.Transactions.findOne({
                authority: invoice,
            }).lean();
            if (check) {
                invoice = generateInvoice();
            }

            let token = await generateToken(amount, invoice);
            if (!token) {
                token = await generateToken(amount, invoice);
            }
            if (!token) {
                return res.status(201).json({
                    message: "خطای بانک",
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
            });
            await newTr.save();

            return res.json({
                success: true,
                message: `https://pay.samar-rad.ir?TerminalID=99018831&token=${token}`,
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
        const payAction = await this.PayAction.find({
            queueCode,
            studentCode: req.query.stCode,
            delete: false,
        });
        if (payAction.length > 0) {
            return this.response({
                res,
                code: 210,
                message: "this queue is paid refresh please",
            });
        }

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
            const desc = "شارژ کیف شرکت " + agency.name;
            // console.log("desc",desc)https://panel.${process.env.URL}/finance
            console.log(
                "ip",
                `https://socket.${process.env.URL}/api/pay/verifyCo`
            );
            const response = await zarinpal.PaymentRequest({
                Amount: amount / 10,
                // CallbackURL: "http://localhost:63594/finance",
                CallbackURL: `https://socket.${process.env.URL}/api/pay/verifyCo`,
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

    async setActionPay(req, res) {
        try {
            const { agencyId, queueCode, amount, desc, studentCode, sanadNum } =
                req.body;
            const docSanad = await this.DocSanad.findOne(
                { agencyId, sanadId: sanadNum },
                ""
            );
            if (!docSanad) {
                return this.response({
                    res,
                    code: 404,
                    message: "docSanad not find",
                });
            }
            let payAction = new this.PayAction({
                setter: req.user._id,
                queueCode,
                amount,
                desc,
                isOnline: false,
                studentCode,
                docSanadNum: sanadNum,
                docSanadId: docSanad._id,
                agencyId,
            });
            await payAction.save();

            return this.response({
                res,
                data: payAction.id,
            });
        } catch (error) {
            console.error("Error while 00023:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async showMorePay(req, res) {
        try {
            const { setter, transaction, sanad, agencyId } = req.body;
            console.log(req.body);
            const user = await this.User.findById(
                setter,
                "name lastName phone"
            );
            let transAction = null;
            if (transaction != null) {
                transAction = await this.Transactions.findById(
                    transaction,
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
                    if (doc.type === "student") {
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
            console.error("Error while 00024:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setActionPayWithWallet(req, res) {
        try {
            const { queueCode, studentCode } = req.body;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            let payQueue = await this.PayQueue.findOne({ code: queueCode });
            if (payQueue.amount03 != -1 && payQueue.amount03 != undefined) {
                if (student.serviceDistance <= 3000) {
                    payQueue.amount = payQueue.amount03;
                } else if (student.serviceDistance <= 7000) {
                    payQueue.amount = payQueue.amount37;
                } else {
                    payQueue.amount = payQueue.amount7i;
                }
            }
            const amount = payQueue.amount;
            const agency = await this.Agency.findById(agencyId, "settings");
            const student = await this.Student.findOne(
                { studentCode },
                "name lastName"
            );
            let name = "دانش آموز";

            if (!student || !agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "student or agency not find",
                });
            }
            name = student.name + " " + student.lastName + " کد " + studentCode;
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
            await new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 1,
                bed: amount,
                bes: 0,
                note: desc,
                accCode: costCode,
                isPaid: true,
                invoice: queueCode,
                peigiri: studentCode,
                sanadDate: new Date(),
            }).save();
            await new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 2,
                bed: 0,
                bes: amount,
                note: desc,
                accCode: wallet,
                isPaid: true,
                invoice: queueCode,
                peigiri: studentCode,
                sanadDate: new Date(),
            }).save();

            let payAction = new this.PayAction({
                setter: req.user._id,
                queueCode,
                amount,
                desc,
                isOnline: false,
                studentCode,
                docSanadNum: doc.sanadId,
                docSanadId: doc._id,
                agencyId,
            });
            await payAction.save();
            if (payQueue.type === 1) {
                let student = await this.Student.findOne({
                    studentCode: studentCode,
                });
                if (student.state < 2) {
                    student.state = 2;
                    student.stateTitle = "در انتظار پیش پرداخت";
                    await student.save();
                }
            }

            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId,
                targetIds: [student._id],
                targetTable: "student",
                sanadId: doc.sanadId,
                actionName: "setActionPayWithWallet",
                actionNameFa: "تایید اطلاعات و ثبت پرداخت از کیف پول",
                desc: desc,
            }).save();
            return this.response({
                res,
                data: { payAction: payAction, sanadId: doc.sanadId },
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

    async setPayQueue(req, res) {
        try {
            const {
                id,
                amount,
                title,
                active,
                desc,
                schools,
                grades,
                students,
                optinal,
                maxDate,
                merchentId,
                listAccCode,
                listAccName,

                type,
            } = req.body;
            let { amount03, amount37, amount7i } = req.body;
            if (!amount03) {
                amount03 = -1;
            }
            if (!amount37) {
                amount37 = -1;
            }
            if (!amount7i) {
                amount7i = -1;
            }

            const confirmInfo = req.body.confirmInfo ?? true;
            const confirmPrePaid = req.body.confirmPrePaid ?? true;

            const agencyId =
                req.body.agencyId.trim() === "" ? null : req.body.agencyId;
            if (agencyId === null && !req.user.isadmin) {
                return this.response({
                    res,
                    code: 214,
                    message: "agency need",
                });
            }
            if (id === "0") {
                let code = 1;
                const lastQu = await this.PayQueue.find({})
                    .sort({ code: -1 })
                    .limit(1);
                if (lastQu.length > 0) {
                    code = lastQu[0].code + 1;
                }
                let payQueue = new this.PayQueue({
                    agencyId,
                    setter: req.user._id,
                    code,
                    amount,
                    amount03,
                    amount37,
                    amount7i,
                    maxDate,
                    merchentId,
                    title,
                    active,
                    desc,
                    schools,
                    grades,
                    students,
                    optinal,
                    confirmInfo,
                    confirmPrePaid,
                    listAccCode,
                    listAccName,
                    type,
                });
                await payQueue.save();
                return this.response({
                    res,
                    message: "new insert",
                    data: { code, id: payQueue.id },
                });
            }

            const pay = await this.PayQueue.findByIdAndUpdate(id, {
                amount,
                amount03,
                amount37,
                amount7i,
                title,
                active,
                desc,
                merchentId,
                schools,
                maxDate,
                grades,
                students,
                optinal,
                active,
                confirmInfo,
                confirmPrePaid,
                listAccCode,
                listAccName,
            });
            if (!pay) {
                this.response({
                    res,
                    code: 404,
                    message: "not find",
                });
                return;
            }
            return this.response({
                res,
                message: "update",
                data: { code: pay.code, id },
            });
        } catch (error) {
            console.error("Error while 00028:", error);
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
            const pays = await this.PayQueue.find({
                agencyId: ObjectId.createFromHexString(req.query.agencyId),
            });
            return this.response({
                res,
                data: pays,
            });
        } catch (error) {
            console.error("Error while 00029:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getPayHistory(req, res) {
        try {
            if (req.query.queueCode === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "queueCode need",
                });
            }
            const queueCode = parseInt(req.query.queueCode);
            const studentCode = req.query.studentCode;
            const action = await this.PayAction.findOne({
                queueCode,
                studentCode,
                delete: false,
            });
            if (!action) {
                return this.response({
                    res,
                    code: 404,
                    message: "action not find",
                });
            }
            const transAction = await this.Transactions.findById(
                action.transaction
            );
            return this.response({
                res,
                data: { action, transAction },
            });
        } catch (error) {
            console.error("Error while 00030:", error);
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
                "studentCode serviceId serviceCost state gradeId school serviceDistance"
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
                code = kol + moeen + student.studentCode;
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
            if (student.state === 0) qr.push({ type: 1 });

            var searchQ = {
                $or: [
                    {
                        $and: [
                            { schools: student.school.toString() },
                            { grades: [] },
                            { students: [] },
                            { agencyId: null },
                        ],
                    },
                    {
                        $and: [
                            { schools: student.school.toString() },
                            { grades: [] },
                            { students: [] },
                            { agencyId },
                        ],
                    },
                    {
                        $and: [
                            { schools: student.school.toString() },
                            { grades: student.gradeId },
                            { students: [] },
                            { agencyId: null },
                        ],
                    },
                    {
                        $and: [
                            { schools: student.school.toString() },
                            { grades: student.gradeId },
                            { students: [] },
                            { agencyId },
                        ],
                    },
                    {
                        $and: [
                            { schools: [] },
                            { grades: student.gradeId },
                            { students: [] },
                            { agencyId: null },
                        ],
                    },
                    {
                        $and: [
                            { schools: [] },
                            { grades: student.gradeId },
                            { students: [] },
                            { agencyId },
                        ],
                    },
                    { students: code },
                    {
                        $and: [
                            { schools: [] },
                            { grades: [] },
                            { students: [] },
                            { agencyId },
                        ],
                    },
                    {
                        $and: [
                            { schools: [] },
                            { grades: [] },
                            { students: [] },
                            { agencyId: null },
                        ],
                    },
                ],
            };
            qr.push(searchQ);
            let payQueues = await this.PayQueue.find(
                { $and: qr },
                "agencyId active amount amount03 amount37 amount7i code createdAt desc merchentId maxDate optinal title confirmInfo confirmPrePaid listAccCode listAccName type"
            );

            for (var i in payQueues) {
                if (
                    payQueues[i].amount03 != -1 &&
                    payQueues[i].amount03 != undefined
                ) {
                    if (student.serviceDistance <= 3000) {
                        payQueues[i].amount = payQueues[i].amount03;
                    } else if (student.serviceDistance <= 7000) {
                        payQueues[i].amount = payQueues[i].amount37;
                    } else {
                        payQueues[i].amount = payQueues[i].amount7i;
                    }
                }
            }
            var pays = [];
            let addType7 = false;
            for (var payQueue of payQueues) {
                if (payQueue.type === 7 && remaining > 0) {
                    payQueue.amount =
                        (Math.abs(payQueue.amount) * Math.abs(remaining)) / 100;
                    payQueue.amount = financial(payQueue.amount);
                } else if (payQueue.amount < 0 && remaining < 0) {
                    payQueue.amount =
                        (Math.abs(payQueue.amount) * Math.abs(remaining)) / 100;
                }

                // if (payQueue.amount < 10000) {
                //     continue;
                // }

                const payAction = await this.PayAction.find({
                    queueCode: payQueue.code,
                    studentCode: student.studentCode,
                    delete: false,
                });
                if (
                    !(payAction.length === 0 && !payQueue.active) &&
                    (!addType7 || payQueue.type != 7)
                ) {
                    if (payAction.length > 0) {
                        // console.log("payAction[0].amount", payAction[0].amount);
                        // console.log("payAction[0].docSanadNum", payAction[0].docSanadNum);
                        payQueue.amount = payAction[0].amount;
                        const sanad = await this.DocSanad.findOne({
                            agencyId,
                            sanadId: payAction[0].docSanadNum,
                        });
                        if (sanad) {
                            const sanadList = await this.DocListSanad.findOne({
                                titleId: sanad,
                                accCode: code,
                            });
                            if (sanadList) {
                                payAction[0].amount = Math.abs(
                                    sanadList.bed - sanadList.bes
                                );
                            }
                        }
                    }
                    pays.push({ payQueue, payAction });
                    if (payQueue.type === 7 && payAction.length === 0) {
                        addType7 = true;
                    }
                }
            }

            return this.response({
                res,
                data: { pays, remaining },
            });
        } catch (error) {
            console.error("Error while 00032:", error);
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
