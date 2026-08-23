import api from "../api/api";

const login = async (credentials) => {
    const response = await api.post("/auth/login", credentials);

    return response.data.data;
};

export default {
    login,
};