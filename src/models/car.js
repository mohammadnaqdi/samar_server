const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
    {
        pelak: { type: String, required: true },
        bodyNumber: { type: String, default: "", required: false },
        colorCar: { type: String, default: "", required: false },
        carModel: { type: String },
        year: { type: Number, required: false, default: 0 },
        capacity: { type: Number, required: false, default: 5 },
        delete: { type: Boolean, default: false, required: false },
        active: { type: Boolean, default: true, required: false },
        drivers: { type: [], default: [], required: false },
        pic: { type: [], default: [], required: false },
    },
    {
        timestamps: true,
    },
);
var Car = mongoose.model("Car", carSchema);

module.exports = Car;
