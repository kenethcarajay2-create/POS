import {
    create,
} from "zustand";

import authService from "../services/auth.service";


/*
============================================================
LOCAL STORAGE KEYS
============================================================
*/

const TOKEN_KEY =
    "token";

const USER_KEY =
    "user";


/*
============================================================
READ SAVED USER
============================================================
*/

const getSavedUser =
    () => {

        try {

            const savedUser =
                localStorage.getItem(
                    USER_KEY
                );


            if (
                !savedUser
            ) {

                return null;

            }


            return JSON.parse(
                savedUser
            );


        } catch (
            error
        ) {

            console.error(
                "Failed to read saved user:",
                error
            );


            localStorage.removeItem(
                USER_KEY
            );


            return null;

        }

    };


/*
============================================================
SAVE AUTH SESSION
============================================================

Used by:

- normal login
- RFID login

Both login methods should produce the same frontend state.
============================================================
*/

const saveAuthSession =
    (
        data
    ) => {

        localStorage.setItem(
            TOKEN_KEY,
            data.token
        );


        localStorage.setItem(
            USER_KEY,
            JSON.stringify(
                data.user
            )
        );

    };


/*
============================================================
CLEAR AUTH SESSION
============================================================
*/

const clearAuthSession =
    () => {

        localStorage.removeItem(
            TOKEN_KEY
        );


        localStorage.removeItem(
            USER_KEY
        );

    };


/*
============================================================
AUTH STORE
============================================================
*/

const useAuthStore =
    create(
        (
            set
        ) => ({

            /*
            ====================================================
            STATE
            ====================================================
            */

            user:
                getSavedUser(),

            token:
                localStorage.getItem(
                    TOKEN_KEY
                ),

            loading:
                false,

            /*
            Separate state is useful so the Login page can
            show "Reading card..." later if desired.
            */

            rfidLoading:
                false,

            error:
                null,


            /*
            ====================================================
            NORMAL LOGIN
            ====================================================
            */

            login:
                async (
                    credentials
                ) => {

                    try {

                        set({

                            loading:
                                true,

                            error:
                                null,

                        });


                        const data =
                            await authService
                                .login(
                                    credentials
                                );


                        /*
                        ----------------------------------------
                        SAVE SESSION
                        ----------------------------------------
                        */

                        saveAuthSession(
                            data
                        );


                        /*
                        ----------------------------------------
                        UPDATE STORE
                        ----------------------------------------
                        */

                        set({

                            user:
                                data.user,

                            token:
                                data.token,

                            loading:
                                false,

                            rfidLoading:
                                false,

                            error:
                                null,

                        });


                        return true;


                    } catch (
                        error
                    ) {

                        /*
                        ----------------------------------------
                        REMOVE STALE AUTH
                        ----------------------------------------
                        */

                        clearAuthSession();


                        set({

                            user:
                                null,

                            token:
                                null,

                            loading:
                                false,

                            rfidLoading:
                                false,

                            error:
                                error.response
                                    ?.data
                                    ?.message ||
                                "Login failed.",

                        });


                        return false;

                    }

                },


            /*
            ====================================================
            RFID / NFC LOGIN
            ====================================================

            Receives the UID from the card reader.

            Example:

            04A3D8917C2B80

            Backend verifies which user owns the card.
            ====================================================
            */

            rfidLogin:
                async (
                    rfidUid
                ) => {

                    try {

                        set({

                            rfidLoading:
                                true,

                            error:
                                null,

                        });


                        /*
                        ----------------------------------------
                        NORMALIZE FRONTEND VALUE
                        ----------------------------------------

                        Backend still normalizes and validates
                        again. This is only a convenience.
                        ----------------------------------------
                        */

                        const normalizedUid =
                            String(
                                rfidUid ||
                                ""
                            )
                                .replace(
                                    /[^a-zA-Z0-9]/g,
                                    ""
                                )
                                .toUpperCase()
                                .trim();


                        if (
                            !normalizedUid
                        ) {

                            set({

                                rfidLoading:
                                    false,

                                error:
                                    "RFID/NFC card UID is required.",

                            });


                            return false;

                        }


                        /*
                        ----------------------------------------
                        CALL RFID LOGIN
                        ----------------------------------------
                        */

                        const data =
                            await authService
                                .rfidLogin(
                                    normalizedUid
                                );


                        /*
                        ----------------------------------------
                        SAVE SESSION
                        ----------------------------------------
                        */

                        saveAuthSession(
                            data
                        );


                        /*
                        ----------------------------------------
                        UPDATE STORE
                        ----------------------------------------
                        */

                        set({

                            user:
                                data.user,

                            token:
                                data.token,

                            loading:
                                false,

                            rfidLoading:
                                false,

                            error:
                                null,

                        });


                        return true;


                    } catch (
                        error
                    ) {

                        /*
                        ----------------------------------------
                        IMPORTANT

                        Failed card login should not leave an
                        old authenticated user/session behind.
                        ----------------------------------------
                        */

                        clearAuthSession();


                        set({

                            user:
                                null,

                            token:
                                null,

                            loading:
                                false,

                            rfidLoading:
                                false,

                            error:
                                error.response
                                    ?.data
                                    ?.message ||
                                "RFID/NFC login failed.",

                        });


                        return false;

                    }

                },


            /*
            ====================================================
            CLEAR ERROR
            ====================================================

            Useful when another card is tapped after an error.
            ====================================================
            */

            clearError:
                () => {

                    set({

                        error:
                            null,

                    });

                },


            /*
            ====================================================
            UPDATE CURRENT USER
            ====================================================
            */

            setUser:
                (
                    user
                ) => {

                    if (
                        user
                    ) {

                        localStorage.setItem(
                            USER_KEY,
                            JSON.stringify(
                                user
                            )
                        );

                    } else {

                        localStorage.removeItem(
                            USER_KEY
                        );

                    }


                    set({
                        user,
                    });

                },


            /*
            ====================================================
            LOGOUT
            ====================================================
            */

            logout:
                () => {

                    clearAuthSession();


                    set({

                        user:
                            null,

                        token:
                            null,

                        loading:
                            false,

                        rfidLoading:
                            false,

                        error:
                            null,

                    });

                },

        })
    );


export default useAuthStore;