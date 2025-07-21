require("dotenv").config();
const express = require("express");
const app = express();

const mongoose = require("mongoose");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    // origin: "https://mysamar.ir", // Replace with your actual frontend URL 
    methods: ["GET", "POST", "DELETE"],         // Allowed HTTP methods for CORS 
    credentials: true                 // Allow credentials (cookies, auth headers)
  }
});
 

const helmet = require("helmet");
const logger = require("./startup/logging");

const { User } = require("./src/models/user");
const { Service } = require("./src/models/service");
const { DriverAct } = require("./src/models/location");
const Student = require("./src/models/student");

const { isLoggined } = require("./src/middleware/auth");

const router = require("./src/routes");
const { checkUsers, checkKeys,checkParents,checkSchools } = require("./startup/redis");

checkUsers();
checkKeys();
checkParents();
checkSchools();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet({
    crossOriginResourcePolicy: false,
  }));

global.__basedir = __dirname;

require("./startup/config")(app, express);
require("./startup/db")(mongoose);
require("./startup/logging");

global.__admin = require("firebase-admin");
var serviceAccount = require("./google.json");

__admin.initializeApp({
    credential: __admin.credential.cert(serviceAccount),
});
const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};
// var messaging = require("firebase-admin/app");

app.use("/api", router);

app.all("*", function (req, res) {
    // let urlObj = url.parse(req.url);
    // let name = urlObj.pathname.split('/')[1];

    return res.redirect("/");
});

var activeUsers = new Set();

app.get("/checkOnline", isLoggined, (req, res) => {
    // try {
    const club = req.user.club;

    var found = [];
    for (const e of activeUsers) {
        if (e.club === club.toString()) {
            found.push(e.id);
        }
    }

    return res.json(found);
    // } catch (err) {
    //     console.error("Error while checkOnline on index.js:", err);
    //     return res.status(500).json({ error: "Internal Server Error." });
    // }
});

