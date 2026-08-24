import cron from "node-cron";

import syncService from "../services/sync.service.js";

import {
    isCloudConnected,
} from "../config/cloudDatabase.js";


/*
============================================================
CLOUD SYNC JOB
============================================================

Schedule:

12:00 AM
6:00 AM
12:00 PM
6:00 PM

Every day.

The POS does NOT wait for this job.
============================================================
*/

const startCloudSyncJob = () => {

    

    cron.schedule(
        "0 */6 * * *",
        async () => {

            console.log(
                "☁️ Starting scheduled cloud sync..."
            );


            try {

                const result =
                    await syncService
                        .syncToCloud();


                console.log(
                    "☁️ Scheduled cloud sync completed."
                );


                console.log(
                    result
                );


            } catch (
                error
            ) {

                /*
                IMPORTANT:

                Never crash the POS because cloud sync failed.
                */

                console.error(
                    "☁️ Scheduled cloud sync failed:"
                );


                console.error(
                    error.message
                );

            }

        },
        {
            timezone:
                "Asia/Manila",
        }
    );


    console.log(
        "☁️ Cloud sync scheduler started."
    );


    console.log(
        "☁️ Automatic sync: every 6 hours."
    );

};


/*
============================================================
STARTUP SYNC
============================================================

Runs shortly after backend startup.

We delay it so:

1. Local MongoDB is already ready
2. Express can start
3. POS startup isn't held up by synchronization
============================================================
*/

const runStartupSync = () => {

    const STARTUP_DELAY =
        30 * 1000;


    setTimeout(
        async () => {

            console.log(
                "☁️ Running startup cloud sync..."
            );


            try {

                /*
                Cloud connection may currently be offline.

                syncToCloud() already knows how to attempt
                reconnection.
                */

                if (
                    !isCloudConnected()
                ) {

                    console.log(
                        "☁️ Cloud currently offline. Attempting reconnect..."
                    );

                }


                const result =
                    await syncService
                        .syncToCloud();


                console.log(
                    "☁️ Startup cloud sync completed."
                );


                console.log(
                    result
                );


            } catch (
                error
            ) {

                console.error(
                    "☁️ Startup cloud sync failed:"
                );


                console.error(
                    error.message
                );


                /*
                No process.exit() here.

                Local POS continues running.
                */

            }

        },
        STARTUP_DELAY
    );

};


/*
============================================================
EXPORT
============================================================
*/

export {
    startCloudSyncJob,
    runStartupSync,
};