#!/usr/bin/env node
const mongoose = require("mongoose");
const jalaali = require("jalaali-js");
const jMoment = require("moment-jalaali");
const { Driver } = require("./src/models/driver");
const Student = require("./src/models/student");
const { DDS } = require("./src/models/dds");
const { AgencySet, Agency } = require("./src/models/agency");
const { User } = require("./src/models/user");
const { Service, DriverChange } = require("./src/models/service");
const { ListAcc } = require("./src/models/levels");

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

function getMonthDayCount(dayOfYear) {
    if (dayOfYear >= 1 && dayOfYear <= 186) {
        return 31;
    } else if (dayOfYear >= 187 && dayOfYear <= 336) {
        return 30;
    } else if (dayOfYear >= 337 && dayOfYear <= 366) {
        return 29;
    } else {
        return null;
    }
}

function getDayOfYear() {
    const currentDate = new Date();

    const jalaliDate = jMoment(currentDate).format("jYYYY/jMM/jDD");

    const [year, month, day] = jalaliDate.split("/").map(Number);

    const monthsDays = [
        31,
        31,
        31,
        31,
        31,
        31,
        30,
        30,
        30,
        30,
        30,
        jMoment.jDaysInMonth(year, 11),
    ];

    const daysBeforeCurrentMonth = monthsDays
        .slice(0, month - 1)
        .reduce((acc, days) => acc + days, 0);

    const dayOfYear = daysBeforeCurrentMonth + day;

    return dayOfYear;
}

function isInSummerBan(date) {
    const year = date.getFullYear();
    const summerStart = new Date(year, 5, 22);
    const summerEnd = new Date(year, 8, 22);
    return date >= summerStart && date <= summerEnd;
}

async function removeStudentFromService(
    studentCode,
    serviceId,
    sc,
    driverCost
) {
    try {
        const service = await Service.findById(serviceId);
        if (!service) {
            return false;
        }

        const index = service.routeSave.find(
            (student) => student.code === studentCode
        );
        if (!index) return null;
        service.routeSave.splice(index, 1);
        service.schoolIds.splice(index, 1);

        service.cost = service.cost - sc;
        service.driverSharing = service.driverSharing - driverCost;
        const sharesCost = service.cost - service.driverSharing;
        if (service.percentInfo.length == 1) {
            service.percentInfo[0].sharesCost = sharesCost;
        } else {
            let prs = service.percentInfo.reduce(
                (acc, item) => acc + item.sharePercent,
                0
            );
            for (let i = 0; i < service.percentInfo.length; i++) {
                const shareCost =
                    (service.percentInfo[i].sharePercent * sharesCost) / prs;
                service.percentInfo[i].sharesCost = shareCost;
            }
        }
        await service.save();
        return service.serviceNum;
    } catch (error) {
        console.error("Error while removing student from service:", error);
        return false;
    }
}

async function deleteStudent() {
    try {
        const stds = await Student.find({
            delete: false,
            state: 4,
            end_date: { $lte: Date.now() },
        });

        if (stds.length > 0) {
            let count = 0;
            for (const std of stds) {
                const removeSt = await removeStudentFromService(
                    std.studentCode,
                    std.service,
                    std.serviceCost,
                    std.driverCost
                );

                std.state = 5;
                std.service = null;
                std.serviceNum = -1;
                std.serviceCost = 0;
                std.driverCode = "";
                std.driverCost = 0;
                if (removeSt) {
                    std.stateTitle = `حذف از ش.س ${removeSt} در قرارداد`;
                } else {
                    std.stateTitle = `حذف از ش.س ناشناخته در قرارداد`;
                }
                await std.save();
                count++;
            }
            console.log(`${count} students were outdated and removed.`);
        } else {
            console.log("No students require deletion.");
        }
    } catch (error) {
        console.error("Error while deleting students:", error);
    }
}

