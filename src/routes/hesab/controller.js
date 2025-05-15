const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const persianDate = require("persian-date");

module.exports = new (class extends controller {
    async setSanadStudent(req, res) {
        let session = await this.DocSanad.startSession();
        session.startTransaction();

        try {
            const note = req.body.note.trim();
            const date = req.body.date;
            const faree = req.body.faree.trim();
            const atf = req.body.atf.trim();
            const notes = req.body.notes;
            const besPrice = req.body.besPrice;
            const bedPrice = req.body.bedPrice;
            const accCode = req.body.accCode;
            const studentCodes = req.body.studentCodes;
            const peigiri = req.body.peigiri;
            const agencyId = req.body.agencyId;
            const serviceNum = req.body.serviceNum || 0;
            const invoice = req.body.invoice;
            const days = req.body.days || [];
           
            if (
                notes.length !== besPrice.length ||
                bedPrice.length !== besPrice.length ||
                accCode.length !== besPrice.length ||
                accCode.length !== peigiri.length
            ) {
                await session.abortTransaction();
                session.endSession();

                return this.response({
                    res,
                    code: 300,
                    message: "all length must be equal",
                });
            }

            for (const code of accCode) {
                const aa = code.substring(6);
                if (studentCodes.includes(aa)) continue;
                const level = await this.LevelAccDetail.findOne(
                    {
                        accCode: aa,
                        agencyId,
                    },
                    null,
                    { session }
                );

                if (!level || level.levelType === 3) {
                    await session.abortTransaction();
                    session.endSession();

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
                session,
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
                    isPaid: true,
                    type: studentCodes.includes(accCode[i].substring(6))
                        ? "student"
                        : "other",
                    invoice,
                });
                await docList.save({
                    session,
                });
            }
            await session.commitTransaction();
            session.endSession();

            return this.response({
                res,
                message: "ok",
                data: doc.sanadId,
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error in setSanadStudent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setRcCheck4Student(req, res) {
    const session = await this.CheckInfo.startSession();
    session.startTransaction();

    try {
        const agencyId = ObjectId.createFromHexString(req.body.agencyId);
        const branchCode = "";
        const {
            date: infoDate,
            desc,
            docExp,
            bankName,
            branchName,
            checkType,
            price,
            ownerHesab,
            type,
            checkHesab,
            serial,
            listCode,
            studentCodes,
            listDesc,
            listPrice,
            centers,
            invoice,
            studentName = "",
        } = req.body;

        if (
            listPrice.length !== listDesc.length ||
            listPrice.length !== listCode.length ||
            listPrice.length !== centers.length
        ) {
            await session.abortTransaction();
            session.endSession();
            return this.response({
                res,
                code: 300,
                message: "all length must be equal",
            });
        }

        for (let i in listCode) {
            const aa = listCode[i].substring(6);
            if (studentCodes.includes(aa)) continue;
            const level = await this.LevelAccDetail.findOne({ accCode: aa, agencyId }).session(session);
            if (!level || level.levelType === 3) {
                await session.abortTransaction();
                session.endSession();
                return this.response({ res, code: 300, message: "cant access" });
            }
        }

        const aa = checkHesab.substring(6);
        const level = await this.LevelAccDetail.findOne({ accCode: aa, agencyId }).session(session);
        if (!level || level.levelType === 3) {
            await session.abortTransaction();
            session.endSession();
            return this.response({ res, code: 300, message: "cant access" });
        }

        const checkExist = await this.CheckInfo.countDocuments({ agencyId, type, serial }).session(session);
        if (checkExist > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(503).json({ error: "the serial is duplicated" });
        }

        persianDate.toLocale("en");
        const SalMali = new persianDate().format("YY");
        const checkMax = await this.CheckInfo.find({ agencyId }, "infoId").sort({ infoId: -1 }).limit(1).session(session);
        let numCheck = checkMax.length > 0 ? checkMax[0].infoId + 1 : 1;
        const infoNum = `${SalMali}-${numCheck}`;

        const checkInfo = new this.CheckInfo({
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
        await checkInfo.save({ session });

        const doc = new this.DocSanad({
            agencyId,
            note: docExp,
            sanadDate: infoDate,
            system: 2,
            definite: false,
            lock: false,
            editor: req.user._id,
        });
        await doc.save({ session });

        const descF = studentName.trim() === ""
            ? `دریافت اینترنتی / پوز بابت ${desc} به شماره ${serial}`
            : `دریافت اینترنتی / پوز بابت ${desc} به نام ${studentName} به شماره ${serial}`;
        let row=1;
        const docList1 = new this.DocListSanad({
            agencyId,
            titleId: doc.id,
            doclistId: doc.sanadId,
            row: row,
            bed: price,
            bes: 0,
            note: descF,
            accCode: checkHesab,
            peigiri: infoNum,
            sanadDate: infoDate,
        });
        await docList1.save({ session });
        const today = new persianDate().format("YYYY/MM/DD");

        for (let i in listPrice) {
            // const day = days[i] || 0;
            row++;
            const docList = new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: row,
                bed: 0,
                bes: listPrice[i],
                note: listDesc[i].trim() === "" ? `${checkType} در تاریخ ${today}` : listDesc[i],
                accCode: listCode[i].toString(),
                peigiri: infoNum,
                sanadDate: infoDate,
                days:0,
                isPaid: true,
                type: studentCodes.includes(listCode[i].substring(6)) ? "student" : "other",
                invoice,
            });
            await docList.save({ session });
        }
        row=0;
        for (let i in listCode) {
            row++;
            const checkHistory = new this.CheckHistory({
                agencyId,
                infoId: checkInfo.id,
                editor: req.user._id,
                row: row,
                toAccCode: checkHesab,
                fromAccCode: listCode[i],
                money: listPrice[i],
                status: type,
                desc: listDesc[i],
                sanadNum: doc.sanadId,
            });
            await checkHistory.save({ session });
        }

        await session.commitTransaction();
        session.endSession();
        return res.json({ docID: doc.sanadId, checkRef: infoNum });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("setRcCheck4Student function error:", err);
        return res.status(500).json({ error: "Internal Server Error." });
    }
}

})();
