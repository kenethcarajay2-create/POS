import jwt from "jsonwebtoken";

import User from "../models/user.model.js";


/*
============================================================
AUTHENTICATION MIDDLEWARE
============================================================

1. Read Bearer token
2. Verify JWT
3. Load the CURRENT user from MongoDB
4. Attach the full user to req.user

This is important because permission.middleware.js needs:

req.user.role
req.user.permissions
req.user.isActive
============================================================
*/

const protect = async (
    req,
    res,
    next
) => {

    try {

        /*
        ========================================================
        AUTHORIZATION HEADER
        ========================================================
        */

        const authHeader =
            req.headers.authorization;


        if (
            !authHeader ||
            !authHeader.startsWith(
                "Bearer "
            )
        ) {

            const error =
                new Error(
                    "Access denied. No token provided."
                );


            error.statusCode =
                401;


            throw error;

        }


        /*
        ========================================================
        GET TOKEN
        ========================================================
        */

        const token =
            authHeader.split(
                " "
            )[1];


        if (!token) {

            const error =
                new Error(
                    "Access denied. Invalid token."
                );


            error.statusCode =
                401;


            throw error;

        }


        /*
        ========================================================
        VERIFY TOKEN
        ========================================================
        */

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        /*
        ========================================================
        GET USER ID
        ========================================================

        Supports JWT payloads containing either:

        {
            id: "..."
        }

        or:

        {
            _id: "..."
        }
        ========================================================
        */

        const userId =
            decoded.id ||
            decoded._id;


        if (!userId) {

            const error =
                new Error(
                    "Invalid authentication token."
                );


            error.statusCode =
                401;


            throw error;

        }


        /*
        ========================================================
        LOAD CURRENT USER
        ========================================================

        IMPORTANT:

        We load the user from MongoDB instead of trusting
        permissions stored inside the JWT.

        This means if an Admin changes someone's permissions,
        the backend immediately uses the updated permissions.
        ========================================================
        */

        const user =
            await User.findById(
                userId
            ).select(
                "-password"
            );


        if (!user) {

            const error =
                new Error(
                    "User account no longer exists."
                );


            error.statusCode =
                401;


            throw error;

        }


        /*
        ========================================================
        CHECK ACCOUNT STATUS
        ========================================================
        */

        if (
            user.isActive ===
            false
        ) {

            const error =
                new Error(
                    "This account has been disabled."
                );


            error.statusCode =
                403;


            throw error;

        }


        /*
        ========================================================
        ATTACH USER
        ========================================================

        req.user now contains:

        {
            _id,
            name,
            username,
            role,
            permissions,
            isActive,
            ...
        }
        ========================================================
        */

        req.user =
            user;


        /*
        ========================================================
        CONTINUE
        ========================================================
        */

        next();


    } catch (
        error
    ) {

        /*
        ========================================================
        JWT ERRORS
        ========================================================
        */

        if (
            error.name ===
            "JsonWebTokenError"
        ) {

            error.statusCode =
                401;

            error.message =
                "Invalid authentication token.";

        }


        if (
            error.name ===
            "TokenExpiredError"
        ) {

            error.statusCode =
                401;

            error.message =
                "Your session has expired. Please log in again.";

        }


        /*
        If another error doesn't already have a status,
        default to 401.
        */

        if (
            !error.statusCode
        ) {

            error.statusCode =
                401;

        }


        next(
            error
        );

    }

};


export default protect;