import api from "../api/api";


/*
============================================================
STOCK IN
============================================================
*/

const stockIn =
    async (
        data
    ) => {

        const response =
            await api.post(
                "/inventory/stock-in",
                data
            );


        return response.data.data;

    };


/*
============================================================
STOCK OUT
============================================================
*/

const stockOut =
    async (
        data
    ) => {

        const response =
            await api.post(
                "/inventory/stock-out",
                data
            );


        return response.data.data;

    };


/*
============================================================
ADJUST STOCK
============================================================
*/

const adjustStock =
    async (
        data
    ) => {

        const response =
            await api.post(
                "/inventory/adjust",
                data
            );


        return response.data.data;

    };


/*
============================================================
GET TRANSACTIONS
============================================================
*/

const getTransactions =
    async (
        filters = {}
    ) => {

        const response =
            await api.get(
                "/inventory/transactions",
                {
                    params:
                        filters,
                }
            );


        return (
            response.data.data ||
            []
        );

    };


export default {

    stockIn,

    stockOut,

    adjustStock,

    getTransactions,

};