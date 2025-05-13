const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const config = require("config");
const jwt = require("jsonwebtoken");
const Zarin = require("zarinpal-checkout");
var fs = require("fs");
const qs = require("qs");
const persianDate = require("persian-date");
const axios = require("axios");
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;

module.exports = new (class extends controller {
    async startService(req, res) {
        try {
            if (req.query.serial === undefined || req.query.serial === "") {
                return this.response({
                    res,
                    code: 205,
                    message: "serial need",
                });
            }
            if (
                req.query.serviceNum === undefined ||
                req.query.serviceNum === ""
            ) {
                return this.response({
                    res,
                    code: 205,
                    message: "serviceNum need",
                });
            }
            if (req.query.start === undefined || req.query.start === "") {
                return this.response({
                    res,
                    code: 205,
                    message: "start need",
                });
            }
            let { serial, serviceNum, start } = req.query;
            serial = parseInt(serial);
            serviceNum = parseInt(serviceNum);
            start = parseInt(start);
            if (!isWithinTimeRange) {
                return this.response({
                    res,
                    code: 400,
                    message: "Request is not allowen in this time range",
                });
            }
            const driver = await this.Driver.findOne({
                serial: serial,
                active: true,
                delete: false,
            });
            if (!driver) {
                return this.response({
                    res,
                    code: 404,
                    message: "driver not find",
                });
            }
            const agency = await this.Agency.findById(
                driver.agencyId,
                "location.coordinates"
            );
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not find",
                });
            }

            const service = await this.Service.findOne(
                { serviceNum, delete: false, active: true },
                "student driverPhone"
            );
            if (!service) {
                return this.response({
                    res,
                    code: 404,
                    message: "service not find",
                });
            }
            if (service.student.length === 0) {
                return this.response({
                    res,
                    code: 404,
                    message: "service student is empty",
                });
            }
            let driverAct = new this.DriverAct({
                driverCode: driver.driverCode,
                location: { type: "Point", coordinates: [agency.location.coordinates[0], agency.location.coordinates[1]] },
                model: 1,
                serviceId: serviceNum,
                isWarning: false,
                studentId: "",
                start: start,
            });
            driverAct.save();

            let parents = [];
            let students = [];
            let users = [];
            let phones = [];
            for (var st of service.student) {
                const student = await this.Student.findById(
                    st,
                    "name lastName studentCode parent avanak avanakNumber delete active"
                );
                if (student) {
                    if (student.active && !student.delete) {
                        if (student.avanak && student.avanakNumber.length > 6) {
                            phones.push(student.avanakNumber);
                        }
                        students.push(st.studentCode);
                        const parent = await this.Parent.findById(
                            student.parent,
                            "fcm"
                        );
                        if (parent) {
                            parents.push(parent._id.toString());
                            users.push(parent);
                        }
                    }
                }
            }
            var data = {
                state: 1,
                start: 1,
                students: students,
                lat: agency.location.coordinates[0],
                lng: agency.location.coordinates[1],
            };
            __ioSocket.emit(`service${serviceNum}`, {
                serviceNum: serviceNum,
                sender: service.driverPhone,
                driverCode: driver.driverCode,
                parentsId: parents,
                data: data,
            });
            var registrationTokens = [];
            for (var i in users) {
                for (var j in users[i].fcm) {
                    let registrationToken = users[i].fcm[j].token;
                    if (registrationToken.toString().length > 20) {
                        registrationTokens.push(registrationToken);
                    }
                }
            }
            console.log("registrationTokens", registrationTokens);
            if (registrationTokens.length === 0) return;
            const registrationTokensBatches = chunkArray(
                registrationTokens,
                30
            );
            const sendMessages = async () => {
                const promises = registrationTokensBatches.map(
                    async (batch) => {
                        const messages = batch.map(async (token) => {
                            const message = {
                                notification: {
                                    title: "سرویس شماره: " + serviceNum,
                                    body:
                                        start === 1
                                            ? "راننده به سمت شما می آید لطفا آماده باشید"
                                            : "راننده به مدرسه رسید.",
                                },
                                token,
                            };

                            return __admin
                                .messaging()
                                .send(message)
                                .then(function (response) {
                                    console.log(
                                        "successfully sent =",
                                        response
                                    );
                                })
                                .catch(function (err) {
                                    console.log("error sent =", err);
                                });
                        });
                        await Promise.all(messages);
                    }
                );
                await Promise.all(promises);
            };

            await sendMessages();
            if (start === 1) {
                for (var ph of phones) {
                    let data = qs.stringify({
                        number: ph,
                        messageId: 32293806,
                        UserName: amootUser,
                        Password: amootPass,
                        serverid: 0,
                        vote: false,
                    });

                    let config = {
                        method: "post",
                        url: "https://portal.avanak.ir/webservice3.asmx/QuickSend",
                        headers: {
                            Authorization: amoot_t,
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        data: data,
                    };

                    await axios.request(config);
                }
            }
            return this.response({
                res,
                message: "ok",
            });
        } catch (e) {
            console.log("Error while startService:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
function isWithinTimeRange() {
    const now = new Date();

    const iranOffset = 3.5 * 60 * 60 * 1000;
    const iranTime = new Date(now.getTime() + iranOffset);

    const currentHour = iranTime.getUTCHours();

    if (currentHour >= 5 && currentHour < 15) {
        return true;
    } else {
        return false;
    }
}
const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};
function financial(x) {
    x = x / 10000;
    x = Number.parseFloat(x).toFixed();
    x = x * 10000;
    return x;
}
function getFormattedDateTime(date) {
    if (!(date instanceof Date)) {
        throw new TypeError("Input must be a Date object");
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // zero-pad month
    const day = String(date.getDate()).padStart(2, "0"); // zero-pad day
    const hour = String(date.getHours()).padStart(2, "0"); // zero-pad hour
    const minute = String(date.getMinutes()).padStart(2, "0"); // zero-pad minute
    const second = String(date.getSeconds()).padStart(2, "0"); // zero-pad second

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
