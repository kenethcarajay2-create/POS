import mongoose from "mongoose";


/*
============================================================
PRICING DATABASE CONNECTION
============================================================

This is a dedicated READ connection to the MongoDB database
used by the online Product Pricing application.

Environment variable:

MONGO_PRICING_URI=mongodb+srv://.../<pricing-database>

IMPORTANT:

- Never expose this URI to the React frontend.
- StorePOS reads from `pricedproducts` only.
- StorePOS never writes to the Product Pricing database.
============================================================
*/

let pricingConnection =
    null;

let pricingConnectionPromise =
    null;


/*
============================================================
CONNECT
============================================================
*/

const connectPricingDatabase =
    async () => {

        if (
            pricingConnection?.readyState ===
            1
        ) {

            return pricingConnection;

        }


        if (
            pricingConnectionPromise
        ) {

            return pricingConnectionPromise;

        }


        const uri =
            String(
                process.env
                    .MONGO_PRICING_URI ||
                ""
            ).trim();


        if (
            !uri
        ) {

            throw new Error(
                "MONGO_PRICING_URI is not configured."
            );

        }


        pricingConnection =
            mongoose.createConnection(
                uri,
                {
                    serverSelectionTimeoutMS:
                        10000,

                    connectTimeoutMS:
                        10000,

                    socketTimeoutMS:
                        20000,

                    maxPoolSize:
                        5,

                    minPoolSize:
                        0,
                }
            );


        pricingConnectionPromise =
            pricingConnection
                .asPromise()
                .then(
                    () => {

                        console.log(
                            `🏷️ Pricing database connected: ${pricingConnection.name}`
                        );


                        return pricingConnection;

                    }
                )
                .catch(
                    (
                        error
                    ) => {

                        pricingConnection =
                            null;

                        pricingConnectionPromise =
                            null;


                        throw error;

                    }
                );


        return pricingConnectionPromise;

    };


/*
============================================================
GET CONNECTION
============================================================
*/

const getPricingConnection =
    () => {

        return pricingConnection;

    };


/*
============================================================
IS CONNECTED
============================================================
*/

const isPricingConnected =
    () => {

        return (
            pricingConnection?.readyState ===
            1
        );

    };


/*
============================================================
IS CONFIGURED
============================================================
*/

const isPricingConfigured =
    () => {

        return Boolean(
            String(
                process.env
                    .MONGO_PRICING_URI ||
                ""
            ).trim()
        );

    };


export {
    connectPricingDatabase,
    getPricingConnection,
    isPricingConnected,
    isPricingConfigured,
};
