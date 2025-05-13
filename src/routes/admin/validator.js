const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    newUserValidator() {
        return [
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("club").not().isEmpty().withMessage("club cant be empty"),
        ];
    }
    setAccessValidator() {
        return [
            check("clubId").not().isEmpty().withMessage("clubId cant be empty"),
        ];
    }
    addEditHasibanCoValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
        ];
    }
    insertValidator() {
        return [
            check("path").not().isEmpty().withMessage("path cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("version")
                .not()
                .isEmpty()
                .withMessage("version cant be empty"),
            check("versionName")
                .not()
                .isEmpty()
                .withMessage("versionName cant be empty"),
            check("exp").not().isEmpty().withMessage("exp cant be empty"),
            check("force").not().isEmpty().withMessage("force cant be empty"),
        ];
    }
    setRuleValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("show").not().isEmpty().withMessage("show cant be empty"),
            check("text").not().isEmpty().withMessage("text cant be empty"),
        ];
    }
})();
