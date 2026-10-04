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

const ACTIVE_BRANCH_KEY =
    "activeBranchId";


/*
============================================================
NORMALIZE ID
============================================================
*/

const normalizeId =
    (
        value
    ) => {

        if (
            !value
        ) {

            return "";

        }


        if (
            typeof value ===
            "object"
        ) {

            return String(
                value._id ||
                value.id ||
                ""
            );

        }


        return String(
            value
        );

    };


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
GET USER BRANCH IDS
============================================================
*/

const getUserBranchIds =
    (
        user
    ) => {

        if (
            !Array.isArray(
                user?.branches
            )
        ) {

            return [];

        }


        return user.branches
            .map(
                (
                    branch
                ) =>
                    normalizeId(
                        branch
                    )
            )
            .filter(
                Boolean
            );

    };


/*
============================================================
GET DEFAULT BRANCH ID
============================================================
*/

const getDefaultBranchId =
    (
        user
    ) => {

        return normalizeId(
            user?.defaultBranch
        );

    };


/*
============================================================
RESOLVE ACTIVE BRANCH
============================================================

Login establishes a valid branch context.

Priority:

1. Existing saved branch if still accessible
2. User default branch
3. First accessible branch

For administrators, the backend may expose all active branches
through user.branches.

============================================================
*/

const resolveActiveBranchId =
    (
        user
    ) => {

        const savedBranchId =
            String(
                localStorage.getItem(
                    ACTIVE_BRANCH_KEY
                ) ||
                ""
            );


        const defaultBranchId =
            getDefaultBranchId(
                user
            );


        const branchIds =
            getUserBranchIds(
                user
            );


        /*
        ========================================================
        SAVED BRANCH
        ========================================================

        Keep the user's previously selected branch only when it
        is still part of their accessible branches.
        ========================================================
        */

        if (
            savedBranchId &&
            branchIds.includes(
                savedBranchId
            )
        ) {

            return savedBranchId;

        }


        /*
        ========================================================
        DEFAULT BRANCH
        ========================================================
        */

        if (
            defaultBranchId
        ) {

            return defaultBranchId;

        }


        /*
        ========================================================
        FIRST ACCESSIBLE BRANCH
        ========================================================
        */

        if (
            branchIds.length >
            0
        ) {

            return branchIds[0];

        }


        return "";

    };


/*
============================================================
SAVE AUTH SESSION
============================================================

Used by:

- normal password login
- RFID/NFC login

Also establishes the active branch.
============================================================
*/

const saveAuthSession =
    (
        data
    ) => {

        if (
            !data?.token ||
            !data?.user
        ) {

            throw new Error(
                "Invalid authentication response."
            );

        }


        /*
        ========================================================
        TOKEN
        ========================================================
        */

        localStorage.setItem(
            TOKEN_KEY,
            data.token
        );


        /*
        ========================================================
        USER
        ========================================================
        */

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(
                data.user
            )
        );


        /*
        ========================================================
        ACTIVE BRANCH
        ========================================================
        */

        const activeBranchId =
            resolveActiveBranchId(
                data.user
            );


        if (
            activeBranchId
        ) {

            localStorage.setItem(
                ACTIVE_BRANCH_KEY,
                activeBranchId
            );

        } else {

            localStorage.removeItem(
                ACTIVE_BRANCH_KEY
            );

        }


        return activeBranchId;

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


        /*
        Do not leave a previous user's branch behind.

        Otherwise another user could temporarily send requests
        using the previous user's branch context.
        */

        localStorage.removeItem(
            ACTIVE_BRANCH_KEY
        );

    };


/*
============================================================
INITIAL STATE
============================================================
*/

const initialUser =
    getSavedUser();


const initialActiveBranchId =
    (() => {

        if (
            !initialUser
        ) {

            return "";

        }


        return (
            localStorage.getItem(
                ACTIVE_BRANCH_KEY
            ) ||
            resolveActiveBranchId(
                initialUser
            ) ||
            ""
        );

    })();


/*
============================================================
AUTH STORE
============================================================
*/

