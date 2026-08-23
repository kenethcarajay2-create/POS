import { create } from "zustand";
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

const getSavedUser = () => {

    try {

        const savedUser =
            localStorage.getItem(
                USER_KEY
            );


        if (!savedUser) {

            return null;

        }


        return JSON.parse(
            savedUser
        );


    } catch (error) {

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

            error:
                null,


            /*
            ====================================================
            LOGIN
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
                        SAVE TOKEN
                        ----------------------------------------
                        */

                        localStorage.setItem(
                            TOKEN_KEY,
                            data.token
                        );


                        /*
                        ----------------------------------------
                        SAVE USER

                        IMPORTANT:
                        This includes:

                        name
                        username
                        role
                        permissions
                        ----------------------------------------
                        */

                        localStorage.setItem(
                            USER_KEY,
                            JSON.stringify(
                                data.user
                            )
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

                            error:
                                null,

                        });


                        return true;


                    } catch (
                        error
                    ) {

                        /*
                        Remove potentially stale auth state.
                        */

                        localStorage.removeItem(
                            TOKEN_KEY
                        );


                        localStorage.removeItem(
                            USER_KEY
                        );


                        set({

                            user:
                                null,

                            token:
                                null,

                            loading:
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
            UPDATE CURRENT USER
            ====================================================

            Useful later if Admin changes this user's profile
            or permissions without forcing another login.
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

                    localStorage.removeItem(
                        TOKEN_KEY
                    );


                    localStorage.removeItem(
                        USER_KEY
                    );


                    set({

                        user:
                            null,

                        token:
                            null,

                        error:
                            null,

                    });

                },

        })
    );


export default useAuthStore;