const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setGroupValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("mainId").not().isEmpty().withMessage("mainId cant be empty"),
        ];
    }
    setLevelAccDetailValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("levelNo")
                .not()
                .isEmpty()
                .withMessage("levelNo cant be empty"),
        ];
    }
    getHesabByListCodeValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("listCode")
                .not()
                .isEmpty()
                .withMessage("listCode cant be empty"),
        ];
    }
    getHesabByTypeAndLevelValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
        ];
    }
    setSarfaslValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("codeLev1")
                .not()
                .isEmpty()
                .withMessage("codeLev1 cant be empty"),
            check("codeLev2")
                .not()
                .isEmpty()
                .withMessage("codeLev2 cant be empty"),
            check("codeLev3")
                .not()
                .isEmpty()
                .withMessage("codeLev3 cant be empty"),
            check("groupId")
                .not()
                .isEmpty()
                .withMessage("groupId cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("nature").not().isEmpty().withMessage("nature cant be empty"),
            check("levelEnd")
                .not()
                .isEmpty()
                .withMessage("levelEnd cant be empty"),
            check("enable").not().isEmpty().withMessage("enable cant be empty"),
        ];
    }
    searchHesabValidator() {
        return [
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("page").isNumeric().withMessage("page cant be empty"),
            check("search").not().isEmpty().withMessage("search cant be empty"),
        ];
    }
    setPercentValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("percent").isNumeric().withMessage("percent cant be empty"),
        ];
    }
})();
