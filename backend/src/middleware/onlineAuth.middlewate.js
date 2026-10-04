import jwt from "jsonwebtoken";

import onlineAuthService
    from "../services/onlineAuth.service.js";

import ApiError
    from "../utils/ApiError.js";


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
ONLINE AUTHENTICATION
============================================================

Used only by the internet-facing StorePOS API.

This middleware:

1. Reads Bearer token
2. Verifies ONLINE_JWT_SECRET
3. Requires StorePOS online issuer/audience
4. Requires purpose = mobile-pos
5. Loads CURRENT user from Atlas
6. Loads CURRENT cloud branch access

It never trusts permissions or branch access embedded in the
JWT.
============================================================
*/

const protectOnline =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            ====================================================
            HEADER
            ====================================================
            */

            const authHeader =
                req.headers
                    .authorization;


            if (
                !authHeader ||
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                throw new ApiError(
                    401,
                    "Access denied. No online token provided."
                );

            }


            const token =
                authHeader
                    .slice(
                        "Bearer ".length
                    )
                    .trim();


            if (
                !token
            ) {

                throw new ApiError(
                    401,
                    "Access denied. Invalid online token."
                );

            }


            /*
            ====================================================
            SECRET
            ====================================================
            */

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


            /*
            ====================================================
            VERIFY
            ====================================================
            */

            const decoded =
                jwt.verify(
                    token,
                    secret,
                    {

                        issuer:
                            ONLINE_JWT_ISSUER,

                        audience:
                            ONLINE_JWT_AUDIENCE,

                    }
                );


            if (
                decoded.purpose !==
                ONLINE_JWT_PURPOSE
            ) {

                throw new ApiError(
                    401,
                    "Invalid online authentication token."
                );

            }


            const userId =
                decoded.sub;


            if (
                !userId
            ) {

                throw new ApiError(
                    401,
                    "Invalid online authentication token."
                );

            }


            /*
            ====================================================
            LOAD CURRENT CLOUD USER
            ====================================================
            */

            const CloudUser =
                await onlineAuthService
                    .getCloudUserModel();


            const user =
                await CloudUser
                    .findById(
                        userId
                    )
                    .select(
                        "-password"
                    );


            if (
                !user
            ) {

                throw new ApiError(
                    401,
                    "User account no longer exists."
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


            /*
            ====================================================
            BRANCH CONTEXT
            ====================================================
            */

            const branchContext =
                await onlineAuthService
                    .buildCloudBranchContext(
                        user
                    );


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


            /*
            ====================================================
            ATTACH REQUEST CONTEXT
            ====================================================
            */

            req.onlineUser =
                user;


            /*
            Keep req.user too so reusable permission
            middleware can work later if needed.
            */

            req.user =
                user;


            req.accessibleBranches =
                branchContext
                    .branches;


            req.defaultBranch =
                branchContext
                    .defaultBranch;


            next();


        } catch (
            error
        ) {

            if (
                error.name ===
                "JsonWebTokenError"
            ) {

                error.statusCode =
                    401;

                error.message =
                    "Invalid online authentication token.";

            }


            if (
                error.name ===
                "TokenExpiredError"
            ) {

                error.statusCode =
                    401;

                error.message =
                    "Your online session has expired. Please log in again.";

            }


            next(
                error
            );

        }

    };


export default protectOnline;