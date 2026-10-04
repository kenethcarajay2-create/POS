import syncService
    from "../services/sync.service.js";


/*
============================================================
LIVE CLOUD SYNC CONFIG
============================================================

The local StorePOS database remains the operational source
of truth.

This worker only attempts to mirror local changes to the
cloud.

A cloud failure must NEVER stop the POS or affect checkout.
============================================================
*/

const LIVE_SYNC_INTERVAL_MS =
    10 * 1000;


const INITIAL_SYNC_DELAY_MS =
    15 * 1000;


/*
============================================================
STATE
============================================================
*/

let liveSyncTimer =
    null;


let initialSyncTimer =
    null;


let syncAttemptRunning =
    false;


let workerStarted =
    false;


/*
============================================================
RUN LIVE SYNC
============================================================

This wrapper prevents the live worker from launching its
own overlapping synchronization attempt.

sync.service.js also has its own protection, so we have two
layers of protection:

1. Worker-level lock
2. Sync-service-level lock
============================================================
*/

const runLiveSync = async () => {

    if (
        syncAttemptRunning
    ) {

        return;

    }


    syncAttemptRunning =
        true;


    try {

        const result =
            await syncService.syncToCloud();


        /*
        syncToCloud() may return success:false when another
        synchronization is already running.

        That is not considered an error.
        */

        if (
            result?.success ===
            false
        ) {

            if (
                result?.message
            ) {

                console.log(
                    `☁️ Live sync skipped: ${result.message}`
                );

            }


            return;

        }


        if (
            result?.success
        ) {

            console.log(
                "☁️ Live cloud sync completed."
            );

        }

    } catch (
        error
    ) {

        /*
        ====================================================
        IMPORTANT
        ====================================================

        Cloud synchronization failure is intentionally
        isolated from the local POS.

        Local checkout, inventory and other operations must
        continue even if:

        - internet is unavailable
        - Atlas is unavailable
        - DNS fails
        - the connection times out
        - the cloud database is temporarily unreachable

        Because sync.service.js does not advance lastSyncAt
        after failure, the local changes remain eligible for
        a later retry.
        ====================================================
        */

        console.warn(
            "☁️ Live cloud sync unavailable:",
            error?.message ||
            error
        );

    } finally {

        syncAttemptRunning =
            false;

    }

};


/*
============================================================
START LIVE CLOUD SYNC
============================================================
*/

const startLiveCloudSync = () => {

    /*
    Prevent accidental duplicate workers if this function
    is called more than once.
    */

    if (
        workerStarted
    ) {

        return;

    }


    workerStarted =
        true;


    console.log(
        `☁️ Live cloud sync worker enabled (${LIVE_SYNC_INTERVAL_MS / 1000}s interval).`
    );


    /*
    ========================================================
    INITIAL SYNC
    ========================================================

    Give the backend time to fully start before attempting
    the first cloud synchronization.

    This does NOT block server startup.
    ========================================================
    */

    initialSyncTimer =
        setTimeout(
            () => {

                runLiveSync();

            },
            INITIAL_SYNC_DELAY_MS
        );


    /*
    ========================================================
    CONTINUOUS LIVE SYNC
    ========================================================
    */

    liveSyncTimer =
        setInterval(
            () => {

                runLiveSync();

            },
            LIVE_SYNC_INTERVAL_MS
        );


    /*
    Do not force Node.js to stay alive only because of these
    timers.

    This is useful during graceful shutdown and development
    restarts.
    */

    if (
        typeof liveSyncTimer.unref ===
        "function"
    ) {

        liveSyncTimer.unref();

    }


    if (
        typeof initialSyncTimer.unref ===
        "function"
    ) {

        initialSyncTimer.unref();

    }

};


/*
============================================================
STOP LIVE CLOUD SYNC
============================================================
*/

const stopLiveCloudSync = () => {

    if (
        initialSyncTimer
    ) {

        clearTimeout(
            initialSyncTimer
        );


        initialSyncTimer =
            null;

    }


    if (
        liveSyncTimer
    ) {

        clearInterval(
            liveSyncTimer
        );


        liveSyncTimer =
            null;

    }


    workerStarted =
        false;


    console.log(
        "☁️ Live cloud sync worker stopped."
    );

};


/*
============================================================
EXPORT
============================================================
*/

export {

    runLiveSync,

    startLiveCloudSync,

    stopLiveCloudSync,
};