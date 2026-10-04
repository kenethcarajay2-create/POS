import syncService
    from "../services/sync.service.js";

import syncOutboxService
    from "../services/syncOutbox.service.js";

import preparedCartBridgeService
    from "../services/preparedCartBridge.service.js";


/*
============================================================
OUTBOX WORKER CONFIG
============================================================
*/

const OUTBOX_POLL_INTERVAL_MS =
    5 * 1000;


const OUTBOX_BATCH_SIZE =
    100;


/*
============================================================
WORKER STATE
============================================================
*/

let workerTimer =
    null;


let workerStarted =
    false;


let workerRunning =
    false;


/*
============================================================
PROCESS NORMAL SYNC REQUESTS
============================================================
*/

const processSyncRequests =
    async (
        events
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


        const eventIds =
            events.map(
                (
                    event
                ) =>
                    event.eventId
            );


        try {

            const result =
                await syncService
                    .syncToCloud();


            /*
            Another cloud synchronization is already running.

            Keep these events PENDING.
            */

            if (
                result?.success ===
                false
            ) {

                console.log(
                    `☁️ Outbox sync deferred: ${
                        result?.message ||
                        "cloud synchronization currently busy"
                    }`
                );


                return;

            }


            await syncOutboxService
                .markSynced(
                    eventIds
                );


            console.log(
                `☁️ Outbox collection sync completed: ${eventIds.length} event(s) acknowledged.`
            );


        } catch (
            error
        ) {

            await syncOutboxService
                .markFailed(
                    events,
                    error
                );


            console.warn(
                "☁️ Outbox collection sync unavailable:",
                error?.message ||
                error
            );

        }

    };


/*
============================================================
PROCESS PREPARED CART FINALIZE
============================================================
*/

const processPreparedCartFinalize =
    async (
        event
    ) => {

        const payload =
            event?.commandPayload ||
            {};


        try {

            await preparedCartBridgeService
                .finalizePreparedCart({

                    preparedCartId:
                        payload.preparedCartId ||
                        event.aggregateId,

                    saleId:
                        payload.saleId,

                    claimToken:
                        payload.claimToken,

                    userId:
                        payload.userId,

                    branchId:
                        event.branch,

                });


            await syncOutboxService
                .markSynced(
                    [
                        event.eventId,
                    ]
                );


            console.log(
                `☁️ PreparedCart finalized: ${String(
                    payload.preparedCartId ||
                    event.aggregateId
                )}`
            );


        } catch (
            error
        ) {

            /*
            ====================================================
            PERMANENT SEMANTIC CONFLICT
            ====================================================

            Do not retry forever.

            Preserve the FAILED event locally for investigation.
            ====================================================
            */

            if (
                error?.retryable ===
                false
            ) {

                await syncOutboxService
                    .markTerminalFailed(
                        [
                            event.eventId,
                        ],
                        error
                    );


                console.error(
                    "☁️ PreparedCart finalization permanently failed:",
                    error?.message ||
                    error
                );


                return;

            }


            /*
            ====================================================
            TRANSIENT FAILURE
            ====================================================

            Atlas offline, DNS problem, timeout, etc.

            Keep PENDING and retry with exponential backoff.
            ====================================================
            */

            await syncOutboxService
                .markFailed(
                    [
                        event,
                    ],
                    error
                );


            console.warn(
                "☁️ PreparedCart finalization deferred:",
                error?.message ||
                error
            );

        }

    };


/*
============================================================
PROCESS CLOUD COMMAND
============================================================
*/

const processCloudCommand =
    async (
        event
    ) => {

        const source =
            String(
                event?.source ||
                ""
            )
                .trim()
                .toUpperCase();


        const action =
            String(
                event?.action ||
                ""
            )
                .trim()
                .toUpperCase();


        if (
            source ===
                "PREPARED_CART" &&
            action ===
                "FINALIZE"
        ) {

            await processPreparedCartFinalize(
                event
            );


            return;

        }


        const error =
            new Error(
                `Unsupported cloud command: ${source}/${action}`
            );


        error.retryable =
            false;


        await syncOutboxService
            .markTerminalFailed(
                [
                    event.eventId,
                ],
                error
            );


        console.error(
            `☁️ ${error.message}`
        );

    };


