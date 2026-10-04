import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    FaStore,
    FaExchangeAlt,
} from "react-icons/fa";

import useAuthStore from "../../store/auth.store";

import useBranchStore from "../../store/branch.store";


/*
============================================================
GET ID
============================================================
*/

const getId =
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
NAVBAR
============================================================
*/

function Navbar() {

    const navigate =
        useNavigate();


    /*
    ========================================================
    AUTH
    ========================================================
    */

    const user =
        useAuthStore(
            (
                state
            ) =>
                state.user
        );


    const activeBranchId =
        useAuthStore(
            (
                state
            ) =>
                state.activeBranchId
        );


    const logout =
        useAuthStore(
            (
                state
            ) =>
                state.logout
        );


    /*
    ========================================================
    BRANCH STORE
    ========================================================
    */

    const branches =
        useBranchStore(
            (
                state
            ) =>
                state.branches
        );


    const activeBranch =
        useBranchStore(
            (
                state
            ) =>
                state.activeBranch
        );


    const loadingBranches =
        useBranchStore(
            (
                state
            ) =>
                state.loading
        );


    const fetchAccessibleBranches =
        useBranchStore(
            (
                state
            ) =>
                state.fetchAccessibleBranches
        );


    const selectBranch =
        useBranchStore(
            (
                state
            ) =>
                state.selectBranch
        );


    const clearBranches =
        useBranchStore(
            (
                state
            ) =>
                state.clearBranches
        );


    /*
    ========================================================
    SWITCHING STATE
    ========================================================
    */

    const [
        switching,
        setSwitching,
    ] =
        useState(
            false
        );


    /*
    ========================================================
    LOAD BRANCHES
    ========================================================
    */

    useEffect(
        () => {

            if (
                !user
            ) {

                clearBranches();

                return;

            }


            fetchAccessibleBranches()
                .catch(
                    (
                        error
                    ) => {

                        console.error(
                            "Unable to initialize branch selector:",
                            error
                        );

                    }
                );

        },
        [
            user,
            fetchAccessibleBranches,
            clearBranches,
        ]
    );


    /*
    ========================================================
    BRANCH CHANGE
    ========================================================

    Full reload is deliberate for now.

    It guarantees every branch-sensitive Zustand store and
    page starts cleanly under the newly selected branch.

    Later we can replace this with store-by-store invalidation.
    ========================================================
    */

    const handleBranchChange =
        (
            event
        ) => {

            const branchId =
                event.target.value;


            if (
                !branchId ||
                branchId ===
                    activeBranchId
            ) {

                return;

            }


            setSwitching(
                true
            );


            const changed =
                selectBranch(
                    branchId
                );


            if (
                !changed
            ) {

                setSwitching(
                    false
                );

                return;

            }


            /*
            activeBranchId is already saved to localStorage.

            Reload ensures:

            Products
            Inventory
            POS
            Sales
            Dashboard
            Reports
            Ledger

            all load using the new X-Branch-Id.
            */

            window.location.reload();

        };


    /*
    ========================================================
    LOGOUT
    ========================================================
    */

    const handleLogout =
        () => {

            clearBranches();

            logout();


            navigate(
                "/login",
                {
                    replace:
                        true,
                }
            );

        };


    /*
    ========================================================
    ROLE
    ========================================================
    */

    const roleLabel =
        user?.role ===
            "admin"
            ? "Administrator"

            : user?.role ===
              "manager"
                ? "Manager"

                : user?.role ===
                  "cashier"
                    ? "Cashier"

                    : user?.role ===
                      "inventory"
                        ? "Inventory Staff"

                        : user?.role ===
                          "payroll"
                            ? "Payroll"

                            : "Staff";


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <div
            className="
                navbar
                bg-base-100
                border-b
                border-base-200
                px-4
                min-h-16
            "
        >

            {/* =================================================
                LEFT
            ================================================= */}

            <div className="flex-1">

                <div>

                    <h1 className="text-xl font-bold">

                        StorePOS

                    </h1>


                    {
                        activeBranch &&
                        (

                            <p className="mt-0.5 text-[10px] text-base-content/40">

                                {
                                    activeBranch.name
                                }

                                {
                                    activeBranch.code
                                        ? ` • ${activeBranch.code}`
                                        : ""
                                }

                            </p>

                        )
                    }

                </div>

            </div>


            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="flex items-center gap-3">


                {/* =============================================
                    BRANCH SELECTOR
                ============================================= */}

                <div className="hidden items-center gap-2 sm:flex">

                    <FaStore className="text-primary" />


                    {
                        loadingBranches &&
                        branches.length ===
                            0
                            ? (

                                <div className="flex items-center gap-2">

                                    <span className="loading loading-spinner loading-xs" />

                                    <span className="text-xs text-base-content/50">

                                        Loading branches...

                                    </span>

                                </div>

                            )
                            : branches.length >
                              1
                                ? (

                                    <div className="relative">

                                        <select
                                            value={
                                                activeBranchId ||
                                                getId(
                                                    activeBranch
                                                )
                                            }
                                            onChange={
                                                handleBranchChange
                                            }
                                            disabled={
                                                switching
                                            }
                                            className="
                                                select
                                                select-bordered
                                                select-sm
                                                min-w-[210px]
                                                pr-10
                                            "
                                            aria-label="Active branch"
                                        >

                                            {
                                                branches.map(
                                                    (
                                                        branch
                                                    ) => (

                                                        <option
                                                            key={
                                                                getId(
                                                                    branch
                                                                )
                                                            }
                                                            value={
                                                                getId(
                                                                    branch
                                                                )
                                                            }
                                                        >

                                                            {
                                                                branch.code
                                                                    ? `${branch.code} — ${branch.name}`
                                                                    : branch.name
                                                            }

                                                        </option>

                                                    )
                                                )
                                            }

                                        </select>


                                        {
                                            switching &&
                                            (

                                                <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs" />

                                            )
                                        }

                                    </div>

                                )
                                : activeBranch
                                    ? (

                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-2
                                                rounded-lg
                                                border
                                                border-base-300
                                                px-3
                                                py-1.5
                                            "
                                        >

                                            <span className="text-xs font-semibold">

                                                {
                                                    activeBranch.code ||
                                                    activeBranch.name
                                                }

                                            </span>

                                        </div>

                                    )
                                    : (

                                        <span className="text-xs text-warning">

                                            No branch

                                        </span>

                                    )
                    }

                </div>


                {/* =============================================
                    SWITCH INDICATOR
                ============================================= */}

                {
                    switching &&
                    (

                        <div className="hidden items-center gap-1 text-xs text-base-content/50 lg:flex">

                            <FaExchangeAlt />

                            Switching

                        </div>

                    )
                }


                {/* =============================================
                    USER
                ============================================= */}

                <div className="hidden flex-col items-end sm:flex">

                    <span className="max-w-[160px] truncate text-sm font-medium">

                        {
                            user?.name ||
                            user?.username ||
                            "User"
                        }

                    </span>


                    <span className="text-[10px] text-base-content/45">

                        {roleLabel}

                    </span>

                </div>


                {/* =============================================
                    LOGOUT
                ============================================= */}

                <button
                    type="button"
                    className="btn btn-error btn-sm"
                    onClick={
                        handleLogout
                    }
                    disabled={
                        switching
                    }
                >

                    Logout

                </button>

            </div>

        </div>

    );

}


export default Navbar;