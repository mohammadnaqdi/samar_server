const controller = require("../controller");
const https = require("https");
const axios = require("axios");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;
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
module.exports = new (class extends controller {
    async bnkBanksInsert(req, res) {
        try {
            const id = req.body.id;
            const codeHesab = req.body.hesab;
            const agencyId = req.body.agencyId;
            const iranBankId = req.body.iranBankId;
            const bankName = req.body.bankName;
            const branchCode = req.body.branchCode;
            const branchName = req.body.branchName;
            const accType = req.body.accType.trim();
            const numHesab = req.body.numHesab;
            const eCard = req.body.eCard.trim();
            const owner = req.body.owner.trim();
            const addressBank = req.body.addressBank.trim();
            const addressTel = req.body.addressTel.trim();
            const serialCheck = req.body.serialCheck;
            const costCenter = req.body.costCenter.trim();
            const shMeli = req.body.nationalCode.trim();
            const editor = req.user.id;
            if (id !== undefined && id !== null) {
                const bankInfo = await this.BankInfo.findByIdAndUpdate(
                    id,
                    {
                        editor,
                        codeHesab,
                        iranBankId,
                        bankName,
                        branchCode,
                        branchName,
                        accType,
                        numHesab,
                        eCard,
                        owner,
                        addressBank,
                        addressTel,
                        serialCheck,
                        costCenter,
                        shMeli,
                    },
                    { new: true }
                );

                // await new this.OperatorAction({
                //     actUserID: req.user.coId,
                //     actType: 2,
                //     actName: "ویرایش",
                //     actTableName: "Tbl_BankInfo",
                //     actKeyField: iranBankId.toString(),
                //     actFormEn: "FrmBankiranSave",
                //     actFormFa: "ویرایش حساب بانکی",
                //     actDescription: `ویرایش حساب بانکی در ${bankName} به نام ${owner}`,
                // }).save();
                res.json(bankInfo);
                return;
            }
            let bankInfo = new this.BankInfo({
                agencyId,
                editor,
                codeHesab,
                iranBankId,
                bankName,
                branchCode,
                branchName,
                accType,
                numHesab,
                eCard,
                owner,
                addressBank,
                addressTel,
                serialCheck,
                costCenter,
                shMeli,
            });
            await bankInfo.save();

            // await new this.OperatorAction({
            //     actUserID: req.user.coId,
            //     actType: 1,
            //     actName: "ثبت",
            //     actTableName: "Tbl_BankInfo",
            //     actKeyField: iranBankId.toString(),
            //     actFormEn: "FrmBankiranSave",
            //     actFormFa: "ایجاد حساب بانکی",
            //     actDescription: `ثبت حساب بانکی در ${bankName} به نام ${owner}`,
            // }).save();
            res.json(bankInfo);
            return;
        } catch (error) {
            console.error("Error while bnkBanksInsert:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async bnkBanksById(req, res) {
        try {
            const id = req.query.id;
            console.log("id", id);
            const bankInfo = await this.BankInfo.findById(id);
            console.log("bankInfo", bankInfo);

            res.json(bankInfo);
            return;
        } catch (error) {
            console.error("Error while bnkBanksById:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getAddAccUrl(req, res) {
        if (
            req.query.bank === undefined ||
            req.query.nt === undefined ||
            req.query.bank.trim() === "" ||
            req.query.nt.trim() === ""
        ) {
            return this.response({
                res,
                code: 214,
                message: "bank and nt need",
            });
        }
        const nt = req.query.nt;
        const bank = req.query.bank;

        const url =
            "https://192.168.0.53:44310/v1/api/Information/GetRedirectUrl";
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "get",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                Bank: bank,
                NationalCode: nt,
                AppName: "taxi",
            },
        };
        try {
            const response = await axios.request(config);
            return res.json(response.data);
        } catch (error) {
            console.error("Error while getting add account URL:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getTypes(req, res) {
        const url =
            "https://192.168.0.53:44310/v1/api/Information/GetAllTypeId";
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "get",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                AppName: "taxi",
            },
        };
        try {
            const response = await axios.request(config);
            return res.json(response.data);
        } catch (error) {
            console.error("Error while getting types:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAllTypes(req, res) {
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config1 = {
            method: "get",
            httpsAgent,
            url: "https://192.168.0.53:44310/v1/api/Information/GetAllTypeId",
        };
        let config2 = {
            method: "get",
            httpsAgent,
            url: "https://192.168.0.53:44310/v1/api/Information/GetAllChequeMedia",
        };
        let config3 = {
            method: "get",
            httpsAgent,
            url: "https://192.168.0.53:44310/v1/api/Information/GetAllChequeType",
        };
        let config4 = {
            method: "get",
            httpsAgent,
            url: "https://192.168.0.53:44310/v1/api/Information/GetAllIdentityTyp",
        };
        try {
            const response1 = await axios.request(config1);
            const response2 = await axios.request(config2);
            const response3 = await axios.request(config3);
            const response4 = await axios.request(config4);

            return res.json({
                TypeIds: response1.data,
                chequeMedia: response2.data,
                chequeType: response3.data,
                identityType: response4.data,
            });
        } catch (error) {
            console.error("Error while getting all types:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getMyBank(req, res) {
        if (req.query.nt === undefined || req.query.nt.trim() === "") {
            return this.response({
                res,
                code: 214,
                message: "national code need",
            });
        }
        const nt = req.query.nt;

        const url =
            "https://192.168.0.53:44310/v1/api/Information/GetFullInformation";
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "get",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                NationalCode: nt,
                AppName: "taxi",
            },
        };
        try {
            const response = await axios.request(config);
            return res.json(response.data);
        } catch (error) {
            console.error("Error while getting my bank information:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getMyBankAccess(req, res) {
        if (req.query.id === undefined || req.query.id.trim() === "") {
            return this.response({
                res,
                code: 214,
                message: "id need",
            });
        }
        const id = req.query.id;

        const url =
            "https://192.168.0.53:44310/v1/api/Information/GetInformation?Id=" +
            id;
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "get",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
        };
        try {
            const response = await axios.request(config);
            return res.json(response.data);
        } catch (error) {
            console.error("Error while getting my bank access:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getAccountList(req, res) {
        const { nationalCode, bank, sourceAccount, fromDate, toDate } =
            req.body;

        const url = `https://192.168.0.53:44310/v1/api/Shahin/Account/GetAccountStatement`;
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "post",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                Bank: bank,
                NationalCode: nationalCode,
                AppName: "taxi",
            },
        };
        try {
            const response = await axios.post(
                url,
                {
                    fromDate,
                    fromTime: "000000",
                    toDate,
                    toTime: "235959",
                    sourceAccount,
                },
                config
            );
            return res.json(response.data);
        } catch (error) {
            console.error("Error while getting account list:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async chequeRegister(req, res) {
        const {
            nationalCode,
            bank,
            sourceAccount,
            amount,
            chequeMedias,
            description = " ",
            dueDate,
            sayadId,
            serialNo,
            seriesNo,
            accountOwners,
            receivers,
            signers,
            branchCode,
            chequeTypes,
            reason,
        } = req.body;

        const url = `https://192.168.0.53:44310/v1/api/Shahin/ChequeSayad/ChequeRregister`;
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "post",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                Bank: bank,
                NationalCode: nationalCode,
                AppName: "taxi",
            },
        };
        try {
            const response = await axios.post(
                url,
                {
                    amount,
                    chequeMedias,
                    dueDate,
                    description,
                    sourceAccount,
                    sayadId,
                    serialNo,
                    seriesNo,
                    accountOwners,
                    receivers,
                    signers,
                    branchCode,
                    chequeTypes,
                    reason,
                },
                config
            );
            return res.json(response.data);
        } catch (error) {
            console.error("Error while registering cheque:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async chequeAccept(req, res) {
        const { nationalCode, bank, sayadId, idTypes, accepts } = req.body;

        const url = `https://192.168.0.53:44310/v1/api/Shahin/ChequeSayad/ChequeAccept`;
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "post",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                Bank: bank,
                NationalCode: nationalCode,
                AppName: "taxi",
            },
        };
        try {
            const response = await axios.post(
                url,
                {
                    bank,
                    sayadId,
                    acceptor: {
                        idCode: nationalCode,
                        idTypes,
                    },
                    accepts,
                },
                config
            );
            return res.json(response.data);
        } catch (error) {
            console.error("Error while accepting cheque:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async chequeInquiryHolder(req, res) {
        const { nationalCode, bank, sayadId, idTypes } = req.body;

        const url = `https://192.168.0.53:44310/v1/api/Shahin/ChequeSayad/ChequeInquiryHolder`;
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "post",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                Bank: bank,
                NationalCode: nationalCode,
                AppName: "taxi",
            },
        };
        try {
            const response = await axios.post(
                url,
                {
                    bank,
                    sayadId,
                    idCode: nationalCode,
                    idTypes,
                },
                config
            );
            return res.json(response.data);
        } catch (error) {
            console.error("Error while inquiring cheque holder:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async chequeInquiryTransfer(req, res) {
        const nationalCode = req.body.nationalCode;
        const bank = req.body.bank;
        const sayadId = req.body.sayadId;
        const idTypes = req.body.idTypes;
        // const accepts=req.body.accepts;

        console.log("sayadId", sayadId);

        const url = `https://192.168.0.53:44310/v1/api/Shahin/ChequeSayad/ChequeInquiryTransfer`;
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "post",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
            headers: {
                Bank: bank,
                NationalCode: nationalCode,
                AppName: "taxi",
            },
        };
        try {
            await axios
                .post(
                    url,
                    {
                        bank: bank,
                        sayadId: sayadId,
                        idCode: nationalCode,
                        idTypes: idTypes,
                    },
                    config
                )
                .then((response) => {
                    // console.log(JSON.stringify(response.data));
                    return res.json(response.data);
                })
                .catch((error) => {
                    console.error("error 1 in chequeInquiryTransfer", error);
                    return this.response({
                        res,
                        code: 217,
                        error,
                    });
                });
        } catch (error) {
            console.error("error 2 in chequeInquiryTransfer", error);
            return this.response({
                res,
                code: 217,
                error,
            });
        }
    }

    async getForWhatList(req, res) {
        const url =
            "https://192.168.0.53:44310/v1/api/Information/GetAllReasons";
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        let config = {
            method: "get",
            httpsAgent,
            maxBodyLength: Infinity,
            url,
        };
        try {
            await axios
                .request(config)
                .then((response) => {
                    return res.json(response.data);
                })
                .catch((error) => {
                    console.error("error 1 in getForWhatList", error);
                    return this.response({
                        res,
                        code: 217,
                        error,
                    });
                });
        } catch (error) {
            console.error("error 2 in getForWhatList", error);
            return this.response({
                res,
                code: 217,
                error,
            });
        }
    }

    async setBankGate(req, res) {
        try {
            const {
                agencyId,
                bankName,
                bankCode,
                type,
                card,
                terminal,
                userName,
                userPass,
                hesab,
                active,
                personal,
            } = req.body;

            if (!agencyId) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId required",
                });
            }

            const find = await this.BankGate.findOne({ agencyId, type }).lean();
            if (!find) {
                await this.BankGate.create({
                    agencyId,
                    editor: req.user._id,
                    bankName,
                    bankCode,
                    type,
                    card,
                    terminal,
                    userName,
                    userPass,
                    hesab,
                    active,
                    personal,
                });

                return res.json({ message: "Done" });
            }

            await this.BankGate.findByIdAndUpdate(find._id, {
                agencyId,
                editor: req.user._id,
                bankName,
                bankCode,
                type,
                card,
                terminal,
                userName,
                userPass,
                hesab,
                active,
                personal,
            });
            return res.json({ message: "Done" });
        } catch (error) {
            console.error("Error in setBankGate:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getBankGate(req, res) {
        try {
            const { agencyId } = req.query;
            if (!agencyId) {
                return res.status(404).json({ message: "Invalid agencyId!" });
            }

            const find = await this.BankGate.find({ agencyId }).lean();
            return res.json(find);
        } catch (error) {
            console.error("Error in getBankGate:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getBankGateOnlyCard(req, res) {
        try {
            const { agencyId } = req.query;
            if (!agencyId) {
                return res.status(404).json({ message: "Invalid agencyId!" });
            }

            const find = await this.BankGate.findOne({ agencyId,type:"CARD" }).lean();
            return res.json(find);
        } catch (error) {
            console.error("Error in getBankGateOnlyCard:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getBankGate4Parent(req, res) {
        try {
            const { agencyId } = req.query;
            if (!agencyId) {
                return res.status(404).json({ message: "Invalid agencyId!" });
            }

            const find = await this.BankGate.find(
                { agencyId, active: true },
                "type bankName card terminal bankCode installments prePayment userName"
            ).lean();

            return res.json(find);
        } catch (error) {
            console.error("Error in getBankGate4Parent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getAgencyPayCards(req, res) {
        try {
            const { agencyId } = req.query;
            if (!agencyId) {
                return res.status(404).json({ message: "Invalid agencyId!" });
            }
            let match={
                        isPaid: true,
                        cardNumber: { $nin: ["", null] },
                        agencyId: ObjectId.createFromHexString(agencyId),
                        delete: false,
                    };
            if(req.query.studentId && req.query.studentId.trim()!=''){
                match.studentId=ObjectId.createFromHexString(req.query.studentId);
            }
            const payCards = await this.PayQueue.aggregate([
                {
                    $match: match,
                },
                {
                    $group: {
                        _id: {
                            cardNumber: "$cardNumber",
                            refId: "$refId",
                        },
                        docs: { $push: "$$ROOT" }, // keep full documents
                    },
                },
                {
                    $project: {
                        "docs.isPaid": 0,
                        "docs.delete": 0,
                        "docs.authority": 0,
                        "docs.createdAt": 0,
                        "docs.updatedAt": 0,
                        "docs.__v": 0,
                    },
                },
            ]);

            let pays = [];
            for (var card of payCards) {
                console.log("card", card);
                const docs = card["docs"];
                const ccc = card["_id"];
                let payDate = docs[0].payDate;
                let studentId = docs[0].studentId;
                let cardPays = [];
                const student = await this.Student.findById(
                    docs[0].studentId,
                    "name lastName studentCode parent state stateTitle"
                ).lean();
                if (student) {
                    const parent = await this.Parent.findById(
                        student.parent,
                        "phone name lastName"
                    ).lean();
                    if (parent) {
                        for (var doc of docs) {
                            cardPays.push({
                                id: doc["_id"],
                                type: doc["type"],
                                amount: doc["amount"],
                                title: doc["title"],
                                counter: doc["counter"],
                                maxDate: doc["maxDate"],
                                code: doc["code"],
                                studentName:
                                    student.name + " " + student.lastName,
                                parentName: parent.name + " " + parent.lastName,
                                phone: parent.phone,
                                studentCode: student.studentCode,
                                state: student.state,
                                stateTitle: student.stateTitle,
                            });
                        }
                    }
                }
                if (cardPays.length > 0) {
                    pays.push({
                        cardNumber: ccc["cardNumber"],
                        refId: ccc["refId"],
                        payDate,
                        cardPays,studentId
                    });
                }
            }

            return res.json(pays);
        } catch (error) {
            console.error("Error in getAgencyPayCards:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async rejectPayCard(req, res) {
        const session = await this.PayQueue.startSession();
        session.startTransaction();

        try {
            const { idPay, idReg, idPre, agencyId } = req.query;

            if (!agencyId) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: "Invalid agencyId!" });
            }

            const agency = await this.Agency.findById(
                agencyId,
                "name tel"
            ).lean();
            if (!agency) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: "Agency not found" });
            }

            let parentPhone = "";
            console.log("000000000000");
            const rejectPayCardHelper = async (
                payQueueId,
                newState,
                newStateTitle
            ) => {
                if (!payQueueId || payQueueId.trim() === "") return;

                const payCard = await this.PayQueue.findById(
                    payQueueId
                ).session(session);
                if (!payCard) return;

                payCard.isPaid = false;
                payCard.cardNumber = "";
                payCard.refId = "";
                await payCard.save({ session });

                const student = await this.Student.findByIdAndUpdate(
                    payCard.studentId,
                    { state: newState, stateTitle: newStateTitle },
                    { new: true, session }
                );

                if (student && parentPhone === "") {
                    const parent = await this.Parent.findById(
                        student.parent,
                        "phone"
                    ).lean();
                    if (parent) parentPhone = parent.phone;
                }
            };

            // Reject prePayment
            await rejectPayCardHelper(idPre, 1, "نیاز به تایید اطلاعات");

            // Reject registration
            await rejectPayCardHelper(idReg, 0, "ثبت شده");

            await session.commitTransaction();
            session.endSession();

            // Send SMS if parentPhone is available
            if (parentPhone !== "") {
                const text = `والدین گرامی واریز ثبت شده شما برای سرویس مدارس از طرف مدیر شرکت رد گردید.
${agency.name} - ${agency.tel}
دستیار هوشمند سمر`;

                const postData = {
                    UserName: amootUser,
                    Password: amootPass,
                    SendDateTime: getFormattedDateTime(new Date()),
                    SMSMessageText: text,
                    LineNumber: "service",
                    Mobiles: parentPhone,
                };
                console.log("text", text);
                const config = {
                    method: "post",
                    url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
                    headers: {
                        Authorization: amoot_t,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data: postData,
                };

                axios(config)
                    .then((response) => {
                        console.log(
                            "SMS response:",
                            JSON.stringify(response.data)
                        );
                    })
                    .catch((error) => {
                        console.error(
                            "SMS sending error:",
                            error.message || error
                        );
                    });
            }

            return res.json({ message: "ok" });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error in rejectPayCard:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
