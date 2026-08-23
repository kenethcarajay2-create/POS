import api from "../api/api";

const getDashboard = async () => {
    const response = await api.get("/dashboard");
    return response.data.data;
};

export default {
    getDashboard,
};