const mongoose = require("mongoose");

const ruleSchema = new mongoose.Schema(
    {
        agencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Agency",
            default: null,
        },
        type: {
            type: String,
            required: true,
            enum: ["parent", "student", "driver", "manager"],
        },
        rule: { type: String, required: true },
        show: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    },
);
var Rule = mongoose.model("Rule", ruleSchema);

module.exports = Rule;
