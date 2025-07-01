const mongoose = require("mongoose");
const {CounterKey} =  require('./keys');
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
        tel: { type: String },
        managerCode: { type: String },
        users: { type: [], default: [] },
        rating: { type: Number, default: 3, require: false },
        userData: { type: Object, default: {}, require: false },
        districtId: Number,
        districtTitle: String,
        cityId: { type: Number, require: true },
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
        delete: { type: Boolean, default: false, required: false },
        registrationNumber: { type: String, default: "", require: false },
        nationalID: { type: String, default: "", require: false },
        confirmInfo: { type: Number, default: 0, required: false },
        confirmInfoExp: { type: String, default: "", required: false },
        licensePic: { type: String, default: "", require: false },
        pic: { type: String, default: "", require: false },
        confirmLicensePic: { type: Number, default: 0, required: false },
        startLicenceDate: { type: Date, default: null, required: false },
        endLicenceDate: { type: Date, default: null, required: false },
        settings: { type: [] },
        pack: { type: String, default: "free" },
       
        expire: { type: Date, default: new Date() },
        startPack: { type: Date, default: new Date() },
    },
    {
        timestamps: true,
    },
);
agencySchema.index({ location: '2dsphere' });
agencySchema.pre("save", async function (next) {
  if (this.isNew) {
    const cc = await getNextSequence('agency');
      this.code =pad(3,cc.toString(),'0');
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
        showCostToDriver: { type: Boolean, default: true },
        formula: { type: String, default: "a-(a*(b/100))" },
        formulaForStudent: { type: Boolean, default: false },
        defHeadLine: { type: [],default:[] },
        merchentId: { type: String, default: "" },
        tId: { type: String, default: "" },
        bank: { type: String, default: "" },
    },
    {
        timestamps: true,
    },
);

const AgencySet = mongoose.model("AgencySet", agencySetSchema);

module.exports = { Agency, AgencySet };

function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}

