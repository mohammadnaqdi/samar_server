const express = require("express");
const rateLimit = require('express-rate-limit');
// Create a limiter: 1 request every 3 seconds
const limiter = rateLimit({
  windowMs: 3 * 1000, // 3 seconds
  max: 1, // limit each IP to 1 request per window
  standardHeaders: true, // Return rate limit info in the headers
  legacyHeaders: false, // Disable deprecated headers
  message: "Too many requests. Please wait a few seconds and try again."
});
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const {
    isAdmin,
    isEnyAdmin,
    isAgencyAdmin,
} = require("./../../middleware/auth");

router.get("/AccDoc", isEnyAdmin, controller.accDoc.bind(controller));
router.get("/SumSanads", isEnyAdmin, controller.sumSanads.bind(controller));

router.post(
    "/AccDocInsert",limiter,
    validator.accDocInsertValidator(),
    controller.validate.bind(controller),
    controller.accDocInsert.bind(controller),
);
router.post(
    "/ChargeCompanyByAdmin",
    isAdmin,
    validator.chargeCompanyByAdminValidator(),
    controller.validate.bind(controller),
    controller.chargeCompanyByAdmin.bind(controller),
);
router.post(
    "/UnChargeCompanyByAdmin",
    isAdmin,
    validator.chargeCompanyByAdminValidator(),
    controller.validate.bind(controller),
    controller.unChargeCompanyByAdmin.bind(controller),
);
router.get("/AccActionShow", controller.accActionShow.bind(controller));
router.post(
    "/AccDocEdit",
    validator.accDocEditValidator(),
    controller.validate.bind(controller),
    controller.accDocEditT.bind(controller),
);
router.get("/RptHesab", isEnyAdmin, controller.gozareshHesab.bind(controller));
router.get(
    "/RptHesabWallet",
    isEnyAdmin,
    controller.gozareshHesabKifePool.bind(controller),
);
router.get("/RptDriverHesab", controller.driverReportHesab.bind(controller));
router.get("/StudentReportHesab", controller.studentReportHesab.bind(controller));
router.get("/WalletReport", controller.walletReport.bind(controller));
router.get(
    "/GetWalletCompany",
    isAdmin,
    controller.getWalletCompany.bind(controller),
);
router.delete(
    "/RemovePay",
    isAgencyAdmin,
    controller.removePay.bind(controller),
);

// router.post(
//     "/BnkRcInsert",
//     validator.bnkCashInsertValidator(),
//     controller.validate.bind(controller),
//     controller.bnkRcInsertT.bind(controller),
// );

router.post("/BnkAction", controller.bnkActionSearch.bind(controller));
router.post(
    "/BnkActionVosool",
    validator.bnkActionVosoolValidator(),
    controller.validate.bind(controller),
    controller.bnkActionVosool.bind(controller),
);
// router.post(
//     "/BnkPyNetInsert",
//     validator.bnkCashInsertValidator(),
//     controller.validate.bind(controller),
//     controller.bnkPyNetInsert.bind(controller),
// );
router.delete(
    "/RemovePaySalary",isAgencyAdmin,
    controller.removePaySalary.bind(controller),
);
router.delete(
    "/RemoveDocBySanadNum",isEnyAdmin,
    controller.removeDocBySanadNum.bind(controller),
);
router.delete(
    "/RemoveDocBySanadNum2",isEnyAdmin,
    controller.removeDocBySanadNum2.bind(controller),
);



module.exports = router;
