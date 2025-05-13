const mongoose = require("mongoose");

const costCenterSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        costCenterId: {
            type: String,
            required: true,
            unique: true,
            maxlength: 3,
            trim: true,
        },
        costCenterName: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true,
        },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserHa",
            default: null,
        },
    },
    {
        timestamps: true,
    },
);
const CostCenter = mongoose.model("CostCenter", costCenterSchema);

const bankInfoSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserHa",
            required: true,
        },
        codeHesab: { type: String, required: true },
        iranBankId: { type: String, required: true },
        bankName: { type: String },
        branchCode: { type: Number },
        branchName: { type: String },
        accType: { type: String },
        numHesab: { type: String },
        eCard: { type: String },
        owner: { type: String },
        addressBank: { type: String },
        addressTel: { type: String },
        serialCheck: { type: Boolean },
        costCenter: { type: String },
        shMeli: { type: String },
        activePos: { type: Boolean, default: false, required: false },
        bankRptId: { type: Number, default: 0 },
        connectPC: { type: Boolean, default: false, required: false },
        bankPort: { type: String, default: "", required: false },
        bankTerminal: { type: Number, default: 0 },
        bankMethod: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    },
);
const BankInfo = mongoose.model("BankInfo", bankInfoSchema);

const checkBookSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserHa",
            required: true,
        },
        iranBankId: { type: String },
        date: { type: Date },
        codeHesab: { type: String },
        startSerial: { type: Number },
        endSerial: { type: Number },
        count: { type: Number },
    },
    {
        timestamps: true,
    },
);
const CheckBook = mongoose.model("CheckBook", checkBookSchema);

const checkPageSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserHa",
            required: true,
        },
        checkBookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CheckBook",
            required: true,
        },
        date: { type: Date },
        iranBankId: { type: String },
        branchCode: { type: String },
        bankName: { type: String },
        branchName: { type: String },
        serial: { type: Number },
        type: { type: Number },
        rowCount: { type: Number },
        amount: { type: Number },
        sanadId: { type: Number, default: 0 },
        codeHesab: { type: String },
        owner: { type: String },
        desc: { type: String },
        salMali: { type: String },
    },
    {
        timestamps: true,
    },
);
const CheckPage = mongoose.model("CheckPage", checkPageSchema);

module.exports = { CostCenter, BankInfo, CheckBook, CheckPage };
