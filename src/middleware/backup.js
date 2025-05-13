const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const mongoose = require("mongoose");
const { Transform } = require("stream");

const outputDir = path.join(__dirname, "./../../backups/");
const zipFilePath = path.join(
    outputDir,
    `backup-${new Date().toISOString().split("T")[0]}.zip`,
);

function transformDocument(doc) {
    const transformed = {};
    for (const key in doc) {
        if (doc[key] instanceof mongoose.Types.ObjectId) {
            transformed[key] = { $oid: doc[key].toString() };
        } else {
            transformed[key] = doc[key];
        }
    }
    return transformed;
}

async function generateBackup(mongooseConnection) {
    try {
        await fs.ensureDir(outputDir);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.on("error", (err) => {
            throw err;
        });

        archive.pipe(output);

        const collections = await mongooseConnection.db
            .listCollections()
            .toArray();

        await Promise.all(
            collections.map(async (collection) => {
                const collectionName = collection.name;
                const cursor = mongooseConnection.db
                    .collection(collectionName)
                    .find();

                const transformStream = new Transform({
                    objectMode: true,
                    transform(doc, encoding, callback) {
                        callback(
                            null,
                            JSON.stringify(transformDocument(doc)) + "\n",
                        );
                    },
                });

                archive.append(cursor.stream().pipe(transformStream), {
                    name: `${collectionName}.json`,
                });
            }),
        );

        await archive.finalize();
        console.log(
            "All collections have been exported and compressed into a ZIP file.",
        );
    } catch (err) {
        console.error("Error exporting collections:", err);
    }
}

module.exports = generateBackup;
