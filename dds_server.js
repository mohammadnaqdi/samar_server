const mongoose = require("mongoose");
const Driver = require("./models/driver");
const DDS = require("./models/dds");
const { User } = require("./models/user");
const { Service, DriverChange } = require("./models/service");

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

async function process() {
    try {
        await mongoose.connect(
            "mongodb://samarrad_radAdmin:rad9891401@127.0.0.1:27017/samarrad_school"
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

                const user = await User.findById(driver.userId).lean();
                if (!user) {
                    throw new Error(`User not found for driver ${driver._id}`);
                }

                let service = [];
                let dds = 0;
                let status = "Normal";
                const snum = [];

                services.forEach((serv) => {
                    service.push({
                        num: serv.serviceNum,
                        serviceCost: serv.cost,
                        driverShare: serv.driverSharing,
                    });
                    dds += serv.driverSharing;
                    snum.push(serv.serviceNum);
                });

                if (driver.active) {
                    dds = Math.round(dds / 30);

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
                    name: `${user.name} ${user.lastName}`,
                    phone: user.phone,
                    service,
                    dds,
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