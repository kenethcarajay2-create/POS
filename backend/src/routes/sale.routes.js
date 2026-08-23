import express from "express";

import saleController from "../controllers/sale.controller.js";

import protect from "../middleware/auth.middleware.js";
import permit from "../middleware/permission.middleware.js";

import validate from "../middleware/validate.middleware.js";

import saleValidator from "../validators/sale.validator.js";


const router = express.Router();


/*
============================================================
CHECKOUT
============================================================

POST /api/sales/checkout

Requires POS access.

Admin automatically bypasses permission checks
inside permit().
============================================================
*/

router.post(
    "/checkout",
    protect,
    permit("pos"),
    validate(
        saleValidator.checkoutSchema
    ),
    saleController.checkout
);


/*
============================================================
GET ALL SALES
============================================================

GET /api/sales

Requires Sales page access.
============================================================
*/

router.get(
    "/",
    protect,
    permit("sales"),
    saleController.getSales
);


/*
============================================================
GET SALE BY ID
============================================================

GET /api/sales/:id

Anyone with Sales access can view receipt details.
============================================================
*/

router.get(
    "/:id",
    protect,
    permit("sales"),
    saleController.getSaleById
);


/*
============================================================
VOID SALE
============================================================

PATCH /api/sales/:id/void

Requires specific Void permission.
============================================================
*/

router.patch(
    "/:id/void",
    protect,
    permit("salesVoid"),
    saleController.voidSale
);


/*
============================================================
REFUND SALE
============================================================

PATCH /api/sales/:id/refund

Requires specific Refund permission.
============================================================
*/

router.patch(
    "/:id/refund",
    protect,
    permit("salesRefund"),
    validate(
        saleValidator.refundSchema
    ),
    saleController.refundSale
);


/*
============================================================
PRINT / REPRINT SALE
============================================================

POST /api/sales/:id/print

Requires specific receipt reprint permission.
============================================================
*/

router.post(
    "/:id/print",
    protect,
    permit("salesReprint"),
    saleController.printSale
);


/*
============================================================
EXPORT
============================================================
*/

export default router;