import api from "../api/api";


const getUsers = async () => {

    const response =
        await api.get("/users");

    return response.data.data;

};


const getUserById = async (id) => {

    const response =
        await api.get(`/users/${id}`);

    return response.data.data;

};


const createUser = async (userData) => {

    const response =
        await api.post(
            "/users",
            userData
        );

    return response.data.data;

};


const updateUser = async (
    id,
    userData
) => {

    const response =
        await api.patch(
            `/users/${id}`,
            userData
        );

    return response.data.data;

};


const changePassword = async (
    id,
    password
) => {

    const response =
        await api.patch(
            `/users/${id}/password`,
            {
                password,
            }
        );

    return response.data.data;

};


const disableUser = async (id) => {

    const response =
        await api.patch(
            `/users/${id}/disable`
        );

    return response.data.data;

};


const enableUser = async (id) => {

    const response =
        await api.patch(
            `/users/${id}/enable`
        );

    return response.data.data;

};


export default {

    getUsers,

    getUserById,

    createUser,

    updateUser,

    changePassword,

    disableUser,

    enableUser,

};