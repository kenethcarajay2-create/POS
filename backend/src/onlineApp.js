import express from "express";

import cors from "cors";

import ApiResponse
    from "./utils/ApiResponse.js";

import errorHandler
    from "./middleware/error.middleware.js";

import onlineAuthRoutes
    from "./routes/onlineAuth.routes.js";

import mobileProductRoutes
    from "./routes/mobileProduct.routes.js";


/*
============================================================
ONLINE APP
============================================================

This application is intentionally separate from app.js.

Only deliberately approved internet-facing routes belong
here.

DO NOT automatically mount the normal local POS routes.
============================================================
*/

const app =
    express();


/*
============================================================
TRUST PROXY
============================================================
*/

app.set(
    "trust proxy",
    1
);


/*
============================================================
CORS
============================================================
*/

const configuredOrigins =
    String(
        process.env
            .ONLINE_ALLOWED_ORIGINS ||
        ""
    )
        .split(
            ","
        )
        .map(
            (
                value
            ) =>
                value.trim()
        )
        .filter(
            Boolean
        );


const developmentOrigins =
    [

        "http://localhost:5173",

        "http://127.0.0.1:5173",

        "http://localhost:4173",

        "http://127.0.0.1:4173",

    ];


const allowedOrigins =
    new Set([

        ...configuredOrigins,

        ...(
            process.env.NODE_ENV ===
            "production"
                ? []
                : developmentOrigins
        ),

    ]);


app.use(
    cors({

        origin:
            (
                origin,
                callback
            ) => {

                /*
                Server-to-server clients normally do not send
                an Origin header.

                Authentication still protects secured routes.
                */

                if (
                    !origin
                ) {

                    return callback(
                        null,
                        true
                    );

                }


                if (
                    allowedOrigins.has(
                        origin
                    )
                ) {

                    return callback(
                        null,
                        true
                    );

                }


                const error =
                    new Error(
                        "Origin is not allowed by StorePOS."
                    );


                error.statusCode =
                    403;


                return callback(
                    error
                );

            },

        credentials:
            false,

    })
);


/*
============================================================
JSON
============================================================
*/

app.use(
    express.json({

        limit:
            "256kb",

    })
);


/*
============================================================
HEALTH
============================================================
*/

app.get(
    "/api/online/health",
    (
        req,
        res
    ) => {

        res
            .status(
                200
            )
            .json(
                new ApiResponse(
                    true,
                    "StorePOS Online API is running"
                )
            );

    }
);


/*
============================================================
AUTH
============================================================
*/

app.use(
    "/api/online/auth",
    onlineAuthRoutes
);


/*
============================================================
MOBILE PRODUCT CATALOG
============================================================
*/

app.use(
    "/api/online/products",
    mobileProductRoutes
);


/*
============================================================
FUTURE ONLINE ROUTES
============================================================

Next:

/api/online/prepared-carts

Do NOT automatically expose:

/api/users
/api/inventory
/api/sales
/api/ledger
/api/sync
/api/printer
============================================================
*/


/*
============================================================
404
============================================================
*/

app.use(
    (
        req,
        res
    ) => {

        res
            .status(
                404
            )
            .json({

                success:
                    false,

                message:
                    "Online API endpoint not found.",

                data:
                    null,

            });

    }
);


/*
============================================================
ERROR HANDLER
============================================================
*/

app.use(
    errorHandler
);


export default app;