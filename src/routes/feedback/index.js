const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");

router.post(
    "/submit",
    validator.submitValidator(),
    controller.validate.bind(controller),
    controller.feedback.bind(controller),
);

module.exports = router;
