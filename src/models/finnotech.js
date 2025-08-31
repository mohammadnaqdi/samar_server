const mongoose = require("mongoose");

const finnotechUsageSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        type: { type: String, enum: ["SMS", "FIN"], default: "FIN" },
        endpoint: { type: String, default: "" },
        trackId: { type: String, default: "" },
        api: { type: String, default: "" },
        price: { type: Number, required: true },
        usedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        posted: { type: Boolean, default: false },
        description: { type: String, default: "" },
        mobiles: { type: [], default: [] },
    },
    {
        timestamps: true,
    }
);

const FinnotechUsage = mongoose.model("FinnotechUsage", finnotechUsageSchema);

module.exports = { FinnotechUsage };
