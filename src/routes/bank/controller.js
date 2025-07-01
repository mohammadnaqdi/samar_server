const controller = require("../controller");
const https = require("https");
const axios = require("axios");

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
        if(id!=undefined && id!=Null){
          const bankInfo=  await this.BankInfo.findByIdAndUpdate(new ObjectId(id),{
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
            { new: true });
          
    
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
            return
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
        console.log("id",id)
        const bankInfo=  await this.BankInfo.findById(id);
        console.log("bankInfo",bankInfo)
          
    
          
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
                    console.error("error 1 in chequeInquiryTransfer",error);
                    return this.response({
                        res,
                        code: 217,
                        error,
                    });
                });
        } catch (error) {
            console.error("error 2 in chequeInquiryTransfer",error);
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
                    console.error("error 1 in getForWhatList",error);
                    return this.response({
                        res,
                        code: 217,
                        error,
                    });
                });
        } catch (error) {
            console.error("error 2 in getForWhatList",error);
            return this.response({
                res,
                code: 217,
                error,
            });
        }
    }
})();
