const mongoose = require("mongoose");

const daySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        dayWeek: { type: Number, required: true },
        start: { type: String, required: true },
        end: { type: String, required: true },
        isHoliday: { type: Boolean, required: true },
    },
    {
        timestamps: true,
    },
);
var Day = mongoose.model("Day", daySchema);

module.exports = Day;
