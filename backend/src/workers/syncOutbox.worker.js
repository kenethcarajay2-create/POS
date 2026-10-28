import syncService
    from "../services/sync.service.js";

import syncOutboxService
    from "../services/syncOutbox.service.js";

import cloudInventorySyncService
    from "../services/cloudInventorySync.service.js";

import preparedCartBridgeService
    from "../services/preparedCartBridge.service.js";


/*
============================================================
OUTBOX WORKER CONFIG
============================================================

Two seconds gives near-real-time cross-computer inventory
updates while still remaining simple and resilient.
============================================================
*/

const OUTBOX_POLL_INTERVAL_MS =
    2 * 1000;

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
PROCESS INVENTORY CHANGE
============================================================

Each inventory event is published independently.

Atlas uses eventId as a unique key, therefore retrying the
same event cannot apply/create it twice.
============================================================
*/

const processInventoryChange =
    async (
        event
    ) => {

        try {

            await cloudInventorySyncService
                .publishInventoryChange(
                    event
                );


            await syncOutboxService
                .markSynced(
                    [
                        event.eventId,
                    ]
                );


            console.log(
                `☁️ Inventory event published: ${event.eventId}`
            );

        } catch (
            error
        ) {

            await syncOutboxService
                .markFailed(
                    [
                        event,
                    ],
                    error
                );


            console.warn(
                "☁️ Inventory event deferred:",
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
PULL REMOTE INVENTORY CHANGES
============================================================

This is the missing cloud -> local direction.

It runs even when this computer has no local outbox events.
============================================================
*/

const pullRemoteInventoryChanges =
    async () => {

        try {

            const result =
                await cloudInventorySyncService
                    .pullIncomingInventoryChanges({
                        limit:
                            OUTBOX_BATCH_SIZE,
                    });


            if (
                result?.applied >
                0
            ) {

                console.log(
                    `☁️ Applied ${result.applied} remote inventory change(s).`
                );

            }

        } catch (
            error
        ) {

            /*
            Cloud-to-local failure must never stop StorePOS.
            The cursor remains before the failed event, so it
            will be retried automatically.
            */

            console.warn(
                "☁️ Remote inventory pull unavailable:",
                error?.message ||
                error
            );

        }

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
                readyEvents.length >
                0
            ) {

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


                const syncRequests =
                    readyEvents.filter(
                        (
                            event
                        ) =>
                            event.type ===
                            "SYNC_REQUEST"
                    );


                const inventoryChanges =
                    readyEvents.filter(
                        (
                            event
                        ) =>
                            event.type ===
                            "INVENTORY_CHANGE"
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
                                "INVENTORY_CHANGE" &&
                            event.type !==
                                "CLOUD_COMMAND"
                    );


                /*
                Mirror normal StorePOS collections first.
                */

                await processSyncRequests(
                    syncRequests
                );


                /*
                Publish durable stock deltas.
                */

                for (
                    const event
                    of inventoryChanges
                ) {

                    await processInventoryChange(
                        event
                    );

                }


                /*
                Execute specific cloud commands.
                */

                for (
                    const event
                    of cloudCommands
                ) {

                    await processCloudCommand(
                        event
                    );

                }


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

            }


            /*
            ALWAYS pull remote events, even when the local
            outbox was empty.
            */

            await pullRemoteInventoryChanges();

        } catch (
            error
        ) {

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


        console.log(
            `☁️ StorePOS sync node: ${cloudInventorySyncService.getNodeId()}`
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


export {
    processSyncOutbox,
    startSyncOutboxWorker,
    stopSyncOutboxWorker,
};
