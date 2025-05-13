const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isEnyAdmin, isAgencyAdmin,isSuperAdmin } = require("./../../middleware/auth");

router.post(
    "/DriverbySchool",
    isEnyAdmin,
    validator.driverbySchoolValidator(),
    controller.validate.bind(controller),
    controller.driverbySchool.bind(controller)
);



router.post(
    "/ChangeContractDateBySchool",
    validator.contractDateBySchoolValidator(),
    controller.validate.bind(controller),
    controller.contractDateBySchool.bind(controller)
);



router.get("/GetServiceNumByDriver", controller.getServiceNumByDriver.bind(controller));

router.post(
    "/EditStudentContract",
    validator.editStudentContractValidator(),
    controller.validate.bind(controller),
    controller.editStudentContract.bind(controller)
);


router.get("/GetDriverCount", controller.getDriverCount.bind(controller));
router.get("/GetAllDriversId", controller.getAllDriversId.bind(controller));
// router.get("/SetAllZeroDistance", controller.setAllZeroDistance.bind(controller));
router.get("/GetDOSByAgency",isEnyAdmin,controller.getDOSByAgency.bind(controller));

router.post("/StudentServiceList",
    validator.studentServiceListValidator(),
    controller.validate.bind(controller), controller.studentServiceList.bind(controller));


    router.get("/SanadNoInMyAgency", controller.deleteSanadStudentNoExistinAgency.bind(controller));    
    router.get("/repleaceNewPriceforServiceAgency", controller.repleaceNewPriceforServiceAgency.bind(controller));    
    router.get("/DriverDDS", controller.driverDDS.bind(controller));    
    router.get("/DeleteDDS", isEnyAdmin, controller.deleteDDS.bind(controller));    
    router.get("/GetDriverDdsOneDay",  controller.getDriverDdsOneDay.bind(controller));   

    router.get("/RemoveAllEmptyServiceStudentFromDDS",isSuperAdmin,  controller.removeAllEmptyServiceStudentFromDDS.bind(controller));    
    router.get("/FindDriversHaveMoreADdsInOneDay",  controller.findDriversHaveMoreADdsInOneDay.bind(controller));    
    router.get("/RemoveStudentFromDDSRange",  controller.removeStudentFromDDSRange.bind(controller));    

    router.get("/CheckDocumentsSame",  controller.checkDocumentsSame.bind(controller));   
     
    router.post("/GetAgencyDDSPage",
        validator.getAgencyDDSPageValidator(),
    controller.validate.bind(controller), 
        controller.getAgencyDDSPage.bind(controller));  

    router.post("/GetStudentsByIds",
        controller.getStudentsByIds.bind(controller));    

module.exports = router;
