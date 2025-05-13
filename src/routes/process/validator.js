const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    sepandCheckValidator() {
        return [
            check("list").not().isEmpty().withMessage("list cant be empty"),
            check("schoolIDs").not().isEmpty().withMessage("schoolIDs cant be empty"),
        ];
    }

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
        //stateStart,stateEnd,schools,queues
        return [
            check("stateStart")
                .not()
                .isEmpty()
                .withMessage("stateStart cant be empty"),
            check("stateEnd")
                .not()
                .isEmpty()
                .withMessage("stateEnd cant be empty"),
            check("isPaid").not().isEmpty().withMessage("isPaid cant be empty"),
            check("schools")
                .not()
                .isEmpty()
                .withMessage("schools cant be empty"),
            check("queues").not().isEmpty().withMessage("queues cant be empty"),
        ];
    }
    studentListByIdsValidator() {
        //stateStart,stateEnd,schools,queues
        return [
            check("studentIds")
                .not()
                .isEmpty()
                .withMessage("studentIds cant be empty"),
        ];
    }
    setStudentValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("name")
                .isLength({ min: 1, max: 70 })
                .withMessage("name cant be empty max 70"),
            check("parentReleation")
                .isLength({ min: 1, max: 70 })
                .withMessage("parentReleation cant be empty max 70"),
            check("lastName")
                .isLength({ min: 1, max: 70 })
                .withMessage("lastName cant be empty max 70"),
            check("studentCode")
                .isLength({ min: 1, max: 30 })
                .withMessage("studentCode cant be empty max 30"),
            check("school").not().isEmpty().withMessage("school cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("gradeTitle")
                .not()
                .isEmpty()
                .withMessage("gradeTitle cant be empty"),
            check("addressText")
                .not()
                .isEmpty()
                .withMessage("addressText cant be empty"),
            check("details")
                .not()
                .isEmpty()
                .withMessage("details cant be empty"),
            check("location").not().isEmpty().withMessage("location cant be empty"),
            check("isIranian")
                .not()
                .isEmpty()
                .withMessage("isIranian cant be empty"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("parentId")
                .not()
                .isEmpty()
                .withMessage("parentId cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
        ];
    }
    editDDSValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("dds").not().isEmpty().withMessage("dds cant be empty"),
        ];
    }
    insertDDSValidator() {
        return [
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("date").not().isEmpty().withMessage("date cant be empty"),
            check("dds").not().isEmpty().withMessage("dds cant be empty"),
        ];
    }
})();
