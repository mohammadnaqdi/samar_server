const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setMessageCodeValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("text").not().isEmpty().withMessage("text cant be empty"),
            check("title").not().isEmpty().withMessage("title cant be empty"),
            check("price").not().isEmpty().withMessage("price cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
            check("api").not().isEmpty().withMessage("api cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
        ];
    }
    sendMessageValidator() {
        return [
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("mobiles")
                .not()
                .isEmpty()
                .withMessage("mobiles cant be empty"),
            check("sender").not().isEmpty().withMessage("sender cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    sendAvanakValidator() {
        return [
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("mobiles")
                .not()
                .isEmpty()
                .withMessage("mobiles cant be empty"),
            check("sender").not().isEmpty().withMessage("sender cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }

    batchSendValidator() {
        return [
            check("text").not().isEmpty().withMessage("text cant be empty"),
            check("receivers")
                .not()
                .isEmpty()
                .withMessage("receivers cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
   
})();
