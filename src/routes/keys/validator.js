const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setSchoolValidator() {
        return [
            check("code")
                .isLength({ min: 1, max: 40 })
                .withMessage("code cant be empty max 40"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("districtTitle")
                .not()
                .isEmpty()
                .withMessage("districtTitle cant be empty"),
            check("cityId").not().isEmpty().withMessage("cityId cant be empty"),
            check("address")
                .not()
                .isEmpty()
                .withMessage("address cant be empty"),
            check("grade").isArray().withMessage("grade cant be empty"),
            check("shifts").isArray().withMessage("shifts cant be empty"),
        ];
    }
    setKeysValidator() {
        return [
            check("title")
                .isLength({ min: 1, max: 40 })
                .withMessage("title cant be empty max 40"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("cityCode").not().isEmpty().withMessage("cityCode cant be empty"),
            check("cityCode").isNumeric().withMessage("cityCode is be number")
        ];
    }
    changeShiftValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 40 })
                .withMessage("name cant be empty max 40"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
        ];
    }
    changeDayValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("start").not().isEmpty().withMessage("start cant be empty"),
            check("end").not().isEmpty().withMessage("end cant be empty"),
            check("isHoliday")
                .not()
                .isEmpty()
                .withMessage("isHoliday cant be empty"),
        ];
    }
     setCityValidator() {
        return [
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("code").isNumeric().withMessage("code cant be string"),
            check("province").not().isEmpty().withMessage("province cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
        ];
    }
       getMySearchValidator() {
        return [
            check("location").not().isEmpty().withMessage("location cant be empty"),
        ];
    }
})();
