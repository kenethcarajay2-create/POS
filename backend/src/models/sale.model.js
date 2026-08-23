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

            Grocery/Open Price can have an empty barcode.
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

            This is useful for refunds, especially when the
            same sale contains multiple Grocery lines.
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
            DISCOUNT
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
            TOTAL
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
            NOTES
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

saleSchema.index({
    createdAt:
        -1,
});


saleSchema.index({

    status:
        1,

    createdAt:
        -1,

});


saleSchema.index({

    cashier:
        1,

    createdAt:
        -1,

});


/*
============================================================
EXPORT
============================================================
*/

export default mongoose.model(
    "Sale",
    saleSchema
);