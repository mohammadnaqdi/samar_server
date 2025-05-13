const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    updateValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 100 })
                .withMessage("name cant be empty max 100"),
        ];
    }
    setNameValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 120 })
                .withMessage("name cant be empty max 120"),
            check("lastName")
                .isLength({ min: 1, max: 120 })
                .withMessage("lastName cant be empty max 120"),
        ];
    }
    setNewUserValidator() {
        return [
            check("phone")
                .not()
                .isEmpty()
                .withMessage("phone cant be empty"),
            check("phone")
                .isLength({ min: 11, max: 11 }).withMessage("phone length is 11"),
            check("name")
                .isLength({ min: 1, max: 120 })
                .withMessage("name cant be empty max 120"),
            check("lastName")
                .isLength({ min: 1, max: 120 })
                .withMessage("lastName cant be empty max 120"),
        ];
    }
    setUserAdminValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("isAdmin")
                .not()
                .isEmpty()
                .withMessage("isAdmin cant be empty"),
            check("userName")
                .not()
                .isEmpty()
                .withMessage("userName cant be empty"),
            check("password")
                .not()
                .isEmpty()
                .withMessage("password cant be empty"),
            check("changePass")
                .not()
                .isEmpty()
                .withMessage("changePass cant be empty"),
            check("name")
                .isLength({ min: 1, max: 120 })
                .withMessage("name cant be empty max 120"),
            check("lastName")
                .isLength({ min: 1, max: 120 })
                .withMessage("lastName cant be empty max 120"),
            check("phone")
                .isLength({ min: 1, max: 120 })
                .withMessage("phone cant be empty max 120"),
        ];
    }
    setUserOperatorValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("isAdmin")
                .not()
                .isEmpty()
                .withMessage("isAdmin cant be empty"),
            check("userName")
                .not()
                .isEmpty()
                .withMessage("userName cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("password")
                .not()
                .isEmpty()
                .withMessage("password cant be empty"),
            check("changePass")
                .not()
                .isEmpty()
                .withMessage("changePass cant be empty"),
            check("name")
                .isLength({ min: 1, max: 120 })
                .withMessage("name cant be empty max 120"),
            check("lastName")
                .isLength({ min: 1, max: 120 })
                .withMessage("lastName cant be empty max 120"),
            check("phone")
                .isLength({ min: 1, max: 120 })
                .withMessage("phone cant be empty max 120"),
        ];
    }
    newUserValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 100 })
                .withMessage("name cant be empty max 100"),
            check("phone").isLength(11).withMessage("phone len is 11"),
        ];
    }
    setNationalCodeValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("nt")
                .isLength({ min: 10, max: 10 })
                .withMessage("nt cant be empty max 10"),
        ];
    }
    newAdminValidator() {
        return [check("id").not().isEmpty().withMessage("id cant be empty")];
    }
    friendsValidator() {
        return [
            check("friends")
                .not()
                .isEmpty()
                .withMessage("friends cant be empty"),
        ];
    }
    simpleValidator() {
        return [
            check("listUsersId")
                .not()
                .isEmpty()
                .withMessage("listUsersId cant be empty"),
        ];
    }
    userListValidator() {
        return [
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("search").not().isEmpty().withMessage("search cant be empty"),
        ];
    }
    sendNotifValidator() {
        return [
            check("userId").not().isEmpty().withMessage("userId cant be empty"),
            check("title").not().isEmpty().withMessage("title cant be empty"),
            check("text").not().isEmpty().withMessage("text cant be empty"),
        ];
    }
})();
