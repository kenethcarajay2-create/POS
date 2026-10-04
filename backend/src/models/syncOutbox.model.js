import mongoose from "mongoose";


/*
============================================================
COMMAND PAYLOAD SCHEMA
============================================================

Used only by durable cloud commands.

IMPORTANT:

SyncOutbox is LOCAL-ONLY.

It is never mirrored to Atlas.

The raw PreparedCart claim token may therefore live here
temporarily so a checkout can commit locally even when the
internet disappears before Atlas finalization succeeds.

The claim token is cleared after successful processing.
============================================================
*/

const commandPayloadSchema =
    new mongoose.Schema(
        {

            preparedCartId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

            },


            saleId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

            },


            claimToken: {

                type:
                    String,

                default:
                    null,

            },


            userId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

            },

        },
        {

            _id:
                false,

            strict:
                true,

        }
    );


/*
============================================================
SYNC OUTBOX SCHEMA
============================================================

Types:

SYNC_REQUEST
    Existing local -> cloud mirror synchronization.

CLOUD_COMMAND
    A specific durable cloud operation that must not be
    treated as generic collection synchronization.

Current cloud command:

PREPARED_CART / FINALIZE
============================================================
*/

const syncOutboxSchema =
    new mongoose.Schema(
        {

            eventId: {

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

            },


            type: {

                type:
                    String,

                enum: [
                    "SYNC_REQUEST",
                    "CLOUD_COMMAND",
                ],

                default:
                    "SYNC_REQUEST",

                required:
                    true,

                index:
                    true,

            },


            source: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                uppercase:
                    true,

                index:
                    true,

            },


            action: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                uppercase:
                    true,

                index:
                    true,

            },


            aggregateId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

                index:
                    true,

            },


            branch: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                default:
                    null,

                index:
                    true,

            },


            /*
            ====================================================
            CLOUD COMMAND PAYLOAD
            ====================================================
            */

            commandPayload: {

                type:
                    commandPayloadSchema,

                default:
                    null,

            },


            /*
            ====================================================
            PROCESSING STATUS
            ====================================================
            */

            status: {

                type:
                    String,

                enum: [
                    "PENDING",
                    "SYNCED",
                    "FAILED",
                ],

                default:
                    "PENDING",

                required:
                    true,

                index:
                    true,

            },


            attempts: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            lastAttemptAt: {

                type:
                    Date,

                default:
                    null,

            },


            nextRetryAt: {

                type:
                    Date,

                default:
                    null,

                index:
                    true,

            },


            lastError: {

                type:
                    String,

                default:
                    "",

            },


            syncedAt: {

                type:
                    Date,

                default:
                    null,

            },


            failedAt: {

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

syncOutboxSchema.index({

    status:
        1,

    nextRetryAt:
        1,

    createdAt:
        1,

});


syncOutboxSchema.index({

    source:
        1,

    action:
        1,

    createdAt:
        1,

});


syncOutboxSchema.index({

    type:
        1,

    status:
        1,

    createdAt:
        1,

});


/*
============================================================
MODEL
============================================================
*/

const SyncOutbox =
    mongoose.models.SyncOutbox ||
    mongoose.model(
        "SyncOutbox",
        syncOutboxSchema
    );


export default SyncOutbox;