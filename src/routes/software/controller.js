const controller = require("../controller");
const path = require("path");
const fs = require("fs-extra");

module.exports = new (class extends controller {
    async setVersion(req, res) {
        // try {
        const { id, type, versionCode, versionName, url, changeDesc } =
            req.body;
        const active = req.body.active ?? true;

        let soft;
        if (!id || id === "0") {
            soft = new this.Versionsoft({
                type,
                versionCode,
                versionName,
                url,
                changeDesc,
                active,
            });
            await soft.save();

            const latestVersions = await this.Versionsoft.find({ type })
                .sort({ _id: -1 })
                .limit(3);

            const latestVersionIds = latestVersions.map(
                (version) => version._id
            );

            await this.Versionsoft.deleteMany({
                type,
                _id: { $nin: latestVersionIds },
            });
        } else {
            soft = await this.Versionsoft.findByIdAndUpdate(
                id,
                {
                    type,
                    versionCode,
                    versionName,
                    url,
                    changeDesc,
                    active,
                },
                { new: true }
            );
            await this.updateRedisDocument(`software:${type}`, soft);
        }

        return this.response({
            res,
            data: soft.id,
        });
        // } catch (error) {
        //     console.error("Error in setVersion:", error);
        //     return this.response({
        //         res,
        //         code: 500,
        //         message: error,
        //     });
        // }
    }

    async getVersion(req, res) {
        // try {
        const { type } = req.query;
        if (!type) {
            return this.response({
                res,
                code: 214,
                message: "Type is required.",
            });
        }

        // const version = await this.Versionsoft.findOne({
        //     type,
        //     active: true,
        // }).sort({ versionCode: -1 });
        let version = await this.redisClient.get(`software:${type}`);
        version = JSON.parse(version);

        return this.response({
            res,
            data: version,
        });
        // } catch (error) {
        //     console.error("Error in getVersion:", error);
        //     return this.response({
        //         res,
        //         code: 500,
        //         message: error,
        //     });
        // }
    }

    async get10LastVersions(req, res) {
        // try {
        const type = req.query.type ?? "0";

        const typesToFetch = type === "0" ? [1, 2, 3] : [parseInt(type, 10)];

        const results = await Promise.all(
            typesToFetch.map((t) =>
                this.Versionsoft.find({ type: t })
                    .sort({ versionCode: -1 })
                    .limit(10)
            )
        );

        const response = {
            parent: results[0] ?? [],
            driver: results[1] ?? [],
            manager: results[2] ?? [],
        };

        return this.response({
            res,
            data: response,
        });
        // } catch (error) {
        //     console.error("Error in get10LastVersions:", error);
        //     return this.response({
        //         res,
        //         code: 500,
        //         message: error,
        //     });
        // }
    }

    async backup(req, res) {
        // try {
        const outputDir = path.join(__dirname, "../../../backups");

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const getLatestZipFilePath = () => {
            const files = fs.readdirSync(outputDir);
            const zipFiles = files.filter((file) => file.endsWith(".zip"));

            if (zipFiles.length === 0) {
                return null;
            }

            const latestZipFile = zipFiles
                .map((file) => ({
                    file,
                    stats: fs.statSync(path.join(outputDir, file)),
                }))
                .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0].file;

            return path.join(outputDir, latestZipFile);
        };

        const latestZipFilePath = getLatestZipFilePath();
        console.log(`Latest ZIP file path: ${latestZipFilePath}`);

        return this.response({
            res,
            message: "Backup successfully created and saved.",
        });
        // } catch (error) {
        //     console.error("Backup error:", error);
        //     return this.response({
        //         res,
        //         code: 500,
        //         message: "An error occurred while creating the backup.",
        //         data: error.message,
        //     });
        // }
    }
})();
