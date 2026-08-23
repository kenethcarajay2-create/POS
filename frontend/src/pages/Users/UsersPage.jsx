import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    FaUserPlus,
    FaUsers,
    FaUserShield,
    FaUserTie,
    FaUserCheck,
    FaSearch,
    FaEdit,
    FaTrash,
    FaBan,
    FaCheck,
    FaKey,
    FaEllipsisV,
    FaTimes,
    FaSyncAlt,
    FaBoxes,
    FaMoneyBillWave,
    FaSlidersH,
} from "react-icons/fa";

import userService from "../../services/user.service";


/*
============================================================
PERMISSIONS
============================================================
*/

const PERMISSIONS = [
    {
        key: "dashboard",
        label: "Dashboard",
        description: "View the main dashboard.",
    },
    {
        key: "products",
        label: "Products",
        description: "View the products page.",
    },
    {
        key: "inventory",
        label: "Inventory",
        description: "View inventory and stock.",
    },
    {
        key: "pos",
        label: "POS",
        description: "Access the point of sale.",
    },
    {
        key: "sales",
        label: "Sales",
        description: "View sales and receipts.",
    },
    {
        key: "customers",
        label: "Customers",
        description: "Access customer accounts.",
    },
    {
        key: "suppliers",
        label: "Suppliers",
        description: "Access supplier records.",
    },
    {
        key: "workers",
        label: "Workers",
        description: "Access worker records.",
    },
    {
        key: "ledger",
        label: "Ledger",
        description: "Access account ledgers.",
    },
    {
        key: "reports",
        label: "Reports",
        description: "View reports.",
    },
    {
        key: "users",
        label: "Users",
        description: "Access user management.",
    },
    {
        key: "settings",
        label: "Settings",
        description: "Access system settings.",
    },
];


/*
============================================================
EMPTY PERMISSIONS
============================================================
*/

const EMPTY_PERMISSIONS = {

    dashboard: true,

    products: false,

    inventory: false,

    pos: false,

    sales: false,

    customers: false,

    suppliers: false,

    workers: false,

    ledger: false,

    reports: false,

    users: false,

    settings: false,

};


/*
============================================================
ROLE PRESETS
============================================================
*/

const ROLE_PRESETS = {

    admin: {
        dashboard: true,
        products: true,
        inventory: true,
        pos: true,
        sales: true,
        customers: true,
        suppliers: true,
        workers: true,
        ledger: true,
        reports: true,
        users: true,
        settings: true,
    },

    manager: {
        dashboard: true,
        products: true,
        inventory: true,
        pos: true,
        sales: true,
        customers: true,
        suppliers: true,
        workers: true,
        ledger: true,
        reports: true,
        users: false,
        settings: false,
    },

    cashier: {
        dashboard: true,
        products: true,
        inventory: false,
        pos: true,
        sales: true,
        customers: true,
        suppliers: false,
        workers: false,
        ledger: false,
        reports: false,
        users: false,
        settings: false,
    },

    inventory: {
        dashboard: true,
        products: true,
        inventory: true,
        pos: false,
        sales: false,
        customers: false,
        suppliers: true,
        workers: false,
        ledger: false,
        reports: true,
        users: false,
        settings: false,
    },

    payroll: {
        dashboard: true,
        products: false,
        inventory: false,
        pos: false,
        sales: false,
        customers: false,
        suppliers: false,
        workers: true,
        ledger: true,
        reports: true,
        users: false,
        settings: false,
    },

    custom: {
        ...EMPTY_PERMISSIONS,
    },

};


/*
============================================================
ROLE LABELS
============================================================
*/

const ROLE_LABELS = {

    admin: "Administrator",

    manager: "Manager",

    cashier: "Cashier",

    inventory: "Inventory Staff",

    payroll: "Payroll",

    custom: "Custom",

};


/*
============================================================
USERS PAGE
============================================================
*/

