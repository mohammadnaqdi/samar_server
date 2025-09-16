const controller = require("../controller");
const config = require("config");
const neshan = process.env.NESHAN;
const axios = require("axios");

const persianDate = require("persian-date");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

module.exports = new (class extends controller {
    async insertStudent(req, res) {
        const session = await this.Student.startSession();
        session.startTransaction();
        try {
            const {
                name,
                lastName,
                school,
                gradeId,
                gradeTitle,
                time,
                fatherName,
                parentReleation,
                addressText,
                details,
                location,
                isIranian,
                gender,
            } = req.body;

            const parent = req.user._id;
            const checkDistance = req.body.checkDistance || false;
            const nationalCode = req.body.nationalCode ?? "";

            const studentCount = await this.Student.countDocuments({
                parent,
                name,
                lastName,
                delete: false,
            }).session(session);

            if (studentCount > 0) {
                await session.abortTransaction();
                return this.response({
                    res,
                    code: 403,
                    message: "student is duplicated",
                });
            }

            let state = req.body.state ?? 0;
            if (state > 1) state = 1;
            let stateTitle =
                state === 1 ? "در انتظار تایید اطلاعات" : "ثبت شده";

            const sch = await this.School.findById(
                school,
                "location.coordinates agencyId"
            ).session(session);
            if (!sch) {
                await session.abortTransaction();
                return this.response({
                    res,
                    code: 400,
                    message: "school not find",
                    data: { fa_m: "مدرسه پیدا نشد" },
                });
            }

            let serviceDistance = 0;
            try {
                const origin = `${location[0]},${location[1]}`;
                const dest = `${sch.location.coordinates[0]},${sch.location.coordinates[1]}`;
                const url = `https://api.neshan.org/v4/direction/no-traffic?origin=${origin}&destination=${dest}`;
                const options = {
                    headers: { "Api-Key": neshan },
                    timeout: 5500,
                };
                const response = await axios.get(url, options);
                serviceDistance =
                    response.data.routes[0].legs[0].distance.value;
            } catch (error) {
                console.log("Neshan error=", error.message);
            }

            const agency = await this.Agency.findById(
                sch.agencyId,
                "settings"
            ).session(session);
            const agencyId = agency ? agency._id : null;

            const student = await new this.Student({
                agencyId,
                parent,
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
                serviceDistance,
                nationalCode,
                setter: req.user._id,
                setterISParent: req.user.isParent || false,
            }).save({ session });

            const invoice = await this.Invoice.findOne({
                agencyId,
                type: "registration",
                delete: false,
            }).session(session);

            if (invoice) {
                await new this.PayQueue({
                    inVoiceId: invoice._id,
                    code: invoice.code,
                    agencyId,
                    studentId: student._id,
                    setter: req.user._id,
                    type: invoice.type,
                    amount: invoice.amount,
                    title: invoice.title,
                    maxDate: invoice.maxDate,
                    isPaid: false,
                }).save({ session });
            }

            await session.commitTransaction();

            return this.response({
                res,
                data: student._id,
            });
        } catch (error) {
            console.error("Error while insertStudent:", error);
            await session.abortTransaction();
            return res.status(500).json({ error: "insertStudent error" });
        } finally {
            await session.endSession();
        }
    }

    async insertStudentByAgent(req, res) {
        const session = await this.Student.startSession();
        session.startTransaction();
        try {
            const {
                name,
                lastName,
                parentId: parent,
                school,
                gradeId,
                gradeTitle,
                time,
                fatherName,
                distance,
                parentReleation,
                addressText,
                details,
                location,
                isIranian,
                gender,
                nationalCode = "",
            } = req.body;

            // ✅ Duplication check
            const studentCount = await this.Student.countDocuments(
                { parent, name, lastName, delete: false },
                { session }
            );
            if (studentCount > 0) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 403,
                    message: "student is duplicated",
                });
            }

            let stateTitle = "در انتظار پیش پرداخت";
            const state = 2;

            // ✅ Find school
            const sch = await this.School.findById(
                school,
                "name location.coordinates agencyId",
                { session }
            );
            if (!sch) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 400,
                    message: "school not find",
                    data: { fa_m: "مدرسه پیدا نشد" },
                });
            }

            // ✅ Distance calculation (external API call → outside transaction logic)
            let serviceDistance = 0;
            if (distance == -1) {
                try {
                    let origin = location[0] + "," + location[1];
                    let dest =
                        sch.location.coordinates[0] +
                        "," +
                        sch.location.coordinates[1];
                    const url = `https://api.neshan.org/v4/direction/no-traffic?origin=${origin}&destination=${dest}`;
                    const options = {
                        headers: { "Api-Key": neshan },
                        timeout: 5500,
                    };
                    const response = await axios.get(url, options);
                    serviceDistance =
                        response.data.routes[0].legs[0].distance.value;
                } catch (error) {
                    console.log("Neshan error=", error);
                }
            } else {
                serviceDistance = distance;
            }

            // ✅ Find agency
            const agency = await this.Agency.findById(
                sch.agencyId,
                "settings",
                {
                    session,
                }
            );
            if (!agency) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ msg: "agency not find" });
            }
            const agencyId = agency._id;

            // ✅ Create Student
            const studentDoc = new this.Student({
                agencyId: sch.agencyId,
                parent,
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
                serviceDistance,
                nationalCode,
                setter: req.user._id,
                setterISParent: false,
            });
            await studentDoc.save({ session });

            // ✅ Registration invoice
            const invoice = await this.Invoice.findOne(
                { agencyId: sch.agencyId, type: "registration", delete: false },
                null,
                { session }
            );

            if (invoice) {
                let payQueue = new this.PayQueue({
                    inVoiceId: invoice._id,
                    code: invoice.code,
                    agencyId: sch.agencyId,
                    studentId: studentDoc._id,
                    setter: req.user._id,
                    type: invoice.type,
                    amount: invoice.amount,
                    title: invoice.title,
                    maxDate: invoice.maxDate,
                    isPaid: false,
                });
                await payQueue.save({ session });

                const amount = payQueue.amount;
                const studentCode = studentDoc.studentCode;
                const fullname = `${studentDoc.name} ${studentDoc.lastName} کد ${studentCode}`;

                const wallet = agency.settings.find(
                    (obj) => obj.wallet
                )?.wallet;
                const costCode = agency.settings.find((obj) => obj.cost)?.cost;

                if (!costCode || !wallet) {
                    studentDoc.state = 0;
                    studentDoc.stateTitle = "ثبت شده توسط نماینده";
                    await studentDoc.save({ session });
                    await session.commitTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 203,
                        message: "costCode || wallet not find",
                    });
                }

                // ✅ Check balance
                const result = await this.DocListSanad.aggregate([
                    { $match: { accCode: wallet, agencyId: agencyId } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $subtract: ["$bed", "$bes"] } },
                        },
                    },
                ]).session(session);
                const mandeh = result[0]?.total || 0;

                if (amount > mandeh) {
                    studentDoc.state = 0;
                    studentDoc.stateTitle = "ثبت شده توسط نماینده";
                    await studentDoc.save({ session });
                    await session.commitTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 203,
                        message: "The account balance is insufficient",
                    });
                }

                const desc = `پرداخت ${payQueue.title} از کیف پول بابت دانش آموز ${fullname}`;

                // ✅ Create DocSanad
                const docObj = new this.DocSanad({
                    agencyId,
                    note: desc,
                    sanadDate: new Date(),
                    system: 3,
                    definite: false,
                    lock: true,
                    editor: req.user._id,
                });
                await docObj.save({ session });

                // ✅ DocListSanad rows
                await new this.DocListSanad({
                    agencyId,
                    titleId: docObj.id,
                    doclistId: docObj.sanadId,
                    row: 1,
                    bed: amount,
                    bes: 0,
                    note: desc,
                    accCode: costCode,
                    mId: docObj.sanadId,
                    peigiri: studentCode,
                    sanadDate: new Date(),
                }).save({ session });

                await new this.DocListSanad({
                    agencyId,
                    titleId: docObj.id,
                    doclistId: docObj.sanadId,
                    row: 2,
                    bed: 0,
                    bes: amount,
                    note: desc,
                    accCode: wallet,
                    mId: payQueue.code,
                    type: "invoice",
                    forCode: "003005" + studentCode,
                    peigiri: studentCode,
                    sanadDate: new Date(),
                }).save({ session });

                payQueue.isPaid = true;
                payQueue.payDate = new Date();
                await payQueue.save({ session });

                const invoice2 = await this.Invoice.findOne(
                    {
                        agencyId: sch.agencyId,
                        type: "prePayment",
                        delete: false,
                    },
                    null,
                    { session }
                );
                if (invoice2) {
                    let amount2 = invoice2.amount;
                    let findSchool = false;
                    if (invoice2.schools.length > 0) {
                        for (var sc of invoice2.schools) {
                            if (sc.id.toString() === school.toString()) {
                                amount2 = sc.amount;
                                findSchool = true;
                            }
                        }
                    }
                    if (!findSchool) {
                        if (invoice2.distancePrice?.length > 0) {
                            const matchedPricing = invoice2.distancePrice.find(
                                (p) => p.maxDistance * 1000 >= serviceDistance
                            );
                            amount2 = matchedPricing
                                ? matchedPricing.amount
                                : invoice2.distancePrice.at(-1).amount;
                        }
                    }
                    let payQueue2 = new this.PayQueue({
                        inVoiceId: invoice2._id,
                        code: invoice2.code,
                        agencyId: sch.agencyId,
                        studentId: studentDoc._id,
                        setter: req.user._id,
                        type: invoice2.type,
                        amount: amount2,
                        title: invoice2.title,
                        maxDate: invoice2.maxDate,
                        isPaid: false,
                    });
                    await payQueue2.save({ session });
                }
            }

            // ✅ Commit
            await session.commitTransaction();
            session.endSession();

            return this.response({ res, data: studentDoc._id });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error while insertStudent:", error);
            return res.status(500).json({ error: "insertstudent error" });
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
                "name location.coordinates admin agencyId"
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
                let dest =
                    sch.location.coordinates[0] +
                    "," +
                    sch.location.coordinates[1];
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
                    agencyId: sch.agencyId,
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
                    nationalCode,
                    setter: req.user._id,
                    setterISParent: req.user.isParent || false,
                });
                await student.save();
                const invoice = await this.Invoice.findOne({
                    agencyId: sch.agencyId,
                    type: "registration",
                    delete: false,
                });
                if (invoice) {
                    let payQueue = new this.PayQueue({
                        inVoiceId: invoice._id,
                        code: invoice.code,
                        agencyId: sch.agencyId,
                        studentId: student._id,
                        setter: req.user._id,
                        type: invoice.type,
                        amount: invoice.amount,
                        title: invoice.title,
                        maxDate: invoice.maxDate,
                        isPaid: false,
                    });
                    await payQueue.save();
                }

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

    async setRequest(req, res) {
        try {
            const studentId = req.body.studentId;
            let setType = req.body.setType;
            const queueCode = req.body.queueCode;
            const stCode = req.body.stCode;
            let isAdmin = req.body.isadmin;
            let goCheck = true;
            if (isAdmin != undefined) {
                if (isAdmin === false) {
                    goCheck = false;
                }
            }
            console.log("setRequest", setType);
            let student = await this.Student.findById(studentId);
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                    data: { fa_m: "دانش آموز پیدا نشد!" },
                });
            }
            if (!student.active) {
                return this.response({
                    res,
                    code: 402,
                    message: "student is not Active",
                    data: { fa_m: "دانش آموز  فعال نیست!" },
                });
            }
            const schl = await this.School.findById(student.school).lean();
            const agency = await this.Agency.findById(schl.agencyId);
            if (!schl || !agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "school or agency not find",
                    data: { fa_m: "مدرسه یا شرکت پیدا نشد" },
                });
            }

            if (
                goCheck &&
                (isAdmin ||
                    req.user.isSchoolAdmin ||
                    req.user.isAgencyAdmin ||
                    req.user.isSupport)
            ) {
                let stateTitle = "لغو شده";
                let serviceState = 0;
                if (setType === 1) {
                    stateTitle = "در انتظار تایید اطلاعات";
                }
                if (setType === 2) {
                    stateTitle = "در انتظار پیش پرداخت";
                }
                if (setType === 3) {
                    stateTitle = "در انتظار تعیین سرویس";
                    serviceState = 1;
                }
                if (setType === 4) {
                    stateTitle = "سرویس تعیین شده";
                    serviceState = 2;
                }
                if (setType === 5) {
                    stateTitle = "لغو موقت سرویس";
                }

                student.stateTitle = stateTitle;
                student.state = setType;
                student.save();

                if (setType > 0) {
                    // let code = student.studentCode;
                    // const sch = await this.School.findById(
                    //     student.school,
                    //     "name agencyId"
                    // );
                    // code = pad(9, code, "0");
                    // let levelDets = await this.LevelAccDetail.find({
                    //     accCode: code,
                    // });
                    // if (levelDets.length == 0) {
                    //     let agencyId = null;
                    //     let kol = "003";
                    //     let moeen = "005";
                    //     if (agency) {
                    //         agencyId = agency._id;
                    //     }
                    //     await new this.LevelAccDetail({
                    //         agencyId,
                    //         levelNo: 3,
                    //         levelType: 1,
                    //         accCode: code,
                    //         accName: student.name + " " + student.lastName,
                    //         desc: sch.name,
                    //         editor: req.user._id,
                    //     }).save();
                    //     console.log("insert code", code);
                    //     await new this.ListAcc({
                    //         agencyId,
                    //         code: `${kol}${moeen}${code}`,
                    //         codeLev1: kol,
                    //         codeLev2: moeen,
                    //         codeLev3: code,
                    //         groupId: 1,
                    //         type: 1,
                    //         nature: 1,
                    //         levelEnd: 3,
                    //         canEdit: false,
                    //         editor: req.user._id,
                    //     }).save();
                    // }
                }
                if (agency)
                    await new this.OperationLog({
                        userId: req.user._id,
                        name: req.user.name + " " + req.user.lastName,
                        agencyId: agency._id,
                        targetIds: [student._id],
                        targetTable: "student",
                        sanadId: 0,
                        actionName: "setRequest",
                        actionNameFa: "تایید پیش پرداخت و درخواست",
                        desc: `تغییر وضعیت دانش آموز به ${serviceState}`,
                    }).save();
                return this.response({
                    res,
                    message: "ok",
                    data: { setType, stateTitle },
                });
            } else {
                console.log("queueCode", queueCode);

                // console.log("stCode", stCode);
                let newSet = -1;
                if (queueCode != undefined && stCode != undefined) {
                    const qu = await this.PayQueue.findOne({ code: queueCode });
                    const invoice = await this.Invoice.findById(qu.inVoiceId);
                    // console.log("qu", qu);

                    if (invoice) {
                        if (invoice.confirmInfo) {
                            // const payAction = await this.PayAction.find({
                            //     queueCode,
                            //     studentCode: stCode,
                            //     delete: false,
                            // });
                            const docListSanad =
                                await this.DocListSanad.findOne(
                                    {
                                        $and: [
                                            {
                                                $or: [
                                                    {
                                                        accCode:
                                                            "003005" + stCode,
                                                    },
                                                    {
                                                        forCode:
                                                            "003005" + stCode,
                                                    },
                                                ],
                                            },
                                            { mId: queueCode },
                                            { type: "invoice" },
                                        ],
                                    },
                                    ""
                                ).lean();
                            // console.log("payAction", payAction);
                            if (docListSanad) {
                                newSet = 2;
                            }
                        }
                    }
                } else if (!(setType === 1 || setType === 0)) {
                    return this.response({
                        res,
                        code: 400,
                        message: "you cant change state!",
                        data: { fa_m: "شما نباید وضعیت را تغییر دهید" },
                    });
                }
                if (newSet == 2) {
                    setType = 2;
                }
                if (student.parent.toString() === req.user._id.toString()) {
                    let stateTitle = "لغو شده";
                    if (setType > 0) {
                        stateTitle = "در انتظار تایید اطلاعات";
                        if (setType == 2) stateTitle = "در انتظار پیش پرداخت";
                    }
                    student.stateTitle = stateTitle;
                    student.state = setType;
                    student.save();

                    return this.response({
                        res,
                        message: "ok",
                        data: { setType, stateTitle },
                    });
                } else {
                    return this.response({
                        res,
                        code: 403,
                        message: "student not for you",
                        data: { fa_m: "دانش آموز برای شما نیست!" },
                    });
                }
            }
        } catch (error) {
            console.error("Error while 00037:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getMyStudents(req, res) {
        try {
            const userId = req.user._id;
            const students = await this.Student.find({
                parent: userId,
                delete: false,
            }).lean();
            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                const school = await this.School.findById(students[i].school);
                const agency = await this.Agency.findById(
                    school.agencyId,
                    "name tel address pic active"
                );
                // const shift = await this.Shifts.findById(students[i].shift);

                if (!school) continue;
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

                let morInfo = {
                    schoolName: school.name,
                    schoolCode: school.code,
                    schoolAddress: school.address,
                    schoolLat: school.location.coordinates[0],
                    schoolLng: school.location.coordinates[1],
                    schoolDistrictId: school.districtId,
                    shiftName: shiftName,
                    shiftType: shiftType,
                    address: students[i].address,
                    lat: students[i].location.coordinates[0],
                    lng: students[i].location.coordinates[1],
                    details: students[i].addressDetails,
                };
                myStudent.push({
                    student: students[i],
                    moreInfo: morInfo,
                    agency: agency,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00038:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getStudentById(req, res) {
        try {
            if (req.query.id === undefined) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }
            const id = ObjectId.createFromHexString(req.query.id);

            const student = await this.Student.findById(id).lean();
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }

            const school = await this.School.findById(student.school);
            const agency = await this.Agency.findById(
                school.agencyId,
                "name tel address pic active"
            );

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
                        school.schoolTime[student.time].shiftdayTitle + stt;
                }
            } else {
                shiftName = school.schoolTime[0].name;
                shiftType =
                    school.schoolTime[0].start + " " + school.schoolTime[0].end;
            }

            let morInfo = {
                schoolName: school.name,
                schoolCode: school.code,
                schoolAddress: school.address,
                schoolLat: school.location.coordinates[0],
                schoolLng: school.location.coordinates[1],
                schoolDistrictId: school.districtId,
                shiftName: shiftName,
                shiftType: shiftType,
                address: student.address,
                lat: student.location.coordinates[0],
                lng: student.location.coordinates[1],
                details: student.addressDetails,
            };

            return this.response({
                res,
                message: "ok",
                data: {
                    student: student,
                    moreInfo: morInfo,
                    agency: agency,
                },
            });
        } catch (error) {
            console.error("Error while 00138:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getMyStudents2(req, res) {
        try {
            const userId = req.user._id;
            const students = await this.Student.find(
                { parent: userId, delete: false },
                "_id studentCode school gradeId gradeTitle name lastName state stateTitle serviceNum service time avanak avanakNumber"
            );
            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                const school = await this.School.findById(
                    students[i].school,
                    "name schoolTime genderTitle code districtId agencyId"
                );
                const agency = await this.Agency.findById(
                    school.agencyId,
                    "name tel address pic active"
                );
                // const shift = await this.Shifts.findById(students[i].shift);

                if (!school) continue;
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

                let morInfo = {
                    schoolName: school.name,
                    genderTitle: school.genderTitle,
                    schoolCode: school.code,
                    schoolDistrictId: school.districtId,
                    shiftName: shiftName,
                    shiftType: shiftType,
                };
                myStudent.push({
                    student: students[i],
                    moreInfo: morInfo,
                    agency: agency,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00038:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentList(req, res) {
        try {
            const search = req.body.search.trim();
            const gradeId = req.body.gradeId;
            let page = req.body.page;
            const shift = req.body.shift;
            const school = req.body.school.trim();
            const maxState = req.body.maxState;
            const minState = req.body.minState;
            const gender = req.body.gender;
            const agencyIdR = req.body.agencyId;
            const schools = req.body.schools || [];
            let agencyId = null;
            if (
                agencyIdR != undefined &&
                agencyIdR != null &&
                agencyIdR != ""
            ) {
                agencyId = ObjectId.createFromHexString(agencyIdR);
            }

            let onlySchool = [];
            // console.log("agencyId", agencyId);
            // console.log("maxState", maxState);
            // console.log("search", search.length);
            // console.log("schools", schools);
            if (schools.length === 0 || search.length > 0) {
                if (
                    (req.user.isAgencyAdmin || req.user.isSupport) &&
                    !req.user.isadmin
                ) {
                    if (agencyId != null) {
                        onlySchool = await this.School.find({
                            agencyId,
                        }).distinct("_id");
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
                if (req.user.isSchoolAdmin) {
                    if (!school.toString() === "") {
                        return this.response({
                            res,
                            code: 404,
                            message: "school for schoolId need",
                        });
                    }
                    const mySchool = await this.School.findById(school);

                    // console.log("myAgency",myAgency);
                    if (!mySchool) {
                        return this.response({
                            res,
                            code: 404,
                            message: "not any school for you",
                            data: { fa_m: "هیچ مدرسه ای برای شما ثبت نیست" },
                        });
                    }
                    if (mySchool.admin.toString() != req.user._id.toString()) {
                        return this.response({
                            res,
                            code: 401,
                            message: "not this school for you",
                            data: { fa_m: "این مدرسه ای برای شما ثبت نیست" },
                        });
                    }
                }
            } else {
                onlySchool = schools;
            }
            // console.log("onlySchool",onlySchool);
            if (page < 0) page = 0;
            let students;

            // var needList =
            // "_id studentCode parent school address gradeTitle gradeId name lastName fatherName parentReleation isIranian gender state stateTitle serviceNum serviceCost serviceDistance active time createdAt";
            var qr = [];
            var searchQ = {
                $or: [
                    { studentCode: { $regex: ".*" + search + ".*" } },
                    { name: { $regex: ".*" + search + ".*" } },
                    { lastName: { $regex: ".*" + search + ".*" } },
                ],
            };
            // console.log("qr", qr);
            var stateQ = { state: { $gte: 1, $lt: 3 } };
            qr.push({ delete: false });
            if (
                (req.user.isAgencyAdmin || req.user.isSupport) &&
                !req.user.isadmin
            ) {
                qr.push({ school: { $in: onlySchool } });
            }
            stateQ = { state: { $gte: minState, $lte: maxState } };

            qr.push(stateQ);
            if (search != "") {
                qr.push(searchQ);
            }
            if (shift != -1) {
                qr.push({ time: shift });
            }
            if (
                schools.length == 0 &&
                school.length > 10 &&
                search.length === 0
            ) {
                qr.push({ school: school });
            }
            if (gradeId != 0) {
                qr.push({ gradeId: gradeId });
            }
            if (gender != 0) {
                qr.push({ gender });
            }
            // console.log(JSON.stringify(qr));
            let sortBy = { studentCode: -1 };
            if (minState === 4 && maxState === 4) {
                sortBy = { serviceNum: -1, _id: 1 };
            }
            students = await this.Student.find(
                {
                    $and: qr,
                }
                // needList
            )
                .skip(page * 40)
                .limit(40)
                .sort(sortBy);

            //   console.log('students',JSON.stringify(students));

            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                const school = await this.School.findById(
                    students[i].school,
                    "name code address location.coordinates districtTitle districtId schoolTime agencyId"
                );
                // const shift = await this.Shifts.findById(students[i].shift, "name type");

                const parent = await this.Parent.findById(
                    students[i].parent,
                    "name lastName phone fcm.token"
                );
                // console.log("parent", parent);

                if (!parent) continue;
                if (!school) continue;
                let payOff, payment;

                let agencyName = "",
                    agencyCode = "";
                let payQueue = [];
                if (!agencyId) {
                    const agency = await this.Agency.findById(
                        school.agencyId,
                        "name code"
                    );

                    if (agency) {
                        agencyName = agency.name;
                        agencyCode = agency.code;
                        agencyId = agency.id;
                    }
                } else {
                    payQueue = await this.PayQueue.find(
                        {
                            studentId: students[i]._id,
                            delete: false,
                            type: { $in: ["prePayment", "installment"] },
                        },
                        "title isPaid maxDate type cardNumber"
                    )
                        .sort({ counter: 1 })
                        .lean();
                }
                // console.log("ddddddddddddddd");
                let serviceCost = 0,
                    serviceDriverName = "",
                    serviceDriverId = "",
                    serviceDriverPic = "",
                    serviceDriverPelak = "",
                    serviceDriverPhone = "",
                    serviceDriverCar = "";
                if (students[i].serviceNum != 0 && students[i].state === 4) {
                    const service = await this.Service.findOne({
                        serviceNum: students[i].serviceNum,
                    });
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
                // console.log(JSON.stringify(agency));
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
                } else if (school.schoolTime.length > 0) {
                    shiftName = school.schoolTime[0].name;
                    shiftType =
                        school.schoolTime[0].start +
                        " " +
                        school.schoolTime[0].end;
                }
                // console.log("shiftName", shiftName);
                // console.log("parent.name", parent.name);
                // console.log("school.name", school.name);
                // console.log("parent.lastName", parent.lastName);
                let device = 0;
                let parentDevice = "";
                if (parent.fcm) {
                    if (parent.fcm.length > 0) {
                        var hasPhone = false;
                        var hasWeb = false;
                        for (var fc of parent.fcm) {
                            if (fc.token.length > 10) {
                                hasPhone = true;
                            } else {
                                hasWeb = true;
                            }
                        }
                        if (hasPhone && hasWeb) device = 3;
                        else if (hasPhone) device = 1;
                        else if (hasWeb) device = 2;

                        parentDevice = parent.fcm[0].device;
                    }
                }
                const contract = await this.SignedContract.exists({
                    studentId: students[i]._id,
                });

                let moreInfo = {
                    agencyName: agencyName,
                    agencyCode: agencyCode,
                    agencyId: agencyId,
                    serviceCost: serviceCost,
                    serviceDriverName: serviceDriverName,
                    serviceDriverId: serviceDriverId,
                    serviceDriverPic: serviceDriverPic,
                    serviceDriverCar: serviceDriverCar,
                    serviceDriverPelak: serviceDriverPelak,
                    serviceDriverPhone: serviceDriverPhone,
                    schoolName: school.name,
                    schoolCode: school.code,
                    schoolAddress: school.address,
                    schoolLat: school.location.coordinates[0],
                    schoolLng: school.location.coordinates[1],
                    districtTitle: school.districtTitle,
                    districtId: school.districtId,
                    shiftName: shiftName,
                    shiftType: shiftType,
                    address: students[i].address,
                    lat: students[i].location.coordinates[0],
                    lng: students[i].location.coordinates[1],
                    details: students[i].addressDetails,
                    parentName: parent.name ?? "",
                    parentLastName: parent.lastName ?? "",
                    parentPhone: parent.phone ?? "",
                    parentFcm: parentDevice,
                    contract: contract,
                    device,
                    payOff: payOff,
                    payment: payment,
                    payQueue: payQueue,
                };
                myStudent.push({
                    student: students[i],
                    moreInfo: moreInfo,
                });
            }
            // console.log("myStudent", myStudent.length);
            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00039:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentByPhoneNumber(req, res) {
        try {
            const phone = req.query.phone;
            const agencyIdR = req.query.agencyId;

            let agencyId = null;
            if (
                agencyIdR != undefined &&
                agencyIdR != null &&
                agencyIdR != ""
            ) {
                agencyId = ObjectId.createFromHexString(agencyIdR);
            }

            let onlySchool = [];

            if (
                (req.user.isAgencyAdmin || req.user.isSupport) &&
                !req.user.isadmin
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

            let students;
            const parent = await this.Parent.findOne({ phone });
            if (!parent) {
                return this.response({
                    res,
                    code: 404,
                    message: "parent not find",
                });
            }

            // var needList =
            // "_id studentCode parent school address gradeTitle gradeId name lastName fatherName parentReleation isIranian gender state stateTitle serviceNum serviceCost serviceDistance active time createdAt";
            var qr = [];
            qr.push({ delete: false });
            qr.push({ parent: parent.id });
            if (
                (req.user.isAgencyAdmin || req.user.isSupport) &&
                !req.user.isadmin
            ) {
                qr.push({ school: { $in: onlySchool } });
            }

            // console.log(JSON.stringify(qr));
            students = await this.Student.find(
                {
                    $and: qr,
                }
                // needList
            );

            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const school = await this.School.findById(
                    students[i].school,
                    "name code address location.coordinates districtTitle districtId schoolTime"
                );
                // const shift = await this.Shifts.findById(students[i].shift, "name type");

                const parent = await this.Parent.findById(
                    students[i].parent,
                    "name lastName phone fcm.token"
                );
                // console.log("parent", parent);
                let payOff, payment;

                let agencyName = "",
                    agencyCode = "",
                    agencyId;
                let payQueue = [];
                if (agencyId === null) {
                    const agency = await this.Agency.findOne(
                        { schools: school.id },
                        "name code"
                    );

                    if (agency) {
                        agencyName = agency.name;
                        agencyCode = agency.code;
                        agencyId = agency.id;
                    }
                } else {
                    payQueue = await this.PayQueue.find(
                        {
                            studentId: students[i]._id,
                            agencyId: agencyId,
                            delete: false,
                            type: { $in: ["prePayment", "installment"] },
                        },
                        "title isPaid maxDate type cardNumber"
                    )
                        .sort({ counter: 1 })
                        .lean();
                }

                // console.log("ddddddddddddddd");
                let serviceCost = 0,
                    serviceDriverName = "",
                    serviceDriverId = "",
                    serviceDriverPic = "",
                    serviceDriverPelak = "",
                    serviceDriverPhone = "",
                    serviceDriverCar = "";
                if (students[i].serviceNum != 0 && students[i].state === 4) {
                    const service = await this.Service.findOne({
                        serviceNum: students[i].serviceNum,
                    });
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
                // console.log(JSON.stringify(agency));
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
                } else if (school.schoolTime.length > 0) {
                    shiftName = school.schoolTime[0].name;
                    shiftType =
                        school.schoolTime[0].start +
                        " " +
                        school.schoolTime[0].end;
                }
                // console.log("shiftName", shiftName);
                // console.log("parent.name", parent.name);
                // console.log("school.name", school.name);
                // console.log("parent.lastName", parent.lastName);
                let device = 0;
                let parentDevice = "";
                if (parent.fcm) {
                    if (parent.fcm.length > 0) {
                        var hasPhone = false;
                        var hasWeb = false;
                        for (var fc of parent.fcm) {
                            if (fc.token.length > 10) {
                                hasPhone = true;
                            } else {
                                hasWeb = true;
                            }
                        }
                        if (hasPhone && hasWeb) device = 3;
                        else if (hasPhone) device = 1;
                        else if (hasWeb) device = 2;

                        parentDevice = parent.fcm[0].device;
                    }
                }
                const contract = await this.SignedContract.exists({
                    studentId: students[i]._id,
                });
                let moreInfo = {
                    agencyName: agencyName,
                    agencyCode: agencyCode,
                    agencyId: agencyId,
                    serviceCost: serviceCost,
                    serviceDriverName: serviceDriverName,
                    serviceDriverId: serviceDriverId,
                    serviceDriverPic: serviceDriverPic,
                    serviceDriverCar: serviceDriverCar,
                    serviceDriverPelak: serviceDriverPelak,
                    serviceDriverPhone: serviceDriverPhone,
                    schoolName: school.name,
                    schoolCode: school.code,
                    schoolAddress: school.address,
                    schoolLat: school.location.coordinates[0],
                    schoolLng: school.location.coordinates[1],
                    districtTitle: school.districtTitle,
                    districtId: school.districtId,
                    shiftName: shiftName,
                    shiftType: shiftType,
                    address: students[i].address,
                    lat: students[i].location.coordinates[0],
                    lng: students[i].location.coordinates[1],
                    details: students[i].addressDetails,
                    parentName: parent.name ?? "",
                    parentLastName: parent.lastName ?? "",
                    parentPhone: parent.phone ?? "",
                    parentFcm: parentDevice,
                    contract: contract,
                    device,
                    payOff: payOff,
                    payment: payment,
                    payQueue: payQueue,
                };
                myStudent.push({
                    student: students[i],
                    moreInfo: moreInfo,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00040:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentListAll(req, res) {
        try {
            const gradeId = req.body.gradeId;
            const school = req.body.school;
            const state = req.body.state;
            const gender = req.body.gender;
            const agencyIdR = req.body.agencyId;

            let agencyId = null;
            if (
                agencyIdR != undefined &&
                agencyIdR != null &&
                agencyIdR != ""
            ) {
                agencyId = ObjectId.createFromHexString(agencyIdR);
            }

            let onlySchool = [];

            if (school === null) {
                const schools = await this.School.find({
                    delete: false,
                    agencyId: agencyId,
                }).lean();
                schools.forEach((scId) => {
                    onlySchool.push(ObjectId.createFromHexString(scId._id));
                });

                if (onlySchool.length === 0) {
                    return this.response({
                        res,
                        message: "your school is empty for your company",
                        data: [],
                    });
                }
            } else if (school != null && school.toString().trim() != "") {
                onlySchool.push(ObjectId.createFromHexString(school));
            }

            let students;

            // var needList =
            // "studentCode parent school address gradeTitle gradeId name lastName fatherName parentReleation isIranian gender state stateTitle serviceNum serviceCost serviceDistance active time createdAt pack check";
            var qr = [];
            qr.push({ delete: false });
            if (
                (req.user.isAgencyAdmin || req.user.isSupport) &&
                !req.user.isadmin
            ) {
                qr.push({ school: { $in: onlySchool } });
            }
            if (state != null) {
                qr.push({ state: state });
            }

            if (gradeId != null) {
                qr.push({ gradeId: gradeId });
            }
            if (gender != null) {
                qr.push({
                    $or: [{ gender }, { gender: gender + 50 }],
                });
            }
            // console.log(JSON.stringify(qr));
            students = await this.Student.find(
                {
                    $and: qr,
                }
                // needList
            );

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
                if (students[i].serviceNum != 0 && students[i].state === 4) {
                    const service = await this.Service.findOne(
                        {
                            serviceNum: students[i].serviceNum,
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
                    details: students[i].addressDetails,
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

    async studentListNotService(req, res) {
        try {
            const search = req.body.search.trim();
            const gradeId = req.body.gradeId;
            let page = req.body.page;
            const shiftId = req.body.shift.trim();
            const schoolId = req.body.schoolId.trim();
            const agencyId = req.body.agencyId;
            const sortBy = req.body.sortBy;
            const serviceId = req.body.serviceId || "";
            let stateId = 3;
            if (req.body.stateId != undefined) stateId = req.body.stateId;

            // console.log("schoolId=", schoolId);
            // console.log("gradeId=", gradeId);
            const myAgency = await this.Agency.findById(
                agencyId,
                "delete active"
            );

            if (!myAgency || myAgency.delete || !myAgency.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "not active agency",
                    data: { fa_m: "شرکت غیرفعال است یا حذف شده" },
                });
            }
            let studentsLocations = [];
            if (serviceId && serviceId != "") {
                studentsLocations = await this.Student.find(
                    {
                        service: serviceId,
                    },
                    "location"
                );
            }
            let onlySchool = [];
            const schls = await this.School.find({
                delete: false,
                agencyId: myAgency.id,
            }).lean();
            schls.forEach((scId) => {
                onlySchool.push(scId._id);
            });
            let canGo = false;
            if (schoolId.toString() === "") {
                canGo = true;
            } else {
                for (var i = 0; i < onlySchool.length; i++) {
                    if (onlySchool[i].toString() === schoolId.toString()) {
                        canGo = true;
                        break;
                    }
                }
            }
            if (!canGo)
                return this.response({
                    res,
                    code: 214,
                    message: "schoolId need",
                });
            if (page < 0) page = 0;
            let students=[];
            var qr = [];
            var searchQ = {
                $or: [
                    { studentCode: { $regex: ".*" + search + ".*" } },
                    { name: { $regex: ".*" + search + ".*" } },
                    { lastName: { $regex: ".*" + search + ".*" } },
                    { fatherName: { $regex: ".*" + search + ".*" } },
                ],
            };
            if (schoolId.toString() !== "") {
                qr.push({ school: schoolId });
            } else {
                qr.push({ school: { $in: onlySchool } });
            }
            qr.push({ delete: false });
            qr.push({ state: stateId });
            if (search != "") {
                qr.push(searchQ);
            }
            if (shiftId.toString() != "") qr.push({ shift: shiftId });

            if (gradeId != 0) {
                qr.push({ gradeId: gradeId });
            }

            let sort = { updatedAt: 1 };
            if (sortBy === 1) {
                sort = { serviceDistance: 1, _id: 1 };
            } else if (sortBy === 2) {
                sort = { serviceDistance: -1, _id: 1 };
            } else if (sortBy === 3) {
                sort = { updatedAt: -1, _id: 1 };
            }

            console.log("studentsLocations.length", studentsLocations.length);
            if (studentsLocations.length > 0) {
                const limit = Math.round(20 / studentsLocations.length);
                const skipCount = page * limit;
                for (var lc of studentsLocations) {
                    let stf = await this.Student.aggregate([
                        {
                            $geoNear: {
                                near: {
                                    type: "Point",
                                    coordinates: lc.location.coordinates,
                                },
                                key: "location",
                                distanceField: "dist.calculated",
                                maxDistance: 20000,
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
                    students.push(...stf);
                }
                //  remove duplicates from students
                students = students.filter(
                    (v, i, a) =>
                        a.findIndex(
                            (t) => t._id.toString() === v._id.toString()
                        ) === i
                );
            } else {
                students = await this.Student.find({
                    $and: qr,
                })
                    .skip(page * 20)
                    .limit(20)
                    .sort(sort);
            }

            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                //console.log(JSON.stringify(students[i]));
                const school = await this.School.findById(
                    students[i].school,
                    "name location.coordinates grade districtId schoolTime code"
                );

                // const shift = await this.Shifts.findById(students[i].shift,'name type');
                const parent = await this.Parent.findById(
                    students[i].parent,
                    "name lastName phone"
                );
                // const payOff = await this.Payoff.find(
                //   { personId: students[i].id },
                //   "date costBed costBes refCode"
                // );
                // const payment = await this.Payment.find({ student: students[i].id });
                let moreInfo = {};

                if (school) {
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
                                school.schoolTime[students[i].time]
                                    .shiftdayTitle + stt;
                        }
                    } else {
                        shiftName = school.schoolTime[0].name;
                        shiftType =
                            school.schoolTime[0].start +
                            " " +
                            school.schoolTime[0].end;
                    }
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolCode = school.code;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                    moreInfo.grade = school.grade;
                    moreInfo.districtId = school.districtId;
                    moreInfo.shiftName = shiftName;
                    moreInfo.shiftType = shiftType;
                } else {
                    moreInfo.schoolName = "پیدا نشد";
                    moreInfo.schoolLat = 0;
                    moreInfo.schoolLng = 0;
                }

                moreInfo.address = students[i].address;
                moreInfo.lat = students[i].location.coordinates[0];
                moreInfo.lng = students[i].location.coordinates[1];
                moreInfo.details = students[i].addressDetails;

                if (parent) {
                    moreInfo.parentName = parent.name;
                    moreInfo.parentLastName = parent.lastName;
                    moreInfo.parentPhone = parent.phone;
                } else {
                    moreInfo.parentName = "";
                    moreInfo.parentLastName = "";
                    moreInfo.parentPhone = "";
                }
                // if (payOff) moreInfo.payOff = payOff;
                moreInfo.payOff = [];
                // if (payment) moreInfo.payment = payment;
                moreInfo.payment = [];

                myStudent.push({
                    student: students[i],
                    moreInfo: moreInfo,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00042:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentListNotService2(req, res) {
        try {
            let search = req.body.search || "";
            search = search.trim();
            const gradeIds = req.body.gradeIds || [];
            let page = req.body.page;
            const time = req.body.time;
            const schoolIds = req.body.schoolIds;
            const sortBy = req.body.sortBy;

            // console.log("search",search)
            // console.log("gradeIds",gradeIds)
            // console.log("page",page)
            // console.log("time",time)
            // console.log("schoolIds",schoolIds)

            if (page < 0) page = 0;
            let students;
            var needList =
                "studentCode school parent address gradeTitle gradeId name lastName serviceDistance time location.coordinates";
            var qr = [];
            if (search != "") {
                qr.push({
                    $or: [
                        { studentCode: { $regex: ".*" + search + ".*" } },
                        { name: { $regex: ".*" + search + ".*" } },
                        { lastName: { $regex: ".*" + search + ".*" } },
                    ],
                });
            }

            qr.push({ school: { $in: schoolIds } });

            qr.push({ delete: false });
            qr.push({ active: true });
            qr.push({ state: 3 });

            if (time > -1) qr.push({ time });

            if (gradeIds != [] && gradeIds.length > 0) {
                qr.push({ gradeId: { $in: gradeIds } });
            }

            let sort = { updatedAt: 1, _id: 1 };
            if (sortBy === 1) {
                sort = { serviceDistance: 1, _id: 1 };
            } else if (sortBy === 2) {
                sort = { serviceDistance: -1, _id: 1 };
            } else if (sortBy === 3) {
                sort = { updatedAt: -1, _id: 1 };
            }

            // console.log('qr studentnotservice2',qr);
            const studentCount = await this.Student.countDocuments({
                $and: qr,
            });
            students = await this.Student.find(
                {
                    $and: qr,
                },
                needList
            )
                .skip(page * 20)
                .limit(20)
                .sort(sort);

            let myStudent = [];
            // console.log("students",students.length);
            for (var i = 0; i < students.length; i++) {
                // const shift = await this.Shifts.findById(students[i].shift,'name type');
                const parent = await this.Parent.findById(
                    students[i].parent,
                    "phone"
                );
                if (!parent) continue;

                // const payOff = await this.Payoff.find(
                //   { personId: students[i].id },
                //   "date costBed costBes refCode"
                // );
                // const payment = await this.Payment.find({ student: students[i].id });
                let moreInfo = {};
                moreInfo.address = students[i].address;
                moreInfo.lat = students[i].location.coordinates[0];
                moreInfo.lng = students[i].location.coordinates[1];
                moreInfo.details = students[i].addressDetails;
                moreInfo.phone = parent.phone;

                myStudent.push({
                    student: students[i],
                    moreInfo: moreInfo,
                });
            }
            return this.response({
                res,
                message: studentCount,
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while studentNOtService2:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentListAddress(req, res) {
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
            const agencyId = req.query.agencyId;
            const myAgency = await this.Agency.findById(
                agencyId,
                "delete active"
            );

            if (!myAgency || myAgency.delete || !myAgency.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "not active agency",
                    data: { fa_m: "شرکت غیرفعال است یا حذف شده" },
                });
            }
            let onlySchool = [];
            const schls = await this.School.find({
                delete: false,
                agencyId: myAgency.id,
            }).lean();
            schls.forEach((scId) => {
                onlySchool.push(scId._id);
            });

            var qr = [];

            qr.push({ school: { $in: onlySchool } });
            qr.push({ delete: false });
            qr.push({ state: 3 });

            //console.log(JSON.stringify(qr));
            let students = await this.Student.find(
                {
                    $and: qr,
                },
                "name lastName studentCode school time address pack neighbourhood location.coordinates"
            );
            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                //console.log(JSON.stringify(students[i]));

                myStudent.push({
                    name: students[i].name,
                    lastName: students[i].lastName,
                    studentCode: students[i].studentCode,
                    school: students[i].school,
                    time: students[i].time,
                    address:
                        students[i].address + " " + students[i].addressDetails,
                    lat: students[i].location.coordinates[0],
                    lng: students[i].location.coordinates[1],
                    neighbourhood: students[i].neighbourhood,
                    pack: students[i].pack,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00043:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentListPack(req, res) {
        try {
            if (req.query.groupId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: " groupId need",
                });
            }
            // const agencyId = req.query.agencyId;
            const groupId = parseInt(req.query.groupId);
            // const myAgency = await this.Agency.findById(
            //     agencyId,
            //     "delete active"
            // );

            // if (!myAgency || myAgency.delete || !myAgency.active) {
            //     return this.response({
            //         res,
            //         code: 404,
            //         message: "not active agency",
            //         data: { fa_m: "شرکت غیرفعال است یا حذف شده" },
            //     });
            // }
            let onlyPack = [];
            const schls = await this.Pack.find({
                groupId,
            }).lean();
            schls.forEach((scId) => {
                onlyPack.push(scId.code);
            });
            var qr = {
                delete: false,
                packed: true,
                pack: { $in: onlyPack },
                state: 3,
            };
            if (req.query.schoolId && req.query.schoolId.trim() !== "") {
                qr.school = ObjectId.createFromHexString(req.query.schoolId);
                qr.pack = -1;
                qr.packed = false;
            }
            // // var qr = [];
            // console.log("qr", qr);

            // qr.push({ school: { $in: onlySchool } });
            // qr.push({ delete: false });
            // qr.push({ groupId });
            // qr.push({  });
            // const students=await this.Student.find({
            //     delete: false ,
            //     packed:true,
            //     pack:groupId,
            //     //dodo state: 3
            // },'name lastName studentCode school address time pack neighbourhood location.coordinates')

            let students = await this.Student.aggregate([
                {
                    $match: qr,
                },
                {
                    $project: {
                        name: 1,
                        lastName: 1,
                        studentCode: 1,
                        school: 1,
                        time: 1,
                        address: 1,
                        pack: 1,
                        neighbourhood: 1,
                        gradeTitle: 1,
                        "location.coordinates": 1,
                    },
                },
                {
                    $group: {
                        _id: "$pack",
                        students: {
                            $push: {
                                name: "$name",
                                lastName: "$lastName",
                                studentCode: "$studentCode",
                                school: "$school",
                                time: "$time",
                                address: "$address",
                                gradeTitle: "$gradeTitle",
                                neighbourhood: "$neighbourhood",
                                coordinates: "$location.coordinates",
                            },
                        },
                    },
                },
            ]);

            // let myStudent = [];
            // for (var i = 0; i < students.length; i++) {

            //     const pack = await this.GroupPack.findOne(
            //         {
            //             code: students[i]._id,
            //         },
            //         "schools"
            //     ).lean();
            //     if (pack) students[i].schools = pack.schools;
            // }

            return this.response({
                res,
                message: "ok",
                data: students,
            });
        } catch (error) {
            console.error("Error while studentListPack:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getstudentByCode(req, res) {
        try {
            if (req.query.code === undefined || req.query.code.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "code need",
                });
            }
            let id = null;
            try {
                id = ObjectId.createFromHexString(req.query.code);
            } catch {
                id = null;
            }
            const code = req.query.code;

            const student =
                id === null
                    ? await this.Student.findOne({ studentCode: code }).lean()
                    : await this.Student.findById(id).lean();
            if (!student) {
                return this.response({
                    res,
                    code: 221,
                    message: "student not find",
                });
            }

            //console.log(JSON.stringify(students[i]));
            const school = await this.School.findById(
                student.school,
                "name location.coordinates grade districtId schoolTime code"
            );
            // const shift = await this.Shifts.findById(student.shift,'name type');
            const parent = await this.Parent.findById(
                student.parent,
                "name lastName phone"
            );
            // const payOff = await this.Payoff.find(
            //   { personId: student.id },
            //   "date costBed costBes refCode"
            // );
            // const payment = await this.Payment.find({ student: student.id });
            let moreInfo = {};

            if (school) {
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
                            school.schoolTime[student.time].shiftdayTitle + stt;
                    }
                } else {
                    shiftName = school.schoolTime[0].name;
                    shiftType =
                        school.schoolTime[0].start +
                        " " +
                        school.schoolTime[0].end;
                }
                moreInfo.schoolName = school.name;
                moreInfo.schoolCode = school.code;
                moreInfo.schoolLat = school.location.coordinates[0];
                moreInfo.schoolLng = school.location.coordinates[1];
                moreInfo.grade = school.grade;
                moreInfo.districtId = school.districtId;
                moreInfo.shiftName = shiftName;
                moreInfo.shiftType = shiftType;
            } else {
                moreInfo.schoolName = "پیدا نشد";
                moreInfo.schoolLat = 0;
                moreInfo.schoolLng = 0;
                moreInfo.schoolCode = 0;
            }
            moreInfo.address = student.address;
            moreInfo.lat = student.location.coordinates[0];
            moreInfo.lng = student.location.coordinates[1];
            moreInfo.details = student.addressDetails;

            if (parent) {
                moreInfo.parentName = parent.name;
                moreInfo.parentLastName = parent.lastName;
                moreInfo.parentPhone = parent.phone;
            } else {
                moreInfo.parentName = "";
                moreInfo.parentLastName = "";
                moreInfo.parentPhone = "";
            }
            // if (payOff) moreInfo.payOff = payOff;
            moreInfo.payOff = [];
            // if (payment) moreInfo.payment = payment;
            moreInfo.payment = [];

            var myStudent = {
                student: student,
                moreInfo: moreInfo,
            };

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00044:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentsByIdsList(req, res) {
        try {
            const ids = req.body.ids;
            let students = await this.Student.find({ _id: { $in: ids } });

            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                //console.log(JSON.stringify(students[i]));
                const school = await this.School.findById(
                    students[i].school,
                    "name location.coordinates grade districtId schoolTime code"
                );

                // const shift = await this.Shifts.findById(students[i].shift,'name type');
                const parent = await this.Parent.findById(
                    students[i].parent,
                    "name lastName phone"
                );
                // const payOff = await this.Payoff.find(
                //   { personId: students[i].id },
                //   "date costBed costBes refCode"
                // );
                // const payment = await this.Payment.find({ student: students[i].id });
                const payment = [];
                let moreInfo = {};
                if (school) {
                    let shiftName = "",
                        shiftType = "";
                    // console.log('namenamename=',school.name)
                    // console.log('namen schoolTime=',school.schoolTime)
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
                                school.schoolTime[students[i].time]
                                    .shiftdayTitle + stt;
                        }
                    } else {
                        shiftName = school.schoolTime[0].name;
                        shiftType =
                            school.schoolTime[0].start +
                            " " +
                            school.schoolTime[0].end;
                    }
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolCode = school.code;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                    moreInfo.grade = school.grade;
                    moreInfo.districtId = school.districtId;
                    moreInfo.shiftName = shiftName;
                    moreInfo.shiftType = shiftType;
                } else {
                    moreInfo.schoolName = "پیدا نشد";
                    moreInfo.schoolLat = 0;
                    moreInfo.schoolLng = 0;
                    moreInfo.shiftName = "";
                    moreInfo.shiftType = "";
                }
                // if(shift){
                //   moreInfo.shiftName= shift.name;
                //   moreInfo.shiftType= shift.type;
                // }else{
                //   moreInfo.shiftName= "پیدا نشد";
                //   moreInfo.type= "";
                // }
                moreInfo.address = students[i].address;
                moreInfo.lat = students[i].location.coordinates[0];
                moreInfo.lng = students[i].location.coordinates[1];
                moreInfo.details = students[i].addressDetails;
                if (parent) {
                    moreInfo.parentName = parent.name;
                    moreInfo.parentLastName = parent.lastName;
                    moreInfo.parentPhone = parent.phone;
                } else {
                    moreInfo.parentName = "";
                    moreInfo.parentLastName = "";
                    moreInfo.parentPhone = "";
                }
                // if (payOff) moreInfo.payOff = payOff;
                // else
                moreInfo.payOff = [];
                // if (payment) moreInfo.payment = payment;
                // else
                moreInfo.payment = [];

                myStudent.push({
                    student: students[i],
                    moreInfo: moreInfo,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00045:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteStudent(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            if (!req.query.id || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 604,
                    message: "id needed!",
                });
            }

            let id;
            let student;
            if (mongoose.isValidObjectId(req.query.id)) {
                id = ObjectId.createFromHexString(req.query.id);
                student = await this.Student.findById(id).session(session);
                if (!student) {
                    await session.abortTransaction();
                    return this.response({
                        res,
                        message: "couldn't find student",
                    });
                }
            } else {
                student = await this.Student.findOne({
                    studentCode: req.query.id,
                }).session(session);
                if (!student) {
                    await session.abortTransaction();
                    return this.response({
                        res,
                        message: "couldn't find student",
                    });
                }
            }

            const agency = await this.Agency.findOne(
                {
                    $or: [
                        { admin: req.user._id },
                        { users: { $in: req.user._id } },
                    ],
                },
                ""
            ).session(session);

            if (agency) {
                await new this.OperationLog({
                    userId: req.user._id,
                    name: req.user.name + " " + req.user.lastName,
                    agencyId: agency._id,
                    targetIds: [student._id],
                    targetTable: "student",
                    sanadId: 0,
                    actionName: "deleteStudent",
                    actionNameFa: "حذف کامل دانش آموز",
                    desc: `دانش آموز ${student.name} ${student.school} از مدرسه با آی دی ${student.lastName}`,
                }).save({ session });
            } else if (req.user._id.toString() != student.parent.toString()) {
                await session.abortTransaction();
                return this.response({
                    res,
                    code: 203,
                    message: "couldn't delete this student parnet not match",
                });
            } else if (student.state != 0) {
                await session.abortTransaction();
                return this.response({
                    res,
                    code: 203,
                    message: "couldn't delete this student state not match",
                });
            }

            await Promise.all([
                this.StReport.deleteMany({ studentId: student.id }).session(
                    session
                ),
                this.RatingDriver.deleteMany({ studentId: student.id }).session(
                    session
                ),
                this.Exception.deleteMany({
                    "points.studentId": student.id,
                }).session(session),
            ]);

            await this.Pack.updateMany(
                { "points.studentId": student.id },
                { $pull: { points: { studentId: student.id } } },
                { session }
            );

            await this.Pack.deleteMany({ points: { $size: 0 } }).session(
                session
            );
            await this.SayadCheque.deleteMany({
                studentId: student._id,
            }).session(session);

            await Promise.all([
                this.Holiday.deleteMany({
                    studentId: student.studentCode,
                }).session(session),
                this.DriverAct.deleteMany({
                    studentId: student.studentCode,
                }).session(session),
            ]);

            const paySanad = await this.DocListSanad.find({
                forCode: "003005" + student.studentCode,
            }).session(session);

            for (const doc of paySanad) {
                await this.DocSanad.findByIdAndDelete(doc.titleId).session(
                    session
                );
                await this.DocListSanad.deleteMany({
                    titleId: doc.titleId,
                }).session(session);
            }

            const doclist = await this.DocListSanad.find({
                accCode: "003005" + student.studentCode,
            }).session(session);

            for (const doc of doclist) {
                await this.DocSanad.findByIdAndDelete(doc.titleId).session(
                    session
                );
                await this.DocListSanad.deleteMany({
                    titleId: doc.titleId,
                }).session(session);
            }

            const checkHis = await this.CheckHistory.find({
                $or: [
                    { toAccCode: "003005" + student.studentCode },
                    { fromAccCode: "003005" + student.studentCode },
                ],
            }).session(session);

            for (const check of checkHis) {
                await this.CheckInfo.findByIdAndDelete(check.infoId).session(
                    session
                );
                await this.CheckHistory.deleteMany({
                    infoId: check.infoId,
                }).session(session);
            }

            let service = await this.Service.findOne({
                student: req.query.id,
            }).session(session);
            if (service) {
                const index = service.student.indexOf(req.query.id);
                if (index !== -1) {
                    service.student.splice(index, 1);
                    service.studentCost.splice(index, 1);

                    if (service.routeSave.length > 1) {
                        if (index === 0) {
                            service.routeSave[0].routes =
                                service.routeSave[1].routes;
                            service.routeSave.splice(1, 1);
                        } else {
                            service.routeSave.splice(index, 1);
                        }
                        await service.save({ session });
                    } else if (service.routeSave.length === 1) {
                        await this.Service.findByIdAndDelete(
                            service._id
                        ).session(session);
                    } else {
                        await service.save({ session });
                    }
                }
            }

            await this.Student.findByIdAndDelete(student.id).session(session);

            // Final check (optional but safe)
            const stillExists = await this.Student.findById(student.id).session(
                session
            );
            if (stillExists) {
                await session.abortTransaction();
                return this.response({
                    res,
                    message: "Student still exists after deletion attempt",
                    code: 500,
                });
            }

            await session.commitTransaction();
            return this.response({ res, message: "delete" });
        } catch (error) {
            await session.abortTransaction();
            console.error("Transaction error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        } finally {
            session.endSession();
        }
    }

    async changeState(req, res) {
        try {
            const id = req.body.id;
            const state = req.body.state;
            let serviceState = 0;
            let stateTitle = "بدون درخواست";
            if (state === 1) {
                stateTitle = "در انتظار تایید اطلاعات";
            }
            if (state === 2) {
                stateTitle = "در انتظار پیش پرداخت";
            }
            if (state === 3) {
                stateTitle = "در انتظار سرویس";
                serviceState = 1;
            }
            const st = await this.Student.findByIdAndUpdate(id, {
                state,
                stateTitle,
                serviceNum: 0,
                serviceCost: 0,
            });
            const agency = await this.Agency.findOne(
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
            if (agency) {
                await new this.OperationLog({
                    userId: req.user._id,
                    name: req.user.name + " " + req.user.lastName,
                    agencyId: agency._id,
                    targetIds: [st._id],
                    targetTable: "student",
                    sanadId: 0,
                    actionName: "changeState",
                    actionNameFa: "تغییر وضعیت",
                    desc: `تغییر وضعیت دانش آموز از ${st.state} به ${state}`,
                }).save();
            }
            return this.response({
                res,
                message: "done",
                data: stateTitle,
            });
        } catch (error) {
            console.error("Error while 00047:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setPack(req, res) {
        try {
            const studentCode = req.body.studentCode;
            if (
                req.body.neighbourhood === undefined &&
                req.body.pack === undefined
            ) {
                return this.response({
                    res,
                    code: 604,
                    message: "pack or neighbourhood need!",
                });
            }

            let student = await this.Student.findOne({ studentCode });
            if (!student) {
                return this.response({
                    res,
                    code: 401,
                    message: "student not find bu this code",
                });
            }
            if (req.body.neighbourhood != undefined) {
                student.neighbourhood = req.body.neighbourhood;
            }
            if (req.body.pack != undefined) {
                student.pack = req.body.pack;
            }
            await student.save();
            return this.response({
                res,
                message: "done",
            });
        } catch (error) {
            console.error("Error while 00047:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getPacks(req, res) {
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
            const agencyId = req.query.agencyId;
            const myAgency = await this.Agency.findById(
                agencyId,
                "delete active"
            );

            if (!myAgency || myAgency.delete || !myAgency.active) {
                return this.response({
                    res,
                    code: 401,
                    message: "not active agency",
                    data: { fa_m: "شرکت غیرفعال است یا حذف شده" },
                });
            }
            const agencySet = await this.AgencySet.findOne(
                { agencyId },
                "showPack"
            );
            if (agencySet) {
                if (!agencySet.showPack) {
                    if (
                        !(
                            req.user.isadmin ||
                            req.user.isAgencyAdmin ||
                            req.user.isSuperAdmin ||
                            req.user.isSupport ||
                            req.user.isSchoolAdmin
                        )
                    ) {
                        return this.response({
                            res,
                            data: [],
                        });
                    }
                }
            }
            let onlySchool = [];
            const schs = await this.School.find({
                delete: false,
                agencyId: myAgency._id,
            }).lean();
            schs.forEach((scId) => {
                onlySchool.push(scId._id);
            });

            var qr = [];

            qr.push({ school: { $in: onlySchool } });
            qr.push({ delete: false });
            qr.push({ state: 3 });
            qr.push({ pack: { $ne: -1 } });
            qr.push({ pack: { $ne: null } });

            //console.log(JSON.stringify(qr));
            let students = await this.Student.find(
                {
                    $and: qr,
                },
                "name lastName studentCode school time address pack neighbourhood location.coordinates"
            );
            let myStudent = [];
            for (var i = 0; i < students.length; i++) {
                const school = await this.School.findById(
                    students[i].school,
                    "name location.coordinates gender schoolTime"
                ).lean();
                if (!school) {
                    continue;
                }
                school.lat = school.location.coordinates[0];
                school.lng = school.location.coordinates[1];
                school.rotaryShift = false;
                myStudent.push({
                    student: students[i],
                    address: {
                        route: students[i].address,
                        lat: students[i].location.coordinates[0],
                        lng: students[i].location.coordinates[1],
                    },
                    school: school,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myStudent,
            });
        } catch (error) {
            console.error("Error while 00048:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getStudentCode(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }
            const id = req.query.id;
            const student = await this.Student.findById(id, "studentCode -_id");
            return this.response({
                res,
                message: "ok",
                data: student,
            });
        } catch (error) {
            console.error("Error while 00048:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async checkStudentForSubmit(req, res) {
        try {
            if (
                req.query.name === undefined ||
                req.query.lastName === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "name lastName need",
                });
            }
            const phone = req.query.phone || "";
            const name = req.query.name;
            const lastName = req.query.lastName;
            let userId = req.user._id;
            if (phone != undefined && phone.length === 11) {
                const user = await this.Parent.findOne({ phone });
                if (user) userId = user._id;
            }
            const student = await this.Student.countDocuments({
                parent: userId,
                name,
                lastName,
            });

            return this.response({
                res,
                data: student,
            });
        } catch (error) {
            console.error("Error while 00049:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async deleteStudent2(req, res) {
        // Start a session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (!req.query.id || req.query.id.trim() === "") {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 604,
                    message: "id needed!",
                });
            }

            let id;
            let student;
            if (mongoose.isValidObjectId(req.query.id)) {
                id = ObjectId.createFromHexString(req.query.id);
                student = await this.Student.findById(id, null, { session });
                if (!student) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        message: "couldn't find student",
                    });
                }
            } else {
                student = await this.Student.findOne(
                    { studentCode: req.query.id },
                    null,
                    { session }
                );
                if (!student) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        message: "couldn't find student",
                    });
                }
            }

            const agency = await this.Agency.findOne(
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
                null,
                { session }
            );

            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agency._id,
                targetIds: [student._id],
                targetTable: "student",
                sanadId: 0,
                actionName: "deleteStudent",
                actionNameFa: "حذف کامل دانش آموز",
                desc: `دانش آموز ${student.name} ${student.school} از مدرسه با آی دی ${student.lastName}`,
            }).save({ session });

            const checkIfDocumentExists = async (model, query) => {
                const document = await model.findOne(query, null, { session });
                return document !== null;
            };

            await Promise.all([
                this.StReport.deleteMany(
                    { studentId: student.id },
                    { session }
                ),
                this.RatingDriver.deleteMany(
                    { studentId: student.id },
                    { session }
                ),
                // this.PayAction.deleteMany(
                //     { studentCode: student.studentCode },
                //     { session }
                // ),
                this.Exception.deleteMany(
                    { "points.studentId": student.id },
                    { session }
                ),
            ]);

            const [
                addressExists,
                stReportExists,
                ratingDriverExists,
                // payActionExists,
                pointExists,
                exceptionExists,
            ] = await Promise.all([
                checkIfDocumentExists(this.StReport, { studentId: student.id }),
                checkIfDocumentExists(this.RatingDriver, {
                    studentId: student.id,
                }),
                // checkIfDocumentExists(this.PayAction, {
                //     studentCode: student.studentCode,
                // }),
                checkIfDocumentExists(this.Exception, {
                    "points.studentId": student.id,
                }),
            ]);

            if (
                addressExists ||
                stReportExists ||
                ratingDriverExists ||
                // payActionExists ||
                pointExists ||
                exceptionExists
            ) {
                console.log("addressExists", addressExists);
                console.log("stReportExists", stReportExists);
                console.log("ratingDriverExists", ratingDriverExists);
                // console.log("payActionExists", payActionExists);
                console.log("pointExists", pointExists);
                console.log("exceptionExists", exceptionExists);
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    message: "Not all associated documents were deleted",
                    code: 500,
                });
            }

            let packF = await this.Pack.findOne(
                { "points.studentId": student.id },
                null,
                { session }
            );
            if (packF) {
                const pack = await this.Pack.findByIdAndUpdate(
                    packF.id,
                    { $pull: { points: { studentId: student.id } } },
                    { new: true, session }
                );
                if (pack.points.length === 0) {
                    await this.Pack.findByIdAndRemove(packF.id, { session });
                }
            }

            const packExists = await checkIfDocumentExists(this.Pack, {
                "points.studentId": student.id,
            });
            if (packExists) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    message:
                        "Pack document still exists after deletion attempt",
                    code: 500,
                });
            }

            await Promise.all([
                this.LevelAccDetail.deleteMany(
                    { accCode: student.studentCode },
                    { session }
                ),
                this.Holiday.deleteMany(
                    { studentId: student.studentCode },
                    { session }
                ),
                this.DriverAct.deleteMany(
                    { studentId: student.studentCode },
                    { session }
                ),
            ]);

            const [levelAccDetailExists, holidayExists, driverActExists] =
                await Promise.all([
                    checkIfDocumentExists(this.LevelAccDetail, {
                        accCode: student.studentCode,
                    }),
                    checkIfDocumentExists(this.Holiday, {
                        studentId: student.studentCode,
                    }),
                    checkIfDocumentExists(this.DriverAct, {
                        studentId: student.studentCode,
                    }),
                ]);

            if (levelAccDetailExists || holidayExists || driverActExists) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    message: "Not all related documents were deleted",
                    code: 500,
                });
            }

            const listAcc = await this.ListAcc.find(
                { codeLev3: student.studentCode },
                null,
                { session }
            );
            for (const ls of listAcc) {
                const doclist = await this.DocListSanad.find(
                    { accCode: ls.code },
                    null,
                    { session }
                );
                for (const doc of doclist) {
                    await this.DocSanad.findByIdAndDelete(doc.titleId, {
                        session,
                    });
                    await this.DocListSanad.deleteMany(
                        { titleId: doc.titleId },
                        { session }
                    );
                }

                const checkHis = await this.CheckHistory.find(
                    { $or: [{ toAccCode: ls.code }, { fromAccCode: ls.code }] },
                    null,
                    { session }
                );
                for (const check of checkHis) {
                    await this.CheckInfo.findByIdAndDelete(check.infoId, {
                        session,
                    });
                    await this.CheckHistory.deleteMany(
                        { infoId: check.infoId },
                        { session }
                    );
                }
            }

            let service = await this.Service.findOne(
                { student: req.query.id },
                null,
                { session }
            );
            if (service) {
                const index = service.student.indexOf(req.query.id);
                if (index !== -1) {
                    service.student = service.student.filter(
                        (id) => id !== req.query.id
                    );
                    service.studentCost = service.studentCost.filter(
                        (_, i) => i !== index
                    );

                    if (service.routeSave.length > 1) {
                        if (index === 0) {
                            service.routeSave[0].routes =
                                service.routeSave[1].routes;
                            service.routeSave = service.routeSave.slice(1);
                        } else {
                            service.routeSave = service.routeSave.filter(
                                (_, i) => i !== index
                            );
                        }
                        await service.save({ session });
                    } else if (service.routeSave.length === 1) {
                        await this.Service.findByIdAndDelete(service._id, {
                            session,
                        });
                    } else {
                        await service.save({ session });
                    }
                }
            }

            await this.Student.findByIdAndDelete(student.id, { session });

            const stillExists = await this.Student.findById(student.id, null, {
                session,
            });
            if (stillExists) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    message: "Student still exists after deletion attempt",
                    code: 500,
                });
            }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();
            return this.response({
                res,
                message: "delete",
            });
        } catch (error) {
            console.error("Error while 00046:", error);
            await session.abortTransaction();
            session.endSession();
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setAvanakStudent(req, res) {
        try {
            if (
                req.query.id === undefined ||
                req.query.id.trim() === "" ||
                req.query.phone === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "id phone need",
                });
            }
            const id = req.query.id;
            const phone = req.query.phone;
            let student = await this.Student.findById(id);
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }
            if (student.avanak && student.avanakNumber.length > 3) {
                await this.Student.findByIdAndUpdate(student.id, {
                    avanak: false,
                    avanakNumber: phone,
                });
                return this.response({
                    res,
                    message: "ok",
                });
            }

            await this.Student.findByIdAndUpdate(student.id, {
                avanak: true,
                avanakNumber: phone,
            });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while setAvanakStudent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setOtherStudentData(req, res) {
        try {
            const id = ObjectId.createFromHexString(req.body.id);
            const phone = req.body.phone || "";
            // console.log("setOtherStudentData", phone);
            const name = req.body.name || "";
            const del = req.body.del || false;
            const physicalCondition = req.body.physicalCondition;
            const physicalConditionDesc = req.body.physicalConditionDesc;
            let student = await this.Student.findById(id);
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }
            if (del) {
                for (var i = 0; i < student.supervisor.length; i++) {
                    if (student.supervisor[i].phone === phone) {
                        student.supervisor.splice(i, 1);
                        break;
                    }
                }
            } else if (phone.length > 8) {
                student.supervisor.push({ name: name, phone: phone });
            } else {
                student.physicalCondition = physicalCondition;
                student.physicalConditionDesc = physicalConditionDesc;
            }
            await student.save();
            return this.response({
                res,
                message: "student update",
            });
        } catch (error) {
            console.error("Error while setOtherStudentData:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async changeStudentDate(req, res) {
        try {
            const { startOfContract, endOfContract, studentId } = req.query;

            let student = await this.Student.findById(studentId);
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "Student not found!",
                });
            }
            const lastDate = student.startOfContract;
            const lastEnddate = student.endOfContract;
            if (startOfContract != null) {
                const changeDate = new Date(startOfContract);
                if (isNaN(changeDate.getTime())) {
                    return this.response({
                        res,
                        code: 400,
                        message: "Invalid startOfContract format.",
                    });
                }
                student.startOfContract = changeDate;
            }

            if (endOfContract != null) {
                const end = new Date(endOfContract);
                if (isNaN(end.getTime())) {
                    return this.response({
                        res,
                        code: 400,
                        message: "Invalid endOfContract format.",
                    });
                }
                student.endOfContract = end;
            }

            await student.save();

            const agency = await this.Agency.findOne(
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

            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agency._id,
                targetIds: [studentId],
                targetTable: "student",
                sanadId: 0,
                actionName: "changeStudentDate",
                actionNameFa: "تغییر تاریخ قرارداد",
                desc: `تغییر شروع قرارداد از ${new persianDate(lastDate).format(
                    "YY/MM/DD"
                )} به ${new persianDate(student.date).format(
                    "YY/MM/DD"
                )} و تاریخ پایان از ${new persianDate(lastEnddate).format(
                    "YY/MM/DD"
                )} به ${new persianDate(student.endOfContract).format(
                    "YY/MM/DD"
                )} `,
            }).save();

            return this.response({
                res,
                message: "Updated successfully.",
            });
        } catch (error) {
            console.error(`Error while changing student's date: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentsByDriver(req, res) {
        try {
            const id = req.user._id;

            const students = await this.Student.find({
                setter: id,
                delete: false,
            }).lean();

            if (students.length === 0) {
                return this.response({
                    res,
                    code: 404,
                    message: "No students found.",
                });
            }

            const [keys, users, schools, addresses] = await Promise.all([
                this.Keys.find({
                    keyId: { $in: students.map((s) => s.gradeId) },
                }).lean(),
                this.Parent.find({
                    _id: { $in: students.map((s) => s.parent) },
                }).lean(),
                this.School.find({
                    _id: { $in: students.map((s) => s.school) },
                }).lean(),
            ]);

            const keyMap = Object.fromEntries(
                keys.map((key) => [key.keyId, key.title])
            );
            const userMap = Object.fromEntries(
                users.map((user) => [user._id, user])
            );
            const schoolMap = Object.fromEntries(
                schools.map((school) => [school._id, school])
            );

            const data = students.map((student) => {
                const add = {};

                add.id = student._id;
                add.name = student.name;
                add.code = student.studentCode;
                add.createdAt = student.createdAt;
                add.lastName = student.lastName;
                add.state = student.state;
                add.grade = keyMap[student.gradeId] || "Unknown";

                const user = userMap[student.parent];
                add.parent_name = `${user?.name || ""} ${user?.lastName || ""}`;
                add.phone = user?.phone || "Unknown";

                const school = schoolMap[student.school];

                if (!school) {
                    return {
                        error: `Missing school data for student ${student._id}`,
                    };
                }

                add.school_name = school.name;
                add.address = student.address + " " + student.addressDetails;

                const shiftDetails = calculateShiftDetails(
                    school,
                    student.time
                );
                add.shiftName = shiftDetails.shiftName;
                add.shiftType = shiftDetails.shiftType;

                return add;
            });

            return this.response({
                res,
                data: data.filter((d) => !d.error),
            });
        } catch (error) {
            console.error("Error updating driver agent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();

function calculateShiftDetails(school, studentTime) {
    let shiftName = "";
    let shiftType = "";

    if (school.schoolTime.length > studentTime) {
        shiftName = school.schoolTime[studentTime].name;
        shiftType =
            school.schoolTime[studentTime].start +
            " " +
            school.schoolTime[studentTime].end;

        let stt = "";
        for (let t in school.schoolTime) {
            if (t == studentTime) continue;
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
            shiftType += school.schoolTime[studentTime].shiftdayTitle + stt;
        }
    } else {
        shiftName = school.schoolTime[0].name;
        shiftType = school.schoolTime[0].start + " " + school.schoolTime[0].end;
    }

    return { shiftName, shiftType };
}
function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}
