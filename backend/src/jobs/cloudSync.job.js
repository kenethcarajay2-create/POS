import cron
    from "node-cron";

import syncService
    from "../services/sync.service.js";


/*
============================================================
CLOUD RECONCILIATION JOB
============================================================

The live cloud sync worker handles near-real-time syncing.

This 6-hour cron job remains as a slower safety /
reconciliation mechanism.

It helps recover from situations such as:

- prolonged internet outages
- temporary Atlas outages
- DNS failures
- a missed live-sync attempt
- backend restarts
- temporary cloud connection errors

IMPORTANT:

This job does NOT replace the live worker.

It also does NOT block normal POS operations.
============================================================
*/


/*
============================================================
SCHEDULE
============================================================

Runs every 6 hours:

12:00 AM
6:00 AM
12:00 PM
6:00 PM

Timezone:
Asia/Manila
============================================================
*/

const CLOUD_SYNC_CRON =
    "0 */6 * * *";


const CLOUD_SYNC_TIMEZONE =
    "Asia/Manila";


/*
============================================================
STATE
============================================================
*/

let cloudSyncTask =
    null;


let jobStarted =
    false;


/*
============================================================
RUN RECONCILIATION SYNC
============================================================
*/

const runCloudReconciliationSync =
    async () => {

        try {

            console.log(
                "☁️ Starting scheduled cloud reconciliation sync..."
            );


            const result =
                await syncService.syncToCloud();


            /*
            Another sync may already be running.

            That is expected because the live worker may
            happen to run at nearly the same time.
            */

            if (
                result?.success ===
                false
            ) {

                console.log(
                    `☁️ Scheduled sync skipped: ${
                        result?.message ||
                        "another sync is already running"
                    }`
                );


                return;

            }


            console.log(
                "☁️ Scheduled cloud reconciliation sync completed."
            );

        } catch (
            error
        ) {

            /*
            ====================================================
            IMPORTANT
            ====================================================

            Scheduled cloud sync failure must never crash or
            stop StorePOS.

            Local MongoDB remains authoritative.

            Because sync.service.js does not advance
            lastSyncAt after a failed sync, the same unsynced
            local changes remain eligible for the next retry.
            ====================================================
            */

            console.warn(
                "☁️ Scheduled cloud reconciliation unavailable:",
                error?.message ||
                error
            );

        }

    };


/*
============================================================
START CLOUD SYNC JOB
============================================================
*/

const startCloudSyncJob =
    () => {

        /*
        Prevent duplicate cron registration.
        */

        if (
            jobStarted
        ) {

            return;

        }


        jobStarted =
            true;


        cloudSyncTask =
            cron.schedule(
                CLOUD_SYNC_CRON,

                () => {

                    runCloudReconciliationSync();

                },

                {
                    timezone:
                        CLOUD_SYNC_TIMEZONE,
                }
            );


        console.log(
            "☁️ Cloud reconciliation job enabled (every 6 hours, Asia/Manila)."
        );

    };


/*
============================================================
STOP CLOUD SYNC JOB
============================================================
*/

const stopCloudSyncJob =
    () => {

        if (
            cloudSyncTask
        ) {

            cloudSyncTask.stop();


            cloudSyncTask =
                null;

        }


        jobStarted =
            false;


        console.log(
            "☁️ Cloud reconciliation job stopped."
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export {

    runCloudReconciliationSync,

    startCloudSyncJob,

    stopCloudSyncJob,
};