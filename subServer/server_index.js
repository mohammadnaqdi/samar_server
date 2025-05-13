const express = require("express");
const router = express.Router();

const schoolRouter = require("./school");//
const agencyRouter = require("./agency");//
const packRouter = require("./pack");//
const messageRouter = require("./message");//
const holidayRouter = require("./holiday");//
const error = require("./../middleware/error");

const { isLoggined } = require("./../middleware/auth");
const error = require("./../middleware/error");

router.use("/school", isLoggined, schoolRouter);
router.use("/agency", isLoggined, agencyRouter);
router.use("/holiday", isLoggined, holidayRouter);
router.use("/message", isLoggined, messageRouter);
router.use("/pack", isLoggined, packRouter);


router.use(error);
module.exports = router;
