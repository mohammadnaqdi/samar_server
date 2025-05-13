const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin } = require("./../../middleware/auth");

router.post(
    "/SetMessageCode",
    isAdmin,
    validator.setMessageCodeValidator(),
    controller.validate.bind(controller),
    controller.setMessageCode.bind(controller),
);
router.get(
    "/GetMessageCode",
    isEnyAdmin,
    controller.getMessageCode.bind(controller),
);
router.get(
    "/GetMessaging",
    isEnyAdmin,
    controller.getMessaging.bind(controller),
);
router.post(
    "/SendMessage",
    isEnyAdmin,
    validator.sendMessageValidator(),
    controller.validate.bind(controller),
    controller.sendMessage.bind(controller),
);
router.post(
    "/SendAvanakToService",
    controller.sendAvanakToService.bind(controller),
);

router.post(
    "/batchSend",
    validator.batchSendValidator(),
    controller.validate.bind(controller),
    controller.batchSend.bind(controller),
);



module.exports = router;
