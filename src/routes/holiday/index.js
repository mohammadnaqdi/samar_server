const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");

router.post(
    "/InsertHoliday",
    validator.insertHolidayValidator(),
    controller.validate.bind(controller),
    controller.insertHoliday.bind(controller),
);
router.post(
    "/GetSpacialHoliday",
    validator.getSpacialHolidayValidator(),
    controller.validate.bind(controller),
    controller.getSpacialHoliday.bind(controller),
);
router.post(
    "/GetMonthHolidayAndServiceNums",
    validator.getSpacialHolidayValidator(),
    controller.validate.bind(controller),
    controller.getMonthHolidayAndServiceNums.bind(controller),
);
router.get("/GetHolidays", controller.getHolidays.bind(controller));

module.exports = router;
