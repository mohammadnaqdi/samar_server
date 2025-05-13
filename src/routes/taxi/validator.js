const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setTaxiFareValidator() {
        return [
            check("driver_type")
                .not()
                .isEmpty()
                .withMessage("driver_type cant be empty"),
            check("PM")
                .not()
                .isEmpty()
                .withMessage("PM cant be empty"),
            check("pri_cost")
                .not()
                .isEmpty()
                .withMessage("pri_cost cant be empty"),
            check("Start_night")
                .not()
                .isEmpty()
                .withMessage("Start_night cant be empty"),
            check("Stop_night")
                .not()
                .isEmpty()
                .withMessage("Stop_night cant be empty"),
            check("Cost_200")
                .not()
                .isEmpty()
                .withMessage("Cost_200 cant be empty"),
            check("Cost_stop")
                .not()
                .isEmpty()
                .withMessage("Cost_stop cant be empty"),
            check("Max_stop_km")
                .not()
                .isEmpty()
                .withMessage("Max_stop_km cant be empty"),
            check("free_trip")
                .not()
                .isEmpty()
                .withMessage("free_trip cant be empty"),
            check("free_time")
                .not()
                .isEmpty()
                .withMessage("free_time cant be empty"),
            check("Percent_night")
                .not()
                .isEmpty()
                .withMessage("Percent_night cant be empty"),
            check("fraction")
                .not()
                .isEmpty()
                .withMessage("fraction cant be empty"),
        ];
    }

     //,,,,,,
     startServiceValidator() {
        return [
            check("serial").not().isEmpty().withMessage("serial cant be empty"),
            check("serviceNum").not().isEmpty().withMessage("serviceNum cant be empty"),
            check("start").not().isEmpty().withMessage("start cant be empty"),
        ];
    }
})();
