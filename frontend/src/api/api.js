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

        }
        else {

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

        }
        else {

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


/*
============================================================
RESPONSE INTERCEPTOR
============================================================

If the backend returns:

401 Unauthorized

the current authentication session is no longer valid.

Examples:

- JWT expired
- JWT invalid
- user no longer exists
- authentication rejected by backend

When this happens:

1. Remove the token.
2. Remove the active branch.
3. Redirect to the login page.

This gives StorePOS one global session-expiration handler instead
of requiring every page to handle expired sessions separately.
============================================================
*/

api.interceptors.response.use(

    /*
    ========================================================
    SUCCESSFUL RESPONSE
    ========================================================
    */

    (
        response
    ) => {

        return response;

    },


    /*
    ========================================================
    ERROR RESPONSE
    ========================================================
    */

    (
        error
    ) => {

        const status =
            error?.response?.status;


        /*
        ====================================================
        SESSION EXPIRED / UNAUTHORIZED
        ====================================================
        */

        if (
            status ===
            401
        ) {

            /*
            Only perform the logout redirect when a token
            actually exists.

            This prevents an ordinary failed login request
            from causing an unnecessary redirect loop.
            */

            const token =
                localStorage.getItem(
                    TOKEN_KEY
                );


            if (
                token
            ) {

                /*
                ============================================
                CLEAR AUTHENTICATION
                ============================================
                */

                localStorage.removeItem(
                    TOKEN_KEY
                );


                /*
                ============================================
                CLEAR BRANCH SESSION
                ============================================
                */

                localStorage.removeItem(
                    ACTIVE_BRANCH_KEY
                );


                /*
                ============================================
                REDIRECT TO LOGIN
                ============================================

                window.location.replace() is intentional.

                It reloads the React application and prevents
                the expired protected page from remaining in
                the browser history as the current page.
                ============================================
                */

                if (
                    window.location.pathname !==
                    "/login"
                ) {

                    window.location.replace(
                        "/login"
                    );

                }

            }

        }


        return Promise.reject(
            error
        );

    }

);


export default api;