async function process() {
    try {
        const agencies = await Agency.find({
            delete: false,
            active: true,
        })
            .distinct("_id")
            .lean();
        // const agencySets = await AgencySet.find({
        //     _id: { $in: agencyIDs },
        // }).lean();

        const now = new Date();

        // const agencyI = agencySets
        //     .filter((agency) => {
        //         if (!agency.activeDDS) return false;

        //         const isInOffTime = agency.offDDSTimes.some(
        //             (offTime) => now >= offTime.start && now <= offTime.end
        //         );

        //         return !isInOffTime;
        //     })
        //     .map((agency) => agency.agencyId);
        // console.log("agencyI", agencyI.length);

        const drivers = await Driver.find({
            delete: false,
            active: true,
            agencyId: { $in: agencies },
        }).lean();
        // console.log("drivers", drivers.length);
        // const a = new mongoose.Types.ObjectId("686659530ac17b8808ceaa11");
        // const drivers = await Driver.find({
        //     delete: false,
        //     active: true,
        //     agencyId: a,
        // }).lean();
        const startOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0
        );
        const endOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59
        );
        const today = getDayOfYear().toString();
        const currentMonth = getMonthDayCount(today);
        const ddsPromises = drivers.map(async (driver) => {
            // console.log("driver", driver.driverCode);
            try {
                const services = await Service.find({
                    driverId: driver._id,
                    delete: false,
                }).lean();
                if (services.length === 0) {
                    return null;
                }

                let serviceDetails = [];
                let totalDds = 0;
                let totalServiceCost = 0;
                let status = "Normal";
                const serviceNums = [];

                let driverName = "";
                let driverLastName = "";
                let driverPhone = "";

                if (services.length !== 0) {
                    serviceDetails = await Promise.all(
                        services.map(async (service) => {
                            const stds = await Student.find({
                                delete: false,
                                service: service._id,
                            }).lean();

                            if (stds.length === 0) {
                                await Service.findByIdAndUpdate(service._id, {
                                    delete: true,
                                });
                                return null;
                            }

                            const students = stds.map((std) => ({
                                id: std._id,
                                cost: std.serviceCost,
                                driverCost: std.driverCost,
                            }));

                            totalServiceCost += service.cost;
                            totalDds += service.driverSharing;
                            serviceNums.push(service.serviceNum);

                            return {
                                num: service.serviceNum,
                                serviceCost: service.cost,
                                driverShare: service.driverSharing,
                                students,
                            };
                        })
                    );

                    serviceDetails = serviceDetails.filter(Boolean);

                    // let name = services[0].driverName.split(" ");
                    // driverName = name[0];
                    // driverLastName = name[1];
                    // driverPhone = services[0].driverPhone;
                    const user = await User.findById(driver.userId).lean();
                    driverName = user.name;
                    driverLastName = user.lastName;
                    driverPhone = user.phone;
                } else {
                    const user = await User.findById(driver.userId).lean();
                    driverName = user.name;
                    driverLastName = user.lastName;
                    driverPhone = user.phone;
                }

                if (driver.active) {
                    totalDds = totalDds / currentMonth;
                    totalServiceCost = totalServiceCost / currentMonth;

                    const change = await DriverChange.findOne({
                        delete: false,
                        agencyId: driver.agencyId,
                        serviceNum: { $in: serviceNums },
                        createdAt: { $gte: startOfDay, $lte: endOfDay },
                    });

                    if (change) {
                        status = "Absent";
                    }
                } else {
                    totalDds = 0;
                    status = "NT";
                }

                const currentDate = new Date();
                const jalaliDate = jMoment(currentDate).format("jYYYY/jMM/jDD");
                const year = jalaliDate.split("/").map(Number)[0];
                return {
                    agencyId: driver.agencyId,
                    driverId: driver._id,
                    driverCode: driver.driverCode,
                    name: driverName,
                    lastName: driverLastName,
                    phone: driverPhone,
                    service: serviceDetails,
                    dds: totalDds,
                    day: parseInt(today),
                    year: parseInt(year),
                    sc: totalServiceCost,
                    status,
                };
            } catch (error) {
                logWithTime(
                    `Error processing driver ${driver._id}: ${error.message}`
                );
                return null;
            }
        });

        const ddsInstances = await Promise.all(ddsPromises);
        const validDDSInstances = ddsInstances.filter((dds) => dds !== null);

        await Promise.all(
            validDDSInstances.map(async (data) => {
                const exists = await DDS.findOne({
                    driverCode: data.driverCode,
                    day: data.day,
                }).lean();

                if (!exists) {
                    await DDS.create(data);
                }
            })
        );

        logWithTime("DDS saved for all drivers.");
    } catch (error) {
        console.error("Error while processing DDS:", error);
    }
}

async function main() {
    try {
        const now = new Date();
        if (isInSummerBan(now)) {
            return;
        }
        await mongoose.connect(
            "mongodb://admin:samar789@localhost:27017/samar2?authSource=admin"
        );
        await process();

        await deleteStudent();
    } catch (error) {
        console.error("Error in main process:", error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
