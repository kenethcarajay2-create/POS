import api from "../api/api";


/*
============================================================
NORMAL LOGIN
============================================================
*/

const login =
    async (
        credentials
    ) => {

        const response =
            await api.post(
                "/auth/login",
                credentials
            );


        return response.data.data;

    };


/*
============================================================
RFID / NFC LOGIN
============================================================

Example:

{
    rfidUid: "04A3D8917C2B80"
}
============================================================
*/

const rfidLogin =
    async (
        rfidUid
    ) => {

        const response =
            await api.post(
                "/auth/rfid-login",
                {
                    rfidUid,
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

    login,

    rfidLogin,

};