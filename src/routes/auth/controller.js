const controller = require("./../controller");
const jwt = require("jsonwebtoken");
const { Otp } = require("../../models/otp");
const Zarin = require("zarinpal-checkout");
const { ConfirmCode } = require("../../models/otp");
const crypto = require("crypto"); // Built-in Node.js module
// const Ghasedak = require("ghasedak");
const config = require("config");
const persianDate = require("persian-date");
// const ghasedak_c = process.env.GHASEDAK;
// let ghasedak = new Ghasedak(ghasedak_c);
const axios = require("axios");
const qs = require("qs");
const SMS_WAIT = config.get("sms_wait");
const SMS_CONFIRM_CODE_SECOND = config.get("sms_confirm_code_second");
const JWT_KEY = process.env.JWT_KEY;

var driversLocation = [];

function getSecondsDiff(startDate, endDate) {
    const msInSecond = 1000;
    return Math.round(Math.abs(endDate - startDate) / msInSecond);
}

module.exports = new (class extends controller {
    async sendSmsAndSave(phone, otp, isFiveDigit, isParent = false) {
        try {
            const code = isFiveDigit
                ? Math.floor(10000 + Math.random() * 90000).toString()
                : Math.floor(1000 + Math.random() * 9000).toString();

            let Token = process.env.AMOOT_SMS;
            let OptionalCode = code;
            let Mobile = phone;
            let CodeLength = 4;

            let data = qs.stringify({
                Mobile: Mobile,
                CodeLength: CodeLength,
                OptionalCode: OptionalCode,
            });

            let config = {
                method: "post",
                url: "https://portal.amootsms.com/rest/SendQuickOTP",
                headers: {
                    Authorization: Token,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data: data,
            };
            //dodo
            // axios(config)
            //     .then(function (response) {
            //         // console.log("response", JSON.stringify(response.data));
            //     })
            //     .catch(function (error) {
            //         console.error("Error axios service sendSmsAndSAve", error);
            //     });

            //for this 'smsResult i add 'return result' to ghasedak.verification in modules
            // if(smsResult.result.code==200){
            if (!otp) {
                new Otp({
                    phone,
                    code,
                    isParent,
                    consumed: false,
                }).save();
            } else {
                otp.code = code;
                otp.isParent = isParent;
                otp.consumed = false;
                await otp.save();
            }
            console.log(`code for phone ${phone} = ${code}`);
            return true;
        } catch (error) {
            console.error("Error while sending sms and save:", error);
            return false;
        }
    }

    async phoneCheck(req, res) {
        try {
            const phone = fixNumbers(req.body.phone);
            const isDriver = req.body.isDriver || false;
            const isParent = req.body.isParent || false;
            const isFiveDigit = req.body.isFiveDigit || false;

            if (isDriver) {
                const user = await this.User.findOne({ phone });
                if (!user) {
                    return this.response({
                        res,
                        code: 404,
                        message: "driver user not find",
                        data: {
                            fa_m: "کاربری با این شماره یافت نشد",
                        },
                    });
                } else {
                    const driver = await this.Driver.findOne({
                        userId: user.id,
                        delete: false,
                    });
                    if (!driver) {
                        return this.response({
                            res,
                            code: 404,
                            message: "driver not find",
                            data: {
                                fa_m: "راننده ای با این شماره یافت نشد",
                            },
                        });
                    }
                    if (!driver.active) {
                        return this.response({
                            res,
                            code: 404,
                            message: "driver is Not Active",
                            data: {
                                fa_m: "راننده غیرفعال است ",
                                reason: user.inActvieReason,
                            },
                        });
                    }
                }
            }
            if (isParent) {
                const parent = await this.Parent.findOne({ phone });
                if (parent) {
                    if (!parent.active) {
                        return this.response({
                            res,
                            code: 404,
                            message: "parent is Not Active",
                            data: {
                                fa_m: "والد غیرفعال است ",
                                reason: parent.inActvieReason,
                            },
                        });
                    }
                }
            }

            let otp = await Otp.findOne({ phone, isParent });
            // console.log("otp", JSON.stringify(otp));
            if (otp) {
                if (!otp.consumed) {
                    const seconds = getSecondsDiff(otp.updatedAt, Date.now());
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
            }

            const success = await this.sendSmsAndSave(
                phone,
                otp,
                isFiveDigit,
                isParent
            );
            if (success) {
                return this.response({
                    res,
                    message: "sending code successfully",
                    data: { fa_m: "کد اعتبارسنجی فرستاده شد" },
                });
            } else {
                return this.response({
                    res,
                    code: 503,
                    message: "can't send otp , try again please",
                    data: {
                        error: true,
                        fa_m: "خطایی در سمت سرور پیش آمده، لطفا کمی بعد تلاش کنید",
                    },
                });
            }
        } catch (error) {
            console.error("Error in phoneCheck function:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async inspectorPhoneCheck(req, res) {
        try {
            const phone = fixNumbers(req.body.phone);
            const user = await this.User.findOne({ phone });
            if (!user) {
                return this.response({
                    res,
                    code: 404,
                    message: "driver user not find",
                    data: {
                        fa_m: "کاربری با این شماره یافت نشد",
                    },
                });
            }

            if (!user.isadmin) {
                return this.response({
                    res,
                    code: 403,
                    message: "admin not find by this phone",
                    data: {
                        fa_m: "مدیری با این شماره یافت نشد",
                    },
                });
            }
            if (!user.active) {
                return this.response({
                    res,
                    code: 402,
                    message: "user is Not Active",
                    data: {
                        fa_m: "کاربر غیرفعال است ",
                    },
                });
            }

            let otp = await Otp.findOne({ phone });
            if (otp) {
                if (!otp.consumed) {
                    const seconds = getSecondsDiff(otp.updatedAt, Date.now());
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
            }

            const success = await this.sendSmsAndSave(phone, otp);
            if (success) {
                return this.response({
                    res,
                    message: "sending code successfully",
                    data: { fa_m: "کد اعتبارسنجی فرستاده شد" },
                });
            } else {
                return this.response({
                    res,
                    code: 503,
                    message: "can't send otp , try again please",
                    data: {
                        error: true,
                        fa_m: "خطایی در سمت سرور پیش آمده، لطفا کمی بعد تلاش کنید",
                    },
                });
            }
        } catch (error) {
            console.error("Error in inspectorPhoneCheck function:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async phoneCheckMaster(req, res) {
        try {
            const phone = fixNumbers(req.body.phone);

            const user = await this.User.findOne({
                phone,
                delete: false,
                isAgencyAdmin: true,
            });

            if (!user) {
                return this.response({
                    res,
                    code: 404,
                    message: "admin not find",
                    data: {
                        fa_m: "مدیریت ای با این شماره یافت نشد",
                    },
                });
            }

            if (!user.active) {
                return this.response({
                    res,
                    code: 404,
                    message: "admin is Not Active",
                    data: {
                        fa_m: "ادمین غیرفعال است",
                        reason: user.inActvieReason,
                    },
                });
            }

            let otp = await Otp.findOne({ phone });
            if (otp) {
                if (!otp.consumed) {
                    const seconds = getSecondsDiff(otp.updatedAt, Date.now());
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
            }

            const success = await this.sendSmsAndSave(phone, otp);
            if (success) {
                return this.response({
                    res,
                    message: "sending code successfully",
                    data: { fa_m: "کد اعتبارسنجی فرستاده شد" },
                });
            } else {
                return this.response({
                    res,
                    code: 503,
                    message: "can't send otp, try again please",
                    data: {
                        error: true,
                        fa_m: "خطایی در سمت سرور پیش آمده، لطفا کمی بعد تلاش کنید",
                    },
                });
            }
        } catch (error) {
            console.error("phoneCheckMaster function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async adminPhoneCheck(req, res) {
        const phone = fixNumbers(req.body.phone);
        try {
            const user = await this.User.findOne({ phone });
            if (!user) {
                return this.response({
                    res,
                    code: 404,
                    message: "driver user not find",
                    data: {
                        fa_m: "کاربری با این شماره یافت نشد",
                    },
                });
            }

            if (
                !(
                    user.isadmin ||
                    user.isAgencyAdmin ||
                    user.isSchoolAdmin ||
                    user.isSuperAdmin
                )
            ) {
                return this.response({
                    res,
                    code: 403,
                    message: "admin not find by this phone",
                    data: {
                        fa_m: "مدیری با این شماره یافت نشد",
                    },
                });
            }

            if (!user.active) {
                return this.response({
                    res,
                    code: 402,
                    message: "user is Not Active",
                    data: {
                        fa_m: "کاربر غیرفعال است",
                    },
                });
            }

            let otp = await Otp.findOne({ phone });
            if (otp) {
                if (!otp.consumed) {
                    const seconds = getSecondsDiff(otp.updatedAt, Date.now());
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
            }

            const success = await this.sendSmsAndSave(phone, otp);
            if (success) {
                return this.response({
                    res,
                    message: "sending code successfully",
                    data: { fa_m: "کد اعتبارسنجی فرستاده شد" },
                });
            } else {
                return this.response({
                    res,
                    code: 503,
                    message: "can't send otp, try again please",
                    data: {
                        error: true,
                        fa_m: "خطایی در سمت سرور پیش آمده، لطفا کمی بعد تلاش کنید",
                    },
                });
            }
        } catch (error) {
            console.error("adminPhoneCheck function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async codeCheck(req, res) {
        try {
            const phone = fixNumbers(req.body.phone);
            const code = fixNumbers(req.body.code);
            const fcmToken = req.body.fcmToken ?? "";
            const info = req.body.info ?? "";
            const isParent = req.body.isParent || false;
            var ip =
                req.headers["x-forwarded-for"] || req.connection.remoteAddress;
            ip = ip.replace("::", "");

            let otp = await Otp.findOne({ phone, isParent, consumed: false });
            if (!otp) {
                return this.response({
                    res,
                    code: 202,
                    message: "dont sent any code yet",
                    data: { fa_m: "برای این شماره هنوز کدی فرستاده نشده!" },
                });
            }

            const seconds = getSecondsDiff(otp.updatedAt, Date.now());
            if (seconds > SMS_CONFIRM_CODE_SECOND) {
                return this.response({
                    res,
                    code: 400,
                    message: "timeout for this code, send again",
                    data: { fa_m: "این کد دیگر اعتبار ندارد!" },
                });
            }

            if (otp.code === code) {
                let user = otp.isParent
                    ? await this.Parent.findOne({
                          phone: phone,
                          delete: false,
                      })
                    : await this.User.findOne({
                          phone: phone,
                          delete: false,
                      });
                if (!user) {
                    user = otp.isParent
                        ? new this.Parent({
                              phone,
                              userName: phone,
                          })
                        : new this.User({
                              phone,
                              userName: phone,
                          });
                    await user.save();
                    await this.updateRedisDocument(
                        otp.isParent
                            ? `parent:${user._id}`
                            : `user:${user._id}`,
                        user.toObject()
                    );

                    let userInfo = new this.UserInfo({
                        userId: user._id,
                    });
                    await userInfo.save();
                    otp.consumed = true;
                    await otp.save();

                    const dynamicKey = JWT_KEY;
                    const token = jwt.sign(
                        {
                            _id: user.id,
                            date: Date.now(),
                            isParent: otp.isParent,
                            isDriver: !otp.isParent,
                        },
                        dynamicKey,
                        {
                            algorithm: "HS256",
                        }
                    );
                    // if (!otp.isParent)
                    //     await this.User.updateOne(
                    //         { _id: user.id },
                    //         { $set: { jwtSalt: userSalt } }
                    //     );

                    user.fcm = [
                        {
                            device: info,
                            token: fcmToken,
                            ip: ip,
                            date: new Date(),
                            tk: token,
                        },
                    ];
                    await user.save();
                    await this.updateRedisDocument(
                        otp.isParent
                            ? `parent:${user._id}`
                            : `user:${user._id}`,
                        user.toObject()
                    );
                    return this.response({
                        res,
                        message: "user is new!",
                        data: { token, message: "کاربر جدید است" },
                    });
                }

                if (user.active) {
                    // const userSalt = crypto.randomBytes(16).toString("hex"); // Generate per-user salt
                    otp.consumed = true;
                    await otp.save();
                    const dynamicKey = JWT_KEY;
                    const token = jwt.sign(
                        {
                            _id: user.id,
                            date: Date.now(),
                            isParent: otp.isParent,
                            isDriver: !otp.isParent,
                        },
                        dynamicKey,
                        {
                            algorithm: "HS256",
                        }
                    );

                    var exist = false;
                    for (var i in user.fcm) {
                        if (user.fcm[i].device === info) {
                            user.fcm[i] = {
                                device: info,
                                token: fcmToken,
                                ip: ip,
                                date: new Date(),
                                tk: token,
                            };
                            exist = true;
                            break;
                        }
                    }
                    if (!exist) {
                        user.fcm.push({
                            device: info,
                            token: fcmToken,
                            ip: ip,
                            date: new Date(),
                            tk: token,
                        });
                    }
                    await user.save();

                    await this.updateRedisDocument(
                        otp.isParent
                            ? `parent:${user._id}`
                            : `user:${user._id}`,
                        user.toObject()
                    );
                    return this.response({
                        res,
                        message: "confirm code successfuly",
                        data: {
                            token,
                            isNew: false,
                            name: user.name,
                            lastName: user.lastName,
                            phone: user.phone,
                            gender: user.gender,
                        },
                    });
                }

                return this.response({
                    res,
                    code: 401,
                    message: "user not active, call to support",
                    data: {
                        fa_m: "کاربر از سوی مدیر غیرفعال شده! لطفا با پشتیبانی تماس بگیرید",
                        reason: user.inActvieReason,
                    },
                });
            }

            return this.response({
                res,
                code: 400,
                message: "code is invalid",
                data: { fa_m: "کد ورود اشتباه است!" },
            });
        } catch (error) {
            console.error("codeCheck function error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async checkCodeChangePass(req, res) {
        try {
            const phone = fixNumbers(req.body.phone);
            const code = fixNumbers(req.body.code);
            const pass = fixNumbers(req.body.pass);

            let otp = await Otp.findOne({ phone, consumed: false });
            if (!otp) {
                return this.response({
                    res,
                    code: 202,
                    message: "dont sent any code yet",
                    data: { fa_m: "برای این شماره هنوز کدی فرستاده نشده!" },
                });
            }

            const seconds = getSecondsDiff(otp.updatedAt, Date.now());
            if (seconds > SMS_CONFIRM_CODE_SECOND) {
                return this.response({
                    res,
                    code: 400,
                    message: "timeout for this code, send again",
                    data: { fa_m: "این کد دیگر اعتبار ندارد!" },
                });
            }

            if (otp.code === code) {
                let user = await this.User.findOne({ phone });
                if (!user) {
                    return this.response({
                        res,
                        code: 404,
                        message: "user is new!",
                        data: { message: "کاربر جدید است" },
                    });
                }

                if (user.active) {
                    user.password = pass;
                    await user.save();
                    otp.consumed = true;
                    await otp.save();
                    await this.updateRedisDocument(
                        `user:${user._id}`,
                        user.toObject()
                    );
                    return this.response({
                        res,
                        message: "confirm code successfully changed pass",
                    });
                }

                return this.response({
                    res,
                    code: 401,
                    message: "user not active, call to support",
                    data: {
                        fa_m: "کاربر از سوی مدیر غیرفعال شده! لطفا با پشتیبانی تماس بگیرید",
                    },
                });
            }

            return this.response({
                res,
                code: 400,
                message: "code is invalid",
                data: { fa_m: "کد ورود اشتباه است!" },
            });
        } catch (error) {
            console.error("Error in checkCodeChangePass:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async login(req, res) {
        try {
            const userName = fixNumbers(req.body.userName);
            const password = fixNumbers(req.body.password);

            const user = await this.User.findOne({
                $or: [
                    { userName, password },
                    { phone: userName, password },
                ],
            });

            if (!user) {
                return this.response({
                    res,
                    code: 404,
                    message: "user not found",
                    data: { fa_m: "کاربر یافت نشد" },
                });
            }

            if (user.delete) {
                return this.response({
                    res,
                    code: 301,
                    message: "user is deleted",
                    data: { fa_m: "کاربر حذف شده است" },
                });
            }

            if (!user.active) {
                return this.response({
                    res,
                    code: 302,
                    message: "user is inactive",
                    data: {
                        fa_m: "کاربر غیرفعال شده است",
                        inActiveReason: user.inActvieReason,
                    },
                });
            }
            let userSalt = crypto.randomBytes(16).toString("hex"); // Generate per-user salt
            if (
                user.id === "687c9d3d904f4eb1bcb5179c" ||
                user.id === "688c8ef1d890ff501400362f"
            ) {
                userSalt = "SuperAdmin";
            }
            const dynamicKey = JWT_KEY + userSalt;
            let token = jwt.sign(
                { _id: user.id, date: Date.now() },
                dynamicKey,
                {
                    expiresIn: "18h",
                    algorithm: "HS256",
                }
            );
            await this.User.findByIdAndUpdate(user._id, { jwtSalt: userSalt });
            await this.updateRedisDocument(`user:${user._id}`, {
                jwtSalt: userSalt,
            });

            let agency, school;

            if (user.isAgencyAdmin || user.isSupport) {
                agency = await this.Agency.find(
                    {
                        $and: [
                            { delete: false },
                            { active: true },
                            {
                                $or: [
                                    { admin: user._id },
                                    { users: { $in: user._id } },
                                ],
                            },
                        ],
                    },
                    "code name cityId code location.coordinates active settings admin"
                ).lean();
                for (var i in agency) {
                    if (agency[i].admin.toString() != user._id.toString()) {
                        const wallet = agency[i].settings.find(
                            (obj) => obj.wallet != undefined
                        ).wallet;
                        // console.log("setting", agency.settings);
                        const costCode = agency[i].settings.find(
                            (obj) => obj.cost != undefined
                        ).cost;
                        if (costCode && wallet) {
                            let mandeh = 0;
                            const result = await this.DocListSanad.aggregate([
                                {
                                    $match: {
                                        accCode: wallet,
                                        agencyId: agency[i]._id,
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
                            agency[i].mandeh = mandeh;
                            if (mandeh < 1) {
                                let sarafsl = [];
                                const agencyId = agency[i]._id;
                                var qr4 = [];
                                qr4.push({ agencyId });
                                qr4.push({ enable: true });
                                qr4.push({ $or: [{ type: 5 }, { type: 3 }] });

                                const hesabs = await this.ListAcc.find(
                                    { $and: qr4 },
                                    "code codeLev1 codeLev2 codeLev3 groupId type nature levelEnd"
                                );
                                if (hesabs.length != 0) {
                                    for (var hs of hesabs) {
                                        const tafsily =
                                            await this.LevelAccDetail.findOne(
                                                {
                                                    agencyId,
                                                    accCode: hs.codeLev3,
                                                },
                                                "accName"
                                            );
                                        const moeen =
                                            await this.LevelAccDetail.findOne(
                                                {
                                                    agencyId,
                                                    accCode: hs.codeLev2,
                                                    levelNo: 2,
                                                },
                                                "accName"
                                            );
                                        const kol =
                                            await this.LevelAccDetail.findOne(
                                                {
                                                    agencyId,
                                                    accCode: hs.codeLev1,
                                                    levelNo: 1,
                                                },
                                                "accName"
                                            );
                                        if (!tafsily || !moeen || !kol)
                                            continue;
                                        sarafsl.push({
                                            accName: tafsily.accName,
                                            hs,
                                            moeen: moeen.accName,
                                            kol: kol.accName,
                                        });
                                    }
                                }
                                agency[i].sarafsl = sarafsl;
                                if (sarafsl.length > 0) {
                                    token = "";
                                }
                            }
                            // console.log("mandeh", mandeh);
                        }
                    } else {
                        agency[i].mandeh = 2;
                    }
                }
            }

            if (user.isSchoolAdmin) {
                school = await this.School.find({
                    admin: user.id,
                    delete: false,
                });
            }

            return this.response({
                res,
                message: "welcome",
                data: {
                    token,
                    userId: user._id,
                    name: user.name,
                    lastName: user.lastName,
                    isAdmin: user.isadmin,
                    isAgencyAdmin: user.isAgencyAdmin,
                    agency,
                    isSupport: user.isSupport,
                    isSchoolAdmin: user.isSchoolAdmin,
                    ban: user.ban,
                    school,
                },
            });
        } catch (error) {
            console.error("Error in login:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async loginOfferCo(req, res) {
        try {
            const userName = fixNumbers(req.body.userName);
            const password = fixNumbers(req.body.password);

            const user = await this.User.findOne({
                $or: [
                    { userName, password },
                    { phone: userName, password },
                ],
            });

            if (!user) {
                return this.response({
                    res,
                    code: 404,
                    message: "user not found",
                    data: { fa_m: "کاربر یافت نشد" },
                });
            }

            if (user.delete) {
                return this.response({
                    res,
                    code: 301,
                    message: "user is deleted",
                    data: { fa_m: "کاربر حذف شده است" },
                });
            }

            if (!user.active) {
                return this.response({
                    res,
                    code: 302,
                    message: "user is inactive",
                    data: {
                        fa_m: "کاربر غیرفعال شده است",
                        inActiveReason: user.inActvieReason,
                    },
                });
            }
            const userSalt = "OfferCompany";

            const dynamicKey = JWT_KEY + userSalt;
            let token = jwt.sign(
                { _id: user.id, date: Date.now() },
                dynamicKey,
                {
                    // expiresIn: "72h",
                    algorithm: "HS256",
                }
            );
            await this.User.findByIdAndUpdate(user._id, { jwtSalt: userSalt });
            await this.updateRedisDocument(`user:${user._id}`, {
                jwtSalt: userSalt,
            });

            let companiesO = await this.Company.find(
                {
                    $and: [
                        { delete: false },
                        {
                            $or: [{ operator: user._id }],
                        },
                    ],
                },
                "name cityId active logo"
            ).lean();
            let companiesA = await this.Company.find(
                {
                    $and: [
                        { delete: false },
                        {
                            $or: [{ admin: user._id }],
                        },
                    ],
                },
                "name cityId active logo"
            ).lean();
            return this.response({
                res,
                message: "welcome",
                data: {
                    token,
                    userId: user._id,
                    companiesA,
                    companiesO,
                },
            });
        } catch (error) {
            console.error("Error in loginOfferCo:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async firstCheck(req, res) {
        try {
            const count = await this.User.countDocuments();
            if (count === 0) {
                return res.json({
                    ok: false,
                    msg: "db is empty, insert first user",
                });
            }

            return res.status(210).json({ ok: true, msg: "db is ready" });
        } catch (error) {
            console.error("Error in firstCheck:", error);
            return res.status(500).json({ ok: false, msg: "error in db" });
        }
    }

    async firstUser(req, res) {
        try {
            const phone = fixNumbers(req.body.phone);
            const userName = req.body.userName;
            const password = req.body.password;
            const name = req.body.name;
            const lastName = req.body.lastName;

            const count = await this.User.countDocuments();
            if (count === 0) {
                const userX = new this.User({
                    phone,
                    userName,
                    password,
                    isSuperAdmin: true,
                    isadmin: true,
                    name,
                    lastName,
                });
                await userX.save();
                await this.updateRedisDocument(
                    `user:${userX._id}`,
                    userX.toObject()
                );

                const userInfo = new this.UserInfo({
                    userId: userX._id,
                });
                await userInfo.save();

                return res.json({ ok: true });
            }

            return res.json({
                ok: false,
                msg: "db already has at least one user",
            });
        } catch (error) {
            console.error("Error in firstUser:", error);
            return res.status(500).json({ ok: false, msg: "error in db" });
        }
    }

    async updateDriverLocation(req, res) {
        try {
            console.log("rrrrrrrrrrr");
            var lat = req.body.lat;
            var lng = req.body.lng;
            var name = req.body.name;
            var angle = req.body.angle;
            var driverId = req.body.driverId;
            var serviceId = req.body.serviceId;
            var agencyId = req.body.agencyId;
            var state = req.body.state;
            let set = false;
            if (state > 2) {
                try {
                    let driverAct = new this.DriverAct({
                        driverCode: driverId,
                        location: { type: "Point", coordinates: [lat, lng] },
                        model: state,
                        serviceId: serviceId,
                        isWarning: false,
                        studentId: "",
                        start: 2,
                    });
                    driverAct.save();
                } catch (e) {}
            }
            for (let i = 0; i < driversLocation.length; i++) {
                if (driversLocation[i].driverId === driverId) {
                    let timeDifference =
                        Date.now() - driversLocation[i].lastSave;
                    // console.log("timeDifference",timeDifference);
                    let difInMin = Math.ceil(timeDifference / (1000 * 60));
                    // console.log("difInMin",difInMin);
                    if (difInMin > 1) {
                        driversLocation[i].lastSave = Date.now();
                        let location = new this.Location({
                            userCode: driverId,
                            location: {
                                type: "Point",
                                coordinates: [lat, lng],
                            },
                            name,
                            angle,
                            serviceId,
                            state,
                            agencyId,
                        });
                        location.save();
                    }
                    driversLocation[i].location = {
                        type: "Point",
                        coordinates: [lat, lng],
                    };
                    driversLocation[i].name = name;
                    driversLocation[i].angle = angle;
                    driversLocation[i].serviceId = serviceId;
                    driversLocation[i].agencyId = agencyId;
                    driversLocation[i].state = state;
                    driversLocation[i].lastUpdate = Date.now();
                    set = true;
                    break;
                }
            }
            if (!set) {
                driversLocation.push({
                    location: { type: "Point", coordinates: [lat, lng] },
                    driverId: driverId,
                    name: name,
                    angle: angle,
                    serviceId: serviceId,
                    agencyId: agencyId,
                    state: state,
                    lastUpdate: Date.now(),
                    lastSave: Date.now(),
                });
                let location = new this.Location({
                    userCode: driverId,
                    location: { type: "Point", coordinates: [lat, lng] },
                    name,
                    angle,
                    serviceId,
                    state,
                    agencyId,
                });
                location.save();
            }
            //  console.log("driversLocation",JSON.stringify(driversLocation));
            return res.json();
            // return;
        } catch (error) {
            console.error("Error in updateDriverLocation", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverStates(req, res) {
        try {
            var driverCode = req.query.driverCode;

            var myDrivers = [];
            for (let i = 0; i < driversLocation.length; i++) {
                if (
                    driversLocation[i].driverId.toString() ===
                    driverCode.toString()
                ) {
                    myDrivers.push(driversLocation[i]);
                }
            }
            return this.response({
                res,
                data: myDrivers,
            });
        } catch (error) {
            console.error("Error while getDriverStates:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getDriverLocation(req, res) {
        try {
            let { agencyCode, driverCode } = req.query;
            const myDrivers = [];
            if(req.user.isSchoolAdmin){
                const school=await this.School.findById(agencyCode,'agencyId');
                if(school){
                    agencyCode=school.agencyId.toString();
                }
            }

            // for (let i = 0; i < driversLocation.length; i++) {
            //     if (driversLocation[i].driverId === driverCode) {
            //         return this.response({
            //             res,
            //             data: driversLocation[i],
            //         });
            //     }

            //     if (
            //         driversLocation[i].agencyId.toString() ===
            //             agencyCode.toString() ||
            //         agencyCode === "0"
            //     ) {
            //         myDrivers.push(driversLocation[i]);
            //     }
            // }
            let keys;
            if (driverCode.length > 2) {
                keys = await this.redisClient.keys(
                    `geo-driver:${agencyCode}:*`
                );
            } else {
                keys = await this.redisClient.keys(
                    `geo-driver:${agencyCode}:${driverCode}:*`
                );
            }

            // const driverLocations = await this.Location.find(qr).lean();

            if (keys.length === 0) return [];
            const values = await this.redisClient.mGet(keys);

            // console.log("qr", qr);
            // console.log("driverLocations", driverLocations.length);

            // for (var lc of driverLocations) {
            //     lc.lat = lc.location.coordinates[0];
            //     lc.lng = lc.location.coordinates[1];
            // }
            const jsonObjects = values
                .filter((v) => v !== null) // ignore nulls
                .map((v) => JSON.parse(v));

            return this.response({
                res,
                data: jsonObjects,
            });
        } catch (error) {
            console.error("Error in getDriverLocation:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    // async verifyAgain(req, res) {
    //   console.log("req.query", JSON.stringify(req.query));
    //   const { Authority, Status } = req.query;

    //   const transAction = await this.Transactions.findOne({
    //     authority: Authority,
    //   });
    //   console.log("verify Authority=", Authority);
    //   console.log(" transAction=", transAction);
    //   if (!transAction) {
    //     return res.status(404).json("not find");
    //   }
    //   if (transAction.done && transAction.state === 1) {
    //     return res.json("its paid");
    //   }
    //   console.log("Status", Status === "OK");
    //   if (Status === "OK" || Status === "ok" || Status === "Ok") {
    //     const pq = await this.PayQueue.findOne({
    //       code: transAction.queueCode,
    //     });

    //     let merchent = "";
    //     const radMerchent = "59e4cc62-98ba-4057-a809-bc25a4decc9b";
    //     if (pq) {
    //       if (pq.merchentId != null && pq.merchentId.length === 36) {
    //         merchent = pq.merchentId;
    //       } else {
    //         merchent = radMerchent;
    //       }
    //     } else {
    //       merchent = radMerchent;
    //     }
    //     try {
    //       let response;
    //       console.log("transAction.amount / 10=", transAction.amount / 10);
    //       const zarinpal = Zarin.create(merchent, false);
    //       response = await zarinpal.PaymentVerification({
    //         Amount: transAction.amount,
    //         Authority: Authority,
    //       });
    //       if (!response) {
    //         return res.status(404).json("notFind");
    //       }
    //       if (!(response.status === 100 || response.status === 101)) {
    //         response = await zarinpal.PaymentVerification({
    //           Amount: transAction.amount / 10,
    //           Authority: Authority,
    //         });
    //         // console.log("response", response);
    //       }
    //       if (response.status === 100 || response.status === 101) {
    //         // console.log("response", JSON.stringify(response));
    //         const tr = await this.Transactions.findByIdAndUpdate(
    //           transAction._id,
    //           {
    //             refID: response.RefID,
    //             done: true,
    //             state: 1,
    //           }
    //         );

    //         const agencyId = tr.agencyId;
    //         const payQueue = await this.PayQueue.findOne(
    //           { code: tr.queueCode },
    //           "confirmInfo merchentId confirmPrePaid listAccCode listAccName"
    //         );
    //         let student = await this.Student.findOne({
    //           studentCode: tr.stCode,
    //         });
    //         if (student.state < 3) {
    //           const school = await this.School.findById(
    //             student.school,
    //             "agencyId"
    //           );
    //           let kol = "003";
    //           let moeen = "005";
    //           if (school) {
    //             await this.LevelAccDetail.findOneAndUpdate(
    //               { accCode: student.studentCode },
    //               {
    //                 agencyId: school.agencyId,
    //               }
    //             );
    //             await this.ListAcc.findOneAndUpdate(
    //               { codeLev3: student.studentCode },
    //               {
    //                 agencyId: school.agencyId,
    //                 code: kol + moeen + student.studentCode,
    //                 codeLev2: moeen,
    //                 codeLev1: kol,
    //               }
    //             );
    //           }
    //         }
    //         if (payQueue.confirmInfo) {
    //           if (student.state < 2) {
    //             student.state = 2;
    //             student.stateTitle = "تایید اطلاعات";
    //             await student.save();
    //           }
    //         }
    //         if (payQueue.confirmPrePaid) {
    //           if (student.state < 3) {
    //             student.state = 3;
    //             student.stateTitle = "تایید پیش پرداخت";
    //             await student.save();
    //           }
    //         }

    //         let num = 0;
    //         let id;
    //         if (agencyId != undefined || agencyId != null) {
    //           const bank = payQueue.listAccCode;
    //           const bankName = payQueue.listAccName;
    //           let kol = "003";
    //           let moeen = "005";
    //           const auth = tr.authority;
    //           const checkExist = await this.CheckInfo.countDocuments({
    //             agencyId,
    //             type: 6,
    //             serial: auth,
    //           });

    //           if (checkExist > 0) {
    //             // return res.status(503).json({ error: "the serial is duplicated" });
    //             console.log("the serial is duplicated");
    //             return this.response({
    //               res,
    //               data: transAction,
    //             });
    //           }
    //           const aa = bank.substring(6);

    //           persianDate.toLocale("en");
    //           var SalMali = new persianDate().format("YY");
    //           const checkMax = await this.CheckInfo.find({ agencyId }, "infoId")
    //             .sort({ infoId: -1 })
    //             .limit(1);
    //           let numCheck = 1;
    //           if (checkMax.length > 0) {
    //             numCheck = checkMax[0].infoId + 1;
    //           }
    //           const infoNum = `${SalMali}-${numCheck}`;
    //           let checkInfo = new this.CheckInfo({
    //             agencyId,
    //             editor: tr.userId,
    //             infoId: numCheck,
    //             infoNum,
    //             seCode: "0",
    //             branchCode: "",
    //             branchName: "",
    //             bankName: bankName,
    //             serial: auth,
    //             type: 6,
    //             rowCount: 2,
    //             infoDate: new Date(),
    //             infoMoney: tr.amount,
    //             accCode: bank,
    //             ownerHesab: "",
    //             desc: tr.desc,
    //           });
    //           await checkInfo.save();

    //           let doc = new this.DocSanad({
    //             agencyId,
    //             note: tr.desc,
    //             sanadDate: new Date(),
    //             system: 2,
    //             definite: false,
    //             lock: true,
    //             editor: tr.userId,
    //           });
    //           const code = kol + moeen + tr.stCode;
    //           await doc.save();
    //           num = doc.sanadId;
    //           id = doc.id;
    //           await new this.DocListSanad({
    //             agencyId,
    //             titleId: doc.id,
    //             doclistId: doc.sanadId,
    //             mId: doc.sanadId,
    //             row: 1,
    //             bed: tr.amount,
    //             bes: 0,
    //             mId: doc.sanadId,
    //             mode: "pay",
    //             isOnline: true,
    //             note: ` ${tr.desc} به شماره پیگیری ${response.RefID}`,
    //             accCode: bank,
    //             peigiri: infoNum,
    //           }).save();

    //           await new this.DocListSanad({
    //             agencyId,
    //             titleId: doc.id,
    //             doclistId: doc.sanadId,
    //             row: 2,
    //             bed: 0,
    //             bes: tr.amount,
    //             note: `${tr.desc} به شماره پیگیری ${response.RefID}`,
    //             accCode: code,
    //             mId: tr.queueCode,
    //             isOnline: true,
    //             type: "invoice",
    //             peigiri: infoNum,
    //           }).save();
    //           await new this.CheckHistory({
    //             agencyId,
    //             infoId: checkInfo.id,
    //             editor: tr.userId,
    //             row: 1,
    //             toAccCode: bank,
    //             fromAccCode: code,
    //             money: tr.amount,
    //             status: 6,
    //             desc: ` ${tr.desc} به شماره پیگیری ${response.RefID}`,
    //             sanadNum: doc.sanadId,
    //           }).save();
    //         }

    //         // await new this.PayAction({
    //         //     setter: tr.userId,
    //         //     transaction: tr.id,
    //         //     queueCode: tr.queueCode,
    //         //     amount: tr.amount,
    //         //     desc: tr.desc,
    //         //     isOnline: true,
    //         //     studentCode: tr.stCode,
    //         //     docSanadNum: num,
    //         //     docSanadId: id,
    //         // }).save();
    //         return res.json("ok");
    //       }
    //       return res.status(202).json("NOk");
    //     } catch (error) {
    //       console.error("Error while 01021:", error);
    //       return res.status(500).json({ error: "Internal Server Error." });
    //     }
    //     try {
    //       await this.Transactions.findByIdAndUpdate(transAction._id, {
    //         done: true,
    //         state: 2,
    //       });
    //       return res.json("ok");
    //     } catch (error) {
    //       console.error("Error while 01021 b:", error);
    //       return res.status(500).json({ error: "Internal Server Error." });
    //     }
    //   } else {
    //     return res.json("ok");
    //   }
    // }
})();

var persianNumbers = [
        /۰/g,
        /۱/g,
        /۲/g,
        /۳/g,
        /۴/g,
        /۵/g,
        /۶/g,
        /۷/g,
        /۸/g,
        /۹/g,
    ],
    arabicNumbers = [
        /٠/g,
        /١/g,
        /٢/g,
        /٣/g,
        /٤/g,
        /٥/g,
        /٦/g,
        /٧/g,
        /٨/g,
        /٩/g,
    ],
    fixNumbers = function (str) {
        if (typeof str === "string") {
            for (var i = 0; i < 10; i++) {
                str = str
                    .replace(persianNumbers[i], i)
                    .replace(arabicNumbers[i], i);
            }
        }
        return str;
    };
//
