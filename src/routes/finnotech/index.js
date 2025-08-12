const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const {
    isLoggined,
    isEnyAdmin,
    isAdmin,
    isAgencyAdmin,
} = require("./../../middleware/auth");

router.post(
    "/setAdminInfo",
    isLoggined,
    isAgencyAdmin,
    validator.setAdminInfoValidator(),
    controller.validate.bind(controller),
    controller.setAdminInfo.bind(controller)
);

router.get(
    "/getAdminInfo",
    isLoggined,
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.getAdminInfo.bind(controller)
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
    isLoggined,
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.sendSMSAuthorization.bind(controller)
);

router.post(
    "/verifySMSAuthorization",
    isLoggined,
    isAgencyAdmin,
    validator.verifySMSAuthorizationValidator(),
    controller.validate.bind(controller),
    controller.verifySMSAuthorization.bind(controller)
);

router.post(
    "/sayadChequeInquiry",
    isLoggined,
    // isAgencyAdmin,
    validator.sayadChequeInquiryValidator(),
    controller.validate.bind(controller),
    controller.sayadChequeInquiry.bind(controller)
);

router.get(
    "/getCardInformation",
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.getCardInformation.bind(controller)
);

router.get(
    "/sayadAcceptCheque",
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.sayadAcceptCheque.bind(controller)
);

router.get(
    "/chequeColorInquiry",
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.chequeColorInquiry.bind(controller)
);

router.get(
    "/confirmShahabCode",
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.confirmShahabCode.bind(controller)
);

router.get(
    "/canAgencyPayCheque",
    controller.validate.bind(controller),
    controller.canAgencyPayCheque.bind(controller)
);

router.get(
    "/chequeInfo",
    isLoggined,
    controller.validate.bind(controller),
    controller.chequeInfo.bind(controller)
);

router.get(
    "/getParentShahab",
    isLoggined,
    controller.validate.bind(controller),
    controller.getParentShahab.bind(controller)
);

router.get(
    "/getUnassignedCheques",
    isLoggined,
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.getUnassignedCheques.bind(controller)
);

router.get(
    "/getFullChequeInfo",
    isLoggined,
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.getFullChequeInfo.bind(controller)
);

router.get(
    "/sayadCancelCheque",
    isLoggined,
    isAgencyAdmin,
    controller.validate.bind(controller),
    controller.sayadCancelCheque.bind(controller)
);

module.exports = router;
