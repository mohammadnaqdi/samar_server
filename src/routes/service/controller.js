const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = new (class extends controller {
    async setService(req, res) {
        try {
            const distance = req.body.distance;
            const cost = req.body.cost;
            const student = req.body.student;
            const studentCost = req.body.studentCost;
            const driverCost = req.body.driverCost;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const driverId = req.body.driverId;
            const driverSharing = req.body.driverSharing;
            const routeSave = req.body.routeSave;
            const percentInfo = req.body.percentInfo;
            const schoolId = req.body.schoolId;
            const time = req.body.time;
            const driverPic = req.body.driverPic;
            const driverName = req.body.driverName;
            const driverCar = req.body.driverCar;
            const driverPhone = req.body.driverPhone;
            const driverCarPelak = req.body.driverCarPelak;
            // console.log("req.body.agencyId", req.body.agencyId);
            // console.log("agencyId", agencyId);
            const agency = await this.Agency.findOne(
                {
                    _id: agencyId,
                    delete: false,
                },
                ""
            ).lean();
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "somthing wrong your agency is delete maybe",
                    data: {
                        fa_m: "خطایی پیش آمده ممکن است شرکت شما حذف شده باشد!",
                    },
                });
            }
            let invoice = await this.Invoice.findOne({
                agencyId,
                type: "serviceCost",
            });
            if (!invoice) {
                invoice = await new this.Invoice({
                    title: "هزینه سرویس",
                    confirmInfo: true,
                    agencyId: agency._id,
                    setter: req.user._id,
                    type: "serviceCost",
                    amount: 0,
                }).save();
            }
            const driver = await this.Driver.findOne(
                { _id: driverId, delete: false },
                "driverCode"
            ).lean();
            if (!driver) {
                return this.response({
                    res,
                    code: 404,
                    message: "Driver not found or deleted",
                    data: {
                        fa_m: "راننده پیدا نشد یا حذف شده است!",
                    },
                });
            }

            let service = new this.Service({
                distance,
                cost,
                driverSharing,
                agencyId,
                driverId,

                schoolIds: schoolId,
                time,
                routeSave,
                percentInfo,
                driverPhone,
                driverCar,
                driverName,
                driverPic,
                driverCarPelak,
            });
            await service.save();
            for (var i = 0; i < student.length && i < studentCost.length; i++) {
                await this.Student.findByIdAndUpdate(student[i], {
                    service: service._id,
                    serviceNum: service.serviceNum,
                    driverCode: driver.driverCode,
                    agencyId,
                    serviceCost: studentCost[i],
                    driverCost: driverCost[i],
                    state: 4,
                    stateTitle: "دارای سرویس",
                });
                const payQueue = await this.PayQueue.findOne({
                    inVoiceId: invoice._id,
                    studentId: student[i],
                });
                if (!payQueue) {
                    await new this.PayQueue({
                        inVoiceId: invoice._id,
                        agencyId,
                        studentId: student[i],
                        code: invoice.code,
                        setter: req.user._id,
                        type: invoice.type,
                        amount: invoice.amount,
                        title: invoice.title,
                        maxDate: invoice.maxDate,
                        isPaid: false,
                    }).save();
                }
            }

            return this.response({
                res,
                data: { id: service.id, serviceNum: service.serviceNum },
            });
        } catch (error) {
            console.error("Error while set Service:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    // async updateService(req, res) {
    //     try {
    //         const id = req.body.id;
    //         const distance = req.body.distance;
    //         const cost = req.body.cost;
    //         const student = req.body.student;
    //         const studentPast = req.body.studentPast;
    //         const studentCost = req.body.studentCost;
    //         const driverCost = req.body.driverCost;
    //         const agencyId = req.body.agencyId;
    //         const driverId = req.body.driverId;
    //         const driverSharing = req.body.driverSharing;
    //         const routeSave = req.body.routeSave;
    //         const percentInfo = req.body.percentInfo;
    //         const schoolId = req.body.schoolId;
    //         const time = req.body.time;
    //         const driverPic = req.body.driverPic;
    //         const driverName = req.body.driverName;
    //         const driverCar = req.body.driverCar;
    //         const driverPhone = req.body.driverPhone;
    //         const driverCarPelak = req.body.driverCarPelak;

    //         let service = await this.Service.findById(id);
    //         if (!service) {
    //             return this.response({
    //                 res,
    //                 code: 501,
    //                 message: "service not find",
    //             });
    //         }
    //         const driver = await this.Driver.findOne(
    //             { _id: driverId, delete: false },
    //             "driverCode"
    //         ).lean();
    //         if (!driver) {
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "Driver not found or deleted",
    //                 data: {
    //                     fa_m: "راننده پیدا نشد یا حذف شده است!",
    //                 },
    //             });
    //         }
    //         let invoice = await this.Invoice.findOne({
    //             agencyId,
    //             type: "serviceCost",
    //         });
    //         if (!invoice) {
    //             invoice = await new this.Invoice({
    //                 title: "هزینه سرویس",
    //                 confirmInfo: true,
    //                 agencyId: agencyId,
    //                 setter: req.user._id,
    //                 type: "serviceCost",
    //                 amount: 0,
    //             }).save();
    //         }
    //         for (let i = 0; i < studentPast.length; i++) {
    //             let exist = false;
    //             for (var stt of student) {
    //                 if (stt.toString() === studentPast[i].toString()) {
    //                     exist = true;
    //                     break;
    //                 }
    //             }
    //             if (exist) continue;
    //             let st = await this.Student.findByIdAndUpdate(studentPast[i], {
    //                 service: null,
    //                 serviceNum: -1,
    //                 serviceCost: 0,
    //                 driverCost: 0,
    //                 driverCode: "",
    //                 state: 5,
    //                 stateTitle: `حذف از سرویس ${service.serviceNum}`,
    //             });
    //             await new this.OperationLog({
    //                 userId: req.user._id,
    //                 name: req.user.name + " " + req.user.lastName,
    //                 agencyId: agencyId,
    //                 targetIds: [st._id],
    //                 targetTable: "student",
    //                 sanadId: 0,
    //                 actionName: "deleteStudentFromService",
    //                 actionNameFa: `حذف از سرویس ${service.serviceNum}`,
    //                 desc: `حذف از سرویس ${service.serviceNum} راننده ${driverName} مبلغ ${st.serviceCost}`,
    //             }).save();
    //         }
    //         const lastCost = service.cost;
    //         // const lastStudentCost = service.studentCost;
    //         // const lastStudent = service.student;
    //         const lastDriverName = service.driverName;
    //         service.distance = distance;
    //         service.cost = cost;
    //         service.driverSharing = driverSharing;
    //         // service.student = student;
    //         // service.studentCost = studentCost;
    //         service.agencyId = agencyId;
    //         service.driverId = driverId;
    //         service.schoolIds = schoolId;
    //         service.time = time;
    //         service.routeSave = routeSave;
    //         service.percentInfo = percentInfo;
    //         service.driverPhone = driverPhone;
    //         service.driverCar = driverCar;
    //         service.driverName = driverName;
    //         service.driverPic = driverPic;
    //         service.driverCarPelak = driverCarPelak;

    //         const studentSer = await this.Student.find({
    //             service: service._id,
    //         }).lean();
    //         if (studentSer.length === 0) {
    //             service.delete = true;
    //         }

    //         await service.save();

    //         let before = [];
    //         for (let i = 0; i < student.length && i < studentCost.length; i++) {
    //             var st = await this.Student.findByIdAndUpdate(student[i], {
    //                 service: service._id,
    //                 agencyId,
    //                 serviceNum: service.serviceNum,
    //                 driverCode: driver.driverCode,
    //                 serviceCost: studentCost[i],
    //                 driverCost: driverCost[i],
    //                 state: 4,
    //                 stateTitle: "دارای سرویس",
    //             });
    //             const payQueue = await this.PayQueue.findOne({
    //                 inVoiceId: invoice._id,
    //                 studentId: student[i],
    //             });
    //             if (!payQueue) {
    //                 await new this.PayQueue({
    //                     inVoiceId: invoice._id,
    //                     agencyId,
    //                     studentId: student[i],
    //                     code: invoice.code,
    //                     setter: req.user._id,
    //                     type: invoice.type,
    //                     amount: invoice.amount,
    //                     title: invoice.title,
    //                     maxDate: invoice.maxDate,
    //                     isPaid: false,
    //                 }).save();
    //             }
    //             before.push({
    //                 name: st.name,
    //                 lastName: st.lastName,
    //                 studentCode: st.studentCode,
    //                 cost: st.serviceCost,
    //                 serviceNum: st.serviceNum,
    //             });
    //         }
    //         await new this.OperationLog({
    //             userId: req.user._id,
    //             name: req.user.name + " " + req.user.lastName,
    //             agencyId: agencyId,
    //             targetIds: student,
    //             targetTable: "student",
    //             sanadId: 0,
    //             actionName: "updateService",
    //             actionNameFa: `ویرایش سرویس`,
    //             desc: ` ویرایش سرویس ${service.serviceNum} راننده ${driverName} از قیمت ${lastCost} به ${cost}`,
    //             other: [before, lastDriverName],
    //         }).save();

    //         return this.response({
    //             res,
    //             data: { id: service.id, serviceNum: service.serviceNum },
    //         });
    //     } catch (error) {
    //         console.error("Error in updateService:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }
    async updateService2(req, res) {
        const session = await this.Service.startSession();
        session.startTransaction();

        try {
            const {
                id,
                distance,
                cost,
                agencyId,
                driverId,
                driverSharing,
                routeSave,
                percentInfo,
                schoolId,
                time,
                driverPic,
                driverName,
                driverCar,
                driverPhone,
                driverCarPelak,
                stChange = [],
            } = req.body;

            // ✅ 1. Validate driver exists
            const driver = await this.Driver.findOne(
                { _id: driverId, delete: false },
                "driverCode"
            )
                .session(session)
                .lean();

            if (!driver) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 404,
                    message: "Driver not found or deleted",
                    data: { fa_m: "راننده پیدا نشد یا حذف شده است!" },
                });
            }

            // ✅ 2. Find or create Invoice
            let invoice = await this.Invoice.findOne({
                agencyId,
                type: "serviceCost",
            }).session(session);

            if (!invoice) {
                invoice = await this.Invoice.create(
                    [
                        {
                            title: "هزینه سرویس",
                            confirmInfo: true,
                            agencyId,
                            setter: req.user._id,
                            type: "serviceCost",
                            amount: 0,
                        },
                    ],
                    { session }
                );
                invoice = invoice[0];
            }

            // ✅ 3. Find Service
            let service = await this.Service.findById(id).session(session);
            if (!service) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 501,
                    message: "service not find",
                });
            }

            // ✅ 4. Update Students + PayQueue + OperationLogs
            for (let stu of stChange) {
                // 🟡 Update student service info
                if (stu.serviceFee == null || stu.driverFee < 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 501,
                        message:
                            "serviceFee cant be null && driverFee cant be -1",
                    });
                }
                await this.Student.findByIdAndUpdate(
                    stu.id,
                    {
                        service: stu.service,
                        serviceNum: stu.serviceNum,
                        serviceCost: stu.serviceFee,
                        driverCost: stu.driverFee,
                        driverCode: driver.driverCode,
                        state: stu.newState,
                        stateTitle: stu.stateDesc,
                    },
                    { session }
                );

                if (stu.newState != 4) {
                    await this.Student.findByIdAndUpdate(
                        stu.id,
                        { pack: -1, packed: false },
                        { session }
                    );
                }

                // 🟡 Ensure payQueue exists
                const payQueue = await this.PayQueue.findOne({
                    inVoiceId: invoice._id,
                    studentId: stu.id,
                }).session(session);

                if (!payQueue) {
                    await this.PayQueue.create(
                        [
                            {
                                inVoiceId: invoice._id,
                                agencyId,
                                studentId: stu.id,
                                code: invoice.code,
                                setter: req.user._id,
                                type: invoice.type,
                                amount: invoice.amount,
                                title: invoice.title,
                                maxDate: invoice.maxDate,
                                isPaid: false,
                            },
                        ],
                        { session }
                    );
                }

                // 🟡 Log operation for each student change
                await this.OperationLog.create(
                    [
                        {
                            userId: req.user._id,
                            name: `${req.user.name} ${req.user.lastName}`,
                            agencyId,
                            targetIds: [stu.id],
                            targetTable: "student",
                            sanadId: 0,
                            actionName: "changeStudentService",
                            actionNameFa: stu.stateDesc,
                            desc: `${stu.stateDesc} از سرویس ${service.serviceNum} راننده ${driverName} مبلغ ${stu.serviceFee}`,
                        },
                    ],
                    { session }
                );
            }

            // ✅ 5. Update Service
            const lastCost = service.cost;
            const lastDriverName = service.driverName;

            service.distance = distance;
            service.cost = cost;
            service.driverSharing = driverSharing;
            service.agencyId = agencyId;
            service.driverId = driverId;
            service.schoolIds = schoolId;
            service.time = time;
            service.routeSave = routeSave;
            service.percentInfo = percentInfo;
            service.driverPhone = driverPhone;
            service.driverCar = driverCar;
            service.driverName = driverName;
            service.driverPic = driverPic;
            service.driverCarPelak = driverCarPelak;

            await service.save({ session });

            // ✅ 6. Log service update
            await this.OperationLog.create(
                [
                    {
                        userId: req.user._id,
                        name: `${req.user.name} ${req.user.lastName}`,
                        agencyId,
                        targetIds: [id],
                        targetTable: "service",
                        sanadId: 0,
                        actionName: "updateService",
                        actionNameFa: `ویرایش سرویس`,
                        desc: `ویرایش سرویس ${service.serviceNum} راننده ${driverName} از قیمت ${lastCost} به ${cost}`,
                        other: [lastCost, lastDriverName],
                    },
                ],
                { session }
            );

            // ✅ 7. Commit transaction
            await session.commitTransaction();
            session.endSession();

            return this.response({
                res,
                data: { id: service.id, serviceNum: service.serviceNum },
            });
        } catch (error) {
            console.error("Error in updateService2:", error);
            await session.abortTransaction();
            session.endSession();
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setServiceChange(req, res) {
        try {
            const serviceId = req.body.serviceId;
            const agencyId = req.body.agencyId;
            const serviceNum = req.body.serviceNum;
            const date = req.body.date;
            const time = req.body.time;
            const driverCost = req.body.driverCost;
            const driverId = req.body.driverId;
            const driverName = req.body.driverName;
            const driverCar = req.body.driverCar;
            const driverPhone = req.body.driverPhone;
            const driverCarPelak = req.body.driverCarPelak;
            const driverGender = req.body.driverGender;
            const reason = req.body.reason;
            const driverPic = req.body.driverPic.trim();

            let driverChange = new this.DriverChange({
                agencyId,
                setterId: req.user._id,
                serviceId,
                driverId,
                serviceNum,
                date,
                time,
                driverCost,
                driverPic,
                driverName,
                driverCar,
                driverCarPelak,
                driverPhone,
                driverGender,
                reason,
            });
            await driverChange.save();

            return this.response({
                res,
                data: driverChange.id,
            });
        } catch (error) {
            console.error("Error in setServiceChange:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async addSanadNumToServiceChange(req, res) {
        try {
            const id = req.body.id;
            const sanadNum = req.body.sanadNum;

            await this.DriverChange.findByIdAndUpdate(id, { sanadNum });

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in addSanadNumToServiceChange:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setPricingTable(req, res) {
        try {
            const city = req.body.city;
            const districtId = req.body.districtId;
            const carId = req.body.carId;
            const gradeId = req.body.gradeId;
            const kilometer = req.body.kilometer;
            const price = req.body.price;

            let pricingTable = new this.PricingTable({
                city,
                districtId,
                carId,
                gradeId,
                kilometer,
                price,
            });
            await pricingTable.save();

            return this.response({
                res,
                data: pricingTable.id,
            });
        } catch (error) {
            console.error("Error in setPricingTable:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setPriceTable(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const districtId = req.body.districtId;
            const carId = req.body.carId;
            const gradeId = req.body.gradeId;
            const kilometer = req.body.kilometer;
            const studentAmount = req.body.studentAmount;
            const driverAmount = req.body.driverAmount;

            let pricingTable = new this.PriceTable({
                agencyId,
                districtId,
                carId,
                gradeId,
                kilometer,
                studentAmount,
                driverAmount,
            });
            await pricingTable.save();

            return this.response({
                res,
                data: pricingTable.id,
            });
        } catch (error) {
            console.error("Error in setPriceTable:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async serviceList(req, res) {
        try {
            const search = req.body.search.trim();
            const driverId = req.body.driverId.trim();
            let page = req.body.page;
            const schoolId = req.body.schoolId || [];
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            let size = req.body.size || 40;
            if (page < 0) page = 0;

            let service;
            var qr = [];
            var searchQ = {
                $or: [
                    {
                        driverName: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                    {
                        driverPhone: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                    {
                        driverCar: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                ],
            };
            if (Array.isArray(schoolId) && schoolId.length !== 0) {
                qr.push({ schoolIds: { $in: schoolId } });
            }
            qr.push({ delete: false });
            if (escapeRegExp(search) != "") {
                qr.push(searchQ);
            }
            if (driverId.toString() != "")
                qr.push({ driverId: ObjectId.createFromHexString(driverId) });
            qr.push({ agencyId });

            service = await this.Service.find({ $and: qr })
                .skip(page * size)
                .limit(size);
            // console.log("service len=", service.length);
            const serviceCount = await this.Service.countDocuments({
                $and: qr,
            });

            let myServices = [];
            for (let i = 0; i < service.length; i++) {
                const school = await this.School.findOne(
                    { _id: { $in: service[i].schoolIds } },
                    "name location.coordinates schoolTime"
                );
                // console.log("service school=", school.name);
                let studentService = await this.Student.find(
                    { delete: false, service: service[i]._id },
                    "state stateTitle service serviceNum serviceCost name lastName school gradeTitle studentCode time address addressDetails startOfContract endOfContract driverCost"
                ).lean();
                let students = [];
                for (let st of studentService) {
                    if (st.state != 4) {
                        st.state = 4;
                        st.stateTitle = "دارای سرویس";
                        await this.Student.findByIdAndUpdate(st._id, {
                            state: 4,
                            stateTitle: "دارای سرویس",
                        });
                    }
                    if (st.serviceCost == null || st.serviceCost < 0) {
                        st.serviceCost = 0;
                        await this.Student.findByIdAndUpdate(st._id, {
                            serviceCost: 0,
                        });
                    }
                    if (st.driverCost == null || st.driverCost < 0) {
                        st.driverCost = 0;
                        await this.Student.findByIdAndUpdate(st._id, {
                            driverCost: 0,
                        });
                    }
                    let sch = await this.School.findById(
                        st.school,
                        "name code districtTitle"
                    );
                    if (!sch) continue;
                    students.push({
                        student: st,
                        school: sch,
                        address: st.address + " " + st.addressDetails,
                    });
                }
                if (students.length == 0) continue;
                let moreInfo = {};
                if (school) {
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                    let shiftName = "",
                        shiftType = "";
                    if (school.schoolTime.length > service[i].time) {
                        shiftName = school.schoolTime[service[i].time].name;
                        shiftType =
                            school.schoolTime[service[i].time].start +
                            " " +
                            school.schoolTime[service[i].time].end;
                        var stt = "";
                        for (var t in school.schoolTime) {
                            if (t == service[i].time) continue;
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
                                school.schoolTime[service[i].time]
                                    .shiftdayTitle + stt;
                        }
                    } else {
                        shiftName = school.schoolTime[0].name;
                        shiftType =
                            school.schoolTime[0].start +
                            " " +
                            school.schoolTime[0].end;
                    }
                    moreInfo.shiftName = shiftName;
                    moreInfo.shiftType = shiftType;
                } else {
                    moreInfo.schoolName = "پیدا نشد";
                    moreInfo.schoolLat = 0;
                    moreInfo.schoolLng = 0;
                    moreInfo.shiftName = "";
                    moreInfo.shiftType = "";
                }

                myServices.push({
                    service: service[i],
                    moreInfo: moreInfo,
                    students: students,
                });
            }

            return this.response({
                res,
                message: serviceCount,
                data: myServices,
            });
        } catch (error) {
            console.error("Error in serviceList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async serviceListByIds(req, res) {
        try {
            const ids = req.body.ids;
            // console.log("ids", ids);

            let service = await this.Service.find({ _id: { $in: ids } });

            let myServices = [];
            for (let i = 0; i < service.length; i++) {
                const school = await this.School.findOne(
                    { _id: { $in: service[i].schoolIds } },
                    "name location.coordinates schoolTime"
                );
                let students = [];
                for (let a in service[i].student) {
                    let st = await this.Student.findById(
                        service[i].student[a],
                        "state stateTitle serviceNum parent name lastName school gradeTitle studentCode time"
                    );
                    let sch = await this.School.findById(
                        st.school,
                        "name code districtTitle"
                    );
                    const parent = await this.Parent.findById(
                        st.parent,
                        "name lastName phone"
                    );
                    students.push({ student: st, school: sch, parent });
                }
                let moreInfo = {};
                if (school) {
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                    let shiftName = "",
                        shiftType = "";
                    if (school.schoolTime.length > service[i].time) {
                        shiftName = school.schoolTime[service[i].time].name;
                        shiftType =
                            school.schoolTime[service[i].time].start +
                            " - " +
                            school.schoolTime[service[i].time].end;
                        var stt = "";
                        for (var t in school.schoolTime) {
                            if (t == service[i].time) continue;
                            if (shiftName === school.schoolTime[t].name) {
                                stt +=
                                    " + " +
                                    school.schoolTime[t].start +
                                    " - " +
                                    school.schoolTime[t].end +
                                    " - " +
                                    school.schoolTime[t].shiftdayTitle;
                            }
                        }
                        if (stt != "") {
                            shiftType +=
                                school.schoolTime[service[i].time]
                                    .shiftdayTitle + stt;
                        }
                    } else {
                        shiftName = school.schoolTime[0].name;
                        shiftType =
                            school.schoolTime[0].start +
                            " - " +
                            school.schoolTime[0].end;
                    }
                    moreInfo.shiftName = shiftName;
                    moreInfo.shiftType = shiftType;
                } else {
                    moreInfo.schoolName = "پیدا نشد";
                    moreInfo.schoolLat = 0;
                    moreInfo.schoolLng = 0;
                    moreInfo.shiftName = "";
                    moreInfo.shiftType = "";
                }

                myServices.push({
                    service: service[i],
                    moreInfo: moreInfo,
                    students: students,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myServices,
            });
        } catch (error) {
            console.error("Error in serviceListByIds:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async serviceListForPay(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.schoolId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId schoolId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const schoolId = ObjectId.createFromHexString(req.query.schoolId);
            const services = await this.Service.find(
                { agencyId, delete: false, schoolIds: schoolId },
                "serviceNum cost driverName driverSharing driverPhone student driverId"
            );
            let servicesList = [];
            for (let service of services) {
                const driver = await this.Driver.findById(
                    service.driverId,
                    "driverCode hesab shaba nationalCode card"
                );
                let studentIds = [];
                for (let st of service.student) {
                    studentIds.push(ObjectId.createFromHexString(st));
                }
                const students = await this.Student.find(
                    {
                        _id: { $in: studentIds },
                        delete: false,
                        serviceId: service.serviceNum,
                    },
                    "studentCode parent name lastName serviceCost"
                );
                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            serviceNum: service.serviceNum,
                            agencyId: agencyId,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$bed" },
                            sanads: { $addToSet: "$doclistId" },
                        },
                    },
                ]);
                const bedAmount = result[0]?.total || 0;
                const sanads = result[0]?.sanads || [];
                servicesList.push({
                    service,
                    driver,
                    students,
                    bedAmount,
                    sanads,
                });
            }
            return this.response({
                res,
                message: "ok",
                data: servicesList,
            });
        } catch (error) {
            console.error("Error in serviceListForPay:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async serviceByNumOrDriver(req, res) {
        try {
            const search = req.body.search.trim();
            const agencyId = req.body.agencyId;

            let qr = [];
            let searchQ = {
                $or: [
                    // { serviceNum: escapeRegExp(search) },
                    {
                        driverName: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                    {
                        driverPhone: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                    {
                        driverCar: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                ],
            };
            qr.push({ delete: false });
            if (escapeRegExp(search) != "") {
                qr.push(searchQ);
            }
            qr.push({ agencyId });
            const findItem =
                "serviceNum distance cost driverSharing driverPic shiftId driverName driverCar driverCarPelak driverPhone driverId schoolIds active time";

            const service = await this.Service.find(
                { $and: qr },
                findItem
            ).limit(40);

            let myServices = [];
            for (let i = 0; i < service.length; i++) {
                const school = await this.School.findOne(
                    { _id: { $in: service[i].schoolIds } },
                    "name location.coordinates schoolTime"
                );

                let moreInfo = {};
                if (school) {
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                    let shiftName = "",
                        shiftType = "";
                    if (school.schoolTime.length > service[i].time) {
                        shiftName = school.schoolTime[service[i].time].name;
                        shiftType =
                            school.schoolTime[service[i].time].start +
                            " " +
                            school.schoolTime[service[i].time].end;
                        var stt = "";
                        for (var t in school.schoolTime) {
                            if (t == service[i].time) continue;
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
                                school.schoolTime[service[i].time]
                                    .shiftdayTitle + stt;
                        }
                    } else {
                        shiftName = school.schoolTime[0].name;
                        shiftType =
                            school.schoolTime[0].start +
                            " " +
                            school.schoolTime[0].end;
                    }
                    moreInfo.shiftName = shiftName;
                    moreInfo.shiftType = shiftType;
                } else {
                    moreInfo.schoolName = "پیدا نشد";
                    moreInfo.schoolLat = 0;
                    moreInfo.schoolLng = 0;
                    moreInfo.shiftName = "";
                    moreInfo.shiftType = "";
                }

                myServices.push({
                    service: service[i],
                    moreInfo: moreInfo,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myServices,
            });
        } catch (error) {
            console.error("Error in serviceByNumOrDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async serviceListAll(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 604,
                    message: "agencyId need!",
                });
            }
            const agencyId = req.query.agencyId;

            if (req.user.isAgencyAdmin || req.user.isSupport) {
                const agency = await this.Agency.findOne(
                    {
                        $and: [
                            { delete: false },
                            { _id: agencyId },
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
                if (!agency) {
                    return this.response({
                        res,
                        code: 404,
                        message: "something wrong your agency is deleted maybe",
                        data: {
                            fa_m: "خطایی پیش آمده ممکن است شرکت شما حذف شده باشد!",
                        },
                    });
                }
            }

            let qr = [{ delete: false }, { active: true }, { agencyId }];
            const service = await this.Service.find(
                { $and: qr },
                "serviceNum driverPic driverId driverName driverCar driverCarPelak driverPhone student schoolIds shiftId routeSave time"
            );

            let myServices = [];
            for (let i = 0; i < service.length; i++) {
                const school = await this.School.findOne(
                    { _id: { $in: service[i].schoolIds } },
                    "name location.coordinates schoolTime"
                );
                let moreInfo = {};

                if (school) {
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                    const shiftData =
                        school.schoolTime[service[i].time] ||
                        school.schoolTime[0];
                    moreInfo.shiftName = shiftData.name;
                    moreInfo.shiftType = `${shiftData.start} ${shiftData.end}`;
                } else {
                    moreInfo = {
                        schoolName: "پیدا نشد",
                        schoolLat: 0,
                        schoolLng: 0,
                        shiftName: "",
                        shiftType: "",
                    };
                }

                myServices.push({ service: service[i], moreInfo });
            }

            return this.response({ res, message: "ok", data: myServices });
        } catch (error) {
            console.error("Error in serviceListAll:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getChangedDrivers(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 604,
                    message: "agencyId need!",
                });
            }
            let page = req.query.page ? req.query.page : 0;
            let forDate = req.query.forDate || "";
            let dateX, dateY;

            if (forDate) {
                const date1 = new Date(forDate);
                dateX = new Date(
                    date1.getFullYear(),
                    date1.getMonth(),
                    date1.getDate(),
                    0,
                    0,
                    0
                );
                dateY = new Date(
                    date1.getFullYear(),
                    date1.getMonth(),
                    date1.getDate(),
                    23,
                    59,
                    59
                );
            }

            const agencyId = req.query.agencyId;
            let qr = [{ delete: false }, { agencyId }];
            if (forDate) qr.push({ date: { $lte: dateY, $gte: dateX } });

            const service = await this.DriverChange.find({ $and: qr })
                .skip(page * 40)
                .limit(40);
            return this.response({ res, message: "ok", data: service });
        } catch (error) {
            console.error("Error in getChangedDrivers:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAllPricing(req, res) {
        try {
            const city = req.query.city;
            if (!city) {
                return this.response({
                    res,
                    code: 604,
                    message: "city inot find by phone",
                });
            }
            let qr = {
                delete: false,
                city: parseInt(city),
            };
            let cardId = req.query.carId || "";
            if (cardId.trim() !== "") {
                qr.carId = parseInt(cardId);
            }
            const pricingTable = await this.PricingTable.find(
                qr,
                "-updatedAt -createdAt -__v"
            ).lean();
            return this.response({ res, message: "ok", data: pricingTable });
        } catch (error) {
            console.error("Error in getAllPricing:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getAllPrices(req, res) {
        try {
            const agencyId = req.query.agencyId;
            if (!agencyId) {
                return this.response({
                    res,
                    code: 604,
                    message: "agencyId id need",
                });
            }
            let qr = {
                delete: false,
                agencyId: ObjectId.createFromHexString(agencyId),
            };
            let carId = req.query.carId || "";
            if (carId.trim() !== "") {
                qr.carId = parseInt(carId);
            }
            const pricingTable = await this.PriceTable.aggregate([
                { $match: qr }, // apply your filter
                { $sort: { kilometer: 1 } }, // optional: sort before grouping
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0,
                        active: 0,
                        delete: 0,
                        agencyId: 0,
                        schoolGrade: 0,
                        carGrade: 0,
                        capacity: 0,
                        __v: 0,
                    },
                },
                {
                    $group: {
                        _id: "$kilometer", // group by kilometer
                        items: { $push: "$$ROOT" }, // collect all documents for each kilometer
                    },
                },
                { $sort: { _id: 1 } }, // final sort by kilometer value
            ]);

            return this.response({ res, message: "ok", data: pricingTable });
        } catch (error) {
            console.error("Error in getAllPrices:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deletePrice(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({ res, code: 604, message: "id need!" });
            }
            const id = req.query.id;
            await this.PricingTable.findByIdAndUpdate(id, { delete: true });
            return this.response({ res, message: "delete" });
        } catch (error) {
            console.error("Error in deletePrice:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async deletePriceNew(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({ res, code: 604, message: "id need!" });
            }
            const id = req.query.id;
            await this.PriceTable.findByIdAndUpdate(id, { delete: true });
            return this.response({ res, message: "delete" });
        } catch (error) {
            console.error("Error in deletePriceNew:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteService(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({ res, code: 604, message: "id need!" });
            }
            const id = req.query.id;
            const service = await this.Service.findByIdAndUpdate(id, {
                delete: true,
            });
            const st = await this.Student.updateMany(
                {
                    service: service._id,
                },
                {
                    service: null,
                    serviceNum: -1,
                    serviceCost: 0,
                    driverCode: "",
                    driverCost: 0,
                    packed: false,
                    pack: -1,
                    state: 3,
                    stateTitle: "حذف سرویس درانتظار",
                }
            );
            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: service.agencyId,
                targetIds: "",
                targetTable: "student",
                sanadId: 0,
                actionName: "deleteService",
                actionNameFa: `حذف سرویس ${service.serviceNum}`,
                desc: `حذف کامل سرویس شماره ${service.serviceNum} از راننده ${service.driverName} به مبلغ ${service.cost} ریال`,
            }).save();
            return this.response({ res, message: "delete" });
        } catch (error) {
            console.error("Error in deleteService:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async isChangedDriver(req, res) {
        try {
            if (
                req.query.forDate === undefined ||
                req.query.forDate.trim() === "" ||
                req.query.serviceNum === undefined
            ) {
                return this.response({
                    res,
                    code: 604,
                    message: "forDate serviceNum need!",
                });
            }

            const serviceNum = req.query.serviceNum;
            const forDate = req.query.forDate;
            const date1 = new Date(forDate);
            const dateX = new Date(
                date1.getFullYear(),
                date1.getMonth(),
                date1.getDate(),
                0,
                0,
                0
            );
            const dateY = new Date(
                date1.getFullYear(),
                date1.getMonth(),
                date1.getDate(),
                23,
                59,
                59
            );

            const qr = [
                { delete: false },
                { serviceNum },
                { date: { $lte: dateY, $gte: dateX } },
            ];
            const service = await this.DriverChange.find({ $and: qr });

            return this.response({ res, message: "ok", data: service });
        } catch (error) {
            console.error("Error in isChangedDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getOneService(req, res) {
        try {
            if (
                req.query.serviceNum === undefined ||
                req.query.serviceNum.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "serviceNum need",
                });
            }
            const serviceNum = req.query.serviceNum;
            const service = await this.Service.findOne(
                { serviceNum },
                "serviceNum driverPic driverName driverCar driverCarPelak driverPhone student agencyId driverId active"
            );

            return this.response({ res, message: "ok", data: service });
        } catch (error) {
            console.error("Error in getOneService:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async serviceListBySchool(req, res) {
        try {
            if (
                req.query.schoolId === undefined ||
                req.query.schoolId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "schoolId need",
                });
            }
            var schoolId = req.query.schoolId;
            const students = await this.Student.find(
                { school: schoolId, state: { $gte: 4 } },
                "service"
            );
            let serviceIds = [];
            for (var i in students) {
                serviceIds.push(students[i].service);
            }
            let serviceIdOnly = [...new Set(serviceIds)];
            // console.log("serviceIdOnly=", serviceIdOnly);
            var qr = [];
            qr.push({ _id: { $in: serviceIdOnly } });
            qr.push({ delete: false });
            let service = [];
            for (var i in serviceIdOnly) {
                // console.log("serviceIdOnly[i]", serviceIdOnly[i]);
                let se = await this.Service.findOne({
                    serviceNum: serviceIdOnly[i],
                    delete: false,
                });
                if (se) service.push(se);
                // else {
                //     console.log("iiiiiiiiiiffff");
                // }
            }

            let myServices = [];
            // console.log("service.length=", service.length);
            for (var i = 0; i < service.length; i++) {
                //console.log(JSON.stringify(students[i]));
                const school = await this.School.findOne(
                    { _id: { $in: service[i].schoolIds } },
                    "name location.coordinates"
                );
                // const shift = await this.Shifts.findById(
                //     service[i].shiftId,
                //     "name type"
                // );
                let students = [];
                for (var a in service[i].student) {
                    let st = await this.Student.findById(
                        service[i].student[a],
                        "state stateTitle serviceNum serviceCost name lastName school gradeTitle studentCode startOfContract endOfContract driverCost"
                    );
                    let sch = await this.School.findById(
                        st.school,
                        "name code districtTitle"
                    );
                    students.push({ student: st, school: sch });
                }
                //  let students = await this.Student.find({id: { '$in': service[i].student }},'state stateTitle serviceNum serviceCost name lastName school gradeTitle');
                let moreInfo = {};
                if (school) {
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                } else {
                    moreInfo.schoolName = "پیدا نشد";
                    moreInfo.schoolLat = 0;
                    moreInfo.schoolLng = 0;
                }
                if (shift) {
                    moreInfo.shiftName = shift.name;
                    moreInfo.shiftType = shift.type;
                } else {
                    moreInfo.shiftName = "پیدا نشد";
                    moreInfo.type = "";
                }

                myServices.push({
                    service: service[i],
                    moreInfo: moreInfo,
                    students: students,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: myServices,
            });
        } catch (error) {
            console.error("Error while serviceListBySchool:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async searchPricingTable(req, res) {
        try {
            const districtId = req.body.districtId;
            const carId = req.body.carId;
            const gradeId = req.body.gradeId;

            var qr = [];
            var searchDistrictId = {
                $or: [{ districtId }, { districtId: 0 }],
            };
            var searchGradeId = {
                $or: [{ gradeId: { $in: gradeId } }, { gradeId: 0 }],
            };

            qr.push({ delete: false });
            qr.push(searchDistrictId);
            qr.push(searchGradeId);
            if (carId != 0) qr.push({ carId });

            //console.log(JSON.stringify(qr));
            let pricingTable = await this.PricingTable.find(
                { $and: qr },
                "kilometer studentAmount driverAmount gradeId"
            ).sort({ kilometer: 1 });
            if (pricingTable.length === 0) {
                qr = [];
                var searchDistrictId = {
                    $or: [{ districtId }, { districtId: 0 }],
                };
                var searchGradeId = {
                    $or: [{ gradeId: { $in: gradeId } }, { gradeId: 0 }],
                };

                qr.push({ delete: false });
                qr.push(searchDistrictId);
                qr.push(searchGradeId);
                qr.push({ carId: 0 });
                pricingTable = await this.PricingTable.find(
                    { $and: qr },
                    "kilometer studentAmount driverAmount gradeId"
                );
            }

            return this.response({
                res,
                message: "ok",
                data: pricingTable,
            });
        } catch (error) {
            console.error("Error while searchPricingTable:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async searchPriceTable(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const districtId = req.body.districtId;
            const carId = req.body.carId;
            const gradeId = req.body.gradeId;

            var qr = [{ agencyId }];
            var searchDistrictId = {
                $or: [{ districtId }, { districtId: 0 }],
            };
            var searchGradeId = {
                $or: [{ gradeId: { $in: gradeId } }, { gradeId: 0 }],
            };

            qr.push({ delete: false });
            qr.push(searchDistrictId);
            qr.push(searchGradeId);
            if (carId != 0) qr.push({ carId });

            //console.log(JSON.stringify(qr));
            let pricingTable = await this.PriceTable.find(
                { $and: qr },
                "kilometer studentAmount driverAmount gradeId"
            ).sort({ kilometer: 1 });
            if (pricingTable.length === 0) {
                qr = [{ agencyId }];
                var searchDistrictId = {
                    $or: [{ districtId }, { districtId: 0 }],
                };
                var searchGradeId = {
                    $or: [{ gradeId: { $in: gradeId } }, { gradeId: 0 }],
                };

                qr.push({ delete: false });
                qr.push(searchDistrictId);
                qr.push(searchGradeId);
                qr.push({ carId: 0 });
                pricingTable = await this.PriceTable.find(
                    { $and: qr },
                    "kilometer studentAmount driverAmount gradeId"
                );
            }

            return this.response({
                res,
                message: "ok",
                data: pricingTable,
            });
        } catch (error) {
            console.error("Error while searchPriceTable:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setServicePack(req, res) {
        try {
            const { agencyId, driverId, packNum, select } = req.body;

            if (
                !mongoose.isValidObjectId(driverId) ||
                !mongoose.isValidObjectId(agencyId)
            ) {
                return this.response({
                    res,
                    code: 221,
                    message: "ids are objectId!",
                });
            }

            const pack = await this.ServicePack.findOne({
                agencyId,
                driverId,
                packNum,
            });

            if (pack) {
                if (select) {
                    return this.response({
                        res,
                        message: "it is added before",
                    });
                } else {
                    await this.ServicePack.findByIdAndDelete(pack.id);
                    return this.response({
                        res,
                        message: "remove from select",
                    });
                }
            } else {
                if (select) {
                    const servicePack = new this.ServicePack({
                        agencyId,
                        driverId,
                        packNum,
                    });
                    await servicePack.save();
                    return this.response({
                        res,
                        message: "add successfully",
                    });
                } else {
                    return this.response({
                        res,
                        message: "it is removed before",
                    });
                }
            }
        } catch (error) {
            console.error("Error in setServicePack:", error);
            return res.status(500).json("setServicePack error");
        }
    }

    async getServicePack(req, res) {
        try {
            const { agencyId, driverId } = req.query;

            if (
                !mongoose.isValidObjectId(driverId) ||
                !mongoose.isValidObjectId(agencyId)
            ) {
                return this.response({
                    res,
                    code: 221,
                    message: "ids are objectId!",
                });
            }

            const packs = await this.ServicePack.find(
                { agencyId, driverId },
                "packNum"
            );

            return this.response({
                res,
                data: packs,
            });
        } catch (error) {
            console.error("Error in getServicePack:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getSelectPack(req, res) {
        try {
            const { agencyId } = req.query;

            if (!mongoose.isValidObjectId(agencyId)) {
                return this.response({
                    res,
                    code: 221,
                    message: "id is objectId!",
                });
            }

            const packs = await this.ServicePack.find(
                { agencyId },
                "packNum driverId"
            );

            return this.response({
                res,
                data: packs,
            });
        } catch (error) {
            console.error("Error in getSelectPack:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setLog(req, res) {
        try {
            const {
                agencyId,
                driverId,
                studentId,
                serviceNum,
                changeDriver,
                direction,
                cost,
                automatic,
            } = req.body;

            const IDs = studentId.map((std) => mongoose.Types.ObjectId(std));

            const newLog = new this.ServiceLog({
                agencyId,
                driverId,
                studentId: IDs,
                changeDriver,
                direction,
                cost,
                automatic,
            });

            const driverChange = await this.DriverChange.findOne({
                serviceNum,
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const changeDate = new Date(driverChange.date);
            changeDate.setHours(0, 0, 0, 0);

            if (changeDate.getTime() === today.getTime()) {
                newLog.changeDriver = true;
            }

            await newLog.save();

            return this.response({
                res,
                message: "Created.",
                data: newLog.id,
            });
        } catch (error) {
            console.error("Error while setting service log:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async serviceByOneStudent(req, res) {
        try {
            const search = req.body.search.trim();
            const agencyId = req.body.agencyId;
            let page = req.body.page;
            let qr = [{ agencyId }, { delete: false }];
            let size = req.body.size || 40;
            size = size * 4;
            if (page < 0) page = 0;
            let serviceId = await this.Student.find({
                delete: false,
                state: 4,
                agencyId,
                $or: [
                    { name: { $regex: ".*" + search + ".*" } },
                    { lastName: { $regex: ".*" + search + ".*" } },
                    { studentCode: { $regex: ".*" + search + ".*" } },
                ],
            }).distinct("service");
            console.log("serviceId", serviceId);
            qr.push({ _id: serviceId });

            const findItem =
                "serviceNum distance cost driverSharing driverPic shiftId driverName driverCar driverCarPelak driverPhone driverId schoolIds active time";

            const service = await this.Service.find({ $and: qr }, findItem)
                .skip(page * size)
                .limit(size);

            const serviceCount = await this.Service.countDocuments({
                $and: qr,
            });
            let myServices = [];
            for (let i = 0; i < service.length; i++) {
                const school = await this.School.findOne(
                    { _id: { $in: service[i].schoolIds } },
                    "name location.coordinates schoolTime"
                );

                const studentX = await this.Student.find({
                    service: service[i]._id,
                }).lean();
                //  console.log("students",students.length)
                let students = [];
                for (const st of studentX) {
                    //  console.log("st.school",st.school)
                    let sch = await this.School.findById(
                        st.school,
                        "name code districtTitle"
                    );
                    if (st.serviceCost == null || st.serviceCost < 0) {
                        st.serviceCost = 0;
                        await this.Student.findByIdAndUpdate(st._id, {
                            serviceCost: 0,
                        });
                    }
                    if (st.driverCost == null || st.driverCost < 0) {
                        st.driverCost = 0;
                        await this.Student.findByIdAndUpdate(st._id, {
                            driverCost: 0,
                        });
                    }
                    //  console.log("st.sch",sch)
                    if (!sch) continue;
                    students.push({
                        student: st,
                        school: sch,
                        address: st.address + " " + st.addressDetails,
                    });
                }
                console.log("students", students.length);
                if (students.length === 0) continue;
                let moreInfo = {};
                //  console.log("school",school)
                if (school) {
                    moreInfo.schoolName = school.name;
                    moreInfo.schoolLat = school.location.coordinates[0];
                    moreInfo.schoolLng = school.location.coordinates[1];
                    let shiftName = "",
                        shiftType = "";
                    if (school.schoolTime.length > service[i].time) {
                        shiftName = school.schoolTime[service[i].time].name;
                        shiftType =
                            school.schoolTime[service[i].time].start +
                            " " +
                            school.schoolTime[service[i].time].end;
                        var stt = "";
                        // console.log("school.schoolTime", school.schoolTime);
                        for (var t in school.schoolTime) {
                            if (t == service[i].time) continue;
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
                        // console.log("school.schoolTimeXX", school.schoolTime);
                        if (stt != "") {
                            shiftType +=
                                school.schoolTime[service[i].time]
                                    .shiftdayTitle + stt;
                        }
                    } else {
                        shiftName = school.schoolTime[0].name;
                        shiftType =
                            school.schoolTime[0].start +
                            " " +
                            school.schoolTime[0].end;
                    }
                    moreInfo.shiftName = shiftName;
                    moreInfo.shiftType = shiftType;
                } else {
                    moreInfo.schoolName = "پیدا نشد";
                    moreInfo.schoolLat = 0;
                    moreInfo.schoolLng = 0;
                    moreInfo.shiftName = "";
                    moreInfo.shiftType = "";
                }
                console.log("moreInfo", moreInfo);
                myServices.push({
                    service: service[i],
                    moreInfo: moreInfo,
                    students: students,
                });
            }
            console.log("myServices", myServices.length);
            return this.response({
                res,
                message: serviceCount,
                data: myServices,
            });
        } catch (error) {
            console.error("Error in serviceByNumOrDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async findNotEqualService(req, res) {
        try {
            const { agencyId } = req.query;
            const students = await this.Student.find(
                {
                    agencyId,
                    state: 4,
                    service: { $ne: null },
                    delete: false,
                },
                "serviceDistance service school name lastName studentCode serviceNum serviceCost driverCode driverCost"
            ).lean();
            let notFindCar = [];
            let notFindSchool = [];
            let notFindDriver = [];
            let notFindPriceTable = [];
            let notMatchPrice = [];
            let studentsNotMatch = [];
            for (var student of students) {
                const service = await this.Service.findById(
                    student.service
                ).lean();
                if (service) {
                    const [school, driver] = await Promise.all([
                        this.School.findById(
                            student.school,
                            "districtId grade name"
                        ).lean(),
                        this.Driver.findById(
                            service.driverId,
                            "carId driverCode userId"
                        ).lean(),
                    ]);
                    if (!school) {
                        notFindSchool.push({
                            name: student.name,
                            lastName: student.lastName,
                            studentCode: student.studentCode,
                            driverCode: student.driverCode,
                            serviceNum: student.serviceNum,
                            serviceCost: student.serviceCost,
                            driverCost: student.driverCost,
                            school: "",
                            serviceCostPrice: 0,
                            driverCostPrice: 0,
                            serviceDistance: student.serviceDistance,
                        });
                        continue;
                    }
                    if (!driver) {
                        notFindDriver.push({
                            name: student.name,
                            lastName: student.lastName,
                            studentCode: student.studentCode,
                            driverCode: student.driverCode,
                            serviceNum: student.serviceNum,
                            serviceCost: student.serviceCost,
                            driverCost: student.driverCost,
                            school: school.name,
                            serviceCostPrice: 0,
                            driverCostPrice: 0,
                            serviceDistance: student.serviceDistance,
                        });
                        continue;
                    }
                    const car = await this.Car.findById(
                        driver.carId,
                        "capacity"
                    ).lean();
                    if (!car) {
                        const user = await this.User.findById(
                            driver.userId,
                            "name lastName phone"
                        );
                        if (user) {
                            notFindCar.push({
                                name: user.name,
                                lastName: user.lastName,
                                studentCode: user.phone,
                                driverCode: student.driverCode,
                                serviceNum: student.serviceNum,
                                serviceCost: student.serviceCost,
                                driverCost: student.driverCost,
                                school: school.name,
                                serviceCostPrice: 0,
                                driverCostPrice: 0,
                                serviceDistance: student.serviceDistance,
                            });
                        } else {
                            console.error("not find user for ", driver.userId);
                        }
                        continue;
                    }
                    const carId = car.capacity;
                    const { districtId, grade } = school;
                    const query = [
                        {
                            agencyId: service.agencyId,
                        },
                        { delete: false },
                        {
                            $or: [
                                { districtId },
                                {
                                    districtId: 0,
                                },
                            ],
                        },
                        {
                            $or: [
                                {
                                    gradeId: {
                                        $in: grade,
                                    },
                                },
                                { gradeId: 0 },
                            ],
                        },
                    ];
                    if (carId && carId != 0) {
                        query.push({ carId });
                    }

                    const pricingTable = await this.PriceTable.find(
                        { $and: query },
                        "kilometer studentAmount driverAmount -_id"
                    )
                        .sort({
                            kilometer: 1,
                            districtId: 1,
                        })
                        .lean();
                    if (!pricingTable.length) {
                        if (notFindPriceTable.length < 1) {
                            console.log("query", JSON.stringify(query));
                            console.log("driverCode", driver);
                        }
                        notFindPriceTable.push({
                            name: student.name,
                            lastName: student.lastName,
                            studentCode: student.studentCode,
                            driverCode: student.driverCode,
                            serviceNum: student.serviceNum,
                            serviceCost: student.serviceCost,
                            driverCost: student.driverCost,
                            school: school.name,
                            serviceCostPrice: 0,
                            driverCostPrice: 0,
                            serviceDistance: student.serviceDistance,
                        });
                        continue;
                    }
                    const matchedPricing = pricingTable.find(
                        (priceItem) =>
                            priceItem.kilometer * 1000 >=
                            student.serviceDistance
                    );
                    if (!matchedPricing) {
                        if (notMatchPrice.length < 1) {
                            console.log("query", JSON.stringify(query));
                        }
                        notMatchPrice.push({
                            name: student.name,
                            lastName: student.lastName,
                            studentCode: student.studentCode,
                            driverCode: student.driverCode,
                            serviceNum: student.serviceNum,
                            serviceCost: student.serviceCost,
                            driverCost: student.driverCost,
                            school: school.name,
                            serviceCostPrice: 0,
                            driverCostPrice: 0,
                            serviceDistance: student.serviceDistance,
                        });
                        continue;
                    }
                    if (
                        Math.abs(
                            student.serviceCost - matchedPricing.studentAmount
                        ) > 9999 ||
                        Math.abs(
                            student.driverCost - matchedPricing.driverAmount
                        ) > 9999
                    ) {
                        studentsNotMatch.push({
                            name: student.name,
                            lastName: student.lastName,
                            studentCode: student.studentCode,
                            driverCode: student.driverCode,
                            serviceNum: student.serviceNum,
                            serviceCost: student.serviceCost,
                            driverCost: student.driverCost,
                            school: school.name,
                            serviceCostPrice: matchedPricing.studentAmount,
                            driverCostPrice: matchedPricing.driverAmount,
                            serviceDistance: student.serviceDistance,
                        });
                    }
                } else {
                    console.log(
                        "student not find service",
                        student.studentCode
                    );
                    await this.Student.findOneAndUpdate(student._id, {
                        service: null,
                    });
                }
            }

            return this.response({
                res,
                data: {
                    count: students.length,
                    notFindCar,
                    notFindSchool,
                    notFindDriver,
                    notMatchPrice,
                    notFindPriceTable,
                    studentsNotMatch,
                },
            });
        } catch (error) {
            console.error("Error while findNotEqualService:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setDDSAgain(req, res) {
        try {
            const { agencyId } = req.query;
            const some = await this.DDS.find({ agencyId });
            for (var dd of some) {
                let sc = 0;
                let dds = 0;
                for (var service of dd.service) {
                    let sumCost = 0;
                    let driverSumCost = 0;
                    for (var i = 0; i < service.students.length; i++) {
                        const student = await this.Student.findById(
                            service.students[i].id,
                            "serviceCost driverCost"
                        ).lean();
                        if (student) {
                            service.students[i].cost = student.serviceCost;
                            service.students[i].driverCost = student.driverCost;
                            sumCost = sumCost + student.serviceCost;
                            driverSumCost = driverSumCost + student.driverCost;
                        } else {
                            service.students.splice(i, 1);
                            i--;
                        }
                    }
                    service.driverShare = driverSumCost;
                    service.serviceCost = sumCost;
                    sc = sc + service.serviceCost;
                    dds = dds + service.driverShare;
                }
                dd.sc = sc / 30;
                dd.dds = dds / 30;
                dd.markModified("service"); // Ensure Mongoose sees array changes
                await dd.save();
            }
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while setDDSAgain:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

     async getCorruptedServices(req, res) {
        try {
            const { agencyId } = req.query;

            const services = await this.Service.find({
                agencyId,
                delete: false,
            });
            const servicesiD = services.map((doc) => doc._id);

            const students = await this.Student.find({
                agencyId,
                service: { $in: servicesiD },
                delete: false,
                active: true,
                serviceCost: { $lte: 1000000 },
                state: 4,
            });
            const drServices = await this.Service.find({
                agencyId,
                delete: false,
                $expr: { $gte: ["$driverSharing", "$cost"] },
            }).lean();
            const students_with_distance = await this.Student.find({
                agencyId,
                serviceDistance: { $lte: 100 },
                delete: false,
            }).lean();
            const students_null_service = await this.Student.find({
                state: 4,
                service: null,
                delete: false,
            }).lean();
            return res.json({
                c_students: students,
                drServices,
                students_with_distance,
                students_null_service,
            });
        } catch (error) {
            console.error("Error in getCorruptedServices:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
