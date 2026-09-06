import mongoose from "mongoose";


/*
============================================================
SALE ITEM SCHEMA
============================================================

NORMAL PRODUCT:

{
    product: ObjectId,
    isOpenPrice: false,
    barcode: "...",
    name: "Coca Cola",
    note: "",
    quantity: 2,
    unitPrice: 20,
    subtotal: 40
}


OPEN PRICE ITEM:

{
    product: null,
    isOpenPrice: true,
    barcode: "",
    name: "Grocery",
    note: "Vegetables",
    quantity: 1,
    unitPrice: 125,
    subtotal: 125
}
============================================================
*/

const saleItemSchema =
    new mongoose.Schema(
        {

            /*
            ====================================================
            PRODUCT
            ====================================================

            Required for normal products.

            NOT required for Open Price / Grocery.
            ====================================================
            */

            product: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                default:
                    null,

                required: function () {

                    return (
                        this.isOpenPrice !==
                        true
                    );

                },

            },


            /*
            ====================================================
            OPEN PRICE FLAG
            ====================================================
            */

            isOpenPrice: {

                type:
                    Boolean,

                default:
                    false,

            },


            /*
            ====================================================
            BARCODE
            ====================================================
            */

            barcode: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

            },


            /*
            ====================================================
            NAME
            ====================================================
            */

            name: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    100,

            },


            /*
            ====================================================
            OPEN PRICE NOTE
            ====================================================

            Optional description for manually priced items.

            Examples:

            Grocery
            note: "Vegetables"

            Grocery
            note: "Rice"

            Grocery
            note: "Ice"

            Normal products usually leave this empty.

            The note does NOT affect:

            - inventory
            - pricing
            - quantity
            - refunds
            - loyalty calculations
            ====================================================
            */

            note: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    80,

            },


            /*
            ====================================================
            QUANTITY
            ====================================================
            */

            quantity: {

                type:
                    Number,

                required:
                    true,

                min:
                    1,

            },


            /*
            ====================================================
            REFUNDED QUANTITY
            ====================================================
            */

            refundedQuantity: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            UNIT PRICE
            ====================================================
            */

            unitPrice: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            /*
            ====================================================
            SUBTOTAL
            ====================================================
            */

            subtotal: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },

        },
        {

            /*
            Keep item _id.

            Needed for individual-item refunds.

            This is especially important for open-price items,
            because they do not have a Product ObjectId.
            */

            _id:
                true,

        }
    );


/*
============================================================
SALE SCHEMA
============================================================
*/

const saleSchema =
    new mongoose.Schema(
        {

            /*
            ====================================================
            RECEIPT NUMBER
            ====================================================
            */

            receiptNumber: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                trim:
                    true,

            },


            /*
            ====================================================
            CASHIER
            ====================================================
            */

            cashier: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                required:
                    false,

                default:
                    null,

            },


            /*
            ====================================================
            CUSTOMER
            ====================================================

            null
            → Walk-in

            ObjectId
            → Registered Customer
            ====================================================
            */

            customer: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Customer",

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            ITEMS
            ====================================================
            */

            items: {

                type: [
                    saleItemSchema,
                ],

                required:
                    true,

                validate: {

                    validator: function (
                        items
                    ) {

                        return (
                            Array.isArray(
                                items
                            ) &&
                            items.length >
                                0
                        );

                    },

                    message:
                        "A sale must contain at least one item.",

                },

            },


            /*
            ====================================================
            SUBTOTAL
            ====================================================
            */

            subtotal: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            /*
            ====================================================
            NORMAL DISCOUNT
            ====================================================
            */

            discount: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            LOYALTY POINTS REDEEMED
            ====================================================

            Example:

            40 points used
            ====================================================
            */

            loyaltyPointsRedeemed: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            LOYALTY DISCOUNT
            ====================================================

            Example:

            40 points
            = ₱40 loyalty discount
            ====================================================
            */

            loyaltyDiscount: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            LOYALTY POINTS EARNED
            ====================================================

            Example:

            ₱190 final spend
            = 1 point
            ====================================================
            */

            loyaltyPointsEarned: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            LOYALTY EARNED POINTS REVERSED
            ====================================================

            Used for:

            - void
            - full refund

            Prevents duplicate reversal.
            ====================================================
            */

            loyaltyEarnedPointsReversed: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            REDEEMED POINTS RESTORED
            ====================================================

            Used when a sale is:

            - voided
            - fully refunded
            ====================================================
            */

            loyaltyRedeemedPointsRestored: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            FINAL TOTAL
            ====================================================

            This is the FINAL amount after:

            normal discount
            AND
            loyalty discount

            Example:

            subtotal             ₱230
            loyalty discount      ₱40
            --------------------------
            total                ₱190
            ====================================================
            */

            total: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            /*
            ====================================================
            PAYMENT METHOD
            ====================================================
            */

            paymentMethod: {

                type:
                    String,

                enum: [
                    "Cash",
                    "GCash",
                    "Card",
                ],

                default:
                    "Cash",

            },


            /*
            ====================================================
            PAYMENT
            ====================================================
            */

            payment: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            /*
            ====================================================
            CHANGE
            ====================================================
            */

            change: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            /*
            ====================================================
            SALE NOTES
            ====================================================

            General notes for the whole sale.

            This is different from:

            items[].note

            items[].note
            → description of one Grocery/open-price line

            sale.notes
            → note for the entire transaction
            ====================================================
            */

            notes: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

            },


            /*
            ====================================================
            STATUS
            ====================================================
            */

            status: {

                type:
                    String,

                enum: [
                    "COMPLETED",
                    "PARTIALLY_REFUNDED",
                    "REFUNDED",
                    "VOIDED",
                ],

                default:
                    "COMPLETED",

            },

        },
        {

            timestamps:
                true,

        }
    );


/*
============================================================
INDEXES
============================================================
*/


/*
------------------------------------------------------------
RECENT SALES
------------------------------------------------------------
*/

saleSchema.index({

    createdAt:
        -1,

});


/*
------------------------------------------------------------
STATUS + DATE
------------------------------------------------------------
*/

saleSchema.index({

    status:
        1,

    createdAt:
        -1,

});


/*
------------------------------------------------------------
CASHIER SALES HISTORY
------------------------------------------------------------
*/

saleSchema.index({

    cashier:
        1,

    createdAt:
        -1,

});


/*
------------------------------------------------------------
CUSTOMER PURCHASE HISTORY
------------------------------------------------------------

Used by Customers page for:

- purchases today
- purchases this week
- purchases this month
- purchases this year
- lifetime spending
- transaction count
- average purchase
- last purchase
- loyalty history linkage
------------------------------------------------------------
*/

saleSchema.index({

    customer:
        1,

    createdAt:
        -1,

});


/*
============================================================
EXPORT
============================================================
*/

const Sale =
    mongoose.model(
        "Sale",
        saleSchema
    );


export default Sale;