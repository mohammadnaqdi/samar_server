const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setNewSanadValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("note").isString().withMessage("note must be a string"),
            check("faree").isString().withMessage("note must be a string"),
            check("atf").isString().withMessage("note must be a string"),
            check("date").not().isEmpty().withMessage("date cant be empty"),
            check("rows").not().isEmpty().withMessage("rows must be an array"),
            check("rows.*.note")
                .isString()
                .withMessage("rows.note must be a string")
                .trim()
                .notEmpty()
                .withMessage("rows.note cannot be empty"),
            check("rows.*.code")
                .isString()
                .withMessage("rows.code must be a string")
                .trim()
                .notEmpty()
                .withMessage("rows.code cannot be empty"),
            check("rows.*.bes")
                .isNumeric()
                .withMessage("rows.bes must be a Number")
                .notEmpty()
                .withMessage("rows.bes cannot be empty"),
            check("rows.*.bed")
                .isNumeric()
                .withMessage("rows.bed must be a Number")
                .notEmpty()
                .withMessage("rows.bed cannot be empty"),
            check("rows.*.peigiri")
                .isString()
                .withMessage("rows.peigiri must be a string"),
            check("rows.*.days")
                .isInt()
                .withMessage("rows.days must be a Number")
                .notEmpty()
                .withMessage("rows.days cannot be empty"),
            check("rows.*.mId") //month & SanadId && serviceNum && invoice Number
                .isInt()
                .withMessage("rows.mId must be a Number")
                .notEmpty()
                .withMessage("rows.mId cannot be empty"),
            check("rows.*.type")
                .isString()
                .withMessage("rows.type must be a String")
                .notEmpty()
                .withMessage("rows.type cannot be empty"),
        ];
    }
    // setSanadStudentValidator() {
    //     return [
    //         check("agencyId")
    //             .not()
    //             .isEmpty()
    //             .withMessage("agencyId cant be empty"),
    //         check("note").not().isEmpty().withMessage("note cant be empty"),
    //         check("faree").not().isEmpty().withMessage("faree cant be empty"),
    //         check("atf").not().isEmpty().withMessage("atf cant be empty"),
    //         check("date").not().isEmpty().withMessage("date cant be empty"),
    //         check("notes").not().isEmpty().withMessage("notes cant be empty"),
    //         check("besPrice")
    //             .not()
    //             .isEmpty()
    //             .withMessage("besPrice cant be empty"),
    //         check("bedPrice")
    //             .not()
    //             .isEmpty()
    //             .withMessage("bedPrice cant be empty"),
    //         check("accCode")
    //             .not()
    //             .isEmpty()
    //             .withMessage("accCode cant be empty"),
    //         check("centers")
    //             .not()
    //             .isEmpty()
    //             .withMessage("centers cant be empty"),
    //         check("peigiri")
    //             .not()
    //             .isEmpty()
    //             .withMessage("peigiri cant be empty"),
    //         check("studentCodes")
    //             .not()
    //             .isEmpty()
    //             .withMessage("studentCodes cant be empty"),
    //         check("invoice")
    //             .not()
    //             .isEmpty()
    //             .withMessage("invoice cant be empty"),
    //     ];
    // }
    // setRcCheck4StudentValidator() {
    //     return [
    //         check("agencyId")
    //             .not()
    //             .isEmpty()
    //             .withMessage("agencyId cant be empty"),
    //         check("bankName")
    //             .not()
    //             .isEmpty()
    //             .withMessage("bankName cant be empty"),
    //         check("branchName")
    //             .not()
    //             .isEmpty()
    //             .withMessage("branchName cant be empty"),
    //         check("docExp").not().isEmpty().withMessage("docExp cant be empty"),
    //         check("centers")
    //             .not()
    //             .isEmpty()
    //             .withMessage("centers cant be empty"),
    //         check("checkType")
    //             .not()
    //             .isEmpty()
    //             .withMessage("checkType cant be empty"),
    //         check("date").not().isEmpty().withMessage("date cant be empty"),
    //         check("price").not().isEmpty().withMessage("price cant be empty"),
    //         check("desc").not().isEmpty().withMessage("desc cant be empty"),
    //         check("ownerHesab")
    //             .not()
    //             .isEmpty()
    //             .withMessage("ownerHesab cant be empty"),
    //         check("serial").not().isEmpty().withMessage("serial cant be empty"),
    //         check("type").not().isEmpty().withMessage("type cant be empty"),
    //         check("checkHesab")
    //             .not()
    //             .isEmpty()
    //             .withMessage("checkHesab cant be empty"),
    //         check("listCode")
    //             .not()
    //             .isEmpty()
    //             .withMessage("listCode cant be empty"),
    //         check("listDesc")
    //             .not()
    //             .isEmpty()
    //             .withMessage("listDesc cant be empty"),
    //         check("listPrice")
    //             .not()
    //             .isEmpty()
    //             .withMessage("listPrice cant be empty"),

    //         check("studentCodes")
    //             .not()
    //             .isEmpty()
    //             .withMessage("studentCodes cant be empty"),
    //         check("invoice")
    //             .not()
    //             .isEmpty()
    //             .withMessage("invoice cant be empty"),
    //     ];
    // }
    driverInfoForSalarySlipValidator() {
        return [
            check("ids").not().isEmpty().withMessage("ids cant be empty"),
            check("ids").isArray().withMessage("ids be array"),
            check("month").not().isEmpty().withMessage("month cant be empty"),
            check("month").isInt().withMessage("month be int"),
        ];
    }
    insertCheckValidator() {
        return [
            check("mode").not().isEmpty().withMessage("mode cant be empty"),
            check("mode").isString().withMessage("mode cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
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
            check("checkType")
                .not()
                .isEmpty()
                .withMessage("checkType cant be empty"),
            check("date").not().isEmpty().withMessage("date cant be empty"),
            check("price").not().isEmpty().withMessage("price cant be empty"),
            check("price").isNumeric().withMessage("price cant be empty"),
            check("desc").isString().withMessage("desc must be a string"),
            check("ownerHesab")
                .not()
                .isEmpty()
                .withMessage("ownerHesab cant be empty"),
            check("serial").not().isEmpty().withMessage("serial cant be empty"),
            check("checkHesab")
                .isString()
                .withMessage("checkHesab must be a string")
                .notEmpty()
                .withMessage("checkHesab cant be empty"),
            check("rows").not().isEmpty().withMessage("rows must be an array"),
            check("rows.*.note")
                .isString()
                .withMessage("rows.note must be a string")
                .trim()
                .notEmpty()
                .withMessage("rows.note cannot be empty"),
            check("rows.*.code")
                .isString()
                .withMessage("rows.code must be a string")
                .trim()
                .notEmpty()
                .withMessage("rows.code cannot be empty"),
            check("rows.*.price")
                .isNumeric()
                .withMessage("rows.price must be a Number")
                .notEmpty()
                .withMessage("rows.price cannot be empty"),
            check("rows.*.days")
                .isInt()
                .withMessage("rows.days must be a Number")
                .notEmpty()
                .withMessage("rows.days cannot be empty"),
            check("rows.*.mId") //month & SanadId && serviceNum && invoice Number
                .isInt()
                .withMessage("rows.mId must be a Number")
                .notEmpty()
                .withMessage("rows.mId cannot be empty"),
            check("rows.*.type")
                .isString()
                .withMessage("rows.type must be a String")
                .notEmpty()
                .withMessage("rows.type cannot be empty"),
            // check("listCode")
            //     .notEmpty()
            //     .withMessage("listCode cant be empty"),
            // check("listDesc")
            //     .not()
            //     .isEmpty()
            //     .withMessage("listDesc cant be empty"),
            // check("listPrice")
            //     .not()
            //     .isEmpty()
            //     .withMessage("listPrice cant be empty"),
        ];
    }
})();
