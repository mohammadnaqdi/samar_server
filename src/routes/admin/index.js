const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isEnyAdmin,isAgencyAdmin } = require("./../../middleware/auth");

// router.get(
//   '/',
//   controller.dashboard.bind(controller)
// );
router.get("/CheckLogin", controller.checkLogin.bind(controller));
router.get(
    "/CheckLoginAgency",
    isEnyAdmin,
    controller.checkLoginAgency.bind(controller),
);
router.get(
    "/SearchInMyUser",
    isEnyAdmin,
    controller.searchInMyUser.bind(controller),
);
router.get(
    "/MoreInfoStudent",
    isEnyAdmin,
    controller.moreInfoStudent.bind(controller),
);
router.get(
    "/MoreInfoStudentByCode",
    isEnyAdmin,
    controller.moreInfoStudentByCode.bind(controller),
);
router.get(
    "/DriverServiceById",
    isEnyAdmin,
    controller.driverServiceById.bind(controller),
);
router.get(
    "/DriverFilters",
    isEnyAdmin,
    controller.driverFilters.bind(controller),
);
router.post(
    "/StudentFilters",
    isEnyAdmin,
    controller.studentFilters.bind(controller),
);

router.post(
    "/newApk",
    validator.insertValidator(),
    controller.validate.bind(controller),
    controller.newApk.bind(controller),
);
router.post(
    "/AddEditHasibanCo",
    validator.addEditHasibanCoValidator(),
    controller.validate.bind(controller),
    controller.addEditHasibanCo.bind(controller),
);

router.get("/GetRule", isEnyAdmin, controller.getRule.bind(controller));
router.post(
    "/SetRule",
    isEnyAdmin,
    validator.setRuleValidator(),
    controller.validate.bind(controller),
    controller.setRule.bind(controller),
);

router.get("/SearchListAccForAdmin", isAgencyAdmin, controller.searchListAccForAdmin.bind(controller));

module.exports = router;
