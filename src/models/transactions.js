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
const transSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        authority: { type: String, unique: true,},
        rrn: { type: String, default: "" },
        tracenumber: { type: String, default: "" },
        issuerbank: { type: String, default: "" },
        cardnumber: { type: String, default: "" },
        refID: { type: String, default: "" },
        amount: { type: Number, required: true },
        stCode: { type: String, required: true },
        queueCode: { type: Number, required: true },
        state: { type: Number, default: 0 },
        desc: { type: String, default: "" },
        done: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
transSchema.pre("save", async function (next) {
  if (this.isNew) {
    const cc = await getNextSequence('authority');
      this.authority =cc.toString();
  }
  next();
});
const Transactions = mongoose.model("Transactions", transSchema);

const payQueueSchema = new mongoose.Schema(
    {
        inVoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice", required: true
        },
        code: { type: Number},
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency", required: true
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student", required: true
        },
        setter: { type: mongoose.Schema.Types.ObjectId, required: true },
        type: {
            type: String,
            default: "optional",
            enum: [
                "optional",
                "force",
                "registration",
                "serviceCost",
                "prePayment",
                "installment",
            ],
        },
        amount: { type: Number, required: true },
        title: { type: String, required: true },
        payDate: { type: Date, default: null },
        counter: { type: Number, default: 0 },
        maxDate: { 
            type: Date, 
            default: function() {
                const now = new Date();
                const year = now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
                return new Date(year, 2, 1); // March is month 2 (0-based)
            }
        },
        isPaid: { type: Boolean, default: false },
        isSetAuto: { type: Boolean, default: true },
        delete: { type: Boolean, default: false },
        authority: { type: String, default: '' },
    },
    {
        timestamps: true,
    },
);
payQueueSchema.index(
    { code: 1, studentId: 1 },
    { unique: true }
);
const PayQueue = mongoose.model("PayQueue", payQueueSchema);

const invoiceSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        setter: { type: mongoose.Schema.Types.ObjectId, required: true },
        code: { type: Number, unique: true },
        type: {
            type: String,
            default: "optional",
            enum: [
                "optional",
                "force",
                "registration",
                "serviceCost",
                "prePayment",
                "installment",
            ],
        },
        amount: { type: Number, required: true },
        title: { type: String, required: true },
        desc: { type: String, default: "" },
        schools: [],
        distancePrice: { type: [
            {maxDistance:Number,amount:Number}
        ], default: [] },
        counter: { type: Number, default: 0 },
        maxDate: { 
            type: Date, 
            default: function() {
                const now = new Date();
                const year = now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
                return new Date(year, 2, 1); // March is month 2 (0-based)
            }
        },
        active: { type: Boolean, default: true },
        confirmInfo: { type: Boolean, default: false },
        confirmPrePaid: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        fixPrice: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    },
);
invoiceSchema.index({ agencyId: 1, type: 1,counter:1 }, { unique: true });
invoiceSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.code= await getNextSequence('invoice');
  }
  next();
});
const Invoice = mongoose.model("Invoice", invoiceSchema);

// const payActionSchema = new mongoose.Schema(
//     {
//         setter: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "User",
//             required: true,
//         },
//         transaction: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Transactions",
//             required: false,
//             default: null,
//         },
//         agencyId: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Agency",
//             default: null,
//         },
//         queueCode: { type: Number, required: true },
//         amount: { type: Number, required: true },
//         docSanadNum: { type: Number, required: true },
//         docSanadId: {
//                     type: mongoose.Schema.Types.ObjectId,
//                     ref: "DocSanad",
//                     required: false,default:null
//                 },
//         desc: { type: String, default: "" },
//         isOnline: { type: Boolean },
//         studentCode: { type: String, required: true },
//         delete: { type: Boolean, default: false },
//     },
//     {
//         timestamps: true,
//     },
// );

// const PayAction = mongoose.model("payAction", payActionSchema);

module.exports = { Transactions, PayQueue,Invoice };
