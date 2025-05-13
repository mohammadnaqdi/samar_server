const mongoose = require("mongoose");

const ddsSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        service: [
        ],
        status: {
            type: String,
            enum: ["Normal", "Edited", "Absent", "NT"],
            default: "Normal",
        },
        desc: { type: String, default: "", required: false },
        sc: { type: Number },
        dds: { type: Number },
    },
    {
        timestamps: true,
    }
);

const DDS = mongoose.model("DDS", ddsSchema);

const dscSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        serviceNum: { type: Number, required: true },
        desc: { type: String, default: "", required: false },
        dsc: { type: Number },
    },
    {
        timestamps: true,
    }
);

const DSC = mongoose.model("DSC", dscSchema);

const dosSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        driverId: {
            type: mongoose.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        driverCode: String,
        name: String,
        lastName: String,
        phone: String,
        sPercent: { type: Number, default: 0 },
        ePercent: { type: Number, default: 0 },
        day: { type: Number, default: 0 },
        service: { type: [], default: [] },
        reports: { type: Number, default: 0 },
        inspectorReports: { type: Number, default: 0 },
        installedApp: { type: Boolean, default: false },
        overallScore: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

const DOS = mongoose.model("DOS", dosSchema);

const dicSchema = new mongoose.Schema(
    {
        ref: { type: mongoose.Types.ObjectId, required: true },
        type: {
            type: String,
            enum: ["Student", "Driver", "Service"],
            required: true,
        },
        missingTables: { type: [], default: [] },
        missingStudents: { type: [], default: [] },
    },
    {
        timestamps: true,
    }
);

const DIC = mongoose.model("DIC", dicSchema);

module.exports = { DDS, DSC,DOS,DIC };
