import mongoose from "mongoose";


/*
============================================================
PREPARED CART ITEM SCHEMA
============================================================

These are snapshots of what the mobile worker saw when the
cart was prepared.

IMPORTANT:

The snapshot price is NOT authoritative during checkout.

The desktop POS must revalidate:

- Product
- Current pricing
- BranchInventory
- Current stock

before importing the prepared cart.
============================================================
*/

const preparedCartItemSchema =
    new mongoose.Schema(
        {

            product: {

                type:
                    mongoose.Schema.Types.ObjectId,

                required:
                    true,

            },


            barcodeSnapshot: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

            },


            nameSnapshot: {

                type:
                    String,

                required:
                    true,

                trim:
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


            unitPriceSnapshot: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            subtotalSnapshot: {

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
PREPARED CART SCHEMA
============================================================

IMPORTANT:

PreparedCart is CLOUD-OWNED.

It must NOT be registered in the normal local -> cloud sync
registry.

Lifecycle:

OPEN
    ↓
CLAIMED
    ↓
CONSUMED


Other terminal states:

EXPIRED
CANCELLED
============================================================
*/

const preparedCartSchema =
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

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            CREATED BY
            ====================================================
            */

            createdBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            ITEMS
            ====================================================
            */

            items: {

                type: [
                    preparedCartItemSchema
                ],

                required:
                    true,

                validate: {

                    validator:
                        (
                            value
                        ) =>
                            Array.isArray(
                                value
                            ) &&
                            value.length >
                                0,

                    message:
                        "Prepared cart must contain at least one item.",

                },

            },


            /*
            ====================================================
            QR TOKEN HASH
            ====================================================

            QR:

                POSCART:<raw token>

            Database:

                SHA-256(raw token)

            The raw token is never stored.
            ====================================================
            */

            tokenHash: {

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

                lowercase:
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
                    "OPEN",
                    "CLAIMED",
                    "CONSUMED",
                    "EXPIRED",
                    "CANCELLED",
                ],

                default:
                    "OPEN",

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            CART EXPIRATION
            ====================================================

            The cart itself normally expires after 30 minutes.
            ====================================================
            */

            expiresAt: {

                type:
                    Date,

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            CLAIM
            ====================================================

            A desktop claims the cart before importing it.

            The claim prevents another cashier from importing
            the same prepared cart simultaneously.
            ====================================================
            */

            claimedAt: {

                type:
                    Date,

                default:
                    null,

            },


            claimedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            CLAIM TOKEN HASH
            ====================================================

            The raw claim token is returned to the desktop but
            never stored.

            Only its SHA-256 hash is stored.
            ====================================================
            */

            claimTokenHash: {

                type:
                    String,

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            CLAIM EXPIRATION
            ====================================================

            An abandoned claim automatically becomes eligible
            to be reclaimed.

            This avoids permanently locking a cart if the
            desktop crashes before checkout.
            ====================================================
            */

            claimExpiresAt: {

                type:
                    Date,

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            CONSUMPTION
            ====================================================
            */

            consumedAt: {

                type:
                    Date,

                default:
                    null,

            },


            consumedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            SALE
            ====================================================

            This uses the stable local Sale ObjectId.

            Because local Sale _id values are preserved during
            cloud synchronization, the same ID can later refer
            to the mirrored Atlas Sale.
            ====================================================
            */

            sale: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            CANCELLATION
            ====================================================
            */

            cancelledAt: {

                type:
                    Date,

                default:
                    null,

            },


            cancelledBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

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

preparedCartSchema.index(
    {

        branch:
            1,

        status:
            1,

        createdAt:
            -1,

    }
);


preparedCartSchema.index(
    {

        createdBy:
            1,

        status:
            1,

        createdAt:
            -1,

    }
);


preparedCartSchema.index(
    {

        status:
            1,

        expiresAt:
            1,

    }
);


preparedCartSchema.index(
    {

        status:
            1,

        claimExpiresAt:
            1,

    }
);


/*
============================================================
SALE UNIQUENESS
============================================================

One PreparedCart may be linked to one Sale.

The partial index avoids applying uniqueness to null values.
============================================================
*/

preparedCartSchema.index(
    {

        sale:
            1,

    },
    {

        unique:
            true,

        partialFilterExpression: {

            sale: {
                $type:
                    "objectId",
            },

        },

    }
);


/*
============================================================
NO TTL INDEX
============================================================

We intentionally retain expired carts for audit and
diagnostics.

A separate cleanup policy can be added later.
============================================================
*/


/*
============================================================
EXPORT SCHEMA ONLY
============================================================

DO NOT:

mongoose.model("PreparedCart", preparedCartSchema)

PreparedCart belongs to the cloud connection, not the local
default Mongoose connection.
============================================================
*/

export default preparedCartSchema;