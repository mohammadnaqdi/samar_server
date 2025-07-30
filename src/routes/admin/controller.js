const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const _ = require("lodash");
const bcrypt = require("bcrypt");

module.exports = new (class extends controller {
    async checkLogin(req, res) {
        try {
            const user = req.user;
            console.log("user", user);
            if (user.delete) {
                return this.response({
                    res,
                    code: 301,
                    message: "user is delete",
                    data: { fa_m: "کاربر حذف شده است" },
                });
            }
            if (!user.active) {
                return this.response({
                    res,
                    code: 302,
                    message: "user is inactive",
                    data: {
                        fa_m: "کاربر غیرفعال شده است",
                        inActvieReason: user.inActvieReason,
                    },
                });
            }
            let agency;
            let listCode = 0;
            if (
                (user.isAgencyAdmin || user.isSupport) &&
                !user.isadmin &&
                !user.isSchoolAdmin
            ) {
                if (
                    req.query.agencyId === undefined ||
                    req.query.agencyId.trim() === ""
                ) {
                    return this.response({
                        res,
                        code: 214,
                        message: "agencyId need",
                    });
                }
                const agencyId = ObjectId.createFromHexString(
                    req.query.agencyId
                );
                console.log("agencyId", agencyId);
                agency = await this.Agency.findOne(
                    {
                        $and: [
                            { delete: false },
                            { _id: agencyId },
                            {
                                $or: [
                                    { admin: user._id },
                                    { users: { $in: user._id } },
                                ],
                            },
                        ],
                    },

                    "code name cityId settings"
                );
                console.log("agency", agency);
                if (!agency) {
                    return this.response({
                        res,
                        code: 404,
                        message: "agency not find",
                    });
                }
                listCode = await this.ListAcc.countDocuments({
                    agencyId: agencyId,
                });
                console.log("listCode", listCode);
                const conL = await this.LevelAccDetail.countDocuments({
                    agencyId: agencyId,
                });
                console.log("conL", conL);
                if (conL < listCode) {
                    listCode = conL;
                }
            }
            let school;
            if (user.isSchoolAdmin) {
                school = await this.School.find({
                    admin: user._id,
                    delete: false,
                });
            }

            const ss = {
                name: user.name,
                lastName: user.lastName,
                isAdmin: user.isadmin,
                isAgencyAdmin: user.isAgencyAdmin,
                agency,
                isSupport: user.isSupport,
                ban: user.ban,
                isSchoolAdmin: user.isSchoolAdmin,
                school,
                listCode,
            };
            // console.log("ss", ss);

            return this.response({
                res,
                message: "welcome",
                data: ss,
            });
        } catch (error) {
            console.error("Error in checkLogin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async checkLoginAgency(req, res) {
        try {
            const user = req.user;
            if (!user.isAgencyAdmin) {
                return this.response({
                    res,
                    code: 401,
                    message: "user is not admin",
                    data: { fa_m: "کاربر مدیر نیست " },
                });
            }
            if (req.query.fcm != undefined || req.query.device != undefined) {
                const firebaseToken =
                    req.query.fcm === undefined ? "admin" : req.query.fcm;
                const device = req.query.device ?? "admin";
                let fcm = req.user.fcm;
                if (!fcm) {
                    fcm = [];
                }
                let find = false;
                for (var i in fcm) {
                    if (fcm[i].device === device) {
                        fcm[i].token = firebaseToken;
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    fcm.push({ device: device, token: firebaseToken });
                }
                req.user.fcm = fcm;
                req.user.save();
                const locationSchema = new mongoose.Schema(
                    {
                        userCode: { type: Number, required: true },
                        location: {
                            type: {
                                type: String,
                                enum: ["Point"],
                                default: "Point",
                            },
                            coordinates: {
                                type: [Number],
                                index: "2dsphere",
                            },
                        },
                        name: { type: String },
                        angle: { type: Number },
                        serviceId: { type: Number },
                        agencyId: { type: String },
                        state: { type: Number },
                        city: { type: Number, required: false, default: 11 },
                    },
                    {
                        timestamps: true,
                    }
                );
                locationSchema.index({ location: "2dsphere" });
                var Location = mongoose.model("Location", locationSchema);

                const driverActSchema = new mongoose.Schema(
                    {
                        driverCode: { type: String, required: true },
                        location: {
                            type: {
                                type: String,
                                enum: ["Point"],
                                default: "Point",
                            },
                            coordinates: {
                                type: [Number],
                                index: "2dsphere",
                            },
                        },
                        model: { type: Number },
                        serviceId: { type: Number },
                        isWarning: { type: Boolean },
                        studentId: { type: String },
                        start: { type: Number },
                    },
                    {
                        timestamps: true,
                    }
                );
                driverActSchema.index({ location: "2dsphere" });
                var DriverAct = mongoose.model("DriverAct", driverActSchema);
            }
            const agency = await this.Agency.findOne(
                { admin: user.id, delete: false },
                "code name location.coordinates pic"
            );
            const schools = await this.School.find(
                { agencyId: agency._id, delete: false },
                "name code gender genderTitle location.coordinates address schoolTime"
            );

            return this.response({
                res,
                message: "welcome",
                data: {
                    name: user.name,
                    lastName: user.lastName,
                    agency,
                    schools,
                },
            });
        } catch (error) {
            console.error("Error in checkLoginAgency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async searchInMyUser(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            if (
                req.query.search === undefined ||
                req.query.search.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "search need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const onlySchool = await this.School.find(
                { agency: agencyId },
                ""
            ).distinct("_id");
            const search = req.query.search;
            let page = 0;
            const limit = 100;
            var qr = [];
            var qr2 = [];
            qr.push({ delete: false });
            qr2.push({ delete: false });
            const se = search.split(/(\s+)/).filter((e) => e.trim().length > 0);
            for (var s of se) {
                qr.push({
                    $or: [
                        { phone: { $regex: ".*" + s + ".*" } },
                        { lastName: { $regex: ".*" + s + ".*" } },
                        { name: { $regex: ".*" + s + ".*" } },
                    ],
                });
                qr2.push({
                    $or: [
                        { name: { $regex: ".*" + s + ".*" } },
                        { lastName: { $regex: ".*" + s + ".*" } },
                    ],
                });
            }

            // console.log("qr", JSON.stringify(qr));
            // console.log("onlySchool", onlySchool);

            let n = 0;
            let parent = [];
            let driver = [];
            let studentList = [];
            //
            do {
                const users = await this.Parent.find(
                    { $and: qr },
                    "phone name lastName"
                )
                    .skip(page * limit)
                    .limit(limit);
                // console.log("users",users.length);
                let onlyParent = [];
                for (var user of users) {
                    onlyParent.push(user.id);
                }
                const students = await this.Student.find(
                    {
                        $and: [
                            { parent: { $in: onlyParent } },
                            { school: { $in: onlySchool } },
                            { delete: false },
                        ],
                    },
                    "studentCode parent school address addressDetails location gradeTitle name lastName gender state serviceNum time"
                );
                //  console.log("agencyId",agencyId);
                // console.log("onlyParent",JSON.stringify(onlyParent));
                const drivers = await this.Driver.find(
                    {
                        $and: [{ agencyId: agencyId }, { $or: qr2 }],
                    },
                    "code name lastName state gradeTitle"
                );

                n = students.length;
                // console.log("students.length", students.length);
                // console.log("students", students);
                for (var s of students) {
                    let p = await this.Parent.findById(s.parent, "phone");
                    // console.log("parent", p);
                    if (p) {
                        studentList.push({
                            ...s._doc,
                            parentPhone: p.phone,
                            stateTitle: s.stateTitle,
                        });
                    }
                }
                for (var p of users) {
                    parent.push({
                        ...p._doc,
                        stateTitle: p.stateTitle,
                    });
                }
                for (var p of drivers) {
                    driver.push({
                        ...p._doc,
                        stateTitle: p.stateTitle,
                    });
                }
                page += limit;
            } while (n === limit);

            return this.response({
                res,
                data: { studentList, parent, driver },
            });
        } catch (error) {
            console.error("Error in searchInMyUser:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async moreInfoStudent(req, res) {
        try {
            // if (req.query.agencyId === undefined || req.query.agencyId.trim() === "") {
            //   return this.response({
            //     res,
            //     code: 214,
            //     message: "agencyId need",
            //   });
            // }
            if (
                req.query.schoolId === undefined ||
                req.query.serviceNum === undefined ||
                req.query.id === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "schoolId serviceNum id need",
                });
            }

            const serviceNum = parseInt(req.query.serviceNum);
            const schoolId = ObjectId.createFromHexString(req.query.schoolId);
            const id = ObjectId.createFromHexString(req.query.id);
            // const address = ObjectId.createFromHexString(req.query.address)
            const student = await this.Student.findById(
                id,
                "address location addressDetails"
            );

            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }
            const address = {
                route: student.address,
                details: student.addressDetails,
                lat: student.location.coordinates[0],
                lng: student.location.coordinates[1],
            };
            const school = await this.School.findById(
                schoolId,
                "name genderTitle districtTitle address location.coordinates schoolTime"
            );
            let service;
            let lastAct;
            if (serviceNum != 0) {
                service = await this.Service.findOne(
                    { serviceNum },
                    "serviceNum distance cost driverPic driverName driverCar driverCarPelak driverPhone time"
                );
                lastAct = await this.DriverAct.findOne({
                    serviceId: serviceNum,
                }).sort({
                    _id: -1,
                });
            }

            return this.response({
                res,
                data: { address, school, service, lastAct },
            });
        } catch (error) {
            console.error("Error in moreInfoStudent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverFilters(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const bed = req.query.bed ?? "";
            const service = req.query.service ?? "";
            const doc = req.query.doc ?? "";
            const from = req.query.from ?? "";
            const to = req.query.to ?? "";

            let kol = "004";
            let moeen = "006";

            var qr = [];
            if (doc === "1") {
                qr.push({
                    pic: { $ne: "" },
                    drivingLicence: { $ne: "" },
                    dLicencePic: { $ne: "" },
                });
            } else if (doc === "2") {
                qr.push({
                    $or: [
                        { pic: "" },
                        { drivingLicence: "" },
                        { dLicencePic: "" },
                    ],
                });
            }
            if (from != "") {
                const start = Date.parse(from);
                qr.push({ createdAt: { $gte: start } });
            }
            if (to != "") {
                const start = Date.parse(to);
                qr.push({ createdAt: { $lte: start } });
            }
            qr.push({ delete: false });
            qr.push({ agencyId });
            let allDrivers = await this.Driver.find(
                { $and: qr },
                "userId carId driverCode createdAt moreData"
            );
            if (bed != "0") {
                let listToDel = [];
                for (var d in allDrivers) {
                    const code = kol + moeen + allDrivers[d].driverCode;
                    const result = await this.DocListSanad.aggregate([
                        {
                            $match: {
                                accCode: code,
                                agencyId: agencyId,
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                total: {
                                    $sum: {
                                        $subtract: ["$bed", "$bes"],
                                    },
                                },
                            },
                        },
                    ]);

                    // Extract the total value

                    const totalAmount =
                        result[0] === undefined ? 0 : result[0].total;
                    // console.log("allDrivers=", result[0]);
                    allDrivers[d].moreData = totalAmount;
                    if (bed === "1" && totalAmount >= 0) {
                        listToDel.push(d);
                    }
                    if (bed === "2" && totalAmount <= 0) {
                        listToDel.push(d);
                    }
                    if (bed === "3" && totalAmount > 0) {
                        listToDel.push(d);
                    }
                    if (bed === "4" && totalAmount < 0) {
                        listToDel.push(d);
                    }
                    if (bed === "5" && totalAmount === 0) {
                        listToDel.push(d);
                    }
                    // console.log("allDrivers=",allDrivers.length);
                }
                //remove list index from alldrivers
                _.pullAt(allDrivers, listToDel);
            }

            let drivers = [];
            for (var d of allDrivers) {
                const user = await this.User.findById(
                    d.userId,
                    "name lastName phone"
                );
                var qrCar = [];
                if (doc === "1") {
                    qrCar.push({
                        carModel: { $ne: "" },
                        colorCar: { $ne: "" },
                        pelak: { $ne: "" },
                    });
                } else if (doc === "2") {
                    qrCar.push({
                        $or: [
                            { carModel: "" },
                            { colorCar: "" },
                            { pelak: "" },
                        ],
                    });
                }
                qrCar.push({ _id: d.carId });
                const car = await this.Car.findOne(
                    { $and: qrCar },
                    "carModel colorCar pelak"
                );
                if (car) {
                    const serviceCount = await this.Service.countDocuments({
                        driverId: d.id,
                    });
                    if (service === "1" && serviceCount > 0) {
                        drivers.push({
                            user,
                            car,
                            driverCode: d.driverCode,
                            createdAt: d.createdAt,
                            remain: d.moreData,
                            serviceCount,
                        });
                    } else if (service === "2" && serviceCount === 0) {
                        drivers.push({
                            user,
                            car,
                            driverCode: d.driverCode,
                            createdAt: d.createdAt,
                            remain: d.moreData,
                            serviceCount,
                        });
                    } else if (service === "0" || service === "") {
                        drivers.push({
                            user,
                            car,
                            driverCode: d.driverCode,
                            createdAt: d.createdAt,
                            remain: d.moreData,
                            serviceCount,
                        });
                    }
                }
            }

            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error in driverFilters:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentFilters(req, res) {
        try {
            if (
                req.body.agencyId === undefined ||
                req.body.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            let kol = "003";
            let moeen = "005";
            const bed = req.body.bed ?? "";
            const stateS = req.body.state ?? "-1";
            const schoolS = req.body.school ?? "";
            const gradeS = req.body.grade ?? "0";
            const from = req.body.from ?? "";
            const to = req.body.to ?? "";
            const serviceNums = req.body.serviceNums ?? [];

            const state = parseInt(stateS);
            const gradeId = parseInt(gradeS);
            const school =
                schoolS === "" ? null : ObjectId.createFromHexString(schoolS);

            var qr = [];
            if (state != -1) {
                qr.push({
                    state,
                });
            }
            if (gradeId != 0) {
                qr.push({
                    gradeId,
                });
            }
            if (serviceNums.length > 0) {
                qr.push({
                    serviceNum:{$in:serviceNums},
                });
            }
            if (school != null) {
                qr.push({
                    school,
                });
            } else {
                const onlySchool = await this.School.find(
                    { agencyId },
                    ""
                ).distinct("_id");
                qr.push({ school: { $in: onlySchool } });
            }
            qr.push({ delete: false });

            let allStudent = await this.Student.find(
                { $and: qr },
                "studentCode parent school gradeTitle name lastName state serviceNum serviceCost"
            );

            var studentFilter = [];
            if (bed != "0") {
                for (var d in allStudent) {
                    const code = kol + moeen + allStudent[d].studentCode;
                    const result = await this.DocListSanad.aggregate([
                        {
                            $match: {
                                accCode: code,
                                agencyId: agencyId,
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                total: {
                                    $sum: {
                                        $subtract: ["$bed", "$bes"],
                                    },
                                },
                            },
                        },
                    ]);

                    const totalAmount =
                        result[0] === undefined ? 0 : result[0].total;
                    let remove = false;
                    if (bed === "1" && totalAmount <= 0) {
                        remove = true;
                    }
                    if (bed === "2" && totalAmount >= 0) {
                        remove = true;
                    }
                    if (bed === "3" && totalAmount < 0) {
                        remove = true;
                    }
                    if (bed === "4" && totalAmount > 0) {
                        remove = true;
                    }
                    if (bed === "5" && totalAmount != 0) {
                        remove = true;
                    }
                    if (!remove) {
                        studentFilter.push({
                            student: allStudent[d],
                            remaining: totalAmount,
                        });
                    }
                }
            } else {
                for (var student of allStudent) {
                    studentFilter.push({ student, remaining: null });
                }
            }

            let std = [];
            if (from != "" || to != "") {
                var qr2 = [];
                if (from != "") {
                    const start = Date.parse(from);
                    qr2.push({ infoDate: { $gte: start } });
                }
                if (to != "") {
                    const end = Date.parse(to);
                    qr2.push({ infoDate: { $lte: end } });
                }
                qr2.push({ agencyId });
                qr2.push({ type: 2 });
                const checks = await this.CheckInfo.find(
                    { $and: qr2 },
                    "infoDate infoMoney desc"
                );
                var codes = [];
                for (var st of studentFilter) {
                    codes.push(kol + moeen + st.student.studentCode);
                }
                for (var check of checks) {
                    const checkInfo = await this.CheckHistory.findOne(
                        {
                            infoId: check.id,
                            fromAccCode: { $in: codes },
                        },
                        "fromAccCode money sanadNum"
                    );
                    if (checkInfo) {
                        for (var st of studentFilter) {
                            if (
                                kol + moeen + st.student.studentCode ===
                                checkInfo.fromAccCode
                            ) {
                                std.push({ st, check: { check, checkInfo } });
                            }
                        }
                    }
                }
            } else {
                for (var st of studentFilter) {
                    std.push({ st, check: null });
                }
            }
            var students = [];
            for (var st of std) {
                const user = await this.Parent.findById(
                    st.st.student.parent,
                    "name lastName phone"
                );
                students.push({
                    student: st.st.student,
                    check: st.check,
                    remain: st.st.remaining,
                    user,
                });
            }

            return this.response({
                res,
                data: students,
            });
        } catch (error) {
            console.error("studentFilters function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async moreInfoStudentByCode(req, res) {
        try {
            if (req.query.studentCode === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "studentCode name lastName need",
                });
            }
            const studentCode = req.query.studentCode;
            let student = await this.Student.findOne({ studentCode });

            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }

            const serviceNum = student.serviceNum;
            const schoolId = student.school;
            const address = {
                route: student.address,
                details: student.addressDetails,
                lat: student.location.coordinates[0],
                lng: student.location.coordinates[1],
            };
            const parent = await this.Parent.findById(
                student.parent,
                "name lastName phone"
            );
            const school = await this.School.findById(
                schoolId,
                "name genderTitle districtTitle address location.coordinates schoolTime"
            );
            let service;
            let lastAct;
            if (serviceNum != 0) {
                service = await this.Service.findOne(
                    { serviceNum },
                    "serviceNum distance cost driverPic driverName driverCar driverCarPelak driverPhone time"
                );
                lastAct = await this.DriverAct.findOne({
                    serviceId: serviceNum,
                }).sort({
                    _id: -1,
                });
            }

            return this.response({
                res,
                data: { student, address, school, service, lastAct, parent },
            });
        } catch (error) {
            console.error("moreInfoStudentByCode function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverServiceById(req, res) {
        try {
            // if (req.query.agencyId === undefined || req.query.agencyId.trim() === "") {
            //   return this.response({
            //     res,
            //     code: 214,
            //     message: "agencyId need",
            //   });
            // }
            if (req.query.driverId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "driverId need",
                });
            }
            const driverId = ObjectId.createFromHexString(req.query.driverId);

            let services = await this.Service.find(
                { driverId: driverId, delete: false },
                "serviceNum distance driverSharing student routeSave active time cost"
            );

            for (var i in services) {
                let myStudents = [];

                for (var s in services[i].student) {
                    let studentInfo = {};
                    let student = await this.Student.findById(
                        services[i].student[s]
                    ).lean();
                    (studentInfo.studentCode = ""),
                        (studentInfo.gradeTitle = ""),
                        (studentInfo.name = ""),
                        (studentInfo.lastName = ""),
                        (studentInfo.fatherName = ""),
                        (studentInfo.physicalConditionDesc = ""),
                        (studentInfo.stateTitle = ""),
                        (studentInfo.parentName = ""),
                        (studentInfo.parentPhone = ""),
                        (studentInfo.schoolName = ""),
                        (studentInfo.active = true),
                        (studentInfo.isIranian = true),
                        (studentInfo.gender = 0),
                        (studentInfo.homeAddress = ""),
                        (studentInfo.schoolAddress = ""),
                        (studentInfo.shiftName = ""),
                        (studentInfo.shiftType = ""),
                        (studentInfo.parentId = ""),
                        (studentInfo.homeLat = 0),
                        (studentInfo.schoolLat = 0),
                        (studentInfo.homeLng = 0),
                        (studentInfo.schoolLng = 0),
                        (studentInfo.state = 0),
                        (studentInfo.serviceNum = 0),
                        (studentInfo.serviceDistance = 0),
                        (studentInfo.gradeId = 0);
                    if (student) {
                        studentInfo.studentCode = student.studentCode;
                        studentInfo.gradeTitle = student.gradeTitle;
                        studentInfo.name = student.name;
                        studentInfo.lastName = student.lastName;
                        studentInfo.fatherName = student.fatherName;
                        studentInfo.physicalConditionDesc =
                            student.physicalConditionDesc;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.active = student.active;
                        studentInfo.isIranian = student.isIranian;
                        studentInfo.gender = student.gender;
                        studentInfo.state = student.state;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.serviceNum = student.serviceNum;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.serviceDistance = student.serviceDistance;
                        studentInfo.gradeId = student.gradeId;
                        studentInfo.parentId = student.parent;
                    }
                    let school = await this.School.findById(
                        student.school,
                        "name location.coordinates schoolTime"
                    );
                    if (school) {
                        studentInfo.schoolName = school.name;
                        studentInfo.schoolAddress = school.address;
                        studentInfo.schoolLat = school.location.coordinates[0];
                        studentInfo.schoolLng = school.location.coordinates[1];
                        let shiftName = "",
                            shiftType = "";
                        if (school.schoolTime.length > student.time) {
                            shiftName = school.schoolTime[student.time].name;
                            shiftType =
                                school.schoolTime[student.time].start +
                                " " +
                                school.schoolTime[student.time].end;
                            var stt = "";
                            for (var t in school.schoolTime) {
                                if (t == student.time) continue;
                                if (shiftName === school.schoolTime[t].name) {
                                    stt +=
                                        " + " +
                                        school.schoolTime[t].start +
                                        " " +
                                        school.schoolTime[t].end +
                                        " " +
                                        school.schoolTime[t].shiftdayTitle;
                                }
                            }
                            if (stt != "") {
                                shiftType +=
                                    school.schoolTime[student.time]
                                        .shiftdayTitle + stt;
                            }
                        } else {
                            shiftName = school.schoolTime[0].name;
                            shiftType =
                                school.schoolTime[0].start +
                                " " +
                                school.schoolTime[0].end;
                        }
                        studentInfo.shiftName = shiftName;
                        studentInfo.shiftType = shiftType;
                    }
                    studentInfo.homeAddress =
                        student.address + " " + student.addressDetails;
                    studentInfo.homeLat = student.location.coordinates[0];
                    studentInfo.homeLng = student.location.coordinates[1];

                    let parent = await this.Parent.findById(
                        student.parent,
                        "name lastName phone"
                    );
                    if (parent) {
                        studentInfo.parentName =
                            parent.name + " " + parent.lastName;
                        studentInfo.parentPhone = parent.phone;
                    }
                    myStudents.push(studentInfo);
                }
                services[i].student = myStudents;

                // console.log("myStudents=",JSON.stringify(myStudents));
            }

            return this.response({
                res,
                data: services,
            });
        } catch (error) {
            console.error("driverServiceById function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async newApk(req, res) {
        try {
            var type = "info"; // default: "board" , enum:['board','ads','info']
            var takeAction = req.body.version,
                hashImage = "$@$newVersionFor$@$";
            hashImage = hashImage + req.body.type;
            let media = new this.Media({
                owner: req.user._id,
                ownerClub: req.user.club,
                title: req.body.versionName,
                takeAction,
                exp: req.body.exp,
                image: req.body.path,
                hashImage,
                type,
                publish: req.body.force,
            });
            await media.save();
            return res.status(200).json({
                message: "insert media successfully",
                data: media,
            });
        } catch (error) {
            console.error("newApk function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async addEditHasibanCo(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const active = req.body.active;
            if (active) {
                let agency = await this.Agency.findById(agencyId);
                const userAdmin = await this.User.findById(agency.admin);
                let user = await this.UserHa.findOne({
                    phone: userAdmin.phone,
                    coId: agency.id,
                });
                const lastCo = await this.Agency.find({}, "coNum")
                    .sort({
                        coNum: -1,
                    })
                    .limit(1);
                let coNum = 1000;
                if (lastCo.length > 0) {
                    coNum = lastCo[0].coNum + 1;
                }
                let role = await this.Role.findOne({
                    coId: agency.id,
                    roleId: 1,
                });
                if (!role) {
                    role = new this.Role({
                        name: "مدیر",
                        roleId: 1,
                        coId: agency.id,
                    });
                    await role.save();
                }

                var today = new Date();
                var nextMonth = new Date();
                nextMonth.setDate(today.getDate() + 30);
                if (agency.coNum === 0) {
                    agency.coNum = coNum;
                }

                agency.expire = nextMonth;
                agency.startPack = today;

                agency.activeHasiban = true;
                await agency.save();
                if (!user) {
                    user = new this.UserHa({
                        email: "",
                        phone: userAdmin.phone,
                        policeId: 1,
                        name: userAdmin.name + " " + userAdmin.lastName,
                        userName: userAdmin.userName,
                        password: userAdmin.password,
                        coId: agency.id,
                        coNum: agency.coNum,
                        roleId: role.id,
                        isAdmin: true,
                    });
                    const salt = await bcrypt.genSalt(10); // length of crypt
                    user.password = await bcrypt.hash(user.password, salt);

                    await user.save();
                } else {
                    user.coNum = agency.coNum;
                    await user.save();
                }
                var ip =
                    req.headers["x-forwarded-for"] ||
                    req.connection.remoteAddress;
                ip = ip.replace("::", "");

                return this.response({
                    res,
                    message: "successfully submitted",
                    data: { userName: user.userName, coNum },
                });
            }
            await this.Agency.findByIdAndUpdate(agencyId, {
                activeHasiban: false,
            });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("addEditHasibanCo function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getRule(req, res) {
        try {
            const agencyId = req.query.agencyId;
            let rules = null;
            if (!agencyId) {
                rules = await this.Rule.find();
            } else {
                rules = await this.Rule.find({ agencyId });
            }
            return this.response({
                res,
                message: "Retreived.",
                data: rules,
            });
        } catch (error) {
            console.error("Error while getting rules:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setRule(req, res) {
        try {
            const { agencyId, show, text, type } = req.body;

            let id = req.body.id == "0" ? null : req.body.id;
            const grade = req.body.grade || -1;

            if (id === null) {
                let newRule = new this.Rule({
                    agencyId,
                    rule: text,
                    show,
                    type,
                    grade,
                });
                await newRule.save();
                return this.response({
                    res,
                    message: "Successfuly created.",
                    data: newRule.id,
                });
            }
            await this.Rule.findByIdAndUpdate(id, {
                show,
                rule: text,
                type,
                grade,
            });

            return this.response({
                res,
                message: "Seccessfuly updated.",
                data: id,
            });
        } catch (err) {
            console.error("Error while setting rule:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async searchListAccForAdmin(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }
            let search = req.query.search || "";
            search = search.trim();
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);

            var qr = [];
            qr.push({ agencyId });
            qr.push({
                $or: [{ levelType: 0 }, { levelType: 3 }],
            });
            if (search.trim() != "") {
                qr.push({
                    $or: [
                        { accCode: { $regex: ".*" + search + ".*" } },
                        { accName: { $regex: ".*" + search + ".*" } },
                    ],
                });
            }

            const levelDets = await this.LevelAccDetail.find({ $and: qr });

            let sarafsl = [];
            for (var code of levelDets) {
                var qr2 = [];
                qr2.push({ agencyId });
                qr2.push({ enable: true });
                qr2.push({ codeLev3: code.accCode });
                const hesabs = await this.ListAcc.find(
                    { $and: qr2 },
                    "code codeLev1 codeLev2 codeLev3 groupId type nature levelEnd"
                );
                if (hesabs.length != 0) {
                    for (var hs of hesabs) {
                        const moeen = await this.LevelAccDetail.findOne(
                            { agencyId, accCode: hs.codeLev2 },
                            "accName"
                        );
                        const kol = await this.LevelAccDetail.findOne(
                            { agencyId, accCode: hs.codeLev1 },
                            "accName"
                        );
                        sarafsl.push({
                            code,
                            hs,
                            moeen: moeen.accName,
                            kol: kol.accName,
                        });
                    }
                }
            }

            return this.response({
                res,
                message: "ok",
                data: sarafsl,
            });
        } catch (error) {
            console.error("searchHesabByNameCode: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
