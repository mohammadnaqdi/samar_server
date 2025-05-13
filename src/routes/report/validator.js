const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    insertStudentReportValidator() {
        return [
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("serviceId")
                .not()
                .isEmpty()
                .withMessage("serviceId cant be empty"),
            check("studentId")
                .not()
                .isEmpty()
                .withMessage("studentId cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("grade").not().isEmpty().withMessage("grade cant be empty"),
        ];
    }
    insertRatingDriverValidator() {
        return [
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("serviceId")
                .not()
                .isEmpty()
                .withMessage("serviceId cant be empty"),
            check("studentId")
                .not()
                .isEmpty()
                .withMessage("studentId cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("point").not().isEmpty().withMessage("point cant be empty"),
        ];
    }
    insertSchoolReportValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
        ];
    }
    updateStudentReportValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("state").not().isEmpty().withMessage("state cant be empty"),
        ];
    }
    updateSchoolReportValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("state").not().isEmpty().withMessage("state cant be empty"),
        ];
    }
})();
