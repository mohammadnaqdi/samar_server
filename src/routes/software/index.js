const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isLoggined } = require("./../../middleware/auth");

router.get("/get-backup", controller.backup.bind(controller));

router.post(
    "/SetVersion",
    isLoggined,
    isAdmin,
    validator.setVersionValidator(),
    controller.validate.bind(controller),
    controller.setVersion.bind(controller),
);

router.get("/GetVersion", controller.getVersion.bind(controller));
router.get("/Get10LastVersions", controller.get10LastVersions.bind(controller));

module.exports = router;
