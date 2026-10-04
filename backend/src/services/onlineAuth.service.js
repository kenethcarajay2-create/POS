import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";

import ApiError from "../utils/ApiError.js";

import {
    connectCloudDatabase,
    getCloudConnection,
    isCloudConnected,
} from "../config/cloudDatabase.js";


/*
============================================================
CONFIG
============================================================
*/

const ONLINE_JWT_ISSUER =
    "storepos-online";


const ONLINE_JWT_AUDIENCE =
    "storepos-mobile";


const ONLINE_JWT_PURPOSE =
    "mobile-pos";


/*
============================================================
REQUIRE ONLINE JWT SECRET
============================================================
*/

const requireOnlineJwtSecret =
    () => {

        const secret =
            String(
                process.env
                    .ONLINE_JWT_SECRET ||
                ""
            ).trim();


        if (
            !secret
        ) {

            throw new ApiError(
                500,
                "Online authentication is not configured."
            );

        }


        return secret;

    };


/*
============================================================
REQUIRE CLOUD CONNECTION
============================================================

Unlike the local POS, online authentication cannot operate
without Atlas.

Cloud failure here affects ONLY the online/mobile API.

It does not affect the local desktop POS.
============================================================
*/

const requireCloudConnection =
    async () => {

        if (
            !isCloudConnected()
        ) {

            await connectCloudDatabase();

        }


        const connection =
            getCloudConnection();


        if (
            !connection
        ) {

            throw new ApiError(
                503,
                "Online StorePOS service is currently unavailable."
            );

        }


        return connection;

    };


/*
============================================================
GET CLOUD MODEL
============================================================
*/

const getCloudModel =
    (
        connection,
        modelName,
        schema,
        collectionName
    ) => {

        if (
            connection.models[
                modelName
            ]
        ) {

            return connection.models[
                modelName
            ];

        }


        return connection.model(
            modelName,
            schema,
            collectionName
        );

    };


/*
============================================================
GET CLOUD USER MODEL
============================================================
*/

const getCloudUserModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "User",
            User.schema,
            User.collection.name
        );

    };


/*
============================================================
GET CLOUD BRANCH MODEL
============================================================
*/

const getCloudBranchModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "Branch",
            Branch.schema,
            Branch.collection.name
        );

    };


/*
============================================================
BUILD PERMISSIONS
============================================================
*/

const buildPermissions =
    (
        user
    ) => {

        if (
            user.role ===
            "admin"
        ) {

            return {

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

            };

        }


        return {

            dashboard:
                Boolean(
                    user.permissions
                        ?.dashboard
                ),

            products:
                Boolean(
                    user.permissions
                        ?.products
                ),

            inventory:
                Boolean(
                    user.permissions
                        ?.inventory
                ),

            pos:
                Boolean(
                    user.permissions
                        ?.pos
                ),

            sales:
                Boolean(
                    user.permissions
                        ?.sales
                ),

            customers:
                Boolean(
                    user.permissions
                        ?.customers
                ),

            suppliers:
                Boolean(
                    user.permissions
                        ?.suppliers
                ),

            workers:
                Boolean(
                    user.permissions
                        ?.workers
                ),

            ledger:
                Boolean(
                    user.permissions
                        ?.ledger
                ),

            reports:
                Boolean(
                    user.permissions
                        ?.reports
                ),

            users:
                Boolean(
                    user.permissions
                        ?.users
                ),

            settings:
                Boolean(
                    user.permissions
                        ?.settings
                ),

            salesRefund:
                Boolean(
                    user.permissions
                        ?.salesRefund
                ),

            salesVoid:
                Boolean(
                    user.permissions
                        ?.salesVoid
                ),

            salesReprint:
                Boolean(
                    user.permissions
                        ?.salesReprint
                ),

        };

    };


/*
============================================================
BUILD CLOUD BRANCH CONTEXT
============================================================

IMPORTANT:

This is READ-ONLY.

The online server must not repair or rewrite User branch
assignments because local MongoDB remains authoritative for
normal POS user administration.

Admin:
→ all active branches

Non-admin:
→ assigned active branches only
============================================================
*/

