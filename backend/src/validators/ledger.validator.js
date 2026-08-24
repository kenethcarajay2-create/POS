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
/*
============================================================
ADD CREDIT
============================================================

Supports two item types:

PRODUCT
- Requires productId
- Uses inventory
- Backend deducts stock

CUSTOM
- No productId required
- Requires custom name
- Requires custom unitPrice
- Does NOT affect inventory
============================================================
*/

const addCreditSchema = Joi.object({

    items: Joi.array()
        .items(

            Joi.object({

                /*
                ================================================
                ITEM TYPE
                ================================================
                */

                itemType: Joi.string()
                    .valid(
                        "PRODUCT",
                        "CUSTOM"
                    )
                    .default(
                        "PRODUCT"
                    )
                    .required(),


                /*
                ================================================
                PRODUCT ID

                Required only for PRODUCT.
                ================================================
                */

                productId: Joi.when(
                    "itemType",
                    {

                        is:
                            "PRODUCT",

                        then:
                            Joi.string()
                                .required(),

                        otherwise:
                            Joi.alternatives()
                                .try(
                                    Joi.string()
                                        .allow(""),

                                    Joi.valid(null)
                                )
                                .optional(),

                    }
                ),


                /*
                ================================================
                CUSTOM ITEM NAME

                Required only for CUSTOM.
                ================================================
                */

                name: Joi.when(
                    "itemType",
                    {

                        is:
                            "CUSTOM",

                        then:
                            Joi.string()
                                .trim()
                                .min(1)
                                .max(100)
                                .required(),

                        otherwise:
                            Joi.string()
                                .trim()
                                .max(100)
                                .optional(),

                    }
                ),


                /*
                ================================================
                QUANTITY
                ================================================
                */

                quantity: Joi.number()
                    .integer()
                    .min(1)
                    .required(),


                /*
                ================================================
                UNIT PRICE

                Required only for CUSTOM.

                PRODUCT pricing is still determined by backend
                from Product.pricing / costPrice.
                ================================================
                */

                unitPrice: Joi.when(
                    "itemType",
                    {

                        is:
                            "CUSTOM",

                        then:
                            Joi.number()
                                .positive()
                                .required(),

                        otherwise:
                            Joi.number()
                                .optional(),

                    }
                ),

            })
            .required()

        )
        .min(1)
        .required(),


    /*
    --------------------------------------------------------
    REMARKS
    --------------------------------------------------------
    */

    remarks: Joi.string()
        .trim()
        .max(500)
        .allow("")
        .optional(),

});

/*
============================================================
UPDATE LEDGER TRANSACTION
============================================================

ADMIN ONLY.

Supports editing:

CREDIT
- Product items
- Custom/open-price items
- Remarks

PAYMENT
- Amount
- Remarks

CASH_ADVANCE
- Amount
- Remarks

IMPORTANT:

The transaction type itself cannot actually be changed.
The backend compares this value against the existing
transaction.

editReason is required so every historical correction
has an audit reason.
============================================================
*/


/*
------------------------------------------------------------
EDIT CREDIT ITEM
------------------------------------------------------------
*/

const updateCreditItemSchema =
    Joi.object({

        /*
        ====================================================
        ITEM TYPE
        ====================================================
        */

        itemType: Joi.string()
            .valid(
                "PRODUCT",
                "CUSTOM"
            )
            .required(),


        /*
        ====================================================
        PRODUCT ID

        PRODUCT
        → required

        CUSTOM
        → null / empty / omitted
        ====================================================
        */

        productId: Joi.when(
            "itemType",
            {

                is:
                    "PRODUCT",

                then:
                    Joi.string()
                        .trim()
                        .required(),

                otherwise:
                    Joi.alternatives()
                        .try(

                            Joi.string()
                                .allow(""),

                            Joi.valid(null)

                        )
                        .optional(),

            }
        ),


        /*
        ====================================================
        CUSTOM ITEM NAME

        CUSTOM
        → required

        PRODUCT
        → optional
        ====================================================
        */

        name: Joi.when(
            "itemType",
            {

                is:
                    "CUSTOM",

                then:
                    Joi.string()
                        .trim()
                        .min(1)
                        .max(100)
                        .required(),

                otherwise:
                    Joi.string()
                        .trim()
                        .max(100)
                        .optional(),

            }
        ),


        /*
        ====================================================
        QUANTITY
        ====================================================
        */

        quantity: Joi.number()
            .integer()
            .min(1)
            .required(),


        /*
        ====================================================
        UNIT PRICE

        CUSTOM
        → required

        PRODUCT
        → backend determines price from product pricing
        ====================================================
        */

        unitPrice: Joi.when(
            "itemType",
            {

                is:
                    "CUSTOM",

                then:
                    Joi.number()
                        .positive()
                        .required(),

                otherwise:
                    Joi.number()
                        .optional(),

            }
        ),

    });


/*
------------------------------------------------------------
UPDATE TRANSACTION
------------------------------------------------------------
*/

const updateTransactionSchema =
    Joi.object({

        /*
        ====================================================
        TRANSACTION TYPE
        ====================================================

        The frontend sends this so validation knows which
        fields are expected.

        The service still prevents changing an existing
        transaction from one type to another.
        ====================================================
        */

        type: Joi.string()
            .valid(
                "CREDIT",
                "PAYMENT",
                "CASH_ADVANCE"
            )
            .required(),


        /*
        ====================================================
        CREDIT ITEMS
        ====================================================

        Required only when editing CREDIT.
        ====================================================
        */

        items: Joi.when(
            "type",
            {

                is:
                    "CREDIT",

                then:
                    Joi.array()
                        .items(
                            updateCreditItemSchema
                        )
                        .min(1)
                        .required(),

                otherwise:
                    Joi.forbidden(),

            }
        ),


        /*
        ====================================================
        AMOUNT
        ====================================================

        PAYMENT / CASH_ADVANCE
        → required

        CREDIT
        → forbidden because backend calculates it from items.
        ====================================================
        */

        amount: Joi.when(
            "type",
            {

                is:
                    "CREDIT",

                then:
                    Joi.forbidden(),

                otherwise:
                    Joi.number()
                        .positive()
                        .required(),

            }
        ),


        /*
        ====================================================
        DESCRIPTION
        ====================================================
        */

        description: Joi.string()
            .trim()
            .max(200)
            .allow("")
            .optional(),


        /*
        ====================================================
        REMARKS
        ====================================================
        */

        remarks: Joi.string()
            .trim()
            .max(500)
            .allow("")
            .optional(),


        /*
        ====================================================
        EDIT REASON

        REQUIRED FOR EVERY ADMIN CORRECTION.
        ====================================================
        */

        editReason: Joi.string()
            .trim()
            .min(3)
            .max(500)
            .required(),

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
/*
============================================================
EXPORT
============================================================
*/

export default {

    createAccountSchema,

    updateAccountSchema,

    addCreditSchema,

    /*
    Admin historical transaction correction
    */

    updateTransactionSchema,

    addPaymentSchema,

    cashAdvanceSchema,

    payWorkerSchema,

};