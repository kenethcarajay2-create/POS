import api from "../api/api";


const stockIn = async (data) => {

    const response =
        await api.post(
            "/inventory/stock-in",
            data
        );

    return response.data.data;

};


const stockOut = async (data) => {

    const response =
        await api.post(
            "/inventory/stock-out",
            data
        );

    return response.data.data;

};


const adjustStock = async (data) => {

    const response =
        await api.post(
            "/inventory/adjust",
            data
        );

    return response.data.data;

};


const getTransactions = async (
    params = {}
) => {

    const response =
        await api.get(
            "/inventory/transactions",
            {
                params,
            }
        );

    return response.data.data;

};


export default {

    stockIn,

    stockOut,

    adjustStock,

    getTransactions,

};