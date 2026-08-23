import bcrypt from "bcryptjs";

import User from "../models/user.model.js";

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

These are only presets.

You can still manually change permissions for any
non-admin user.
============================================================
*/

const ROLE_PERMISSION_PRESETS = {

    admin: {
    dashboard: true,
    products: true,
    inventory: true,
    pos: true,
    sales: true,

    salesRefund: true,
    salesVoid: true,
    salesReprint: true,

    customers: true,
    suppliers: true,
    workers: true,
    ledger: true,
    reports: true,
    users: true,
    settings: true,
},

    manager: {
        dashboard: true,
        products: true,
        inventory: true,
        pos: true,
        sales: true,
        customers: true,
        suppliers: true,
        workers: true,
        ledger: true,
        reports: true,
        users: false,
        settings: false,
    },

    cashier: {
    dashboard: false,
    products: false,
    inventory: false,

    pos: true,

    sales: true,

    salesRefund: false,
    salesVoid: false,
    salesReprint: false,

    customers: false,
    suppliers: false,
    workers: false,
    ledger: false,
    reports: false,
    users: false,
    settings: false,
},

    inventory: {
        dashboard: true,
        products: true,
        inventory: true,
        pos: false,
        sales: false,
        customers: false,
        suppliers: true,
        workers: false,
        ledger: false,
        reports: true,
        users: false,
        settings: false,
    },

    payroll: {
        dashboard: true,
        products: false,
        inventory: false,
        pos: false,
        sales: false,
        customers: false,
        suppliers: false,
        workers: true,
        ledger: true,
        reports: true,
        users: false,
        settings: false,
    },

    custom: {
        dashboard: true,
        products: false,
        inventory: false,
        pos: false,
        sales: false,
        customers: false,
        suppliers: false,
        workers: false,
        ledger: false,
        reports: false,
        users: false,
        settings: false,
    },

};


/*
============================================================
NORMALIZE PERMISSIONS
============================================================

Ensures:

- only known permission keys are accepted
- all values become booleans
- missing keys fall back to role defaults
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


    const normalized = {};


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
    Admin always gets full access.
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

        permissions:
            user.permissions,

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


        return users;

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
            )
                .select(
                    "-password"
                );


        if (
            !user
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        return user;

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
    }) => {

        /*
        --------------------------------------------------------
        REQUIRED FIELDS
        --------------------------------------------------------
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
        --------------------------------------------------------
        NORMALIZE USERNAME
        --------------------------------------------------------
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
        --------------------------------------------------------
        DUPLICATE USERNAME
        --------------------------------------------------------
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
        --------------------------------------------------------
        VALIDATE ROLE
        --------------------------------------------------------
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
        --------------------------------------------------------
        PASSWORD
        --------------------------------------------------------
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
        --------------------------------------------------------
        PERMISSIONS
        --------------------------------------------------------
        */

        const normalizedPermissions =
            normalizePermissions(
                permissions,
                role
            );


        /*
        --------------------------------------------------------
        CREATE USER
        --------------------------------------------------------
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
        --------------------------------------------------------
        NAME
        --------------------------------------------------------
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
        --------------------------------------------------------
        USERNAME
        --------------------------------------------------------
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
                        $ne: id,
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
        --------------------------------------------------------
        ROLE
        --------------------------------------------------------
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
        --------------------------------------------------------
        PERMISSIONS
        --------------------------------------------------------

        If permissions are provided:
        use them.

        If role changed but permissions were not provided:
        apply the role preset.
        --------------------------------------------------------
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
        --------------------------------------------------------
        ACTIVE STATUS
        --------------------------------------------------------
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
        Important:

        save() ensures your User model's admin permission
        hook still runs.
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