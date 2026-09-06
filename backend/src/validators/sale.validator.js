import Joi from "joi";


/*
============================================================
CHECKOUT ITEM
============================================================

NORMAL PRODUCT:

{
    isOpenPrice: false,
    productId: "...",
    quantity: 2
}


OPEN PRICE:

{
    isOpenPrice: true,
    name: "Grocery",
    note: "Vegetables",
    quantity: 1,
    unitPrice: 125
}
============================================================
*/

const checkoutItemSchema = Joi.object({

    /*
    ========================================================
    OPEN PRICE FLAG
    ========================================================
    */

    isOpenPrice: Joi.boolean()
        .default(false),


    /*
    ========================================================
    PRODUCT ID
    ========================================================

    Required ONLY when isOpenPrice = false.

    Open-price Grocery items do NOT need productId.
    ========================================================
    */

    productId: Joi.when(
        "isOpenPrice",
        {
            is: true,

            then: Joi.any()
                .strip(),

            otherwise: Joi.string()
                .trim()
                .required(),
        }
    ),


    /*
    ========================================================
    NAME
    ========================================================

    Required ONLY for open-price items.
    ========================================================
    */

    name: Joi.when(
        "isOpenPrice",
        {
            is: true,

            then: Joi.string()
                .trim()
                .min(1)
                .max(100)
                .required(),

            otherwise: Joi.any()
                .strip(),
        }
    ),


    /*
    ========================================================
    OPEN PRICE NOTE
    ========================================================

    Optional description of what was sold.

    Examples:

    Rice
    Vegetables
    Ice
    Candy
    Cooking ingredients

    Only valid for open-price items.

    Normal product requests have this field stripped.
    ========================================================
    */

    note: Joi.when(
        "isOpenPrice",
        {
            is: true,

            then: Joi.string()
                .trim()
                .allow("")
                .max(80)
                .default(""),

            otherwise: Joi.any()
                .strip(),
        }
    ),


    /*
    ========================================================
    UNIT PRICE
    ========================================================

    Required ONLY for open-price items.
    ========================================================
    */

    unitPrice: Joi.when(
        "isOpenPrice",
        {
            is: true,

            then: Joi.number()
                .positive()
                .required(),

            otherwise: Joi.any()
                .strip(),
        }
    ),


    /*
    ========================================================
    QUANTITY
    ========================================================
    */

    quantity: Joi.number()
        .integer()
        .min(1)
        .required(),

});


/*
============================================================
CHECKOUT
============================================================

Supports:

- normal checkout
- walk-in customer
- registered customer
- loyalty point redemption
- open-price Grocery items
- optional Grocery/open-price notes
============================================================
*/

const checkoutSchema = Joi.object({

    /*
    ========================================================
    ITEMS
    ========================================================
    */

    items: Joi.array()
        .items(
            checkoutItemSchema
        )
        .min(1)
        .required(),


    /*
    ========================================================
    CUSTOMER
    ========================================================

    Optional.

    null / missing
    → Walk-in customer

    Object ID string
    → Registered customer

    The service performs the actual customer lookup.
    ========================================================
    */

    customerId: Joi.alternatives()
        .try(

            Joi.string()
                .trim()
                .min(1),

            Joi.valid(
                null
            )

        )
        .optional(),


    /*
    ========================================================
    LOYALTY POINTS TO REDEEM
    ========================================================

    0
    → no redemption

    Example:
    40
    → request to redeem 40 points

    The service handles the real rules:

    - minimum 10
    - multiples of 10
    - enough available points
    - maximum 50% of purchase
    ========================================================
    */

    loyaltyPointsToRedeem: Joi.number()
        .integer()
        .min(0)
        .default(0),


    /*
    ========================================================
    DISCOUNT
    ========================================================
    */

    discount: Joi.number()
        .min(0)
        .default(0),


    /*
    ========================================================
    PAYMENT
    ========================================================
    */

    payment: Joi.number()
        .required()
        .min(0),


    /*
    ========================================================
    PAYMENT METHOD
    ========================================================
    */

    paymentMethod: Joi.string()
        .valid(
            "Cash",
            "GCash",
            "Card"
        )
        .default("Cash"),

});


/*
============================================================
REFUND
============================================================

Supports refund by:

- embedded sale item ID
- product ID

Open-price items should normally be refunded using saleItemId
because they do not have a Product document.
============================================================
*/

const refundSchema = Joi.object({

    items: Joi.array()
        .items(

            Joi.object({

                saleItemId: Joi.string()
                    .trim()
                    .optional(),

                productId: Joi.string()
                    .trim()
                    .optional(),

                quantity: Joi.number()
                    .integer()
                    .min(1)
                    .required(),

            })
            .or(
                "saleItemId",
                "productId"
            )

        )
        .min(1)
        .required(),

});


/*
============================================================
EXPORT
============================================================
*/

export default {

    checkoutSchema,

    refundSchema,

};