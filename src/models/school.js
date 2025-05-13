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
const schoolSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        typeId: { type: Number, default: 0 },
        code: { type: Number, unique:true },
        typeTitle: { type: String, default: "دولتی" },
        gender: { type: Number, default: 0 },
        genderTitle: { type: String, default: "نامشخص" },
        grade: { type: [], default: [] },
        shifts: { type: [], default: [] },
        schoolTime: { type: [], default: [] },
        districtId: Number,
        districtTitle: String,
        address: String,
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: false,
            default: null,
        },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
            default: null,
        },
        active: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
    },
    {
        timestamps: true,
    },
);
schoolSchema.index({ location: '2dsphere' });
schoolSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.code = await getNextSequence("school");
  }
  next();
});
var School = mongoose.model("School", schoolSchema);

module.exports = School;
