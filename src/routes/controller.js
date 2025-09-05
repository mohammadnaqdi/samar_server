const { validationResult } = require("express-validator");
const { User, UserHa, Role } = require("./../models/user");
const Student = require("./../models/student");
// const Shifts = require("./../models/shifts");
const School = require("./../models/school");
const Day = require("../models/days");
const { DDS, DSC, DIC, DOS } = require("./../models/dds");
const { SayadCheque } = require("./../models/cheque");
const { Pack, Exception, GroupPack } = require("../models/pack");
const UserInfo = require("./../models/userInfo");
const { Keys, CounterKey, City, SearchLog } = require("./../models/keys");
const { Agency, AgencySet } = require("./../models/agency");
// const Payoff = require("./../models/payoff");
// const Payment = require("./../models/payment");
const {Driver,DriverInfo} = require("./../models/driver");
const Car = require("./../models/car");
const {
    Service,
    DriverChange,
    PricingTable,
    ServicePack,
} = require("./../models/service");
// const Ledger = require("./../models/ledger");
const { Location, DriverAct } = require("./../models/location");
// const {Kol,Moeen,Tafsily,Sanad,Check} = require("./../models/hesab");
const {
    StReport,
    SchReport,
    RatingDriver,
    InspectorRp,
    Opinion,
} = require("./../models/report");
const { Holiday } = require("./../models/calendar");
const { Versionsoft } = require("./../models/versionsoft");
const {
    Transactions,
    PayQueue,
    Invoice,
    // PayAction,
} = require("./../models/transactions");
const {
    MessageCode,
    Messaging,
    Seen,
    Notification,
} = require("./../models/otp");
const {
    LevelAcc,
    LevelAccDetail,
    GroupAcc,
    ListAcc,
    Bank,
} = require("./../models/levels");
const {
    DocSanad,
    DocListSanad,
    CheckInfo,
    CheckHistory,
} = require("./../models/hasiban");
const {
    CostCenter,
    BankInfo,
    CheckBook,
    CheckPage,
    BankGate,
} = require("./../models/banks");
const Rule = require("./../models/rules");
const { Feedback, OperationLog } = require("./../models/feedback");
const { FinnotechUsage } = require("./../models/finnotech");
const {
    ContractText,
    SignedContract,
    StimApi,
} = require("./../models/contract");
const { Parent } = require("./../models/parent");
const { redisClient } = require("../../startup/redis");

