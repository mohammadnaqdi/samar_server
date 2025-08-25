const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

module.exports = new (class extends controller {
    async getGroupAcc(req, res) {
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
            let groupAcc = await this.GroupAcc.find({ agencyId });

            if (groupAcc.length === 0) {
                await new this.GroupAcc({
                    agencyId,
                    groupId: 1,
                    name: "دارایی‌های جاری",
                    mainId: "دارایی",
                }).save();

                await new this.GroupAcc({
                    agencyId,
                    groupId: 2,
                    name: "دارایی‌های غیرجاری",
                    mainId: "دارایی",
                }).save();

                await new this.GroupAcc({
                    agencyId,
                    groupId: 3,
                    name: "بدهی‌های جاری",
                    mainId: "بدهی",
                }).save();

                await new this.GroupAcc({
                    agencyId,
                    groupId: 4,
                    name: "بدهی‌های غیرجاری",
                    mainId: "بدهی",
                }).save();

                await new this.GroupAcc({
                    agencyId,
                    groupId: 5,
                    name: "حقوق صاحبان سهام",
                    mainId: "سرمایه",
                }).save();

                await new this.GroupAcc({
                    agencyId,
                    groupId: 6,
                    name: "درآمدها",
                    mainId: "درآمد",
                }).save();

                await new this.GroupAcc({
                    agencyId,
                    groupId: 7,
                    name: "هزینه‌ها",
                    mainId: "هزینه",
                }).save();

                console.log("groups added");
                groupAcc = await this.GroupAcc.find({ agencyId });
            }

            const mainList = this.GroupAcc.schema.path("mainId").enumValues;
            return this.response({
                res,
                message: "ok",
                data: { groupAcc, mainList },
            });
        } catch (err) {
            console.error("getGroupAcc function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteGroupAcc(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }

            const id = req.query.id;
            const group = await this.GroupAcc.findById(id);

            if (!group) {
                return this.response({
                    res,
                    code: 404,
                    message: "Group not found",
                });
            }

            const sarfasl = await this.ListAcc.countDocuments({
                groupId: group.groupId,
                agencyId: group.agencyId,
            });

            if (sarfasl > 0) {
                return this.response({
                    res,
                    code: 301,
                    message: "this group is used",
                });
            }

            await this.GroupAcc.findByIdAndDelete(id);
            return this.response({
                res,
                message: "ok",
            });
        } catch (err) {
            console.error("deleteGroupAcc function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setFirstCodeHesab(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.level === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId and level are required",
                });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const level = parseInt(req.query.level);

            await this.LevelAccDetail.deleteMany({ levelNo: level, agencyId });

            if (level === 1) {
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
            } else if (level === 2) {
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
            } else if (level === 3) {
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
                    accCode: "000000008",
                    accName: "شارژ کیف پول",
                }).save();
                await new this.LevelAccDetail({
                    agencyId,
                    levelNo: 3,
                    accCode: "000000009",
                    accName: "هزینه عملیاتی",
                }).save();
                await new this.LevelAccDetail({
                    agencyId,
                    levelNo: 3,
                    accCode: "000000010",
                    accName: "شارژ ادمین",
                }).save();
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch (err) {
            console.error("setFirstCodeHesab function error:", err);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setFirstListAcc(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.mode === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId mode need",
                });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const mode = req.query.mode;

            if (mode === "1") {
                // Add accounts
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
            } else if (mode === "2") {
                // Add drivers
                const agency = await this.Agency.findById(agencyId, "");
                if (!agency) {
                    return this.response({
                        res,
                        code: 404,
                        message: "agency not find",
                    });
                }
                let drKol = "004";
                let drMoeen = "006";
                let stKol = "004";
                let stMoeen = "006";
                await this.LevelAccDetail.deleteMany({
                    agencyId,
                    levelType: 2,
                });
                await this.LevelAccDetail.deleteMany({
                    agencyId,
                    levelType: 1,
                });
                const drivers = await this.Driver.find(
                    { agencyId },
                    "userId driverCode carId"
                );
                for (const driver of drivers) {
                    const user = await this.User.findById(
                        driver.userId,
                        "name lastName"
                    );
                    const oldCode = driver.driverCode;
                    const car = await this.Car.findById(
                        driver.carId,
                        "carModel colorCar"
                    );
                    let lastCode = 100000001;
                    if (oldCode > 100000000 && oldCode < 1999999999) {
                        lastCode = oldCode;
                    } else {
                        const lastLevelAccDet = await this.LevelAccDetail.find({
                            levelNo: 3,
                            levelType: 2,
                        })
                            .sort({ accCode: -1 })
                            .limit(1);
                        if (lastLevelAccDet.length > 0) {
                            lastCode = parseInt(lastLevelAccDet[0].accCode) + 1;
                        }
                        await this.Driver.findByIdAndUpdate(driver.id, {
                            driverCode: lastCode,
                        });
                        await this.DriverAct.updateMany(
                            { driverCode: oldCode },
                            { $set: { driverCode: lastCode } },
                            { new: true, useFindAndModify: false }
                        );
                        await this.Location.updateMany(
                            { userCode: oldCode },
                            { $set: { userCode: lastCode } },
                            { new: true, useFindAndModify: false }
                        );
                    }

                    const code = lastCode.toString();
                    let desc = "";
                    if (car) {
                        desc = `${car.carModel} ${car.colorCar}`;
                    }
                    await new this.LevelAccDetail({
                        agencyId,
                        levelNo: 3,
                        levelType: 2,
                        accCode: code,
                        accName: `${user.name} ${user.lastName}`,
                        desc,
                    }).save();
                    await this.ListAcc.findOneAndRemove({
                        agencyId,
                        codeLev3: code,
                        code: `${drKol}${drMoeen}${code}`,
                        groupId: 1,
                        type: 1,
                        nature: 1,
                    });
                    await new this.ListAcc({
                        agencyId,
                        code: `${drKol}${drMoeen}${code}`,
                        codeLev1: drKol,
                        codeLev2: drMoeen,
                        codeLev3: code,
                        groupId: 1,
                        type: 1,
                        nature: 1,
                        levelEnd: 3,
                        canEdit: false,
                    }).save();
                }
                // Add students
                // for (const school of agency.schools) {
                //     const sch = await this.School.findById(school, "name");
                //     const students = await this.Student.find(
                //         { school },
                //         "studentCode name lastName"
                //     );
                //     for (const student of students) {
                //         let oldCode = student.studentCode.replace("del_", "");
                //         let lastCode = 600000001;
                //         let search = true;
                //         let lastLevelAccDet = await this.LevelAccDetail.find({
                //             levelNo: 3,
                //             levelType: 1,
                //         })
                //             .sort({ accCode: -1 })
                //             .limit(1);
                //         if (lastLevelAccDet.length > 0) {
                //             lastCode = parseInt(lastLevelAccDet[0].accCode) + 1;
                //         }
                //         do {
                //             let stFind = await this.Student.findOne({
                //                 studentCode: lastCode.toString(),
                //             });
                //             if (stFind) {
                //                 lastCode++;
                //             } else {
                //                 search = false;
                //                 break;
                //             }
                //         } while (search);
                //         await this.Student.findByIdAndUpdate(student.id, {
                //             studentCode: lastCode.toString(),
                //         });
                //         await this.DriverAct.updateMany(
                //             { studentId: oldCode },
                //             { $set: { studentId: lastCode.toString() } },
                //             { new: true, useFindAndModify: false }
                //         );
                //         await this.Holiday.updateMany(
                //             { studentId: oldCode },
                //             { $set: { studentId: lastCode.toString() } },
                //             { new: true, useFindAndModify: false }
                //         );
                //         await this.Location.updateMany(
                //             { studentCode: oldCode },
                //             { $set: { studentCode: lastCode.toString() } },
                //             { new: true, useFindAndModify: false }
                //         );
                //         await this.LevelAccDetail.findOneAndRemove({
                //             levelNo: 3,
                //             levelType: 1,
                //             accCode: oldCode,
                //         });
                //         await new this.LevelAccDetail({
                //             agencyId,
                //             levelNo: 3,
                //             levelType: 1,
                //             accCode: lastCode.toString(),
                //             accName: `${student.name} ${student.lastName}`,
                //             desc: sch.name,
                //         }).save();
                //         await this.ListAcc.findOneAndRemove({
                //             agencyId,
                //             codeLev3: lastCode.toString(),
                //             code: `${stKol}${stMoeen}${lastCode.toString()}`,
                //             groupId: 1,
                //             type: 1,
                //             nature: 1,
                //         });
                //         await new this.ListAcc({
                //             agencyId,
                //             code: `${stKol}${stMoeen}${lastCode.toString()}`,
                //             codeLev1: stKol,
                //             codeLev2: stMoeen,
                //             codeLev3: lastCode.toString(),
                //             groupId: 1,
                //             type: 1,
                //             nature: 1,
                //             levelEnd: 3,
                //             canEdit: false,
                //         }).save();
                //     }
                // }
            } else {
                return this.response({
                    res,
                    code: 214,
                    message: "mode not valid",
                });
            }
            return this.response({
                res,
                code: 200,
                message: "success",
            });
        } catch (error) {
            console.error("setFirstListAcc: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getTypeMahyat(req, res) {
        try {
            const listTypeHesab = [
                { id: 1, name: "خنثی" },
                { id: 2, name: "صندوق نقدی" },
                { id: 3, name: "بانکی" },
                { id: 4, name: "صندوق چکهای مدت" },
                { id: 5, name: "صندوق چکهای دريافتی" },
                { id: 6, name: "صندوق چکهای در جريان وصول" },
                { id: 7, name: "فاکتوری" },
                { id: 8, name: "اسکن فاکتور" },
                { id: 9, name: "تخفيف فاکتور کالا" },
                { id: 10, name: "تخفيف فاکتور همکار" },
            ];
            const listMahiatHesab = [
                { id: 1, name: "بدهکار" },
                { id: 2, name: "بستانکار" },
                { id: 3, name: "بدهکار بستانکار" },
                { id: 4, name: "بدهکار تجاری" },
                { id: 5, name: "بستانکار تجاری" },
                { id: 6, name: "بدهکار بستانکار تجاری" },
            ];

            return res.json({ listTypeHesab, listMahiatHesab });
        } catch (error) {
            console.error("getTypeMahyat: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteLevelAccDetail(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }

            const id = req.query.id;
            const level = await this.LevelAccDetail.findById(id);
            if (!level) {
                return this.response({
                    res,
                    code: 404,
                    message: "not find ",
                });
            }

            if (level.levelType != 0) {
                return this.response({
                    res,
                    code: 302,
                    message: "cant delete",
                });
            }
            const agencySet = await this.AgencySet.findOne({
                agencyId: level.agencyId,
                "defHeadLine.code": { $regex: ".*" + level.accCode },
            });
            if (agencySet) {
                return this.response({
                    res,
                    code: 303,
                    message: "cant delete",
                });
            }
            if (level.levelNo === 1) {
                const count = await this.ListAcc.countDocuments({
                    codeLev1: level.accCode,
                    agencyId: level.agencyId,
                });
                if (count > 0) {
                    return this.response({
                        res,
                        code: 301,
                        message: "cant delete",
                    });
                }
            }
            if (level.levelNo === 2) {
                const count = await this.ListAcc.countDocuments({
                    codeLev2: level.accCode,
                    agencyId: level.agencyId,
                });
                if (count > 0) {
                    return this.response({
                        res,
                        code: 301,
                        message: "cant delete",
                    });
                }
            }
            if (level.levelNo === 3) {
                const count = await this.ListAcc.countDocuments({
                    codeLev3: level.accCode,
                    agencyId: level.agencyId,
                });
                if (count > 0) {
                    return this.response({
                        res,
                        code: 301,
                        message: "cant delete",
                    });
                }
            }
            await this.LevelAccDetail.findByIdAndDelete(id);
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("deleteLevelAccDetail: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async deleteListAcc(req, res) {
        try {
            if (req.query.id === undefined || req.query.id.trim() === "") {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }
            const id = ObjectId.createFromHexString(req.query.id);
            const acc = await this.ListAcc.findById(id);
            if (!acc.canEdit) {
                return this.response({
                    res,
                    code: 302,
                    message: "cant delete",
                });
            }
            const count = await this.DocListSanad.countDocuments({
                agencyId: acc.agencyId,
                accCode: acc.code,
            });
            if (count > 0) {
                return this.response({
                    res,
                    code: 301,
                    message: "cant delete",
                });
            }
            await this.ListAcc.findOneAndDelete({ _id: id, canEdit: true });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("deleteListAcc: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getLevelAcc(req, res) {
        try {
            const levelAcc = await this.LevelAcc.find(
                {},
                "levelNo name count desc"
            );
            return this.response({
                res,
                message: "ok",
                data: levelAcc,
            });
        } catch (error) {
            console.error("getLevelAcc: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getListAcc(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.page === undefined ||
                req.query.sort === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId page sort need",
                });
            }
            const agencyId = req.query.agencyId;
            const sort = parseInt(req.query.sort);
            const showStudent = req.query.showStudent ?? "false";
            const showDriver = req.query.showDriver ?? "false";

            let limit = 40;
            if (req.query.limit != undefined) {
                limit = req.query.limit;
            }
            const search =
                req.query.search == undefined ? "" : req.query.search.trim();
            let page = parseInt(req.query.page);

            if (page < 0) page = 0;
            if (limit < 5) limit = 40;
            var qr = [];
            qr.push({ agencyId });
            qr.push({ levelNo: 3 });
            if (search.trim() != "") {
                const se = search
                    .split(/(\s+)/)
                    .filter((e) => e.trim().length > 0);
                for (var s of se) {
                    qr.push({
                        $or: [
                            { accCode: { $regex: ".*" + s + ".*" } },
                            { accName: { $regex: ".*" + s + ".*" } },
                        ],
                    });
                }
            }

            if (showDriver === "false" && showStudent === "false") {
                qr.push({ levelType: 0 });
            }
            if (showDriver === "false" && showStudent === "true") {
                qr.push({
                    $or: [{ levelType: 0 }, { levelType: 1 }],
                });
            }
            if (showDriver === "true" && showStudent === "false") {
                qr.push({
                    $or: [{ levelType: 0 }, { levelType: 2 }],
                });
            }

            const levelDets = await this.LevelAccDetail.find(
                { $and: qr },
                "accCode accName desc"
            )
                .skip(page * limit)
                .limit(limit)
                .sort({ accCode: sort });
            let result = [];
            for (var hesab of levelDets) {
                const listAcc = await this.ListAcc.find({
                    agencyId,
                    codeLev3: hesab.accCode,
                    enable: true,
                });
                result.push({ hesab, listAcc });
            }
            return this.response({
                res,
                message: "ok",
                data: result,
            });
        } catch (error) {
            console.error("getListAcc: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getListSarfasl(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.page === undefined ||
                req.query.sort === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId page sort need",
                });
            }
            const agencyId = req.query.agencyId;
            const sort = parseInt(req.query.sort);

            let limit = 40;
            if (req.query.limit != undefined) {
                limit = req.query.limit;
            }
            const search =
                req.query.search == undefined ? "" : req.query.search.trim();
            let page = parseInt(req.query.page);

            if (page < 0) page = 0;
            if (limit < 5) limit = 40;
            var qr = [];
            qr.push({ agencyId });
            qr.push({ enable: true });
            if (search.trim() != "") {
                qr.push({
                    $or: [{ code: { $regex: ".*" + search + ".*" } }],
                });
            }

            const listAcc = await this.ListAcc.find({ $and: qr })
                .skip(page * limit)
                .limit(limit)
                .sort({ codeLev3: sort });
            let sarafsl = [];
            for (var acc of listAcc) {
                const hesab = await this.LevelAccDetail.findOne(
                    { accCode: acc.codeLev3, agencyId },
                    "accName"
                );
                if (hesab) {
                    sarafsl.push({
                        acc,
                        hesab,
                    });
                }
            }

            return this.response({
                res,
                message: "ok",
                data: sarafsl,
            });
        } catch (error) {
            console.error("getListSarfasl: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getLastLevelAccDetailCode(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.level === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId level need",
                });
            }
            const agencyId = req.query.agencyId;
            const level = parseInt(req.query.level);
            const levelAcc = await this.LevelAccDetail.find(
                {
                    agencyId,
                    levelNo: level,
                    $or: [{ levelType: 0 }, { levelType: 3 }],
                },
                "accCode"
            )
                .sort({ accCode: -1 })
                .limit(1);
            let num = 1;
            if (levelAcc.length > 0) {
                num = parseInt(levelAcc[0].accCode) + 1;
            }
            return this.response({
                res,
                data: num,
            });
        } catch (error) {
            console.error("getLastLevelAccDetailCode: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getBanks(req, res) {
        try {
            const banks = await this.Bank.find();
            return this.response({
                res,
                message: "ok",
                data: banks,
            });
        } catch (error) {
            console.error("getBanks: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getBranch(req, res) {
        try {
            if (
                req.query.iranBankId === undefined ||
                req.query.iranBankId.trim() === "" ||
                req.query.agencyId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "iranBankId and agencyId need",
                });
            }
            const iranBankId = req.query.iranBankId;
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const bankInfoes = await this.BankInfo.find({
                agencyId,
                iranBankId,
            });
            return res.json(bankInfoes);
        } catch (error) {
            console.error("getBranch: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getLevelAccDetails(req, res) {
        try {
            if (req.query.level === undefined) {
                return res.status(214).json({ msg: "level need" });
            }
            if (req.query.page === undefined) {
                return res.status(214).json({ msg: "page need" });
            }
            if (req.query.agencyId === undefined) {
                return res.status(214).json({ msg: "agencyId need" });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const level = parseInt(req.query.level);
            const sort = parseInt(req.query.sort);
            const all = req.query.all ?? "false";
            const showStudent = req.query.showStudent ?? "false";
            const showDriver = req.query.showDriver ?? "false";

            let limit = 40;
            if (req.query.limit != undefined) {
                limit = req.query.limit;
            }
            const search =
                req.query.search == undefined ? "" : req.query.search.trim();
            let page = parseInt(req.query.page);

            if (limit < 5) limit = 40;
            if (page < 0) page = 0;
            var qr = [];
            qr.push({ levelType: { $ne: 3 } });
            qr.push({ agencyId });
            qr.push({ levelNo: level });
            if (search.trim() != "") {
                qr.push({
                    $or: [
                        { accCode: { $regex: ".*" + search + ".*" } },
                        { accName: { $regex: ".*" + search + ".*" } },
                        { levelType: 0 },
                    ],
                });
            }

            if (showDriver === "false" && showStudent === "false") {
                qr.push({ levelType: 0 });
            } else if (showDriver === "false" && showStudent === "true") {
                qr.push({
                    $or: [{ levelType: 0 }, { levelType: 1 }],
                });
            } else if (showDriver === "true" && showStudent === "false") {
                qr.push({
                    $or: [{ levelType: 0 }, { levelType: 2 }],
                });
            }

            if (all === "true") {
                const levelDets = await this.LevelAccDetail.find({ $and: qr });
                return this.response({
                    res,
                    message: "ok",
                    data: levelDets,
                });
            }
            const levelDets = await this.LevelAccDetail.find({ $and: qr })
                .skip(page * limit)
                .limit(limit)
                .sort({ accCode: sort });

            return this.response({
                res,
                message: "ok",
                data: levelDets,
            });
        } catch (error) {
            console.error("getLevelAccDetails: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async searchHesabByNameCode(req, res) {
        try {
            let page = req.body.page;
            const agencyId = req.body.agencyId;
            let search = req.body.search.trim();
            const type1 = req.body.type1 === undefined ? null : req.body.type1;
            const type2 = req.body.type2 === undefined ? null : req.body.type2;
            const only = req.body.only === undefined ? null : req.body.only;
            const lock = req.body.lock === undefined ? false : req.body.lock;
            if (mongoose.isValidObjectId(search)) {
                const driver = await this.Driver.findById(search, "driverCode");
                if (driver) {
                    search = driver.driverCode;
                }
            }
            let limit = 40;
            if (req.query.limit != undefined) {
                limit = req.query.limit;
                if (limit < 1) limit = 10;
            }

            if (page < 0) page = 0;
            page = page * limit;
            var qr = [];
            qr.push({ agencyId });
            qr.push({ levelNo: 3 });
            if (only != null && only != -1) {
                qr.push({ levelType: only });
            } else if (!lock) {
                qr.push({ levelType: { $ne: 3 } });
            }
            if (search != "") {
                qr.push({
                    $or: [
                        { accCode: { $regex: ".*" + search + ".*" } },
                        { accName: { $regex: ".*" + search + ".*" } },
                    ],
                });
            }

            let sarafsl = [];

            if (type1 != 1 && type2 != 1) {
                var qr2 = [];
                qr2.push({ agencyId });
                qr2.push({ enable: true });
                if (type1 != null && type2 === null) {
                    qr2.push({ type: type1 });
                } else if (type2 != null && type1 === null) {
                    qr2.push({ type: type2 });
                } else if (type2 != null && type1 != null) {
                    qr2.push({ $or: [{ type: type1 }, { type: type2 }] });
                }
                const codes = await this.ListAcc.find({ $and: qr2 }).distinct(
                    "codeLev3"
                );
                let qr3 = qr;
                qr3.push({ accCode: { $in: codes } });
                const levs = await this.LevelAccDetail.find(
                    { $and: qr3 },
                    "accName accCode levelType desc"
                );
                for (var lv of levs) {
                    var qr4 = [];
                    qr4.push({ agencyId });
                    qr4.push({ enable: true });
                    if (type1 != null && type2 === null) {
                        qr4.push({ type: type1 });
                    } else if (type2 != null && type1 === null) {
                        qr4.push({ type: type2 });
                    } else if (type2 != null && type1 != null) {
                        qr4.push({ $or: [{ type: type1 }, { type: type2 }] });
                    }
                    qr4.push({ codeLev3: lv.accCode });
                    const hesabs = await this.ListAcc.find(
                        { $and: qr4 },
                        "code codeLev1 codeLev2 codeLev3 groupId type nature levelEnd"
                    );
                    if (hesabs && hesabs.length != 0) {
                        for (var hs of hesabs) {
                            const moeen = await this.LevelAccDetail.findOne(
                                { agencyId, accCode: hs.codeLev2 },
                                "accName"
                            );
                            const kol = await this.LevelAccDetail.findOne(
                                { agencyId, accCode: hs.codeLev1 },
                                "accName"
                            );
                            sarafsl.push({
                                code: lv,
                                hs,
                                moeen: moeen.accName,
                                kol: kol.accName,
                            });
                        }
                    }
                }
            } else {
                let p = page;
                let breakw = false;
                do {
                    let codes = await this.LevelAccDetail.find(
                        { $and: qr },
                        "accName accCode levelType desc"
                    )
                        .skip(p)
                        .limit(limit / 4);

                    p++;
                    p = p * (limit / 4);
                    if (!codes || codes.length === 0) {
                        breakw = true;
                        break;
                    }
                    for (var code of codes) {
                        var qr2 = [];
                        qr2.push({ agencyId });
                        qr2.push({ enable: true });
                        if (type1 != null && type2 === null) {
                            qr2.push({ type: type1 });
                        } else if (type2 != null && type1 === null) {
                            qr2.push({ type: type2 });
                        } else if (type2 != null && type1 != null) {
                            qr2.push({
                                $or: [{ type: type1 }, { type: type2 }],
                            });
                        }
                        qr2.push({ codeLev3: code.accCode });
                        const hesabs = await this.ListAcc.find(
                            { $and: qr2 },
                            "code codeLev1 codeLev2 codeLev3 groupId type nature levelEnd"
                        );
                        if (hesabs && hesabs.length != 0) {
                            for (var hs of hesabs) {
                                const moeen = await this.LevelAccDetail.findOne(
                                    { agencyId, accCode: hs.codeLev2 },
                                    "accName"
                                );
                                const kol = await this.LevelAccDetail.findOne(
                                    { agencyId, accCode: hs.codeLev1 },
                                    "accName"
                                );
                                sarafsl.push({
                                    code,
                                    hs,
                                    moeen: moeen.accName,
                                    kol: kol.accName,
                                });
                            }
                        }
                    }
                } while (sarafsl.length >= limit || breakw);
            }

            return this.response({
                res,
                message: "ok",
                data: sarafsl,
            });
        } catch (error) {
            console.error("searchHesabByNameCode: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    // async getSettingStudentDriver(req, res) {
    //     try {
    //         if (
    //             req.query.agencyId === undefined ||
    //             req.query.type === undefined
    //         ) {
    //             return this.response({
    //                 res,
    //                 code: 214,
    //                 message: "agencyId type need",
    //             });
    //         }

    //         const agencyId = req.query.agencyId;
    //         const type = parseInt(req.query.type);

    //         // try {
    //         const agency = await this.Agency.findById(agencyId, "settings");
    //         if (agency) {
    //             const setting = agency.settings.find(
    //                 (obj) => obj.type === type
    //             );
    //             if (setting) {
    //                 const { kol, moeen } = setting;
    //                 return this.response({
    //                     res,
    //                     data: { kol, moeen },
    //                 });
    //             }
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "Setting not found",
    //             });
    //         }
    //         return this.response({
    //             res,
    //             code: 404,
    //             message: "Agency not found",
    //         });
    //     } catch (error) {
    //         console.error("error  in getSettingStudentDriver: ", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async checkSanadNumWithCode(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.sanadId === undefined ||
                req.query.code === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId sanadId code need",
                });
            }

            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const code = req.query.code;
            const sanadId = parseInt(req.query.sanadId);

            const doc = await this.DocSanad.findOne({ agencyId, sanadId });
            if (!doc) {
                return this.response({
                    res,
                    code: 404,
                    message: "Document not found",
                });
            }

            const listSanad = await this.DocListSanad.findOne({
                titleId: doc.id,
                accCode: code,
            });
            if (!listSanad) {
                return this.response({
                    res,
                    code: 405,
                    message: "ListSanad not found",
                });
            }

            return this.response({
                res,
                data: doc.note,
            });
        } catch (error) {
            console.error("Error in checkSanadNumWithCode:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async changeSanadPay(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const accCode = req.body.accCode;
            const type = req.body.type;
            const days = req.body.days || 0;
            const sanadId = req.body.sanadId;
            const mId = req.body.mId;
            const studentId = req.body.studentId || null;

            const docA = await this.DocSanad.findOne({ agencyId, sanadId });
            if (!docA) {
                return this.response({
                    res,
                    code: 404,
                    message: "Document not found",
                });
            }
            let doc = await this.DocListSanad.findOne({
                agencyId,
                doclistId: sanadId,
                accCode,
            });
            if (!doc) {
                return this.response({
                    res,
                    code: 405,
                    message: "doc not found",
                });
            }
           if(mId!=0) doc.mId = mId;
            doc.type = type;
            if (days != 0) {
                doc.days = days;
            }
            await doc.save();
            if (studentId) {
                const payQueue = await this.PayQueue.findOneAndUpdate(
                    {
                        agencyId,
                        studentId,
                        code: mId,
                    },
                    {
                        isPaid: true,
                        cardNumber:'',
                        refId:'',
                        setter: req.user._id,
                        payDate: new Date(),
                        amount:doc.bes
                    }
                );
                if (payQueue && payQueue.type === "prePayment") {
                    const invoice = await this.Invoice.findOne({
                        agencyId,
                        code: mId,
                    });
                    if (invoice && invoice.confirmPrePaid) {
                        let student = await this.Student.findById(studentId);
                        if (student && student.state === 2) {
                            student.state = 3;
                            student.stateTitle = "در انتظار تعیین سرویس";
                            await student.save();
                        }
                    }
                }
            }

            return this.response({
                res,
                data: doc.note,
            });
        } catch (error) {
            console.error("Error in changeSanadPay:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getHesabByListCode(req, res) {
        const agencyId = req.body.agencyId;
        const listCode = req.body.listCode;

        try {
            const hesabs = await this.ListAcc.find(
                { agencyId, enable: true, code: { $in: listCode } },
                "code codeLev1 codeLev2 codeLev3 groupId type nature levelEnd"
            );

            let sarafsl = [];
            for (const hs of hesabs) {
                const [code, moeen, kol] = await Promise.all([
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: hs.codeLev3 },
                        "accName"
                    ),
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: hs.codeLev2 },
                        "accName"
                    ),
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: hs.codeLev1 },
                        "accName"
                    ),
                ]);
                sarafsl.push({
                    code,
                    hs,
                    moeen: moeen.accName,
                    kol: kol.accName,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: sarafsl,
            });
        } catch (error) {
            console.error("Error in getHesabByListCode: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getHesabByTypeAndLevel(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const level1 = req.body.level1;
            const level2 = req.body.level2;
            const type = req.body.type;

            const query = { agencyId, type, enable: true };
            if (level1 && level2) {
                query.codeLev1 = level1;
                query.codeLev2 = level2;
            }

            const hesabs = await this.ListAcc.find(
                query,
                "code codeLev1 codeLev2 codeLev3 groupId type nature levelEnd"
            );

            let sarafsl = [];
            for (const hs of hesabs) {
                const [code, moeen, kol] = await Promise.all([
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: hs.codeLev3 },
                        "accName"
                    ),
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: hs.codeLev2 },
                        "accName"
                    ),
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: hs.codeLev1 },
                        "accName"
                    ),
                ]);
                sarafsl.push({
                    code,
                    hs,
                    moeen: moeen.accName,
                    kol: kol.accName,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: sarafsl,
            });
        } catch (error) {
            console.error("Error in getHesabByTypeAndLevel: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getSharingSarafal(req, res) {
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

            const listAccs = await this.ListAcc.find({
                agencyId,
                percent: { $gte: 0 },
                enable: true,
            });

            let sarafsl = [];
            for (const acc of listAccs) {
                const [code, moeen, kol] = await Promise.all([
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: acc.codeLev3 },
                        "accName accCode levelType desc"
                    ),
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: acc.codeLev2 },
                        "accName"
                    ),
                    this.LevelAccDetail.findOne(
                        { agencyId, accCode: acc.codeLev1 },
                        "accName"
                    ),
                ]);
                sarafsl.push({ acc, code, moeen, kol });
            }

            return this.response({
                res,
                message: "ok",
                data: sarafsl,
            });
        } catch (error) {
            console.error("Error in getSharingSarafal: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setGroupAcc(req, res) {
        try {
            const id = req.body.id;
            const agencyId = req.body.agencyId;
            const name = req.body.name;
            const mainId = req.body.mainId;
            const desc = req.body.desc ?? "";
            console.log("name", name);

            if (!ObjectId.isValid(id)) {
                const lastGroup = await this.GroupAcc.find(
                    { agencyId },
                    "groupId"
                )
                    .sort({ groupId: -1 })
                    .limit(1);
                const groupId =
                    lastGroup.length > 0 ? lastGroup[0].groupId + 1 : 1;
                let gp = new this.GroupAcc({
                    agencyId,
                    groupId,
                    name,
                    mainId,
                    desc,
                    editor: req.user._id,
                });
                await gp.save();
                return this.response({
                    res,
                    message: "ok",
                    data: gp,
                });
            }
            console.log("id", id);
            const gp = await this.GroupAcc.findByIdAndUpdate(id, {
                name: name,
                desc: desc,
                mainId: mainId,
                editor: req.user._id,
            });
            return this.response({
                res,
                message: "ok",
                data: gp,
            });
        } catch (error) {
            console.error("Error in setGroupAcc: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setLevelAccDetail(req, res) {
        try {
            const id = req.body.id;
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const name = req.body.name;
            const code = req.body.code;
            const levelNo = req.body.levelNo;

            if (id.trim().length < 5) {
                const checkCode = await this.LevelAccDetail.countDocuments({
                    agencyId,
                    levelNo,
                    accCode: code,
                });
                const checkName = await this.LevelAccDetail.countDocuments({
                    agencyId,
                    levelNo,
                    accName: name,
                });
                if (checkCode > 0 || checkName > 0) {
                    return this.response({
                        res,
                        code: 402,
                        message: "name or code is duplicated",
                    });
                }

                let ld = new this.LevelAccDetail({
                    agencyId,
                    levelNo,
                    accCode: code,
                    accName: name,
                    editor: req.user._id,
                });
                await ld.save();
                return this.response({
                    res,
                    message: "ok",
                    data: ld.id,
                });
            }
            const ld = await this.LevelAccDetail.findByIdAndUpdate(id, {
                accName: name,
                editor: req.user._id,
            });
            return this.response({
                res,
                message: "ok",
                data: ld.id,
            });
        } catch (error) {
            console.error("Error in setLevelAccDetail: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setSarfasl(req, res) {
        const id = req.body.id;
        const agencyId = req.body.agencyId;
        const code = req.body.code;
        const codeLev1 = req.body.codeLev1;
        const codeLev2 = req.body.codeLev2;
        const codeLev3 = req.body.codeLev3;
        const groupId = req.body.groupId;
        const type = req.body.type;
        const nature = req.body.nature;
        const levelEnd = req.body.levelEnd;
        const enable = req.body.enable;

        try {
            if (id === null || id.trim().length < 5) {
                const listAcc = await this.ListAcc.findOne({ agencyId, code });
                if (listAcc) {
                    return this.response({
                        res,
                        code: 204,
                        message: "this code is duplicated",
                    });
                }
                let la = new this.ListAcc({
                    agencyId,
                    code,
                    codeLev1,
                    codeLev2,
                    codeLev3,
                    groupId,
                    type,
                    nature,
                    levelEnd,
                    enable,
                    editor: req.user._id,
                });
                await la.save();
                return this.response({
                    res,
                    message: "ok",
                    data: la.id,
                });
            }
            const listAcc = await this.ListAcc.findById(id);
            if (!listAcc.canEdit) {
                return this.response({
                    res,
                    code: 205,
                    message: "cant edit this code",
                });
            }
            const gp = await this.ListAcc.findByIdAndUpdate(id, {
                code,
                codeLev1,
                codeLev2,
                codeLev3,
                groupId,
                type,
                nature,
                levelEnd,
                enable,
                editor: req.user._id,
            });
            return this.response({
                res,
                message: "ok",
                data: gp.id,
            });
        } catch (error) {
            console.error("Error in setSarfasl: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setPercent(req, res) {
        const id = req.body.id;
        const percent = req.body.percent;

        try {
            await this.ListAcc.findByIdAndUpdate(id, {
                percent,
                editor: req.user._id,
            });
            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error in setPercent: ", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();

function pad(width, string, padding) {
    return width <= string.length
        ? string
        : pad(width, padding + string, padding);
}
