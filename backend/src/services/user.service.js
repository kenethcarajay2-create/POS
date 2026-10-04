import bcrypt from "bcryptjs";

import User, {
    normalizeRfidUid,
} from "../models/user.model.js";

import ApiError from "../utils/ApiError.js";

import withTransaction from "../utils/withTransaction.js";

import branchService from "./branch.service.js";

import branchAccessService from "./branch-access.service.js";

import syncOutboxService from "./syncOutbox.service.js";


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

    "bulkOrder",

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
    dashboard: true,
    products: true,
    inventory: true,
    pos: true,
    bulkOrder: true,
    sales: true,
    customers: true,
    suppliers: true,
    workers: true,
    ledger: true,
    reports: true,
    users: true,
    settings: true,
    salesRefund: true,
    salesVoid: true,
    salesReprint: true,
},

manager: {
    dashboard: true,
    products: true,
    inventory: true,
    pos: true,
    bulkOrder: true,
    sales: true,
    customers: true,
    suppliers: true,
    workers: true,
    ledger: true,
    reports: true,
    users: false,
    settings: false,
    salesRefund: true,
    salesVoid: false,
    salesReprint: true,
},

cashier: {
    dashboard: false,
    products: false,
    inventory: false,
    pos: true,
    bulkOrder: false,
    sales: true,
    customers: false,
    suppliers: false,
    workers: false,
    ledger: false,
    reports: false,
    users: false,
    settings: false,
    salesRefund: false,
    salesVoid: false,
    salesReprint: false,
},

inventory: {
    dashboard: true,
    products: true,
    inventory: true,
    pos: false,
    bulkOrder: false,
    sales: false,
    customers: false,
    suppliers: true,
    workers: false,
    ledger: false,
    reports: true,
    users: false,
    settings: false,
    salesRefund: false,
    salesVoid: false,
    salesReprint: false,
},

payroll: {
    dashboard: true,
    products: false,
    inventory: false,
    pos: false,
    bulkOrder: false,
    sales: false,
    customers: false,
    suppliers: false,
    workers: true,
    ledger: true,
    reports: true,
    users: false,
    settings: false,
    salesRefund: false,
    salesVoid: false,
    salesReprint: false,
},

