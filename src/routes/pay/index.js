const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isLoggined, isAgencyAdmin, isAdmin } = require("./../../middleware/auth");
//this controller import a class this mean like a class

router.get("/Verify", controller.verify.bind(controller));
router.post("/Verify2", controller.verify2.bind(controller));
router.post("/VerifyPrePayment", controller.verifyPrePayment.bind(controller));
router.post("/VerifyCoBank", controller.verifyCoBank.bind(controller));
router.get("/VerifyCo", controller.verifyCo.bind(controller));
router.get("/VerifyCoCharge", controller.verifyCoCharge.bind(controller));
router.post(
    "/SendNotifSocket",
    isLoggined,
    isAdmin,
    validator.sendNotifsValidator(),
    controller.validate.bind(controller),
    controller.sendNotifSocket.bind(controller)
);

router.get(
    "/sayadTransfersChainInquiry",
    isLoggined,
    isAdmin,
    controller.validate.bind(controller),
    controller.sayadTransfersChainInquiry.bind(controller)
);
 
router.get(
    "/sendSMSAuthorization",
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.sendSMSAuthorization.bind(controller)
);
 
router.post(
    "/sayadChequeInquiry",
    isLoggined,
    isAgencyAdmin,
    validator.sayadChequeInquiryValidator(),
    controller.validate.bind(controller),
    controller.sayadChequeInquiry.bind(controller)
);
 
router.get(
    "/getCardInformation",
    controller.validate.bind(controller),
    controller.getCardInformation.bind(controller)
);

module.exports = router;
