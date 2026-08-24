import mongoose from "mongoose";


const ledgerItemSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            ITEM TYPE
            ====================================================

            PRODUCT
            → Existing inventory product

            CUSTOM
            → Open-price/non-inventory item such as:
              Grocery
              Medicine
              Market Items
              etc.
            ====================================================
            */

            itemType: {
                type: String,
                enum: [
                    "PRODUCT",
                    "CUSTOM",
                ],
                default: "PRODUCT",
                required: true,
            },


            /*
            ====================================================
            PRODUCT REFERENCE
            ====================================================

            PRODUCT:
            Required logically by the service.

            CUSTOM:
            null
            ====================================================
            */

            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                default: null,
            },


            barcode: {
                type: String,
                default: "",
                trim: true,
            },


            name: {
                type: String,
                required: true,
                trim: true,
            },


            quantity: {
                type: Number,
                required: true,
                min: 1,
            },


            unitPrice: {
                type: Number,
                required: true,
                min: 0,
            },


            total: {
                type: Number,
                required: true,
                min: 0,
            },
        },
        {
            _id: false,
        }
    );


const ledgerTransactionSchema =
    new mongoose.Schema(
        {
            workerLedger: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "WorkerLedger",
                default: null,
                index: true,
            },


            account: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "LedgerAccount",
                required: true,
            },


            type: {
                type: String,
                enum: [
                    "CREDIT",
                    "PAYMENT",
                    "CASH_ADVANCE",
                ],
                required: true,
            },


            description: {
                type: String,
                default: "",
                trim: true,
            },


            amount: {
                type: Number,
                required: true,
                min: 0,
            },


            /*
            ====================================================
            CREDIT ITEMS
            ====================================================

            Contains BOTH:

            - inventory products
            - custom/open-price items
            ====================================================
            */

            items: {
                type: [ledgerItemSchema],
                default: [],
            },


            status: {
                type: String,
                enum: [
                    "UNPAID",
                    "PARTIAL",
                    "PAID",
                ],
                default: "UNPAID",
            },


            remarks: {
                type: String,
                default: "",
                trim: true,
            },


            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            /*
============================================================
EDIT AUDIT
============================================================
*/

editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
},

editedAt: {
    type: Date,
    default: null,
},

editReason: {
    type: String,
    default: "",
    trim: true,
},

editHistory: [
    {
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        editedAt: {
            type: Date,
            default: Date.now,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
        },

        previousData: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
],
        },
        {
            timestamps: true,
        }
    );


const LedgerTransaction =
    mongoose.model(
        "LedgerTransaction",
        ledgerTransactionSchema
    );


export default LedgerTransaction;