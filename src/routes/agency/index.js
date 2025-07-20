const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const {
    isAdmin,
    isAgencyAdmin,
    isSchoolAdminAdmin,
    isEnyAdmin,
} = require("./../../middleware/auth");

// router.post(
//     "/InsertAgency",
//     isAdmin,
//     validator.insertAgencyValidator(),
//     controller.validate.bind(controller),
//     controller.insertAgency.bind(controller)
// );
router.get("/AllAgencies", isAdmin, controller.allAgencies.bind(controller));
router.get("/MyAgency", isAgencyAdmin, controller.myAgency.bind(controller));
router.post(
    "/SetAgency",
    isAdmin,
    validator.setAgencyValidator(),
    controller.validate.bind(controller),
    controller.setAgency.bind(controller)
);
router.post(
    "/AgencyActive",
    isAdmin,
    validator.agencyActiveValidator(),
    controller.validate.bind(controller),
    controller.agencyActive.bind(controller)
);
router.post(
    "/AddSchoolToAgency",
    isAdmin,
    validator.addSchoolToAgencyValidator(),
    controller.validate.bind(controller),
    controller.addSchoolToAgency.bind(controller)
);
router.post(
    "/SetKolMoeen",
    isAgencyAdmin,
    validator.setKolMoeenValidator(),
    controller.validate.bind(controller),
    controller.setKolMoeen.bind(controller)
);
router.get(
    "/GetKolMoeenAgency",
    isAgencyAdmin,
    controller.getKolMoeenAgency.bind(controller)
);
router.get(
    "/AgecnySchoolList",
    controller.agecnySchoolList.bind(controller)
);
router.post(
    "/AddSchoolToMyAgency",
    isAgencyAdmin,
    validator.addSchoolToMyAgencyValidator(),
    controller.validate.bind(controller),
    controller.addSchoolToMyAgency.bind(controller)
);
router.post(
    "/RemoveSchoolFromAgency",
    isAdmin,
    validator.removeSchoolFromAgencyValidator(),
    controller.validate.bind(controller),
    controller.removeSchoolFromAgency.bind(controller)
);

router.get("/AgencyList", isAdmin, controller.agencyList.bind(controller));
router.get(
    "/CompanyWithDrivers",
    isAdmin,
    controller.companyWithDrivers.bind(controller)
);
router.get(
    "/DashboardCompany",
    isAgencyAdmin,
    controller.dashboardCompany.bind(controller)
);
router.get(
    "/DashboardAgency",
    isAgencyAdmin,
    controller.dashboardAgency.bind(controller)
);
router.get(
    "/getInfoCompany",
    isEnyAdmin,
    controller.getInfoCompany.bind(controller)
);
router.get(
    "/DashboardSchool",
    isSchoolAdminAdmin,
    controller.dashboardSchool.bind(controller)
);
router.get(
    "/DashboardAdmin",
    isAdmin,
    controller.dashboardAdmin.bind(controller)
);
router.get("/AgencyById", controller.agencyById.bind(controller));
router.get("/AgencySettingById", controller.agencySettingById.bind(controller));
router.get(
    "/FindAgencyBySchoolId",
    controller.findAgencyBySchoolId.bind(controller)
);

router.post(
    "/UpdateAgencyInfo",
    validator.updateAgencyInfoValidator(),
    controller.validate.bind(controller),
    controller.updateAgencyInfo.bind(controller)
);
router.post(
    "/SetAgencySetting",
    validator.setAgencySettingValidator(),
    controller.validate.bind(controller),
    controller.setAgencySetting.bind(controller)
);
router.post(
    "/SetAgencySettingOpinion",
    validator.setAgencySettingOpinionValidator(),
    controller.validate.bind(controller),
    controller.setAgencySettingOpinion.bind(controller)
);

router.post(
    "/UpdateConfirmAgency",
    isAdmin,
    validator.updateAgencyInfoValidator(),
    controller.validate.bind(controller),
    controller.updateConfirmAgency.bind(controller)
);
router.post(
    "/SetContractText",
    isAgencyAdmin,
    validator.setContractTextValidator(),
    controller.validate.bind(controller),
    controller.setContractText.bind(controller)
);
router.get("/GetContractText", controller.getContractText.bind(controller));

router.post(
    "/SetDefHeaderLine",
    isAgencyAdmin,
    validator.setDefHeaderLineValidator(),
    controller.validate.bind(controller),
    controller.setDefHeaderLine.bind(controller)
);
router.get("/GetDefHeaderLine", controller.getDefHeaderLine.bind(controller));
router.get("/SimpleAgencyById", controller.simpleAgencyById.bind(controller));
router.get("/GetRegistrationAmount", controller.getRegistrationAmount.bind(controller));

module.exports = router;
