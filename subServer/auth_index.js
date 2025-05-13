const express = require("express");
const router = express.Router();

const authRouter = require("./auth/index");


const error = require("./../middleware/error");

router.use("/auth", authRouter);


router.use(error);
module.exports = router;
