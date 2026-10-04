import express from "express";

import saleController from "../controllers/sale.controller.js";

import protect from "../middleware/auth.middleware.js";

import resolveActiveBranch from "../middleware/branch.middleware.js";

import permit from "../middleware/permission.middleware.js";

import validate from "../middleware/validate.middleware.js";

import saleValidator from "../validators/sale.validator.js";


const router =
    express.Router();


/*
============================================================
CHECKOUT
============================================================

POST /api/sales/checkout

Flow:

protect
→ resolve current user
→ resolve active branch
→ permission check
→ validate request
→ checkout

The branch comes from backend branch context.
It is never trusted from req.body.
============================================================
*/

router.post(
    "/checkout",

    protect,

    resolveActiveBranch,

    permit(
        "pos"
    ),

    validate(
        saleValidator.checkoutSchema
    ),

    saleController.checkout
);


/*
============================================================
GET SALES
============================================================

Returns sales for the ACTIVE branch only.

Admin users still operate inside the selected/default branch
for this endpoint.

All-branch reporting will be implemented separately.
============================================================
*/

router.get(
    "/",

    protect,

    resolveActiveBranch,

    permit(
        "sales"
    ),

    saleController.getSales
);


/*
============================================================
GET SALE BY ID
============================================================

The sale must belong to the active branch.
============================================================
*/

router.get(
    "/:id",

    protect,

    resolveActiveBranch,

    permit(
        "sales"
    ),

    saleController.getSaleById
);


/*
============================================================
VOID SALE
============================================================

The sale must belong to the active branch.
============================================================
*/

router.patch(
    "/:id/void",

    protect,

    resolveActiveBranch,

    permit(
        "salesVoid"
    ),

    saleController.voidSale
);


/*
============================================================
REFUND SALE
============================================================

The sale must belong to the active branch.
============================================================
*/

router.patch(
    "/:id/refund",

    protect,

    resolveActiveBranch,

    permit(
        "salesRefund"
    ),

    validate(
        saleValidator.refundSchema
    ),

    saleController.refundSale
);


/*
============================================================
PRINT / REPRINT SALE
============================================================

A receipt from another branch cannot be retrieved simply by
supplying its MongoDB ID.
============================================================
*/

router.post(
    "/:id/print",

    protect,

    resolveActiveBranch,

    permit(
        "salesReprint"
    ),

    saleController.printSale
);


/*
============================================================
EXPORT
============================================================
*/

export default router;