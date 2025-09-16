const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isEnyAdmin } = require("./../../middleware/auth");

// router.post(
//     "/SetPayQueue",
//
//     isEnyAdmin,
//     validator.setPayQueueValidator(),
//     controller.validate.bind(controller),
//     controller.setPayQueue.bind(controller),
// );
router.post(
    "/InsertInvoice",

    isEnyAdmin,
    validator.insertInvoiceValidator(),
    controller.validate.bind(controller),
    controller.insertInvoice.bind(controller)
);

// router.get("/Payment", controller.payment.bind(controller));
// router.get("/Payment2",  controller.payment2.bind(controller));
router.get(
    "/PrePaymentLink",

    controller.prePaymentLink.bind(controller)
);
router.get("/PaymentLink", controller.paymentLink.bind(controller));
router.get("/PaymentCo", controller.paymentCo.bind(controller));

router.get(
    "/PaymentChargeAdmin",

    controller.paymentChargeAdmin.bind(controller)
);
router.get("/GetAgencyInvoices", controller.getAgencyInvoices.bind(controller));
router.get("/GetInvoceId", controller.getInvoceId.bind(controller));
router.get(
    "/SetInstallments",

    isEnyAdmin,
    controller.setInstallments.bind(controller)
);
router.post(
    "/SetInstallmentForStudent",

    isEnyAdmin,
    controller.setInstallmentForStudent.bind(controller)
);
router.post(
    "/SetInstallmentByParent",

    validator.setInstallmentByParentValidator(),
    controller.validate.bind(controller),
    controller.setInstallmentByParent.bind(controller)
);
// router.post(
//     "/SetActionPay",
//
//     isEnyAdmin,
//     validator.setActionPayValidator(),
//     controller.validate.bind(controller),
//     controller.setActionPay.bind(controller),
// );
router.post(
    "/ShowMorePay",

    validator.showMorePayValidator(),
    controller.validate.bind(controller),
    controller.showMorePay.bind(controller)
);
// router.post(
//     "/SetActionPayWithWallet",
//
//     isEnyAdmin,
//     validator.setActionPayWithWalletValidator(),
//     controller.validate.bind(controller),
//     controller.setActionPayWithWallet.bind(controller),
// );
router.post(
    "/PayRegistrationWithWallet",

    isEnyAdmin,
    validator.payRegistrationWithWalletValidator(),
    controller.validate.bind(controller),
    controller.payRegistrationWithWallet.bind(controller)
);
router.post(
    "/SetStudentPayCard",

    validator.setStudentPayCardValidator(),
    controller.validate.bind(controller),
    controller.setStudentPayCard.bind(controller)
);

router.get(
    "/GetStudentPays",

    controller.getStudentPays.bind(controller)
);
router.get(
    "/GetPayHistory",

    controller.getPayHistory.bind(controller)
);
router.get(
    "/GetOnlinePayHistory",

    controller.getOnlinePayHistory.bind(controller)
);
router.get(
    "/GetWalletAmount",

    isEnyAdmin,
    controller.getWalletAmount.bind(controller)
);

module.exports = router;
