const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
     accDocInsertValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("note").not().isEmpty().withMessage("note cant be empty"),
            check("faree").not().isEmpty().withMessage("faree cant be empty"),
            check("atf").not().isEmpty().withMessage("atf cant be empty"),
            check("date").not().isEmpty().withMessage("date cant be empty"),
            check("notes").not().isEmpty().withMessage("notes cant be empty"),
            check("besPrice")
                .not()
                .isEmpty()
                .withMessage("besPrice cant be empty"),
            check("bedPrice")
                .not()
                .isEmpty()
                .withMessage("bedPrice cant be empty"),
            check("accCode")
                .not()
                .isEmpty()
                .withMessage("accCode cant be empty"),
            check("centers")
                .not()
                .isEmpty()
                .withMessage("centers cant be empty"),
            check("peigiri")
                .not()
                .isEmpty()
                .withMessage("peigiri cant be empty"),
        ];
    }
})();
