require("express-async-errors");
const debug = require("debug")("app:main");
const winston = require("winston");

module.exports = function () {
    process.on("uncaughtException", (ex) => {
        debug(ex);
        winston.error(ex.message, ex);
        process.exit(1);
    });
    process.on("unhandledRejection", (ex) => {
        debug(ex);
        winston.error(ex.message, ex);
        process.exit(1);
    });

    winston.add(new winston.transports.File({ filename: "logFile.log" }));

    //throw new Error('somthing faild error');//for test error
};
