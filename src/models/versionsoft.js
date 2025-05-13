const mongoose = require("mongoose");

const versionsoftSchema = new mongoose.Schema(
    {
        type: { type: Number, required: true },
        versionCode: { type: Number, required: true },
        versionName: { type: String, required: true },
        url: { type: String, required: true },
        changeDesc: { type: String },
        active: { type: Boolean, default: true, required: false },
    },
    {
        timestamps: true,
    },
);
const Versionsoft = mongoose.model("Versionsoft", versionsoftSchema);

module.exports = { Versionsoft };
