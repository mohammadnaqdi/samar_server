const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isLoggined, isEnyAdmin } = require("./../../middleware/auth");

// router.post(
//     "/SetPayQueue",
//     isLoggined,
//     isEnyAdmin,
//     validator.setPayQueueValidator(),
//     controller.validate.bind(controller),
//     controller.setPayQueue.bind(controller),
// );
router.post(
    "/InsertInvoice",
    isLoggined,
    isEnyAdmin,
    validator.insertInvoiceValidator(),
    controller.validate.bind(controller),
    controller.insertInvoice.bind(controller)
);

router.get("/Payment", isLoggined, controller.payment.bind(controller));
router.get("/Payment2", isLoggined, controller.payment2.bind(controller));
router.get("/PrePaymentLink", isLoggined, controller.prePaymentLink.bind(controller));
router.get("/PaymentCo", isLoggined, controller.paymentCo.bind(controller));
router.get("/PaymentCoBank", isLoggined, controller.paymentCoBank.bind(controller));
router.get(
    "/PaymentChargeAdmin",
    isLoggined,
    controller.paymentChargeAdmin.bind(controller)
);
router.get("/GetPayQueue", isLoggined, controller.getPayQueue.bind(controller));
router.get("/GetInvoceId", isLoggined, controller.getInvoceId.bind(controller));
router.get(
    "/SetInstallments",
    isLoggined,
    isEnyAdmin,
    controller.setInstallments.bind(controller)
);
router.post(
    "/SetInstallmentForStudent",
    isLoggined,
    isEnyAdmin,
    controller.setInstallmentForStudent.bind(controller)
);
router.post(
    "/SetInstallmentByParent",
    isLoggined,
        validator.setInstallmentByParentValidator(),
    controller.validate.bind(controller),
    controller.setInstallmentByParent.bind(controller)
);
// router.post(
//     "/SetActionPay",
//     isLoggined,
//     isEnyAdmin,
//     validator.setActionPayValidator(),
//     controller.validate.bind(controller),
//     controller.setActionPay.bind(controller),
// );
router.post(
    "/ShowMorePay",
    isLoggined,
    validator.showMorePayValidator(),
    controller.validate.bind(controller),
    controller.showMorePay.bind(controller)
);
// router.post(
//     "/SetActionPayWithWallet",
//     isLoggined,
//     isEnyAdmin,
//     validator.setActionPayWithWalletValidator(),
//     controller.validate.bind(controller),
//     controller.setActionPayWithWallet.bind(controller),
// );
router.post(
    "/PayRegistrationWithWallet",
    isLoggined,
    isEnyAdmin,
    validator.payRegistrationWithWalletValidator(),
    controller.validate.bind(controller),
    controller.payRegistrationWithWallet.bind(controller)
);

router.get(
    "/GetStudentPays",
    isLoggined,
    controller.getStudentPays.bind(controller)
);
router.get(
    "/GetPayHistory",
    isLoggined,
    controller.getPayHistory.bind(controller)
);
router.get(
    "/GetOnlinePayHistory",
    isLoggined,
    controller.getOnlinePayHistory.bind(controller)
);
router.get(
    "/GetWalletAmount",
    isLoggined,
    isEnyAdmin,
    controller.getWalletAmount.bind(controller)
);

module.exports = router;
