const { createClient } = require("redis");
const { User } = require("../src/models/user");
const { Bank } = require("../src/models/levels");
const { Keys } = require("../src/models/keys");
const { Parent } = require("../src/models/parent");
const School = require("../src/models/school");
const { Agency } = require("../src/models/agency");

const redisClient = createClient({
    // path: "/home/raxitaxi/redis/redis.sock",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

redisClient.connect().catch(console.error);

async function checkSchools() {
    try {
        const checkSchools = await redisClient.keys("school:*");
        const agencies = await Agency.find({
            delete: false,
            active: true,
        }).lean();
        const agenciesId = agencies.map((agency) => agency._id);
        const schoolC = await School.countDocuments({
            agencyId: { $in: agenciesId },
            delete: false,
            active: true,
        });
        console.log(schoolC, "schools in mongodb");
        if (checkSchools.length != schoolC) {
            for (const agency of agencies) {
                const schools = await School.find({
                    agencyId: agency._id,
                    delete: false,
                    active: true,
                }).lean();

                if (schools.length === 0) continue;
                const multi = redisClient.multi();
                schools.forEach((school) => {
                    multi.set(
                        `school:${agency._id}:${school._id}`,
                        JSON.stringify(school)
                    );
                });
                await multi.exec();
                console.log(`${schools.length} Schools added to Redis cache.`);
            }
        }
        console.log(checkSchools.length, "schools in redis cache");
    } catch (error) {
        console.error("Error checking schools:", error);
    }
}
async function checkParents() {
    try {
        const checkParents = await redisClient.keys("parent:*");
        const ParentLen = await Parent.countDocuments();
        console.log(ParentLen, "parents in mongodb");
        if (checkParents.length != ParentLen) {
            const parents = await Parent.find().lean();
            if (parents.length === 0) return;
            const multi = redisClient.multi();
            parents.forEach((parent) => {
                multi.set(`parent:${parent._id}`, JSON.stringify(parent));
            });
            await multi.exec();
            console.log(`${parents.length} Parents added to Redis cache.`);
            return;
        }
        console.log(checkParents.length, "users in redis cache");
    } catch (error) {
        console.error("Error checking users:", error);
    }
}
async function checkUsers() {
    try {
        const checkUsers = await redisClient.keys("user:*");
        const userLen = await User.countDocuments();
        console.log(userLen, "users in mongodb");
        if (checkUsers.length != userLen) {
            const users = await User.find().lean();
            if (users.length === 0) return;
            const multi = redisClient.multi();
            users.forEach((user) => {
                multi.set(`user:${user._id}`, JSON.stringify(user));
            });
            await multi.exec();
            console.log(`${users.length} Users added to Redis cache.`);
            return;
        }
        console.log(checkUsers.length, "users in redis cache");
    } catch (error) {
        console.error("Error checking users:", error);
    }
}

async function checkBanks() {
    try {
        const checkBanks = await redisClient.keys("bank:*");
        const banks = await Bank.find().lean();
        if (checkBanks.length != banks.length) {
            if (banks.length === 0) return;
            const multi = redisClient.multi();
            banks.forEach((bank) => {
                multi.set(`bank:${bank._id}`, JSON.stringify(bank));
            });
            await multi.exec();
            console.log(`${banks.length} Banks added to Redis cache.`);
            return;
        }
        console.log(checkBanks.length, "banks in redis cache");
    } catch (error) {
        console.error("Error checking banks:", error);
    }
}

async function checkKeys() {
    try {
        const checkKeys = await redisClient.keys("keys:*");
        let keys = await Keys.find({ delete: false, active: true }).lean();
        console.log(keys.length, "keys in mongodb");

        if (checkKeys.length != keys.length) {
            if (keys.length === 0) return;
            keys = await Keys.find({
                delete: false,
                active: true,
            }).lean();

            if (keys.length === 0) return;

            const multi = redisClient.multi();
            keys.forEach((key) => {
                multi.set(`keys:${key.type}:${key._id}`, JSON.stringify(key));
            });

            await multi.exec();
            console.log(`${keys.length} Keys added to Redis cache.`);
            return;
        }

        console.log(checkKeys.length, "keys in redis cache");
    } catch (error) {
        console.error("Error checking keys:", error);
    }
}

module.exports = {
    checkUsers,
    checkKeys,
    checkBanks,
    redisClient,
    checkParents,
    checkSchools,
};
