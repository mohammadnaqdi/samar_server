const uploadFileMiddleware = require("../../middleware/upload");
const Jimp = require("jimp");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

async function resize(simg, simg2) {
    // try {
    const image = await Jimp.read(simg);
    image.quality = 3;
    var w = image.getWidth();
    var h = image.getHeight();
    image
        .resize(400, (h * 400) / w, Jimp.RESIZE_BEZIER, function (err) {
            if (err) throw err;
        })
        .write(simg2);
    // } catch (error) {
    //     console.error("Error while resizing the image:", error);
    //     throw error;
    // }
}

const upload = async (req, res) => {
    // try {
    await uploadFile(req, res);

    if (req.file == undefined) {
        return res.status(400).send({ message: "Please upload a file!" });
    }

    var clubName = "pics";
    var phoneName = req.user.phone;
    var folder = clubName + "/" + phoneName;
    var dir = folder + "/";
    var filename = req.file.originalname.replace(/\s/g, "");

    dir = dir + filename;

    var folder = clubName + "/" + phoneName;
    var ex = path.extname(filename);
    if (
        ex === ".jpg" ||
        ex === ".png" ||
        ex === ".jpeg" ||
        ex === ".bmp" ||
        ex === ".tiff" ||
        ex === ".gif"
    ) {
        var dir1 = __basedir + "/src/uploads/" + folder + "/" + filename;
        var filename2 = filename.replace(ex, "") + "_min" + ex;
        var dir2 = __basedir + "/src/uploads/" + folder + "/" + filename2;
        await resize(dir1, dir2);
    }

    return res.status(200).send({
        message: "Uploaded the file successfully",
        src: "api/file/files/" + dir,
    });
    // } catch (error) {
    //     console.error("Error while uploading file:", error);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
};

const upload2 = async (req, res) => {
    // try {
    const timestamp = Date.now();
    req.timestamp = timestamp;

    await uploadFileMiddleware(req, res);

    if (req.file == undefined) {
        return res.status(400).send({ message: "Please upload a file!" });
    }

    const clubName = "pics";
    const phoneName = req.user.phone;
    const ext = path.extname(req.file.originalname);
    const filename = `${phoneName}_${timestamp}${ext}`;
    const folder = `${clubName}/${phoneName}`;
    const dir = `${folder}/${filename}`;

    return res.status(200).send({
        message: "Uploaded the file successfully",
        src: `api/file/files/${dir}`,
    });
    // } catch (error) {
    //     console.error("Error while uploading file (upload2):", error);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
};

const getListFiles = (req, res) => {
    // try {
    const directoryPath = __basedir + "/src/uploads/";
    fs.readdir(directoryPath, function (err, files) {
        if (err) {
            console.error("Error while reading directory:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
        let fileInfos = [];
        files.forEach((file) => {
            fileInfos.push({
                name: file,
                url: baseUrl + file,
            });
        });
        return res.status(200).send(fileInfos);
    });
    // } catch (error) {
    //     console.error("Error while getting list of files:", error);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
};

const download = (req, res) => {
    // try {
    const fileName = req.params.name;
    const width = parseInt(req.query.width, 10);
    const height = parseInt(req.query.height, 10);

    const resizeOptions = {
        width: width || null,
        height: height || null,
    };

    const folderName = path.join(__basedir, "/src/uploads/pics/", fileName);
    const filePath = path.join(folderName, fileName + ".jpg");

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send({ message: "File not found" });
        }

        sharp(filePath)
            .resize(resizeOptions)
            .toBuffer((err, buffer) => {
                if (err) {
                    console.error("Error while processing the image:", err);
                    return res
                        .status(500)
                        .json({ error: "Internal Server Error." });
                }

                res.set("Content-Type", "image/jpeg");
                res.set("Content-Length", buffer.length);

                return res.send(buffer);
            });
    });
    // } catch (error) {
    //     console.error("Error while downloading the file:", error);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
};
const downloadPDF = (req, res) => {
    // try {
        const filePathFromUrl = req.params[0];
    console.log("filePathFromUrl", filePathFromUrl);
        const file = `${__basedir}/src/uploads/pics/${filePathFromUrl}`;
      
        res.download(file); // Set disposition and send it.
    // } catch (error) {
    //     console.error("Error while downloading the file:", error);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
};

