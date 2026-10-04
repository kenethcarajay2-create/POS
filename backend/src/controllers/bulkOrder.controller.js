import bulkOrderService
    from "../services/bulkOrder.service.js";

import bulkOrderPrintingService
    from "../services/bulkOrderPrinting.service.js";

import saleService
    from "../services/sale.service.js";


/*
============================================================
HELPERS
============================================================
*/


/*
------------------------------------------------------------
CURRENT USER ID
------------------------------------------------------------

Authentication middleware is responsible for verifying the
user before these controller methods run.

Supports:

req.user._id
req.user.id
------------------------------------------------------------
*/

const getUserId =
    (
        req
    ) => {

        return (
            req.user?._id ||
            req.user?.id
        );

    };


/*
------------------------------------------------------------
ACTIVE BRANCH
------------------------------------------------------------

The active branch must come from trusted backend middleware.

We intentionally DO NOT read:

req.body.branchId
req.query.branchId

for branch ownership.

resolveActiveBranch remains authoritative.
------------------------------------------------------------
*/

const getActiveBranch =
    (
        req
    ) => {

        return (
            req.activeBranch ||
            req.branch
        );

    };


/*
------------------------------------------------------------
ACTIVE BRANCH ID
------------------------------------------------------------
*/

const getActiveBranchId =
    (
        req
    ) => {

        const branch =
            getActiveBranch(
                req
            );


        return (
            branch?._id ||
            branch?.id
        );

    };


/*
============================================================
CREATE BULK ORDER
============================================================

POST /api/bulk-orders

Example body:

{
    customerName: "ABC Retail Store",
    notes: "",
    pricingMode: "RETAIL",
    status: "SAVED",

    items: [
        {
            productId: "...",
            quantity: 25
        }
    ]
}

IMPORTANT:

Prices supplied by the frontend are not trusted.

The Bulk Order service loads the current Product records and
calculates pricing on the backend.
============================================================
*/

const createOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                await bulkOrderService
                    .createOrder(
                        req.body,
                        getUserId(
                            req
                        ),
                        getActiveBranch(
                            req
                        )
                    );


            return res
                .status(
                    201
                )
                .json({
                    success:
                        true,

                    message:
                        "Bulk Order created successfully.",

                    data:
                        order,
                });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
UPDATE BULK ORDER
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

const updateOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                await bulkOrderService
                    .updateOrder(
                        req.params.id,
                        req.body,
                        getUserId(
                            req
                        ),
                        getActiveBranch(
                            req
                        )
                    );


            return res.json({
                success:
                    true,

                message:
                    "Bulk Order updated successfully.",

                data:
                    order,
            });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
SAVE DRAFT
============================================================

POST /api/bulk-orders/:id/save

DRAFT
    ↓
SAVED

Calling this repeatedly for an already SAVED order remains
safe through the service's idempotent handling.
============================================================
*/

const saveDraft =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                await bulkOrderService
                    .saveDraft(
                        req.params.id,
                        getUserId(
                            req
                        ),
                        getActiveBranch(
                            req
                        )
                    );


            return res.json({
                success:
                    true,

                message:
                    "Bulk Order saved successfully.",

                data:
                    order,
            });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
DUPLICATE BULK ORDER
============================================================

POST /api/bulk-orders/:id/duplicate

Creates a new DRAFT.

Products and quantities come from the selected order.

The pricing mode is preserved.

Pricing is recalculated using CURRENT Product pricing.
============================================================
*/

const duplicateOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                await bulkOrderService
                    .duplicateOrder(
                        req.params.id,
                        getUserId(
                            req
                        ),
                        getActiveBranch(
                            req
                        )
                    );


            return res
                .status(
                    201
                )
                .json({
                    success:
                        true,

                    message:
                        "Bulk Order duplicated successfully.",

                    data:
                        order,
                });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
CANCEL BULK ORDER
============================================================

POST /api/bulk-orders/:id/cancel

DRAFT / SAVED
        ↓
CANCELLED

Completed orders cannot be cancelled here because their
financial correction belongs to the Sale refund/return flow.
============================================================
*/

const cancelOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                await bulkOrderService
                    .cancelOrder(
                        req.params.id,
                        getUserId(
                            req
                        ),
                        getActiveBranch(
                            req
                        )
                    );


            return res.json({
                success:
                    true,

                message:
                    "Bulk Order cancelled successfully.",

                data:
                    order,
            });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
PAY / COMPLETE BULK ORDER
============================================================

POST /api/bulk-orders/:id/pay

This is the direct Bulk Order History payment workflow.

Example request body:

{
    paymentMethod: "Cash",
    payment: 5000,
    customerId: null,
    loyaltyPointsToRedeem: 0
}


IMPORTANT SECURITY RULES

The frontend DOES NOT send:

- products
- quantities
- prices
- line totals
- branch ID
- Sale ID

The backend loads the SAVED Bulk Order using:

req.params.id
+
trusted active branch


saleService.checkoutBulkOrder() is responsible for performing
the financial operation atomically:

