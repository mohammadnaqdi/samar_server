const mongoose = require("mongoose");
const counterKeySchema = new mongoose.Schema({
  name: { type: String, unique: true },
  seq: { type: Number, default: 1 },
});
const CounterKey = mongoose.model("CounterKey", counterKeySchema);
async function getNextSequence(name) {
  const result = await CounterKey.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}
const keysSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        keyId: { type: Number, unique: true },
        cityCode: { type: Number, required: true },
        exp: { type: String, default: "" },
        titleEn: { type: String, default: "" },
        type: {
            type: String,
            default: "district",
            enum: [
                "district",
                "grade",
                "gender",
                "province",
                "serviceState",
                "gradeSchool",
                "genderSchool",
                "typeSchool",
                "shareholders",
                "general",
                "sub",
                "car",
                "opinion",
                "shiftDay",
            ],
        },
        active: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
    },
    {
        timestamps: true,
    },
);
keysSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.keyId = await getNextSequence("key");
  }
  next();
});
var Keys = mongoose.model("Keys", keysSchema);

const citySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: Number, unique: true },
  province: { type: Number, required: true },
  meter: { type: Number, default:20000},
  active: { type: Boolean, default: true, required: false },
  isCenter: { type: Boolean, default: true, required: false },
  delete: { type: Boolean, default: false, required: false },
});
citySchema.pre("save", async function (next) {
  if (this.isNew) {
    this.code = await getNextSequence("city");
  }
  next();
});
const City = mongoose.model("City", citySchema);

const searchLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
    },
    term: { type: String },
    center: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },
    list: [],
  },
  {
    timestamps: true,
  }
);
searchLogSchema.index({ center: "2dsphere" });
const SearchLog = mongoose.model("SearchLog", searchLogSchema);

module.exports = {Keys,CounterKey,City,SearchLog};
