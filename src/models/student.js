const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    seq: { type: Number, default: 600000000 },
  });
  const Counter = mongoose.model("Counter", counterSchema);
  async function getNextSequence(name) {
    const result = await Counter.findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return result.seq;
  }
const studentSchema = new mongoose.Schema(
    {
        studentCode: { type: String, unique: true },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Parent",
            required: true,
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
        },
        location: {
            type: { type: String, enum: ["Point"], default: "Point", required: true },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
        },
        address: { type: String, required: true },
        addressDetails: { type: String, required: false,default:'' },
        gradeTitle: { type: String, required: true },
        gradeId: { type: Number, required: true },
        name: { type: String, required: true },
        lastName: { type: String, required: true },
        fatherName: { type: String, required: true },
        parentReleation: { type: String, required: true },
        physicalCondition: { type: Number, default: 0, required: false },
        physicalConditionDesc: { type: String, default: "", required: false },
        supervisor: { type: [], default: [], required: false },
        active: { type: Boolean, default: true, required: false },
        isIranian: { type: Boolean, default: true, required: false },
        delete: { type: Boolean, default: false, required: false },
        gender: { type: Number, default: 0 },
        state: { type: Number, default: 0 }, //0
        stateTitle: { type: String, default: "ثبت شده" },
        serviceDistance: { type: Number, default: 0 },
        time: { type: Number, required: false, default: 0 },
        check: { type: Number, required: false, default: 0 },
        pack: { type: Number, required: false, default: -1 },
        packed: { type: Boolean, default: false },
        exception: { type: Boolean, default: false },
        neighbourhood: { type: String, required: false, default: "" },
        avanak: { type: Boolean, default: false },
        avanakNumber: { type: String, default: "" },
        nationalCode: { type: String, default: "" },
        startOfContract: {
            type: Date,
            default: function () {
                const now = new Date();
                const year = now.getFullYear();
                return new Date(year, 8, 22);
            },
        },
        endOfContract: {
            type: Date,
            default: function () {
                const now = new Date();
                const year = now.getFullYear() + 1;
                return new Date(year, 5, 21);
            },
        },
    },
    {
        timestamps: true,
    },
);
studentSchema.index({ location: "2dsphere" });
studentSchema.pre("save", async function (next) {
    if (this.isNew) {
      const cc = await getNextSequence('student');
      this.studentCode ="6"+pad(8,cc.toString(),'0');
    }
    next();
  });
  
const Student = mongoose.model("Student", studentSchema);


module.exports = Student;

function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}
