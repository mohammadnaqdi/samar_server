const express = require("express");
const router = express.Router();
const controller = require("./file.controller");
const { isLoggined } = require("./../../middleware/auth");

router.post("/upload", isLoggined, controller.upload2.bind(controller));
//router.get("/files", controller.getListFiles.bind(controller));
router.get("/files/:name", controller.download2.bind(controller));
router.get("/files/pics/*", controller.download2.bind(controller));
router.get("/files/banks/*", controller.download3.bind(controller));
router.get("/files/pdf/*", controller.downloadPDF.bind(controller));

module.exports = router;
