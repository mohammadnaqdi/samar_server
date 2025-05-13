const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setVersionValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("type").not().isEmpty().withMessage("type cant be empty"),
            check("versionCode")
                .not()
                .isEmpty()
                .withMessage("versionCode cant be empty"),
            check("versionName")
                .not()
                .isEmpty()
                .withMessage("versionName cant be empty"),
            check("url").not().isEmpty().withMessage("url cant be empty"),
            check("changeDesc")
                .not()
                .isEmpty()
                .withMessage("changeDesc cant be empty"),
        ];
    }
})();
