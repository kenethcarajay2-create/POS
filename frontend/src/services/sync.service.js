import api from "../api/api";


/*
============================================================
RUN CLOUD BACKUP
============================================================
*/

const syncNow =
    async () => {

        const response =
            await api.post(
                "/sync"
            );


        return response.data
            ?.data;

    };


/*
============================================================
GET CLOUD BACKUP STATUS
============================================================
*/

const getStatus =
    async () => {

        const response =
            await api.get(
                "/sync/status"
            );


        return response.data
            ?.data;

    };


/*
============================================================
SYNC PRICED PRODUCTS
============================================================
*/

const syncPricedProducts =
    async () => {

        const response =
            await api.post(
                "/sync/priced-products"
            );


        return response.data
            ?.data;

    };


/*
============================================================
GET PRICED PRODUCT SYNC STATUS
============================================================
*/

const getPricedProductsStatus =
    async () => {

        const response =
            await api.get(
                "/sync/priced-products/status"
            );


        return response.data
            ?.data;

    };


export default {
    syncNow,
    getStatus,
    syncPricedProducts,
    getPricedProductsStatus,
};
