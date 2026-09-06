import express from "express";

import authController from "../controllers/auth.controller.js";

import authValidator from "../validators/auth.validator.js";


const router =
    express.Router();


/*
============================================================
VALIDATION MIDDLEWARE
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

                });

        }


        /*
        Use Joi's cleaned/normalized value.
        */

        req.body =
            value;


        next();

    };


/*
============================================================
NORMAL LOGIN
============================================================

POST /api/auth/login
============================================================
*/

router.post(
    "/login",

    validate(
        authValidator.loginSchema
    ),

    authController.login
);


/*
============================================================
RFID / NFC LOGIN
============================================================

POST /api/auth/rfid-login

Body:

{
    "rfidUid": "04A3D8917C2B80"
}
============================================================
*/

router.post(
    "/rfid-login",

    validate(
        authValidator.rfidLoginSchema
    ),

    authController.rfidLogin
);


export default router;