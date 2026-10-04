import api from "../api/api";


/*
============================================================
CREATE BULK ORDER
============================================================
*/

const createOrder =
    async (
        data
    ) => {

        const response =
            await api.post(
                "/bulk-orders",
                data
            );


        return response.data.data;

    };


/*
============================================================
UPDATE BULK ORDER
============================================================
*/

const updateOrder =
    async (
        id,
        data
    ) => {

        const response =
            await api.patch(
                `/bulk-orders/${id}`,
                data
            );


        return response.data.data;

    };


/*
============================================================
GET BULK ORDERS
============================================================
*/

const getOrders =
    async ({
        status = "",
        search = "",
        limit = 100,
    } = {}) => {

        const response =
            await api.get(
                "/bulk-orders",
                {
                    params: {

                        status:
                            status ||
                            undefined,

                        search:
                            search ||
                            undefined,

                        limit,

                    },
                }
            );


        return (
            response.data?.data ||
            []
        );

    };


/*
============================================================
GET BULK ORDER BY ID
============================================================
*/

const getOrderById =
    async (
        id
    ) => {

        const response =
            await api.get(
                `/bulk-orders/${id}`
            );


        return response.data.data;

    };


/*
============================================================
SAVE DRAFT
============================================================

Changes a DRAFT order into SAVED.

Calling this again for an already SAVED order is handled
idempotently by the backend.
============================================================
*/

const saveDraft =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/bulk-orders/${id}/save`
            );


        return response.data.data;

    };


/*
============================================================
DUPLICATE BULK ORDER
============================================================

Creates a new DRAFT using the current order items.

The original Bulk Order pricing mode is preserved.

Product pricing is recalculated by the backend using the
current Product pricing and the preserved pricing mode.
============================================================
*/

const duplicateOrder =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/bulk-orders/${id}/duplicate`
            );


        return response.data.data;

    };


/*
============================================================
CANCEL BULK ORDER
============================================================
*/

const cancelOrder =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/bulk-orders/${id}/cancel`
            );


        return response.data.data;

    };


/*
============================================================
PAY BULK ORDER
============================================================

Direct payment from Bulk Order History.

Endpoint:

POST /api/bulk-orders/:id/pay


The frontend sends PAYMENT information only.

Example:

{
    paymentMethod: "Cash",
    payment: 5000,
    customerId: null,
    loyaltyPointsToRedeem: 0
}


IMPORTANT:

Do NOT send:

- items
- quantities
- product prices
- subtotal
- total
- branchId
- saleId

The backend loads the authoritative SAVED Bulk Order and
performs the complete financial transaction.


Backend transaction:

SAVED Bulk Order
        ↓
validate products
        ↓
validate branch inventory
        ↓
create Sale
        ↓
deduct BranchInventory
        ↓
create InventoryTransaction records
        ↓
process loyalty
        ↓
mark BulkOrder COMPLETED
        ↓
link BulkOrder to Sale
        ↓
queue sync events
        ↓
commit


The backend also handles retry/idempotency behavior when the
Bulk Order has already been successfully completed.
============================================================
*/

const payOrder =
    async (
        id,
        {
            payment,
            paymentMethod = "Cash",
            customerId = null,
            loyaltyPointsToRedeem = 0,
        } = {}
    ) => {

        const payload = {

            payment,

            paymentMethod,

            customerId:
                customerId ||
                null,

            loyaltyPointsToRedeem:
                Number(
                    loyaltyPointsToRedeem
                ) || 0,

        };


        const response =
            await api.post(
                `/bulk-orders/${id}/pay`,
                payload
            );


        return response.data.data;

    };


/*
============================================================
PRINT BULK ORDER
============================================================

The backend sends the compact Bulk Order list to the
configured thermal printer.

The backend records the print only after the printer
service reports successful submission.
============================================================
*/

const printOrder =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/bulk-orders/${id}/print`
            );


        return response.data.data;

    };


/*
============================================================
GET SPECIFIC REVISION
============================================================
*/

const getRevision =
    async (
        id,
        revision
    ) => {

        const response =
            await api.get(
                `/bulk-orders/${id}/revisions/${revision}`
            );


        return response.data.data;

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    createOrder,

    updateOrder,

    getOrders,

    getOrderById,

    saveDraft,

    duplicateOrder,

    cancelOrder,

    payOrder,

    printOrder,

    getRevision,

};