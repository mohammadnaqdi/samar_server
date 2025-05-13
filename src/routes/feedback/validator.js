const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    submitValidator() {
        return [
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("email").not().isEmpty().withMessage("email cant be empty"),
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("text").not().isEmpty().withMessage("text cant be empty"),
        ];
    }
})();
