const mongoose = require("mongoose");
const {CounterKey} =  require('./keys');
async function getNextSequence(name) {
  const result = await CounterKey.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}
const serviceSchema = new mongoose.Schema(
    {
        serviceNum: { type: Number, unique: true },
        distance: { type: Number },
        cost: { type: Number, required: true  },
        driverSharing: { type: Number, required: true  },
        driverPic: { type: String },
        driverName: { type: String, required: true  },
        driverCar: { type: String, required: true  },
        driverCarPelak: { type: String, required: true  },
        driverPhone: { type: String, required: true  },
        // students: { type: [
        //     {
        //         studentCost:{ type: Number },
        //         id:{ type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        //         schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School" },
        //     }

        // ], default: [] },
        agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true  },
        routeSave: { type: [], default: [] },
        schoolIds: { type: [],},
        percentInfo: { type: [], default: [] },
        delete: { type: Boolean, default: false, required: false },
        active: { type: Boolean, default: true, required: false },
        time: { type: Number, required: false, default: 0 },
    },
    {
        timestamps: true,
    },
);
serviceSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.serviceNum = await getNextSequence("service");
  }
  next();
});
const Service = mongoose.model("Service", serviceSchema);

const driverChangeSchema = new mongoose.Schema(
    {
        agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency" },
        setterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
        serviceNum: { type: Number },
        sanadNum: { type: Number, default: 0 },
        date: Date,
        time: { type: Number },
        driverCost: { type: Number },
        driverPic: { type: String },
        driverName: { type: String },
        driverCar: { type: String },
        driverCarPelak: { type: String },
        driverPhone: { type: String },
        driverGender: { type: Number },
        delete: { type: Boolean, default: false, required: false },
        active: { type: Boolean, default: true, required: false },
        reason: { type: String, default: "", required: false },
    },
    {
        timestamps: true,
    },
);
const DriverChange = mongoose.model("DriverChange", driverChangeSchema);

const pricingTableSchema = new mongoose.Schema(
    {
        city: { type: Number, required: true, },
        districtId: [],
        gradeId: [],
        carId: Number,
        kilometer: Number,
        price: Number,
        capacity: { type: Number, required: false, default: 0 },
        carGrade: { type: Number, required: false, default: 0 },
        schoolGrade: { type: Number, required: false, default: 0 },
        delete: { type: Boolean, default: false, required: false },
        active: { type: Boolean, default: true, required: false },
    },
    {
        timestamps: true,
    },
);
const PricingTable = mongoose.model("PricingTable", pricingTableSchema);

const servicePackSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        packNum: { type: Number, required: true },
    },
    {
        timestamps: true,
    },
);
const ServicePack = mongoose.model("ServicePack", servicePackSchema);

module.exports = { Service, DriverChange, PricingTable, ServicePack };
