const controller = require("../controller");
module.exports = new (class extends controller {
    async insertHoliday(req, res) {
        // try {
        const year = req.body.year;
        const month = req.body.month;
        const day = req.body.day;
        const state = req.body.state;
        let desc = "";
        if (req.body.desc != undefined) desc = req.body.desc;
        let district = [];
        if (req.body.district != undefined) district = req.body.district;
        let city = [];
        if (req.body.city != undefined) city = req.body.city;
        let grad = [];
        if (req.body.grad != undefined) grad = req.body.grad;
        let shift = [];
        if (req.body.shift != undefined) shift = req.body.shift;
        let school = [];
        if (req.body.school != undefined) school = req.body.school;

        let studentId = "";
        if (req.body.studentId != undefined) studentId = req.body.studentId;
        let serviceNum = -1;
        if (req.body.serviceNum != undefined) serviceNum = req.body.serviceNum;
        var qr;

        let holiday = await this.Holiday.findOne({
            year,
            month,
            day,
            userId: req.user._id,
            studentId,
        });
        if (holiday) {
            holiday.state = state;
            holiday.desc = desc;
            holiday.district = district;
            holiday.city = city;
            holiday.grad = grad;
            holiday.shift = shift;
            holiday.school = school;
            await holiday.save();
            return this.response({
                res,
                message: "ok",
            });
        }
        holiday = new this.Holiday({
            userId: req.user._id,
            year,
            month,
            day,
            state,
            desc,
            district,
            city,
            grad,
            shift,
            school,
            studentId,
            serviceNum,
        });
        await holiday.save();
        return this.response({
            res,
            message: "ok",
        });
        // } catch (error) {
        //     console.error("Error in insertHoliday:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }

    async getHolidays(req, res) {
        // try {
        if (
            req.query.year === undefined ||
            req.query.month === undefined ||
            req.query.year.trim() === "" ||
            req.query.month.trim() === ""
        ) {
            return this.response({
                res,
                code: 214,
                message: "year and month need",
            });
        }
        const year = req.query.year;
        const month = req.query.month;

        const holidays = await this.Holiday.find({ year, month });

        return this.response({
            res,
            message: "ok",
            data: holidays,
        });
        // } catch (error) {
        //     console.error("Error in getHolidays:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }

    async getSpacialHoliday(req, res) {
        // try {
        const year = req.body.year;
        const month = req.body.month;
        let district = [];
        if (req.body.district != undefined) district = req.body.district;
        let day = -1;
        if (req.body.day != undefined) day = req.body.day;
        let studentId = "";
        if (req.body.studentId != undefined) studentId = req.body.studentId;
        let city = [];
        if (req.body.city != undefined) city = req.body.city;
        let grad = [];
        if (req.body.grad != undefined) grad = req.body.grad;
        let shift = [];
        if (req.body.shift != undefined) shift = req.body.shift;
        let school = [];
        if (req.body.school != undefined) school = req.body.school;

        let serviceNum = -1;
        if (req.body.serviceNum != undefined) serviceNum = req.body.serviceNum;

        var qr = [];
        //  var or=[];
        //  if(studentId!=null){
        //   or.push({studentId})
        //  }
        //  if(serviceNum!=-1){
        //   or.push({serviceNum})
        //  }
        var searchQ = {
            $or: [
                { $and: [{ studentId }, { serviceNum }] },
                {
                    $and: [
                        { studentId },
                        { school: { $in: school } },
                        { shift: { $in: shift } },
                        { grad: { $in: grad } },
                        { district: { $in: district } },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: { $in: school } },
                        { shift: { $in: shift } },
                        { grad: { $in: grad } },
                        { district: { $in: district } },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: { $in: shift } },
                        { grad: { $in: grad } },
                        { district: { $in: district } },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: [] },
                        { grad: { $in: grad } },
                        { district: { $in: district } },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: [] },
                        { grad: { $in: grad } },
                        { district: [] },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: [] },
                        { grad: [] },
                        { district: { $in: district } },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: [] },
                        { grad: [] },
                        { district: [] },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: [] },
                        { grad: [] },
                        { district: [] },
                        { city: [] },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: { $in: shift } },
                        { grad: [] },
                        { district: [] },
                        { city: [] },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: [] },
                        { grad: { $in: grad } },
                        { district: [] },
                        { city: [] },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: { $in: shift } },
                        { grad: [] },
                        { district: [] },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: [] },
                        { grad: { $in: grad } },
                        { district: [] },
                        { city: { $in: city } },
                    ],
                },
                {
                    $and: [
                        { studentId: "" },
                        { school: [] },
                        { shift: { $in: shift } },
                        { grad: { $in: grad } },
                        { district: [] },
                        { city: { $in: city } },
                    ],
                },
            ],
        };
        qr.push({ year });
        qr.push({ month });
        if (day != -1) qr.push({ day });
        else qr.push(searchQ);

        const holidays = await this.Holiday.find({ $and: qr });
        return this.response({
            res,
            message: "ok",
            data: holidays,
        });
        // } catch (error) {
        //     console.error("Error in getSpacialHoliday:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }

    async getMonthHolidayAndServiceNums(req, res) {
        // try {
        const year = req.body.year;
        const month = req.body.month;
        const day = req.body.day;
        let serviceNums = req.body.serviceNums;

        var qr = [];
        // console.log("year=", year);
        // console.log("month=", month);
        var searchQ = {
            $or: [{ serviceNum: -1 }, { serviceNum: { $in: serviceNums } }],
        };
        qr.push({ year });
        qr.push({ month });
        // if(day!=-1)qr.push({ day });
        // else
        qr.push(searchQ);

        let hol = [];
        const holidays = await this.Holiday.find({ $and: qr });
        for (var h of holidays) {
            if (h.serviceNum != -1 && h.serviceNum != "") {
                const service = await this.Service.findOne(
                    { serviceNum: h.serviceNum },
                    "serviceNum driverPic driverName driverCar driverCarPelak driverPhone agencyId driverId time"
                );
                hol.push({ holiday: h, service });
            } else hol.push({ holiday: h });
        }

        return this.response({
            res,
            message: "ok",
            data: hol,
        });
        // } catch (error) {
        //     console.error("Error in getMonthHolidayAndServiceNums:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }
})();
