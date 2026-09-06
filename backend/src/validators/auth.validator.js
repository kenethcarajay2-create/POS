import Joi from "joi";


/*
============================================================
NORMAL LOGIN
============================================================
*/

const loginSchema =
    Joi.object({

        /*
        ====================================================
        USERNAME
        ====================================================
        */

        username:
            Joi.string()
                .trim()
                .min(
                    1
                )
                .max(
                    100
                )
                .required()
                .messages({

                    "string.empty":
                        "Username is required",

                    "any.required":
                        "Username is required",

                }),


        /*
        ====================================================
        PASSWORD
        ====================================================
        */

        password:
            Joi.string()
                .min(
                    1
                )
                .required()
                .messages({

                    "string.empty":
                        "Password is required",

                    "any.required":
                        "Password is required",

                }),

    });


/*
============================================================
RFID / NFC LOGIN
============================================================
*/

const rfidLoginSchema =
    Joi.object({

        rfidUid:
            Joi.string()
                .trim()
                .min(
                    1
                )
                .max(
                    100
                )
                .required()
                .messages({

                    "string.empty":
                        "RFID/NFC card UID is required",

                    "any.required":
                        "RFID/NFC card UID is required",

                }),

    });


export default {

    loginSchema,

    rfidLoginSchema,

};