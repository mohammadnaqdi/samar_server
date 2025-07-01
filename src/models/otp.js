const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true },
        code: { type: String, required: true },
        isParent: { type: Boolean, default:false},
        consumed: { type: Boolean, default:false},
    },
    {
        timestamps: true,
    },
);
var Otp = mongoose.model("Otp", otpSchema);

const confirmCodeSchema = new mongoose.Schema(
    {
        agency: { type: String },
        phone: { type: String, required: true },
        code: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);
var ConfirmCode = mongoose.model("ConfirmCode", confirmCodeSchema);

const messageCodeSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true },
        type: { type: Number, required: true },
        text: { type: String, required: true },
        title: { type: String },
        price: { type: Number },
        active: { type: Boolean, default: true, required: false },
        api: { type: String, required: true },
        params: [],
        group: { type: String, default: "all" },
    },
    {
        timestamps: true,
    },
);
var MessageCode = mongoose.model("MessageCode", messageCodeSchema);

const messagingSchema = new mongoose.Schema(
    {
        agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency" },
        senderId: { type: mongoose.Schema.Types.ObjectId },
        sender: { type: String },
        code: { type: String, required: true },
        to: [],
        params: [],
        type: { type: Number, required: true },
        text: { type: String },
        responseMessage: { type: String },
        price: { type: Number },
        desc: { type: String },
    },
    {
        timestamps: true,
    },
);
var Messaging = mongoose.model("Messaging", messagingSchema);

const notificationSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        setterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["ads", "msg",'warning'],
            default: "msg",
        },
        title: { type: String, required: true },
        text: { type: String, required: true },
        link: { type: String, default:"" },
        spacialCheck: { type: String, default:"" },
        confirmState: { type: Number, default:0 },
        rejectReason: { type: String, default:"" },
        role: { type: String, enum: ["parent", "driver",'all'], default: "parent" },
        pic: { type: String, default: "" },
        schoolIDs: { type: [], default: null },
        seen: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
const Notification = mongoose.model("Notification", notificationSchema);

const seenSchema = new mongoose.Schema(
    {
        notifID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Notification",
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);
const Seen = mongoose.model("Seen", seenSchema);

module.exports = { Otp, ConfirmCode, MessageCode, Messaging,Seen,Notification };
