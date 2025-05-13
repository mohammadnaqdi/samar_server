const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { Exception } = require("../../models/pack");
const School = require("../../models/school");
const { Student } = require("../agency/controller");

async function find_first(schoolId) {
    // try {
    const sch = await School.findById(schoolId);
    const schoolGeo = [sch.lat, sch.lng];
    let results2 = await Point.find(
        {
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: schoolGeo,
                    },
                },
            },
            schoolId,
            exception: false,
            packed: false,
            serviceState: 1,
        },
        "studentId location"
    ).limit(4);

    //  console.log("find_first2",results2)

    return results2.length > 0 ? results2[0].location.coordinates : null;
    // } catch (error) {
    //     console.error("Error in find_first:", error);
    //     return null;
    // }
}

async function expand_search(last, schoolIds) {
    // try {
    let results = await Point.find(
        {
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: last,
                    },
                },
            },
            schoolId: { $in: schoolIds },
            exception: false,
            packed: false,
            serviceState: 1,
            "location.coordinates": { $ne: last },
        },
        "studentId location"
    ).limit(1);
    return results.length > 0 ? results[0].location.coordinates : null;
    // } catch (error) {
    //     console.error("Error in expand_search:", error);
    //     return null;
    // }
}

async function expand(last, distance, schoolIds) {
    // try {
    let results = await Student.find({
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: last,
                },
                $maxDistance: distance,
            },
        },
        school: { $in: schoolIds },
        exception: false,
        packed: false,
        state: 1,
    });
    return results;
    // } catch (error) {
    //     console.error("Error in expand:", error);
    //     return [];
    // }
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function save_exception(exceptionPoint, groupId, agencyId) {
    // try {
    await Exception.create({
        pointId: exceptionPoint._id,
        groupId,
        agencyId,
        points: {
            location: exceptionPoint.location,
            studentId: exceptionPoint.studentId,
        },
    });
    await Student.updateOne(
        { _id: exceptionPoint._id },
        { $set: { exception: true, packed: false } }
    );
    // } catch (err) {
    //     console.log("Error while saving exception:", err);
    // }
}

