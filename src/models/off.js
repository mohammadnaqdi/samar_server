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

const offPackSchema = new mongoose.Schema(
    {
        code: { type: Number, unique: true },
        title: { type: String, required: true },
        shortDesc: { type: String, default: "" },
        desc: { type: String, default: "" },
        smallPic: { type: String, default: "" },
        pic: { type: String, default: "" },
        address: { type: String, default: "" },
        link: { type: String, default: "" },
        max: { type: Number, default: -1 },
        price: { type: Number, default: 100000 },
        maxDate: { type: Date, default: null },
        cityId: { type: Number, required: true },
        details: { type: String, default: "" },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        agencyIds: [],
        active: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
    },
    {
        timestamps: true,
    }
);
offPackSchema.index({ location: "2dsphere" });
offPackSchema.pre("save", async function (next) {
    if (this.isNew) {
        this.code = await getNextSequence("offPack");
    }
    next();
});
const OffPack = mongoose.model("OffPack", offPackSchema);

const offCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            unique: true, // Ensure the code is unique
            trim: true,
        },
        useDate: { type: Date, default: null },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        offPackId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OffPack",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        price: { type: Number, default: 100000 },
        operator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        isUsed: {
            type: Boolean,
            default: false,
        },
        forStudent: {
            type: Boolean,
            default: true,
        },
        forCode: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);
offCodeSchema.index({ offPackId: 1, forCode: 1 }, { unique: true });
offCodeSchema.pre("save", async function (next) {
    if (this.isNew) {
        let nc = await getNextSequence("offCode");
        let fo = "S";
        if (!this.forStudent) {
            fo = "D";
        }
        const stcode = parseInt(this.forCode.substring(1));
        this.code = `${fo}${stcode}${nc}`;
    }
    next();
});
const OffCode = mongoose.model("OffCode", offCodeSchema);

const addressSchema = new mongoose.Schema({
    address: { type: String, required: true },
    cityId: { type: Number, required: true },
    details: { type: String, default: "" },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
    },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: {
            type: [Number],
            index: "2dsphere",
        },
    },
});
addressSchema.index({ location: "2dsphere" });
const Address = mongoose.model("Address", addressSchema);

const companySchema = new mongoose.Schema(
    {
        code: { type: Number, unique: true },
        name: { type: String, required: true },
        cityId: { type: Number, required: true },
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        phones: {
            type: [
                {
                    name: String,
                    phone: String,
                },
            ],
            default: [],
        },
        desc: String,
        active: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
        logo: { type: String, default: "", required: false },
    },
    {
        timestamps: true,
    }
);
companySchema.pre("save", async function (next) {
    if (this.isNew) {
        this.code = await getNextSequence("company");
    }
    next();
});
var Company = mongoose.model("Company", companySchema);

module.exports = { Company, Address, OffPack, OffCode };
