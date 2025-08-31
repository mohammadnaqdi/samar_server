const controller = require("../controller");
const mongoose = require("mongoose");
const https = require("https");
const persianDate = require("persian-date");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { Session } = require("inspector/promises");
const amoot_t = process.env.AMOOT_SMS;
const amootUser = process.env.AMOOT_USER;
const amootPass = process.env.AMOOT_PASS;
const SMS_SCOPES =
  "credit:sms-sayady-cheque-inquiry:get,credit:sms-sayad-accept-cheque:post,credit:sms-sayad-accept-cheque:post,credit:sms-sayad-cancel-cheque:post";
const CLIENT_SCOPES =
  "credit:sayad-transfers-chain-inquiry:post,card:information:get,oak:shahab-inquiry:get,credit:cheque-color-inquiry:get";
const NID = "0934454299";
const CLIENT = "samar";
const ENCODED_TOKEN = "c2FtYXI6bG52VERSMnBlZDJMcTJORDZvRWg=";
const REDIRECT_URL = "https://mysamar.ir/api/fin/getAuthorization";

module.exports = new (class extends controller {
  async getStudentCheques(req, res) {
    try {
      const { studentId } = req.query;

      const sayadCheque = await this.SayadCheque.find(
        { studentId },
        "sayadId amount status payQueueDate payQueueCode sanadId"
      ).lean();

      return res.json(sayadCheque);
    } catch (error) {
      console.error("Error while getFullChequeInfo:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async getFullChequeInfo(req, res) {
    try {
      const { sayadId } = req.query;

      const sayadCheque = await this.SayadCheque.findById(sayadId)
        .populate({
          path: "studentId",
          select: "name lastName studentCode",
        })
        .lean();
      if (!sayadCheque) {
        return res.status(204).json({ message: "Cheque not found" });
      }

      const payQ = await this.PayQueue.findOne({
        code: sayadCheque.payQueueCode,
        studentId: sayadCheque.studentId._id,
      }).lean();
      if (!payQ) {
        return res.status(204).json({ message: "PayQueue not found" });
      }

      sayadCheque.payQueueTitle = payQ.title;
      sayadCheque.maxDate = payQ.maxDate;
      sayadCheque.counter = payQ.counter;

      return res.json({ cheque: sayadCheque });
    } catch (error) {
      console.error("Error while getFullChequeInfo:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async getUnassignedCheques(req, res) {
    try {
      const { agencyId } = req.query;

      if (!agencyId || agencyId == "") {
        return res.status(204).json({ message: "Invalid agencyId!" });
      }

      const agency = await this.Agency.findById(agencyId).lean();
      if (!agency) {
        return res.status(204).json({ message: "Agency not found!" });
      }

      const sayadCheques = await this.SayadCheque.find({
        agencyId,
        // status: "Pending",
      })
        .populate({
          path: "studentId",
          select: "name lastName",
        })
        .lean();

      const data = sayadCheques.map((cheque) => ({
        sayadId: cheque._id,
        studentName: cheque.studentId
          ? `${cheque.studentId.name} ${cheque.studentId.lastName}`
          : null,
        amount: cheque.amount,
        dueDate: cheque.payQueueDate,
      }));

      return res.json(data);
    } catch (error) {
      console.error("Error while getUnassignedCheques:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

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

      const findAdmin = await this.User.findById(agency.adminCheque).lean();

      info.adminNid = findAdmin.nationalCode;
      info.adminName = findAdmin.name + " " + findAdmin.lastName;
      info.parentNid = findParent.nationalCode;
      info.parentName = findParent.name + " " + findParent.lastName;
      info.parentPhone = findParent.phone;
      info.parentBirthDate = findParent.birthDate;
      info.parentIdentityNo = findParent.identityNo;
      info.parentShahab = findParent.shahabId;

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
        const adminCheque = await this.User.findById(agency.adminCheque).lean();
        if (!adminCheque) {
          return res.status(204).json({ message: "Admin not found" });
        }

        if (adminCheque.cheque.shahabId) {
          const now = new Date();
          if (!adminCheque.cheque.fin_token) {
            return res.json({ message: false });
          }
          const expiry = new Date(adminCheque.cheque.fin_token_expiry);
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
        code,
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
      const title = "chequeHesab";
      await this.AgencySet.findOneAndUpdate(
        { agencyId: agency._id },
        { $pull: { defHeadLine: { title } } }
      );

      await this.AgencySet.findOneAndUpdate(
        { agencyId: agency._id },
        { $push: { defHeadLine: { title, code } } }
      );

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
        return res.status(200).json({ message: "adminCheque not found" });
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
      let agencySet = await this.AgencySet.findOne({ agencyId }, "defHeadLine");
      let chequeHesab = "";
      if (
        agencySet &&
        agencySet.defHeadLine &&
        agencySet.defHeadLine.length > 0
      ) {
        for (const item of agencySet.defHeadLine) {
          if (item.title === "chequeHesab") {
            chequeHesab = item.code;

            break;
          }
        }
      }
      response.chequeHesab = chequeHesab;

      return res.json(response);
    } catch (error) {
      console.error("Error while getAdminInfo:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async sayadTransfersChainInquiry(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { sayadId, nid, agencyId } = req.query;

      if (
        !sayadId ||
        sayadId.trim() === "" ||
        !nid ||
        nid.trim() === "" ||
        !agencyId ||
        agencyId.trim() === ""
      ) {
        await session.abortTransaction();
        return this.response({
          res,
          code: 204,
          message: "Invalid sayadId or nid or agencyId",
        });
      }

      const trackId = uuidv4();

      const { token, refresh_token } = await getToken();
      if (!token || !refresh_token) {
        await session.abortTransaction();
        console.log("Faild to generate auth token!");
        return res.status(500).json({ error: "Internal Server Error." });
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
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
      });

      if (response.data.status === "DONE") {
        await this.FinnotechUsage.create({
          agencyId,
          endpoint: "sayadTransfersChainInquiry",
          trackId: trackId,
          api: url,
          price: 0,
          usedBy: req.user._id,
        });

        await session.commitTransaction();
        return res.json({ chain: response.data.result.chain });
      } else {
        await session.abortTransaction();
        console.error("Error while sayadTransfersChainInquiry:", response.data);
        return res.status(400).json({ message: "Bank Error" });
      }
    } catch (error) {
      await session.abortTransaction();
      console.error(
        "Error while sayadTransfersChainInquiry:",
        error.response.data
      );
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      await session.endSession();
    }
  }

  async sendSMSAuthorization(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { phone, agencyId } = req.query;

      if (
        !phone ||
        phone.trim() === "" ||
        !agencyId ||
        agencyId.trim() === ""
      ) {
        await session.abortTransaction();
        return this.response({
          res,
          code: 204,
          message: "Invalid phone or agencyId",
        });
      }

      const user = await this.User.findOne({ phone }).lean();
      const now = new Date();
      const expiry = new Date(user.cheque.fin_token_expiry);
      if (expiry > now) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Token still valid!" });
      }

      const trackId = uuidv4();
      const url = `https://api.finnotech.ir/dev/v2/oauth2/authorize?client_id=${CLIENT}&response_type=code&redirect_uri=${REDIRECT_URL}&scope=${SMS_SCOPES}&mobile=${phone}&auth_type=SMS&trackId=${trackId}`;

      const response = await makeHttpsGet(url, ENCODED_TOKEN);

      // console.log("Raw response:", response.data);

      let parsed;
      try {
        parsed = JSON.parse(response.data);
      } catch (err) {
        await session.abortTransaction();
        console.error(
          "Failed to parse response from sendSMSAuthorization:",
          err
        );
        return res.status(500).json({ message: "Invalid JSON from API" });
      }

      if (parsed.responseCode === "FN-BRFH-20000000000") {
        await this.FinnotechUsage.create({
          agencyId,
          endpoint: "authorize",
          trackId,
          api: url,
          price: 0,
          usedBy: req.user._id,
        });
        return res.json({
          message: "Done",
          trackId: parsed.result.trackId,
        });
      } else {
        await session.abortTransaction();
        console.error("Error while sendSMSAuthorization:", parsed);
        return res
          .status(400)
          .json({ message: "Could not send code", trackId: null });
      }
    } catch (error) {
      await session.abortTransaction();
      console.error("Error while sendSMSAuthorization:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      await session.endSession();
    }
  }

  async verifySMSAuthorization(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
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
        await session.abortTransaction();
        return this.response({
          res,
          code: 204,
          message: "Invalid input!",
        });
      }
      const userCheck = await this.User.findOne({
        phone: mobile,
      }).session(session);
      if (!userCheck) {
        await session.abortTransaction();
        return res.status(404).json({ message: "user not found" });
      }
      if (userCheck.cheque.fin_token) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid request!",
        });
      }

      const now = new Date();
      const expiry = new Date(userCheck.cheque.fin_token_expiry);
      if (expiry > now) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Token still valid!" });
      }

      const generated_token = await verifySMS(code, mobile, nid, trackId);
      // console.log(generated_token);
      if (!generated_token.token || !generated_token.refresh_token) {
        await session.abortTransaction();
        console.log("Faild to generate sms token!");
        return res.status(400).json({ error: "Faild to generate sms token." });
      }

      const timeAdded = addTokenTime();

      userCheck.cheque.fin_token = generated_token.token;
      userCheck.cheque.fin_refresh_token = generated_token.refresh_token;
      userCheck.cheque.fin_token_expiry = timeAdded;
      await userCheck.save();

      await session.commitTransaction();
      return res.json({ message: "Token saved." });
    } catch (error) {
      await session.abortTransaction();
      console.error("Error while verifying SMS Authorization:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      await session.endSession();
    }
  }

  async sayadChequeInquiry(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { sayadId, agencyId, phone, payId, studentId } = req.body;
      if (!sayadId || !agencyId || !phone || !payId || !studentId) {
        await session.abortTransaction();
        return this.response({
          res,
          code: 204,
          message: "Invalid input!",
        });
      }

      const checkSayad = await this.SayadCheque.findOne({
        sayadId,
      }).session(session);
      if (checkSayad && checkSayad.status === "Accepted") {
        await session.abortTransaction();
        return res.status(302).json({ message: "این چک قبلا تایید شده است." });
      }

      let idType = 1;

      const parent = await this.Parent.findOne({ phone })
        .session(session)
        .lean();
      if (!parent) {
        await session.abortTransaction();
        return res.status(404).json({ message: "parent not found" });
      }
      if (!parent.shahabId) {
        await session.abortTransaction();
        return res
          .status(407)
          .json({ message: "Parent doesn't have shahab code" });
      }

      const student = await this.Student.findById(studentId)
        .session(session)
        .lean();
      if (!student) {
        await session.abortTransaction();
        return res.status(404).json({ message: "student not found" });
      }

      const payQueue = await this.PayQueue.findOne({
        code: payId,
        studentId: student._id,
      }).session(session);
      if (!payQueue) {
        await session.abortTransaction();
        return res.status(404).json({ message: "payQueue not found" });
      }

      const agency = await this.Agency.findById(agencyId)
        .session(session)
        .lean();
      const user = await this.User.findById(agency.adminCheque).session(
        session
      );

      const token = await this.checkSMSToken(agency.adminCheque);
      if (!token.success) {
        return res.status(400).json({ message: "Failed to refresh sms token" });
      }

      let agencySet = await this.AgencySet.findOne(
        { agencyId },
        "defHeadLine"
      ).session(session);
      let chequeHesab = "";
      if (agencySet?.defHeadLine?.length > 0) {
        for (const item of agencySet.defHeadLine) {
          if (item.title === "chequeHesab") {
            chequeHesab = item.code;
            break;
          }
        }
      }
      if (!chequeHesab) {
        await session.abortTransaction();
        return res.status(404).json({ message: "chequeHesab not found" });
      }

      const trackId = uuidv4();

      const url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/users/${user.nationalCode}/sms/sayadChequeInquiry?sayadId=${sayadId}&idType=${idType}&trackId=${trackId}`;
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: { Authorization: `Bearer ${token.token}` },
      };
      const apiResponse = await new Promise((resolve, reject) => {
        const reqApi = https.request(options, (resApi) => {
          let data = "";
          resApi.on("data", (chunk) => (data += chunk));
          resApi.on("end", () => resolve({ status: resApi.statusCode, data }));
        });
        reqApi.on("error", reject);
        reqApi.end();
      });

      let parsed = JSON.parse(apiResponse.data);
      const getTrackId = JSON.parse(apiResponse.data);
      if (parsed.status === "DONE") {
        await this.FinnotechUsage.create({
          agencyId,
          endpoint: "sayadChequeInquiry",
          trackId,
          api: url,
          price: 0,
          usedBy: req.user._id,
        });
        parsed = parsed.result;

        if (checkSayad) {
          await this.DocSanad.findOneAndDelete({
            agencyId,
            sanadId: checkSayad.sanadId,
          }).session(session);
          await this.DocListSanad.deleteMany({
            agencyId,
            doclistId: checkSayad.sanadId,
          }).session(session);
          await this.SayadCheque.findByIdAndDelete(checkSayad._id).session(
            session
          );
          payQueue.isPaid = false;
          await payQueue.save({ session });
        }
        console.log("parsed.chequeStatus", parsed.chequeStatus);
        if (![7, 8].includes(parsed.chequeStatus)) {
          await session.abortTransaction();
          const message = chequeStatus(parsed.chequeStatus);
          console.log("chequeStatus message", message);
          return res.status(203).json({
            message,
          });
        }
        if ([2, 3].includes(parsed.blockStatus)) {
          await session.abortTransaction();
          return res.status(203).json({
            message: blockStatus(parsed.blockStatus),
          });
        }
        if ([2, 3, 5].includes(parsed.guaranteeStatus)) {
          await session.abortTransaction();
          return res.status(203).json({
            message: guaranteeStatus(parsed.guaranteeStatus),
          });
        }
        if ([1].includes(parsed.lockedStatus)) {
          await session.abortTransaction();
          return res.status(203).json({
            message: lockedStatus(parsed.lockedStatus),
          });
        }
        persianDate.toLocale("en");

        const plusMaxDate = new Date(payQueue.maxDate);
        plusMaxDate.setDate(plusMaxDate.getDate() + 9);
        const maxDatePersian = new persianDate(plusMaxDate).format("YYYYMMDD");
        if (parseInt(maxDatePersian) < parseInt(parsed.dueDate)) {
          await session.abortTransaction();
          return res.status(203).json({ message: "Cheque paydate expired." });
        }

        const SalMali = new persianDate().format("YY");
        const checkMax = await this.CheckInfo.find({ agencyId }, "infoId")
          .sort({ infoId: -1 })
          .limit(1)
          .session(session);
        let numCheck = checkMax.length > 0 ? checkMax[0].infoId + 1 : 1;
        const infoNum = `${SalMali}-${numCheck}`;
        const checkInfo = new this.CheckInfo({
          agencyId,
          editor: req.user._id,
          infoId: numCheck,
          infoNum,
          seCode: parsed.serialNo,
          branchCode: parsed.branchCode,
          branchName: "",
          bankName: "سایر بانک‌ها",
          serial: parsed.sayadId,
          type: 5,
          rowCount: 2,
          infoDate: payQueue.payDate,
          infoMoney: parsed.amount,
          accCode: chequeHesab,
          ownerHesab: "003005" + student.studentCode,
          desc: "چک صیادی اقساط",
        });
        await checkInfo.save({ session });

        const doc = new this.DocSanad({
          agencyId,
          note: payQueue.title,
          sanadDate: payQueue.payDate,
          system: 2,
          definite: false,
          lock: true,
          editor: req.user._id,
        });
        await doc.save({ session });

        persianDate.toLocale("en");
        const today = new persianDate().format("YYYY/MM/DD");
        const studentName = student.name + " " + student.lastName;
        const descF = `دریافت چک بابت ${payQueue.title} به نام ${studentName} به شماره صیادی ${parsed.sayadId}`;
        await new this.DocListSanad({
          agencyId,
          titleId: doc.id,
          doclistId: doc.sanadId,
          row: 1,
          bes: 0,
          bed: parsed.amount,
          note: descF,
          accCode: chequeHesab,
          peigiri: infoNum,
          sanadDate: payQueue.payDate,
          mId: doc.sanadId,
        }).save({ session });
        await new this.DocListSanad({
          agencyId,
          titleId: doc.id,
          doclistId: doc.sanadId,
          row: 2,
          bed: 0,
          bes: parsed.amount,
          note: `دریافت چک صیادی در تاریخ ${today}`,
          accCode: "003005" + student.studentCode,
          peigiri: infoNum,
          mId: payId,
          type: "invoice",
          days: 0,
          sanadDate: payQueue.payDate,
        }).save({ session });

        const checkHistory = new this.CheckHistory({
          agencyId,
          infoId: checkInfo._id,
          editor: req.user._id,
          row: 1,
          toAccCode: chequeHesab,
          fromAccCode: "003005" + student.studentCode,
          money: parsed.amount,
          status: 5,
          desc: `دریافت چک صیادی در تاریخ ${today}`,
          sanadNum: doc.sanadId,
        });
        await checkHistory.save({ session });
        payQueue.isPaid = true;
        await payQueue.save({ session });

        const persianDateNum = parseInt(parsed.dueDate);
        const jy = Math.floor(persianDateNum / 10000);
        const jm = Math.floor((persianDateNum % 10000) / 100);
        const jd = persianDateNum % 100;

        let pDate = new persianDate([jy, jm, jd]);

        const gregorian = pDate.toDate();

        let newSayadCheque = new this.SayadCheque({
          agencyId,
          trackId: getTrackId.trackId,
          sayadId: parsed.sayadId,
          studentId,
          adminCheque: user._id,
          parentShahab: parent.shahabId,
          parentPhone: parent.phone,
          ownerPhone: req.user.phone,
          parentBirthDate: parent.birthDate,
          adminShahab: user.cheque.shahabId,
          parentId: req.user._id,
          parentIdentityNo: parent.identityNo,
          parentNid: parent.nationalCode,
          branchCode: parsed.branchCode,
          bankCode: parsed.bankCode,
          payQueueCode: payQueue.code,
          payQueueDate: gregorian,
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
          sanadId: doc.sanadId,
          holder: {
            nid: parsed.holders?.[0]?.idCode || "",
            name: parsed.holders?.[0]?.name || "",
            idType: parsed.holders?.[0]?.idType || "",
          },
          signer: {
            nid: parent.nationalCode,
            name: parsed.signers?.[0]?.name || "",
            legalStamp: parsed.signers?.[0]?.legalStamp || 0,
          },
        });
        await newSayadCheque.save({ session });

        await session.commitTransaction();
        return res.json({ message: "Done", data: parsed });
      } else if (parsed.responseCode === "FN-CTFH-40000240150") {
        await session.abortTransaction();
        return res.status(400).json({ message: "شناسه چک صیادی نامعتبر است" });
      } else {
        await session.abortTransaction();
        return res.status(500).json({ message: "Failed", details: parsed });
      }
    } catch (error) {
      await session.abortTransaction();
      console.error("Error while sayadChequeInquiry:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      session.endSession();
    }
  }

  async sayadCancelCheque(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { sayadId } = req.query;
      if (!sayadId || sayadId == "") {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid sayadId or text.",
        });
      }

      const sayadCheque = await this.SayadCheque.findById(sayadId).session(
        session
      );
      if (!sayadCheque) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid sayadCheque.",
        });
      }

      if (sayadCheque.status === "Accepted") {
        await session.abortTransaction();
        return res.status(400).json({ message: "Cheque is already accepted!" });
      }

      const agency = await this.Agency.findById(sayadCheque.agencyId).lean();
      if (!agency) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid agency.",
        });
      }

      const payQ = await this.PayQueue.findOne({
        code: sayadCheque.payQueueCode,
        studentId: sayadCheque.studentId,
      });
      if (!payQ) {
        await session.abortTransaction();
        return res.status(404).json({ message: "payQueue not found" });
      }

      sayadCheque.status = "Cancelled";
      await sayadCheque.save({ session });
      console.log("sanadId", sayadCheque.sanadId);

      await this.DocSanad.findOneAndDelete(
        {
          agencyId: sayadCheque.agencyId,
          sanadId: sayadCheque.sanadId,
        },
        { session }
      );
      await this.DocListSanad.deleteMany(
        {
          agencyId: sayadCheque.agencyId,
          doclistId: sayadCheque.sanadId,
        },
        { session }
      );
      payQ.isPaid = false;
      await payQ.save({ session });

      await session.commitTransaction();

      const text = `والدین گرامی چک ثبت شده شما برای سرویس مدارس از طرف مدیر شرکت رد گردید.
            ${agency.name} - ${agency.tel}
            دستیار هوشمند سمر`;

      const postData = {
        UserName: amootUser,
        Password: amootPass,
        SendDateTime: getFormattedDateTime(new Date()),
        SMSMessageText: text,
        LineNumber: "service",
        Mobiles: sayadCheque.parentPhone,
      };

      let config = {
        method: "post",
        url: "https://portal.amootsms.com/webservice2.asmx/SendSimple_REST",
        headers: {
          Authorization: amoot_t,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: postData,
      };
      axios(config)
        .then(function (response) {
          console.log("response", JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log("error axios service sendSmsAndSAve", error);
        });

      await this.FinnotechUsage.create({
        agencyId: agency._id,
        type: "SMS",
        price: 2013,
        description: text,
        mobiles: sayadCheque.parentPhone,
      });
      await session.commitTransaction();

      return res.json({
        message: "Cancelled.",
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Error while sayadCancelCheque:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      session.endSession();
    }
  }

  async sayadAcceptCheque(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { sayadId } = req.query;
      if (!sayadId || sayadId == "") {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid sayadId.",
        });
      }

      const sayadCheque = await this.SayadCheque.findById(sayadId);
      if (!sayadCheque) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid sayadCheque.",
        });
      }

      if (sayadCheque.status != "Pending") {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Invalid request.",
        });
      }

      const token = await this.checkSMSToken(sayadCheque.adminCheque);
      if (!token.success) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Failed to refresh sms token" });
      }

      // let parentIdType = "1";

      const body = {
        sayadId: sayadCheque.sayadId,
        accept: "1",
        acceptDescription: "تایید",
        acceptor: {
          idCode: sayadCheque.holder.nid,
          shahabId: sayadCheque.adminShahab,
          idType: sayadCheque.holder.idType.toString(),
        },
        // acceptorAgent: {
        //     idCode: sayadCheque.signer.nid,
        //     shahabId: sayadCheque.parentShahab,
        //     idType: parentIdType,
        // },
      };

      const trackId = uuidv4();

      let url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/users/${sayadCheque.holder.nid}/sms/sayadAcceptCheque?trackId=${trackId}`;

      const response = await axios.post(url, body, {
        headers: {
          Authorization: "Bearer " + token.token,
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
      });

      if (response.data.status === "DONE") {
        await this.FinnotechUsage.create({
          agencyId: sayadCheque.agencyId,
          endpoint: "sayadAcceptCheque",
          trackId,
          api: url,
          price: 0,
          usedBy: req.user._id,
        });
        sayadCheque.status = "Accepted";
        sayadCheque.confirmationReferenceId = response.data.result.referenceId;
        await sayadCheque.save({ session });
        await session.commitTransaction();
        return res.json({
          message: "Done",
          refrence: response.data.result.referenceId,
        });
      } else {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Bank error",
          refrence: null,
        });
      }
    } catch (error) {
      await session.abortTransaction();
      console.error(
        "Error while sayadAcceptCheque:",
        error.response.data || error
      );
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      session.endSession();
    }
  }

  async chequeColorInquiry(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { nid } = req.query;

      const token = await getToken();

      const trackId = uuidv4();

      let url = `https://api.finnotech.ir/credit/v2/clients/${CLIENT}/chequeColorInquiry?idCode=${nid}&trackId=${trackId}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: "Bearer " + token.token,
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
      });

      if (response.data.status === "DONE") {
        const code = response.data.result.chequeColor;
        const status = getChequeColorDescription(code);
        await this.FinnotechUsage.create({
          endpoint: "chequeColorInquiry",
          trackId,
          api: url,
          price: 0,
          usedBy: req.user._id,
        });
        await session.commitTransaction();
        return res.json({
          message: "Done",
          nid: nid,
          status,
        });
      } else {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Failed",
          nid: nid,
          status: null,
        });
      }
    } catch (error) {
      await session.abortTransaction();
      console.error(
        "Error while chequeColorInquiry:",
        error.response.data || error
      );
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      await session.endSession();
    }
  }

  async confirmShahabCode(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { agencyId } = req.query;

      const agency = await this.Agency.findById(agencyId).lean();
      if (!agency) {
        await session.abortTransaction();
        return res.status(204).json({ message: "Agency not found" });
      }

      const adminCheque = await this.User.findById(agency.adminCheque).session(
        session
      );
      if (!adminCheque) {
        await session.abortTransaction();
        return res.status(204).json({ message: "adminCheque not found" });
      }

      if (
        adminCheque.cheque.shahabId != "" &&
        adminCheque.cheque.shahabId != null
      ) {
        await session.abortTransaction();
        return res.status(200).json({
          message: "shahabCode already confirmed!",
          shahab: adminCheque.cheque.shahabId,
        });
      }

      persianDate.toLocale("en");
      let toPersian = new persianDate(adminCheque.birthDate).format("YYYYMMDD");

      const shahab = await getShahabCode(
        agencyId,
        adminCheque.nationalCode,
        toPersian,
        adminCheque.identityNo
      );
      if (!shahab.shahab) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid data" });
      }

      adminCheque.cheque.shahabId = shahab.shahab;
      await adminCheque.save();

      await session.commitTransaction();

      return res.json({ shahab: shahab.shahab });
    } catch (error) {
      await session.abortTransaction();
      console.error(
        "Error while chequeColorInquiry:",
        error.response.data || error
      );
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      await session.endSession();
    }
  }

  async getParentShahab(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { nid, phone, identityNo, birthDate } = req.query;

      const cheque = await this.SayadCheque.findOne({
        parentPhone: phone,
        "signer.nid": nid,
      }).lean();
      if (cheque) {
        return res.json({ message: true });
      } else {
        let parent = await this.Parent.findOne({ phone }).session(session);
        if (!parent) {
          parent = new this.Parent({
            phone,
            birthDate,
            identityNo,
            nationalCode: nid,
          });
          await parent.save({ session });
        }

        if (parent.shahabId != "" && parent.shahabId != null) {
          return res.json({ message: true });
        }

        persianDate.toLocale("en");
        const newD = new Date(birthDate);
        let toPersian = new persianDate(newD).format("YYYYMMDD");

        const shahab = await getShahabCode(null, nid, toPersian, identityNo);
        if (!shahab.shahab) {
          return res.status(400).json({ message: "Invalid data" });
        }

        parent.shahabId = shahab.shahab;
        parent.identityNo = identityNo;
        parent.birthDate = birthDate;
        parent.nationalCode = nid;
        await parent.save({ session });
        await session.commitTransaction();

        return res.json({ message: true });
      }
    } catch (error) {
      await session.abortTransaction();

      console.error(
        "Error while chequeColorInquiry:",
        error.response.data || error
      );
      return res.status(500).json({ error: "Internal Server Error." });
    } finally {
      await session.endSession();
    }
  }

  async getCardInformation(req, res) {
    try {
      const { card } = req.query;

      const token = await getToken();
      const trackId = uuidv4();

      const url = `https://api.finnotech.ir/mpg/v2/clients/samar/cards/${card}/?trackId=${trackId}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: "Bearer " + token.token,
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
      });

      if (response.data.status === "DONE") {
        await this.FinnotechUsage.create({
          endpoint: "cards",
          trackId,
          api: url,
          price: 0,
          usedBy: req.user._id,
        });
        return res.json({
          message: "Done",
          card: response.data.result,
        });
      } else {
        return res.status(400).json({ message: "Failed", card: null });
      }
    } catch (error) {
      console.error(
        "Error while getCardInformation:",
        error.response.data || error
      );
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async checkSMSToken(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let token = "";
      const now = new Date();
      const user = await this.User.findById(userId).session(session);
      const expiry = new Date(user.cheque.fin_token_expiry);

      if (!expiry) {
        await session.abortTransaction();

        return { success: false, token: null };
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
          await session.abortTransaction();

          console.log("Faild to generate sms token!");
          return { success: false, token: null };
        }

        const timeAdded = addTokenTime();

        user.cheque.fin_token = generated_token.token;
        user.cheque.fin_refresh_token = generated_token.refresh_token;
        user.cheque.fin_token_expiry = timeAdded;
        await user.save();
        await session.commitTransaction();

        token = generated_token.token;
      }

      return { success: true, token };
    } catch (error) {
      await session.abortTransaction();

      console.error("Error while checking sms token:", error);
      return { success: false, token: null };
    } finally {
      await session.endSession();
    }
  }
})();

