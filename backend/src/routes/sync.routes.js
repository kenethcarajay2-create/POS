import express from "express";

import syncController
    from "../controllers/sync.controller.js";

import protect
    from "../middleware/auth.middleware.js";

import permit
    from "../middleware/permission.middleware.js";


const router =
    express.Router();


/*
============================================================
RUN CLOUD SYNC
============================================================
POST /api/sync
============================================================
*/

router.post(
    "/",
    protect,
    permit("settings"),
    syncController.syncNow
);


/*
============================================================
GET CLOUD SYNC STATUS
============================================================
GET /api/sync/status
============================================================
*/

router.get(
    "/status",
    protect,
    permit("settings"),
    syncController.getSyncStatus
);


/*
============================================================
SYNC PRICED PRODUCTS
============================================================
POST /api/sync/priced-products

Pulls finalized products from the Product Pricing database
into the local StorePOS catalog.

BranchInventory quantities are preserved.
============================================================
*/

router.post(
    "/priced-products",
    protect,
    permit("settings"),
    syncController.syncPricedProducts
);


/*
============================================================
GET PRICED PRODUCT SYNC STATUS
============================================================
GET /api/sync/priced-products/status
============================================================
*/

router.get(
    "/priced-products/status",
    protect,
    permit("settings"),
    syncController.getPricedProductSyncStatus
);


export default router;
