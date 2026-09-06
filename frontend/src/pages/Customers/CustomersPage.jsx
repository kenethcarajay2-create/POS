import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    FaUsers,
    FaUserPlus,
    FaSearch,
    FaEdit,
    FaTimes,
    FaCheckCircle,
    FaBan,
    FaIdCard,
    FaQrcode,
    FaWifi,
    FaShoppingCart,
    FaCalendarDay,
    FaCalendarWeek,
    FaCalendarAlt,
    FaChartLine,
    FaWallet,
    FaReceipt,
    FaHistory,
    FaStar,
    FaSyncAlt,
    FaExclamationTriangle,
} from "react-icons/fa";

import customerService from "../../services/customer.service";

import useAuthStore from "../../store/auth.store";


/*
============================================================
CUSTOMERS PAGE
============================================================
*/

function CustomersPage() {

    /*
    ========================================================
    AUTH
    ========================================================
    */

    const user =
        useAuthStore(
            (state) =>
                state.user
        );


    const isAdmin =
        user?.role ===
        "admin";


    /*
    ========================================================
    CUSTOMERS
    ========================================================
    */

    const [
        customers,
        setCustomers,
    ] = useState([]);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    const [
        search,
        setSearch,
    ] = useState("");


    const [
        statusFilter,
        setStatusFilter,
    ] = useState("ACTIVE");


    /*
    ========================================================
    SELECTED CUSTOMER
    ========================================================
    */

    const [
        selectedCustomer,
        setSelectedCustomer,
    ] = useState(null);


    const [
        analytics,
        setAnalytics,
    ] = useState(null);


    const [
        customerSales,
        setCustomerSales,
    ] = useState([]);


    const [
        detailsLoading,
        setDetailsLoading,
    ] = useState(false);


    /*
    ========================================================
    CREATE / EDIT
    ========================================================
    */

    const [
        showCustomerForm,
        setShowCustomerForm,
    ] = useState(false);


    const [
        editingCustomer,
        setEditingCustomer,
    ] = useState(null);


    const [
        customerName,
        setCustomerName,
    ] = useState("");


    const [
        customerPhone,
        setCustomerPhone,
    ] = useState("");


    const [
        customerRfid,
        setCustomerRfid,
    ] = useState("");


    const [
        saving,
        setSaving,
    ] = useState(false);


    /*
    ========================================================
    HELPERS
    ========================================================
    */

    const getId = (
        item
    ) => {

        return (
            item?._id ||
            item?.id ||
            null
        );

    };


    const formatMoney = (
        value
    ) => {

        return new Intl.NumberFormat(
            "en-PH",
            {
                style:
                    "currency",

                currency:
                    "PHP",
            }
        ).format(
            Number(
                value
            ) || 0
        );

    };


    const formatDate = (
        value
    ) => {

        if (!value) {

            return "Never";

        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Unknown";

        }


        return date.toLocaleDateString(
            "en-PH",
            {
                month:
                    "short",

                day:
                    "numeric",

                year:
                    "numeric",
            }
        );

    };


    const formatDateTime = (
        value
    ) => {

        if (!value) {

            return "Never";

        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Unknown";

        }


        return date.toLocaleString(
            "en-PH",
            {
                month:
                    "short",

                day:
                    "numeric",

                year:
                    "numeric",

                hour:
                    "numeric",

                minute:
                    "2-digit",
            }
        );

    };


    /*
    ========================================================
    LOAD CUSTOMERS
    ========================================================
    */

    const loadCustomers =
        async () => {

            try {

                setLoading(
                    true
                );


                setError(
                    ""
                );


                const result =
                    await customerService
                        .getCustomers();


                const list =
                    Array.isArray(
                        result
                    )
                        ? result
                        : Array.isArray(
                            result?.data
                        )
                            ? result.data
                            : [];


                setCustomers(
                    list
                );


            } catch (
                err
            ) {

                console.error(
                    "Failed to load customers:",
                    err
                );


                setError(
                    err.response
                        ?.data
                        ?.message ||
                    err.message ||
                    "Failed to load customers."
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

            loadCustomers();

        },
        []
    );


    /*
    ========================================================
    FILTERED CUSTOMERS
    ========================================================
    */

    const filteredCustomers =
        useMemo(
            () => {

                const query =
                    search
                        .trim()
                        .toLowerCase();


                return customers.filter(
                    (customer) => {

                        const matchesSearch =
                            !query ||

                            String(
                                customer.name ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||

                            String(
                                customer.phone ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||

                            String(
                                customer.customerCode ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||

                            String(
                                customer.rfidUid ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                );


                        let matchesStatus =
                            true;


                        if (
                            statusFilter ===
                            "ACTIVE"
                        ) {

                            matchesStatus =
                                customer.isActive !==
                                false;

                        }


                        if (
                            statusFilter ===
                            "INACTIVE"
                        ) {

                            matchesStatus =
                                customer.isActive ===
                                false;

                        }


                        return (
                            matchesSearch &&
                            matchesStatus
                        );

                    }
                );

            },
            [
                customers,
                search,
                statusFilter,
            ]
        );


    /*
    ========================================================
    SUMMARY
    ========================================================
    */

    const activeCustomerCount =
        customers.filter(
            (customer) =>
                customer.isActive !==
                false
        ).length;


    const inactiveCustomerCount =
        customers.length -
        activeCustomerCount;


    const totalStoredPoints =
        customers.reduce(
            (
                total,
                customer
            ) =>
                total +
                (
                    Number(
                        customer.loyaltyPoints
                    ) || 0
                ),
            0
        );


    /*
    ========================================================
    OPEN CUSTOMER DETAILS
    ========================================================
    */

    const openCustomer =
        async (
            customer
        ) => {

            const customerId =
                getId(
                    customer
                );


            if (!customerId) {

                return;

            }


            setSelectedCustomer(
                customer
            );


            setAnalytics(
                null
            );


            setCustomerSales(
                []
            );


            try {

                setDetailsLoading(
                    true
                );


                const [
                    customerResult,
                    analyticsResult,
                    salesResult,
                ] =
                    await Promise.all([

                        customerService
                            .getCustomerById(
                                customerId
                            ),

                        customerService
                            .getAnalytics(
                                customerId
                            ),

                        customerService
                            .getSales(
                                customerId,
                                {
                                    limit:
                                        100,
                                }
                            ),

                    ]);


                setSelectedCustomer(
                    customerResult?.data ||
                    customerResult
                );


                setAnalytics(
                    analyticsResult?.data ||
                    analyticsResult
                );


                const sales =
                    Array.isArray(
                        salesResult
                    )
                        ? salesResult
                        : Array.isArray(
                            salesResult?.data
                        )
                            ? salesResult.data
                            : [];


                setCustomerSales(
                    sales
                );


            } catch (
                err
            ) {

                console.error(
                    "Failed to load customer details:",
                    err
                );


                alert(
                    err.response
                        ?.data
                        ?.message ||
                    err.message ||
                    "Failed to load customer details."
                );


            } finally {

                setDetailsLoading(
                    false
                );

            }

        };


    /*
    ========================================================
    CLOSE CUSTOMER
    ========================================================
    */

    const closeCustomer =
        () => {

            setSelectedCustomer(
                null
            );


            setAnalytics(
                null
            );


            setCustomerSales(
                []
            );

        };


    /*
    ========================================================
    OPEN CREATE CUSTOMER
    ========================================================
    */

    const openCreateCustomer =
        () => {

            setEditingCustomer(
                null
            );


            setCustomerName(
                ""
            );


            setCustomerPhone(
                ""
            );


            setCustomerRfid(
                ""
            );


            setShowCustomerForm(
                true
            );

        };


    /*
    ========================================================
    OPEN EDIT CUSTOMER
    ========================================================
    */

    const openEditCustomer =
        (
            customer
        ) => {

            if (!isAdmin) {

                return;

            }


            setEditingCustomer(
                customer
            );


            setCustomerName(
                customer.name ||
                ""
            );


            setCustomerPhone(
                customer.phone ||
                ""
            );


            setCustomerRfid(
                customer.rfidUid ||
                ""
            );


            setShowCustomerForm(
                true
            );

        };


    /*
    ========================================================
    CLOSE CUSTOMER FORM
    ========================================================
    */

    const closeCustomerForm =
        () => {

            if (saving) {

                return;

            }


            setShowCustomerForm(
                false
            );


            setEditingCustomer(
                null
            );


            setCustomerName(
                ""
            );


            setCustomerPhone(
                ""
            );


            setCustomerRfid(
                ""
            );

        };


    /*
    ========================================================
    SAVE CUSTOMER
    ========================================================
    */

    const saveCustomer =
        async () => {

            const name =
                customerName
                    .trim();


            if (
                name.length <
                2
            ) {

                alert(
                    "Customer name must contain at least 2 characters."
                );

                return;

            }


            const payload = {

                name,

                phone:
                    customerPhone
                        .trim(),

                rfidUid:
                    customerRfid
                        .trim() ||
                    null,

            };


            try {

                setSaving(
                    true
                );


                if (
                    editingCustomer
                ) {

                    await customerService
                        .updateCustomer(
                            getId(
                                editingCustomer
                            ),
                            payload
                        );

                } else {

                    await customerService
                        .createCustomer(
                            payload
                        );

                }


                closeCustomerForm();


                await loadCustomers();


                if (
                    selectedCustomer &&
                    editingCustomer &&
                    String(
                        getId(
                            selectedCustomer
                        )
                    ) ===
                    String(
                        getId(
                            editingCustomer
                        )
                    )
                ) {

                    await openCustomer(
                        editingCustomer
                    );

                }


            } catch (
                err
            ) {

                console.error(
                    "Failed to save customer:",
                    err
                );


                alert(
                    err.response
                        ?.data
                        ?.message ||
                    err.message ||
                    "Failed to save customer."
                );


            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    TOGGLE CUSTOMER STATUS
    ========================================================
    */

    const toggleCustomerStatus =
        async (
            customer
        ) => {

            if (!isAdmin) {

                return;

            }


            const customerId =
                getId(
                    customer
                );


            if (!customerId) {

                return;

            }


            const newStatus =
                customer.isActive ===
                false;


            const confirmed =
                window.confirm(

                    newStatus

                        ? `Activate ${customer.name}?`

                        : `Deactivate ${customer.name}?`

                );


            if (!confirmed) {

                return;

            }


            try {

                setSaving(
                    true
                );


                await customerService
                    .updateCustomer(
                        customerId,
                        {
                            isActive:
                                newStatus,
                        }
                    );


                await loadCustomers();


                if (
                    selectedCustomer &&
                    String(
                        getId(
                            selectedCustomer
                        )
                    ) ===
                    String(
                        customerId
                    )
                ) {

                    const updated =
                        await customerService
                            .getCustomerById(
                                customerId
                            );


                    setSelectedCustomer(
                        updated?.data ||
                        updated
                    );

                }


            } catch (
                err
            ) {

                console.error(
                    "Failed to update customer status:",
                    err
                );


                alert(
                    err.response
                        ?.data
                        ?.message ||
                    err.message ||
                    "Failed to update customer status."
                );


            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <div className="space-y-6 pb-10">

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
                            Customers
                        </h1>


                        <p className="text-sm text-base-content/60 mt-1">
                            Customer profiles, purchase analytics, RFID, QR membership, and future loyalty rewards.
                        </p>

                    </div>

                </div>


                <div className="flex gap-2">

                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={
                            loadCustomers
                        }
                        disabled={
                            loading
                        }
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


                    {isAdmin && (

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={
                                openCreateCustomer
                            }
                        >

                            <FaUserPlus />

                            Add Customer

                        </button>

                    )}

                </div>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div className="alert alert-error">

                    <FaExclamationTriangle />

                    <span>
                        {error}
                    </span>

                </div>

            )}


            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

                <SummaryCard
                    label="Total Customers"
                    value={
                        customers.length
                    }
                    helper="Registered customers"
                    icon={
                        <FaUsers />
                    }
                />


                <SummaryCard
                    label="Active"
                    value={
                        activeCustomerCount
                    }
                    helper="Active memberships"
                    icon={
                        <FaCheckCircle />
                    }
                />


                <SummaryCard
                    label="Inactive"
                    value={
                        inactiveCustomerCount
                    }
                    helper="Inactive customers"
                    icon={
                        <FaBan />
                    }
                />


                <SummaryCard
                    label="Loyalty Points"
                    value={
                        totalStoredPoints.toLocaleString()
                    }
                    helper="Future rewards balance"
                    icon={
                        <FaStar />
                    }
                />

            </div>


            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm p-4">

                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">

                    <div className="relative w-full lg:w-[480px]">

                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />


                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            className="input input-bordered input-sm w-full pl-9"
                            placeholder="Search name, phone, customer code or RFID..."
                        />

                    </div>


                    <div className="tabs tabs-boxed">

                        <button
                            type="button"
                            className={`tab ${
                                statusFilter ===
                                "ALL"
                                    ? "tab-active"
                                    : ""
                            }`}
                            onClick={() =>
                                setStatusFilter(
                                    "ALL"
                                )
                            }
                        >
                            All
                        </button>


                        <button
                            type="button"
                            className={`tab ${
                                statusFilter ===
                                "ACTIVE"
                                    ? "tab-active"
                                    : ""
                            }`}
                            onClick={() =>
                                setStatusFilter(
                                    "ACTIVE"
                                )
                            }
                        >
                            Active
                        </button>


                        <button
                            type="button"
                            className={`tab ${
                                statusFilter ===
                                "INACTIVE"
                                    ? "tab-active"
                                    : ""
                            }`}
                            onClick={() =>
                                setStatusFilter(
                                    "INACTIVE"
                                )
                            }
                        >
                            Inactive
                        </button>

                    </div>

                </div>

            </div>


            {/* =================================================
                CUSTOMER LIST
            ================================================= */}

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-hidden">

                <div className="px-5 py-4 border-b border-base-200">

                    <h2 className="font-bold">
                        Customer Directory
                    </h2>


                    <p className="text-xs text-base-content/50 mt-1">

                        {
                            filteredCustomers.length
                        } customers

                    </p>

                </div>


                {loading ? (

                    <div className="py-16 text-center">

                        <span className="loading loading-spinner loading-md text-primary" />


                        <p className="mt-3 text-sm text-base-content/50">
                            Loading customers...
                        </p>

                    </div>

                ) : filteredCustomers.length ===
                    0 ? (

                    <div className="py-16 text-center">

                        <FaUsers className="mx-auto text-3xl text-base-content/20" />


                        <p className="font-semibold mt-3">
                            No customers found
                        </p>


                        <p className="text-xs text-base-content/40 mt-1">
                            Add a customer to begin tracking purchases.
                        </p>

                    </div>

                ) : (

                    <div className="divide-y divide-base-200">

                        {filteredCustomers.map(
                            (
                                customer
                            ) => (

                                <button
                                    key={
                                        getId(
                                            customer
                                        )
                                    }
                                    type="button"
                                    onClick={() =>
                                        openCustomer(
                                            customer
                                        )
                                    }
                                    className="w-full p-5 text-left hover:bg-base-200/40 transition"
                                >

                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">


                                        {/* CUSTOMER */}

                                        <div className="flex items-center gap-3 min-w-[260px]">

                                            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">

                                                <FaUsers />

                                            </div>


                                            <div>

                                                <p className="font-semibold">
                                                    {customer.name}
                                                </p>


                                                <p className="text-[10px] text-base-content/40 mt-1">

                                                    {
                                                        customer.customerCode
                                                    }

                                                    {
                                                        customer.phone
                                                            ? ` • ${customer.phone}`
                                                            : ""
                                                    }

                                                </p>

                                            </div>

                                        </div>


                                        {/* QR */}

                                        <div className="flex-1">

                                            <p className="text-[10px] text-base-content/40">
                                                QR Membership
                                            </p>


                                            <p className="text-sm font-semibold mt-1 flex items-center gap-2">

                                                <FaQrcode className="text-primary" />

                                                {
                                                    customer.customerCode
                                                        ? `STOREPOS:${customer.customerCode}`
                                                        : "Not available"
                                                }

                                            </p>

                                        </div>


                                        {/* RFID */}

                                        <div className="flex-1">

                                            <p className="text-[10px] text-base-content/40">
                                                RFID
                                            </p>


                                            <p className="text-sm font-semibold mt-1 flex items-center gap-2">

                                                <FaWifi className="text-info" />

                                                {
                                                    customer.rfidUid ||
                                                    "Not Assigned"
                                                }

                                            </p>

                                        </div>


                                        {/* LOYALTY */}

                                        <div className="min-w-[130px]">

                                            <p className="text-[10px] text-base-content/40">
                                                Loyalty
                                            </p>


                                            <p className="font-bold mt-1">

                                                {
                                                    Number(
                                                        customer.loyaltyPoints
                                                    ) || 0
                                                }

                                                {" pts"}

                                            </p>


                                            <p className="text-[10px] text-base-content/40">
                                                {customer.loyaltyTier || "REGULAR"}
                                            </p>

                                        </div>


                                        {/* STATUS */}

                                        <span
                                            className={`
                                                badge
                                                badge-sm

                                                ${
                                                    customer.isActive !==
                                                    false
                                                        ? "badge-success"
                                                        : "badge-error"
                                                }
                                            `}
                                        >

                                            {
                                                customer.isActive !==
                                                false
                                                    ? "Active"
                                                    : "Inactive"
                                            }

                                        </span>

                                    </div>

                                </button>

                            )
                        )}

                    </div>

                )}

            </div>


            {/* =================================================
                CUSTOMER DETAILS
            ================================================= */}

            {selectedCustomer && (

                <dialog className="modal modal-open">

                    <div className="modal-box max-w-6xl">

                        {/* HEADER */}

                        <div className="flex items-start justify-between gap-4">

                            <div className="flex items-center gap-3">

                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">

                                    <FaIdCard />

                                </div>


                                <div>

                                    <h2 className="text-xl font-bold">

                                        {
                                            selectedCustomer.name
                                        }

                                    </h2>


                                    <p className="text-xs text-base-content/50 mt-1">

                                        {
                                            selectedCustomer.customerCode
                                        }

                                        {
                                            selectedCustomer.phone
                                                ? ` • ${selectedCustomer.phone}`
                                                : ""
                                        }

                                    </p>

                                </div>

                            </div>


                            <div className="flex items-center gap-2">

                                {isAdmin && (

                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        onClick={() =>
                                            openEditCustomer(
                                                selectedCustomer
                                            )
                                        }
                                    >

                                        <FaEdit />

                                        Edit

                                    </button>

                                )}


                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm btn-square"
                                    onClick={
                                        closeCustomer
                                    }
                                >

                                    <FaTimes />

                                </button>

                            </div>

                        </div>


                        {detailsLoading ? (

                            <div className="py-20 text-center">

                                <span className="loading loading-spinner loading-lg text-primary" />


                                <p className="text-sm text-base-content/50 mt-3">
                                    Loading customer analytics...
                                </p>

                            </div>

                        ) : (

                            <>

                                {/* =====================================
                                    MEMBERSHIP
                                ===================================== */}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">

                                    <InfoCard
                                        icon={
                                            <FaQrcode />
                                        }
                                        label="QR Membership"
                                        value={
                                            selectedCustomer.customerCode
                                                ? `STOREPOS:${selectedCustomer.customerCode}`
                                                : "Not available"
                                        }
                                    />


                                    <InfoCard
                                        icon={
                                            <FaWifi />
                                        }
                                        label="RFID UID"
                                        value={
                                            selectedCustomer.rfidUid ||
                                            "Not Assigned"
                                        }
                                    />


                                    <InfoCard
                                        icon={
                                            <FaStar />
                                        }
                                        label="Loyalty"
                                        value={
                                            `${
                                                Number(
                                                    selectedCustomer.loyaltyPoints
                                                ) || 0
                                            } pts • ${
                                                selectedCustomer.loyaltyTier ||
                                                "REGULAR"
                                            }`
                                        }
                                    />

                                </div>


                                {/* =====================================
                                    SPENDING ANALYTICS
                                ===================================== */}

                                <div className="mt-6">

                                    <div className="flex items-center gap-2 mb-3">

                                        <FaChartLine className="text-primary" />


                                        <h3 className="font-bold">
                                            Purchase Analytics
                                        </h3>

                                    </div>


                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

                                        <AnalyticsCard
                                            label="Today"
                                            value={
                                                formatMoney(
                                                    analytics
                                                        ?.spending
                                                        ?.today
                                                )
                                            }
                                            icon={
                                                <FaCalendarDay />
                                            }
                                        />


                                        <AnalyticsCard
                                            label="This Week"
                                            value={
                                                formatMoney(
                                                    analytics
                                                        ?.spending
                                                        ?.week
                                                )
                                            }
                                            icon={
                                                <FaCalendarWeek />
                                            }
                                        />


                                        <AnalyticsCard
                                            label="This Month"
                                            value={
                                                formatMoney(
                                                    analytics
                                                        ?.spending
                                                        ?.month
                                                )
                                            }
                                            icon={
                                                <FaCalendarAlt />
                                            }
                                        />


                                        <AnalyticsCard
                                            label="This Year"
                                            value={
                                                formatMoney(
                                                    analytics
                                                        ?.spending
                                                        ?.year
                                                )
                                            }
                                            icon={
                                                <FaChartLine />
                                            }
                                        />


                                        <AnalyticsCard
                                            label="Lifetime"
                                            value={
                                                formatMoney(
                                                    analytics
                                                        ?.spending
                                                        ?.lifetime
                                                )
                                            }
                                            icon={
                                                <FaWallet />
                                            }
                                        />

                                    </div>

                                </div>


                                {/* =====================================
                                    CUSTOMER STATS
                                ===================================== */}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">

                                    <MetricCard
                                        label="Transactions"
                                        value={
                                            analytics
                                                ?.transactionCount ||
                                            0
                                        }
                                        helper="Qualifying purchases"
                                    />


                                    <MetricCard
                                        label="Average Purchase"
                                        value={
                                            formatMoney(
                                                analytics
                                                    ?.averageTransaction
                                            )
                                        }
                                        helper="Lifetime average"
                                    />


                                    <MetricCard
                                        label="Last Purchase"
                                        value={
                                            formatDate(
                                                analytics
                                                    ?.lastPurchaseAt
                                            )
                                        }
                                        helper="Most recent purchase"
                                    />

                                </div>


                                {/* =====================================
                                    LOYALTY PLACEHOLDER
                                ===================================== */}

                                <div className="mt-5 rounded-xl border border-warning/20 bg-warning/10 p-4">

                                    <div className="flex items-start gap-3">

                                        <FaStar className="text-warning mt-1" />


                                        <div>

                                            <p className="font-semibold text-sm">
                                                Loyalty System Ready
                                            </p>


                                            <p className="text-xs text-base-content/60 mt-1">

                                                Customer purchases are now linked to this profile.
                                                Loyalty earning and redemption rules can be added later
                                                without changing the purchase history structure.

                                            </p>

                                        </div>

                                    </div>

                                </div>


                                {/* =====================================
                                    PURCHASE HISTORY
                                ===================================== */}

                                <div className="mt-7">

                                    <div className="flex items-center justify-between gap-3 mb-3">

                                        <div>

                                            <div className="flex items-center gap-2">

                                                <FaHistory className="text-base-content/40" />


                                                <h3 className="font-bold">
                                                    Purchase History
                                                </h3>

                                            </div>


                                            <p className="text-xs text-base-content/40 mt-1">
                                                Recent registered purchases and net purchase amounts.
                                            </p>

                                        </div>


                                        <span className="text-xs text-base-content/40">

                                            {
                                                customerSales.length
                                            } sales

                                        </span>

                                    </div>


                                    <CustomerSalesTable
                                        sales={
                                            customerSales
                                        }
                                        formatMoney={
                                            formatMoney
                                        }
                                        formatDateTime={
                                            formatDateTime
                                        }
                                    />

                                </div>


                                {/* =====================================
                                    ADMIN ACTIONS
                                ===================================== */}

                                {isAdmin && (

                                    <div className="modal-action">

                                        <button
                                            type="button"
                                            disabled={
                                                saving
                                            }
                                            className={
                                                selectedCustomer.isActive !==
                                                false
                                                    ? "btn btn-error btn-outline"
                                                    : "btn btn-success btn-outline"
                                            }
                                            onClick={() =>
                                                toggleCustomerStatus(
                                                    selectedCustomer
                                                )
                                            }
                                        >

                                            {
                                                selectedCustomer.isActive !==
                                                false
                                                    ? (
                                                        <>
                                                            <FaBan />
                                                            Deactivate
                                                        </>
                                                    )
                                                    : (
                                                        <>
                                                            <FaCheckCircle />
                                                            Activate
                                                        </>
                                                    )
                                            }

                                        </button>

                                    </div>

                                )}

                            </>

                        )}

                    </div>

                </dialog>

            )}


            {/* =================================================
                CREATE / EDIT CUSTOMER
            ================================================= */}

            {showCustomerForm && (

                <dialog className="modal modal-open">

                    <div className="modal-box max-w-lg">

                        <div className="flex items-start justify-between gap-4">

                            <div>

                                <h2 className="text-xl font-bold">

                                    {
                                        editingCustomer
                                            ? "Edit Customer"
                                            : "Add Customer"
                                    }

                                </h2>


                                <p className="text-xs text-base-content/50 mt-1">

                                    {
                                        editingCustomer
                                            ? "Update customer membership information."
                                            : "Create a customer profile for purchase tracking and future loyalty."
                                    }

                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-square"
                                onClick={
                                    closeCustomerForm
                                }
                                disabled={
                                    saving
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        {/* NAME */}

                        <div className="mt-5">

                            <label className="label">

                                <span className="label-text font-semibold">
                                    Customer Name *
                                </span>

                            </label>


                            <input
                                type="text"
                                autoFocus
                                value={
                                    customerName
                                }
                                onChange={(
                                    event
                                ) =>
                                    setCustomerName(
                                        event.target.value
                                    )
                                }
                                className="input input-bordered w-full"
                                placeholder="Juan Dela Cruz"
                            />

                        </div>


                        {/* PHONE */}

                        <div className="mt-4">

                            <label className="label">

                                <span className="label-text font-semibold">
                                    Phone
                                </span>

                            </label>


                            <input
                                type="text"
                                value={
                                    customerPhone
                                }
                                onChange={(
                                    event
                                ) =>
                                    setCustomerPhone(
                                        event.target.value
                                    )
                                }
                                className="input input-bordered w-full"
                                placeholder="09171234567"
                            />

                        </div>


                        {/* RFID */}

                        <div className="mt-4">

                            <label className="label">

                                <span className="label-text font-semibold">
                                    RFID / NFC UID
                                </span>

                            </label>


                            <div className="relative">

                                <FaWifi className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40" />


                                <input
                                    type="text"
                                    value={
                                        customerRfid
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCustomerRfid(
                                            event.target.value
                                                .toUpperCase()
                                        )
                                    }
                                    className="input input-bordered w-full pl-10"
                                    placeholder="Tap/scan RFID or type UID"
                                    autoComplete="off"
                                />

                            </div>


                            <p className="text-[10px] text-base-content/40 mt-1">
                                Optional. Leave blank if the customer uses QR only.
                            </p>

                        </div>


                        {/* QR */}

                        <div className="rounded-xl bg-base-200/50 p-4 mt-5">

                            <div className="flex gap-3">

                                <FaQrcode className="text-primary mt-1" />


                                <div>

                                    <p className="font-semibold text-sm">
                                        QR Membership
                                    </p>


                                    <p className="text-xs text-base-content/50 mt-1">

                                        {
                                            editingCustomer
                                                ?.customerCode
                                                ? `STOREPOS:${editingCustomer.customerCode}`
                                                : "A unique customer QR value will be created automatically."
                                        }

                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* ACTIONS */}

                        <div className="modal-action">

                            <button
                                type="button"
                                className="btn"
                                onClick={
                                    closeCustomerForm
                                }
                                disabled={
                                    saving
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={
                                    saveCustomer
                                }
                                disabled={
                                    saving ||
                                    customerName
                                        .trim()
                                        .length <
                                        2
                                }
                            >

                                {
                                    saving
                                        ? (
                                            <span className="loading loading-spinner loading-sm" />
                                        )
                                        : editingCustomer
                                            ? (
                                                <FaEdit />
                                            )
                                            : (
                                                <FaUserPlus />
                                            )
                                }

                                {
                                    saving
                                        ? "Saving..."
                                        : editingCustomer
                                            ? "Save Changes"
                                            : "Create Customer"
                                }

                            </button>

                        </div>

                    </div>

                </dialog>

            )}

        </div>

    );

}


/*
============================================================
SUMMARY CARD
============================================================
*/

function SummaryCard({
    label,
    value,
    helper,
    icon,
}) {

    return (

        <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

            <div className="flex items-start justify-between gap-3">

                <div>

                    <p className="text-xs text-base-content/50">
                        {label}
                    </p>


                    <p className="text-2xl font-bold mt-2">
                        {value}
                    </p>

                </div>


                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                    {icon}

                </div>

            </div>


            <p className="text-[10px] text-base-content/50 mt-2">
                {helper}
            </p>

        </div>

    );

}


/*
============================================================
ANALYTICS CARD
============================================================
*/

function AnalyticsCard({
    label,
    value,
    icon,
}) {

    return (

        <div className="rounded-xl border border-base-200 bg-base-100 p-4">

            <div className="flex items-center justify-between gap-3">

                <p className="text-xs text-base-content/50">
                    {label}
                </p>


                <span className="text-primary">
                    {icon}
                </span>

            </div>


            <p className="text-xl font-bold mt-3">
                {value}
            </p>

        </div>

    );

}


/*
============================================================
METRIC CARD
============================================================
*/

function MetricCard({
    label,
    value,
    helper,
}) {

    return (

        <div className="rounded-xl bg-base-200/50 p-4">

            <p className="text-xs text-base-content/50">
                {label}
            </p>


            <p className="text-lg font-bold mt-2">
                {value}
            </p>


            <p className="text-[10px] text-base-content/40 mt-1">
                {helper}
            </p>

        </div>

    );

}


/*
============================================================
INFO CARD
============================================================
*/

function InfoCard({
    icon,
    label,
    value,
}) {

    return (

        <div className="border border-base-200 rounded-xl p-4">

            <div className="flex items-start gap-3">

                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">

                    {icon}

                </div>


                <div className="min-w-0">

                    <p className="text-[10px] text-base-content/40">
                        {label}
                    </p>


                    <p className="font-semibold text-sm mt-1 break-all">
                        {value}
                    </p>

                </div>

            </div>

        </div>

    );

}


/*
============================================================
CUSTOMER SALES TABLE
============================================================
*/

function CustomerSalesTable({
    sales,
    formatMoney,
    formatDateTime,
}) {

    if (
        !sales ||
        sales.length ===
        0
    ) {

        return (

            <div className="border border-base-200 rounded-xl py-12 text-center">

                <FaShoppingCart className="mx-auto text-3xl text-base-content/20" />


                <p className="font-semibold mt-3">
                    No registered purchases
                </p>


                <p className="text-xs text-base-content/40 mt-1">
                    Purchases will appear here when this customer is selected during checkout.
                </p>

            </div>

        );

    }


    return (

        <div className="border border-base-200 rounded-xl overflow-x-auto">

            <table className="table table-sm">

                <thead>

                    <tr>

                        <th>
                            Receipt
                        </th>

                        <th>
                            Date
                        </th>

                        <th>
                            Cashier
                        </th>

                        <th>
                            Status
                        </th>

                        <th className="text-right">
                            Original
                        </th>

                        <th className="text-right">
                            Net Purchase
                        </th>

                    </tr>

                </thead>


                <tbody>

                    {sales.map(
                        (
                            sale
                        ) => (

                            <tr
                                key={
                                    sale._id ||
                                    sale.id
                                }
                            >

                                <td>

                                    <div className="flex items-center gap-2">

                                        <FaReceipt className="text-base-content/30" />


                                        <span className="font-semibold">
                                            {sale.receiptNumber}
                                        </span>

                                    </div>

                                </td>


                                <td className="whitespace-nowrap">

                                    {
                                        formatDateTime(
                                            sale.createdAt
                                        )
                                    }

                                </td>


                                <td>

                                    {
                                        sale.cashier?.name ||
                                        "—"
                                    }

                                </td>


                                <td>

                                    <span
                                        className={`
                                            badge
                                            badge-sm

                                            ${
                                                sale.status ===
                                                "COMPLETED"
                                                    ? "badge-success"
                                                    : sale.status ===
                                                        "PARTIALLY_REFUNDED"
                                                        ? "badge-warning"
                                                        : sale.status ===
                                                            "REFUNDED"
                                                            ? "badge-info"
                                                            : "badge-error"
                                            }
                                        `}
                                    >

                                        {sale.status}

                                    </span>

                                </td>


                                <td className="text-right">

                                    {
                                        formatMoney(
                                            sale.total
                                        )
                                    }

                                </td>


                                <td className="text-right font-bold">

                                    {
                                        formatMoney(
                                            sale.netAmount
                                        )
                                    }

                                </td>

                            </tr>

                        )
                    )}

                </tbody>

            </table>

        </div>

    );

}


export default CustomersPage;