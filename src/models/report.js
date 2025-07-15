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
const stReportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
           required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
        },
        text: { type: String, required: true, },
        comment1: { type: String,default:'' },
        comment2: { type: String,default:'' },
        code: { type: Number, unique:true },
        state: { type: Number, default: 0 },
        grade: { type: Number, default: 0, require: false },
        delete: { type: Boolean, default: false, required: false },
    },
    {
        timestamps: true,
    },
);
stReportSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.code = await getNextSequence('report');
  }
  next();
});
var StReport = mongoose.model("StReport", stReportSchema);

const opinionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
        },
        content: { type: [] },
        comment: { type: String,default:'' },
        month: { type: Number,  required: true },
        state: { type: Number, default: 0 },
        grade: { type: Number, default: 0, require: false },
        sum: { type: Number, },
        delete: { type: Boolean, default: false, required: false },
    },
    {
        timestamps: true,
    },
);
opinionSchema.index(
    { month: 1, studentId: 1, driverId: 1 },
    { unique: true }
);
var Opinion = mongoose.model("Opinion", opinionSchema);

const inspectorRpSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            default: null,
        },
        desc: { type: String },
        model: { type: String, default: "" },
        school: { type: String, default: "" },
        pelak: { type: String, default: "" },
        state: { type: [], default: [] },
        images: { type: [], default: [] },
        delete: { type: Boolean, default: false, required: false },
    },
    {
        timestamps: true,
    },
);
var InspectorRp = mongoose.model("InspectorRp", inspectorRpSchema);

const schReport = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        desc: { type: String },
        state: { type: Number, default: 0 },
        delete: { type: Boolean, default: false, required: false },
        city: { type: Number, required: false, default: 11 },
    },
    {
        timestamps: true,
    },
);
var SchReport = mongoose.model("SchReport", schReport);

const ratingDriver = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            default: null,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
        },
        desc: { type: String },
        point: { type: Number },
        delete: { type: Boolean, default: false, required: false },
        city: { type: Number, required: false, default: 11 },
    },
    {
        timestamps: true,
    },
);
var RatingDriver = mongoose.model("RatingDriver", ratingDriver);



module.exports = { StReport, SchReport, RatingDriver, InspectorRp ,Opinion};
