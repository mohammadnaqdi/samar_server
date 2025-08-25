const mongoose = require("mongoose");

const contractTextSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        text: { type: String, required: true },
        active: { type: Boolean, default: true },
        needService: { type: Boolean, default: true },
        delete: { type: Boolean, default: false },
        attachment: [{ title: String, pic: String }],
    },
    {
        timestamps: true,
    }
);
var ContractText = mongoose.model("ContractText", contractTextSchema);

const signedContractSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
        },
        parentPhone: { type: String },
        parentName: { type: String },
        address: { type: String },
        studentFirstName: { type: String },
        studentLastName: { type: String },
        studentName: { type: String },
        studentGrade: { type: String },
        studentNationalCode: { type: String },
        address: { type: String },
        schoolName: { type: String },
        serviceCost: { type: Number },
        serviceCostMonth: { type: Number },
        serviceNum: { type: String },
        driverName: { type: String },
        driverPhone: { type: String },
        driverCar: { type: String },
        contractMonths: { type: Number },
        contractStart: { type: String },
        contractEnd: { type: String },
        contractDays: { type: Number },
        pic: { type: String },
        text: { type: String },
    },
    { timestamps: true }
);

const SignedContract = mongoose.model("SignedContract", signedContractSchema);

const estimApiSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        api: { type: String, required: true },
        desc: { type: String },
        active: { type: Boolean, default: true },
        pdf: { type: Boolean, default: true },
        excel: { type: Boolean, default: false },
        word: { type: Boolean, default: false },
        school: { type: Boolean, default: false },
        startDate: { type: Boolean, default: false },
        endDate: { type: Boolean, default: false },
        student: { type: Boolean, default: false },
        grade: { type: Boolean, default: false },
        phone: { type: Boolean, default: false },
        startDoc: { type: Boolean, default: false },
        endDoc: { type: Boolean, default: false },
        serviceNum: { type: Boolean, default: false },
        description: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
var StimApi = mongoose.model("StimApi", estimApiSchema);

module.exports = { ContractText, SignedContract, StimApi };
