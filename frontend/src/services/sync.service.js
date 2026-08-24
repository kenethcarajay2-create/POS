import api from "../api/api";


/*
============================================================
GET CLOUD SYNC STATUS
============================================================
*/

const getStatus = async () => {

    const response =
        await api.get(
            "/sync/status"
        );


    return response.data.data;

};


/*
============================================================
SYNC NOW
============================================================
*/

const syncNow = async () => {

    const response =
        await api.post(
            "/sync"
        );


    return response.data.data;

};


/*
============================================================
EXPORT
============================================================
*/

export default {

    getStatus,

    syncNow,

};