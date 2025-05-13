const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isLoggined, isEnyAdmin,isAdmin } = require("./../../middleware/auth");
//this controller import a class this mean like a class


router.get("/Verify", controller.verify.bind(controller));
router.post("/Verify2", controller.verify2.bind(controller));
router.get("/VerifyCo", controller.verifyCo.bind(controller));
router.get("/VerifyCoCharge", controller.verifyCoCharge.bind(controller));
router.post("/SendNotifSocket",isLoggined, isAdmin,
    validator.sendNotifsValidator(),
    controller.validate.bind(controller), controller.sendNotifSocket.bind(controller));

module.exports = router;
