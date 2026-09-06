import {
    useEffect,
    useMemo,
    useRef,
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
    FaIdCard,
    FaCamera,
    FaWifi,
} from "react-icons/fa";

import userService from "../../services/user.service";


/*
============================================================
BACKEND URL
============================================================

Used for uploaded profile images.

Change this if your backend runs on another port.

Example:

http://localhost:5000
============================================================
*/

const BACKEND_URL =
    "http://localhost:5000";


/*
============================================================
PERMISSIONS
============================================================
*/

const PERMISSIONS = [

    {
        key:
            "dashboard",

        label:
            "Dashboard",

        description:
            "View the main dashboard.",
    },


    {
        key:
            "products",

        label:
            "Products",

        description:
            "View the products page.",
    },


    {
        key:
            "inventory",

        label:
            "Inventory",

        description:
            "View inventory and stock.",
    },


    {
        key:
            "pos",

        label:
            "POS",

        description:
            "Access the point of sale.",
    },


    {
        key:
            "sales",

        label:
            "Sales",

        description:
            "View sales and receipts.",
    },


    {
        key:
            "customers",

        label:
            "Customers",

        description:
            "Access customer accounts.",
    },


    {
        key:
            "suppliers",

        label:
            "Suppliers",

        description:
            "Access supplier records.",
    },


    {
        key:
            "workers",

        label:
            "Workers",

        description:
            "Access worker records.",
    },


    {
        key:
            "ledger",

        label:
            "Ledger",

        description:
            "Access account ledgers.",
    },


    {
        key:
            "reports",

        label:
            "Reports",

        description:
            "View reports.",
    },


    {
        key:
            "users",

        label:
            "Users",

        description:
            "Access user management.",
    },


    {
        key:
            "settings",

        label:
            "Settings",

        description:
            "Access system settings.",
    },


    {
        key:
            "salesRefund",

        label:
            "Refund Sales",

        description:
            "Allow refunding completed sales.",
    },


    {
        key:
            "salesVoid",

        label:
            "Void Sales",

        description:
            "Allow voiding completed sales.",
    },


    {
        key:
            "salesReprint",

        label:
            "Reprint Receipts",

        description:
            "Allow reprinting sale receipts.",
    },

];


/*
============================================================
EMPTY PERMISSIONS
============================================================
*/

const EMPTY_PERMISSIONS = {

    dashboard:
        true,

    products:
        false,

    inventory:
        false,

    pos:
        false,

    sales:
        false,

    customers:
        false,

    suppliers:
        false,

    workers:
        false,

    ledger:
        false,

    reports:
        false,

    users:
        false,

    settings:
        false,

    salesRefund:
        false,

    salesVoid:
        false,

    salesReprint:
        false,

};


/*
============================================================
ROLE PRESETS
============================================================
*/

