import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";


/*
============================================================
AUTH
============================================================
*/

import LoginPage from "../pages/Auth/LoginPage";


/*
============================================================
LAYOUT
============================================================
*/

import DashboardLayout from "../layouts/DashboardLayout";


/*
============================================================
ROUTE GUARDS
============================================================
*/

import ProtectedRoute, {
    getDefaultRoute,
} from "./ProtectedRoute";

import PermissionRoute from "./PermissionRoute";


/*
============================================================
STORE
============================================================
*/

import useAuthStore from "../store/auth.store";


/*
============================================================
PAGES
============================================================
*/

import DashboardPage from "../pages/Dashboard/DashboardPage";

import ProductsPage from "../pages/Products/ProductsPage";

import POSPage from "../pages/POS/POSPage";

import SalesPage from "../pages/Sales/SalesPage";

import InventoryPage from "../pages/Inventory/InventoryPage";

import LedgerPage from "../pages/Ledger/LedgerPage";

import WorkersPage from "../pages/Workers/WorkersPage";

import UsersPage from "../pages/Users/UsersPage";
import SettingsPage from "../pages/Settings/SettingsPage";

/*
============================================================
REPORTS
============================================================
*/

import ReportsPage from "../pages/reports/ReportsPage";

import SalesReportPage from "../pages/reports/SalesReportPage";

import ProductsReportPage from "../pages/reports/ProductsReportPage";


/*
============================================================
LANDING REDIRECT
============================================================
*/

function LandingRedirect() {

    const user =
        useAuthStore(
            (state) =>
                state.user
        );


    if (!user) {

        return (

            <Navigate
                to="/login"
                replace
            />

        );

    }


    return (

        <Navigate
            to={
                getDefaultRoute(
                    user
                )
            }
            replace
        />

    );

}


/*
============================================================
NO ACCESS PAGE
============================================================
*/

function NoAccessPage() {

    const logout =
        useAuthStore(
            (state) =>
                state.logout
        );


    return (

        <div
            className="
                min-h-[70vh]
                flex
                items-center
                justify-center
            "
        >

            <div
                className="
                    max-w-md
                    w-full
                    bg-base-100
                    border
                    border-base-200
                    rounded-2xl
                    shadow-sm
                    p-8
                    text-center
                "
            >

                <div
                    className="
                        w-14
                        h-14
                        mx-auto
                        rounded-full
                        bg-warning/10
                        text-warning
                        flex
                        items-center
                        justify-center
                        text-2xl
                    "
                >

                    !

                </div>


                <h1
                    className="
                        mt-4
                        text-xl
                        font-bold
                    "
                >

                    No Page Access

                </h1>


                <p
                    className="
                        mt-2
                        text-sm
                        text-base-content/55
                    "
                >

                    No pages have been assigned to this
                    account. Please contact an administrator.

                </p>


                <button
                    type="button"
                    className="
                        btn
                        btn-primary
                        mt-5
                    "
                    onClick={
                        logout
                    }
                >

                    Logout

                </button>

            </div>

        </div>

    );

}


/*
============================================================
APP ROUTES
============================================================
*/

function AppRoutes() {

    return (

        <BrowserRouter>

            <Routes>


                {/* ==========================================
                    PUBLIC
                ========================================== */}

                <Route
                    path="/login"
                    element={
                        <LoginPage />
                    }
                />


                {/* ==========================================
                    AUTHENTICATED APPLICATION
                ========================================== */}

                <Route
                    element={

                        <ProtectedRoute>

                            <DashboardLayout />

                        </ProtectedRoute>

                    }
                >


                    {/* ======================================
                        SMART LANDING PAGE
                    ======================================

                    Admin:
                    /

                    -> /dashboard


                    Kenneth:
                    POS = true
                    Sales = true

                    -> /pos
                    ====================================== */}

                    <Route
                        path="/"
                        element={
                            <LandingRedirect />
                        }
                    />


                    {/* ======================================
                        DASHBOARD
                    ====================================== */}

                    <Route
                        path="/dashboard"
                        element={

                            <PermissionRoute
                                permission="dashboard"
                            >

                                <DashboardPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        PRODUCTS
                    ====================================== */}

                    <Route
                        path="/products"
                        element={

                            <PermissionRoute
                                permission="products"
                            >

                                <ProductsPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        INVENTORY
                    ====================================== */}

                    <Route
                        path="/inventory"
                        element={

                            <PermissionRoute
                                permission="inventory"
                            >

                                <InventoryPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        POS
                    ====================================== */}

                    <Route
                        path="/pos"
                        element={

                            <PermissionRoute
                                permission="pos"
                            >

                                <POSPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        SALES
                    ====================================== */}

                    <Route
                        path="/sales"
                        element={

                            <PermissionRoute
                                permission="sales"
                            >

                                <SalesPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        REPORTS
                    ====================================== */}

                    <Route
                        path="/reports"
                        element={

                            <PermissionRoute
                                permission="reports"
                            >

                                <ReportsPage />

                            </PermissionRoute>

                        }
                    />


                    <Route
                        path="/reports/sales"
                        element={

                            <PermissionRoute
                                permission="reports"
                            >

                                <SalesReportPage />

                            </PermissionRoute>

                        }
                    />


                    <Route
                        path="/reports/products"
                        element={

                            <PermissionRoute
                                permission="reports"
                            >

                                <ProductsReportPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        LEDGER
                    ====================================== */}

                    <Route
                        path="/ledger"
                        element={

                            <PermissionRoute
                                permission="ledger"
                            >

                                <LedgerPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        WORKERS
                    ====================================== */}

                    <Route
                        path="/workers"
                        element={

                            <PermissionRoute
                                permission="workers"
                            >

                                <WorkersPage />

                            </PermissionRoute>

                        }
                    />


                    {/* ======================================
                        USERS
                    ====================================== */}

                    <Route
                        path="/users"
                        element={

                            <PermissionRoute
                                permission="users"
                            >

                                <UsersPage />

                            </PermissionRoute>

                        }
                    />

                    
{/* ======================================
    SETTINGS
====================================== */}

<Route
    path="/settings"
    element={

        <PermissionRoute
            permission="settings"
        >

            <SettingsPage />

        </PermissionRoute>

    }
    />


                    {/* ======================================
                        NO ACCESS
                    ====================================== */}

                    <Route
                        path="/no-access"
                        element={
                            <NoAccessPage />
                        }
                    />

                </Route>


                {/* ==========================================
                    UNKNOWN ROUTE
                ========================================== */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

               

            </Routes>

        </BrowserRouter>

    );

}


export default AppRoutes;