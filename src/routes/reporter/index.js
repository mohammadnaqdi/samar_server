const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin,isSuperAdmin } = require("./../../middleware/auth");

router.get("/DriverActReport",isEnyAdmin, controller.driverActReport.bind(controller));

router.get("/GetMyInspectorReport", controller.getMyInspectorReport.bind(controller));

router.get(
    "/GetInspectorReport",
    controller.getInspectorReportX.bind(controller)
);

router.post(
    "/InsertInspectorReport",
    isEnyAdmin,
    validator.insertInspectorReportValidator(),
    controller.validate.bind(controller),
    controller.insertInspectorReport.bind(controller),
);
router.get(
    "/GetOperationLog",isEnyAdmin,
    controller.getOperationLog.bind(controller)
);
router.get(
    "/GetStimApi",isEnyAdmin,
    controller.getStimApi.bind(controller)
);
router.post(
    "/SetStimApi",isSuperAdmin,
    validator.setStimApiValidator(),
    controller.validate.bind(controller),
    controller.setStimApi.bind(controller)
);

module.exports = router;
