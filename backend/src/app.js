import express from "express";

import cors from "cors";

import path from "path";


import ApiResponse from "./utils/ApiResponse.js";

import errorHandler from "./middleware/error.middleware.js";

import protect from "./middleware/auth.middleware.js";


import authRoutes from "./routes/auth.routes.js";

import userRoutes from "./routes/user.routes.js";

import productRoutes from "./routes/product.routes.js";

import inventoryRoutes from "./routes/inventory.routes.js";

import saleRoutes from "./routes/sale.routes.js";

import dashboardRoutes from "./routes/dashboard.route.js";

import printerRoutes from "./routes/printer.routes.js";

import ledgerRoutes from "./routes/ledger.routes.js";

import syncRoutes from "./routes/sync.routes.js";

import customerRoutes from "./routes/customer.routes.js";

import branchRoutes from "./routes/branch.routes.js";

import preparedCartBridgeRoutes
    from "./routes/preparedCartBridge.routes.js";

import stockTransferRoutes
    from "./routes/stockTransfer.routes.js";

import bulkOrderRoutes
    from "./routes/bulkOrder.routes.js";


/*
============================================================
APP
============================================================
*/

const app =
    express();


/*
============================================================
GLOBAL MIDDLEWARE
============================================================
*/

app.use(
    cors()
);


app.use(
    express.json()
);


/*
============================================================
STATIC UPLOADS
============================================================
*/

app.use(
    "/uploads",

    express.static(
        path.join(
            process.cwd(),
            "uploads"
        )
    )
);


/*
============================================================
API ROUTES
============================================================
*/

app.use(
    "/api/users",
    userRoutes
);


app.use(
    "/api/products",
    productRoutes
);


app.use(
    "/api/inventory",
    inventoryRoutes
);


app.use(
    "/api/sales",
    saleRoutes
);


app.use(
    "/api/dashboard",
    dashboardRoutes
);


app.use(
    "/api/printer",
    printerRoutes
);


app.use(
    "/api/ledger",
    ledgerRoutes
);


/*
============================================================
BRANCHES
============================================================
*/

app.use(
    "/api/branches",
    branchRoutes
);


/*
============================================================
STOCK TRANSFERS
============================================================
*/

app.use(
    "/api/stock-transfers",
    stockTransferRoutes
);


/*
============================================================
BULK ORDERS
============================================================

Bulk Order routes handle:

- Create order
- Save draft
- Edit saved order
- Order history
- View order
- Duplicate order
- Cancel order
- Print audit
- Revision history

Bulk Orders do NOT directly create Sales or modify inventory.
============================================================
*/

app.use(
    "/api/bulk-orders",
    bulkOrderRoutes
);


/*
============================================================
HEALTH
============================================================
*/

app.get(
    "/api/health",
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
                    "StorePOS API is running"
                )
            );

    }
);


/*
============================================================
PROFILE
============================================================
*/

app.get(
    "/api/profile",

    protect,

    (
        req,
        res
    ) => {

        res.json(
            new ApiResponse(
                true,
                "Profile retrieved successfully",
                req.user
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
    "/api/auth",
    authRoutes
);


/*
============================================================
SYNC
============================================================
*/

app.use(
    "/api/sync",
    syncRoutes
);


/*
============================================================
CUSTOMERS
============================================================
*/

app.use(
    "/api/customers",
    customerRoutes
);


/*
============================================================
PREPARED CARTS
============================================================
*/

app.use(
    "/api/prepared-carts",
    preparedCartBridgeRoutes
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