function UsersPage() {

    /*
    ==========================================================
    STATE
    ==========================================================
    */

    const [users, setUsers] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);

    const [search, setSearch] =
        useState("");

    const [roleFilter, setRoleFilter] =
        useState("all");

    const [statusFilter, setStatusFilter] =
        useState("all");

    const [openMenu, setOpenMenu] =
        useState(null);

    const [showUserModal, setShowUserModal] =
        useState(false);

    const [selectedUser, setSelectedUser] =
        useState(null);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [showPasswordModal, setShowPasswordModal] =
        useState(false);

    const [saving, setSaving] =
        useState(false);


    /*
    ==========================================================
    EMPTY USER FORM
    ==========================================================
    */

    const createEmptyForm = () => ({

        name: "",

        username: "",

        password: "",

        confirmPassword: "",

        role: "cashier",

        permissions: {
            ...ROLE_PRESETS.cashier,
        },

    });


    const [form, setForm] =
        useState(createEmptyForm);


    /*
    ==========================================================
    PASSWORD FORM
    ==========================================================
    */

    const [passwordForm, setPasswordForm] =
        useState({

            password: "",

            confirmPassword: "",

        });


    /*
    ==========================================================
    LOAD USERS
    ==========================================================
    */

    const loadUsers = async () => {

        try {

            setLoading(true);

            setError(null);


            const data =
                await userService.getUsers();


            setUsers(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (error) {

            console.error(
                "Failed to load users:",
                error
            );


            setError(
                error.response?.data?.message ||
                "Failed to load users."
            );

        } finally {

            setLoading(false);

        }

    };


    /*
    ==========================================================
    INITIAL LOAD
    ==========================================================
    */

    useEffect(() => {

        loadUsers();

    }, []);


    /*
    ==========================================================
    FILTERED USERS
    ==========================================================
    */

    const filteredUsers =
        useMemo(() => {

            return users.filter(
                (user) => {

                    const query =
                        search
                            .trim()
                            .toLowerCase();


                    const matchesSearch =
                        !query ||

                        user.name
                            ?.toLowerCase()
                            .includes(query) ||

                        user.username
                            ?.toLowerCase()
                            .includes(query);


                    const matchesRole =
                        roleFilter === "all" ||
                        user.role === roleFilter;


                    const matchesStatus =
                        statusFilter === "all" ||

                        (
                            statusFilter === "active" &&
                            user.isActive === true
                        ) ||

                        (
                            statusFilter === "inactive" &&
                            user.isActive === false
                        );


                    return (
                        matchesSearch &&
                        matchesRole &&
                        matchesStatus
                    );

                }
            );

        }, [
            users,
            search,
            roleFilter,
            statusFilter,
        ]);


    /*
    ==========================================================
    SUMMARY
    ==========================================================
    */

    const totalUsers =
        users.length;


    const totalAdmins =
        users.filter(
            (user) =>
                user.role === "admin"
        ).length;


    const totalCashiers =
        users.filter(
            (user) =>
                user.role === "cashier"
        ).length;


    const activeUsers =
        users.filter(
            (user) =>
                user.isActive === true
        ).length;


    /*
    ==========================================================
    DATE
    ==========================================================
    */

    const formatDate = (date) => {

        if (!date) {

            return "-";

        }


        try {

            return new Date(
                date
            ).toLocaleDateString(
                "en-PH",
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }
            );

        } catch {

            return "-";

        }

    };


    /*
    ==========================================================
    OPEN ADD USER
    ==========================================================
    */

    const openAddUser = () => {

        setSelectedUser(null);

        setForm(
            createEmptyForm()
        );

        setShowUserModal(true);

        setOpenMenu(null);

    };


    /*
    ==========================================================
    OPEN EDIT USER
    ==========================================================
    */

    const openEditUser = (user) => {

        setSelectedUser(user);


        const role =
            user.role ||
            "cashier";


        const preset =
            ROLE_PRESETS[role] ||
            ROLE_PRESETS.custom;


        setForm({

            name:
                user.name || "",

            username:
                user.username || "",

            password: "",

            confirmPassword: "",

            role,

            permissions: {

                ...preset,

                ...(user.permissions || {}),

            },

        });


        setShowUserModal(true);

        setOpenMenu(null);

    };


    /*
    ==========================================================
    ROLE CHANGE
    ==========================================================
    */

    const handleRoleChange = (
        newRole
    ) => {

        setForm(
            (current) => ({

                ...current,

                role:
                    newRole,

                permissions: {
                    ...(
                        ROLE_PRESETS[
                            newRole
                        ] ||
                        ROLE_PRESETS.custom
                    ),
                },

            })
        );

    };


    /*
    ==========================================================
    PERMISSION CHANGE
    ==========================================================
    */

    const togglePermission = (
        key
    ) => {

        /*
        Admin always has full access.
        */

        if (
            form.role ===
            "admin"
        ) {

            return;

        }


        setForm(
            (current) => ({

                ...current,

                permissions: {

                    ...current.permissions,

                    [key]:
                        !current
                            .permissions[
                                key
                            ],

                },

            })
        );

    };


    /*
    ==========================================================
    SELECT ALL PERMISSIONS
    ==========================================================
    */

    const selectAllPermissions =
        () => {

            if (
                form.role ===
                "admin"
            ) {

                return;

            }


            const permissions = {};


            PERMISSIONS.forEach(
                ({ key }) => {

                    permissions[key] =
                        true;

                }
            );


            setForm(
                (current) => ({

                    ...current,

                    permissions,

                })
            );

        };


    /*
    ==========================================================
    CLEAR PERMISSIONS
    ==========================================================
    */

    const clearPermissions =
        () => {

            if (
                form.role ===
                "admin"
            ) {

                return;

            }


            const permissions = {};


            PERMISSIONS.forEach(
                ({ key }) => {

                    permissions[key] =
                        false;

                }
            );


            setForm(
                (current) => ({

                    ...current,

                    permissions,

                })
            );

        };


    /*
    ==========================================================
    RESET TO ROLE PRESET
    ==========================================================
    */

    const resetRolePermissions =
        () => {

            setForm(
                (current) => ({

                    ...current,

                    permissions: {
                        ...(
                            ROLE_PRESETS[
                                current.role
                            ] ||
                            ROLE_PRESETS.custom
                        ),
                    },

                })
            );

        };


    /*
    ==========================================================
    OPEN PASSWORD
    ==========================================================
    */

    const openPasswordModal = (
        user
    ) => {

        setSelectedUser(user);

        setPasswordForm({

            password: "",

            confirmPassword: "",

        });

        setShowPasswordModal(true);

        setOpenMenu(null);

    };


    /*
    ==========================================================
    OPEN DISABLE
    ==========================================================
    */

    const openDeleteModal = (
        user
    ) => {

        setSelectedUser(user);

        setShowDeleteModal(true);

        setOpenMenu(null);

    };


    /*
    ==========================================================
    SAVE USER
    ==========================================================
    */

    const handleSaveUser =
        async () => {

            if (
                !form.name.trim()
            ) {

                alert(
                    "Please enter the user's name."
                );

                return;

            }


            if (
                !form.username.trim()
            ) {

                alert(
                    "Please enter a username."
                );

                return;

            }


            /*
            ----------------------------------------------------
            CREATE
            ----------------------------------------------------
            */

            if (
                !selectedUser
            ) {

                if (
                    !form.password
                ) {

                    alert(
                        "Please enter a password."
                    );

                    return;

                }


                if (
                    form.password.length <
                    6
                ) {

                    alert(
                        "Password must be at least 6 characters."
                    );

                    return;

                }


                if (
                    form.password !==
                    form.confirmPassword
                ) {

                    alert(
                        "Passwords do not match."
                    );

                    return;

                }


                try {

                    setSaving(true);


                    await userService.createUser({

                        name:
                            form.name.trim(),

                        username:
                            form.username.trim(),

                        password:
                            form.password,

                        role:
                            form.role,

                        permissions:
                            form.permissions,

                    });


                    await loadUsers();


                    setShowUserModal(
                        false
                    );

                    setForm(
                        createEmptyForm()
                    );

                    setSelectedUser(
                        null
                    );

                } catch (error) {

                    console.error(
                        "Failed to create user:",
                        error
                    );


                    alert(
                        error.response?.data?.message ||
                        "Failed to create user."
                    );

                } finally {

                    setSaving(false);

                }


                return;

            }


            /*
            ----------------------------------------------------
            UPDATE
            ----------------------------------------------------
            */

            try {

                setSaving(true);


                await userService.updateUser(

                    selectedUser._id,

                    {

                        name:
                            form.name.trim(),

                        username:
                            form.username.trim(),

                        role:
                            form.role,

                        permissions:
                            form.permissions,

                    }

                );


                await loadUsers();


                setShowUserModal(
                    false
                );

                setForm(
                    createEmptyForm()
                );

                setSelectedUser(
                    null
                );

            } catch (error) {

                console.error(
                    "Failed to update user:",
                    error
                );


                alert(
                    error.response?.data?.message ||
                    "Failed to update user."
                );

            } finally {

                setSaving(false);

            }

        };


    /*
    ==========================================================
    TOGGLE STATUS
    ==========================================================
    */

    const toggleUserStatus =
        async (
            user
        ) => {

            try {

                setOpenMenu(null);

                setSaving(true);


                if (
                    user.isActive
                ) {

                    await userService.disableUser(
                        user._id
                    );

                } else {

                    await userService.enableUser(
                        user._id
                    );

                }


                await loadUsers();

            } catch (error) {

                console.error(
                    "Failed to change user status:",
                    error
                );


                alert(
                    error.response?.data?.message ||
                    "Failed to change user status."
                );

            } finally {

                setSaving(false);

            }

        };


    /*
    ==========================================================
    DISABLE USER
    ==========================================================
    */

    const handleDeleteUser =
        async () => {

            if (
                !selectedUser
            ) {

                return;

            }


            try {

                setSaving(true);


                await userService.disableUser(
                    selectedUser._id
                );


                await loadUsers();


                setShowDeleteModal(
                    false
                );

                setSelectedUser(
                    null
                );

            } catch (error) {

                console.error(
                    "Failed to disable user:",
                    error
                );


                alert(
                    error.response?.data?.message ||
                    "Failed to disable user."
                );

            } finally {

                setSaving(false);

            }

        };


    /*
    ==========================================================
    CHANGE PASSWORD
    ==========================================================
    */

    const handleChangePassword =
        async () => {

            if (
                !selectedUser
            ) {

                return;

            }


            if (
                !passwordForm.password
            ) {

                alert(
                    "Please enter a new password."
                );

                return;

            }


            if (
                passwordForm.password.length <
                6
            ) {

                alert(
                    "Password must be at least 6 characters."
                );

                return;

            }


            if (
                passwordForm.password !==
                passwordForm.confirmPassword
            ) {

                alert(
                    "Passwords do not match."
                );

                return;

            }


            try {

                setSaving(true);


                await userService.changePassword(

                    selectedUser._id,

                    passwordForm.password

                );


                setShowPasswordModal(
                    false
                );

                setSelectedUser(
                    null
                );

                setPasswordForm({

                    password: "",

                    confirmPassword: "",

                });


                alert(
                    "Password changed successfully."
                );

            } catch (error) {

                console.error(
                    "Failed to change password:",
                    error
                );


                alert(
                    error.response?.data?.message ||
                    "Failed to change password."
                );

            } finally {

                setSaving(false);

            }

        };


    /*
    ==========================================================
    ROLE BADGE
    ==========================================================
    */

    const RoleBadge = ({
        role,
    }) => {

        if (
            role ===
            "admin"
        ) {

            return (

                <span className="badge badge-primary badge-sm gap-1">

                    <FaUserShield />

                    Administrator

                </span>

            );

        }


        if (
            role ===
            "manager"
        ) {

            return (

                <span className="badge badge-secondary badge-sm gap-1">

                    <FaUserTie />

                    Manager

                </span>

            );

        }


        if (
            role ===
            "inventory"
        ) {

            return (

                <span className="badge badge-warning badge-sm gap-1">

                    <FaBoxes />

                    Inventory

                </span>

            );

        }


        if (
            role ===
            "payroll"
        ) {

            return (

                <span className="badge badge-success badge-sm gap-1">

                    <FaMoneyBillWave />

                    Payroll

                </span>

            );

        }


        if (
            role ===
            "custom"
        ) {

            return (

                <span className="badge badge-ghost badge-sm gap-1">

                    <FaSlidersH />

                    Custom

                </span>

            );

        }


        return (

            <span className="badge badge-info badge-sm gap-1">

                <FaUserTie />

                Cashier

            </span>

        );

    };


    /*
    ==========================================================
    STATUS BADGE
    ==========================================================
    */

    const StatusBadge = ({
        isActive,
    }) => {

        if (
            isActive
        ) {

            return (

                <span className="badge badge-success badge-sm gap-1">

                    <FaCheck />

                    Active

                </span>

            );

        }


        return (

            <span className="badge badge-ghost badge-sm gap-1">

                <FaBan />

                Inactive

            </span>

        );

    };


    /*
    ==========================================================
    AVATAR
    ==========================================================
    */

    const UserAvatar = ({
        user,
    }) => {

        const firstLetter =
            user.name
                ?.charAt(0)
                ?.toUpperCase() ||
            "?";


        return (

            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">

                {firstLetter}

            </div>

        );

    };


    /*
    ==========================================================
    LOADING
    ==========================================================
    */

    if (
        loading &&
        users.length === 0
    ) {

        return (

            <div className="space-y-6">

                <div>

                    <h1 className="text-2xl font-bold">
                        Users
                    </h1>

                    <p className="text-sm text-base-content/60">
                        Manage users, roles and page access.
                    </p>

                </div>


                <div className="bg-base-100 border border-base-200 rounded-xl p-12 flex flex-col items-center justify-center">

                    <span className="loading loading-spinner loading-lg text-primary" />

                    <p className="text-sm text-base-content/50 mt-4">
                        Loading users...
                    </p>

                </div>

            </div>

        );

    }


    /*
    ==========================================================
    RENDER
    ==========================================================
    */

    return (

        <div
            className="space-y-6 pb-8"
            onClick={() =>
                setOpenMenu(null)
            }
        >


            {/* HEADER */}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">

                        <FaUsers />

                    </div>


                    <div>

                        <h1 className="text-2xl font-bold">
                            Users
                        </h1>

                        <p className="text-sm text-base-content/60">
                            Manage users, roles and page access.
                        </p>

                    </div>

                </div>


                <div className="flex items-center gap-2">

                    <button
                        type="button"
                        onClick={loadUsers}
                        disabled={loading}
                        className="btn btn-outline btn-sm"
                    >

                        <FaSyncAlt
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        Refresh

                    </button>


                    <button
                        type="button"
                        onClick={openAddUser}
                        className="btn btn-primary"
                    >

                        <FaUserPlus />

                        Add User

                    </button>

                </div>

            </div>


            {/* ERROR */}

            {error && (

                <div className="alert alert-error">

                    <div>

                        <p className="font-semibold">
                            Unable to load users
                        </p>

                        <p className="text-sm">
                            {error}
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={loadUsers}
                        className="btn btn-sm"
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* SUMMARY */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Total Users
                        </span>

                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <FaUsers />
                        </div>

                    </div>

                    <p className="text-2xl font-bold mt-3">
                        {totalUsers}
                    </p>

                    <p className="text-[10px] text-base-content/50 mt-1">
                        Registered accounts
                    </p>

                </div>


                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Administrators
                        </span>

                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <FaUserShield />
                        </div>

                    </div>

                    <p className="text-2xl font-bold mt-3">
                        {totalAdmins}
                    </p>

                    <p className="text-[10px] text-base-content/50 mt-1">
                        Full system access
                    </p>

                </div>


                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Cashiers
                        </span>

                        <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center">
                            <FaUserTie />
                        </div>

                    </div>

                    <p className="text-2xl font-bold mt-3">
                        {totalCashiers}
                    </p>

                    <p className="text-[10px] text-base-content/50 mt-1">
                        POS operators
                    </p>

                </div>


                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Active Users
                        </span>

                        <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                            <FaUserCheck />
                        </div>

                    </div>

                    <p className="text-2xl font-bold mt-3">
                        {activeUsers}
                    </p>

                    <p className="text-[10px] text-success mt-1">
                        Currently enabled
                    </p>

                </div>

            </div>


            {/* TABLE */}

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-hidden">

                <div className="p-4 border-b border-base-200">

                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">

                        <div className="relative w-full lg:w-80">

                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm" />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder="Search name or username..."
                                className="input input-bordered input-sm w-full pl-9"
                            />

                        </div>


                        <div className="flex gap-2">

                            <select
                                value={roleFilter}
                                onChange={(e) =>
                                    setRoleFilter(
                                        e.target.value
                                    )
                                }
                                className="select select-bordered select-sm"
                            >

                                <option value="all">
                                    All Roles
                                </option>

                                <option value="admin">
                                    Administrators
                                </option>

                                <option value="manager">
                                    Managers
                                </option>

                                <option value="cashier">
                                    Cashiers
                                </option>

                                <option value="inventory">
                                    Inventory Staff
                                </option>

                                <option value="payroll">
                                    Payroll
                                </option>

                                <option value="custom">
                                    Custom
                                </option>

                            </select>


                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value
                                    )
                                }
                                className="select select-bordered select-sm"
                            >

                                <option value="all">
                                    All Status
                                </option>

                                <option value="active">
                                    Active
                                </option>

                                <option value="inactive">
                                    Inactive
                                </option>

                            </select>

                        </div>

                    </div>

                </div>


                <div className="overflow-x-auto">

                    <table className="table">

                        <thead>

                            <tr>

                                <th>User</th>

                                <th>Role</th>

                                <th>Page Access</th>

                                <th>Status</th>

                                <th>Created</th>

                                <th className="text-right">
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {filteredUsers.map(
                                (user) => {

                                    const permissionCount =
                                        user.role === "admin"

                                            ? PERMISSIONS.length

                                            : PERMISSIONS.filter(
                                                ({ key }) =>
                                                    user.permissions?.[
                                                        key
                                                    ]
                                            ).length;


                                    return (

                                        <tr
                                            key={user._id}
                                            className="hover"
                                        >

                                            <td>

                                                <div className="flex items-center gap-3">

                                                    <UserAvatar
                                                        user={user}
                                                    />

                                                    <div>

                                                        <p className="font-semibold">
                                                            {user.name}
                                                        </p>

                                                        <p className="text-xs text-base-content/50">
                                                            @{user.username}
                                                        </p>

                                                    </div>

                                                </div>

                                            </td>


                                            <td>

                                                <RoleBadge
                                                    role={user.role}
                                                />

                                            </td>


                                            <td>

                                                <span className="text-sm font-medium">

                                                    {permissionCount}

                                                    <span className="text-base-content/40 font-normal">
                                                        {" "}
                                                        / {PERMISSIONS.length}
                                                    </span>

                                                </span>

                                                <p className="text-[10px] text-base-content/40">
                                                    pages allowed
                                                </p>

                                            </td>


                                            <td>

                                                <StatusBadge
                                                    isActive={
                                                        user.isActive
                                                    }
                                                />

                                            </td>


                                            <td>

                                                <span className="text-sm text-base-content/60">

                                                    {formatDate(
                                                        user.createdAt
                                                    )}

                                                </span>

                                            </td>


                                            <td className="text-right">

                                                <div
                                                    className="relative inline-block"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenMenu(
                                                                openMenu === user._id
                                                                    ? null
                                                                    : user._id
                                                            )
                                                        }
                                                        className="btn btn-ghost btn-sm btn-square"
                                                    >

                                                        <FaEllipsisV />

                                                    </button>


                                                    {openMenu === user._id && (

                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-base-100 border border-base-200 rounded-lg shadow-xl z-50 p-1">

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openEditUser(
                                                                        user
                                                                    )
                                                                }
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-base-200 text-left"
                                                            >

                                                                <FaEdit />

                                                                Edit User

                                                            </button>


                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openPasswordModal(
                                                                        user
                                                                    )
                                                                }
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-base-200 text-left"
                                                            >

                                                                <FaKey />

                                                                Change Password

                                                            </button>


                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleUserStatus(
                                                                        user
                                                                    )
                                                                }
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-base-200 text-left"
                                                            >

                                                                {user.isActive ? (
                                                                    <>
                                                                        <FaBan />
                                                                        Disable Account
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FaCheck />
                                                                        Enable Account
                                                                    </>
                                                                )}

                                                            </button>


                                                            <div className="border-t border-base-200 my-1" />


                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openDeleteModal(
                                                                        user
                                                                    )
                                                                }
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-error/10 text-error text-left"
                                                            >

                                                                <FaTrash />

                                                                Disable Account

                                                            </button>

                                                        </div>

                                                    )}

                                                </div>

                                            </td>

                                        </tr>

                                    );

                                }
                            )}


                            {!loading &&
                                filteredUsers.length === 0 && (

                                    <tr>

                                        <td
                                            colSpan="6"
                                            className="py-16 text-center"
                                        >

                                            <FaSearch className="text-3xl text-base-content/20 mx-auto" />

                                            <p className="font-semibold mt-3">
                                                No users found
                                            </p>

                                            <p className="text-xs text-base-content/50 mt-1">
                                                Try changing your search or filters.
                                            </p>

                                        </td>

                                    </tr>

                                )}

                        </tbody>

                    </table>

                </div>


                <div className="px-5 py-3 border-t border-base-200 flex items-center justify-between text-xs text-base-content/40">

                    <span>
                        Showing {filteredUsers.length} of {users.length} users
                    </span>

                    <span>
                        {activeUsers} active
                    </span>

                </div>

            </div>


            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showUserModal && (

                <dialog className="modal modal-open">

                    <div className="modal-box max-w-3xl">

                        <div className="flex items-center justify-between mb-6">

                            <div>

                                <h2 className="font-bold text-xl">

                                    {selectedUser
                                        ? "Edit User"
                                        : "Add User"}

                                </h2>

                                <p className="text-xs text-base-content/50 mt-1">

                                    {selectedUser
                                        ? "Update account information and page access."
                                        : "Create a POS account and choose which pages it can access."}

                                </p>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setShowUserModal(false)
                                }
                                className="btn btn-ghost btn-sm btn-square"
                            >

                                <FaTimes />

                            </button>

                        </div>


                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* ACCOUNT INFORMATION */}

                            <div className="space-y-4">

                                <div>

                                    <h3 className="font-semibold">
                                        Account Information
                                    </h3>

                                    <p className="text-xs text-base-content/50">
                                        Login and role information.
                                    </p>

                                </div>


                                <div>

                                    <label className="label">
                                        <span className="label-text">
                                            Full Name
                                        </span>
                                    </label>

                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                name:
                                                    e.target.value,
                                            })
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="e.g. Maria Santos"
                                    />

                                </div>


                                <div>

                                    <label className="label">
                                        <span className="label-text">
                                            Username
                                        </span>
                                    </label>

                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                username:
                                                    e.target.value,
                                            })
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="e.g. maria"
                                    />

                                </div>


                                {!selectedUser && (

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                        <div>

                                            <label className="label">
                                                <span className="label-text">
                                                    Password
                                                </span>
                                            </label>

                                            <input
                                                type="password"
                                                value={form.password}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        password:
                                                            e.target.value,
                                                    })
                                                }
                                                className="input input-bordered w-full"
                                                placeholder="Password"
                                            />

                                        </div>


                                        <div>

                                            <label className="label">
                                                <span className="label-text">
                                                    Confirm
                                                </span>
                                            </label>

                                            <input
                                                type="password"
                                                value={form.confirmPassword}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        confirmPassword:
                                                            e.target.value,
                                                    })
                                                }
                                                className="input input-bordered w-full"
                                                placeholder="Confirm"
                                            />

                                        </div>

                                    </div>

                                )}


                                <div>

                                    <label className="label">
                                        <span className="label-text">
                                            Role
                                        </span>
                                    </label>

                                    <select
                                        value={form.role}
                                        onChange={(e) =>
                                            handleRoleChange(
                                                e.target.value
                                            )
                                        }
                                        className="select select-bordered w-full"
                                    >

                                        <option value="admin">
                                            Administrator
                                        </option>

                                        <option value="manager">
                                            Manager
                                        </option>

                                        <option value="cashier">
                                            Cashier
                                        </option>

                                        <option value="inventory">
                                            Inventory Staff
                                        </option>

                                        <option value="payroll">
                                            Payroll
                                        </option>

                                        <option value="custom">
                                            Custom
                                        </option>

                                    </select>

                                </div>


                                <div className="bg-base-200 rounded-lg p-4">

                                    <p className="text-xs text-base-content/50">
                                        Selected role
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {ROLE_LABELS[
                                            form.role
                                        ]}
                                    </p>

                                    <p className="text-xs text-base-content/50 mt-2">

                                        Changing the role loads its recommended
                                        page permissions. You can then customize
                                        the permissions manually.

                                    </p>

                                </div>

                            </div>


                            {/* PAGE ACCESS */}

                            <div>

                                <div className="flex items-start justify-between gap-3 mb-3">

                                    <div>

                                        <h3 className="font-semibold">
                                            Page Access
                                        </h3>

                                        <p className="text-xs text-base-content/50">
                                            Choose which pages this user can access.
                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={
                                            resetRolePermissions
                                        }
                                        className="btn btn-ghost btn-xs"
                                    >
                                        Reset
                                    </button>

                                </div>


                                {form.role === "admin" && (

                                    <div className="alert alert-info py-2 mb-3">

                                        <FaUserShield />

                                        <span className="text-xs">
                                            Administrators always have full system access.
                                        </span>

                                    </div>

                                )}


                                <div className="border border-base-200 rounded-xl overflow-hidden">

                                    <div className="max-h-[430px] overflow-y-auto divide-y divide-base-200">

                                        {PERMISSIONS.map(
                                            (
                                                permission
                                            ) => (

                                                <label
                                                    key={
                                                        permission.key
                                                    }
                                                    className="flex items-center justify-between gap-4 p-3 hover:bg-base-200/50 cursor-pointer"
                                                >

                                                    <div>

                                                        <p className="text-sm font-medium">
                                                            {permission.label}
                                                        </p>

                                                        <p className="text-[11px] text-base-content/45 mt-0.5">
                                                            {permission.description}
                                                        </p>

                                                    </div>


                                                    <input
                                                        type="checkbox"
                                                        className="toggle toggle-primary toggle-sm"
                                                        checked={
                                                            form.role === "admin"
                                                                ? true
                                                                : Boolean(
                                                                    form.permissions?.[
                                                                        permission.key
                                                                    ]
                                                                )
                                                        }
                                                        disabled={
                                                            form.role === "admin"
                                                        }
                                                        onChange={() =>
                                                            togglePermission(
                                                                permission.key
                                                            )
                                                        }
                                                    />

                                                </label>

                                            )
                                        )}

                                    </div>


                                    <div className="p-3 bg-base-200/50 flex items-center justify-between gap-2">

                                        <span className="text-xs text-base-content/50">

                                            {
                                                form.role === "admin"

                                                    ? PERMISSIONS.length

                                                    : PERMISSIONS.filter(
                                                        ({ key }) =>
                                                            form.permissions?.[
                                                                key
                                                            ]
                                                    ).length
                                            }

                                            {" "}
                                            of {PERMISSIONS.length} pages enabled

                                        </span>


                                        {form.role !== "admin" && (

                                            <div className="flex gap-1">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        clearPermissions
                                                    }
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    Clear
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        selectAllPermissions
                                                    }
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    Select All
                                                </button>

                                            </div>

                                        )}

                                    </div>

                                </div>

                            </div>

                        </div>


                        <div className="modal-action">

                            <button
                                type="button"
                                onClick={() =>
                                    setShowUserModal(false)
                                }
                                className="btn"
                                disabled={saving}
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                onClick={handleSaveUser}
                                className="btn btn-primary"
                                disabled={saving}
                            >

                                {saving && (
                                    <span className="loading loading-spinner loading-sm" />
                                )}

                                {selectedUser
                                    ? "Save Changes"
                                    : "Create User"}

                            </button>

                        </div>

                    </div>

                </dialog>

            )}


            {/* DISABLE MODAL */}

            {showDeleteModal &&
                selectedUser && (

                    <dialog className="modal modal-open">

                        <div className="modal-box max-w-md">

                            <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center">
                                    <FaBan />
                                </div>

                                <div>

                                    <h2 className="font-bold text-lg">
                                        Disable Account
                                    </h2>

                                    <p className="text-xs text-base-content/50">
                                        The user will no longer be able to log in.
                                    </p>

                                </div>

                            </div>


                            <div className="bg-base-200 rounded-lg p-4 mt-5">

                                <p className="font-semibold">
                                    {selectedUser.name}
                                </p>

                                <p className="text-xs text-base-content/50 mt-1">
                                    @{selectedUser.username}
                                </p>

                            </div>


                            <p className="text-sm text-base-content/60 mt-4">
                                Are you sure you want to disable this account?
                            </p>


                            <div className="modal-action">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowDeleteModal(false)
                                    }
                                    className="btn"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="button"
                                    onClick={handleDeleteUser}
                                    className="btn btn-error"
                                    disabled={saving}
                                >

                                    {saving && (
                                        <span className="loading loading-spinner loading-sm" />
                                    )}

                                    <FaBan />

                                    Disable Account

                                </button>

                            </div>

                        </div>

                    </dialog>

                )}


            {/* PASSWORD MODAL */}

            {showPasswordModal &&
                selectedUser && (

                    <dialog className="modal modal-open">

                        <div className="modal-box max-w-md">

                            <div className="flex items-center gap-3 mb-5">

                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                    <FaKey />
                                </div>

                                <div>

                                    <h2 className="font-bold text-lg">
                                        Change Password
                                    </h2>

                                    <p className="text-xs text-base-content/50">
                                        @{selectedUser.username}
                                    </p>

                                </div>

                            </div>


                            <div className="space-y-4">

                                <div>

                                    <label className="label">
                                        <span className="label-text">
                                            New Password
                                        </span>
                                    </label>

                                    <input
                                        type="password"
                                        value={
                                            passwordForm.password
                                        }
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                password:
                                                    e.target.value,
                                            })
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="Minimum 6 characters"
                                    />

                                </div>


                                <div>

                                    <label className="label">
                                        <span className="label-text">
                                            Confirm Password
                                        </span>
                                    </label>

                                    <input
                                        type="password"
                                        value={
                                            passwordForm.confirmPassword
                                        }
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                confirmPassword:
                                                    e.target.value,
                                            })
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="Confirm new password"
                                    />

                                </div>

                            </div>


                            <div className="modal-action">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPasswordModal(false)
                                    }
                                    className="btn"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handleChangePassword
                                    }
                                    className="btn btn-primary"
                                    disabled={saving}
                                >

                                    {saving && (
                                        <span className="loading loading-spinner loading-sm" />
                                    )}

                                    Change Password

                                </button>

                            </div>

                        </div>

                    </dialog>

                )}

        </div>

    );

}


export default UsersPage;