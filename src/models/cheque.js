const mongoose = require("mongoose");

const sayadChequeSchema = new mongoose.Schema(
  {
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
    },
    adminCheque: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    sayadId: { type: String, unique: true, required: true },
    trackId: { type: String, default: "" },
    parentPhone: { type: String, default: "" },
    ownerPhone: { type: String, default: "" },
    parentShahab: { type: String, default: "" },
    parentIdentityNo: { type: String, default: "" },
    parentBirthDate: { type: Date, required: true },
    adminShahab: { type: String, default: "" },
    branchCode: { type: String, default: "" },
    bankCode: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    sanadId: { type: Number, unique: true, required: true },
    payQueueCode: { type: Number, default: "" },
    payQueueDate: { type: Date },
    dueDate: { type: String, default: "" },
    description: { type: String, default: "" },
    serialNo: { type: String, default: "" },
    seriesNo: { type: String, default: "" },
    fromIban: { type: String, default: "" },
    reason: { type: String, default: "" },
    currency: { type: Number, default: 0 },
    chequeStatus: { type: Number, default: 0 },
    chequeType: { type: Number, default: 0 },
    chequeMedia: { type: Number, default: 0 },
    blockStatus: { type: Number, default: 0 },
    guaranteeStatus: { type: Number, default: 0 },
    locked: { type: Number, default: 0 },
    issueDate: { type: String, default: "" },
    lockerBankCode: { type: String, default: "" },
    lockerBranchCode: { type: String, default: "" },
    holder: {
      nid: { type: String, default: "" },
      name: { type: String, default: "" },
      idType: { type: Number, default: 0 },
    },
    signer: {
      nid: { type: String, default: "" },
      name: { type: String, default: "" },
      legalStamp: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Cancelled"],
      default: "Pending",
    },
    confirmationReferenceId: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// sayadChequeSchema.index({ sayadId: 1, status: 1 }, { unique: true });

const SayadCheque = mongoose.model("SayadCheque", sayadChequeSchema);

module.exports = { SayadCheque };
