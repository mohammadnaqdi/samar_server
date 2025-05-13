const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {

    
    serviceListDocValidator() {
        return [
            check("list").not().isEmpty().withMessage("list cant be empty"),
            check("agencyId").not().isEmpty().withMessage("agencyId cant be empty"),

        ];
    }
    addStudentToServiceValidator() {
        return [
            check("serviceId").not().isEmpty().withMessage("serviceId cant be empty"),
            check("distance").not().isEmpty().withMessage("distance cant be empty"),
            check("cost").not().isEmpty().withMessage("cost cant be empty"),
            check("driverSharing").not().isEmpty().withMessage("driverSharing cant be empty"),
            check("studentCost").not().isEmpty().withMessage("studentCost cant be empty"),
            check("lat").not().isEmpty().withMessage("lat cant be empty"),
            check("lng").not().isEmpty().withMessage("lng cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("percentInfo").not().isEmpty().withMessage("percentInfo cant be empty"),

        ];
    }

})();
