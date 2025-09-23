const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
    {
        userCode: { type: String, required: true },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        name: { type: String },
        angle: { type: Number },
        serviceId: { type: Number },
        agencyId: { type: String },
        state: { type: Number },
        city: { type: Number, required: false, default: 11 },
    },
    {
        timestamps: true,
    }
);
locationSchema.index({ location: "2dsphere" });
var Location = mongoose.model("Location", locationSchema);

const driverActSchema = new mongoose.Schema(
    {
        driverCode: { type: String, required: true },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        model: { type: Number },
        serviceId: { type: Number },
        isWarning: { type: Boolean },
        studentId: { type: String },
        start: { type: Number },
    },
    {
        timestamps: true,
    }
);
driverActSchema.index({ location: "2dsphere" });
var DriverAct = mongoose.model("DriverAct", driverActSchema);

const driverLocationSchema = new mongoose.Schema(
    {
        dId: {
            type: mongoose.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        agencyId: {
            type: mongoose.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        angle: { type: Number },
        speed: { type: Number },
        state: { type: Number },
        station: {
            type: mongoose.Types.ObjectId,
            ref: "Station",
            defautl: null,
        },
        tripId: { type: String, default: 0 },
    },
    {
        timestamps: true,
    }
);
driverLocationSchema.index({ location: "2dsphere" });
const DriverLocation = mongoose.model("DriverLocation", driverLocationSchema);

module.exports = { Location, DriverAct };