const useAuthStore =
    create(
        (
            set,
            get
        ) => ({

            /*
            ====================================================
            STATE
            ====================================================
            */

            user:
                initialUser,

            token:
                localStorage.getItem(
                    TOKEN_KEY
                ),

            activeBranchId:
                initialActiveBranchId,

            loading:
                false,

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

                            rfidLoading:
                                false,

                            error:
                                null,

                        });


                        /*
                        =================================================
                        CALL BACKEND
                        =================================================
                        */

                        const data =
                            await authService
                                .login(
                                    credentials
                                );


                        /*
                        =================================================
                        SAVE SESSION + BRANCH
                        =================================================
                        */

                        const activeBranchId =
                            saveAuthSession(
                                data
                            );


                        /*
                        =================================================
                        UPDATE STORE
                        =================================================
                        */

                        set({

                            user:
                                data.user,

                            token:
                                data.token,

                            activeBranchId,

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

                        console.error(
                            "LOGIN ERROR:",
                            error.response
                                ?.data ||
                            error
                        );


                        /*
                        =================================================
                        REMOVE FAILED / STALE SESSION
                        =================================================
                        */

                        clearAuthSession();


                        set({

                            user:
                                null,

                            token:
                                null,

                            activeBranchId:
                                "",

                            loading:
                                false,

                            rfidLoading:
                                false,

                            error:
                                error.response
                                    ?.data
                                    ?.message ||
                                error.message ||
                                "Login failed.",

                        });


                        return false;

                    }

                },


            /*
            ====================================================
            RFID / NFC LOGIN
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

                            loading:
                                false,

                            error:
                                null,

                        });


                        /*
                        =================================================
                        NORMALIZE UID
                        =================================================
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
                        =================================================
                        CALL BACKEND
                        =================================================
                        */

                        const data =
                            await authService
                                .rfidLogin(
                                    normalizedUid
                                );


                        /*
                        =================================================
                        SAVE SESSION + BRANCH
                        =================================================
                        */

                        const activeBranchId =
                            saveAuthSession(
                                data
                            );


                        /*
                        =================================================
                        UPDATE STORE
                        =================================================
                        */

                        set({

                            user:
                                data.user,

                            token:
                                data.token,

                            activeBranchId,

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

                        console.error(
                            "RFID LOGIN ERROR:",
                            error.response
                                ?.data ||
                            error
                        );


                        /*
                        Failed RFID authentication must not leave an
                        old user's authentication or branch context.
                        */

                        clearAuthSession();


                        set({

                            user:
                                null,

                            token:
                                null,

                            activeBranchId:
                                "",

                            loading:
                                false,

                            rfidLoading:
                                false,

                            error:
                                error.response
                                    ?.data
                                    ?.message ||
                                error.message ||
                                "RFID/NFC login failed.",

                        });


                        return false;

                    }

                },


            /*
            ====================================================
            SET ACTIVE BRANCH
            ====================================================

            This is used by the branch selector.

            The Axios interceptor reads the same localStorage
            key before every request.
            ====================================================
            */

            setActiveBranch:
                (
                    branch
                ) => {

                    const branchId =
                        normalizeId(
                            branch
                        );


                    if (
                        !branchId
                    ) {

                        return false;

                    }


                    const user =
                        get()
                            .user;


                    if (
                        !user
                    ) {

                        return false;

                    }


                    const branchIds =
                        getUserBranchIds(
                            user
                        );


                    /*
                    Do not allow the frontend store to select a
                    branch outside the authenticated user's list.

                    Backend authorization remains the final
                    security boundary.
                    */

                    if (
                        branchIds.length >
                            0 &&
                        !branchIds.includes(
                            branchId
                        )
                    ) {

                        console.warn(
                            "Attempted to select an inaccessible branch:",
                            branchId
                        );


                        return false;

                    }


                    localStorage.setItem(
                        ACTIVE_BRANCH_KEY,
                        branchId
                    );


                    set({

                        activeBranchId:
                            branchId,

                    });


                    return true;

                },


            /*
            ====================================================
            GET ACTIVE BRANCH
            ====================================================
            */

            getActiveBranch:
                () => {

                    const {
                        user,
                        activeBranchId,
                    } =
                        get();


                    if (
                        !user ||
                        !activeBranchId
                    ) {

                        return null;

                    }


                    if (
                        !Array.isArray(
                            user.branches
                        )
                    ) {

                        return null;

                    }


                    return (
                        user.branches.find(
                            (
                                branch
                            ) => {

                                return (
                                    normalizeId(
                                        branch
                                    ) ===
                                    String(
                                        activeBranchId
                                    )
                                );

                            }
                        ) ||
                        null
                    );

                },


            /*
            ====================================================
            CLEAR ERROR
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


                        /*
                        Revalidate active branch after user data
                        changes, such as branch permissions.
                        */

                        const activeBranchId =
                            resolveActiveBranchId(
                                user
                            );


                        if (
                            activeBranchId
                        ) {

                            localStorage.setItem(
                                ACTIVE_BRANCH_KEY,
                                activeBranchId
                            );

                        } else {

                            localStorage.removeItem(
                                ACTIVE_BRANCH_KEY
                            );

                        }


                        set({

                            user,

                            activeBranchId,

                        });


                        return;

                    }


                    localStorage.removeItem(
                        USER_KEY
                    );


                    localStorage.removeItem(
                        ACTIVE_BRANCH_KEY
                    );


                    set({

                        user:
                            null,

                        activeBranchId:
                            "",

                    });

                },


            /*
            ====================================================
            REFRESH BRANCH CONTEXT
            ====================================================

            Useful after branch-management changes without
            requiring another login.
            ====================================================
            */

            refreshBranchContext:
                () => {

                    const user =
                        get()
                            .user;


                    if (
                        !user
                    ) {

                        localStorage.removeItem(
                            ACTIVE_BRANCH_KEY
                        );


                        set({

                            activeBranchId:
                                "",

                        });


                        return "";

                    }


                    const activeBranchId =
                        resolveActiveBranchId(
                            user
                        );


                    if (
                        activeBranchId
                    ) {

                        localStorage.setItem(
                            ACTIVE_BRANCH_KEY,
                            activeBranchId
                        );

                    } else {

                        localStorage.removeItem(
                            ACTIVE_BRANCH_KEY
                        );

                    }


                    set({

                        activeBranchId,

                    });


                    return activeBranchId;

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

                        activeBranchId:
                            "",

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