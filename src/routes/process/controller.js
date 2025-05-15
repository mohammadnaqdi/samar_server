const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const persianDate = require("persian-date");

const neshan = process.env.NESHAN;
const axios = require("axios");
const { lte } = require("lodash");

const zonet = {
    1: 21,
    2: 22,
    3: 23,
    4: 24,
    5: 25,
    6: 26,
    7: 27,
    8: 28,
    9: 29,
};

const genderz = {
    1: 51,
    2: 52,
};

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = new (class extends controller {
    async register(phone, name, lastName, gender) {
        try {
            const newUser = new this.User({
                phone,
                userName: phone,
                password: phone,
                name,
                lastName,
                gender,
            });
            await newUser.save();
            await this.updateRedisDocument(
                `user:${newUser._id}`,
                newUser.toObject()
            );
            return newUser;
        } catch (error) {
            console.log("Error while registering user:", error);
        }
    }

    async sepandCheck(req, res) {
        const { list, schoolIDs } = req.body;

        try {
            let resp = [];

            for (const item of list) {
                let info = {};
                const user = await this.User.findOne({
                    phone: item.parentPhoneNumber,
                });

                if (user) {
                    const name = item.studentFirstName.trim();
                    const student = await this.Student.findOne({
                        parent: user._id,
                        name,
                    });

                    if (!student) {
                        const schoolName = item.schoolName;

                        const gender = genderz[item.studentGender];

                        const t = zonet[item.schoolZoneNumber];
                        if (t == undefined) {
                            info.stuentChecked = false;
                            info.schoolId = null;
                            info.userId = user._id;
                            resp.push(info);
                            continue;
                        }

                        if (schoolName.toString().includes(" ")) {
                            let peace = schoolName.toString().split(" ");
                            const regexPatterns = peace.map((p) => ({
                                name: new RegExp(`.*${escapeRegExp(p)}.*`),
                            }));

                            const schools = await this.School.find({
                                gender,
                                _id: { $in: schoolIDs },
                                districtId: t,
                                $or: regexPatterns,
                            });

                            if (schools.length === 0) {
                                info.stuentChecked = false;
                                info.schoolId = null;
                                info.userId = user._id;
                                resp.push(info);
                            } else if (schools.length === 1) {
                                info.stuentChecked = false;
                                info.schoolId = schools[0]._id;
                                info.userId = user._id;
                                resp.push(info);
                            } else {
                                info.stuentChecked = false;
                                info.schoolId = null;
                                info.userId = user._id;
                                resp.push(info);
                            }
                        } else {
                            const school = await this.School.find({
                                gender,
                                name: RegExp(`.*${schoolName}.*`),
                                _id: { $in: schoolIDs },
                                districtId: t,
                            });
                            if (school.length === 0) {
                                info.stuentChecked = false;
                                info.schoolId = null;
                                info.userId = user._id;
                                resp.push(info);
                                continue;
                            } else if (school.length === 1) {
                                info.stuentChecked = false;
                                info.schoolId = school[0]._id;
                                info.userId = user._id;
                                resp.push(info);
                                continue;
                            } else {
                                info.stuentChecked = false;
                                info.schoolId = null;
                                info.userId = user._id;
                                resp.push(info);
                                continue;
                            }
                        }
                    } else {
                        info.stuentChecked = true;
                        info.schoolId = student.school;
                        info.userId = user._id;
                        resp.push(info);
                        continue;
                    }
                } else {
                    const user_id = await this.register(
                        item.parentPhoneNumber,
                        item.parentFirstName,
                        item.parentLastName,
                        item.parentGender
                    );

                    const t = zonet[item.schoolZoneNumber];
                    if (t == undefined) {
                        info.stuentChecked = false;
                        info.schoolId = null;
                        info.userId = user_id._id;
                        resp.push(info);
                        continue;
                    }

                    const schoolName = item.schoolName;

                    const gender = genderz[item.studentGender];

                    if (schoolName.toString().includes(" ")) {
                        const peace = schoolName.toString().split(" ");
                        const regexPatterns = peace.map((p) => ({
                            name: new RegExp(`.*${escapeRegExp(p)}.*`),
                        }));

                        const schools = await this.School.find({
                            gender,
                            _id: { $in: schoolIDs },
                            districtId: t,
                            $or: regexPatterns,
                        });

                        if (schools.length === 0) {
                            info.stuentChecked = false;
                            info.schoolId = null;
                            info.userId = user_id._id;
                            resp.push(info);
                        } else if (schools.length === 1) {
                            info.stuentChecked = false;
                            info.schoolId = schools[0]._id;
                            info.userId = user_id._id;
                            resp.push(info);
                        } else {
                            info.stuentChecked = false;
                            info.schoolId = null;
                            info.userId = user_id._id;
                            resp.push(info);
                        }
                    } else {
                        const school = await this.School.find({
                            gender,
                            name: RegExp(`.*${schoolName}.*`),
                            _id: { $in: schoolIDs },
                            districtId: t,
                        });
                        if (school.length === 0) {
                            info.stuentChecked = false;
                            info.schoolId = null;
                            info.userId = user_id._id;
                            resp.push(info);
                            continue;
                        } else if (school.length === 1) {
                            info.stuentChecked = false;
                            info.schoolId = school._id;
                            info.userId = user_id._id;
                            resp.push(info);
                            continue;
                        } else {
                            info.stuentChecked = false;
                            info.schoolId = null;
                            info.userId = user_id._id;
                            resp.push(info);
                            continue;
                        }
                    }
                }
            }

            return this.response({
                res,
                data: resp,
            });
        } catch (error) {
            console.error("Error while checking sepand:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentPayState(req, res) {
        try {
            console.log(
                "use studentPayState in process user is",
                req.user.lastName
            );
            const { size, isOnline, isPaid, queueCode } = req.body;
            let page = req.body.page;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);

            let kol = "003";
            let moeen = "005";

            if (page < 0) page = 0;

            const queue = await this.PayQueue.findOne({ code: queueCode });

            if (!queue) {
                return this.response({
                    res,
                    code: 404,
                    message: "queue not find",
                    data: { fa_m: "پیدا نشد" },
                });
            }

            let schools = await this.School.find({ agencyId }).distinct("_id");
            if (queue.schools.length != 0) {
                schools = queue.schools;
            }

            const students = await this.Student.find(
                { delete: false, state: { $gt: 0 }, school: { $in: schools } },
                "studentCode parent name lastName state stateTitle serviceDistance"
            );
            console.log("isPaid", isPaid);
            if (!isPaid) {
                let list = [];
                for (var st of students) {
                    const payAction = await this.PayAction.find({
                        queueCode,
                        studentCode: st.studentCode,
                        delete: false,
                    });
                    if (payAction.length === 0) {
                        const pays = await this.PayAction.find({
                            studentCode: st.studentCode,
                            delete: false,
                        });
                        let remaining = 0;
                        const code = kol + moeen + st.studentCode;
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
                                    totalbed: { $sum: "$bed" },
                                    totalbes: { $sum: "$bes" },
                                },
                            },
                        ]);
                        // console.log("result[0]", result[0]);

                        remaining =
                            result[0] === undefined
                                ? 0
                                : result[0].totalbed - result[0].totalbes;
                        let payQueue = queue;
                        if (
                            payQueue.amount03 != -1 &&
                            payQueue.amount03 != undefined
                        ) {
                            if (st.serviceDistance <= 3000) {
                                payQueue.amount = payQueue.amount03;
                            } else if (st.serviceDistance <= 7000) {
                                payQueue.amount = payQueue.amount37;
                            } else {
                                payQueue.amount = payQueue.amount7i;
                            }
                        }
                        if (payQueue.type === 7 && remaining > 0) {
                            payQueue.amount =
                                (Math.abs(payQueue.amount) *
                                    Math.abs(remaining)) /
                                100;
                            payQueue.amount = financial(payQueue.amount);
                            // console.log("payQueue33.33.amount", payQueue.amount);
                        } else if (payQueue.amount < 0 && remaining < 0) {
                            payQueue.amount =
                                (Math.abs(payQueue.amount) *
                                    Math.abs(remaining)) /
                                100;
                            // console.log("payQueue2.amount", payQueue.amount);
                        }

                        const parent = await this.Parent.findById(
                            st.parent,
                            "phone"
                        );
                        list.push({
                            st,
                            pays,
                            phone: parent.phone,
                            amount: payQueue.amount,
                            title: payQueue.title,
                            remaining,
                        });
                    }
                }
                return this.response({
                    res,
                    message: "ok",
                    data: list,
                });
            }

            let list = [];
            for (var st of students) {
                const payAction = await this.PayAction.find({
                    queueCode,
                    studentCode: st.studentCode,
                    delete: false,
                    isOnline,
                });
                if (payAction.length > 0) {
                    const pays = await this.PayAction.find({
                        studentCode: st.studentCode,
                        delete: false,
                    });
                    const parent = await this.Parent.findById(
                        st.parent,
                        "phone"
                    );
                    list.push({ st, pays, phone: parent.phone });
                }
            }

            return this.response({
                res,
                message: "ok",
                data: list,
            });
        } catch (error) {
            console.error("Error in studentPayState:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentPayState2(req, res) {
        try {
            console.log(
                "use studentPayState2 in process user is",
                req.user.lastName
            );
            const { isOnline, isPaid, stateStart, stateEnd, schools, queues } =
                req.body;
            let page = req.body.page;
            let check = req.body.check || -1;
            if (page < 0) page = 0;
            const queue = await this.PayQueue.findOne({ code: queues[0] });
            if (!queue) {
                return this.response({
                    res,
                    code: 404,
                    message: "queue not find",
                    data: { fa_m: "پیدا نشد" },
                });
            }
            let kol = "003";
            let moeen = "005";

            const startDate = req.body.start;
            const endDate = req.body.end;
            let start = null,
                end = null;

            if (startDate) {
                start = Date.parse(startDate);
            }
            if (endDate) {
                end = Date.parse(endDate);
            }

            let querySt = {
                delete: false,
                state: { $gte: stateStart, $lte: stateEnd },
                school: { $in: schools },
            };
            if (check != -1) {
                querySt.check = check;
            }

            if (start && !end) {
                querySt.createdAt = { $gte: start };
            } else if (!start && end) {
                querySt.createdAt = { $lte: end };
            } else if (start && end) {
                querySt.createdAt = { $gte: start, $lte: end };
            }

            const students = await this.Student.find(
                querySt,
                "studentCode school parent name lastName state check createdAt serviceDistance"
            );

            if (!isPaid) {
                let list = [];
                for (var st of students) {
                    const payAction = await this.PayAction.countDocuments({
                        queueCode: { $in: queues },
                        studentCode: st.studentCode,
                        delete: false,
                    });
                    if (payAction === 0) {
                        const pays = await this.PayAction.find({
                            queueCode: { $in: queues },
                            studentCode: st.studentCode,
                            delete: false,
                        });
                        const parent = await this.Parent.findById(
                            st.parent,
                            "phone"
                        );
                        if (!parent) continue;

                        if (
                            queues.length === 1 &&
                            kol != "" &&
                            queue.type === 7
                        ) {
                            let remaining = 0;
                            const code = kol + moeen + st.studentCode;
                            const result = await this.DocListSanad.aggregate([
                                {
                                    $match: {
                                        accCode: code,
                                        agencyId: queue.agencyId,
                                    },
                                },
                                {
                                    $group: {
                                        _id: null,
                                        totalbed: { $sum: "$bed" },
                                        totalbes: { $sum: "$bes" },
                                    },
                                },
                            ]);
                            // console.log("result[0]", result[0]);
                            let amount = 0;

                            remaining =
                                result[0] === undefined
                                    ? 0
                                    : result[0].totalbed - result[0].totalbes;
                            let payQueue = queue;

                            if (Math.abs(remaining) < 10000) {
                                amount = 0;
                            } else {
                                if (remaining > 10000) {
                                    amount =
                                        (Math.abs(payQueue.amount) *
                                            Math.abs(remaining)) /
                                        100;
                                    amount = financial(amount);
                                    // console.log("payQueue33.33.amount", payQueue.amount);
                                } else {
                                    amount = 0;
                                    // console.log("payQueue2.amount", payQueue.amount);
                                }
                            }

                            // console.log("payQueue.amountxxxx", amount);
                            pays.push({
                                queueCode: payQueue.code,
                                amount: amount,
                                docSanadNum: 0,
                                desc: payQueue.desc,
                                isOnline: false,
                                studentCode: st.studentCode,
                                delete: false,
                                createdAt: new Date().toString(),
                                updatedAt: new Date().toString(),
                            });
                        }

                        list.push({ st, pays, phone: parent.phone });
                    }
                }
                return this.response({
                    res,
                    message: "ok",
                    data: list,
                });
            }

            let list = [];
            for (var st of students) {
                let qr = {
                    queueCode: { $in: queues },
                    studentCode: st.studentCode,
                    delete: false,
                };
                if (isOnline != null) {
                    qr.isOnline = isOnline;
                }
                const pays = await this.PayAction.find(qr);
                if (pays.length > 0) {
                    const parent = await this.Parent.findById(
                        st.parent,
                        "phone"
                    );
                    if (!parent) continue;
                    list.push({ st, pays, phone: parent.phone });
                }
            }

            return this.response({
                res,
                message: "ok",
                data: list,
            });
        } catch (error) {
            console.error("Error in studentPayState:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentListByIds(req, res) {
        try {
            const studentIds = req.body.studentIds;

            let students;

            // console.log(JSON.stringify(qr));
            students = await this.Student.find({
                _id: { $in: studentIds },
            }).lean();

            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const school = await this.School.findById(
                    students[i].school,
                    "name code schoolTime"
                );

                const parent = await this.Parent.findById(
                    students[i].parent,
                    "name lastName phone"
                );

                if (!parent) continue;
                if (!school) continue;

                let serviceCost = 0,
                    serviceDriverName = "",
                    serviceDriverId = "",
                    serviceDriverPic = "",
                    serviceDriverPelak = "",
                    serviceDriverPhone = "",
                    serviceDriverCar = "";
                if (students[i].serviceId != 0 && students[i].state === 4) {
                    const service = await this.Service.findOne(
                        {
                            serviceNum: students[i].serviceId,
                        },
                        "-routeSave -updatedAt -studentCost -percentInfo -createdAt"
                    );
                    if (service) {
                        serviceCost = service.cost;
                        serviceDriverName = service.driverName;
                        serviceDriverId = service.driverId;
                        serviceDriverPic = service.driverPic;
                        serviceDriverCar = service.driverCar;
                        serviceDriverPelak = service.driverCarPelak;
                        serviceDriverPhone = service.driverPhone;
                    }
                }

                let shiftName = "",
                    shiftType = "";
                if (school.schoolTime.length > students[i].time) {
                    shiftName = school.schoolTime[students[i].time].name;
                    shiftType =
                        school.schoolTime[students[i].time].start +
                        " " +
                        school.schoolTime[students[i].time].end;
                    var stt = "";
                    for (var t in school.schoolTime) {
                        if (t == students[i].time) continue;
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
                            school.schoolTime[students[i].time].shiftdayTitle +
                            stt;
                    }
                } else {
                    shiftName = school.schoolTime[0].name;
                    shiftType =
                        school.schoolTime[0].start +
                        " " +
                        school.schoolTime[0].end;
                }

                let moreInfo = {
                    serviceCost: serviceCost,
                    serviceDriverName: serviceDriverName,
                    serviceDriverId: serviceDriverId,
                    serviceDriverPic: serviceDriverPic,
                    serviceDriverCar: serviceDriverCar,
                    serviceDriverPelak: serviceDriverPelak,
                    serviceDriverPhone: serviceDriverPhone,
                    schoolName: school.name,
                    schoolCode: school.code,
                    address: students[i].address,
                    lat: students[i].location.coordinates[0],
                    lng: students[i].location.coordinates[1],
                    details: students[i],
                    addressDetails,
                    parentName: parent.name ?? "",
                    parentLastName: parent.lastName ?? "",
                    parentPhone: parent.phone ?? "",
                    shiftName: shiftName,
                    shiftType: shiftType,
                };
                myStudent.push({
                    student: students[i],
                    moreInfo: moreInfo,
                });
            }

            return this.response({
                res,
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00041:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setCheck(req, res) {
        try {
            if (
                req.query.id === undefined ||
                req.query.id.trim() === "" ||
                req.query.check === undefined ||
                req.query.check.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "check id need",
                });
            }
            const id = req.query.id;
            const check = parseInt(req.query.check);
            await this.Student.findByIdAndUpdate(id, { check });
            return this.response({
                res,
                message: "update successfully",
            });
        } catch (error) {
            console.error("Error while setting user name:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setStudent(req, res) {
        try {
            let id = req.body.id;
            if (!ObjectId.isValid(id)) {
                id = 0;
            }
            let agencyId = req.body.agencyId;
            const name = req.body.name;
            const lastName = req.body.lastName;
            const submitId = req.user._id;
            const school = req.body.school;
            const gradeId = req.body.gradeId;
            const gradeTitle = req.body.gradeTitle;
            const fatherName = req.body.fatherName;
            const parentReleation = req.body.parentReleation;
            const addressText = req.body.addressText;
            const details = req.body.details;
            const location = req.body.location;
            const isIranian = req.body.isIranian;
            const gender = req.body.gender;
            const time = req.body.time;
            const parentId = req.body.parentId;
            const distanse = req.body.distanse || 0;
            const physicalCondition = req.body.physicalCondition;
            const physicalConditionDesc = req.body.physicalConditionDesc;
            const nationalCode = req.body.nationalCode ?? "";
            let state = 0;
            // console.log("id ", id);
            // console.log("setStudent parentId", parentId);
            if (id === 0) {
                const studentCount = await this.Student.countDocuments({
                    parent: ObjectId.createFromHexString(parentId),
                    name,
                    lastName,
                });
                if (studentCount > 0) {
                    return this.response({
                        res,
                        code: 403,
                        message: "student is duplicated",
                    });
                }
            }

          
            let stateTitle = "ثبت شده";
            if (req.body.state != undefined) state = req.body.state;

            if (state === 1) {
                stateTitle = "در انتظار تایید اطلاعات";
            }
            if (state === 2) {
                stateTitle = "در انتظار پیش پرداخت";
            }
            if (state === 3) {
                stateTitle = "در انتظار سرویس";
            }
            const sch = await this.School.findById(
                school,
                "name location.coordinates admin"
            );
            if (!sch) {
                return this.response({
                    res,
                    code: 404,
                    message: "school not find",
                    data: { fa_m: "مدرسه پیدا نشد" },
                });
            }

            if (
                req.user.isSchoolAdmin &&
                sch.admin.toString() != submitId.toString()
            ) {
                return this.response({
                    res,
                    code: 402,
                    message: "access denaid",
                    data: { fa_m: "دسترسی ندارید" },
                });
            }
            let serviceDistance = 0;
            if (distanse === 0) {
                let origin = location[0] + "," + location[1];
                let dest = sch.location.coordinates[0] + "," + sch.location.coordinates[1];
                const url = `https://api.neshan.org/v4/direction/no-traffic?origin=${origin}&destination=${dest}`;

                const options = {
                    headers: {
                        "Api-Key": neshan,
                    },
                    timeout: 7700,
                };

                try {
                    const response = await axios.get(url, options);
                    console.log("neshan response=", response.data);
                    serviceDistance =
                        response.data.routes[0].legs[0].distance.value;
                    console.log("Neshan serviceDistance", serviceDistance);
                } catch (error) {
                    console.error("Neshan error=", error.message);
                    return this.response({
                        res,
                        code: 410,
                        message: "Neshan error",
                    });
                }
            } else {
                serviceDistance = distanse;
            }

            if (id === 0) {
                const student = new this.Student({
                    parent: parentId,
                    school,
                    time,
                    address: addressText,
                    addressDetails: details,
                    location: { type: "Point", coordinates: location },
                    gradeTitle,
                    gradeId,
                    name,
                    lastName,
                    fatherName,
                    gender,
                    parentReleation,
                    isIranian,
                    state,
                    stateTitle,
                    physicalConditionDesc,
                    physicalCondition,
                    serviceDistance,
                    time,
                    nationalCode,
                });
                await student.save();
                return this.response({
                    res,
                    data: { id: student._id, code: student.studentCode },
                });
            } else {
                const student = await this.Student.findByIdAndUpdate(
                    id,
                    {
                        parent: parentId,
                        school,
                        time,
                        address: addressText,
                        addressDetails: details,
                        location: { type: "Point", coordinates: location },
                        gradeTitle,
                        gradeId,
                        name,
                        lastName,
                        fatherName,
                        gender,
                        parentReleation,
                        isIranian,
                        serviceDistance,
                        time,
                        nationalCode,
                    },
                    { returnOriginal: false }
                );

                return this.response({
                    res,
                    data: { id: student._id, code: student.studentCode },
                });
            }
        } catch (error) {
            console.error("Error while setStudent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentCount(req, res) {
        try {
            const agencyId = req.query.agencyId;

            let onlySchool = [];

            if (
                (req.user.isAgencyAdmin || req.user.isSupport) &&
                !req.user.isadmin &&
                agencyId != "null" &&
                agencyId != null
            ) {
                console.log("agencyId", agencyId);
                if (agencyId != null) {
                    onlySchool = await this.School.find({ agencyId }).distinct(
                        "_id"
                    );
                } else {
                    const myAgency = await this.Agency.find(
                        {
                            $and: [
                                {
                                    $or: [
                                        { admin: req.user._id },
                                        { users: { $in: req.user._id } },
                                    ],
                                },
                            ],
                        },
                        ""
                    );
                    if (myAgency.length === 0) {
                        return this.response({
                            res,
                            code: 404,
                            message: "not any agency for you",
                            data: {
                                fa_m: "هیچ شرکت تاکسیرانی برای شما ثبت نیست",
                            },
                        });
                    }
                    for (var agency of myAgency) {
                        const ss = await this.School.find({
                            agencyId: agency._id,
                        }).distinct("_id");
                        onlySchool.push(ss);
                    }
                }

                if (onlySchool.length === 0) {
                    return this.response({
                        res,
                        message: "your school is empty for your company",
                        data: [],
                    });
                }
            }
            if (onlySchool.length === 0) {
                const stuState0 = await this.Student.countDocuments({
                    delete: false,
                    state: 0,
                });
                const stuState1 = await this.Student.countDocuments({
                    delete: false,
                    state: 1,
                });
                const stuState2 = await this.Student.countDocuments({
                    delete: false,
                    state: 2,
                });
                const stuState3 = await this.Student.countDocuments({
                    delete: false,
                    state: 3,
                });
                const stuState4 = await this.Student.countDocuments({
                    delete: false,
                    state: 4,
                });
                const stuState5 = await this.Student.countDocuments({
                    delete: false,
                    state: 5,
                });
                return this.response({
                    res,
                    message: "ok",
                    data: {
                        stuState0,
                        stuState1,
                        stuState2,
                        stuState3,
                        stuState4,
                        stuState5,
                    },
                });
            }

            const stuState0 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 0,
            });
            const stuState1 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 1,
            });
            const stuState2 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 2,
            });
            const stuState3 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 3,
            });
            const stuState4 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 4,
            });
            const stuState5 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 5,
            });
            return this.response({
                res,
                message: "ok",
                data: {
                    stuState0,
                    stuState1,
                    stuState2,
                    stuState3,
                    stuState4,
                    stuState5,
                },
            });
        } catch (error) {
            console.error("Error while studentCount:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentCountSchool(req, res) {
        try {
            const agencyId = req.body.agencyId;

            let onlySchool = req.body.schools || [];

            if (
                (req.user.isAgencyAdmin || req.user.isSupport) &&
                !req.user.isadmin &&
                agencyId != "null" &&
                agencyId != null &&
                onlySchool.length === 0
            ) {
                if (agencyId != null) {
                    onlySchool = await this.School.find({ agencyId }).distinct(
                        "_id"
                    );
                } else {
                    const myAgency = await this.Agency.find(
                        {
                            $and: [
                                {
                                    $or: [
                                        { admin: req.user._id },
                                        { users: { $in: req.user._id } },
                                    ],
                                },
                            ],
                        },
                        ""
                    );
                    if (myAgency.length === 0) {
                        return this.response({
                            res,
                            code: 404,
                            message: "not any agency for you",
                            data: {
                                fa_m: "هیچ شرکت تاکسیرانی برای شما ثبت نیست",
                            },
                        });
                    }
                    for (var agency of myAgency) {
                        const ss = await this.School.find({
                            agencyId: agency._id,
                        }).distinct("_id");
                        if (ss.length > 0) onlySchool.push(ss);
                    }
                }

                if (onlySchool.length === 0) {
                     return this.response({
                    res,
                    message: "ok",
                    data: {
                        stuState0:0,
                        stuState1:0,
                        stuState2:0,
                        stuState3:0,
                        stuState4:0,
                        stuState5:0,
                    },
                });
                }
            }
            if (onlySchool.length === 0) {
                const stuState0 = await this.Student.countDocuments({
                    delete: false,
                    state: 0,
                });
                const stuState1 = await this.Student.countDocuments({
                    delete: false,
                    state: 1,
                });
                const stuState2 = await this.Student.countDocuments({
                    delete: false,
                    state: 2,
                });
                const stuState3 = await this.Student.countDocuments({
                    delete: false,
                    state: 3,
                });
                const stuState4 = await this.Student.countDocuments({
                    delete: false,
                    state: 4,
                });
                const stuState5 = await this.Student.countDocuments({
                    delete: false,
                    state: 5,
                });
                return this.response({
                    res,
                    message: "ok",
                    data: {
                        stuState0,
                        stuState1,
                        stuState2,
                        stuState3,
                        stuState4,
                        stuState5,
                    },
                });
            }

            const stuState0 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 0,
            });
            const stuState1 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 1,
            });
            const stuState2 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 2,
            });
            const stuState3 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 3,
            });
            const stuState4 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 4,
            });
            const stuState5 = await this.Student.countDocuments({
                school: { $in: onlySchool },
                delete: false,
                state: 5,
            });
            return this.response({
                res,
                message: "ok",
                data: {
                    stuState0,
                    stuState1,
                    stuState2,
                    stuState3,
                    stuState4,
                    stuState5,
                },
            });
        } catch (error) {
            console.error("Error while studentCount:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async schoolReport(req, res) {
        try {
            const agencyIdR = req.query.agencyId;

            let agencyId = null;
            if (
                agencyIdR != undefined &&
                agencyIdR != null &&
                agencyIdR != ""
            ) {
                agencyId = ObjectId.createFromHexString(agencyIdR);
            } else {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }

            const schoolIDs = await this.School.find({ agencyId }).distinct(
                "_id"
            );

            const result = [];

            for (const id of schoolIDs) {
                let num = [];
                const resp = {};
                let driver = [];

                const school = await this.School.findById(id);
                if (!school) {
                    continue;
                }
                resp.id = school._id;
                resp.name = school.name;
                resp.gender = school.genderTitle;
                const grade = school.grade[0];
                if (grade != undefined) {
                    const key = await this.Keys.findOne({
                        keyId: grade,
                    });
                    if (key) {
                        resp.gradeTitle = key.title;
                    } else {
                        resp.gradeTitle = "";
                    }
                } else {
                    resp.gradeTitle = "";
                }

                const serviceDemands = await this.Student.find({
                    state: { $gt: 0 },
                    school: id,
                });

                resp.serviceDemands = serviceDemands.length;

                const orgStudents = await this.Student.find({
                    state: 4,
                    school: id,
                    delete: false,
                });

                const studentIDs = orgStudents.map((item) => item.id);

                for (const serv of studentIDs) {
                    const service = await this.Service.findOne({
                        student: serv,
                        delete: false,
                    });
                    if (!service) {
                        await this.Student.findByIdAndUpdate(serv, {
                            state: 3,
                            stateTitle: "سرویس حذف شده",
                        });
                        continue;
                    }
                    driver.push(service.driverId.toString());
                    num.push(service.serviceNum);
                }

                const set = [...new Set(num)];
                resp.service = set.length;
                const newset = [...new Set(driver)];
                resp.drivers = newset.length;
                resp.orgStudents = orgStudents.length;
                result.push(resp);
            }

            return this.response({
                res,
                data: result,
            });
        } catch (error) {
            console.error("Error while searching school:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverDDS(req, res) {
        try {
            const { driverId, start, end } = req.query;

            //mehr
            let startDate = new Date("2024-09-21T20:29:59.209Z");
            let endDate = new Date("2024-10-21T20:29:59.209Z");
            const sts = new Date(start);
            const month = sts.getMonth() + 1;

            switch (month) {
                case 10: //aban
                    startDate = new Date("2024-10-21T20:29:59.209Z");
                    endDate = new Date("2024-11-20T20:29:59.209Z");
                    break;
                case 11: //azar
                    startDate = new Date("2024-11-20T20:29:59.209Z");
                    endDate = new Date("2024-12-20T20:29:59.209Z");
                    break;
                case 12: //dey
                    startDate = new Date("2024-12-20T20:29:59.209Z");
                    endDate = new Date("2025-01-19T20:29:02.209Z");
                    break;
                case 1: //bahman
                    startDate = new Date("2025-01-19T20:29:59.209Z");
                    endDate = new Date("2025-02-18T20:29:02.209Z");
                    break;
                case 2: //esfand
                    startDate = new Date("2025-02-18T20:29:59.209Z");
                    endDate = new Date("2025-03-20T20:29:02.209Z");
                    break;
                case 3: //farvardin
                    startDate = new Date("2025-03-20T20:29:59.209Z");
                    endDate = new Date("2025-04-20T20:29:02.209Z");
                    break;
                case 4: //ordibehest
                    startDate = new Date("2025-04-20T20:29:59.209Z");
                    endDate = new Date("2025-05-21T20:29:02.209Z");
                    break;
                case 5: //khordad
                    startDate = new Date("2025-05-21T20:29:59.209Z");
                    endDate = new Date("2025-06-21T20:29:02.209Z");
                    break;
            }
            console.log("gggg= startDate", startDate);
            console.log("gggg=   endDate", endDate);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for start or end.",
                });
            }
            // console.log("startDate", startDate);
            // console.log("endDate", endDate);
            const report = await this.DDS.find(
                {
                    driverId,
                    createdAt: { $lte: endDate, $gte: startDate },
                },
                "-agencyId -driverId -name -phone"
            ).sort({ createdAt: 1 });
            console.log("report report.len", report.length);
            const studentIds = [];
            report.forEach((data) => {
                data.service.forEach((service) => {
                    service.students.forEach((student) => {
                        studentIds.push(student.id);
                    });
                });
            });

            let students = await this.Student.find(
                {
                    _id: { $in: studentIds },
                },
                "name lastName studentCode school pic"
            );

            for (var s in students) {
                const school = await this.School.findById(
                    students[s].school,
                    "name"
                );
                if (school) {
                    students[s].pic = school.name;
                }
            }

            const studentMap = {};
            students.forEach((student) => {
                studentMap[student._id] = student;
            });

            const final = JSON.parse(JSON.stringify(report));

            final.forEach((data, indexall) => {
                data.service.forEach((service, indexservice) => {
                    service.students.forEach((student, indexstd) => {
                        const std = studentMap[student.id];
                        if (std) {
                            final[indexall].service[indexservice].students[
                                indexstd
                            ] = {
                                ...final[indexall].service[indexservice]
                                    .students[indexstd],
                                name: `${std.name} ${std.lastName}`,
                                stCode: std.studentCode,
                                school: std.pic,
                            };
                        } else {
                            final[indexall].service[indexservice].students[
                                indexstd
                            ] = {
                                ...final[indexall].service[indexservice]
                                    .students[indexstd],
                                name: "Unknown",
                                stCode: "N/A",
                            };
                        }
                    });
                });
            });

            return this.response({
                res,
                data: final,
            });
        } catch (error) {
            console.error("Error while getting driver's DDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getAgencyDDS(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.start === undefined ||
                req.query.end === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId end start need",
                });
            }
            let { agencyId, start, end } = req.query;
            const activeString = req.query.onlyActive || "true";
            let onlyActive = true;
            if (activeString === "false") {
                onlyActive = false;
            }
            //mehr
            let startDate = new Date("2024-09-21T20:29:59.209Z");
            let endDate = new Date("2024-10-21T20:29:59.209Z");
            const st = new Date(start);
            const month = st.getMonth() + 1;

            switch (month) {
                case 10: //aban
                    startDate = new Date("2024-10-21T20:29:59.209Z");
                    endDate = new Date("2024-11-20T20:29:59.209Z");
                    break;
                case 11: //azar
                    startDate = new Date("2024-11-20T20:29:59.209Z");
                    endDate = new Date("2024-12-20T20:29:59.209Z");
                    break;
                case 12: //dey
                    startDate = new Date("2024-12-20T20:29:59.209Z");
                    endDate = new Date("2025-01-19T20:29:02.209Z");
                    break;
                case 1: //bahman
                    startDate = new Date("2025-01-19T20:29:59.209Z");
                    endDate = new Date("2025-02-18T20:29:02.209Z");
                    break;
                case 2: //esfand
                    startDate = new Date("2025-02-18T20:29:59.209Z");
                    endDate = new Date("2025-03-20T20:29:02.209Z");
                    break;
                case 3: //farvardin
                    startDate = new Date("2025-03-20T20:29:59.209Z");
                    endDate = new Date("2025-04-20T20:29:02.209Z");
                    break;
                case 4: //ordibehest
                    startDate = new Date("2025-04-20T20:29:59.209Z");
                    endDate = new Date("2025-05-21T20:29:02.209Z");
                    break;
                case 5: //khordad
                    startDate = new Date("2025-05-21T20:29:59.209Z");
                    endDate = new Date("2025-06-21T20:29:02.209Z");
                    break;
            }
            // let Difference_In_Time = endDate.getTime() - startDate.getTime();
            console.log("startDatexx", startDate);
            console.log("endDatexx", endDate);
            // // Calculating the no. of days between
            // // two dates
            // const days =
            //     Math.round(Difference_In_Time / (1000 * 3600 * 24)) + 1;
            // console.log("Difference_In_Days", days);
            // const pageS=req.query.page ||"0";
            // const limitS=req.query.limitS ||"20";
            // let limit=parseInt(limitS);
            // if(limit<1)limit=1;
            // let page=parseInt(pageS);
            // if(page<0)page=0;
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for start or end.",
                });
            }

            agencyId = ObjectId.createFromHexString(agencyId);

            let qr = {
                agencyId,
                createdAt: { $lte: endDate, $gte: startDate },
            };
            if (onlyActive) {
                qr.service = { $ne: [] };
            }

            let report = await this.DDS.aggregate([
                {
                    $match: qr,
                },
                {
                    $group: {
                        _id: "$driverId",
                        name: { $first: "$name" },
                        lastName: { $first: "$lastName" },
                        phone: { $first: "$phone" },
                        // totalServiceCount: { $first: { $size: "$service" } },
                        // studentCount: {
                        //     $first: {
                        //         $reduce: {
                        //             input: "$service",
                        //             initialValue: 0,
                        //             in: {
                        //                 $add: [
                        //                     "$$value",
                        //                     { $size: "$$this.students" },
                        //                 ],
                        //             },
                        //         },
                        //     },
                        // },
                        totalCost: { $sum: "$sc" },
                        totalDDS: { $sum: "$dds" },
                        dayCount: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        lastName: 1,
                        phone: 1,
                        totalCost: 1,
                        totalDDS: 1,
                        dayCount: 1,
                        desc: 1,
                    },
                },
            ]);
            for (var rp of report) {
                const driver = await this.Driver.findById(
                    rp._id,
                    "driverCode userId"
                ).lean();
                if (driver) {
                    const user = await this.User.findById(
                        driver.userId,
                        "name lastName"
                    ).lean();
                    if (user) {
                        rp.name = user.name + " " + user.lastName;
                        rp.lastName = "";
                    }
                    rp.desc = driver.driverCode;
                }
            }

            return this.response({
                res,
                data: report,
            });
        } catch (error) {
            console.error("Error while getting agency's DDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async editDDS(req, res) {
        try {
            const { id, dds, desc } = req.body;

            const doc = await this.DDS.findById(id);
            doc.status = "Edited";
            doc.desc = desc;
            doc.dds = dds;

            await doc.save();

            return this.response({
                res,
                message: "Edited.",
            });
        } catch (error) {
            console.error("Error while editing DDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAgencyDriverRemaining(req, res) {
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
            const activeString = req.query.onlyActive || "true";
            let onlyActive = true;
            if (activeString === "false") {
                onlyActive = false;
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            let qr = { agencyId, delete: false };
            if (onlyActive) {
                qr.active = true;
            }
            const drivers = await this.Driver.find(qr, "driverCode");
            let kol = "004";
            let moeen = "006";
            let remain = [];
            for (var d of drivers) {
                const code = kol + moeen + d.driverCode;
                let remaining = 0;
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
                            // totalbed: { $sum: '$bed' },
                            // totalbes: { $sum: '$bes' }
                            total: {
                                $sum: {
                                    $subtract: ["$bed", "$bes"],
                                },
                            },
                        },
                    },
                ]);
                // console.log("result[0]", result[0]);
                remaining = result[0] === undefined ? 0 : result[0].total;
                remain.push({
                    driverId: d._id,
                    driverCode: d.driverCode,
                    remaining,
                });

                // console.log("remaining remaining", remaining);
            }

            return this.response({
                res,
                data: remain,
            });
        } catch (error) {
            console.error("Error while getAgencyDriverRemaining:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getDriverRemainAndSalary(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.driverCode === undefined ||
                req.query.driverCode.trim() === "" ||
                req.query.month === undefined ||
                req.query.month.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId driverCode month need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            let driverCode = req.query.driverCode;
            if (mongoose.isValidObjectId(driverCode)) {
                const dr = await this.Driver.findById(driverCode, "driverCode");
                if (!dr) {
                    return this.response({
                        res,
                        code: 214,
                        message: " driverCode  need",
                    });
                }
                driverCode = dr.driverCode;
            }
            const month = parseInt(req.query.month);

            const month1000 = month + 10000;
            let kol = "004";
            let moeen = "006";

            const code = kol + moeen + driverCode;
            let remaining = 0;
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
                        // totalbed: { $sum: '$bed' },
                        // totalbes: { $sum: '$bes' }
                        total: {
                            $sum: {
                                $subtract: ["$bed", "$bes"],
                            },
                        },
                    },
                },
            ]);
            // console.log("result[0]", result[0]);
            remaining = result[0] === undefined ? 0 : result[0].total;
            console.log("remaining remaining", remaining);
            const sanads = await this.DocListSanad.find(
                {
                    $and: [
                        { agencyId: agencyId },
                        {
                            $or: [
                                { serviceNum: month },
                                { serviceNum: month1000 },
                            ],
                        },
                        { accCode: code },
                    ],
                },
                "doclistId serviceNum"
            );

            return this.response({
                res,
                data: { sanads, remaining },
            });
        } catch (error) {
            console.error("Error while getDriverRemainAndSalary:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverMonthSalary(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.month === undefined ||
                req.query.month.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId month need",
                });
            }
            const activeString = req.query.onlyActive || "true";
            let onlyActive = true;
            if (activeString === "false") {
                onlyActive = false;
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const month = parseInt(req.query.month);
            const month1000 = month + 10000;
            console.log("month1000", month1000);
            let qr = { agencyId, delete: false };
            if (onlyActive) {
                qr.active = true;
            }
            const drivers = await this.Driver.find(qr, "driverCode");
            let kol = "004";
            let moeen = "006";
            let remain = [];
            // console.log("month",month)
            // console.log("drivers",drivers.length)
            for (var d of drivers) {
                const code = kol + moeen + d.driverCode;
                // console.log("code",code)
                const sanads = await this.DocListSanad.find(
                    {
                        $and: [
                            { agencyId: agencyId },
                            {
                                $or: [
                                    { serviceNum: month },
                                    { serviceNum: month1000 },
                                ],
                            },
                            { accCode: code },
                        ],
                    },
                    "doclistId serviceNum"
                );
                for (var sanad of sanads) {
                    remain.push({
                        driverId: d._id,
                        driverCode: d.driverCode,
                        sanad,
                    });
                }
            }
            // console.log("remain",remain)

            return this.response({
                res,
                data: remain,
            });
        } catch (error) {
            console.error("Error while editing DDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async insertDDS(req, res) {
        try {
            const { driverId, date, dds } = req.body;
            const desc = req.body.desc || "";

            const driver = await this.Driver.findById(driverId);

            const user = await this.User.findById(driver.userId);

            await new this.DDS({
                agencyId: driver.agencyId,
                driverId,
                name: `${user.name} ${user.lastName}`,
                phone: user.phone,
                service: [],
                dds,
                desc,
                status: "Edited",
                createdAt: new Date(date),
            }).save();

            return this.response({
                res,
                message: "Created",
            });
        } catch (error) {
            console.error("Error while inserting dds:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getPricingTable(carId, districtId, grade) {
        const query = [
            { delete: false },
            {
                $or: [{ districtId }, { districtId: 0 }],
            },
            {
                $or: [{ gradeId: { $in: grade } }, { gradeId: 0 }],
            },
            carId ? { carId } : { carId: 0 },
        ];

        return this.PricingTable.find({ $and: query }, "kilometer price -_id")
            .sort({ kilometer: 1 })
            .lean();
    }

    async percent(agencyId) {
        try {
            const prec = await this.ListAcc.find({
                enable: true,
                agencyId,
                percent: { $gt: 0 },
            });
            let sum = 0;
            for (const d of prec) {
                sum += d.percent;
            }
            return sum;
        } catch (error) {
            console.error("Error while calculating driver share:", error);
            return null;
        }
    }

    async check(agencyId) {
        try {
            const services = await this.Service.find({
                delete: false,
                agencyId,
            }).lean();
            const studentIDs = services.flatMap((service) => service.student);

            const notFound = await this.DSC.find({
                studentId: { $nin: studentIDs },
            });

            if (notFound.length > 0) {
                const newDSCs = [];

                for (const nf of notFound) {
                    const check = await this.DSC.findOne({
                        studentId: nf.studentId,
                        dsc: 0,
                    })
                        .sort({ createdAt: -1 })
                        .lean();

                    if (check) {
                        continue;
                    }

                    newDSCs.push({
                        agencyId: nf.agencyId,
                        driverId: nf.driverId,
                        studentId: nf.studentId,
                        serviceId: nf._id,
                        serviceNum: nf.serviceNum,
                        dsc: 0,
                    });
                }

                if (newDSCs.length > 0) {
                    await this.DSC.insertMany(newDSCs);
                    console.log(
                        `${newDSCs.length} new DSC records created with which don't exist in services.`
                    );
                }
            }
        } catch (error) {
            console.error("Error while processing DSC records:", error);
        }
    }

    async resetDSC(req, res) {
        const { agencyId } = req.query;

        try {
            const services = await this.Service.find({
                agencyId,
                delete: false,
            }).lean();

            if (services.length == 0) {
                return this.response({
                    res,
                    message: "No new DSC records to save.",
                });
            }

            const dscPromises = services.map(async (service) => {
                const studentPromises = service.student.map(async (std) => {
                    const student = await this.Student.findById(std).lean();
                    if (!student) return null;

                    const existingDSC = await this.DSC.findOne({
                        studentId: std,
                    })
                        .sort({ createdAt: -1 })
                        .lean();

                    if (
                        existingDSC &&
                        existingDSC.agencyId.toString() ==
                            service.agencyId.toString() &&
                        existingDSC.driverId.toString() ==
                            service.driverId.toString() &&
                        existingDSC.serviceId.toString() ==
                            service._id.toString() &&
                        existingDSC.dsc ==
                            Math.round(
                                student.serviceCost / getMonth(new Date())
                            )
                    ) {
                        return null;
                    }

                    return {
                        agencyId: service.agencyId,
                        driverId: service.driverId,
                        studentId: std,
                        serviceId: service._id,
                        serviceNum: service.serviceNum,
                        dsc: Math.round(
                            student.serviceCost / getMonth(new Date())
                        ),
                    };
                });

                const dscInstancesForService = await Promise.all(
                    studentPromises
                );
                return dscInstancesForService.filter((dsc) => dsc !== null);
            });

            const allDSCInstances = (await Promise.all(dscPromises)).flat();

            if (allDSCInstances.length > 0) {
                await this.DSC.insertMany(allDSCInstances);
                return this.response({
                    res,
                    message: "DSC records saved successfully.",
                    data: {
                        dsc_count: allDSCInstances.length,
                    },
                });
            } else {
                return this.response({
                    res,
                    message: "No new DSC records to save.",
                });
            }
        } catch (error) {
            console.error("Error while resetting DSC:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        } finally {
            await this.check(agencyId);
        }
    }

    async resetDDS(req, res) {
        try {
            if (
                req.body.agencyId === undefined ||
                req.body.agencyId.trim() === "" ||
                req.body.start === undefined ||
                req.body.end === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId start end need",
                });
            }
            const { agencyId, start, end } = req.body;
            let driverIds = req.body.driverIds || [];

            let startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);
            let endDate = new Date(end);
            endDate.setHours(0, 0, 0, 0);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for start or end.",
                });
            }
            const startSearch = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate(),
                0,
                0,
                0
            );
            const endSearch = new Date(
                endDate.getFullYear(),
                endDate.getMonth(),
                endDate.getDate(),
                23,
                59,
                59
            );
            let qr = {
                agencyId,
                createdAt: {
                    $lte: endSearch,
                    $gte: startSearch,
                },
            };
            let driverObject = [];
            if (driverIds.length > 0) {
                for (var s of driverIds) {
                    driverObject.push(ObjectId.createFromHexString(s));
                }
                qr.driverId = { $in: driverObject };
            }
            console.log("resetDDS qr", qr);
            await this.DDS.deleteMany(qr);

            const daysDifference = Math.ceil(
                (endDate - startDate) / (24 * 60 * 60 * 1000)
            );
            let qr2 = {
                agencyId,
                delete: false,
            };
            if (driverObject.length > 0) {
                qr2._id = { $in: driverObject };
            }
            const drivers = await this.Driver.find(qr2, "userId agencyId");
            startDate = new Date(startDate.getTime() + 60 * 1000);

            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agencyId,
                targetIds: driverIds,
                targetTable: "driver",
                sanadId: 0,
                actionName: "resetDDS",
                actionNameFa: `بازنویسی کلی کارکرد راننده‌ها`,
                desc: `بازنویسی کلی هزینه راننده‌ها از تاریخ ${new persianDate(
                    startDate
                ).format("YY/MM/DD")} تا تاریخ ${new persianDate(
                    endDate
                ).format("YY/MM/DD")}`,
            }).save();

            await this.createDDS3(drivers, daysDifference, startDate);

            return this.response({
                res,
                message: "All DDSs saved",
            });
        } catch (error) {
            console.error("Error while resetting DDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async createDDS2(driverId, daysDifference, startDate, serviceNum) {
        const month = getMonth(startDate);
        console.log("month", month);
        const driver = await this.Driver.findById(driverId);

        if (!driver) return null;
        const user = await this.User.findById(driver.userId).lean();
        const name = `${user.name} ${user.lastName}`;
        const phone = user.phone;
        const setting = await this.AgencySet.findOne({
            agencyId: driver.agencyId,
        });
        let formula = "a-(a*(b/100))";
        let formulaForStudent = false;
        if (setting) {
            formula = setting.formula;
            formulaForStudent = setting.formulaForStudent;
        }
        const percent = await this.percent(driver.agencyId);
        console.log("daysDifference", daysDifference);
        for (let i = 0; i <= daysDifference; i++) {
            const day = getDateByOffset(startDate, i);
            const startOfDay = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                0,
                0,
                0
            );
            const endOfDay = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                23,
                59,
                59
            );
            // console.log("day", day);
            const services = await this.Service.find({
                driverId: driverId,
                delete: false,
            }).lean();
            let dds = 0;
            let sc = 0;
            const status = "Edited";
            const desc = "بازنویسی شده";

            const snum = [];

            let service = [];
            if (services.length !== 0) {
                for (let serv of services) {
                    let allStudents = serv.student.map((std, index) => ({
                        id: std,
                        cost: serv.studentCost[index],
                    }));
                    if (serviceNum === serv.serviceNum.toString()) {
                        const studentIds = serv.student;
                        console.log(" serv.studen", serv.student.length);
                        const studentDocs = await this.Student.find(
                            {
                                $and: [
                                    {
                                        _id: { $in: studentIds },
                                    },
                                    { delete: false },
                                    {
                                        $or: [
                                            { date: { $lte: day } },
                                            { date: undefined },
                                        ],
                                    },
                                ],
                            },
                            "serviceDistance serviceCost"
                        ).lean();
                        // console.log("studentDocs", studentDocs.length);
                        if (studentDocs.length === 0) {
                            allStudents = [];
                            serv.cost = 0;
                            serv.driverSharing = 0;
                        } else if (studentIds.length === studentDocs.length) {
                            sc += serv.cost;
                            dds += serv.driverSharing;
                        } else {
                            allStudents = [];
                            let serviceCost = 0;
                            for (var st of studentDocs) {
                                allStudents.push({
                                    id: st._id.toString(),
                                    cost: st.serviceCost,
                                });
                                serviceCost += st.serviceCost;
                            }
                            let driverShare = 0;
                            if (formulaForStudent) {
                                driverShare = reverseEvaluateFormula(
                                    serviceCost,
                                    percent,
                                    formula
                                );
                            } else {
                                driverShare = evaluateFormula(formula, {
                                    a: serviceCost,
                                    b: percent,
                                });
                            }
                            sc += serviceCost;
                            dds += driverShare;
                            serv.cost = serviceCost;
                            serv.driverSharing = driverShare;
                        }
                    } else {
                        console.log("serv.cost", serv.cost);
                        sc += serv.cost;
                        dds += serv.driverSharing;
                    }
                    snum.push(serv.serviceNum);
                    service.push({
                        num: serv.serviceNum,
                        serviceCost: serv.cost,
                        driverShare: serv.driverSharing,
                        students: allStudents,
                    });
                }
            }
            dds = dds / month;
            sc = sc / month;

            const change = await this.DriverChange.findOne({
                delete: false,
                agencyId: driver.agencyId,
                serviceNum: { $in: snum },
                createdAt: { $gte: startOfDay, $lte: endOfDay },
            });
            if (change) {
                status = "Absent";
            }

            const dd = new this.DDS({
                agencyId: driver.agencyId,
                driverId: driver._id,
                name,
                phone,
                service,
                dds,
                sc,
                status,
                desc,
                createdAt: day,
            });
            await dd.save();
        }
    }
    async editCreateDDS(req, driverId, daysDifference, startDate, serviceNum) {
        const month = getMonth(startDate);
        console.log("month", month);
        const driver = await this.Driver.findById(driverId);

        if (!driver) return null;
        const user = await this.User.findById(driver.userId).lean();
        const name = `${user.name} ${user.lastName}`;

        await new this.OperationLog({
            userId: req.user._id,
            name: req.user.name + " " + req.user.lastName,
            agencyId: driver.agencyId,
            targetIds: [driverId],
            targetTable: "driver",
            sanadId: 0,
            actionName: "editCreateDDS",
            actionNameFa: "تغییر کارکرد راننده در یک سرویس",
            desc: `تغییر کارکرد راننده ${name} در سرویس ${serviceNum} از تاریخ ${new persianDate(
                startDate
            ).format("YY/MM/DD")} به مدت ${daysDifference + 1} روز`,
        }).save();

        const phone = user.phone;
        const setting = await this.AgencySet.findOne({
            agencyId: driver.agencyId,
        });
        let formula = "a-(a*(b/100))";
        let formulaForStudent = false;
        if (setting) {
            formula = setting.formula;
            formulaForStudent = setting.formulaForStudent;
        }
        const percent = await this.percent(driver.agencyId);
        console.log("daysDifference", daysDifference);
        for (let d = 0; d <= daysDifference; d++) {
            const day = getDateByOffset(startDate, d);
            const startOfDay = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                0,
                0,
                0
            );
            const endOfDay = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                23,
                59,
                59
            );
            let ddsList = await this.DDS.find({
                createdAt: { $gte: startOfDay, $lte: endOfDay },
                driverId: driver._id,
            });
            for (var dd of ddsList) {
                await this.DDS.findByIdAndDelete(dd._id);
            }

            console.log("ddsList", ddsList);

            let dds = 0;
            let sc = 0;
            const status = "Edited";
            const desc = "بازنویسی شده در تغییر سرویس";

            const snum = [];
            if (ddsList.length === 0) {
                const services = await this.Service.find({
                    driverId: driverId,
                    delete: false,
                }).lean();
                const snum = [];
                let service = [];
                if (services.length !== 0) {
                    for (let serv of services) {
                        let allStudents = serv.student.map((std, index) => ({
                            id: std,
                            cost: serv.studentCost[index],
                        }));
                        if (serviceNum === serv.serviceNum.toString()) {
                            const studentIds = serv.student;
                            console.log(" serv.studen", serv.student.length);
                            const studentDocs = await this.Student.find(
                                {
                                    $and: [
                                        {
                                            _id: { $in: studentIds },
                                        },
                                        { delete: false },
                                        {
                                            $or: [
                                                { date: { $lte: day } },
                                                { date: undefined },
                                            ],
                                        },
                                    ],
                                },
                                "serviceDistance serviceCost"
                            ).lean();
                            // console.log("studentDocs", studentDocs.length);
                            if (studentDocs.length === 0) {
                                allStudents = [];
                                serv.cost = 0;
                                serv.driverSharing = 0;
                            } else if (
                                studentIds.length === studentDocs.length
                            ) {
                                sc += serv.cost;
                                dds += serv.driverSharing;
                            } else {
                                allStudents = [];
                                let serviceCost = 0;
                                for (var st of studentDocs) {
                                    allStudents.push({
                                        id: st._id.toString(),
                                        cost: st.serviceCost,
                                    });
                                    serviceCost += st.serviceCost;
                                }
                                let driverShare = 0;
                                if (formulaForStudent) {
                                    driverShare = reverseEvaluateFormula(
                                        serviceCost,
                                        percent,
                                        formula
                                    );
                                } else {
                                    driverShare = evaluateFormula(formula, {
                                        a: serviceCost,
                                        b: percent,
                                    });
                                }
                                sc += serviceCost;
                                dds += driverShare;
                                serv.cost = serviceCost;
                                serv.driverSharing = driverShare;
                            }
                        } else {
                            console.log("serv.cost", serv.cost);
                            sc += serv.cost;
                            dds += serv.driverSharing;
                        }
                        snum.push(serv.serviceNum);
                        service.push({
                            num: serv.serviceNum,
                            serviceCost: serv.cost,
                            driverShare: serv.driverSharing,
                            students: allStudents,
                        });
                    }
                }
                dds = dds / month;
                sc = sc / month;

                const change = await this.DriverChange.findOne({
                    delete: false,
                    agencyId: driver.agencyId,
                    serviceNum: { $in: snum },
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                });
                if (change) {
                    status = "Absent";
                }

                const dd = new this.DDS({
                    agencyId: driver.agencyId,
                    driverId: driver._id,
                    name,
                    phone,
                    service,
                    dds,
                    sc,
                    status,
                    desc,
                    createdAt: day,
                });
                await dd.save();
            } else {
                const serviceX = await this.Service.findOne({
                    serviceNum,
                });
                if (!serviceX) {
                    console.log("not find service in editdds");
                    return null;
                }
                let existService = false;
                for (var i in ddsList[0].service) {
                    if (
                        ddsList[0].service[i].num.toString() ===
                        serviceNum.toString()
                    ) {
                        for (var j in serviceX.student) {
                            let exist = false;
                            for (var s in ddsList[0].service[i].students) {
                                if (
                                    ddsList[0].service[i].students[s].id ===
                                    serviceX.student[j]
                                ) {
                                    ddsList[0].service[i].students[s].cost =
                                        serviceX.studentCost[j];
                                    exist = true;
                                    break;
                                }
                            }
                            if (!exist) {
                                ddsList[0].service[i].students.push({
                                    id: serviceX.student[j],
                                    cost: serviceX.studentCost[j],
                                });
                            }
                        }
                        let serviceCost = 0;
                        for (var s in ddsList[0].service[i].students) {
                            serviceCost +=
                                ddsList[0].service[i].students[s].cost;
                        }
                        let driverShare = 0;
                        if (formulaForStudent) {
                            driverShare = reverseEvaluateFormula(
                                serviceCost,
                                percent,
                                formula
                            );
                        } else {
                            driverShare = evaluateFormula(formula, {
                                a: serviceCost,
                                b: percent,
                            });
                        }
                        ddsList[0].service[i].serviceCost = serviceCost;
                        ddsList[0].service[i].driverShare = driverShare;
                        existService = true;
                        break;
                    }
                }
                if (!existService) {
                    let newService = {
                        num: parseInt(serviceNum),
                        students: [],
                    };
                    for (var j in serviceX.student) {
                        newService.students.push({
                            id: serviceX.student[j],
                            cost: serviceX.studentCost[j],
                        });
                    }
                    newService.serviceCost = serviceX.cost;
                    newService.driverShare = serviceX.driverSharing;
                    ddsList[0].service.push(newService);
                }
                dds = 0;
                sc = 0;
                for (var i in ddsList[0].service) {
                    dds += ddsList[0].service[i].driverShare;
                    sc += ddsList[0].service[i].serviceCost;
                }
                dds = dds / month;
                sc = sc / month;

                const change = await this.DriverChange.findOne({
                    delete: false,
                    agencyId: driver.agencyId,
                    serviceNum: { $in: snum },
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                });
                if (change) {
                    status = "Absent";
                }
                const dd = new this.DDS({
                    agencyId: driver.agencyId,
                    driverId: driver._id,
                    name,
                    phone,
                    service: ddsList[0].service,
                    dds,
                    sc,
                    status,
                    desc,
                    createdAt: day,
                });
                await dd.save();
            }
        }
    }

    async createDDS3(drivers, daysDifference, startDate) {
        const month = getMonth(startDate);
        console.log("month", month);

        for (var driver of drivers) {
            const user = await this.User.findById(
                driver.userId,
                "name lastName phone"
            ).lean();
            const name = `${user.name} ${user.lastName}`;
            const phone = user.phone;
            console.log("resetDDS name", name);
            const setting = await this.AgencySet.findOne({
                agencyId: driver.agencyId,
            });
            let formula = "a-(a*(b/100))";
            let formulaForStudent = false;
            if (setting) {
                formula = setting.formula;
                formulaForStudent = setting.formulaForStudent;
            }
            const percent = await this.percent(driver.agencyId);
            for (let i = 0; i <= daysDifference; i++) {
                const day = getDateByOffset(startDate, i);
                const startOfDay = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    0,
                    0,
                    0
                );
                const endOfDay = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    23,
                    59,
                    59
                );
                const services = await this.Service.find({
                    driverId: driver._id,
                    delete: false,
                }).lean();
                let dds = 0;
                let sc = 0;
                const status = "Edited";
                const desc = "بازنویسی شده";
                const snum = [];
                let service = [];
                if (services.length !== 0) {
                    for (let serv of services) {
                        let allStudents = serv.student.map((std, index) => ({
                            id: std,
                            cost: serv.studentCost[index],
                        }));
                        const studentIds = serv.student;
                        const studentDocs = await this.Student.find(
                            {
                                $and: [
                                    {
                                        _id: { $in: studentIds },
                                    },
                                    { delete: false },
                                    {
                                        $or: [
                                            { date: { $lte: day } },
                                            { date: undefined },
                                        ],
                                    },
                                ],
                            },
                            "serviceDistance serviceCost"
                        ).lean();
                        // console.log("studentDocs", studentDocs.length);
                        if (studentDocs.length === 0) {
                            allStudents = [];
                            serv.cost = 0;
                            serv.driverSharing = 0;
                        } else if (studentIds.length === studentDocs.length) {
                            sc += serv.cost;
                            dds += serv.driverSharing;
                        } else {
                            allStudents = [];
                            let serviceCost = 0;
                            for (var st of studentDocs) {
                                allStudents.push({
                                    id: st._id.toString(),
                                    cost: st.serviceCost,
                                });
                                serviceCost += st.serviceCost;
                            }
                            let driverShare = 0;
                            if (formulaForStudent) {
                                driverShare = reverseEvaluateFormula(
                                    serviceCost,
                                    percent,
                                    formula
                                );
                            } else {
                                driverShare = evaluateFormula(formula, {
                                    a: serviceCost,
                                    b: percent,
                                });
                            }
                            sc += serviceCost;
                            dds += driverShare;
                            serv.cost = serviceCost;
                            serv.driverSharing = driverShare;
                        }

                        snum.push(serv.serviceNum);
                        service.push({
                            num: serv.serviceNum,
                            serviceCost: serv.cost,
                            driverShare: serv.driverSharing,
                            students: allStudents,
                        });
                    }
                }
                dds = dds / month;
                sc = sc / month;

                const change = await this.DriverChange.findOne({
                    delete: false,
                    agencyId: driver.agencyId,
                    serviceNum: { $in: snum },
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                });
                if (change) {
                    status = "Absent";
                }

                const dd = new this.DDS({
                    agencyId: driver.agencyId,
                    driverId: driver._id,
                    name,
                    phone,
                    service,
                    dds,
                    sc,
                    status,
                    desc,
                    createdAt: day,
                });
                await dd.save();
            }
        }
        return;
    }

    async DDSBySchool(req, res) {
        try {
            let { school, start, end } = req.query;
            const startDate = new Date(start);
            const endDate = new Date(end);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for start or end.",
                });
            }

            const studentIDs = await this.Student.find({ school }).then(
                (item) => item.map((doc) => doc.id)
            );

            const report = await this.DDS.aggregate([
                {
                    $match: {
                        "service.students.id": { $in: studentIDs },
                        createdAt: { $lte: endDate, $gte: startDate },
                    },
                },
                {
                    $group: {
                        _id: "$driverId",
                        name: { $first: "$name" },
                        phone: { $first: "$phone" },
                        totalServiceCount: { $sum: { $size: "$service" } },
                        studentCount: {
                            $sum: {
                                $reduce: {
                                    input: "$service",
                                    initialValue: 0,
                                    in: {
                                        $add: [
                                            "$$value",
                                            { $size: "$$this.students" },
                                        ],
                                    },
                                },
                            },
                        },
                        totalDDS: { $sum: "$dds" },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        phone: 1,
                        serviceCount: "$totalServiceCount",
                        studentCount: 1,
                        totalDDS: 1,
                    },
                },
            ]);

            return this.response({
                res,
                data: report,
            });
        } catch (error) {
            console.error("Error while finding DDS by school:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async resetPrices(req, res) {
        try {
            const { agencyId } = req.query;

            const services = await this.Service.find({
                agencyId,
                delete: false,
            });

            if (!services.length) {
                return this.response({
                    res,
                    code: 404,
                    message: "No services found!",
                });
            }

            let servs = [];

            let count = 0;
            const bulkStudentUpdates = [];
            const bulkServiceUpdates = [];

            const percent = await this.percent(agencyId);
            const setting = await this.AgencySet.findOne({ agencyId });
            let formula = "a-(a*(b/100))";
            let forStudent = false;
            if (setting) {
                formula = setting.formula;
                forStudent = setting.formulaForStudent;
                // console.log("formula changed", formula);
            }
            // const type = setting.formulaForStudent
            //     ? "برای دانش آموز"
            //     : "برای راننده";

            for (const service of services) {
                const studentIds = service.student;

                const studentDocs = await this.Student.find(
                    { _id: { $in: studentIds } },
                    "serviceDistance"
                ).lean();

                const students = studentDocs.map((studentDoc) => ({
                    studentId: studentDoc._id,
                    studentDistance: studentDoc.serviceDistance,
                }));

                const [school, driver] = await Promise.all([
                    this.School.findById(
                        service.schoolId,
                        "districtId grade"
                    ).lean(),
                    this.Driver.findById(service.driverId, "carId").lean(),
                ]);

                if (!school || !driver) continue;

                const car = await this.Car.findById(
                    driver.carId,
                    "capacity"
                ).lean();
                if (!car) continue;

                const carId = car.capacity;
                const { districtId, grade } = school;

                let pricingTable = await this.getPricingTable(
                    carId,
                    districtId,
                    grade
                );

                if (!pricingTable.length) {
                    pricingTable = await this.getPricingTable(
                        0,
                        districtId,
                        grade
                    );
                }

                const pricing = calculate(pricingTable, students);
                let driverShare = 0;
                let overall = 0;
                let studentPrices = [];

                if (forStudent) {
                    studentPrices = pricing.map(
                        ({ studentId, studentPrice }) => {
                            const values = { a: studentPrice, b: percent };
                            const calculatedPrice = Math.floor(
                                evaluateFormula(formula, values)
                            );

                            overall += calculatedPrice;
                            driverShare += studentPrice;

                            return { studentId, studentPrice: calculatedPrice };
                        }
                    );
                } else {
                    studentPrices = pricing;
                    driverShare = pricing.reduce((acc, { studentPrice }) => {
                        overall += studentPrice;
                        return (
                            acc +
                            evaluateFormula(formula, {
                                a: studentPrice,
                                b: percent,
                            })
                        );
                    }, 0);
                }

                studentPrices.forEach(async ({ studentId, studentPrice }) => {
                    bulkStudentUpdates.push({
                        updateOne: {
                            filter: { _id: studentId },
                            update: { $set: { serviceCost: studentPrice } },
                        },
                    });

                    const studentIndex = service.student.findIndex(
                        (id) => id.toString() === studentId.toString()
                    );
                    if (studentIndex !== -1) {
                        service.studentCost[studentIndex] = studentPrice;
                    }
                });

                bulkServiceUpdates.push({
                    updateOne: {
                        filter: { _id: service._id },
                        update: {
                            $set: {
                                driverSharing: driverShare,
                                cost: overall,
                                studentCost: service.studentCost,
                            },
                        },
                    },
                });

                servs.push(service.id);

                count++;
            }
            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agencyId,
                targetIds: [],
                targetTable: "",
                sanadId: 0,
                actionName: "resetPrice",
                actionNameFa: `بازنویسی هزینه سرویس`,
                desc: `بازنویسی هزینه تعداد ${count} سرویس`,
            }).save();
            if (bulkStudentUpdates.length) {
                await this.Student.bulkWrite(bulkStudentUpdates);
            }
            if (bulkServiceUpdates.length) {
                await this.Service.bulkWrite(bulkServiceUpdates);
            }

            return this.response({ res, message: `${count} services updated` });
        } catch (error) {
            console.error("Error while resetting prices:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async resetDDSByServiceNum(req, res) {
        try {
            const { driverId, serviceNum, start, end } = req.query;

            let startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);
            let endDate = new Date(end);
            endDate.setHours(0, 0, 0, 0);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for start or end.",
                });
            }

            const daysDifference = Math.ceil(
                (endDate - startDate) / (24 * 60 * 60 * 1000)
            );
            startDate = new Date(startDate.getTime() - 60 * 1000);
            endDate = new Date(endDate.getTime() + 60 * 1000);
            // const etd = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
            // await this.DDS.deleteMany({
            //     driverId,
            //     createdAt: {
            //         $lte: etd,
            //         $gte: startDate,
            //     },
            // });
            startDate = new Date(startDate.getTime() + 120 * 1000);
            await this.editCreateDDS(
                req,
                driverId,
                daysDifference,
                startDate,
                serviceNum
            );
            return this.response({ res, message: `DONE` });
        } catch (error) {
            console.error("Error while resetDDSByServiceNum:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async removeStudentFromDayDDS(req, res) {
        try {
            const { ddsId, serviceNum, studentId } = req.query;
            let date = new Date(req.query.date);
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const monthLen = getMonth(date);
            // console.log("ddsId", ddsId);
            // console.log("serviceNum", serviceNum);
            // console.log("studentId", studentId);

            if (isNaN(date.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for date.",
                });
            }
            let dds = await this.DDS.findById(ddsId);
            if (!dds) {
                return this.response({
                    res,
                    code: 404,
                    message: "dds not find.",
                });
            }

            for (var i in dds.service) {
                var serv = dds.service[i];
                if (serv.num.toString() === serviceNum) {
                    dds.sc -= serv.serviceCost / monthLen;
                    dds.dds -= serv.driverShare / monthLen;
                    let allStudents = [];
                    console.log("serv.students", serv.students.length);
                    serv.serviceCost = 0;
                    for (var st of serv.students) {
                        if (st.id != studentId) {
                            allStudents.push({
                                id: st.id,
                                cost: st.cost,
                            });
                            serv.serviceCost += st.cost;
                        }
                    }
                    console.log("allStudents", allStudents.length);
                    if (allStudents.length === 0) {
                        dds.service[i].serviceCost = 0;
                        dds.service[i].driverShare = 0;
                        dds.service[i].students = allStudents;
                        break;
                    } else {
                        const setting = await this.AgencySet.findOne({
                            agencyId: agencyId,
                        });
                        let formula = "a-(a*(b/100))";
                        let formulaForStudent = false;
                        if (setting) {
                            formula = setting.formula;
                            formulaForStudent = setting.formulaForStudent;
                        }
                        const percent = await this.percent(agencyId);
                        if (formulaForStudent) {
                            serv.driverShare = reverseEvaluateFormula(
                                serv.serviceCost,
                                percent,
                                formula
                            );
                        } else {
                            serv.driverShare = evaluateFormula(formula, {
                                a: serv.serviceCost,
                                b: percent,
                            });
                        }
                        if (serv.driverShare == null) {
                            serv.driverShare = 0;
                        }
                        dds.service[i].serviceCost = serv.serviceCost;
                        dds.service[i].driverShare = serv.driverShare;
                        dds.service[i].students = allStudents;
                        dds.sc += serv.serviceCost / monthLen;
                        dds.dds += serv.driverShare / monthLen;
                        break;
                    }
                }
            }

            // console.log("service", dds.service);
            const a = await this.DDS.findByIdAndUpdate(
                ddsId,
                {
                    service: dds.service,
                    sc: dds.sc,
                    dds: dds.dds,
                },
                { new: true }
            );
            // console.log("a", a);
            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agencyId,
                targetIds: [studentId],
                targetTable: "student",
                sanadId: 0,
                actionName: "removeStudentFromDayDDS",
                actionNameFa: "حذف دانش آموز از کارکرد یک روز",
                desc: `حذف دانش آموز از تاریخ ${new persianDate(date).format(
                    "YY/MM/DD"
                )} راننده ${a.name} ${a.phone}`,
            }).save();
            return this.response({ res, message: `DONE`, data: a });
        } catch (error) {
            console.error("Error while removeStudentFromDayDDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
function getDateByOffset(startDate, offsetDays) {
    return new Date(startDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
}
function logWithTime(message) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const formattedTimestamp = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    console.log(`[${formattedTimestamp}] ${message}`);
}
function calculate(pricingTable, students) {
    const result = [];
    for (const student of students) {
        const { studentId, studentDistance } = student;

        const matchedPricing = pricingTable.find(
            (priceItem) => priceItem.kilometer * 1000 >= studentDistance
        );

        if (matchedPricing) {
            result.push({
                studentId,
                studentPrice: matchedPricing.price,
            });
        }
    }
    return result;
}

function evaluateFormula(formula, values) {
    if (typeof formula !== "string") {
        console.error("Formula must be a string.");
        return null;
    }

    for (const [key, value] of Object.entries(values)) {
        const regex = new RegExp(`\\b${key}\\b`, "g");
        formula = formula.replace(regex, value);
    }

    try {
        return new Function(`return ${formula};`)();
    } catch (error) {
        console.error("Error evaluating formula:", error);
        return null;
    }
}
function reverseEvaluateFormula(targetAnswer, b, formulaTemplate) {
    if (typeof formulaTemplate !== "string") {
        console.error("Formula must be a string.");
        return null;
    }

    const tolerance = 1e-6;
    let low = 0;
    let high = targetAnswer * 2;
    let mid;

    while (high - low > tolerance) {
        mid = (low + high) / 2;

        let formula = formulaTemplate.replace(/a/g, mid).replace(/b/g, b);

        const result = new Function(`return ${formula};`)();

        if (result < targetAnswer) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return Math.floor(mid);
}
function financial(x) {
    x = x / 10000;
    x = Number.parseFloat(x).toFixed();
    x = x * 10000;
    return x;
}
function getMonth(now) {
    // console.log("now", now);
    const month = now.getMonth() + 1;
    const day = now.getDate();
    // console.log("month", month);
    // console.log("day", day);
    const isBeforeFarvardin = month === 3 && day < 22;
    const isAfterShahrivar = month === 9 && day >= 22;
    // console.log("isBeforeFarvardin", isBeforeFarvardin);
    // console.log("isAfterShahrivar", isAfterShahrivar);
    if (
        month >= 10 ||
        month <= 6 ||
        (month === 9 && isAfterShahrivar) ||
        (month === 3 && isBeforeFarvardin)
    ) {
        return 30;
    } else {
        return 31;
    }
}
