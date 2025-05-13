const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const persianDate = require("persian-date");

module.exports = new (class extends controller {
    async accDoc(req, res) {
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
            const agencyId = req.query.agencyId;
            const sanad = await this.DocSanad.find({ agencyId }, "sanadId")
                .sort({ sanadId: -1 })
                .limit(1);
            let num = 2;
            if (sanad.length > 0) {
                num = sanad[0].sanadId + 1;
            }
            return this.response({
                res,
                data: num,
            });
        } catch (error) {
            console.error("Error in accDoc:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sumSanads(req, res) {
        try {
            if (
                req.query.code === undefined ||
                req.query.agencyId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "code and agencyId need",
                });
            }
            const code = req.query.code;
            const agencyId = req.query.agencyId;
            const result = await this.DocListSanad.aggregate([
                {
                    $match: {
                        accCode: code,
                        agencyId: ObjectId.createFromHexString(agencyId),
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: { $subtract: ["$bed", "$bes"] },
                        },
                    },
                },
            ]);

            const totalAmount = result[0]?.total || 0;

            return res.json(totalAmount);
        } catch (error) {
            console.error("Error in sumSanads:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async accActionShow(req, res) {
        try {
            let docId = req.query.docId ?? null;
            let titleId = req.query.titleId ?? null;

            if (docId === null && titleId === null) {
                return res.status(214).json({ msg: "docId or docTitle need" });
            }
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }

            let agencyId = ObjectId.createFromHexString(req.query.agencyId);
            let sanadId = parseInt(docId);
            if (isNaN(sanadId) || !agencyId) {
                return res
                    .status(213)
                    .json({ msg: "input data is not correct" });
            }

            const sanad = await this.DocSanad.findOne({ agencyId, sanadId });
            if (!sanad) {
                return res.status(404).json("not find");
            }

            let user = await this.User.findById(sanad.editor, "name lastName");
            if (!user) {
                const userHa = await this.UserHa.findById(sanad.editor, "name");
                user = { name: userHa.name, lastName: "" };
            }

            const sanadList = await this.DocListSanad.find(
                { agencyId, titleId: sanad.id },
                "row bed bes note accCode peigiri"
            );
            if (!sanadList) {
                return res.status(500).json("sql not answer");
            }
            if (sanadList.length === 0) {
                return res.status(404).json("doc not find");
            }

            let hesabs = [];
            for (const sl of sanadList) {
                const acclist = await this.ListAcc.findOne(
                    { agencyId, code: sl.accCode },
                    "code codeLev1 codeLev2 codeLev3 groupId type nature"
                );
                if (!acclist) continue;

                const code = await this.LevelAccDetail.findOne(
                    { agencyId, accCode: acclist.codeLev3 },
                    "accCode accName levelType desc"
                );

                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            accCode: sl.accCode,
                            agencyId: agencyId,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: { $subtract: ["$bed", "$bes"] },
                            },
                        },
                    },
                ]);

                const mandeh = result[0]?.total || 0;
                hesabs.push({ code: code || null, mandeh, acclist });
            }

            return res.json({
                sanad,
                sanadList,
                hesabs,
                user,
            });
        } catch (error) {
            console.error("Error in accActionShow:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async accDocInsert(req, res) {
        let session;
        let isTransactionSupported = true;

        try {
            // Attempt to start a session and transaction
            session = await this.DocSanad.startSession();
            session.startTransaction();
        } catch (error) {
            // If transaction start fails due to replica set requirement, fallback to non-transactional mode
            if (
                error.message.includes("Transaction numbers are only allowed")
            ) {
                isTransactionSupported = false;
                session.endSession();
                session = null;
            } else {
                throw error; // Rethrow other errors
            }
        }

        try {
            const note = req.body.note.trim();
            const date = req.body.date;
            const faree = req.body.faree.trim();
            const atf = req.body.atf.trim();
            const notes = req.body.notes;
            const besPrice = req.body.besPrice;
            const bedPrice = req.body.bedPrice;
            const accCode = req.body.accCode;
            const peigiri = req.body.peigiri;
            const agencyId = req.body.agencyId;
            const serviceNum = req.body.serviceNum || 0;
            const days = req.body.days || [];

            if (
                notes.length !== besPrice.length ||
                bedPrice.length !== besPrice.length ||
                accCode.length !== besPrice.length ||
                accCode.length !== peigiri.length
            ) {
                if (isTransactionSupported) {
                    await session.abortTransaction();
                    session.endSession();
                }
                return this.response({
                    res,
                    code: 300,
                    message: "all length must be equal",
                });
            }

            for (const code of accCode) {
                const aa = code.substring(6);
                const level = await this.LevelAccDetail.findOne(
                    {
                        accCode: aa,
                        agencyId,
                    },
                    null,
                    { session: isTransactionSupported ? session : null }
                );

                if (!level || level.levelType === 3) {
                    if (isTransactionSupported) {
                        await session.abortTransaction();
                        session.endSession();
                    }
                    return this.response({
                        res,
                        code: 300,
                        message: "cant access",
                    });
                }
            }

            let doc = new this.DocSanad({
                agencyId,
                note,
                sanadDate: date,
                system: 1,
                definite: false,
                lock: false,
                editor: req.user._id,
                faree,
                atf,
            });
            await doc.save({
                session: isTransactionSupported ? session : null,
            });

            for (let i = 0; i < besPrice.length; i++) {
                let day = 0;
                if (days[i]) {
                    day = days[i];
                }
                let docList = new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: i + 1,
                    bed: bedPrice[i],
                    bes: besPrice[i],
                    note: notes[i],
                    accCode: accCode[i],
                    peigiri: peigiri[i],
                    sanadDate: date,
                    serviceNum,
                    days: day,
                });
                await docList.save({
                    session: isTransactionSupported ? session : null,
                });
            }
            if (isTransactionSupported) {
                await session.commitTransaction();
                session.endSession();
            }

            return this.response({
                res,
                message: "ok",
                data: doc.sanadId,
            });
        } catch (error) {
            if (isTransactionSupported) {
                await session.abortTransaction();
                session.endSession();
            }
            console.error("Error in accDocInsertT:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    // async accDocInsertT(req, res) {
    //     try {
    //         const note = req.body.note.trim();
    //         const date = req.body.date;
    //         const faree = req.body.faree.trim();
    //         const atf = req.body.atf.trim();
    //         const notes = req.body.notes;
    //         const besPrice = req.body.besPrice;
    //         const bedPrice = req.body.bedPrice;
    //         const accCode = req.body.accCode;
    //         const peigiri = req.body.peigiri;
    //         const agencyId = req.body.agencyId;
    //         const serviceNum = req.body.serviceNum || 0;
    //         const days = req.body.days || [];
    //         console.log("accCode=", accCode);
    //         console.log("besPrice=", besPrice);
    //         console.log("bedPrice=", bedPrice);
    //         if (
    //             notes.length !== besPrice.length ||
    //             bedPrice.length !== besPrice.length ||
    //             accCode.length !== besPrice.length ||
    //             accCode.length !== peigiri.length
    //         ) {
    //             return this.response({
    //                 res,
    //                 code: 300,
    //                 message: "all length must be equal",
    //             });
    //         }
    //         console.log("agencyId=", agencyId);

    //         for (const code of accCode) {
    //             const aa = code.substring(6);

    //             const level = await this.LevelAccDetail.findOne({
    //                 accCode: aa,
    //                 agencyId,
    //             });
    //             console.log("aa=", aa);
    //             console.log("level=", level);
    //             if (!level || level.levelType === 3) {
    //                 return this.response({
    //                     res,
    //                     code: 300,
    //                     message: "cant access",
    //                 });
    //             }
    //         }

    //         let doc = new this.DocSanad({
    //             agencyId,
    //             note,
    //             sanadDate: date,
    //             system: 1,
    //             definite: false,
    //             lock: false,
    //             editor: req.user._id,
    //             faree,
    //             atf,
    //         });
    //         await doc.save();

    //         for (let i = 0; i < besPrice.length; i++) {
    //             let day = 0;
    //             if (days[i]) {
    //                 day = days[i];
    //             }
    //             let docList = new this.DocListSanad({
    //                 agencyId,
    //                 titleId: doc.id,
    //                 doclistId: doc.sanadId,
    //                 row: i + 1,
    //                 bed: bedPrice[i],
    //                 bes: besPrice[i],
    //                 note: notes[i],
    //                 accCode: accCode[i],
    //                 peigiri: peigiri[i],
    //                 sanadDate: date,
    //                 serviceNum,
    //                 days: day,
    //             });
    //             await docList.save();
    //         }

    //         return this.response({
    //             res,
    //             message: "ok",
    //             data: doc.sanadId,
    //         });
    //     } catch (error) {
    //         console.error("Error in accDocInsertT:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async accDocInsertALL(req, res) {
        try {
            const note = "تتمه حق سرویس";
            const date = new Date();
            const faree = "";
            const atf = "";
            const agencyId = ObjectId.createFromHexString(
                "65a3923ccf2856d13b3600c4"
            );
            const serviceNum = 0;
            const days = [];
            const schools = await this.School.find({ agencyId }).distinct(
                "_id"
            );
            if (!schools) {
                return res.status(404).json({ error: "schools NotFind" });
            }
            for (var sc of schools) {
                let notes = ["خدمات نرم افزاری"];
                let besPrice = [650000];
                let bedPrice = [0];
                let accCode = ["006008000000005"];
                let peigiri = [""];
                const students = await this.Student.find(
                    {
                        school: ObjectId.createFromHexString(sc),
                        state: 4,
                        delete: false,
                    },
                    "studentCode"
                );
                console.log("student count", students.length);
                if (students.length === 0) continue;
                besPrice = [students.length * 650000];
                for (var st of students) {
                    notes.push("تتمه حق سرویس");
                    besPrice.push(0);
                    bedPrice.push(650000);
                    accCode.push("003005" + st.studentCode);
                    peigiri.push("");
                }
                let doc = new this.DocSanad({
                    agencyId,
                    note,
                    sanadDate: date,
                    system: 1,
                    definite: false,
                    lock: false,
                    editor: req.user._id,
                    faree,
                    atf,
                });
                await doc.save();

                for (let i = 0; i < besPrice.length; i++) {
                    let day = 0;
                    if (days[i]) {
                        day = days[i];
                    }
                    let docList = new this.DocListSanad({
                        agencyId,
                        titleId: doc.id,
                        doclistId: doc.sanadId,
                        row: i + 1,
                        bed: bedPrice[i],
                        bes: besPrice[i],
                        note: notes[i],
                        accCode: accCode[i],
                        peigiri: peigiri[i],
                        sanadDate: date,
                        serviceNum,
                        days: day,
                    });
                    await docList.save();
                }

                // break;
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in accDocInsertALL:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async chargeCompanyByAdmin(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const price = req.body.price;
            const agency = await this.Agency.findById(agencyId);
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "company not find",
                });
            }

            const wallet = agency.settings.find(
                (obj) => obj.wallet !== undefined
            ).wallet;
            const charge = agency.settings.find(
                (obj) => obj.charge !== undefined
            ).charge;

            let doc = new this.DocSanad({
                agencyId,
                note: "افزایش اعتبار توسط ادمین",
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
                bed: price,
                bes: 0,
                note: "افزایش اعتبار توسط ادمین",
                accCode: wallet,
                peigiri: "",
                sanadDate: new Date(),
            }).save();

            await new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 2,
                bed: 0,
                bes: price,
                note: "افزایش اعتبار توسط ادمین",
                accCode: charge,
                peigiri: "",
                sanadDate: new Date(),
            }).save();

            return this.response({
                res,
                message: "ok",
                data: doc.sanadId,
            });
        } catch (error) {
            console.error("Error in chargeCompanyByAdmin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async unChargeCompanyByAdmin(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const price = req.body.price;
            const agency = await this.Agency.findById(agencyId);
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "company not find",
                });
            }

            const wallet = agency.settings.find(
                (obj) => obj.wallet !== undefined
            ).wallet;
            const charge = agency.settings.find(
                (obj) => obj.charge !== undefined
            ).charge;

            let doc = new this.DocSanad({
                agencyId,
                note: "کاهش اعتبار توسط ادمین",
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
                bed: price,
                bes: 0,
                note: "کاهش اعتبار توسط ادمین",
                accCode: charge,
                peigiri: "",
                sanadDate: new Date(),
            }).save();
            await new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 2,
                bed: 0,
                bes: price,
                note: "کاهش اعتبار توسط ادمین",
                accCode: wallet,
                peigiri: "",
                sanadDate: new Date(),
            }).save();

            return this.response({
                res,
                message: "ok",
                data: doc.sanadId,
            });
        } catch (error) {
            console.error("Error in chargeCompanyByAdmin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async accDocEditT(req, res) {
        try {
            const note = req.body.note.trim();
            const titleId = req.body.titleId;
            const date = req.body.date;
            const atf = req.body.atf.trim();
            const notes = req.body.notes;
            const besPrice = req.body.besPrice;
            const bedPrice = req.body.bedPrice;
            const accCode = req.body.accCode;
            const peigiri = req.body.peigiri;
            const agencyId = req.body.agencyId;

            // console.log("besPrice", besPrice);

            if (
                notes.length !== besPrice.length ||
                bedPrice.length !== besPrice.length ||
                accCode.length !== besPrice.length ||
                accCode.length !== peigiri.length
            ) {
                return this.response({
                    res,
                    code: 300,
                    message: "all length must be equal",
                });
            }

            for (const code of accCode) {
                const aa = code.substring(6);
                const level = await this.LevelAccDetail.findOne({
                    accCode: aa,
                    agencyId,
                });
                if (!level || level.levelType === 3) {
                    return this.response({
                        res,
                        code: 300,
                        message: "cant access",
                    });
                }
            }

            await this.DocSanad.findByIdAndUpdate(titleId, {
                note,
                sanadDate: date,
                editor: req.user._id,
                atf,
            });

            await this.DocListSanad.deleteMany({ titleId });
            for (const [i, bes] of besPrice.entries()) {
                const find = await this.DocSanad.findById(titleId);
                let docList = new this.DocListSanad({
                    agencyId,
                    titleId,
                    doclistId: find.sanadId,
                    row: i + 1,
                    bed: bedPrice[i],
                    bes: bes,
                    note: notes[i],
                    accCode: accCode[i],
                    peigiri: peigiri[i],
                    sanadDate: date,
                });
                // console.log("i", i);
                await docList.save();
            }

            return this.response({
                res,
                message: "ok",
                data: titleId,
            });
        } catch (error) {
            console.error("Error in accDocEditT:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async gozareshHesab(req, res) {
        try {
            if (req.query.code === undefined || req.query.code.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "code  need",
                });
            }
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const code = req.query.code;
            const startDate = req.query.start;
            const endDate = req.query.end;
            let start = null,
                end = null;

            if (startDate) {
                start = Date.parse(startDate);
            }
            if (endDate) {
                end = Date.parse(endDate);
            }

            let qr = [{ agencyId }, { accCode: code }];
            if (start && !end) {
                qr.push({ sanadDate: { $gte: start } });
            } else if (!start && end) {
                qr.push({ sanadDate: { $lte: end } });
            } else if (start && end) {
                qr.push({ sanadDate: { $gte: start, $lte: end } });
            }

            let mandeh = 0;
            if (start) {
                const stt = new Date(formatDate(start));
                const yesterday = new Date();
                yesterday.setDate(stt.getDate() - 1);

                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            sanadDate: { $lte: yesterday },
                            accCode: code,
                            agencyId,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: { $subtract: ["$bed", "$bes"] },
                            },
                        },
                    },
                ]);

                mandeh = result[0]?.total || 0;
            }

            const docList = await this.DocListSanad.find(
                { $and: qr },
                "titleId row bed bes note peigiri serviceNum days"
            );

            let gozaresh = [{ sanad: "", doc: "", mandeh }];

            for (const doc of docList) {
                mandeh += doc.bed - doc.bes;
                const sanad = await this.DocSanad.findById(doc.titleId);
                if (sanad) {
                    gozaresh.push({ sanad, doc, mandeh });
                }
            }

            return res.json(gozaresh);
        } catch (error) {
            console.error("Error in gozareshHesab:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async gozareshHesabKifePool(req, res) {
        try {
            let agencyId = null;
            let wallet = null;
            let amount = -1;
            let search = "";
            let page = 0;
            let wallets = [];

            if (req.query.page) {
                page = parseInt(req.query.page);
                if (page < 0) page = 0;
            }
            if (req.query.search) {
                search = req.query.search.trim();
            }
            if (req.query.amount) {
                amount = parseInt(req.query.amount);
            }
            if (req.query.agencyId) {
                agencyId = ObjectId.createFromHexString(req.query.agencyId);
                const agency = await this.Agency.findById(agencyId, "settings");
                if (!agency) {
                    return this.response({
                        res,
                        code: 404,
                        message: "your agency is delete maybe",
                        data: { fa_m: "احتمالا شرکت شما حذف شده است" },
                    });
                }
                wallet = agency.settings.find(
                    (obj) => obj.wallet !== undefined
                ).wallet;
            } else {
                const agencies = await this.Agency.find(
                    {
                        delete: false,
                        active: true,
                        settings: { $ne: undefined },
                    },
                    "settings"
                );
                for (const ag of agencies) {
                    if (ag.settings && ag.settings.length > 4) {
                        const wall = ag.settings.find(
                            (obj) => obj.wallet !== undefined
                        ).wallet;
                        wallets.push(wall);
                    }
                }
            }

            const startDate = req.query.start;
            const endDate = req.query.end;
            let start = null,
                end = null;

            if (startDate) {
                start = Date.parse(startDate);
            }
            if (endDate) {
                end = Date.parse(endDate);
            }

            let qr = [];
            if (amount !== -1) {
                qr.push({ $or: [{ bed: amount }, { bes: amount }] });
            }
            if (search) {
                qr.push({ note: { $regex: ".*" + search + ".*" } });
            }
            if (wallet) {
                qr.push({ agencyId, accCode: wallet });
            } else {
                qr.push({ accCode: { $in: wallets } });
            }

            if (start && !end) {
                qr.push({ sanadDate: { $gte: start } });
            } else if (!start && end) {
                qr.push({ sanadDate: { $lte: end } });
            } else if (start && end) {
                qr.push({ sanadDate: { $gte: start, $lte: end } });
            }

            let mandeh = 0;
            if (start && agencyId) {
                const stt = new Date(formatDate(start));
                const yesterday = new Date();
                yesterday.setDate(stt.getDate() - 1);

                let code = wallet;
                if (!code) {
                    code = { $in: wallets };
                }

                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            sanadDate: { $lte: yesterday },
                            accCode: code,
                            agencyId,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: { $subtract: ["$bed", "$bes"] },
                            },
                        },
                    },
                ]);

                mandeh = result[0]?.total || 0;
            }

            const docList = await this.DocListSanad.find(
                { $and: qr },
                "titleId row bed bes note peigiri"
            )
                .skip(page * 30)
                .limit(30);

            let gozaresh = [];
            if (wallet) gozaresh.push({ sanad: "", doc: "", mandeh });

            for (const doc of docList) {
                mandeh += doc.bed - doc.bes;
                const sanad = await this.DocSanad.findById(doc.titleId);
                if (sanad) {
                    gozaresh.push({ sanad, doc, mandeh });
                }
            }

            return res.json(gozaresh);
        } catch (error) {
            console.error("Error in gozareshHesabKifePool:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverReportHesab(req, res) {
        try {
            if (req.query.code === undefined || req.query.code.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "code need",
                });
            }
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            // const agency = await this.Agency.findById(agencyId);
            // if (!agency) {
            //     return this.response({
            //         res,
            //         code: 404,
            //         message: "agency not found",
            //     });
            // }

            let kol = "004";
            let moeen = "006";
            const code = kol + moeen + req.query.code;
            const startDate = req.query.start;
            const endDate = req.query.end;
            let start = null,
                end = null;
            if (startDate != undefined && startDate != "") {
                start = Date.parse(startDate);
            }
            if (endDate != undefined && endDate != "") {
                end = Date.parse(endDate);
            }

            let qr = [];
            qr.push({ agencyId });
            qr.push({ accCode: code });
            if (start != null && end === null) {
                qr.push({ sanadDate: { $gte: start } });
            } else if (start === null && end != null) {
                qr.push({ sanadDate: { $lte: end } });
            } else if (start != null && end != null) {
                qr.push({ sanadDate: { $gte: start, $lte: end } });
            }

            let mandeh = 0;
            if (start != null) {
                const stt = new Date(formatDate(start));
                const yesterday = new Date();
                yesterday.setDate(stt.getDate() - 1);

                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            sanadDate: { $lte: yesterday },
                            accCode: code,
                            agencyId,
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
                mandeh = result[0]?.total || 0;
            }

            const docList = await this.DocListSanad.find(
                { $and: qr },
                "titleId row bed bes note peigiri"
            );

            let gozaresh = [];
            gozaresh.push({ sanad: "", doc: "", mandeh });

            for (const doc of docList) {
                mandeh += doc.bed - doc.bes;
                const sanad = await this.DocSanad.findById(doc.titleId);
                if (sanad) {
                    gozaresh.push({ sanad, doc, mandeh });
                }
            }

            return res.json(gozaresh);
        } catch (error) {
            console.error("Error in driverReportHesab:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentReportHesab(req, res) {
        try {
            if (req.query.code === undefined || req.query.code.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "code need",
                });
            }
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            // const agency = await this.Agency.findById(agencyId);
            // if (!agency) {
            //     return this.response({
            //         res,
            //         code: 404,
            //         message: "agency not found",
            //     });
            // }

            let kol = "003";
            let moeen = "005";
            const code = kol + moeen + req.query.code;
            const startDate = req.query.start;
            const endDate = req.query.end;
            let start = null,
                end = null;
            if (startDate != undefined && startDate != "") {
                start = Date.parse(startDate);
            }
            if (endDate != undefined && endDate != "") {
                end = Date.parse(endDate);
            }

            let qr = [];
            qr.push({ agencyId });
            qr.push({ accCode: code });
            if (start != null && end === null) {
                qr.push({ sanadDate: { $gte: start } });
            } else if (start === null && end != null) {
                qr.push({ sanadDate: { $lte: end } });
            } else if (start != null && end != null) {
                qr.push({ sanadDate: { $gte: start, $lte: end } });
            }

            let mandeh = 0;
            if (start != null) {
                const stt = new Date(formatDate(start));
                const yesterday = new Date();
                yesterday.setDate(stt.getDate() - 1);

                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            sanadDate: { $lte: yesterday },
                            accCode: code,
                            agencyId,
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
                mandeh = result[0]?.total || 0;
            }

            const docList = await this.DocListSanad.find(
                { $and: qr },
                "titleId row bed bes note peigiri"
            );

            let gozaresh = [];
            gozaresh.push({ sanad: "", doc: "", mandeh });

            for (const doc of docList) {
                mandeh += doc.bed - doc.bes;
                const sanad = await this.DocSanad.findById(doc.titleId);
                if (sanad) {
                    gozaresh.push({ sanad, doc, mandeh });
                }
            }

            return res.json(gozaresh);
        } catch (error) {
            console.error("Error in studentReportHesab:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async walletReport(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            let page = parseInt(req.query.page ?? 0);
            if (page < 0) page = 0;
            const limit = 30;
            page = page * limit;

            const agency = await this.Agency.findById(agencyId, "settings");
            const wallet = agency.settings.find(
                (obj) => obj.wallet != undefined
            ).wallet;
            const charge = agency.settings.find(
                (obj) => obj.charge !== undefined
            ).charge;

            let qr = [];
            qr.push({ agencyId });
            qr.push({ accCode: wallet });

            let mandeh = 0;
            let adminCharge = 0;

            const result = await this.DocListSanad.aggregate([
                {
                    $match: {
                        accCode: wallet,
                        agencyId,
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
            mandeh = result[0]?.total || 0;
            const result2 = await this.DocListSanad.aggregate([
                {
                    $match: {
                        accCode: charge,
                        agencyId,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $subtract: ["$bes", "$bed"],
                            },
                        },
                    },
                },
            ]);
            adminCharge = result2[0]?.total || 0;

            const docList = await this.DocListSanad.find(
                { $and: qr },
                "titleId accCode row bed bes note peigiri"
            )
                .skip(page)
                .limit(limit)
                .sort({ _id: -1 });

            let gozaresh = [];

            for (const doc of docList) {
                const sanad = await this.DocSanad.findById(
                    doc.titleId,
                    "sanadId system sanadDate"
                );
                const sanadList = await this.DocListSanad.find(
                    { titleId: doc.titleId },
                    "accCode row bed bes note peigiri"
                );

                let list = [];
                for (const sl of sanadList) {
                    const listAcc = await this.ListAcc.findOne(
                        { code: sl.accCode },
                        "codeLev3"
                    );
                    let name = "?";
                    if (listAcc) {
                        const levelDet = await this.LevelAccDetail.findOne(
                            { accCode: listAcc.codeLev3 },
                            "accName"
                        );
                        if (levelDet) {
                            name = levelDet.accName;
                        }
                    }
                    list.push({ sl, name });
                }
                gozaresh.push({ sanad, list });
            }

            return res.json({ gozaresh, mandeh, wallet, adminCharge });
        } catch (error) {
            console.error("Error in walletReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getWalletCompany(req, res) {
        try {
            let walletList = [];
            const companies = await this.Agency.find(
                { delete: false },
                "name code admin tel pic settings"
            );

            for (const co of companies) {
                try {
                    const wallet = co.settings.find(
                        (obj) => obj.wallet != undefined
                    ).wallet;
                    if (wallet != undefined) {
                        let mandeh = 0;

                        const result = await this.DocListSanad.aggregate([
                            {
                                $match: {
                                    accCode: wallet,
                                    agencyId: co._id,
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
                        mandeh = result[0]?.total || 0;
                        walletList.push({ co, wallet: mandeh });
                    } else {
                        walletList.push({ co, wallet: -1 });
                    }
                } catch (e) {
                    // console.error("Error processing company:", e);
                    walletList.push({ co, wallet: -1 });
                }
            }

            return res.json(walletList);
        } catch (error) {
            console.error("Error in getWalletCompany:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async bnkActionSearch(req, res) {
        try {
            const {
                infoID,
                serial,
                infoMoney,
                bankName,
                branchName,
                type,
                accCode,
                ownerHesab,
                startDate,
                endDate,
                submitDateFrom,
                submitDateTo,
                desc,
                infoNum,
            } = req.body;

            const agencyId = req.body.agencyId;
            // console.log("aaaaaaaaaaaaaaaaaaaaaaa",req.db)
            let page = req.body.page === undefined ? 0 : req.body.page;
            const pageSize = req.body.size === undefined ? 50 : req.body.size;
            if (page < 0) page = 0;
            page = page * pageSize;
            if (type != 1 && type != 13) {
                var qr = [];
                qr.push({ agencyId });
                if (infoID != undefined && infoID != null) qr.push({ infoID });
                if (serial != undefined && serial != null) qr.push({ serial });
                if (infoMoney != undefined && infoMoney != null)
                    qr.push({ infoMoney });
                if (bankName != undefined && bankName != null)
                    qr.push({ bankName: { $regex: ".*" + bankName + ".*" } });
                if (branchName != undefined && branchName != null)
                    qr.push({
                        branchName: { $regex: ".*" + branchName + ".*" },
                    });
                if (accCode != undefined && accCode != null)
                    qr.push({ accCode });
                if (ownerHesab != undefined && ownerHesab != null)
                    qr.push({ ownerHesab });
                if (type != undefined && type != null) qr.push({ type });
                if (infoNum != undefined && infoNum != null)
                    qr.push({ infoNum });
                if (type != undefined && type != null) qr.push({ type });
                if (desc != undefined && desc != null && desc.trim() != "") {
                    qr.push({ desc: { $regex: ".*" + desc + ".*" } });
                }

                if (
                    startDate != undefined &&
                    startDate != null &&
                    endDate != null &&
                    endDate != undefined
                ) {
                    const start = Date.parse(startDate);
                    const end = Date.parse(endDate);
                    qr.push({ infoDate: { $gte: start, $lte: end } });
                }
                if (
                    submitDateFrom != undefined &&
                    submitDateFrom != null &&
                    submitDateTo != null &&
                    submitDateTo != undefined
                ) {
                    const start = Date.parse(submitDateFrom);
                    const end = Date.parse(submitDateTo);
                    qr.push({ createdAt: { $gte: start, $lte: end } });
                }

                const checks = await this.CheckInfo.find({ $and: qr })
                    .skip(page)
                    .limit(pageSize)
                    .sort({ infoId: -1 });

                if (!checks) {
                    res.status(500).json({ error: "server not responce" });
                    return;
                }
                let rs = [];
                for (var check of checks) {
                    const his = await this.CheckHistory.find(
                        { agencyId, infoId: check.id },
                        "row toAccCode fromAccCode money status desc sanadNum createdAt"
                    );
                    let history = [];
                    for (var h of his) {
                        let accName = [];
                        const sarfaslTo = await this.ListAcc.findOne(
                            { agencyId, code: h.toAccCode },
                            "codeLev3"
                        );
                        const sarfaslFrom = await this.ListAcc.findOne(
                            { agencyId, code: h.fromAccCode },
                            "codeLev3"
                        );
                        if (sarfaslTo) {
                            const acc = await this.LevelAccDetail.findOne(
                                { agencyId, accCode: sarfaslTo.codeLev3 },
                                "accName"
                            );
                            accName.push({ toAccName: acc.accName });
                        }
                        if (sarfaslFrom) {
                            const acc = await this.LevelAccDetail.findOne(
                                { agencyId, accCode: sarfaslFrom.codeLev3 },
                                "accName"
                            );
                            accName.push({ fromAccName: acc.accName });
                        }
                        history.push({ h, accName });
                    }

                    rs.push({ check, history });
                }

                res.json(rs);
                return;
            }
            var qr = [];
            qr.push({ agencyId });
            qr.push({ type });
            if (serial != undefined && serial != null) qr.push({ serial });
            if (bankName != undefined && bankName != null)
                qr.push({ bankName: { $regex: ".*" + bankName + ".*" } });
            if (infoNum != undefined && infoNum != null)
                qr.push({ salMali: { $regex: ".*" + infoNum + ".*" } });
            if (branchName != undefined && branchName != null)
                qr.push({ branchName: { $regex: ".*" + branchName + ".*" } });
            if (accCode != undefined && accCode != null)
                qr.push({ codeHesab: accCode });
            if (ownerHesab != undefined && ownerHesab != null)
                qr.push({ owner: ownerHesab });
            if (type != undefined && type != null) qr.push({ type });
            if (desc != undefined && desc != null && desc.trim() != "") {
                qr.push({ desc: { $regex: ".*" + desc + ".*" } });
            }

            if (
                startDate != undefined &&
                startDate != null &&
                endDate != null &&
                endDate != undefined
            ) {
                const start = Date.parse(startDate);
                const end = Date.parse(endDate);
                qr.push({ date: { $gte: start, $lte: end } });
            }
            if (
                submitDateFrom != undefined &&
                submitDateFrom != null &&
                submitDateTo != null &&
                submitDateTo != undefined
            ) {
                const start = Date.parse(submitDateFrom);
                const end = Date.parse(submitDateTo);
                qr.push({ updatedAt: { $gte: start, $lte: end } });
            }

            const checks = await this.CheckPage.find({ $and: qr })
                .skip(page)
                .limit(pageSize);

            if (!checks) {
                res.status(500).json({ error: "server not responce" });
                return;
            }
            let rs = [];
            for (var check of checks) {
                let history = [];
                rs.push({ check, history });
            }

            res.json(rs);
            return;
        } catch (err) {
            console.error("bnkActionsearch function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    // async bnkActionSearch(req, res) {
    //     try {
    //     const {
    //         infoID,
    //         serial,
    //         infoMoney,
    //         bankName,
    //         branchName,
    //         type,
    //         accCode,
    //         ownerHesab,
    //         startDate,
    //         endDate,
    //         submitDateFrom,
    //         submitDateTo,
    //         desc,
    //         infoNum,
    //     } = req.body;

    //     if (req.body.agencyId === undefined) {
    //         return res.status(214).json({ msg: "agencyId need" });
    //     }
    //     const agencyId = req.body.agencyId;

    //     let page = req.body.page === undefined ? 0 : req.body.page;
    //     const pageSize = req.body.size === undefined ? 50 : req.body.size;
    //     if (page < 0) page = 0;

    //     var qr = [];
    //     qr.push({ agencyId });
    //     if (infoID != undefined && infoID != null) qr.push({ infoID });
    //     if (serial != undefined && serial != null) qr.push({ serial });
    //     if (infoMoney != undefined && infoMoney != null) qr.push({ infoMoney });
    //     if (bankName != undefined && bankName != null)
    //         qr.push({ bankName: { $regex: ".*" + bankName + ".*" } });
    //     if (branchName != undefined && branchName != null)
    //         qr.push({ branchName: { $regex: ".*" + branchName + ".*" } });
    //     if (type != undefined && type != null) qr.push({ type });
    //     if (accCode != undefined && accCode != null) qr.push({ accCode });
    //     if (ownerHesab != undefined && ownerHesab != null)
    //         qr.push({ ownerHesab: { $regex: ".*" + ownerHesab + ".*" } });
    //     if (desc != undefined && desc != null)
    //         qr.push({ desc: { $regex: ".*" + desc + ".*" } });
    //     if (infoNum != undefined && infoNum != null)
    //         qr.push({ infoNum: { $regex: ".*" + infoNum + ".*" } });
    //     if (startDate != undefined && startDate != null)
    //         qr.push({ infoDate: { $gte: new Date(startDate) } });
    //     if (endDate != undefined && endDate != null)
    //         qr.push({ infoDate: { $lte: new Date(endDate) } });
    //     if (submitDateFrom != undefined && submitDateFrom != null)
    //         qr.push({ submitDate: { $gte: new Date(submitDateFrom) } });
    //     if (submitDateTo != undefined && submitDateTo != null)
    //         qr.push({ submitDate: { $lte: new Date(submitDateTo) } });

    //     // const data = await this.CheckInfo.aggregate([
    //     //     {
    //     //         $match: { $and: qr },
    //     //     },
    //     //     {
    //     //         $sort: { infoId: -1 },
    //     //     },
    //     //     {
    //     //         $skip: page * pageSize,
    //     //     },
    //     //     {
    //     //         $limit: pageSize,
    //     //     },
    //     // ]);
    //     const data=await this.CheckInfo.find({ $and: qr }).skip(page * pageSize).limit(pageSize).sort({infoId: -1});

    //     const count = await this.CheckInfo.countDocuments({ $and: qr });
    //     return res.json({
    //         totalCount: count,
    //         pageSize,
    //         pageIndex: page,
    //         data,
    //     });
    //     } catch (err) {
    //         console.error("bnkActionSearch function error:", err);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async removePay(req, res) {
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
            if (
                req.query.sanadId === undefined ||
                req.query.stCode === undefined ||
                req.query.queueCode === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "sanadId queueCode need",
                });
            }
            const sanadId = parseInt(req.query.sanadId);
            const queueCode = parseInt(req.query.queueCode);
            const stCode = req.query.stCode;
            const docSanad = await this.DocSanad.findOne({ agencyId, sanadId });
            if (docSanad) {
                await this.DocListSanad.deleteMany({ titleId: docSanad._id });
            }
            await this.PayAction.updateMany(
                { agencyId, docSanadNum: sanadId },
                { $set: { delete: true } }
            );
            await this.DocListSanad.deleteMany({
                agencyId,
                doclistId: sanadId,
            });
            await this.DocSanad.deleteMany({ agencyId, sanadId });
            await this.PayAction.updateMany(
                { studentCode: stCode, queueCode },
                { $set: { delete: true } }
            );
            const checkHis = await this.CheckHistory.find({
                agencyId,
                sanadNum: sanadId,
            });
            for (const check of checkHis) {
                await this.CheckInfo.findByIdAndDelete(check.infoId);
                await this.CheckHistory.deleteMany({ infoId: check.infoId });
            }
            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId,
                targetIds: [stCode],
                targetTable: "studentCode",
                sanadId: sanadId,
                actionName: "removePay",
                actionNameFa: "حذف پرداخت",
                desc: req.query.desc || "حذف پرداخت دانش آموز ",
            }).save();
            return res.json("ok");
        } catch (err) {
            console.error("removePay function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async bnkRcInsertT(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const branchCode = "";
            const infoDate = req.body.date;
            const desc = req.body.desc;
            const docExp = req.body.docExp;
            const bankName = req.body.bankName;
            const branchName = req.body.branchName;
            const checkType = req.body.checkType;
            const price = req.body.price;
            const ownerHesab = req.body.ownerHesab;
            const type = req.body.type;
            const checkHesab = req.body.checkHesab;
            const serial = req.body.serial;
            const listCode = req.body.listCode;
            const listDesc = req.body.listDesc;
            const listPrice = req.body.listPrice;
            const centers = req.body.centers;
            const days = req.body.days || [];
            const studentName = req.body.studentName || "";

            if (
                listPrice.length !== listDesc.length ||
                listPrice.length !== listCode.length ||
                listPrice.length !== centers.length
            ) {
                return this.response({
                    res,
                    code: 300,
                    message: "all length must be equal",
                });
            }

            for (var i in listCode) {
                const aa = listCode[i].substring(6);
                const level = await this.LevelAccDetail.findOne({
                    accCode: aa,
                    agencyId,
                });
                if (!level || level.levelType === 3) {
                    return this.response({
                        res,
                        code: 300,
                        message: "cant access",
                    });
                }
            }

            const aa = checkHesab.substring(6);
            const level = await this.LevelAccDetail.findOne({
                accCode: aa,
                agencyId,
            });
            if (!level || level.levelType === 3) {
                return this.response({
                    res,
                    code: 300,
                    message: "cant access",
                });
            }

            const checkExist = await this.CheckInfo.countDocuments({
                agencyId,
                type,
                serial,
            });

            if (checkExist > 0) {
                return res
                    .status(503)
                    .json({ error: "the serial is duplicated" });
            }

            persianDate.toLocale("en");
            var SalMali = new persianDate().format("YY");
            const checkMax = await this.CheckInfo.find({ agencyId }, "infoId")
                .sort({ infoId: -1 })
                .limit(1);
            let numCheck = 1;
            if (checkMax.length > 0) {
                numCheck = checkMax[0].infoId + 1;
            }
            const infoNum = `${SalMali}-${numCheck}`;
            let checkInfo = new this.CheckInfo({
                agencyId,
                editor: req.user._id,
                infoId: numCheck,
                infoNum,
                seCode: "0",
                branchCode,
                branchName,
                bankName,
                serial,
                type,
                rowCount: listPrice.length,
                infoDate,
                infoMoney: price,
                accCode: checkHesab,
                ownerHesab,
                desc,
            });
            await checkInfo.save();

            let doc = new this.DocSanad({
                agencyId,
                note: docExp,
                sanadDate: infoDate,
                system: 2,
                definite: false,
                lock: false,
                editor: req.user._id,
            });
            await doc.save();
            const descF =
                studentName.trim() === ""
                    ? `دریافت اینترنتی / پوز بابت ${desc} به شماره ${serial}`
                    : `دریافت اینترنتی / پوز بابت ${desc} به نام ${studentName} به شماره ${serial}`;

            let docList = new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 1,
                bed: price,
                bes: 0,
                note: descF,
                accCode: checkHesab,
                peigiri: infoNum,
                sanadDate: infoDate,
            });
            await docList.save();
            persianDate.toLocale("en");
            var today = new persianDate().format("YYYY/MM/DD");
            var now = new persianDate().format("HH:mm:ss");
            for (var i in listPrice) {
                let day = 0;
                if (days[i]) {
                    day = days[i];
                }
                let docList = new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: i + 2,
                    bed: 0,
                    bes: listPrice[i],
                    note:
                        listDesc[i].trim() === ""
                            ? `${checkType} در تاریخ ${today}`
                            : listDesc[i],
                    accCode: listCode[i].toString(),
                    peigiri: infoNum,
                    sanadDate: infoDate,
                    days: day,
                });
                await docList.save();
            }

            for (var i in listCode) {
                let checkHistory = new this.CheckHistory({
                    agencyId,
                    infoId: checkInfo.id,
                    editor: req.user._id,
                    row: i + 1,
                    toAccCode: checkHesab,
                    fromAccCode: listCode[i],
                    money: listPrice[i],
                    status: type,
                    desc: listDesc[i],
                    sanadNum: doc.sanadId,
                });
                await checkHistory.save();
            }

            return res.json({ docID: doc.sanadId, checkRef: infoNum });
        } catch (err) {
            console.error("bnkRcInsertT function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async bnkPyNetInsert(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const branchCode = req.body.branchCode;
            const infoDate = req.body.date;
            const desc = req.body.desc;
            const docExp = req.body.docExp;
            const bankName = req.body.bankName;
            const branchName = req.body.branchName;
            const checkType = req.body.checkType;
            const price = req.body.price;
            const ownerHesab = req.body.ownerHesab;
            const type = req.body.type;
            const checkHesab = req.body.checkHesab;
            const serial = req.body.serial;
            const listCode = req.body.listCode;
            const listDesc = req.body.listDesc;
            const listPrice = req.body.listPrice;
            const centers = req.body.centers;
            const serviceNum = req.body.serviceNum || 0;
            const days = req.body.days || [];
            const studentName = req.body.studentName || "";

            if (
                listPrice.length !== listDesc.length ||
                listPrice.length !== listCode.length ||
                listPrice.length !== centers.length
            ) {
                return this.response({
                    res,
                    code: 300,
                    message: "all length must be equal",
                });
            }

            for (var i in listCode) {
                const aa = listCode[i].substring(6);
                const level = await this.LevelAccDetail.findOne({
                    accCode: aa,
                    agencyId,
                });
                if (!level || level.levelType === 3) {
                    return this.response({
                        res,
                        code: 300,
                        message: "cant access",
                    });
                }
            }

            const aa = checkHesab.substring(6);
            const level = await this.LevelAccDetail.findOne({
                accCode: aa,
                agencyId,
            });
            if (!level || level.levelType === 3) {
                return this.response({
                    res,
                    code: 300,
                    message: "cant access",
                });
            }

            const checkExist = await this.CheckInfo.countDocuments({
                agencyId,
                type,
                serial,
            });

            if (checkExist > 0) {
                return res
                    .status(503)
                    .json({ error: "the serial is duplicated" });
            }

            persianDate.toLocale("en");
            var SalMali = new persianDate().format("YY");
            const checkMax = await this.CheckInfo.find({ agencyId }, "infoId")
                .sort({ infoId: -1 })
                .limit(1);
            let numCheck = 1;
            if (checkMax.length > 0) {
                numCheck = checkMax[0].infoId + 1;
            }
            const infoNum = `${SalMali}-${numCheck}`;
            let checkInfo = new this.CheckInfo({
                agencyId,
                editor: req.user._id,
                infoId: numCheck,
                infoNum,
                seCode: "0",
                branchCode,
                branchName,
                bankName,
                serial,
                type,
                rowCount: listPrice.length,
                infoDate,
                infoMoney: price,
                accCode: checkHesab,
                ownerHesab,
                desc,
            });
            await checkInfo.save();

            let doc = new this.DocSanad({
                agencyId,
                note: docExp,
                sanadDate: infoDate,
                system: 2,
                definite: false,
                lock: false,
                editor: req.user._id,
            });
            await doc.save();

            persianDate.toLocale("en");
            var today = new persianDate().format("YYYY/MM/DD");
            for (var i in listPrice) {
                let day = 0;
                if (days[i]) {
                    day = days[i];
                }
                await new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: i + 1,
                    bes: 0,
                    bed: listPrice[i],
                    note:
                        listDesc[i].trim() === ""
                            ? `${checkType} در تاریخ ${today}`
                            : listDesc[i],
                    accCode: listCode[i].toString(),
                    peigiri: infoNum,
                    sanadDate: infoDate,
                    serviceNum,
                    days: day,
                }).save();
            }
            const descF = `پرداخت ${checkType} به شماره ${serial} بابت ${desc}`;
            let docList = new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: listPrice.length + 1,
                bes: price,
                bed: 0,
                note: descF,
                accCode: checkHesab,
                peigiri: infoNum,
                sanadDate: infoDate,
                serviceNum,
            });
            await docList.save();

            for (var i in listCode) {
                await new this.CheckHistory({
                    agencyId,
                    infoId: checkInfo.id,
                    editor: req.user._id,
                    row: i + 1,
                    toAccCode: listCode[i],
                    fromAccCode: checkHesab,
                    money: listPrice[i],
                    status: type,
                    desc: listDesc[i],
                    sanadNum: doc.sanadId,
                }).save();
            }

            return res.json({ docID: doc.sanadId, checkRef: infoNum });
        } catch (err) {
            console.error("bnkRcInsertT function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async bnkActionVosool(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const type = req.body.type;
            const infoId = req.body.infoId;
            const desc = req.body.desc;
            const date = req.body.date;
            const hesab = req.body.hesab;

            let checkInfo = await this.CheckInfo.findOne({ agencyId, infoId });
            if (!checkInfo) {
                res.status(500).json({ error: "server not responce" });
                return;
            }
            checkInfo.infoDate = date;
            checkInfo.type = type;
            checkInfo.desc = desc;
            await checkInfo.save();

            persianDate.toLocale("en");
            var today = new persianDate().format("YYYY/MM/DD");
            ////////////////////////////////////////////////////////////////////////////////////////////////////////

            const desc1 = `وصول چک شماره  ${checkInfo.serial} در تاریخ ${today} بابت ${desc}`;
            let doc = new this.DocSanad({
                agencyId,
                note: desc1,
                sanadDate: date,
                system: 2,
                definite: false,
                lock: true,
                editor: req.user._id,
            });
            await doc.save();

            let docList = new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 1,
                bed: checkInfo.infoMoney,
                bes: 0,
                note: desc1,
                accCode: hesab,
                peigiri: checkInfo.infoNum,
                sanadDate: date,
            });
            await docList.save();
            docList = new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 2,
                bed: 0,
                bes: checkInfo.infoMoney,
                note: desc1,
                accCode: hesab,
                peigiri: checkInfo.infoNum,
                sanadDate: date,
            });
            await docList.save();

            let checkHistory = new this.CheckHistory({
                agencyId,
                infoId: checkInfo.id,
                editor: req.user._id,
                row: 1,
                toAccCode: hesab,
                fromAccCode: checkInfo.accCode,
                money: checkInfo.infoMoney,
                status: type,
                desc: desc,
                sanadNum: doc.sanadId,
            });
            await checkHistory.save();

            res.json(doc.sanadId);
            return;
        } catch (error) {
            console.error("Error in bnkActionVosool:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async removePaySalary(req, res) {
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
            if (
                req.query.sanadId === undefined ||
                req.query.driverCode === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "sanadId driverCode need",
                });
            }
            const sanadId = parseInt(req.query.sanadId);
            const driverCode = parseInt(req.query.driverCode);
            // const agency = await this.Agency.findById(agencyId);

            const kol = "004";
            const moeen = "006";
            const code = kol + moeen + driverCode;
            const docSanad = await this.DocSanad.findOne({ agencyId, sanadId });

            if (docSanad) {
                const sanadList = await this.DocListSanad.findOne({
                    titleId: docSanad._id,
                    accCode: code,
                });
                if (!sanadList) {
                    return this.response({
                        res,
                        code: 404,
                        message: "DocListSanad not found",
                    });
                }
                const countSanadList = await this.DocListSanad.countDocuments({
                    titleId: docSanad._id,
                });
                if (countSanadList <= 2) {
                    await this.DocListSanad.deleteMany({
                        titleId: docSanad._id,
                    });
                    const checkHis = await this.CheckHistory.find({
                        agencyId,
                        sanadNum: sanadId,
                    });
                    for (const check of checkHis) {
                        await this.CheckInfo.findByIdAndDelete(check.infoId);
                        await this.CheckHistory.deleteMany({
                            infoId: check.infoId,
                        });
                    }
                    await this.DocSanad.findByIdAndDelete(docSanad._id);
                    return res.json("ok");
                }
                const sanadList2 = await this.DocListSanad.findOne({
                    titleId: docSanad._id,
                    bes: { $ne: 0 },
                });
                const newAmount = sanadList2.bes - sanadList.bed;
                await this.DocListSanad.findByIdAndUpdate(sanadList2._id, {
                    bes: newAmount,
                });
                await this.DocListSanad.findByIdAndDelete(sanadList._id);
                const checkHistory = await this.CheckHistory.findOne({
                    sanadNum: sanadId,
                    agencyId,
                    toAccCode: code,
                });
                if (checkHistory) {
                    const checkInfo = await this.CheckInfo.findById(
                        checkHistory.infoId
                    ).lean();
                    await this.CheckInfo.findByIdAndUpdate(
                        checkHistory.infoId,
                        {
                            infoMoney: checkInfo.infoMoney - checkHistory.money,
                            rowCount: checkInfo.rowCount - 1,
                        }
                    );
                }
                return res.json("ok");
            } else {
                return this.response({
                    res,
                    code: 404,
                    message: "Sanad not found",
                });
            }
        } catch (err) {
            console.error("removePay function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async removeDocBySanadNum(req, res) {
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
            if (req.query.sanadId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "sanadId need",
                });
            }
            const sanadId = parseInt(req.query.sanadId);
            const agency = await this.Agency.findById(agencyId);
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not found",
                });
            }
            if (!agency.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not found",
                });
            }
            const docSanad = await this.DocSanad.findOne({ agencyId, sanadId });

            if (docSanad) {
                await this.DocListSanad.deleteMany({ titleId: docSanad._id });
                await this.DocSanad.findByIdAndDelete(docSanad._id);
                const checkHis = await this.CheckHistory.find({
                    agencyId,
                    sanadNum: sanadId,
                });
                for (const check of checkHis) {
                    await this.CheckInfo.findByIdAndDelete(check.infoId);
                    await this.CheckHistory.deleteMany({
                        infoId: check.infoId,
                    });
                }
                return res.json("ok");
            }
            return this.response({
                res,
                code: 404,
                message: "Sanad not found",
            });
        } catch (err) {
            console.error("removeDocBySanadNum function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async removeDocBySanadNum2(req, res) {
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
            if (req.query.from === undefined || req.query.to === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "from and to need",
                });
            }

            const from = parseInt(req.query.from);
            const to = parseInt(req.query.to);
            if (from > to) {
                return this.response({
                    res,
                    code: 215,
                    message: "from is bigger than to",
                });
            }
            const agency = await this.Agency.findById(agencyId);
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not found",
                });
            }
            if (!agency.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not found",
                });
            }
            let count = 0;
            for (var i = from; i <= to; i++) {
                const docSanad = await this.DocSanad.findOne({
                    agencyId,
                    sanadId: i,
                });

                if (docSanad) {
                    await this.DocListSanad.deleteMany({
                        titleId: docSanad._id,
                    });
                    await this.DocSanad.findByIdAndDelete(docSanad._id);
                    count++;
                    const checkHis = await this.CheckHistory.find({
                        agencyId,
                        sanadNum: i,
                    });
                    for (const check of checkHis) {
                        await this.CheckInfo.findByIdAndDelete(check.infoId);
                        await this.CheckHistory.deleteMany({
                            infoId: check.infoId,
                        });
                    }
                }
            }
            return res.json({ del: count });

            // return this.response({
            //     res,
            //     code: 404,
            //     message: "Sanad not found",
            // });
        } catch (err) {
            console.error("removeDocBySanadNum2 function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
function formatDate(date) {
    var d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-");
}
