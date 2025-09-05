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
        driverCode: { type: String, unique: true },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
                required: false,
            },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        address: { type: String, required: false, default: "" },
        score: { type: Number, required: false, default: 0 },
        drivingLicence: { type: String, default: "", required: false },
        pic: { type: String, default: "" },
        confirmPic: { type: Number, default: 0, required: false },
        birthday: { type: Date, default: Date.now, required: false },
        expireSh: { type: Date, default: null, required: false },
        moreData: { type: Object, default: {}, required: false }, //DONT FILL
        healthPic: { type: String, default: "", required: false },
        confirmHealthPic: { type: Number, default: 0, required: false },
        technicalDiagPic: { type: String, default: "", required: false },
        confirmTechincalPic: { type: Number, default: 0, required: false },
        clearancesPic: { type: String, default: "", required: false },
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
        card: { type: String, default: "" },
        nationalCode: { type: String, default: "" },
        serial: { type: Number, default: 0, required: false },
    },
    {
        timestamps: true,
    }
);
const Driver = mongoose.model("Driver", driverSchema);

const driverInfoSchema = new mongoose.Schema(
    {
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
                required: false,
            },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        address: { type: String, required: false, default: "" },
        birthday: { type: Date, default: Date.now, required: false },
        expireSh: { type: Date, default: null, required: false },
        healthPic: { type: String, default: "", required: false },
        confirmHealthPic: { type: Number, default: 0, required: false },
        technicalDiagPic: { type: String, default: "", required: false },
        confirmTechincalPic: { type: Number, default: 0, required: false },
        clearancesPic: { type: String, default: "", required: false },
        confirmClearPic: { type: Number, default: 0, required: false },
        dLicencePic: { type: String, default: "" },
        confirmDriverLcPic: { type: Number, default: 0, required: false },
        dLicenceBackPic: { type: String, default: "" },
        confirmDriverLcBackPic: { type: Number, default: 0, required: false },
        carDocPic: { type: String, default: "" },
        confirmcarDocPic: { type: Number, default: 0, required: false },
        backCarDocPic: { type: String, default: "" },
        confirmBackCarDocPic: { type: Number, default: 0, required: false },
        taxiDriverLicense: { type: String, default: "" },
        insPic: { type: String, default: "" },
        confirmInsPic: { type: Number, default: 0, required: false },
        isDriverCarOwner: { type: Boolean, default: true, required: false },
    },
    {
        timestamps: true,
    }
);
const DriverInfo = mongoose.model("DriverInfo", driverInfoSchema);

module.exports = {Driver,DriverInfo};
