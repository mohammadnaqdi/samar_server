const controller = require("../controller");
const { isValidObjectId } = require("mongoose");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const JSZip = require("jszip");
const zipFile = new JSZip();
const PersianDate = require("persian-date");
const sharp = require("sharp");
const axios = require("axios");

function formatPersianDate(dateString) {
    const date = dateString
        ? new PersianDate(new Date(dateString))
        : new PersianDate();

    // const persianDate = date.format("HH:mm:ss YYYY/MM/DD");
    const persianDate = date.format("YYYY/MM/DD");
    return persianDate.replace(/[۰-۹]/g, (d) =>
        String.fromCharCode(d.charCodeAt(0) - 1728)
    );
}

const imageOptions = {
    getImage(tagValue) {
        if (Buffer.isBuffer(tagValue)) {
            return tagValue;
        }

        if (typeof tagValue === "string" && tagValue.startsWith("data:image")) {
            const base64Data = tagValue.split(",")[1];
            return Buffer.from(base64Data, "base64");
        }
        return fs.readFileSync(tagValue);
    },
    getSize(img, tagValue, tagName) {
        if (tagName === "agency_signiture") return [150, 150];
        return [230, 230];
    },
};

async function convertImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            validateStatus: () => true,
        });
        if (response.status == 404) {
            return false;
        }
        const jpegBuffer = await sharp(Buffer.from(response.data))
            // .flatten({ background: { r: 255, g: 255, b: 255 } })
            .png({ quality: 100 })
            .toBuffer();
        return jpegBuffer;
    } catch (err) {
        console.error("Error during the process", err);
        throw err;
    }
}

function addCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = new (class extends controller {
    async byPhone(req, res) {
        const phone = req.query.phone;

        if (!phone) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        try {
            const data = await this.fetchDatabyPhone(phone);

            if (data.length === 0) {
                return res.status(404).json({ result: "No data found" });
            }

            for (const parent of data) {
                const agency_contract = parent.agency_contract;
                if (!agency_contract || agency_contract == "") return null;
                const p = path.join(
                    __basedir,
                    "/startup/contracts/",
                    agency_contract
                );

                const templateContent = fs.readFileSync(p, "binary");

                const parentPicUrl = `https://server.mysamar.ir/${parent.contract.pic}`;
                const parentBuffer = await convertImage(parentPicUrl);
                if (!parentBuffer) continue;
                const parentBase64 =
                    "data:image/jpeg;base64," + parentBuffer.toString("base64");

                let agencyBuffer = "";
                if (parent.agency_id == "686ba83db884deb46134263c") {
                    agencyBuffer =
                        "./assets/signature/686ba83db884deb46134263c.png";
                } else if (parent.agency_id == "688af959f04e0209ff689663") {
                    agencyBuffer =
                        "./assets/signature/688af959f04e0209ff689663.png";
                } else if (parent.agency_id == "686659530ac17b8808ceaa11") {
                    agencyBuffer =
                        "./assets/signature/686659530ac17b8808ceaa11.png";
                } else if (parent.agency_id == "68b81e1305f06f6f3ec0ae1b") {
                    agencyBuffer =
                        "./assets/signature/68b81e1305f06f6f3ec0ae1b.png";
                } else if (parent.agency_id == "686ba6b1b884deb4613424a0") {
                    agencyBuffer =
                        "./assets/signature/686ba6b1b884deb4613424a0.png";
                } else {
                    // const agencyPicUrl = `https://server.mysamar.ir/${data.agency_pic}`;
                    // const agencyB = await convertImage(agencyPicUrl);
                    // if (!agencyB) continue;

                    // agencyBuffer =
                    //     "data:image/jpeg;base64," + agencyB.toString("base64");
                    agencyBuffer = "./assets/signature/Empty signiture.png";
                }

                const zip = new PizZip(templateContent);

                const doc = new Docxtemplater(zip, {
                    paragraphLoop: false,
                    linebreaks: true,
                    modules: [new ImageModule(imageOptions)],
                });

                const co =
                    parent.contract.serviceCostMonth *
                    parent.contract.contractMonths;
                const price = addCommas(co);
                const months = parent.contractMonths;

                doc.render({
                    parent_name: parent.contract.parentName,
                    student_name:
                        parent.contract.studentFirstName +
                        " " +
                        parent.contract.studentLastName,
                    nationalCode: parent.contract.studentNationalCode,
                    phone: parent.contract.parentPhone,
                    agency_name: parent.agency_name,
                    agency_phone: parent.agency_name,
                    parent_address: parent.contract.address,
                    regNumber: parent.agency_regNumber,
                    agency_address: parent.agency_address,
                    agency_nationalID: parent.agency_nationalID,
                    agency_tel: parent.agency_tel,
                    agency_signiture: agencyBuffer,
                    parent_signiture: parentBase64,
                    price:
                        typeof price === "number" && !isNaN(price)
                            ? price
                            : "...............",
                    start: parent.contract.contractStart,
                    months: months,
                    school_name: parent.school_name,
                    monthly_cost: parent.contract.serviceCostMonth,
                });

                const buf = doc.getZip().generate({ type: "nodebuffer" });
                zipFile.file(
                    `${parent.contract.studentFirstName} ${parent.contract.studentLastName}.docx`,
                    buf
                );
            }

            const zipBuf = await zipFile.generateAsync({ type: "nodebuffer" });
            const dir = path.join(__basedir, "/documents/", `${phone}.zip`);
            fs.writeFileSync(dir, zipBuf);

            const downloadUrl = `https://server.${process.env.URL}/api/download?data=${phone}.zip`;
            return res.json({
                message: "Successfully generated",
                downloadLink: downloadUrl,
            });
        } catch (error) {
            console.error("Error generating parent contract:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async bySchoolId(req, res) {
        console.log("byschoolId", req.query);
        const { schoolId } = req.query;
        if (schoolId && !isValidObjectId(schoolId)) {
            return res.status(400).json({ result: "Invalid schoolId" });
        }
        let contracts = [];
        let fileName = "";
        try {
            const data = await this.fetchDatabySchoolId(schoolId);
            if (data.length === 0) {
                return res.status(404).json({ result: "No data found" });
            }
            contracts = data.contracts;
            fileName = data.school_name;

            for (const parent of contracts) {
                const agency_contract = data.agency_contract;
                if (!agency_contract || agency_contract == "") {
                    return res.status(404).json({ result: "No data found" });
                }

                const dir = path.join(
                    __basedir,
                    "/startup/contracts/",
                    agency_contract
                );
                const templateContent = fs.readFileSync(dir, "binary");

                const parentPicUrl = `https://server.mysamar.ir/${parent.pic}`;
                const parentBuffer = await convertImage(parentPicUrl);
                if (!parentBuffer) continue;

                const parentBase64 =
                    "data:image/jpeg;base64," + parentBuffer.toString("base64");
                let agencyBuffer = "";
                if (data.agency_id == "686ba83db884deb46134263c") {
                    agencyBuffer =
                        "./assets/signature/686ba83db884deb46134263c.png";
                } else if (data.agency_id == "688af959f04e0209ff689663") {
                    agencyBuffer =
                        "./assets/signature/688af959f04e0209ff689663.png";
                } else if (data.agency_id == "686659530ac17b8808ceaa11") {
                    agencyBuffer =
                        "./assets/signature/686659530ac17b8808ceaa11.png";
                } else if (data.agency_id == "68b81e1305f06f6f3ec0ae1b") {
                    agencyBuffer =
                        "./assets/signature/68b81e1305f06f6f3ec0ae1b.png";
                } else if (data.agency_id == "686ba6b1b884deb4613424a0") {
                    agencyBuffer =
                        "./assets/signature/686ba6b1b884deb4613424a0.png";
                } else {
                    // const agencyPicUrl = `https://server.mysamar.ir/${data.agency_pic}`;
                    // const agencyB = await convertImage(agencyPicUrl);
                    // if (!agencyB) continue;

                    // agencyBuffer =
                    //     "data:image/jpeg;base64," + agencyB.toString("base64");
                    agencyBuffer = "./assets/signature/Empty signiture.png";
                }

                const zip = new PizZip(templateContent);

                const doc = new Docxtemplater(zip, {
                    paragraphLoop: false,
                    linebreaks: true,
                    modules: [new ImageModule(imageOptions)],
                });

                const co = parent.serviceCostMonth * parent.contractMonths;
                const price = addCommas(co);
                const months = parent.contractMonths;

                doc.render({
                    parent_name: parent.parentName,
                    student_name:
                        parent.studentFirstName + " " + parent.studentLastName,
                    nationalCode: parent.studentNationalCode,
                    phone: parent.parentPhone,
                    agency_name: data.agency_name,
                    parent_address: parent.address,
                    agency_tel: data.agency_tel,
                    agency_signiture: agencyBuffer,
                    parent_signiture: parentBase64,
                    regNumber: parent.agency_regNumber || "-",
                    agency_address: data.agency_address,
                    agency_admin_name: data.agency_admin_name || "-",
                    agency_nationalID: data.agency_nationalID,
                    price:
                        typeof price === "number" && !isNaN(price)
                            ? price
                            : "...............",

                    start: parent.contractStart,
                    months: months,
                    agency_phone: data.agency_name,
                    school_name: data.school_name,
                    monthly_cost: parent.serviceCostMonth,
                });

                const buf = doc.getZip().generate({ type: "nodebuffer" });
                zipFile.file(
                    `${parent.studentFirstName} ${parent.studentLastName}.docx`,
                    buf
                );
            }

            const zipBuf = await zipFile.generateAsync({
                type: "nodebuffer",
            });

            const p = path.join(__basedir, "/documents/", `${fileName}.zip`);
            fs.writeFileSync(p, zipBuf);

            const downloadUrl = `https://server.${process.env.URL}/api/download?data=${fileName}.zip`;
            return res.json({
                message: "Successfully generated",
                downloadLink: downloadUrl,
            });
        } catch (error) {
            console.error("Error generating contract by schoolId:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async byStudentId(req, res) {
        const { studentId } = req.query;
        if (!isValidObjectId(studentId)) {
            return res.status(400).json({ result: "Invalid studentId" });
        }
        let fileName = "";
        try {
            const data = await this.fetchDatabyStudentId(studentId);
            if (data == null) {
                return res.status(404).json({ result: "No data found" });
            }
            fileName =
                data.contract.studentFirstName +
                "_" +
                data.contract.studentLastName;

            const agency_contract = data.agency_contract;
            if (!agency_contract || agency_contract == "") {
                return res.status(404).json({ result: "No data found" });
            }

            const dir = path.join(
                __basedir,
                "/startup/contracts/",
                agency_contract
            );
            const templateContent = fs.readFileSync(dir, "binary");

            const parentPicUrl = `https://server.mysamar.ir/${data.contract.pic}`;
            const parentBuffer = await convertImage(parentPicUrl);
            if (!parentBuffer) {
                return res.status(400).json({
                    message: "Failed to generate word file",
                    downloadLink: null,
                });
            }

            const parentBase64 =
                "data:image/jpeg;base64," + parentBuffer.toString("base64");

            let agencyBuffer = "";
            if (data.agency_id == "686ba83db884deb46134263c") {
                agencyBuffer =
                    "./assets/signature/686ba83db884deb46134263c.png";
            } else if (data.agency_id == "688af959f04e0209ff689663") {
                agencyBuffer =
                    "./assets/signature/688af959f04e0209ff689663.png";
            } else if (data.agency_id == "686659530ac17b8808ceaa11") {
                agencyBuffer =
                    "./assets/signature/686659530ac17b8808ceaa11.png";
            } else if (data.agency_id == "68b81e1305f06f6f3ec0ae1b") {
                agencyBuffer =
                    "./assets/signature/68b81e1305f06f6f3ec0ae1b.png";
            } else if (data.agency_id == "686ba6b1b884deb4613424a0") {
                agencyBuffer =
                    "./assets/signature/686ba6b1b884deb4613424a0.png";
            } else {
                agencyBuffer = "./assets/signature/Empty signiture.png";
            }

            const zip = new PizZip(templateContent);

            const doc = new Docxtemplater(zip, {
                paragraphLoop: false,
                linebreaks: true,
                modules: [new ImageModule(imageOptions)],
            });

            const co =
                data.contract.serviceCostMonth * data.contract.contractMonths;
            const price = addCommas(co);
            const months = data.contract.contractMonths;

            doc.render({
                parent_name: data.contract.parentName,
                student_name:
                    data.contract.studentFirstName +
                    " " +
                    data.contract.studentLastName,
                nationalCode: data.contract.studentNationalCode,
                phone: data.contract.parentPhone,
                agency_name: data.agency_name,
                parent_address: data.contract.address,
                agency_tel: data.agency_tel,
                agency_signiture: agencyBuffer,
                parent_signiture: parentBase64,
                regNumber: data.agency_regNumber || "-",
                agency_address: data.agency_address,
                agency_nationalID: data.agency_nationalID,
                price:
                    typeof price === "number" && !isNaN(price)
                        ? price
                        : "...............",
                start: data.contract.contractStart,
                agency_phone: data.agency_name,
                agency_admin_name: data.agency_admin_name || "-",
                months: months,
                school_name: data.school_name,
                monthly_cost: data.contract.serviceCostMonth,
            });

            const buf = doc.getZip().generate({ type: "nodebuffer" });
            const p = path.join(__basedir, "/documents/", `${fileName}.docx`);
            fs.writeFileSync(p, buf);

            const downloadUrl = `https://server.${process.env.URL}/api/download?data=${fileName}.docx`;
            return res.json({
                message: "Successfully generated",
                downloadLink: downloadUrl,
            });
        } catch (error) {
            console.error("Error generating contract by studentId:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async fetchDatabySchoolId(schoolId) {
        try {
            const school = await this.School.findById(schoolId).lean();
            if (!school) {
                console.log("School not found");
                return [];
            }

            const contracts = await this.SignedContract.find({
                schoolId,
            }).lean();
            if (contracts.length === 0) {
                console.log("No contract found");
                return [];
            }

            const agency = await this.Agency.findById(school.agencyId).lean();

            if (!agency) {
                console.log("Agency not found");
                return [];
            }

            const agency_admin = await this.User.findById(agency.admin).lean();

            const data = {
                agency_id: agency._id.toString(),
                agency_name: agency.name,
                agency_address: agency.address,
                agency_contract: agency.contract,
                agency_nationalID: agency.nationalID,
                agency_regNumber: agency.registrationNumber,
                agency_tel: agency.tel,
                agency_phone: agency_admin.phone,
                agency_pic: agency.pic,
                school_name: school.name,
                contracts: [],
            };

            for (const contract of contracts) {
                const std = await this.Student.findById(
                    contract.studentId
                ).lean();
                if (!std) {
                    console.error(
                        `Student not found with ID: ${contract.studentId}`
                    );
                    continue;
                }
                const add = { ...contract, studentCode: std.studentCode };
                data.contracts.push(add);
            }

            if (data.contracts.length === 0) {
                return [];
            }

            return data;
        } catch (error) {
            console.error("Error fetching data:", error);
            return [];
        }
    }

    async fetchDatabyStudentId(studentId) {
        try {
            const student = await this.Student.findById(studentId).lean();
            if (!student) {
                console.log("Student not found");
                return null;
            }

            const ctr = await this.SignedContract.findOne({
                studentId: student._id,
            })
                .sort({ _id: -1 })
                .lean();
            if (!ctr) {
                console.log("Contract not found for student ID:", student._id);
                return null;
            }

            const school = await this.School.findById(student.school).lean();
            if (!school) {
                console.log("School not found");
                return null;
            }

            const agency = await this.Agency.findById(school.agencyId).lean();

            if (!agency) {
                console.log("Agency not found");
                return null;
            }

            const agency_admin = await this.User.findById(
                agency.users[0]
            ).lean();
            if (!agency_admin) {
                console.log("Agency admin not found");
                return null;
            }

            const data = {
                agency_id: agency._id.toString(),
                agency_name: agency.name,
                agency_address: agency.address,
                agency_contract: agency.contract,
                agency_nationalID: agency.nationalID,
                agency_regNumber: agency.registrationNumber,
                agency_tel: agency.tel,
                agency_phone: agency_admin.phone,
                agency_admin_name:
                    agency_admin.name + " " + agency_admin.lastName,
                agency_pic: agency.pic,
                school_name: school.name,
                contract: ctr,
                studentCode: student.studentCode,
            };

            return data;
        } catch (error) {
            console.error("Error fetching data:", error);
            return [];
        }
    }

    async fetchDatabyPhone(phone) {
        try {
            const parent = await this.Parent.findOne({ phone }).lean();
            if (!parent) {
                console.log(`Parent not found with phone: ${phone}`);
                return [];
            }

            const contracts = await this.SignedContract.find({
                userId: parent._id,
            }).lean();
            if (contracts.length === 0) {
                console.log(`No data found for parent ID: ${parent._id}`);
                return [];
            }

            const data = [];

            for (const contract of contracts) {
                const student = await this.Student.findOne({
                    parent: parent._id,
                }).lean();
                if (!student) {
                    console.log(
                        `Student not found for parent ID: ${parent._id}`
                    );
                    return [];
                }

                const school = await this.School.findById(
                    student.school
                ).lean();
                if (!school) {
                    console.log(
                        `School not found for school ID: ${student.school}`
                    );
                    return [];
                }

                const agency = await this.Agency.findById(
                    school.agencyId
                ).lean();
                if (!agency) {
                    console.log(
                        `Agency not found for school ID: ${school._id}`
                    );
                    return [];
                }

                const agency_admin = await this.User.findById(
                    agency.users[0]
                ).lean();
                if (!agency_admin) {
                    console.log(
                        `Agency admin not found for admin ID: ${agency.admin}`
                    );
                    return [];
                }

                const add = {
                    agency_id: agency._id.toString(),
                    agency_name: agency.name,
                    agency_contract: agency.contract,
                    agency_address: agency.address,
                    agency_nationalID: agency.nationalID,
                    agency_regNumber: agency.registrationNumber,
                    agency_admin_name:
                        agency_admin.name + " " + agency_admin.lastName,
                    agency_tel: agency.tel,
                    agency_phone: agency_admin.phone,
                    agency_pic: agency.pic,
                    school_name: school.name,
                    contract: { ...contract, studentCode: student.studentCode },
                };
                data.push(add);
            }

            return data;
        } catch (error) {
            console.error("Error while fetching data by phone:", error);
        }
    }
})();
