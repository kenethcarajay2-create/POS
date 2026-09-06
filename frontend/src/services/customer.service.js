import api from "../api/api";


/*
============================================================
GET CUSTOMERS
============================================================
*/

const getCustomers = async (
    params = {}
) => {

    const response =
        await api.get(
            "/customers",
            {
                params,
            }
        );


    return response.data.data;

};


/*
============================================================
GET CUSTOMER BY ID
============================================================
*/

const getCustomerById = async (
    customerId
) => {

    if (!customerId) {

        throw new Error(
            "Customer ID is required."
        );

    }


    const response =
        await api.get(
            `/customers/${customerId}`
        );


    return response.data.data;

};


/*
============================================================
CREATE CUSTOMER
============================================================
*/

const createCustomer = async (
    data
) => {

    if (!data) {

        throw new Error(
            "Customer data is required."
        );

    }


    const response =
        await api.post(
            "/customers",
            data
        );


    return response.data.data;

};


/*
============================================================
UPDATE CUSTOMER
============================================================
*/

const updateCustomer = async (
    customerId,
    data
) => {

    if (!customerId) {

        throw new Error(
            "Customer ID is required."
        );

    }


    if (!data) {

        throw new Error(
            "Customer data is required."
        );

    }


    const response =
        await api.patch(
            `/customers/${customerId}`,
            data
        );


    return response.data.data;

};


/*
============================================================
IDENTIFY CUSTOMER
============================================================

Supports:

QR:
STOREPOS:CUST-000001

Customer code:
CUST-000001

RFID:
04A3D8917C2B80
============================================================
*/

const identifyCustomer = async (
    identifier
) => {

    const value =
        String(
            identifier ||
            ""
        ).trim();


    if (!value) {

        throw new Error(
            "Customer identifier is required."
        );

    }


    const response =
        await api.get(
            `/customers/identify/${encodeURIComponent(
                value
            )}`
        );


    return response.data.data;

};


/*
============================================================
GET CUSTOMER ANALYTICS
============================================================
*/

const getAnalytics = async (
    customerId
) => {

    if (!customerId) {

        throw new Error(
            "Customer ID is required."
        );

    }


    const response =
        await api.get(
            `/customers/${customerId}/analytics`
        );


    return response.data.data;

};


/*
============================================================
GET CUSTOMER SALES
============================================================
*/

const getSales = async (
    customerId,
    params = {}
) => {

    if (!customerId) {

        throw new Error(
            "Customer ID is required."
        );

    }


    const response =
        await api.get(
            `/customers/${customerId}/sales`,
            {
                params,
            }
        );


    return response.data.data;

};


/*
============================================================
EXPORT
============================================================
*/

export default {

    getCustomers,

    getCustomerById,

    createCustomer,

    updateCustomer,

    identifyCustomer,

    getAnalytics,

    getSales,

};