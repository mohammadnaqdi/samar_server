const mongoose = require("mongoose");
const Student = require("./src/models/student");
const DSC = require("./src/models/dsc");
const { Service } = require("./src/models/service");

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

    const isBeforeFarvardin = month === 3 && day < 21;
    const isAfterShahrivar = month === 9 && day >= 23;

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

async function process() {
    try {
        await mongoose.connect(
            "mongodb://admin:udXO3D0ZMNd8@192.168.0.7:27017/samar-rad?authSource=admin"
        );

        const services = await Service.find().lean();

        const dscPromises = services.map(async (service) => {
            try {
                let studentIds = service.student;

                const studentPromises = studentIds.map(async (std) => {
                    const student = await Student.findById(std).lean();
                    if (!student) return null;

                    const existingDSC = await DSC.findOne({
                        agencyId: service.agencyId,
                        driverId: service.driverId,
                        studentId: std,
                        serviceId: service._id,
                        serviceNum: service.serviceNum,
                        dsc: Math.round(student.serviceCost / getMonth()),
                    });

                    if (existingDSC) return null;

                    const newDSC = new DSC({
                        agencyId: service.agencyId,
                        driverId: service.driverId,
                        studentId: std,
                        serviceId: service._id,
                        serviceNum: service.serviceNum,
                        dsc: Math.round(student.serviceCost / getMonth()),
                    });

                    return newDSC;
                });

                const dscInstancesForService = await Promise.all(
                    studentPromises
                );

                return dscInstancesForService.filter((dsc) => dsc !== null);
            } catch (error) {
                logWithTime(
                    `Error processing service ${service._id}: ${error.message}`
                );
                return [];
            }
        });

        const allDSCInstances = (await Promise.all(dscPromises)).flat();

        if (allDSCInstances.length > 0) {
            await DSC.insertMany(allDSCInstances);
            logWithTime("DSC Saved for all services.");
        } else {
            logWithTime("No DSC instances to save.");
        }
    } catch (error) {
        console.error("Error while inserting DSC:", error);
    } finally {
        await mongoose.disconnect();
    }
}

process();
