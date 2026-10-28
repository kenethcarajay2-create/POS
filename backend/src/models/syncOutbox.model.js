import mongoose from "mongoose";


/*
============================================================
COMMAND PAYLOAD SCHEMA
============================================================

Used by durable cloud commands and inventory sync events.

SyncOutbox is LOCAL-ONLY and is never mirrored directly to
Atlas.
============================================================
*/

const commandPayloadSchema =
    new mongoose.Schema(
        {
            preparedCartId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },

            saleId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },

            claimToken: {
                type: String,
                default: null,
            },

            userId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },

            productId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },

            productBarcode: {
                type: String,
                default: null,
                trim: true,
            },

            branchId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },

            branchCode: {
                type: String,
                default: null,
                trim: true,
                uppercase: true,
            },

            quantityChange: {
                type: Number,
                default: null,
            },

            referenceId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
        },
        {
            _id: false,
            strict: true,
        }
    );


/*
============================================================
SYNC OUTBOX SCHEMA
============================================================

SYNC_REQUEST
    Generic local -> cloud mirror request.

INVENTORY_CHANGE
    Durable stock delta for multi-computer synchronization.

CLOUD_COMMAND
    Durable cloud command such as PreparedCart FINALIZE.
============================================================
*/

const syncOutboxSchema =
    new mongoose.Schema(
        {
            eventId: {
                type: String,
                required: true,
                unique: true,
                index: true,
                trim: true,
            },

            type: {
                type: String,
                enum: [
                    "SYNC_REQUEST",
                    "INVENTORY_CHANGE",
                    "CLOUD_COMMAND",
                ],
                default: "SYNC_REQUEST",
                required: true,
                index: true,
            },

            source: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
                index: true,
            },

            action: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
                index: true,
            },

            aggregateId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
                index: true,
            },

            branch: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Branch",
                default: null,
                index: true,
            },

            commandPayload: {
                type: commandPayloadSchema,
                default: null,
            },

            status: {
                type: String,
                enum: [
                    "PENDING",
                    "SYNCED",
                    "FAILED",
                ],
                default: "PENDING",
                required: true,
                index: true,
            },

            attempts: {
                type: Number,
                default: 0,
                min: 0,
            },

            lastAttemptAt: {
                type: Date,
                default: null,
            },

            nextRetryAt: {
                type: Date,
                default: null,
                index: true,
            },

            lastError: {
                type: String,
                default: "",
            },

            syncedAt: {
                type: Date,
                default: null,
            },

            failedAt: {
                type: Date,
                default: null,
            },
        },
        {
            timestamps: true,
        }
    );


syncOutboxSchema.index({
    status: 1,
    nextRetryAt: 1,
    createdAt: 1,
});

syncOutboxSchema.index({
    source: 1,
    action: 1,
    createdAt: 1,
});

syncOutboxSchema.index({
    type: 1,
    status: 1,
    createdAt: 1,
});

syncOutboxSchema.index({
    type: 1,
    branch: 1,
    aggregateId: 1,
    createdAt: 1,
});


const SyncOutbox =
    mongoose.models.SyncOutbox ||
    mongoose.model(
        "SyncOutbox",
        syncOutboxSchema
    );


export default SyncOutbox;
