const controller = require("../controller");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const config = require("config");
const Zarin = require("zarinpal-checkout");
var fs = require("fs");
const https = require("https");
const persianDate = require("persian-date");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { parse } = require("path");
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;
const SMS_SCOPES =
    "credit:sms-sayady-cheque-inquiry:get,credit:sms-sayad-accept-cheque:post,credit:sms-sayad-accept-cheque:post";
const CLIENT_SCOPES =
    "credit:sayad-transfers-chain-inquiry:post,card:information:get,oak:shahab-inquiry:get,credit:cheque-color-inquiry:get";
const NID = "0934454299";
const CLIENT = "samar";
const ENCODED_TOKEN = "c2FtYXI6bG52VERSMnBlZDJMcTJORDZvRWg=";
const REDIRECT_URL = "https://mysamar.ir/api/fin/getAuthorization";

function addTokenTime() {
    const now = new Date();
    return new Date(now.getTime() + 864000000);
}

function getChequeColorDescription(code) {
    const descriptions = {
        1: "وضعیت سفید به این معناست که صادرکننده چک فاقد هرگونه سابقه چک برگشتی بوده یا در صورت وجود سابقه، تمامی موارد رفع سوء اثر شده است.",
        2: "وضعیت زرد به معنای داشتن یک فقره چک برگشتی یا حداکثر مبلغ 50 میلیون ریال تعهد برگشتی است.",
        3: "وضعیت نارنجی نشان می دهد که صادرکننده چک دارای دو الی چهار فقره چک برگشتی یا حداکثر مبلغ 200 میلیون ریال تعهد برگشتی است.",
        4: "وضعیت قهوه ای از این حکایت دارد که صادرکننده چک دارای پنج تا ده فقره چک برگشتی یا حداکثر مبلغ 500 میلیون ریال تعهد برگشتی است.",
        5: "وضعیت قرمز نیز حاکی از این است که صادرکننده چک دارای بیش از ده فقره چک برگشتی یا بیش از مبلغ 500 میلیون ریال تعهد برگشتی است.",
    };

    return descriptions[code] || "کد وضعیت چک نامعتبر است.";
}

async function getShahabCode(nid, birthDate, identityNo) {
    try {
        const token = await getToken();

        let url = `https://api.finnotech.ir/oak/v2/clients/samar/users/${nid}/shahabInquiry?birthDate=${birthDate}`;

        const birthDateInt = parseInt(birthDate, 10);

        if (birthDateInt < 13680101) {
            url = `https://api.finnotech.ir/oak/v2/clients/samar/users/${nid}/shahabInquiry?birthDate=${birthDate}&identityNo=${identityNo}`;
        }

        const response = await axios.get(url, {
            headers: {
                Authorization: "Bearer " + token.token,
            },
        });

        if (response.data.status === "DONE") {
            return {
                message: "Done",
                shahab: response.data.result.shahabCode,
            };
        } else {
            return { message: "Failed", shahab: null };
        }
    } catch (error) {
        console.error(
            "Error while getShahabCode:",
            error.response.data || error
        );
        return { message: error, shahab: null };
    }
}

async function makeHttpsGet(url, authToken) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: "GET",
            headers: {
                Authorization: `Basic ${authToken}`,
            },
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve({ status: res.statusCode, data }));
        });

        req.on("error", reject);
        req.end();
    });
}

