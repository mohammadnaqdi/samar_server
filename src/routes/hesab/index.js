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

// router.post(
//     "/SetRcCheck4Student",
//     validator.setRcCheck4StudentValidator(),
//     controller.validate.bind(controller),
//     controller.setRcCheck4Student.bind(controller),
// );
// router.post(
//     "/SetCheck4Driver",
//     validator.setCheck4DriverValidator(),
//     controller.validate.bind(controller),
//     controller.setCheck4Driver.bind(controller),
// );
router.post(
    "/InsertCheck",
    validator.insertCheckValidator(),
    controller.validate.bind(controller),
    controller.insertCheck.bind(controller),
);
 
module.exports = router;
