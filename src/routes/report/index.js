const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin } = require("./../../middleware/auth");

router.post(
    "/InsertStudentReport",
    validator.insertStudentReportValidator(),
    controller.validate.bind(controller),
    controller.insertStudentReport.bind(controller),
);
router.post(
    "/InsertStudentOpinion",
    validator.insertStudentOpinionValidator(),
    controller.validate.bind(controller),
    controller.insertStudentOpinion.bind(controller),
);
router.post(
    "/InsertRatingDriver",
    validator.insertRatingDriverValidator(),
    controller.validate.bind(controller),
    controller.insertRatingDriver.bind(controller),
);
// router.get("/GetMyRating", controller.getMyRating.bind(controller));
router.get("/GetMyReport", controller.getMyReport.bind(controller));
router.get("/GetOpenOpinion", controller.getOpenOpinion.bind(controller));
router.delete("/DeleteMyReport", controller.deleteMyReport.bind(controller));
router.get(
    "/GetAgencyReport",
    isEnyAdmin,
    controller.getAgencyReport.bind(controller),
);
router.get(
    "/GetDriverOpinions",
    isEnyAdmin,
    controller.getDriverOpinions.bind(controller),
);
router.get(
    "/GetDriverReportById",
    isEnyAdmin,
    controller.getDriverReportById.bind(controller),
);
router.get(
    "/GetAdminReport",
    isAdmin,
    controller.getAdminReport.bind(controller),
);
router.post(
    "/InsertSchoolReport",
    validator.insertSchoolReportValidator(),
    controller.validate.bind(controller),
    controller.insertSchoolReport.bind(controller),
);
router.post(
    "/UpdateStudentReport",
    isEnyAdmin,
    validator.updateStudentReportValidator(),
    controller.validate.bind(controller),
    controller.updateStudentReport.bind(controller),
);
router.post(
    "/UpdateSchoolReport",
    isAdmin,
    validator.updateSchoolReportValidator(),
    controller.validate.bind(controller),
    controller.updateSchoolReport.bind(controller),
);

module.exports = router;
