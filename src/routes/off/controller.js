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
            console.log("logo", logo);
            console.log("id", id);
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

            const company= await this.Company.findById(id
               , "name phones desc logo"
            ).lean();
                let address = await this.Address.find({
                    companyId: company._id,
                });
                company.address = address;
               
            
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
                location,
                agencyIds,
            } = req.body;
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
                   location: { type: "Point", coordinates: location },
                    agencyIds,
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
                   location: { type: "Point", coordinates: location },
                    agencyIds,
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
    async getOffPackByCompanyId(req, res) {
        try {
            const { companyId } = req.query;
            const offpacks = await this.OffPack.find({
                companyId,
            });
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
                    active: true,state:{$gte:1}
                },
                "agencyId studentCode name"
            ).lean();
            const maxDate = new Date();
            for (var st of myStudents) {
                if (!st.agencyId) continue;
                const agency = await this.Agency.findById(
                    st.agencyId,
                    "cityId"
                );
                console.log("agency",agency);
                if (agency) {
                    let offpacks = await this.OffPack.find({
                        $and: [
                            { cityId: agency.cityId },
                            { delete: false },
                            { active: true },
                            { "agencyIds.id": { $ne: agency._id.toString() } },
                            {
                                $or: [
                                    { maxDate: null },
                                    { maxDate: "" },
                                    { maxDate: { $lte: maxDate } },
                                ],
                            },
                        ],
                    },'-agencyIds -updatedAt -__v -createdAt -active').lean();
                    //   console.log("offpacks",offpacks.length);
                    for (var off of offpacks) {
                        const myOffer = await this.OffCode.findOne({
                            userId: req.user._id,
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
})();
