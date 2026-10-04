import express from "express";

import inventoryController from "../controllers/inventory.controller.js";

import validate from "../middleware/validate.middleware.js";

import protect from "../middleware/auth.middleware.js";

import authorize from "../middleware/role.middleware.js";

import resolveActiveBranch from "../middleware/branch.middleware.js";

import inventoryValidator from "../validators/inventory.validator.js";


const router =
    express.Router();


/*
============================================================
GET INVENTORY TRANSACTIONS
============================================================

Transactions are scoped to the current active branch.

Current access rule is preserved:
ADMIN only.
============================================================
*/

router.get(
    "/transactions",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    inventoryController
        .getTransactions
);


/*
============================================================
STOCK IN
============================================================
*/

router.post(
    "/stock-in",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    validate(
        inventoryValidator
            .stockInSchema
    ),

    inventoryController
        .stockIn
);


/*
============================================================
STOCK OUT
============================================================
*/

router.post(
    "/stock-out",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    validate(
        inventoryValidator
            .stockOutSchema
    ),

    inventoryController
        .stockOut
);


/*
============================================================
STOCK ADJUSTMENT
============================================================
*/

router.post(
    "/adjust",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    validate(
        inventoryValidator
            .stockAdjustmentSchema
    ),

    inventoryController
        .adjustStock
);


export default router;