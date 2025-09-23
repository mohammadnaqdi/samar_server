const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAgencyAdmin } = require("../../middleware/auth");

router.get("/GetAddAccUrl", controller.getAddAccUrl.bind(controller));
router.get("/GetMyBank", controller.getMyBank.bind(controller));
router.get("/GetTypes", controller.getTypes.bind(controller));
router.get("/GetAllTypes", controller.getAllTypes.bind(controller));
router.get("/GetMyBankAccess", controller.getMyBankAccess.bind(controller));
router.get("/GetForWhatList", controller.getForWhatList.bind(controller));
router.post(
    "/GetAccountList",
    validator.getAccountListValidator(),
    controller.validate.bind(controller),
    controller.getAccountList.bind(controller)
);
router.post(
    "/ChequeRegister",
    validator.chequeRegisterValidator(),
    controller.validate.bind(controller),
    controller.chequeRegister.bind(controller)
);
router.post(
    "/ChequeAccept",
    validator.chequeAcceptValidator(),
    controller.validate.bind(controller),
    controller.chequeAccept.bind(controller)
);
router.post(
    "/ChequeInquiryHolder",
    validator.chequeAcceptValidator(),
    controller.validate.bind(controller),
    controller.chequeInquiryHolder.bind(controller)
);
router.post(
    "/ChequeInquiryTransfer",
    validator.chequeAcceptValidator(),
    controller.validate.bind(controller),
    controller.chequeInquiryTransfer.bind(controller)
);

router.post(
    "/BnkBanksInsert",
    validator.bnkBanksInsertValidator(),
    controller.validate.bind(controller),
    controller.bnkBanksInsert.bind(controller)
);
router.get("/BnkBanksById", controller.bnkBanksById.bind(controller));

router.post(
    "/setBankGate",
    validator.setBankGateValidator(),
    controller.validate.bind(controller),
    controller.setBankGate.bind(controller)
);
router.post(
    "/SetPayGate",
    validator.setBankGateValidator(),
    controller.validate.bind(controller),
    controller.setPayGate.bind(controller)
);
router.get("/getBankGate", controller.getBankGate.bind(controller));
router.get("/GetPayGate", controller.getPayGate.bind(controller));
router.get(
    "/GetBankGateOnlyCard",
    controller.getBankGateOnlyCard.bind(controller)
);
router.get(
    "/GetPayGateOnlyCard",
    controller.getPayGateOnlyCard.bind(controller)
);
router.get(
    "/GetBankGate4Parent",
    controller.getPayGate4Parent.bind(controller)
);
router.get("/GetPayGate4Parent", controller.getPayGate4Parent.bind(controller));
router.get(
    "/GetAgencyPayCards",
    isAgencyAdmin,
    controller.getAgencyPayCards.bind(controller)
);
router.get(
    "/RejectPayCard",
    isAgencyAdmin,
    controller.rejectPayCard.bind(controller)
);
router.get(
    "/getBankCreds",
    isAgencyAdmin,
    controller.getBankCreds.bind(controller)
);
router.get(
    "/GetPayCreds",
    isAgencyAdmin,
    controller.getPayCreds.bind(controller)
);

module.exports = router;
