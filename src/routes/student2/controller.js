const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

module.exports = new (class extends controller {
    async getstudentContractDate(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }
            let id = ObjectId.createFromHexString(req.query.id);

            var needList = "startOfContract endOfContract";

            const student = await this.Student.findById(id, needList);
            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "student not find",
                });
            }

            return this.response({
                res,
                message: "ok",
                data: student,
            });
        } catch (error) {
            console.error("Error while 00044:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async changeDistance(req, res) {
        try {
            if (
                req.query.studentId === undefined ||
                req.query.studentId.trim() === "" ||
                req.query.distance === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "distance studentId need",
                });
            }
            const studentId = req.query.studentId;

            const distance = parseInt(req.query.distance);

            const student = await this.Student.findById(studentId);

            if (!student) {
                return this.response({
                    res,
                    code: 404,
                    message: "Student not found!",
                });
            }

            student.serviceDistance = distance;
            await student.save();

            return this.response({
                res,
                message: "Done.",
            });
        } catch (error) {
            console.error("Error while changing distance:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getStudentSum(req, res) {
        try {
            const { studentId, start, end } = req.query;

            const startDate = new Date(start);
            const endDate = new Date(end);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return this.response({
                    res,
                    code: 400,
                    message: "Invalid timestamp for start or end.",
                });
            }

            const result = await this.DDS.aggregate([
                {
                    $match: {
                        "service.students.id": studentId,
                        createdAt: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $unwind: "$service",
                },
                {
                    $unwind: "$service.students",
                },
                {
                    $match: { "service.students.id": studentId },
                },
                {
                    $group: {
                        _id: null,
                        totalCost: { $sum: "$service.students.cost" },
                    },
                },
            ]);

            const totalCost = result.length > 0 ? result[0].totalCost : 0;

            return this.response({
                res,
                data: totalCost,
            });
        } catch (error) {
            console.error(`Error while getting Student sum: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async studentContract(req, res) {
        try {
            if (!req.query.studentId || req.query.studentId.trim() === "") {
                return this.response({
                    res,
                    code: 204,
                    message: "studentId needed!",
                });
            }
            const { studentId } = req.query;
            console.log("studentId", studentId);

            const reports = await this.DDS.find({
                "service.students.id": studentId,
            }).sort({ createdAt: 1 });

            const reportGroups = [];
            let currentGroup = null;
            let cost = 0;
            for (const report of reports) {
                for (const service of report.service) {
                    const student = service.students.find(
                        (stu) => stu.id === studentId
                    );

                    if (student) {
                        if (currentGroup)
                            if (
                                currentGroup.driverId.toString() !=
                                    report.driverId.toString() ||
                                currentGroup.serviceNum != service.num
                            ) {
                                reportGroups.push(currentGroup);
                                currentGroup = null;
                                cost = 0;
                            }
                        const monthLen = getMonth(report.createdAt);
                        cost += student.cost / monthLen;
                        if (!currentGroup) {
                            const driver = await this.Driver.findById(
                                report.driverId,
                                "userId"
                            );
                            const user = await this.User.findById(
                                driver.userId,
                                "name lastName phone"
                            );

                            currentGroup = {
                                driver_name: `${user.name} ${user.lastName}`,
                                driver_phone: `${user.phone}`,
                                driver_pic: `${driver.pic}`,
                                serviceNum: service.num,
                                driverId: report.driverId,
                                cost,
                                start: report.createdAt,
                                end: report.createdAt,
                            };
                        } else {
                            currentGroup.end = report.createdAt;
                            currentGroup.cost = cost;
                        }
                        break;
                    }
                }
            }

            if (currentGroup) {
                reportGroups.push(currentGroup);
            }

            return this.response({
                res,
                data: reportGroups,
            });
        } catch (error) {
            console.error(`Error while grouping reports: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async schoolDDS(req, res) {
        try {
            if (!req.query.id || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 204,
                    message: "id needed!",
                });
            }
            if (req.query.start === undefined || req.query.end === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "end start need",
                });
            }
            let { start, end } = req.query;
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
            const monthLen = getMonth(startDate);
            const { id } = req.query;
            const studentIds = await this.Student.find({
                school: id,
                delete: false,
                state: 4,
            }).distinct("_id");
            console.log("studentIds", studentIds.length);
            console.log("monthLen", monthLen);

            let rp = [];
            for (var st of studentIds) {
                let cost = 0;
                let driverShare = 0;
                const reports = await this.DDS.find({
                    createdAt: { $lte: endDate, $gte: startDate },
                    "service.students.id": st.toString(),
                }).sort({ createdAt: 1 });
                // console.log("reports", reports.length);
                const studentInfo = await this.Student.findById(
                    st,
                    "name lastName studentCode serviceDistance serviceNum"
                );
                if (!studentInfo) continue;
                // const serviceInfo=await this.Service.findOne({serviceNum:studentInfo.serviceNum},'driverCar');
                // let driverCar="";
                // if(serviceInfo){
                //     driverCar=serviceInfo.driverCar;
                // };
                for (const report of reports) {
                    for (const service of report.service) {
                        const student = service.students.find(
                            (stu) => stu.id === st.toString()
                        );
                        if (student) {
                            driverShare =
                                (student.cost * service.driverShare) /
                                service.serviceCost /
                                monthLen;
                            cost = student.cost / monthLen;
                            let exist = false;
                            for (var i in rp) {
                                if (
                                    rp[i].driverId.toString() ===
                                        report.driverId.toString() &&
                                    rp[i].studentId.toString() === st.toString()
                                ) {
                                    rp[i].cost = rp[i].cost + cost;
                                    rp[i].driverShare =
                                        rp[i].driverShare + driverShare;
                                    rp[i].count = rp[i].count + 1;
                                    exist = true;
                                    break;
                                }
                            }
                            if (!exist) {
                                rp.push({
                                    studentId: st.toString(),
                                    studentName:
                                        studentInfo.name +
                                        " " +
                                        studentInfo.lastName,
                                    studentCode: studentInfo.studentCode,
                                    serviceDistance:
                                        studentInfo.serviceDistance,
                                    serviceNum: service.num,
                                    cost,
                                    driverShare,
                                    driverId: report.driverId.toString(),
                                    driverName: report.name,
                                    driverPhone: report.phone,
                                    count: 1,
                                });
                            }
                            break;
                        }
                    }
                }
            }

            return this.response({
                res,
                data: rp,
            });
        } catch (error) {
            console.error(`Error while schoolDDS: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async studentCondition(req, res) {
        try {
            const { studentId } = req.query;
            console.log("studentId", studentId);

            const consition = await this.Student.findById(
                studentId,
                "physicalConditionDesc physicalCondition supervisor"
            );

            return this.response({
                res,
                data: consition,
            });
        } catch (error) {
            console.error(`Error while studentCondition: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async serviceListDoc(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            let { list } = req.body;
            console.log("list", list);
            // for (var i in list) {
            //     list[i] = list[i] + 20000;
            // }
            const doc = await this.DocListSanad.find(
                {
                    agencyId,
                    type: "service",
                    mId: { $in: list },
                    bes: 0,
                    bed: { $ne: 0 },
                },
                "doclistId days bed bes mId updatedAt accCode -_id"
            );
            console.log("doc", doc.length);
            return this.response({
                res,
                data: doc,
            });
        } catch (error) {
            console.error(`Error while studentCondition: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    // async setAllStudentLevelAgencyToNewOne(req, res) {
    //     try {
    //         const agencyId = ObjectId.createFromHexString(req.query.agencyId);
    //         const agency = await this.Agency.findById(agencyId, "settings");
    //         if (!agency) {
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "agency not find",
    //             });
    //         }
    //         let kol = "003";
    //         let moeen = "005";
    //         let count = 0;
    //         const schools = await this.School.find({
    //             agency: agencyId,
    //             delete: false,
    //         }).lean();
    //         for (var sc of schools) {
    //             const students = await this.Student.find(
    //                 {
    //                     school: sc._id,
    //                 },
    //                 "studentCode"
    //             );
    //             console.log("st", students.length);
    //             for (var st of students) {
    //                 const lv = await this.LevelAccDetail.findOneAndUpdate(
    //                     {
    //                         accCode: st.studentCode,
    //                         levelType: 1,
    //                         agencyId: { $ne: agency._id },
    //                     },
    //                     {
    //                         agencyId: agency._id,
    //                         editor: req.user._id,
    //                     }
    //                 );
    //                 if (!lv) continue;
    //                 const ls = await this.ListAcc.findOne({
    //                     codeLev3: st.studentCode,
    //                     canEdit: false,
    //                     agencyId: { $ne: agency._id },
    //                 });
    //                 if (!ls) continue;
    //                 const doclist = await this.DocListSanad.find({
    //                     accCode: ls.code,
    //                 });

    //                 for (const doc of doclist) {
    //                     await this.DocSanad.findByIdAndDelete(doc.titleId);
    //                     await this.DocListSanad.deleteMany({
    //                         titleId: doc.titleId,
    //                     });
    //                 }

    //                 const checkHis = await this.CheckHistory.find({
    //                     $or: [{ toAccCode: ls.code }, { fromAccCode: ls.code }],
    //                 });

    //                 for (const check of checkHis) {
    //                     await this.CheckInfo.findByIdAndDelete(check.infoId);
    //                     await this.CheckHistory.deleteMany({
    //                         infoId: check.infoId,
    //                     });
    //                 }

    //                 await this.ListAcc.findOneAndUpdate(
    //                     {
    //                         codeLev3: st.studentCode,
    //                         agencyId: { $ne: agency._id },
    //                     },
    //                     {
    //                         agencyId: agency._id,
    //                         code: kol + moeen + st.studentCode,
    //                         codeLev1: kol,
    //                         codeLev2: moeen,
    //                         editor: req.user._id,
    //                     }
    //                 );
    //                 count++;
    //             }
    //         }

    //         return this.response({
    //             res,
    //             data: count,
    //         });
    //     } catch (error) {
    //         console.error(`Error while studentCondition: ${error}`);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async studentDDS(req, res) {
        try {
            if (!req.query.studentId || req.query.studentId.trim() === "") {
                return this.response({
                    res,
                    code: 204,
                    message: "studentId needed!",
                });
            }
            const { studentId } = req.query;
            console.log("studentId", studentId);

            const reports = await this.DDS.find({
                "service.students.id": studentId,
            }).sort({ createdAt: 1 });

            return this.response({
                res,
                data: reports,
            });
        } catch (error) {
            console.error(`Error while studentDDS: ${error}`);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async addStudentToService(req, res) {
        try {
            const serviceId = req.body.serviceId;
            const distance = req.body.distance;
            const cost = req.body.cost;
            const driverSharing = req.body.driverSharing;
            const studentId = req.body.studentId;
            const studentCost = req.body.studentCost;
            const lat = req.body.lat;
            const lng = req.body.lng;
            const name = req.body.name;
            const code = req.body.code;
            const percentInfo = req.body.percentInfo;

            let service = await this.Service.findById(serviceId);
            if (!service) {
                return this.response({
                    res,
                    code: 501,
                    message: "service not find",
                });
            }

            const lastCost = service.cost;
            service.distance = distance;
            service.cost = cost;
            service.driverSharing = driverSharing;
            service.student.push(studentId);
            service.studentCost.push(studentCost);
            service.routeSave.push({ routes: [], lat, lng, name, code });
            service.percentInfo = percentInfo;

            await service.save();

            var st = await this.Student.findByIdAndUpdate(studentId, {
                serviceId: service.serviceNum,
                serviceCost: studentCost,
                state: 4,
                stateTitle: "دارای سرویس",
            });

            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: service.agencyId,
                targetIds: [studentId],
                targetTable: "student",
                sanadId: 0,
                actionName: "addStudentToService",
                actionNameFa: `افزودن دانش آموز به سرویس`,
                desc: ` افزودن ${name} به سرویس ${service.serviceNum} راننده ${service.driverName} از قیمت ${lastCost} به ${cost}`,
            }).save();

            return this.response({
                res,
                data: { id: service.id, serviceNum: service.serviceNum },
            });
        } catch (error) {
            console.error("Error in addStudentToService:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async applyStudentPrePayment(req, res) {
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
            const invoice = await this.Invoice.findOne({
                agencyId,
                type: "prePayment",
            });
            if (!invoice) {
                return this.response({
                    res,
                    code: 404,
                    message: "invoice not find",
                });
            }
            const student = await this.Student.find(
                {
                    agencyId,
                    delete: false,
                },
                "serviceDistance state name"
            ).lean();
            for (var st of student) {
                let pay = await this.PayQueue.findOne({
                    code: invoice.code,
                    agencyId,
                    studentId: st._id,
                    type: "prePayment",
                });
                if (pay) {
                    if (!pay.isPaid) {
                        let amount2 = 0;
                        if (
                            invoice.distancePrice &&
                            invoice.distancePrice.length > 0
                        ) {
                            const matchedPricing = invoice.distancePrice.find(
                                function (priceItem) {
                                    return (
                                        priceItem.maxDistance * 1000 >=
                                        st.serviceDistance
                                    );
                                }
                            );
                            if (matchedPricing) {
                                amount2 = matchedPricing.amount;
                            } else {
                                amount2 =
                                    invoice.distancePrice[
                                        invoice.distancePrice.length - 1
                                    ].amount;
                            }
                        } else {
                            amount2 = invoice.amount;
                        }
                        pay.amount = amount2;
                        pay.title = invoice.title;
                        pay.delete = invoice.delete;
                        console.log("st save", st.name);
                        await pay.save();
                    }
                } else if (st.state > 0) {
                    let amount2 = 0;
                    if (
                        invoice.distancePrice &&
                        invoice.distancePrice.length > 0
                    ) {
                        const matchedPricing = invoice.distancePrice.find(
                            function (priceItem) {
                                return (
                                    priceItem.maxDistance * 1000 >=
                                    st.serviceDistance
                                );
                            }
                        );
                        if (matchedPricing) {
                            amount2 = matchedPricing.amount;
                        } else {
                            amount2 =
                                invoice.distancePrice[
                                    invoice.distancePrice.length - 1
                                ].amount;
                        }
                    } else {
                        amount2 = invoice.amount;
                    }
                    await new this.PayQueue({
                        inVoiceId: invoice._id,
                        code: invoice.code,
                        agencyId: agencyId,
                        studentId: st._id,
                        setter: req.user._id,
                        type: invoice.type,
                        amount: amount2,
                        title: invoice.title,
                        maxDate: invoice.maxDate,
                    }).save();
                    console.log("st add", st.name);
                }
            }

            await new this.OperationLog({
                userId: req.user._id,
                name: req.user.name + " " + req.user.lastName,
                agencyId: agencyId,
                targetIds: [invoice.code],
                targetTable: "PayQueue",
                sanadId: 0,
                actionName: "applyStudentPrePayment",
                actionNameFa: `اعمال پیش پرداخت روی همه ی دانش آموزان`,
                desc: ``,
            }).save();

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in applyStudentPrePayment:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();

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
