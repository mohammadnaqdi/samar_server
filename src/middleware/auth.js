const jwt = require("jsonwebtoken");
const { User } = require("./../models/user");
const { Parent } = require("./../models/parent");
const crypto = require("crypto");
const { redisClient } = require("./../../startup/redis");
const mongoose = require("mongoose");
// const getUserSalt = async (userId) => {
//     const user = await User.findById(userId);
//     return user.jwtSalt;
// };
const getUserSalt = async (userId) => {
    let user = await redisClient.get(`user:${userId}`);
    user = JSON.parse(user);
    return user.jwtSalt;
};
function cnObjectId(str) {
    if (str.length == 24) {
        return new mongoose.Types.ObjectId(str);
    }
    return str;
}
async function isLoggined(req, res, next) {
    const token = req.header("x-auth-token");
    if (!token) {
        return res.status(401).json({ message: "Access denied" });
    }

    try {
        const decodedX = jwt.decode(token);
        let userSalt;
        const checkSalt = !(
            (decodedX.isParent || decodedX.isDriver) // superAdmin user
        );
        if (checkSalt) {
            userSalt = await getUserSalt(decodedX._id);
            if (!userSalt) {
                return res.status(401).json({ message: "Invalid token salt" });
            }
        }

        const dynamicKey = !checkSalt
            ? process.env.JWT_KEY
            : process.env.JWT_KEY + userSalt;
        const decoded = jwt.verify(token, dynamicKey);
        if (!decoded || !decoded._id) {
            return res.status(401).json({ message: "Invalid token" });
        }

        // const user = decodedX.isParent
        //     ? await Parent.findById(decoded._id, {
        //           fcm: 0,
        //           updatedAt: 0,
        //           __v: 0,
        //           city: 0,
        //       }).lean()
        //     : await User.findById(decoded._id, {
        //           fcm: 0,
        //           updatedAt: 0,
        //           __v: 0,
        //           city: 0,
        //       }).lean();

        let user = decodedX.isParent
            ? await redisClient.get(`parent:${decoded._id}`)
            : await redisClient.get(`user:${decoded._id}`);
        user = JSON.parse(user);
        user.id = user._id;
        user._id = cnObjectId(user._id);
        user.isParent = decodedX.isParent;

        if (user.agencyId) {
            user.agencyId = cnObjectId(user.agencyId);
        }
        if (user.agencyIds) {
            const agencyIds = [];
            for (const id of user.agencyIds) {
                agencyIds.push(cnObjectId(id));
            }
            user.agencyIds = agencyIds;
        }
        user.createdAt = new Date(user.createdAt);
        user.updatedAt = new Date(user.updatedAt);

        if (!user || user.delete) {
            return res
                .status(401)
                .json({ message: "User not found or deleted" });
        }

        if (!user.active) {
            return res.status(401).json({ message: "User not active" });
        }

        req.user = user;
        next();
    } catch (error) {
        // console.error("Error verifying token:", "jwt expired");
        return res.status(401).json({ message: "jwt expired" });
    }
}

async function isAdmin(req, res, next) {
    if (!req.user.isadmin) {
        return res.status(401).json({ message: "Access denied" });
    }
    next();
}

async function isEnyAdmin(req, res, next) {
    if (
        !(
            req.user.isadmin ||
            req.user.isAgencyAdmin ||
            req.user.isSuperAdmin ||
            req.user.isSupport ||
            req.user.isSchoolAdmin
        )
    ) {
        return res.status(401).json({ message: "Access denied" });
    }
    next();
}

async function isAgencyAdmin(req, res, next) {
    if (!(req.user.isAgencyAdmin || req.user.isSupport)) {
        return res.status(401).json({ message: "Access denied" });
    }
    next();
}
async function isOnlyAgencyAdmin(req, res, next) {
    if (!req.user.isAgencyAdmin) {
        return res.status(401).json({ message: "Access denied" });
    }
    next();
}

async function isSchoolAdminAdmin(req, res, next) {
    if (!req.user.isSchoolAdmin) {
        return res.status(401).json({ message: "Access denied" });
    }
    next();
}

async function isSuperAdmin(req, res, next) {
    if (!req.user.isSuperAdmin) {
        return res.status(401).json({ message: "Access denied" });
    }
    next();
}

module.exports = {
    isLoggined,
    isAdmin,
    isEnyAdmin,
    isSuperAdmin,
    isAgencyAdmin,
    isSchoolAdminAdmin,
    isOnlyAgencyAdmin,
};
