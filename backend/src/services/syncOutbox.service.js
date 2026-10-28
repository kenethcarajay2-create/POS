import crypto from "crypto";

import mongoose from "mongoose";

import SyncOutbox
    from "../models/syncOutbox.model.js";


/*
============================================================
CONFIG
============================================================
*/

const MAX_ERROR_LENGTH =
    1000;


/*
============================================================
RETRY BACKOFF
============================================================
*/

const calculateRetryDelayMs = (
    attempts
) => {

    const normalizedAttempts =
        Math.max(
            1,
            Number(
                attempts
            ) || 1
        );


    const delay =
        5000 *
        Math.pow(
            2,
            normalizedAttempts -
            1
        );


    return Math.min(
        delay,
        5 * 60 * 1000
    );

};


/*
============================================================
CREATE EVENT ID
============================================================
*/

const createEventId =
    () => {

        return crypto.randomUUID();

    };


/*
============================================================
NORMALIZE OBJECT ID
============================================================
*/

const normalizeObjectId =
    (
        value,
        fieldName,
        {
            required = false,
        } = {}
    ) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            if (
                required
            ) {

                throw new Error(
                    `${fieldName} is required.`
                );

            }


            return null;

        }


        const id =
            value?._id ||
            value;


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    id
                )
        ) {

            throw new Error(
                `Invalid ${fieldName}.`
            );

        }


        return id;

    };


/*
============================================================
CREATE EVENT
============================================================
*/

const createOutboxEvent =
    async (
        document,
        session = null
    ) => {

        if (
            session
        ) {

            const [
                outbox,
            ] =
                await SyncOutbox.create(
                    [
                        document,
                    ],
                    {
                        session,
                    }
                );


            return outbox;

        }


        return await SyncOutbox.create(
            document
        );

    };


/*
============================================================
ENQUEUE SYNC REQUEST
============================================================
*/

const enqueueSyncRequest =
    async ({
        source,
        action,
        aggregateId = null,
        branchId = null,
        session = null,
    }) => {

        const document = {

            eventId:
                createEventId(),

            type:
                "SYNC_REQUEST",

            source:
                String(
                    source ||
                    "UNKNOWN"
                )
                    .trim()
                    .toUpperCase(),

            action:
                String(
                    action ||
                    "UPDATE"
                )
                    .trim()
                    .toUpperCase(),

            aggregateId:
                normalizeObjectId(
                    aggregateId,
                    "aggregate ID"
                ),

            branch:
                normalizeObjectId(
                    branchId,
                    "branch ID"
                ),

            commandPayload:
                null,

            status:
                "PENDING",

            attempts:
                0,

            lastAttemptAt:
                null,

            nextRetryAt:
                null,

            lastError:
                "",

            syncedAt:
                null,

            failedAt:
                null,

        };


        return await createOutboxEvent(
            document,
            session
        );

    };


/*
============================================================
ENQUEUE INVENTORY CHANGE
============================================================

Stores a SIGNED stock delta.

Examples:

Sale of 2:
    -2

Stock in 10:
    +10

This event is the cross-computer inventory message.
============================================================
*/

const enqueueInventoryChange =
    async ({
        productId,
        productBarcode,
        branchId,
        branchCode,
        quantityChange,
        source = "INVENTORY",
        action = "ADJUST",
        referenceId = null,
        session = null,
    }) => {

        const resolvedProductId =
            normalizeObjectId(
                productId,
                "product ID",
                {
                    required:
                        true,
                }
            );


        const resolvedBranchId =
            normalizeObjectId(
                branchId,
                "branch ID",
                {
                    required:
                        true,
                }
            );


        const resolvedReferenceId =
            normalizeObjectId(
                referenceId,
                "reference ID"
            );


        const normalizedProductBarcode =
            String(
                productBarcode ||
                ""
            ).trim();


        if (
            !normalizedProductBarcode
        ) {

            throw new Error(
                "Product barcode is required for inventory synchronization."
            );

        }


        const normalizedBranchCode =
            String(
                branchCode ||
                ""
            )
                .trim()
                .toUpperCase();


        if (
            !normalizedBranchCode
        ) {

            throw new Error(
                "Branch code is required for inventory synchronization."
            );

        }


        const normalizedQuantityChange =
            Number(
                quantityChange
            );


        if (
            !Number.isFinite(
                normalizedQuantityChange
            ) ||
            normalizedQuantityChange ===
                0
        ) {

            throw new Error(
                "Inventory quantity change must be a non-zero number."
            );

        }


        const document = {

            eventId:
                createEventId(),

            type:
                "INVENTORY_CHANGE",

            source:
                String(
                    source ||
                    "INVENTORY"
                )
                    .trim()
                    .toUpperCase(),

            action:
                String(
                    action ||
                    "ADJUST"
                )
                    .trim()
                    .toUpperCase(),

            aggregateId:
                resolvedProductId,

            branch:
                resolvedBranchId,

            commandPayload: {

                productId:
                    resolvedProductId,

                productBarcode:
                    normalizedProductBarcode,

                branchId:
                    resolvedBranchId,

                branchCode:
                    normalizedBranchCode,

                quantityChange:
                    normalizedQuantityChange,

                referenceId:
                    resolvedReferenceId,

            },

            status:
                "PENDING",

            attempts:
                0,

            lastAttemptAt:
                null,

            nextRetryAt:
                null,

            lastError:
                "",

            syncedAt:
                null,

            failedAt:
                null,

        };


        return await createOutboxEvent(
            document,
            session
        );

    };


