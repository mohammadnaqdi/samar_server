const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};
module.exports = new (class extends controller {
    async modifyNotif(req, res) {
        try {
            const { confirm, rejectReason } = req.body;
            const notifID = req.query.notifID;

            if (!notifID) {
                return res.status(403).json({ error: "notifID needed." });
            }

            const notif = await this.Notification.findById(notifID);
            if (!notif) {
                return res
                    .status(404)
                    .json({ error: "Notification not found!" });
            }

            if (confirm === 2 && !rejectReason) {
                return res
                    .status(403)
                    .json({ error: "rejectReason shouldn't be null!" });
            }

            switch (confirm) {
                case true:
                    if (notif.state == 1) {
                        return res
                            .status(403)
                            .json({ error: "Already confirmed." });
                    }
                    notif.state = 1;
                    await notif.save();
                    return res
                        .status(200)
                        .json({ success: true, message: "submited." });
                case false:
                    notif.state = 2;
                    notif.rejectReason = rejectReason;
                    await notif.save();
                    return res
                        .status(200)
                        .json({ success: true, message: "rejected." });
            }
        } catch (error) {
            console.error("Error while submitting the notif:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getUnverifiedNotif(req, res) {
        try {
            const notifications = await this.Notification.find({
                state: 0,
            });

            return this.response({
                res,
                data: notifications,
            });
        } catch (error) {
            console.error(
                "Error while getting unverified notifications:",
                error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getNotif(req, res) {
        try {
            const {
                agencyIds = [],
                schoolIDs = [],
                role = "parent",
                studentCodes = [],
            } = req.body;

            const agencyObjects = agencyIds.map((id) =>
                ObjectId.createFromHexString(id)
            );

            const baseQuery = [
                {
                    $or: [
                        { agencyId: null },
                        { agencyId: { $in: agencyObjects } },
                    ],
                },
                { $or: [{ role: "all" }, { role }] },
                { $or: [{ schoolIDs: [] }, { schoolIDs: { $in: schoolIDs } }] },
                { confirmState: 1 },
            ];

            let [notifMsg, notifAds, notifWarn] = await Promise.all([
                this.Notification.find({
                    $and: [...baseQuery, { type: "msg" }],
                }).sort({ updatedAt: -1 }),
                this.Notification.find({
                    $and: [...baseQuery, { type: "ads" }],
                }).sort({ updatedAt: -1 }),
                this.Notification.find({
                    $and: [...baseQuery, { type: "warning" }],
                }).sort({ updatedAt: -1 }),
            ]);

            if (
                notifWarn.length > 0 &&
                agencyIds.length === studentCodes.length
            ) {
                let removeBed = true;
                let removeBes = true;

                for (const [n, agencyId] of agencyObjects.entries()) {
                    const result = await this.DocListSanad.aggregate([
                        {
                            $match: {
                                accCode: {
                                    $regex: new RegExp(
                                        `^.{6}${studentCodes[n]}$`
                                    ),
                                },
                                agencyId: agencyId,
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                total: {
                                    $sum: { $subtract: ["$bed", "$bes"] },
                                },
                            },
                        },
                    ]);

                    const remaining = result[0]?.total || 0;

                    if (remaining === 0) continue;

                    notifWarn.forEach((warn) => {
                        if (warn.spacialCheck === "bed" && remaining > 10000) {
                            removeBed = false;
                        }
                        if (warn.spacialCheck === "bes" && remaining < 10000) {
                            removeBes = false;
                        }
                    });
                }

                if (removeBed) {
                    notifWarn = notifWarn.filter(
                        (warn) => warn.spacialCheck !== "bed"
                    );
                }
                if (removeBes) {
                    notifWarn = notifWarn.filter(
                        (warn) => warn.spacialCheck !== "bes"
                    );
                }
            } else if (notifWarn.length > 0) {
                notifWarn = notifWarn.filter(
                    (warn) => warn.spacialCheck === "all"
                );
            }

            if (notifMsg.length > 0) {
                for (var i = 0; i < notifMsg.length; i++) {
                    // console.log("notifMsg[i].seen", notifMsg[i]);
                    const seen = await this.Seen.findOne({
                        notifID: notifMsg[i]._id,
                        userId: req.user._id,
                    });
                    if (seen) {
                        notifMsg.splice(i, 1);
                        i--;
                    }
                    // console.log("notifMsg[i].seen", notifMsg[i]);
                }
            }

            if (notifAds.length > 0) {
                for (var i in notifAds) {
                    const seen = await this.Seen.findOne({
                        notifID: notifAds[i]._id,
                        userId: req.user._id,
                    });
                    if (seen) {
                        notifAds[i].seen = true;
                    }
                }
            }

            return this.response({
                res,
                data: { notifWarn, notifAds, notifMsg },
            });
        } catch (error) {
            console.error("Error while getting notifications:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getNotifMsg(req, res) {
        try {
            const agencyIds = req.body.agencyIds || [];
            const schoolIDs = req.body.schoolIDs || [];
            const role = req.body.role || "parent";
            // const studentCodes = req.body.studentCodes || [];
            let agencyObjects = [];
            for (var ag of agencyIds) {
                agencyObjects.push(ObjectId.createFromHexString(ag));
            }
            var qrMsg = [];
            qrMsg.push({
                $or: [{ agencyId: null }, { agencyId: { $in: agencyObjects } }],
            });
            qrMsg.push({
                $or: [{ role: "all" }, { role }],
            });
            qrMsg.push({
                $or: [{ schoolIDs: [] }, { schoolIDs: { $in: schoolIDs } }],
            });
            qrMsg.push({ confirmState: 1 });
            qrMsg.push({ type: "msg" });
            // console.log("qrMsg", JSON.stringify(qrMsg));
            let notifMsg = await this.Notification.find({ $and: qrMsg }).sort({
                updatedAt: -1,
            });

            if (notifMsg.length > 0) {
                for (var i = 0; i < notifMsg.length; i++) {
                    const seen = await this.Seen.findOne({
                        notifID: notifMsg[i]._id,
                        userId: req.user._id,
                    });
                    if (seen) {
                        notifMsg[i].seen = true;
                    }
                }
            }

            return this.response({
                res,
                data: notifMsg,
            });
        } catch (error) {
            console.error("Error while getting notifications:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getNotifAgency(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const pageS = req.query.page || "0";
            const page = parseInt(pageS);
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const notifications = await this.Notification.find({
                agencyId,
            })
                .sort({ state: -1 })
                .skip(page * 20)
                .limit(20);

            return this.response({
                res,
                data: notifications,
            });
        } catch (error) {
            console.error("Error while getting notifications:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getNotifAdmin(req, res) {
        try {
            const pageS = req.query.page || "0";
            const page = parseInt(pageS);
            const notifications = await this.Notification.find({})
                .sort({ state: -1 })
                .skip(page * 20)
                .limit(20);

            return this.response({
                res,
                data: notifications,
            });
        } catch (error) {
            console.error("Error while getting notifications:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getLastNotif(req, res) {
        try {
            const agencyId = req.query.agencyId;
            const notif = await this.Notification.find({
                agencyId,
                state: 1,
            });

            return this.response({
                res,
                data: {
                    count: notif.length,
                    lastNotif: notif[notif.length - 1],
                },
            });
        } catch (error) {
            console.error("Error while getting last notification:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setNotifState(req, res) {
        try {
            if (
                req.query.id === undefined ||
                req.query.id.trim() === "" ||
                req.query.state === undefined ||
                req.query.state.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "id state need",
                });
            }
            const id = req.query.id;
            const rejectReason = req.query.rejectReason || "";
            const confirmState = parseInt(req.query.state);
            await this.Notification.findByIdAndUpdate(id, {
                confirmState,
                rejectReason,
            });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while getting last notification:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setNotif(req, res) {
        try {
            const { type, role, title, text } = req.body;
            const pic = req.body.pic || "";
            const link = req.body.link || "";
            let agencyId = req.body.agencyId || "";
            const id = req.body.id || "";
            const spacialCheck = req.body.spacialCheck || "";
            const schoolIDs = req.body.schoolIDs || [];

            if (agencyId.length < 10) {
                agencyId = null;
            }
            if (!(type === "ads" || type === "msg" || type === "warning")) {
                return this.response({
                    res,
                    code: 403,
                    message: "Invalid type",
                });
            }
            if (!(role === "parent" || role === "driver" || role === "all")) {
                return this.response({
                    res,
                    code: 403,
                    message: "role type",
                });
            }
            const setterId = req.user._id;

            if (id != "") {
                await this.Notification.findByIdAndUpdate(id, {
                    agencyId,
                    setterId,
                    type,
                    schoolIDs,
                    pic,
                    role,
                    title,
                    link,
                    text,
                    spacialCheck,
                    confirmState: 0,
                });
                return this.response({
                    res,
                    message: "Successfully update",
                    data: id,
                });
            }
            const newNotif = await new this.Notification({
                agencyId,
                setterId,
                type,
                schoolIDs,
                pic,
                role,
                title,
                link,
                text,
                spacialCheck,
            }).save();

            return this.response({
                res,
                message: "Successfully added",
                data: newNotif._id,
            });
        } catch (error) {
            console.error("Error while setting notification by admin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    // async sendNotifStudents(req, res) {
    //     try {
    //         const { type, role, title, text } = req.body;
    //         const pic = req.body.pic || "";
    //         const link = req.body.link || "";
    //         let agencyId = req.body.agencyId || "";
    //         const spacialCheck = req.body.spacialCheck || "";
    //         let schoolIDs = req.body.schoolIDs || [];

    //         if (agencyId.length < 10) {
    //             agencyId = null;
    //         }
    //         console.log("agencyId", agencyId);

    //         if (!(type === "ads" || type === "msg" || type === "warning")) {
    //             return this.response({
    //                 res,
    //                 code: 403,
    //                 message: "Invalid type",
    //             });
    //         }
    //         if (!(role === "parent" || role === "all")) {
    //             return this.response({
    //                 res,
    //                 code: 403,
    //                 message: "role Invalid ",
    //             });
    //         }
    //         if(agencyId!=null){
    //             const agency=await this.Agency.findById(agencyId,'schools');
    //             if(agency){
    //                 schoolIDs=agency.schools;
    //             }
    //         }
    //         let students;
    //         if(schoolIDs.length==0){
    //             students=await this.Student.find({delete:false,active:true},'parent studentCode');
    //         }else{
    //             students=await this.Student.find({delete:false,active:true,school:{$in:schoolIDs}},'parent studentCode');
    //         }
    //         console.log("students.length", students.length);
    //         if(!students || students.length===0){
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "not find any students",
    //             });
    //         }
    //         let parentIDs=[];
    //         for(var st of students){
    //             parentIDs.push(st.parent);
    //         }
    //         const fcms=await this.User.find({_id:{$in:parentIDs},fcm: { $ne: [] }},'fcm').distinct('fcm');
    //         console.log("fcms", fcms);
    //         var registrationTokens = [];
    //         for(var fcm of fcms){
    //                 if (fcm.token.toString().length>20){
    //                     registrationTokens.push(fcm.token);
    //                 }
    //         }
    //         console.log("registrationTokens.length", registrationTokens.length);
    //         if (registrationTokens != []) {
    //             for(var tk of registrationTokens){
    //                 const message = {
    //                     notification: {
    //                         title: title,
    //                         body: text,
    //                     },
    //                     token: tk,
    //                 };
    //                 if(pic.length>10){
    //                     // console.log("pic======",`https://${process.env.URL}/${pic}`);
    //                     message.android={
    //                         notification: {
    //                           imageUrl: `https://node.${process.env.URL}/${pic}`
    //                         }
    //                       };
    //                       message.apns= {
    //                         payload: {
    //                           aps: {
    //                             'mutable-content': 1
    //                           }
    //                         },
    //                         fcm_options: {
    //                           image: `https://node.${process.env.URL}/${pic}`
    //                         }
    //                       };
    //                       message.webpush= {
    //                         headers: {
    //                           image: `https://node.${process.env.URL}/${pic}`
    //                         }
    //                       }
    //                 }

    //                 __admin.messaging().send(message)
    //                     .then(function (response) {
    //                         console.log("successfully sent =", response);
    //                     })
    //                     .catch(function (err) {
    //                         console.error("Error sent =", err);
    //                     });
    //             }
    //             // const message = {
    //             //     notification: {
    //             //         title: title,
    //             //         body: text,
    //             //     },
    //             //     tokens: registrationTokens,
    //             // };

    //             // __admin
    //             //     .messaging()
    //             //     .sendMulticast(message)
    //             //     .then(function (response) {
    //             //         console.log(
    //             //             "sendMulticast in notif =",
    //             //             JSON.stringify(response),
    //             //         );

    //             //     })
    //             //     .catch(function (err) {
    //             //         console.log(
    //             //             "Error while changeDriver on socket:",
    //             //             err,
    //             //         );
    //             //     });
    //                 return this.response({
    //                     res,
    //                     message: "Successfully send",
    //                 });
    //         }else{
    //             return this.response({
    //                 res,
    //                 message: "not find any tokens",
    //             });
    //         }

    //     } catch (error) {
    //         console.error("Error while sending notification:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }
    async sendNotifStudent(req, res) {
        try {
            const { type, role, title, text } = req.body;
            const pic = req.body.pic || "";
            const link = req.body.link || "";
            let agencyId = req.body.agencyId || "";
            const spacialCheck = req.body.spacialCheck || "";
            let schoolIDs = req.body.schoolIDs || [];

            if (agencyId.length < 10) {
                agencyId = null;
            }

            if (!(type === "ads" || type === "msg" || type === "warning")) {
                return this.response({
                    res,
                    code: 403,
                    message: "Invalid type",
                });
            }
            if (!(role === "parent" || role === "all")) {
                return this.response({
                    res,
                    code: 403,
                    message: "role Invalid",
                });
            }

            if (agencyId != null) {
                schoolIDs = await this.School.find({ agencyId }).distinct(
                    "_id"
                );
            }

            let students;
            if (schoolIDs.length == 0) {
                students = await this.Student.find(
                    { delete: false, active: true },
                    "parent studentCode"
                );
            } else {
                students = await this.Student.find(
                    { delete: false, active: true, school: { $in: schoolIDs } },
                    "parent studentCode"
                );
            }

            if (!students || students.length === 0) {
                return this.response({
                    res,
                    code: 404,
                    message: "not find any students",
                });
            }

            let finalStudents = [];

            if (type === "warning" && spacialCheck != "all") {
                const studentCodes = students.map((st) => st.studentCode);

                const sanadResults = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            agencyId: ObjectId.createFromHexString(agencyId),
                            accCode: {
                                $regex: new RegExp(
                                    `^.{6}(${studentCodes.join("|")})`
                                ),
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$accCode",
                            total: {
                                $sum: {
                                    $subtract: ["$bed", "$bes"],
                                },
                            },
                        },
                    },
                ]);

                const remainingMap = sanadResults.reduce((acc, item) => {
                    const studentCode = item._id.substring(6);
                    acc[studentCode] = item.total;
                    return acc;
                }, {});

                finalStudents = students.filter((st) => {
                    const remaining = remainingMap[st.studentCode] || 0;
                    if (remaining === 0) return false;
                    if (spacialCheck === "bed") {
                        return remaining > 10000;
                    } else {
                        return remaining < 10000;
                    }
                });
            } else {
                finalStudents = students;
            }

            let parentIDs = [];
            for (var st of finalStudents) {
                parentIDs.push(st.parent);
            }
            console.log("students.length", students.length);
            const studentCodes = students.map((doc) =>
                doc.studentCode.toString()
            );
            console.log("studentCodes.length", studentCodes.length);

            const fcms = await this.Parent.find(
                { _id: { $in: parentIDs }, fcm: { $ne: [] } },
                "fcm"
            ).distinct("fcm");

            var registrationTokens = [];
            for (var fcm of fcms) {
                if (fcm.token.toString().length > 20) {
                    registrationTokens.push(fcm.token);
                }
            }

            console.log("registrationTokens.length", registrationTokens.length);

            if (registrationTokens.length > 0) {
                const registrationTokensBatches = chunkArray(
                    registrationTokens,
                    50
                );

                const sendMessages = async () => {
                    const promises = registrationTokensBatches.map(
                        async (batch) => {
                            const messages = batch.map((token) => {
                                let message = {
                                    notification: {
                                        title: title,
                                        body: text,
                                    },
                                    token: token,
                                };

                                if (pic.length > 10) {
                                    message = {
                                        ...message,
                                        android: {
                                            notification: {
                                                imageUrl: `https://node.${process.env.URL}/${pic}`,
                                            },
                                        },
                                        apns: {
                                            payload: {
                                                aps: {
                                                    "mutable-content": 1,
                                                },
                                            },
                                            fcm_options: {
                                                image: `https://node.${process.env.URL}/${pic}`,
                                            },
                                        },
                                        webpush: {
                                            headers: {
                                                image: `https://node.${process.env.URL}/${pic}`,
                                            },
                                        },
                                    };
                                }

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
                                            err.message
                                        );
                                    });
                            });

                            await Promise.all(messages);
                        }
                    );
                    await Promise.all(promises);
                };

                await sendMessages();

                return this.response({
                    res,
                    message: "Successfully sent notifications",
                    data: studentCodes,
                });
            } else {
                return this.response({
                    res,
                    message: "not find any tokens",
                    data: studentCodes,
                });
            }
        } catch (error) {
            console.error("Error while sending notification:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async seen(req, res) {
        try {
            const userId = req.user._id;
            const notifID = req.query.notifID;
            if (notifID.length < 10)
                return this.response({
                    res,
                    code: 403,
                    message: "notifID need",
                });
            const check = await this.Seen.findOne({
                notifID: ObjectId.createFromHexString(notifID),
                userId,
            });
            if (check) {
                return this.response({
                    res,
                    message: "ok but seen before",
                });
            }

            await new this.Seen({
                userId,
                notifID: ObjectId.createFromHexString(notifID),
            }).save();

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while seen:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
