const controller = require("../controller");
const mongoose = require("mongoose");
const axios = require("axios");
const ObjectId = mongoose.Types.ObjectId;
const School = require("../../models/school");
const Student = require("../../models/student");
const { Pack, Exception, GroupPack } = require("../../models/pack");

async function getDrivingClosest(origin, candidates) {
    if (!candidates.length) return null;

    const allCoords = [
        origin.location.coordinates,
        ...candidates.map((s) => s.location.coordinates),
    ];
    const coordStr = allCoords.map((c) => c.join(",")).join(";");

    try {
        const res = await axios.get(
            `${process.env.ROUTE_URL}/table/v1/driving/${coordStr}`,
            {
                params: {
                    sources: "0",
                    annotations: "duration",
                },
            }
        );

        const durations = res.data.durations?.[0]?.slice(1);
        if (!durations) throw new Error("No durations returned from OSRM");

        let minDuration = Infinity;
        let minIndex = -1;
        durations.forEach((d, i) => {
            if (d !== null && d < minDuration) {
                minDuration = d;
                minIndex = i;
            }
        });

        return minIndex !== -1 ? candidates[minIndex] : null;
    } catch (err) {
        console.error("⚠️ OSRM error:", err.message);
        return null;
    }
}
async function buildPack(
    seed,
    distance,
    schoolIds,
    time,
    grades,
    MAX_PER_PACK
) {
    const claimedSeed = await Student.findOneAndUpdate(
        { _id: seed._id, packed: false, isIn: false },
        { $set: { isIn: true } },
        { new: true }
    );
    if (!claimedSeed) return [];
    const pack = [claimedSeed];

    const nearbyAll = await Student.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: seed.location.coordinates },
                distanceField: "dist.calculated",
                spherical: true,
                key: "location",
                maxDistance: distance,
                query: {
                    packed: false,
                    isIn: false,
                    state: 3,
                    school: { $in: schoolIds },
                    gradeId: { $in: grades },
                    time: time,
                    _id: { $ne: seed._id },
                },
            },
        },
        { $limit: 30 },
    ]);

    let current = claimedSeed;
    const usedIds = new Set([claimedSeed._id.toString()]);

    while (pack.length < MAX_PER_PACK && nearbyAll.length > 0) {
        const candidates = nearbyAll.filter(
            (s) => !usedIds.has(s._id.toString())
        );

        const next = await getDrivingClosest(current, candidates);
        if (!next) break;

        const claimedNext = await Student.findOneAndUpdate(
            { _id: next._id, packed: false, isIn: false },
            { $set: { isIn: true } },
            { new: true }
        );

        if (!claimedNext) continue;

        pack.push(claimedNext);
        usedIds.add(claimedNext._id.toString());
        current = claimedNext;
    }

    return pack;
}

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
    //     console.error("Error while saving exception:", err);
    // }
}