async function verifySMS(code, mobile, nid, trackId) {
    try {
        const body = JSON.stringify({
            mobile,
            otp: code,
            nid,
            trackId,
        });

        const verifyUrl = "https://api.finnotech.ir/dev/v2/oauth2/verify/sms";
        const parsedVerifyUrl = new URL(verifyUrl);

        const verifyOptions = {
            hostname: parsedVerifyUrl.hostname,
            path: parsedVerifyUrl.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${ENCODED_TOKEN}`,
                "Content-Length": Buffer.byteLength(body),
            },
        };

        // ✅ First request: Verify SMS OTP
        const verifyResponse = await new Promise((resolve, reject) => {
            const reqVerify = https.request(verifyOptions, (resVerify) => {
                let data = "";
                resVerify.on("data", (chunk) => (data += chunk));
                resVerify.on("end", () =>
                    resolve({ status: resVerify.statusCode, data })
                );
            });
            reqVerify.on("error", reject);
            reqVerify.write(body);
            reqVerify.end();
        });

        console.log("Verify SMS raw:", verifyResponse.data);

        let verifyParsed;
        try {
            verifyParsed = JSON.parse(verifyResponse.data);
        } catch (err) {
            console.error("Failed to parse verify SMS JSON:", err);
            return { token: null, refresh_token: null };
        }

        if (verifyParsed.status !== "DONE") {
            console.error("Error while verifySMS:", verifyParsed);
            return { token: null, refresh_token: null };
        }

        // ✅ Extract OTP code for token request
        const otpCode = verifyParsed.result.code;

        // ✅ Now request access token
        const tokenBody = JSON.stringify({
            grant_type: "authorization_code",
            code: otpCode,
            auth_type: "SMS",
            redirect_uri: REDIRECT_URL,
        });

        const tokenUrl = "https://api.finnotech.ir/dev/v2/oauth2/token";
        const parsedTokenUrl = new URL(tokenUrl);

        const tokenOptions = {
            hostname: parsedTokenUrl.hostname,
            path: parsedTokenUrl.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${ENCODED_TOKEN}`,
                "Content-Length": Buffer.byteLength(tokenBody),
            },
        };

        const tokenResponse = await new Promise((resolve, reject) => {
            const reqToken = https.request(tokenOptions, (resToken) => {
                let data = "";
                resToken.on("data", (chunk) => (data += chunk));
                resToken.on("end", () =>
                    resolve({ status: resToken.statusCode, data })
                );
            });
            reqToken.on("error", reject);
            reqToken.write(tokenBody);
            reqToken.end();
        });

        console.log("Token raw response:", tokenResponse.data);

        let tokenParsed;
        try {
            tokenParsed = JSON.parse(tokenResponse.data);
        } catch (err) {
            console.error("Failed to parse token JSON:", err);
            return { token: null, refresh_token: null };
        }

        if (tokenParsed.status === "DONE") {
            return {
                token: tokenParsed.result.value,
                refresh_token: tokenParsed.result.refreshToken,
            };
        } else {
            console.error("Error while getting sms token:", tokenParsed);
            return { token: null, refresh_token: null };
        }
    } catch (error) {
        console.error("Error while verifySMS:", error.message || error);
        return { token: null, refresh_token: null };
    }
}

