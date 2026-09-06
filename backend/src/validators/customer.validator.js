import Joi from "joi";


/*
============================================================
CREATE CUSTOMER
============================================================
*/

const createCustomerSchema =
    Joi.object({

        name:
            Joi.string()
                .trim()
                .min(2)
                .max(100)
                .required(),

        phone:
            Joi.string()
                .trim()
                .max(30)
                .allow("")
                .optional(),

        rfidUid:
            Joi.alternatives()
                .try(

                    Joi.string()
                        .trim()
                        .max(100),

                    Joi.valid(null)

                )
                .optional(),

    });


/*
============================================================
UPDATE CUSTOMER
============================================================
*/

const updateCustomerSchema =
    Joi.object({

        name:
            Joi.string()
                .trim()
                .min(2)
                .max(100)
                .optional(),

        phone:
            Joi.string()
                .trim()
                .max(30)
                .allow("")
                .optional(),

        rfidUid:
            Joi.alternatives()
                .try(

                    Joi.string()
                        .trim()
                        .max(100)
                        .allow(""),

                    Joi.valid(null)

                )
                .optional(),

        isActive:
            Joi.boolean()
                .optional(),

    })
        .min(1);


/*
============================================================
EXPORT
============================================================
*/

export default {

    createCustomerSchema,

    updateCustomerSchema,

};