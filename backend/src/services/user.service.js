import bcrypt from "bcryptjs";

import User, {
    normalizeRfidUid,
} from "../models/user.model.js";

import ApiError from "../utils/ApiError.js";


/*
============================================================
ALLOWED ROLES
============================================================
*/

const ALLOWED_ROLES = [
    "admin",
    "manager",
    "cashier",
    "inventory",
    "payroll",
    "custom",
];


/*
============================================================
PERMISSION KEYS
============================================================
*/

const PERMISSION_KEYS = [

    "dashboard",

    "products",

    "inventory",

    "pos",

    "sales",

    "customers",

    "suppliers",

    "workers",

    "ledger",

    "reports",

    "users",

    "settings",

    "salesRefund",

    "salesVoid",

    "salesReprint",

];


/*
============================================================
ROLE DEFAULT PERMISSIONS
============================================================
*/

const ROLE_PERMISSION_PRESETS = {

    admin: {

        dashboard:
            true,

        products:
            true,

        inventory:
            true,

        pos:
            true,

        sales:
            true,

        customers:
            true,

        suppliers:
            true,

        workers:
            true,

        ledger:
            true,

        reports:
            true,

        users:
            true,

        settings:
            true,

        salesRefund:
            true,

        salesVoid:
            true,

        salesReprint:
            true,

    },


    manager: {

        dashboard:
            true,

        products:
            true,

        inventory:
            true,

        pos:
            true,

        sales:
            true,

        customers:
            true,

        suppliers:
            true,

        workers:
            true,

        ledger:
            true,

        reports:
            true,

        users:
            false,

        settings:
            false,

        salesRefund:
            true,

        salesVoid:
            false,

        salesReprint:
            true,

    },


    cashier: {

        dashboard:
            false,

        products:
            false,

        inventory:
            false,

        pos:
            true,

        sales:
            true,

        customers:
            false,

        suppliers:
            false,

        workers:
            false,

        ledger:
            false,

        reports:
            false,

        users:
            false,

        settings:
            false,

        salesRefund:
            false,

        salesVoid:
            false,

        salesReprint:
            false,

    },


    inventory: {

        dashboard:
            true,

        products:
            true,

        inventory:
            true,

        pos:
            false,

        sales:
            false,

        customers:
            false,

        suppliers:
            true,

        workers:
            false,

        ledger:
            false,

        reports:
            true,

        users:
            false,

        settings:
            false,

        salesRefund:
            false,

        salesVoid:
            false,

        salesReprint:
            false,

    },


    payroll: {

        dashboard:
            true,

        products:
            false,

        inventory:
            false,

        pos:
            false,

        sales:
            false,

        customers:
            false,

        suppliers:
            false,

        workers:
            true,

        ledger:
            true,

        reports:
            true,

        users:
            false,

        settings:
            false,

        salesRefund:
            false,

        salesVoid:
            false,

        salesReprint:
            false,

    },


    custom: {

        dashboard:
            true,

        products:
            false,

        inventory:
            false,

        pos:
            false,

        sales:
            false,

        customers:
            false,

        suppliers:
            false,

        workers:
            false,

        ledger:
            false,

        reports:
            false,

        users:
            false,

        settings:
            false,

        salesRefund:
            false,

        salesVoid:
            false,

        salesReprint:
            false,

    },

};


/*
============================================================
NORMALIZE PERMISSIONS
============================================================
*/

const normalizePermissions = (
    permissions = {},
    role = "custom"
) => {

    const preset =
        ROLE_PERMISSION_PRESETS[
            role
        ] ||
        ROLE_PERMISSION_PRESETS.custom;


    const normalized =
        {};


    for (
        const key of
        PERMISSION_KEYS
    ) {

        if (
            permissions?.[key] !==
            undefined
        ) {

            normalized[key] =
                Boolean(
                    permissions[key]
                );

        } else {

            normalized[key] =
                Boolean(
                    preset[key]
                );

        }

    }


    /*
    Admin always full access.
    */

    if (
        role ===
        "admin"
    ) {

        for (
            const key of
            PERMISSION_KEYS
        ) {

            normalized[key] =
                true;

        }

    }


    return normalized;

};


/*
============================================================
NORMALIZE PROFILE
============================================================
*/

const normalizeProfile = (
    profile = {}
) => {

    return {

        image:
            String(
                profile?.image ||
                ""
            ).trim(),

        nickname:
            String(
                profile?.nickname ||
                ""
            ).trim(),

    };

};


