import {
    Navigate,
} from "react-router-dom";

import useAuthStore from "../store/auth.store";

import {
    getDefaultRoute,
} from "./ProtectedRoute";


/*
============================================================
PERMISSION ROUTE
============================================================

ADMIN
    -> Always allowed

OTHER USERS
    -> Must have requested permission
============================================================
*/

function PermissionRoute({
    permission,
    children,
}) {

    const user =
        useAuthStore(
            (state) =>
                state.user
        );


    /*
    ========================================================
    NO USER
    ========================================================
    */

    if (!user) {

        return (

            <Navigate
                to="/login"
                replace
            />

        );

    }


    /*
    ========================================================
    ADMIN BYPASS
    ========================================================

    Admin is NEVER restricted.
    ========================================================
    */

    if (
        user.role ===
        "admin"
    ) {

        return children;

    }


    /*
    ========================================================
    ALLOWED
    ========================================================
    */

    if (
        user.permissions?.[
            permission
        ] === true
    ) {

        return children;

    }


    /*
    ========================================================
    NOT ALLOWED
    ========================================================

    Redirect to the first page this user CAN access.
    ========================================================
    */

    const defaultRoute =
        getDefaultRoute(
            user
        );


    return (

        <Navigate
            to={
                defaultRoute
            }
            replace
        />

    );

}


export default PermissionRoute;