/*
============================================================
ENQUEUE PREPARED CART FINALIZE COMMAND
============================================================
*/

const enqueuePreparedCartFinalize =
    async ({
        preparedCartId,
        saleId,
        claimToken,
        userId,
        branchId,
        session = null,
    }) => {

        const resolvedPreparedCartId =
            normalizeObjectId(
                preparedCartId,
                "prepared cart ID",
                {
                    required:
                        true,
                }
            );


        const resolvedSaleId =
            normalizeObjectId(
                saleId,
                "sale ID",
                {
                    required:
                        true,
                }
            );


        const resolvedUserId =
            normalizeObjectId(
                userId,
                "user ID",
                {
                    required:
                        true,
                }
            );


        const resolvedBranchId =
            normalizeObjectId(
                branchId,
                "branch ID",
                {
                    required:
                        true,
                }
            );


        const normalizedClaimToken =
            String(
                claimToken ||
                ""
            ).trim();


        if (
            !normalizedClaimToken
        ) {

            throw new Error(
                "Prepared cart claim token is required."
            );

        }


        const document = {

            eventId:
                createEventId(),

            type:
                "CLOUD_COMMAND",

            source:
                "PREPARED_CART",

            action:
                "FINALIZE",

            aggregateId:
                resolvedPreparedCartId,

            branch:
                resolvedBranchId,

            commandPayload: {

                preparedCartId:
                    resolvedPreparedCartId,

                saleId:
                    resolvedSaleId,

                claimToken:
                    normalizedClaimToken,

                userId:
                    resolvedUserId,

            },

            status:
                "PENDING",

            attempts:
                0,

            lastAttemptAt:
                null,

            nextRetryAt:
                null,

            lastError:
                "",

            syncedAt:
                null,

            failedAt:
                null,

        };


        return await createOutboxEvent(
            document,
            session
        );

    };


/*
============================================================
GET READY EVENTS
============================================================
*/

const getReadyEvents =
    async ({
        createdBefore,
        limit = 100,
    }) => {

        const now =
            new Date();


        return await SyncOutbox
            .find({

                status:
                    "PENDING",

                createdAt: {
                    $lte:
                        createdBefore,
                },

                $or: [
                    {
                        nextRetryAt:
                            null,
                    },
                    {
                        nextRetryAt: {
                            $lte:
                                now,
                        },
                    },
                ],

            })
            .sort({
                createdAt:
                    1,
            })
            .limit(
                limit
            )
            .lean();

    };


/*
============================================================
MARK ATTEMPT
============================================================
*/

const markAttempt =
    async (
        eventIds
    ) => {

        if (
            !Array.isArray(
                eventIds
            ) ||
            eventIds.length ===
                0
        ) {

            return;

        }


        await SyncOutbox.updateMany(
            {
                eventId: {
                    $in:
                        eventIds,
                },
                status:
                    "PENDING",
            },
            {
                $inc: {
                    attempts:
                        1,
                },
                $set: {
                    lastAttemptAt:
                        new Date(),
                    lastError:
                        "",
                },
            }
        );

    };


/*
============================================================
MARK SYNCED
============================================================
*/

const markSynced =
    async (
        eventIds
    ) => {

        if (
            !Array.isArray(
                eventIds
            ) ||
            eventIds.length ===
                0
        ) {

            return;

        }


        const now =
            new Date();


        await SyncOutbox.updateMany(
            {
                eventId: {
                    $in:
                        eventIds,
                },
                status:
                    "PENDING",
                type: {
                    $ne:
                        "CLOUD_COMMAND",
                },
            },
            {
                $set: {
                    status:
                        "SYNCED",
                    syncedAt:
                        now,
                    failedAt:
                        null,
                    nextRetryAt:
                        null,
                    lastError:
                        "",
                },
            }
        );


        await SyncOutbox.updateMany(
            {
                eventId: {
                    $in:
                        eventIds,
                },
                status:
                    "PENDING",
                type:
                    "CLOUD_COMMAND",
            },
            {
                $set: {
                    status:
                        "SYNCED",
                    syncedAt:
                        now,
                    failedAt:
                        null,
                    nextRetryAt:
                        null,
                    lastError:
                        "",
                    commandPayload:
                        null,
                },
            }
        );

    };


/*
============================================================
MARK RETRYABLE FAILURE
============================================================
*/

