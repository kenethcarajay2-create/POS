import {
    NavLink,
    useNavigate,
} from "react-router-dom";

import {
    FaHome,
    FaBox,
    FaWarehouse,
    FaCashRegister,
    FaChartBar,
    FaUsers,
    FaTruck,
    FaFileAlt,
    FaCog,
    FaSignOutAlt,
    FaBook,
    FaUserTie,
} from "react-icons/fa";

import useAuthStore from "../../store/auth.store";


function Sidebar() {

    /*
    ============================================================
    AUTH
    ============================================================
    */

    const navigate =
        useNavigate();


    const user =
        useAuthStore(
            (state) =>
                state.user
        );


    const logout =
        useAuthStore(
            (state) =>
                state.logout
        );


    /*
    ============================================================
    NAVIGATION
    ============================================================

    permission must match the keys stored in:

    user.permissions
    ============================================================
    */

    const navigation = [

        {
    name: "Dashboard",
    path: "/",
    icon: FaHome,
    permission: "dashboard",
},

        {
            name: "Products",
            path: "/products",
            icon: FaBox,
            permission: "products",
        },

        {
            name: "Inventory",
            path: "/inventory",
            icon: FaWarehouse,
            permission: "inventory",
        },

        {
            name: "POS",
            path: "/pos",
            icon: FaCashRegister,
            permission: "pos",
        },

        {
            name: "Sales",
            path: "/sales",
            icon: FaChartBar,
            permission: "sales",
        },

        {
            name: "Customers",
            path: "/customers",
            icon: FaUsers,
            permission: "customers",
        },

        {
            name: "Suppliers",
            path: "/suppliers",
            icon: FaTruck,
            permission: "suppliers",
        },

        {
            name: "Workers",
            path: "/workers",
            icon: FaUserTie,
            permission: "workers",
        },

        {
            name: "Ledger",
            path: "/ledger",
            icon: FaBook,
            permission: "ledger",
        },

        {
            name: "Reports",
            path: "/reports",
            icon: FaFileAlt,
            permission: "reports",
        },

        {
            name: "Users",
            path: "/users",
            icon: FaUsers,
            permission: "users",
        },

        {
            name: "Settings",
            path: "/settings",
            icon: FaCog,
            permission: "settings",
        },

    ];


    /*
    ============================================================
    PERMISSION CHECK
    ============================================================

    ADMIN:
    Always has access to everything.

    ALL OTHER USERS:
    Must have the matching permission set to true.
    ============================================================
    */

    const hasPermission = (
        permission
    ) => {

        /*
        Not logged in.
        */

        if (!user) {

            return false;

        }


        /*
        ========================================================
        ADMIN BYPASS
        ========================================================

        Admin is NEVER restricted by permissions.

        Even if:
        permissions.sales = false

        Admin still sees Sales.
        ========================================================
        */

        if (
            user.role ===
            "admin"
        ) {

            return true;

        }


        /*
        ========================================================
        NORMAL USER
        ========================================================
        */

        return (
            user.permissions?.[
                permission
            ] === true
        );

    };


    /*
    ============================================================
    FILTER SIDEBAR ITEMS
    ============================================================
    */

    const visibleNavigation =
        navigation.filter(
            (item) =>

                hasPermission(
                    item.permission
                )
        );


    /*
    ============================================================
    LOGOUT
    ============================================================
    */

    const handleLogout =
        async () => {

            try {

                await logout();

            } catch (
                error
            ) {

                console.error(
                    "Logout error:",
                    error
                );

            } finally {

                navigate(
                    "/login",
                    {
                        replace: true,
                    }
                );

            }

        };


    /*
    ============================================================
    USER INITIAL
    ============================================================
    */

    const initials =
        String(
            user?.name ||
            user?.username ||
            "U"
        )
            .trim()
            .charAt(0)
            .toUpperCase();


    /*
    ============================================================
    ROLE LABEL
    ============================================================
    */

    const roleLabels = {

        admin:
            "Administrator",

        manager:
            "Manager",

        cashier:
            "Cashier",

        inventory:
            "Inventory Staff",

        payroll:
            "Payroll",

        custom:
            "Custom",

    };


    const roleLabel =
        roleLabels[
            user?.role
        ] ||
        "User";


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <aside
            className="
                w-56
                min-h-screen
                bg-[#0d1b3a]
                text-white
                flex
                flex-col
            "
        >

            {/* =================================================
                LOGO
            ================================================= */}

            <div className="px-4 py-4">

                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <div
                        className="
                            w-8
                            h-8
                            rounded-lg
                            bg-indigo-600
                            flex
                            items-center
                            justify-center
                        "
                    >

                        <FaCashRegister className="text-sm" />

                    </div>


                    <h1
                        className="
                            text-lg
                            font-bold
                        "
                    >

                        StorePOS

                    </h1>

                </div>

            </div>


            {/* =================================================
                NAVIGATION
            ================================================= */}

            <nav
                className="
                    flex-1
                    px-2
                    overflow-y-auto
                "
            >

                <ul className="space-y-1">

                    {
                        visibleNavigation.map(
                            (
                                item
                            ) => {

                                const Icon =
                                    item.icon;


                                return (

                                    <li
                                        key={
                                            item.name
                                        }
                                    >

                                        <NavLink
    to={item.path}
    className={({ isActive }) =>
        `
        flex items-center gap-3
        px-3 py-2.5
        rounded-lg
        text-sm font-medium
        transition-all duration-200

        ${
            isActive
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
        }
        `
    }
>

                                            <Icon
                                                className="
                                                    text-sm
                                                    shrink-0
                                                "
                                            />


                                            <span>

                                                {
                                                    item.name
                                                }

                                            </span>

                                        </NavLink>

                                    </li>

                                );

                            }
                        )
                    }

                </ul>


                {/* =============================================
                    NO PAGE ACCESS
                ============================================= */}

                {
                    visibleNavigation.length ===
                        0 &&

                    user?.role !==
                        "admin" && (

                        <div
                            className="
                                px-3
                                py-4
                                text-xs
                                text-slate-400
                            "
                        >

                            No pages assigned to this account.

                        </div>

                    )
                }

            </nav>


            {/* =================================================
                DIVIDER
            ================================================= */}

            <div className="px-4">

                <div
                    className="
                        border-t
                        border-white/10
                    "
                />

            </div>


            {/* =================================================
                CURRENT USER
            ================================================= */}

            <div className="p-3">

                <div
                    className="
                        border
                        border-white/10
                        rounded-lg
                        p-2.5
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-2.5
                        "
                    >

                        {/* AVATAR */}

                        <div
                            className="
                                w-8
                                h-8
                                rounded-full
                                bg-indigo-500
                                flex
                                items-center
                                justify-center
                                shrink-0
                                text-xs
                                font-bold
                            "
                        >

                            {initials}

                        </div>


                        {/* USER DETAILS */}

                        <div className="min-w-0">

                            <p
                                className="
                                    text-xs
                                    font-semibold
                                    truncate
                                "
                            >

                                {
                                    user?.name ||
                                    user?.username ||
                                    "User"
                                }

                            </p>


                            <p
                                className="
                                    text-[10px]
                                    text-slate-400
                                    truncate
                                "
                            >

                                {roleLabel}

                            </p>

                        </div>

                    </div>


                    {/* =========================================
                        ADMIN INDICATOR
                    ========================================= */}

                    {
                        user?.role ===
                        "admin" && (

                            <div
                                className="
                                    mt-2
                                    px-2
                                    py-1.5
                                    rounded-md
                                    bg-indigo-500/10
                                    border
                                    border-indigo-400/20
                                "
                            >

                                <p
                                    className="
                                        text-[9px]
                                        text-indigo-300
                                        font-medium
                                    "
                                >

                                    Full System Access

                                </p>

                            </div>

                        )
                    }


                    {/* =========================================
                        LOGOUT
                    ========================================= */}

                    <button
                        type="button"

                        onClick={
                            handleLogout
                        }

                        className="
                            w-full
                            mt-2.5
                            flex
                            items-center
                            gap-2
                            px-2
                            py-1.5
                            rounded-md
                            text-xs
                            text-slate-300
                            hover:bg-white/10
                            hover:text-white
                            transition
                        "
                    >

                        <FaSignOutAlt />


                        <span>
                            Logout
                        </span>

                    </button>

                </div>

            </div>

        </aside>

    );

}


export default Sidebar;