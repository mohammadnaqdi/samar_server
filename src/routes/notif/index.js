const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin } = require("./../../middleware/auth");

router.post("/GetNotif", controller.getNotif.bind(controller));
router.get("/GetNotifAgency", controller.getNotifAgency.bind(controller));
router.get("/getLastNotif", controller.getLastNotif.bind(controller));
router.get("/GetNotifAdmin",isAdmin, controller.getNotifAdmin.bind(controller));
router.post("/SetNotif", isEnyAdmin,
    validator.setNotifValidator(),
    controller.validate.bind(controller),
     controller.setNotif.bind(controller));
router.post("/SendNotifStudents", isAdmin,
    validator.setNotifValidator(),
    controller.validate.bind(controller),
     controller.sendNotifStudent.bind(controller));
router.get("/SetNotifState", isEnyAdmin,
     controller.setNotifState.bind(controller));
router.get("/Seen",
     controller.seen.bind(controller));
router.post("/GetNotifMsg", controller.getNotifMsg.bind(controller));     

module.exports = router;
