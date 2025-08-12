const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    verifySMSAuthorizationValidator() {
        return [
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("mobile").not().isEmpty().withMessage("mobile cant be empty"),
            check("nid").not().isEmpty().withMessage("nid cant be empty"),
            check("trackId")
                .not()
                .isEmpty()
                .withMessage("trackId cant be empty"),
        ];
    }

    sayadChequeInquiryValidator() {
        return [
            check("sayadId")
                .not()
                .isEmpty()
                .withMessage("sayadId cant be empty"),
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("payId").not().isEmpty().withMessage("payId cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }

    setAdminInfoValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("lastName")
                .not()
                .isEmpty()
                .withMessage("lastName cant be empty"),
            check("nationalCode")
                .not()
                .isEmpty()
                .withMessage("nationalCode cant be empty"),
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("birthDate")
                .not()
                .isEmpty()
                .withMessage("birthDate cant be empty"),
            check("acceptCheque")
                .not()
                .isEmpty()
                .withMessage("acceptCheque cant be empty"),
        ];
    }
})();
