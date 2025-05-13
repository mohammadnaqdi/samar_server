const mongoose = require("mongoose");
const Driver = require("./src/models/driver");
const DDS = require("./src/models/dds");
const { Service, DriverChange } = require("./src/models/service");

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

        const drivers = await Driver.find().lean();

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
                }).lean();

                let service = [];
                let dds = 0;
                let sc = 0;
                let status = "Normal";
                const snum = [];

                let name = "";
                let phone = "";

                if (services.length !== 0) {
                    service = services.map((serv) => {
                        const allStudents = serv.student.map((std, index) => ({
                            id: std,
                            cost: serv.studentCost[index],
                        }));

                        sc += serv.cost;
                        dds += serv.driverSharing;
                        snum.push(serv.serviceNum);

                        return {
                            num: serv.serviceNum,
                            serviceCost: serv.cost,
                            driverShare: serv.driverSharing,
                            students: allStudents,
                        };
                    });

                    const { driverName, driverPhone } = services[0];
                    name = driverName;
                    phone = driverPhone;
                } else {
                    name = driver.driverName;
                    phone = driver.driverPhone;
                }

                if (driver.active) {
                    dds = Math.round(dds / getMonth());
                    sc = Math.round(sc / getMonth());

                    const change = await DriverChange.findOne({
                        delete: false,
                        agencyId: driver.agencyId,
                        serviceNum: { $in: snum },
                        createdAt: { $gte: startOfDay, $lte: endOfDay },
                    });

                    if (change) {
                        status = "Absent";
                    }
                } else {
                    dds = 0;
                    status = "NT";
                }

                const newDDS = new DDS({
                    agencyId: driver.agencyId,
                    driverId: driver._id,
                    name,
                    phone,
                    service,
                    dds,
                    sc,
                    status,
                });

                return newDDS;
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

        logWithTime("DDS Saved for all drivers");
    } catch (error) {
        console.error("Error while inserting dds:", error);
    } finally {
        await mongoose.disconnect();
    }
}

process();
