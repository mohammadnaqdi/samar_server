const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");

router.post(
    "/SetSanadStudent",
    validator.accDocInsertValidator(),
    controller.validate.bind(controller),
    controller.setSanadStudent.bind(controller),
);

module.exports = router;
