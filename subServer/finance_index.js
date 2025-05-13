const express = require("express");
const router = express.Router();


const hasibansetRouter = require("./hasibanset");
const hasibansanadRouter = require("./hasibansanad");
const bankRouter = require("./bank");
const reportRouter = require("./report");
const softwareRouter = require("./software");
const paymentRouter = require("./payment");

const { isLoggined } = require("./../middleware/auth");
const error = require("./../middleware/error");


router.use("/software", softwareRouter);
router.use("/hasibanset", isLoggined, hasibansetRouter);
router.use("/report", isLoggined, reportRouter);
router.use("/hasibansanad", isLoggined, hasibansanadRouter);
router.use("/bank", isLoggined, bankRouter);
router.use("/payment", isLoggined, paymentRouter);

router.use(error);
module.exports = router;