const buildCloudBranchContext =
    async (
        user
    ) => {

        const CloudBranch =
            await getCloudBranchModel();


        let branches =
            [];


        /*
        ========================================================
        ADMIN
        ========================================================
        */

        if (
            user.role ===
            "admin"
        ) {

            branches =
                await CloudBranch
                    .find({

                        isActive:
                            true,

                    })
                    .sort({

                        isDefault:
                            -1,

                        name:
                            1,

                    })
                    .select(
                        "_id code name address phone email isDefault isActive"
                    )
                    .lean();

        } else {

            /*
            ====================================================
            NON-ADMIN
            ====================================================
            */

            const assignedBranchIds =
                Array.isArray(
                    user.branches
                )
                    ? user.branches
                    : [];


            if (
                assignedBranchIds.length >
                0
            ) {

                branches =
                    await CloudBranch
                        .find({

                            _id: {
                                $in:
                                    assignedBranchIds,
                            },

                            isActive:
                                true,

                        })
                        .sort({

                            isDefault:
                                -1,

                            name:
                                1,

                        })
                        .select(
                            "_id code name address phone email isDefault isActive"
                        )
                        .lean();

            }

        }


        /*
        ========================================================
        DEFAULT BRANCH
        ========================================================

        Prefer the user's configured default branch when that
        branch is still accessible.

        Otherwise use the first accessible branch.
        ========================================================
        */

        let defaultBranch =
            null;


        if (
            user.defaultBranch
        ) {

            defaultBranch =
                branches.find(
                    (
                        branch
                    ) =>
                        String(
                            branch._id
                        ) ===
                        String(
                            user.defaultBranch
                        )
                ) ||
                null;

        }


        if (
            !defaultBranch &&
            branches.length >
                0
        ) {

            defaultBranch =
                branches[0];

        }


        return {

            branches,

            defaultBranch,

        };

    };


/*
============================================================
GENERATE ONLINE TOKEN
============================================================

This token is intentionally NOT compatible with the local
StorePOS JWT.

Payload example:

{
    sub: "<user ObjectId>",
    purpose: "mobile-pos"
}
============================================================
*/

const generateOnlineToken =
    (
        user
    ) => {

        const secret =
            requireOnlineJwtSecret();


        const expiresIn =
            String(
                process.env
                    .ONLINE_JWT_EXPIRES_IN ||
                "12h"
            ).trim();


        return jwt.sign(
            {

                purpose:
                    ONLINE_JWT_PURPOSE,

            },
            secret,
            {

                subject:
                    String(
                        user._id
                    ),

                issuer:
                    ONLINE_JWT_ISSUER,

                audience:
                    ONLINE_JWT_AUDIENCE,

                expiresIn,

            }
        );

    };


/*
============================================================
BUILD AUTH RESPONSE
============================================================
*/

const buildAuthResponse =
    async (
        user
    ) => {

        const branchContext =
            await buildCloudBranchContext(
                user
            );


        /*
        Mobile ordering requires at least one valid branch.
        */

        if (
            branchContext
                .branches
                .length ===
            0
        ) {

            throw new ApiError(
                403,
                "This account does not have access to an active branch."
            );

        }


        const token =
            generateOnlineToken(
                user
            );


        const permissions =
            buildPermissions(
                user
            );


        return {

            token,

            tokenType:
                "Bearer",

            user: {

                id:
                    user._id,

                _id:
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

                permissions,

                branches:
                    branchContext
                        .branches,

                defaultBranch:
                    branchContext
                        .defaultBranch,

                isActive:
                    user.isActive,

            },

        };

    };


/*
============================================================
ONLINE LOGIN
============================================================

Username/password only.

RFID login is intentionally NOT exposed through the public
internet-facing API at this stage.
============================================================
*/

const login =
    async ({
        username,
        password,
    }) => {

        const normalizedUsername =
            String(
                username ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !normalizedUsername ||
            !password
        ) {

            throw new ApiError(
                400,
                "Username and password are required."
            );

        }


        const CloudUser =
            await getCloudUserModel();


        const user =
            await CloudUser.findOne({

                username:
                    normalizedUsername,

            });


        if (
            !user
        ) {

            throw new ApiError(
                401,
                "Invalid username or password."
            );

        }


        if (
            user.isActive ===
            false
        ) {

            throw new ApiError(
                403,
                "This account has been disabled."
            );

        }


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (
            !passwordMatch
        ) {

            throw new ApiError(
                401,
                "Invalid username or password."
            );

        }


        return buildAuthResponse(
            user
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    login,

    buildCloudBranchContext,

    buildPermissions,

    getCloudUserModel,

    getCloudBranchModel,

};