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
        const redisKeys = await redisClient.keys("school:*");
        const redisCount = redisKeys.length;

        const agencies = await Agency.find({
            delete: false,
            active: true,
        }).lean();
        const agencyIds = agencies.map((a) => a._id);

        const mongoCount = await School.countDocuments({
            agencyId: { $in: agencyIds },
            delete: false,
            active: true,
        });

        console.log(`${mongoCount} schools in MongoDB`);

        if (redisCount !== mongoCount) {
            console.log(
                `Mismatch: Redis(${redisCount}) vs Mongo(${mongoCount}) → Reloading...`
            );

            // Clear old cache
            if (redisKeys.length > 0) {
                await redisClient.del(redisKeys);
            }

            // Reload schools per agency
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
                console.log(
                    `${schools.length} Schools for agency ${agency._id} cached.`
                );
            }
            return;
        }

        console.log(`${redisCount} schools in Redis cache (in sync)`);
    } catch (error) {
        console.error("Error checking schools:", error);
    }
}

async function checkParents() {
    try {
        const redisKeys = await redisClient.keys("parent:*");
        const redisCount = redisKeys.length;

        const mongoCount = await Parent.countDocuments();
        console.log(`${mongoCount} parents in MongoDB`);

        if (redisCount !== mongoCount) {
            console.log(
                `Mismatch: Redis(${redisCount}) vs Mongo(${mongoCount}) → Reloading...`
            );

            // Clear old cache
            if (redisKeys.length > 0) {
                await redisClient.del(redisKeys);
            }

            const parents = await Parent.find();
            if (parents.length > 0) {
                const multi = redisClient.multi();
                parents.forEach((parent) => {
                    multi.set(`parent:${parent._id}`, JSON.stringify(parent));
                });
                await multi.exec();
                console.log(
                    `${parents.length} Parents loaded into Redis cache.`
                );
            }
            return;
        }

        console.log(`${redisCount} parents in Redis cache (in sync)`);
    } catch (error) {
        console.error("Error checking parents:", error);
    }
}

async function checkUsers() {
    try {
        const redisUserKeys = await redisClient.keys("user:*");
        const redisCount = redisUserKeys.length;

        const mongoCount = await User.countDocuments();
        console.log(`${mongoCount} users in MongoDB`);

        if (redisCount > mongoCount) {
            console.log(
                "Redis has more users than MongoDB. Resetting cache..."
            );

            if (redisUserKeys.length > 0) {
                await redisClient.del(redisUserKeys);
            }

            const users = await User.find();
            if (users.length === 0) return;

            const multi = redisClient.multi();
            users.forEach((user) => {
                multi.set(`user:${user._id}`, JSON.stringify(user));
            });
            await multi.exec();

            console.log(`${users.length} Users reloaded into Redis cache.`);
            return;
        }

        if (redisCount < mongoCount) {
            console.log(
                "Redis is missing some users. Reloading all from MongoDB..."
            );

            if (redisUserKeys.length > 0) {
                await redisClient.del(redisUserKeys);
            }

            const users = await User.find();
            if (users.length === 0) return;

            const multi = redisClient.multi();
            users.forEach((user) => {
                multi.set(`user:${user._id}`, JSON.stringify(user));
            });
            await multi.exec();

            console.log(`${users.length} Users added to Redis cache.`);
            return;
        }

        console.log(`${redisCount} users in Redis cache (in sync).`);
    } catch (error) {
        console.error("Error checking users:", error);
    }
}

async function checkBanks() {
    try {
        const redisKeys = await redisClient.keys("bank:*");
        const redisCount = redisKeys.length;

        const banks = await Bank.find();
        const mongoCount = banks.length;

        console.log(`${mongoCount} banks in MongoDB`);

        if (redisCount !== mongoCount) {
            console.log(
                `Mismatch: Redis(${redisCount}) vs Mongo(${mongoCount}) → Reloading...`
            );

            if (redisKeys.length > 0) {
                await redisClient.del(redisKeys);
            }

            if (banks.length > 0) {
                const multi = redisClient.multi();
                banks.forEach((bank) => {
                    multi.set(`bank:${bank._id}`, JSON.stringify(bank));
                });
                await multi.exec();
                console.log(`${banks.length} Banks loaded into Redis cache.`);
            }
            return;
        }

        console.log(`${redisCount} banks in Redis cache (in sync)`);
    } catch (error) {
        console.error("Error checking banks:", error);
    }
}

async function checkKeys() {
    try {
        const redisKeys = await redisClient.keys("keys:*");
        const redisCount = redisKeys.length;

        const mongoKeys = await Keys.find({ delete: false, active: true });
        const mongoCount = mongoKeys.length;

        console.log(`${mongoCount} keys in MongoDB`);

        if (redisCount > mongoCount) {
            console.log("Redis has more keys than MongoDB. Resetting cache...");

            if (redisKeys.length > 0) {
                await redisClient.del(redisKeys);
            }

            if (mongoKeys.length > 0) {
                const multi = redisClient.multi();
                mongoKeys.forEach((key) => {
                    multi.set(
                        `keys:${key.type}:${key._id}`,
                        JSON.stringify(key)
                    );
                });
                await multi.exec();
                console.log(
                    `${mongoKeys.length} Keys reloaded into Redis cache.`
                );
            }
            return;
        }

        if (redisCount < mongoCount) {
            console.log(
                "Redis is missing some keys. Reloading all from MongoDB..."
            );

            if (redisKeys.length > 0) {
                await redisClient.del(redisKeys);
            }

            if (mongoKeys.length > 0) {
                const multi = redisClient.multi();
                mongoKeys.forEach((key) => {
                    multi.set(
                        `keys:${key.type}:${key._id}`,
                        JSON.stringify(key)
                    );
                });
                await multi.exec();
                console.log(`${mongoKeys.length} Keys added to Redis cache.`);
            }
            return;
        }

        console.log(`${redisCount} keys in Redis cache (in sync).`);
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
