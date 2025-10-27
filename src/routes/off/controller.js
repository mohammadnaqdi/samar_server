const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const qs = require("qs");
const persianDate = require("persian-date");
const axios = require("axios");
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;

module.exports = new (class extends controller {
    async setCompany(req, res) {
        try {
            const {
                id,
                name,
                admin,
                operator,
                phones,
                desc,
                logo,
                active,
                cityId,
            } = req.body;
            // console.log("logo", logo);
            // console.log("id", id);
            if (id && ObjectId.isValid(id)) {
                await this.Company.findByIdAndUpdate(id, {
                    name,
                    admin,
                    operator,
                    phones,
                    desc,
                    logo,
                    active,
                    cityId,
                });
                return this.response({
                    res,
                    data: id,
                    message: "edit ok",
                });
            } else {
                let co = new this.Company({
                    name,
                    admin,
                    operator,
                    phones,
                    desc,
                    logo,
                    active,
                    cityId,
                });
                await co.save();
                return this.response({
                    res,
                    data: co._id,
                    message: "insert ok",
                });
            }
        } catch (e) {
            console.error("Error while setCompany:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getCompanies(req, res) {
        try {
            if (req.query.cityId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "cityId need",
                });
            }

            const cityId = req.query.cityId;

            const companies = await this.Company.find(
                { delete: false, cityId: cityId },
                "-__v -updatedAt -createdAt"
            ).lean();
            for (var i in companies) {
                let address = await this.Address.find({
                    companyId: companies[i]._id,
                });
                let admin = await this.User.findById(
                    companies[i].admin,
                    "phone userName active"
                );
                let operator = await this.User.findById(
                    companies[i].operator,
                    "phone userName active"
                );
                companies[i].address = address;
                companies[i].admin = admin;
                companies[i].operator = operator;
            }
            return this.response({
                res,
                data: companies,
            });
        } catch (e) {
            console.error("Error while getCompanies:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getCompanyById(req, res) {
        try {
            if (req.query.id === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "id need",
                });
            }

            const id = req.query.id;
            const offIdForMax = req.query.offIdForMax || "";

            let company = await this.Company.findById(
                id,
                "name phones desc logo"
            ).lean();
            let address = await this.Address.find({
                companyId: company._id,
            });
            company.address = address;
            if (offIdForMax.trim() != "") {
                const useCount = await this.OffCode.countDocuments({
                    offPackId: offIdForMax,
                    isUsed: true,
                });
                company.useCount = useCount;
            } else {
                company.useCount = 0;
            }

            return this.response({
                res,
                data: company,
            });
        } catch (e) {
            console.error("Error while getCompanyById:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setAddressCo(req, res) {
        try {
            const {
                id,
                address,
                cityId,
                details = "",
                companyId,
                location,
            } = req.body;
            if (id && ObjectId.isValid(id)) {
                await this.Address.findByIdAndUpdate(id, {
                    address,
                    cityId,
                    details,
                    companyId,
                    location: { type: "Point", coordinates: location },
                });
                return this.response({
                    res,
                    data: id,
                    message: "edit ok",
                });
            } else {
                let co = new this.Address({
                    address,
                    cityId,
                    details,
                    companyId,
                    location: { type: "Point", coordinates: location },
                });
                await co.save();
                return this.response({
                    res,
                    data: co._id,
                    message: "insert ok",
                });
            }
        } catch (e) {
            console.error("Error while setAddressCo:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setOffPack(req, res) {
        try {
            const {
                id,
                title,
                shortDesc,
                desc,
                smallPic,
                pic,
                address,
                link,
                max,
                maxDate,
                cityId,
                details,
                companyId,
                price,
                agencyIds,
                active,
            } = req.body;
            let location = req.body.location || [0.0, 0.0];
            if (location.length < 2) {
                location = [0.0, 0.0];
            }
            console.log("active", active);
            if (id && ObjectId.isValid(id)) {
                await this.OffPack.findByIdAndUpdate(id, {
                    title,
                    shortDesc,
                    desc,
                    smallPic,
                    pic,
                    address,
                    link,
                    max,
                    maxDate,
                    cityId,
                    details,
                    companyId,
                    price,
                    location: { type: "Point", coordinates: location },
                    agencyIds,
                    active,
                });
                return this.response({
                    res,
                    data: id,
                    message: "edit ok",
                });
            } else {
                let co = new this.OffPack({
                    title,
                    shortDesc,
                    desc,
                    smallPic,
                    pic,
                    address,
                    link,
                    max,
                    maxDate,
                    cityId,
                    details,
                    companyId,
                    price,
                    location: { type: "Point", coordinates: location },
                    agencyIds,
                    active,
                });
                await co.save();
                return this.response({
                    res,
                    data: co._id,
                    message: "insert ok",
                });
            }
        } catch (e) {
            console.error("Error while setOffPack:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async deleteOffPack(req, res) {
        try {
            const { id } = req.query;

            if (id && ObjectId.isValid(id)) {
                const count=await this.OffCode.countDocuments({
                    offPackId:id,
                    isUsed:true
                });
                if(count && count>0){
                     return this.response({
                    res,code:203,
                    data: count,
                    message: "cant delete",
                });
                }
                await this.OffCode.deleteMany({offPackId:id});
                await this.OffPack.findByIdAndDelete(id);
                return this.response({
                    res,
                    message: "delete",
                });
            } else {
                return this.response({
                    res,
                    code: 304,
                    message: "id need",
                });
            }
        } catch (e) {
            console.error("Error while setOffPack:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getOffPackByCompanyId(req, res) {
        try {
            const { companyId } = req.query;
            const offpacks = await this.OffPack.find({
                companyId,
            }).lean();
            for (var p of offpacks) {
                const useCount = await this.OffCode.countDocuments({
                    offPackId: p._id,
                    isUsed: true,
                });
                const allCount = await this.OffCode.countDocuments({
                    offPackId: p._id,
                });
                p.useCount = useCount;
                p.allCount = allCount;
            }
            return this.response({
                res,
                data: offpacks,
            });
        } catch (e) {
            console.error("Error while getOffPackByCompanyId:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getMyOffer(req, res) {
        try {
            const myStudents = await this.Student.find(
                {
                    parent: req.user._id,
                    delete: false,
                    active: true,
                    state: { $gte: 1 },
                },
                "agencyId studentCode name"
            ).lean();
            const today = new Date();
            for (var st of myStudents) {
                if (!st.agencyId) continue;
                const agency = await this.Agency.findById(
                    st.agencyId,
                    "cityId"
                );
                // console.log("agency", agency);
                if (agency) {
                    let offpacks = await this.OffPack.find(
                        {
                            $and: [
                                { cityId: agency.cityId },
                                { delete: false },
                                { active: true },
                                {
                                    "agencyIds.id": {
                                        $ne: agency._id.toString(),
                                    },
                                },
                                {
                                    $or: [
                                        { maxDate: null },
                                        { maxDate: "" },
                                        { maxDate: { $gte: today } },
                                    ],
                                },
                            ],
                        },
                        "-agencyIds -updatedAt -__v -createdAt -active"
                    ).lean();
                    // console.log("offpacks", offpacks.length);
                    for (var off of offpacks) {
                        const myOffer = await this.OffCode.findOne({
                            forCode: st.studentCode,
                            offPackId: off._id,
                        });
                        if (off.max > 0) {
                            const count = await this.OffCode.countDocuments({
                                offPackId: off._id,
                                isUsed: true,
                            });
                            if (count >= off.max) continue;
                            off.counter = count;
                        }
                        off.myOffer = myOffer;
                    }

                    st.offpacks = offpacks;
                }
            }

            return this.response({
                res,
                data: myStudents,
            });
        } catch (e) {
            console.error("Error while getMyOffer:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getMyOfferSummary(req, res) {
        try {
            let myStudents = await this.Student.find(
                {
                    parent: req.user._id,
                    delete: false,
                    active: true,
                    state: { $gte: 1 },
                },
                "agencyId studentCode name"
            ).lean();
            const today = new Date();
            let amountAll = 0;
            for (var st of myStudents) {
                if (!st.agencyId) continue;
                const agency = await this.Agency.findById(
                    st.agencyId,
                    "cityId"
                );
                // console.log("agency", agency);
                if (agency) {
                    let amount = 0;
                    let offpacks = await this.OffPack.find(
                        {
                            $and: [
                                { cityId: agency.cityId },
                                { delete: false },
                                { active: true },
                                {
                                    "agencyIds.id": {
                                        $ne: agency._id.toString(),
                                    },
                                },
                                {
                                    $or: [
                                        { maxDate: null },
                                        { maxDate: "" },
                                        { maxDate: { $gte: today } },
                                    ],
                                },
                            ],
                        },
                        "max price"
                    ).lean();
                    // console.log("offpacks", offpacks.length);
                    for (var i = 0; i < offpacks.length; i++) {
                        var off = offpacks[i];
                        const myOffer = await this.OffCode.findOne({
                            forCode: st.studentCode,
                            offPackId: off._id,
                        });
                        if (myOffer && myOffer.isUsed) {
                            continue;
                        }
                        if (off.max > 0) {
                            const count = await this.OffCode.countDocuments({
                                offPackId: off._id,
                                isUsed: true,
                            });
                            if (count >= off.max) continue;
                            // off.counter = count;
                        }
                        amount = amount + off.price;
                        amountAll = amountAll + off.price;
                    }

                    st.amount = amount;
                }
            }

            return this.response({
                res,
                data: myStudents,
            });
        } catch (e) {
            console.error("Error while getMyOffer:", e);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setNewUserForOffCo(req, res) {
        try {
            const { phone, userName, password, name, lastName, changePass } =
                req.body;
            let user = await this.User.findOne({
                phone: phone.trim(),
            });
            let user2 = await this.User.findOne({
                userName: userName,
            });
            if (user && user2) {
                if (user.id != user2.id) {
                    return res
                        .status(616)
                        .json({ msg: "this userName is duplicated" });
                }
            }
            if (user2 && !user) {
                return res
                    .status(616)
                    .json({ msg: "this userName is duplicated" });
            }
            const change = {
                userName,
            };
            if (changePass) {
                change.password = pass;
            }
            if (user) {
                user = await this.User.findByIdAndUpdate(user._id, change, {
                    new: true,
                    upsert: true,
                });
            } else {
                user = new this.User({
                    phone,
                    userName,
                    password,
                    name,
                    lastName,
                });
                await user.save();
            }
            await this.updateRedisDocument(`user:${user._id}`, user.toObject());
            return this.response({
                res,
                message: "ok",
                data: user.id,
            });
        } catch (error) {
            console.error("Error while setNewUserForOffCo:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setAndGetMyOffer(req, res) {
        try {
            const { studentId, offPackId } = req.query;
            if (
                studentId &&
                ObjectId.isValid(studentId) &&
                offPackId &&
                ObjectId.isValid(offPackId)
            ) {
                const st = await this.Student.findById(
                    studentId,
                    "studentCode state active delete"
                ).lean();
                if (!st) {
                    return res
                        .status(404)
                        .json({ msg: "student is deleted or not active" });
                }
                if (st.delete || !st.active || st.state === 0) {
                    return res
                        .status(404)
                        .json({ msg: "student is deleted or not active" });
                }
                const offCode = await this.OffCode.findOne({
                    offPackId,
                    forCode: st.studentCode,
                });
                if (offCode) {
                    return this.response({
                        res,
                        data: offCode,
                    });
                }
                const offPack = await this.OffPack.findById(offPackId).lean();
                if (!offPack) {
                    return res.status(404).json({ msg: "offPack not find" });
                }
                if (!offPack.active || offPack.delete) {
                    return res.status(404).json({ msg: "offPack not find" });
                }
                if (offPack.max > 0) {
                    const count = await this.OffCode.countDocuments({
                        offPackId: offPack._id,
                        isUsed: true,
                    });
                    if (count >= offPack.max) {
                        return res
                            .status(303)
                            .json({ msg: "offPack is max used" });
                    }
                }
                let newOff = new this.OffCode({
                    companyId: offPack.companyId,
                    offPackId: offPack._id,
                    userId: req.user._id,
                    forStudent: true,
                    forCode: st.studentCode,
                });
                await newOff.save();

                return this.response({
                    res,
                    data: newOff,
                });
            }
            return res.status(404).json({ msg: "studentId,offPackId need" });
        } catch (error) {
            console.error("Error while setAndGetMyOffer:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async setOfferP(req, res) {
        try {
            const { code, coId } = req.query;
            if (!coId && !ObjectId.isValid(coId)) {
                return res.status(204).json({ error: "code coId need" });
            }
            if (!code) {
                return res.status(204).json({ error: "code coId need" });
            }
            // console.log("code", code);
            // console.log("coId", coId);
            const co = await this.Company.findById(
                coId,
                "admin operator"
            ).lean();
            if (!co) {
                return res.status(401).json({ msg: "co not find" });
            }
            if (
                co.admin.toString() !== req.user._id.toString() &&
                co.operator.toString() !== req.user._id.toString()
            ) {
                return res.status(401).json({ msg: "you cant access" });
            }
            // console.log("co", co._id);
            let offCode = await this.OffCode.findOne({
                $and: [
                    {
                        $or: [{ code: code }, { code: code.toUpperCase() }],
                    },
                    { companyId: co._id },
                    // { isUsed: false },
                ],
            }).lean();
            if (!offCode) {
                return this.response({
                    res,
                    code: 404,
                    message: "offCode not find",
                });
            }
            const offPack = await this.OffPack.findById(
                offCode.offPackId,
                "title desc max maxDate smallPic address active "
            ).lean();
            if (!offPack) {
                return this.response({
                    res,
                    code: 404,
                    message: "offPack not find",
                });
            }
            let useCount = await this.OffCode.countDocuments({
                offPackId: offPack._id,
                isUsed: true,
            });
            let allCount = await this.OffCode.countDocuments({
                offPackId: offPack._id,
            });
            if (offCode.isUsed) {
                const user = await this.User.findById(
                    offCode.operator,
                    "userName -_id"
                ).lean();
                return this.response({
                    res,
                    data: { offCode, offPack, useCount, user, allCount },
                });
            }
            if (offPack.max > 0 && useCount > offPack.max) {
                return res.status(303).json({ msg: "offPack is max used" });
            }
            const now = new Date();
            if (offPack.maxDate && offPack.maxDate < now) {
                return res.status(305).json({ msg: "offPack expired" });
            }

            // offCode.isUsed = true;
            // offCode.useDate = new Date();
            // offCode.operator = req.user._id;
            // await offCode.save();
            await this.OffCode.findByIdAndUpdate(offCode._id, {
                isUsed: true,
                useDate: new Date(),
                operator: req.user._id,
            });
            useCount++;
            allCount++;

            return this.response({
                res,
                data: { offCode, offPack, useCount, allCount },
            });
        } catch (error) {
            console.error("Error while setOfferP:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
