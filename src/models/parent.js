const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, unique: true },
        password: { type: String, default: "", required: false },
        active: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
        name: { type: String, default: "" },
        lastName: { type: String, default: "" },
        inActvieReason: { type: String, default: "", required: false },
        fcm: { type: [], default: [], required: false },
        isParent: { type: Boolean, required: false, default: true },
    },
    {
        timestamps: true,
    },
);
const Parent = mongoose.model("Parent", parentSchema);

module.exports = { Parent};
