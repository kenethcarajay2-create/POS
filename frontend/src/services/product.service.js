import api from "../api/api";

const getProducts = async () => {
    const response = await api.get("/products");
    return response.data.data;
};

const createProduct = async (product) => {
    const response = await api.post("/products", product);
    return response.data.data;
};

const updateProduct = async (id, product) => {
    const response = await api.put(`/products/${id}`, product);
    return response.data.data;
};

const updateStatus = async (id, isActive) => {
    const response = await api.patch(
        `/products/${id}/status`,
        {
            isActive,
        }
    );

    return response.data.data;
};

export default {
    getProducts,
    createProduct,
    updateProduct,
    updateStatus,
};