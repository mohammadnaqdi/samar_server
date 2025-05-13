const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setNotifValidator() {
        return [
            check("text").not().isEmpty().withMessage("text cant be empty"),
            check("type")
                .not()
                .isEmpty()
                .withMessage("type cant be empty"),
            check("role")
                .not()
                .isEmpty()
                .withMessage("role cant be empty"),
            check("title")
                .not()
                .isEmpty()
                .withMessage("title cant be empty"),
        ];
    }
})();