module.exports = new (class extends controller {
    //for we dont need to create a new object only export directly a class

    async getGroupPack(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const packs = await this.GroupPack.find({ agencyId });

            return this.response({
                res,
                data: packs,
            });
        } catch (error) {
            console.error("Error while 00011:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getPacks(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.groupId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId && groupId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const groupId = parseInt(req.query.groupId);
            const packs = await this.Pack.find({ agencyId, groupId });

            return this.response({
                res,
                data: packs,
            });
        } catch (error) {
            console.error("Error while 00012:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async deleteGroupPack(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.groupId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId && groupId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const groupId = parseInt(req.query.groupId);
            const groupPack = await this.GroupPack.findOne({
                agencyId,
                groupId,
            });
            for (var sc of groupPack.schoolsId) {
                await this.Student.updateMany(
                    { school: sc },
                    { exception: false, packed: false }
                );
            }
            await this.Pack.deleteMany({ agencyId, groupId });
            await this.Exception.deleteMany({ agencyId, groupId });
            await this.GroupPack.findOneAndDelete({ agencyId, groupId });

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while 00014:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getExeptions(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.groupId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId && groupId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const groupId = parseInt(req.query.groupId);
            const exeption = await this.Exception.find({ agencyId, groupId });

            return this.response({
                res,
                data: exeption,
            });
        } catch (error) {
            console.error("Error while 00015:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async getOtherPoint(req, res) {
        try {
            if (
                req.query.agencyId === undefined ||
                req.query.groupId === undefined
            ) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId && groupId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);
            const groupId = parseInt(req.query.groupId);
            const groupPack = await this.GroupPack.findOne({
                agencyId,
                groupId,
            });
            if (!groupPack) {
                return this.response({
                    res,
                    code: 404,
                    message: "groupPack not find",
                });
            }
            var points = [];
            for (var id of groupPack.schoolsId) {
                const point = await this.Student.find({
                    school: id,
                    packed: false,
                    exception: false,
                    state: 1,
                    time: groupPack.time,
                });
                points.push(point);
            }

            return this.response({
                res,
                data: points,
            });
        } catch (error) {
            console.error("Error while 00016:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async changePack(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const studentId = ObjectId.createFromHexString(req.body.studentId);
            const idPack = req.body.packId;
            const newPackId = req.body.newPackId;
            const idPoint = req.body.pointId;
            let packId = null;
            let pointId = null;
            if (idPack != null) {
                packId = ObjectId.createFromHexString(idPack);
            }
            let newPack = null;
            if (newPackId != null) {
                newPack = ObjectId.createFromHexString(newPackId);
            }
            if (idPoint != null) {
                pointId = ObjectId.createFromHexString(idPoint);
            }
            console.log("pointId", pointId);
            // console.log("packId", packId);
            // console.log("newPack", newPack);
            const groupId = req.body.groupId;
            const mode = req.body.mode;
            if (mode === "clean") {
                let point = await this.Student.findByIdAndUpdate(studentId, {
                    exception: false,
                    packed: false,
                });

                if (pointId != null) {
                    await this.Exception.deleteMany({ pointId });
                }
                if (packId != null) {
                    const pack = await this.Pack.findByIdAndUpdate(
                        packId,
                        { $pull: { points: { studentId: studentId } } },
                        { new: true }
                    );
                    // console.log("pack", pack);
                    if (pack.points.length === 0) {
                        await this.Pack.findByIdAndRemove(packId);
                    }
                }
                this.response({
                    res,
                    message: "ok",
                });
                return;
            }
            if (mode === "toException") {
                const point = await this.Student.findById(studentId);
                await save_exception(point, groupId, agencyId);

                if (packId != null) {
                    const pack = await this.Pack.findByIdAndUpdate(
                        packId,
                        { $pull: { points: { studentId: studentId } } },
                        { new: true }
                    );
                    // console.log("pack", pack);
                    if (pack.points.length === 0) {
                        await this.Pack.findByIdAndRemove(packId);
                    }
                }
                this.response({
                    res,
                    message: "ok",
                });
                return;
            }
            if (mode === "toPack") {
                let point = await this.Student.findByIdAndUpdate(
                    studentId,
                    { exception: false, packed: true },
                    { new: true }
                );

                if (pointId != null) {
                    await this.Exception.deleteMany({ pointId });
                }
                if (packId != null) {
                    const pack = await this.Pack.findByIdAndUpdate(
                        packId,
                        { $pull: { points: { studentId: studentId } } },
                        { new: true }
                    );
                    // console.log("pack", pack);
                    if (pack.points.length === 0) {
                        await this.Pack.findByIdAndRemove(packId);
                    }
                }
                if (newPack != null) {
                    let pack = await this.Pack.findById(newPack);
                    const newPoint = {
                        location: point.location,
                        studentId: point.studentId,
                    };
                    pack.points.push(newPoint);
                    await pack.save();
                    // console.log("pack", pack);
                } else {
                    const newPoint = {
                        location: point.location,
                        studentId: point.studentId,
                    };
                    let packId = 1;
                    const lastPack = await this.Pack.find({ agencyId })
                        .sort({ packId: -1 })
                        .limit(1);
                    if (lastPack.length > 0) {
                        packId = lastPack[0].packId + 1;
                    }
                    const pack = new this.Pack({
                        agencyId,
                        groupId,
                        packId,
                        points: [newPoint],
                    });
                    await pack.save();
                }
                this.response({
                    res,
                    message: "ok",
                });
                return;
            }
            return this.response({
                res,
                code: 404,
            });
        } catch (error) {
            console.error("Error while 00017:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setPack(req, res) {
        try {
            const agencyId = ObjectId.createFromHexString(req.body.agencyId);
            const schoolIdB = req.body.schoolsId;
            const schoolsName = req.body.schoolsName;
            const grades = req.body.grades;
            let drivers = req.body.drivers;
            let capacity = req.body.capacity;
            let time = req.body.time;
            capacity.sort((a, b) => b - a);
            const smallest = capacity[capacity.length - 1];

            console.log("capacity", capacity);
            const distance = req.body.distance ?? 1500;
            var schoolIds = [];
            for (var sc of schoolIdB) {
                schoolIds.push(ObjectId.createFromHexString(sc));
            }
            // console.log("schoolIds", schoolIds);
            let first_point = await find_first(schoolIds[0]);
            if (!first_point) {
                return this.response({
                    res,
                    code: 404,
                    message: "first_point not find",
                });
            }
            // console.log("first_point", first_point);
            let cr = 1;
            let lastGeo = first_point;
            let st = null;
            let results = null;
            let countDoc = await Point.countDocuments({
                schoolId: { $in: schoolIds },
                packed: false,
                exception: false,
                serviceState: 1,
            });
            // console.log(`countDoc:`, countDoc);
            if (countDoc < 2) {
                return this.response({
                    res,
                    code: 405,
                    message: "count student is few to pack",
                });
            }
            let groupId = 1;
            const lastGp = await this.GroupPack.find({ agencyId })
                .sort({
                    groupId: -1,
                })
                .limit(1);
            if (lastGp.length > 0) {
                groupId = lastGp[0].groupId + 1;
            }
            let groupPack = new this.GroupPack({
                agencyId,
                schoolsId: schoolIds,
                schoolsName,
                grades,
                drivers,
                capacity,
                time,
                distance,
                groupId,
            });
            await groupPack.save();

            //  st = await expand_search(first_point, schoolIds);
            //  console.log("st", st);
            // console.log("distance", distance);
            results = await expand(first_point, distance, schoolIds);

            // console.log("this is 0 time to search:", results.length);
            let isFirst = true;

            while (countDoc > 0) {
                if (capacity.length === 0) {
                    console.log("All Capacities Full!");
                    break;
                }
                // console.log("smallest", smallest);
                // console.log("capacity[smallest]", capacity[smallest]);
                if (countDoc >= smallest) {
                    if (!isFirst) {
                        st = await expand_search(lastGeo, schoolIds);
                    } else {
                        st = first_point;
                    }
                    results = await expand(st, distance, schoolIds);
                    // console.log(cr, "time results count is", results.length);
                    // console.log(cr, "result eexx", JSON.stringify(results));
                    cr++;
                } else {
                    break;
                }
                if (results.length < smallest) {
                    countDoc--;
                    isFirst = false;
                    await save_exception(results[0], groupId, agencyId);
                    console.log("Document Marked As An2 Exception");
                    continue;
                }

                let index = 0;
                let packCreated = false;
                for (let i = 0; i < capacity.length; i++) {
                    const cap = capacity[i];
                    // console.log("Right now capacity cap is:", cap);

                    if (results.length - index == 0) break;

                    if (results.length < cap) {
                        // if (results.length < capacity[capacity.length - 1]) {
                        //   await save_exception(results[0],groupId,agencyId);
                        //   console.log("Document Marked As An2 Exception");
                        //   countDoc--;
                        //   break;
                        // }
                        continue;
                    }
                    let packId = 1;
                    const lastPack = await this.Pack.find({ agencyId })
                        .sort({ packId: -1 })
                        .limit(1);
                    if (lastPack.length > 0) {
                        packId = lastPack[0].packId + 1;
                    }
                    const pack = new this.Pack({
                        agencyId,
                        groupId,
                        packId,
                    });

                    for (let j = 0; j < cap; j++) {
                        if (index >= results.length) break;

                        const newPoint = {
                            location: results[index].location,
                            studentId: results[index].studentId,
                        };
                        pack.points.push(newPoint);

                        await this.Student.updateOne(
                            { _id: results[index]._id },
                            { $set: { packed: true, exception: false } }
                        );
                        await this.Exception.deleteMany({
                            pointId: results[index]._id,
                        });

                        lastGeo = results[index].location.coordinates;

                        index++;
                        countDoc--;

                        // console.log(
                        //     `Packed point: ${newPoint.studentId}, Remaining count: ${countDoc}`,
                        // );
                    }

                    capacity.splice(i, 1);
                    await pack.save();
                    // console.log(`Created pack with ${cap} points`);
                    packCreated = true;
                    break;
                }

                isFirst = false;
                // console.log(`Remaining points to process: ${countDoc}`);
            }
            console.log("Packing complete");

            this.response({
                res,
                message: "ok",
            });
            return;
        } catch (error) {
            console.error("Error while 00018:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
