import api from "../api/api";


/*
============================================================
CREATE TRANSFER DRAFT
============================================================
*/

const createTransfer =
    async (
        data
    ) => {

        const response =
            await api.post(
                "/stock-transfers",
                data
            );


        return response.data.data;

    };


/*
============================================================
UPDATE TRANSFER DRAFT
============================================================
*/

const updateTransfer =
    async (
        id,
        data
    ) => {

        const response =
            await api.patch(
                `/stock-transfers/${id}`,
                data
            );


        return response.data.data;

    };


/*
============================================================
GET TRANSFERS
============================================================
*/

const getTransfers =
    async ({
        status = "",
        limit = 100,
    } = {}) => {

        const response =
            await api.get(
                "/stock-transfers",
                {
                    params: {

                        status:
                            status ||
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
GET TRANSFER
============================================================
*/

const getTransferById =
    async (
        id
    ) => {

        const response =
            await api.get(
                `/stock-transfers/${id}`
            );


        return response.data.data;

    };


/*
============================================================
COMPLETE TRANSFER
============================================================
*/

const completeTransfer =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/stock-transfers/${id}/complete`
            );


        return response.data.data;

    };


/*
============================================================
CANCEL TRANSFER
============================================================
*/

const cancelTransfer =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/stock-transfers/${id}/cancel`
            );


        return response.data.data;

    };


/*
============================================================
PRINT WORKER LIST
============================================================
*/

const printTransferList =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/stock-transfers/${id}/print-list`
            );


        return response.data.data;

    };


/*
============================================================
PRINT COMPLETED RECEIPT
============================================================
*/

const printTransferReceipt =
    async (
        id
    ) => {

        const response =
            await api.post(
                `/stock-transfers/${id}/print-receipt`
            );


        return response.data.data;

    };


export default {

    createTransfer,

    updateTransfer,

    getTransfers,

    getTransferById,

    completeTransfer,

    cancelTransfer,

    printTransferList,

    printTransferReceipt,

};