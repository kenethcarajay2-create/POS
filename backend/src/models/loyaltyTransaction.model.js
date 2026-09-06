import mongoose from "mongoose";


const loyaltyTransactionSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            CUSTOMER
            ====================================================
            */

            customer: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Customer",

                required:
                    true,

                index:
                    true,
            },


            /*
            ====================================================
            SALE
            ====================================================

            null is allowed for future manual/admin adjustments.
            ====================================================
            */

            sale: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Sale",

                default:
                    null,

                index:
                    true,
            },


            /*
            ====================================================
            TYPE
            ====================================================

            EARN
            → points earned from purchase

            REDEEM
            → points used during checkout

            REVERSAL
            → refund / void correction

            ADJUSTMENT
            → future admin correction
            ====================================================
            */

            type: {
                type:
                    String,

                enum: [
                    "EARN",
                    "REDEEM",
                    "REVERSAL",
                    "ADJUSTMENT",
                ],

                required:
                    true,
            },


            /*
            ====================================================
            POINTS
            ====================================================

            Positive:
            +10

            Negative:
            -10
            ====================================================
            */

            points: {
                type:
                    Number,

                required:
                    true,
            },


            /*
            ====================================================
            BALANCE BEFORE / AFTER
            ====================================================

            Gives us a proper audit trail.
            ====================================================
            */

            balanceBefore: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
            },


            balanceAfter: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
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
            },


            /*
            ====================================================
            CREATED BY
            ====================================================

            Usually cashier/admin who completed the sale.
            ====================================================
            */

            createdBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

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

loyaltyTransactionSchema.index({

    customer:
        1,

    createdAt:
        -1,

});


loyaltyTransactionSchema.index({

    sale:
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
    "LoyaltyTransaction",
    loyaltyTransactionSchema
);