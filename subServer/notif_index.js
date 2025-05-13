const express = require("express");
const router = express.Router();

const notifRouter = require("./notif");
const reporterRouter = require("./reporter");


const { isLoggined, isAdmin, isEnyAdmin } = require("./../middleware/auth");

const error = require("./../middleware/error");

router.use("/notif",isLoggined, notifRouter);
router.use("/reporter", isLoggined, reporterRouter);


router.use(error);
module.exports = router;