custom: {
    dashboard: true,
    products: false,
    inventory: false,
    pos: false,
    bulkOrder: false,
    sales: false,
    customers: false,
    suppliers: false,
    workers: false,
    ledger: false,
    reports: false,
    users: false,
    settings: false,
    salesRefund: false,
    salesVoid: false,
    salesReprint: false,
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
NORMALIZE ID
============================================================
*/

const normalizeId = (
    value
) => {

    if (
        !value
    ) {

        return "";

    }


    return String(
        value?._id ||
        value
    );

};


/*
============================================================
POPULATE USER BRANCHES
============================================================
*/

const populateUserBranches =
    async (
        user
    ) => {

        if (
            !user
        ) {

            return user;

        }


        await user.populate(
            "branches",
            "code name address phone email isDefault isActive"
        );


        await user.populate(
            "defaultBranch",
            "code name address phone email isDefault isActive"
        );


        return user;

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


        rfidUid:
            user.rfidUid ||
            "",


        permissions:
            user.permissions,


        branches:
            user.branches ||
            [],

        defaultBranch:
            user.defaultBranch ||
            null,


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

Supports an optional MongoDB session so the final duplicate
check can participate in the User write transaction.
============================================================
*/

const ensureRfidAvailable =
    async (
        rfidUid,
        excludeUserId =
            null,
        session =
            null
    ) => {

        const normalizedUid =
            normalizeRfidUid(
                rfidUid
            );


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


        let userQuery =
            User.findOne(
                query
            );


        if (
            session
        ) {

            userQuery =
                userQuery.session(
                    session
                );

        }


        const existingUser =
            await userQuery;


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
QUEUE USER SYNC
============================================================
*/

const enqueueUserSync =
    async (
        user,
        action,
        session
    ) => {

        await syncOutboxService
            .enqueueSyncRequest({

                source:
                    "USER",

                action,

                aggregateId:
                    user._id,

                /*
                Users can belong to multiple branches and
                admins are global.

                The User document itself is therefore treated
                as global synchronization data.
                */

                branchId:
                    null,

                session,

            });

    };


/*
============================================================
HANDLE UNIQUE USER ERROR
============================================================
*/

const handleUniqueUserError =
    (
        error
    ) => {

        if (
            error?.code !==
            11000
        ) {

            throw error;

        }


        if (
            error?.keyPattern
                ?.username ||
            error?.keyValue
                ?.username
        ) {

            throw new ApiError(
                409,
                "Username is already in use"
            );

        }


        if (
            error?.keyPattern
                ?.rfidUid ||
            error?.keyValue
                ?.rfidUid
        ) {

            throw new ApiError(
                409,
                "This RFID/NFC card is already assigned to another user."
            );

        }


        throw error;

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

                .populate(
                    "branches",
                    "code name address phone email isDefault isActive"
                )

                .populate(
                    "defaultBranch",
                    "code name address phone email isDefault isActive"
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
GET USERS FOR ACTIVE BRANCH
============================================================
*/

const getUsersForBranch =
    async (
        branchId
    ) => {

        if (
            !branchId
        ) {

            throw new ApiError(
                400,
                "Active branch is required."
            );

        }


        const users =
            await User.find({

                $or: [

                    {
                        role:
                            "admin",
                    },

                    {
                        branches:
                            branchId,
                    },

                    {
                        defaultBranch:
                            branchId,
                    },

                ],

            })

                .select(
                    "-password"
                )

                .populate(
                    "branches",
                    "code name address phone email isDefault isActive"
                )

                .populate(
                    "defaultBranch",
                    "code name address phone email isDefault isActive"
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
            )

                .populate(
                    "branches",
                    "code name address phone email isDefault isActive"
                )

                .populate(
                    "defaultBranch",
                    "code name address phone email isDefault isActive"
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
        branches = [],
        defaultBranch =
            null,
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


        const normalizedName =
            String(
                name
            ).trim();


        if (
            !normalizedName
        ) {

            throw new ApiError(
                400,
                "Name is required"
            );

        }


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


        if (
            password.length <
            6
        ) {

            throw new ApiError(
                400,
                "Password must be at least 6 characters"
            );

        }


        /*
        ====================================================
        EXPENSIVE / BRANCH PREPARATION BEFORE TRANSACTION
        ====================================================

        Password hashing does not need to hold a MongoDB
        transaction open.

        ensureDefaultBranch() has its own transaction, so it
        must also remain outside our User transaction.
        ====================================================
        */

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        const normalizedPermissions =
            normalizePermissions(
                permissions,
                role
            );


        const normalizedProfile =
            normalizeProfile(
                profile
            );


        const systemDefaultBranch =
            await branchService
                .ensureDefaultBranch();


        /*
        ====================================================
        RESOLVE BRANCH ASSIGNMENT
        ====================================================
        */

        let assignedBranches =
            [];


        let selectedDefaultBranch =
            null;


        if (
            role ===
            "admin"
        ) {

            if (
                defaultBranch
            ) {

                const validatedDefaultBranches =
                    await branchAccessService
                        .validateBranchIds([
                            defaultBranch,
                        ]);


                selectedDefaultBranch =
                    validatedDefaultBranches[0]
                        ._id;

            } else {

                selectedDefaultBranch =
                    systemDefaultBranch
                        ._id;

            }


            assignedBranches =
                [];

        } else {

            const requestedBranches =
                Array.isArray(
                    branches
                ) &&
                branches.length >
                    0
                    ? branches
                    : [
                        systemDefaultBranch
                            ._id,
                    ];


            const validatedBranches =
                await branchAccessService
                    .validateBranchIds(
                        requestedBranches
                    );


            assignedBranches =
                validatedBranches.map(
                    (
                        branch
                    ) =>
                        branch._id
                );


            if (
                defaultBranch
            ) {

                const requestedDefaultId =
                    normalizeId(
                        defaultBranch
                    );


                const belongsToAssignedBranches =
                    assignedBranches.some(
                        (
                            branchId
                        ) =>
                            normalizeId(
                                branchId
                            ) ===
                            requestedDefaultId
                    );


                if (
                    !belongsToAssignedBranches
                ) {

                    throw new ApiError(
                        400,
                        "Default branch must be one of the user's assigned branches."
                    );

                }


                selectedDefaultBranch =
                    defaultBranch;

            } else {

                selectedDefaultBranch =
                    assignedBranches[0];

            }

        }


        try {

            const user =
                await withTransaction(
                    async (
                        session
                    ) => {

                        /*
                        =========================================
                        FINAL USERNAME DUPLICATE CHECK
                        =========================================
                        */

                        const existingUser =
                            await User
                                .findOne({

                                    username:
                                        normalizedUsername,

                                })
                                .session(
                                    session
                                );


                        if (
                            existingUser
                        ) {

                            throw new ApiError(
                                409,
                                "Username is already in use"
                            );

                        }


                        /*
                        =========================================
                        FINAL RFID DUPLICATE CHECK
                        =========================================
                        */

                        const normalizedRfidUid =
                            await ensureRfidAvailable(
                                rfidUid,
                                null,
                                session
                            );


                        /*
                        =========================================
                        CREATE USER
                        =========================================
                        */

                        const [
                            createdUser,
                        ] =
                            await User.create(
                                [
                                    {
                                        name:
                                            normalizedName,

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

                                        branches:
                                            assignedBranches,

                                        defaultBranch:
                                            selectedDefaultBranch,

                                        isActive:
                                            true,
                                    },
                                ],
                                {
                                    session,
                                }
                            );


                        /*
                        =========================================
                        CLOUD SYNC OUTBOX
                        =========================================
                        */

                        await enqueueUserSync(
                            createdUser,
                            "CREATE",
                            session
                        );


                        return createdUser;

                    }
                );


            await populateUserBranches(
                user
            );


            return sanitizeUser(
                user
            );


        } catch (
            error
        ) {

            handleUniqueUserError(
                error
            );

        }

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
            branches,
            defaultBranch,
        }
    ) => {

        /*
        ====================================================
        LOAD CURRENT USER FIRST
        ====================================================

        Branch resolution helpers operate outside our final
        transaction because some of them can call
        ensureDefaultBranch(), which owns its own transaction.
        ====================================================
        */

        const existingUser =
            await User.findById(
                id
            );


        if (
            !existingUser
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        /*
        ====================================================
        PREPARE ROLE
        ====================================================
        */

        const effectiveRole =
            role !==
            undefined
                ? role
                : existingUser.role;


        if (
            !ALLOWED_ROLES.includes(
                effectiveRole
            )
        ) {

            throw new ApiError(
                400,
                "Invalid user role"
            );

        }


        /*
        ====================================================
        PREPARE BRANCH CHANGES
        ====================================================
        */

        let resolvedBranches =
            null;


        let resolvedDefaultBranch =
            null;


        const branchConfigurationChanged =
            branches !==
                undefined ||
            defaultBranch !==
                undefined ||
            role !==
                undefined;


        if (
            branchConfigurationChanged
        ) {

            if (
                effectiveRole ===
                "admin"
            ) {

                resolvedBranches =
                    [];


                if (
                    defaultBranch !==
                        undefined &&
                    defaultBranch !==
                        null &&
                    defaultBranch !==
                        ""
                ) {

                    const validatedDefault =
                        await branchAccessService
                            .validateBranchIds([
                                defaultBranch,
                            ]);


                    resolvedDefaultBranch =
                        validatedDefault[0]
                            ._id;

                } else {

                    /*
                    Try to preserve the current default.
                    */

                    let existingDefaultIsValid =
                        false;


                    if (
                        existingUser.defaultBranch
                    ) {

                        try {

                            const validated =
                                await branchAccessService
                                    .validateBranchIds([
                                        existingUser
                                            .defaultBranch,
                                    ]);


                            if (
                                validated.length ===
                                1
                            ) {

                                resolvedDefaultBranch =
                                    validated[0]
                                        ._id;

                                existingDefaultIsValid =
                                    true;

                            }

                        } catch {

                            existingDefaultIsValid =
                                false;

                        }

                    }


                    if (
                        !existingDefaultIsValid
                    ) {

                        const systemDefault =
                            await branchService
                                .ensureDefaultBranch();


                        resolvedDefaultBranch =
                            systemDefault
                                ._id;

                    }

                }

            } else {

                let requestedBranchIds;


                if (
                    branches !==
                    undefined
                ) {

                    requestedBranchIds =
                        Array.isArray(
                            branches
                        )
                            ? branches
                            : [];

                } else {

                    requestedBranchIds =
                        Array.isArray(
                            existingUser.branches
                        )
                            ? existingUser
                                .branches
                            : [];

                }


                if (
                    requestedBranchIds.length ===
                    0
                ) {

                    const systemDefault =
                        await branchService
                            .ensureDefaultBranch();


                    requestedBranchIds = [
                        systemDefault
                            ._id,
                    ];

                }


                const validatedBranches =
                    await branchAccessService
                        .validateBranchIds(
                            requestedBranchIds
                        );


                if (
                    validatedBranches.length ===
                    0
                ) {

                    throw new ApiError(
                        400,
                        "A non-admin user must have at least one active branch."
                    );

                }


                resolvedBranches =
                    validatedBranches.map(
                        (
                            branch
                        ) =>
                            branch._id
                    );


                if (
                    defaultBranch !==
                        undefined &&
                    defaultBranch !==
                        null &&
                    defaultBranch !==
                        ""
                ) {

                    const requestedDefaultId =
                        normalizeId(
                            defaultBranch
                        );


                    const belongsToAssignedBranches =
                        resolvedBranches.some(
                            (
                                branchId
                            ) =>
                                normalizeId(
                                    branchId
                                ) ===
                                requestedDefaultId
                        );


                    if (
                        !belongsToAssignedBranches
                    ) {

                        throw new ApiError(
                            400,
                            "Default branch must be one of the user's assigned branches."
                        );

                    }


                    resolvedDefaultBranch =
                        defaultBranch;

                } else {

                    const existingDefaultId =
                        normalizeId(
                            existingUser
                                .defaultBranch
                        );


                    const currentDefaultStillAssigned =
                        existingDefaultId &&
                        resolvedBranches.some(
                            (
                                branchId
                            ) =>
                                normalizeId(
                                    branchId
                                ) ===
                                existingDefaultId
                        );


                    resolvedDefaultBranch =
                        currentDefaultStillAssigned
                            ? existingUser
                                .defaultBranch
                            : resolvedBranches[0];

                }

            }

        }


        try {

            const user =
                await withTransaction(
                    async (
                        session
                    ) => {

                        /*
                        =========================================
                        RELOAD USER INSIDE TRANSACTION
                        =========================================
                        */

                        const currentUser =
                            await User
                                .findById(
                                    id
                                )
                                .session(
                                    session
                                );


                        if (
                            !currentUser
                        ) {

                            throw new ApiError(
                                404,
                                "User not found"
                            );

                        }


                        /*
                        =========================================
                        NAME
                        =========================================
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


                            currentUser.name =
                                normalizedName;

                        }


                        /*
                        =========================================
                        USERNAME
                        =========================================
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


                            const duplicateUsername =
                                await User
                                    .findOne({

                                        username:
                                            normalizedUsername,

                                        _id: {
                                            $ne:
                                                currentUser
                                                    ._id,
                                        },

                                    })
                                    .session(
                                        session
                                    );


                            if (
                                duplicateUsername
                            ) {

                                throw new ApiError(
                                    409,
                                    "Username is already in use"
                                );

                            }


                            currentUser.username =
                                normalizedUsername;

                        }


                        /*
                        =========================================
                        ROLE
                        =========================================
                        */

                        if (
                            role !==
                            undefined
                        ) {

                            currentUser.role =
                                effectiveRole;

                        }


                        /*
                        =========================================
                        PROFILE
                        =========================================
                        */

                        if (
                            profile !==
                            undefined
                        ) {

                            if (
                                !currentUser.profile
                            ) {

                                currentUser.profile = {

                                    image:
                                        "",

                                    nickname:
                                        "",

                                };

                            }


                            if (
                                profile.nickname !==
                                undefined
                            ) {

                                currentUser
                                    .profile
                                    .nickname =
                                    String(
                                        profile.nickname ||
                                        ""
                                    ).trim();

                            }


                            if (
                                profile.image !==
                                undefined
                            ) {

                                currentUser
                                    .profile
                                    .image =
                                    String(
                                        profile.image ||
                                        ""
                                    ).trim();

                            }

                        }


                        /*
                        =========================================
                        RFID / NFC
                        =========================================
                        */

                        if (
                            rfidUid !==
                            undefined
                        ) {

                            const normalizedUid =
                                await ensureRfidAvailable(
                                    rfidUid,
                                    currentUser._id,
                                    session
                                );


                            currentUser.rfidUid =
                                normalizedUid;

                        }


                        /*
                        =========================================
                        PERMISSIONS
                        =========================================
                        */

                        if (
                            permissions !==
                            undefined
                        ) {

                            currentUser.permissions =
                                normalizePermissions(
                                    permissions,
                                    currentUser.role
                                );

                        } else if (
                            role !==
                            undefined
                        ) {

                            currentUser.permissions =
                                normalizePermissions(
                                    {},
                                    currentUser.role
                                );

                        }


                        /*
                        =========================================
                        BRANCH ACCESS
                        =========================================
                        */

                        if (
                            branchConfigurationChanged
                        ) {

                            currentUser.branches =
                                resolvedBranches;


                            currentUser.defaultBranch =
                                resolvedDefaultBranch;

                        }


                        /*
                        =========================================
                        ACTIVE STATUS
                        =========================================
                        */

                        if (
                            isActive !==
                            undefined
                        ) {

                            currentUser.isActive =
                                Boolean(
                                    isActive
                                );

                        }


                        /*
                        =========================================
                        SAVE USER
                        =========================================
                        */

                        await currentUser.save({
                            session,
                        });


                        /*
                        =========================================
                        CLOUD SYNC OUTBOX
                        =========================================
                        */

                        await enqueueUserSync(
                            currentUser,
                            "UPDATE",
                            session
                        );


                        return currentUser;

                    }
                );


            await populateUserBranches(
                user
            );


            return sanitizeUser(
                user
            );


        } catch (
            error
        ) {

            handleUniqueUserError(
                error
            );

        }

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


        /*
        Hash outside the transaction.
        */

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10
            );


        const user =
            await withTransaction(
                async (
                    session
                ) => {

                    const currentUser =
                        await User
                            .findById(
                                id
                            )
                            .session(
                                session
                            );


                    if (
                        !currentUser
                    ) {

                        throw new ApiError(
                            404,
                            "User not found"
                        );

                    }


                    currentUser.password =
                        hashedPassword;


                    await currentUser.save({
                        session,
                    });


                    await enqueueUserSync(
                        currentUser,
                        "PASSWORD_CHANGE",
                        session
                    );


                    return currentUser;

                }
            );


        await populateUserBranches(
            user
        );


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
            await withTransaction(
                async (
                    session
                ) => {

                    const currentUser =
                        await User
                            .findById(
                                id
                            )
                            .session(
                                session
                            );


                    if (
                        !currentUser
                    ) {

                        throw new ApiError(
                            404,
                            "User not found"
                        );

                    }


                    /*
                    Already disabled means there is no new
                    business change and therefore no new
                    outbox event.
                    */

                    if (
                        currentUser.isActive ===
                        false
                    ) {

                        return currentUser;

                    }


                    currentUser.isActive =
                        false;


                    await currentUser.save({
                        session,
                    });


                    await enqueueUserSync(
                        currentUser,
                        "DISABLE",
                        session
                    );


                    return currentUser;

                }
            );


        await populateUserBranches(
            user
        );


        return sanitizeUser(
            user
        );

    };


/*
============================================================
ENABLE USER
============================================================

Legacy branch repair is deliberately performed BEFORE the
final transaction because ensureLegacyUserBranch() can invoke
branchService.ensureDefaultBranch(), which owns its own
transaction.

The final enabled state and ENABLE outbox event still commit
atomically.
============================================================
*/

const enableUser =
    async (
        id
    ) => {

        let existingUser =
            await User.findById(
                id
            );


        if (
            !existingUser
        ) {

            throw new ApiError(
                404,
                "User not found"
            );

        }


        /*
        ====================================================
        LEGACY BRANCH REPAIR
        ====================================================
        */

        await branchAccessService
            .ensureLegacyUserBranch(
                existingUser
            );


        /*
        ====================================================
        FINAL ENABLE TRANSACTION
        ====================================================
        */

        const user =
            await withTransaction(
                async (
                    session
                ) => {

                    const currentUser =
                        await User
                            .findById(
                                id
                            )
                            .session(
                                session
                            );


                    if (
                        !currentUser
                    ) {

                        throw new ApiError(
                            404,
                            "User not found"
                        );

                    }


                    /*
                    If already active, the legacy repair above
                    may still have changed the user.

                    We create UPDATE in that situation so the
                    repaired branch information is guaranteed
                    to reach the cloud.
                    */

                    if (
                        currentUser.isActive ===
                        true
                    ) {

                        await enqueueUserSync(
                            currentUser,
                            "UPDATE",
                            session
                        );


                        return currentUser;

                    }


                    currentUser.isActive =
                        true;


                    await currentUser.save({
                        session,
                    });


                    await enqueueUserSync(
                        currentUser,
                        "ENABLE",
                        session
                    );


                    return currentUser;

                }
            );


        await populateUserBranches(
            user
        );


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

    getUsersForBranch,

    getUserById,

    createUser,

    updateUser,

    updatePassword,

    disableUser,

    enableUser,

};