const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");

router.post(
    "/GetMonthHolidayAndServiceNums",
    validator.getSpacialHolidayValidator(),
    controller.validate.bind(controller),
    controller.insertHoliday.bind(controller),
);
router.get("/callback", controller.callback.bind(controller));

module.exports = router;