const markFailed =
    async (
        events,
        error
    ) => {

        if (
            !Array.isArray(
                events
            ) ||
            events.length ===
                0
        ) {

            return;

        }


        const errorMessage =
            String(
                error?.message ||
                error ||
                "Unknown synchronization error."
            )
                .slice(
                    0,
                    MAX_ERROR_LENGTH
                );


        const operations =
            events.map(
                (
                    event
                ) => {

                    const currentAttempt =
                        (
                            Number(
                                event.attempts
                            ) || 0
                        ) +
                        1;


                    const retryDelay =
                        calculateRetryDelayMs(
                            currentAttempt
                        );


                    return {
                        updateOne: {
                            filter: {
                                eventId:
                                    event.eventId,
                                status:
                                    "PENDING",
                            },
                            update: {
                                $set: {
                                    lastError:
                                        errorMessage,
                                    nextRetryAt:
                                        new Date(
                                            Date.now() +
                                            retryDelay
                                        ),
                                },
                            },
                        },
                    };

                }
            );


        await SyncOutbox.bulkWrite(
            operations,
            {
                ordered:
                    false,
            }
        );

    };


/*
============================================================
MARK TERMINAL FAILURE
============================================================
*/

const markTerminalFailed =
    async (
        eventIds,
        error
    ) => {

        if (
            !Array.isArray(
                eventIds
            ) ||
            eventIds.length ===
                0
        ) {

            return;

        }


        const now =
            new Date();


        const errorMessage =
            String(
                error?.message ||
                error ||
                "Permanent cloud command failure."
            )
                .slice(
                    0,
                    MAX_ERROR_LENGTH
                );


        await SyncOutbox.updateMany(
            {
                eventId: {
                    $in:
                        eventIds,
                },
                status:
                    "PENDING",
                type: {
                    $ne:
                        "CLOUD_COMMAND",
                },
            },
            {
                $set: {
                    status:
                        "FAILED",
                    failedAt:
                        now,
                    nextRetryAt:
                        null,
                    lastError:
                        errorMessage,
                },
            }
        );


        await SyncOutbox.updateMany(
            {
                eventId: {
                    $in:
                        eventIds,
                },
                status:
                    "PENDING",
                type:
                    "CLOUD_COMMAND",
            },
            {
                $set: {
                    status:
                        "FAILED",
                    failedAt:
                        now,
                    nextRetryAt:
                        null,
                    lastError:
                        errorMessage,
                    commandPayload:
                        null,
                },
            }
        );

    };


/*
============================================================
GET OUTBOX STATUS
============================================================
*/

const getOutboxStatus =
    async () => {

        const [
            pending,
            synced,
            failed,
            inventoryPending,
            inventorySynced,
            inventoryFailed,
            oldestPending,
        ] =
            await Promise.all([

                SyncOutbox.countDocuments({
                    status:
                        "PENDING",
                }),

                SyncOutbox.countDocuments({
                    status:
                        "SYNCED",
                }),

                SyncOutbox.countDocuments({
                    status:
                        "FAILED",
                }),

                SyncOutbox.countDocuments({
                    type:
                        "INVENTORY_CHANGE",
                    status:
                        "PENDING",
                }),

                SyncOutbox.countDocuments({
                    type:
                        "INVENTORY_CHANGE",
                    status:
                        "SYNCED",
                }),

                SyncOutbox.countDocuments({
                    type:
                        "INVENTORY_CHANGE",
                    status:
                        "FAILED",
                }),

                SyncOutbox
                    .findOne({
                        status:
                            "PENDING",
                    })
                    .sort({
                        createdAt:
                            1,
                    })
                    .select(
                        `
                            createdAt
                            attempts
                            nextRetryAt
                            lastError
                            type
                            source
                            action
                            aggregateId
                            branch
                        `
                    )
                    .lean(),

            ]);


        return {
            pending,
            synced,
            failed,
            inventory: {
                pending:
                    inventoryPending,
                synced:
                    inventorySynced,
                failed:
                    inventoryFailed,
            },
            oldestPending:
                oldestPending ||
                null,
        };

    };


/*
============================================================
CLEANUP SYNCED EVENTS
============================================================
*/

const cleanupSyncedEvents =
    async (
        olderThanDays = 30
    ) => {

        const days =
            Number(
                olderThanDays
            ) ||
            30;


        const cutoff =
            new Date(
                Date.now() -
                days *
                24 *
                60 *
                60 *
                1000
            );


        const result =
            await SyncOutbox.deleteMany({
                status:
                    "SYNCED",
                syncedAt: {
                    $lt:
                        cutoff,
                },
            });


        return {
            deleted:
                result.deletedCount ||
                0,
        };

    };


export default {
    enqueueSyncRequest,
    enqueueInventoryChange,
    enqueuePreparedCartFinalize,
    getReadyEvents,
    markAttempt,
    markSynced,
    markFailed,
    markTerminalFailed,
    getOutboxStatus,
    cleanupSyncedEvents,
};
