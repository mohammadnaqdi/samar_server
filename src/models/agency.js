const mongoose = require("mongoose");
const { CounterKey } = require("./keys");
async function getNextSequence(name) {
    const result = await CounterKey.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return result.seq;
}
const agencySchema = new mongoose.Schema(
    {
        code: { type: String, unique: true },
        name: { type: String, required: true },
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        acceptCheque: { type: Boolean, default: false },
        adminCheque: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        tel: { type: String },
        managerCode: { type: String },
        users: { type: [], default: [] },
        rating: { type: Number, default: 3, required: false },
        userData: { type: Object, default: {}, required: false },
        districtId: Number,
        districtTitle: String,
        cityId: { type: Number, required: true },
        coNum: { type: Number, default: 0 },
        address: String,
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        active: { type: Boolean, default: true, required: false },
        activeHasiban: { type: Boolean, default: false, required: false },
        paySeparation: { type: Boolean, default: false, required: false },
        delete: { type: Boolean, default: false, required: false },
        registrationNumber: { type: String, default: "", required: false },
        nationalID: { type: String, default: "", required: false },
        confirmInfo: { type: Number, default: 0, required: false },
        confirmInfoExp: { type: String, default: "", required: false },
        licensePic: { type: String, default: "", required: false },
        pic: { type: String, default: "", required: false },
        confirmLicensePic: { type: Number, default: 0, required: false },
        startLicenceDate: { type: Date, default: null, required: false },
        endLicenceDate: { type: Date, default: null, required: false },
        settings: { type: [] },
        pack: { type: String, default: "free" },
        expire: { type: Date, default: new Date() },
        startPack: { type: Date, default: new Date() },
        contract: { type: String, default: "" },
    },
    {
        timestamps: true,
    }
);
agencySchema.index({ location: "2dsphere" });
agencySchema.pre("save", async function (next) {
    if (this.isNew) {
        const cc = await getNextSequence("agency");
        this.code = pad(3, cc.toString(), "0");
    }
    next();
});
//,default:[
// {type:1,kol:'003',moeen:"005"},{type:2,kol:'004',moeen:'006'},{type:3,wallet:'008011000000008'},{type:3,cost:'008011000000009'}]
var Agency = mongoose.model("Agency", agencySchema);

const agencySetSchema = new mongoose.Schema(
    {
        agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency" },
        setter: { type: mongoose.Schema.Types.ObjectId },
        showFirstCostToStudent: { type: Boolean, default: false },
        showPack: { type: Boolean, default: true, required: false },
        needCard: { type: Boolean, default: false, required: false },
        needHesab: { type: Boolean, default: true, required: false },
        needShaba: { type: Boolean, default: true, required: false },
        needHealthPic: { type: Boolean, default: true, required: false },
        needTechnicalDiagPic: { type: Boolean, default: true, required: false },
        needClearancesPic: { type: Boolean, default: true, required: false },
        needCarDocPic: { type: Boolean, default: true, required: false },
        needInsPic: { type: Boolean, default: true, required: false },
        showCostToDriver: { type: Boolean, default: true },
        formula: { type: String, default: "a-(a*(b/100))" },
        formulaForStudent: { type: Boolean, default: false },
        defHeadLine: { type: [], default: [] },
        merchentId: { type: String, default: "" },
        tId: { type: String, default: "" },
        bank: { type: String, default: "" },
        openOpinion: {
            type: Object,
            default: {
                1: false,
                2: false,
                3: false,
                4: false,
                5: false,
                6: false,
                7: false,
                8: false,
                9: false,
                10: false,
                11: false,
                12: false,
            },
        },
        activeDDS: { type: Boolean, default: true },
        offDDSTimes: {
            type: [
                {
                    start: { type: Date, required: true },
                    end: { type: Date, required: true },
                },
            ],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const AgencySet = mongoose.model("AgencySet", agencySetSchema);

module.exports = { Agency, AgencySet };

function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}