function addTokenTime() {
  const now = new Date();
  return new Date(now.getTime() + 864000000);
}

function getFormattedDateTime(date) {
  if (!(date instanceof Date)) {
    throw new TypeError("Input must be a Date object");
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // zero-pad month
  const day = String(date.getDate()).padStart(2, "0"); // zero-pad day
  const hour = String(date.getHours()).padStart(2, "0"); // zero-pad hour
  const minute = String(date.getMinutes()).padStart(2, "0"); // zero-pad minute
  const second = String(date.getSeconds()).padStart(2, "0"); // zero-pad second

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function chequeStatus(code) {
  const status = {
    1: "صادر شده",
    2: "نقد شده",
    3: "باطل شده",
    4: "برگشت خورده",
    5: "بخشی برگشت خورده",
    6: "در انتظار امضا ضامن",
    7: "در انتظار تایید گیرنده در کشیدن چک",
    8: "در انتظار تاییده گیرنده در انتقال چک",
  };

  return status[code] || "وضعیت نامعتبر";
}

function blockStatus(code) {
  const status = {
    0: "چک مسدود نشده است",
    1: "مسدود موقت می‌باشد",
    2: "مسدود دائم می‌باشد",
    3: "چک رفع مسدودی شده است",
  };
  return status[code] || "وضعیت نامعتبر";
}

function guaranteeStatus(code) {
  const status = {
    1: "این چک فاقد ضمانت می باشد",
    2: "فرآیند ضمانت در جریان است",
    3: "فرآیند ضمانت ناتمام خاتمه یافته است",
    4: "فرآیند ضمانت اتمام و همه ضامن ها ضمانت کرده اند",
    5: "فرآیند ضمانت اتمام و برخی ضامن ها ضمانت را رد کرده اند",
  };
  return status[code] || "وضعیت نامعتبر";
}

function lockedStatus(code) {
  const status = {
    0: "نقد کردن بر روی چک وجود ندارد",
    1: "چک lock است",
  };
  return status[code] || "وضعیت نامعتبر";
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

async function getShahabCode(agencyId, nid, birthDate, identityNo) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const token = await getToken();
    const trackId = uuidv4();

    let url = `https://api.finnotech.ir/oak/v2/clients/samar/users/${nid}/shahabInquiry?birthDate=${birthDate}&trackId=${trackId}`;

    const birthDateInt = parseInt(birthDate, 10);

    if (birthDateInt < 13680101) {
      url = `https://api.finnotech.ir/oak/v2/clients/samar/users/${nid}/shahabInquiry?birthDate=${birthDate}&identityNo=${identityNo}&trackId=${trackId}`;
    }

    const response = await axios.get(url, {
      headers: {
        Authorization: "Bearer " + token.token,
      },
    });

    if (response.data.status === "DONE") {
      await this.FinnotechUsage.create({
        agencyId,
        endpoint: "shahabInquiry",
        trackId,
        api: url,
        price: 0,
        usedBy: req.user._id,
      });
      await session.commitTransaction();
      return {
        message: "Done",
        shahab: response.data.result.shahabCode,
      };
    } else {
      await session.abortTransaction();

      return { message: "Failed", shahab: null };
    }
  } catch (error) {
    await session.abortTransaction();

    console.error("Error while getShahabCode:", error.response.data || error);
    return { message: error, shahab: null };
  } finally {
    await session.endSession();
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = JSON.stringify({
      mobile,
      otp: code,
      nid,
      trackId,
    });

    const verifyUrl = `https://api.finnotech.ir/dev/v2/oauth2/verify/sms?trackId=${trackId}`;
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

    // console.log("Verify SMS raw:", verifyResponse.data);

    let verifyParsed;
    try {
      verifyParsed = JSON.parse(verifyResponse.data);
    } catch (err) {
      await session.abortTransaction();

      console.error("Failed to parse verify SMS JSON:", err);
      return { token: null, refresh_token: null };
    }

    if (verifyParsed.status !== "DONE") {
      await session.abortTransaction();

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

    // console.log("Token raw response:", tokenResponse.data);

    let tokenParsed;
    try {
      tokenParsed = JSON.parse(tokenResponse.data);
    } catch (err) {
      await session.abortTransaction();
      console.error("Failed to parse token JSON:", err);
      return { token: null, refresh_token: null };
    }

    if (tokenParsed.status === "DONE") {
      await session.commitTransaction();
      return {
        token: tokenParsed.result.value,
        refresh_token: tokenParsed.result.refreshToken,
      };
    } else {
      await session.abortTransaction();
      console.error("Error while getting sms token:", tokenParsed);
      return { token: null, refresh_token: null };
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("Error while verifySMS:", error.message || error);
    return { token: null, refresh_token: null };
  } finally {
    await session.endSession();
  }
}

async function verifyRefreshToken(refresh) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const body = {
      grant_type: "refresh_token",
      token_type: "CODE",
      refresh_token: refresh,
      auth_type: "SMS",
    };

    // console.log(body);

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
        "Content-Length": Buffer.byteLength(bodyString),
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

    // console.log("Verify SMS raw:", verifyResponse.data);

    let verifyParsed;
    try {
      verifyParsed = JSON.parse(verifyResponse.data);
    } catch (err) {
      await session.abortTransaction();
      console.error("Failed to parse verify SMS JSON:", err);
      return { token: null, refresh_token: null };
    }

    if (verifyParsed.status !== "DONE") {
      await session.abortTransaction();
      console.error("Error while verifySMS:", verifyParsed);
      return { token: null, refresh_token: null };
    } else {
      await session.commitTransaction();
      return {
        token: verifyParsed.result.value,
        refresh_token: verifyParsed.result.refreshToken,
      };
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("Error while verifySMS:", error || error);
    return { token: null, refresh_token: null };
  } finally {
    await session.endSession();
  }
}

async function getToken() {
  const session = await mongoose.startSession();
  session.startTransaction();
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
      await session.commitTransaction();
      return {
        token: response.data.result.value,
        refresh_token: response.data.result.refreshToken,
      };
    } else {
      await session.abortTransaction();
      console.error("Error while getting token:", response.data);
      return {
        token: null,
        refresh_token: null,
      };
    }
  } catch (err) {
    await session.abortTransaction();
    console.error("Error while getting token:", err.response);
    return {
      token: null,
      refresh_token: null,
    };
  } finally {
    await session.endSession();
  }
}
