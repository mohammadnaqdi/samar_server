const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
module.exports = new (class extends controller {
    async update(req, res) {
        try {
            let user = await this.User.findById(req.user._id);

            user.name = req.body.name;
            if (req.body.pic != undefined) user.pic = req.body.pic;
            if (req.body.gender != undefined) user.gender = req.body.gender;
            if (req.body.password != undefined)
                user.password = req.body.password;

            if (req.body.tell != undefined) userInfo.tell = req.body.tell;
            if (req.body.iCode != undefined) userInfo.iCode = req.body.iCode;
            if (req.body.fatherName != undefined)
                userInfo.fatherName = req.body.fatherName;
            if (req.body.home != undefined) userInfo.home = req.body.home;
            if (req.body.device != undefined) userInfo.device = req.body.device;
            if (req.body.brand != undefined) userInfo.brand = req.body.brand;
            if (req.body.office != undefined) userInfo.office = req.body.office;
            if (req.body.logo != undefined) userInfo.logo = req.body.logo;
            if (req.body.job != undefined) userInfo.job = req.body.job;
            if (req.body.skill != undefined) userInfo.skill = req.body.skill;
            if (req.body.factoryAddress != undefined)
                userInfo.factoryAddress = req.body.factoryAddress;
            if (req.body.email != undefined) userInfo.email = req.body.email;
            if (req.body.whats_up != undefined)
                userInfo.whats_up = req.body.whats_up;
            if (req.body.telegram != undefined)
                userInfo.telegram = req.body.telegram;
            if (req.body.twitter != undefined)
                userInfo.twitter = req.body.twitter;
            if (req.body.web != undefined) userInfo.web = req.body.web;
            if (req.body.insta != undefined) userInfo.insta = req.body.insta;
            await user.save();
            await this.updateRedisDocument(`user:${user._id}`, user.toObject());

            await userInfo.save();
            return this.response({
                res,
                message: "update successfully",
            });
        } catch (error) {
            console.error("Error while updating user:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setName(req, res) {
        try {
            let id = req.user._id;
            const isParent = req.body.isParent || req.user.isParent;
            let user = isParent
                ? await this.Parent.findById(id)
                : await this.User.findById(id);
            if (!user) {
                return res.status(214).json({ msg: "user not find" });
            }
            if (req.body.name != undefined) user.name = req.body.name.trim();
            if (req.body.lastName != undefined)
                user.lastName = req.body.lastName.trim();
            if (req.body.gender != undefined) user.gender = req.body.gender;
            if (
                req.body.password != undefined &&
                req.body.lastPass != undefined &&
                req.body.userName != undefined
            ) {
                const lastPass = req.body.lastPass.trim();
                const password = req.body.password.trim();
                const userName = req.body.userName.trim();
                if (user.password != lastPass) {
                    return res.status(204).json({ msg: "lastPass not valid" });
                }
                user.password = password;
                user.userName = userName;
            }
            await user.save();
            await this.updateRedisDocument(
                isParent ? `parent:${user._id}` : `user:${user._id}`,
                user.toObject()
            );

            return this.response({
                res,
                message: "update successfully",
            });
        } catch (error) {
            console.error("Error while setting user name:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setNationalCode(req, res) {
        try {
            let idUser = req.user._id;
            const id = req.body.id;
            const nt = req.body.nt;
            if (id === "me") {
                await this.User.findByIdAndUpdate(idUser, {
                    nationalCode: nt,
                });
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );
                return this.response({
                    res,
                    message: "update successfully",
                });
            }
            await this.User.findByIdAndUpdate(id, {
                nationalCode: nt,
            });
            await this.updateRedisDocument(`user:${user._id}`, {
                nationalCode: nt,
            });

            return this.response({
                res,
                message: "update successfully",
            });
        } catch (error) {
            console.error("Error while setting user' nationalCode:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getNationalCode(req, res) {
        try {
            let idUser = req.user._id;
            const id = req.query.id;
            if (id === "me" || id === undefined) {
                const nt = await this.User.findById(idUser, "nationalCode");
                return this.response({
                    res,
                    data: nt,
                });
            }
            const nt = await this.User.findById(id, "nationalCode");
            return this.response({
                res,
                data: nt,
            });
        } catch (error) {
            console.error("Error while getting user's nationalCode:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setNameAsAdmin(req, res) {
        try {
            let id = req.body.id;
            const isParent = req.body.isParent || false;
            let user;
            if (id.toString().trim() === "") {
                if (req.body.phone === undefined) {
                    return res
                        .status(215)
                        .json({ msg: "phone for new user need" });
                }
                user = isParent
                    ? await this.Parent.findOne({ phone: req.body.phone })
                    : await this.User.findOne({ phone: req.body.phone });
                if (user) {
                    // return res.status(216).json({ msg: "this phone is repeat" });
                } else {
                    user = isParent
                        ? new this.Parent({
                              phone: req.body.phone,
                              userName: req.body.phone,
                          })
                        : new this.User({
                              phone: req.body.phone,
                              userName: req.body.phone,
                          });
                }
            } else {
                user = isParent
                    ? await this.Parent.findById(id)
                    : await this.User.findById(id);
                if (!user) {
                    return res.status(214).json({ msg: "user not find" });
                }
            }
            // console.log("userName", req.body.userName);

            if (req.body.name != undefined) user.name = req.body.name.trim();
            if (req.body.lastName != undefined)
                user.lastName = req.body.lastName.trim();
            if (req.body.device != undefined) user.device = req.body.device;
            // if(req.body.isadmin!=undefined)user.isadmin=req.body.isadmin;
            if (req.body.gender != undefined) user.gender = req.body.gender;
            if (req.user.isadmin) {
                if (req.body.isAgencyAdmin != undefined)
                    user.isAgencyAdmin = req.body.isAgencyAdmin;
                if (req.body.isSupport != undefined)
                    user.isSupport = req.body.isSupport;
                if (req.body.isSchoolAdmin != undefined)
                    user.isSchoolAdmin = req.body.isSchoolAdmin;
                if (
                    req.body.password != undefined &&
                    req.body.password != "***"
                )
                    user.password = req.body.password.trim();
                if (req.body.userName != undefined) {
                    const userf = await this.User.findOne({
                        userName: req.body.userName.trim(),
                        phone: { $ne: req.body.phone },
                    });
                    if (userf) {
                        return res
                            .status(217)
                            .json({ msg: "username is duplicated" });
                    }
                    user.userName = req.body.userName.trim();
                }
            }

            if (req.body.active != undefined) user.active = req.body.active;
            if (req.body.inActvieReason != undefined)
                user.inActvieReason = req.body.inActvieReason;

            await user.save();
            await this.updateRedisDocument(`user:${user._id}`, user.toObject());

            return this.response({
                res,
                message: "ok",
                data: user.id,
            });
        } catch (error) {
            console.error("Error while setting name as admin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setNewUser(req, res) {
        try {
            let user = await this.User.findOne({
                phone: req.body.phone.trim(),
            });
            if (user) {
                // return res.status(216).json({ msg: "this phone is repeat" });
            } else {
                user = new this.User({
                    phone: req.body.phone.trim(),
                    userName: req.body.phone.trim(),
                    name: req.body.name.trim(),
                    lastName: req.body.lastName.trim(),
                });
                await user.save();
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );
            }
            return this.response({
                res,
                message: "ok",
                data: user.id,
            });
        } catch (error) {
            console.error("Error while setNewUser:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setNewParent(req, res) {
        try {
            let user = await this.Parent.findOne({
                phone: req.body.phone.trim(),
            });
            if (user) {
                // return res.status(216).json({ msg: "this phone is repeat" });
            } else {
                user = new this.Parent({
                    phone: req.body.phone.trim(),
                    userName: req.body.phone.trim(),
                    name: req.body.name.trim(),
                    lastName: req.body.lastName.trim(),
                });
                await user.save();
                await this.updateRedisDocument(
                    `parent:${user._id}`,
                    user.toObject()
                );
            }
            return this.response({
                res,
                message: "ok",
                data: user.id,
            });
        } catch (error) {
            console.error("Error while setNewParent:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    // async sendNotif2User(req,res){

    //   let id=req.body.userId;
    //   let user=await this.User.findById(id,'fcm');
    //   if(!user || user.delete){
    //     return res.status(214).json({ msg: "user not find" });
    //   }
    //   if(user.fcm.length>0){
    //     var registrationTokens = [];
    //         for (var j in user.fcm) {
    //           let registrationToken = user.fcm[j].token;
    //           if (registrationToken.toString() !== "")
    //             registrationTokens.push(registrationToken);
    //         }

    //         if (registrationTokens != []) {
    //           const message = {
    //             notification: {
    //               title: req.body.title,
    //               body: req.body.text,
    //             },
    //             tokens: registrationTokens,
    //           };
    //           admin
    //             .messaging()
    //             .sendMulticast(message)
    //             .then(function (response) {
    //               // console.log("successfully sent =", response);
    //               // console.log("successfully sent =", response.responses[0].error);
    //             })
    //             .catch(function (err) {
    //               console.log("error sent =", err);
    //             });
    //         }

    //     return this.response({
    //           res,message:'ok',data:registrationTokens.length
    //          });
    //          return;

    //   }else{
    // return this.response({
    //       res,code:204,message:'not find any fcm token',
    //      });
    //      return;
    //   }

    //  }

    async userList(req, res) {
        try {
            const search = req.body.search.trim();
            let page = req.body.page;

            if (page < 0) page = 0;

            var needList =
                "phone userName isadmin active lastName name gender inActvieReason device updatedAt createdAt isAgencyAdmin isSupport isSchoolAdmin";

            let users;
            if (search != "") {
                users = await this.User.find(
                    {
                        $or: [
                            { phone: { $regex: ".*" + search + ".*" } },
                            { name: { $regex: ".*" + search + ".*" } },
                            { lastName: { $regex: ".*" + search + ".*" } },
                        ],
                    },
                    needList
                )
                    .skip(page * 40)
                    .limit(40)
                    .sort({ _id: -1 });
            } else {
                users = await this.User.find({}, needList)
                    .skip(page * 40)
                    .limit(40)
                    .sort({ _id: -1 });
            }

            let usersList = [];
            for (var i = 0; i < users.length; i++) {
                let students = await this.Student.find(
                    { parent: users[i].id },
                    "studentCode name lastName parentReleation state stateTitle serviceNum active"
                );

                usersList.push({
                    user: users[i],
                    students: students,
                });
            }

            return this.response({
                res,
                message: "ok",
                data: usersList,
            });
        } catch (error) {
            console.error("Error while getting usersList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async userCheckLogin(req, res) {
        try {
            const userId = req.user._id;
            const isParent = req.user.isParent;
            let user = isParent
                ? await this.Parent.findById(userId)
                : await this.User.findById(userId);
            const token = req.header("x-auth-token");
            var ip =
                req.headers["x-forwarded-for"] || req.connection.remoteAddress;
            ip = ip.replace("::", "");

            var exist = -1;
            for (var i in user.fcm) {
                if (user.fcm[i].tk === token) {
                    exist = i;
                    break;
                }
            }
            if (exist > -1) {
                const device = user.fcm[exist].device;
                const fcmtoken = user.fcm[exist].token;
                user.fcm.pull(user.fcm[exist]);
                user.fcm.push({
                    device: device,
                    token: fcmtoken,
                    ip: ip,
                    date: new Date(),
                    tk: token,
                });
                await user.save();
                await this.updateRedisDocument(
                    isParent ? `parent:${user._id}` : `user:${user._id}`,
                    user.toObject()
                );
            }

            if (exist) {
                return this.response({
                    res,
                    message: "ok",
                    data: { name: user.name, lastName: user.lastName },
                });
            }
            return this.response({
                res,
                code: 401,
                message: "login again",
            });
        } catch (error) {
            console.error("Error while userCheckLogin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async inspectorCheckLogin(req, res) {
        try {
            const userId = req.user._id;
            let user = await this.User.findById(userId);
            const token = req.header("x-auth-token");
            var ip =
                req.headers["x-forwarded-for"] || req.connection.remoteAddress;
            ip = ip.replace("::", "");
            if (!user.isadmin || !user.active) {
                return this.response({
                    res,
                    code: 401,
                    message: "login again",
                });
            }

            var exist = -1;
            for (var i in user.fcm) {
                if (user.fcm[i].tk === token) {
                    exist = i;
                    break;
                }
            }
            if (exist > -1) {
                const device = user.fcm[exist].device;
                const fcmtoken = user.fcm[exist].token;
                user.fcm.pull(user.fcm[exist]);
                user.fcm.push({
                    device: device,
                    token: fcmtoken,
                    ip: ip,
                    date: new Date(),
                    tk: token,
                });
                await user.save();
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );
            }

            if (exist) {
                return this.response({
                    res,
                    message: "ok",
                    data: { name: user.name, lastName: user.lastName },
                });
            }
            return this.response({
                res,
                code: 401,
                message: "login again",
            });
        } catch (error) {
            console.error("Error while inspectorCheckLogin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getUserInfo(req, res) {
        try {
            const userId = req.query.userId;
            if (userId == undefined || userId.trim() === "") {
                return this.response({
                    res,
                    code: 401,
                    message: "userId need",
                });
            }
            const userInfo = await this.UserInfo.findOne({ userId });
            return this.response({
                res,
                message: "ok",
                data: userInfo,
            });
        } catch (error) {
            console.error("Error while getting user info:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getUserAdmin(req, res) {
        try {
            const users = await this.User.find(
                { isadmin: true, delete: false, isSuperAdmin: false },
                "phone userName active name lastName ban"
            );
            return this.response({
                res,
                data: users,
            });
        } catch (error) {
            console.error("Error while getting user admin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getUserOperator(req, res) {
        try {
            const agencyId = req.query.agencyId;
            if (agencyId == undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const agency = await this.Agency.findById(agencyId, "users");
            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not find",
                });
            }
            const users = await this.User.find(
                {
                    delete: false,
                    isSuperAdmin: false,
                    isAgencyAdmin: false,
                    _id: { $in: agency.users },
                },
                "phone userName active name lastName ban"
            );
            return this.response({
                res,
                data: users,
            });
        } catch (error) {
            console.error("Error while getUserOperator:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async searchPhone(req, res) {
        try {
            const phone = req.query.phone;
            const isParent = req.query.isParent;
            if (phone == undefined || phone.trim() === "") {
                return this.response({
                    res,
                    code: 404,
                    message: "phone need",
                });
            }
            if (!isParent) {
                return this.response({
                    res,
                    code: 404,
                    message: "isParent need",
                });
            }
            const user =
                isParent === "true"
                    ? await this.Parent.findOne({ phone }).lean()
                    : await this.User.findOne(
                          { phone, delete: false },
                          "name lastName active userName isAgencyAdmin isSchoolAdmin isadmin inActvieReason"
                      ).lean();
            if (!user) {
                return this.response({
                    res,
                    message: "notFind",
                    data: {},
                });
            }
            return this.response({
                res,
                message: "ok",
                data: user,
            });
        } catch (error) {
            console.error("Error while searchPhone:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setUserAdmin(req, res) {
        try {
            const id = req.body.id;
            const name = req.body.name;
            const lastName = req.body.lastName;
            const isAdmin = req.body.isAdmin;
            const phone = req.body.phone;
            const userName = req.body.userName;
            const password = req.body.password;
            const changePass = req.body.changePass;
            const banList = req.body.banList ?? [];

            const userTest = await this.User.findOne({
                userName: userName,
                phone: { $ne: phone },
            });

            if (userTest) {
                return this.response({
                    res,
                    code: 223,
                    message: "this userName is exist",
                    data: {
                        fa_m: "این نام کاربری تکراری است",
                        name: userTest.name,
                        lastName: userTest.lastName,
                    },
                });
            }

            let user = await this.User.findOne({ phone: phone });
            if (user) {
                if (
                    (!user && id != 0) ||
                    (user && user.id.toString() != id.toString()) ||
                    user.isAgencyAdmin ||
                    user.isSuperAdmin ||
                    user.isSupport ||
                    user.isSchoolAdmin ||
                    !user.active
                ) {
                    return this.response({
                        res,
                        code: 204,
                        message: "set user is in troble",
                        data: user,
                    });
                }
            }

            if (user) {
                user.name = name;
                user.lastName = lastName;
                user.isadmin = isAdmin;
                user.ban = banList;
                user.userName = userName;
                if (changePass) user.password = password;
                await user.save();
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );

                return this.response({
                    res,
                    data: user._id,
                });
            }
            user = new this.User({
                phone: phone,
                userName,
                password,
                isadmin: isAdmin,
                name: name,
                lastName: lastName,
                ban: banList,
            });
            await user.save();
            await this.updateRedisDocument(`user:${user._id}`, user.toObject());

            return this.response({
                res,
                data: user._id,
            });
        } catch {
            console.error("Error while setting user admin:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setUserOperator(req, res) {
        try {
            const id = req.body.id;
            const name = req.body.name;
            const lastName = req.body.lastName;
            const isAdmin = req.body.isAdmin;
            const phone = req.body.phone;
            const userName = req.body.userName;
            const password = req.body.password;
            const changePass = req.body.changePass;
            const agencyId = req.body.agencyId;
            const banList = req.body.banList ?? [];
            const agency = await this.Agency.findById(agencyId, "users");

            if (!agency) {
                return this.response({
                    res,
                    code: 404,
                    message: "agency not find",
                });
            }

            const userTest = await this.User.findOne({
                userName: userName,
                phone: { $ne: phone },
            });

            if (userTest) {
                return this.response({
                    res,
                    code: 223,
                    message: "this userName is exist",
                    data: {
                        fa_m: "این نام کاربری تکراری است",
                        name: userTest.name,
                        lastName: userTest.lastName,
                    },
                });
            }

            let user = await this.User.findOne({ phone: phone });
            if (user) {
                if (
                    (!user && id != 0) ||
                    (user && user.id.toString() != id.toString()) ||
                    user.isAgencyAdmin ||
                    user.isSuperAdmin ||
                    user.isadmin ||
                    user.isSchoolAdmin
                ) {
                    return this.response({
                        res,
                        code: 204,
                        message: "set user be wrong",
                        data: user,
                    });
                }
            }

            if (user) {
                const agency2 = await this.Agency.findOne({
                    users: ObjectId.createFromHexString(id),
                    _id: { $ne: agency._id },
                });
                if (agency2) {
                    return this.response({
                        res,
                        code: 405,
                        message: "agency before define",
                    });
                }
                user.name = name;
                user.lastName = lastName;
                user.isSupport = isAdmin;
                // user.ban = banList;
                user.userName = userName;
                if (changePass) user.password = password;
                if (isAdmin) {
                    await this.Agency.findByIdAndUpdate(agencyId, {
                        $push: { users: user._id },
                    });
                } else {
                    await this.Agency.findByIdAndUpdate(agencyId, {
                        $pull: { users: user._id },
                    });
                }

                await user.save();
                await this.updateRedisDocument(
                    `user:${user._id}`,
                    user.toObject()
                );

                return this.response({
                    res,
                    data: user._id,
                });
            }
            user = new this.User({
                phone: phone,
                userName,
                password,
                name: name,
                isSupport: isAdmin,
                lastName: lastName,
                banList,
            });
            await user.save();
            await this.updateRedisDocument(`user:${user._id}`, user.toObject());
            if (isAdmin) {
                await this.Agency.findByIdAndUpdate(agencyId, {
                    $push: { users: user._id },
                });
            } else {
                await this.Agency.findByIdAndUpdate(agencyId, {
                    $pull: { users: user._id },
                });
            }

            return this.response({
                res,
                data: user._id,
            });
        } catch {
            console.error("Error while setUserOperator:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setUserOperatorBanList(req, res) {
        try {
            const id = req.body.id;
            const banList = req.body.banList ?? [];

            let user = await this.User.findByIdAndUpdate(id, { ban: banList });
            await this.updateRedisDocument(`user:${user._id}`, {
                ban: banList,
            });

            if (!user) {
                return this.response({
                    res,
                    code: 404,
                    message: "user not find",
                });
            }

            return this.response({
                res,
                message: "ok",
            });
        } catch {
            console.error("Error while setUserOperatorBanList:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getRule(req, res) {
        try {
            const { type, id } = req.query;
            const grade = req.query.grade || "-1";
            if (type === undefined || id === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "type id need",
                });
            }
            const agencyId = ObjectId.createFromHexString(id);

            const rules =
                grade === "-1"
                    ? await this.Rule.find({
                          type,
                          agencyId,
                          show: true,
                          grade: { $in: [-1, null] },
                      })
                    : await this.Rule.find({
                          type,
                          agencyId,
                          show: true,
                          grade: parseInt(grade),
                      });

            return this.response({
                res,
                message: "Retreived.",
                data: rules,
            });
        } catch (error) {
            console.error("Error while getting rules:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAgencyUsers(req, res) {
        try {
            const { agencyId } = req.query;

            const agency = await this.Agency.findById(agencyId).lean();

            if (!agency) {
                return res.status(404).json({ error: "Agency not found." });
            }

            const admin = await this.User.findById(
                agency.admin,
                "name lastName"
            ).lean();

            if (!admin) {
                return res.status(404).json({ error: "Admin not found." });
            }

            const users = await this.User.find(
                {
                    _id: { $in: agency.users },
                },
                "name lastName"
            ).lean();

            return this.response({
                res,
                data: {
                    users,
                    admin,
                },
            });
        } catch (error) {
            console.error("Error in getAgencyUsers:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
