const mongoose = require("mongoose");

const transSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        authority: { type: String, unique: true, required: true },
        rrn: { type: String, default: "" },
        tracenumber: { type: String, default: "" },
        issuerbank: { type: String, default: "" },
        cardnumber: { type: String, default: "" },
        refID: { type: String, default: "" },
        amount: { type: Number, required: true },
        stCode: { type: String, required: true },
        queueCode: { type: Number, required: true },
        state: { type: Number, default: 0 },
        desc: { type: String, default: "" },
        done: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
const Transactions = mongoose.model("Transactions", transSchema);

const payQueueSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        setter: { type: mongoose.Schema.Types.ObjectId, required: true },
        code: { type: Number, unique: true, required: true },
        type: { type: Number, required: true }, //1:request service 2:need pre paid 3:avanak 4:remaind pay 5:optional pay 6:force pay
        amount: { type: Number, required: true },
        title: { type: String, required: true },
        listAccCode: { type: String, required: true },
        listAccName: { type: String, required: true },
        desc: { type: String, default: "" },
        merchentId: { type: String, default: "" },
        schools: [],
        grades: [],
        students: [],
        amount03: { type: Number, required: false, default: -1 },
        amount37: { type: Number, required: false, default: -1 },
        amount7i: { type: Number, required: false, default: -1 },
        maxDate: { type: Date, default: Date.now },
        optinal: { type: Boolean, default: false },
        active: { type: Boolean, default: true },
        confirmInfo: { type: Boolean, default: true },
        confirmPrePaid: { type: Boolean, default: true },
        delete: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);
const PayQueue = mongoose.model("PayQueue", payQueueSchema);

const payActionSchema = new mongoose.Schema(
    {
        setter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        transaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transactions",
            required: false,
            default: null,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        queueCode: { type: Number, required: true },
        amount: { type: Number, required: true },
        docSanadNum: { type: Number, required: true },
        docSanadId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "DocSanad",
                    required: false,default:null
                },
        desc: { type: String, default: "" },
        isOnline: { type: Boolean },
        studentCode: { type: String, required: true },
        delete: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

const PayAction = mongoose.model("payAction", payActionSchema);

module.exports = { Transactions, PayQueue, PayAction };
