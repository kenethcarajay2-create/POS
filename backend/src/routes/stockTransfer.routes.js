import express from "express";

import stockTransferController
    from "../controllers/stockTransfer.controller.js";

import protect
    from "../middleware/auth.middleware.js";

import authorize
    from "../middleware/role.middleware.js";

import resolveActiveBranch
    from "../middleware/branch.middleware.js";


const router =
    express.Router();


/*
============================================================
LIST TRANSFERS
============================================================
*/

router.get(
    "/",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .getTransfers
);


/*
============================================================
CREATE DRAFT
============================================================
*/

router.post(
    "/",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .createTransfer
);


/*
============================================================
GET ONE
============================================================
*/

router.get(
    "/:id",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .getTransferById
);


/*
============================================================
UPDATE DRAFT
============================================================
*/

router.patch(
    "/:id",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .updateTransfer
);


/*
============================================================
COMPLETE
============================================================
*/

router.post(
    "/:id/complete",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .completeTransfer
);


/*
============================================================
CANCEL
============================================================
*/

router.post(
    "/:id/cancel",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .cancelTransfer
);


/*
============================================================
PRINT WORKER LIST
============================================================
*/

router.post(
    "/:id/print-list",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .printList
);


/*
============================================================
PRINT COMPLETED RECEIPT
============================================================
*/

router.post(
    "/:id/print-receipt",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    stockTransferController
        .printReceipt
);


export default router;