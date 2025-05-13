const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, unique: true },
        userName: { type: String, default: "", required: false, unique: true },
        password: { type: String, default: "", required: false },
        isadmin: { type: Boolean, default: false, required: false },
        isAgencyAdmin: { type: Boolean, default: false, required: false },
        isSupport: { type: Boolean, default: false, required: false },
        isSchoolAdmin: { type: Boolean, default: false, required: false },
        isSuperAdmin: { type: Boolean, default: false, required: false },
        active: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
        name: { type: String, default: "" },
        lastName: { type: String, default: "" },
        nationalCode: { type: String, default: "" },
        gender: { type: Number, default: 0 },
        inActvieReason: { type: String, default: "", required: false },
        device: { type: String, default: "", required: false },
        jwtSalt: { type: String, default: "", required: false },
        fcm: { type: [], default: [], required: false },
        ban: { type: [], default: [], required: false },
        city: { type: Number, required: false, default: 11 },
    },
    {
        timestamps: true,
    },
);
const User = mongoose.model("User", userSchema);

const userHaSchema = new mongoose.Schema(
    {
        email: String,
        phone: String,
        name: { type: String, required: true },
        policeId: { type: Number, required: true },
        userName: { type: String, required: true },
        password: { type: String, required: true },
        coId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency" },
        coNum: { type: Number },
        roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
        isAdmin: { type: Boolean, default: false },
        active: { type: Boolean, default: true },
        delete: { type: Boolean, default: false },
        inActvieReason: { type: String, default: "" },
        lastEnter: { type: Date, default: Date.now },
        lastOut: { type: Date, default: Date.now },
        lastDevice: { type: String, default: "" },
        ipValid: { type: String, default: "" },
        cashBox: { type: String, default: "" },
    },
    {
        timestamps: true,
    },
);

const UserHa = mongoose.model("UserHa", userHaSchema);

const roleSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        roleId: { type: Number, required: true },
        coId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency" },
        nApi: { type: [] }, //not access these api's
        nDB: { type: [], default: [] },
        showFactor: { type: Boolean, default: true },
        otherDoc: { type: Boolean, default: true },
        otherHavaleh: { type: Boolean, default: true },
        lastSale: { type: Boolean, default: true },
        active: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    },
);

const Role = mongoose.model("Role", roleSchema);


module.exports = { User, UserHa, Role };
