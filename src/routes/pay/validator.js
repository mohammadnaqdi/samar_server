const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {


    showMorePayValidator() {
        return [
            check("setter").not().isEmpty().withMessage("setter cant be empty"),
            check("sanad").not().isEmpty().withMessage("sanad cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    sendNotifsValidator() {
        return [
            check("studentCodes").not().isEmpty().withMessage("studentCodes cant be empty"),
            check("notifID").not().isEmpty().withMessage("notifID cant be empty"),
        ];
    }
    //queueCode,amount,desc,studentCode,sanadNum
   
  
    // setPayQueueValidator() {
    //     return [
    //         check("id").not().isEmpty().withMessage("id cant be empty"),
    //         check("amount").not().isEmpty().withMessage("amount cant be empty"),
    //         check("title").not().isEmpty().withMessage("title cant be empty"),
    //         check("active").not().isEmpty().withMessage("active cant be empty"),
    //         check("desc").not().isEmpty().withMessage("desc cant be empty"),
    //         check("optinal")
    //             .not()
    //             .isEmpty()
    //             .withMessage("optinal cant be empty"),
    //         check("maxDate")
    //             .not()
    //             .isEmpty()
    //             .withMessage("maxDate cant be empty"),
    //         check("listAccCode")
    //             .not()
    //             .isEmpty()
    //             .withMessage("listAccCode cant be empty"),
    //         check("listAccName")
    //             .not()
    //             .isEmpty()
    //             .withMessage("listAccName cant be empty"),
    //         check("type").not().isEmpty().withMessage("type cant be empty"),
    //     ];
    // }
})();
