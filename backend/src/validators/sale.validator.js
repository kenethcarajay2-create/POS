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

const refundSchema = Joi.object({

    items: Joi.array()
        .items(
            Joi.object({

                saleItemId: Joi.string()
                    .optional(),

                productId: Joi.string()
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

export default {

    checkoutSchema,
    refundSchema

};