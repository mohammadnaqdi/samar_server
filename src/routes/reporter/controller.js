const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
module.exports = new (class extends controller {
    async driverActReport(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.startDate === undefined ||
                req.query.startDate.trim() === "" ||
                req.query.endDate === undefined ||
                req.query.endDate.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId and endDate and startDate need",
                });
            }
            const { agencyId, startDate, endDate } = req.query;
            const pageS = req.query.page || "0";
            let page = parseInt(pageS);
            if (page < 0) page = 0;

            const start = Date.parse(startDate);
            const end = Date.parse(endDate);
            console.log("start", start);
            console.log("end", end);
            const agencyObjects = ObjectId.createFromHexString(agencyId);
            const drivers = await this.Driver.find(
                { active: true, delete: false, agencyId: agencyObjects },
                "driverCode userId"
            )
                .skip(page * 20)
                .limit(20);

            let report = [];
            for (var dr of drivers) {
                const user = await this.User.findById(
                    dr.userId,
                    "name lastName phone -_id"
                );
                // if(!user)continue;
                const services = await this.Service.find({
                    driverId: dr._id,
                }).distinct("serviceNum");
                if (services.length === 0) continue;
                const acts = await this.DriverAct.find(
                    {
                        driverCode: dr.driverCode,
                        isWarning: false,
                        createdAt: { $gte: start, $lt: end },
                    },
                    "model serviceId start createdAt -_id"
                );
                report.push({ driver: dr, user, services, acts });
            }

            return this.response({
                res,
                data: report,
            });
        } catch (error) {
            console.error("Error while driverActReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getInspectorReportX(req, res) {
        try {
            const driverId = req.query.driverId || "";
            const pelak = req.query.pelak || "";
            let qr = [];
            if (pelak != "" && pelak.length > 6) {
                qr.push({ pelak });
            }
            if (driverId != "" && driverId.length > 14) {
                qr.push({ driverId: ObjectId.createFromHexString(driverId) });
            }
            if (qr.length === 0) {
                return this.response({
                    res,
                    data: [],
                });
            }

            const fetch = await this.InspectorRp.find(
                { $or: qr },
                "-__v -updatedAt"
            ).sort({ createdAt: -1 });
            let reports = [];
            for (var rp of fetch) {
                if (rp.driverId != null) {
                    const driver = await this.Driver.findById(
                        rp.driverId,
                        "userId agencyId carId driverCode pic"
                    );
                    if (driver) {
                        const user = await this.User.findById(
                            driver.userId,
                            "phone name lastName"
                        );
                        const car = await this.Car.findById(
                            driver.carId,
                            "pelak colorCar carModel"
                        );
                        reports.push({
                            rp,
                            driver,
                            user,
                            car,
                        });
                    } else {
                        reports.push({
                            rp,
                            driver: null,
                            user: null,
                            car: null,
                        });
                    }
                } else {
                    reports.push({
                        rp,
                        driver: null,
                        user: null,
                        car: null,
                    });
                }
            }

            return this.response({
                res,
                data: reports,
            });
        } catch (error) {
            console.error("Error while getInspectorReport:", error);
            return res.status(500).json({ error });
        }
    }
    async getMyInspectorReport(req, res) {
        try {
            let pageS = req.query.page || "0";
            let page = parseInt(pageS);
            if (page < 0) page = 0;

            const fetchs = await this.InspectorRp.find(
                { userId: req.user._id },
                "-__v -updatedAt"
            )
                .skip(page * 20)
                .limit(20)
                .sort({ createdAt: -1 });
            let reports = [];
            for (var rp of fetchs) {
                if (rp.driverId != null) {
                    const driver = await this.Driver.findById(
                        rp.driverId,
                        "userId agencyId carId driverCode pic"
                    );
                    if (driver) {
                        const user = await this.User.findById(
                            driver.userId,
                            "phone name lastName"
                        );
                        const car = await this.Car.findById(
                            driver.carId,
                            "pelak colorCar carModel"
                        );
                        reports.push({
                            rp,
                            driver,
                            user,
                            car,
                        });
                    } else {
                        reports.push({
                            rp,
                            driver: null,
                            user: null,
                            car: null,
                        });
                    }
                } else {
                    reports.push({
                        rp,
                        driver: null,
                        user: null,
                        car: null,
                    });
                }
            }

            return this.response({
                res,
                data: reports,
            });
        } catch (error) {
            console.error("Error while getInspectorReport:", error);
            return res.status(500).json({ error });
        }
    }

    async insertInspectorReport(req, res) {
        try {
            const driverId = req.body.driverId;
            const desc = req.body.desc;
            const school = req.body.school;
            const model = req.body.model;
            const pelak = req.body.pelak;
            const images = req.body.images || [];

            let stReport = new this.InspectorRp({
                userId: req.user._id,
                driverId,
                desc,
                model,
                school,
                pelak,
                images,
            });
            await stReport.save();

            return this.response({
                res,
                message: "ok",
                data: stReport.id,
            });
        } catch (error) {
            console.error("Error while insertInspectorReport:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getOperationLog(req, res) {
        try {
            const {
                userId,
                startDate,
                endDate,
                agencyId,
                targetId,
                actionName,
            } = req.query;

            req.query.page === undefined || req.query.page.trim() === "";
            let page = parseInt(req.query.page);
            if (page < 0) page = 0;
            const query = {};
            if (mongoose.isValidObjectId(userId))
                query.userId = ObjectId.createFromHexString(userId);
            if (startDate) query.createdAt = { $gte: new Date(startDate) };
            if (endDate)
                query.createdAt = {
                    ...query.createdAt,
                    $lte: new Date(endDate),
                };
            if (mongoose.isValidObjectId(agencyId))
                query.agencyId = ObjectId.createFromHexString(agencyId);
            if (targetId) query.targetIds = { $in: [targetId] };
            if (actionName) query.actionName = actionName;

            if (Object.keys(query).length === 0) {
                return this.response({
                    res,
                    code: 400,
                    message: "query need",
                });
            }

            const logs = await this.OperationLog.find(query)
                .skip(page * 25)
                .limit(25);
            const logsPage = await this.OperationLog.countDocuments(query);
            let final = [];

            for (const log of logs) {
                const targets = log.targetIds;
                const table = log.targetTable;
                console.log("targets", targets);
                console.log("table", table);
                let search = "";
                let info = log;
                info.targetIds = [];
                if (table == "school") search = this.School;
                else if (table == "service") search = this.Service;
                else if (table == "student") search = this.Student;
                else if (table == "studentCode") search = this.Student;
                else if (table == "user") search = this.User;
                else if (table == "driver") search = this.Driver;
                console.log("search", search);
                if (search === "") continue;
                for (const id of targets) {
                    // else {
                    //     search =
                    //         log.targetTable.charAt(0).toUpperCase() +
                    //         log.targetTable.slice(1);
                    // }
                    let infoResult = "";
                    if (mongoose.isValidObjectId(id)) {
                        infoResult = await search.findById(id).lean();
                    } else {
                        let query = {};
                        switch (table) {
                            case "driver":
                                query = { driverCode: id };
                                break;
                            case "student":
                                query = { studentCode: id };
                                break;
                            case "studentCode":
                                query = { studentCode: id };
                                break;
                            default:
                                query = { code: id };
                                break;
                        }
                        infoResult = await search.findOne(query).lean();
                    }
                    let information = "";
                    switch (table) {
                        case "school":
                            information = infoResult.name;
                            break;
                        case "service":
                            information = `ش سرویس ${infoResult.serviceNum}`;
                            break;
                        case "student":
                        case "studentCode":
                            information = `${infoResult}`;
                            break;
                        case "user":
                            information = `${infoResult.name} ${infoResult.lastName}`;
                            break;
                        default:
                            information = infoResult.toString();
                    }

                    info.targetIds.push(information);
                }
                final.push(info);
            }

            return this.response({
                res,
                message: "ok",
                data: { logs: final, logsPage },
            });
        } catch (error) {
            console.error("Error in getOperationLog:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setStimApi(req, res) {
        try {
            const {
                id,
                title,
                api,
                desc,
                active,
                school,
                startDate,
                endDate,
                student,
                grade,
                phone,
                startDoc,
                endDoc,
                serviceNum,
                description,
                pdf,
                excel,
                word,
            } = req.body;
            if (id === "" || id === undefined) {
                let stimApi = new this.StimApi({
                    title,
                    api,
                    desc,
                    active,
                    school,
                    startDate,
                    endDate,
                    student,
                    grade,
                    phone,
                    startDoc,
                    endDoc,
                    serviceNum,
                    description,
                    pdf,
                    excel,
                    word,
                });
                await stimApi.save();
                return this.response({
                    res,
                    message: "created",
                    data: stimApi._id,
                });
            }
            await this.StimApi.findByIdAndUpdate(id, {
                title,
                api,
                desc,
                active,
                school,
                startDate,
                endDate,
                student,
                grade,
                phone,
                startDoc,
                endDoc,
                serviceNum,
                description,
                pdf,
                excel,
                word,
            });

            return this.response({
                res,
                message: "updated",
                data: id,
            });
        } catch (error) {
            console.error("Error in setStimApi:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getStimApi(req, res) {
        try {
            const active = req.query.active || "true";

            if (active === "true") {
                const fetch = await this.StimApi.find({ active: true });
                return this.response({
                    res,
                    data: fetch,
                });
            }
            const fetch = await this.StimApi.find();
            return this.response({
                res,
                data: fetch,
            });
        } catch (error) {
            console.error("Error in getStimApi:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
