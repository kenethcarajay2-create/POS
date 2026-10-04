import mongoose from "mongoose";


/*
============================================================
TRANSFER ITEM
============================================================
*/

const stockTransferItemSchema =
    new mongoose.Schema(
        {
            product: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                required:
                    true,
            },


            barcode: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,
            },


            name: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    150,
            },


            baseUnit: {
                type:
                    String,

                default:
                    "Piece",

                trim:
                    true,

                maxlength:
                    50,
            },


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
            COMPLETION AUDIT SNAPSHOTS
            ====================================================
            */

            sourceStockBefore: {
                type:
                    Number,

                default:
                    null,
            },


            sourceStockAfter: {
                type:
                    Number,

                default:
                    null,
            },


            destinationStockBefore: {
                type:
                    Number,

                default:
                    null,
            },


            destinationStockAfter: {
                type:
                    Number,

                default:
                    null,
            },
        },
        {
            _id:
                true,
        }
    );


/*
============================================================
STOCK TRANSFER
============================================================
*/

const stockTransferSchema =
    new mongoose.Schema(
        {
            transferNumber: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                trim:
                    true,

                uppercase:
                    true,
            },


            sourceBranch: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                required:
                    true,

                index:
                    true,
            },


            sourceBranchSnapshot: {
                code: {
                    type:
                        String,

                    required:
                        true,

                    trim:
                        true,

                    uppercase:
                        true,
                },

                name: {
                    type:
                        String,

                    required:
                        true,

                    trim:
                        true,
                },
            },


            destinationBranch: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                required:
                    true,

                index:
                    true,
            },


            destinationBranchSnapshot: {
                code: {
                    type:
                        String,

                    required:
                        true,

                    trim:
                        true,

                    uppercase:
                        true,
                },

                name: {
                    type:
                        String,

                    required:
                        true,

                    trim:
                        true,
                },
            },


            items: {
                type: [
                    stockTransferItemSchema,
                ],

                default:
                    [],
            },


            totalItems: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },


            totalQuantity: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },


            remarks: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    500,
            },


            status: {
                type:
                    String,

                enum: [
                    "DRAFT",
                    "COMPLETED",
                    "CANCELLED",
                ],

                default:
                    "DRAFT",

                required:
                    true,

                index:
                    true,
            },


            createdBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                required:
                    true,
            },


            completedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },


            completedAt: {
                type:
                    Date,

                default:
                    null,
            },


            cancelledBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },


            cancelledAt: {
                type:
                    Date,

                default:
                    null,
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

stockTransferSchema.index({
    sourceBranch:
        1,

    createdAt:
        -1,
});


stockTransferSchema.index({
    destinationBranch:
        1,

    createdAt:
        -1,
});


stockTransferSchema.index({
    status:
        1,

    createdAt:
        -1,
});


/*
============================================================
MODEL
============================================================
*/

const StockTransfer =
    mongoose.models.StockTransfer ||
    mongoose.model(
        "StockTransfer",
        stockTransferSchema
    );


export default StockTransfer;