async function verifyRefreshToken(refresh) {
    try {
        const body = {
            grant_type: "refresh_token",
            token_type: "CODE",
            refresh_token: refresh,
            auth_type: "SMS",
        };

        // Convert body object to JSON string
        const bodyString = JSON.stringify(body);

        const verifyUrl = "https://api.finnotech.ir/dev/v2/oauth2/token";
        const parsedVerifyUrl = new URL(verifyUrl);

        const verifyOptions = {
            hostname: parsedVerifyUrl.hostname,
            path: parsedVerifyUrl.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${ENCODED_TOKEN}`,
                "Content-Length": Buffer.byteLength(bodyString), // Use bodyString here
            },
        };

        const verifyResponse = await new Promise((resolve, reject) => {
            const reqVerify = https.request(verifyOptions, (resVerify) => {
                let data = "";
                resVerify.on("data", (chunk) => (data += chunk));
                resVerify.on("end", () =>
                    resolve({ status: resVerify.statusCode, data })
                );
            });
            reqVerify.on("error", reject);
            reqVerify.write(bodyString);
            reqVerify.end();
        });

        console.log("Verify SMS raw:", verifyResponse.data);

        let verifyParsed;
        try {
            verifyParsed = JSON.parse(verifyResponse.data);
        } catch (err) {
            console.error("Failed to parse verify SMS JSON:", err);
            return { token: null, refresh_token: null };
        }

        if (verifyParsed.status !== "DONE") {
            console.error("Error while verifySMS:", verifyParsed);
            return { token: null, refresh_token: null };
        } else {
            return {
                token: verifyParsed.result.value,
                refresh_token: verifyParsed.result.refreshToken,
            };
        }
    } catch (error) {
        console.error("Error while verifySMS:", error || error);
        return { token: null, refresh_token: null };
    }
}

async function getToken() {
    try {
        const url = "https://api.finnotech.ir/dev/v2/oauth2/token";

        const body = {
            grant_type: "client_credentials",
            nid: NID,
            scopes: CLIENT_SCOPES,
        };

        const response = await axios.post(url, body, {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + ENCODED_TOKEN,
            },
        });

        if (response.data.responseCode === "FN-BRFH-20000000000") {
            return {
                token: response.data.result.value,
                refresh_token: response.data.result.refreshToken,
            };
        } else {
            console.error("Error while getting token:", response.data);
            return {
                token: null,
                refresh_token: null,
            };
        }
    } catch (err) {
        console.error("Error while getting token:", err.response);
        return {
            token: null,
            refresh_token: null,
        };
    }
}

module.exports = new (class extends controller {
    async chequeInfo(req, res) {
        try {
            const { agencyId } = req.query;

            if (!agencyId || agencyId == "") {
                return res.status(204).json({ message: "Invalid agencyId!" });
            }

            const agency = await this.Agency.findById(agencyId).lean();
            if (!agency) {
                return res.status(204).json({ message: "Agency not found!" });
            }

            const findParent = await this.Parent.findById(req.user._id);

            const cheque = await this.SayadCheque.findOne({
                parentId: findParent._id,
            }).lean();
            if (cheque) {
                return res.json({
                    adminNid: cheque.signer.nid,
                    adminName: cheque.signer.name,
                    parentNid: cheque.holder.nid,
                    parentName: cheque.holder.name,
                    parentPhone: cheque.parentPhone,
                    parentShahab: cheque.parentShahab,
                    parentIdentityNo: cheque.parentIdentityNo,
                    parentBirthDate: cheque.parentBirthDate,
                });
            }

            const info = {};

            const findAdmin = await this.User.findById(
                agency.adminCheque
            ).lean();

            info.adminNid = findAdmin.nationalCode;
            info.adminName = findAdmin.name + " " + findAdmin.lastName;
            info.parentNid = findParent.nationalCode;
            info.parentName = findParent.name + " " + findParent.lastName;
            info.parentPhone = findParent.phone;
            info.parentBirthDate = findParent.birthDate;
            info.parentIdentityNo = findParent.identityNo;
            info.parentShahab = findParent.shahabId;
            console.log("info", info);

            return res.json(info);
        } catch (error) {
            console.error("Error while canStudentPayCheque:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async canAgencyPayCheque(req, res) {
        try {
            const { agencyId } = req.query;

            if (!agencyId || agencyId == "") {
                return res.status(204).json({ message: "Invalid agencyId!" });
            }

            const agency = await this.Agency.findById(agencyId).lean();
            if (!agency) {
                return res.status(204).json({ message: "Agency not found!" });
            }

            if (agency.acceptCheque) {
                const adminCheque = await this.User.findById(
                    agency.adminCheque
                ).lean();
                if (!adminCheque) {
                    return res.status(204).json({ message: "Admin not found" });
                }

                if (adminCheque.cheque.shahabId) {
                    const now = new Date();
                    if (!adminCheque.cheque.fin_token) {
                        return res.json({ message: false });
                    }
                    const expiry = new Date(
                        adminCheque.cheque.fin_token_expiry
                    );
                    if (now < expiry) {
                        return res.json({ message: true });
                    }
                }
            }

            return res.json({ message: false });
        } catch (error) {
            console.error("Error while canStudentPayCheque:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async setAdminInfo(req, res) {
        try {
            const {
                agencyId,
                name,
                lastName,
                nationalCode,
                phone,
                birthDate,
                identityNo,
                acceptCheque,
            } = req.body;

            if (
                !agencyId ||
                agencyId == "" ||
                !name ||
                name == "" ||
                !lastName ||
                lastName == "" ||
                !nationalCode ||
                nationalCode == "" ||
                !phone ||
                phone == "" ||
                !birthDate ||
                birthDate == ""
            ) {
                return res.status(204).json({ message: "Invalid inputs!" });
            }
            let status = "created";
            let id = "";

            const agency = await this.Agency.findById(agencyId);
            if (!agency) {
                return res.status(204).json({ message: "Invalid inputs!" });
            }
            const found = await this.User.findOne({ phone });
            if (found) {
                found.name = name;
                found.lastName = lastName;
                found.nationalCode = nationalCode;
                found.birthDate = birthDate;
                found.identityNo = identityNo;
                status = "updated";
                id = found._id;
                await found.save();
            } else {
                const newAdmin = new this.User({
                    name,
                    lastName,
                    nationalCode,
                    phone,
                    birthDate,
                    identityNo,
                });
                await newAdmin.save();
                id = newAdmin._id;
            }

            agency.adminCheque = id;
            agency.acceptCheque = acceptCheque;
            await agency.save();

            return res.json({ message: status });
        } catch (error) {
            console.error("Error while setAdminInfo:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getAdminInfo(req, res) {
        try {
            const { agencyId } = req.query;

            if (!agencyId || agencyId == "") {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid agencyId!",
                });
            }

            const agency = await this.Agency.findById(agencyId).lean();
            if (!agency) {
                return res.status(200).json({ message: "Agency not found" });
            }

            const adminCheque = await this.User.findById(
                agency.adminCheque,
                "phone nationalCode name lastName cheque identityNo birthDate"
            ).lean();

            if (!adminCheque) {
                return res
                    .status(200)
                    .json({ message: "adminCheque not found" });
            }

            const response = {
                phone: adminCheque.phone,
                nationalCode: adminCheque.nationalCode,
                name: adminCheque.name,
                lastName: adminCheque.lastName,
                identityNo: adminCheque.identityNo,
                birthDate: adminCheque.birthDate,
                shahab: adminCheque.cheque.shahabId,
                acceptCheque: agency.acceptCheque,
            };

            if (adminCheque.cheque.fin_token) {
                const now = new Date();
                const expiry = new Date(adminCheque.cheque.fin_token_expiry);
                if (expiry > now) {
                    response.finToken = true;
                } else {
                    response.finToken = false;
                }
            } else {
                response.finToken = false;
            }

            return res.json(response);
        } catch (error) {
            console.error("Error while getAdminInfo:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sayadTransfersChainInquiry(req, res) {
        try {
            const { sayadId, nid } = req.query;

            if (!sayadId || sayadId == "" || !nid || nid == "") {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid sayadId or nid!",
                });
            }

            const trackId = uuidv4();

            const { token, refresh_token } = await getToken();
            if (!token || !refresh_token) {
                console.log("Faild to generate auth token!");
                return res
                    .status(500)
                    .json({ error: "Internal Server Error." });
            }

            const url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/sayadTransfersChainInquiry?trackId=${trackId}`;

            const body = {
                sayadId,
                chequeType: "1",
                idCode: nid,
            };

            const response = await axios.post(url, body, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token,
                },
            });

            if (response.data.responseCode === "FN-CTKZ-20003200000") {
                return res.json({ chain: response.data.result.chain });
            } else {
                console.error(
                    "Error while sayadTransfersChainInquiry:",
                    response.data
                );
                return res.status(500).json({ message: "Failure" });
            }
        } catch (error) {
            console.error("Error while sayadTransfersChainInquiry:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sendSMSAuthorization(req, res) {
        try {
            const { phone } = req.query;
            console.log(phone);

            if (!phone || phone == "") {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid phone!",
                });
            }

            const user = await this.User.findOne({ phone }).lean();
            const now = new Date();
            const expiry = new Date(user.cheque.fin_token_expiry);
            if (expiry > now) {
                return res.status(400).json({ error: "Token still valid!" });
            }

            const url = `https://api.finnotech.ir/dev/v2/oauth2/authorize?client_id=${CLIENT}&response_type=code&redirect_uri=${REDIRECT_URL}&scope=${SMS_SCOPES}&mobile=${phone}&auth_type=SMS`;

            const response = await makeHttpsGet(url, ENCODED_TOKEN);

            console.log("Raw response:", response.data);

            let parsed;
            try {
                parsed = JSON.parse(response.data);
            } catch (err) {
                console.error(
                    "Failed to parse response from sendSMSAuthorization:",
                    err
                );
                return res
                    .status(500)
                    .json({ message: "Invalid JSON from API" });
            }

            if (parsed.responseCode === "FN-BRFH-20000000000") {
                return res.json({
                    message: "Done",
                    trackId: parsed.result.trackId,
                });
            } else {
                console.error("Error while SendSMSAuthorization:", parsed);
                return res
                    .status(500)
                    .json({ message: "Could not send code", trackId: null });
            }
        } catch (error) {
            console.error("Request Error:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async verifySMSAuthorization(req, res) {
        try {
            const { code, mobile, nid, trackId } = req.body;
            if (
                !code ||
                code == "" ||
                !mobile ||
                mobile == "" ||
                !nid ||
                nid == "" ||
                !trackId ||
                trackId == ""
            ) {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid input!",
                });
            }
            const userCheck = await this.User.findOne({ phone: mobile });
            if (!userCheck) {
                return res.status(404).json({ message: "user not found" });
            }
            if (userCheck.cheque.fin_token) {
                return res.status(400).json({
                    message: "Invalid request!",
                });
            }

            const now = new Date();
            const expiry = new Date(userCheck.cheque.fin_token_expiry);
            if (expiry > now) {
                return res.status(400).json({ error: "Token still valid!" });
            }

            const generated_token = await verifySMS(code, mobile, nid, trackId);
            console.log(generated_token);
            if (!generated_token.token || !generated_token.refresh_token) {
                console.log("Faild to generate sms token!");
                return res
                    .status(400)
                    .json({ error: "Faild to generate sms token." });
            }

            const timeAdded = addTokenTime();

            userCheck.cheque.fin_token = generated_token.token;
            userCheck.cheque.fin_refresh_token = generated_token.refresh_token;
            userCheck.cheque.fin_token_expiry = timeAdded;
            await userCheck.save();

            return res.json({ message: "Token saved." });
        } catch (error) {
            console.error("Error while verifying SMS Authorization:", error);
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sayadChequeInquiry(req, res) {
        try {
            const { sayadId, agencyId, phone, payId, studentId } = req.body;
            if (
                !sayadId ||
                sayadId == "" ||
                !agencyId ||
                agencyId == "" ||
                !phone ||
                phone == "" ||
                !payId ||
                payId == "" ||
                !studentId ||
                studentId == ""
            ) {
                return this.response({
                    res,
                    code: 204,
                    message: "Invalid input!",
                });
            }

            let idType = 1;

            let token = "";
            const now = new Date();

            const parent = await this.Parent.findOne({ phone }).lean();
            if (!parent) {
                return res.status(404).json({ message: "parent not found" });
            }

            if (parent.shahabId == "" || !parent.shahabId) {
                return res
                    .status(407)
                    .json({ message: "Parent doesn't have shahab code" });
            }

            const student = await this.Student.findById(studentId).lean();
            if (!student) {
                return res.status(404).json({ message: "student not found" });
            }

            const payQueue = await this.PayQueue.findOne({
                code: payId,
            }).lean();
            if (!payQueue) {
                return res.status(404).json({ message: "payQueue not found" });
            }

            const agency = await this.Agency.findById(agencyId).lean();
            const user = await this.User.findById(agency.adminCheque);
            const expiry = new Date(user.cheque.fin_token_expiry);

            if (!expiry) {
                return res.status(400).json({ message: "Access denied." });
            }

            if (expiry > now) {
                token = user.cheque.fin_token;
                console.log("Using exiting token...");
            } else {
                console.log("Regenerating refresh token...");
                const generated_token = await verifyRefreshToken(
                    user.cheque.fin_refresh_token
                );
                console.log(generated_token);
                if (!generated_token.token || !generated_token.refresh_token) {
                    console.log("Faild to generate sms token!");
                    return res
                        .status(500)
                        .json({ message: "Failed to confirm token!" });
                }

                const timeAdded = addTokenTime();

                user.cheque.fin_token = generated_token.token;
                user.cheque.fin_refresh_token = generated_token.refresh_token;
                user.cheque.fin_token_expiry = timeAdded;
                await user.save();
                req.user = user;

                token = generated_token.token;
            }

            const url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/users/${user.nationalCode}/sms/sayadChequeInquiry?sayadId=${sayadId}&idType=${idType}`;

            const parsedUrl = new URL(url);

            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            const apiResponse = await new Promise((resolve, reject) => {
                const reqApi = https.request(options, (resApi) => {
                    let data = "";
                    resApi.on("data", (chunk) => (data += chunk));
                    resApi.on("end", () =>
                        resolve({ status: resApi.statusCode, data })
                    );
                });

                reqApi.on("error", (err) => reject(err));
                reqApi.end();
            });

            console.log("Raw response:", apiResponse.data);

            let parsed = JSON.parse(apiResponse.data);
            console.log(parsed);

            if (parsed.status === "DONE") {
                // if (parsed.amount !== payQueue.amount) {
                //     return res.status(402).json({ message: "invalid amount!" });
                // }

                // persianDate.toLocale("en");
                // const toPersian = new persianDate(payQueue.payDate).format(
                //     "YYYYMMDD"
                // );

                // if (toPersian !== parsed.amount) {
                //     return res
                //         .status(406)
                //         .json({ message: "invalid payDate!" });
                // }

                parsed = parsed.result;

                const newSayadCheque = new this.SayadCheque({
                    agencyId: agencyId,
                    sayadId: parsed.sayadId,
                    studentId,
                    adminCheque: user._id,
                    parentShahab: parent.shahabId,
                    parentPhone: parent.phone,
                    parentBirthDate: parent.birthDate,
                    adminShahab: user.cheque.shahabId,
                    parentId: req.user._id,
                    parentIdentityNo: parent.identityNo,
                    parentNid: parent.nationalCode,
                    branchCode: parsed.branchCode,
                    bankCode: parsed.bankCode,
                    amount: parsed.amount,
                    dueDate: parsed.dueDate,
                    description: parsed.description,
                    serialNo: parsed.serialNo,
                    seriesNo: parsed.seriesNo,
                    fromIban: parsed.fromIban,
                    reason: parsed.reason,
                    currency: parsed.currency?.toString(),
                    chequeStatus: parsed.chequeStatus?.toString(),
                    chequeType: parsed.chequeType?.toString(),
                    chequeMedia: parsed.chequeMedia?.toString(),
                    blockStatus: parsed.blockStatus?.toString(),
                    guaranteeStatus: parsed.guaranteeStatus?.toString(),
                    locked: parsed.locked?.toString(),
                    issueDate: parsed.issueDate,
                    lockerBankCode: parsed.lockerBankCode,
                    lockerBranchCode: parsed.lockerBranchCode,
                    holder: {
                        nid: parsed.holders?.[0]?.idCode || "",
                        name: parsed.holders?.[0]?.name || "",
                        idType: parsed.holders?.[0]?.idType || "",
                    },
                    signer: {
                        nid: parent.nationalCode,
                        name: parsed.signers?.[0]?.name || "",
                        legalStamp: parsed.signers[0].legalStamp || 0,
                    },
                });

                await newSayadCheque.save();
                return res.json({ message: "Done", data: parsed });
            } else if (parsed.responseCode === "FN-CTFH-40000240150") {
                return res.status(400).json({
                    message: "Failed",
                    data: "شناسه چک صیادی نامعتبر است",
                });
            } else {
                console.error("Error while sayadChequeInquiry:", parsed);
                return res
                    .status(500)
                    .json({ message: "Failed", details: parsed });
            }
        } catch (error) {
            console.error(
                "Error while sayadChequeInquiry:",
                error.message || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getCardInformation(req, res) {
        try {
            const { card } = req.query;

            const token = await getToken();

            const url =
                "https://api.finnotech.ir/mpg/v2/clients/samar/cards/" + card;

            const response = await axios.get(url, {
                headers: {
                    Authorization: "Bearer " + token.token,
                },
            });

            if (response.data.status === "DONE") {
                return res.json({
                    message: "Done",
                    card: response.data.result,
                });
            } else {
                return res.json({ message: "Failed", card: null });
            }
        } catch (error) {
            console.error(
                "Error while getCardInformation:",
                error.message || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async sayadAcceptCheque(req, res) {
        try {
            const { chequeId, parentId } = req.query;
            if (!chequeId || chequeId == "" || !parentId || parentId == "") {
                return res.status(500).json({
                    message: "Invalid chequeId.",
                });
            }

            const sayadCheque = await this.SayadCheque.findById(chequeId);
            if (!sayadCheque) {
                return res.status(500).json({
                    message: "Invalid sayadCheque.",
                });
            }

            const parent = await this.Parent.findById(parentId);
            if (!parent) {
                return res.status(500).json({
                    message: "Invalid parentId.",
                });
            }

            let token = "";
            const now = new Date();
            const user = await this.User.findById(req.user._id);
            const expiry = new Date(user.cheque.fin_token_expiry);

            if (!expiry) {
                return res.status(400).json({ message: "Access denied." });
            }

            if (expiry > now) {
                token = user.cheque.fin_token;
            } else {
                console.log("Regenerating refresh token...");
                const generated_token = await verifyRefreshToken(
                    user.cheque.fin_refresh_token
                );
                console.log(generated_token);
                if (!generated_token.token || !generated_token.refresh_token) {
                    console.log("Faild to generate sms token!");
                    return res
                        .status(500)
                        .json({ message: "Failed to confirm token!" });
                }

                const timeAdded = addTokenTime();

                user.cheque.fin_token = generated_token.token;
                user.cheque.fin_refresh_token = generated_token.refresh_token;
                user.cheque.fin_token_expiry = timeAdded;
                await user.save();
                req.user = user;

                token = generated_token.token;
            }

            const body = {
                sayadId: sayadCheque.sayadId,
                accept: "1",
                acceptDescription: "تایید",
                acceptor: {
                    idCode: sayadCheque.holder.nid,
                    shahabId: user.cheque.shahabId,
                    idType: sayadCheque.holder.idType,
                },
                acceptorAgent: {
                    idCode: sayadCheque.signer.nid,
                    shahabId: parent.cheque.shahabId,
                    idType: "1",
                },
            };

            let url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/users/${acceptorNid}/sms/sayadAcceptCheque`;

            const response = await axios.post(url, body, {
                headers: {
                    Authorization: "Bearer " + token,
                },
            });

            if (response.data.status === "DONE") {
                sayadCheque.isConfirmed = true;
                sayadCheque.confirmationReferenceId =
                    response.data.result.referenceId;
                await sayadCheque.save();

                return res.json({
                    message: "Done",
                    refrence: response.data.result.referenceId,
                });
            } else {
                return res.json({
                    message: "Failed",
                    refrence: null,
                });
            }
        } catch (error) {
            console.error(
                "Error while sayadAcceptCheque:",
                error.message || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async chequeColorInquiry(req, res) {
        try {
            const { nid } = req.query;

            const token = await getToken();

            let url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/chequeColorInquiry?idCode=${nid}`;

            const response = await axios.get(url, {
                headers: {
                    Authorization: "Bearer " + token.token,
                },
            });

            if (response.data.status === "DONE") {
                const code = response.data.result.chequeColor;
                const status = getChequeColorDescription(code);
                return res.json({
                    message: "Done",
                    nid: nid,
                    status,
                });
            } else {
                return res.json({
                    message: "Failed",
                    nid: nid,
                    status: null,
                });
            }
        } catch (error) {
            console.error(
                "Error while chequeColorInquiry:",
                error.response.data || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async confirmShahabCode(req, res) {
        try {
            const { agencyId } = req.query;

            const agency = await this.Agency.findById(agencyId).lean();
            if (!agency) {
                return res.status(204).json({ message: "Agency not found" });
            }

            const adminCheque = await this.User.findById(agency.adminCheque);
            if (!adminCheque) {
                return res
                    .status(204)
                    .json({ message: "adminCheque not found" });
            }

            if (
                adminCheque.cheque.shahabId != "" &&
                adminCheque.cheque.shahabId != null
            ) {
                return res.status(200).json({
                    message: "shahabCode already confirmed!",
                    shahab: adminCheque.cheque.shahabId,
                });
            }

            persianDate.toLocale("en");
            let toPersian = new persianDate(adminCheque.birthDate).format(
                "YYYYMMDD"
            );

            const shahab = await getShahabCode(
                adminCheque.nationalCode,
                toPersian,
                adminCheque.identityNo
            );
            if (!shahab.shahab) {
                return res.status(400).json({ message: "Invalid data" });
            }

            adminCheque.cheque.shahabId = shahab.shahab;
            await adminCheque.save();

            return res.json({ shahab: shahab.shahab });
        } catch (error) {
            console.error(
                "Error while chequeColorInquiry:",
                error.response.data || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }

    async getParentShahab(req, res) {
        try {
            const { nid, phone, identityNo, birthDate } = req.query;
            console.log(req.query);

            const cheque = await this.SayadCheque.findOne({
                parentPhone: phone,
                "signer.nid": nid,
            }).lean();
            if (cheque) {
                return res.json({ message: true });
            } else {
                let parent = await this.Parent.findOne({ phone });
                if (!parent) {
                    parent = new this.Parent({
                        phone,
                        birthDate,
                        identityNo,
                        nationalCode: nid,
                    });
                    await parent.save();
                }

                if (parent.shahabId != "" && parent.shahabId != null) {
                    return res.json({ message: true });
                }

                persianDate.toLocale("en");
                const newD = new Date(birthDate);
                let toPersian = new persianDate(newD).format("YYYYMMDD");
                console.log(toPersian);

                const shahab = await getShahabCode(nid, toPersian, identityNo);
                if (!shahab.shahab) {
                    return res.status(400).json({ message: "Invalid data" });
                }

                parent.shahabId = shahab.shahab;
                parent.identityNo = identityNo;
                parent.birthDate = birthDate;
                parent.nationalCode = nid;
                await parent.save();

                return res.json({ message: true });
            }
        } catch (error) {
            console.error(
                "Error while chequeColorInquiry:",
                error.response.data || error
            );
            return res.status(500).json({ error: "Internal Server Error." });
        }
    }
})();
