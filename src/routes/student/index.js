const express = require("express");
const router = express.Router();
const controller = require("./controller");
const validator = require("./validator");
const { isAdmin, isEnyAdmin, isLoggined } = require("./../../middleware/auth");

//this controller import a class this mean like a class

router.get("/GetMyStudents", controller.getMyStudents.bind(controller));
router.get("/GetStudentById", controller.getStudentById.bind(controller));
router.get("/GetMyStudents2", controller.getMyStudents2.bind(controller));
router.post(
    "/StudentList",
    isEnyAdmin,
    validator.studentListValidator(),
    controller.validate.bind(controller),
    controller.studentList.bind(controller),
);
router.post(
    "/StudentListAll",
    isEnyAdmin,
    validator.studentListAllValidator(),
    controller.validate.bind(controller),
    controller.studentListAll.bind(controller),
);
router.get(
    "/StudentListAddress",
    isEnyAdmin,
    controller.studentListAddress.bind(controller),
);
router.get(
    "/StudentListPack",
    isEnyAdmin,
    controller.studentListPack.bind(controller),
);

router.get(
    "/GetstudentByCode",
    isEnyAdmin,
    controller.getstudentByCode.bind(controller),
);
router.post(
    "/StudentListNotService",
    validator.studentListNotServiceValidator(),
    controller.validate.bind(controller),
    controller.studentListNotService.bind(controller),
);
router.post(
    "/studentListNotService2",
    validator.studentListNotService2Validator(),
    controller.validate.bind(controller),
    controller.studentListNotService2.bind(controller),
);
router.post(
    "/StudentsByIdsList",
    validator.studentsByIdsListValidator(),
    controller.validate.bind(controller),
    controller.studentsByIdsList.bind(controller),
);

router.post(
    "/InsertStudent",
    validator.insertStudentValidator(),
    controller.validate.bind(controller),
    controller.insertStudent.bind(controller),
);
router.post(
    "/InsertStudentByAgent",
    validator.insertStudentByAgentValidator(),
    controller.validate.bind(controller),
    controller.insertStudentByAgent.bind(controller),
);
// router.post(
//   '/InsertStudentBySchool',isEnyAdmin,
//   validator.insertStudentBySchoolValidator(),
//   controller.validate.bind(controller),
//   controller.insertStudentBySchool.bind(controller)
// );
router.post(
    "/SetStudent",
    isEnyAdmin,
    validator.setStudentValidator(),
    controller.validate.bind(controller),
    controller.setStudent.bind(controller),
);
router.post(
    "/SetPack",
    isEnyAdmin,
    validator.setPackValidator(),
    controller.validate.bind(controller),
    controller.setPack.bind(controller),
);
router.post(
    "/ChangeState",
    isEnyAdmin,
    validator.changeStateValidator(),
    controller.validate.bind(controller),
    controller.changeState.bind(controller),
);
router.get("/GetPacks", controller.getPacks.bind(controller));
router.get("/GetStudentCode", controller.getStudentCode.bind(controller));
router.get("/SetAvanakStudent", controller.setAvanakStudent.bind(controller));
router.get(
    "/StudentByPhoneNumber",
    controller.studentByPhoneNumber.bind(controller),
);
router.get(
    "/CheckStudentForSubmit",
    controller.checkStudentForSubmit.bind(controller),
);
router.post(
    "/SetRequest",
    validator.setRequestValidator(),
    controller.validate.bind(controller),
    controller.setRequest.bind(controller),
);
router.delete("/DeleteStudent", controller.deleteStudent.bind(controller));

router.post(
    "/SetOtherStudentData",
    validator.setOtherStudentDataValidator(),
    controller.validate.bind(controller),
    controller.setOtherStudentData.bind(controller),
);

router.get(
    "/ChangeStudentDate",
    controller.changeStudentDate.bind(controller),
);

router.get("/StudentsByDriver", controller.studentsByDriver.bind(controller));

module.exports = router;
