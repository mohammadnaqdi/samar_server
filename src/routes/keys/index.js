const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin } = require("./../../middleware/auth");

router.get("/Keys", controller.getKeys.bind(controller));
router.post(
    "/SetKey",
    isAdmin,
    validator.setKeysValidator(),
    controller.validate.bind(controller),
    controller.setKeys.bind(controller),
);
router.delete("/DeleteKey", isAdmin, controller.deleteKey.bind(controller));
router.get("/GetSearchById", controller.getSearchById.bind(controller));
router.get("/GetAddress", controller.getAddress.bind(controller));
router.get("/SearchAddress", controller.searchAddress.bind(controller));
router.get("/GetDistance", controller.getDistance.bind(controller));
router.get("/GetTrip", controller.getTrip.bind(controller));
router.post("/GetMySearch",
    validator.getMySearchValidator(),
    controller.validate.bind(controller),
    controller.getMySearch.bind(controller));
router.get("/GetCity", controller.getCity.bind(controller));
router.post("/SetCity",validator.setCityValidator(),
controller.validate.bind(controller), controller.setCity.bind(controller));

module.exports = router;
