const mongoose = require("mongoose");
const counterDocSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    seq: { type: Number, default: 2 },
});
const CounterDoc = mongoose.model("CounterDoc", counterDocSchema);
async function getNextSequence(name) {
    const result = await CounterDoc.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return result.seq;
}
const docSanadSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        sanadId: { type: Number },
        note: { type: String },
        sanadDate: { type: Date, default: new Date() },
        system: { type: Number, required: true },
        definite: { type: Boolean, default: false },
        lock: { type: Boolean, default: false },
        editor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        faree: { type: String, default: "" },
        atf: { type: String, default: "" },
    },
    {
        timestamps: true,
    }
);
docSanadSchema.index({ agencyId: 1, sanadId: 1 }, { unique: true });
docSanadSchema.pre("save", async function (next) {
    if (this.isNew) {
        const num = await getNextSequence("sanad" + this.agencyId);
        this.sanadId = num;
        this.atf = num.toString();
    }
    next();
});
var DocSanad = mongoose.model("DocSanad", docSanadSchema);

/////////////////////////////////////////////////////////////

const docListSanadSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        titleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DocSanad",
            required: true,
        },
        doclistId: { type: Number, required: true },
        row: { type: Number, required: true },
        bed: { type: Number, required: true },
        bes: { type: Number, required: true },
        mId: { type: Number, default: 0 }, //month & SanadId && serviceNum && invoice Number
        type: {
            type: String,
            default: "pay",
            enum: [
                "pay",
                "salary",
                "paySalary",
                "invoice",
                "advance",
                "service",
                "penalty",
                "reward",
                "cashReg",
                "absence",
                "banki",
                "charge",
                "unCharge",
            ],
        },
        isOnline: { type: Boolean, defautl: false },
        days: { type: Number, default: 0 },
        sanadDate: { type: Date, default: new Date() },
        note: { type: String },
        accCode: { type: String, required: true },
        forCode: { type: String, default: "" },
        peigiri: { type: String, default: "" },
    },
    {
        timestamps: true,
    }
);
docListSanadSchema.index(
    { accCode: 1, mId: 1, type: 1, forCode: 1, agencyId: 1 },
    { unique: true }
);
const DocListSanad = mongoose.model("DocListSanad", docListSanadSchema);

/////////////////////////////////////////////////////////////

const checkInfoSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        editor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        infoId: { type: Number, required: true },
        infoNum: { type: String, required: true },
        seCode: { type: String, required: true },
        branchCode: { type: String, default: "" },
        branchName: String,
        bankName: String,
        serial: { type: String, required: true },
        type: { type: Number, required: true },
        rowCount: { type: Number, required: true },
        infoDate: Date,
        infoMoney: { type: Number, required: true },
        accCode: { type: String, required: true },
        ownerHesab: { type: String },
        desc: { type: String },
    },
    {
        timestamps: true,
    }
);
const CheckInfo = mongoose.model("CheckInfo", checkInfoSchema);
/////////////////////////////////////////////////////////////

const checkHistorySchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        infoId: { type: mongoose.Schema.Types.ObjectId, ref: "CheckInfo" },
        otherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CheckInfo",
            default: null,
        },
        editor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        row: { type: Number, required: true },
        toAccCode: { type: String, required: true },
        fromAccCode: { type: String, required: true },
        money: { type: Number, required: true },
        status: { type: Number, required: true },
        desc: String,
        sanadNum: { type: Number, required: true },
        costCenter: { type: String, default: "" },
    },
    {
        timestamps: true,
    }
);
const CheckHistory = mongoose.model("CheckHistory", checkHistorySchema);

module.exports = { DocSanad, DocListSanad, CheckInfo, CheckHistory };