/*
============================================================
PROCESS OUTBOX
============================================================
*/

const processSyncOutbox =
    async () => {

        if (
            workerRunning
        ) {

            return;

        }


        workerRunning =
            true;


        const processingBoundary =
            new Date();


        try {

            const readyEvents =
                await syncOutboxService
                    .getReadyEvents({

                        createdBefore:
                            processingBoundary,

                        limit:
                            OUTBOX_BATCH_SIZE,

                    });


            if (
                readyEvents.length ===
                0
            ) {

                return;

            }


            /*
            ====================================================
            MARK THIS BATCH ATTEMPTED
            ====================================================
            */

            const eventIds =
                readyEvents.map(
                    (
                        event
                    ) =>
                        event.eventId
                );


            await syncOutboxService
                .markAttempt(
                    eventIds
                );


            /*
            ====================================================
            SPLIT EVENT TYPES
            ====================================================
            */

            const syncRequests =
                readyEvents.filter(
                    (
                        event
                    ) =>
                        event.type ===
                        "SYNC_REQUEST"
                );


            const cloudCommands =
                readyEvents.filter(
                    (
                        event
                    ) =>
                        event.type ===
                        "CLOUD_COMMAND"
                );


            const unknownEvents =
                readyEvents.filter(
                    (
                        event
                    ) =>
                        event.type !==
                            "SYNC_REQUEST" &&
                        event.type !==
                            "CLOUD_COMMAND"
                );


            /*
            ====================================================
            FIRST: MIRROR LOCAL DATA

            This means the Sale normally reaches Atlas before
            PreparedCart is marked CONSUMED.
            ====================================================
            */

            await processSyncRequests(
                syncRequests
            );


            /*
            ====================================================
            SECOND: SPECIFIC CLOUD COMMANDS
            ====================================================
            */

            for (
                const event
                of cloudCommands
            ) {

                await processCloudCommand(
                    event
                );

            }


            /*
            ====================================================
            UNKNOWN TYPE
            ====================================================
            */

            for (
                const event
                of unknownEvents
            ) {

                const error =
                    new Error(
                        `Unsupported outbox event type: ${event.type}`
                    );


                error.retryable =
                    false;


                await syncOutboxService
                    .markTerminalFailed(
                        [
                            event.eventId,
                        ],
                        error
                    );

            }


        } catch (
            error
        ) {

            /*
            A worker-level failure means we could not safely
            determine individual event completion.

            Individual processing functions already handle
            their own retry state where possible.
            */

            console.error(
                "☁️ Persistent outbox worker error:",
                error
            );


        } finally {

            workerRunning =
                false;

        }

    };


/*
============================================================
START OUTBOX WORKER
============================================================
*/

const startSyncOutboxWorker =
    () => {

        if (
            workerStarted
        ) {

            return;

        }


        workerStarted =
            true;


        console.log(
            `☁️ Persistent sync outbox worker enabled (${OUTBOX_POLL_INTERVAL_MS / 1000}s interval).`
        );


        const startupTimer =
            setTimeout(
                () => {

                    processSyncOutbox();

                },
                2000
            );


        if (
            typeof startupTimer.unref ===
            "function"
        ) {

            startupTimer.unref();

        }


        workerTimer =
            setInterval(
                () => {

                    processSyncOutbox();

                },
                OUTBOX_POLL_INTERVAL_MS
            );


        if (
            typeof workerTimer.unref ===
            "function"
        ) {

            workerTimer.unref();

        }

    };


/*
============================================================
STOP OUTBOX WORKER
============================================================
*/

const stopSyncOutboxWorker =
    () => {

        if (
            workerTimer
        ) {

            clearInterval(
                workerTimer
            );


            workerTimer =
                null;

        }


        workerStarted =
            false;


        console.log(
            "☁️ Persistent sync outbox worker stopped."
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export {

    processSyncOutbox,

    startSyncOutboxWorker,

    stopSyncOutboxWorker,

};