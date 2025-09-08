const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAgencyAdmin, isEnyAdmin } = require("./../../middleware/auth");

router.get("/byPhone", controller.byPhone.bind(controller));

router.get("/bySchoolId", controller.bySchoolId.bind(controller));

router.get("/byStudentId", controller.byStudentId.bind(controller));

module.exports = router;
