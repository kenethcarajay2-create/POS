import axios from "axios";


/*
============================================================
LOCAL STORAGE KEYS
============================================================
*/

const TOKEN_KEY =
    "token";

const ACTIVE_BRANCH_KEY =
    "activeBranchId";


/*
============================================================
AXIOS INSTANCE
============================================================
*/

const api =
    axios.create({

        baseURL:
            "http://localhost:5000/api",

        headers: {

            "Content-Type":
                "application/json",

        },

    });


/*
============================================================
REQUEST INTERCEPTOR
============================================================

Automatically sends:

Authorization: Bearer <token>

and, when available:

X-Branch-Id: <active branch id>

This keeps branch selection out of individual request bodies.
============================================================
*/

api.interceptors.request.use(

    (
        config
    ) => {

        /*
        ====================================================
        AUTH TOKEN
        ====================================================
        */

        const token =
            localStorage.getItem(
                TOKEN_KEY
            );


        if (
            token
        ) {

            config.headers.Authorization =
                `Bearer ${token}`;

        } else {

            delete config.headers.Authorization;

        }


        /*
        ====================================================
        ACTIVE BRANCH
        ====================================================
        */

        const activeBranchId =
            localStorage.getItem(
                ACTIVE_BRANCH_KEY
            );


        if (
            activeBranchId
        ) {

            config.headers[
                "X-Branch-Id"
            ] =
                activeBranchId;

        } else {

            /*
            Important:

            If no branch is selected, do not send an old/stale
            branch header accidentally.

            The backend may then resolve the user's default
            branch where that behavior is allowed.
            */

            delete config.headers[
                "X-Branch-Id"
            ];

        }


        return config;

    },

    (
        error
    ) => {

        return Promise.reject(
            error
        );

    }

);


export default api;