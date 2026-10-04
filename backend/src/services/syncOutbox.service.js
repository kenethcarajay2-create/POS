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
            value ===
                null ||
            value ===
                undefined ||
            value ===
                ""
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

Existing generic local -> cloud synchronization event.

Normal synchronization requests intentionally have:

commandPayload: null

They do not contain capability credentials.
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

            /*
            Normal synchronization requests do not have a
            command payload.

            IMPORTANT:

            markSynced() must therefore never attempt to create
            commandPayload.claimToken on these events.
            */

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
ENQUEUE PREPARED CART FINALIZE COMMAND
============================================================

This MUST be inserted in the SAME local MongoDB transaction
that creates the Sale.

That provides the guarantee:

Sale committed locally
    ⇔
PreparedCart finalize command committed locally

A checkout never depends on Atlas availability.
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

IMPORTANT:

There are two kinds of outbox events:

SYNC_REQUEST
    commandPayload is null.

CLOUD_COMMAND
    commandPayload may contain sensitive capability
    credentials such as PreparedCart claimToken.

We MUST NOT execute:

"commandPayload.claimToken": null

against a document where commandPayload itself is null.

MongoDB correctly rejects that operation with:

Cannot create field 'claimToken' in element
{ commandPayload: null }

Therefore normal synchronization events and cloud commands
are acknowledged separately.

For CLOUD_COMMAND events the entire commandPayload is cleared
after successful acknowledgement.

Clearing the complete payload is safer than retaining the
other command parameters because the command has already
completed and no retry is required.
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


        /*
        --------------------------------------------------------
        NORMAL SYNC REQUESTS
        --------------------------------------------------------

        Do NOT touch commandPayload.
        --------------------------------------------------------
        */

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


        /*
        --------------------------------------------------------
        CLOUD COMMANDS
        --------------------------------------------------------

        Destroy the complete command payload after successful
        acknowledgement.

        This guarantees claimToken is no longer retained while
        avoiding unsafe nested writes against null payloads.
        --------------------------------------------------------
        */

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

Used only when retrying cannot ever safely succeed.

Examples:

- PreparedCart consumed by another sale
- PreparedCart cancelled
- claim ownership no longer matches

The event remains in the database for diagnosis.

As with markSynced(), normal events and cloud commands are
handled separately so we never attempt to create nested
fields under commandPayload: null.
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


        /*
        --------------------------------------------------------
        NON-CLOUD-COMMAND EVENTS
        --------------------------------------------------------
        */

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


        /*
        --------------------------------------------------------
        CLOUD COMMAND EVENTS
        --------------------------------------------------------

        Destroy capability credentials because the command is
        permanently failed and must never be retried.
        --------------------------------------------------------
        */

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
                        `
                    )
                    .lean(),

            ]);


        return {

            pending,

            synced,

            failed,

            oldestPending:
                oldestPending ||
                null,

        };

    };


/*
============================================================
CLEANUP SYNCED EVENTS
============================================================

Only successful old events are deleted.

PENDING and FAILED events are preserved.
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


/*
============================================================
EXPORT
============================================================
*/

export default {

    enqueueSyncRequest,

    enqueuePreparedCartFinalize,

    getReadyEvents,

    markAttempt,

    markSynced,

    markFailed,

    markTerminalFailed,

    getOutboxStatus,

    cleanupSyncedEvents,

};