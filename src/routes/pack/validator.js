const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setPackValidator() {
        return [
            check("schoolsId")
                .not()
                .isEmpty()
                .withMessage("schoolsId cant be empty"),
            check("schoolsName")
                .not()
                .isEmpty()
                .withMessage("schoolsName cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
            check("grades").not().isEmpty().withMessage("grades cant be empty"),
            check("capacity")
                .not()
                .isEmpty()
                .withMessage("capacity cant be empty"),
            check("drivers")
                .not()
                .isEmpty()
                .withMessage("drivers cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    changePackValidator() {
        return [
            check("studentId")
                .not()
                .isEmpty()
                .withMessage("studentId cant be empty"),
            check("groupId")
                .not()
                .isEmpty()
                .withMessage("groupId cant be empty"),
            check("mode").not().isEmpty().withMessage("mode cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
})();
