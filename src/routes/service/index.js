const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const {
    isAdmin,
    isAgencyAdmin,
    isEnyAdmin,
} = require("./../../middleware/auth");

router.post(
    "/SetService",
    validator.setServiceValidator(),
    controller.validate.bind(controller),
    controller.setService.bind(controller),
);
// router.post(
//     "/UpdateService",
//     isAgencyAdmin,
//     validator.updateServiceValidator(),
//     controller.validate.bind(controller),
//     controller.updateService.bind(controller),
// );
router.post(
    "/UpdateService2",
    isAgencyAdmin,
    validator.updateServiceValidator(),
    controller.validate.bind(controller),
    controller.updateService2.bind(controller),
);
router.post(
    "/SetServiceChange",
    isAgencyAdmin,
    validator.setServiceChangeValidator(),
    controller.validate.bind(controller),
    controller.setServiceChange.bind(controller),
);
router.post(
    "/AddSanadNumToServiceChange",
    isAgencyAdmin,
    validator.addSanadNumToServiceChangeValidator(),
    controller.validate.bind(controller),
    controller.addSanadNumToServiceChange.bind(controller),
);

router.post(
    "/ServiceList",
    validator.serviceListValidator(),
    controller.validate.bind(controller),
    controller.serviceList.bind(controller),
);
router.post(
    "/ServiceListByIds",
    validator.serviceListByIdsValidator(),
    controller.validate.bind(controller),
    controller.serviceListByIds.bind(controller),
);
router.post(
    "/ServiceByNumOrDriver",
    validator.serviceByNumOrDriverValidator(),
    controller.validate.bind(controller),
    controller.serviceByNumOrDriver.bind(controller),
);
router.get(
    "/ServiceListBySchool",
    controller.serviceListBySchool.bind(controller),
);

router.get("/GetOneService", controller.getOneService.bind(controller));
router.get(
    "/GetOneServiceForDriverMap",
    controller.getOneService.bind(controller),
);
router.get("/ServiceListAll", controller.serviceListAll.bind(controller));
router.get(
    "/GetChangedDrivers",
    isAgencyAdmin,
    controller.getChangedDrivers.bind(controller),
);
router.get("/IsChangedDriver", controller.isChangedDriver.bind(controller));
router.get("/ServiceListForPay", controller.serviceListForPay.bind(controller));
//pricing table
router.post(
    "/SetPricingTable",
    validator.setPricingTableValidator(),
    controller.validate.bind(controller),
    controller.setPricingTable.bind(controller),
);
router.post(
    "/SetPriceTable",
    validator.setPriceTableValidator(),
    controller.validate.bind(controller),
    controller.setPriceTable.bind(controller),
);
router.post(
    "/SearchPricingTable",
    validator.searchPricingTableValidator(),
    controller.validate.bind(controller),
    controller.searchPricingTable.bind(controller),
);
router.post(
    "/SearchPriceTable",
    validator.searchPriceTableValidator(),
    controller.validate.bind(controller),
    controller.searchPriceTable.bind(controller),
);
router.post(
    "/SetServicePack",
    validator.setServicePackValidator(),
    controller.validate.bind(controller),
    controller.setServicePack.bind(controller),
);
router.get("/GetServicePack", controller.getServicePack.bind(controller));
router.get(
    "/GetSelectPack",
    isEnyAdmin,
    controller.getSelectPack.bind(controller),
);
router.get("/GetAllPricing", controller.getAllPricing.bind(controller));
router.get("/GetAllPrices", controller.getAllPrices.bind(controller));
router.delete("/DeletePrice", isAdmin, controller.deletePrice.bind(controller));
router.delete("/DeletePriceNew", isAgencyAdmin, controller.deletePriceNew.bind(controller));
router.delete(
    "/DeleteService",
    isAgencyAdmin,
    controller.deleteService.bind(controller),
);

router.post("/newLog", controller.setLog.bind(controller));

router.post(
    "/ServiceByOneStudent",
    validator.serviceByNumOrDriverValidator(),
    controller.validate.bind(controller),
    controller.serviceByOneStudent.bind(controller)
);
// router.get(
//     "/FindNotEqualService",
//     controller.findNotEqualService.bind(controller)
// );

module.exports = router;