module.exports = class {
    constructor() {
        this.DriverInfo = DriverInfo;
        this.FinnotechUsage = FinnotechUsage;
        this.BankGate = BankGate;
        this.SayadCheque = SayadCheque;
        this.Opinion = Opinion;
        this.redisClient = redisClient;
        this.Invoice = Invoice;
        this.SearchLog = SearchLog;
        this.City = City;
        this.CounterKey = CounterKey;
        this.Parent = Parent;
        this.StimApi = StimApi;
        this.ContractText = ContractText;
        this.SignedContract = SignedContract;
        this.OperationLog = OperationLog;
        this.DDS = DDS;
        this.DSC = DSC;
        this.DOS = DOS;
        this.DIC = DIC;
        this.Notification = Notification;
        this.Seen = Seen;
        this.Feedback = Feedback;
        this.Rule = Rule;
        this.CheckInfo = CheckInfo;
        this.CheckHistory = CheckHistory;
        this.DocListSanad = DocListSanad;
        this.DocSanad = DocSanad;
        this.LevelAcc = LevelAcc;
        this.LevelAccDetail = LevelAccDetail;
        this.GroupAcc = GroupAcc;
        this.ListAcc = ListAcc;
        this.Bank = Bank;
        this.User = User;
        this.UserInfo = UserInfo;
        this.Day = Day;
        this.School = School;
        // this.Shifts = Shifts;
        this.Student = Student;
        this.Keys = Keys;
        this.Agency = Agency;
        // this.Payoff = Payoff;
        // this.Payment = Payment;
        this.Driver = Driver;
        this.Car = Car;
        this.Service = Service;
        // this.Kol = Kol;
        // this.Moeen = Moeen;
        // this.Tafsily = Tafsily;
        // this.Sanad = Sanad;
        // this.Check = Check;
        // this.Ledger = Ledger;
        this.StReport = StReport;
        this.SchReport = SchReport;
        this.RatingDriver = RatingDriver;
        this.InspectorRp = InspectorRp;
        this.Holiday = Holiday;
        this.Location = Location;
        this.DriverAct = DriverAct;
        this.DriverChange = DriverChange;
        this.PricingTable = PricingTable;
        this.ServicePack = ServicePack;
        this.Transactions = Transactions;
        this.MessageCode = MessageCode;
        this.Messaging = Messaging;
        this.PayQueue = PayQueue;
        // this.PayAction = PayAction;
        this.Pack = Pack;
        this.Exception = Exception;
        this.GroupPack = GroupPack;
        this.Versionsoft = Versionsoft;
        this.UserHa = UserHa;
        this.Role = Role;
        this.CostCenter = CostCenter;
        this.BankInfo = BankInfo;
        this.CheckBook = CheckBook;
        this.CheckPage = CheckPage;
        this.AgencySet = AgencySet;
    }
    async scanAllKeys() {
        let cursor = 0;
        const allKeys = [];

        do {
            const { cursor: nextCursor, keys } = await redisClient.scan(cursor);
            allKeys.push(...keys);
            cursor = Number(nextCursor);
        } while (cursor !== 0);

        return allKeys;
    }

    async findRedisDocument(redisKey, fields = {}, options = {}) {
        const { limit = 0, sort = null } = options;

        try {
            const keys = await this.redisClient.keys(`${redisKey}:*`);
            if (keys.length === 0) {
                return [];
            }
            const rawValues = await redisClient.mGet(keys);

            const values = rawValues
                .filter(Boolean)
                .map((val) => JSON.parse(val));

            let filteredValues = values.filter((value) =>
                Object.keys(fields).every((key) => value[key] === fields[key])
            );

            if (sort && typeof sort === "object") {
                const [sortKey, sortOrder] = Object.entries(sort)[0];
                filteredValues.sort((a, b) => {
                    if (a[sortKey] < b[sortKey])
                        return sortOrder === 1 ? -1 : 1;
                    if (a[sortKey] > b[sortKey])
                        return sortOrder === 1 ? 1 : -1;
                    return 0;
                });
            }

            if (limit > 0) {
                filteredValues = filteredValues.slice(0, limit);
            }

            return filteredValues;
        } catch (error) {
            console.error("Error finding Redis document:", error);
            return null;
        }
    }

    async updateRedisDocument(redisKey, updates = {}) {
        try {
            // Convert Mongoose document to plain object if needed
            if (typeof updates.toObject === "function") {
                updates = updates.toObject();
            }

            // Strip out internal fields like $, __, and symbols
            updates = JSON.parse(JSON.stringify(updates));

            const existing = await this.redisClient.get(redisKey);
            let parsed = {};

            if (existing) {
                parsed = JSON.parse(existing);
            }

            const updated = {
                ...parsed,
                ...updates,
            };

            // console.log("Updated Redis Document:", updated);
            await this.redisClient.set(redisKey, JSON.stringify(updated));
            return updated;
        } catch (error) {
            console.error("Error updating Redis document:", error);
            return null;
        }
    }
    validationBody(req, res) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            const errors = result.array();
            let messages = [];
            errors.forEach((err) => messages.push(err.msg));

            console.log("messages", messages);

            res.status(400).json({
                message: "validation error",
                data: messages,
            });
            return false;
        }
        return true;
    }

    validate(req, res, next) {
        if (!this.validationBody(req, res)) {
            return;
        }
        next();
    }

    response({ res, message, code = 200, data = {} }) {
        return res.status(code).json({
            message,
            data,
        });
    }
};
