const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isLoggined } = require("./../../middleware/auth");

router.post(
    "/phoneCheck",
    validator.phoneCheckValidator(),
    controller.validate.bind(controller),
    controller.phoneCheck.bind(controller)
);
router.post(
    "/PhoneCheckMaster",
    validator.phoneCheckValidator(),
    controller.validate.bind(controller),
    controller.phoneCheckMaster.bind(controller)
);

router.post(
    "/codeCheck",
    validator.codeValidator(),
    controller.validate.bind(controller),
    controller.codeCheck.bind(controller)
);

router.get("/firstCheck", controller.firstCheck.bind(controller));
router.post(
    "/FirstUser",
    validator.firstUserValidator(),
    controller.validate.bind(controller),
    controller.firstUser.bind(controller)
);
router.post(
    "/Login",
    validator.loginValidator(),
    controller.validate.bind(controller),
    controller.login.bind(controller)
);
router.post(
    "/CheckCodeChangePass",
    validator.checkCodeChangePassValidator(),
    controller.validate.bind(controller),
    controller.checkCodeChangePass.bind(controller)
);
router.post(
    "/AdminPhoneCheck",
    validator.adminPhoneCheckValidator(),
    controller.validate.bind(controller),
    controller.adminPhoneCheck.bind(controller)
);
router.post(
    "/InspectorPhoneCheck",
    validator.adminPhoneCheckValidator(),
    controller.validate.bind(controller),
    controller.inspectorPhoneCheck.bind(controller)
);
router.get(
    "/GetDriverLocation",
    isLoggined,
    controller.getDriverLocation.bind(controller)
);
router.get(
    "/GetDriverStates",
    isLoggined,
    controller.getDriverStates.bind(controller)
);

router.post(
    "/UpdateDriverLocation",
    validator.updateDriverLocationValidator(),
    controller.validate.bind(controller),
    controller.updateDriverLocation.bind(controller)
);
router.get("/VerifyAgain", controller.verifyAgain.bind(controller));

module.exports = router;
