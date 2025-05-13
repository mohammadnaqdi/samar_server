const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
    {
        
        name: { type: String, required: true },
        phone: String,
        email: String,
        text: String,
    },
    {
        timestamps: true,
    },
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

const operationLogSchema = new mongoose.Schema(
    {
        userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required:true,
                },
        name: { type: String, required: true },
        agencyId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Agency",default:null
                },
       targetIds:[],
       targetTable:String,
       sanadId:Number,
       actionName:String,
       actionNameFa:String,
       desc:String,
       other:[]
    },
    {
        timestamps: true,
    },
);

const OperationLog = mongoose.model("OperationLog", operationLogSchema);

module.exports = {Feedback,OperationLog};