/*
============================================================
SAFE USER RESPONSE
============================================================
*/

const sanitizeUser = (
    user
) => {

    return {

        _id:
            user._id,

        id:
            user._id,

        name:
            user.name,

        username:
            user.username,

        role:
            user.role,


        /*
        ====================================================
        PROFILE
        ====================================================
        */

        profile: {

            image:
                user.profile
                    ?.image ||
                "",

            nickname:
                user.profile
                    ?.nickname ||
                "",

        },


        /*
        ====================================================
        RFID
        ====================================================
        */

        rfidUid:
            user.rfidUid ||
            "",


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        permissions:
            user.permissions,


        /*
        ====================================================
        STATUS
        ====================================================
        */

        isActive:
            user.isActive,

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt,

    };

};


/*
============================================================
CHECK RFID DUPLICATE
============================================================
*/

const ensureRfidAvailable =
    async (
        rfidUid,
        excludeUserId =
            null
    ) => {

        const normalizedUid =
            normalizeRfidUid(
                rfidUid
            );


        /*
        Empty UID means no card assigned.
        */

        if (
            !normalizedUid
        ) {

            return "";

        }


        const query = {

            rfidUid:
                normalizedUid,

        };


        if (
            excludeUserId
        ) {

            query._id = {

                $ne:
                    excludeUserId,

            };

        }


        const existingUser =
            await User.findOne(
                query
            );


        if (
            existingUser
        ) {

            throw new ApiError(
                409,
                "This RFID/NFC card is already assigned to another user."
            );

        }


        return normalizedUid;

    };


/*
============================================================
GET ALL USERS
============================================================
*/

const getUsers =
    async () => {

        const users =
            await User.find()

                .select(
                    "-password"
                )

                .sort({

                    createdAt:
                        -1,

                });


        return users.map(
            sanitizeUser
        );

    };


/*
============================================================
GET USER BY ID
============================================================
*/

