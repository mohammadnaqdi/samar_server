const mongoose = require("mongoose");
const { CounterKey } = require("./keys");
async function getNextSequence(name) {
    const result = await CounterKey.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return result.seq;
}
const groupPackSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        schools: { type: [], default: [] },
        grades: { type: [], default: [] },
        capacity: { type: Number, default: 4 },
        time: { type: Number, required: true },
        distance: { type: Number, required: true },
        code: { type: Number, unique: true },
    },
    {
        timestamps: true,
    }
);
groupPackSchema.pre("save", async function (next) {
    if (this.isNew) {
        this.code = await getNextSequence("groupPack");
    }
    next();
});
var GroupPack = mongoose.model("GroupPack", groupPackSchema);

const packSchema = new mongoose.Schema(
    {
        groupId: { type: Number, required: true },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        drivers: { type: [], default: [] },
        confirm: { type: Boolean, default: false },
        code: { type: Number, unique: true },
    },
    {
        timestamps: true,
    }
);
packSchema.pre("save", async function (next) {
    if (this.isNew) {
        this.code = await getNextSequence("pack");
    }
    next();
});
var Pack = mongoose.model("Pack", packSchema);

const exceptionSchema = new mongoose.Schema(
    {
        pointId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Point",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        groupId: { type: Number, required: true },
        points: {
            _id: false,
            location: {
                type: { type: String, enum: ["Point"], default: "Point" },
                coordinates: { type: [Number], index: "2dsphere" },
            },
            studentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
                required: true,
            },
        },
    },
    {
        timestamps: true,
    }
);
var Exception = mongoose.model("Exception", exceptionSchema);

// const geoSchema = new mongoose.Schema({
//   location: {
//     type: { type: String, enum: ["Point"], default: "Point" },
//     coordinates: { type: [Number], index: "2dsphere" },
//   },
// });
// var LastGeo = mongoose.model("LastGeo", geoSchema);

module.exports = { Pack, Exception, GroupPack };
