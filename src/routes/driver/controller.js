const mongoose = require("mongoose");
const controller = require("../controller");
const ObjectId = mongoose.Types.ObjectId;
const config = require("config");
const { ConfirmCode } = require("../../models/otp");
// const Ghasedak = require("ghasedak");
// const ghasedak_c = process.env.GHASEDAK;
// let ghasedak = new Ghasedak(ghasedak_c);
const SMS_WAIT = config.get("sms_wait");
const axios = require("axios");
function getSecondsDiff(startDate, endDate) {
    const msInSecond = 1000;

    return Math.round(Math.abs(endDate - startDate) / msInSecond);
}
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;

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

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = new (class extends controller {
    //for we dont need to create a new object only export directly a class

    async deleteDriver(req, res) {
        const session = await this.Driver.startSession();
        session.startTransaction();

        try {
            const id = ObjectId.createFromHexString(req.query.id);
            const driver = await this.Driver.findById(id).session(session);

            if (!driver) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 404,
                    message: "Couldn't find driver",
                });
            }

            const service = await this.Service.findOne({
                driverId: id,
                delete: false,
            }).session(session);

            if (service) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 403,
                    message: "Driver is not allowed to be removed!",
                });
            }

            // Delete related documents
            await Promise.all([
                this.DriverAct.deleteMany({
                    driverCode: driver.driverCode,
                }).session(session),
                this.DriverChange.deleteMany({ driverId: driver._id }).session(
                    session
                ),
                this.StReport.deleteMany({ driverId: id }).session(session),
                this.RatingDriver.deleteMany({ driverId: id }).session(session),
                this.Car.findByIdAndDelete(driver.carId).session(session),
                this.ServicePack.deleteMany({ driverId: id }).session(session),
                this.DriverInfo.deleteMany({ driverId: id }).session(session),
            ]);

            // Delete docs from DocListSanad & DocSanad
            const doclist = await this.DocListSanad.find({
                accCode: "004006" + driver.driverCode,
            }).session(session);

            for (const doc of doclist) {
                await this.DocSanad.findByIdAndDelete(doc.titleId).session(
                    session
                );
                await this.DocListSanad.deleteMany({
                    titleId: doc.titleId,
                }).session(session);
            }

            // Delete check history and related check info
            const checkHis = await this.CheckHistory.find({
                $or: [
                    { toAccCode: "004006" + driver.driverCode },
                    { fromAccCode: "004006" + driver.driverCode },
                ],
            }).session(session);

            for (const check of checkHis) {
                await this.CheckInfo.findByIdAndDelete(check.infoId).session(
                    session
                );
                await this.CheckHistory.deleteMany({
                    infoId: check.infoId,
                }).session(session);
            }

            // Finally, delete the driver itself
            await this.Driver.findByIdAndDelete(driver.id).session(session);

            await session.commitTransaction();
            session.endSession();

            return this.response({
                res,
                message: "Successfully deleted.",
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error deleting driver:", error);
            return this.response({
                res,
                message: "An error occurred during deletion driver",
                code: 500,
            });
        }
    }

    async sendSMSRequest(req, res) {
        try {
            const phone = req.body.phone;
            const agencyId = req.body.agencyId;
            const agency = await this.Agency.findOne(
                {
                    $and: [
                        { delete: false },
                        { _id: agencyId },
                        {
                            $or: [
                                { admin: req.user._id },
                                { users: { $in: req.user._id } },
                            ],
                        },
                    ],
                },
                ""
            );
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "somthing wrong your agency is delete maybe",
                    data: {
                        fa_m: "خطایی پیش آمده ممکن است شرکت شما حذف شده باشد!",
                    },
                });
            }
            let user = await this.User.findOne({ phone, delete: false });
            if (!user) {
                return this.response({
                    res,
                    code: 221,
                    message: "this user is not exist",
                    data: {
                        fa_m: "این کاربر وجود ندارد",
                        name: user.name,
                        lastName: user.lastName,
                    },
                });
            }
            const driver = await this.Driver.findOne({ userId: user.id });
            // console.log("driver:", driver);

            if (!driver) {
                return this.response({
                    res,
                    code: 222,
                    message: "this driver is not exist",
                    data: {
                        fa_m: "این راننده وجود ندارد",
                        name: user.name,
                        lastName: user.lastName,
                    },
                });
            }
            const confirmCode = await ConfirmCode.findOne({
                agency: agency.code,
                phone,
            }).sort({
                _id: -1,
            });
            // console.log("ConfirmCode:", confirmCode);
            if (confirmCode) {
                const seconds = getSecondsDiff(
                    confirmCode.updatedAt,
                    Date.now()
                );
                if (seconds < SMS_WAIT) {
                    return this.response({
                        res,
                        code: 201,
                        message: "otp code sent, wait please",
                        data: {
                            second: seconds,
                            fa_m: "کد اعتبارسنجی فرستاده شده, لطفا صبر کنید",
                        },
                    });
                }
            }
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            // console.log("code:", code);

            try {
                console.log("codeIS=" + code);
                let PatternValues = [
                    `${user.name} ${user.lastName}`,
                    agency.name,
                    code,
                ];
                const value = PatternValues.join(",");
                const config = {
                    method: "get",
                    url: "https://portal.amootsms.com/rest/SendWithPattern",
                    params: {
                        Token: amoot_t,
                        Mobile: phone,
                        PatternCodeID: 2882,
                        PatternValues: value,
                    },
                };
                await axios.request(config);

                await this.FinnotechUsage.create({
                    agencyId,
                    type: "SMS",
                    price: 6039,
                    description: PatternValues.toString(),
                    mobiles: phone,
                });
            } catch (err) {
                console.log("cant sent sms!!!:", err);
            }
            new ConfirmCode({
                agency: agencyId,
                phone,
                code,
            }).save();
            return this.response({
                res,
                message: "otp code sent",
            });
        } catch (error) {
            console.error("Error while sendSMSRequest:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async checkRequestCode(req, res) {
        try {
            const phone = req.body.phone;
            const agencyId = req.body.agencyId;
            const code = req.body.code;
            console.log("code", code);
            console.log("phone", phone);
            // console.log("agencyId", agencyId);

            const confirmCode = await ConfirmCode.findOne({
                agency: agencyId,
                phone: phone,
                code: code,
            }).sort({
                _id: -1,
            });
            // console.log("confirmCode",confirmCode);
            if (confirmCode) {
                const seconds = getSecondsDiff(
                    confirmCode.updatedAt,
                    Date.now()
                );
                // console.log("seconds",seconds);
                if (seconds < SMS_WAIT) {
                    return this.response({
                        res,
                        message: "code is accept",
                    });
                }
                return this.response({
                    res,
                    code: 201,
                    message: "code is not accept now",
                });
            }
            return this.response({
                res,
                code: 202,
                message: "code is not accept",
            });
        } catch (error) {
            console.error("Error while checkREquestCode:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setEmptyDriver(req, res) {
        const session = await this.Driver.startSession();
        session.startTransaction();

        try {
            const { name, phone, lastName, capacity } = req.body;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            let userId = req.body.userId;

            // Validate agency
            const agency = await this.Agency.findOne(
                {
                    delete: false,
                    _id: agencyId,
                    $or: [
                        { admin: req.user._id },
                        { users: { $in: req.user._id } },
                    ],
                },
                "settings code"
            )
                .session(session)
                .lean();

            if (!agency) {
                await session.abortTransaction();
                session.endSession();
                return this.response({
                    res,
                    code: 404,
                    message: "Agency not found or deleted",
                    data: {
                        fa_m: "خطایی پیش آمده ممکن است شرکت شما حذف شده باشد!",
                    },
                });
            }

            let userCode = "";

            if (!userId || userId.trim() === "") {
                // Case: New User
                let existingUser = await this.User.findOne({ phone }).session(
                    session
                );
                if (existingUser) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 221,
                        message: "this user exists",
                        data: {
                            fa_m: "این کاربر وجود دارد",
                            name: existingUser.name,
                            lastName: existingUser.lastName,
                        },
                    });
                }

                const newUser = new this.User({
                    phone,
                    name,
                    lastName,
                    userName: phone,
                });

                await newUser.save({ session });
                userCode = newUser.code;
                userId = newUser._id;

                // ⚡ Updating Redis should be done **after commitTransaction**
                req._redisUpdate = {
                    key: `user:${newUser._id}`,
                    value: newUser,
                };
            } else {
                // Case: Existing User
                const drTest = await this.Driver.findOne({
                    agencyId: agency._id,
                    userId,
                }).session(session);

                if (drTest) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 222,
                        message: "this driver exists",
                        data: { fa_m: "این راننده وجود دارد" },
                    });
                }

                const updatedUser = await this.User.findByIdAndUpdate(
                    userId,
                    { name, lastName },
                    { new: true, session }
                );

                if (!updatedUser) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 404,
                        message: "User not found",
                    });
                }

                userCode = updatedUser.code;
                req._redisUpdate = {
                    key: `user:${userId}`,
                    value: { name, lastName },
                };
            }

            // Create Car
            const car = new this.Car({
                pelak: "0",
                capacity,
                drivers: [userId],
            });
            await car.save({ session });

            // Create Driver
            const driver = new this.Driver({
                userId,
                agencyId,
                carId: car._id,
                driverCode: agency.code + userCode,
            });
            await driver.save({ session });

            await session.commitTransaction();
            session.endSession();

            // ✅ Update Redis AFTER successful commit
            if (req._redisUpdate) {
                await this.updateRedisDocument(
                    req._redisUpdate.key,
                    req._redisUpdate.value
                );
            }

            return this.response({
                res,
                data: driver,
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error while setEmptyDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async duplicateDriver(req, res) {
        try {
            const phone = req.body.phone;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);

            const agency = await this.Agency.findOne(
                {
                    $and: [
                        { delete: false },
                        { _id: agencyId },
                        {
                            $or: [
                                { admin: req.user._id },
                                { users: { $in: req.user._id } },
                            ],
                        },
                    ],
                },
                "code"
            );
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "somthing wrong your agency is delete maybe",
                    data: {
                        fa_m: "خطایی پیش آمده ممکن است شرکت شما حذف شده باشد!",
                    },
                });
            }
            let kol = "004";
            let moeen = "006";

            if (agency.settings != undefined && agency.settings != null) {
                try {
                    kol = agency.settings.find((obj) => obj.type === 2).kol;
                    moeen = agency.settings.find((obj) => obj.type === 2).moeen;
                } catch {}
            }
            const user = await this.User.findOne({ phone });
            if (!user) {
                return this.response({
                    res,
                    code: 221,
                    message: "this user is not exist",
                    data: {
                        fa_m: "این کاربر وجود ندارد",
                        name: user.name,
                        lastName: user.lastName,
                    },
                });
            }
            const driver = await this.Driver.findOne({
                userId: user.id,
                delete: false,
            });
            if (!driver) {
                return this.response({
                    res,
                    code: 222,
                    message: "this driver is not exist",
                    data: {
                        fa_m: "این راننده وجود ندارد",
                        name: user.name,
                        lastName: user.lastName,
                    },
                });
            }

            // let driverCode = 100000001;
            // const lastLevelAccDet = await this.Driver.find({})
            //     .sort({ driverCode: -1 })
            //     .limit(1);
            // if (lastLevelAccDet.length > 0) {
            //     driverCode = parseInt(lastLevelAccDet[0].driverCode) + 1;
            // }

            let newDriver = new this.Driver({
                userId: user.id,
                agencyId,
                carId: driver.carId,
                driverCode: agency.code + user.code,
                pic: driver.pic,
                expireSh: driver.expireSh,
                clearancesPic: driver.clearancesPic,
                dLicencePic: driver.dLicencePic,
                carDocPic: driver.carDocPic,
            });
            await newDriver.save();
            let driverInfo = await this.DriverInfo.findOne({
                driverId: driver._id,
            });
            if (!driverInfo) {
                await new this.DriverInfo({
                    driverId: driver._id,
                }).save();
                await new this.DriverInfo({
                    driverId: newDriver._id,
                }).save();
            } else {
                delete driverInfo._id;
                driverInfo.driverId = newDriver._id;
                await this.DriverInfo.insertOne(driverInfo);
            }

            /////////////set level , sarfasl
            const car = await this.Car.findById(
                driver.carId,
                "carModel colorCar"
            );
            // let code = driverCode.toString();
            // let desc = "";
            // if (car) {
            //     desc = car.carModel + " " + car.colorCar;
            // }
            // code = pad(9, code, "0");
            // await new this.LevelAccDetail({
            //     agencyId,
            //     levelNo: 3,
            //     levelType: 2,
            //     accCode: code,
            //     accName: user.name + " " + user.lastName,
            //     desc,
            //     editor: req.user._id,
            // }).save();
            // await new this.ListAcc({
            //     agencyId,
            //     code: `${kol}${moeen}${code}`,
            //     codeLev1: kol,
            //     codeLev2: moeen,
            //     codeLev3: code,
            //     groupId: 1,
            //     type: 1,
            //     nature: 1,
            //     levelEnd: 3,
            //     canEdit: false,
            //     editor: req.user._id,
            // }).save();
            /////////////
            return this.response({
                res,
                data: newDriver,
            });
        } catch (error) {
            console.error("Error while duplicatedDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async updateEmptyDriver(req, res) {
        try {
            const id = req.body.id;
            let driver = await this.Driver.findById(id);
            if (!driver) {
                return this.response({
                    res,
                    code: 405,
                    message: "driver not find",
                    data: { fa_m: "راننده پیدا نشد!" },
                });
            }
            if (driver.delete) {
                return this.response({
                    res,
                    code: 405,
                    message: "driver is delete",
                    data: { fa_m: "راننده حذف شده است!" },
                });
            }
            let driverInfo = await this.DriverInfo.findOne({
                driverId: driver._id,
            });
            if (!driverInfo) {
                driverInfo = new this.DriverInfo({
                    driverId: driver._id,
                });
                await driverInfo.save();
            }
            let user = await this.User.findById(driver.userId);
            if (!user) {
                return this.response({
                    res,
                    code: 405,
                    message: "user not find",
                    data: { fa_m: "کاربر پیدا نشد!" },
                });
            }
            let car = await this.Car.findById(driver.carId);
            if (!car) {
                return this.response({
                    res,
                    code: 405,
                    message: "car not find",
                    data: { fa_m: "خودرو پیدا نشد!" },
                });
            }
            if (req.body.phone != undefined) {
                if (user.phone != req.body.phone) {
                    let userX = await this.User.findOne({
                        phone: req.body.phone,
                    });
                    if (!userX) {
                        userX = new this.User({
                            phone: req.body.phone,
                            userName: req.body.phone,
                            password: req.body.phone,
                            name: user.name,
                            lastName: user.lastName,
                        });
                        await userX.save();
                        await this.updateRedisDocument(
                            `user:${userX._id}`,
                            userX.toObject()
                        );
                    }
                    user = userX;
                    driver.userId = user.id;
                }
            }
            // console.log("req.body=",req.body);
            if (req.body.name != undefined) {
                user.name = req.body.name;
                const code = driver.driverCode.toString();
                await this.LevelAccDetail.findOneAndUpdate(
                    { accCode: code },
                    { accName: req.body.name + " " + user.lastName }
                );
            }
            if (req.body.lastName != undefined) {
                user.lastName = req.body.lastName;
                const code = driver.driverCode.toString();
                // await this.LevelAccDetail.findOneAndUpdate(
                //     { accCode: code },
                //     { accName: user.name + " " + req.body.lastName }
                // );
            }

            if (req.body.gender != undefined) {
                user.gender = req.body.gender;
            }
            if (req.body.colorCar != undefined) {
                car.colorCar = req.body.colorCar;
                const code = driver.driverCode.toString();
                let desc = "";
                if (car) {
                    desc = car.carModel + " " + req.body.colorCar;
                }
                // await this.LevelAccDetail.findOneAndUpdate(
                //     { accCode: code },
                //     { desc: desc }
                // );
            }
            if (req.body.pelak != undefined) {
                car.pelak = req.body.pelak;
            }
            if (req.body.capacity != undefined) {
                car.capacity = req.body.capacity;
            }
            if (req.body.carModel != undefined) {
                car.carModel = req.body.carModel;
                // const code = driver.driverCode.toString();
                // let desc = "";
                // if (car) {
                //     desc = req.body.carModel + " " + car.colorCar;
                // }
                // await this.LevelAccDetail.findOneAndUpdate(
                //     { accCode: code },
                //     { desc: desc }
                // );
            }
            if (req.body.year != undefined) {
                car.year = req.body.year;
            }
            if (req.body.capacity != undefined) {
                car.capacity = req.body.capacity;
            }
            if (req.body.drivingLicence != undefined) {
                driver.drivingLicence = req.body.drivingLicence;
            }
            if (req.body.serial != undefined) {
                driver.serial = req.body.serial;
            }
            if (req.body.pic != undefined) {
                if (driver.pic != req.body.pic) {
                    driver.confirmPic = 1; //
                }
                driver.pic = req.body.pic;
            }
            if (req.body.birthday != undefined) {
                driverInfo.birthday = req.body.birthday;
            }
            if (req.body.dLicencePic != undefined) {
                if (driverInfo.dLicencePic != req.body.dLicencePic) {
                    driverInfo.confirmDriverLcPic = 1;
                }
                driverInfo.dLicencePic = req.body.dLicencePic;
            }
            if (req.body.nationalCode != undefined) {
                driver.nationalCode = req.body.nationalCode;
            }
            if (req.body.card != undefined) {
                driver.card = req.body.card;
            }
            if (req.body.hesab != undefined) {
                driver.hesab = req.body.hesab;
            }
            if (req.body.shaba != undefined) {
                driver.shaba = req.body.shaba;
            }
            if (req.body.clearancesPic != undefined) {
                if (driverInfo.clearancesPic != req.body.clearancesPic) {
                    driverInfo.confirmClearPic = 1;
                }
                driverInfo.clearancesPic = req.body.clearancesPic;
            }
            if (req.body.technicalDiagPic != undefined) {
                if (driverInfo.technicalDiagPic != req.body.technicalDiagPic) {
                    driverInfo.confirmTechincalPic = 1;
                }
                driverInfo.technicalDiagPic = req.body.technicalDiagPic;
            }
            if (req.body.healthPic != undefined) {
                if (driverInfo.healthPic != req.body.healthPic) {
                    driverInfo.confirmHealthPic = 1;
                }
                driverInfo.healthPic = req.body.healthPic;
            }
            if (req.body.carDocPic != undefined) {
                if (driverInfo.carDocPic != req.body.carDocPic) {
                    driverInfo.confirmcarDocPic = 1;
                }
                driverInfo.carDocPic = req.body.carDocPic;
            }
            if (req.body.insPic != undefined) {
                if (driverInfo.insPic != req.body.insPic) {
                    driverInfo.confirmInsPic = 1;
                }
                driverInfo.insPic = req.body.insPic;
            }
            if (req.body.backCarDocPic != undefined) {
                if (driverInfo.backCarDocPic != req.body.backCarDocPic) {
                    driverInfo.confirmBackCarDocPic = 1;
                }
                driverInfo.backCarDocPic = req.body.backCarDocPic;
            }
            if (req.body.dLicenceBackPic != undefined) {
                if (driverInfo.dLicenceBackPic != req.body.dLicenceBackPic) {
                    driverInfo.confirmDriverLcBackPic = 1;
                }
                driverInfo.dLicenceBackPic = req.body.dLicenceBackPic;
            }
            if (req.body.taxiDriverLicense != undefined) {
                driverInfo.taxiDriverLicense = req.body.taxiDriverLicense;
            }
            if (req.body.expireSh != undefined) {
                driverInfo.expireSh = req.body.expireSh;
            }
            if (req.body.isDriverCarOwner != undefined) {
                driverInfo.isDriverCarOwner = req.body.isDriverCarOwner;
            }
            await user.save();
            await this.updateRedisDocument(`user:${user._id}`, user);
            await car.save();
            await driver.save();
            await driverInfo.save();

            let sevices = await this.Service.find({ driverId: driver.id });
            sevices.forEach(async (ser) => {
                ser.driverPic = driver.pic;
                ser.driverName = user.name + " " + user.lastName;
                ser.driverCar = car.carModel + " " + car.colorCar;
                ser.driverCarPelak = car.pelak;
                ser.driverPhone = user.phone;
                await ser.save();
            });
            // console.log('ddddddddd');
            return this.response({
                res,
                data: driver,
            });
        } catch (error) {
            console.error("Error while updateEmptyDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async updateConfirmDriver(req, res) {
        try {
            const id = req.body.id;
            let driver = await this.Driver.findById(id);
            if (!driver) {
                return this.response({
                    res,
                    code: 405,
                    message: "driver not find",
                    data: { fa_m: "راننده پیدا نشد!" },
                });
            }
            if (driver.delete) {
                return this.response({
                    res,
                    code: 405,
                    message: "driver is delete",
                    data: { fa_m: "راننده حذف شده است!" },
                });
            }
            let driverInfo = await this.DriverInfo.findOne({
                driverId: driver._id,
            });
            if (!driverInfo) {
                driverInfo = new this.DriverInfo({
                    driverId: driver._id,
                });
                await driverInfo.save();
            }

            if (req.body.confirmPic != undefined) {
                driver.confirmPic = req.body.confirmPic;
            }
            if (req.body.confirmHealthPic != undefined) {
                driverInfo.confirmHealthPic = req.body.confirmHealthPic;
            }
            if (req.body.confirmTechincalPic != undefined) {
                driverInfo.confirmTechincalPic = req.body.confirmTechincalPic;
            }
            if (req.body.confirmcarDocPic != undefined) {
                driverInfo.confirmcarDocPic = req.body.confirmcarDocPic;
            }
            if (req.body.isDriverCarOwner != undefined) {
                driverInfo.isDriverCarOwner = req.body.isDriverCarOwner;
            }
            if (req.body.confirmClearPic != undefined) {
                driverInfo.confirmClearPic = req.body.confirmClearPic;
            }
            if (req.body.confirmDriverLcPic != undefined) {
                driverInfo.confirmDriverLcPic = req.body.confirmDriverLcPic;
            }
            if (req.body.confirmInsPic != undefined) {
                driverInfo.confirmInsPic = req.body.confirmInsPic;
            }
            if (req.body.confirmBackCarDocPic != undefined) {
                driverInfo.confirmBackCarDocPic = req.body.confirmBackCarDocPic;
            }
            if (req.body.confirmcarDocPic != undefined) {
                driverInfo.confirmcarDocPic = req.body.confirmcarDocPic;
            }
            if (req.body.confirmDriverLcBackPic != undefined) {
                driverInfo.confirmDriverLcBackPic =
                    req.body.confirmDriverLcBackPic;
            }
            if (req.body.isDriverCarOwner != undefined) {
                driverInfo.isDriverCarOwner = req.body.isDriverCarOwner;
            }

            if (req.body.active != undefined) {
                driver.active = req.body.active;
            }

            await driver.save();
            await driverInfo.save();

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while updateConfirmDriver:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverList(req, res) {
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
            let onlyActive = false;
            if (
                req.query.onlyActive != undefined &&
                req.query.onlyActive === "true"
            ) {
                onlyActive = true;
            }
            let checkConfirm = false;
            if (
                req.query.checkConfirm != undefined &&
                req.query.checkConfirm === "true"
            ) {
                checkConfirm = true;
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const agency = await this.Agency.findOne({
                _id: agencyId,
                delete: false,
            });
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "your agency is delete maybe",
                    data: { fa_m: "احتمالا شرکت شما حذف شده است" },
                });
            }

            var qr = [];
            qr.push({ delete: false });
            qr.push({ agencyId });
            if (onlyActive) {
                qr.push({ active: true });
            }
            if (checkConfirm) {
                qr.push({
                    pic: { $regex: /.+/ },
                });
                qr.push({
                    drivingLicence: { $regex: /.+/ },
                });
                // qr.push({
                //     dLicencePic: { $regex: /.+/ },
                // });
            }

            let drivers = await this.Driver.find({ $and: qr });

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );
                const car = await this.Car.findById(
                    drivers[i].carId,
                    "pelak colorCar carModel capacity year"
                );
                let services = await this.Service.find(
                    { driverId: drivers[i].id, active: true, delete: false },
                    "driverSharing serviceNum"
                );
                if (!car || !user) continue;

                // const ratings = await this.RatingDriver.find(
                //   { driverId: drivers[i].id },
                //   "point"
                // ).sort({ _id: -1 });
                let driverId = drivers[i].id;
                //for grouping _ find last evey user rate for one driver
                const ratin = await this.RatingDriver.aggregate([
                    {
                        $match: {
                            driverId: ObjectId.createFromHexString(driverId),
                        },
                    },
                    { $project: { point: 1, userId: 1 } },
                    { $sort: { _id: -1 } },
                    {
                        $group: {
                            _id: "$userId",
                            latest: { $first: "$$ROOT" },
                        },
                    },
                ]);
                // console.log("ratin", JSON.stringify(ratin));
                let point = 0;

                if (ratin) {
                    if (ratin.length > 0) {
                        let sum = 0;
                        for (var n in ratin) {
                            sum += ratin[n].latest.point;
                        }
                        point = sum / ratin.length;
                    }
                }
                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                    };
                }
                if (car) {
                    drivers[i].moreData.pelak = car.pelak;
                    drivers[i].moreData.colorCar = car.colorCar;
                    drivers[i].moreData.carModel = car.carModel;
                    drivers[i].moreData.capacity = car.capacity ?? 0;
                    drivers[i].moreData.year = car.year;
                }
                drivers[i].moreData.point = point;
                drivers[i].moreData.services = services;
                delete drivers[i].carId;
                delete drivers[i].userId;
                delete drivers[i].agencyId;
                delete drivers[i].__v;

                let driverInfo = await this.DriverInfo.findOne({
                    driverId: drivers[i]._id,
                });
                if (!driverInfo) {
                    driverInfo = new this.DriverInfo({
                        driverId: drivers[i]._id,
                    });
                    await driverInfo.save();
                } else {
                    drivers[i].location = driverInfo.location;
                    drivers[i].address = driverInfo.address;
                    drivers[i].birthday = driverInfo.birthday;
                    drivers[i].expireSh = driverInfo.expireSh;
                    drivers[i].healthPic = driverInfo.healthPic;
                    drivers[i].confirmHealthPic = driverInfo.confirmHealthPic;
                    drivers[i].technicalDiagPic = driverInfo.technicalDiagPic;
                    drivers[i].confirmTechincalPic =
                        driverInfo.confirmTechincalPic;
                    drivers[i].clearancesPic = driverInfo.clearancesPic;
                    drivers[i].confirmClearPic = driverInfo.confirmClearPic;
                    drivers[i].dLicencePic = driverInfo.dLicencePic;
                    drivers[i].confirmDriverLcPic =
                        driverInfo.confirmDriverLcPic;
                    drivers[i].dLicenceBackPic = driverInfo.dLicenceBackPic;
                    drivers[i].confirmDriverLcBackPic =
                        driverInfo.confirmDriverLcBackPic;
                    drivers[i].carDocPic = driverInfo.carDocPic;
                    drivers[i].confirmcarDocPic = driverInfo.confirmcarDocPic;
                    drivers[i].backCarDocPic = driverInfo.backCarDocPic;
                    drivers[i].confirmBackCarDocPic =
                        driverInfo.confirmBackCarDocPic;
                    drivers[i].taxiDriverLicense = driverInfo.taxiDriverLicense;
                    drivers[i].insPic = driverInfo.insPic;
                    drivers[i].confirmInsPic = driverInfo.confirmInsPic;
                    drivers[i].isDriverCarOwner = driverInfo.isDriverCarOwner;
                }
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while driverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverList3(req, res) {
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
            let onlyActive = false;
            if (
                req.query.onlyActive != undefined &&
                req.query.onlyActive === "true"
            ) {
                onlyActive = true;
            }
            let checkConfirm = false;
            if (
                req.query.checkConfirm != undefined &&
                req.query.checkConfirm === "true"
            ) {
                checkConfirm = true;
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            var qr = [];
            qr.push({ delete: false });
            qr.push({ agencyId });
            if (onlyActive) {
                qr.push({ active: true });
            }
            if (checkConfirm) {
                qr.push({
                    pic: { $regex: /.+/ },
                });
                qr.push({
                    drivingLicence: { $regex: /.+/ },
                });
                // qr.push({
                //     dLicencePic: { $regex: /.+/ },
                // });
            }

            let drivers = await this.Driver.aggregate([
                { $match: { $and: qr } },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "user",
                        pipeline: [
                            { $project: { phone: 1, name: 1, lastName: 1 } },
                        ],
                    },
                },
                { $unwind: "$user" },
                {
                    $lookup: {
                        from: "cars",
                        localField: "carId",
                        foreignField: "_id",
                        as: "car",
                        pipeline: [
                            {
                                $project: {
                                    pelak: 1,
                                    colorCar: 1,
                                    carModel: 1,
                                    capacity: 1,
                                },
                            },
                        ],
                    },
                },
                { $unwind: "$car" },
                {
                    $lookup: {
                        from: "services",
                        let: { driverId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$driverId", "$$driverId"] },
                                    active: true,
                                    delete: false,
                                },
                            },
                            { $count: "count" },
                        ],
                        as: "services",
                    },
                },
                {
                    $addFields: {
                        services: {
                            $ifNull: [
                                { $arrayElemAt: ["$services.count", 0] },
                                0,
                            ],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "students",
                        let: { driverCode: "$driverCode" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$driverCode", "$$driverCode"],
                                    },
                                    state: 4,
                                    delete: false,
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    schoolIds: { $addToSet: "$school" },
                                },
                            },
                        ],
                        as: "studentSchools",
                    },
                },
                {
                    $addFields: {
                        schoolIds: {
                            $ifNull: [
                                {
                                    $arrayElemAt: [
                                        "$studentSchools.schoolIds",
                                        0,
                                    ],
                                },
                                [],
                            ],
                        },
                    },
                },
                {
                    $project: {
                        birthday: 0,
                        updatedAt: 0,
                        createdAt: 0,
                        serial: 0,
                        nationalCode: 0,
                        active: 0,
                        delete: 0,
                        isDriverCarOwner: 0,
                        confirmPic: 0,
                        healthPic: 0,
                        confirmHealthPic: 0,
                        technicalDiagPic: 0,
                        confirmTechincalPic: 0,
                        clearancesPic: 0,
                        confirmClearPic: 0,
                        dLicencePic: 0,
                        carDocPic: 0,
                        confirmDriverLcPic: 0,
                        confirmcarDocPic: 0,
                        isAgent: 0,
                        carDocPic: 0,
                        carDocPic: 0,
                        location: 0,
                        carId: 0,
                        userId: 0,
                        agencyId: 0,
                        __v: 0,
                        studentSchools: 0,
                    },
                },
            ]);

            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while driverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverListPage(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.page === undefined ||
                req.query.page.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId page need",
                });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            let page = parseInt(req.query.page);
            if (page < 0) page = 0;

            var qr = [];
            qr.push({ delete: false });
            qr.push({ agencyId });

            let drivers = await this.Driver.find({ $and: qr })
                .skip(page * 25)
                .limit(25);

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender fcm.device"
                );
                const car = await this.Car.findById(
                    drivers[i].carId,
                    "pelak colorCar carModel capacity year"
                );
                if (!car || !user) continue;
                let services = await this.Service.find(
                    { driverId: drivers[i].id, active: true, delete: false },
                    "driverSharing serviceNum"
                );

                // const ratings = await this.RatingDriver.find(
                //   { driverId: drivers[i].id },
                //   "point"
                // ).sort({ _id: -1 });
                let driverId = drivers[i].id;
                //for grouping _ find last evey user rate for one driver
                const ratin = await this.RatingDriver.aggregate([
                    {
                        $match: {
                            driverId: ObjectId.createFromHexString(driverId),
                        },
                    },
                    { $project: { point: 1, userId: 1 } },
                    { $sort: { _id: -1 } },
                    {
                        $group: {
                            _id: "$userId",
                            latest: { $first: "$$ROOT" },
                        },
                    },
                ]);
                // console.log("ratin", JSON.stringify(ratin));
                let point = 0;

                if (ratin) {
                    if (ratin.length > 0) {
                        let sum = 0;
                        for (var n in ratin) {
                            sum += ratin[n].latest.point;
                        }
                        point = sum / ratin.length;
                    }
                }
                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                        device: user.fcm.device,
                    };
                }
                if (car) {
                    drivers[i].moreData.pelak = car.pelak;
                    drivers[i].moreData.colorCar = car.colorCar;
                    drivers[i].moreData.carModel = car.carModel;
                    drivers[i].moreData.capacity = car.capacity ?? 0;
                    drivers[i].moreData.year = car.year;
                }
                drivers[i].moreData.point = point;
                drivers[i].moreData.services = services;
                delete drivers[i].carId;
                delete drivers[i].userId;
                delete drivers[i].agencyId;
                delete drivers[i].__v;

                let driverInfo = await this.DriverInfo.findOne({
                    driverId: drivers[i]._id,
                });
                if (!driverInfo) {
                    driverInfo = new this.DriverInfo({
                        driverId: drivers[i]._id,
                    });
                    await driverInfo.save();
                }

                drivers[i].moreData.driverInfo = driverInfo;
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error whiledriverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverListSearch(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.search === undefined ||
                req.query.search.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId search need",
                });
            }
            let search = req.query.search;
            search = search.trim();

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);

            var qr = [];
            qr.push({ delete: false });
            qr.push({ agencyId });

            const userIds = await this.Driver.find(
                { $and: qr },
                "userId"
            ).distinct("userId");
            var qr = [];
            qr.push({ _id: { $in: userIds } });
            qr.push({ delete: false });

            qr.push({
                $or: [
                    { phone: { $regex: ".*" + escapeRegExp(search) + ".*" } },
                    { name: { $regex: ".*" + escapeRegExp(search) + ".*" } },
                    {
                        lastName: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                ],
            });

            const users = await this.User.find({ $and: qr }).distinct("_id");

            let drivers = await this.Driver.find({
                agencyId,
                delete: false,
                userId: { $in: users },
            });

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );
                const car = await this.Car.findById(
                    drivers[i].carId,
                    "pelak colorCar carModel capacity year"
                );
                if (!car || !user) continue;
                let services = await this.Service.find(
                    { driverId: drivers[i].id, active: true, delete: false },
                    "driverSharing serviceNum"
                );

                // const ratings = await this.RatingDriver.find(
                //   { driverId: drivers[i].id },
                //   "point"
                // ).sort({ _id: -1 });
                let driverId = drivers[i].id;
                //for grouping _ find last evey user rate for one driver
                const ratin = await this.RatingDriver.aggregate([
                    {
                        $match: {
                            driverId: ObjectId.createFromHexString(driverId),
                        },
                    },
                    { $project: { point: 1, userId: 1 } },
                    { $sort: { _id: -1 } },
                    {
                        $group: {
                            _id: "$userId",
                            latest: { $first: "$$ROOT" },
                        },
                    },
                ]);
                // console.log("ratin", JSON.stringify(ratin));
                let point = 0;

                if (ratin) {
                    if (ratin.length > 0) {
                        let sum = 0;
                        for (var n in ratin) {
                            sum += ratin[n].latest.point;
                        }
                        point = sum / ratin.length;
                    }
                }
                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                    };
                }
                if (car) {
                    drivers[i].moreData.pelak = car.pelak;
                    drivers[i].moreData.colorCar = car.colorCar;
                    drivers[i].moreData.carModel = car.carModel;
                    drivers[i].moreData.capacity = car.capacity ?? 0;
                    drivers[i].moreData.year = car.year;
                }
                drivers[i].moreData.point = point;
                drivers[i].moreData.services = services;
                delete drivers[i].carId;
                delete drivers[i].userId;
                delete drivers[i].agencyId;
                delete drivers[i].__v;
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error whiledriverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverList2(req, res) {
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
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            var qr = [];
            qr.push({ delete: false });
            qr.push({ active: true });
            qr.push({ agencyId });

            let drivers = await this.Driver.find(
                { $and: qr },
                "userId carId driverCode pic isAgent"
            );

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );
                const car = await this.Car.findById(
                    drivers[i].carId,
                    "pelak colorCar carModel capacity year"
                );

                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                    };
                }
                if (car) {
                    drivers[i].moreData.pelak = car.pelak;
                    drivers[i].moreData.colorCar = car.colorCar;
                    drivers[i].moreData.carModel = car.carModel;
                    drivers[i].moreData.capacity = car.capacity ?? 0;
                    drivers[i].moreData.year = car.year;
                }
                delete drivers[i].carId;
                delete drivers[i].userId;
                delete drivers[i].agencyId;
                delete drivers[i].__v;
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while driverList2:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverById(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }

            const id = req.query.id;
            if (!mongoose.isValidObjectId(id)) {
                return this.response({
                    res,
                    code: 221,
                    message: "id is objectId!",
                });
            }

            let driver = await this.Driver.findById(id);
            if (!driver) {
                return this.response({
                    res,
                    code: 504,
                    message: "driver not find",
                });
            }
            // console.log(JSON.stringify(students[i]));
            const user = await this.User.findById(
                driver.userId,
                "phone name lastName gender"
            );
            const car = await this.Car.findById(
                driver.carId,
                "pelak colorCar carModel capacity"
            );
            let services = await this.Service.find(
                { driverId: driver.id, active: true, delete: false },
                "driverSharing serviceNum"
            );

            // const ratings = await this.RatingDriver.find(
            //   { driverId: driver.id },
            //   "point"
            // ).sort({ _id: -1 });
            let driverId = driver.id;
            //for grouping _ find last evey user rate for one driver
            const ratin = await this.RatingDriver.aggregate([
                {
                    $match: {
                        driverId: ObjectId.createFromHexString(driverId),
                    },
                },
                { $project: { point: 1, userId: 1 } },
                { $sort: { _id: -1 } },
                { $group: { _id: "$userId", latest: { $first: "$$ROOT" } } },
            ]);
            // console.log("ratin", JSON.stringify(ratin));
            let point = 0;

            if (ratin) {
                if (ratin.length > 0) {
                    let sum = 0;
                    for (var n in ratin) {
                        sum += ratin[n].latest.point;
                    }
                    point = sum / ratin.length;
                }
            }
            if (user) {
                driver.moreData = {
                    phone: user.phone,
                    name: user.name,
                    lastName: user.lastName,
                    gender: user.gender,
                };
            }
            if (car) {
                driver.moreData.pelak = car.pelak;
                driver.moreData.colorCar = car.colorCar;
                driver.moreData.carModel = car.carModel;
                driver.moreData.capacity = car.capacity ?? 0;
            }
            driver.moreData.point = point;
            driver.moreData.services = services;
            delete driver.carId;
            delete driver.userId;
            delete driver.agencyId;
            delete driver.__v;

            return this.response({
                res,
                data: driver,
            });
        } catch (error) {
            console.error("Error while driverById:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverByUserId(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }
            const userId = req.query.id;

            let drivers = await this.Driver.find(
                { userId, delete: false },
                "carId agencyId pic active driverCode moreData isAgent"
            );

            for (var d in drivers) {
                const car = await this.Car.findById(
                    drivers[d].carId,
                    "pelak colorCar carModel capacity"
                );
                const agency = await this.Agency.findById(
                    drivers[d].agencyId,
                    "name code"
                );
                const services = await this.Service.countDocuments({
                    driverId: drivers[d].id,
                    delete: false,
                    active: true,
                });

                if (car) {
                    drivers[d].moreData.pelak = car.pelak;
                    drivers[d].moreData.colorCar = car.colorCar;
                    drivers[d].moreData.carModel = car.carModel;
                    drivers[d].moreData.capacity = car.capacity ?? 0;
                }
                if (agency) {
                    drivers[d].moreData.agencyName = agency.name;
                    drivers[d].moreData.agencyCode = agency.code;
                } else {
                    drivers[d].moreData.agencyName = "";
                    drivers[d].moreData.agencyCode = "";
                }
                drivers[d].moreData.services = services;
            }

            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while driverByUserId:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driversByUserIds(req, res) {
        try {
            const ids = req.body.ids;
            // console.log("ids", ids);

            let drivers = await this.Driver.find(
                { $and: [{ _id: { $in: ids } }, { delete: false }] },
                "userId carId pic active driverCode moreData"
            );

            for (var d in drivers) {
                const user = await this.User.findById(
                    drivers[d].userId,
                    "phone name lastName gender"
                );
                const car = await this.Car.findById(
                    drivers[d].carId,
                    "pelak colorCar carModel capacity"
                );
                const services = await this.Service.countDocuments({
                    driverId: drivers[d].id,
                    delete: false,
                    active: true,
                });

                if (car) {
                    drivers[d].moreData.pelak = car.pelak;
                    drivers[d].moreData.colorCar = car.colorCar;
                    drivers[d].moreData.carModel = car.carModel;
                    drivers[d].moreData.capacity = car.capacity ?? 0;
                }
                if (user) {
                    drivers[d].moreData.phone = user.phone;
                    drivers[d].moreData.name = user.name;
                    drivers[d].moreData.lastName = user.lastName;
                    drivers[d].moreData.gender = user.gender;
                }

                drivers[d].moreData.services = services;
            }

            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while driversbyIds:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async countAndCheckCompanyByUserId(req, res) {
        try {
            if (
                req.query.id === undefined ||
                req.query.id.trim() === "" ||
                req.query.agencyId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "id and agencyId need",
                });
            }
            const userId = ObjectId.createFromHexString(req.query.id);
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);

            const drivers = await this.Driver.countDocuments({
                delete: false,
                userId,
            });
            const checkInCompany = await this.Driver.countDocuments({
                delete: false,
                userId,
                agencyId,
            });

            return this.response({
                res,
                data: {
                    companyCount: drivers,
                    isInThisCompany: checkInCompany > 0,
                },
            });
        } catch (error) {
            console.error("Error while countAndCheckCompanyByUserId:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverListSimple(req, res) {
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
            const agencyId = req.query.agencyId;
            var qr = [];
            qr.push({ delete: false });
            qr.push({ active: true });
            qr.push({ agencyId });

            let drivers = await this.Driver.find(
                { $and: qr },
                "userId driverCode pic moreData"
            );

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );

                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                    };
                }
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while driverListSimple:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverListService(req, res) {
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
            const agencyId = req.query.agencyId;
            var qr = [];
            qr.push({ delete: false });
            qr.push({ active: true });
            qr.push({ agencyId });

            let drivers = await this.Driver.find(
                { $and: qr },
                "userId carId driverCode pic moreData"
            );

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));

                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );
                if (user) {
                    drivers[i].moreData.phone = user.phone;
                    drivers[i].moreData.name = user.name;
                    drivers[i].moreData.lastName = user.lastName;
                    drivers[i].moreData.gender = user.gender;
                }

                const driverAct = await this.DriverAct.findOne({
                    driverCode: drivers[i].driverCode,
                }).sort({ _id: -1 });
                drivers[i].moreData.driverAct = driverAct;

                const car = await this.Car.findById(
                    drivers[i].carId,
                    "pelak colorCar carModel capacity "
                );
                drivers[i].moreData.car = car;
                const services = await this.Service.find(
                    { driverId: drivers[i].id, active: true, delete: false },
                    "driverSharing serviceNum distance routeSave schoolId time"
                );
                let serviceStates = [];
                for (var service of services) {
                    const act = await this.DriverAct.findOne({
                        serviceId: service.serviceNum,
                    }).sort({ _id: -1 });
                    const school = await this.School.findById(
                        service.schoolIds[0],
                        "name schoolTime location.coordinates"
                    );
                    serviceStates.push({
                        service: service,
                        act: act,
                        school: school,
                    });
                }
                drivers[i].moreData.serviceStates = serviceStates;
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while 00001:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async lastActServices(req, res) {
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
            const agencyId = req.query.agencyId;
            var qr = [];
            qr.push({ delete: false });
            qr.push({ active: true });
            qr.push({ agencyId });

            let drivers = await this.Driver.find({ $and: qr }, "driverCode");
            let data = [];
            for (let i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const driverAct = await this.DriverAct.findOne({
                    driverCode: drivers[i].driverCode,
                }).sort({ _id: -1 });

                const services = await this.Service.find(
                    { driverId: drivers[i].id, active: true, delete: false },
                    "serviceNum"
                );
                let acts = [];
                for (var service of services) {
                    const act = await this.DriverAct.findOne({
                        serviceId: service.serviceNum,
                    }).sort({ _id: -1 });
                    acts.push(act);
                }
                data.push({ driverAct, acts });
            }
            return this.response({
                res,
                data: data,
            });
        } catch (error) {
            console.error("Error while lastActServices:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverByPelak(req, res) {
        try {
            if (
                req.query.pelak === undefined ||
                req.query.pelak.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "pelak need",
                });
            }
            const pelak = req.query.pelak;
            // console.log("pelak", pelak);
            const cars = await this.Car.find(
                { pelak },
                "carModel colorCar pelak year"
            );
            // console.log("cars", cars);
            let driverList = [];
            for (var car of cars) {
                const drivers = await this.Driver.find(
                    { carId: car._id, delete: false },
                    "userId agencyId driverCode drivingLicence pic active"
                );
                for (var dr of drivers) {
                    const user = await this.User.findById(
                        dr.userId,
                        "phone name lastName gender nationalCode"
                    );
                    const agency = await this.Agency.findById(
                        dr.agencyId,
                        "code name tel address active pic"
                    );
                    const services = await this.Service.find(
                        { driverId: dr._id },
                        "student schoolId"
                    );
                    driverList.push({
                        driver: dr,
                        car,
                        user,
                        agency,
                        services,
                    });
                }
            }

            return this.response({
                res,
                data: driverList,
            });
        } catch (error) {
            console.error("Error while 00003:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverByPhoneName(req, res) {
        try {
            if (
                req.query.search === undefined ||
                req.query.search.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "search need",
                });
            }
            const search = req.query.search;
            const ids = await this.User.find(
                {
                    $or: [
                        {
                            name: {
                                $regex: ".*" + escapeRegExp(search) + ".*",
                            },
                        },
                        {
                            lastName: {
                                $regex: ".*" + escapeRegExp(search) + ".*",
                            },
                        },
                        {
                            phone: {
                                $regex: ".*" + escapeRegExp(search) + ".*",
                            },
                        },
                        {
                            nationalCode: {
                                $regex: ".*" + escapeRegExp(search) + ".*",
                            },
                        },
                    ],
                },
                ""
            ).distinct("_id");
            // console.log("ids", ids);
            const drivers = await this.Driver.find(
                { userId: { $in: ids }, delete: false },
                "userId agencyId driverCode drivingLicence pic active carId isAgent"
            );
            // console.log("drivers", drivers.length);

            let driverList = [];
            for (var dr of drivers) {
                const car = await this.Car.findById(
                    dr.carId,
                    "carModel colorCar pelak year"
                );

                const user = await this.User.findById(
                    dr.userId,
                    "phone name lastName gender nationalCode"
                );
                const agency = await this.Agency.findById(
                    dr.agencyId,
                    "code name tel address active pic"
                );
                const services = await this.Service.find(
                    { driverId: dr._id },
                    "student schoolId"
                );
                if (!car || !user || !agency) continue;
                driverList.push({ driver: dr, car, user, agency, services });
            }

            return this.response({
                res,
                data: driverList,
            });
        } catch (error) {
            console.error("Error while 00004:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getActService(req, res) {
        try {
            if (
                req.query.forDate === undefined ||
                req.query.forDate.trim() === "" ||
                req.query.serviceNum === undefined
            ) {
                return this.response({
                    res,
                    code: 204,
                    message: "forDate serviceNum need!",
                });
            }

            const serviceNum = req.query.serviceNum;
            const forDate = req.query.forDate;
            var date1 = new Date(forDate);
            // console.log("date1", date1);
            const dateX = new Date(
                date1.getFullYear(),
                date1.getMonth(),
                date1.getDate(),
                0,
                0,
                0
            );
            // console.log("dateX", dateX);
            const dateY = new Date(
                date1.getFullYear(),
                date1.getMonth(),
                date1.getDate(),
                23,
                59,
                59
            );
            // console.log("dateY", dateY);
            // console.log("serviceNum", serviceNum);
            var qr = [];

            qr.push({ serviceId: serviceNum });
            qr.push({ createdAt: { $lte: dateY, $gte: dateX } });

            const driverAct = await this.DriverAct.find({ $and: qr });
            return this.response({
                res,
                data: driverAct,
            });
        } catch (error) {
            console.error("Error while 00005:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverListTafsily(req, res) {
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
            const agencyId = req.query.agencyId;

            let drivers = await this.Driver.find(
                { agencyId, delete: false },
                "userId driverCode moreData"
            );

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );
                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                    };
                }
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error while 00006:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async locationDriver(req, res) {
        try {
            if (
                req.query.forDate === undefined ||
                req.query.forDate.trim() === "" ||
                req.query.driverCode === undefined
            ) {
                return this.response({
                    res,
                    code: 204,
                    message: "forDate driverCode need!",
                });
            }

            const driverCode = req.query.driverCode;
            const forDate = req.query.forDate;
            var date1 = new Date(forDate);
            // console.log("date1", date1);
            const dateX = new Date(
                date1.getFullYear(),
                date1.getMonth(),
                date1.getDate(),
                0,
                0,
                0
            );
            // console.log("dateX", dateX);
            const dateY = new Date(
                date1.getFullYear(),
                date1.getMonth(),
                date1.getDate(),
                23,
                59,
                59
            );

            var qr = [];

            qr.push({ userCode: driverCode });
            qr.push({ createdAt: { $lte: dateY, $gte: dateX } });

            // console.log(JSON.stringify(qr));
            const location = await this.Location.find({ $and: qr });
            // console.log("location", location.length);
            return this.response({
                res,
                message: "ok",
                data: location,
            });
        } catch (error) {
            console.error("Error while 00007:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getMyInfo(req, res) {
        try {
            const driver = await this.Driver.findOne({
                userId: req.user._id,
                delete: false,
            }).lean();
            if (!driver) {
                return this.response({
                    res,
                    code: 221,
                    message: "this driver is not exist",
                    data: {
                        fa_m: "راننده ممکن است حذف شده باشد",
                    },
                });
            }
            let driverInfo = await this.DriverInfo.findOne({
                driverId: driver._id,
            });
            if (!driverInfo) {
                driverInfo = new this.DriverInfo({
                    driverId: driver._id,
                });
                await driverInfo.save();
            } else {
                driver.location = driverInfo.location;
                driver.address = driverInfo.address;
                driver.birthday = driverInfo.birthday;
                driver.expireSh = driverInfo.expireSh;
                driver.healthPic = driverInfo.healthPic;
                driver.confirmHealthPic = driverInfo.confirmHealthPic;
                driver.technicalDiagPic = driverInfo.technicalDiagPic;
                driver.confirmTechincalPic = driverInfo.confirmTechincalPic;
                driver.clearancesPic = driverInfo.clearancesPic;
                driver.confirmClearPic = driverInfo.confirmClearPic;
                driver.dLicencePic = driverInfo.dLicencePic;
                driver.confirmDriverLcPic = driverInfo.confirmDriverLcPic;
                driver.dLicenceBackPic = driverInfo.dLicenceBackPic;
                driver.confirmDriverLcBackPic =
                    driverInfo.confirmDriverLcBackPic;
                driver.carDocPic = driverInfo.carDocPic;
                driver.confirmcarDocPic = driverInfo.confirmcarDocPic;
                driver.backCarDocPic = driverInfo.backCarDocPic;
                driver.confirmBackCarDocPic = driverInfo.confirmBackCarDocPic;
                driver.taxiDriverLicense = driverInfo.taxiDriverLicense;
                driver.insPic = driverInfo.insPic;
                driver.confirmInsPic = driverInfo.confirmInsPic;
                driver.isDriverCarOwner = driverInfo.isDriverCarOwner;
            }

            if (req.body.fcm != undefined && req.body.device != undefined) {
                const firebaseToken = req.body.fcm;
                const device = req.body.device;
                let fcm = req.user.fcm;
                if (!fcm) {
                    fcm = [];
                }
                let find = false;
                for (var i in fcm) {
                    if (fcm[i].device === device) {
                        fcm[i].token = firebaseToken;
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    fcm.push({ device: device, token: firebaseToken });
                }
                req.user.fcm = fcm;
                await this.User.findByIdAndUpdate(req.user._id, { fcm });
                await this.updateRedisDocument(`user:${req.user._id}`, {
                    fcm,
                });
                // req.user.save();
            }
            const car = await this.Car.findById(driver.carId);
            const agency = await this.Agency.findById(
                driver.agencyId,
                "name code location.coordinates address active tel"
            );
            const services = await this.Service.find(
                { driverId: driver.id, delete: false },
                "serviceNum distance driverSharing student routeSave active time"
            );

            for (var i in services) {
                let myStudents = [];

                for (var s in services[i].student) {
                    let studentInfo = {};
                    let student = await this.Student.findById(
                        services[i].student[s]
                    ).lean();
                    (studentInfo.studentCode = ""),
                        (studentInfo.gradeTitle = ""),
                        (studentInfo.name = ""),
                        (studentInfo.lastName = ""),
                        (studentInfo.fatherName = ""),
                        (studentInfo.physicalConditionDesc = ""),
                        (studentInfo.stateTitle = ""),
                        (studentInfo.parentName = ""),
                        (studentInfo.parentPhone = ""),
                        (studentInfo.schoolName = ""),
                        (studentInfo.active = true),
                        (studentInfo.isIranian = true),
                        (studentInfo.gender = 0),
                        (studentInfo.homeAddress = ""),
                        (studentInfo.schoolAddress = ""),
                        (studentInfo.shiftName = ""),
                        (studentInfo.shiftType = ""),
                        (studentInfo.parentId = ""),
                        (studentInfo.homeLat = 0),
                        (studentInfo.schoolLat = 0),
                        (studentInfo.homeLng = 0),
                        (studentInfo.schoolLng = 0),
                        (studentInfo.state = 0),
                        (studentInfo.serviceNum = 0),
                        (studentInfo.serviceDistance = 0),
                        (studentInfo.gradeId = 0);
                    studentInfo.supervisor = [];
                    if (student) {
                        studentInfo.studentCode = student.studentCode;
                        studentInfo.gradeTitle = student.gradeTitle;
                        studentInfo.name = student.name;
                        studentInfo.lastName = student.lastName;
                        studentInfo.fatherName = student.fatherName;
                        studentInfo.physicalConditionDesc =
                            student.physicalConditionDesc;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.active = student.active;
                        studentInfo.isIranian = student.isIranian;
                        studentInfo.gender = student.gender;
                        studentInfo.state = student.state;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.serviceNum = student.serviceNum;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.serviceDistance = student.serviceDistance;
                        studentInfo.gradeId = student.gradeId;
                        studentInfo.parentId = student.parent;
                        studentInfo.supervisor = student.supervisor;
                    }
                    let school = await this.School.findById(
                        student.school,
                        "name location.coordinates schoolTime"
                    );
                    if (school) {
                        studentInfo.schoolName = school.name;
                        studentInfo.schoolAddress = school.address;
                        studentInfo.schoolLat = school.location.coordinates[0];
                        studentInfo.schoolLng = school.location.coordinates[1];
                        let shiftName = "",
                            shiftType = "";
                        if (school.schoolTime.length > student.time) {
                            shiftName = school.schoolTime[student.time].name;
                            shiftType =
                                school.schoolTime[student.time].start +
                                " " +
                                school.schoolTime[student.time].end;
                            var stt = "";
                            for (var t in school.schoolTime) {
                                if (t == student.time) continue;
                                if (shiftName === school.schoolTime[t].name) {
                                    stt +=
                                        " + " +
                                        school.schoolTime[t].start +
                                        " " +
                                        school.schoolTime[t].end +
                                        " " +
                                        school.schoolTime[t].shiftdayTitle;
                                }
                            }
                            if (stt != "") {
                                shiftType +=
                                    school.schoolTime[student.time]
                                        .shiftdayTitle + stt;
                            }
                        } else {
                            shiftName = school.schoolTime[0].name;
                            shiftType =
                                school.schoolTime[0].start +
                                " " +
                                school.schoolTime[0].end;
                        }
                        studentInfo.shiftName = shiftName;
                        studentInfo.shiftType = shiftType;
                    }

                    studentInfo.homeAddress =
                        student.address + " " + student.addressDetails;
                    studentInfo.homeLat = student.location.coordinates[0];
                    studentInfo.homeLng = student.location.coordinates[1];
                    let parent = await this.Parent.findById(
                        student.parent,
                        "name lastName phone"
                    );
                    if (parent) {
                        studentInfo.parentName =
                            parent.name + " " + parent.lastName;
                        studentInfo.parentPhone = parent.phone;
                    }
                    myStudents.push(studentInfo);
                }
                if (myStudents.length === 0) {
                    services.splice(i, 1);
                    i--;
                } else {
                    services[i].student = myStudents;
                }

                // console.log("myStudents=",JSON.stringify(myStudents));
            }
            // console.log("services=",JSON.stringify(services));
            return this.response({
                res,
                message: "ok",
                data: {
                    driver,
                    car,
                    agency,
                    services,
                    name: req.user.name,
                    lastName: req.user.lastName,
                    gender: req.user.gender,
                },
            });
        } catch (error) {
            console.error("Error while 00008:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async activateDriver(req, res) {
        try {
            const id = new mongoose.Types.ObjectId(req.query.id);

            const driver = await this.Driver.findById(id);

            if (!driver) {
                return this.response({
                    res,
                    code: 404,
                    message: "Couldn't find driver",
                });
            }

            const newStatus = !driver.active;

            driver.active = newStatus;
            await driver.save();

            let change = "activated";
            if (!newStatus) {
                change = "deactivated";
            }

            return this.response({
                res,
                message: `Driver successfully ${change}`,
                data: newStatus,
            });
        } catch (error) {
            console.error("Error while 00009:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getMyInfo2(req, res) {
        try {
            // console.log("req.user._id", req.user._id);
            const drivers = await this.Driver.find({
                userId: req.user._id,
                delete: false,
                active: true,
            }).lean();

            // console.log("drivers", drivers);
            if (drivers.length === 0) {
                return this.response({
                    res,
                    code: 221,
                    message: "this driver is not exist",
                    data: {
                        fa_m: "راننده ممکن است حذف شده باشد",
                    },
                });
            }

            if (req.body.fcm != undefined && req.body.device != undefined) {
                const firebaseToken = req.body.fcm;
                const device = req.body.device;
                let fcm = req.user.fcm;
                if (!fcm) {
                    fcm = [];
                }
                let find = false;
                for (var i in fcm) {
                    if (fcm[i].device === device) {
                        fcm[i].token = firebaseToken;
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    fcm.push({ device: device, token: firebaseToken });
                }
                await this.User.findByIdAndUpdate(req.user._id, { fcm });
                await this.updateRedisDocument(`user:${req.user._id}`, {
                    fcm,
                });
                // req.user.fcm = fcm;
                // req.user.save();
            }
            let driversList = [];
            for (var i in drivers) {
                let driver = drivers[i];
                const car = await this.Car.findById(driver.carId);
                const agency = await this.Agency.findById(
                    driver.agencyId,
                    "name code location.coordinates address active tel cityId"
                );
                if (!agency) {
                    continue;
                }
                if (!agency.active) {
                    continue;
                }
                let agencySet;
                if (driver.isAgent) {
                    agencySet = await this.AgencySet.findOne({
                        agencyId: agency._id,
                    });
                    if (!agencySet) {
                        agencySet = {
                            setter: null,
                            showFirstCostToStudent: false,
                            showCostToDriver: true,
                            formula: "a-(a*(b/100))",
                            formulaForStudent: false,
                            updatedAt: null,
                        };
                    }
                    if (agencySet.formula === "") {
                        agencySet.formula = "a-(a*(b/100))";
                    }
                }

                let services = await this.Service.find(
                    {
                        driverId: driver._id,
                        delete: false,
                        agencyId: agency._id,
                    },
                    "serviceNum distance driverSharing routeSave active time"
                );
                services = services.map((service) => {
                    return {
                        ...service.toObject(),
                        driverSharing: Math.round(service.driverSharing),
                    };
                });
                const start = new Date();
                start.setHours(2, 0, 0, 0);
                const end = new Date();
                end.setHours(19, 0, 0, 0);
                for (var i = 0; i < services.length; i++) {
                    let myStudents = [];
                    const lastAct = await this.DriverAct.findOne(
                        {
                            serviceId: services[i].serviceNum,
                            isWarning: false,
                            createdAt: { $gt: start, $lt: end },
                        },
                        "model start"
                    ).sort({
                        _id: -1,
                    });
                    const students = await this.Student.find({
                        service: services[i]._id,
                    }).lean();
                    for (var student of students) {
                        let studentInfo = {};
                        studentInfo.studentCode = student.studentCode;
                        studentInfo.gradeTitle = student.gradeTitle;
                        studentInfo.name = student.name;
                        studentInfo.lastName = student.lastName;
                        studentInfo.fatherName = student.fatherName;
                        studentInfo.physicalConditionDesc =
                            student.physicalConditionDesc;
                        studentInfo.physicalCondition =
                            student.physicalCondition;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.active = student.active;
                        studentInfo.isIranian = student.isIranian;
                        studentInfo.gender = student.gender;
                        studentInfo.state = student.state;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.serviceNum = student.serviceNum;
                        studentInfo.stateTitle = student.stateTitle;
                        studentInfo.serviceDistance = student.serviceDistance;
                        studentInfo.gradeId = student.gradeId;
                        studentInfo.parentId = student.parent;
                        studentInfo.id = student.id;
                        studentInfo.supervisor = student.supervisor;
                        studentInfo.avanak =
                            student.avanak && student.avanakNumber.length > 6;

                        let school = await this.School.findById(
                            student.school,
                            "name location.coordinates schoolTime"
                        );
                        if (school) {
                            studentInfo.schoolName = school.name;
                            studentInfo.schoolAddress = school.address;
                            studentInfo.schoolLat =
                                school.location.coordinates[0];
                            studentInfo.schoolLng =
                                school.location.coordinates[1];
                            let shiftName = "",
                                shiftType = "";
                            if (school.schoolTime.length > student.time) {
                                shiftName =
                                    school.schoolTime[student.time].name;
                                shiftType =
                                    school.schoolTime[student.time].start +
                                    " " +
                                    school.schoolTime[student.time].end;
                                var stt = "";
                                for (var t in school.schoolTime) {
                                    if (t == student.time) continue;
                                    if (
                                        shiftName === school.schoolTime[t].name
                                    ) {
                                        stt +=
                                            " + " +
                                            school.schoolTime[t].start +
                                            " " +
                                            school.schoolTime[t].end +
                                            " " +
                                            school.schoolTime[t].shiftdayTitle;
                                    }
                                }
                                if (stt != "") {
                                    shiftType +=
                                        school.schoolTime[student.time]
                                            .shiftdayTitle + stt;
                                }
                            } else {
                                shiftName = school.schoolTime[0].name;
                                shiftType =
                                    school.schoolTime[0].start +
                                    " " +
                                    school.schoolTime[0].end;
                            }
                            studentInfo.shiftName = shiftName;
                            studentInfo.shiftType = shiftType;
                        }
                        studentInfo.homeAddress =
                            student.address + " " + student.addressDetails;
                        studentInfo.homeLat = student.location.coordinates[0];
                        studentInfo.homeLng = student.location.coordinates[1];
                        let parent = await this.Parent.findById(
                            student.parent,
                            "name lastName phone"
                        );
                        if (parent) {
                            studentInfo.parentName =
                                parent.name + " " + parent.lastName;
                            studentInfo.parentPhone = parent.phone;
                        }
                        myStudents.push(studentInfo);
                    }
                    if (myStudents.length === 0) {
                        services.splice(i, 1);
                        i--;
                    } else {
                        services[i].student = myStudents;
                        services[i].lastAct = lastAct;
                    }

                    // console.log("myStudents=",JSON.stringify(myStudents));
                }
                let driverInfo = await this.DriverInfo.findOne({
                    driverId: driver._id,
                });
                if (!driverInfo) {
                    driverInfo = new this.DriverInfo({
                        driverId: driver._id,
                    });
                    await driverInfo.save();
                } else {
                    driver.location = driverInfo.location;
                    driver.address = driverInfo.address;
                    driver.birthday = driverInfo.birthday;
                    driver.expireSh = driverInfo.expireSh;
                    driver.healthPic = driverInfo.healthPic;
                    driver.confirmHealthPic = driverInfo.confirmHealthPic;
                    driver.technicalDiagPic = driverInfo.technicalDiagPic;
                    driver.confirmTechincalPic = driverInfo.confirmTechincalPic;
                    driver.clearancesPic = driverInfo.clearancesPic;
                    driver.confirmClearPic = driverInfo.confirmClearPic;
                    driver.dLicencePic = driverInfo.dLicencePic;
                    driver.confirmDriverLcPic = driverInfo.confirmDriverLcPic;
                    driver.dLicenceBackPic = driverInfo.dLicenceBackPic;
                    driver.confirmDriverLcBackPic =
                        driverInfo.confirmDriverLcBackPic;
                    driver.carDocPic = driverInfo.carDocPic;
                    driver.confirmcarDocPic = driverInfo.confirmcarDocPic;
                    driver.backCarDocPic = driverInfo.backCarDocPic;
                    driver.confirmBackCarDocPic =
                        driverInfo.confirmBackCarDocPic;
                    driver.taxiDriverLicense = driverInfo.taxiDriverLicense;
                    driver.insPic = driverInfo.insPic;
                    driver.confirmInsPic = driverInfo.confirmInsPic;
                    driver.isDriverCarOwner = driverInfo.isDriverCarOwner;
                }
                driversList.push({
                    driver,
                    car,
                    agency,
                    services,
                    name: req.user.name,
                    phone: req.user.phone,
                    lastName: req.user.lastName,
                    gender: req.user.gender,
                    agencySet,
                });
            }

            // console.log("services=",JSON.stringify(services));
            return this.response({
                res,
                message: "ok",
                data: driversList,
            });
        } catch (error) {
            console.error("Error while getMyInfo2:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async startService(req, res) {
        try {
            const {
                driverCode,
                lat,
                lng,
                state,
                serviceNum,
                start,
                isWarning,
            } = req.body;
            let driverAct = new this.DriverAct({
                driverCode,
                location: { type: "Point", coordinates: [lat, lng] },
                model: state,
                serviceId: serviceNum,
                isWarning,
                studentId: req.body.studentId || "",
                start: start,
            });
            driverAct.save();
            return this.response({
                res,
                message: "ok",
            });
        } catch (e) {
            console.error("Error while startService:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverListPageDocument(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.page === undefined ||
                req.query.page.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId page need",
                });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            let page = parseInt(req.query.page);
            if (page < 0) page = 0;

            // var qr = [];
            // qr.push({ delete: false });
            // qr.push({ agencyId });

            let drivers = await this.Driver.find({ agencyId, delete: false })
                .skip(page * 25)
                .limit(25)
                .sort({ active: -1, isAgent: -1, _id: 1 })
                .lean();
            for (var i = 0; i < drivers.length; i++) {
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender fcm.device"
                );
                const car = await this.Car.findById(
                    drivers[i].carId,
                    "pelak colorCar carModel capacity year"
                );
                if (!car || !user) continue;

                if (user) {
                    let devices = [];
                    if (user.fcm != null) {
                        for (var dv of user.fcm) {
                            if (dv.device.length > 3) {
                                devices.push(dv.device);
                            }
                        }
                    }

                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                        device: devices,
                    };
                }
                if (car) {
                    drivers[i].moreData.pelak = car.pelak;
                    drivers[i].moreData.colorCar = car.colorCar;
                    drivers[i].moreData.carModel = car.carModel;
                    drivers[i].moreData.capacity = car.capacity ?? 0;
                    drivers[i].moreData.year = car.year;
                }
                // const serviceChart = await this.Service.find(
                //     { driverId: drivers[i]._id, delete: false, active: true },
                //     "student -_id"
                // ).lean();
                // drivers[i].moreData.serviceChart = serviceChart;
                const studentCount = await this.Student.countDocuments({
                    driverCode: drivers[i].driverCode,
                });
                const serviceCount = await this.Service.countDocuments({
                    delete: false,
                    driverId: drivers[i]._id,
                });
                drivers[i].moreData.studentCount = studentCount;
                drivers[i].moreData.serviceCount = serviceCount;
                delete drivers[i].carId;
                delete drivers[i].userId;
                delete drivers[i].agencyId;
                delete drivers[i].__v;
                let driverInfo = await this.DriverInfo.findOne({
                    driverId: drivers[i]._id,
                });
                if (!driverInfo) {
                    driverInfo = new this.DriverInfo({
                        driverId: drivers[i]._id,
                    });
                    await driverInfo.save();
                } else {
                    drivers[i].location = driverInfo.location;
                    drivers[i].address = driverInfo.address;
                    drivers[i].birthday = driverInfo.birthday;
                    drivers[i].expireSh = driverInfo.expireSh;
                    drivers[i].healthPic = driverInfo.healthPic;
                    drivers[i].confirmHealthPic = driverInfo.confirmHealthPic;
                    drivers[i].technicalDiagPic = driverInfo.technicalDiagPic;
                    drivers[i].confirmTechincalPic =
                        driverInfo.confirmTechincalPic;
                    drivers[i].clearancesPic = driverInfo.clearancesPic;
                    drivers[i].confirmClearPic = driverInfo.confirmClearPic;
                    drivers[i].dLicencePic = driverInfo.dLicencePic;
                    drivers[i].confirmDriverLcPic =
                        driverInfo.confirmDriverLcPic;
                    drivers[i].dLicenceBackPic = driverInfo.dLicenceBackPic;
                    drivers[i].confirmDriverLcBackPic =
                        driverInfo.confirmDriverLcBackPic;
                    drivers[i].carDocPic = driverInfo.carDocPic;
                    drivers[i].confirmcarDocPic = driverInfo.confirmcarDocPic;
                    drivers[i].backCarDocPic = driverInfo.backCarDocPic;
                    drivers[i].confirmBackCarDocPic =
                        driverInfo.confirmBackCarDocPic;
                    drivers[i].taxiDriverLicense = driverInfo.taxiDriverLicense;
                    drivers[i].insPic = driverInfo.insPic;
                    drivers[i].confirmInsPic = driverInfo.confirmInsPic;
                    drivers[i].isDriverCarOwner = driverInfo.isDriverCarOwner;
                }
            }

            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error whiledriverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverListSearchDocument(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.search === undefined ||
                req.query.search.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId search need",
                });
            }
            let search = req.query.search;
            search = search.trim();

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);

            var qr = [];
            qr.push({ delete: false });
            qr.push({ agencyId });

            const userIds = await this.Driver.find(
                { $and: qr },
                "userId"
            ).distinct("userId");
            var qr = [];
            qr.push({ _id: { $in: userIds } });
            qr.push({ delete: false });

            qr.push({
                $or: [
                    { phone: { $regex: ".*" + escapeRegExp(search) + ".*" } },
                    { name: { $regex: ".*" + escapeRegExp(search) + ".*" } },
                    {
                        lastName: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                ],
            });

            const users = await this.User.find({ $and: qr }).distinct("_id");

            let drivers = await this.Driver.find({
                agencyId,
                delete: false,
                userId: { $in: users },
            }).lean();

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );
                const car = await this.Car.findById(
                    drivers[i].carId,
                    "pelak colorCar carModel capacity year"
                );
                if (!car || !user) continue;
                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                    };
                }
                if (car) {
                    drivers[i].moreData.pelak = car.pelak;
                    drivers[i].moreData.colorCar = car.colorCar;
                    drivers[i].moreData.carModel = car.carModel;
                    drivers[i].moreData.capacity = car.capacity ?? 0;
                    drivers[i].moreData.year = car.year;
                }
                const serviceChart = await this.Service.find(
                    { driverId: drivers[i]._id, delete: false, active: true },
                    "student -_id"
                ).lean();
                drivers[i].moreData.serviceChart = serviceChart;
                delete drivers[i].carId;
                delete drivers[i].userId;
                delete drivers[i].agencyId;
                delete drivers[i].__v;
                let driverInfo = await this.DriverInfo.findOne({
                    driverId: drivers[i]._id,
                });
                if (!driverInfo) {
                    driverInfo = new this.DriverInfo({
                        driverId: drivers[i]._id,
                    });
                    await driverInfo.save();
                } else {
                    drivers[i].location = driverInfo.location;
                    drivers[i].address = driverInfo.address;
                    drivers[i].birthday = driverInfo.birthday;
                    drivers[i].expireSh = driverInfo.expireSh;
                    drivers[i].healthPic = driverInfo.healthPic;
                    drivers[i].confirmHealthPic = driverInfo.confirmHealthPic;
                    drivers[i].technicalDiagPic = driverInfo.technicalDiagPic;
                    drivers[i].confirmTechincalPic =
                        driverInfo.confirmTechincalPic;
                    drivers[i].clearancesPic = driverInfo.clearancesPic;
                    drivers[i].confirmClearPic = driverInfo.confirmClearPic;
                    drivers[i].dLicencePic = driverInfo.dLicencePic;
                    drivers[i].confirmDriverLcPic =
                        driverInfo.confirmDriverLcPic;
                    drivers[i].dLicenceBackPic = driverInfo.dLicenceBackPic;
                    drivers[i].confirmDriverLcBackPic =
                        driverInfo.confirmDriverLcBackPic;
                    drivers[i].carDocPic = driverInfo.carDocPic;
                    drivers[i].confirmcarDocPic = driverInfo.confirmcarDocPic;
                    drivers[i].backCarDocPic = driverInfo.backCarDocPic;
                    drivers[i].confirmBackCarDocPic =
                        driverInfo.confirmBackCarDocPic;
                    drivers[i].taxiDriverLicense = driverInfo.taxiDriverLicense;
                    drivers[i].insPic = driverInfo.insPic;
                    drivers[i].confirmInsPic = driverInfo.confirmInsPic;
                    drivers[i].isDriverCarOwner = driverInfo.isDriverCarOwner;
                }
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error whiledriverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverListPageScore(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.page === undefined ||
                req.query.page.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId page need",
                });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            let page = parseInt(req.query.page);
            if (page < 0) page = 0;
            console.log("page", page);

            var qr = [];
            qr.push({ delete: false });
            qr.push({ agencyId });

            let drivers = await this.Driver.find(
                { $and: qr },
                "driverCode userId score pic active moreData"
            )
                .skip(page * 25)
                .limit(25)
                .lean();

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );

                if (!user) continue;

                let driverId = drivers[i]._id;
                let services = await this.Service.countDocuments({
                    driverId,
                    active: true,
                    delete: false,
                });
                let stReport = await this.StReport.countDocuments({
                    driverId,
                    delete: false,
                });
                let inspectorRp = await this.InspectorRp.countDocuments({
                    driverId,
                    delete: false,
                });
                //for grouping _ find last evey user rate for one driver
                const ratin = await this.RatingDriver.aggregate([
                    {
                        $match: {
                            driverId,
                        },
                    },
                    { $project: { point: 1, userId: 1 } },
                    { $sort: { _id: -1 } },
                    {
                        $group: {
                            _id: "$userId",
                            latest: { $first: "$$ROOT" },
                        },
                    },
                ]);
                // console.log("ratin", JSON.stringify(ratin));
                let point = 0;

                if (ratin) {
                    if (ratin.length > 0) {
                        let sum = 0;
                        for (var n in ratin) {
                            sum += ratin[n].latest.point;
                        }
                        point = sum / ratin.length;
                    }
                }
                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                    };
                }
                drivers[i].moreData.point = point;
                drivers[i].moreData.services = services;
                drivers[i].moreData.stReport = stReport;
                drivers[i].moreData.inspectorRp = inspectorRp;
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error whiledriverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverListSearchScore(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.agencyId.trim() === "" ||
                req.query.search === undefined ||
                req.query.search.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId search need",
                });
            }
            let search = req.query.search;
            search = search.trim();

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);

            var qr = [];
            qr.push({ delete: false });
            qr.push({ agencyId });

            const userIds = await this.Driver.find(
                { $and: qr },
                "userId"
            ).distinct("userId");
            var qr = [];
            qr.push({ _id: { $in: userIds } });
            qr.push({ delete: false });

            qr.push({
                $or: [
                    { phone: { $regex: ".*" + escapeRegExp(search) + ".*" } },
                    { name: { $regex: ".*" + escapeRegExp(search) + ".*" } },
                    {
                        lastName: {
                            $regex: ".*" + escapeRegExp(search) + ".*",
                        },
                    },
                ],
            });

            const users = await this.User.find({ $and: qr }).distinct("_id");

            let drivers = await this.Driver.find(
                {
                    agencyId,
                    delete: false,
                    userId: { $in: users },
                },
                "driverCode userId score pic active moreData"
            );

            for (var i = 0; i < drivers.length; i++) {
                // console.log(JSON.stringify(students[i]));
                const user = await this.User.findById(
                    drivers[i].userId,
                    "phone name lastName gender"
                );

                if (!user) continue;

                let driverId = drivers[i].id;
                let services = await this.Service.countDocuments({
                    driverId,
                    active: true,
                    delete: false,
                });
                let stReport = await this.StReport.countDocuments({
                    driverId,
                    delete: false,
                });
                let inspectorRp = await this.InspectorRp.countDocuments({
                    driverId,
                    delete: false,
                });
                //for grouping _ find last evey user rate for one driver
                const ratin = await this.RatingDriver.aggregate([
                    {
                        $match: {
                            driverId: ObjectId.createFromHexString(driverId),
                        },
                    },
                    { $project: { point: 1, userId: 1 } },
                    { $sort: { _id: -1 } },
                    {
                        $group: {
                            _id: "$userId",
                            latest: { $first: "$$ROOT" },
                        },
                    },
                ]);
                // console.log("ratin", JSON.stringify(ratin));
                let point = 0;

                if (ratin) {
                    if (ratin.length > 0) {
                        let sum = 0;
                        for (var n in ratin) {
                            sum += ratin[n].latest.point;
                        }
                        point = sum / ratin.length;
                    }
                }
                if (user) {
                    drivers[i].moreData = {
                        phone: user.phone,
                        name: user.name,
                        lastName: user.lastName,
                        gender: user.gender,
                    };
                }
                drivers[i].moreData.point = point;
                drivers[i].moreData.services = services;
                drivers[i].moreData.stReport = stReport;
                drivers[i].moreData.inspectorRp = inspectorRp;
            }
            return this.response({
                res,
                data: drivers,
            });
        } catch (error) {
            console.error("Error whiledriverList :", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async updateAgent(req, res) {
        try {
            const { id } = req.query;

            const driver = await this.Driver.findById(id);
            if (!driver) {
                return this.response({
                    res,
                    code: 404,
                    message: "Driver not found!",
                });
            }

            const newStatus = !driver.isAgent;
            const message = newStatus
                ? "Driver is now an agent"
                : "Driver is no longer an agent";

            driver.isAgent = newStatus;
            await driver.save();

            return this.response({
                res,
                message,
                data: { isAgent: newStatus },
            });
        } catch (error) {
            console.error("Error updating driver agent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverBankInfo(req, res) {
        try {
            if (
                req.body.agencyId === undefined ||
                req.body.agencyId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const driverIds = req.body.driverIds || [];
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            let qr = {
                agencyId,
                delete: false,
            };
            if (driverIds.length > 0) {
                qr._id = { $in: driverIds };
            }
            const drivers = await this.Driver.find(
                qr,
                "hesab nationalCode shaba userId card"
            );
            let driversBank = [];
            for (var d of drivers) {
                const user = await this.User.findById(
                    d.userId,
                    "name lastName nationalCode"
                );
                if (user) {
                    driversBank.push({ driver: d, user });
                }
            }
            return this.response({
                res,
                data: driversBank,
            });
        } catch (error) {
            console.error("Error updating driver agent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverDetails(req, res) {
        try {
            const { agencyId } = req.query;

            const drivers = await this.Driver.find({
                agencyId,
                delete: false,
            }).lean();

            const data = [];

            for (const driver of drivers) {
                let add = {
                    driverNationalCode: driver.nationalCode,
                    driverCode: driver.driverCode,
                };

                const user = await this.User.findById(driver.userId).lean();

                add.name = user.name;
                add.lastName = user.lastName;
                add.phone = user.phone;
                add.userNationalCode = user.nationalCode;

                const car = await this.Car.findById(driver.carId)
                    .select("-__v -createdAt -updatedAt -_id -delete")
                    .lean();
                if (!car) {
                    add.car = null;
                } else {
                    add.car = car;
                }

                const services = await this.Service.find({
                    driverId: driver._id,
                }).lean();
                const serv = [];

                for (const service of services) {
                    const add_serv = { serviceNum: service.serviceNum };

                    const school = await this.School.findById(service.schoolId);

                    add_serv.school = school.name;
                    add_serv.studentCount = service.student.length;
                    serv.push(add_serv);
                }
                add.service = serv;

                data.push(add);
            }
            return this.response({
                res,
                data,
            });
        } catch (error) {
            console.error("Error getting drivers details:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async driverServiceNum(req, res) {
        try {
            const driverId = ObjectId.createFromHexString(req.query.driverId);

            const service = await this.Service.find(
                { active: true, delete: false, driverId },
                "serviceNum"
            ).distinct("serviceNum");

            return this.response({
                res,
                data: service,
            });
        } catch (error) {
            console.error("Error driverServiceNum:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async driverListSimpleWithService(req, res) {
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
            const agencyId = req.query.agencyId;
            const serviceState = req.query.withService || "with";
            var qr = [];
            qr.push({ delete: false });
            qr.push({ active: true });
            qr.push({ agencyId });

            let drivers = await this.Driver.find(
                { $and: qr },
                "userId driverCode carId"
            );
            let driverList = [];
            for (var i = 0; i < drivers.length; i++) {
                const countService = await this.Service.countDocuments({
                    driverId: drivers[i]._id,
                    delete: false,
                });
                if (serviceState === "with") {
                    if (countService > 0) {
                        const user = await this.User.findById(
                            drivers[i].userId,
                            "phone name lastName gender"
                        );
                        const car = await this.Car.findById(
                            drivers[i].carId,
                            "carModel colorCar pelak"
                        );
                        let name = "";
                        let phone = "";
                        let carModel = "";
                        let pelak = "";
                        if (user) {
                            phone = user.phone;
                            name = user.name + " " + user.lastName;
                        }
                        if (car) {
                            carModel = car.carModel + " " + car.colorCar;
                            pelak = car.pelak;
                        }
                        driverList.push({
                            driverCode: drivers[i].driverCode,
                            pelak: pelak,
                            carModel: carModel,
                            name: name,
                            phone: phone,
                            countService,
                        });
                    }
                } else if (serviceState === "all") {
                    const user = await this.User.findById(
                        drivers[i].userId,
                        "phone name lastName gender"
                    );
                    const car = await this.Car.findById(
                        drivers[i].carId,
                        "carModel colorCar"
                    );
                    let name = "";
                    let phone = "";
                    let carModel = "";
                    if (user) {
                        phone = user.phone;
                        name = user.name + " " + user.lastName;
                    }
                    if (car) {
                        carModel = car.carModel + " " + car.colorCar;
                    }
                    driverList.push({
                        driverCode: drivers[i].driverCode,
                        carModel: carModel,
                        name: name,
                        phone: phone,
                        countService,
                    });
                } else if (countService == 0) {
                    const user = await this.User.findById(
                        drivers[i].userId,
                        "phone name lastName gender"
                    );
                    const car = await this.Car.findById(
                        drivers[i].carId,
                        "carModel colorCar"
                    );
                    let name = "";
                    let phone = "";
                    let carModel = "";
                    if (user) {
                        phone = user.phone;
                        name = user.name + " " + user.lastName;
                    }
                    if (car) {
                        carModel = car.carModel + " " + car.colorCar;
                    }
                    driverList.push({
                        driverCode: drivers[i].driverCode,
                        carModel: carModel,
                        name: name,
                        phone: phone,
                        countService,
                    });
                }
            }
            return this.response({
                res,
                data: driverList,
            });
        } catch (error) {
            console.error("Error while driverListSimple:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async findDriversByNameOrPhone(req, res) {
        try {
            const { agencyId, s } = req.query;
            if (!agencyId || !s) {
                return res
                    .status(204)
                    .json({ message: "Invalid agencyId or s" });
            }
            const agency = await this.Agency.findById(agencyId).lean();
            if (!agency) {
                return res.status(204).json({ message: "Agency not found" });
            }

            const drivers = await this.Driver.find({ agencyId })
                .distinct("userId")
                .lean();
            if (drivers.length === 0) {
                return res.status(204).json({ message: "No driver found" });
            }

            let users = await this.User.find(
                {
                    $and: [
                        {
                            _id: { $in: drivers },
                        },
                        {
                            $or: [
                                {
                                    name: { $regex: ".*" + s + ".*" },
                                },
                                { lastName: { $regex: ".*" + s + ".*" } },
                                { phone: { $regex: ".*" + s + ".*" } },
                            ],
                        },
                    ],
                },
                "-_id name lastName code phone"
            ).limit(20);
            users = users.map((doc) => {
                return {
                    name: `${doc.name} ${doc.lastName}`,
                    driverCode: agency.code + doc.code,
                    phone: doc.phone,
                };
            });
            console.log("users", users);

            return res.json(users);
        } catch (error) {
            console.error("Error while findDriversByNameOrPhone:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();

function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}