1. Load the SAVED Bulk Order.
2. Verify it belongs to the active branch.
3. Verify it has not already been completed.
4. Load/revalidate Product records.
5. Validate BranchInventory.
6. Use the saved Bulk Order quantities and agreed line prices.
7. Validate payment.
8. Generate the receipt number.
9. Deduct BranchInventory.
10. Create InventoryTransaction records.
11. Create the normal Sale.
12. Apply loyalty operations if requested.
13. Mark BulkOrder COMPLETED.
14. Link BulkOrder.sale to the Sale.
15. Queue Sale + Bulk Order sync.
16. Commit everything together.

If anything fails, the MongoDB transaction rolls back.
============================================================
*/

const payOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await saleService
                    .checkoutBulkOrder(
                        req.params.id,
                        req.body,
                        getUserId(
                            req
                        ),
                        getActiveBranch(
                            req
                        )
                    );


            return res
                .status(
                    result?.alreadyCompleted
                        ? 200
                        : 201
                )
                .json({
                    success:
                        true,

                    message:
                        result?.alreadyCompleted
                            ?
                            "Bulk Order was already paid and completed."
                            :
                            "Bulk Order paid and completed successfully.",

                    data:
                        result,
                });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
PRINT BULK ORDER
============================================================

POST /api/bulk-orders/:id/print


IMPORTANT ORDER OF OPERATIONS

1. Load the order.
2. Validate branch access.
3. Send the physical print job.
4. Wait for the printer call to succeed.
5. Only THEN record the successful print.


This prevents:

Printer disconnected
        ↓
printCount incorrectly increasing


If the printer throws an error:

- printCount does not change
- lastPrintedAt does not change
- no PRINT sync request is created
============================================================
*/

const printOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            ====================================================
            LOAD ORDER
            ====================================================

            getOrderById() is branch-scoped.

            It also populates createdBy, which is useful for
            the "Prepared By" section of the printed sheet.
            ====================================================
            */

            const order =
                await bulkOrderService
                    .getOrderById(
                        req.params.id,
                        getActiveBranchId(
                            req
                        )
                    );


            /*
            ====================================================
            STATUS VALIDATION
            ====================================================

            DRAFT orders must be saved first.

            SAVED:
                printable

            COMPLETED:
                printable

            CANCELLED:
                intentionally blocked so a cancelled order
                cannot accidentally be used as a fresh worker
                picking sheet.
            ====================================================
            */

            if (
                order.status ===
                "DRAFT"
            ) {

                const error =
                    new Error(
                        "Save the Bulk Order before printing."
                    );


                error.statusCode =
                    409;


                throw error;

            }


            if (
                order.status ===
                "CANCELLED"
            ) {

                const error =
                    new Error(
                        "Cancelled Bulk Orders cannot be printed."
                    );


                error.statusCode =
                    409;


                throw error;

            }


            /*
            ====================================================
            PHYSICAL PRINT
            ====================================================

            Awaiting this call is intentional.

            We only update the database after the printer
            library reports success.
            ====================================================
            */

            await bulkOrderPrintingService
                .printBulkOrderList(
                    order
                );


            /*
            ====================================================
            RECORD SUCCESSFUL PRINT
            ====================================================
            */

            const updatedOrder =
                await bulkOrderService
                    .recordPrint(
                        req.params.id,
                        getUserId(
                            req
                        ),
                        getActiveBranch(
                            req
                        )
                    );


            return res.json({
                success:
                    true,

                message:
                    "Bulk Order printed successfully.",

                data:
                    updatedOrder,
            });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
GET BULK ORDER HISTORY
============================================================

GET /api/bulk-orders

Optional query parameters:

?status=SAVED
?search=ABC
?limit=100

The active branch comes from backend middleware.
============================================================
*/

const getOrders =
    async (
        req,
        res,
        next
    ) => {

        try {

            const orders =
                await bulkOrderService
                    .getOrders(
                        getActiveBranchId(
                            req
                        ),
                        {
                            status:
                                req.query.status,

                            search:
                                req.query.search,

                            limit:
                                req.query.limit,
                        }
                    );


            return res.json({
                success:
                    true,

                count:
                    orders.length,

                data:
                    orders,
            });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
GET BULK ORDER
============================================================

GET /api/bulk-orders/:id
============================================================
*/

const getOrderById =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                await bulkOrderService
                    .getOrderById(
                        req.params.id,
                        getActiveBranchId(
                            req
                        )
                    );


            return res.json({
                success:
                    true,

                data:
                    order,
            });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
GET REVISION
============================================================

GET /api/bulk-orders/:id/revisions/:revision
============================================================
*/

const getRevision =
    async (
        req,
        res,
        next
    ) => {

        try {

            const revision =
                await bulkOrderService
                    .getRevision(
                        req.params.id,
                        req.params.revision,
                        getActiveBranchId(
                            req
                        )
                    );


            return res.json({
                success:
                    true,

                data:
                    revision,
            });

        }
        catch (
            error
        ) {

            return next(
                error
            );

        }

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    createOrder,

    updateOrder,

    saveDraft,

    duplicateOrder,

    cancelOrder,

    payOrder,

    printOrder,

    getOrders,

    getOrderById,

    getRevision,

};