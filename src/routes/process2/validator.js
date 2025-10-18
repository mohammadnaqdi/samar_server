const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    driverbySchoolValidator() {
        return [
            check("schools").not().isEmpty().withMessage("schools cant be empty"),
            check("agencyId").not().isEmpty().withMessage("agencyId cant be empty"),
            check("onlyActive").not().isEmpty().withMessage("onlyActive cant be empty"),
        ];
    }

    contractDateBySchoolValidator() {
        return [
            check("schools")
                .not()
                .isEmpty()
                .withMessage("schools cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
        ];
    }
    studentServiceListValidator() {
        return [
            check("schools")
                .not()
                .isEmpty()
                .withMessage("schools cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
  
    getAgencyDDSPageValidator() {
        return [
            check("page")
                .not()
                .isEmpty()
                .withMessage("page cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("onlyActive")
                .not()
                .isEmpty()
                .withMessage("onlyActive cant be empty"),
        ];
    }
    editStudentContractValidator() {
        return [
            check("studentId")
                .not()
                .isEmpty()
                .withMessage("studentId cant be empty"),
            check("newServiceNum")
                .not()
                .isEmpty()
                .withMessage("newServiceNum cant be empty"),
            check("newDriverId")
                .not()
                .isEmpty()
                .withMessage("newDriverId cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("start")
                .not()
                .isEmpty()
                .withMessage("start cant be empty"),
            check("end")
                .not()
                .isEmpty()
                .withMessage("end cant be empty"),
            check("name")
                .not()
                .isEmpty()
                .withMessage("name cant be empty"),
            check("phone")
                .not()
                .isEmpty()
                .withMessage("phone cant be empty"),
        ];
    }

    
})();
