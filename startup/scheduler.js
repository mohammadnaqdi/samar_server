const cron = require("node-cron");
const generateBackup = require("../src/middleware/backup");

module.exports = function (mongoose) {
    cron.schedule("0 * * * *", async () => {
        try {
            console.log("Starting backup...");
            await generateBackup(mongoose.connection);
            console.log("Backup completed successfully.");
        } catch (error) {
            console.error("Error during backup:", error);
        }
    });
};
