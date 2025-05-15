const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");

router.post(
    "/SetSanadStudent",
    validator.setSanadStudentValidator(),
    controller.validate.bind(controller),
    controller.setSanadStudent.bind(controller),
);

router.post(
    "/SetRcCheck4Student",
    validator.setRcCheck4StudentValidator(),
    controller.validate.bind(controller),
    controller.setRcCheck4Student.bind(controller),
);

module.exports = router;
