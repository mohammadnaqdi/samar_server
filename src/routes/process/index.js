const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isEnyAdmin, isAgencyAdmin } = require("./../../middleware/auth");

router.post(
    "/sepandCheck",
    isEnyAdmin,
    validator.sepandCheckValidator(),
    controller.validate.bind(controller),
    controller.sepandCheck.bind(controller)
);

router.post(
    "/StudentPayState",
    isEnyAdmin,
    validator.studentPayStateValidator(),
    controller.validate.bind(controller),
    controller.studentPayState.bind(controller)
);
router.post(
    "/StudentPayState2",
    isEnyAdmin,
    validator.studentPayState2Validator(),
    controller.validate.bind(controller),
    controller.studentPayState2.bind(controller)
);

router.post(
    "/SetStudent",
    isEnyAdmin,
    validator.setStudentValidator(),
    controller.validate.bind(controller),
    controller.setStudent.bind(controller),
);
router.post(
    "/StudentListByIds",
    isEnyAdmin,
    validator.studentListByIdsValidator(),
    controller.validate.bind(controller),
    controller.studentListByIds.bind(controller),
);
router.get(
    "/SetCheck",
    isEnyAdmin,
    controller.setCheck.bind(controller),
);
router.get(
    "/StudentCount",
    isEnyAdmin,
    controller.studentCount.bind(controller),
);
router.post(
    "/StudentCountSchool",
    isEnyAdmin,
    controller.studentCountSchool.bind(controller),
);
router.get("/SchoolReport", controller.schoolReport.bind(controller));

router.get(
    "/GetDriverDDS",
    isEnyAdmin,
    controller.getDriverDDS.bind(controller)
);

router.get(
    "/GetAgencyDDS",
    isEnyAdmin,
    controller.getAgencyDDS.bind(controller)
);

router.post(
    "/EditDDS",
    isEnyAdmin,
    validator.editDDSValidator(),
    controller.editDDS.bind(controller)
);

router.post(
    "/InsertDDS",
    isEnyAdmin,
    validator.insertDDSValidator(),
    controller.insertDDS.bind(controller)
);

router.get("/ResetPrices", controller.resetPrices.bind(controller));


router.get(
    "/GetAgencyDDS",
    isEnyAdmin,
    controller.getAgencyDDS.bind(controller)
);

router.post("/ResetDDS", isEnyAdmin, controller.resetDDS.bind(controller));
router.get("/resetDSC", isEnyAdmin, controller.resetDSC.bind(controller));

router.get(
    "/GetAgencyDriverRemaining",
    isEnyAdmin,
    controller.getAgencyDriverRemaining.bind(controller)
);
router.get("/GetDriverMonthSalary", isEnyAdmin, controller.getDriverMonthSalary.bind(controller));
router.get("/ResetDDSByServiceNum", isEnyAdmin, controller.resetDDSByServiceNum.bind(controller));
router.get("/RemoveStudentFromDayDDS", isEnyAdmin, controller.removeStudentFromDayDDS.bind(controller));

router.get("/GetDriverRemainAndSalary", controller.getDriverRemainAndSalary.bind(controller));

module.exports = router;
