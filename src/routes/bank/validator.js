const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    getAccountListValidator() {
        return [
            check("toDate").not().isEmpty().withMessage("toDate cant be empty"),
            check("fromDate")
                .not()
                .isEmpty()
                .withMessage("fromDate cant be empty"),
            check("sourceAccount")
                .not()
                .isEmpty()
                .withMessage("sourceAccount cant be empty"),
            check("nationalCode")
                .not()
                .isEmpty()
                .withMessage("nationalCode cant be empty"),
            check("bank").not().isEmpty().withMessage("bank cant be empty"),
        ];
    }
     bnkBanksInsertValidator(){
      return[
      check('hesab')
      .not().isEmpty()
      .withMessage('hesab cant be empty'),
      check('iranId')
      .not().isEmpty()
      .withMessage('iranId cant be empty'),
      check('branchCode')
      .not().isEmpty()
      .withMessage('branchCode cant be empty'),
      check('branchName')
      .not().isEmpty()
      .withMessage('branchName cant be empty'),
      check('accType')
      .not().isEmpty()
      .withMessage('accType cant be empty'),
      check('numHesab')
      .not().isEmpty()
      .withMessage('numHesab cant be empty'),
      check('eCard')
      .not().isEmpty()
      .withMessage('eCard cant be empty'),
      check('owner')
      .not().isEmpty()
      .withMessage('owner cant be empty'),
      check('addressBank')
      .not().isEmpty()
      .withMessage('addressBank cant be empty'),
      check('addressTel')
      .not().isEmpty()
      .withMessage('addressTel cant be empty'),
      check('addressBank')
      .not().isEmpty()
      .withMessage('addressBank cant be empty'),
      check('serialCheck')
      .not().isEmpty()
      .withMessage('serialCheck cant be empty'),
      check('costCenter')
      .not().isEmpty()
      .withMessage('costCenter cant be empty'),
      check('nationalCode')
      .not().isEmpty()
      .withMessage('nationalCode cant be empty'),
      check('iranBankId')
      .not().isEmpty()
      .withMessage('iranBankId cant be empty'),
      ]
}
 
    chequeRegisterValidator() {
        return [
            check("amount").not().isEmpty().withMessage("amount cant be empty"),
            check("chequeMedias")
                .not()
                .isEmpty()
                .withMessage("chequeMedias cant be empty"),
            check("sourceAccount")
                .not()
                .isEmpty()
                .withMessage("sourceAccount cant be empty"),
            check("nationalCode")
                .not()
                .isEmpty()
                .withMessage("nationalCode cant be empty"),
            check("bank").not().isEmpty().withMessage("bank cant be empty"),
            check("dueDate")
                .not()
                .isEmpty()
                .withMessage("dueDate cant be empty"),
            check("sayadId")
                .not()
                .isEmpty()
                .withMessage("sayadId cant be empty"),
            check("serialNo")
                .not()
                .isEmpty()
                .withMessage("serialNo cant be empty"),
            check("seriesNo")
                .not()
                .isEmpty()
                .withMessage("seriesNo cant be empty"),
            check("accountOwners")
                .not()
                .isEmpty()
                .withMessage("accountOwners cant be empty"),
            check("receivers")
                .not()
                .isEmpty()
                .withMessage("receivers cant be empty"),
            check("signers")
                .not()
                .isEmpty()
                .withMessage("signers cant be empty"),
            check("branchCode")
                .not()
                .isEmpty()
                .withMessage("branchCode cant be empty"),
            check("chequeTypes")
                .not()
                .isEmpty()
                .withMessage("chequeTypes cant be empty"),
            check("reason").not().isEmpty().withMessage("reason cant be empty"),
        ];
    }
    chequeAcceptValidator() {
        return [
            check("sayadId")
                .not()
                .isEmpty()
                .withMessage("sayadId cant be empty"),
            check("nationalCode")
                .not()
                .isEmpty()
                .withMessage("nationalCode cant be empty"),
            check("bank").not().isEmpty().withMessage("bank cant be empty"),
            check("idTypes")
                .not()
                .isEmpty()
                .withMessage("idTypes cant be empty"),
            check("accepts")
                .not()
                .isEmpty()
                .withMessage("accepts cant be empty"),
        ];
    }
})();
