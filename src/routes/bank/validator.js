const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    getAccountListValidator() {
        return [
            check("toDate").not().isEmpty().withMessage("toDate cant be empty"),
            check("fromDate")
                .not()
                .isEmpty()
                .withMessage("fromDate cant be empty"),
            check("sourceAccount")
                .not()
                .isEmpty()
                .withMessage("sourceAccount cant be empty"),
            check("nationalCode")
                .not()
                .isEmpty()
                .withMessage("nationalCode cant be empty"),
            check("bank").not().isEmpty().withMessage("bank cant be empty"),
        ];
    }
    chequeRegisterValidator() {
        return [
            check("amount").not().isEmpty().withMessage("amount cant be empty"),
            check("chequeMedias")
                .not()
                .isEmpty()
                .withMessage("chequeMedias cant be empty"),
            check("sourceAccount")
                .not()
                .isEmpty()
                .withMessage("sourceAccount cant be empty"),
            check("nationalCode")
                .not()
                .isEmpty()
                .withMessage("nationalCode cant be empty"),
            check("bank").not().isEmpty().withMessage("bank cant be empty"),
            check("dueDate")
                .not()
                .isEmpty()
                .withMessage("dueDate cant be empty"),
            check("sayadId")
                .not()
                .isEmpty()
                .withMessage("sayadId cant be empty"),
            check("serialNo")
                .not()
                .isEmpty()
                .withMessage("serialNo cant be empty"),
            check("seriesNo")
                .not()
                .isEmpty()
                .withMessage("seriesNo cant be empty"),
            check("accountOwners")
                .not()
                .isEmpty()
                .withMessage("accountOwners cant be empty"),
            check("receivers")
                .not()
                .isEmpty()
                .withMessage("receivers cant be empty"),
            check("signers")
                .not()
                .isEmpty()
                .withMessage("signers cant be empty"),
            check("branchCode")
                .not()
                .isEmpty()
                .withMessage("branchCode cant be empty"),
            check("chequeTypes")
                .not()
                .isEmpty()
                .withMessage("chequeTypes cant be empty"),
            check("reason").not().isEmpty().withMessage("reason cant be empty"),
        ];
    }
    chequeAcceptValidator() {
        return [
            check("sayadId")
                .not()
                .isEmpty()
                .withMessage("sayadId cant be empty"),
            check("nationalCode")
                .not()
                .isEmpty()
                .withMessage("nationalCode cant be empty"),
            check("bank").not().isEmpty().withMessage("bank cant be empty"),
            check("idTypes")
                .not()
                .isEmpty()
                .withMessage("idTypes cant be empty"),
            check("accepts")
                .not()
                .isEmpty()
                .withMessage("accepts cant be empty"),
        ];
    }
})();
