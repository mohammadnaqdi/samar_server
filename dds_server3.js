const mongoose = require("mongoose");
const Driver = require("./src/models/driver");
const Student = require("./src/models/student");
const { DDS } = require("./src/models/dds");
const { AgencySet } = require("./src/models/agency");
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

function getMonth() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const isBeforeFarvardin = month === 3 && day < 22;
    const isAfterShahrivar = month === 9 && day >= 22;

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
        console.error("Formula template must be a string.");
        return null;
    }

    const tolerance = 1e-6;
    let low = 0;
    let high = targetAnswer * 2;
    let mid;

    while (high - low > tolerance) {
        mid = (low + high) / 2;
        const formula = formulaTemplate.replace(/a/g, mid).replace(/b/g, b);

        const result = new Function(`return ${formula};`)();
        if (result < targetAnswer) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return Math.floor(mid);
}

async function percent(agencyId) {
    try {
        const percents = await ListAcc.find({
            enable: true,
            agencyId,
            percent: { $gt: 0 },
        });
        return percents.reduce((sum, item) => sum + item.percent, 0);
    } catch (error) {
        console.error("Error calculating driver share:", error);
        return null;
    }
}

async function removeStudentFromService(studentId, serviceNum) {
    try {
        // const service = await Service.findOne({ serviceNum, delete: false });
        const service = await Service.findOne({'students.id':studentId,delete:false});
        if(!service)return -1;

        const index = service.student.indexOf(studentId);
        if (index === -1) return null;

        service.student.splice(index, 1);
        service.studentCost.splice(index, 1);

        const serviceCost = service.studentCost.reduce((a, b) => a + b, 0);
        const setting = await AgencySet.findOne({ agencyId: service.agencyId });

        let formula = "a-(a*(b/100))";
        let formulaForStudent = false;
        if (setting) {
            formula = setting.formula;
            formulaForStudent = setting.formulaForStudent;
        }

        const percentage = await percent(service.agencyId);
        if (formulaForStudent) {
            service.driverSharing = reverseEvaluateFormula(
                serviceCost,
                percentage,
                formula
            );
        } else {
            service.driverSharing = evaluateFormula(formula, {
                a: serviceCost,
                b: percentage,
            });
        }

        service.driverSharing = Math.floor(service.driverSharing);
        service.cost = serviceCost;
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
            endOfContract: { $lte: Date.now() },
        });

        if (stds.length > 0) {
            let count = 0;
            for (const std of stds) {
                const removeSt = await removeStudentFromService(
                    std.id,
                    std.serviceId
                );

                if (removeSt) {
                    std.state = 5;
                    std.stateTitle = `حذف از ش.س ${removeSt} در قرارداد`;
                    std.serviceId = 0;
                    std.serviceCost = 0;
                    await std.save();
                    count++;
                }
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
        const drivers = await Driver.find({ delete: false }).lean();
        const now = new Date();
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

        const ddsPromises = drivers.map(async (driver) => {
            try {
                const services = await Service.find({
                    driverId: driver._id,
                    delete: false,
                }).lean();

                let serviceDetails = [];
                let totalDds = 0;
                let totalServiceCost = 0;
                let status = "Normal";
                const serviceNums = [];

                let driverName = "";
                let driverPhone = "";

                if (services.length !== 0) {
                    serviceDetails = services.map((service) => {
                        const students = service.student.map((std, index) => ({
                            id: std,
                            cost: service.studentCost[index],
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
                    });

                    driverName = services[0].driverName;
                    driverPhone = services[0].driverPhone;
                } else {
                    const user = await User.findById(driver.userId).lean();
                    driverName = `${user.name} ${user.lastName}`;
                    driverPhone = user.phone;
                }

                if (driver.active) {
                    totalDds = Math.round(totalDds / getMonth());
                    totalServiceCost = Math.round(
                        totalServiceCost / getMonth()
                    );

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

                return new DDS({
                    agencyId: driver.agencyId,
                    driverId: driver._id,
                    name: driverName,
                    phone: driverPhone,
                    service: serviceDetails,
                    dds: totalDds,
                    sc: totalServiceCost,
                    status,
                });
            } catch (error) {
                logWithTime(
                    `Error processing driver ${driver._id}: ${error.message}`
                );
                return null;
            }
        });

        const ddsInstances = await Promise.all(ddsPromises);
        const validDDSInstances = ddsInstances.filter((dds) => dds !== null);

        await Promise.all(validDDSInstances.map((newDDS) => newDDS.save()));

        logWithTime("DDS saved for all drivers.");
    } catch (error) {
        console.error("Error while processing DDS:", error);
    }
}

async function main() {
    try {
        await mongoose.connect(
            "mongodb://admin:udXO3D0ZMNd8@192.168.0.7:27017/samar-rad?authSource=admin"
        );
        await deleteStudent();
        await process();
    } catch (error) {
        console.error("Error in main process:", error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
