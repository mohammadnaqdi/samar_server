const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

module.exports = new (class extends controller {
    async insertStudentReport(req, res) {
        try {
            const {
                driverId,
                serviceId,
                studentId,
                agencyId,
                schoolId,
                text,
                grade,
            } = req.body;

            let stReport = new this.StReport({
                userId: req.user._id,
                driverId,
                serviceId,
                studentId,
                agencyId,
                schoolId,
                text,
                grade,
            });
            await stReport.save();

            return this.response({
                res,
                message: "ok",
                data: stReport.code,
            });
        } catch (error) {
            console.error("Error in insertStudentReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async insertStudentOpinion(req, res) {
        try {
            const {
                driverId,
                serviceId,
                studentId,
                agencyId,
                schoolId,
                content,
                grade,
                month,
            } = req.body;
            const agSet = await this.AgencySet.findOne(
                { agencyId },
                "openOpinion"
            );
            if (!agSet) {
                return this.response({
                    res,
                    code: 404,
                    message: "not find agency",
                });
            }
            let sum = 0;
            for (var cn of content) {
                sum = sum + cn.point;
            }

            let isOpen = false;
            // console.log("agSet.openOpinion", agSet.openOpinion);
            const n = month.toString();
            if (agSet.openOpinion[n]) {
                const myOp = await this.Opinion.findOne({
                    month,
                    studentId,
                    agencyId,
                });
                if (!myOp) {
                    isOpen = true;
                }
            }
            if (!isOpen) {
                return this.response({
                    res,
                    code: 405,
                    message: "this opinion not open",
                });
            }
            let stReport = new this.Opinion({
                userId: req.user._id,
                driverId,
                serviceId,
                studentId,
                agencyId,
                schoolId,
                content,
                grade,
                month,
                sum,
            });
            await stReport.save();

            return this.response({
                res,
                message: "ok",
                data: stReport.id,
            });
        } catch (error) {
            console.error("Error in insertStudentOpinion:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async insertSchoolReport(req, res) {
        try {
            const { schoolId, agencyId, desc } = req.body;

            let stReport = new this.SchReport({
                userId: req.user._id,
                agencyId,
                schoolId,
                desc,
            });
            await stReport.save();

            return this.response({
                res,
                message: "ok",
                data: stReport.id,
            });
        } catch (error) {
            console.error("Error in insertSchoolReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async insertRatingDriver(req, res) {
        try {
            const {
                driverId,
                serviceId,
                studentId,
                agencyId,
                schoolId,
                desc,
                point,
            } = req.body;
            const userId = req.user._id;

            let stReport = new this.RatingDriver({
                userId,
                driverId,
                serviceId,
                studentId,
                agencyId,
                schoolId,
                desc,
                point,
            });
            await stReport.save();

            return this.response({
                res,
                message: "ok",
                data: stReport.id,
            });
        } catch (error) {
            console.error("Error in insertRatingDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    // async getMyRating(req, res) {
    //     try {
    //         const { driverId, studentId } = req.query;

    //         if (!driverId || !studentId) {
    //             return this.response({
    //                 res,
    //                 code: 214,
    //                 message: "driverId and studentId need",
    //             });
    //         }

    //         const userId = req.user._id;
    //         const myRt = await this.RatingDriver.findOne({
    //             driverId,
    //             studentId,
    //             userId,
    //         }).sort({ _id: -1 });

    //         return this.response({
    //             res,
    //             message: "ok",
    //             data: myRt,
    //         });
    //     } catch (error) {
    //         console.error("Error in getMyRating:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async getMyReport(req, res) {
        try {
            const { driverId, studentId } = req.query;

            if (!driverId || !studentId) {
                return this.response({
                    res,
                    code: 214,
                    message: "driverId and studentId need",
                });
            }

            const myRt = await this.StReport.find(
                {
                    driverId,
                    studentId,
                    delete: false,
                },
                "text comment1 comment2 code state grade createdAt updatedAt"
            );

            return this.response({
                res,
                message: "ok",
                data: myRt,
            });
        } catch (error) {
            console.error("Error in getMyReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getOpenOpinion(req, res) {
        try {
            const { agencyId, studentId, driverId } = req.query;

            if (!agencyId || !studentId || !driverId) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId , driverId and studentId need",
                });
            }

            const agSet = await this.AgencySet.findOne(
                { agencyId },
                "openOpinion"
            );
            if (!agSet) {
                return this.response({
                    res,
                    data: [],
                });
            }
            let myRt = [];
            // console.log("agSet.openOpinion", agSet.openOpinion);
            for (var i = 1; i <= 12; i++) {
                const n = i.toString();
                if (agSet.openOpinion[n]) {
                    const myOp = await this.Opinion.findOne({
                        month: i,
                        studentId,
                        agencyId,
                    });
                    if (!myOp) {
                        myRt.push(i);
                    }
                }
            }

            return this.response({
                res,
                message: "ok",
                data: myRt,
            });
        } catch (error) {
            console.error("Error in getOpenOpinion:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteMyReport(req, res) {
        try {
            const { id } = req.query;

            if (!id) {
                return this.response({
                    res,
                    code: 204,
                    message: "id need!",
                });
            }

            const st = await this.StReport.findOne({
                _id: id,
                userId: req.user._id,
            });
            if (st) {
                if (st.state == 0) {
                    await this.StReport.findByIdAndDelete(id);
                    return this.response({
                        res,
                        message: "delete",
                    });
                } else {
                    return this.response({
                        res,
                        code: 210,
                        message: "state not zero",
                    });
                }
            }

            return this.response({
                res,
                message: "delete",
            });
        } catch (error) {
            console.error("Error in deleteMyReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAgencyReport(req, res) {
        try {
            const { agencyId, state } = req.query;

            if (!agencyId) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }

            const reports = await this.StReport.find({
                agencyId,
                state: state || 0,
                delete: false,
            });

            let rps = [];
            for (const report of reports) {
                let info = {
                    userName: "",
                    userPhone: "",
                    userRel: "",
                    schoolName: "",
                    schoolCode: "",
                    serviceNum: 0,
                    driverName: "",
                    driverCar: "",
                    driverPhone: "",
                    studentName: "",
                    studentCode: "",
                };
                const user = await this.Parent.findById(
                    report.userId,
                    "phone name lastName"
                );
                const school = await this.School.findById(
                    report.schoolId,
                    "code name"
                );
                const student = await this.Student.findById(
                    report.studentId,
                    "studentCode name lastName parentReleation"
                );
                const service = await this.Service.findById(
                    report.serviceId,
                    "serviceNum driverName driverCar driverPhone"
                );

                if (user) {
                    info.userName = user.name + " " + user.lastName;
                    info.userPhone = user.phone;
                }
                if (school) {
                    info.schoolName = school.name;
                    info.schoolCode = school.code;
                }
                if (student) {
                    info.studentName = student.name + " " + student.lastName;
                    info.studentCode = student.studentCode;
                    info.userRel = student.parentReleation;
                }
                if (service) {
                    info.driverName = service.driverName;
                    info.serviceNum = service.serviceNum;
                    info.driverCar = service.driverCar;
                    info.driverPhone = service.driverPhone;
                }
                rps.push({ report, info });
            }

            return this.response({
                res,
                message: "ok",
                data: rps,
            });
        } catch (error) {
            console.error("Error in getAgencyReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getDriverOpinions(req, res) {
        try {
            const { driverId } = req.query;
            const pagest = req.query.page || "0";
            const page = parseInt(pagest);

            if (!driverId) {
                return this.response({
                    res,
                    code: 214,
                    message: "driverId need",
                });
            }

            const reports = await this.Opinion.find({
                driverId,
                delete: false,
            })
                .limit(20)
                .skip(page * 20)
                .sort({ month: 1 });

            let rps = [];
            for (const report of reports) {
                let info = {
                    userName: "",
                    userPhone: "",
                    userRel: "",
                    schoolName: "",
                    schoolCode: "",
                    serviceNum: 0,
                    driverName: "",
                    driverCar: "",
                    driverPhone: "",
                    studentName: "",
                    studentCode: "",
                };
                const user = await this.Parent.findById(
                    report.userId,
                    "phone name lastName"
                );

                const student = await this.Student.findById(
                    report.studentId,
                    "studentCode name lastName parentReleation"
                );
                if (user) {
                    info.userName = user.name + " " + user.lastName;
                    info.userPhone = user.phone;
                }

                if (student) {
                    info.studentName = student.name + " " + student.lastName;
                    info.studentCode = student.studentCode;
                    info.userRel = student.parentReleation;
                }

                rps.push({ report, info });
            }

            return this.response({
                res,
                message: "ok",
                data: rps,
            });
        } catch (error) {
            console.error("Error in getAgencyOpinions:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverReportById(req, res) {
        try {
            const { id } = req.query;
            console.log("");

            if (!id) {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }
            let points = [];
            for (var i = 1; i <= 12; i++) {
                const result = await this.Opinion.aggregate([
                    {
                        $match: {
                            delete: false,
                            driverId: ObjectId.createFromHexString(id),
                            month: i,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: "$sum",
                            },
                            count: { $sum: 1 }, // <- counts the number of documents
                        },
                    },
                ]);
                const point = !result || !result[0] ? 0 : result[0].total;
                const count = !result || !result[0] ? 0 : result[0].count;
                points.push({month:i,point,count})
            }

            const ratingDriver = await this.RatingDriver.find(
                {
                    driverId: ObjectId.createFromHexString(id),
                    delete: false,
                },
                "point userId"
            );
            const reports = await this.StReport.find(
                {
                    driverId: ObjectId.createFromHexString(id),
                    delete: false,
                },
                "userId studentId schoolId text state grade updatedAt"
            );
            const inspectorRp = await this.InspectorRp.find({
                driverId: ObjectId.createFromHexString(id),
                delete: false,
            });

            let rps = [];
            if (reports) {
                for (const report of reports) {
                    let info = {
                        userName: "",
                        userPhone: "",
                        userRel: "",
                        schoolName: "",
                        schoolCode: "",
                        studentName: "",
                        studentCode: "",
                    };
                    const user = await this.Parent.findById(
                        report.userId,
                        "phone name lastName"
                    );
                    const school = await this.School.findById(
                        report.schoolId,
                        "code name"
                    );
                    const student = await this.Student.findById(
                        report.studentId,
                        "studentCode name lastName parentReleation"
                    );

                    if (user) {
                        info.userName = user.name + " " + user.lastName;
                        info.userPhone = user.phone;
                    }
                    if (school) {
                        info.schoolName = school.name;
                        info.schoolCode = school.code;
                    }
                    if (student) {
                        info.studentName =
                            student.name + " " + student.lastName;
                        info.studentCode = student.studentCode;
                        info.userRel = student.parentReleation;
                    }

                    rps.push({ report, info });
                }
            }
            let rps2 = [];
            if (inspectorRp) {
                for (const report of inspectorRp) {
                    let info = {
                        userName: "",
                        userPhone: "",
                        userRel: "",
                        schoolName: "",
                        schoolCode: "",
                        studentName: "",
                        studentCode: "",
                    };
                    const user = await this.User.findById(
                        report.userId,
                        "phone name lastName"
                    );
                    rps2.push({ report, user });
                }
            }

            return this.response({
                res,
                message: "ok",
                data: { reports: rps, rating: ratingDriver, rps2, points },
            });
        } catch (error) {
            console.error("Error in getDriverReportById:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAdminReport(req, res) {
        try {
            const state = req.query.state || 0;

            const reports = await this.SchReport.find({ state, delete: false });

            let rps = [];
            for (const report of reports) {
                let info = {
                    userName: "",
                    userPhone: "",
                    schoolName: "",
                    schoolCode: "",
                    agencyName: "",
                    agencyCode: "",
                    agencyTel: "",
                    agencyDistrict: "",
                };
                const user = await this.User.findById(
                    report.userId,
                    "phone name lastName"
                );
                const school = await this.School.findById(
                    report.schoolId,
                    "code name"
                );
                const agency = await this.Agency.findById(
                    report.agencyId,
                    "code name tel districtTitle"
                );

                if (user) {
                    info.userName = user.name + " " + user.lastName;
                    info.userPhone = user.phone;
                }
                if (school) {
                    info.schoolName = school.name;
                    info.schoolCode = school.code;
                }
                if (agency) {
                    info.agencyName = agency.name;
                    info.agencyCode = agency.code;
                    info.agencyTel = agency.tel;
                    info.agencyDistrict = agency.districtTitle;
                }

                rps.push({ report, info });
            }

            return this.response({
                res,
                message: "ok",
                data: rps,
            });
        } catch (error) {
            console.error("Error in getAdminReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async updateStudentReport(req, res) {
        try {
            const { id, state, comment } = req.body;
            if (state === 1) {
                await this.StReport.findByIdAndUpdate(id, {
                    state,
                    comment1: comment,
                });
            } else {
                await this.StReport.findByIdAndUpdate(id, {
                    state,
                    comment2: comment,
                });
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in updateStudentReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async updateSchoolReport(req, res) {
        try {
            const { id, state } = req.body;
            await this.SchReport.findByIdAndUpdate(id, { state });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in updateSchoolReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
