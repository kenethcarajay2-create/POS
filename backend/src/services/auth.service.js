import bcrypt from "bcryptjs";

import User, {
    normalizeRfidUid,
} from "../models/user.model.js";

import generateToken from "../utils/generateToken.js";

import ApiError from "../utils/ApiError.js";

import branchAccessService from "./branch-access.service.js";


/*
============================================================
BUILD PERMISSIONS
============================================================

Keeps permission handling identical between:

- Username/password login
- RFID/NFC login
============================================================
*/

const buildPermissions = (
    user
) => {

    /*
    ========================================================
    ADMIN
    ========================================================

    Admin always receives full access.
    ========================================================
    */

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

            bulkOrder:
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


    /*
    ========================================================
    OTHER USERS
    ========================================================
    */

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

        bulkOrder:
            Boolean(
                user.permissions
                    ?.bulkOrder
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
BUILD AUTH RESPONSE
============================================================

Both login methods use this function.

That means the frontend does NOT need separate user structures
for password login and RFID login.

Branch access is resolved from the CURRENT MongoDB state.
It is NOT stored inside the JWT.
============================================================
*/

const buildAuthResponse =
    async (
        user
    ) => {

        /*
        ====================================================
        ENSURE / RESOLVE BRANCH CONTEXT
        ====================================================

        Existing users created before branch management are
        automatically migrated to MAIN when needed.

        Admin:
        - accessible to all active branches

        Non-admin:
        - accessible only to explicitly assigned branches
        ====================================================
        */

        const branchContext =
            await branchAccessService
                .buildBranchContext(
                    user
                );


        /*
        ====================================================
        GENERATE TOKEN
        ====================================================

        The token identifies the user.

        Branch access is intentionally NOT trusted from the
        token. The backend resolves branch access from the
        database on protected requests.
        ====================================================
        */

        const token =
            generateToken(
                user
            );


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        const permissions =
            buildPermissions(
                user
            );


        /*
        ====================================================
        RETURN
        ====================================================
        */

        return {

            token,

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


                /*
                =============================================
                PROFILE
                =============================================

                This is important for the login animation.
                =============================================
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
                =============================================
                PERMISSIONS
                =============================================
                */

                permissions,


                /*
                =============================================
                BRANCH ACCESS
                =============================================

                branches:
                All branches the current user may access.

                defaultBranch:
                Branch selected when the user initially logs in.

                This does NOT become the security boundary.

                Every branch-sensitive request will still be
                validated by the backend.
                =============================================
                */

                branches:
                    branchContext
                        .branches,

                defaultBranch:
                    branchContext
                        .defaultBranch,


                /*
                =============================================
                STATUS
                =============================================
                */

                isActive:
                    user.isActive,

            },

        };

    };


/*
============================================================
NORMAL LOGIN
============================================================

Username + password login.
============================================================
*/

const login =
    async ({
        username,
        password,
    }) => {

        /*
        ====================================================
        NORMALIZE USERNAME
        ====================================================
        */

        const normalizedUsername =
            String(
                username ||
                ""
            )
                .trim()
                .toLowerCase();


        /*
        ====================================================
        VALIDATE INPUT
        ====================================================
        */

        if (
            !normalizedUsername ||
            !password
        ) {

            throw new ApiError(
                400,
                "Username and password are required"
            );

        }


        /*
        ====================================================
        FIND USER
        ====================================================
        */

        const user =
            await User.findOne({

                username:
                    normalizedUsername,

            });


        /*
        ====================================================
        USER NOT FOUND
        ====================================================
        */

        if (
            !user
        ) {

            throw new ApiError(
                401,
                "Invalid username or password"
            );

        }


        /*
        ====================================================
        ACCOUNT STATUS
        ====================================================
        */

        if (
            !user.isActive
        ) {

            throw new ApiError(
                403,
                "This account has been disabled"
            );

        }


        /*
        ====================================================
        PASSWORD
        ====================================================
        */

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
                "Invalid username or password"
            );

        }


        /*
        ====================================================
        AUTH RESPONSE
        ====================================================
        */

        return await buildAuthResponse(
            user
        );

    };


/*
============================================================
RFID / NFC LOGIN
============================================================

Used when a worker taps their RFID/NFC card.

Example incoming UID:

04:A3:D8:91:7C:2B:80

Normalized:

04A3D8917C2B80
============================================================
*/

const rfidLogin =
    async ({
        rfidUid,
    }) => {

        /*
        ====================================================
        NORMALIZE CARD UID
        ====================================================
        */

        const normalizedUid =
            normalizeRfidUid(
                rfidUid
            );


        /*
        ====================================================
        EMPTY UID
        ====================================================
        */

        if (
            !normalizedUid
        ) {

            throw new ApiError(
                400,
                "RFID/NFC card UID is required"
            );

        }


        /*
        ====================================================
        FIND USER BY CARD
        ====================================================
        */

        const user =
            await User.findOne({

                rfidUid:
                    normalizedUid,

            });


        /*
        ====================================================
        CARD NOT REGISTERED
        ====================================================
        */

        if (
            !user
        ) {

            throw new ApiError(
                401,
                "RFID/NFC card is not registered"
            );

        }


        /*
        ====================================================
        ACCOUNT STATUS
        ====================================================
        */

        if (
            !user.isActive
        ) {

            throw new ApiError(
                403,
                "This account has been disabled"
            );

        }


        /*
        ====================================================
        AUTHENTICATE USER
        ====================================================

        No password is needed here because possession of the
        registered card is the login credential.
        ====================================================
        */

        return await buildAuthResponse(
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

    rfidLogin,

};