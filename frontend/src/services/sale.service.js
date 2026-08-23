import api from "../api/api";

const checkout = async (checkoutData) => {
    const response = await api.post(
        "/sales/checkout",
        checkoutData
    );

    return response.data.data;
};

const getSales = async () => {
    const response = await api.get("/sales");

    return response.data.data;
};

const getSaleById = async (id) => {
    const response = await api.get(
        `/sales/${id}`
    );

    return response.data.data;
};

const voidSale = async (id) => {

    console.log(
        "CALLING VOID API:",
        id
    );

    const response = await api.patch(
        `/sales/${id}/void`
    );

    console.log(
        "VOID API RESPONSE:",
        response.data
    );

    return response.data.data;
};

const refundSale = async (
    id,
    items
) => {

    const response = await api.patch(
        `/sales/${id}/refund`,
        {
            items,
        }
    );

    return response.data.data;
};

const printSale = async (id) => {

    const response = await api.post(
        `/sales/${id}/print`
    );

    return response.data.data;
};


// =========================================
// OPEN CASH DRAWER
// =========================================

const openCashDrawer = async () => {

    const response = await api.post(
        "/printer/cash-drawer"
    );

    return response.data;
};


export default {

    checkout,
    getSales,
    getSaleById,
    voidSale,
    refundSale,
    printSale,
    openCashDrawer,

};