const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    firstUserValidator() {
        return [
            check("phone")
                .isLength({ min: 11, max: 11 })
                .withMessage("phone length wrong"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("lastName")
                .not()
                .isEmpty()
                .withMessage("lastName cant be empty"),
            check("userName")
                .not()
                .isEmpty()
                .withMessage("userName cant be empty"),
            check("password")
                .not()
                .isEmpty()
                .withMessage("password cant be empty"),
        ];
    }
    loginValidator() {
        return [
            check("userName")
                .not()
                .isEmpty()
                .withMessage("userName cant be empty"),
            check("password")
                .not()
                .isEmpty()
                .withMessage("password cant be empty"),
        ];
    }
    checkCodeChangePassValidator() {
        return [
            check("phone")
                .isLength({ min: 11, max: 11 })
                .withMessage("phone length wrong"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("pass").not().isEmpty().withMessage("pass cant be empty"),
        ];
    }
    adminPhoneCheckValidator() {
        return [
            check("phone")
                .isLength({ min: 11, max: 11 })
                .withMessage("phone length wrong"),
        ];
    }
    // registerValidator(){
    //     return[
    //       check('phone').isLength({min:11,max:11})
    //       .withMessage('phone length wrong'),
    //       check('name').isLength({min:1,max:50})
    //       .withMessage('name cant be empty')
    //     ]
    //  }
    // loginValidator(){
    //       return[
    //         check('email')
    //         .isEmail()
    //         .withMessage('email is invalid'),
    //       check('password')
    //       .not().isEmpty()
    //       .withMessage('password cant be empty')
    //       ]
    // }
    // }
    phoneCheckValidator() {
        return [
            check("phone")
                .isLength({ min: 11, max: 11 })
                .withMessage("phone length wrong"),
        ];
    }
    loginAdminValidator() {
        return [
            check("username")
                .not()
                .isEmpty()
                .withMessage("username cant be empty"),
            check("password")
                .not()
                .isEmpty()
                .withMessage("password cant be empty"),
        ];
    }
    codeValidator() {
        return [
            check("phone")
                .isLength({ min: 11, max: 11 })
                .withMessage("phone length wrong"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
        ];
    }
    selectOneClubValidator() {
        return [
            check("phone")
                .isLength({ min: 11, max: 11 })
                .withMessage("phone length wrong"),
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("code").not().isEmpty().withMessage("code cant be empty"),
            check("clubId").not().isEmpty().withMessage("clubId cant be empty"),
        ];
    }
    updateDriverLocationValidator() {
        return [
            check("lat").not().isEmpty().withMessage("lat cant be empty"),
            check("lng").not().isEmpty().withMessage("lng cant be empty"),
            check("name").not().isEmpty().withMessage("name cant be empty"),
            check("angle").not().isEmpty().withMessage("angle cant be empty"),
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("serviceId")
                .not()
                .isEmpty()
                .withMessage("serviceId cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("state").not().isEmpty().withMessage("state cant be empty"),
        ];
    }
})();
