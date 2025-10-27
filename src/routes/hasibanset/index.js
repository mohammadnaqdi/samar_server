const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin } = require("./../../middleware/auth");

router.get("/SetFirstCodeHesab", controller.setFirstCodeHesab.bind(controller));
router.get(
    "/GetLevelAccDetails",
    controller.getLevelAccDetails.bind(controller)
);
router.get("/GetGroupAcc", controller.getGroupAcc.bind(controller));
// router.get(
//     "/GetSettingStudentDriver",
//     controller.getSettingStudentDriver.bind(controller)
// );
router.get(
    "/CheckSanadNumWithCode",
    controller.checkSanadNumWithCode.bind(controller)
);
router.delete("/DeleteGroupAcc", controller.deleteGroupAcc.bind(controller));
router.delete(
    "/DeleteLevelAccDetail",
    controller.deleteLevelAccDetail.bind(controller)
);
router.delete("/DeleteListAcc", controller.deleteListAcc.bind(controller));
router.post(
    "/SetGroupAcc",
    validator.setGroupValidator(),
    controller.validate.bind(controller),
    controller.setGroupAcc.bind(controller)
);
router.post(
    "/SetLevelAccDetail",
    validator.setLevelAccDetailValidator(),
    controller.validate.bind(controller),
    controller.setLevelAccDetail.bind(controller)
);
router.get(
    "/GetTypeMahyat",
    isEnyAdmin,
    controller.getTypeMahyat.bind(controller)
);
router.get(
    "/GetLastLevelAccDetailCode",
    isEnyAdmin,
    controller.getLastLevelAccDetailCode.bind(controller)
);
router.get("/GetLevelAcc", isEnyAdmin, controller.getLevelAcc.bind(controller));
router.get("/GetListAcc", isEnyAdmin, controller.getListAcc.bind(controller));
router.get(
    "/GetListSarfasl",
    isEnyAdmin,
    controller.getListSarfasl.bind(controller)
);
router.post(
    "/SetSarfasl",
    isEnyAdmin,
    validator.setSarfaslValidator(),
    controller.validate.bind(controller),
    controller.setSarfasl.bind(controller)
);
router.post(
    "/SetPercent",
    isEnyAdmin,
    validator.setPercentValidator(),
    controller.validate.bind(controller),
    controller.setPercent.bind(controller)
);
router.get("/GetBanks", controller.getBanks.bind(controller));
router.get("/GetBranch", controller.getBranch.bind(controller));

router.get("/SetFirstListAcc",isEnyAdmin, controller.setFirstListAcc.bind(controller));
router.get("/GetSharingSarafal", controller.getSharingSarafal.bind(controller));
router.get("/GetAllListAcc",isEnyAdmin, controller.getAllListAcc.bind(controller));

router.post(
    "/SearchHesab",
    validator.searchHesabValidator(),
    controller.validate.bind(controller),
    controller.searchHesabByNameCode.bind(controller)
);
router.post(
    "/GetHesabByListCode",
    validator.getHesabByListCodeValidator(),
    controller.validate.bind(controller),
    controller.getHesabByListCode.bind(controller)
);
router.post(
    "/GetHesabByTypeAndLevel",
    validator.getHesabByTypeAndLevelValidator(),
    controller.validate.bind(controller),
    controller.getHesabByTypeAndLevel.bind(controller)
);
router.post(
    "/ChangeSanadPay",
    validator.changeSanadPayValidator(),
    controller.validate.bind(controller),
    controller.changeSanadPay.bind(controller)
);

module.exports = router;
