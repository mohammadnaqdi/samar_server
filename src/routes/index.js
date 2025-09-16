const path = require("path");
const fs = require("fs");
const express = require("express");
const router = express.Router();
const authRouter = require("./auth");
const userRouter = require("./user");
const contractRouter = require("./contract");
const studentRouter = require("./student");
const student2Router = require("./student2");
const schoolRouter = require("./school");
const uploadRouter = require("./uploads");
const adminRouter = require("./admin");
const keysRouter = require("./keys");
const agencyRouter = require("./agency");
const paymentRouter = require("./payment");
const driverRouter = require("./driver");
const serviceRouter = require("./service");
const reportRouter = require("./report");
const holidayRouter = require("./holiday");
const hasibansetRouter = require("./hasibanset");
const hasibansanadRouter = require("./hasibansanad");
const feedbackRouter = require("./feedback");
const payRouter = require("./pay");
const taxiRouter = require("./taxi");
const bankRouter = require("./bank");
const packRouter = require("./pack");
const notifRouter = require("./notif");
const softwareRouter = require("./software");
const messageRouter = require("./message");
const processRouter = require("./process");
const process2Router = require("./process2");
const reporterRouter = require("./reporter");
const finnotechRouter = require("./finnotech");
const hesabRouter = require("./hesab");
const { isLoggined, isAdmin, isEnyAdmin } = require("./../middleware/auth");
const error = require("./../middleware/error");
const Versionsoft = require("./../models/versionsoft");

router.use("/auth", authRouter);

router.use("/contract", contractRouter);
router.use("/user", isLoggined, userRouter);
router.use("/student", isLoggined, studentRouter);
router.use("/student2", isLoggined, student2Router);
router.use("/school", isLoggined, schoolRouter);
router.use("/keys", isLoggined, keysRouter);
router.use("/agency", isLoggined, agencyRouter);
router.use("/software", softwareRouter);
router.use("/payment", isLoggined, paymentRouter);
router.use("/driver", isLoggined, driverRouter);
router.use("/service", isLoggined, serviceRouter);
router.use("/report", isLoggined, reportRouter);
router.use("/pay", payRouter);
router.use("/taxi", taxiRouter);
router.use("/holiday", isLoggined, holidayRouter);
router.use("/hasibanset", isLoggined, hasibansetRouter);
router.use("/hasibansanad", isLoggined, hasibansanadRouter);
router.use("/bank", isLoggined, bankRouter);
router.use("/message", isLoggined, messageRouter);
router.use("/pack", isLoggined, packRouter);
router.use("/process", isLoggined, processRouter);
router.use("/process2", isLoggined, process2Router);
router.use("/notif", isLoggined, notifRouter);
router.use("/reporter", isLoggined, reporterRouter);
router.use("/hesab", isLoggined, hesabRouter);
router.use("/file", uploadRouter);
router.use("/feedback", feedbackRouter);
router.use("/finnotech", finnotechRouter);
router.use("/admin", isLoggined, isEnyAdmin, adminRouter);

const { redisClient } = require("../../startup/redis");

router.get("/download", (req, res) => {
    const { data } = req.query;
    const filePath = path.join(__basedir, `/documents/${data}`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    if (data.includes("zip")) {
        res.setHeader("Content-Type", "application/zip");
    } else {
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
    }

    return res.download(filePath, data, (err) => {
        if (err) {
            console.error("Error sending file:", err);
            res.status(500).json({ error: "Failed to send file" });
        }
    });
});

router.get("/getApp", getLatest);
async function getLatest(req, res) {
    let type = req.query.type;
    if(type=='panel'){
         return res.json(407);
    }
    if (type != 1 && type != 2 && type != 3) {
        type = 1;
    }

    // if (!type) {
    //     return res.status(400).json({ error: "Invalid type." });
    // }

    type = !type ? 1 : type;

    const version = await Versionsoft.Versionsoft.findOne({ type }, "url -_id")
        .sort({ _id: -1 })
        .then((doc) => doc.url);
    // let version = await redisClient.get(`software:${type}`);
    if (!version) {
        return res.status(404).json({ error: "App not found." });
    }
    // version = JSON.parse(version);
    return res.redirect(version);
}

// router.use(error);
module.exports = router;
