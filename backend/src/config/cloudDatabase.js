import mongoose from "mongoose";
import dns from "node:dns";


/*
============================================================
CLOUD DATABASE CONNECTION
============================================================
*/

let cloudConnection = null;


/*
============================================================
DNS CONFIGURATION
============================================================

Node's SRV resolver can sometimes fail even when Windows
Resolve-DnsName works correctly.

MongoDB Atlas uses SRV records:

_mongodb._tcp....

So we explicitly give Node reliable DNS servers.
============================================================
*/

try {

    dns.setServers([
        "1.1.1.1",
        "8.8.8.8",
    ]);


    console.log(
        "🌐 Node DNS servers configured for Atlas."
    );

} catch (error) {

    console.warn(
        "🌐 Could not configure custom DNS servers:",
        error.message
    );

}


/*
============================================================
CONNECT CLOUD DATABASE
============================================================
*/

const connectCloudDatabase = async () => {

    /*
    --------------------------------------------------------
    CHECK ENV
    --------------------------------------------------------
    */

    if (
        !process.env.MONGO_CLOUD_URI
    ) {

        console.log(
            "☁️ Cloud MongoDB not configured."
        );


        return null;

    }


    /*
    --------------------------------------------------------
    ALREADY CONNECTED
    --------------------------------------------------------
    */

    if (
        cloudConnection &&
        cloudConnection.readyState === 1
    ) {

        return cloudConnection;

    }


    /*
    --------------------------------------------------------
    CLEAN OLD CONNECTION
    --------------------------------------------------------
    */

    if (
        cloudConnection
    ) {

        try {

            await cloudConnection.close();

        } catch {

            // Ignore old connection cleanup errors.

        }


        cloudConnection =
            null;

    }


    try {

        console.log(
            "☁️ Connecting to Cloud MongoDB..."
        );


        /*
        ====================================================
        CREATE SEPARATE MONGOOSE CONNECTION
        ====================================================
        */

        cloudConnection =
            mongoose.createConnection(
                process.env.MONGO_CLOUD_URI,
                {

                    /*
                    Fail reasonably quickly if Atlas cannot
                    be contacted.
                    */

                    serverSelectionTimeoutMS:
                        15000,

                    connectTimeoutMS:
                        15000,

                    socketTimeoutMS:
                        45000,

                }
            );


        /*
        ====================================================
        WAIT FOR CONNECTION
        ====================================================
        */

        await cloudConnection
            .asPromise();


        console.log(
            "☁️ Cloud MongoDB Connected."
        );


        console.log(
            `☁️ Cloud Host: ${
                cloudConnection.host ||
                "Atlas"
            }`
        );


        console.log(
            `☁️ Cloud Database: ${
                cloudConnection.name ||
                "storepos_cloud"
            }`
        );


        /*
        ====================================================
        CONNECTION EVENTS
        ====================================================
        */

        cloudConnection.on(
            "disconnected",
            () => {

                console.warn(
                    "☁️ Cloud MongoDB disconnected."
                );

            }
        );


        cloudConnection.on(
            "reconnected",
            () => {

                console.log(
                    "☁️ Cloud MongoDB reconnected."
                );

            }
        );


        cloudConnection.on(
            "error",
            (error) => {

                console.error(
                    "☁️ Cloud MongoDB runtime error:",
                    error.message
                );

            }
        );


        return cloudConnection;


    } catch (
        error
    ) {

        /*
        ====================================================
        IMPORTANT

        Cloud failure NEVER shuts down StorePOS.
        ====================================================
        */

        console.error(
            "☁️ Cloud MongoDB connection failed."
        );


        console.error(
            "Name:",
            error.name
        );


        console.error(
            "Message:",
            error.message
        );


        console.error(
            "Code:",
            error.code
        );


        /*
        Do NOT log MONGO_CLOUD_URI.
        It contains credentials.
        */


        if (
            cloudConnection
        ) {

            try {

                await cloudConnection.close();

            } catch {

                // Ignore cleanup error.

            }

        }


        cloudConnection =
            null;


        return null;

    }

};


/*
============================================================
GET CLOUD CONNECTION
============================================================
*/

const getCloudConnection = () => {

    if (
        !cloudConnection
    ) {

        return null;

    }


    /*
    Mongoose connection states:

    0 = disconnected
    1 = connected
    2 = connecting
    3 = disconnecting
    */

    if (
        cloudConnection.readyState !==
        1
    ) {

        return null;

    }


    return cloudConnection;

};


/*
============================================================
IS CLOUD CONNECTED
============================================================
*/

const isCloudConnected = () => {

    return Boolean(

        cloudConnection &&

        cloudConnection.readyState ===
            1

    );

};


/*
============================================================
EXPORT
============================================================
*/

export {

    connectCloudDatabase,

    getCloudConnection,

    isCloudConnected,

};