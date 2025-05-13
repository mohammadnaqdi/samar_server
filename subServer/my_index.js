const express = require("express");
const router = express.Router();


const userRouter = require("./user");
const studentRouter = require("./student");
const student2Router = require("./student2");
const adminRouter = require("./admin");

const { isLoggined, isEnyAdmin } = require("./../middleware/auth");
const error = require("./../middleware/error");


router.use("/user", isLoggined, userRouter);
router.use("/student", isLoggined, studentRouter);
router.use("/student2", isLoggined, student2Router);
router.use("/admin", isLoggined, isEnyAdmin, adminRouter);

router.use(error);
module.exports = router;
