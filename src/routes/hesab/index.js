const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");

// router.post(
//     "/SetSanadStudentOrDriver",
//     validator.setSanadStudentValidator(),
//     controller.validate.bind(controller),
//     controller.setSanadStudentOrDriver.bind(controller),
// );
router.post(
    "/SetNewSanad",
    validator.setNewSanadValidator(),
    controller.validate.bind(controller),
    controller.setNewSanad.bind(controller),
);

router.post(
    "/InsertCheck",
    validator.insertCheckValidator(),
    controller.validate.bind(controller),
    controller.insertCheck.bind(controller),
);
router.post(
    "/DriverInfoForSalarySlip",
    validator.driverInfoForSalarySlipValidator(),
    controller.validate.bind(controller),
    controller.driverInfoForSalarySlip.bind(controller),
);
 
module.exports = router;
