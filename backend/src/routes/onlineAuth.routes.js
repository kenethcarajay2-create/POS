import express from "express";

import onlineAuthController
    from "../controllers/onlineAuth.controller.js";

import authValidator
    from "../validators/auth.validator.js";

import protectOnline
    from "../middleware/onlineAuth.middleware.js";


const router =
    express.Router();


/*
============================================================
VALIDATE
============================================================
*/

const validate =
    (
        schema
    ) =>
    (
        req,
        res,
        next
    ) => {

        const {
            error,
            value,
        } =
            schema.validate(
                req.body,
                {

                    abortEarly:
                        false,

                    stripUnknown:
                        true,

                }
            );


        if (
            error
        ) {

            return res
                .status(
                    400
                )
                .json({

                    success:
                        false,

                    message:
                        error
                            .details
                            .map(
                                (
                                    detail
                                ) =>
                                    detail.message
                            )
                            .join(
                                ", "
                            ),

                    data:
                        null,

                });

        }


        req.body =
            value;


        next();

    };


/*
============================================================
LOGIN
============================================================

POST /api/online/auth/login
============================================================
*/

router.post(
    "/login",

    validate(
        authValidator
            .loginSchema
    ),

    onlineAuthController
        .login
);


/*
============================================================
PROFILE
============================================================

GET /api/online/auth/profile
============================================================
*/

router.get(
    "/profile",

    protectOnline,

    onlineAuthController
        .profile
);


export default router;