const download2 = (req, res) => {
    // try {
    const filePathFromUrl = req.params[0];
    const width = parseInt(req.query.width, 10);
    const filePath = path.join(__basedir, "src/uploads/pics/", filePathFromUrl);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send({ message: "File not found" });
        }

        sharp(filePath)
            .metadata()
            .then((metadata) => {
                const originalWidth = metadata.width;
                const originalHeight = metadata.height;

                const height = Math.round(
                    (width * originalHeight) / originalWidth
                );

                const resizeOptions = {
                    width: width || null,
                    height: height || null,
                };

                sharp(filePath)
                    .resize(resizeOptions)
                    .toBuffer((err, buffer) => {
                        if (err) {
                            console.error(
                                "Error while processing the image:",
                                err
                            );
                            return res
                                .status(500)
                                .json({ error: "Internal Server Error." });
                        }

                        res.set("Content-Type", "image/jpeg");
                        res.set("Content-Length", buffer.length);

                        return res.send(buffer);
                    });
            })
            .catch((err) => {
                console.error("Error while retrieving image metadata:", err);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            });
    });
    // } catch (error) {
    //     console.error("Error while downloading the file (download2):", error);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
};

const download3 = (req, res) => {
    // try {
    const filePathFromUrl = req.params[0];
    const width = parseInt(req.query.width, 10);
    const filePath = path.join(
        __basedir,
        "src/uploads/banks/",
        filePathFromUrl
    );

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send({ message: "File not found" });
        }

        sharp(filePath)
            .metadata()
            .then((metadata) => {
                const originalWidth = metadata.width;
                const originalHeight = metadata.height;

                const height = Math.round(
                    (width * originalHeight) / originalWidth
                );

                const resizeOptions = {
                    width: width || null,
                    height: height || null,
                };

                sharp(filePath)
                    .resize(resizeOptions)
                    .toBuffer((err, buffer) => {
                        if (err) {
                            console.error(
                                "Error while processing the image:",
                                err
                            );
                            return res
                                .status(500)
                                .json({ error: "Internal Server Error." });
                        }

                        res.set("Content-Type", "image/jpeg");
                        res.set("Content-Length", buffer.length);

                        return res.send(buffer);
                    });
            })
            .catch((err) => {
                console.error("Error while retrieving image metadata:", err);
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            });
    });
    // } catch (error) {
    //     console.error("Error while downloading the file (download3):", error);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
};

// const download2 = async (req, res) => {
//     const fileName = req.params.name;
//     console.log("download2 fileName=", fileName);
//     var orgUrl = req.originalUrl;
//     orgUrl = orgUrl.replace("/api/file/files_min/", "/src/uploads/");

//     var ex = path.extname(orgUrl);
//     orgUrl = orgUrl.replace(fileName, "");
//     const directoryPath = __basedir + orgUrl;
//     const filename2 = fileName.replace(ex, "") + "_min" + ex;
//     console.log("download2 ex=", ex);
//     if (
//         ex === ".jpg" ||
//         ex === ".png" ||
//         ex === ".jpeg" ||
//         ex === ".bmp" ||
//         ex === ".tiff" ||
//         ex === ".gif"
//     ) {
//         console.log("download2 filename2=", filename2);
//         try {
//             if (fs.existsSync(directoryPath + filename2)) {
//                 console.log("download2 file exist=");
//              return res.download(directoryPath + filename2, filename2, (err) => {
//                     if (err) {
//                         // Check if headers have been sent
//                         if (res.headersSent) {
//                             // You may want to log something here or do something else
//                         } else {
//                             return res.sendStatus(500); // 404, maybe 500 depending on err
//                         }
//                     }
//                 });
//             } else {
//                 console.log(
//                     "download2 file not exist=",
//                     fs.existsSync(directoryPath + fileName)
//                 );
//                 var dir1 = directoryPath + fileName;

//                 var dir2 = directoryPath + filename2;
//                 await resize(dir1, dir2);
//              return res.download(directoryPath + fileName, fileName, (err) => {
//                     if (err) {
//                         // Check if headers have been sent
//                         if (res.headersSent) {
//                             // You may want to log something here or do something else
//                         } else {
//                             return res.sendStatus(500); // 404, maybe 500 depending on err
//                         }
//                     }
//                 });
//             }
//         } catch (err) {
//             console.error(err);
//             return res.sendStatus(500); // 404, maybe 500 depending on err
//         }
//     } else {
//      return res.download(directoryPath + fileName, fileName, (err) => {
//             if (err) {
//                 // Check if headers have been sent
//                 if (res.headersSent) {
//                     // You may want to log something here or do something else
//                 } else {
//                     return res.sendStatus(500); // 404, maybe 500 depending on err
//                 }
//             }
//         });
//     }
// };

module.exports = {
    upload,
    upload2,
    getListFiles,
    download,
    download2,
    download3,downloadPDF
};
