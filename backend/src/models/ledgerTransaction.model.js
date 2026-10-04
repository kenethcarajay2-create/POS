import mongoose from "mongoose";


/*
============================================================
LEDGER ITEM SCHEMA
============================================================
*/

const ledgerItemSchema =
    new mongoose.Schema(
        {

            itemType: {

                type:
                    String,

                enum: [
                    "PRODUCT",
                    "CUSTOM",
                ],

                default:
                    "PRODUCT",

                required:
                    true,

            },


            product: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                default:
                    null,

            },


            barcode: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    100,

            },


            name: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                minlength:
                    1,

                maxlength:
                    100,

            },


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


            quantity: {

                type:
                    Number,

                required:
                    true,

                min:
                    1,

            },


            unitPrice: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            total: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },

        },
        {

            _id:
                false,

        }
    );


/*
============================================================
LEDGER TRANSACTION SCHEMA
============================================================
*/

const ledgerTransactionSchema =
    new mongoose.Schema(
        {

            /*
            ====================================================
            BRANCH
            ====================================================
            */

            branch: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                default:
                    null,

            },


            /*
            ====================================================
            BRANCH SNAPSHOT
            ====================================================
            */

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


            /*
            ====================================================
            WORKER LEDGER
            ====================================================
            */

            workerLedger: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "WorkerLedger",

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            ACCOUNT
            ====================================================
            */

            account: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "LedgerAccount",

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            TRANSACTION TYPE
            ====================================================
            */

            type: {

                type:
                    String,

                enum: [
                    "CREDIT",
                    "PAYMENT",
                    "CASH_ADVANCE",
                ],

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            DESCRIPTION
            ====================================================
            */

            description: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    250,

            },


            /*
            ====================================================
            TRANSACTION AMOUNT
            ====================================================
            */

            amount: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            /*
            ====================================================
            CREDIT ITEMS
            ====================================================
            */

            items: {

                type: [
                    ledgerItemSchema,
                ],

                default:
                    [],

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
                    "UNPAID",
                    "PARTIAL",
                    "PAID",
                ],

                default:
                    "UNPAID",

            },


            /*
            ====================================================
            REMARKS
            ====================================================
            */

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


            /*
            ====================================================
            CREATED BY
            ====================================================
            */

            createdBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                required:
                    true,

            },


            /*
            ====================================================
            EDIT AUDIT
            ====================================================
            */

            editedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,

            },


            editedAt: {

                type:
                    Date,

                default:
                    null,

            },


            editReason: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    500,

            },


            /*
            ====================================================
            EDIT HISTORY
            ====================================================
            */

            editHistory: [

                {

                    editedBy: {

                        type:
                            mongoose.Schema.Types.ObjectId,

                        ref:
                            "User",

                        required:
                            true,

                    },


                    editedAt: {

                        type:
                            Date,

                        default:
                            Date.now,

                    },


                    reason: {

                        type:
                            String,

                        required:
                            true,

                        trim:
                            true,

                        maxlength:
                            500,

                    },


                    previousData: {

                        type:
                            mongoose.Schema.Types.Mixed,

                        required:
                            true,

                    },

                },

            ],

        },
        {

            timestamps:
                true,

        }
    );


/*
============================================================
VALIDATE LEDGER TRANSACTION
============================================================
*/

ledgerTransactionSchema.pre(
    "validate",
    function () {

        if (
            this.type !==
            "CREDIT"
        ) {

            return;

        }


        if (
            !Array.isArray(
                this.items
            ) ||
            this.items.length ===
                0
        ) {

            throw new Error(
                "A credit transaction must contain at least one item."
            );

        }


        for (
            const item
            of this.items
        ) {

            if (
                item.itemType ===
                "PRODUCT"
            ) {

                if (
                    !item.product
                ) {

                    throw new Error(
                        `Product reference is required for "${item.name || "Product"}".`
                    );

                }


                item.note =
                    "";

            }


            if (
                item.itemType ===
                "CUSTOM"
            ) {

                item.product =
                    null;


                item.barcode =
                    "";


                item.note =
                    String(
                        item.note ||
                        ""
                    )
                        .trim()
                        .slice(
                            0,
                            80
                        );

            }


            const quantity =
                Number(
                    item.quantity
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity <
                    1
            ) {

                throw new Error(
                    `Invalid quantity for "${item.name || "Item"}".`
                );

            }


            const unitPrice =
                Number(
                    item.unitPrice
                );


            if (
                !Number.isFinite(
                    unitPrice
                ) ||
                unitPrice <
                    0
            ) {

                throw new Error(
                    `Invalid unit price for "${item.name || "Item"}".`
                );

            }


            item.total =
                quantity *
                unitPrice;

        }

    }
);


/*
============================================================
INDEXES
============================================================
*/

ledgerTransactionSchema.index(
    {
        account:
            1,

        createdAt:
            -1,
    },
    {
        name:
            "ledger_transaction_account_history",
    }
);


ledgerTransactionSchema.index(
    {
        workerLedger:
            1,

        createdAt:
            -1,
    },
    {
        name:
            "ledger_transaction_worker_history",
    }
);


ledgerTransactionSchema.index(
    {
        account:
            1,

        type:
            1,

        createdAt:
            -1,
    },
    {
        name:
            "ledger_transaction_account_type_history",
    }
);


/*
============================================================
BRANCH INDEXES
============================================================
*/

ledgerTransactionSchema.index(
    {
        branch:
            1,

        createdAt:
            -1,
    },
    {
        name:
            "ledger_transaction_branch_history",
    }
);


ledgerTransactionSchema.index(
    {
        branch:
            1,

        account:
            1,

        createdAt:
            -1,
    },
    {
        name:
            "ledger_transaction_branch_account_history",
    }
);


ledgerTransactionSchema.index(
    {
        branch:
            1,

        workerLedger:
            1,

        createdAt:
            -1,
    },
    {
        name:
            "ledger_transaction_branch_worker_history",
    }
);


/*
============================================================
MODEL
============================================================
*/

const LedgerTransaction =
    mongoose.model(
        "LedgerTransaction",
        ledgerTransactionSchema
    );


export default LedgerTransaction;