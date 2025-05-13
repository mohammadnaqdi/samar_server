const controller = require("../controller");

module.exports = new (class extends controller {
    async insertHoliday(req, res) {
        // try {
        const year = req.body.year;
        const month = req.body.month;
        const day = req.body.day;
        const state = req.body.state;
        let desc = "";
        if (req.body.desc !== undefined) desc = req.body.desc;
        let district = [];
        if (req.body.district !== undefined) district = req.body.district;
        let city = [];
        if (req.body.city !== undefined) city = req.body.city;
        let grad = [];
        if (req.body.grad !== undefined) grad = req.body.grad;
        let shift = [];
        if (req.body.shift !== undefined) shift = req.body.shift;
        let school = [];
        if (req.body.school !== undefined) school = req.body.school;

        let studentId = "";
        if (req.body.studentId !== undefined) studentId = req.body.studentId;
        let serviceNum = -1;
        if (req.body.serviceNum !== undefined) serviceNum = req.body.serviceNum;

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
        //     console.error("Error while inserting holiday:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }

    async callback(req, res) {
        // try {
        console.log("finnotech", req);
        console.log("finnotech query", req.query);
        return this.response({
            res,
            message: "ok",
        });
        // } catch (error) {
        //     console.error("Error while processing callback:", error);
        //     return res.status(500).json({ error: "Internal Server Error." });
        // }
    }
})();
