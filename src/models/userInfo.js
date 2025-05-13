const mongoose = require("mongoose");

const userInfoSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        tell: { type: String, default: "" },
        iCode: { type: String, default: "" }, //international code
        address: { type: [], default: [] },
        device: { type: String, default: "", required: false },
        isLegal: { type: Boolean, default: false, required: false },
        pic: { type: String, default: "" },
        pics: { type: [], default: [], required: false },
        email: { type: String, default: "" },
        birthday: { type: String, default: "" },
        job: { type: String, default: "" },
        education: { type: String, default: "" },
        introduceCode: { type: String, default: "" },
        bio: { type: String, default: "", required: false },
    },
    {
        timestamps: true,
    },
);
const UserInfo = mongoose.model("UserInfo", userInfoSchema);

module.exports = UserInfo;
