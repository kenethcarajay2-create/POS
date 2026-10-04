import {
    create,
} from "zustand";

import branchService from "../services/branch.service";

import useAuthStore from "./auth.store";


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
BRANCH STORE
============================================================
*/

const useBranchStore =
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

            branches:
                [],

            defaultBranch:
                null,

            activeBranch:
                null,

            loading:
                false,

            error:
                null,


            /*
            ====================================================
            FETCH ACCESSIBLE BRANCHES
            ====================================================

            This is the main branch initialization function.

            It only allows a branch returned by:

                GET /branches/accessible

            to become active.

            This protects against stale or malformed
            localStorage values.
            ====================================================
            */

            fetchAccessibleBranches:
                async () => {

                    try {

                        set({

                            loading:
                                true,

                            error:
                                null,

                        });


                        /*
                        ----------------------------------------
                        LOAD BACKEND BRANCH CONTEXT
                        ----------------------------------------
                        */

                        const data =
                            await branchService
                                .getAccessibleBranches();


                        const branches =
                            Array.isArray(
                                data?.branches
                            )
                                ? data.branches
                                : [];


                        const defaultBranch =
                            data?.defaultBranch ||
                            null;


                        /*
                        ----------------------------------------
                        NORMALIZE ACCESSIBLE IDS
                        ----------------------------------------
                        */

                        const accessibleIds =
                            branches
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


                        /*
                        ----------------------------------------
                        SAVED BRANCH
                        ----------------------------------------
                        */

                        const savedBranchId =
                            String(
                                localStorage.getItem(
                                    "activeBranchId"
                                ) ||
                                ""
                            );


                        /*
                        ----------------------------------------
                        DEFAULT BRANCH
                        ----------------------------------------
                        */

                        const defaultBranchId =
                            normalizeId(
                                defaultBranch
                            );


                        /*
                        ----------------------------------------
                        RESOLVE VALID ACTIVE BRANCH
                        ----------------------------------------
                        */

                        let activeBranchId =
                            "";


                        /*
                        1. Keep saved branch only if it is still
                           accessible.
                        */

                        if (
                            savedBranchId &&
                            accessibleIds.includes(
                                savedBranchId
                            )
                        ) {

                            activeBranchId =
                                savedBranchId;

                        }


                        /*
                        2. Otherwise use user's default branch.
                        */

                        if (
                            !activeBranchId &&
                            defaultBranchId &&
                            accessibleIds.includes(
                                defaultBranchId
                            )
                        ) {

                            activeBranchId =
                                defaultBranchId;

                        }


                        /*
                        3. Otherwise use first accessible branch.
                        */

                        if (
                            !activeBranchId &&
                            accessibleIds.length >
                                0
                        ) {

                            activeBranchId =
                                accessibleIds[0];

                        }


                        /*
                        ----------------------------------------
                        FIND ACTIVE BRANCH OBJECT
                        ----------------------------------------
                        */

                        const activeBranch =
                            branches.find(
                                (
                                    branch
                                ) => {

                                    return (
                                        normalizeId(
                                            branch
                                        ) ===
                                        activeBranchId
                                    );

                                }
                            ) ||
                            null;


                        /*
                        ----------------------------------------
                        PERSIST VALID BRANCH
                        ----------------------------------------

                        This is the value used by api.js for:

                            X-Branch-Id
                        ----------------------------------------
                        */

                        if (
                            activeBranchId
                        ) {

                            localStorage.setItem(
                                "activeBranchId",
                                activeBranchId
                            );


                            /*
                            Keep auth store synchronized without
                            revalidating against stale user data.
                            */

                            useAuthStore.setState({

                                activeBranchId,

                            });

                        } else {

                            localStorage.removeItem(
                                "activeBranchId"
                            );


                            useAuthStore.setState({

                                activeBranchId:
                                    "",

                            });

                        }


                        /*
                        ----------------------------------------
                        UPDATE BRANCH STORE
                        ----------------------------------------
                        */

                        set({

                            branches,

                            defaultBranch,

                            activeBranch,

                            loading:
                                false,

                            error:
                                null,

                        });


                        return {

                            branches,

                            defaultBranch,

                            activeBranch,

                        };


                    } catch (
                        error
                    ) {

                        console.error(
                            "FETCH ACCESSIBLE BRANCHES ERROR:",
                            error.response
                                ?.data ||
                            error
                        );


                        set({

                            loading:
                                false,

                            error:
                                error.response
                                    ?.data
                                    ?.message ||
                                error.message ||
                                "Unable to load accessible branches.",

                        });


                        throw error;

                    }

                },


            /*
            ====================================================
            SELECT ACTIVE BRANCH
            ====================================================

            Used by the Navbar branch selector.

            Only a branch already loaded from the backend may
            be selected.
            ====================================================
            */

            selectBranch:
                (
                    branchId
                ) => {

                    const {
                        branches,
                        activeBranch,
                    } =
                        get();


                    const normalizedBranchId =
                        normalizeId(
                            branchId
                        );


                    if (
                        !normalizedBranchId
                    ) {

                        console.warn(
                            "Cannot select branch without a valid ID."
                        );


                        return false;

                    }


                    /*
                    ----------------------------------------
                    FIND ACCESSIBLE BRANCH
                    ----------------------------------------
                    */

                    const branch =
                        branches.find(
                            (
                                candidate
                            ) => {

                                return (
                                    normalizeId(
                                        candidate
                                    ) ===
                                    normalizedBranchId
                                );

                            }
                        );


                    if (
                        !branch
                    ) {

                        console.warn(
                            "Attempted to select an inaccessible branch:",
                            normalizedBranchId
                        );


                        return false;

                    }


                    /*
                    ----------------------------------------
                    INACTIVE BRANCH PROTECTION
                    ----------------------------------------
                    */

                    if (
                        branch.isActive ===
                        false
                    ) {

                        console.warn(
                            "Cannot select an inactive branch."
                        );


                        return false;

                    }


                    /*
                    ----------------------------------------
                    ALREADY ACTIVE
                    ----------------------------------------
                    */

                    if (
                        normalizeId(
                            activeBranch
                        ) ===
                        normalizedBranchId
                    ) {

                        return true;

                    }


                    /*
                    ----------------------------------------
                    SAVE ACTIVE BRANCH
                    ----------------------------------------
                    */

                    localStorage.setItem(
                        "activeBranchId",
                        normalizedBranchId
                    );


                    /*
                    Keep auth store synchronized.
                    */

                    useAuthStore.setState({

                        activeBranchId:
                            normalizedBranchId,

                    });


                    /*
                    Update branch store immediately.
                    */

                    set({

                        activeBranch:
                            branch,

                        error:
                            null,

                    });


                    return true;

                },


            /*
            ====================================================
            REFRESH ACTIVE BRANCH
            ====================================================

            Re-fetches accessible branches and revalidates the
            current branch.

            Useful after:

            - creating a branch
            - disabling a branch
            - enabling a branch
            - changing the default branch
            ====================================================
            */

            refreshBranches:
                async () => {

                    return get()
                        .fetchAccessibleBranches();

                },


            /*
            ====================================================
            GET ACTIVE BRANCH ID
            ====================================================
            */

            getActiveBranchId:
                () => {

                    const {
                        activeBranch,
                    } =
                        get();


                    const branchId =
                        normalizeId(
                            activeBranch
                        );


                    if (
                        branchId
                    ) {

                        return branchId;

                    }


                    return String(
                        localStorage.getItem(
                            "activeBranchId"
                        ) ||
                        ""
                    );

                },


            /*
            ====================================================
            GET BRANCH BY ID
            ====================================================
            */

            getBranchById:
                (
                    branchId
                ) => {

                    const {
                        branches,
                    } =
                        get();


                    const normalizedBranchId =
                        normalizeId(
                            branchId
                        );


                    if (
                        !normalizedBranchId
                    ) {

                        return null;

                    }


                    return (
                        branches.find(
                            (
                                branch
                            ) => {

                                return (
                                    normalizeId(
                                        branch
                                    ) ===
                                    normalizedBranchId
                                );

                            }
                        ) ||
                        null
                    );

                },


            /*
            ====================================================
            CLEAR BRANCH STATE
            ====================================================

            Used during logout.

            activeBranchId itself is cleared by auth.store.js.
            ====================================================
            */

            clearBranches:
                () => {

                    set({

                        branches:
                            [],

                        defaultBranch:
                            null,

                        activeBranch:
                            null,

                        loading:
                            false,

                        error:
                            null,

                    });

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

        })
    );


export default useBranchStore;