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
            const days = req.body.days || [];

            if (notes.length !== besPrice.length ||
                bedPrice.length !== besPrice.length ||
                accCode.length !== besPrice.length ||
                accCode.length !== peigiri.length) {
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
                if()
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
})();
