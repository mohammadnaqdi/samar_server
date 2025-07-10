const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    studentPayStateValidator() {
        return [
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("size").not().isEmpty().withMessage("size cant be empty"),
            check("isOnline")
                .not()
                .isEmpty()
                .withMessage("isOnline cant be empty"),
            check("isPaid").not().isEmpty().withMessage("isPaid cant be empty"),
            check("queueCode")
                .not()
                .isEmpty()
                .withMessage("queueCode cant be empty"),
        ];
    }
    studentPayState2Validator() {
        return [
            check("stateStart").not().isEmpty().withMessage("stateStart cant be empty"),
            check("stateEnd").not().isEmpty().withMessage("stateEnd cant be empty"),
            check("isPaid").not().isEmpty().withMessage("isPaid cant be empty"),
            check("schools").not().isEmpty().withMessage("schools cant be empty"),
            check("queues").not().isEmpty().withMessage("queues cant be empty"),
        ];
    }

    showMorePayValidator() {
        return [
            check("setter").not().isEmpty().withMessage("setter cant be empty"),
            check("sanad").not().isEmpty().withMessage("sanad cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    //queueCode,amount,desc,studentCode,sanadNum
    setActionPayValidator() {
        return [
            check("queueCode")
                .not()
                .isEmpty()
                .withMessage("queueCode cant be empty"),
            check("amount").not().isEmpty().withMessage("amount cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("studentCode")
                .not()
                .isEmpty()
                .withMessage("amount cant be empty"),
            check("sanadNum")
                .not()
                .isEmpty()
                .withMessage("sanadNum cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    payRegistrationWithWalletValidator() {
        return [
            check("studentId")
                .not()
                .isEmpty()
                .withMessage("amount cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    // setActionPayWithWalletValidator() {
    //     return [
    //         check("queueCode")
    //             .not()
    //             .isEmpty()
    //             .withMessage("queueCode cant be empty"),
    //         check("studentCode")
    //             .not()
    //             .isEmpty()
    //             .withMessage("amount cant be empty"),
    //         check("agencyId")
    //             .not()
    //             .isEmpty()
    //             .withMessage("agencyId cant be empty"),
    //     ];
    // }
    // setPayQueueValidator() {
    //     return [
    //         check("id").not().isEmpty().withMessage("id cant be empty"),
    //         check("amount").not().isEmpty().withMessage("amount cant be empty"),
    //         check("title").not().isEmpty().withMessage("title cant be empty"),
    //         check("active").not().isEmpty().withMessage("active cant be empty"),
    //         check("desc").not().isEmpty().withMessage("desc cant be empty"),
    //         check("optinal")
    //             .not()
    //             .isEmpty()
    //             .withMessage("optinal cant be empty"),
    //         check("maxDate")
    //             .not()
    //             .isEmpty()
    //             .withMessage("maxDate cant be empty"),
    //         check("listAccCode")
    //             .not()
    //             .isEmpty()
    //             .withMessage("listAccCode cant be empty"),
    //         check("listAccName")
    //             .not()
    //             .isEmpty()
    //             .withMessage("listAccName cant be empty"),
    //         check("type").not().isEmpty().withMessage("type cant be empty")
    //     ];
    // }
    insertInvoiceValidator() {
        return [
            check("amount").not().isEmpty().withMessage("amount cant be empty"),
            check("title").not().isEmpty().withMessage("title cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
            check("desc").isString().withMessage("desc cant be empty"),
            check("maxDate")
                .not()
                .isEmpty()
                .withMessage("maxDate cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("delete").not().isEmpty().withMessage("delete cant be empty"),
        ];
    }
    setInstallmentByParentValidator() {
        return [
            check("agencyId").not().isEmpty().withMessage("agencyId cant be empty"),
            check("studentId").not().isEmpty().withMessage("studentId cant be empty"),
            check("prices").not().isEmpty().withMessage("prices cant be empty"),
            check("codes").not().isEmpty().withMessage("codes cant be empty"),
        ];
    }
})();
