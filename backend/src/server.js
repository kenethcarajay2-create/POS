import dotenv
    from "dotenv";


/*
============================================================
ENVIRONMENT
============================================================
*/

dotenv.config();


/*
============================================================
IMPORTS
============================================================
*/

import app
    from "./app.js";


import connectDB
    from "./config/database.js";


import {
    startCloudSyncJob,
    stopCloudSyncJob,
}
from "./jobs/cloudSync.job.js";


import {
    startSyncOutboxWorker,
    stopSyncOutboxWorker,
}
from "./jobs/syncOutbox.job.js";


/*
============================================================
CONFIG
============================================================
*/

const PORT =
    process.env.PORT ||
    5000;


/*
============================================================
SERVER INSTANCE
============================================================
*/

let server =
    null;


/*
============================================================
START SERVER
============================================================
*/

const startServer =
    async () => {

        try {

            /*
            ====================================================
            LOCAL DATABASE
            ====================================================

            StorePOS always depends on the LOCAL MongoDB first.

            Cloud availability is intentionally NOT required
            for application startup.
            ====================================================
            */

            await connectDB();


            /*
            ====================================================
            HTTP SERVER
            ====================================================
            */

            server =
                app.listen(
                    PORT,

                    () => {

                        console.log(
                            `🚀 Server running on http://localhost:${PORT}`
                        );


                        /*
                        ========================================
                        PERSISTENT OUTBOX WORKER
                        ========================================

                        This is now the PRIMARY near-real-time
                        cloud synchronization mechanism.

                        Business writes first commit locally
                        together with a durable SyncOutbox event.

                        The worker then attempts cloud sync.

                        If the cloud is offline:

                        - the POS continues operating
                        - the event remains PENDING
                        - retries happen automatically
                        - pending work survives server restarts
                        ========================================
                        */

                        startSyncOutboxWorker();


                        /*
                        ========================================
                        6-HOUR RECONCILIATION
                        ========================================

                        This remains as a long-term safety net.

                        It is NOT the normal near-real-time
                        synchronization mechanism.

                        Its purpose is to reconcile anything
                        that may have been missed because of:

                        - unexpected legacy writes
                        - recovery situations
                        - manual maintenance
                        - future implementation mistakes
                        ========================================
                        */

                        startCloudSyncJob();

                    }
                );

        } catch (
            error
        ) {

            console.error(
                "❌ StorePOS server startup failed:",
                error
            );


            process.exit(
                1
            );

        }

    };


/*
============================================================
GRACEFUL SHUTDOWN
============================================================
*/

const shutdown =
    (
        signal
    ) => {

        console.log(
            `\n🛑 ${signal} received. Shutting down StorePOS...`
        );


        /*
        ========================================================
        STOP BACKGROUND WORKERS
        ========================================================
        */

        stopSyncOutboxWorker();


        stopCloudSyncJob();


        /*
        ========================================================
        STOP HTTP SERVER
        ========================================================
        */

        if (
            !server
        ) {

            process.exit(
                0
            );


            return;

        }


        server.close(
            () => {

                console.log(
                    "🛑 HTTP server stopped."
                );


                process.exit(
                    0
                );

            }
        );


        /*
        ========================================================
        FORCED SHUTDOWN SAFETY
        ========================================================

        Prevent the process from hanging forever if an open
        socket or background operation does not close normally.
        ========================================================
        */

        setTimeout(
            () => {

                console.error(
                    "⚠️ Forced shutdown after timeout."
                );


                process.exit(
                    1
                );

            },
            10 * 1000
        ).unref();

    };


/*
============================================================
PROCESS EVENTS
============================================================
*/

process.on(
    "SIGINT",

    () =>
        shutdown(
            "SIGINT"
        )
);


process.on(
    "SIGTERM",

    () =>
        shutdown(
            "SIGTERM"
        )
);


/*
============================================================
START
============================================================
*/

startServer();