global.__ioSocket = io.on("connection", async (socket) => {
    if (socket.handshake.headers["phone"] != undefined) {
        activeUsers.add({
            phone: socket.handshake.headers["phone"],
            type: socket.handshake.headers["type"],
        });

        console.log(
            "socket= ",
            socket.handshake.headers["device"] +
                " " +
                socket.handshake.headers["phone"]
        );
        // let dv=await Tokens.findOne({user:socket.handshake.headers['id'],device:socket.handshake.headers['device']});
        // if(!dv){
        //   let tk=new Tokens({
        //     clubId:socket.handshake.headers['club'],
        //     user:socket.handshake.headers['id'],
        //     token:socket.handshake.headers['token'],
        //     device:socket.handshake.headers['device'],
        //     dateTime:Date.now()
        //   });
        //   console.log("socket tk",tk.device);
        //   await tk.save();
        // }else {
        //   console.log("socket dv",dv.device);
        //   dv.token=socket.handshake.headers['token'];
        //   dv.dateTime=Date.now();
        //   dv.save();
        // }

        // io.emit("userState"+socket.handshake.headers['club'],{"state":"on","user":socket.handshake.headers['id']} );
    }
    socket.on("disconnect", () => {
        // try {
        if (socket.handshake.headers["id"] != undefined) {
            console.log("socket off", socket.handshake.headers["id"]);
            for (const e of activeUsers) {
                if (e.id === socket.handshake.headers["id"]) {
                    activeUsers.delete(e);
                    break;
                }
            }
            //console.log("socket off",activeUsers);
            io.emit("userState" + socket.handshake.headers["club"], {
                state: "off",
                user: socket.handshake.headers["id"],
            });
        }
        // } catch (err) {
        //     console.error("Error while disconnecting on socket:", err);
        // }
    });

    // socket.on("task",async (data)=>{
    //   console.log("task",data);
    //   io.emit(data.where+"task",data);
    // });

    socket.on("startService", async (data) => {
        console.log(`service${data.serviceNum}`);
        io.emit(`service${data.serviceNum}`, data);

        try {
        let driverAct = new DriverAct({
            driverCode: data.driverCode,
            location: { type: "Point", coordinates: [data.data.lat, data.data.lng] },
            model: data.data.state,
            serviceId: data.serviceNum,
            isWarning: false,
            studentId: "",
            start: data.data.start,
        });
        driverAct.save();
        } catch (e) {
            console.log("Error while startService on socket:", e);
        }
        try {
            const users = await User.find({ _id: data.parentsId }, "fcm");
            console.log("try send= users", users.length);
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
            // const message = {
            //     notification: {
            //         title: "سرویس شماره: " + data.serviceNum,
            //         body:
            //             data.data.state === 1
            //                 ? "راننده به سمت شما می آید لطفا آماده باشید"
            //                 : "راننده از مدرسه به سمت منازل شروع به حرکت کرد",
            //     },
            //     Payload: {
            //         sound: "alert",
            //     },
            //     android: {
            //         notification: {
            //             sound: "alert",
            //         },
            //     },
            //     tokens: registrationTokens,
            // };

            

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
                                    title: "سرویس شماره: " + data.serviceNum,
                                    body:
                                        data.data.state === 1
                                            ? "راننده به سمت شما می آید لطفا آماده باشید"
                                            : "راننده از مدرسه به سمت منازل شروع به حرکت کرد",
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
            // __admin
            //     .messaging()
            //     .sendMulticast(message)
            //     .then(function (response) {
            //         console.log(
            //             "successfully sent for startService on socket:",
            //             response,
            //         );
            //     })
            //     .catch(function (err) {
            //         console.log("Error while startService on socket:", err);
            //     });
        } catch (e) {
            console.log("Error while startService on socket:", e);
        }
    });
    socket.on("startService2", async (data) => {
        console.log(`startService2 :${data.serviceNum}`);
        io.emit(`service${data.serviceNum}`, data);
        try {
            const users = await User.find({ _id: data.parentsId }, "fcm");
            console.log("try send= users", users.length);
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
                                    title: "سرویس شماره: " + data.serviceNum,
                                    body:
                                        data.data.state === 1
                                            ? "راننده به سمت شما می آید لطفا آماده باشید"
                                            : "راننده از مدرسه به سمت منازل شروع به حرکت کرد",
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
        } catch (e) {
            console.log("Error while startService on socket:", e);
        }
    });
    socket.on("sendIArrived", async (data) => {
        console.log(`iArrived${data.serviceNum}`);
        io.emit(`iArrived${data.serviceNum}`, data);
        // try {
        let driverAct = new DriverAct({
            driverCode: data.driverCode,
             location: { type: "Point", coordinates: [data.data.lat, data.data.lng] },
            model: data.data.state,
            serviceId: data.serviceNum,
            isWarning: true,
            studentId: data.data.studentCode,
            start: data.data.start,
        });
        driverAct.save();
        // } catch (e) {
        //     console.error("Error while iArrived on socket:", e);
        // }

        try {
            const user = await User.findOne({ _id: data.parentId }, "fcm");
            var registrationTokens = [];
            if (user) {
                for (var j in user.fcm) {
                    let registrationToken = user.fcm[j].token;
                    if (registrationToken.toString().length > 20) {
                        registrationTokens.push(registrationToken);
                    }
                }
            }
            console.log("registrationTokens", registrationTokens);
            if (registrationTokens.length === 0) return;
            // const message = {
            //     notification: {
            //         title: "سرویس شماره: " + data.serviceNum,
            //         body: "راننده رسید",
            //     },
            //     Payload: {
            //         sound: "alert",
            //     },
            //     android: {
            //         notification: {
            //             sound: "alert",
            //         },
            //     },
            //     tokens: registrationTokens,
            // };

          

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
                                    title: "سرویس شماره: " + data.serviceNum,
                                    body: "راننده رسید",
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
            // __admin
            //     .messaging()
            //     .sendMulticast(message)
            //     .then(function (response) {
            //         console.log(
            //             "successfully sent for sendIArrived on socket =",
            //             response,
            //         );
            //     })
            //     .catch(function (err) {
            //         console.log("Error on sendIArrived on socket:", err);
            //     });
        } catch (e) {
            console.log(`sss eeee=`, e);
        }
    });
    socket.on("sendIArrived2", async (data) => {
        console.log(`iArrived${data.serviceNum}`);
        io.emit(`iArrived${data.serviceNum}`, data);
        try {
            const user = await User.findOne({ _id: data.parentId }, "fcm");
            var registrationTokens = [];
            if (user) {
                for (var j in user.fcm) {
                    let registrationToken = user.fcm[j].token;
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
                                    title: "سرویس شماره: " + data.serviceNum,
                                    body: "راننده رسید",
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
            // __admin
            //     .messaging()
            //     .sendMulticast(message)
            //     .then(function (response) {
            //         console.log(
            //             "successfully sent for sendIArrived on socket =",
            //             response,
            //         );
            //     })
            //     .catch(function (err) {
            //         console.log("Error on sendIArrived on socket:", err);
            //     });
        } catch (e) {
            console.log(`sss eeee=`, e);
        }
    });
    socket.on("changeDriver", async (data) => {
        console.log(`serviceId${data.serviceId}`);
        io.emit(`changeDriver${data.serviceNum}`, data);
        const service = await Service.findById(data.serviceId, "student");
        if (service) {
            service.student.array.forEach(async (element) => {
                let student = await Student.findById(
                    element,
                    "name lastName parent"
                );
                if (student) {
                    const user = await User.findById(student.parent, "fcm");
                    var registrationTokens = [];
                    for (var j in user.fcm) {
                        let registrationToken = user.fcm[j].token;
                        if (registrationToken.toString().length > 20) {
                            registrationTokens.push(registrationToken);
                        }
                    }
                    if (registrationTokens.length > 0) {
                        // const message = {
                        //     notification: {
                        //         title: `راننده سرویس ${student.name} ${student.lastName} درتاریخ ${data.persianDate} در مسیر ${data.route} تغییر کرد!`,
                        //         body: "اطلاعات بیشتر در جزئیات سرویس در همان تاریخ ارسال میشود",
                        //     },
                        //     tokens: registrationTokens,
                        // };


                        const registrationTokensBatches = chunkArray(
                            registrationTokens,
                            30
                        );

                        const sendMessages = async () => {
                            const promises = registrationTokensBatches.map(
                                async (batch) => {
                                    const messages = batch.map(
                                        async (token) => {
                                            let message = {
                                                notification: {
                                                    title: `راننده سرویس ${student.name} ${student.lastName} درتاریخ ${data.persianDate} در مسیر ${data.route} تغییر کرد!`,
                                                    body: "اطلاعات بیشتر در جزئیات سرویس در همان تاریخ ارسال میشود",
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
                                                    console.log(
                                                        "error sent =",
                                                        err
                                                    );
                                                });
                                        }
                                    );
                                    await Promise.all(messages);
                                }
                            );
                            await Promise.all(promises);
                        };

                        await sendMessages();
                    }
                }
            });
        }
    });
    socket.on("sendNotif", async (data) => {
        console.log(`sendNotifUserId ${data.userId}`);
        if (data.driverId === undefined || data.driverId === "") {
            io.emit(`getNotif${data.driverId}`, {
                body: data.body,
                title: data.title,
                state: 0,
            });
        } else {
            io.emit(`getNotif${data.userId}`, {
                body: data.body,
                title: data.title,
                state: 0,
            });
        }

        try {
            let user = await User.findById(data.userId, "fcm delete");

            if (!user || user.delete) {
                io.emit(`getNotif${data.me}`, {
                    body: "کاربر پیدا نشد",
                    title: "پیام ارسال نشد",
                    state: 2,
                });
                return;
            }
            if (user.fcm.length > 0) {
                var registrationTokens = [];
                for (var j in user.fcm) {
                    let registrationToken = user.fcm[j].token;
                    if (registrationToken.toString().length > 20) {
                        registrationTokens.push(registrationToken);
                    }
                }
                console.log(
                    "registrationTokens.length",
                    registrationTokens.length
                );
                if (registrationTokens.length > 0) {
                    

                    const registrationTokensBatches = chunkArray(
                        registrationTokens,
                        30
                    );

                    const sendMessages = async () => {
                        const promises = registrationTokensBatches.map(
                            async (batch) => {
                                const messages = batch.map(async (token) => {
                                    let message = {
                                        notification: {
                                            title: data.title,
                                            body: data.body,
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

                    io.emit(`getNotif${data.me}`, {
                        body: `پیام به ${registrationTokens.length} دستگاه ارسال شده`,
                        title: "پیام ارسال شد",
                        state: 1,
                    });
                    return;
                }

                io.emit(`getNotif${data.me}`, {
                    body: "کاربر تا به حال ورود به اپ نداشته است",
                    title: "پیام ارسال نشد",
                    state: 2,
                });
                return;
            } else {
                io.emit(`getNotif${data.me}`, {
                    body: "کاربر تا به حال ورود به اپ نداشته است",
                    title: "پیام ارسال نشد",
                    state: 2,
                });
                return;
            }
        } catch (err) {
            console.error("Error while sedning notif on socket:", err);
        }
    });
});

const hostname = "127.0.0.1";
const port = process.env.PORT ?? 9000;
server.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
