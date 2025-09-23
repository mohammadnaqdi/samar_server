const expressValidator = require("express-validator");
const check = expressValidator.check;

module.exports = new (class {
    setServiceValidator() {
        return [
            check("distance")
                .not()
                .isEmpty()
                .withMessage("distance cant be empty"),
            check("cost").not().isEmpty().withMessage("cost cant be empty"),
            check("student")
                .not()
                .isEmpty()
                .withMessage("student cant be empty"),
            check("studentCost")
                .not()
                .isEmpty()
                .withMessage("studentCost cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("driverCost")
                .not()
                .isEmpty()
                .withMessage("driverCost cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
            check("driverSharing")
                .not()
                .isEmpty()
                .withMessage("driverSharing cant be empty"),
            check("routeSave")
                .not()
                .isEmpty()
                .withMessage("routeSave cant be empty"),
            check("percentInfo")
                .not()
                .isEmpty()
                .withMessage("percentInfo cant be empty"),
            check("driverPic")
                .not()
                .isEmpty()
                .withMessage("driverPic cant be empty"),
            check("driverName")
                .not()
                .isEmpty()
                .withMessage("driverName cant be empty"),
            check("driverCar")
                .not()
                .isEmpty()
                .withMessage("driverCar cant be empty"),
            check("driverPhone")
                .not()
                .isEmpty()
                .withMessage("driverPhone cant be empty"),
            check("driverCarPelak")
                .not()
                .isEmpty()
                .withMessage("driverCarPelak cant be empty"),
        ];
    }
    setServiceChangeValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("serviceId")
                .not()
                .isEmpty()
                .withMessage("serviceId cant be empty"),
            check("serviceNum")
                .not()
                .isEmpty()
                .withMessage("serviceNum cant be empty"),
            check("date").not().isEmpty().withMessage("date cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
            check("driverCost")
                .not()
                .isEmpty()
                .withMessage("driverCost cant be empty"),
            check("driverPic")
                .not()
                .isEmpty()
                .withMessage("driverPic cant be empty"),
            check("driverName")
                .not()
                .isEmpty()
                .withMessage("driverName cant be empty"),
            check("driverCar")
                .not()
                .isEmpty()
                .withMessage("driverCar cant be empty"),
            check("driverPhone")
                .not()
                .isEmpty()
                .withMessage("driverPhone cant be empty"),
            check("driverCarPelak")
                .not()
                .isEmpty()
                .withMessage("driverCarPelak cant be empty"),
            check("driverGender")
                .not()
                .isEmpty()
                .withMessage("driverGender cant be empty"),
            check("reason").not().isEmpty().withMessage("reason cant be empty"),
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
        ];
    }
    addSanadNumToServiceChangeValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("sanadNum")
                .not()
                .isEmpty()
                .withMessage("sanadNum cant be empty"),
        ];
    }
    updateServiceValidator() {
        return [
            check("id").not().isEmpty().withMessage("id cant be empty"),
            check("distance")
                .not()
                .isEmpty()
                .withMessage("distance cant be empty"),
            check("cost").not().isEmpty().withMessage("cost cant be empty"),
            check("student")
                .not()
                .isEmpty()
                .withMessage("student cant be empty"),
            check("studentCost")
                .not()
                .isEmpty()
                .withMessage("studentCost cant be empty"),
            check("driverCost")
                .not()
                .isEmpty()
                .withMessage("driverCost cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("schoolId")
                .not()
                .isEmpty()
                .withMessage("schoolId cant be empty"),
            check("time").not().isEmpty().withMessage("time cant be empty"),
            check("driverSharing")
                .not()
                .isEmpty()
                .withMessage("driverSharing cant be empty"),
            check("routeSave")
                .not()
                .isEmpty()
                .withMessage("routeSave cant be empty"),
            check("percentInfo")
                .not()
                .isEmpty()
                .withMessage("percentInfo cant be empty"),
            check("driverPic")
                .not()
                .isEmpty()
                .withMessage("driverPic cant be empty"),
            check("driverName")
                .not()
                .isEmpty()
                .withMessage("driverName cant be empty"),
            check("driverCar")
                .not()
                .isEmpty()
                .withMessage("driverCar cant be empty"),
            check("driverPhone")
                .not()
                .isEmpty()
                .withMessage("driverPhone cant be empty"),
            check("driverCarPelak")
                .not()
                .isEmpty()
                .withMessage("driverCarPelak cant be empty"),
        ];
    }

    
    
    serviceListValidator() {
        return [
            check("page").not().isEmpty().withMessage("page cant be empty"),
            check("search").not().isEmpty().withMessage("search cant be empty"),
            check("shiftId")
                .not()
                .isEmpty()
                .withMessage("shiftId cant be empty"),
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    serviceListByIdsValidator() {
        return [check("ids").not().isEmpty().withMessage("ids cant be empty")];
    }
    serviceByNumOrDriverValidator() {
        return [
            check("search").not().isEmpty().withMessage("search cant be empty"),
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
        ];
    }
    setPricingTableValidator() {
        return [
            check("city")
                .not()
                .isEmpty()
                .withMessage("city cant be empty"),
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("carId").not().isEmpty().withMessage("carId cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("kilometer")
                .not()
                .isEmpty()
                .withMessage("kilometer cant be empty"),
            check("price").not().isEmpty().withMessage("price cant be empty"),
            check("city").isNumeric().withMessage("city cant be empty"),
        ];
    }
    setPriceTableValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("carId").not().isEmpty().withMessage("carId cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
            check("kilometer")
                .not()
                .isEmpty()
                .withMessage("kilometer cant be empty"),
            check("studentAmount").not().isEmpty().withMessage("studentAmount cant be empty"),
            check("driverAmount").not().isEmpty().withMessage("driverPrice cant be empty"),
        ];
    }
    searchPricingTableValidator() {
        return [
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("carId").not().isEmpty().withMessage("carId cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
        ];
    }
    searchPriceTableValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("districtId")
                .not()
                .isEmpty()
                .withMessage("districtId cant be empty"),
            check("carId").not().isEmpty().withMessage("carId cant be empty"),
            check("gradeId")
                .not()
                .isEmpty()
                .withMessage("gradeId cant be empty"),
        ];
    }
    setServicePackValidator() {
        return [
            check("agencyId")
                .not()
                .isEmpty()
                .withMessage("agencyId cant be empty"),
            check("driverId")
                .not()
                .isEmpty()
                .withMessage("driverId cant be empty"),
            check("packNum")
                .not()
                .isEmpty()
                .withMessage("packNum cant be empty"),
            check("select").not().isEmpty().withMessage("select cant be empty"),
        ];
    }
})();
