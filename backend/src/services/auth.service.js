import bcrypt from "bcryptjs";

import User from "../models/user.model.js";

import generateToken from "../utils/generateToken.js";

import ApiError from "../utils/ApiError.js";


/*
============================================================
LOGIN
============================================================
*/

const login = async ({
    username,
    password,
}) => {

    /*
    ========================================================
    NORMALIZE USERNAME
    ========================================================
    */

    const normalizedUsername =
        String(
            username || ""
        )
            .trim()
            .toLowerCase();


    /*
    ========================================================
    FIND USER
    ========================================================
    */

    const user =
        await User.findOne({
            username:
                normalizedUsername,
        });


    if (!user) {

        throw new ApiError(
            401,
            "Invalid username or password"
        );

    }


    /*
    ========================================================
    ACCOUNT STATUS
    ========================================================
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
    ========================================================
    PASSWORD
    ========================================================
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
    ========================================================
    GENERATE TOKEN
    ========================================================
    */

    const token =
        generateToken(
            user
        );


    /*
    ========================================================
    PERMISSIONS
    ========================================================

    Admin is always full access.

    Other users use their stored permissions.
    ========================================================
    */

    const permissions =
        user.role ===
        "admin"

            ? {

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

                users: true,

                settings: true,
                salesRefund: true,
salesVoid: true,
salesReprint: true,

            }

            : {

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
        user.permissions?.salesRefund
    ),

salesVoid:
    Boolean(
        user.permissions?.salesVoid
    ),

salesReprint:
    Boolean(
        user.permissions?.salesReprint
    ),

            };


    /*
    ========================================================
    RETURN LOGIN DATA
    ========================================================
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

            permissions,

            isActive:
                user.isActive,

        },

    };

};


export default {

    login,

};