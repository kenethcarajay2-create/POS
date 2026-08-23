import Joi from "joi";


/*
============================================================
CREATE ACCOUNT
============================================================

Supports both:

CUSTOMER

and

WORKER:
- salary
- WEEKLY / MONTHLY pay frequency
- weekly payday
- monthly payday
============================================================
*/

const createAccountSchema = Joi.object({

    /*
    --------------------------------------------------------
    BASIC INFO
    --------------------------------------------------------
    */

    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required(),

    phone: Joi.string()
        .trim()
        .allow("")
        .max(30)
        .optional(),

    type: Joi.string()
        .valid(
            "WORKER",
            "CUSTOMER"
        )
        .required(),


    /*
    --------------------------------------------------------
    SALARY

    Required only for WORKER.
    --------------------------------------------------------
    */

    salary: Joi.when(
        "type",
        {
            is: "WORKER",

            then: Joi.number()
                .min(0)
                .required(),

            otherwise: Joi.valid(
                null
            ).optional(),
        }
    ),


    /*
    --------------------------------------------------------
    PAY FREQUENCY

    Required only for WORKER.

    IMPORTANT:
    Must be uppercase:

    WEEKLY
    MONTHLY
    --------------------------------------------------------
    */

    payFrequency: Joi.when(
        "type",
        {
            is: "WORKER",

            then: Joi.string()
                .valid(
                    "WEEKLY",
                    "MONTHLY"
                )
                .required(),

            otherwise: Joi.valid(
                null
            ).optional(),
        }
    ),


    /*
    --------------------------------------------------------
    MONTHLY PAYDAY

    Required only when:

    type = WORKER
    payFrequency = MONTHLY

    Examples:
    1
    15
    30
    31
    --------------------------------------------------------
    */

    payDay: Joi.when(
        "type",
        {
            is: "WORKER",

            then: Joi.when(
                "payFrequency",
                {
                    is: "MONTHLY",

                    then: Joi.number()
                        .integer()
                        .min(1)
                        .max(31)
                        .required(),

                    otherwise: Joi.valid(
                        null
                    ).optional(),
                }
            ),

            otherwise: Joi.valid(
                null
            ).optional(),
        }
    ),


    /*
    --------------------------------------------------------
    WEEKLY PAYDAY

    Required only when:

    type = WORKER
    payFrequency = WEEKLY

    Values:

    0 = Sunday
    1 = Monday
    2 = Tuesday
    3 = Wednesday
    4 = Thursday
    5 = Friday
    6 = Saturday
    --------------------------------------------------------
    */

    payDayOfWeek: Joi.when(
        "type",
        {
            is: "WORKER",

            then: Joi.when(
                "payFrequency",
                {
                    is: "WEEKLY",

                    then: Joi.number()
                        .integer()
                        .min(0)
                        .max(6)
                        .required(),

                    otherwise: Joi.valid(
                        null
                    ).optional(),
                }
            ),

            otherwise: Joi.valid(
                null
            ).optional(),
        }
    ),


    /*
    --------------------------------------------------------
    OPTIONAL SALARY PERIOD LABEL
    --------------------------------------------------------
    */

    salaryPeriod: Joi.string()
        .trim()
        .max(100)
        .allow("")
        .optional(),

});


/*
============================================================
UPDATE ACCOUNT
============================================================

Allows worker information and pay settings to be changed.
============================================================
*/

const updateAccountSchema = Joi.object({

    /*
    --------------------------------------------------------
    BASIC INFO
    --------------------------------------------------------
    */

    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    phone: Joi.string()
        .trim()
        .allow("")
        .max(30)
        .optional(),


    /*
    --------------------------------------------------------
    SALARY
    --------------------------------------------------------
    */

    salary: Joi.number()
        .min(0)
        .optional(),


    /*
    --------------------------------------------------------
    PAY FREQUENCY
    --------------------------------------------------------
    */

    payFrequency: Joi.string()
        .valid(
            "WEEKLY",
            "MONTHLY"
        )
        .optional(),


    /*
    --------------------------------------------------------
    MONTHLY PAYDAY

    null is allowed because switching from MONTHLY
    to WEEKLY should clear this field.
    --------------------------------------------------------
    */

    payDay: Joi.alternatives()
        .try(

            Joi.number()
                .integer()
                .min(1)
                .max(31),

            Joi.valid(null)

        )
        .optional(),


    /*
    --------------------------------------------------------
    WEEKLY PAYDAY

    null is allowed because switching from WEEKLY
    to MONTHLY should clear this field.
    --------------------------------------------------------
    */

    payDayOfWeek: Joi.alternatives()
        .try(

            Joi.number()
                .integer()
                .min(0)
                .max(6),

            Joi.valid(null)

        )
        .optional(),


    /*
    --------------------------------------------------------
    SALARY PERIOD
    --------------------------------------------------------
    */

    salaryPeriod: Joi.string()
        .trim()
        .max(100)
        .allow("")
        .optional(),


    /*
    --------------------------------------------------------
    ACCOUNT STATUS
    --------------------------------------------------------
    */

    isActive: Joi.boolean()
        .optional(),

})
.min(1);


/*
============================================================
ADD CREDIT
============================================================
*/

const addCreditSchema = Joi.object({

    items: Joi.array()
        .items(

            Joi.object({

                productId: Joi.string()
                    .required(),

                quantity: Joi.number()
                    .integer()
                    .min(1)
                    .required(),

            }).required()

        )
        .min(1)
        .required(),

    remarks: Joi.string()
        .trim()
        .max(500)
        .allow("")
        .optional(),

});


/*
============================================================
ADD PAYMENT
============================================================

Credit repayment.

This is NOT worker salary payment.
============================================================
*/

const addPaymentSchema = Joi.object({

    amount: Joi.number()
        .positive()
        .required(),

    remarks: Joi.string()
        .trim()
        .max(500)
        .allow("")
        .optional(),

});


/*
============================================================
CASH ADVANCE
============================================================
*/

const cashAdvanceSchema = Joi.object({

    amount: Joi.number()
        .positive()
        .required(),

    remarks: Joi.string()
        .trim()
        .max(500)
        .allow("")
        .optional(),

});


/*
============================================================
PAY WORKER
============================================================

Used by:

PATCH /api/ledger/:id/pay-worker

Both fields are optional because:

- ledgerId may be omitted and backend finds OPEN ledger.
- paymentDate may be omitted and backend uses current date.
============================================================
*/

const payWorkerSchema = Joi.object({

    ledgerId: Joi.string()
        .allow(
            null,
            ""
        )
        .optional(),

    paymentDate: Joi.date()
        .iso()
        .allow(null)
        .optional(),

});


/*
============================================================
EXPORT
============================================================
*/

export default {

    createAccountSchema,

    updateAccountSchema,

    addCreditSchema,

    addPaymentSchema,

    cashAdvanceSchema,

    payWorkerSchema,

};