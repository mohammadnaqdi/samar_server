const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    insertDriverValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("phone")
                .isLength({ min: 4, max: 16 })
                .withMessage("phone cant be empty max 16"),
            check("name")
                .isLength({ min: 1, max: 32 })
                .withMessage("name cant be empty  max 32"),
            check("lastName")
                .isLength({ min: 1, max: 32 })
                .withMessage("lastName cant be empty  max 32"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("pelak").not().isEmpty().withMessage("pelak cant be empty"),
            check("colorCar")
                .not()
                .isEmpty()
                .withMessage("colorCar cant be empty"),
            check("carModel")
                .not()
                .isEmpty()
                .withMessage("carModel cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("driverCode")
                .not()
                .isEmpty()
                .withMessage("driverCode cant be empty"),
            check("drivingLicence")
                .not()
                .isEmpty()
                .withMessage("drivingLicence cant be empty"),
            check("pic").not().isEmpty().withMessage("pic cant be empty"),
            check("birthday")
                .not()
                .isEmpty()
                .withMessage("birthday cant be empty"),
            check("dLicencePic")
                .not()
                .isEmpty()
                .withMessage("dLicencePic cant be empty"),
            check("setForOldCar")
                .not()
                .isEmpty()
                .withMessage("setForOldCar cant be empty"),
            check("setForOldUser")
                .not()
                .isEmpty()
                .withMessage("setForOldUser cant be empty"),
            check("capacity")
                .not()
                .isEmpty()
                .withMessage("capacity cant be empty"),
        ];
    }

    setEmptyDriverValidator() {
        return [
            check("phone")
                .isLength({ min: 4, max: 16 })
                .withMessage("phone cant be empty max 16"),
            check("name")
                .isLength({ min: 1, max: 32 })
                .withMessage("name cant be empty  max 32"),
            check("lastName")
                .isLength({ min: 1, max: 32 })
                .withMessage("lastName cant be empty  max 32"),
            check("capacity")
                .not()
                .isEmpty()
                .withMessage("capacity cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("userId").not().isEmpty().withMessage("userId cant be empty"),
        ];
    }
    updateEmptyDriverValidator() {
        return [check("id").not().isEmpty().withMessage("id cant be empty")];
    }
    sendSMSRequestValidator() {
        return [
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    
    duplicateDriverValidator() {
        return [
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    driversByUserIdsValidator() {
        return [check("ids").not().isEmpty().withMessage("ids cant be empty")];
    }
    checkRequestCodeValidator() {
        return [
            check("phone").not().isEmpty().withMessage("phone cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
        ];
    }
    //,,,,,,
    startServiceValidator() {
        return [
            check("driverCode").not().isEmpty().withMessage("driverCode cant be empty"),
            check("lat")
                .not()
                .isEmpty()
                .withMessage("lat cant be empty"),
            check("lng").not().isEmpty().withMessage("lng cant be empty"),
            check("state").not().isEmpty().withMessage("state cant be empty"),
            check("serviceNum").not().isEmpty().withMessage("serviceNum cant be empty"),
            check("start").not().isEmpty().withMessage("start cant be empty"),
            check("isWarning").not().isEmpty().withMessage("isWarning cant be empty"),
        ];
    }
})();
