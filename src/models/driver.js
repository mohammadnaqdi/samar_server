const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        carId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Car",
            required: true,
        },
        driverCode: { type: String,  unique: true },
        location: {
            type: { type: String, enum: ["Point"], default: "Point", required: false },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        address: { type: String, required: false,default:'' },
        score: { type: Number, required: false, default: 0 },
        drivingLicence: { type: String, default: "", require: false },
        pic: { type: String, default: "" },
        confirmPic: { type: Number, default: 0, required: false },
        birthday: { type: Date, default: Date.now, required: false },
        expireSh: { type: Date, default: null, required: false },
        moreData: { type: Object, default: {}, require: false }, //DONT FILL
        healthPic: { type: String, default: "", require: false },
        confirmHealthPic: { type: Number, default: 0, required: false },
        technicalDiagPic: { type: String, default: "", require: false },
        confirmTechincalPic: { type: Number, default: 0, required: false },
        clearancesPic: { type: String, default: "", require: false },
        confirmClearPic: { type: Number, default: 0, required: false },
        dLicencePic: { type: String, default: "" },
        confirmDriverLcPic: { type: Number, default: 0, required: false },
        carDocPic: { type: String, default: "" },
        confirmcarDocPic: { type: Number, default: 0, required: false },
        isDriverCarOwner: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
        active: { type: Boolean, default: true, required: false },
        isAgent: { type: Boolean, default: false, required: false },
        hesab: { type: String, default: "" },
        shaba: { type: String, default: "" },
        nationalCode: { type: String, default: "" },
        serial: { type: Number, default: 0, required: false },
    },
    {
        timestamps: true,
    },
);
const Driver = mongoose.model("Driver", driverSchema);

module.exports = Driver;
