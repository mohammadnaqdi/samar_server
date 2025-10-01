const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setCompanyValidator() {
        return [
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("admin")
                .not()
                .isEmpty()
                .withMessage("admin cant be empty"),
            check("operator").not().isEmpty().withMessage("operator cant be empty"),
            check("cityId").not().isEmpty().withMessage("cityId cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
        ];
    }
    setAddressCoValidator() {
        return [
            check("address").not().isEmpty().withMessage("address cant be empty"),
            check("cityId")
                .not()
                .isEmpty()
                .withMessage("cityId cant be empty"),
            check("companyId").not().isEmpty().withMessage("companyId cant be empty"),
            check("location").not().isEmpty().withMessage("location cant be empty"),
        ];
    }
    setOffPackValidator() {
        return [
            check("title").not().isEmpty().withMessage("title cant be empty"),
            check("cityId")
                .not()
                .isEmpty()
                .withMessage("cityId cant be empty"),
            check("companyId").not().isEmpty().withMessage("companyId cant be empty"),
        ];
    }
    setNewUserForOffCoValidator() {
        return [
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("userName")
                .not()
                .isEmpty()
                .withMessage("userName cant be empty"),
            check("password").not().isEmpty().withMessage("password cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("lastName").not().isEmpty().withMessage("lastName cant be empty"),
            check("changePass").not().isEmpty().withMessage("changePass cant be empty"),
        ];
    }

})();
