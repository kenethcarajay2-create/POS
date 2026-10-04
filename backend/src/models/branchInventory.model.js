import mongoose from "mongoose";


/*
============================================================
BRANCH INVENTORY SCHEMA
============================================================

One document represents the stock of ONE product
inside ONE branch.

Example:

{
    branch: MAIN,
    product: Coca-Cola,
    stock: 42,
    minimumStock: 10
}

Another branch can independently contain:

{
    branch: BRANCH_2,
    product: Coca-Cola,
    stock: 15,
    minimumStock: 5
}

The Product itself remains global.
============================================================
*/

const branchInventorySchema =
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

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            PRODUCT
            ====================================================
            */

            product: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            STOCK
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

            Branch-level threshold.

            During migration this will be copied from the
            existing Product.minimumStock value.

            Later, every branch can configure its own minimum.
            ====================================================
            */

            minimumStock: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            ACTIVE
            ====================================================

            Allows inventory for a product to be disabled at
            a specific branch without disabling the global
            Product catalog entry.
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
CRITICAL UNIQUE INDEX
============================================================

A product may have only ONE inventory document per branch.

This protects against duplicate stock records caused by:

- repeated API requests
- migration retries
- dropped connections
- duplicate submissions
- race conditions during normal creation

Example:

MAIN + Product A

can exist only once.
============================================================
*/

branchInventorySchema.index(
    {
        branch:
            1,

        product:
            1,
    },
    {
        unique:
            true,
    }
);


/*
============================================================
USEFUL INDEXES
============================================================
*/

branchInventorySchema.index({

    branch:
        1,

    isActive:
        1,

});


branchInventorySchema.index({

    branch:
        1,

    stock:
        1,

});


branchInventorySchema.index({

    product:
        1,

    isActive:
        1,

});


/*
============================================================
EXPORT
============================================================
*/

const BranchInventory =
    mongoose.model(
        "BranchInventory",
        branchInventorySchema
    );


export default BranchInventory;