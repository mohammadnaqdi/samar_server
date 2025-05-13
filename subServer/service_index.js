const express = require("express");
const router = express.Router();

const keysRouter = require("./keys");
const driverRouter = require("./driver");
const serviceRouter = require("./service");
const { isLoggined } = require("./../middleware/auth");

const error = require("./../middleware/error");


router.use("/keys", isLoggined, keysRouter);
router.use("/driver", isLoggined, driverRouter);
router.use("/service", isLoggined, serviceRouter);

router.use(error);
module.exports = router;