const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
    {
        year: { type: Number, required: true },
        month: { type: Number, required: true },
        day: { type: Number, required: true },
        state: { type: Number, required: true },
        desc: { type: String },
        district: { type: [], default: [] },
        city: { type: [], default: [] },
        grad: { type: [], default: [] },
        shift: { type: [], default: [] },
        school: { type: [], default: [] },
        serviceNum: { type: Number, required: false, default: -1 },
        studentId: { type: String, required: false, default: "" },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);
var Holiday = mongoose.model("Holiday", holidaySchema);

module.exports = { Holiday };
