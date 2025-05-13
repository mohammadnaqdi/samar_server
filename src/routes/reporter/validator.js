const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    insertInspectorReportValidator() {
        return [
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
        ];
    }
    setStimApiValidator() {
        return [
            check("title").not().isEmpty().withMessage("title cant be empty"),
            check("api").not().isEmpty().withMessage("api cant be empty"),
            check("desc").not().isEmpty().withMessage("desc cant be empty"),
            check("active").not().isEmpty().withMessage("active cant be empty"),
            check("school").not().isEmpty().withMessage("school cant be empty"),
            check("startDate").not().isEmpty().withMessage("startDate cant be empty"),
            check("endDate").not().isEmpty().withMessage("endDate cant be empty"),
            check("student").not().isEmpty().withMessage("student cant be empty"),
            check("grade").not().isEmpty().withMessage("grade cant be empty"),
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("startDoc").not().isEmpty().withMessage("startDoc cant be empty"),
            check("endDoc").not().isEmpty().withMessage("endDoc cant be empty"),
            check("serviceNum").not().isEmpty().withMessage("serviceNum cant be empty"),
            check("pdf").not().isEmpty().withMessage("pdf cant be empty"),
            check("excel").not().isEmpty().withMessage("excel cant be empty"),
            check("word").not().isEmpty().withMessage("word cant be empty"),
            check("description").not().isEmpty().withMessage("description cant be empty"),
            
        ];
    }
})();

