const mongoose = require("mongoose");

const levelAccSchema = new mongoose.Schema(
    {
        levelNo: { type: Number, required: true },
        name: { type: String, required: true },
        count: { type: Number, required: true },
        desc: { type: String, required: false, default: "" },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

const LevelAcc = mongoose.model("LevelAcc", levelAccSchema);

const levelAccDetailSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        levelNo: { type: Number, required: true },
        levelType: { type: Number, default: 0 },
        accCode: { type: String, required: true },
        accName: { type: String, required: true },
        desc: { type: String, default: "" },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    },
);
const LevelAccDetail = mongoose.model("LevelAccDetail", levelAccDetailSchema);

const groupAccSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        groupId: { type: Number, required: true },
        name: { type: String, required: true },
        mainId: {
            type: String,
            default: "درآمد",
            enum: [
                "درآمد",
                "هزینه",
                "سرمایه",
                "دارایی",
                "بدهی",
                "انتظامی",
                "خرید",
                "فروش",
                "سایر",
            ],
        },
        desc: { type: String, required: false, default: "" },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    },
);
const GroupAcc = mongoose.model("GroupAcc", groupAccSchema);

const listAccSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        code: { type: String, required: true },
        codeLev1: { type: String, required: true },
        codeLev2: { type: String, required: true },
        codeLev3: { type: String, required: true },
        groupId: { type: Number, required: true },
        type: { type: Number, required: true },
        nature: { type: Number, required: true },
        levelEnd: { type: Number, required: true },
        percent: { type: Number, required: false, default: -1 },
        enable: { type: Boolean, default: true },
        canEdit: { type: Boolean, default: true },
        listDesAccCode: { type: Number, required: false, default: 0 },
        editor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        banRoleId: { type: [], required: false, default: [] },
    },
    {
        timestamps: true,
    },
);
const ListAcc = mongoose.model("ListAcc", listAccSchema);

const bankSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        logo: { type: String, default: "/banks/markazi.png" },
        sign: { type: String, required: true },
        model: { type: Number, default: 1 },
        active: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    },
);

const Bank = mongoose.model("Bank", bankSchema);

module.exports = { LevelAcc, LevelAccDetail, GroupAcc, ListAcc, Bank };
