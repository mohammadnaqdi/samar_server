const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const {
    isAdmin,
    isEnyAdmin,
    isSuperAdmin,
    isAgencyAdmin,isOnlyAgencyAdmin
} = require("./../../middleware/auth");

router.get("/UserCheckLogin", controller.userCheckLogin.bind(controller));
router.get(
    "/InspectorCheckLogin",
    controller.inspectorCheckLogin.bind(controller),
);
router.get("/getUserInfo", controller.getUserInfo.bind(controller));
router.get("/SearchPhone", controller.searchPhone.bind(controller));
router.post(
    "/UserList",
    isAdmin,
    validator.userListValidator(),
    controller.validate.bind(controller),
    controller.userList.bind(controller),
);

router.post(
    "/update",
    validator.updateValidator(),
    controller.validate.bind(controller),
    controller.update.bind(controller),
);
router.post(
    "/SetUserAdmin",
    isSuperAdmin,
    validator.setUserAdminValidator(),
    controller.validate.bind(controller),
    controller.setUserAdmin.bind(controller),
);
router.post(
    "/SetUserOperator",
    isOnlyAgencyAdmin,
    validator.setUserOperatorValidator(),
    controller.validate.bind(controller),
    controller.setUserOperator.bind(controller),
);
router.get(
    "/GetUserAdmin",
    isSuperAdmin,
    controller.getUserAdmin.bind(controller),
);
router.post("/SetName", controller.setName.bind(controller));
router.post(
    "/SetNationalCode",
    validator.setNationalCodeValidator(),
    controller.validate.bind(controller),
    controller.setNationalCode.bind(controller),
);
router.get("/GetNationalCode", controller.getNationalCode.bind(controller));
router.post(
    "/SetNameAsAdmin",
    isEnyAdmin,
    controller.setNameAsAdmin.bind(controller),
);

router.get("/GetRule", controller.getRule.bind(controller));

router.post(
    "/SetNewUser",
    validator.setNewUserValidator(),
    controller.validate.bind(controller),
    controller.setNewUser.bind(controller),
);

router.get(
  '/GetUserOperator',isOnlyAgencyAdmin,
  controller.getUserOperator.bind(controller)
);
router.post(
  '/SetUserOperatorBanList',isOnlyAgencyAdmin,
  controller.setUserOperatorBanList.bind(controller)
);

router.get("/GetAgencyUsers", isAgencyAdmin, controller.getAgencyUsers.bind(controller));

module.exports = router;
