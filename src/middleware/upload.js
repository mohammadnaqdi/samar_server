const path = require("path");
const multer = require("multer");
const fs = require("fs");
const util = require("util");

const maxSize = 250 * 1024 * 1024;

let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // try {
            const clubName = "pics";
            const phoneName = req.user.phone;
            const folder = `${clubName}/${phoneName}`;
            const dir = path.join(__basedir, "/src/uploads/", folder);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        // } catch (error) {
        //     console.error("Error in multer destination function:", error);
        // }
    },
    filename: (req, file, cb) => {
        // try {
            const ext = path.extname(file.originalname);
            const timestamp = req.timestamp;
            const filename = `${req.user.phone}_${timestamp}${ext}`;
            cb(null, filename);
        // } catch (error) {
        //     console.error("Error in multer filename function:", error);
        // }
    },
});

let uploadFile = multer({
    storage: storage,
    limits: { fileSize: maxSize },
}).single("file");

let uploadFileMiddleware = util.promisify(uploadFile);

module.exports = uploadFileMiddleware;