const ROLE_PRESETS = {

    admin: {

        dashboard:
            true,

        products:
            true,

        inventory:
            true,

        pos:
            true,

        sales:
            true,

        customers:
            true,

        suppliers:
            true,

        workers:
            true,

        ledger:
            true,

        reports:
            true,

        users:
            true,

        settings:
            true,

        salesRefund:
            true,

        salesVoid:
            true,

        salesReprint:
            true,

    },


    manager: {

        dashboard:
            true,

        products:
            true,

        inventory:
            true,

        pos:
            true,

        sales:
            true,

        customers:
            true,

        suppliers:
            true,

        workers:
            true,

        ledger:
            true,

        reports:
            true,

        users:
            false,

        settings:
            false,

        salesRefund:
            true,

        salesVoid:
            false,

        salesReprint:
            true,

    },


    cashier: {

        dashboard:
            true,

        products:
            true,

        inventory:
            false,

        pos:
            true,

        sales:
            true,

        customers:
            true,

        suppliers:
            false,

        workers:
            false,

        ledger:
            false,

        reports:
            false,

        users:
            false,

        settings:
            false,

        salesRefund:
            false,

        salesVoid:
            false,

        salesReprint:
            false,

    },


    inventory: {

        dashboard:
            true,

        products:
            true,

        inventory:
            true,

        pos:
            false,

        sales:
            false,

        customers:
            false,

        suppliers:
            true,

        workers:
            false,

        ledger:
            false,

        reports:
            true,

        users:
            false,

        settings:
            false,

        salesRefund:
            false,

        salesVoid:
            false,

        salesReprint:
            false,

    },


    payroll: {

        dashboard:
            true,

        products:
            false,

        inventory:
            false,

        pos:
            false,

        sales:
            false,

        customers:
            false,

        suppliers:
            false,

        workers:
            true,

        ledger:
            true,

        reports:
            true,

        users:
            false,

        settings:
            false,

        salesRefund:
            false,

        salesVoid:
            false,

        salesReprint:
            false,

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


/*
============================================================
USERS PAGE
============================================================
*/

function UsersPage() {

    /*
    ========================================================
    STATE
    ========================================================
    */

    const [
        users,
        setUsers,
    ] = useState([]);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState(null);


    const [
        search,
        setSearch,
    ] = useState("");


    const [
        roleFilter,
        setRoleFilter,
    ] = useState("all");


    const [
        statusFilter,
        setStatusFilter,
    ] = useState("all");


    const [
        openMenu,
        setOpenMenu,
    ] = useState(null);


    const [
        showUserModal,
        setShowUserModal,
    ] = useState(false);


    const [
        selectedUser,
        setSelectedUser,
    ] = useState(null);


    const [
        showDeleteModal,
        setShowDeleteModal,
    ] = useState(false);


    const [
        showPasswordModal,
        setShowPasswordModal,
    ] = useState(false);


    const [
        saving,
        setSaving,
    ] = useState(false);


    /*
    ========================================================
    RFID SCANNING
    ========================================================
    */

    const [
        scanningRfid,
        setScanningRfid,
    ] = useState(false);


    /*
    ========================================================
    PROFILE IMAGE UPLOAD
    ========================================================
    */

    const [
        uploadingProfileImage,
        setUploadingProfileImage,
    ] = useState(false);


    const profileImageInputRef =
        useRef(null);


    /*
    ========================================================
    CREATE EMPTY FORM
    ========================================================
    */

    const createEmptyForm =
        () => ({

            name:
                "",

            username:
                "",

            password:
                "",

            confirmPassword:
                "",

            role:
                "cashier",


            /*
            ================================================
            PROFILE
            ================================================
            */

            profile: {

                nickname:
                    "",

                image:
                    "",

            },


            /*
            ================================================
            RFID
            ================================================
            */

            rfidUid:
                "",


            /*
            ================================================
            PERMISSIONS
            ================================================
            */

            permissions: {

                ...ROLE_PRESETS.cashier,

            },

        });


    const [
        form,
        setForm,
    ] = useState(
        createEmptyForm
    );


    /*
    ========================================================
    PASSWORD FORM
    ========================================================
    */

    const [
        passwordForm,
        setPasswordForm,
    ] = useState({

        password:
            "",

        confirmPassword:
            "",

    });


    /*
    ========================================================
    GET PROFILE IMAGE URL
    ========================================================

    Backend returns:

    /uploads/profiles/profile-123.jpg

    Browser needs:

    http://localhost:5000/uploads/profiles/profile-123.jpg
    ========================================================
    */

    const getProfileImageUrl =
        (
            image
        ) => {

            if (
                !image
            ) {

                return "";

            }


            /*
            Already complete.
            */

            if (
                image.startsWith(
                    "http://"
                ) ||

                image.startsWith(
                    "https://"
                ) ||

                image.startsWith(
                    "data:"
                ) ||

                image.startsWith(
                    "blob:"
                )
            ) {

                return image;

            }


            return `${BACKEND_URL}${
                image.startsWith(
                    "/"
                )
                    ? image
                    : `/${image}`
            }`;

        };


    /*
    ========================================================
    LOAD USERS
    ========================================================
    */

    const loadUsers =
        async () => {

            try {

                setLoading(
                    true
                );


                setError(
                    null
                );


                const data =
                    await userService
                        .getUsers();


                setUsers(

                    Array.isArray(
                        data
                    )

                        ? data

                        : []

                );

            } catch (
                error
            ) {

                console.error(
                    "Failed to load users:",
                    error
                );


                setError(

                    error.response
                        ?.data
                        ?.message ||

                    "Failed to load users."

                );

            } finally {

                setLoading(
                    false
                );

            }

        };


    /*
    ========================================================
    INITIAL LOAD
    ========================================================
    */

    useEffect(
        () => {

            loadUsers();

        },
        []
    );


    /*
    ========================================================
    RFID SCANNER HANDLER
    ========================================================

    USB RFID reader:

    Tap card
    → types UID
    → sends Enter
    ========================================================
    */

    useEffect(
        () => {

            if (
                !scanningRfid ||
                !showUserModal
            ) {

                return;

            }


            let buffer =
                "";


            let lastKeyTime =
                Date.now();


            const handleKeyDown =
                (
                    event
                ) => {

                    /*
                    ============================================
                    ESCAPE CANCELS
                    ============================================
                    */

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        setScanningRfid(
                            false
                        );


                        return;

                    }


                    /*
                    ============================================
                    ENTER COMPLETES SCAN
                    ============================================
                    */

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        const uid =
                            buffer
                                .trim();


                        if (
                            uid
                        ) {

                            setForm(
                                (
                                    current
                                ) => ({

                                    ...current,

                                    rfidUid:
                                        uid,

                                })
                            );

                        }


                        setScanningRfid(
                            false
                        );


                        return;

                    }


                    /*
                    ============================================
                    RESET BUFFER IF TOO SLOW
                    ============================================
                    */

                    const now =
                        Date.now();


                    if (
                        now -
                        lastKeyTime >
                        500
                    ) {

                        buffer =
                            "";

                    }


                    lastKeyTime =
                        now;


                    /*
                    ============================================
                    CAPTURE CHARACTER
                    ============================================
                    */

                    if (
                        event.key.length ===
                        1
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        buffer +=
                            event.key;

                    }

                };


            window.addEventListener(
                "keydown",
                handleKeyDown,
                true
            );


            return () => {

                window.removeEventListener(
                    "keydown",
                    handleKeyDown,
                    true
                );

            };

        },
        [
            scanningRfid,
            showUserModal,
        ]
    );


    /*
    ========================================================
    FILTER USERS
    ========================================================
    */

    const filteredUsers =
        useMemo(
            () => {

                return users.filter(
                    (
                        user
                    ) => {

                        const query =
                            search
                                .trim()
                                .toLowerCase();


                        const nickname =
                            user.profile
                                ?.nickname ||
                            "";


                        const matchesSearch =

                            !query ||

                            user.name
                                ?.toLowerCase()
                                .includes(
                                    query
                                ) ||

                            user.username
                                ?.toLowerCase()
                                .includes(
                                    query
                                ) ||

                            nickname
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||

                            user.rfidUid
                                ?.toLowerCase()
                                .includes(
                                    query
                                );


                        const matchesRole =

                            roleFilter ===
                            "all" ||

                            user.role ===
                            roleFilter;


                        const matchesStatus =

                            statusFilter ===
                            "all" ||

                            (
                                statusFilter ===
                                "active" &&

                                user.isActive ===
                                true
                            ) ||

                            (
                                statusFilter ===
                                "inactive" &&

                                user.isActive ===
                                false
                            );


                        return (

                            matchesSearch &&

                            matchesRole &&

                            matchesStatus

                        );

                    }
                );

            },
            [

                users,

                search,

                roleFilter,

                statusFilter,

            ]
        );


    /*
    ========================================================
    SUMMARY
    ========================================================
    */

    const totalUsers =
        users.length;


    const totalAdmins =
        users.filter(
            (
                user
            ) =>
                user.role ===
                "admin"
        ).length;


    const totalCashiers =
        users.filter(
            (
                user
            ) =>
                user.role ===
                "cashier"
        ).length;


    const activeUsers =
        users.filter(
            (
                user
            ) =>
                user.isActive ===
                true
        ).length;


    /*
    ========================================================
    DATE
    ========================================================
    */

    const formatDate =
        (
            date
        ) => {

            if (
                !date
            ) {

                return "-";

            }


            try {

                return new Date(
                    date
                )
                    .toLocaleDateString(
                        "en-PH",
                        {

                            year:
                                "numeric",

                            month:
                                "short",

                            day:
                                "numeric",

                        }
                    );

            } catch {

                return "-";

            }

        };


    /*
    ========================================================
    OPEN ADD USER
    ========================================================
    */

    const openAddUser =
        () => {

            setSelectedUser(
                null
            );


            setForm(
                createEmptyForm()
            );


            setScanningRfid(
                false
            );


            setShowUserModal(
                true
            );


            setOpenMenu(
                null
            );

        };


    /*
    ========================================================
    OPEN EDIT USER
    ========================================================
    */

    const openEditUser =
        (
            user
        ) => {

            setSelectedUser(
                user
            );


            const role =
                user.role ||
                "cashier";


            const preset =

                ROLE_PRESETS[
                    role
                ] ||

                ROLE_PRESETS.custom;


            setForm({

                name:
                    user.name ||
                    "",

                username:
                    user.username ||
                    "",

                password:
                    "",

                confirmPassword:
                    "",

                role,


                /*
                ============================================
                PROFILE
                ============================================
                */

                profile: {

                    nickname:

                        user.profile
                            ?.nickname ||

                        "",

                    image:

                        user.profile
                            ?.image ||

                        "",

                },


                /*
                ============================================
                RFID
                ============================================
                */

                rfidUid:

                    user.rfidUid ||

                    "",


                /*
                ============================================
                PERMISSIONS
                ============================================
                */

                permissions: {

                    ...preset,

                    ...(
                        user.permissions ||
                        {}
                    ),

                },

            });


            setScanningRfid(
                false
            );


            setShowUserModal(
                true
            );


            setOpenMenu(
                null
            );

        };


    /*
    ========================================================
    CLOSE USER MODAL
    ========================================================
    */

    const closeUserModal =
        () => {

            if (
                saving ||
                uploadingProfileImage
            ) {

                return;

            }


            setScanningRfid(
                false
            );


            setShowUserModal(
                false
            );


            setSelectedUser(
                null
            );


            setForm(
                createEmptyForm()
            );

        };


    /*
    ========================================================
    ROLE CHANGE
    ========================================================
    */

    const handleRoleChange =
        (
            newRole
        ) => {

            setForm(
                (
                    current
                ) => ({

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
    ========================================================
    PERMISSION CHANGE
    ========================================================
    */

    const togglePermission =
        (
            key
        ) => {

            if (
                form.role ===
                "admin"
            ) {

                return;

            }


            setForm(
                (
                    current
                ) => ({

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
    ========================================================
    SELECT ALL
    ========================================================
    */

    const selectAllPermissions =
        () => {

            if (
                form.role ===
                "admin"
            ) {

                return;

            }


            const permissions =
                {};


            PERMISSIONS.forEach(
                ({
                    key,
                }) => {

                    permissions[
                        key
                    ] = true;

                }
            );


            setForm(
                (
                    current
                ) => ({

                    ...current,

                    permissions,

                })
            );

        };


    /*
    ========================================================
    CLEAR PERMISSIONS
    ========================================================
    */

    const clearPermissions =
        () => {

            if (
                form.role ===
                "admin"
            ) {

                return;

            }


            const permissions =
                {};


            PERMISSIONS.forEach(
                ({
                    key,
                }) => {

                    permissions[
                        key
                    ] = false;

                }
            );


            setForm(
                (
                    current
                ) => ({

                    ...current,

                    permissions,

                })
            );

        };


    /*
    ========================================================
    RESET ROLE PERMISSIONS
    ========================================================
    */

    const resetRolePermissions =
        () => {

            setForm(
                (
                    current
                ) => ({

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
    ========================================================
    START RFID SCAN
    ========================================================
    */

    const startRfidScan =
        () => {

            setScanningRfid(
                true
            );


            if (
                document.activeElement
                    instanceof
                    HTMLElement
            ) {

                document.activeElement
                    .blur();

            }

        };


    /*
    ========================================================
    REMOVE RFID
    ========================================================
    */

    const removeRfid =
        () => {

            setScanningRfid(
                false
            );


            setForm(
                (
                    current
                ) => ({

                    ...current,

                    rfidUid:
                        "",

                })
            );

        };


    /*
    ========================================================
    UPLOAD PROFILE IMAGE
    ========================================================
    */

    const handleProfileImageUpload =
        async (
            event
        ) => {

            const file =
                event.target
                    .files?.[0];


            /*
            Reset immediately so the same file
            can be selected again later.
            */

            event.target.value =
                "";


            if (
                !file
            ) {

                return;

            }


            /*
            ================================================
            USER MUST EXIST
            ================================================
            */

            if (
                !selectedUser?._id
            ) {

                alert(
                    "Create the user first, then edit the account to upload a profile photo."
                );


                return;

            }


            /*
            ================================================
            FILE TYPE
            ================================================
            */

            const allowedTypes = [

                "image/jpeg",

                "image/png",

                "image/webp",

            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                alert(
                    "Please select a JPG, PNG, or WEBP image."
                );


                return;

            }


            /*
            ================================================
            FILE SIZE
            ================================================
            */

            const maxSize =
                5 *
                1024 *
                1024;


            if (
                file.size >
                maxSize
            ) {

                alert(
                    "Profile image must be 5 MB or smaller."
                );


                return;

            }


            try {

                setUploadingProfileImage(
                    true
                );


                const updatedUser =
                    await userService
                        .uploadProfileImage(
                            selectedUser._id,
                            file
                        );


                const imagePath =

                    updatedUser
                        ?.profile
                        ?.image ||

                    "";


                /*
                ============================================
                UPDATE FORM PREVIEW
                ============================================
                */

                setForm(
                    (
                        current
                    ) => ({

                        ...current,

                        profile: {

                            ...current.profile,

                            image:
                                imagePath,

                        },

                    })
                );


                /*
                ============================================
                UPDATE SELECTED USER
                ============================================
                */

                setSelectedUser(
                    updatedUser
                );


                /*
                ============================================
                REFRESH USERS TABLE
                ============================================
                */

                await loadUsers();


            } catch (
                error
            ) {

                console.error(
                    "Failed to upload profile image:",
                    error
                );


                alert(

                    error.response
                        ?.data
                        ?.message ||

                    "Failed to upload profile image."

                );

            } finally {

                setUploadingProfileImage(
                    false
                );

            }

        };


    /*
    ========================================================
    REMOVE PROFILE IMAGE
    ========================================================

    This clears the path locally.

    Press Save Changes afterward to persist removal.
    ========================================================
    */

    const removeProfileImage =
        () => {

            setForm(
                (
                    current
                ) => ({

                    ...current,

                    profile: {

                        ...current.profile,

                        image:
                            "",

                    },

                })
            );

        };


    /*
    ========================================================
    OPEN PASSWORD MODAL
    ========================================================
    */

    const openPasswordModal =
        (
            user
        ) => {

            setSelectedUser(
                user
            );


            setPasswordForm({

                password:
                    "",

                confirmPassword:
                    "",

            });


            setShowPasswordModal(
                true
            );


            setOpenMenu(
                null
            );

        };


    /*
    ========================================================
    OPEN DISABLE MODAL
    ========================================================
    */

    const openDeleteModal =
        (
            user
        ) => {

            setSelectedUser(
                user
            );


            setShowDeleteModal(
                true
            );


            setOpenMenu(
                null
            );

        };


    /*
    ========================================================
    SAVE USER
    ========================================================
    */

    const handleSaveUser =
        async () => {

            /*
            ================================================
            VALIDATION
            ================================================
            */

            if (
                !form.name
                    .trim()
            ) {

                alert(
                    "Please enter the user's name."
                );


                return;

            }


            if (
                !form.username
                    .trim()
            ) {

                alert(
                    "Please enter a username."
                );


                return;

            }


            /*
            ================================================
            CREATE USER
            ================================================
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
                    form.password
                        .length <
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

                    setSaving(
                        true
                    );


                    await userService
                        .createUser({

                            name:

                                form.name
                                    .trim(),

                            username:

                                form.username
                                    .trim(),

                            password:

                                form.password,

                            role:

                                form.role,


                            /*
                            PROFILE
                            */

                            profile: {

                                nickname:

                                    form.profile
                                        .nickname
                                        .trim(),

                                image:

                                    form.profile
                                        .image
                                        .trim(),

                            },


                            /*
                            RFID
                            */

                            rfidUid:

                                form.rfidUid
                                    .trim(),


                            /*
                            PERMISSIONS
                            */

                            permissions:

                                form.permissions,

                        });


                    await loadUsers();


                    setShowUserModal(
                        false
                    );


                    setSelectedUser(
                        null
                    );


                    setForm(
                        createEmptyForm()
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "Failed to create user:",
                        error
                    );


                    alert(

                        error.response
                            ?.data
                            ?.message ||

                        "Failed to create user."

                    );

                } finally {

                    setSaving(
                        false
                    );

                }


                return;

            }


            /*
            ================================================
            UPDATE USER
            ================================================
            */

            try {

                setSaving(
                    true
                );


                await userService
                    .updateUser(

                        selectedUser._id,

                        {

                            name:

                                form.name
                                    .trim(),

                            username:

                                form.username
                                    .trim(),

                            role:

                                form.role,


                            /*
                            PROFILE
                            */

                            profile: {

                                nickname:

                                    form.profile
                                        .nickname
                                        .trim(),

                                image:

                                    form.profile
                                        .image
                                        .trim(),

                            },


                            /*
                            RFID
                            */

                            rfidUid:

                                form.rfidUid
                                    .trim(),


                            /*
                            PERMISSIONS
                            */

                            permissions:

                                form.permissions,

                        }

                    );


                await loadUsers();


                setShowUserModal(
                    false
                );


                setSelectedUser(
                    null
                );


                setForm(
                    createEmptyForm()
                );


            } catch (
                error
            ) {

                console.error(
                    "Failed to update user:",
                    error
                );


                alert(

                    error.response
                        ?.data
                        ?.message ||

                    "Failed to update user."

                );

            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    TOGGLE STATUS
    ========================================================
    */

    const toggleUserStatus =
        async (
            user
        ) => {

            try {

                setOpenMenu(
                    null
                );


                setSaving(
                    true
                );


                if (
                    user.isActive
                ) {

                    await userService
                        .disableUser(
                            user._id
                        );

                } else {

                    await userService
                        .enableUser(
                            user._id
                        );

                }


                await loadUsers();

            } catch (
                error
            ) {

                console.error(
                    "Failed to change user status:",
                    error
                );


                alert(

                    error.response
                        ?.data
                        ?.message ||

                    "Failed to change user status."

                );

            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    DISABLE USER
    ========================================================
    */

    const handleDeleteUser =
        async () => {

            if (
                !selectedUser
            ) {

                return;

            }


            try {

                setSaving(
                    true
                );


                await userService
                    .disableUser(
                        selectedUser._id
                    );


                await loadUsers();


                setShowDeleteModal(
                    false
                );


                setSelectedUser(
                    null
                );


            } catch (
                error
            ) {

                console.error(
                    "Failed to disable user:",
                    error
                );


                alert(

                    error.response
                        ?.data
                        ?.message ||

                    "Failed to disable user."

                );

            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    CHANGE PASSWORD
    ========================================================
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
                passwordForm.password
                    .length <
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

                setSaving(
                    true
                );


                await userService
                    .changePassword(

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

                    password:
                        "",

                    confirmPassword:
                        "",

                });


                alert(
                    "Password changed successfully."
                );


            } catch (
                error
            ) {

                console.error(
                    "Failed to change password:",
                    error
                );


                alert(

                    error.response
                        ?.data
                        ?.message ||

                    "Failed to change password."

                );

            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    ROLE BADGE
    ========================================================
    */

    const RoleBadge =
        ({
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
    ========================================================
    STATUS BADGE
    ========================================================
    */

    const StatusBadge =
        ({
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
    ========================================================
    USER AVATAR
    ========================================================
    */

    const UserAvatar =
        ({
            user,
            size = "small",
        }) => {

            const firstLetter =

                user.profile
                    ?.nickname
                    ?.charAt(0)
                    ?.toUpperCase() ||

                user.name
                    ?.charAt(0)
                    ?.toUpperCase() ||

                "?";


            const image =

                user.profile
                    ?.image ||

                "";


            const imageUrl =
                getProfileImageUrl(
                    image
                );


            const sizeClass =

                size ===
                "large"

                    ? "w-24 h-24 text-3xl"

                    : "w-10 h-10";


            return (

                <div
                    className={`
                        ${sizeClass}
                        rounded-full
                        bg-primary/10
                        text-primary
                        flex
                        items-center
                        justify-center
                        font-bold
                        shrink-0
                        overflow-hidden
                        border
                        border-base-200
                    `}
                >

                    {
                        imageUrl ? (

                            <img
                                src={
                                    imageUrl
                                }
                                alt={
                                    user.name ||
                                    "User"
                                }
                                className="
                                    w-full
                                    h-full
                                    object-cover
                                "
                            />

                        ) : (

                            firstLetter

                        )
                    }

                </div>

            );

        };


    /*
    ========================================================
    LOADING
    ========================================================
    */

    if (
        loading &&
        users.length ===
        0
    ) {

        return (

            <div className="space-y-6">

                <div>

                    <h1 className="text-2xl font-bold">
                        Users
                    </h1>

                    <p className="text-sm text-base-content/60">
                        Manage users, profiles, RFID cards,
                        roles and permissions.
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
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <div
            className="
                space-y-6
                pb-8
            "
            onClick={() =>
                setOpenMenu(
                    null
                )
            }
        >


            {/* =================================================
                HEADER
            ================================================= */}

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
                            Manage accounts, profiles, RFID cards,
                            roles and access.
                        </p>

                    </div>

                </div>


                <div className="flex items-center gap-2">

                    <button
                        type="button"
                        onClick={
                            loadUsers
                        }
                        disabled={
                            loading
                        }
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
                        onClick={
                            openAddUser
                        }
                        className="btn btn-primary"
                    >

                        <FaUserPlus />

                        Add User

                    </button>

                </div>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {
                error && (

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
                            onClick={
                                loadUsers
                            }
                            className="btn btn-sm"
                        >

                            Try Again

                        </button>

                    </div>

                )
            }


            {/* =================================================
                SUMMARY
            ================================================= */}

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

                        {
                            totalUsers
                        }

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

                        {
                            totalAdmins
                        }

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

                        {
                            totalCashiers
                        }

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

                        {
                            activeUsers
                        }

                    </p>

                    <p className="text-[10px] text-success mt-1">
                        Currently enabled
                    </p>

                </div>

            </div>


            {/* =================================================
                USERS TABLE
            ================================================= */}

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-visible">

                <div className="p-4 border-b border-base-200">

                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">

                        <div className="relative w-full lg:w-80">

                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm" />

                            <input
                                type="text"
                                value={
                                    search
                                }
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder="Search name, nickname, username or RFID..."
                                className="input input-bordered input-sm w-full pl-9"
                            />

                        </div>


                        <div className="flex gap-2">

                            <select
                                value={
                                    roleFilter
                                }
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
                                value={
                                    statusFilter
                                }
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

                                <th>
                                    User
                                </th>

                                <th>
                                    Role
                                </th>

                                <th>
                                    RFID
                                </th>

                                <th>
                                    Access
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Created
                                </th>

                                <th className="text-right">
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                filteredUsers.map(
                                    (
                                        user
                                    ) => {

                                        const permissionCount =

                                            user.role ===
                                            "admin"

                                                ? PERMISSIONS.length

                                                : PERMISSIONS.filter(
                                                    ({
                                                        key,
                                                    }) =>
                                                        user.permissions?.[
                                                            key
                                                        ]
                                                ).length;


                                        return (

                                            <tr
                                                key={
                                                    user._id
                                                }
                                                className="hover"
                                            >

                                                {/* USER */}

                                                <td>

                                                    <div className="flex items-center gap-3">

                                                        <UserAvatar
                                                            user={
                                                                user
                                                            }
                                                        />


                                                        <div>

                                                            <p className="font-semibold">

                                                                {
                                                                    user.profile
                                                                        ?.nickname ||

                                                                    user.name
                                                                }

                                                            </p>


                                                            {
                                                                user.profile
                                                                    ?.nickname && (

                                                                    <p className="text-[10px] text-base-content/50">

                                                                        {
                                                                            user.name
                                                                        }

                                                                    </p>

                                                                )
                                                            }


                                                            <p className="text-xs text-base-content/50">

                                                                @
                                                                {
                                                                    user.username
                                                                }

                                                            </p>

                                                        </div>

                                                    </div>

                                                </td>


                                                {/* ROLE */}

                                                <td>

                                                    <RoleBadge
                                                        role={
                                                            user.role
                                                        }
                                                    />

                                                </td>


                                                {/* RFID */}

                                                <td>

                                                    {
                                                        user.rfidUid ? (

                                                            <div>

                                                                <span className="badge badge-success badge-outline badge-sm gap-1">

                                                                    <FaIdCard />

                                                                    Assigned

                                                                </span>

                                                                <p className="text-[10px] font-mono text-base-content/40 mt-1">

                                                                    {
                                                                        user.rfidUid
                                                                    }

                                                                </p>

                                                            </div>

                                                        ) : (

                                                            <span className="text-xs text-base-content/40">

                                                                No card

                                                            </span>

                                                        )
                                                    }

                                                </td>


                                                {/* ACCESS */}

                                                <td>

                                                    <span className="text-sm font-medium">

                                                        {
                                                            permissionCount
                                                        }

                                                        <span className="text-base-content/40 font-normal">

                                                            {" "}
                                                            / {
                                                                PERMISSIONS.length
                                                            }

                                                        </span>

                                                    </span>

                                                    <p className="text-[10px] text-base-content/40">
                                                        permissions
                                                    </p>

                                                </td>


                                                {/* STATUS */}

                                                <td>

                                                    <StatusBadge
                                                        isActive={
                                                            user.isActive
                                                        }
                                                    />

                                                </td>


                                                {/* CREATED */}

                                                <td>

                                                    <span className="text-sm text-base-content/60">

                                                        {
                                                            formatDate(
                                                                user.createdAt
                                                            )
                                                        }

                                                    </span>

                                                </td>


                                                {/* ACTIONS */}

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

                                                                    openMenu ===
                                                                    user._id

                                                                        ? null

                                                                        : user._id

                                                                )
                                                            }
                                                            className="btn btn-ghost btn-sm btn-square"
                                                        >

                                                            <FaEllipsisV />

                                                        </button>


                                                        {
                                                            openMenu ===
                                                            user._id && (

                                                                <div className="absolute right-0 top-full mt-1 w-52 bg-base-100 border border-base-200 rounded-lg shadow-xl z-[100] p-1">

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

                                                                        {
                                                                            user.isActive ? (

                                                                                <>

                                                                                    <FaBan />

                                                                                    Disable Account

                                                                                </>

                                                                            ) : (

                                                                                <>

                                                                                    <FaCheck />

                                                                                    Enable Account

                                                                                </>

                                                                            )
                                                                        }

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

                                                            )
                                                        }

                                                    </div>

                                                </td>

                                            </tr>

                                        );

                                    }
                                )
                            }


                            {
                                !loading &&
                                filteredUsers.length ===
                                0 && (

                                    <tr>

                                        <td
                                            colSpan="7"
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

                                )
                            }

                        </tbody>

                    </table>

                </div>


                <div className="px-5 py-3 border-t border-base-200 flex items-center justify-between text-xs text-base-content/40">

                    <span>

                        Showing {
                            filteredUsers.length
                        } of {
                            users.length
                        } users

                    </span>

                    <span>

                        {
                            activeUsers
                        } active

                    </span>

                </div>

            </div>


            {/* =================================================
                ADD / EDIT USER MODAL
            ================================================= */}

            {
                showUserModal && (

                    <dialog className="modal modal-open">

                        <div className="modal-box max-w-5xl max-h-[92vh] overflow-y-auto">

                            {/* HEADER */}

                            <div className="flex items-center justify-between mb-6">

                                <div>

                                    <h2 className="font-bold text-xl">

                                        {
                                            selectedUser

                                                ? "Edit User"

                                                : "Add User"
                                        }

                                    </h2>

                                    <p className="text-xs text-base-content/50 mt-1">

                                        {
                                            selectedUser

                                                ? "Update profile, login, RFID and permissions."

                                                : "Create a POS account and configure its profile and access."
                                        }

                                    </p>

                                </div>


                                <button
                                    type="button"
                                    onClick={
                                        closeUserModal
                                    }
                                    className="btn btn-ghost btn-sm btn-square"
                                    disabled={
                                        saving ||
                                        uploadingProfileImage
                                    }
                                >

                                    <FaTimes />

                                </button>

                            </div>


                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* =============================================
                                    LEFT COLUMN
                                ============================================= */}

                                <div className="space-y-5">


                                    {/* =========================================
                                        PROFILE
                                    ========================================= */}

                                    <div className="border border-base-200 rounded-xl p-4 bg-base-200/20">

                                        <div className="flex items-center gap-4">

                                            <UserAvatar
                                                size="large"
                                                user={{

                                                    name:
                                                        form.name,

                                                    profile:
                                                        form.profile,

                                                }}
                                            />


                                            <div className="min-w-0">

                                                <p className="font-semibold text-lg">

                                                    {
                                                        form.profile
                                                            .nickname ||

                                                        form.name ||

                                                        "New User"
                                                    }

                                                </p>


                                                {
                                                    form.profile
                                                        .nickname &&
                                                    form.name && (

                                                        <p className="text-xs text-base-content/50">

                                                            {
                                                                form.name
                                                            }

                                                        </p>

                                                    )
                                                }


                                                <p className="text-xs text-base-content/40 mt-1">

                                                    {
                                                        form.username

                                                            ? `@${form.username}`

                                                            : "No username yet"
                                                    }

                                                </p>

                                            </div>

                                        </div>


                                        {/* =====================================
                                            NICKNAME
                                        ===================================== */}

                                        <div className="mt-4">

                                            <label className="label">

                                                <span className="label-text">
                                                    Nickname
                                                </span>

                                            </label>


                                            <input
                                                type="text"
                                                value={
                                                    form.profile
                                                        .nickname
                                                }
                                                onChange={(e) =>
                                                    setForm(
                                                        (
                                                            current
                                                        ) => ({

                                                            ...current,

                                                            profile: {

                                                                ...current.profile,

                                                                nickname:
                                                                    e.target.value,

                                                            },

                                                        })
                                                    )
                                                }
                                                className="input input-bordered w-full"
                                                placeholder="e.g. Boss"
                                            />

                                            <p className="text-[10px] text-base-content/40 mt-1">

                                                Used for the personalized login animation.

                                            </p>

                                        </div>


                                        {/* =====================================
                                            PROFILE PHOTO
                                        ===================================== */}

                                        <div className="mt-4">

                                            <label className="label">

                                                <span className="label-text">
                                                    Profile Photo
                                                </span>

                                            </label>


                                            {/* HIDDEN FILE INPUT */}

                                            <input
                                                ref={
                                                    profileImageInputRef
                                                }
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={
                                                    handleProfileImageUpload
                                                }
                                            />


                                            <div className="border border-base-200 rounded-xl p-4 bg-base-100">

                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                                                    {/* PREVIEW */}

                                                    <UserAvatar
                                                        size="large"
                                                        user={{

                                                            name:
                                                                form.name,

                                                            profile:
                                                                form.profile,

                                                        }}
                                                    />


                                                    {/* CONTROLS */}

                                                    <div className="flex-1 min-w-0">

                                                        {
                                                            form.profile
                                                                .image ? (

                                                                <>

                                                                    <p className="text-sm font-semibold">
                                                                        Profile photo uploaded
                                                                    </p>


                                                                    <p className="text-xs text-base-content/50 mt-1 truncate">

                                                                        {
                                                                            form.profile
                                                                                .image
                                                                        }

                                                                    </p>

                                                                </>

                                                            ) : (

                                                                <>

                                                                    <p className="text-sm font-semibold">
                                                                        No profile photo
                                                                    </p>


                                                                    <p className="text-xs text-base-content/50 mt-1">

                                                                        Upload a photo for this user.

                                                                    </p>

                                                                </>

                                                            )
                                                        }


                                                        <div className="flex flex-wrap gap-2 mt-3">

                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm"
                                                                disabled={
                                                                    uploadingProfileImage ||
                                                                    !selectedUser
                                                                }
                                                                onClick={() => {

                                                                    profileImageInputRef
                                                                        .current
                                                                        ?.click();

                                                                }}
                                                            >

                                                                {
                                                                    uploadingProfileImage ? (

                                                                        <span className="loading loading-spinner loading-xs" />

                                                                    ) : (

                                                                        <FaCamera />

                                                                    )
                                                                }


                                                                {
                                                                    uploadingProfileImage

                                                                        ? "Uploading..."

                                                                        : form.profile
                                                                            .image

                                                                            ? "Change Photo"

                                                                            : "Upload Photo"
                                                                }

                                                            </button>


                                                            {
                                                                form.profile
                                                                    .image && (

                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-ghost btn-sm text-error"
                                                                        disabled={
                                                                            uploadingProfileImage
                                                                        }
                                                                        onClick={
                                                                            removeProfileImage
                                                                        }
                                                                    >

                                                                        <FaTrash />

                                                                        Remove

                                                                    </button>

                                                                )
                                                            }

                                                        </div>


                                                        {
                                                            !selectedUser && (

                                                                <div className="alert alert-info py-2 px-3 mt-3">

                                                                    <FaCamera />

                                                                    <span className="text-[11px]">

                                                                        Create the user first.
                                                                        Then edit the account to
                                                                        upload a profile photo.

                                                                    </span>

                                                                </div>

                                                            )
                                                        }


                                                        <p className="text-[10px] text-base-content/40 mt-2">

                                                            JPG, PNG or WEBP.
                                                            Maximum file size: 5 MB.

                                                        </p>

                                                    </div>

                                                </div>

                                            </div>

                                        </div>

                                    </div>


                                    {/* =========================================
                                        RFID
                                    ========================================= */}

                                    <div
                                        className={`
                                            border
                                            rounded-xl
                                            p-4
                                            transition
                                            ${
                                                scanningRfid

                                                    ? "border-primary bg-primary/5"

                                                    : "border-base-200"
                                            }
                                        `}
                                    >

                                        <div className="flex items-center gap-3 mb-3">

                                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                                                {
                                                    scanningRfid

                                                        ? (
                                                            <FaWifi className="animate-pulse" />
                                                        )

                                                        : (
                                                            <FaIdCard />
                                                        )
                                                }

                                            </div>


                                            <div className="flex-1">

                                                <p className="font-semibold">
                                                    RFID / NFC Card
                                                </p>

                                                <p className="text-[10px] text-base-content/50">

                                                    {
                                                        scanningRfid

                                                            ? "Tap the card on the reader now..."

                                                            : "Assign a card for tap-to-login."
                                                    }

                                                </p>

                                            </div>


                                            {
                                                scanningRfid && (

                                                    <span className="loading loading-dots loading-sm text-primary" />

                                                )
                                            }

                                        </div>


                                        <label className="label">

                                            <span className="label-text">
                                                Card UID
                                            </span>

                                        </label>


                                        <div className="flex gap-2">

                                            <input
                                                type="text"
                                                value={
                                                    form.rfidUid
                                                }
                                                onChange={(e) =>
                                                    setForm(
                                                        (
                                                            current
                                                        ) => ({

                                                            ...current,

                                                            rfidUid:
                                                                e.target.value,

                                                        })
                                                    )
                                                }
                                                className="input input-bordered w-full font-mono"
                                                placeholder="Tap card or enter UID"
                                                disabled={
                                                    scanningRfid
                                                }
                                            />


                                            {
                                                scanningRfid ? (

                                                    <button
                                                        type="button"
                                                        className="btn btn-error btn-outline"
                                                        onClick={() =>
                                                            setScanningRfid(
                                                                false
                                                            )
                                                        }
                                                    >

                                                        <FaTimes />

                                                        Cancel

                                                    </button>

                                                ) : (

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-primary"
                                                        onClick={
                                                            startRfidScan
                                                        }
                                                    >

                                                        <FaWifi />

                                                        Scan

                                                    </button>

                                                )
                                            }

                                        </div>


                                        {
                                            scanningRfid && (

                                                <div className="alert alert-info mt-3 py-2">

                                                    <FaIdCard />

                                                    <div>

                                                        <p className="text-xs font-semibold">
                                                            Waiting for card
                                                        </p>

                                                        <p className="text-[10px]">

                                                            Tap the RFID/NFC card on your reader.
                                                            Press Esc to cancel.

                                                        </p>

                                                    </div>

                                                </div>

                                            )
                                        }


                                        {
                                            !scanningRfid &&
                                            form.rfidUid && (

                                                <div className="mt-3">

                                                    <div className="flex items-center gap-2 text-xs text-success">

                                                        <FaCheck />

                                                        <span>
                                                            Card assigned:
                                                        </span>

                                                        <span className="font-mono font-semibold">

                                                            {
                                                                form.rfidUid
                                                            }

                                                        </span>

                                                    </div>


                                                    <button
                                                        type="button"
                                                        onClick={
                                                            removeRfid
                                                        }
                                                        className="btn btn-ghost btn-xs text-error mt-2"
                                                    >

                                                        <FaTimes />

                                                        Remove Card

                                                    </button>

                                                </div>

                                            )
                                        }


                                        {
                                            !scanningRfid &&
                                            !form.rfidUid && (

                                                <div className="flex items-center gap-2 text-xs text-base-content/40 mt-3">

                                                    <FaIdCard />

                                                    No card assigned

                                                </div>

                                            )
                                        }

                                    </div>


                                    {/* =========================================
                                        ACCOUNT INFORMATION
                                    ========================================= */}

                                    <div>

                                        <div className="mb-3">

                                            <h3 className="font-semibold">
                                                Account Information
                                            </h3>

                                            <p className="text-xs text-base-content/50">
                                                Login and role information.
                                            </p>

                                        </div>


                                        <div className="space-y-4">

                                            {/* FULL NAME */}

                                            <div>

                                                <label className="label">

                                                    <span className="label-text">
                                                        Full Name
                                                    </span>

                                                </label>


                                                <input
                                                    type="text"
                                                    value={
                                                        form.name
                                                    }
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


                                            {/* USERNAME */}

                                            <div>

                                                <label className="label">

                                                    <span className="label-text">
                                                        Username
                                                    </span>

                                                </label>


                                                <input
                                                    type="text"
                                                    value={
                                                        form.username
                                                    }
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


                                            {/* PASSWORD CREATE ONLY */}

                                            {
                                                !selectedUser && (

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                                        <div>

                                                            <label className="label">

                                                                <span className="label-text">
                                                                    Password
                                                                </span>

                                                            </label>


                                                            <input
                                                                type="password"
                                                                value={
                                                                    form.password
                                                                }
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
                                                                value={
                                                                    form.confirmPassword
                                                                }
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

                                                )
                                            }


                                            {/* ROLE */}

                                            <div>

                                                <label className="label">

                                                    <span className="label-text">
                                                        Role
                                                    </span>

                                                </label>


                                                <select
                                                    value={
                                                        form.role
                                                    }
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

                                                    {
                                                        ROLE_LABELS[
                                                            form.role
                                                        ]
                                                    }

                                                </p>

                                                <p className="text-xs text-base-content/50 mt-2">

                                                    Changing the role loads its
                                                    recommended permissions.

                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                </div>


                                {/* =============================================
                                    RIGHT COLUMN - PERMISSIONS
                                ============================================= */}

                                <div>

                                    <div className="sticky top-0">

                                        <div className="flex items-start justify-between gap-3 mb-3">

                                            <div>

                                                <h3 className="font-semibold">
                                                    Permissions
                                                </h3>

                                                <p className="text-xs text-base-content/50">
                                                    Choose what this account can access and do.
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


                                        {
                                            form.role ===
                                            "admin" && (

                                                <div className="alert alert-info py-2 mb-3">

                                                    <FaUserShield />

                                                    <span className="text-xs">

                                                        Administrators always have
                                                        full system access.

                                                    </span>

                                                </div>

                                            )
                                        }


                                        <div className="border border-base-200 rounded-xl overflow-hidden">

                                            <div className="max-h-[650px] overflow-y-auto divide-y divide-base-200">

                                                {
                                                    PERMISSIONS.map(
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

                                                                        {
                                                                            permission.label
                                                                        }

                                                                    </p>

                                                                    <p className="text-[11px] text-base-content/45 mt-0.5">

                                                                        {
                                                                            permission.description
                                                                        }

                                                                    </p>

                                                                </div>


                                                                <input
                                                                    type="checkbox"
                                                                    className="toggle toggle-primary toggle-sm"
                                                                    checked={

                                                                        form.role ===
                                                                        "admin"

                                                                            ? true

                                                                            : Boolean(

                                                                                form.permissions?.[
                                                                                    permission.key
                                                                                ]

                                                                            )
                                                                    }
                                                                    disabled={

                                                                        form.role ===
                                                                        "admin"

                                                                    }
                                                                    onChange={() =>
                                                                        togglePermission(
                                                                            permission.key
                                                                        )
                                                                    }
                                                                />

                                                            </label>

                                                        )
                                                    )
                                                }

                                            </div>


                                            <div className="p-3 bg-base-200/50 flex items-center justify-between gap-2">

                                                <span className="text-xs text-base-content/50">

                                                    {
                                                        form.role ===
                                                        "admin"

                                                            ? PERMISSIONS.length

                                                            : PERMISSIONS.filter(
                                                                ({
                                                                    key,
                                                                }) =>
                                                                    form.permissions?.[
                                                                        key
                                                                    ]
                                                            ).length
                                                    }

                                                    {" "}
                                                    of {
                                                        PERMISSIONS.length
                                                    } permissions enabled

                                                </span>


                                                {
                                                    form.role !==
                                                    "admin" && (

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

                                                    )
                                                }

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>


                            {/* =============================================
                                MODAL ACTIONS
                            ============================================= */}

                            <div className="modal-action">

                                <button
                                    type="button"
                                    onClick={
                                        closeUserModal
                                    }
                                    className="btn"
                                    disabled={
                                        saving ||
                                        uploadingProfileImage
                                    }
                                >

                                    Cancel

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handleSaveUser
                                    }
                                    className="btn btn-primary"
                                    disabled={
                                        saving ||
                                        scanningRfid ||
                                        uploadingProfileImage
                                    }
                                >

                                    {
                                        saving && (

                                            <span className="loading loading-spinner loading-sm" />

                                        )
                                    }

                                    {
                                        selectedUser

                                            ? "Save Changes"

                                            : "Create User"
                                    }

                                </button>

                            </div>

                        </div>

                    </dialog>

                )
            }


            {/* =================================================
                DISABLE MODAL
            ================================================= */}

            {
                showDeleteModal &&
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

                                <div className="flex items-center gap-3">

                                    <UserAvatar
                                        user={
                                            selectedUser
                                        }
                                    />


                                    <div>

                                        <p className="font-semibold">

                                            {
                                                selectedUser.profile
                                                    ?.nickname ||

                                                selectedUser.name
                                            }

                                        </p>

                                        <p className="text-xs text-base-content/50">

                                            @
                                            {
                                                selectedUser.username
                                            }

                                        </p>

                                    </div>

                                </div>

                            </div>


                            <p className="text-sm text-base-content/60 mt-4">

                                Are you sure you want to disable this account?

                            </p>


                            <div className="modal-action">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowDeleteModal(
                                            false
                                        )
                                    }
                                    className="btn"
                                    disabled={
                                        saving
                                    }
                                >

                                    Cancel

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handleDeleteUser
                                    }
                                    className="btn btn-error"
                                    disabled={
                                        saving
                                    }
                                >

                                    {
                                        saving && (

                                            <span className="loading loading-spinner loading-sm" />

                                        )
                                    }

                                    <FaBan />

                                    Disable Account

                                </button>

                            </div>

                        </div>

                    </dialog>

                )
            }


            {/* =================================================
                PASSWORD MODAL
            ================================================= */}

            {
                showPasswordModal &&
                selectedUser && (

                    <dialog className="modal modal-open">

                        <div className="modal-box max-w-md">

                            <div className="flex items-center gap-3 mb-5">

                                <UserAvatar
                                    user={
                                        selectedUser
                                    }
                                />


                                <div>

                                    <h2 className="font-bold text-lg">
                                        Change Password
                                    </h2>

                                    <p className="text-xs text-base-content/50">

                                        @
                                        {
                                            selectedUser.username
                                        }

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
                                        setShowPasswordModal(
                                            false
                                        )
                                    }
                                    className="btn"
                                    disabled={
                                        saving
                                    }
                                >

                                    Cancel

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handleChangePassword
                                    }
                                    className="btn btn-primary"
                                    disabled={
                                        saving
                                    }
                                >

                                    {
                                        saving && (

                                            <span className="loading loading-spinner loading-sm" />

                                        )
                                    }

                                    <FaKey />

                                    Change Password

                                </button>

                            </div>

                        </div>

                    </dialog>

                )
            }

        </div>

    );

}


export default UsersPage;