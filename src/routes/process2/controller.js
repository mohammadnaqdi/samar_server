const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const persianDate = require("persian-date");
const neshan = process.env.NESHAN;
const axios = require("axios");
module.exports = new (class extends controller {
    async driverbySchool(req, res) {
        try {
            const schools = req.body.schools;
            // console.log("agencyId",req.body.agencyId)
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);

            const onlyActive = req.body.onlyActive;
            let schoolIDs = [];
            for (var sc of schools) {
                schoolIDs.push(ObjectId.createFromHexString(sc));
            }
            const students = await this.Student.find(
                {
                    state: 4,
                    serviceId: { $gt: 0 },
                    school: { $in: schoolIDs },
                    delete: false,
                },
                ""
            ).distinct("_id");

            if (students.length === 0) {
                return this.response({
                    res,
                    code: 404,
                    message: "not find any",
                });
            }
            let studentIds = [];
            for (var st of students) {
                studentIds.push(st.toString());
            }
            const driverIds = await this.Service.find({
                student: { $in: studentIds },
                delete: false,
                active: true,
                agencyId,
            }).distinct("driverId");

            let qr = { _id: { $in: driverIds }, delete: false };
            if (onlyActive) {
                qr.active = true;
            }
            // console.log("qr",qr)
            const drivers = await this.Driver.find(
                qr,
                "userId carId driverCode nationalCode hesab shaba birthday"
            );
            // console.log("drivers",drivers.length)
            let driverList = [];
            for (var i = 0; i < drivers.length; i++) {
                let user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName nationalCode"
                );
                const car = await this.Car.findById(
                    drivers[i].carId,
                    "carModel colorCar"
                );
                const serviceSt = await this.Service.find(
                    { driverId: drivers[i]._id },
                    "student"
                );
                let studentCount = 0;
                let studentIds = [];
                for (var st of serviceSt) {
                    studentCount += st.student.length;
                    for (var stId of st.student) {
                        studentIds.push(ObjectId.createFromHexString(stId));
                    }
                }
                let schoolNames = [];
                const schoolIds = await this.Student.find({
                    _id: { $in: studentIds },
                }).distinct("school");
                // console.log("schoolIds",schoolIds)
                if (schoolIds.length > 0) {
                    schoolNames = await this.School.find(
                        { _id: { $in: schoolIds } },
                        "name"
                    ).distinct("name");
                }
                // console.log("schoolNames",schoolNames)
                let name = "";
                let lastName = "";
                let phone = "";
                let nationalCode = "";
                let carModel = "";
                if (user) {
                    phone = user.phone;
                    nationalCode = user.nationalCode;
                    name = user.name;
                    lastName = user.lastName;
                }
                if (car) {
                    carModel = car.carModel + " " + car.colorCar;
                }
                if (nationalCode.trim().length < 10) {
                    nationalCode = drivers[i].nationalCode;
                }
                driverList.push({
                    driverCode: drivers[i].driverCode,
                    shaba: drivers[i].shaba,
                    hesab: drivers[i].hesab,
                    birthday: drivers[i].birthday,
                    name,
                    lastName,
                    phone,
                    nationalCode,
                    carModel,
                    schools: schoolNames,
                    studentCount,
                    serviceCount: serviceSt.length,
                });
            }
            // console.log("driverList",driverList.length)
            return this.response({
                res,
                data: driverList,
            });
        } catch (error) {
            console.error("Error in driverbySchool:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async contractDateBySchool(req, res) {
        try {
            const { schools, gradeId } = req.body;
            const { end } = req.body;
            console.log("schools", schools);
            console.log("gradeId", gradeId);
            if (!schools || !gradeId) {
                return this.response({
                    res,
                    code: 210,
                    message: "Missing required fields (schools or gradeId).",
                });
            }
            console.log("end", end);
            const updateFields = {};

            if (end !== undefined) {
                const endDate = new Date(end);
                if (isNaN(endDate.getTime())) {
                    return this.response({
                        res,
                        code: 400,
                        message: "Invalid timestamp for end.",
                    });
                }
                updateFields.endOfContract = endDate;
            }

            if (end === undefined) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp.",
                });
            }

            const result = await this.Student.updateMany(
                {
                    school: { $in: schools },
                    gradeId: { $in: gradeId },
                },
                { $set: updateFields }
            );

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
                targetIds: schools,
                targetTable: "school",
                sanadId: 0,
                actionName: "contractDateBySchool",
                actionNameFa: "تغییر کلی تاریخ قرارداد",
                desc: `تغییر کلی تاریخ تعداد ${
                    schools.length
                } مدرسه در گریدهای ${gradeId.toString()} به تاریخ جدید ${new persianDate(
                    updateFields.endOfContract
                ).format("YY/MM/DD")}`,
            }).save();

            return this.response({
                res,
                message: `Done. ${result.modifiedCount} students updated.`,
            });
        } catch (error) {
            console.error(
                "Error while changing students contracts by school:",
                error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getServiceNumByDriver(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }
            const id = ObjectId.createFromHexString(req.query.id);

            const services = await this.Service.find(
                { driverId: id },
                "serviceNum student"
            );

            return this.response({
                res,
                data: services,
            });
        } catch (error) {
            console.error("Error while changing distance:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
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
    async removeStudentFromDDS(
        date,
        agencyId,
        ddses,
        studentId,
        formula,
        formulaForStudent
    ) {
        try {
            const monthLen = getMonth(date);
            for (var dds of ddses) {
                for (var i in dds.service) {
                    var serv = dds.service[i];
                    for (var st of serv.students) {
                        if (st.id.toString() === studentId.toString()) {
                            dds.sc -= serv.serviceCost / monthLen;
                            dds.dds -= serv.driverShare / monthLen;
                            let allStudents = [];
                            // console.log("serv.students", serv.students.length);
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
                            // console.log("allStudents", allStudents.length);
                            if (allStudents.length === 0) {
                                dds.service[i].serviceCost = 0;
                                dds.service[i].driverShare = 0;
                                dds.service[i].students = allStudents;
                                break;
                            } else {
                                const percent = await this.percent(agencyId);
                                if (formulaForStudent) {
                                    serv.driverShare = reverseEvaluateFormula(
                                        serv.serviceCost,
                                        percent,
                                        formula
                                    );
                                } else {
                                    serv.driverShare = evaluateFormula(
                                        formula,
                                        {
                                            a: serv.serviceCost,
                                            b: percent,
                                        }
                                    );
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
                }
                for (var i in dds.service) {
                    if (dds.service[i].students.length === 0) {
                        dds.service.splice(i, 1);
                        i--;
                    }
                }
                if (dds.service.length === 0) {
                    await this.DDS.findByIdAndDelete(dds._id);
                } else {
                    await this.DDS.findByIdAndUpdate(dds._id, {
                        service: dds.service,
                        sc: dds.sc,
                        dds: dds.dds,
                    });
                }
            }
            return;
        } catch (error) {
            console.error("Error while removeStudentFromDDS:", error);
            return null;
        }
    }
    async editStudentContract(req, res) {
        try {
            const {
                studentId,
                newServiceNum,
                newDriverId,
                start,
                end,
                agencyId,
                name,
                phone,
            } = req.body;
            const cost = req.body.cost || 0;

            let startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);
            let endDate = new Date(end);
            endDate.setHours(0, 0, 0, 0);
            console.log("editStudentContract", startDate);
            console.log("editStudentContract", endDate);
            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agencyId,
                targetIds: [studentId],
                targetTable: "student",
                sanadId: 0,
                actionName: "editStudentContract",
                actionNameFa: `تغییر تاریخچه دانش آموز`,
                desc: `تغییر تاریخچه در بازه زمانی ${new persianDate(
                    startDate
                ).format("YYYY/MM/DD")} تا ${new persianDate(endDate).format(
                    "YYYY/MM/DD"
                )} به راننده جدید با نام ${name} شماره ${phone} `,
            }).save();

            let formula = "a-(a*(b/100))";
            let formulaForStudent = false;
            const percent = await this.percent(agencyId);
            const setting = await this.AgencySet.findOne({
                agencyId: agencyId,
            });
            if (setting) {
                formula = setting.formula;
                formulaForStudent = setting.formulaForStudent;
            }

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for start or end.",
                });
            }

            const student = await this.Student.findById(
                studentId,
                "serviceCost"
            );
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "Student not found!",
                });
            }

            const studentCost = cost === 0 ? student.serviceCost : cost;
            const daysDifference = Math.ceil(
                (endDate - startDate) / (24 * 60 * 60 * 1000)
            );

            for (let d = 0; d <= daysDifference; d++) {
                const day = getDateByOffset(startDate, d);
                // console.log("day", day);
                const month = getMonth(day);
                const startSearch = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    0,
                    0,
                    0
                );
                const endSearch = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    23,
                    59,
                    59
                );

                let oldDDss = await this.DDS.find({
                    "service.students.id": studentId,
                    createdAt: { $lte: endSearch, $gte: startSearch },
                });
                console.log("oldDDss", oldDDss.length);
                if (oldDDss.length > 0) {
                    await this.removeStudentFromDDS(
                        startDate,
                        agencyId,
                        oldDDss,
                        studentId,
                        formula,
                        formulaForStudent
                    );

                    // for (var n = 1; n < oldDDss.length; n++) {
                    //     await this.DDS.findByIdAndDelete(oldDDss[n]._id);
                    // }
                }
                oldDDss = await this.DDS.find({
                    driverId: newDriverId,
                    createdAt: { $lte: endSearch, $gte: startSearch },
                });
                // console.log("oldzzzzDDss",oldDDss.length)
                for (var j = 0; j < oldDDss.length; j++) {
                    if (oldDDss[j].service.length == 0) {
                        await this.DDS.findByIdAndDelete(oldDDss[j]._id);
                        oldDDss.splice(j, 1);

                        j--;
                    } else {
                        for (var i = 0; i < oldDDss[j].service.length; i++) {
                            if (oldDDss[j].service[i].students.length == 0) {
                                oldDDss[j].service.splice(i, 1);
                                i--;
                                await this.DDS.findByIdAndUpdate(
                                    oldDDss[j]._id,
                                    {
                                        service: oldDDss[j].service,
                                    }
                                );
                            }
                        }
                        if (oldDDss[j].service.length == 0) {
                            await this.DDS.findByIdAndDelete(oldDDss[j]._id);
                            oldDDss.splice(j, 1);
                            j--;
                        }
                    }
                }
                // console.log("oldzzzz222DDss",oldDDss.length)

                let oldDDs = null;
                if (oldDDss.length != 0) {
                    oldDDs = oldDDss[0];
                }
                if (oldDDs) {
                    let newCost = 0;
                    let newDDS = 0;
                    let findService = false;
                    for (var i in oldDDs.service) {
                        let ex = false;
                        if (newServiceNum == oldDDs.service[i].num) {
                            ex = true;
                            findService = true;
                            oldDDs.service[i].students.push({
                                id: studentId,
                                cost: studentCost,
                            });
                            oldDDs.service[i].serviceCost =
                                oldDDs.service[i].serviceCost + studentCost;
                            let driverShare = 0;
                            if (formulaForStudent) {
                                driverShare = reverseEvaluateFormula(
                                    oldDDs.service[i].serviceCost,
                                    percent,
                                    formula
                                );
                            } else {
                                driverShare = evaluateFormula(formula, {
                                    a: oldDDs.service[i].serviceCost,
                                    b: percent,
                                });
                            }
                            newCost += oldDDs.service[i].serviceCost;
                            newDDS += driverShare;
                            oldDDs.service[i].driverShare = driverShare;
                        }
                        if (!ex) {
                            newCost += oldDDs.service[i].serviceCost;
                            newDDS += oldDDs.service[i].driverShare;
                        }
                    }
                    // console.log("findService", findService);
                    if (!findService) {
                        let driverShare = 0;
                        if (formulaForStudent) {
                            driverShare = reverseEvaluateFormula(
                                studentCost,
                                percent,
                                formula
                            );
                        } else {
                            driverShare = evaluateFormula(formula, {
                                a: studentCost,
                                b: percent,
                            });
                        }
                        let newService = {
                            num: parseInt(newServiceNum),
                            students: [],
                            serviceCost: studentCost,
                            driverShare: driverShare,
                        };
                        newService.students.push({
                            id: studentId,
                            cost: studentCost,
                        });

                        oldDDs.service.push(newService);
                        newCost += studentCost;
                        newDDS += driverShare;
                    }
                    newDDS = Math.round(newDDS / month);
                    newCost = Math.round(newCost / month);
                    if (!newDDS) {
                        // console.log("oldzzzz222DDss", oldDDs._id);
                        newDDS = 0;
                        newCost = 0;
                    }
                    // oldDDs.dds = newDDS / month;
                    // oldDDs.sc = newCost / month;
                    // oldDDs.status = "Edited";
                    // oldDDs.desc = "بازنویسی شده dsc";
                    // console.log("oldDDs.service[i]", oldDDs.service[i]);
                    // await oldDDs.save();
                    await this.DDS.findByIdAndUpdate(oldDDs.id, {
                        dds: newDDS,
                        sc: newCost,
                        status: "Edited",
                        desc: "بازنویسی شده dsc",
                        service: oldDDs.service,
                    });
                } else {
                    let driverShare = 0;
                    if (formulaForStudent) {
                        driverShare = reverseEvaluateFormula(
                            studentCost,
                            percent,
                            formula
                        );
                    } else {
                        driverShare = evaluateFormula(formula, {
                            a: studentCost,
                            b: percent,
                        });
                    }
                    const newDDS = Math.round(driverShare / month);
                    const newCost = Math.round(studentCost / month);
                    const dd = new this.DDS({
                        agencyId,
                        driverId: newDriverId,
                        name,
                        phone,
                        service: [
                            {
                                num: newServiceNum,
                                serviceCost: studentCost,
                                driverShare: driverShare,
                                students: [
                                    {
                                        id: studentId,
                                        cost: studentCost,
                                    },
                                ],
                            },
                        ],
                        dds: newDDS,
                        sc: newCost,
                        status: "Edited",
                        desc: "بازنویسی شده dsc",
                        createdAt: day,
                    });
                    await dd.save();
                }
            }

            return this.response({ res, message: "Done." });
        } catch (error) {
            console.error("Error while editing student's contract:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverCount(req, res) {
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

            const driverActive = await this.Driver.countDocuments({
                agencyId,
                active: true,
                delete: false,
            });
            const driverNotActive = await this.Driver.countDocuments({
                agencyId,
                active: false,
                delete: false,
            });
            const driverAgent = await this.Driver.countDocuments({
                agencyId,
                active: true,
                isAgent: true,
                delete: false,
            });

            return this.response({
                res,
                data: { driverActive, driverNotActive, driverAgent },
            });
        } catch (error) {
            console.error("Error while getDriverCount:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getAllDriversId(req, res) {
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

            const drivers = await this.Driver.find({
                agencyId,
                active: true,
                delete: false,
            }).distinct("_id");

            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while getAllDriversId:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    // async setAllZeroDistance(req, res) {
    //     try {
    //         const not = [
    //             "66ebdb0ecf93f9f2f733bb74",
    //             "670f7ebc8e0c91a735ab930b",
    //             "671a02e023bae7797c6d1fcc",
    //             "6719615323bae7797c6bd199",
    //             "671c751ac8020750225a67ea",
    //             "671951e523bae7797c6bcc9b",
    //             "67195a7a23bae7797c6bd0cb",
    //         ];
    //         const students = await this.Student.find(
    //             { delete: false, serviceDistance: 0, _id: { $nin: not } },
    //             "school address"
    //         );
    //         const stWithAddressNull = [];
    //         const stWithSchoolNull = [];
    //         const stWithDistanceZero = [];

    //         const studentPromises = students.map(async (st) => {
    //             const address = await this.Address.findById(
    //                 st.address,
    //                 "lat lng"
    //             );
    //             if (!address) {
    //                 stWithAddressNull.push(st._id.toString());
    //                 return null;
    //             }
    //             const sch = await this.School.findById(st.school, "lat lng");
    //             if (!sch) {
    //                 stWithSchoolNull.push(st._id.toString());
    //                 return null;
    //             }
    //             let origin = `${address.lat},${address.lng}`;
    //             let dest = `${sch.lat},${sch.lng}`;
    //             const url = `https://api.neshan.org/v4/direction/no-traffic?origin=${origin}&destination=${dest}`;

    //             const options = {
    //                 headers: {
    //                     "Api-Key": neshan,
    //                 },
    //                 timeout: 7700,
    //             };
    //             let serviceDistance = 0;
    //             try {
    //                 const response = await axios.get(url, options);
    //                 serviceDistance =
    //                     response.data.routes[0].legs[0].distance.value;
    //             } catch (error) {
    //                 console.log("Neshan error=", error.message);
    //             }
    //             if (serviceDistance != 0) {
    //                 await this.Student.findByIdAndUpdate(st._id, {
    //                     serviceDistance,
    //                 });
    //             } else {
    //                 stWithDistanceZero.push(st._id.toString());
    //                 return null;
    //             }
    //         });

    //         // Wait for all promises to complete
    //         await Promise.all(studentPromises);

    //         console.log("stWithAddressNull", stWithAddressNull);
    //         console.log("stWithSchoolNull", stWithSchoolNull);
    //         console.log("stWithDistanceZero", stWithDistanceZero);

    //         return this.response({
    //             res,
    //             message: "ok",
    //         });
    //     } catch (error) {
    //         console.error("Error while setAllZeroDistance:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async getDOSByAgency(req, res) {
        try {
            const { agencyId } = req.query;

            const dos = await this.DOS.find({ agencyId }).lean();

            return this.response({
                res,
                data: dos,
            });
        } catch (error) {
            console.error("Error while getting dos by agency:", error);
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
            console.log("remain", remain);

            return this.response({
                res,
                data: remain,
            });
        } catch (error) {
            console.error("Error while editing DDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentServiceList(req, res) {
        try {
            const { schools, agencyId } = req.body;

            let formula = "a-(a*(b/100))";
            let formulaForStudent = false;
            const percent = await this.percent(agencyId);
            const setting = await this.AgencySet.findOne({
                agencyId: agencyId,
            });
            if (setting) {
                formula = setting.formula;
                formulaForStudent = setting.formulaForStudent;
            }

            const students = await this.Student.find(
                { school: { $in: schools }, delete: false, state: 4 },
                "name lastName serviceId serviceDistance serviceCost"
            );
            let services = [];

            for (var st of students) {
                const service = await this.Service.findOne(
                    { serviceNum: st.serviceId },
                    "driverName driverCar driverSharing percentInfo"
                );
                if (!service) continue;
                let driverShare = 0;
                if (formulaForStudent) {
                    driverShare = reverseEvaluateFormula(
                        st.serviceCost,
                        percent,
                        formula
                    );
                } else {
                    driverShare = evaluateFormula(formula, {
                        a: st.serviceCost,
                        b: percent,
                    });
                }
                services.push({
                    studentName: st.name + " " + st.lastName,
                    serviceDistance: st.serviceDistance,
                    serviceCost: st.serviceCost,
                    driverShare: driverShare,
                    driverName: service.driverName,
                    driverCar: service.driverCar,
                });
            }

            return this.response({
                res,
                data: services,
            });
        } catch (error) {
            console.error(`Error while studentCondition: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteSanadStudentNoExistinAgency(req, res) {
        try {
            const { agencyId, bes, bed } = req.query;
            const agency = await this.Agency.findById(agencyId);
            const schools = await this.School.find({ agencyId }).distinct(
                "_id"
            );

            const docList = await this.DocListSanad.find({
                agencyId: agency._id,
                bes: parseInt(bes),
                bed: parseInt(bed),
            });
            let stDel = 0;
            let stNoExist = 0;
            let stNoSchool = 0;
            for (var doc of docList) {
                const str = doc.note;
                const regex = /کد (\d+)/;
                const match = str.match(regex);
                if (match) {
                    const code = match[1];
                    // console.log("Extracted code:", code);
                    const st = await this.Student.findOne({
                        studentCode: code,
                    });

                    if (!st) {
                        stNoExist++;
                        await this.DocListSanad.deleteMany({
                            titleId: doc.titleId,
                        });
                        await this.DocSanad.findByIdAndDelete(doc.titleId);
                        const checkHis = await this.CheckHistory.find({
                            agencyId: agency._id,
                            sanadNum: doc.doclistId,
                        });
                        for (const check of checkHis) {
                            await this.CheckInfo.findByIdAndDelete(
                                check.infoId
                            );
                            await this.CheckHistory.deleteMany({
                                infoId: check.infoId,
                            });
                        }
                        continue;
                    }
                    if (st.delete) {
                        stDel++;
                        await this.DocListSanad.deleteMany({
                            titleId: doc.titleId,
                        });
                        await this.DocSanad.findByIdAndDelete(doc.titleId);
                        continue;
                    }
                    let existSchool = false;
                    for (var sc of schools) {
                        if (sc.toString() === st.school.toString()) {
                            existSchool = true;
                            break;
                        }
                    }
                    if (!existSchool) {
                        stNoSchool++;
                    }
                } else {
                    console.log("No code found.");
                }
            }
            // console.log("stDel", stDel);
            // console.log("stNoExist", stNoExist);
            // console.log("stNoSchool", stNoSchool);

            return this.response({
                res,
                data: docList.length,
            });
        } catch (error) {
            console.error(`Error while sanadNoInMyAgency: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async repleaceNewPriceforServiceAgency(req, res) {
        try {
            const { agencyId } = req.query;
            const service = await this.Service.find({ agencyId: agencyId });

            console.log("service", service.length);
            for (var ser of service) {
                for (var i in ser.student) {
                    await this.Student.findByIdAndUpdate(ser.student[i], {
                        serviceCost: ser.studentCost[i],
                    });
                }
            }
            // console.log("stNoExist",stNoExist);
            // console.log("stNoSchool",stNoSchool);

            return this.response({
                res,
                data: service.length,
            });
        } catch (error) {
            console.error(
                `Error while repleaceNewPriceforServiceAgency: ${error}`
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverDDS(req, res) {
        try {
            if (!req.query.driverId || req.query.driverId.trim() === "") {
                return this.response({
                    res,
                    code: 204,
                    message: "driverId needed!",
                });
            }
            const { driverId } = req.query;

            const report = await this.DDS.find({
                driverId,
            }).sort({ createdAt: 1 });

            return this.response({
                res,
                data: report,
            });
        } catch (error) {
            console.error("Error in driverDDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async deleteDDS(req, res) {
        try {
            if (!req.query.id || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 204,
                    message: "id needed!",
                });
            }
            const { id } = req.query;

            await this.DDS.findByIdAndDelete(id);

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in deleteDDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverDdsOneDay(req, res) {
        try {
            const { driverId, day } = req.query;

            let startDate = new Date(day);
            startDate.setHours(0, 0, 0, 0);
            let endDate = new Date(day);
            endDate.setHours(23, 59, 59, 0);

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
            console.error("Error while getDriverDdsOneDay:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async removeAllEmptyServiceStudentFromDDS(req, res) {
        try {
            const dds = await this.DDS.find({
                "service.students": [],
            });
            console.log("dds", dds.length);
            let count = 0;
            for (var dd of dds) {
                let change = false;
                for (var i = 0; i < dd.service.length; i++) {
                    if (dd.service[i].students.length == 0) {
                        dd.service.splice(i, 1);
                        i--;
                        count++;
                        change = true;
                    }
                }
                if (change) {
                    await this.DDS.findByIdAndUpdate(dd._id, {
                        service: dd.service,
                    });
                }
            }
            console.log("count", count);
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in deleteDDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async findDriversHaveMoreADdsInOneDay(req, res) {
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
            const startDate = new Date("2024-09-21T20:29:59.209Z");
            const endDate = new Date("2025-01-20T20:29:02.209Z");
            let Difference_In_Time = endDate.getTime() - startDate.getTime();

            const days =
                Math.round(Difference_In_Time / (1000 * 3600 * 24)) + 1;
            console.log("Difference_In_Days", days);
            const drivers = await this.Driver.find(
                { agencyId, delete: false, active: true },
                "driverCode"
            );
            let driverIDs = [];
            for (var d of drivers) {
                driverIDs.push(d._id);
            }
            let driverFind = [];
            for (var i = 0; i < days; i++) {
                if (driverIDs.length === 0) break;
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
                const dds = await this.DDS.find({
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    driverId: { $in: driverIDs },
                });
                for (var d = 0; d < driverIDs.length; d++) {
                    const count = countDriverIdOccurrences(dds, driverIDs[d]);
                    if (count > 1) {
                        driverFind.push(driverIDs[d]);
                        driverIDs.splice(d, 1);
                        d--;
                    }
                }
            }
            const userIds = await this.Driver.find(
                {
                    _id: { $in: driverFind },
                },
                "userId"
            ).distinct("userId");
            const users = await this.User.find(
                {
                    _id: { $in: userIds },
                },
                "name lastName"
            );
            let userName = [];
            for (var user of users) {
                userName.push(user.name + " " + user.lastName);
            }

            return this.response({
                res,
                message: "ok",
                data: userName,
            });
        } catch (error) {
            console.error("Error in deleteDDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async removeStudentFromDDSRange(req, res) {
        try {
            const studentId = req.query.studentId;
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            if (isNaN(startDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for date.",
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

            let ddses = await this.DDS.find({
                agencyId: agencyId,
                "service.students.id": studentId,
                createdAt: { $lte: endSearch, $gte: startSearch },
            });
            console.log("ddses.length", ddses.length);
            if (ddses.length === 0) {
                return this.response({
                    res,
                    code: 404,
                    message: "dds not find.",
                });
            }
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
            //
            // console.log("serviceNum", serviceNum);
            // console.log("studentId", studentId);
            for (var dds of ddses) {
                const monthLen = getMonth(dds.createdAt);
                for (var i in dds.service) {
                    var serv = dds.service[i];
                    let exist = false;
                    for (var st of serv.students) {
                        if (st.id == studentId) {
                            exist = true;
                            break;
                        }
                    }
                    if (!exist) continue;
                    dds.sc -= serv.serviceCost / monthLen;
                    dds.dds -= serv.driverShare / monthLen;
                    let allStudents = [];
                    // console.log("serv.students", serv.students.length);
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
                    if (allStudents.length === 0) {
                        dds.service[i].serviceCost = 0;
                        dds.service[i].driverShare = 0;
                        dds.service[i].students = allStudents;
                        break;
                    } else {
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

                // console.log("service", dds.service);
                await this.DDS.findByIdAndUpdate(dds._id, {
                    service: dds.service,
                    sc: dds.sc,
                    dds: dds.dds,
                });
            }
            // console.log("a", a);
            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agencyId,
                targetIds: [studentId],
                targetTable: "student",
                sanadId: 0,
                actionName: "removeStudentFromDayDDS",
                actionNameFa: "حذف دانش آموز از کارکرد روز",
                desc: `حذف دانش آموز از تاریخ ${new persianDate(
                    startSearch
                ).format("YY/MM/DD")} تا ${new persianDate(endSearch).format(
                    "YY/MM/DD"
                )} از کارکرد روز `,
            }).save();
            return this.response({ res, message: `DONE` });
        } catch (error) {
            console.error("Error while RemoveStudentFromDDSRange:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async checkDocumentsSame(req, res) {
        try {
            const { agencyId, schoolId } = req.query;
            // const agency = await this.Agency.findById(
            //     agencyId,
            //     "settings"
            // );
            // if (!agency) {
            //     return this.response({
            //         res,
            //         code: 404,
            //         message: "Agency not found!",
            //     });
            // }
            let kol = "003";
            let moeen = "005";

            const s = req.query.s || "شارژ";
            // console.log("sssss=",s)
            let studentSame = [];
            const students = await this.Student.find(
                { school: schoolId, delete: false },
                "studentCode name lastName"
            );
            for (var st of students) {
                const docList = await this.DocListSanad.find({
                    agencyId: agencyId,
                    note: { $regex: ".*" + s + ".*" },
                    accCode: `${kol}${moeen}${st.studentCode}`,
                });

                if (docList.length > 1) {
                    let count = 0;
                    for (var i = 0; i < docList.length; i++) {
                        if (docList[i].note.toString().includes(s)) {
                            count++;
                        }
                        if (count > 1) {
                            studentSame.push(st);
                            break;
                        }
                        // if(docList[i].bes == docList[j].bes && docList[i].bed == docList[j].bed
                        //     && docList[i].note == docList[j].note){
                        //         studentSame.push(st);
                        //         break;
                        //     }
                    }
                    // for(var i=0,j=1;i<docList.length,j<docList.length;j++,i++){
                    //     if(docList[i].bes == docList[j].bes && docList[i].bed == docList[j].bed
                    //         && docList[i].note == docList[j].note){
                    //             studentSame.push(st);
                    //             break;
                    //         }

                    // }
                }
            }

            console.log("studentSame", studentSame.length);
            return this.response({
                res,
                message: "ok",
                data: studentSame,
            });
        } catch (error) {
            console.error("Error in checkDocumentsSame:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAgencyDDSPage(req, res) {
        try {
            const { agencyId, start, name } = req.body;
            let page = req.body.page;
            if (page < 0) page = 0;
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
            let qr = [];
            // if (name.trim().length>1) {
            //     qr.push({
            //         $or: [
            //             { name: { $regex: ".*" + name + ".*" } },
            //             { lastName: { $regex: ".*" + name + ".*" } },
            //             { phone: { $regex: ".*" + name + ".*" } },
            //         ],
            //     });
            // }
            const driverId = await this.Driver.find(
                {
                    agencyId,
                    active: true,
                    delete: false,
                },
                "userId"
            )
                .skip(page * 10)
                .limit(10);
            const driverCount = await this.Driver.countDocuments({
                agencyId,
                active: true,
                delete: false,
            });
            let report = [];
            for (var dr of driverId) {
                const user = await this.User.findById(
                    dr.userId,
                    "name lastName"
                );
                if (!user) continue;
                const dds = await this.DDS.find(
                    {
                        $and: [
                            { createdAt: { $lte: endDate, $gte: startDate } },
                            { service: { $ne: [] } },
                            { driverId: dr._id },
                        ],
                    },
                    "service dds sc createdAt"
                ).sort({ createdAt: 1 });
                const work = await this.DDS.aggregate([
                    {
                        $match: {
                            $and: [
                                {
                                    createdAt: {
                                        $lte: endDate,
                                        $gte: startDate,
                                    },
                                },
                                { service: { $ne: [] } },
                                { driverId: dr._id },
                            ],
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            // num:{$push: "$service.num"  } ,
                            days: {
                                $push: {
                                    date: "$createdAt",
                                    dds: "$dds",
                                    sc: "$sc",
                                    service: "$service",
                                },
                            },
                            totalCost: { $sum: "$sc" },
                            totalDDS: { $sum: "$dds" },
                        },
                    },
                ]);
                report.push({
                    user,
                    // work: dds,
                    work,
                });
            }

            return this.response({
                res,
                data: { report, driverCount },
            });
        } catch (error) {
            console.error("Error while getting agency's DDS:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getStudentsByIds(req, res) {
        try {
            if (!req.body.ids || req.body.ids.length === 0) {
                return this.response({
                    res,
                    code: 204,
                    message: "ids needed!",
                });
            }
            const { ids } = req.body;

            const student = await this.Student.find(
                {
                    _id: { $in: ids },
                },
                "name lastName"
            );

            return this.response({
                res,
                data: student,
            });
        } catch (error) {
            console.error(`Error while getStudentsByIds: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
function countDriverIdOccurrences(arr, targetId) {
    return arr.filter(
        (item) => item.driverId.toString() === targetId.toString()
    ).length;
}
function getDateByOffset(startDate, offsetDays) {
    return new Date(startDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
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
