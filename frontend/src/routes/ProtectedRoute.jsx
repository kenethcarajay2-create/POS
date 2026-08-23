import {
    Navigate,
    useLocation,
} from "react-router-dom";

import useAuthStore from "../store/auth.store";


/*
============================================================
GET FIRST ALLOWED PAGE
============================================================

ADMIN:
    Dashboard

OTHER USERS:
    First page they have permission to access.
============================================================
*/

export const getDefaultRoute = (
    user
) => {

    if (!user) {

        return "/login";

    }


    /*
    --------------------------------------------------------
    ADMIN ALWAYS GETS DASHBOARD
    --------------------------------------------------------
    */

    if (
        user.role ===
        "admin"
    ) {

        return "/dashboard";

    }


    /*
    --------------------------------------------------------
    USER PERMISSION ORDER
    --------------------------------------------------------

    This determines where a user lands after login.

    Example:

    POS + Sales
    -> /pos
    --------------------------------------------------------
    */

    const routes = [

        {
            permission:
                "dashboard",

            path:
                "/dashboard",
        },

        {
            permission:
                "pos",

            path:
                "/pos",
        },

        {
            permission:
                "sales",

            path:
                "/sales",
        },

        {
            permission:
                "products",

            path:
                "/products",
        },

        {
            permission:
                "inventory",

            path:
                "/inventory",
        },

        {
            permission:
                "customers",

            path:
                "/customers",
        },

        {
            permission:
                "suppliers",

            path:
                "/suppliers",
        },

        {
            permission:
                "workers",

            path:
                "/workers",
        },

        {
            permission:
                "ledger",

            path:
                "/ledger",
        },

        {
            permission:
                "reports",

            path:
                "/reports",
        },

        {
            permission:
                "users",

            path:
                "/users",
        },

        {
            permission:
                "settings",

            path:
                "/settings",
        },

    ];


    const firstAllowed =
        routes.find(
            (route) =>
                user.permissions?.[
                    route.permission
                ] === true
        );


    /*
    If no pages were assigned, send them
    to the no-access page.
    */

    return (
        firstAllowed?.path ||
        "/no-access"
    );

};


/*
============================================================
PROTECTED ROUTE
============================================================

Checks authentication only.

Individual pages are protected with PermissionRoute.
============================================================
*/

function ProtectedRoute({
    children,
}) {

    const location =
        useLocation();


    const {
        user,
        token,
    } = useAuthStore();


    /*
    ========================================================
    NOT LOGGED IN
    ========================================================
    */

    if (
        !token ||
        !user
    ) {

        return (

            <Navigate
                to="/login"
                replace
                state={{
                    from:
                        location.pathname,
                }}
            />

        );

    }


    /*
    ========================================================
    DISABLED ACCOUNT
    ========================================================
    */

    if (
        user.isActive ===
        false
    ) {

        return (

            <Navigate
                to="/login"
                replace
            />

        );

    }


    return children;

}


export default ProtectedRoute;