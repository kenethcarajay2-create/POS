import mongoose from "mongoose";


/*
============================================================
LEDGER ITEM SCHEMA
============================================================

Supports two item types:

1. PRODUCT

{
    itemType: "PRODUCT",
    product: ObjectId,
    barcode: "480000...",
    name: "Cooking Oil",
    note: "",
    quantity: 2,
    unitPrice: 100,
    total: 200
}


2. CUSTOM / GROCERY

{
    itemType: "CUSTOM",
    product: null,
    barcode: "",
    name: "Grocery",
    note: "Rice, vegetables, canned goods",
    quantity: 1,
    unitPrice: 350,
    total: 350
}

Custom items do NOT affect inventory.
============================================================
*/

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
              Miscellaneous items
            ====================================================
            */

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


            /*
            ====================================================
            PRODUCT REFERENCE
            ====================================================

            PRODUCT
            → Product ObjectId

            CUSTOM
            → null

            The service performs the logical validation.
            ====================================================
            */

            product: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                default:
                    null,

            },


            /*
            ====================================================
            BARCODE
            ====================================================

            PRODUCT
            → Product barcode snapshot

            CUSTOM
            → empty string
            ====================================================
            */

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


            /*
            ====================================================
            ITEM NAME
            ====================================================

            Examples:

            PRODUCT
            → "Cooking Oil 1L"

            CUSTOM
            → "Grocery"
            ====================================================
            */

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


            /*
            ====================================================
            CUSTOM / GROCERY NOTE
            ====================================================

            Optional description of a custom/open-price item.

            Example:

            name:
                "Grocery"

            note:
                "Rice, vegetables, canned goods"

            This does NOT affect:

            - inventory
            - quantity
            - prices
            - account balance calculations
            - worker salary calculations

            It is only descriptive information attached to
            the individual ledger item.

            Normal PRODUCT items will normally contain "".
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
            LINE TOTAL
            ====================================================

            quantity × unitPrice
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

        },
        {

            /*
            Ledger items do not currently require their own
            embedded ObjectIds.
            */

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
            WORKER LEDGER
            ====================================================

            WORKER transactions:
            → references the active WorkerLedger

            CUSTOMER transactions:
            → normally null
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

            Contains BOTH:

            - inventory products
            - custom/open-price Grocery items

            Each custom item may now contain:

            note: "Rice, vegetables..."
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
            CREDIT STATUS
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

            General remark for the whole transaction.

            IMPORTANT:

            This is different from:

                items[].note

            Example:

            remarks:
                "Worker grocery credit"

            items[0].note:
                "Rice and vegetables"
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

            Stores the previous transaction state before an
            administrative correction.

            Because previousData is Mixed, old Grocery notes
            are automatically preserved in edit history.
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

No callback-style next() middleware is used.

This keeps the model compatible with the rest of your
current Mongoose setup.
============================================================
*/

ledgerTransactionSchema.pre(
    "validate",
    function () {

        /*
        ========================================================
        NON-CREDIT TRANSACTION
        ========================================================

        PAYMENT and CASH_ADVANCE do not need product items.
        ========================================================
        */

        if (
            this.type !==
            "CREDIT"
        ) {

            return;

        }


        /*
        ========================================================
        CREDIT MUST HAVE ITEMS
        ========================================================
        */

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


        /*
        ========================================================
        ITEM VALIDATION
        ========================================================
        */

        for (
            const item
            of this.items
        ) {

            /*
            ----------------------------------------------------
            PRODUCT ITEM
            ----------------------------------------------------
            */

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


                /*
                Product items do not use custom Grocery notes.
                */

                item.note =
                    "";

            }


            /*
            ----------------------------------------------------
            CUSTOM ITEM
            ----------------------------------------------------
            */

            if (
                item.itemType ===
                "CUSTOM"
            ) {

                /*
                Custom items never point to inventory.
                */

                item.product =
                    null;


                item.barcode =
                    "";


                /*
                Clean custom note defensively.
                */

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


            /*
            ----------------------------------------------------
            QUANTITY
            ----------------------------------------------------
            */

            const quantity =
                Number(
                    item.quantity
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity < 1
            ) {

                throw new Error(
                    `Invalid quantity for "${item.name || "Item"}".`
                );

            }


            /*
            ----------------------------------------------------
            UNIT PRICE
            ----------------------------------------------------
            */

            const unitPrice =
                Number(
                    item.unitPrice
                );


            if (
                !Number.isFinite(
                    unitPrice
                ) ||
                unitPrice < 0
            ) {

                throw new Error(
                    `Invalid unit price for "${item.name || "Item"}".`
                );

            }


            /*
            ----------------------------------------------------
            TOTAL
            ----------------------------------------------------

            Recalculate instead of trusting an arbitrary
            client-provided total.
            ----------------------------------------------------
            */

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


/*
------------------------------------------------------------
ACCOUNT HISTORY
------------------------------------------------------------
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


/*
------------------------------------------------------------
WORKER LEDGER HISTORY
------------------------------------------------------------
*/

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


/*
------------------------------------------------------------
TRANSACTION TYPE HISTORY
------------------------------------------------------------
*/

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
MODEL
============================================================
*/

const LedgerTransaction =
    mongoose.model(
        "LedgerTransaction",
        ledgerTransactionSchema
    );


export default LedgerTransaction;