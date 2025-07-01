const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    insertStudentValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 70 })
                .withMessage("name cant be empty max 70"),
            check("fatherName")
                .isLength({ min: 1, max: 70 })
                .withMessage("fatherName cant be empty max 70"),
            check("parentReleation")
                .isLength({ min: 1, max: 70 })
                .withMessage("parentReleation cant be empty max 70"),
            check("lastName")
                .isLength({ min: 1, max: 70 })
                .withMessage("lastName cant be empty max 70"),
            check("studentCode")
                .isLength({ min: 1, max: 30 })
                .withMessage("studentCode cant be empty max 30"),
            check("school").not().isEmpty().withMessage("school cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("gradeTitle")
                .not()
                .isEmpty()
                .withMessage("gradeTitle cant be empty"),
            check("addressText")
                .not()
                .isEmpty()
                .withMessage("addressText cant be empty"),
            check("details")
                .not()
                .isEmpty()
                .withMessage("details cant be empty"),
            check("location").not().isEmpty().withMessage("location cant be empty"),
            check("isIranian")
                .not()
                .isEmpty()
                .withMessage("isIranian cant be empty"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
        ];
    }
    insertStudentByAgentValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 80 })
                .withMessage("name cant be empty max 80"),
            check("fatherName")
                .isLength({ min: 1, max: 80 })
                .withMessage("fatherName cant be empty max 80"),
            check("parentReleation")
                .isLength({ min: 1, max: 80 })
                .withMessage("parentReleation cant be empty max 80"),
            check("lastName")
                .isLength({ min: 1, max: 80 })
                .withMessage("lastName cant be empty max 80"),
            check("school").not().isEmpty().withMessage("school cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("gradeTitle")
                .not()
                .isEmpty()
                .withMessage("gradeTitle cant be empty"),
            check("addressText")
                .not()
                .isEmpty()
                .withMessage("addressText cant be empty"),
            check("details")
                .not()
                .isEmpty()
                .withMessage("details cant be empty"),
            check("location").not().isEmpty().withMessage("location cant be empty"),
            check("isIranian")
                .not()
                .isEmpty()
                .withMessage("isIranian cant be empty"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
            check("parentId").not().isEmpty().withMessage("parentId cant be empty"),
            check("distance").not().isEmpty().withMessage("distance cant be empty"),
            check("distance").isNumeric().withMessage("distance cant be empty"),
        ];
    }
    insertStudentBySchoolValidator() {
        return [
            check("name")
                .isLength({ min: 1, max: 70 })
                .withMessage("name cant be empty max 70"),
            check("fatherName")
                .isLength({ min: 1, max: 70 })
                .withMessage("fatherName cant be empty max 70"),
            check("parentReleation")
                .isLength({ min: 1, max: 70 })
                .withMessage("parentReleation cant be empty max 70"),
            check("lastName")
                .isLength({ min: 1, max: 70 })
                .withMessage("lastName cant be empty max 70"),
            check("studentCode")
                .isLength({ min: 1, max: 30 })
                .withMessage("studentCode cant be empty max 30"),
            check("school").not().isEmpty().withMessage("school cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("gradeTitle")
                .not()
                .isEmpty()
                .withMessage("gradeTitle cant be empty"),
            check("addressText")
                .not()
                .isEmpty()
                .withMessage("addressText cant be empty"),
            check("details")
                .not()
                .isEmpty()
                .withMessage("details cant be empty"),
            check("lng").not().isEmpty().withMessage("lng cant be empty"),
            check("lat").not().isEmpty().withMessage("lat cant be empty"),
            check("isIranian")
                .not()
                .isEmpty()
                .withMessage("isIranian cant be empty"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("parentName")
                .isLength({ min: 1, max: 70 })
                .withMessage("parentName cant be empty max 70"),
            check("parentFamily")
                .isLength({ min: 1, max: 70 })
                .withMessage("parentFamily cant be empty max 70"),
            check("parentId")
                .not()
                .isEmpty()
                .withMessage("parentId cant be empty"),
            check("parentPhone")
                .not()
                .isEmpty()
                .withMessage("parentPhone cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
        ];
    }
    setStudentValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("name")
                .isLength({ min: 1, max: 70 })
                .withMessage("name cant be empty max 70"),
            check("parentReleation")
                .isLength({ min: 1, max: 70 })
                .withMessage("parentReleation cant be empty max 70"),
            check("lastName")
                .isLength({ min: 1, max: 70 })
                .withMessage("lastName cant be empty max 70"),
            check("studentCode")
                .isLength({ min: 1, max: 30 })
                .withMessage("studentCode cant be empty max 30"),
            check("school").not().isEmpty().withMessage("school cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("gradeTitle")
                .not()
                .isEmpty()
                .withMessage("gradeTitle cant be empty"),
            check("addressText")
                .not()
                .isEmpty()
                .withMessage("addressText cant be empty"),
            check("details")
                .not()
                .isEmpty()
                .withMessage("details cant be empty"),
            check("location").not().isEmpty().withMessage("location cant be empty"),
            check("isIranian")
                .not()
                .isEmpty()
                .withMessage("isIranian cant be empty"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("parentId")
                .not()
                .isEmpty()
                .withMessage("parentId cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
        ];
    }
    setRequestValidator() {
        return [
            check("studentId")
                .not()
                .isEmpty()
                .withMessage("studentId cant be empty"),
            check("setType")
                .not()
                .isEmpty()
                .withMessage("setType cant be empty"),
        ];
    }
    changeStateValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("state").not().isEmpty().withMessage("state cant be empty"),
        ];
    }
    studentsByIdsListValidator() {
        return [check("ids").not().isEmpty().withMessage("ids cant be empty")];
    }
    studentListAllValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    setPackValidator() {
        return [
            check("studentCode")
                .not()
                .isEmpty()
                .withMessage("studentCode cant be empty"),
        ];
    }
    studentListValidator() {
        return [
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("search").not().isEmpty().withMessage("search cant be empty"),
            check("school").not().isEmpty().withMessage("school cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("gender").not().isEmpty().withMessage("gender cant be empty"),
            check("maxState")
                .not()
                .isEmpty()
                .withMessage("maxState cant be empty"),
            check("minState")
                .not()
                .isEmpty()
                .withMessage("minState cant be empty"),
        ];
    }
    studentListNotServiceValidator() {
        return [
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("search").not().isEmpty().withMessage("search cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("shift").not().isEmpty().withMessage("shift cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("sortBy").not().isEmpty().withMessage("sortBy cant be empty"),
        ];
    }
    studentListNotService2Validator() {
        return [
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("schoolIds")
                .not()
                .isEmpty()
                .withMessage("schoolIds cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
            check("sortBy").not().isEmpty().withMessage("sortBy cant be empty"),
        ];
    }
    setOtherStudentDataValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("del").not().isEmpty().withMessage("del cant be empty"),
        ];
    }
})();
