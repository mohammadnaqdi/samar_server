const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAgencyAdmin, isEnyAdmin } = require("./../../middleware/auth");
//this controller import a class this mean like a class

// router.post(
//   '/InsertDriver',
//   isAgencyAdmin,
//   validator.insertDriverValidator(),
//   controller.validate.bind(controller),
//   controller.insertDriver.bind(controller)
// );
router.post(
    "/SetEmptyDriver",
    isAgencyAdmin,
    validator.setEmptyDriverValidator(),
    controller.validate.bind(controller),
    controller.setEmptyDriver.bind(controller),
);
router.post(
    "/DuplicateDriver",
    isAgencyAdmin,
    validator.duplicateDriverValidator(),
    controller.validate.bind(controller),
    controller.duplicateDriver.bind(controller),
);
router.post(
    "/SendSMSRequest",
    isAgencyAdmin,
    validator.sendSMSRequestValidator(),
    controller.validate.bind(controller),
    controller.sendSMSRequest.bind(controller),
);
router.post(
    "/CheckRequestCode",
    isAgencyAdmin,
    validator.checkRequestCodeValidator(),
    controller.validate.bind(controller),
    controller.checkRequestCode.bind(controller),
);
router.post(
    "/UpdateEmptyDriver",
    validator.updateEmptyDriverValidator(),
    controller.validate.bind(controller),
    controller.updateEmptyDriver.bind(controller),
);
// router.post(
//   '/UpdateDriver',
//   isAgencyAdmin,
//   validator.insertDriverValidator(),
//   controller.validate.bind(controller),
//   controller.updateDriver.bind(controller)
// );
router.post(
    "/UpdateConfirmDriver",
    isAgencyAdmin,
    validator.updateEmptyDriverValidator(),
    controller.validate.bind(controller),
    controller.updateConfirmDriver.bind(controller),
);

router.get("/DriverList", isEnyAdmin, controller.driverList.bind(controller));
router.get("/DriverList3", controller.driverList3.bind(controller));
router.get("/DriverList2", isEnyAdmin, controller.driverList2.bind(controller));
router.get("/DriverListPage", isEnyAdmin, controller.driverListPage.bind(controller));
router.get("/DriverListSearch", isEnyAdmin, controller.driverListSearch.bind(controller));
router.get("/DriverById", controller.driverById.bind(controller));
router.get(
    "/DriverByUserId",
    isEnyAdmin,
    controller.driverByUserId.bind(controller),
);
router.post(
    "/DriversByUserIds",
    isEnyAdmin,
    validator.driversByUserIdsValidator(),
    controller.validate.bind(controller),
    controller.driversByUserIds.bind(controller),
);

router.get(
    "/CountAndCheckCompanyByUserId",
    isEnyAdmin,
    controller.countAndCheckCompanyByUserId.bind(controller),
);
router.get(
    "/DriverListSimple",
    isEnyAdmin,
    controller.driverListSimple.bind(controller),
);
router.get(
    "/DriverListService",
    isEnyAdmin,
    controller.driverListService.bind(controller),
);
router.get(
    "/GetActService",
    isEnyAdmin,
    controller.getActService.bind(controller),
);
router.get(
    "/LastActServices",
    isEnyAdmin,
    controller.lastActServices.bind(controller),
);
router.get(
    "/DriverByPelak",
    isEnyAdmin,
    controller.driverByPelak.bind(controller),
);
router.get(
    "/DriverByPhoneName",
    isEnyAdmin,
    controller.driverByPhoneName.bind(controller),
);
router.get(
    "/DriverListTafsily",
    isAgencyAdmin,
    controller.driverListTafsily.bind(controller),
);
router.post("/GetMyInfo", controller.getMyInfo.bind(controller));
router.post("/GetMyInfo2", controller.getMyInfo2.bind(controller));


router.get(
    "/LocationDriver",
    isEnyAdmin,
    controller.locationDriver.bind(controller),
);
router.delete(
    "/DeleteDriver",
    isAgencyAdmin,
    controller.deleteDriver.bind(controller),
);
router.get(
    "/ActivateDriver",
    isAgencyAdmin,
    controller.activateDriver.bind(controller),
);

router.post("/StartService", 
    validator.startServiceValidator(),
    controller.validate.bind(controller),
    controller.startService.bind(controller));

    router.get("/DriverListPageDocument", isEnyAdmin, controller.driverListPageDocument.bind(controller));    
    router.get("/DriverListSearchDocument", isEnyAdmin, controller.driverListSearchDocument.bind(controller));
    router.get("/DriverListPageScore", isEnyAdmin, controller.driverListPageScore.bind(controller));
    router.get("/DriverListSearchScore", isEnyAdmin, controller.driverListSearchScore.bind(controller));


    router.get("/UpdateAgent", isEnyAdmin, controller.updateAgent.bind(controller));
    router.post("/GetDriverBankInfo", isEnyAdmin, controller.getDriverBankInfo.bind(controller));

    router.get("/DriverDetails", controller.driverDetails.bind(controller));
    router.get("/DriverListSimpleWithService",isEnyAdmin, controller.driverListSimpleWithService.bind(controller));
    router.get("/DriverServiceNum",controller.driverServiceNum.bind(controller));



module.exports = router;