const getUserById =
    async (
        id
    ) => {

        const user =
            await User.findById(
                id
            );


        if (
            !user
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        return sanitizeUser(
            user
        );

    };


/*
============================================================
CREATE USER
============================================================
*/

const createUser =
    async ({
        name,
        username,
        password,
        role = "cashier",
        permissions,
        profile,
        rfidUid = "",
    }) => {

        /*
        ====================================================
        REQUIRED FIELDS
        ====================================================
        */

        if (
            !name ||
            !username ||
            !password
        ) {

            throw new ApiError(
                400,
                "Name, username, and password are required"
            );

        }


        /*
        ====================================================
        NORMALIZE USERNAME
        ====================================================
        */

        const normalizedUsername =
            String(
                username
            )
                .trim()
                .toLowerCase();


        if (
            !normalizedUsername
        ) {

            throw new ApiError(
                400,
                "Username is required"
            );

        }


        /*
        ====================================================
        DUPLICATE USERNAME
        ====================================================
        */

        const existingUser =
            await User.findOne({

                username:
                    normalizedUsername,

            });


        if (
            existingUser
        ) {

            throw new ApiError(
                409,
                "Username is already in use"
            );

        }


        /*
        ====================================================
        ROLE
        ====================================================
        */

        if (
            !ALLOWED_ROLES.includes(
                role
            )
        ) {

            throw new ApiError(
                400,
                "Invalid user role"
            );

        }


        /*
        ====================================================
        PASSWORD
        ====================================================
        */

        if (
            password.length <
            6
        ) {

            throw new ApiError(
                400,
                "Password must be at least 6 characters"
            );

        }


        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        /*
        ====================================================
        RFID / NFC
        ====================================================
        */

        const normalizedRfidUid =
            await ensureRfidAvailable(
                rfidUid
            );


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        const normalizedPermissions =
            normalizePermissions(
                permissions,
                role
            );


        /*
        ====================================================
        PROFILE
        ====================================================
        */

        const normalizedProfile =
            normalizeProfile(
                profile
            );


        /*
        ====================================================
        CREATE
        ====================================================
        */

        const user =
            await User.create({

                name:
                    String(
                        name
                    ).trim(),

                username:
                    normalizedUsername,

                password:
                    hashedPassword,

                role,

                profile:
                    normalizedProfile,

                rfidUid:
                    normalizedRfidUid,

                permissions:
                    normalizedPermissions,

                isActive:
                    true,

            });


        return sanitizeUser(
            user
        );

    };


/*
============================================================
UPDATE USER
============================================================
*/

const updateUser =
    async (
        id,
        {
            name,
            username,
            role,
            permissions,
            profile,
            rfidUid,
            isActive,
        }
    ) => {

        const user =
            await User.findById(
                id
            );


        if (
            !user
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        /*
        ====================================================
        NAME
        ====================================================
        */

        if (
            name !==
            undefined
        ) {

            const normalizedName =
                String(
                    name
                ).trim();


            if (
                !normalizedName
            ) {

                throw new ApiError(
                    400,
                    "Name cannot be empty"
                );

            }


            user.name =
                normalizedName;

        }


        /*
        ====================================================
        USERNAME
        ====================================================
        */

        if (
            username !==
            undefined
        ) {

            const normalizedUsername =
                String(
                    username
                )
                    .trim()
                    .toLowerCase();


            if (
                !normalizedUsername
            ) {

                throw new ApiError(
                    400,
                    "Username cannot be empty"
                );

            }


            const existingUser =
                await User.findOne({

                    username:
                        normalizedUsername,

                    _id: {

                        $ne:
                            id,

                    },

                });


            if (
                existingUser
            ) {

                throw new ApiError(
                    409,
                    "Username is already in use"
                );

            }


            user.username =
                normalizedUsername;

        }


        /*
        ====================================================
        ROLE
        ====================================================
        */

        if (
            role !==
            undefined
        ) {

            if (
                !ALLOWED_ROLES
                    .includes(
                        role
                    )
            ) {

                throw new ApiError(
                    400,
                    "Invalid user role"
                );

            }


            user.role =
                role;

        }


        /*
        ====================================================
        PROFILE
        ====================================================

        Allows partial updates.

        Example:

        {
            profile: {
                nickname: "Boss"
            }
        }

        Existing image remains unchanged.
        ====================================================
        */

        if (
            profile !==
            undefined
        ) {

            if (
                profile.nickname !==
                undefined
            ) {

                user.profile.nickname =
                    String(
                        profile.nickname ||
                        ""
                    ).trim();

            }


            if (
                profile.image !==
                undefined
            ) {

                user.profile.image =
                    String(
                        profile.image ||
                        ""
                    ).trim();

            }

        }


        /*
        ====================================================
        RFID / NFC
        ====================================================

        Empty string removes the card.
        ====================================================
        */

        if (
            rfidUid !==
            undefined
        ) {

            const normalizedUid =
                await ensureRfidAvailable(
                    rfidUid,
                    user._id
                );


            user.rfidUid =
                normalizedUid;

        }


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        if (
            permissions !==
            undefined
        ) {

            user.permissions =
                normalizePermissions(
                    permissions,
                    user.role
                );

        } else if (
            role !==
            undefined
        ) {

            user.permissions =
                normalizePermissions(
                    {},
                    user.role
                );

        }


        /*
        ====================================================
        ACTIVE STATUS
        ====================================================
        */

        if (
            isActive !==
            undefined
        ) {

            user.isActive =
                Boolean(
                    isActive
                );

        }


        /*
        ====================================================
        SAVE
        ====================================================

        save() also runs the admin permission hook.
        ====================================================
        */

        await user.save();


        return sanitizeUser(
            user
        );

    };


/*
============================================================
CHANGE PASSWORD
============================================================
*/

const updatePassword =
    async (
        id,
        newPassword
    ) => {

        if (
            !newPassword
        ) {

            throw new ApiError(
                400,
                "New password is required"
            );

        }


        if (
            newPassword.length <
            6
        ) {

            throw new ApiError(
                400,
                "Password must be at least 6 characters"
            );

        }


        const user =
            await User.findById(
                id
            );


        if (
            !user
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        user.password =
            await bcrypt.hash(
                newPassword,
                10
            );


        await user.save();


        return sanitizeUser(
            user
        );

    };


/*
============================================================
DISABLE USER
============================================================
*/

const disableUser =
    async (
        id
    ) => {

        const user =
            await User.findById(
                id
            );


        if (
            !user
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        user.isActive =
            false;


        await user.save();


        return sanitizeUser(
            user
        );

    };


/*
============================================================
ENABLE USER
============================================================
*/

const enableUser =
    async (
        id
    ) => {

        const user =
            await User.findById(
                id
            );


        if (
            !user
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        user.isActive =
            true;


        await user.save();


        return sanitizeUser(
            user
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    getUsers,

    getUserById,

    createUser,

    updateUser,

    updatePassword,

    disableUser,

    enableUser,

};