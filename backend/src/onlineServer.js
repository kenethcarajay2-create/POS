import "dotenv/config";

import onlineApp
    from "./onlineApp.js";

import {
    connectCloudDatabase,
    getCloudConnection,
}
from "./config/cloudDatabase.js";


/*
============================================================
CONFIG
============================================================
*/

const PORT =
    Number(
        process.env
            .ONLINE_PORT ||
        process.env.PORT ||
        5001
    );


let server =
    null;


let shuttingDown =
    false;


/*
============================================================
START ONLINE SERVER
============================================================
*/

const startOnlineServer =
    async () => {

        try {

            console.log(
                "🌐 Starting StorePOS Online API..."
            );


            /*
            ====================================================
            VERIFY REQUIRED JWT CONFIG
            ====================================================
            */

            if (
                !String(
                    process.env
                        .ONLINE_JWT_SECRET ||
                    ""
                ).trim()
            ) {

                throw new Error(
                    "ONLINE_JWT_SECRET is required."
                );

            }


            /*
            ====================================================
            CONNECT ATLAS
            ====================================================

            Unlike the desktop POS:

            Online API
            → Atlas is mandatory.

            Local POS
            → Atlas remains optional.
            ====================================================
            */

            const cloudConnection =
                await connectCloudDatabase();


            if (
                !cloudConnection
            ) {

                throw new Error(
                    "StorePOS Online API could not connect to Cloud MongoDB."
                );

            }


            /*
            ====================================================
            LISTEN
            ====================================================
            */

            server =
                onlineApp.listen(
                    PORT,
                    () => {

                        console.log(
                            `🌐 StorePOS Online API listening on port ${PORT}.`
                        );


                        console.log(
                            "☁️ StorePOS Online API is using Cloud MongoDB."
                        );

                    }
                );


        } catch (
            error
        ) {

            console.error(
                "❌ StorePOS Online API failed to start:"
            );


            console.error(
                error.message
            );


            /*
            This exits ONLY the dedicated online process.

            It does not affect the separate local StorePOS
            server process.
            */

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
    async (
        signal
    ) => {

        if (
            shuttingDown
        ) {

            return;

        }


        shuttingDown =
            true;


        console.log(
            `🌐 ${signal} received. Stopping StorePOS Online API...`
        );


        const forceExitTimer =
            setTimeout(
                () => {

                    console.error(
                        "❌ Forced StorePOS Online API shutdown."
                    );


                    process.exit(
                        1
                    );

                },
                10000
            );


        forceExitTimer.unref();


        try {

            /*
            ====================================================
            STOP HTTP SERVER
            ====================================================
            */

            if (
                server
            ) {

                await new Promise(
                    (
                        resolve
                    ) => {

                        server.close(
                            resolve
                        );

                    }
                );

            }


            /*
            ====================================================
            CLOSE CLOUD CONNECTION
            ====================================================
            */

            const cloudConnection =
                getCloudConnection();


            if (
                cloudConnection
            ) {

                try {

                    await cloudConnection
                        .close();

                } catch (
                    error
                ) {

                    console.warn(
                        "☁️ Error while closing Cloud MongoDB:",
                        error.message
                    );

                }

            }


            clearTimeout(
                forceExitTimer
            );


            console.log(
                "🌐 StorePOS Online API stopped."
            );


            process.exit(
                0
            );


        } catch (
            error
        ) {

            console.error(
                "❌ StorePOS Online API shutdown error:",
                error.message
            );


            process.exit(
                1
            );

        }

    };


/*
============================================================
SIGNALS
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

startOnlineServer();