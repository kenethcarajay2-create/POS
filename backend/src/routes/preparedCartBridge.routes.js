import express from "express";

import preparedCartBridgeController
    from "../controllers/preparedCartBridge.controller.js";

import protect
    from "../middleware/auth.middleware.js";

import permit
    from "../middleware/permission.middleware.js";

import resolveActiveBranch
    from "../middleware/branch.middleware.js";


const router =
    express.Router();


/*
============================================================
CLAIM MOBILE PREPARED CART
============================================================

POST /api/prepared-carts/claim

Body:

{
    "qrPayload": "POSCART:..."
}
============================================================
*/

router.post(
    "/claim",

    protect,

    resolveActiveBranch,

    permit(
        "pos"
    ),

    preparedCartBridgeController.claim
);


/*
============================================================
RECOVER EXISTING CLAIM
============================================================

POST /api/prepared-carts/:id/recover

Body:

{
    "claimToken": "..."
}

Used after:

- browser refresh
- Vite refresh
- accidental Ctrl+R

This does NOT create a new claim.

It proves ownership of the existing CLAIMED cart and
revalidates products, stock, and pricing locally.
============================================================
*/

router.post(
    "/:id/recover",

    protect,

    resolveActiveBranch,

    permit(
        "pos"
    ),

    preparedCartBridgeController.recover
);


/*
============================================================
RELEASE CLAIM
============================================================

POST /api/prepared-carts/:id/release

Body:

{
    "claimToken": "..."
}
============================================================
*/

router.post(
    "/:id/release",

    protect,

    resolveActiveBranch,

    permit(
        "pos"
    ),

    preparedCartBridgeController.release
);


export default router;