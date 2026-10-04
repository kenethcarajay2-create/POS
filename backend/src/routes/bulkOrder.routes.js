import express from "express";

import bulkOrderController
    from "../controllers/bulkOrder.controller.js";

import protect
    from "../middleware/auth.middleware.js";

import resolveActiveBranch
    from "../middleware/branch.middleware.js";

import permit
    from "../middleware/permission.middleware.js";


const router =
    express.Router();


/*
============================================================
BULK ORDER ROUTES
============================================================

ACCESS RULES

ADMIN
→ Always allowed through permit() admin bypass.

OTHER USERS
→ Must have:

permissions.bulkOrder === true

All Bulk Order requests are also branch-scoped through
resolveActiveBranch.

IMPORTANT:

The frontend must never be trusted to provide the branch
ownership of a Bulk Order.

The resolved backend branch is authoritative.
============================================================
*/


/*
============================================================
LIST / HISTORY
============================================================

GET /api/bulk-orders

Optional query parameters:

?status=SAVED
?search=ABC
?limit=100
============================================================
*/

router.get(
    "/",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .getOrders
);


/*
============================================================
CREATE ORDER
============================================================

POST /api/bulk-orders

Creates:

DRAFT

or:

SAVED

Creating a Bulk Order does NOT:

- create a Sale
- deduct inventory
- process payment
============================================================
*/

router.post(
    "/",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .createOrder
);


/*
============================================================
GET REVISION
============================================================

GET /api/bulk-orders/:id/revisions/:revision

Example:

GET /api/bulk-orders/123/revisions/2
============================================================
*/

router.get(
    "/:id/revisions/:revision",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .getRevision
);


/*
============================================================
SAVE DRAFT
============================================================

POST /api/bulk-orders/:id/save

DRAFT
    ↓
SAVED
============================================================
*/

router.post(
    "/:id/save",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .saveDraft
);


/*
============================================================
DUPLICATE ORDER
============================================================

POST /api/bulk-orders/:id/duplicate

Creates a NEW DRAFT from the selected Bulk Order.

Product quantities are copied.

The pricing mode is preserved.

Current Product pricing is recalculated by the backend.
============================================================
*/

router.post(
    "/:id/duplicate",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .duplicateOrder
);


/*
============================================================
CANCEL ORDER
============================================================

POST /api/bulk-orders/:id/cancel

Allowed:

DRAFT
    ↓
CANCELLED

SAVED
    ↓
CANCELLED

No hard deletion occurs.
============================================================
*/

router.post(
    "/:id/cancel",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .cancelOrder
);


/*
============================================================
PAY / COMPLETE ORDER
============================================================

POST /api/bulk-orders/:id/pay

This is the direct payment workflow from Bulk Order History.

Allowed:

SAVED
    ↓
PAYMENT
    ↓
SALE CREATED
    ↓
INVENTORY DEDUCTED
    ↓
COMPLETED


The frontend sends PAYMENT information only.

Example:

{
    paymentMethod: "Cash",
    payment: 5000,
    customerId: null,
    loyaltyPointsToRedeem: 0
}


The frontend must NOT be trusted to send:

- branch ownership
- product quantities
- product prices
- line totals
- Sale ID


The backend loads the SAVED Bulk Order and uses its stored
products, quantities, pricing mode, and agreed prices.


The financial operation is handled by:

saleService.checkoutBulkOrder()

through bulkOrderController.payOrder().


The Sale creation, inventory deduction, inventory audit,
Bulk Order completion, and sync-outbox writes must all occur
inside the same MongoDB transaction.

If any part fails, the complete transaction rolls back.
============================================================
*/

router.post(
    "/:id/pay",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .payOrder
);


/*
============================================================
PRINT ORDER
============================================================

POST /api/bulk-orders/:id/print

IMPORTANT:

The controller handles the complete print workflow:

1. Load the branch-scoped Bulk Order.
2. Validate that it is printable.
3. Send the physical print job.
4. Wait for the printer service to report success.
5. Only then record:
   - printCount
   - lastPrintedAt
   - lastModifiedBy
   - SyncOutbox PRINT request

Printing does NOT:

- deduct inventory
- create a Sale
- process payment
============================================================
*/

router.post(
    "/:id/print",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .printOrder
);


/*
============================================================
GET ONE
============================================================

GET /api/bulk-orders/:id

IMPORTANT:

Specific action routes such as:

/:id/save
/:id/duplicate
/:id/cancel
/:id/pay
/:id/print
/:id/revisions/:revision

are intentionally declared before this generic route.
============================================================
*/

router.get(
    "/:id",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .getOrderById
);


/*
============================================================
UPDATE ORDER
============================================================

PATCH /api/bulk-orders/:id

Editable:

DRAFT
SAVED

Protected:

COMPLETED
CANCELLED
============================================================
*/

router.patch(
    "/:id",

    protect,

    resolveActiveBranch,

    permit(
        "bulkOrder"
    ),

    bulkOrderController
        .updateOrder
);


export default router;