const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const persianDate = require("persian-date");
const axios = require("axios");
const neshan = process.env.NESHAN;

module.exports = new (class extends controller {

    async setSchool(req, res) {
        try {
            const id = req.body.id;
            const name = req.body.name;
            const grade = req.body.grade;
            // const districtId = req.body.districtId;
            // const districtTitle = req.body.districtTitle;
            const address = req.body.address;
            const location = req.body.location;
            const typeId = req.body.typeId;
            const typeTitle = req.body.typeTitle;
            const gender = req.body.gender;
            const genderTitle = req.body.genderTitle;
            const schoolTime = req.body.schoolTime;

            // console.log("schoolTime", schoolTime);
            // console.log("id", id);

            if (
                (req.user.isAgencyAdmin || req.user.isSupport) &&
                !req.user.isadmin &&
                id != 0
            ) {
                const myAgencys = await this.Agency.find({
                    $and: [
                        { delete: false, active: true },
                        {
                            $or: [
                                { admin: req.user._id },
                                { users: { $in: req.user._id } },
                            ],
                        },
                    ],
                }).distinct("_id");
                const onlySchool = await this.School.find({
                    agencyId: { $in: myAgencys },
                })
                    .lean()
                    .distinct("_id");
                let exist = false;
                for (var os of onlySchool) {
                    if (os.toString() === id.toString()) {
                        exist = true;
                        break;
                    }
                }
                if (!exist) {
                    return this.response({
                        res,
                        code: 400,
                        message: "you can't change this school",
                        data: {
                            fa_m: "شما نمی توانید این مدرسه را ویرایش کنید",
                        },
                    });
                }
            }

            let school;
            if (
                id === 0 ||
                id.toString().trim() === "" ||
                id.toString().trim() === "0"
            ) {
                school = new this.School({
                    name,
                    typeId,
                    typeTitle,
                    gender,
                    genderTitle,
                    grade,
                    districtId:0,
                    districtTitle:'',
                    address,
                    location: { type: "Point", coordinates: location },
                    schoolTime,
                });
                await school.save();
                return this.response({
                    res,
                    data: { id: school._id, code: school.code },
                });
            } else {
                school = await this.School.findByIdAndUpdate(id, {
                    code,
                    name,
                    typeId,
                    typeTitle,
                    gender,
                    genderTitle,
                    grade,
                    districtId:0,
                    districtTitle:'',
                    address,
                    location: { type: "Point", coordinates: location },
                    schoolTime,
                });
                return this.response({
                    res,
                    data: { id: school._id, code: school.code },
                });
            }
        } catch (error) {
            console.error("Error in setSchool:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async schoolList(req, res) {
        try {
            if (req.query.search === undefined) {
                return res.status(214).json({ msg: "search need" });
            }
            if (req.query.page === undefined) {
                return res.status(214).json({ msg: "page need" });
            }
            if (req.query.districtId === undefined) {
                return res.status(214).json({ msg: "districtId need" });
            }

            const agencyId = req.query.agencyId || 0;
            let limit = parseInt(req.query.limit) || 20;
            // console.log("limit",limit);
            const search = req.query.search.trim();
            let page = parseInt(req.query.page) || 0;
            const districtId = parseInt(req.query.districtId);
            if (limit < 1) limit = 1;

            const qr = [{ delete: false }];
            if (districtId !== 0) qr.push({ districtId });
            if (search !== "")
                qr.push({
                    $or: [
                        { code: { $regex: ".*" + search + ".*" } },
                        { name: { $regex: ".*" + search + ".*" } },
                    ],
                });

            let schools;
            if (agencyId !== 0) {
                qr.push({ agencyId: ObjectId.createFromHexString(agencyId) });
            }
            if (page === -40) {
                schools = await this.School.find({ $and: qr });
            } else {
                if (page < 0) page = 0;
                schools = await this.School.find({ $and: qr })
                    .sort({ name: 1, _id: 1 })
                    .skip(page * limit)
                    .limit(limit);
            }

            const schoolList = [];
            for (const school of schools) {
                let schoolOb = {};
                let gradeName = [];
                for (const gradeId of school.grade) {
                    try {
                        const grade = await this.Keys.findOne(
                            { id: gradeId },
                            "title"
                        );
                        if (grade) gradeName.push(grade.title);
                    } catch {
                        const grade = await this.Keys.findOne(
                            { keyId: gradeId },
                            "title"
                        );
                        if (grade) gradeName.push(grade.title);
                    }
                }
                school.grade = gradeName;

                if (school.admin !== null && req.user.isadmin) {
                    const user = await this.User.findById(
                        school.admin,
                        "phone userName active name lastName isSchoolAdmin"
                    );
                    schoolOb.user = user;
                }

                schoolOb.school = school;
                schoolList.push(schoolOb);
            }

            return this.response({
                res,
                message: "ok",
                data: schoolList,
            });
        } catch (error) {
            console.error("Error in schoolList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async nearSchoolList(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const maxDistance = req.body.maxDistance || 20000;
            let limit = req.body.limit || 10;
            // console.log("limit",limit);
            const search = req.body.search.trim();
            const location = req.body.location;
            let gradeId = req.body.gradeId ;
            console.log("req.body.gradeId=",req.body.gradeId)
            console.log("gradeId=",gradeId)
           
            const gradePreSchool=await this.Keys.findOne({titleEn:'Preschool'},'keyId').lean();
            const kindergarten=await this.Keys.findOne({titleEn:'kindergarten'},'keyId').lean();
             if (!gradePreSchool || !kindergarten) {
                return this.response({
                    res,
                    code: 404,
                    message: "gradePreSchool or kindergarten  is not find",
                });
            }
            gradeId=gradeId-gradePreSchool.keyId;
             if (gradeId < 0) {
                return this.response({
                    res,
                    code: 204,
                    message: "gradeId is not correct",
                });
            }
            
            const grade =
                gradeId === 0
                    ? kindergarten.keyId
                    : gradeId < 4
                    ? kindergarten.keyId+1
                    : gradeId < 7
                    ? kindergarten.keyId+2
                    : gradeId < 10
                    ? kindergarten.keyId+3
                    : kindergarten.keyId+4;
            let page = req.body.page || 0;
            const districtId = req.body.districtId || 0;
            if (limit < 1) limit = 1;
            if (page < 0) page = 0;

            const qr = [{ delete: false }];
            console.log("grade=",grade)
            if(grade<kindergarten.keyId+3){
                qr.push({grade});
            }else{
                 qr.push({grade:{$in:[kindergarten.keyId+3,kindergarten.keyId+4]}});
            }
            if (ObjectId.isValid(agencyId)) {
                // Check if agencyId is a valid ObjectId before using it
                qr.push({ agencyId: ObjectId.createFromHexString(agencyId) });
            }else{
                qr.push({ agencyId: {$ne:null} });
            }
            if (districtId !== 0) qr.push({ districtId });
            if (search !== "")
                qr.push({
                    $or: [
                        { code: { $regex: ".*" + search + ".*" } },
                        { name: { $regex: ".*" + search + ".*" } },
                    ],
                });

            const skipCount = page * limit;
            let schools = await this.School.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: location,
                        },
                        key: "location",
                        distanceField: "dist.calculated",
                        maxDistance: maxDistance,
                        spherical: true,
                    },
                },
                {
                    $match: { $and: qr },
                },
                { $sort: { "dist.calculated": 1 } },
                { $skip: skipCount },
                { $limit: limit },
            ]).exec();

            // Convert aggregation result to plain JS objects (lean)
            schools = schools.map((s) => ({ ...s }));
            for (let i in schools) {
                //dodo
                const schoolLoc = `${schools[i].location.coordinates[1]},${schools[i].location.coordinates[0]}`;
                const studentLoc = `${location[1]},${location[0]}`;
                const url = `${process.env.ROUTE_URL}/route/v1/driving/${studentLoc};${schoolLoc}?overview=full`;
                //  console.log("url", url);
                try {
                    const response = await axios.get(url);
                    if (response.status === 200) {
                        if (
                            response.data.code.toString().toLowerCase() === "ok"
                        ) {
                            schools[i].distance =
                                response.data.routes[0].distance;
                            schools[i].duration =
                                response.data.routes[0].duration;
                            schools[i].geometry =
                                response.data.routes[0].geometry;
                            console.log(
                                "distance",
                                response.data.routes[0].distance
                            );
                            // const directionUrl = `https://api.neshan.org/v4/direction/no-traffic?origin=${location}&destination=${schools[i].location.coordinates}`;
                            // const options = {
                            //     headers: { "Api-Key": neshan },
                            //     timeout: 9500,
                            // };
                            // const directionResponse = await axios.get(
                            //     directionUrl,
                            //     options
                            // );
                            //  console.log("neshan distance=", directionResponse.data.routes[0].legs[0].distance.value);
                            // console.log("overview_polyline",JSON.stringify(directionResponse.data));
                        }
                    }
                } catch (e) {
                    console.error("response", e);
                }

                let gradeName = [];
                for (const gradeId of schools[i].grade) {
                    try {
                        const grade = await this.Keys.findOne(
                            { id: gradeId },
                            "title"
                        );
                        if (grade) gradeName.push(grade.title);
                    } catch {
                        const grade = await this.Keys.findOne(
                            { keyId: gradeId },
                            "title"
                        );
                        if (grade) gradeName.push(grade.title);
                    }
                }
                schools[i].grade = gradeName;
            }

            // Sort schools by distance (ascending)
            schools.sort((a, b) => {
                if (a.distance === undefined) return 1;
                if (b.distance === undefined) return -1;
                return a.distance - b.distance;
            });

            return this.response({
                res,
                data: schools,
            });
        } catch (error) {
            console.error("Error in nearSchoolList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async schoolSimpleList(req, res) {
        try {
            if (req.query.agencyId && req.query.agencyId !== "") {
                const agencyId = req.query.agencyId;
                const myAgency = await this.Agency.findById(agencyId);
                if (!myAgency) {
                    return this.response({
                        res,
                        code: 404,
                        message: "not active agency",
                        data: { fa_m: "شرکت غیرفعال یا حذف شده" },
                    });
                }
                const schools = await this.School.find(
                    { delete: false, agencyId: myAgency._id },
                    "name"
                );
                return this.response({
                    res,
                    message: "ok",
                    data: schools,
                });
            }
            const schools = await this.School.find({ delete: false }, "name");
            return this.response({
                res,
                message: "ok",
                data: schools,
            });
        } catch (error) {
            console.error("Error in schoolSimpleList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async schoolById(req, res) {
        try {
            if (req.query.id === undefined) {
                return res.status(214).json({ msg: "id need" });
            }
            const school = await this.School.findById(req.query.id);
            if (!school) {
                return res.status(404).json({ msg: "school not find" });
            }

            // let gradeName = [];
            // for (const gradeId of school.grade) {
            //     try {
            //         const grade = await this.Keys.findOne(
            //             { id: gradeId },
            //             "title"p
            //         );
            //         if (grade) gradeName.push(grade.title);
            //         console.log("try",grade);
            //     } catch {
            //         const grade = await this.Keys.findOne(
            //             { keyId: gradeId },
            //             "title"
            //         );
            //         if (grade) gradeName.push(grade.title);
            //         console.log("catch",grade);
            //     }
            // }
            // school.grade = gradeName;

            return this.response({
                res,
                message: "ok",
                data: school,
            });
        } catch (error) {
            console.error("Error in schoolById:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteSchool(req, res) {
        try {
            if (req.query.id === undefined) {
                return res.status(214).json({ msg: "id need" });
            }
            const school = await this.School.findByIdAndUpdate(req.query.id, {
                delete: true,
            });
            return this.response({
                res,
                message: "ok",
                data: school,
            });
        } catch (error) {
            console.error("Error in deleteSchool:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setSchoolTeacher(req, res) {
        try {
            const schoolId = req.body.schoolId;
            const teacherId = req.body.teacherId;
            const school = await this.School.findById(schoolId);
            if (!school) {
                return this.response({
                    res,
                    code: 404,
                    message: "School not found",
                    data: { fa_m: "مدرسه پیدا نشد" },
                });
            }

            if (school.teachers.includes(teacherId)) {
                return this.response({
                    res,
                    code: 200,
                    message: "Teacher already added",
                    data: { fa_m: "معلم قبلا اضافه شده است" },
                });
            }

            school.teachers.push(teacherId);
            await school.save();
            return this.response({
                res,
                data: school,
            });
        } catch (error) {
            console.error("Error in setSchoolTeacher:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    // async getAllShiftsSimple(req, res) {
    //     try {
    //         let shifts = await this.Shifts.find({ delete: false }, "name type");
    //         return this.response({
    //             res,
    //             message: "ok",
    //             data: shifts,
    //         });
    //     } catch (error) {
    //         console.error("Error in getAllShiftsSimple:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async unselectedSchools(req, res) {
        try {
            const {
                search = "",
                page = 0,
                agencyLocation
            } = req.body;

            // Build query conditions
            const conditions = {
                delete: false,
                agencyId:null,
            };

            // Add search conditions if provided
            if (search && search.trim() !== "") {
                conditions.name= { $regex: ".*" + search + ".*" } ;
            }
            const maxDistance = req.body.maxDistance || 50000;
            let schools = await this.School.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: "Point",
                            coordinates: agencyLocation,
                        },
                        key: "location",
                        distanceField: "dist.calculated",
                        maxDistance: maxDistance,
                        spherical: true,
                    },
                },
                {
                    $match:  conditions ,
                },
                { $sort: { "dist.calculated": 1 } },
                { $skip: (page * 40) },
                { $limit: 40 },
            ]).exec();
            // // Fetch schools
            // const schools = await this.School.find(conditions)
            //     .select(
            //         "_id code name typeTitle address location.coordinates districtId districtTitle gender"
            //     )
            //     .skip(page * 40)
            //     .limit(40);

            return this.response({
                res,
                message: "ok",
                data: schools,
            });
        } catch (error) {
            console.error("Error in unselectedSchools:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async agencySchoolList(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.toString() === ""
            ) {
                return this.response({
                    res,
                    code: 404,
                    message: "agencyId need",
                });
            }
            const agencyId = req.query.agencyId;
            let onlySchool = [];
            const myAgency = await this.Agency.findById(
                agencyId,
                "delete active"
            );

            if (!myAgency || myAgency.delete || !myAgency.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "not active agency",
                    data: { fa_m: "شرکت غیرفعال یا حذف شده" },
                });
            }
            // myAgency.schools.forEach((scId) => {
            //   onlySchool.push(scId);
            // });

            const schls = await this.School.find({
                delete: false,
                agencyId: myAgency._id,
            }).lean();

            for (var i of schls) {
                onlySchool.push(i._id);
            }
            // console.log("onlySchool", onlySchool);

            let schools = await this.School.find(
                { $and: [{ _id: { $in: onlySchool } }, { delete: false }] },
                "_id code name typeTitle address location.coordinates districtId districtTitle schoolTime gender genderTitle shifts grade active"
            );
            // console.log("schools", schools);
            for (var j = 0; j < schools.length; j++) {
                let school = schools[j];
                // console.log('shift',shift);
                let shiftName = [];
                // for (let i = 0; i < school.shifts.length; i++) {
                //   // console.log('shift.week',shift.week[i]);
                //   const shift = await this.Shifts.findById(school.shifts[i], "name type");
                //   let keyval = { id: shift.id, name: shift.name, type: shift.type };
                //   shiftName.push(keyval);
                // }
                schools[j].shifts = shiftName;
            }
            for (var j = 0; j < schools.length; j++) {
                let school = schools[j];
                // console.log('shift',shift);
                let gradeName = [];
                for (let i = 0; i < school.grade.length; i++) {
                    // console.log('shift.week',shift.week[i]);
                    try {
                        const grade = await this.Keys.findOne(
                            { id: school.grade[i] },
                            "title"
                        );
                        if (grade) gradeName.push(grade.title);
                    } catch {
                        const grade = await this.Keys.findOne(
                            { keyId: school.grade[i] },
                            "title"
                        );
                        if (grade) gradeName.push(grade.title);
                    }
                }
                schools[j].grade = gradeName;
            }

            return this.response({
                res,
                message: "ok",
                data: schools,
            });
        } catch (error) {
            console.error("Error in agencySchoolList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async addManagerToSchool(req, res) {
        try {
            const name = req.body.name.trim();
            const lastName = req.body.lastName.trim();
            const phone = req.body.phone.trim();
            const userSetForAdmin = req.body.userSetForAdmin;
            const schoolId = req.body.schoolId;
            const userName = req.body.userName.trim();
            const password = req.body.password.trim();

            const userTest = await this.User.findOne({
                userName: userName,
                phone: { $ne: phone },
            });

            if (userTest) {
                return this.response({
                    res,
                    code: 223,
                    message: "this userName is exist",
                    data: {
                        fa_m: "این نام کاربری تکراری است",
                        name: userTest.name,
                        lastName: userTest.lastName,
                    },
                });
            }
            let user = await this.User.findOne({ phone });
            if (user && !userSetForAdmin) {
                return this.response({
                    res,
                    code: 221,
                    message: "this user is exist",
                    data: {
                        fa_m: "این کاربر وجود دارد برای تنظیم برای این کاربر userSetForAdmin را بفرستید",
                        name: user.name,
                        lastName: user.lastName,
                    },
                });
            }
            if (!user) {
                user = new this.User({
                    phone,
                    userName,
                    password,
                    isSchoolAdmin: true,
                    name,
                    lastName,
                });
                await user.save();
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );
            } else if (!user.isSchoolAdmin) {
                user.isSchoolAdmin = true;
                await user.save();
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );
            }
            if (
                isEmpty(user.userName) ||
                user.userName === phone ||
                isEmpty(user.password)
            ) {
                user.userName = userName;
                user.password = password;
                await user.save();
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );
            }
            await this.School.findByIdAndUpdate(schoolId, { admin: user.id });

            return this.response({
                res,
                data: user,
            });
        } catch (error) {
            console.error("Error in addManagerToSchool:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async checkSchoolTime(req, res) {
        try {
            if (
                req.query.schoolId === undefined ||
                req.query.schoolId === "" ||
                req.query.time === undefined
            ) {
                this.response({
                    res,
                    code: 204,
                    message: "schoolId time need!",
                });
                return;
            }
            const school = ObjectId.createFromHexString(req.query.schoolId);
            const time = parseInt(req.query.time);
            const count = await this.Student.countDocuments({
                school,
                time: { $gte: time },
                delete: false,
            });
            let st = [];
            if (count > 0) {
                st = await this.Student.find(
                    { school, time: { $gte: time }, delete: false },
                    "studentCode -_id"
                ).limit(10);
            }
            // console.log("st checkSchoolTime", st);

            this.response({
                res,
                data: count,
            });
            return;
        } catch (error) {
            console.error("Error in checkSchoolTime:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async checkStudentContract(req, res) {
        try {
            if (
                req.query.studentId === undefined ||
                req.query.studentId.trim() === "" ||
                req.query.agencyId === undefined
            ) {
                return this.response({
                    res,
                    code: 204,
                    message: "studentId agencyId need!",
                });
            }
            const { studentId, agencyId } = req.query;
            const signedContract = await this.SignedContract.findOne({
                studentId,
            });
            if (signedContract) {
                return this.response({
                    res,
                    code: 201,
                    message: "Student sing is exist",
                    data: null,
                });
            }
            const contractText = await this.ContractText.findOne({
                agencyId,
                active: true,
            });
            if (!contractText) {
                return this.response({
                    res,
                    code: 404,
                    message: "contractText not found.",
                });
            }
            const student = await this.Student.findById(studentId).lean();
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "Student not found.",
                });
            }
            if (student.delete || !student.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "Student not found.",
                });
            }

            const service = await this.Service.findOne({
                student: studentId,
                delete: false,
            }).lean();
            if (!service && contractText.needService) {
                return this.response({
                    res,
                    code: 404,
                    message: "Service not found.",
                });
            }

            const user = await this.Parent.findById(student.parent).lean();
            if (!user) {
                return this.response({
                    res,
                    code: 404,
                    message: "User not found.",
                });
            }
            if (user.delete || !user.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "user not found.",
                });
            }

            const school = await this.School.findById(student.school).lean();
            if (!school) {
                return this.response({
                    res,
                    code: 404,
                    message: "School not found.",
                });
            }

            const grade = await this.Keys.findOne({
                keyId: student.gradeId,
            }).lean();
            if (!grade) {
                return this.response({
                    res,
                    code: 404,
                    message: "grade not found.",
                });
            }
            const persian_date = calculateMonthsAndDays(
                student.startOfContract,
                student.endOfContract
            );

            const data = {
                agencyId: agencyId,
                userId: user._id,
                studentId: studentId,
                parentName: `${user.name} ${user.lastName}`,
                parentFirstName: user.name,
                parentLastName: user.lastName,
                parentPhone: user.phone,
                parentNationalCode: user.nationalCode,
                address: student.address,
                studentName: `${student.name} ${student.lastName}`,
                studentFirstName: student.name,
                studentLastName: student.lastName,
                studentGrade: grade.title,
                studentNationalCode: student.nationalCode,
                schoolName: school.name,
                schoolId: school._id,
                contractStart: persian_date.start,
                contractEnd: persian_date.end,
                contractMonths: persian_date.months,
                contractDays: persian_date.days,
                serviceCost: service ? service.cost * persian_date.months : 0,
                serviceCostMonth: service ? service.cost : 0,
                serviceNum: service ? service.serviceNum : 0,
                driverName: service ? service.driverName : "",
                driverPhone: service ? service.driverPhone : "",
                driverCar: service ? service.driverCar : "",
                text: "",
            };
            data.text = replacePlaceholders(contractText.text, data);

            return this.response({
                res,
                data,
            });
        } catch (error) {
            console.error("Error getting studentInfo:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
    async setStudentSign(req, res) {
        try {
            const { pic, data } = req.body;

            await new this.SignedContract({
                agencyId: data.agencyId,
                userId: req.user._id,
                studentId: data.studentId,
                schoolId: data.schoolId,
                parentName: data.parentName,
                parentFirstName: data.parentFirstName,
                parentLastName: data.parentLastName,
                parentPhone: data.parentPhone,
                parentNationalCode: data.parentNationalCode,
                address: data.address,
                studentName: data.studentName,
                studentFirstName: data.studentFirstName,
                studentLastName: data.studentLastName,
                studentGrade: data.studentGrade,
                studentNationalCode: data.studentNationalCode,
                schoolName: data.schoolName,
                contractStart: data.contractStart,
                contractEnd: data.contractEnd,
                contractMonths: data.contractMonths,
                contractDays: data.contractDays,
                serviceCost: data.serviceCost,
                serviceCostMonth: data.serviceCostMonth,
                serviceNum: data.serviceNum,
                driverName: data.driverName,
                driverPhone: data.driverPhone,
                driverCar: data.driverCar,
                text: data.text,
                pic: pic,
            }).save();

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error getting setStudentSign:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
    async getCountSchoolContracts(req, res) {
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

            // const schools=await this.SignedContract.aggregate([{agencyId}]).distinct('schoolId');
            const schools = await this.SignedContract.aggregate([
                { $match: { agencyId } },
                // { $project: { schoolId: 1 } },
                {
                    $group: {
                        _id: "$schoolId",
                        count: { $sum: 1 },
                    },
                },
            ]);

            return this.response({
                res,
                data: schools,
            });
        } catch (error) {
            console.error("Error getting getSignContracts:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
})();
function calculateMonthsAndDays(start, end) {
    const startDate = new persianDate(new Date(start));
    const endDate = new persianDate(new Date(end));

    let startPersian = startDate.format("YYYY/MM/DD");
    startPersian = startPersian.replace(/[۰-۹]/g, (d) =>
        String.fromCharCode(d.charCodeAt(0) - 1728)
    );

    let endPersian = endDate.format("YYYY/MM/DD");
    endPersian = endPersian.replace(/[۰-۹]/g, (d) =>
        String.fromCharCode(d.charCodeAt(0) - 1728)
    );

    const diffInDays = endDate.diff(startDate, "days");

    let months = diffInDays / 30;

    if (months <= 9.2) {
        months = Math.floor(months);
    } else if (months >= 9.3 && months <= 9.7) {
        months = Math.round(months * 2) / 2;
    } else {
        months = Math.ceil(months);
    }

    return {
        start: startPersian,
        end: endPersian,
        months: parseFloat(months.toFixed(2)),
        days: diffInDays,
    };
}
function replacePlaceholders(text, data) {
    const regex = /\{(\w+)\}/g;

    return text.replace(regex, (_, key) => data[key] || `{${key}}`);
}
function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}
