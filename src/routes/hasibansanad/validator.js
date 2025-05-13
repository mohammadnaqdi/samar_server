const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    bnkActionVosoolValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("infoId").not().isEmpty().withMessage("infoId cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("date").not().isEmpty().withMessage("date cant be empty"),
            check("hesab").not().isEmpty().withMessage("hesab cant be empty"),
        ];
    }
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
    chargeCompanyByAdminValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("price").not().isEmpty().withMessage("price cant be empty"),
        ];
    }
    accDocEditValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("titleId")
                .not()
                .isEmpty()
                .withMessage("titleId cant be empty"),
            check("note").not().isEmpty().withMessage("note cant be empty"),
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

    bnkCashInsertValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("bankName")
                .not()
                .isEmpty()
                .withMessage("bankName cant be empty"),
            check("branchName")
                .not()
                .isEmpty()
                .withMessage("branchName cant be empty"),
            check("docExp").not().isEmpty().withMessage("docExp cant be empty"),
            check("centers")
                .not()
                .isEmpty()
                .withMessage("centers cant be empty"),
            check("checkType")
                .not()
                .isEmpty()
                .withMessage("checkType cant be empty"),
            check("date").not().isEmpty().withMessage("date cant be empty"),
            check("price").not().isEmpty().withMessage("price cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("ownerHesab")
                .not()
                .isEmpty()
                .withMessage("ownerHesab cant be empty"),
            check("serial").not().isEmpty().withMessage("serial cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("checkHesab")
                .not()
                .isEmpty()
                .withMessage("checkHesab cant be empty"),
            check("listCode")
                .not()
                .isEmpty()
                .withMessage("listCode cant be empty"),
            check("listDesc")
                .not()
                .isEmpty()
                .withMessage("listDesc cant be empty"),
            check("listPrice")
                .not()
                .isEmpty()
                .withMessage("listPrice cant be empty"),
        ];
    }
})();
