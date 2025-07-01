const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setSchoolValidator() {
        return [
            check("code")
                .isLength({ min: 1, max: 40 })
                .withMessage("code cant be empty max 40"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("typeId").not().isEmpty().withMessage("typeId cant be empty"),
            check("typeTitle")
                .not()
                .isEmpty()
                .withMessage("typeTitle cant be empty"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("genderTitle")
                .not()
                .isEmpty()
                .withMessage("genderTitle cant be empty"),
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
            check("location").not().isEmpty().withMessage("location cant be empty"),
            check("grade").isArray().withMessage("grade cant be empty"),
            check("schoolTime")
                .isArray()
                .withMessage("schoolTime cant be empty"),
        ];
    }
    schoolListValidator() {
        return [
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("search").not().isEmpty().withMessage("search cant be empty"),
            check("page").not().isEmpty().withMessage("page cant be empty"),
        ];
    }
    nearSchoolListValidator() {
        return [
            check("search").isString().withMessage("search cant be number"),
            check("page").isInt().withMessage("page isNumber"),
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("location").not().isEmpty().withMessage("location cant be empty"),
            check("maxDistance")
                .optional()
                .isNumeric()
                .withMessage("maxDistance must be a number"),
            check("limit")
                .optional()
                .isNumeric()
                .withMessage("maxDistance must be a number"),
            check("districtId")
                .optional()
                .isNumeric()
                .withMessage("districtId must be a number"),
        ];
    }
    addManagerToSchoolValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 40 })
                .withMessage("name cant be empty"),
            check("lastName")
                .isLength({ min: 1, max: 40 })
                .withMessage("lastName cant be empty"),
            check("phone")
                .isLength({ min: 4, max: 16 })
                .withMessage("phone cant be empty min 4 max 16"),
            check("userName")
                .isLength({ min: 3, max: 20 })
                .withMessage("page cant be empty max 20 min 3"),
            check("password")
                .isLength({ min: 4, max: 20 })
                .withMessage("password cant be empty max 20 min 4"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("userSetForAdmin")
                .not()
                .isEmpty()
                .withMessage("userSetForAdmin cant be empty"),
        ];
    }
    unselectedSchoolsValidator() {
        return [
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("search").not().isEmpty().withMessage("search cant be empty"),
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("showSelected")
                .not()
                .isEmpty()
                .withMessage("showSelected cant be empty"),
        ];
    }
    setStudentSignValidator() {
        return [//studentId,agencyId,pic,data,schoolId
            check("pic").not().isEmpty().withMessage("pic cant be empty"),
            check("data")
                .not()
                .isEmpty()
                .withMessage("data cant be empty"),
        ];
    }
})();
