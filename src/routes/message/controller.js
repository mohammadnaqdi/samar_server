const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const axios = require("axios");
const qs = require("qs");
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;

module.exports = new (class extends controller {
    async batchSend(req, res) {
        try {
            const { text, receivers } = req.body;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);

            const messageCode = await this.MessageCode.findOne({ code: "0" });
            const times = Math.ceil(text.length / 70);
            const price = parseInt(
                (messageCode.price * receivers.length * times).toString()
            );

            const agency = await this.Agency.findById(agencyId, "settings");
            const wallet = agency.settings.find(
                (obj) => obj.wallet != undefined
            ).wallet;

            const costCode = agency.settings.find(
                (obj) => obj.cost != undefined
            ).cost;
            if (!costCode || !wallet) {
                return this.response({
                    res,
                    code: 404,
                    message: "costCode || wallet not find",
                });
            }
            let mandeh = 0;
            const result = await this.DocListSanad.aggregate([
                {
                    $match: {
                        accCode: wallet,
                        agencyId: agencyId,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $subtract: ["$bed", "$bes"],
                            },
                        },
                    },
                },
            ]);
            mandeh = result[0]?.total || 0;
            if (price > mandeh) {
                return this.response({
                    res,
                    code: 205,
                    message: "The account balance is insufficient",
                });
            }
            // console.log("num", num);
            const desc = `هزینه ارسال ${receivers.length} عدد پیامک`;
            let doc = new this.DocSanad({
                agencyId,
                note: desc,
                sanadDate: new Date(),
                system: 3,
                definite: false,
                lock: true,
                editor: req.user._id,
            });
            await doc.save();
            await new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 1,
                bed: price,
                bes: 0,
                note: desc,
                accCode: costCode,
                peigiri: "",
                sanadDate: new Date(),
            }).save();
            await new this.DocListSanad({
                agencyId,
                titleId: doc.id,
                doclistId: doc.sanadId,
                row: 2,
                bed: 0,
                bes: price,
                note: desc,
                accCode: wallet,
                peigiri: "",
                sanadDate: new Date(),
            }).save();

            const postData = {
                UserName: amootUser,
                Password: amootPass,
                SendDateTime: getFormattedDateTime(new Date()),
                SMSMessageText: text,
                LineNumber: "service",
                Mobiles: receivers.join(","),
            };

            let config = {
                method: "post",
                url: messageCode.api,
                headers: {
                    Authorization: amoot_t,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data: postData,
            };
            await axios.request(config);
            // axios(config)
            //     .then(function (response) {
            //         // console.log(JSON.stringify(response.data));
            //     })
            //     .catch(function (error) {
            //         console.error("axios batchSend",error);
            //     });

            await new this.Messaging({
                agencyId,
                senderId: req.user._id,
                sender: req.user.userName,
                code: "0",
                to: receivers,
                params: [],
                type: 0,
                text,
                responseMessage: "",
                price,
                desc: "ارسال انبوه پیامک",
            }).save();
            return this.response({
                res,
                message: "",
            });
        } catch (error) {
            console.error("Error in batchSend:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setMessageCode(req, res) {
        try {
            const { id, code, text, title, price, active, api, params, type } =
                req.body;
            const date = req.body.date ?? new Date();

            if (id === "0") {
                let messageCode = new this.MessageCode({
                    code,
                    text,
                    title,
                    price,
                    active,
                    api,
                    params,
                    type,
                });
                await messageCode.save();
                return this.response({
                    res,
                    message: "new insert",
                    data: messageCode.id,
                });
            }

            await this.MessageCode.findByIdAndUpdate(id, {
                code,
                text,
                title,
                price,
                active,
                api,
                params,
            });

            return this.response({
                res,
                message: "update",
                data: id,
            });
        } catch (error) {
            console.error("Error in setMessageCode:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getMessageCode(req, res) {
        try {
            const messageCodes = await this.MessageCode.find();
            // var messages=[];
            // for(var ms of messageCodes){
            //   const messages=
            // }
            return this.response({
                res,
                data: messageCodes,
            });
        } catch (error) {
            console.error("Error in getMessageCode:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getMessaging(req, res) {
        try {
            const { startDate, untilDate } = req.query;
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
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const tests = await this.Messaging.find({
                to: { $size: 1 },
                agencyId,
            });
            let sum = tests.reduce((acc, doc) => acc + doc.price, 0);
            const lastDate = tests.length
                ? tests[tests.length - 1].createdAt
                : null;

            const testResp = {
                desc: "پیامک تستی",
                price: sum,
                lastMessageDate: lastDate,
                count: tests.length,
            };

            const dateFilter = {};
            if (startDate) {
                dateFilter.$gte = new Date(startDate);
            }
            if (untilDate) {
                dateFilter.$lte = new Date(untilDate);
            }

            if (!startDate && !untilDate) {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                dateFilter.$gte = oneMonthAgo;
            }

            const query = {
                agencyId,
                createdAt: dateFilter,
                to: { $not: { $size: 1 } },
            };

            const messageCodes = await this.Messaging.find(query, {
                params: 0,
                __v: 0,
            });

            return this.response({
                res,
                data: {
                    messages: messageCodes,
                    testSummary: testResp,
                },
            });
        } catch (error) {
            console.error("Error in getMessaging:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sendMessage(req, res) {
        try {
            const { code, type, sender, mobiles, params, desc } = req.body;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            // console.log("params", params);
            console.log("mobiles", mobiles);

            const messageCode = await this.MessageCode.findOne({
                code,
                active: true,
            });
            if (!messageCode) {
                return this.response({
                    res,
                    code: 404,
                    message: "messageCode not find or active",
                });
            }
            const needParam = messageCode.params.length > 0;
            if (needParam) {
                if (params.length != mobiles.length) {
                    return this.response({
                        res,
                        code: 214,
                        message: "params not correct with mobile",
                    });
                }
                if (messageCode.params.length != params[0].length) {
                    return this.response({
                        res,
                        code: 214,
                        message: "params not correct",
                    });
                }
            }

            if (code === "0") {
                return this.response({
                    res,
                    code: 216,
                    message: "send zero code with batchSend api",
                });
            }

            const price = parseInt(
                (messageCode.price * mobiles.length).toString()
            );
            if (mobiles.length > 1) {
                const agency = await this.Agency.findById(agencyId, "settings");
                const wallet = agency.settings.find(
                    (obj) => obj.wallet != undefined
                ).wallet;

                const costCode = agency.settings.find(
                    (obj) => obj.cost != undefined
                ).cost;
                if (!costCode || !wallet) {
                    return this.response({
                        res,
                        code: 404,
                        message: "costCode || wallet not find",
                    });
                }

                let mandeh = 0;
                const result = await this.DocListSanad.aggregate([
                    {
                        $match: {
                            accCode: wallet,
                            agencyId: agencyId,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: {
                                    $subtract: ["$bed", "$bes"],
                                },
                            },
                        },
                    },
                ]);
                mandeh = result[0]?.total || 0;
                if (price > mandeh) {
                    return this.response({
                        res,
                        code: 205,
                        message: "The account balance is insufficient",
                    });
                }

                const desc2 = `هزینه ارسال ${mobiles.length} عدد پیامک ${desc}`;
                let doc = new this.DocSanad({
                    agencyId,
                    note: desc2,
                    sanadDate: new Date(),
                    system: 3,
                    definite: false,
                    lock: true,
                    editor: req.user._id,
                });
                await doc.save();
                await new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: 1,
                    bed: price,
                    bes: 0,
                    note: desc2,
                    accCode: costCode,
                    peigiri: "",
                    sanadDate: new Date(),
                }).save();
                await new this.DocListSanad({
                    agencyId,
                    titleId: doc.id,
                    doclistId: doc.sanadId,
                    row: 2,
                    bed: 0,
                    bes: price,
                    note: desc2,
                    accCode: wallet,
                    peigiri: "",
                    sanadDate: new Date(),
                }).save();
            }

            for (let i = 0; i < mobiles.length; i++) {
                let Mobile = mobiles[i];
                let PatternValues = params[i];
                const value = PatternValues.join(",");

                let data = qs.stringify({
                    Mobile: Mobile,
                    number: Mobile,
                    PatternCodeID: messageCode.code,
                    messageId: messageCode.code,
                    PatternValues: value,
                    UserName: amootUser,
                    Password: amootPass,
                    serverid: 0,
                    vote: false,
                });

                // console.log("data", data);
                // console.log("amoot_t", amoot_t);

                let config = {
                    method: "post",
                    url: messageCode.api,
                    headers: {
                        Authorization: amoot_t,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data: data,
                };
                await axios.request(config);
                // axios(config)
                //     .then(function (response) {
                //         // console.log(JSON.stringify(response.data));
                //     })
                //     .catch(function (error) {
                //         console.error("axios sendMessage",error);
                //     });
            }

            await new this.Messaging({
                agencyId,
                senderId: req.user._id,
                sender,
                code,
                to: mobiles,
                params,
                type,
                text: messageCode.text,
                responseMessage: "",
                price: messageCode.price * mobiles.length,
                desc,
            }).save();
            return this.response({
                res,
                message: "send",
            });
            // let Token = '92BD6EB4052A26F2358763B76CC54A62597731C1';
            // let OptionalCode = code;
            // let Mobile = '09019891401';
            // let CodeLength = 4;

            // let data = qs.stringify({
            //     'Mobile': Mobile,
            //     'CodeLength': CodeLength,
            //     'OptionalCode': OptionalCode,
            // });

            // console.log("data",data);

            // let config = {
            //     method: 'post',
            //     url: 'https://portal.amootsms.com/rest/SendQuickOTP',
            //     headers: {
            //         'Authorization': Token,
            //         'Content-Type': 'application/x-www-form-urlencoded'
            //     },
            //     data: data
            // };

            // axios(config)
            // .then(function (response) {
            //     console.log('response',JSON.stringify(response.data));
            // })
            // .catch(function (error) {
            //     console.log('error',error);
            // });
        } catch (error) {
            console.error("Error in sendMessage:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async sendAvanakToService(req, res) {
        try {
            const studentList = req.body.studentList;
            if (!isWithinTimeRange) {
                return this.response({
                    res,
                    code: 400,
                    message: "Request is not allowen in this time range",
                });
            }
            const requests = studentList.map(async (id) => {
                const student = await this.Student.findById(
                    id,
                    "active delete avanak avanakNumber"
                );
                if (
                    student.active &&
                    !student.delete &&
                    student.avanak &&
                    student.avanakNumber.length > 6
                ) {
                    let data = qs.stringify({
                        number: student.avanakNumber,
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
            });

            await Promise.all(requests);

            return this.response({
                res,
                message: "send",
            });
        } catch (error) {
            console.error("Error in sendAvanakToService:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();

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
