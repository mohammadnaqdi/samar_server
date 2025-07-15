const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const textValues = [
    "سرویس مدرسه یک سرویس جمعی می باشد که در صورت تکمیل ظرفیت خودرو سرویس دهی انجام می پذیرد",
    "شرکت مجری سرویس دهی به مدرسه فرزند شما، مسئولیت تعیین راننده و انجام کلیه کارهای مربوط به سرویس را دارد و مسئولیتی از این بابت به عهده رادرایانه نمیباشد!",
    "ولی دانش آموز می بایستی فرزند خود رادر ساعت و ایستگاه مقرر تحویل راننده بنماید.",
    "به دلیل بروز برخی از مشکلات چون راننده سرویس نمی تواند وسیله نقلیه خود را ترک نماید لذا درخواست می گردد از راننده تقاضای زدن زنگ درب منزل و بوق زدن و یا تماس تلفنی نشود.",
    "در صورت بروز هر گونه مسئله و مشکلی از مذاکره مستقیم با راننده سرویس خودداری نمایید و پیگیری این امر را بعهده مدیر اجرائی قرار دهید.",
    "حفظ شخصیت رانندگان محترم سرویس لازم است لذا از اولیاء گرامی انتظار می رود با رعایت حرمت این عزیزان، چگونگی رفتار با رانندگان سرویس را به فرزندان خود گوشزد نمایند.",
    "حفظ وسایل شخصی (کیف- کتاب- ظرف غذا و...) به عهده دانش آموز می باشد",
    "درصورتیکه دانش آموز داخل سرویس مقررات را رعایت نکند به نحوی که باعث اختلال در امر سرویس دهی گردد پس از دو مرحله که به اطلاع خانواده رسید ، مدیر اجرایی می تواند از پذیرفتن دانش آموز در سرویس خودداری نماید",
    "هزینه سرویس بر اساس ظرفیت مجاز خودرو محاسبه شده و لذا برای تشکیل هر سرویس می بایستی تعداد دانش آموزان به حد نصاب برسد و در صورت کمبود تعداد متقاضی و قبول اولیاء وجه کل سرویس بین افراد تقسیم خواهد شد . در غیر این صورت سرویس برقرار نمیگردد",
    "حداکثر تا ده روز قبل از شروع کار سرویس پس از ثبت نام و اعلام آدرس، امکان تغییر آدرس وجود دارد ولی بعد از این فرصت فقط در صورتی که امکان داشته باشد برقراری سرویس فرزند شما مقدور می باشد",
    "در سرویسهای عمومی از پذیرفتن دانش آموزان یکطرفه معذوریم",
    "در صورت انصراف استفاده از خدمات حمل و نقل، شرکت مجری با توجه به محاسبه سالانه هزینه سرویس به تناسب تاریخ انصراف علاوه بر هزینه ماه ، جریمه را طبق مقررات مربوطه دریافت میکند",
    "از مراجعه و مذاکره مستقیم درخصوص مباحث مالــی، شهریه، انصراف و... با راننده طرف قرارداد حمل و نقل خودداری کرده و هرگونه مباحث مالی را از طریق طرفین قرارداد پیگیری نمایم",
    "مسئولیت قبل از سوار شدن در سرویس رفت و بعد از پیاده شدن در سرویس برگشت (در زمان و محل تعیین شده) دانش آموز به عهده ی والدین می باشد",
    "با توجه به محدودیت ها و اختلالات پیش بینی نشده اینترنت، اتکا کامل به نرم افزار، امری اشتباه است لذا مراقبت و پیگیری وضعیت دانش آموز از طرف والدین در همه حال امری اجتناب ناپذیر است",
];
module.exports = new (class extends controller {
    // async insertAgency(req, res) {
    //     try {
    //         const id = req.body.id;
    //         const name = req.body.name;
    //         let code = req.body.code;
    //         const userSetForAdmin = req.body.userSetForAdmin;
    //         let managerName = req.body.managerName;
    //         const managerCode = req.body.managerCode;
    //         const districtId = req.body.districtId;
    //         const districtTitle = req.body.districtTitle;
    //         const address = req.body.address;
    //         const location = req.body.location;
    //         const managerTel = req.body.managerTel;
    //         const userName = req.body.userName;
    //         const password = req.body.password;
    //         const tel = req.body.tel;
    //         if (code.toString() === "0") {
    //             const lastAgency = await this.Agency.find(
    //                 { code: { $regex: "300" + ".*" } },
    //                 "code"
    //             )
    //                 .sort({
    //                     code: -1,
    //                 })
    //                 .limit(1);
    //             code = "30000";
    //             if (lastAgency.length > 0) {
    //                 code = (parseInt(lastAgency[0].code) + 1).toString();
    //             }
    //         } else if (id === 0) {
    //             const drv = await this.Agency.findOne({ code });
    //             if (drv) {
    //                 return this.response({
    //                     res,
    //                     code: 204,
    //                     message: "Code is exist before",
    //                     data: { fa_m: "کد وارد شده برای شرکت تکراری است!" },
    //                 });
    //             }
    //         }
    //         if (id === 0) {
    //             const userTest = await this.User.findOne({
    //                 userName: userName,
    //                 phone: { $ne: managerTel },
    //             });

    //             if (userTest && id === 0) {
    //                 return this.response({
    //                     res,
    //                     code: 223,
    //                     message: "this userName is exist",
    //                     data: {
    //                         fa_m: "این نام کاربری تکراری است",
    //                         name: userTest.name,
    //                         lastName: userTest.lastName,
    //                     },
    //                 });
    //             }
    //         }

    //         let rating = 3;
    //         if (req.body.rating != undefined) rating = req.body.rating;

    //         let user = await this.User.findOne({ phone: managerTel });
    //         if (!user && id != 0) {
    //             return this.response({
    //                 res,
    //                 code: 204,
    //                 message: "user inot find by phone",
    //                 data: {
    //                     fa_m: "از این api فقط میتونید مقادیر را تغییر دهید",
    //                 },
    //             });
    //         }
    //         if (user && !userSetForAdmin && id === 0) {
    //             return this.response({
    //                 res,
    //                 code: 221,
    //                 message: "this user is exist",
    //                 data: {
    //                     fa_m: "این کاربر وجود دارد برای تنظیم برای این کاربر userSetForAdmin را بفرستید",
    //                     name: user.name,
    //                     lastName: user.lastName,
    //                 },
    //             });
    //         }
    //         if (!user && id === 0) {
    //             managerName = managerName.trim();
    //             var nameFamily = managerName.split(" ");

    //             if (nameFamily.length < 2) nameFamily.push("");
    //             const family = managerName.replace(nameFamily[0], "").trim();
    //             user = new this.User({
    //                 phone: managerTel,
    //                 userName,
    //                 password,
    //                 isAgencyAdmin: true,
    //                 name: nameFamily[0],
    //                 lastName: family,
    //             });
    //             await user.save();
    //             await this.updateRedisDocument(
    //                 `user:${user._id}`,
    //                 user.toObject()
    //             );
    //         } else if (!user.isAgencyAdmin) {
    //             user.isAgencyAdmin = true;
    //             await user.save();
    //             await this.updateRedisDocument(`user:${user._id}`, user.toObject());
    //         }
    //         if (
    //             isEmpty(user.userName) ||
    //             user.userName != userName ||
    //             user.password != password
    //         ) {
    //             user.userName = userName;
    //             if (password != "***") user.password = password;
    //             await user.save();
    //             await this.updateRedisDocument(`user:${user._id}`, user.toObject());
    //         }

    //         if (id === 0) {
    //             let agency = new this.Agency({
    //                 code,
    //                 name,
    //                 admin: user.id,
    //                 managerCode,
    //                 tel,
    //                 districtId,
    //                 districtTitle,
    //                 rating,
    //                 address,
    //                 location:{ type: "Point", coordinates: location },
    //             });
    //             await agency.save();
    //             const rules = [];

    //             for (const text of textValues) {
    //                 rules.push({
    //                     agencyId: agency.id,
    //                     type: "student",
    //                     show: true,
    //                     rule: text,
    //                 });
    //             }
    //             await this.Rule.insertMany(rules);
    //             return this.response({
    //                 res,
    //                 data: agency._id,
    //             });
    //             return;
    //         } else {
    //             let agency = await this.Agency.findByIdAndUpdate(id, {
    //                 code,
    //                 name,
    //                 managerCode,
    //                 tel,
    //                 districtId,
    //                 districtTitle,
    //                 rating,
    //                 address,
    //                 location:{ type: "Point", coordinates: location },
    //             });
    //             return this.response({
    //                 res,
    //                 data: agency._id,
    //             });
    //         }
    //     } catch (error) {
    //         console.error("Error while inserting Agency:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }
    async setFirstCodeHesab(agencyId) {
        try {
            // kol level
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "001",
                accName: "موجودی نقد و بانک",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "002",
                accName: "اسناد دریافتی",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "003",
                accName: "حساب های دریافتنی تجاری",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "004",
                accName: "پرداختنی های تجاری",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "005",
                accName: "اسناد پرداختنی بلندمدت",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "006",
                accName: "درآمدهای عملیاتی",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "007",
                accName: "هزینه‌های حقوق دستمزد",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 1,
                accCode: "008",
                accName: "هزینه های عملیاتی",
            }).save();
            // moeen level
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "001",
                accName: "موجودی نقد صندوق",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "002",
                accName: "موجودی تنخواه گردان",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "003",
                accName: "موجودی نقد نزد بانک",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "004",
                accName: "اسناد و چک‌های دریافتنی نزد صندوق",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "005",
                accName: "حساب‌های دریافتنی",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "006",
                accName: "حساب های پرداختنی",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "007",
                accName: "اسناد پرداختنی بلندمدت",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "008",
                accName: "فروش خدمات",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "009",
                accName: "حقوق پایه",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "010",
                accName: "هزینه قبوض",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 2,
                accCode: "011",
                accName: "هزینه‌های رایانه‌ای",
            }).save();
            // tafsily level
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000001",
                accName: "صندوق نقدی",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000002",
                accName: "صندوق چک های دریافتی",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000003",
                accName: "بانک صادرات",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000004",
                accName: "کمیسیون دریافتی از رانندگان",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000005",
                accName: "حق الزحمه سرویس",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000006",
                accName: "حقوق رانندگان",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000007",
                accName: "قبض برق",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                levelType: 3,
                accCode: "000000008",
                accName: "شارژ کیف پول",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000009",
                levelType: 3,
                accName: "هزینه عملیاتی",
            }).save();
            await new this.LevelAccDetail({
                agencyId,
                levelNo: 3,
                accCode: "000000010",
                levelType: 3,
                accName: "شارژ ادمین",
            }).save();

            return true;
        } catch (err) {
            console.error("setFirstCodeHesab function error:", err);
            return false;
        }
    }

    async setFirstListAcc(agencyId) {
        try {
            await new this.ListAcc({
                agencyId,
                code: "001001000000001",
                codeLev1: "001",
                codeLev2: "001",
                codeLev3: "000000001",
                groupId: 1,
                type: 2,
                nature: 1,
                levelEnd: 3,
                canEdit: false,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "002004000000002",
                codeLev1: "002",
                codeLev2: "004",
                codeLev3: "000000002",
                groupId: 1,
                type: 5,
                nature: 1,
                levelEnd: 3,
                canEdit: false,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "001003000000003",
                codeLev1: "001",
                codeLev2: "003",
                codeLev3: "000000003",
                groupId: 1,
                type: 3,
                nature: 1,
                levelEnd: 3,
                canEdit: true,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "006008000000004",
                codeLev1: "006",
                codeLev2: "008",
                codeLev3: "000000004",
                groupId: 6,
                type: 1,
                nature: 2,
                levelEnd: 3,
                percent: 15,
                canEdit: true,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "006008000000005",
                codeLev1: "006",
                codeLev2: "008",
                codeLev3: "000000005",
                groupId: 6,
                type: 1,
                nature: 2,
                levelEnd: 3,
                canEdit: true,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "007009000000006",
                codeLev1: "007",
                codeLev2: "009",
                codeLev3: "000000006",
                groupId: 6,
                type: 1,
                nature: 2,
                levelEnd: 3,
                canEdit: true,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "008010000000007",
                codeLev1: "008",
                codeLev2: "010",
                codeLev3: "000000007",
                groupId: 7,
                type: 1,
                nature: 1,
                levelEnd: 3,
                canEdit: true,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "008011000000008",
                codeLev1: "008",
                codeLev2: "011",
                codeLev3: "000000008",
                groupId: 7,
                type: 1,
                nature: 1,
                levelEnd: 3,
                canEdit: false,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "008011000000009",
                codeLev1: "008",
                codeLev2: "011",
                codeLev3: "000000009",
                groupId: 7,
                type: 1,
                nature: 1,
                levelEnd: 3,
                canEdit: false,
            }).save();
            await new this.ListAcc({
                agencyId,
                code: "008011000000010",
                codeLev1: "008",
                codeLev2: "011",
                codeLev3: "000000010",
                groupId: 7,
                type: 1,
                nature: 1,
                levelEnd: 3,
                canEdit: false,
            }).save();
            return true;
        } catch (error) {
            console.error("setFirstListAcc: ", error);
            return false;
        }
    }
    async setAgency(req, res) {
        try {
            const id = req.body.id;
            const name = req.body.name;
            // let code = req.body.code;
            const managerCode = req.body.managerCode;
            const districtId = req.body.districtId;
            const districtTitle = req.body.districtTitle;
            const address = req.body.address;
            const userId = req.body.userId;
            const location = req.body.location;
            const tel = req.body.tel;
            const cityCode = req.body.cityCode;
            const registrationPrice = req.body.registrationPrice;
            // if (
            //     code.toString().trim() === "0" ||
            //     code.toString().trim() === ""
            // ) {
            //     const lastAgency = await this.Agency.find(
            //         { code: { $regex: "300" + ".*" } },
            //         "code"
            //     )
            //         .sort({
            //             code: -1,
            //         })
            //         .limit(1);
            //     code = "30000";
            //     if (lastAgency.length > 0) {
            //         code = (parseInt(lastAgency[0].code) + 1).toString();
            //     }
            // } else if (id === 0) {
            //     const drv = await this.Agency.findOne({ code });
            //     if (drv) {
            //         return this.response({
            //             res,
            //             code: 204,
            //             message: "Code is exist before",
            //             data: { fa_m: "کد وارد شده برای شرکت تکراری است!" },
            //         });
            //     }
            // }
            let rating = 3;
            if (req.body.rating != undefined) rating = req.body.rating;

            if (id === 0) {
                const session = await this.Agency.startSession();
                session.startTransaction();

                try {
                    const agency = new this.Agency({
                        name,
                        admin: userId,
                        managerCode,
                        tel,
                        districtId,
                        districtTitle,
                        rating,
                        address,
                        location: { type: "Point", coordinates: location },
                        cityId: cityCode,
                    });

                    await agency.save({ session });
                    let invoice = new this.Invoice({
                        title: "هزینه ثبت نام",
                        confirmInfo: true,
                        agencyId: agency._id,
                        setter: userId,
                        type: "registration",
                        amount: registrationPrice,
                    });

                    await invoice.save({ session });

                    await new this.Invoice({
                        title: "هزینه سرویس",
                        confirmInfo: true,
                        agencyId: agency._id,
                        setter: userId,
                        type: "serviceCost",
                        amount: 0,
                    }).save({ session });

                    const rules = textValues.map((text) => ({
                        agencyId: agency._id,
                        type: "student",
                        show: true,
                        rule: text,
                    }));

                    await this.Rule.insertMany(rules, { session });

                    const doIt = await this.setFirstCodeHesab(
                        agency._id,
                        session
                    );
                    const doIt2 = await this.setFirstListAcc(
                        agency._id,
                        session
                    );

                    if (!doIt || !doIt2) {
                        await session.abortTransaction();
                        session.endSession();
                        return this.response({
                            res,
                            code: 500,
                            message:
                                "Initialization failed. Transaction aborted.",
                        });
                    }

                    await session.commitTransaction();
                    session.endSession();
                    await this.setKolMoeendefault(agency._id, session);
                    return this.response({
                        res,
                        data: agency._id,
                    });
                } catch (error) {
                    await session.abortTransaction();
                    session.endSession();
                    return this.response({
                        res,
                        code: 500,
                        message: "Error occurred during transaction.",
                        error: error.message,
                    });
                }
                // let agency = new this.Agency({
                //     code,
                //     name,
                //     admin: userId,
                //     managerCode,
                //     tel,
                //     districtId,
                //     districtTitle,
                //     rating,
                //     address,
                //     lat,
                //     lng,
                //     cityId: cityCode,
                // });
                // await agency.save();

                // const rules = [];

                // for (const text of textValues) {
                //     rules.push({
                //         agencyId: agency._id,
                //         type: "student",
                //         show: true,
                //         rule: text,
                //     });
                // }
                // await this.Rule.insertMany(rules);
                // const doIt=await this.setFirstCodeHesab(agency._id);
                // const doIt2=await this.setFirstListAcc(agency._id);

                // return this.response({
                //     res,
                //     data: agency._id,
                // });
            } else {
                let agency = await this.Agency.findByIdAndUpdate(id, {
                    name,
                    admin: userId,
                    managerCode,
                    tel,
                    districtId,
                    districtTitle,
                    rating,
                    address,
                    location: { type: "Point", coordinates: location },
                    cityId: cityCode,
                });
                const serviceCost = await this.Invoice.findOne({
                    agencyId: agency._id,
                    type: "serviceCost",
                });
                if (!serviceCost) {
                    await new this.Invoice({
                        title: "هزینه سرویس",
                        confirmInfo: true,
                        agencyId: agency._id,
                        setter: userId,
                        type: "serviceCost",
                        amount: 0,
                    }).save({ session });
                }
                let invoice = await this.Invoice.findOne({
                    agencyId: agency._id,
                    type: "registration",
                });
                if (!invoice) {
                    let vv = new this.Invoice({
                        title: "هزینه ثبت نام",
                        agencyId: agency._id,
                        setter: userId,
                        listAccCode: " ",
                        listAccName: " ",
                        confirmInfo: true,
                        type: "registration",
                        amount: registrationPrice,
                    });
                    await vv.save();
                } else {
                    await this.Invoice.updateMany(
                        { agencyId: agency._id, type: "registration" },
                        { $set: { amount: registrationPrice, setter: userId } }
                    );
                }

                return this.response({
                    res,
                    data: agency.id,
                });
            }
        } catch (error) {
            console.log("Error while set Agency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setKolMoeendefault(agencyId) {
        try {
            const wallet = "008011000000008",
                cost = "008011000000009",
                charge = "008011000000010";
            const settings = [
                { type: 3, wallet: wallet },
                { type: 3, cost: cost },
                { type: 3, charge: charge },
            ];
            await this.Agency.findByIdAndUpdate(agencyId, { settings });
            return true;
        } catch (error) {
            console.log("Error while set Kol Moeen:", error);
            return false;
        }
    }
    async setKolMoeen(req, res) {
        try {
            const { agencyId, wallet, cost, charge } = req.body;
            let listacc = await this.ListAcc.findOne({
                code: wallet,
                agencyId,
            });
            let listacc2 = await this.ListAcc.findOne({ code: cost, agencyId });
            let listacc3 = await this.ListAcc.findOne({
                code: charge,
                agencyId,
            });

            if (!listacc) {
                return this.response({
                    res,
                    code: 404,
                    message: "wallet listacc not find",
                });
            }
            if (!listacc2) {
                return this.response({
                    res,
                    code: 404,
                    message: "cost listacc not find",
                });
            }
            if (!listacc3) {
                return this.response({
                    res,
                    code: 404,
                    message: "charge listacc not find",
                });
            }
            let level = await this.LevelAccDetail.findOne({
                accCode: listacc.codeLev3,
                agencyId,
            });
            let level2 = await this.LevelAccDetail.findOne({
                accCode: listacc2.codeLev3,
                agencyId,
            });
            let level3 = await this.LevelAccDetail.findOne({
                accCode: listacc3.codeLev3,
                agencyId,
            });
            if (!level) {
                return this.response({
                    res,
                    code: 404,
                    message: "wallet level not find",
                });
            }
            if (!level2) {
                return this.response({
                    res,
                    code: 404,
                    message: "cost level not find",
                });
            }
            if (!level3) {
                return this.response({
                    res,
                    code: 404,
                    message: "charge level not find",
                });
            }
            listacc.canEdit = false;
            listacc2.canEdit = false;
            listacc3.canEdit = false;
            await listacc.save();
            await listacc2.save();
            await listacc3.save();
            level.levelType = 3;
            level2.levelType = 3;
            level3.levelType = 3;
            await level.save();
            await level2.save();
            await level3.save();

            // let agency=await this.Agency.findById(agencyId);
            const settings = [
                { type: 3, wallet: wallet },
                { type: 3, cost: cost },
                { type: 3, charge: charge },
            ];
            await this.Agency.findByIdAndUpdate(agencyId, { settings });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.log("Error while set Kol Moeen:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setDefHeaderLine(req, res) {
        try {
            const { agencyId, title, code } = req.body;

            const setter = req.user._id;
            let agencySet = await this.AgencySet.findOne({
                agencyId: ObjectId.createFromHexString(agencyId),
            });
            if (!agencySet) {
                const showFirstCostToStudent = false;
                const showCostToDriver = true;
                const formula = "a-(a*(b/100))";
                const formulaForStudent = false;
                agencySet = new this.AgencySet({
                    agencyId,
                    setter,
                    showFirstCostToStudent,
                    showCostToDriver,
                    formula,
                    formulaForStudent,
                });
                await agencySet.save();
            }

            if (title === "merchentId") {
                await this.AgencySet.findByIdAndUpdate(agencySet._id, {
                    merchentId: code,
                });
            } else if (title === "tId") {
                await this.AgencySet.findByIdAndUpdate(agencySet._id, {
                    tId: code,
                });
            } else if (title === "bank") {
                await this.AgencySet.findByIdAndUpdate(agencySet._id, {
                    bank: code,
                });
            } else {
                let listacc = await this.ListAcc.findOne({
                    code: code,
                    agencyId,
                });

                console.log("title", title);
                if (!listacc) {
                    return this.response({
                        res,
                        code: 404,
                        message: title + " listacc not find",
                    });
                }
                listacc.canEdit = false;
                await listacc.save();
                await this.AgencySet.findByIdAndUpdate(agencySet._id, {
                    $pull: { defHeadLine: { title: title } },
                });
                await this.AgencySet.findByIdAndUpdate(agencySet._id, {
                    $push: { defHeadLine: { title: title, code: code } },
                });
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.log("Error while setDefHeaderLine:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getKolMoeenAgency(req, res) {
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
            const agency = await this.Agency.findById(agencyId, "settings");

            return this.response({
                res,
                data: agency,
            });
        } catch (error) {
            console.log("Error while get Kol Moeen Agency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async addSchoolToAgency(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const schoolId = req.body.schoolId;
            const isRemove = req.body.isRemove;
            let school = await this.School.findById(schoolId);
            if (!school) {
                return this.response({
                    res,
                    code: 404,
                    message: "school not find",
                    data: { fa_m: "پیدا نشد" },
                });
            }

            if (isRemove) {
                school.agencyId = null;
                await school.save();
                return this.response({
                    res,
                    message: "removed",
                });
            }
            const agency = await this.Agency.findById(agencyId);
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not find",
                    data: { fa_m: "پیدا نشد" },
                });
            }
            school.agencyId = agency._id;
            await school.save();
            return this.response({
                res,
                message: "added",
            });
        } catch (error) {
            console.log("Error while addschooltoagency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async addSchoolToMyAgency(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const schoolId = req.body.schoolId;
            let agency = await this.Agency.findById(agencyId);
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "not find",
                    data: { fa_m: "پیدا نشد" },
                });
            }
            let school = await this.School.findById(schoolId);
            if (!school) {
                return this.response({
                    res,
                    code: 404,
                    message: "school not find",
                    data: { fa_m: "پیدا نشد" },
                });
            }

            school.agencyId = agency._id;
            await school.save();
            return this.response({
                res,
                message: "added",
            });
        } catch (error) {
            console.log("Error while addSchoolToMyAgency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async removeSchoolFromAgency(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const schoolId = req.body.schoolId;
            console.log("removeSchoolFromAgency agencyId", agencyId);
            console.log("removeSchoolFromAgency schoolId", schoolId);
            const student = await this.Student.findOne(
                {
                    school: schoolId,
                    delete: false,
                    state: 4,
                },
                ""
            );
            // const service=await this.Service.find({schoolId,delete:false,agencyId},'id');

            if (student) {
                let school = await this.School.findById(schoolId);
                if (!school) {
                    return this.response({
                        res,
                        code: 404,
                        message: "school not find",
                        data: { fa_m: "پیدا نشد" },
                    });
                }

                school.agencyId = null;
                await school.save();
                return this.response({
                    res,
                    message: "removed",
                });
            }

            return this.response({
                res,
                code: 204,
                message: "school has service",
                data: { fa_m: "دانش آموزی در این شرکت داری سرویس است" },
            });
        } catch (error) {
            console.log("Error while remove school from Agency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async dashboardCompany(req, res) {
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
            console.log("agencyId", agencyId);
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
                "rating address settings"
            );
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "your agency is delete maybe",
                    data: { fa_m: "احتمالا شرکت شما حذف شده است" },
                });
            }
            const wallet = agency.settings.find(
                (obj) => obj.wallet != undefined
            ).wallet;
            let mandeh = 0;
            // const result = await this.DocListSanad.aggregate([
            //     {
            //         $match: {
            //             accCode: wallet,
            //             agencyId: agencyId,
            //         },
            //     },
            //     {
            //         $group: {
            //             _id: null,
            //             total: {
            //                 $sum: {
            //                     $subtract: ["$bed", "$bes"],
            //                 },
            //             },
            //         },
            //     },
            // ]);
            // // console.log("result",result);
            // mandeh = result[0]?.total || 0;

            let schools = await this.School.find(
                { agencyId, delete: false },
                "code name typeTitle genderTitle districtTitle districtId"
            ).lean();
            for (var school of schools) {
                const stAll = await this.Student.countDocuments({
                    school: school._id,
                    delete: false,
                    active: true,
                });
                const stHas = await this.Student.countDocuments({
                    school: school._id,
                    delete: false,
                    active: true,
                    state: 4,
                });

                let sc = {
                    school,
                    stAll,
                    stHas,
                };
                schools.push(sc);
            }

            console.log("schools", JSON.stringify(schools));
            const services = await this.Service.find(
                { agencyId, delete: false },
                "cost distance serviceNum student driverId"
            );
            const reports = await this.StReport.find(
                { agencyId, state: 0, delete: false },
                "createdAt desc grade"
            )
                .limit(8)
                .sort({ _id: -1 });

            let drivers = [];

            const driversList = await this.Driver.find(
                { agencyId, delete: false },
                "userId driverCode pic active"
            );
            for (var s in driversList) {
                let user = await this.User.findById(
                    driversList[s].userId,
                    "name lastName"
                );
                if (!user) continue;
                drivers.push({
                    id: driversList[s].id,
                    active: driversList[s].active,
                    name: user.name,
                    lastName: user.lastName,
                    driverCode: driversList[s].driverCode,
                    pic: driversList[s].pic,
                });
            }
            console.log("driversList", driversList);
            // const sanadCount=await this.DocSanad.countDocuments({agencyId})

            return this.response({
                res,
                data: { schools, services, drivers, reports, mandeh },
            });
        } catch (error) {
            console.error("Error while in dashboard company:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async dashboardAgency(req, res) {
        console.log("dashboardAgencydashboardAgencydashboardAgency");
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
            console.log("agencyId", agencyId);
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
                "rating address settings"
            );
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "your agency is delete maybe",
                    data: { fa_m: "احتمالا شرکت شما حذف شده است" },
                });
            }
            let mandeh = -1;

            let schoolsList = await this.School.find(
                { agencyId: agencyId },
                "code name typeTitle genderTitle districtTitle districtId location.coordinates"
            );
            // console.log("schoolsList", schoolsList);
            let schools = [];
            for (var s of schoolsList) {
                const stAll = await this.Student.countDocuments({
                    school: s._id,
                    delete: false,
                    active: true,
                });
                const stHas = await this.Student.countDocuments({
                    school: s._id,
                    delete: false,
                    active: true,
                    state: 4,
                });

                let sc = {
                    school: s,
                    stAll,
                    stHas,
                };
                schools.push(sc);
            }
            const serviceCount = await this.Service.countDocuments({
                agencyId,
                delete: false,
            });
            console.log("serviceCount", serviceCount);
            // console.log("schools", JSON.stringify(schools));
            // const services = await this.Service.find(
            //     { agencyId, delete: false },
            //     "cost distance serviceNum student driverId"
            // );
            const reports = await this.StReport.find(
                { agencyId, state: 0, delete: false },
                "createdAt text grade"
            )
                .limit(8)
                .sort({ _id: -1 });

            let drivers = [];

            // const driversList = await this.Driver.find(
            //     { agencyId, delete: false },
            //     "userId driverCode pic active"
            // );
            // for (var s in driversList) {
            //     let user = await this.User.findById(
            //         driversList[s].userId,
            //         "name lastName"
            //     );
            //     if (!user) continue;
            //     drivers.push({
            //         id: driversList[s].id,
            //         active: driversList[s].active,
            //         name: user.name,
            //         lastName: user.lastName,
            //         driverCode: driversList[s].driverCode,
            //         pic: driversList[s].pic,
            //     });
            // }
            // const sanadCount=await this.DocSanad.countDocuments({agencyId})
            const sanadCount0 = await this.Student.countDocuments({
                state: 0,
                agencyId,
                delete: false,
            });
            const sanadCount1 = await this.Student.countDocuments({
                state: 1,
                agencyId,
                delete: false,
            });
            const sanadCount2 = await this.Student.countDocuments({
                state: 2,
                agencyId,
                delete: false,
            });
            const sanadCount3 = await this.Student.countDocuments({
                state: 3,
                agencyId,
                delete: false,
            });
            const sanadCount4 = await this.Student.countDocuments({
                state: 4,
                agencyId,
                delete: false,
            });
            const student0 = [];
            for (let i = 0; i < 10; i++) {
                const ss = await this.Student.countDocuments({
                    state: { $in: [0, 1] },
                    agencyId,
                    delete: false,
                    createdAt: {
                        $gte: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(0, 0, 0, 0),
                        $lt: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(23, 59, 59, 999),
                    },
                });
                student0.push(ss);
            }
            const student2 = [];
            for (let i = 0; i < 10; i++) {
                const ss = await this.Student.countDocuments({
                    state: 2,
                    agencyId,
                    delete: false,
                    createdAt: {
                        $gte: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(0, 0, 0, 0),
                        $lt: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(23, 59, 59, 999),
                    },
                });
                student2.push(ss);
            }
            const student3 = [];
            for (let i = 0; i < 10; i++) {
                const ss = await this.Student.countDocuments({
                    state: 3,
                    agencyId,
                    delete: false,
                    createdAt: {
                        $gte: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(0, 0, 0, 0),
                        $lt: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(23, 59, 59, 999),
                    },
                });
                student3.push(ss);
            }
            const student4 = [];
            for (let i = 0; i < 10; i++) {
                const ss = await this.Student.countDocuments({
                    state: 4,
                    agencyId,
                    delete: false,
                    createdAt: {
                        $gte: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(0, 0, 0, 0),
                        $lt: new Date(
                            new Date().setDate(new Date().getDate() - i)
                        ).setHours(23, 59, 59, 999),
                    },
                });
                student4.push(ss);
            }
            return this.response({
                res,
                data: {
                    schools,
                    services: [],
                    drivers,
                    reports,
                    mandeh,
                    serviceCount,
                    student0,
                    student2,
                    student3,
                    student4,
                    sanadCount0,
                    sanadCount1,
                    sanadCount2,
                    sanadCount3,
                    sanadCount4,
                },
            });
        } catch (error) {
            console.error("Error while dashboard Agency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getInfoCompany(req, res) {
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
                "name tel registrationNumber address location.coordinates nationalID districtId districtTitle confirmInfo confirmInfoExp licensePic confirmLicensePic pic startLicenceDate endLicenceDate"
            );
            if (!agency) {
                return this.response({
                    res,
                    code: 204,
                    message: "your agency is delete maybe",
                    data: { fa_m: "احتمالا شرکت حذف شده است" },
                });
            }

            return this.response({
                res,
                data: agency,
            });
        } catch (error) {
            console.error("Error while get infoCampany:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async dashboardSchool(req, res) {
        try {
            if (
                req.query.schoolId === undefined ||
                req.query.schoolId.trim() === ""
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "schoolId need",
                });
            }
            const schoolId = req.query.schoolId;
            const school = await this.School.findById(schoolId).lean();
            // console.log("schoolId",schoolId)
            const agency = await this.Agency.findById(
                school.agencyId,
                "code name tel rating admin districtTitle address location.coordinates active"
            );
            // const paymetns = await this.Payment.find({ payId: schoolId });
            const students = await this.Student.find({
                school: schoolId,
                state: 0,
            });

            return this.response({
                res,
                data: { agency, paymetns: [], students },
            });
        } catch (error) {
            console.error("Error in dashboard School:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async dashboardAdmin(req, res) {
        try {
            const schools = await this.School.countDocuments({ delete: false });
            const users = await this.User.countDocuments({ delete: false });
            const drivers = await this.Driver.countDocuments({ delete: false });
            const agencys = await this.Agency.countDocuments({ delete: false });

            const students = await this.Student.countDocuments({
                delete: false,
            });
            const services = await this.Service.countDocuments({
                delete: false,
            });
            const confirmCompany = await this.Agency.countDocuments({
                $or: [{ confirmInfo: 1 }, { confirmLicensePic: 1 }],
            });
            const reports = await this.SchReport.find(
                { state: 0, delete: false },
                "createdAt desc"
            );

            const co = await this.Agency.find(
                { delete: false },
                "name active code"
            );

            let coInfo = [];
            for (var i in co) {
                const schs = await this.School.countDocuments({
                    agencyId: co[i]._id,
                    delete: false,
                });

                const coDrivers = await this.Driver.countDocuments({
                    delete: false,
                    agencyId: co[i].id,
                });
                // let serv = await this.Service.find(
                //     { delete: false, agencyId: co[i].id },
                //     "student cost"
                // );
                // let allSt = 0,
                //     allCost = 0;
                // for (var j in serv) {
                //     allSt += serv[j].student.length;
                //     allCost += serv[j].cost;
                // }
                const allSt = await this.Student.countDocuments({
                    agencyId: co[i].id,
                    delete: false,
                });
                const serv = await this.Service.countDocuments({
                    agencyId: co[i].id,
                    delete: false,
                });
                let info = {
                    name: co[i].name,
                    active: co[i].active,
                    code: co[i].code,
                    coDrivers: coDrivers,
                    allStudent: allSt,
                    allCosts: 0,
                    schoolCount: schs,
                    serviceCount: serv,
                };
                coInfo.push(info);
            }

            return this.response({
                res,
                data: {
                    users,
                    schools,
                    services,
                    drivers,
                    agencys,
                    students,
                    coInfo,
                    reports,
                    confirmCompany,
                },
            });
        } catch (error) {
            console.error("Error in dashboard admin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async agencyById(req, res) {
        try {
            if (req.query.id === undefined) {
                return res.status(214).json({ msg: "id need" });
            }
            let agency = await this.Agency.findById(req.query.id);
            if (!agency) {
                return res.status(404).json({ msg: "agency not find" });
            }

            let user;
            if (agency.admin !== null && req.user.isadmin) {
                user = await this.User.findById(
                    school.admin,
                    "phone userName active name lastName isAgencyAdmin"
                );
            }

            return this.response({
                res,
                message: "ok",
                data: { agency, user },
            });
        } catch (error) {
            console.error("Error in agencyById:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async simpleAgencyById(req, res) {
        try {
            if (req.query.id === undefined) {
                return res.status(214).json({ msg: "id need" });
            }
            let agency = await this.Agency.findById(
                req.query.id,
                "name tel location.coordinates active pic address"
            );

            return this.response({
                res,
                data: agency,
            });
        } catch (error) {
            console.error("Error in simpleAgencyById:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async agencySettingById(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }
            let agencySet = await this.AgencySet.findOne({
                agencyId: ObjectId.createFromHexString(req.query.agencyId),
            });
            if (!agencySet) {
                const showFirstCostToStudent = false;
                const showCostToDriver = true;
                const formula = "a-(a*(b/100))";
                const formulaForStudent = false;
                agencySet = new this.AgencySet({
                    agencyId,
                    setter,
                    showFirstCostToStudent,
                    showCostToDriver,
                    formula,
                    formulaForStudent,
                    openOpinion: {
                        1: false,
                        2: false,
                        3: false,
                        4: false,
                        5: false,
                        6: false,
                        7: false,
                        8: false,
                        9: false,
                        10: false,
                        11: false,
                        12: false,
                    },
                });
                await agencySet.save();
            }
            if (agencySet.formula === "") {
                agencySet.formula = "a-(a*(b/100))";
            }
            if (!agencySet.openOpinion) {
                agencySet.openOpinion = {
                    1: false,
                    2: false,
                    3: false,
                    4: false,
                    5: false,
                    6: false,
                    7: false,
                    8: false,
                    9: false,
                    10: false,
                    11: false,
                    12: false,
                };
            }

            return this.response({
                res,
                data: agencySet,
            });
        } catch (error) {
            console.error("Error in agency SettingById:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setAgencySetting(req, res) {
        try {
            let {
                agencyId,
                showFirstCostToStudent,
                showCostToDriver,
                formula,
                formulaForStudent,
            } = req.body;

            const setter = req.user._id;

            let agencySet = await this.AgencySet.findOne({
                agencyId: ObjectId.createFromHexString(agencyId),
            });
            if (!agencySet) {
                if (showFirstCostToStudent === null)
                    showFirstCostToStudent = false;
                if (showCostToDriver === null) showCostToDriver = true;
                if (formula === null || formula === "")
                    formula = "a-(a*(b/100))";
                if (formulaForStudent === null) formulaForStudent = false;
                agencySet = new this.AgencySet({
                    agencyId,
                    setter,
                    showFirstCostToStudent,
                    showCostToDriver,
                    formula,
                    formulaForStudent,
                });
            } else {
                agencySet.setter = setter;
                if (showFirstCostToStudent != null)
                    agencySet.showFirstCostToStudent = showFirstCostToStudent;
                if (showCostToDriver != null)
                    agencySet.showCostToDriver = showCostToDriver;
                if (formula != null || formula === "")
                    agencySet.formula = formula;
                if (formulaForStudent != null)
                    agencySet.formulaForStudent = formulaForStudent;
            }
            await agencySet.save();

            return this.response({
                res,
                data: agencySet,
            });
        } catch (error) {
            console.error("Error in setAgencySetting:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setAgencySettingOpinion(req, res) {
        try {
            let { agencyId, id, active } = req.body;

            const setter = req.user._id;

            let agencySet = await this.AgencySet.findOne({
                agencyId: ObjectId.createFromHexString(agencyId),
            });
            if (!agencySet) {
                return this.response({
                    res,
                    code: 404,
                    message: "agencySet not find",
                    data: { fa_m: "پیدا نشد" },
                });
            }

            await this.AgencySet.findOneAndUpdate(
                { agencyId: ObjectId.createFromHexString(agencyId) },
                { [`openOpinion.${id}`]: active },
                { new: true }
            );

            return this.response({
                res,
                message:'ok',
            });
        } catch (error) {
            console.error("Error in setAgencySettingOpinion:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async findAgencyBySchoolId(req, res) {
        try {
            if (req.query.id === undefined) {
                return res.status(214).json({ msg: "id need" });
            }
            const schoolId = ObjectId.createFromHexString(req.query.id);
            const school = await this.School.findById(schoolId).lean();
            if (!school) {
                return this.response({
                    res,
                    message: "school not found",
                });
            }
            const agency = await this.Agency.findById(
                school.agencyId,
                "code name tel pic active address location.coordinates"
            );

            return this.response({
                res,
                message: "ok",
                data: agency,
            });
        } catch (error) {
            console.error("Error in findAgencyBySchoolId:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async updateAgencyInfo(req, res) {
        try {
            const id = req.body.id;
            let agency = await this.Agency.findById(id);
            if (!agency) {
                return this.response({
                    res,
                    code: 405,
                    message: "company not find",
                    data: { fa_m: "شرکت پیدا نشد!" },
                });
            }
            if (agency.delete) {
                return this.response({
                    res,
                    code: 405,
                    message: "company is deleted",
                    data: { fa_m: "شرکت حذف شده است!" },
                });
            }

            // console.log("req.body=",req.body);
            if (req.body.name != undefined) {
                if (agency.name != req.body.name) {
                    agency.confirmInfo = 1; //
                }
                agency.name = req.body.name;
            }
            if (req.body.tel != undefined) {
                agency.tel = req.body.tel;
            }
            if (req.body.districtId != undefined) {
                agency.districtId = req.body.districtId;
            }
            if (req.body.districtTitle != undefined) {
                agency.districtTitle = req.body.districtTitle;
            }
            if (req.body.address != undefined) {
                agency.address = req.body.address;
            }
            if (req.body.location != undefined) {
                agency.location = {
                    type: "Point",
                    coordinates: req.body.location,
                };
            }
            if (req.body.registrationNumber != undefined) {
                if (agency.registrationNumber != req.body.registrationNumber) {
                    agency.confirmInfo = 1; //
                }
                agency.registrationNumber = req.body.registrationNumber;
            }
            if (req.body.nationalID != undefined) {
                if (agency.nationalID != req.body.nationalID) {
                    agency.confirmInfo = 1; //
                }
                agency.nationalID = req.body.nationalID;
            }
            if (req.body.cityId != undefined) {
                agency.cityId = req.body.cityId;
            }
            if (req.body.pic != undefined) {
                agency.pic = req.body.pic;
            }
            if (req.body.licensePic != undefined) {
                if (agency.licensePic != req.body.licensePic) {
                    agency.confirmLicensePic = 1; //
                }
                agency.licensePic = req.body.licensePic;
            }
            if (req.body.startLicenceDate != undefined) {
                if (agency.startLicenceDate != req.body.startLicenceDate) {
                    agency.confirmInfo = 1; //
                }
                agency.startLicenceDate = req.body.startLicenceDate;
            }
            if (req.body.endLicenceDate != undefined) {
                if (agency.endLicenceDate != req.body.endLicenceDate) {
                    agency.confirmInfo = 1; //
                }
                agency.endLicenceDate = req.body.endLicenceDate;
            }

            await agency.save();

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in updateAgencyInfo:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async updateConfirmAgency(req, res) {
        try {
            const id = req.body.id;
            let agency = await this.Agency.findById(id);
            if (!agency) {
                return this.response({
                    res,
                    code: 405,
                    message: "agency not find",
                    data: { fa_m: "شرکت پیدا نشد!" },
                });
            }
            if (agency.delete) {
                return this.response({
                    res,
                    code: 405,
                    message: "agency is delete",
                    data: { fa_m: "شرکت حذف شده است!" },
                });
            }

            if (req.body.confirmInfo != undefined) {
                agency.confirmInfo = req.body.confirmInfo;
            }
            if (req.body.confirmInfoExp != undefined) {
                agency.confirmInfoExp = req.body.confirmInfoExp;
            }
            if (req.body.confirmLicensePic != undefined) {
                agency.confirmLicensePic = req.body.confirmLicensePic;
            }
            if (req.body.active != undefined) {
                agency.active = req.body.active;
            }

            await agency.save();

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in updateConfirmAgency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async agencyList(req, res) {
        try {
            const cityId = req.query.cityId || "0";
            const agencies = await this.Agency.find({
                delete: false,
                cityId: parseInt(cityId),
            }).lean();

            for (var i = 0; i < agencies.length; i++) {
                // console.log(JSON.stringify(students[i]));
                let user = await this.User.findById(agencies[i].admin);
                if (user) {
                    agencies[i].userData = {
                        phone: user.phone,
                        userName: user.userName,
                        name: user.name,
                        lastName: user.lastName,
                    };
                } else {
                    agencies[i].userData = {
                        phone: "",
                        userName: "",
                        name: "",
                        lastName: "",
                    };
                }
                const invoice = await this.Invoice.findOne({
                    agencyId: agencies[i]._id,
                    type: "registration",
                }).lean();
                let registrationPrice = 0;
                if (invoice) {
                    registrationPrice = invoice.amount;
                }

                const schoolsX = await this.School.find({
                    agencyId: agencies[i]._id,
                    delete: false,
                }).lean();
                let schoolData = [];
                // for (var j = 0; j < schoolsX.length; j++) {
                //     // const school = await this.School.findById(
                //     //     schools[j]
                //     // );
                //     // if (!school) break;
                //     const school = schoolsX[j];
                //     schoolData.push({
                //         _id: school.id,
                //         code: school.code,
                //         name: school.name,
                //         address: school.address,
                //         districtTitle: school.districtTitle,
                //         gender: school.gender,
                //         lat: school.location.coordinates[0],
                //         lng: school.location.coordinates[1],
                //     });
                // }
                agencies[i].schools = schoolData;
                agencies[i].registrationPrice = registrationPrice;
            }
            return this.response({
                res,
                data: agencies,
            });
        } catch (error) {
            console.error("Error in agencyList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async allAgencies(req, res) {
        try {
            const agencies = await this.Agency.find(
                { delete: false, active: true },
                "code name"
            );
            return this.response({
                res,
                data: agencies,
            });
        } catch (error) {
            console.error("Error in allAgencies:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async myAgency(req, res) {
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
            const agency = await this.Agency.findById(
                agencyId,
                "activeHasiban coNum"
            );
            let banks = [];
            if (agency) {
                if (agency.activeHasiban) {
                    const banksInfo = await this.BankInfo.find(
                        { agencyId: agencyId },
                        "iranBankId"
                    ).lean();
                    for (var b of banksInfo) {
                        let bank = await this.Bank.findOne({
                            sign: b.iranBankId,
                        }).lean();
                        if (bank) {
                            bank._id = b._id;
                            banks.push(bank);
                        }
                    }
                }
            }

            return this.response({
                res,
                data: { agency, banks },
            });
        } catch (error) {
            console.error("Error in myAgency:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async companyWithDrivers(req, res) {
        try {
            const agencies = await this.Agency.find(
                { delete: false },
                "code name districtTitle active pic"
            );
            let companies = [];
            for (var i = 0; i < agencies.length; i++) {
                let drivers = await this.Driver.countDocuments({
                    delete: false,
                    agencyId: agencies[i].id,
                });
                let services = await this.Service.countDocuments({
                    delete: false,
                    agencyId: agencies[i].id,
                });
                companies.push({
                    drivers: drivers,
                    services: services,
                    company: agencies[i],
                });
            }
            return this.response({
                res,
                data: companies,
            });
        } catch (error) {
            console.error("Error in companyWithDrivers:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async agencyActive(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const active = req.body.active;
            await this.Agency.findByIdAndUpdate(agencyId, { active });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in agencyActive:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setContractText(req, res) {
        try {
            const agencyId = req.body.agencyId;
            const active = req.body.active;
            const text = req.body.text;
            const needService = req.body.needService;
            const contract = await this.ContractText.findOne({ agencyId });
            if (contract) {
                await this.ContractText.findByIdAndUpdate(contract._id, {
                    text,
                    active,
                    needService,
                });
            } else {
                await new this.ContractText({
                    agencyId,
                    text,
                    active,
                    needService,
                }).save();
            }
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in setContractText:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getContractText(req, res) {
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
            const contract = await this.ContractText.findOne({ agencyId });

            return this.response({
                res,
                data: contract,
            });
        } catch (error) {
            console.error("Error in getContractText:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getDefHeaderLine(req, res) {
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
            let contract = await this.AgencySet.findOne(
                { agencyId },
                "defHeadLine merchentId tId bank"
            );
            if (!contract) {
                const showFirstCostToStudent = false;
                const showCostToDriver = true;
                const formula = "a-(a*(b/100))";
                const formulaForStudent = false;
                contract = new this.AgencySet({
                    agencyId,
                    setter: req.user._id,
                    showFirstCostToStudent,
                    showCostToDriver,
                    formula,
                    formulaForStudent,
                });
                await contract.save();
            }
            contract.defHeadLine.merchentId = contract.merchentId;
            contract.defHeadLine.tId = contract.tId;
            contract.defHeadLine.bank = contract.bank;

            return this.response({
                res,
                data: contract.defHeadLine,
            });
        } catch (error) {
            console.error("Error in getDefHeaderLine:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();

function isEmpty(value) {
    return (
        value == null ||
        (typeof value === "string" && value.trim().length === 0)
    );
}

function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}
