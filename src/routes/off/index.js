const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
//this controller import a class this mean like a class
const { isLoggined, isAdmin, isEnyAdmin,isSuperAdmin } = require("./../../middleware/auth");

router.post("/SetCompany", isSuperAdmin,
    validator.setCompanyValidator(),
    controller.validate.bind(controller),
    controller.setCompany.bind(controller));
router.post("/SetAddressCo", isSuperAdmin,
    validator.setAddressCoValidator(),
    controller.validate.bind(controller),
    controller.setAddressCo.bind(controller));
router.get("/GetCompanies", isSuperAdmin,
    controller.getCompanies.bind(controller));
router.get("/GetCompanyById",
    controller.getCompanyById.bind(controller));
router.get("/GetOffPackByCompanyId", isSuperAdmin,
    controller.getOffPackByCompanyId.bind(controller));
router.get("/GetMyOffer",
    controller.getMyOffer.bind(controller));
router.post("/SetOffPack", isSuperAdmin,
    validator.setOffPackValidator(),
    controller.validate.bind(controller),
    controller.setOffPack.bind(controller));
router.post("/SetNewUserForOffCo", isSuperAdmin,
    validator.setNewUserForOffCoValidator(),
    controller.validate.bind(controller),
    controller.setNewUserForOffCo.bind(controller));



module.exports = router;
