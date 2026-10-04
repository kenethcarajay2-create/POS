import mongoose from "mongoose";


/*
============================================================
PRODUCT SCHEMA
============================================================

Product contains global catalog information.

IMPORTANT:

BranchInventory is the authoritative source of live stock.

Product.stock is retained only for legacy compatibility and
must not be treated as the active branch inventory quantity.

Products synchronized from the Product Pricing system may:

- have no cost price yet
- default to category "Others"
- later be manually categorized inside StorePOS

The pricing synchronization should never overwrite:

- category
- description
- minimumStock
- branch inventory quantities
============================================================
*/

const productSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            PRICING SOURCE ID
            ====================================================

            Stores the _id of the remote PricedProduct.

            This gives the synchronization system a stable
            identity even if barcode or product name changes.

            IMPORTANT:

            Do NOT put index: true here.

            The explicit partial unique index is declared below.
            ====================================================
            */

            pricingSourceId: {
                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,
            },


            /*
            ====================================================
            SOURCE CAPTURE ID
            ====================================================

            Stores the original ProductCapture _id.

            This provides another stable identity between:

            Product Recorder
                ↓
            Product Pricing
                ↓
            StorePOS

            IMPORTANT:

            Do NOT put index: true here.

            The explicit partial unique index is declared below.
            ====================================================
            */

            sourceCaptureId: {
                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,
            },


            /*
            ====================================================
            BARCODE
            ====================================================
            */

            barcode: {
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
            PRODUCT NAME
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
            DESCRIPTION
            ====================================================

            StorePOS-owned field.

            The Product Pricing synchronization must not
            overwrite this value.
            ====================================================
            */

            description: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,
            },


            /*
            ====================================================
            CATEGORY
            ====================================================

            Newly synchronized products default to "Others".

            The user can later manually change the category.

            Future pricing synchronization should preserve the
            manually selected StorePOS category.
            ====================================================
            */

            category: {
                type:
                    String,

                enum: [
                    "Beverages",
                    "Snacks",
                    "Canned Goods",
                    "Frozen",
                    "Household",
                    "Personal Care",
                    "Others",
                ],

                default:
                    "Others",
            },


            /*
            ====================================================
            COST PRICE
            ====================================================

            Cost price may be unknown when the product is first
            imported from the pricing system.

            null
                Cost price has not been entered yet.

            0
                Cost price is intentionally zero.

            Keeping these meanings separate avoids falsely
            treating an unknown cost as a real ₱0 cost.
            ====================================================
            */

            costPrice: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            /*
            ====================================================
            BASE UNIT
            ====================================================
            */

            baseUnit: {
                type:
                    String,

                required:
                    true,

                default:
                    "Piece",

                trim:
                    true,
            },


            /*
            ====================================================
            PRICING TIERS
            ====================================================

            IMPORTANT:

            price is the TOTAL price for the specified quantity.

            Example:

            quantity: 6
            price: 1000

            means:

            6 pieces = ₱1,000 TOTAL

            It does NOT mean:

            ₱1,000 per piece

            and it must NOT be converted to ₱166.67 before
            storing.
            ====================================================
            */

            pricing: [
                {
                    quantity: {
                        type:
                            Number,

                        required:
                            true,

                        min:
                            1,
                    },

                    price: {
                        type:
                            Number,

                        required:
                            true,

                        min:
                            0,
                    },
                },
            ],


            /*
            ====================================================
            LEGACY STOCK
            ====================================================

            BranchInventory is the authoritative stock source.

            Remote Product Pricing stock must NEVER be copied
            into this field during synchronization.
            ====================================================
            */

            stock: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },


            /*
            ====================================================
            MINIMUM STOCK
            ====================================================

            StorePOS-owned field.

            Product synchronization must not overwrite it.
            ====================================================
            */

            minimumStock: {
                type:
                    Number,

                default:
                    5,

                min:
                    0,
            },


            /*
            ====================================================
            ACTIVE STATUS
            ====================================================
            */

            isActive: {
                type:
                    Boolean,

                default:
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
REMOTE SOURCE INDEXES
============================================================

These indexes are intentionally defined here rather than with:

index: true

inside the field definitions.

That avoids the duplicate Mongoose schema-index warning.

Partial unique indexes allow older/local-only products to keep
null source IDs while ensuring actual remote ObjectIds cannot
belong to multiple local products.
============================================================
*/

productSchema.index(
    {
        pricingSourceId:
            1,
    },
    {
        unique:
            true,

        partialFilterExpression: {
            pricingSourceId: {
                $type:
                    "objectId",
            },
        },
    }
);


productSchema.index(
    {
        sourceCaptureId:
            1,
    },
    {
        unique:
            true,

        partialFilterExpression: {
            sourceCaptureId: {
                $type:
                    "objectId",
            },
        },
    }
);


/*
============================================================
GENERAL QUERY INDEXES
============================================================
*/

productSchema.index({
    isActive:
        1,

    name:
        1,
});


productSchema.index({
    category:
        1,

    name:
        1,
});


/*
============================================================
MODEL
============================================================
*/

const Product =
    mongoose.model(
        "Product",
        productSchema
    );


export default Product;