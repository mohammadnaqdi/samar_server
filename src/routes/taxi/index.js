const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
//this controller import a class this mean like a class
const { isLoggined, isAdmin, isEnyAdmin } = require("./../../middleware/auth");

router.post("/StartService", 
    // validator.startServiceValidator(),
    // controller.validate.bind(controller),
    controller.startService.bind(controller));



module.exports = router;