module.exports = new (class extends controller {
    //for we dont need to create a new object only export directly a class

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
            const packs = await this.Pack.find({
                agencyId,
                groupId,
            });
            for (var pack of packs) {
                await this.Student.updateMany(
                    {
                        pack: pack.code,
                        state: 3,
                    },
                    { pack: -1, exception: false, packed: false, isIn: false }
                );
            }
            await this.Pack.deleteMany({ agencyId, groupId });
            await this.Exception.deleteMany({ agencyId, groupId });
            await this.GroupPack.findOneAndDelete({ agencyId, code: groupId });

            return this.response({
                res,
                message: "ok",
            });
        } catch (error) {
            console.error("Error while deleteGroupPack:", error);
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
    async getGroupPacks(req, res) {
        try {
            if (req.query.agencyId === undefined) {
                return this.response({
                    res,
                    code: 214,
                    message: "agencyId need",
                });
            }
            const agencyId = ObjectId.createFromHexString(req.query.agencyId);

            const groups = await this.GroupPack.find(
                { agencyId },
                "code schools grades capacity time distance"
            );

            return this.response({
                res,
                data: groups,
            });
        } catch (error) {
            console.error("Error while getGroupPacks:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
    async vroomRouting(req, res) {
        try {
            if (!req.query.packId) {
                return this.response({
                    res,
                    code: 214,
                    message: "packId need",
                });
            }
            const packId = parseInt(req.query.packId);
            let route;
            const students = await this.Student.find(
                {
                    pack: packId,
                    packed: true,
                },
                "location name lastName school studentCode"
            )
                .sort({ serviceDistance: -1 })
                .lean();
            if (students.length > 0) {
                const school = await this.School.findById(
                    students[0].school,
                    "location name"
                ).lean();
                if (!school) {
                    return this.response({
                        res,
                        code: 404,
                    });
                }
                const jobs = students.map((student, index) => {
                    const jobId = index + 1;
                    return {
                        id: parseInt(student.studentCode),
                        location: [
                            student.location.coordinates[1],
                            student.location.coordinates[0],
                        ],
                        description: student._id,
                    };
                });
                const vehicle = {
                    id: 1,
                    start: [
                        students[0].location.coordinates[1],
                        students[0].location.coordinates[0],
                    ],
                    end: [
                        school.location.coordinates[1],
                        school.location.coordinates[0],
                    ],
                    capacity: [students.length],
                    description: `School vehicle for ${packId}`,
                };
                const vroomPayload = {
                    jobs,
                    vehicles: [vehicle],
                    options: { g: true },
                };
                console.log("process.env.VROOM_URL", process.env.VROOM_URL);
                const response = await axios.post(
                    process.env.VROOM_URL,
                    vroomPayload
                );
                const result = response.data;

                if (result.code !== 0) {
                    console.error("VROOM failed:", result);
                    return;
                }

                route = result.routes[0];
                console.log("result", JSON.stringify(result));
            }

            return this.response({
                res,
                data: route,
            });
        } catch (error) {
            console.error("Error while vroomRouting:", error);
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
            const studentId = req.body.studentId;
            const packCode = req.body.packCode;
            const groupId = req.body.groupId;
            const mode = req.body.mode;
            // console.log("mode", mode);
            // console.log("groupId", groupId);
            // console.log("packCode", packCode);
            if (mode === "removeFromPack") {
                await this.Student.findByIdAndUpdate(studentId, {
                    exception: false,
                    packed: false,
                    pack: -1,
                    isIn: false,
                });
                this.response({
                    res,
                    message: "ok",
                });
                return;
            }
            // if (mode === "toException") {
            //     const point = await this.Student.findById(studentId);
            //     await save_exception(point, groupId, agencyId);

            //     if (packId != null) {
            //         const pack = await this.Pack.findByIdAndUpdate(
            //             packId,
            //             { $pull: { points: { studentId: studentId } } },
            //             { new: true }
            //         );
            //         // console.log("pack", pack);
            //         if (pack.points.length === 0) {
            //             await this.Pack.findByIdAndRemove(packId);
            //         }
            //     }
            //     this.response({
            //         res,
            //         message: "ok",
            //     });
            //     return;
            // }
            if (mode === "toPack") {
                if (packCode != -1) {
                    const pack = await this.Pack.findOne({
                        agencyId,
                        code: packCode,
                    });
                    if (pack) {
                        await this.Student.findByIdAndUpdate(studentId, {
                            exception: false,
                            packed: true,
                            pack: packCode,
                        });
                    } else {
                        this.response({
                            res,
                            code: 404,
                            message: "not find pack",
                        });
                        return;
                    }
                } else {
                    const pack = new this.Pack({
                        groupId: groupId,
                        agencyId: agencyId,
                    });
                    await pack.save();
                    await this.Student.findByIdAndUpdate(studentId, {
                        exception: false,
                        packed: true,
                        pack: pack.code,
                    });
                }

                this.response({
                    res,
                    message: "ok",
                });
                return;
            }
            if (mode === "deletePack") {
                const pack = await this.Pack.findOne({
                    agencyId,
                    groupId,
                    code: packCode,
                });
                if (pack) {
                    await this.Student.updateMany(
                        {
                            pack: pack.code,
                            state: 3,
                        },
                        {
                            pack: -1,
                            exception: false,
                            packed: false,
                            isIn: false,
                        }
                    );
                    await this.Pack.findByIdAndDelete(pack._id);
                    this.response({
                        res,
                        message: "ok",
                    });
                    return;
                }
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

    // async setPack(req, res) {
    //     try {
    //         const agencyId = ObjectId.createFromHexString(req.body.agencyId);
    //         const schoolIdB = req.body.schoolsId;
    //         const schoolsName = req.body.schoolsName;
    //         const grades = req.body.grades;
    //         let drivers = req.body.drivers;
    //         let capacity = req.body.capacity;
    //         let time = req.body.time;
    //         capacity.sort((a, b) => b - a);
    //         const smallest = capacity[capacity.length - 1];

    //         console.log("capacity", capacity);
    //         const distance = req.body.distance ?? 1500;
    //         var schoolIds = [];
    //         for (var sc of schoolIdB) {
    //             schoolIds.push(ObjectId.createFromHexString(sc));
    //         }
    //         // console.log("schoolIds", schoolIds);
    //         let first_point = await find_first(schoolIds[0]);
    //         if (!first_point) {
    //             return this.response({
    //                 res,
    //                 code: 404,
    //                 message: "first_point not find",
    //             });
    //         }
    //         // console.log("first_point", first_point);
    //         let cr = 1;
    //         let lastGeo = first_point;
    //         let st = null;
    //         let results = null;
    //         let countDoc = await Point.countDocuments({
    //             schoolId: { $in: schoolIds },
    //             packed: false,
    //             exception: false,
    //             serviceState: 1,
    //         });
    //         // console.log(`countDoc:`, countDoc);
    //         if (countDoc < 2) {
    //             return this.response({
    //                 res,
    //                 code: 405,
    //                 message: "count student is few to pack",
    //             });
    //         }
    //         let groupId = 1;
    //         const lastGp = await this.GroupPack.find({ agencyId })
    //             .sort({
    //                 groupId: -1,
    //             })
    //             .limit(1);
    //         if (lastGp.length > 0) {
    //             groupId = lastGp[0].groupId + 1;
    //         }
    //         let groupPack = new this.GroupPack({
    //             agencyId,
    //             schoolsId: schoolIds,
    //             schoolsName,
    //             grades,
    //             drivers,
    //             capacity,
    //             time,
    //             distance,
    //             groupId,
    //         });
    //         await groupPack.save();

    //         //  st = await expand_search(first_point, schoolIds);
    //         //  console.log("st", st);
    //         // console.log("distance", distance);
    //         results = await expand(first_point, distance, schoolIds);

    //         // console.log("this is 0 time to search:", results.length);
    //         let isFirst = true;

    //         while (countDoc > 0) {
    //             if (capacity.length === 0) {
    //                 console.log("All Capacities Full!");
    //                 break;
    //             }
    //             // console.log("smallest", smallest);
    //             // console.log("capacity[smallest]", capacity[smallest]);
    //             if (countDoc >= smallest) {
    //                 if (!isFirst) {
    //                     st = await expand_search(lastGeo, schoolIds);
    //                 } else {
    //                     st = first_point;
    //                 }
    //                 results = await expand(st, distance, schoolIds);
    //                 // console.log(cr, "time results count is", results.length);
    //                 // console.log(cr, "result eexx", JSON.stringify(results));
    //                 cr++;
    //             } else {
    //                 break;
    //             }
    //             if (results.length < smallest) {
    //                 countDoc--;
    //                 isFirst = false;
    //                 await save_exception(results[0], groupId, agencyId);
    //                 console.log("Document Marked As An2 Exception");
    //                 continue;
    //             }

    //             let index = 0;
    //             let packCreated = false;
    //             for (let i = 0; i < capacity.length; i++) {
    //                 const cap = capacity[i];
    //                 // console.log("Right now capacity cap is:", cap);

    //                 if (results.length - index == 0) break;

    //                 if (results.length < cap) {
    //                     // if (results.length < capacity[capacity.length - 1]) {
    //                     //   await save_exception(results[0],groupId,agencyId);
    //                     //   console.log("Document Marked As An2 Exception");
    //                     //   countDoc--;
    //                     //   break;
    //                     // }
    //                     continue;
    //                 }
    //                 let packId = 1;
    //                 const lastPack = await this.Pack.find({ agencyId })
    //                     .sort({ packId: -1 })
    //                     .limit(1);
    //                 if (lastPack.length > 0) {
    //                     packId = lastPack[0].packId + 1;
    //                 }
    //                 const pack = new this.Pack({
    //                     agencyId,
    //                     groupId,
    //                     packId,
    //                 });

    //                 for (let j = 0; j < cap; j++) {
    //                     if (index >= results.length) break;

    //                     const newPoint = {
    //                         location: results[index].location,
    //                         studentId: results[index].studentId,
    //                     };
    //                     pack.points.push(newPoint);

    //                     await this.Student.updateOne(
    //                         { _id: results[index]._id },
    //                         { $set: { packed: true, exception: false } }
    //                     );
    //                     await this.Exception.deleteMany({
    //                         pointId: results[index]._id,
    //                     });

    //                     lastGeo = results[index].location.coordinates;

    //                     index++;
    //                     countDoc--;

    //                     // console.log(
    //                     //     `Packed point: ${newPoint.studentId}, Remaining count: ${countDoc}`,
    //                     // );
    //                 }

    //                 capacity.splice(i, 1);
    //                 await pack.save();
    //                 // console.log(`Created pack with ${cap} points`);
    //                 packCreated = true;
    //                 break;
    //             }

    //             isFirst = false;
    //             // console.log(`Remaining points to process: ${countDoc}`);
    //         }
    //         console.log("Packing complete");

    //         this.response({
    //             res,
    //             message: "ok",
    //         });
    //         return;
    //     } catch (error) {
    //         console.error("Error while 00018:", error);
    //         return res.status(500).json({ error: "Internal Server Error." });
    //     }
    // }

    async setAutoPack(req, res) {
        try {
            const schoolIdB = req.body.schoolIds;
            const grades = req.body.grades;
            const capacity = req.body.capacity;
            const time = req.body.time;
            console.log("capacity", capacity);
            const distance = req.body.distance ?? 2000;
            let schoolIds = [];
            let schools = [];
            for (var sc of schoolIdB) {
                const school = await this.School.findById(
                    sc,
                    "name location agencyId"
                );
                if (school && school.agencyId) {
                    schools.push(school);
                    schoolIds.push(school._id);
                }
            }
            if (schools.length === 0) {
                return this.response({
                    res,
                    code: 404,
                    message: "schools not find",
                });
            }
            const packGroup = new GroupPack({
                schools,
                agencyId: schools[0].agencyId,
                capacity,
                grades,
                time,
                distance,
            });
            await packGroup.save();
            let countPack = 0;
            while (true) {
                const [origin] = await Student.aggregate([
                    {
                        $geoNear: {
                            near: {
                                type: "Point",
                                coordinates: schools[0].location.coordinates,
                            },
                            key: "location",
                            distanceField: "dist.calculated",
                            spherical: true,
                            query: {
                                school: { $in: schoolIds },
                                time,
                                packed: false,
                                isIn: false,
                                state: 3,
                            },
                        },
                    },
                    { $limit: 1 },
                ]);
                if (!origin) break;

                const packStudents = await buildPack(
                    origin,
                    distance,
                    schoolIds,
                    time,
                    grades,
                    capacity
                );
                const ids = packStudents.map((s) => s._id);

                const pack = new this.Pack({
                    groupId: packGroup.code,
                    agencyId: schools[0].agencyId,
                });
                await pack.save();
                countPack++;
                await Student.updateMany(
                    { _id: { $in: ids } },
                    { $set: { packed: true, isIn: true, pack: pack.code } }
                );

                // console.log(`✅ Saved ${pack.packId} with ${ids.length} students.`);
            }
            if (countPack === 0) {
                await this.GroupPack.findByIdAndDelete(packGroup._id);
            }
            console.log("Packing complete");
            this.response({
                res,
                message: "ok",
                data: packGroup,
            });
            return;
        } catch (error) {
            console.error("Error while setAutoPack:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
