const mongoose = require("mongoose");

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
        state: { type: Number, default: 0 },
        grade: { type: Number, default: 0, require: false },
        delete: { type: Boolean, default: false, required: false },
        city: { type: Number, required: false, default: 11 },
    },
    {
        timestamps: true,
    },
);
var StReport = mongoose.model("StReport", stReportSchema);

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



module.exports = { StReport, SchReport, RatingDriver, InspectorRp };
