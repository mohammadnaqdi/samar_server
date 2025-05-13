const express = require("express");
const router = express.Router();

const uploadRouter = require("./uploads");
const feedbackRouter = require("./feedback");
const finnotechRouter = require("./finnotech");

const Versionsoft = require("./../models/versionsoft");
const error = require("./../middleware/error");
// const { isLoggined, isAdmin, isEnyAdmin } = require("./../middleware/auth");



router.use("/file", uploadRouter);
router.use("/feedback", feedbackRouter);
router.use("/finnotech", finnotechRouter);


router.get("/getApp", getLatest);
async function getLatest(req, res) {
    let type = req.query.type;

    if (type != 1 && type != 2 && type != 3) {
        type = 1;
    }

    // if (!type) {
    //     return res.status(400).json({ error: "Invalid type." });
    // }

    type = !type ? 1 : type;

    const version = await Versionsoft.Versionsoft.findOne({ type }, "url -_id")
        .sort({ _id: -1 })
        .then((doc) => doc.url);
    return res.redirect(version);
}

router.use(error);
module.exports = router;
