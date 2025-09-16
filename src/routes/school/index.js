const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin } = require("./../../middleware/auth");

router.post(
    "/SetSchool",
    isEnyAdmin,
    validator.setSchoolValidator(),
    controller.validate.bind(controller),
    controller.setSchool.bind(controller)
);
router.post(
    "/UnselectedSchools",
    validator.unselectedSchoolsValidator(),
    controller.validate.bind(controller),
    controller.unselectedSchools.bind(controller)
);
router.post(
    "/AddManagerToSchool",
    isAdmin,
    validator.addManagerToSchoolValidator(),
    controller.validate.bind(controller),
    controller.addManagerToSchool.bind(controller)
);

router.get("/SchoolList", controller.schoolList.bind(controller));
router.get("/SchoolSimpleList", controller.schoolSimpleList.bind(controller));
router.get("/SchoolById", controller.schoolById.bind(controller));
router.get("/AgencySchoolList", controller.agencySchoolList.bind(controller));

router.get("/CheckSchoolTime", controller.checkSchoolTime.bind(controller));
router.get(
    "/CheckStudentContract",
    controller.checkStudentContract.bind(controller)
);

router.post(
    "/SetStudentSign",
    validator.setStudentSignValidator(),
    controller.validate.bind(controller),
    controller.setStudentSign.bind(controller)
);

router.get(
    "/GetCountSchoolContracts",
    controller.getCountSchoolContracts.bind(controller)
);
router.post(
    "/NearSchoolList",
    validator.nearSchoolListValidator(),
    controller.validate.bind(controller),
    controller.nearSchoolList.bind(controller)
);

router.delete(
    "/DeleteSchool",
    isEnyAdmin,
    controller.deleteSchool.bind(controller)
);

module.exports = router;
