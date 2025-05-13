const mongoose = require("mongoose");

const groupPackSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            require: true,
        },
        schoolsId: { type: [], default: [] },
        schoolsName: { type: [], default: [] },
        grades: { type: [], default: [] },
        drivers: { type: [], default: [] },
        capacity: { type: [], default: [] },
        time: { type: Number, require: true },
        distance: { type: Number, require: true },
        groupId: { type: Number, require: true },
    },
    {
        timestamps: true,
    },
);
var GroupPack = mongoose.model("GroupPack", groupPackSchema);

const packSchema = new mongoose.Schema(
    {
        groupId: { type: Number, require: true },
        packId: { type: Number, require: true },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            require: true,
        },
        drivers: { type: [], default: [] },
        confirm: { type: Boolean, default: false },
        points: [
            {
                _id: false,
                location: {
                    type: { type: String, enum: ["Point"], default: "Point" },
                    coordinates: { type: [Number], index: "2dsphere" },
                },
                studentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Student",
                    require: true,
                },
            },
        ],
    },
    {
        timestamps: true,
    },
);
var Pack = mongoose.model("Pack", packSchema);

const exceptionSchema = new mongoose.Schema(
    {
        pointId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Point",
            require: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            require: true,
        },
        groupId: { type: Number, require: true },
        points: {
            _id: false,
            location: {
                type: { type: String, enum: ["Point"], default: "Point" },
                coordinates: { type: [Number], index: "2dsphere" },
            },
            studentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
                require: true,
            },
        },
    },
    {
        timestamps: true,
    },
);
var Exception = mongoose.model("Exception", exceptionSchema);

// const geoSchema = new mongoose.Schema({
//   location: {
//     type: { type: String, enum: ["Point"], default: "Point" },
//     coordinates: { type: [Number], index: "2dsphere" },
//   },
// });
// var LastGeo = mongoose.model("LastGeo", geoSchema);

module.exports = {Pack, Exception, GroupPack };
