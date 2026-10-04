import api from "../api/api";


/*
============================================================
GET MONTH
============================================================
*/

const getMonth =
    async (
        workerId,
        year,
        month
    ) => {

        const response =
            await api.get(
                `/ledger/${workerId}/attendance`,
                {
                    params: {
                        year,
                        month,
                    },
                }
            );


        return (
            response.data?.data ||
            {
                absentDates: [],
                records: [],
            }
        );

    };


/*
============================================================
MARK ABSENT
============================================================
*/

const markAbsent =
    async (
        workerId,
        dateKey
    ) => {

        const response =
            await api.put(
                `/ledger/${workerId}/attendance/${dateKey}`
            );


        return response.data?.data;

    };


/*
============================================================
MARK PRESENT
============================================================
*/

const markPresent =
    async (
        workerId,
        dateKey
    ) => {

        const response =
            await api.delete(
                `/ledger/${workerId}/attendance/${dateKey}`
            );


        return response.data?.data;

    };


export default {
    getMonth,

    markAbsent,

    markPresent,
};