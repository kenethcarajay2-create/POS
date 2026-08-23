import mongoose from "mongoose";

const ledgerTransactionSchema = new mongoose.Schema(
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
        ------------------------------------------------------
        PRODUCTS PURCHASED ON CREDIT
        ------------------------------------------------------
        We store a snapshot of the product information here.

        This is intentional.

        If the product price later changes from ₱55 to ₱60,
        an old ledger transaction should still show ₱55.
        ------------------------------------------------------
        */

        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
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
        ],

        /*
        ------------------------------------------------------
        PAYMENT / CREDIT STATUS
        ------------------------------------------------------
        */

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

        /*
        ------------------------------------------------------
        WHO CREATED THE TRANSACTION
        ------------------------------------------------------
        This refers to the StorePOS user/cashier/admin who
        performed the action.
        ------------------------------------------------------
        */

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const LedgerTransaction = mongoose.model(
    "LedgerTransaction",
    ledgerTransactionSchema
);

export default LedgerTransaction;