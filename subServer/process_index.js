const express = require("express");
const router = express.Router();

const processRouter = require("./process");
const process2Router = require("./process2");

const { isLoggined, isAdmin, isEnyAdmin } = require("./../middleware/auth");
const error = require("./../middleware/error");

router.use("/process",isLoggined, processRouter);
router.use("/process2",isLoggined, process2Router);


router.use(error);
module.exports = router;
