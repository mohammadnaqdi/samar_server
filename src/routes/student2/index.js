const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isEnyAdmin, isAgencyAdmin,isSuperAdmin } = require("./../../middleware/auth");


router.get(
    "/GetstudentContractDate",
    controller.getstudentContractDate.bind(controller),
);

router.get("/ChangeDistance", isEnyAdmin, controller.changeDistance.bind(controller));
router.get("/getStudentSum", controller.getStudentSum.bind(controller));
router.get("/StudentContract", controller.studentContract.bind(controller));
router.get("/StudentCondition", controller.studentCondition.bind(controller));

router.get("/SchoolDDS", controller.schoolDDS.bind(controller));

router.post("/ServiceListDoc",
    validator.serviceListDocValidator(),
    controller.validate.bind(controller),
    controller.serviceListDoc.bind(controller));
// router.get("/SetAllStudentLevelAgencyToNewOne",isSuperAdmin,controller.setAllStudentLevelAgencyToNewOne.bind(controller))    
router.get("/StudentDDS",controller.studentDDS.bind(controller));    
router.get("/ApplyStudentPrePayment",controller.applyStudentPrePayment.bind(controller));    
router.post("/AddStudentToService",isAgencyAdmin,
    validator.addStudentToServiceValidator(),
    controller.validate.bind(controller),
    controller.addStudentToService.bind(controller))    


module.exports = router;
