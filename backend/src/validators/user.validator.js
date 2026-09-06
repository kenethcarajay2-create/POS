import Joi from "joi";


/*
============================================================
ALLOWED ROLES
============================================================
*/

const allowedRoles = [

    "admin",

    "manager",

    "cashier",

    "inventory",

    "payroll",

    "custom",

];


/*
============================================================
PROFILE
============================================================
*/

const profileSchema =
    Joi.object({

        image:
            Joi.string()
                .trim()
                .max(
                    500
                )
                .allow(
                    ""
                )
                .optional(),

        nickname:
            Joi.string()
                .trim()
                .max(
                    50
                )
                .allow(
                    ""
                )
                .optional(),

    });


/*
============================================================
PERMISSIONS
============================================================
*/

const permissionsSchema =
    Joi.object({

        dashboard:
            Joi.boolean(),

        products:
            Joi.boolean(),

        inventory:
            Joi.boolean(),

        pos:
            Joi.boolean(),

        sales:
            Joi.boolean(),

        customers:
            Joi.boolean(),

        suppliers:
            Joi.boolean(),

        workers:
            Joi.boolean(),

        ledger:
            Joi.boolean(),

        reports:
            Joi.boolean(),

        users:
            Joi.boolean(),

        settings:
            Joi.boolean(),

        salesRefund:
            Joi.boolean(),

        salesVoid:
            Joi.boolean(),

        salesReprint:
            Joi.boolean(),

    });


/*
============================================================
CREATE USER
============================================================
*/

const createUserSchema =
    Joi.object({

        name:
            Joi.string()
                .trim()
                .min(
                    2
                )
                .max(
                    100
                )
                .required(),

        username:
            Joi.string()
                .trim()
                .min(
                    3
                )
                .max(
                    50
                )
                .required(),

        password:
            Joi.string()
                .min(
                    6
                )
                .max(
                    128
                )
                .required(),

        role:
            Joi.string()
                .valid(
                    ...allowedRoles
                )
                .default(
                    "cashier"
                ),


        /*
        ====================================================
        PROFILE
        ====================================================
        */

        profile:
            profileSchema
                .optional(),


        /*
        ====================================================
        RFID / NFC
        ====================================================

        "" = no card assigned
        ====================================================
        */

        rfidUid:
            Joi.string()
                .trim()
                .max(
                    100
                )
                .allow(
                    ""
                )
                .optional(),


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        permissions:
            permissionsSchema
                .optional(),

    });


/*
============================================================
UPDATE USER
============================================================
*/

const updateUserSchema =
    Joi.object({

        name:
            Joi.string()
                .trim()
                .min(
                    2
                )
                .max(
                    100
                )
                .optional(),

        username:
            Joi.string()
                .trim()
                .min(
                    3
                )
                .max(
                    50
                )
                .optional(),

        role:
            Joi.string()
                .valid(
                    ...allowedRoles
                )
                .optional(),


        /*
        ====================================================
        PROFILE
        ====================================================
        */

        profile:
            profileSchema
                .optional(),


        /*
        ====================================================
        RFID / NFC
        ====================================================
        */

        rfidUid:
            Joi.string()
                .trim()
                .max(
                    100
                )
                .allow(
                    ""
                )
                .optional(),


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        permissions:
            permissionsSchema
                .optional(),


        /*
        ====================================================
        ACTIVE
        ====================================================
        */

        isActive:
            Joi.boolean()
                .optional(),

    })
        .min(
            1
        );


/*
============================================================
UPDATE PASSWORD
============================================================
*/

const updatePasswordSchema =
    Joi.object({

        password:
            Joi.string()
                .min(
                    6
                )
                .max(
                    128
                )
                .required(),

    });


/*
============================================================
EXPORT
============================================================
*/

export default {

    createUserSchema,

    updateUserSchema,

    updatePasswordSchema,

};