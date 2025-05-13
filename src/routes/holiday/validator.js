const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    insertHolidayValidator() {
        return [
            check("year").not().isEmpty().withMessage("year cant be empty"),
            check("month").not().isEmpty().withMessage("month cant be empty"),
            check("day").not().isEmpty().withMessage("day cant be empty"),
            check("state").not().isEmpty().withMessage("state cant be empty"),
        ];
    }
    updateSharingValidator() {
        return [
            check("ids").not().isEmpty().withMessage("ids cant be empty"),
            check("percents")
                .not()
                .isEmpty()
                .withMessage("percents cant be empty"),
        ];
    }
    getSpacialHolidayValidator() {
        return [
            check("year").not().isEmpty().withMessage("year cant be empty"),
            check("month").not().isEmpty().withMessage("month cant be empty"),
        ];
    }
})();
