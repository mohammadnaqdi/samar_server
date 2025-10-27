const { Keys, CounterKey } = require("../src/models/keys");
// const Day = require("../src/models/days");
const School = require("../src/models/school");
const Student = require("../src/models/student");
const { Agency } = require("../src/models/agency");
const { Driver } = require("../src/models/driver");
const Car = require("../src/models/car");
const { Service, PriceTable } = require("../src/models/service");
const Rule = require("../src/models/rules");
const { LevelAcc, Bank } = require("../src/models/levels");
const { BankGate, PayGate } = require("../src/models/banks");
const { DDS } = require("../src/models/dds");
// const { DocListSanad } = require("../src/models/hasiban");
// const { DriverAct } = require("../src/models/location");
// const { User } = require("../src/models/user");
// const { Service } = require("../src/models/service");

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

module.exports = async function (mongoose) {
    const DB = process.env.DB_ADDRESS6;
    console.log("Database connected to :", DB);
    await mongoose
        .connect(DB)
        .then(function () {
            return console.log("mongodb Connected!");
        })
        .catch(() => console.log("mongodb dont Connected!!"));

    // if (true) {
    //     let ddsZero = await DDS.find({
    //         "service.students.cost": 0,
    //     });
    //     console.log("dds Zero", ddsZero.length);
    //     let notfindStudent = 0;
    //     let notfindDriverOrSchool = 0;
    //     let notfindCar = 0;
    //     let notfindPrice = 0;
    //     for (var dds of ddsZero) {
    //         let ddsAll = 0;
    //         let scAll = 0;
    //         for (var service of dds.service) {
    //             service.serviceCost = 0;
    //             service.driverShare = 0;
    //             for (var st of service.students) {
    //                 if (st.cost < 100000 || st.driverCost < 100000) {
    //                     const student = await Student.findById(
    //                         st.id,
    //                         "serviceDistance school studentCode"
    //                     );
    //                     if (!student) {
    //                         notfindStudent++;
                           
    //                         continue;
    //                     }

    //                     const [school, driver] = await Promise.all([
    //                         School.findById(
    //                             student.school,
    //                             "districtId grade"
    //                         ).lean(),
    //                         Driver.findById(dds.driverId, "carId").lean(),
    //                     ]);
    //                     if (!school || !driver) {
    //                         notfindDriverOrSchool++;
    //                         continue;
    //                     }
    //                     const car = await Car.findById(
    //                         driver.carId,
    //                         "capacity"
    //                     ).lean();
    //                     if (!car) {
    //                         notfindCar++;
    //                         continue;
    //                     }
    //                     const carId = car.capacity;
    //                     const { districtId, grade } = school;
    //                     const query = [
    //                         {
    //                             agencyId: dds.agencyId,
    //                         },
    //                         { delete: false },
    //                         {
    //                             $or: [
    //                                 { districtId },
    //                                 {
    //                                     districtId: 0,
    //                                 },
    //                             ],
    //                         },
    //                         {
    //                             $or: [
    //                                 {
    //                                     gradeId: {
    //                                         $in: grade,
    //                                     },
    //                                 },
    //                                 { gradeId: 0 },
    //                             ],
    //                         },
    //                     ];
    //                     if (carId && carId != 0) {
    //                         query.push({ carId });
    //                     }

    //                     const pricingTable = await PriceTable.find(
    //                         { $and: query },
    //                         "kilometer studentAmount driverAmount -_id"
    //                     )
    //                         .sort({
    //                             kilometer: 1,
    //                         })
    //                         .lean();
    //                     if (pricingTable.length > 0) {
    //                         const matchedPricing = pricingTable.find(
    //                             (priceItem) =>
    //                                 priceItem.kilometer * 1000 >=
    //                                 student.serviceDistance
    //                         );
    //                          console.log("find mathc", student.studentCode);
    //                         if (matchedPricing) {
    //                             st.cost = matchedPricing.studentAmount;
    //                             st.driverCost = matchedPricing.driverAmount;
    //                         }
    //                     } else {
    //                         notfindPrice++;
    //                     }
    //                 }
    //                 service.driverShare = service.driverShare + st.driverCost;
    //                 service.serviceCost = service.serviceCost + st.cost;
    //             }
    //             ddsAll=ddsAll+service.driverShare;
    //             scAll=scAll+service.serviceCost;
    //         }
    //         dds.sc=scAll/30;
    //         dds.dds=ddsAll/30;
    //         dds.markModified("service");
    //         await dds.save();

    //     }
    //      console.log("notfindStudent", notfindStudent);
    //      console.log("notfindDriverOrSchool", notfindDriverOrSchool);
    //      console.log("notfindCar", notfindCar);
    //      console.log("notfindPrice", notfindPrice);
    // }
    // if (true) {
    // const driverActs = await DriverAct.find({
    //     driverCode: { $regex: /^1/ },
    // });
    // for (var st of driverActs) {
    //     const service = await Service.findOne({serviceNum:st.serviceId}, "driverId");
    //     if (!service) {
    //         console.error("service not find ", st._id);
    //         continue;
    //     }
    //     const driver = await Driver.findById(service.driverId,'driverCode');
    //     if (!driver) {
    //         console.error("driver not find ", st._id);
    //         continue;
    //     }
    //     await DriverAct.findByIdAndUpdate(st._id,{
    //         driverCode:driver.driverCode
    //     })
    //     console.log("driver update ",st.driverCode+' to '+ driver.driverCode);

    // }
    // const students = await Student.find({
    //     driverCode: { $regex: /^1/ },
    //     state: 4,
    //     delete: false,
    // });
    // for (var st of students) {
    //     const service = await Service.findById(st.service, "driverId");
    //     if (!service) {
    //         console.error("service not find ", st._id);
    //         continue;
    //     }
    //     const driver = await Driver.findById(service.driverId,'driverCode');
    //     if (!driver) {
    //         console.error("driver not find ", st._id);
    //         continue;
    //     }
    //     await Student.findByIdAndUpdate(st._id,{
    //         driverCode:driver.driverCode
    //     })
    //     console.log("driver update ",st.driverCode+' to '+ driver.driverCode);

    // }
    // const drivers = await Driver.find({
    //     driverCode: { $regex: /^1/ },
    // }).lean();
    // console.log("find drivers", drivers.length);
    // for (var driver of drivers) {
    //     const doc = await DocListSanad.find({
    //         accCode: "004006" + driver.driverCode,
    //     });
    //     if (!doc.length) {
    //         const user = await User.findById(driver.userId, "code").lean();
    //         if (!user) {
    //             console.error("user not find ", driver.driverCode);
    //             continue;
    //         }
    //         const agency = await Agency.findById(driver.agencyId, "code");
    //         if (!agency) {
    //             console.error("agency not find ", driver.driverCode);
    //             continue;
    //         }
    //         await Driver.findByIdAndUpdate(driver._id, {
    //             driverCode: agency.code + user.code,
    //         });
    //         console.log(
    //             "driver  update ",
    //             driver.driverCode + " to " + agency.code + user.code
    //         );
    //     } else {
    //         console.error("driver doc find ", driver.driverCode);
    //     }
    // }
    // }
    // if (true) {
    //     const some = await DDS.find({
    //         "service.driverCost": { $exists: true },
    //     });
    //     console.log("some", some.length);
    //     for (var dd of some) {
    //         let changed = false;
    //         for (var service of dd.service) {
    //             if (service.driverCost && service.driverCost > 0) {
    //                 service.driverShare = service.driverCost;
    //                 changed = true;
    //             }
    //         }
    //         if (changed) {
    //             dd.markModified("service"); // Ensure Mongoose sees array changes
    //             await dd.save();
    //         }
    //     }
    // }
    // if (true) {
    //     const some = await DDS.find();
    //     let zero = [];
    //     let count = 0;
    //     let serviceProblem = [];
    //     let stdentProblem = [];
    //     for (var dd of some) {
    //         let changed = false;
    //         let sc=0;
    //         let dds=0;
    //         for (var service of dd.service) {
    //             if (service.driverShare >= service.serviceCost) {
    //                 let cost = 0;
    //                 let driverCost = 0;
    //                 for (var st of service.students) {
    //                     if (st.cost < 1) {
    //                         const student = await Student.findById(
    //                             st.id,
    //                             "serviceCost driverCost serviceDistance service school"
    //                         ).lean();
    //                         if (student) {
    //                             st.cost = student.serviceCost;
    //                             st.driverCost = student.driverCost;
    //                             if (!st.cost || st.cost < 1) {
    //                                 stdentProblem.push(st.id);
    //                                 if (student.service) {
    //                                     const service = await Service.findById(
    //                                         student.service
    //                                     );
    //                                     if (service) {
    //                                         const [school, driver] =
    //                                             await Promise.all([
    //                                                 School.findById(
    //                                                     student.school,
    //                                                     "districtId grade"
    //                                                 ).lean(),
    //                                                 Driver.findById(
    //                                                     service.driverId,
    //                                                     "carId"
    //                                                 ).lean(),
    //                                             ]);
    //                                         if (school && driver) {
    //                                             const car = await Car.findById(
    //                                                 driver.carId,
    //                                                 "capacity"
    //                                             ).lean();
    //                                             if (car) {
    //                                                 const carId = car.capacity;
    //                                                 const {
    //                                                     districtId,
    //                                                     grade,
    //                                                 } = school;
    //                                                 const query = [
    //                                                     {
    //                                                         agencyId:
    //                                                             dd.agencyId,
    //                                                     },
    //                                                     { delete: false },
    //                                                     {
    //                                                         $or: [
    //                                                             { districtId },
    //                                                             {
    //                                                                 districtId: 0,
    //                                                             },
    //                                                         ],
    //                                                     },
    //                                                     {
    //                                                         $or: [
    //                                                             {
    //                                                                 gradeId: {
    //                                                                     $in: grade,
    //                                                                 },
    //                                                             },
    //                                                             { gradeId: 0 },
    //                                                         ],
    //                                                     },
    //                                                 ];
    //                                                 if (carId && carId != 0) {
    //                                                     query.push({ carId });
    //                                                 }

    //                                                 const pricingTable =
    //                                                     await PriceTable.find(
    //                                                         { $and: query },
    //                                                         "kilometer studentAmount driverAmount -_id"
    //                                                     )
    //                                                         .sort({
    //                                                             kilometer: 1,
    //                                                         })
    //                                                         .lean();
    //                                                 if (
    //                                                     pricingTable.length > 0
    //                                                 ) {
    //                                                     const matchedPricing =
    //                                                         pricingTable.find(
    //                                                             (priceItem) =>
    //                                                                 priceItem.kilometer *
    //                                                                     1000 >=
    //                                                                 student.serviceDistance
    //                                                         );

    //                                                     if (matchedPricing) {
    //                                                         st.cost =
    //                                                             matchedPricing.studentAmount;
    //                                                         st.driverCost =
    //                                                             matchedPricing.driverAmount;
    //                                                         await Student.findByIdAndUpdate(
    //                                                             student._id,
    //                                                             {
    //                                                                 serviceCost:
    //                                                                     matchedPricing.studentAmount,
    //                                                                 driverCost:
    //                                                                     matchedPricing.driverAmount,
    //                                                             }
    //                                                         );
    //                                                     }
    //                                                 }
    //                                             }
    //                                         }
    //                                     }
    //                                 }
    //                             }
    //                         }
    //                     }
    //                     cost = cost + st.cost;
    //                     driverCost = driverCost + st.driverCost;
    //                 }
    //                 service.driverShare = driverCost;
    //                 service.serviceCost = cost;
    //                 count++;
    //                 changed = true;
    //             }
    //             if (!service.driverShare || service.driverShare < 100) {
    //                 zero.push(service.num);
    //             } else if (service.driverShare >= service.serviceCost) {
    //                 serviceProblem.push(service.num);
    //             }
    //             sc=sc+service.serviceCost;
    //             dds=dds+service.driverShare;
    //         }
    //         if (changed) {
    //             dd.sc=sc/30;
    //             dd.dds=dds/30;
    //             dd.markModified("service"); // Ensure Mongoose sees array changes
    //             await dd.save();
    //         }
    //     }
    //     console.log("count", count);
    //     console.log("serviceProblem", serviceProblem);
    //     const unique = [...new Set(zero)];
    //     console.log("zero", unique);
    //     console.log("stdentProblem", stdentProblem);
    // }
    if (false) {
        const count = await PayGate.countDocuments();
        if (count < 1) {
            const bankGate = await BankGate.find();
            let count = 0;
            for (var g of bankGate) {
                let xType = "CARD";
                switch (g.type) {
                    case "MELLAT":
                        xType = "BPM";
                        break;
                    case "SADERAT":
                        xType = "SEPEHR";
                        break;
                    case "ZARIN":
                        xType = "ZARIN";
                        break;
                    case "MEHR":
                        xType = "FCP";
                        break;
                    case "SAMAN":
                        xType = "SEP";
                        break;
                    case "TEJARAT":
                        xType = "PEC";
                        break;
                }
                await PayGate.create({
                    agencyId: g.agencyId,
                    editor: g.editor,
                    bankName: g.bankName,
                    bankCode: g.bankCode,
                    type: xType,
                    card: g.card,
                    terminal: g.terminal,
                    userName: g.userName,
                    userPass: g.userPass,
                    hesab: g.hesab,
                    active: g.active,
                    personal: g.personal,
                    callback: g.callback,
                    schools: [],
                });
                count++;
            }
            console.log(`create ${count} payGates`);
        }
    }

    // if (false) {
    //     const drivers = await Driver.find();
    //     await Promise.all(
    //         drivers.map(async (dr) => {
    //             let driverInfo = await DriverInfo.findOne({ driverId: dr._id });
    //             if (!driverInfo) {
    //                 await new DriverInfo({
    //                     driverId: dr._id,
    //                     location: dr.location,
    //                     address: dr.address,
    //                     birthday: dr.birthday,
    //                     healthPic: dr.healthPic,
    //                     confirmHealthPic: dr.confirmHealthPic,
    //                     technicalDiagPic: dr.technicalDiagPic,
    //                     confirmTechincalPic: dr.confirmTechincalPic,
    //                     clearancesPic: dr.clearancesPic,
    //                     confirmClearPic: dr.confirmClearPic,
    //                     dLicencePic: dr.dLicencePic,
    //                     confirmDriverLcPic: dr.confirmDriverLcPic,
    //                     carDocPic: dr.carDocPic,
    //                     confirmcarDocPic: dr.confirmcarDocPic,
    //                     isDriverCarOwner: dr.isDriverCarOwner,
    //                 }).save();
    //             } else if (driverInfo.dLicencePic.trim() === "") {
    //                 driverInfo.location = dr.location;
    //                 driverInfo.address = dr.address;
    //                 driverInfo.birthday = dr.birthday;
    //                 driverInfo.healthPic = dr.healthPic;
    //                 driverInfo.confirmHealthPic = dr.confirmHealthPic;
    //                 driverInfo.technicalDiagPic = dr.technicalDiagPic;
    //                 driverInfo.confirmTechincalPic = dr.confirmTechincalPic;
    //                 driverInfo.clearancesPic = dr.clearancesPic;
    //                 driverInfo.confirmClearPic = dr.confirmClearPic;
    //                 driverInfo.dLicencePic = dr.dLicencePic;
    //                 driverInfo.confirmDriverLcPic = dr.confirmDriverLcPic;
    //                 driverInfo.carDocPic = dr.carDocPic;
    //                 driverInfo.confirmcarDocPic = dr.confirmcarDocPic;
    //                 driverInfo.isDriverCarOwner = dr.isDriverCarOwner;
    //                 await driverInfo.save();
    //             }
    //         })
    //     );
    // }
    // if (false) {
    //     const authority = await CounterKey.findOne({ name: "authority" });
    //     if (!authority) {
    //         await new CounterKey({
    //             name: "authority",
    //             seq: 11111111,
    //         }).save();
    //         console.log("CounterKey for authority created");
    //     } else if (authority.seq < 11111111) {
    //         authority.seq = 11111111;
    //         await authority.save();
    //         console.log("CounterKey for authority updated");
    //     } else {
    //         console.log("CounterKey for authority already exists");
    //     }
    // }
    // if (false) {
    //     const s = await Holiday.updateMany(
    //         { serviceNum: -1 },
    //         { studentId: "" }
    //     );
    //     let sa = await Holiday.find({ studentId: { $ne: "" } });

    //     for (var t of sa) {
    //         var stCode = t.studentId;
    //         // t.studentId=stCode.toString();
    //         console.log("stCode", stCode);
    //         await Holiday.findByIdAndUpdate(t.id, {
    //             studentId: stCode.toString(),
    //         });
    //         if (stCode === null) {
    //             await Holiday.findByIdAndUpdate(t.id, { serviceNum: -1 });
    //         }
    //     }
    //     console.log("update student in holiday", s.length);
    // }
    // if (false) {
    //     let schools = await School.find({}, "name shifts schoolTime");
    //     for (var i in schools) {
    //         let shifts = schools[i].shifts;
    //         schools[i].schoolTime = [];
    //         if (schools[i].schoolTime.length != 0) continue;
    //         for (var s in shifts) {
    //             let shift = await Shifts.findById(shifts[s]);
    //             if (!shift) continue;
    //             let day = await Day.findById(shift.week[0]);
    //             // let day1=await Day.findById(shift.week[1]);
    //             if (!day) continue;
    //             // if(!day1)continue;
    //             schools[i].schoolTime.push({
    //                 name: shift.name,
    //                 shiftdayId: 1001,
    //                 shiftdayTitle: "ایام هفته",
    //                 start: day.start,
    //                 end: day.end,
    //                 closure: [1012],
    //             });
    //             let st = await Student.find({ shift: shift.id });
    //             let sr = await Service.find({ shiftId: shift.id });
    //             for (var t in st) {
    //                 st[t].time = schools[i].schoolTime.length - 1;
    //                 await st[t].save();
    //             }
    //             for (var t in sr) {
    //                 sr[t].time = schools[i].schoolTime.length - 1;
    //                 await sr[t].save();
    //             }
    //         }
    //         console.log("save time name", schools[i].name);
    //         console.log("save time schoolTime", schools[i].schoolTime.length);
    //         await schools[i].save();
    //     }
    // }
    if (false) {
        Rule.count().then(async function (count) {
            try {
                if (count < 1) {
                    const agencies = await Agency.find({}, "_id");
                    const IDs = agencies.map((doc) => doc._id);

                    const rules = [];

                    for (const agency of IDs) {
                        for (const text of textValues) {
                            rules.push({
                                agencyId: agency,
                                type: "student",
                                show: true,
                                rule: text,
                            });
                        }
                    }

                    const batchSize = 300;
                    for (let i = 0; i < rules.length; i += batchSize) {
                        const batch = rules.slice(i, i + batchSize);
                        await Rule.insertMany(batch);
                        console.log(`Inserted batch ${i / batchSize + 1}`);
                    }

                    console.log("Rules added.");
                }
            } catch (err) {
                console.error("Error while Rules Count:", err);
            }
        });
    }

    if (false) {
        const countkey = await Keys.countDocuments();
        console.log("countkey", countkey);
        if (countkey < 4) {
            await new Keys({
                title: "مهدکودک",
                cityCode: 0,
                titleEn: "kindergarten",
                type: "gradeSchool",
            }).save();
            let key = new Keys({
                title: "دبستان دوره اول",
                cityCode: 0,
                titleEn: "First grade primary school",
                type: "gradeSchool",
            });
            await key.save();
            key = new Keys({
                title: "دبستان دوره دوم",
                cityCode: 0,
                titleEn: "Second grade primary school",
                type: "gradeSchool",
            });
            await key.save();
            key = new Keys({
                title: "دبیرستان دوره اول",
                cityCode: 0,
                titleEn: "First year high school",
                type: "gradeSchool",
            });
            await key.save();
            key = new Keys({
                title: "دبیرستان دوره دوم",
                cityCode: 0,
                titleEn: "Second year high school",
                type: "gradeSchool",
            });
            await key.save();
            key = new Keys({
                title: "هنرستان",
                cityCode: 0,
                titleEn: "school of Art",
                type: "gradeSchool",
            });
            await key.save();
            key = new Keys({
                title: "دوره آمادگی",
                cityCode: 0,
                exp: "پیش دبستانی",
                titleEn: "Preschool",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه اول",
                cityCode: 0,
                exp: "دوره اول آموزش ابتدایی",
                titleEn: "First grade of elementary school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه دوم",
                cityCode: 0,
                exp: "دوره دوم آموزش ابتدایی",
                titleEn: "Second grade of elementary school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه سوم",
                cityCode: 0,
                exp: "دوره سوم آموزش ابتدایی",
                titleEn: "Third grade of elementary school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه چهارم",
                cityCode: 0,
                exp: "دوره چهارم آموزش ابتدایی",
                titleEn: "Fourth grade of elementary school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه پنجم",
                cityCode: 0,
                exp: "دوره پنجم آموزش ابتدایی",
                titleEn: "Fifth grade of elementary school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه ششم",
                cityCode: 0,
                exp: "دوره ششم آموزش ابتدایی",
                titleEn: "Sixth grade of elementary school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه هفتم",
                cityCode: 0,
                exp: "دوره اول آموزش متوسطه",
                titleEn: "First grade of high school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه هشتم",
                cityCode: 0,
                exp: "دوره دوم آموزش متوسطه",
                titleEn: "Second grade of high school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه نهم",
                cityCode: 0,
                exp: "دوره سوم آموزش متوسطه",
                titleEn: "Third grade of high school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه دهم",
                cityCode: 0,
                exp: "دوره چهارم آموزش متوسطه",
                titleEn: "Fourth grade of high school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه یازدهم",
                cityCode: 0,
                exp: "دوره پنجم آموزش متوسطه",
                titleEn: "Fifth grade of high school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "پایه دوازدهم",
                cityCode: 0,
                exp: "دوره ششم آموزش متوسطه",
                titleEn: "Sixth grade of high school",
                type: "grade",
            });
            await key.save();
            key = new Keys({
                title: "دخترانه",
                cityCode: 0,
                titleEn: "girl's school",
                type: "genderSchool",
            });
            await key.save();
            key = new Keys({
                title: "پسرانه",
                cityCode: 0,
                titleEn: "boy's school",
                type: "genderSchool",
            });
            await key.save();
            key = new Keys({
                title: "مختلط",
                cityCode: 0,
                titleEn: "co-ed school",
                type: "genderSchool",
            });
            await key.save();
            key = new Keys({
                title: "مرد",
                cityCode: 0,
                titleEn: "man",
                type: "gender",
            });
            await key.save();
            key = new Keys({
                title: "زن",
                cityCode: 0,
                titleEn: "woman",
                type: "gender",
            });
            await key.save();
            key = new Keys({
                title: "دولتی",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "غیردولتی",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "استثنایی",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "نمونه دولتی",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "تیزهوشان",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "خیریه",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "اتباع خارجی",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "بین‌المللی",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "وابسته",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            key = new Keys({
                title: "دیگر موارد",
                cityCode: 0,
                type: "typeSchool",
            });
            await key.save();
            ///////////////
            key = new Keys({
                title: "ماشین تمیز",
                cityCode: 0,
                titleEn: "+2",
                type: "opinion",
            });
            await key.save();
            key = new Keys({
                title: "رانندگی پرخطر",
                cityCode: 0,
                titleEn: "-3",
                type: "opinion",
            });
            await key.save();
            key = new Keys({
                title: "مسیریابی نامناسب",
                cityCode: 0,
                titleEn: "-2",
                type: "opinion",
            });
            await key.save();
            key = new Keys({
                title: "رفتار نامناسب",
                cityCode: 0,
                titleEn: "-2",
                type: "opinion",
            });
            await key.save();
            key = new Keys({
                title: "عدم حفظ حریم شخصی",
                cityCode: 0,
                titleEn: "-4",
                type: "opinion",
            });
            await key.save();
            key = new Keys({
                title: "بوی نامطبوع خودرو",
                cityCode: 0,
                titleEn: "-2",
                type: "opinion",
            });
            await key.save();
            key = new Keys({
                title: "رفتار محترمانه",
                cityCode: 0,
                titleEn: "+3",
                type: "opinion",
            });
            await key.save();
            key = new Keys({
                title: "ایام هفته",
                cityCode: 0,
                titleEn: "all days",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "روزهای زوج",
                cityCode: 0,
                titleEn: "even days",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "روزهای فرد",
                cityCode: 0,
                titleEn: "odd days",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "هفته‌های زوج",
                cityCode: 0,
                titleEn: "even week",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "هفته‌های فرد",
                cityCode: 0,
                titleEn: "odd week",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "شنبه",
                cityCode: 0,
                titleEn: "Saturday",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "یکشنبه",
                cityCode: 0,
                titleEn: "Sunday",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "دوشنبه",
                cityCode: 0,
                titleEn: "Monday",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "سه‌شنبه",
                cityCode: 0,
                titleEn: "Tuesday",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "چهارشنبه",
                cityCode: 0,
                titleEn: "Wednesday",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "پنج‌شنبه",
                cityCode: 0,
                titleEn: "Thursday",
                type: "shiftDay",
            });
            await key.save();
            key = new Keys({
                title: "جمعه",
                cityCode: 0,
                titleEn: "Friday",
                type: "shiftDay",
            });
            await key.save();

            console.log("Keys added succsefully");
        }
    }

    if (false) {
        await Bank.deleteMany();
    }
    if (false) {
        const count = await Bank.countDocuments();
        if (count < 29) {
            let bank = new Bank({
                name: "بانک ملی",
                logo: "api/file/files/banks/BMI.png",
                sign: "BMI",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک پاسارگاد",
                logo: "api/file/files/banks/pasargad.png",
                sign: "PAS",
            });
            await bank.save();

            bank = new Bank({
                name: "بانک سپه",
                logo: "api/file/files/banks/BSP.png",
                sign: "BSP",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک صادرات",
                logo: "api/file/files/banks/BSI.png",
                sign: "BSI",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک ملت",
                logo: "api/file/files/banks/MEL.png",
                sign: "MEL",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک سامان",
                logo: "api/file/files/banks/SAM.png",
                sign: "SAM",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک کشاورزی",
                logo: "api/file/files/banks/keshavarzi.png",
                sign: "BKV",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک تجارت",
                logo: "api/file/files/banks/TEJ.png",
                sign: "TEJ",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک رفاه",
                logo: "api/file/files/banks/REF.png",
                sign: "REF",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک مسکن",
                logo: "api/file/files/banks/BMK.png",
                sign: "BMK",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک آینده",
                logo: "api/file/files/banks/ayandeh.png",
                sign: "AYN",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک دی",
                logo: "api/file/files/banks/DEY.png",
                sign: "DEY",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک پارسیان",
                logo: "api/file/files/banks/PAR.png",
                sign: "PAR",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک کارآفرین",
                logo: "api/file/files/banks/BKA.png",
                sign: "BKA",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک رسالت",
                logo: "api/file/files/banks/RES.png",
                sign: "RES",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک انصار",
                logo: "api/file/files/banks/ansar.png",
                sign: "ANS",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک صنعت و معدن",
                logo: "api/file/files/banks/BSM.png",
                sign: "BSM",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک سرمایه",
                logo: "api/file/files/banks/SAR.png",
                sign: "SAR",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک شهر",
                logo: "api/file/files/banks/SHR.png",
                sign: "SHR",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک مهر ایران",
                logo: "api/file/files/banks/MEH.png",
                sign: "MHR",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک قوامین",
                logo: "api/file/files/banks/GHA.png",
                sign: "GHA",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک اقتصاد نوین",
                logo: "api/file/files/banks/ENB.png",
                sign: "ENB",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک سینا",
                logo: "api/file/files/banks/SIN.png",
                sign: "SIN",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک توسعه صادرات",
                logo: "api/file/files/banks/BTS.png",
                sign: "BTS",
            });
            await bank.save();
            bank = new Bank({
                name: "موسسه اعتباری کوثر",
                logo: "api/file/files/banks/KSAC.png",
                sign: "KSAC",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک حکمت ایرانیان",
                logo: "api/file/files/banks/HEK.png",
                sign: "HEK",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک توسعه تعاون",
                logo: "api/file/files/banks/BTT.png",
                sign: "BTT",
            });
            await bank.save();
            bank = new Bank({
                name: "پست بانک",
                logo: "api/file/files/banks/PST.png",
                sign: "PST",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک ایران زمین",
                logo: "api/file/files/banks/IRZ.png",
                sign: "IRZ",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک گردشگری",
                logo: "api/file/files/banks/GAR.png",
                sign: "GAR",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک خاورمیانه",
                logo: "api/file/files/banks/KHMI.png",
                sign: "KHMI",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک نور",
                logo: "api/file/files/banks/NOR.png",
                sign: "NOR",
            });
            await bank.save();
            bank = new Bank({
                name: "موسسه اعتباری توسعه",
                logo: "api/file/files/banks/MET.png",
                sign: "MET",
            });
            await bank.save();
            bank = new Bank({
                name: "موسسه اعتباری عسکریه",
                logo: "api/file/files/banks/ASKC.png",
                sign: "ASKC",
            });
            await bank.save();
            bank = new Bank({
                name: "بانک ایران ونزوئلا",
                logo: "api/file/files/banks/IRV.png",
                sign: "IRV",
            });
            await bank.save();
            bank = new Bank({
                name: "سایر بانک‌ها",
                logo: "api/file/files/banks/markazi.png",
                sign: "CBI",
            });
            await bank.save();
            bank = new Bank({
                name: "زرین پال",
                logo: "api/file/files/banks/BSP.png",
                sign: "BSP",
            });
            await bank.save();
            console.log("Banks added succsefully");
        }
    }
    if (false) {
        const count = await LevelAcc.countDocuments();
        if (count < 3) {
            let level = new LevelAcc({
                levelNo: 1,
                name: "کل",
                count: 3,
            });
            await level.save();

            level = new LevelAcc({
                levelNo: 2,
                name: "معین",
                count: 3,
            });
            await level.save();

            level = new LevelAcc({
                levelNo: 3,
                name: "تفضیلی",
                count: 9,
            });
            await level.save();
            console.log("level added succsefully");
        }
    }
};
