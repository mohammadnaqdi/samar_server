const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin } = require("./../../middleware/auth");
//this controller import a class this mean like a class

// router.post(
//     "/SetPack",
//     validator.setPackValidator(),
//     controller.validate.bind(controller),
//     controller.setPack.bind(controller),
// );
router.post(
    "/SetAutoPack",
    validator.setAutoPackValidator(),
    controller.validate.bind(controller),
    controller.setAutoPack.bind(controller),
);
router.post(
    "/ChangePack",
    validator.changePackValidator(),
    controller.validate.bind(controller),
    controller.changePack.bind(controller),
);
router.get("/VroomRouting", controller.vroomRouting.bind(controller));
router.get("/GetPacks", controller.getPacks.bind(controller));
router.get("/GetGroupPacks", controller.getGroupPacks.bind(controller));
router.delete("/DeleteGroupPack", controller.deleteGroupPack.bind(controller));
router.get("/GetExeptions", controller.getExeptions.bind(controller));
router.get("/GetOtherPoint", controller.getOtherPoint.bind(controller));

module.exports = router;
