import mongoose from "mongoose";


/*
============================================================
INVENTORY TRANSACTION SCHEMA
============================================================
*/

const inventoryTransactionSchema =
    new mongoose.Schema(
        {
            branch: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                default:
                    null,
            },


            branchSnapshot: {
                code: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,

                    maxlength:
                        20,
                },

                name: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,

                    maxlength:
                        120,
                },
            },


            product: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                required:
                    true,
            },


            type: {
                type:
                    String,

                enum: [
                    "STOCK_IN",
                    "STOCK_OUT",
                    "ADJUSTMENT",
                    "SALE",
                    "TRANSFER_OUT",
                    "TRANSFER_IN",
                ],

                required:
                    true,
            },


            quantity: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,
            },


            previousStock: {
                type:
                    Number,

                required:
                    true,
            },


            newStock: {
                type:
                    Number,

                required:
                    true,
            },


            /*
            ====================================================
            STOCK TRANSFER LINK
            ====================================================
            */

            stockTransfer: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "StockTransfer",

                default:
                    null,

                index:
                    true,
            },


            transferNumber: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                uppercase:
                    true,

                index:
                    true,
            },


            remarks: {
                type:
                    String,

                default:
                    "",
            },


            createdBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                required:
                    true,
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

inventoryTransactionSchema.index({
    createdAt:
        -1,
});


inventoryTransactionSchema.index({
    product:
        1,

    createdAt:
        -1,
});


inventoryTransactionSchema.index({
    branch:
        1,

    createdAt:
        -1,
});


inventoryTransactionSchema.index({
    branch:
        1,

    product:
        1,

    createdAt:
        -1,
});


inventoryTransactionSchema.index({
    branch:
        1,

    type:
        1,

    createdAt:
        -1,
});


inventoryTransactionSchema.index({
    stockTransfer:
        1,

    createdAt:
        1,
});


/*
============================================================
EXPORT
============================================================
*/

const InventoryTransaction =
    mongoose.models.InventoryTransaction ||
    mongoose.model(
        "InventoryTransaction",
        inventoryTransactionSchema
    );


export default InventoryTransaction;