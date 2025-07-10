const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    insertAgencyValidator() {
        return [
            check("code")
                .isLength({ min: 1, max: 40 })
                .withMessage("code cant be empty max 40"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("managerName")
                .not()
                .isEmpty()
                .withMessage("managerName cant be empty"),
            check("managerCode")
                .not()
                .isEmpty()
                .withMessage("managerCode cant be empty"),
            check("managerTel")
                .not()
                .isEmpty()
                .withMessage("managerTel cant be empty"),
            check("userName")
                .not()
                .isEmpty()
                .withMessage("userName cant be empty"),
            check("tel").not().isEmpty().withMessage("tel cant be empty"),
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("districtTitle")
                .not()
                .isEmpty()
                .withMessage("districtTitle cant be empty"),
            check("address")
                .not()
                .isEmpty()
                .withMessage("address cant be empty"),
            check("userSetForAdmin")
                .not()
                .isEmpty()
                .withMessage("userSetForAdmin cant be empty"),
        ];
    }
    setAgencyValidator() {
        return [
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("userId").not().isEmpty().withMessage("userId cant be empty"),
            check("managerCode")
                .not()
                .isEmpty()
                .withMessage("managerCode cant be empty"),
            check("tel").not().isEmpty().withMessage("tel cant be empty"),
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("location")
                .not()
                .isEmpty()
                .withMessage("location cant be empty"),
            check("districtTitle")
                .not()
                .isEmpty()
                .withMessage("districtTitle cant be empty"),
            check("address")
                .not()
                .isEmpty()
                .withMessage("address cant be empty"),
            check("cityCode")
                .not()
                .isEmpty()
                .withMessage("cityCode cant be empty"),
            check("registrationPrice")
                .not()
                .isEmpty()
                .withMessage("registrationPrice cant be empty"),
        ];
    }
    updateAgencyInfoValidator() {
        return [check("id").not().isEmpty().withMessage("id cant be empty")];
    }
    addSchoolToAgencyValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("isRemove")
                .not()
                .isEmpty()
                .withMessage("isRemove cant be empty"),
        ];
    }
    addSchoolToMyAgencyValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
        ];
    }
    setKolMoeenValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("studentKol")
                .not()
                .isEmpty()
                .withMessage("studentKol cant be empty"),
            check("studentMoeen")
                .not()
                .isEmpty()
                .withMessage("studentMoeen cant be empty"),
            check("driverKol")
                .not()
                .isEmpty()
                .withMessage("driverKol cant be empty"),
            check("driverMoeen")
                .not()
                .isEmpty()
                .withMessage("driverMoeen cant be empty"),
            check("wallet").not().isEmpty().withMessage("wallet cant be empty"),
            check("cost").not().isEmpty().withMessage("cost cant be empty"),
            check("charge").not().isEmpty().withMessage("charge cant be empty"),
        ];
    }
    removeSchoolFromAgencyValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
        ];
    }
    agencyActiveValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
        ];
    }
    setAgencySettingValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    setContractTextValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("text").not().isEmpty().withMessage("text cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
        ];
    }
    setDefHeaderLineValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("title").not().isEmpty().withMessage("title cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
        ];
    }
    setAgencySettingOpinionValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
            check("active").isBoolean().withMessage("active is boolean"),
            check("id").isInt().withMessage("id is int"),
        ];
    }
})();
