import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    FaArrowLeft,
    FaBoxes,
    FaWarehouse,
    FaExclamationTriangle,
    FaSearch,
    FaDownload,
    FaSyncAlt,
    FaCheckCircle,
    FaTimesCircle,
    FaBoxOpen,
} from "react-icons/fa";

import useProductStore from "../../store/product.store";
import useAuthStore from "../../store/auth.store";


/*
============================================================
FORMAT NUMBER
============================================================
*/

const formatNumber = (
    value
) => {

    return new Intl.NumberFormat(
        "en-PH"
    ).format(
        Number(
            value
        ) || 0
    );

};


/*
============================================================
GET STOCK
============================================================

The backend product service overlays this value from the
active branch's BranchInventory record.

This report does NOT read legacy Product.stock directly.
============================================================
*/

const getStock = (
    product
) => {

    const stock =
        Number(
            product?.stock ??
            0
        );


    return Number.isFinite(
        stock
    )
        ? Math.max(
            stock,
            0
        )
        : 0;

};


/*
============================================================
GET MINIMUM STOCK
============================================================

Also supplied from BranchInventory by the backend.
============================================================
*/

const getMinimumStock = (
    product
) => {

    const minimumStock =
        Number(
            product?.minimumStock ??
            0
        );


    return Number.isFinite(
        minimumStock
    )
        ? Math.max(
            minimumStock,
            0
        )
        : 0;

};


/*
============================================================
INVENTORY CONFIGURED
============================================================
*/

const isInventoryConfigured = (
    product
) => {

    /*
    New branch-aware product response.
    */

    if (
        product
            ?.branchInventoryConfigured !==
        undefined
    ) {

        return (
            product
                .branchInventoryConfigured ===
            true
        );

    }


    /*
    Compatibility fallback.

    Older API responses may not contain the explicit field.
    */

    return (
        product?.stock !==
            undefined &&
        product?.stock !==
            null
    );

};


/*
============================================================
INVENTORY STATUS
============================================================
*/

const getInventoryStatus = (
    product
) => {

    if (
        !isInventoryConfigured(
            product
        )
    ) {

        return {

            key:
                "UNCONFIGURED",

            label:
                "Not Configured",

            badgeClass:
                "badge badge-ghost badge-sm",

        };

    }


    const stock =
        getStock(
            product
        );


    const minimumStock =
        getMinimumStock(
            product
        );


    if (
        stock <= 0
    ) {

        return {

            key:
                "OUT",

            label:
                "Out of Stock",

            badgeClass:
                "badge badge-error badge-sm",

        };

    }


    /*
    If minimumStock is configured, use it as the
    authoritative low-stock threshold.

    If it is zero, any positive quantity is considered
    healthy.
    */

    if (
        minimumStock > 0 &&
        stock <=
            minimumStock
    ) {

        return {

            key:
                "LOW",

            label:
                "Low Stock",

            badgeClass:
                "badge badge-warning badge-sm",

        };

    }


    return {

        key:
            "HEALTHY",

        label:
            "In Stock",

        badgeClass:
            "badge badge-success badge-sm",

    };

};


/*
============================================================
PRODUCT CATEGORY
============================================================
*/

const getCategory = (
    product
) => {

    const category =
        product?.category;


    if (
        category &&
        typeof category ===
            "object"
    ) {

        return (
            category.name ||
            "Uncategorized"
        );

    }


    return (
        category ||
        "Uncategorized"
    );

};


/*
============================================================
INVENTORY REPORT PAGE
============================================================
*/

function InventoryReportPage() {

    const navigate =
        useNavigate();


    /*
    ========================================================
    PRODUCT STORE
    ========================================================
    */

    const products =
        useProductStore(
            (
                state
            ) =>
                state.products
        );


    const fetchProducts =
        useProductStore(
            (
                state
            ) =>
                state.fetchProducts
        );


    /*
    ========================================================
    ACTIVE BRANCH
    ========================================================
    */

    const activeBranch =
        useAuthStore(
            (
                state
            ) =>
                state.activeBranch
        );


    /*
    ========================================================
    LOCAL STATE
    ========================================================
    */

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        refreshing,
        setRefreshing,
    ] =
        useState(
            false
        );


    const [
        error,
        setError,
    ] =
        useState(
            ""
        );


    const [
        search,
        setSearch,
    ] =
        useState(
            ""
        );


    const [
        statusFilter,
        setStatusFilter,
    ] =
        useState(
            "ALL"
        );


    const [
        categoryFilter,
        setCategoryFilter,
    ] =
        useState(
            "ALL"
        );


    const [
        productStatusFilter,
        setProductStatusFilter,
    ] =
        useState(
            "ACTIVE"
        );


    const [
        sortBy,
        setSortBy,
    ] =
        useState(
            "stock-asc"
        );


    /*
    ========================================================
    LOAD REPORT
    ========================================================
    */

    const loadReport =
        useCallback(
            async (
                manual =
                    false
            ) => {

                try {

                    setError(
                        ""
                    );


                    if (
                        manual
                    ) {

                        setRefreshing(
                            true
                        );

                    } else {

                        setLoading(
                            true
                        );

                    }


                    await fetchProducts();


                } catch (
                    err
                ) {

                    console.error(
                        "Failed to load inventory report:",
                        err
                    );


                    setError(
                        err?.response
                            ?.data
                            ?.message ||
                        err?.message ||
                        "Failed to load inventory report."
                    );


                } finally {

                    setLoading(
                        false
                    );


                    setRefreshing(
                        false
                    );

                }

            },
            [
                fetchProducts,
            ]
        );


    useEffect(
        () => {

            loadReport();

        },
        [
            loadReport,
        ]
    );


    /*
    ========================================================
    SAFE PRODUCTS
    ========================================================
    */

    const safeProducts =
        useMemo(
            () => {

                return Array.isArray(
                    products
                )
                    ? products
                    : [];

            },
            [
                products,
            ]
        );


    /*
    ========================================================
    CATEGORIES
    ========================================================
    */

    const categories =
        useMemo(
            () => {

                return Array.from(
                    new Set(
                        safeProducts

                            .map(
                                (
                                    product
                                ) =>
                                    getCategory(
                                        product
                                    )
                            )

                            .filter(
                                Boolean
                            )
                    )
                ).sort(
                    (
                        a,
                        b
                    ) =>
                        String(
                            a
                        ).localeCompare(
                            String(
                                b
                            )
                        )
                );

            },
            [
                safeProducts,
            ]
        );


    /*
    ========================================================
    SUMMARY
    ========================================================
    */

    const summary =
        useMemo(
            () => {

                let totalUnits =
                    0;

                let healthy =
                    0;

                let lowStock =
                    0;

                let outOfStock =
                    0;

                let unconfigured =
                    0;

                let activeProducts =
                    0;


                safeProducts.forEach(
                    (
                        product
                    ) => {

                        if (
                            product?.isActive !==
                            false
                        ) {

                            activeProducts +=
                                1;

                        }


                        const configured =
                            isInventoryConfigured(
                                product
                            );


                        if (
                            configured
                        ) {

                            totalUnits +=
                                getStock(
                                    product
                                );

                        }


                        const status =
                            getInventoryStatus(
                                product
                            );


                        if (
                            status.key ===
                            "HEALTHY"
                        ) {

                            healthy +=
                                1;

                        }


                        if (
                            status.key ===
                            "LOW"
                        ) {

                            lowStock +=
                                1;

                        }


                        if (
                            status.key ===
                            "OUT"
                        ) {

                            outOfStock +=
                                1;

                        }


                        if (
                            status.key ===
                            "UNCONFIGURED"
                        ) {

                            unconfigured +=
                                1;

                        }

                    }
                );


                return {

                    totalProducts:
                        safeProducts.length,

                    activeProducts,

                    totalUnits,

                    healthy,

                    lowStock,

                    outOfStock,

                    unconfigured,

                };

            },
            [
                safeProducts,
            ]
        );


    /*
    ========================================================
    FILTERED PRODUCTS
    ========================================================
    */

    const filteredProducts =
        useMemo(
            () => {

                const keyword =
                    search
                        .trim()
                        .toLowerCase();


                const result =
                    safeProducts.filter(
                        (
                            product
                        ) => {

                            /*
                            ------------------------------------
                            SEARCH
                            ------------------------------------
                            */

                            const matchesSearch =
                                !keyword ||
                                String(
                                    product?.name ||
                                    ""
                                )
                                    .toLowerCase()
                                    .includes(
                                        keyword
                                    ) ||
                                String(
                                    product?.barcode ||
                                    ""
                                )
                                    .toLowerCase()
                                    .includes(
                                        keyword
                                    ) ||
                                String(
                                    getCategory(
                                        product
                                    )
                                )
                                    .toLowerCase()
                                    .includes(
                                        keyword
                                    );


                            /*
                            ------------------------------------
                            CATEGORY
                            ------------------------------------
                            */

                            const matchesCategory =
                                categoryFilter ===
                                    "ALL" ||
                                getCategory(
                                    product
                                ) ===
                                    categoryFilter;


                            /*
                            ------------------------------------
                            PRODUCT STATUS
                            ------------------------------------
                            */

                            const matchesProductStatus =
                                productStatusFilter ===
                                    "ALL"
                                    ? true
                                    : productStatusFilter ===
                                      "ACTIVE"
                                        ? product?.isActive !==
                                          false
                                        : product?.isActive ===
                                          false;


                            /*
                            ------------------------------------
                            INVENTORY STATUS
                            ------------------------------------
                            */

                            const inventoryStatus =
                                getInventoryStatus(
                                    product
                                );


                            const matchesInventoryStatus =
                                statusFilter ===
                                    "ALL" ||
                                inventoryStatus.key ===
                                    statusFilter;


                            return (
                                matchesSearch &&
                                matchesCategory &&
                                matchesProductStatus &&
                                matchesInventoryStatus
                            );

                        }
                    );


                /*
                ==================================================
                SORT
                ==================================================
                */

                result.sort(
                    (
                        a,
                        b
                    ) => {

                        if (
                            sortBy ===
                            "stock-asc"
                        ) {

                            return (
                                getStock(
                                    a
                                ) -
                                getStock(
                                    b
                                )
                            );

                        }


                        if (
                            sortBy ===
                            "stock-desc"
                        ) {

                            return (
                                getStock(
                                    b
                                ) -
                                getStock(
                                    a
                                )
                            );

                        }


                        if (
                            sortBy ===
                            "minimum-desc"
                        ) {

                            return (
                                getMinimumStock(
                                    b
                                ) -
                                getMinimumStock(
                                    a
                                )
                            );

                        }


                        if (
                            sortBy ===
                            "name"
                        ) {

                            return String(
                                a?.name ||
                                ""
                            ).localeCompare(
                                String(
                                    b?.name ||
                                    ""
                                )
                            );

                        }


                        if (
                            sortBy ===
                            "category"
                        ) {

                            return String(
                                getCategory(
                                    a
                                )
                            ).localeCompare(
                                String(
                                    getCategory(
                                        b
                                    )
                                )
                            );

                        }


                        return 0;

                    }
                );


                return result;

            },
            [
                safeProducts,
                search,
                statusFilter,
                categoryFilter,
                productStatusFilter,
                sortBy,
            ]
        );


    /*
    ========================================================
    EXPORT CSV
    ========================================================
    */

    const handleExport =
        () => {

            if (
                filteredProducts.length ===
                0
            ) {

                window.alert(
                    "There is no inventory data to export."
                );


                return;

            }


            const headers = [

                "Barcode",

                "Product",

                "Category",

                "Current Stock",

                "Minimum Stock",

                "Inventory Status",

                "Product Status",

                "Inventory Configured",

                "Branch",

            ];


            const rows =
                filteredProducts.map(
                    (
                        product
                    ) => {

                        const status =
                            getInventoryStatus(
                                product
                            );


                        return [

                            product?.barcode ||
                                "",

                            product?.name ||
                                "",

                            getCategory(
                                product
                            ),

                            getStock(
                                product
                            ),

                            getMinimumStock(
                                product
                            ),

                            status.label,

                            product?.isActive !==
                                false
                                ? "Active"
                                : "Archived",

                            isInventoryConfigured(
                                product
                            )
                                ? "Yes"
                                : "No",

                            activeBranch?.name ||
                                activeBranch?.code ||
                                "",

                        ];

                    }
                );


            const escapeCsv =
                (
                    value
                ) => {

                    return `"${String(
                        value ??
                        ""
                    ).replace(
                        /"/g,
                        '""'
                    )}"`;

                };


            const csv =
                [
                    headers,
                    ...rows,
                ]

                    .map(
                        (
                            row
                        ) =>
                            row
                                .map(
                                    escapeCsv
                                )
                                .join(
                                    ","
                                )
                    )

                    .join(
                        "\n"
                    );


            const blob =
                new Blob(
                    [
                        "\uFEFF",
                        csv,
                    ],
                    {
                        type:
                            "text/csv;charset=utf-8;",
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            const branchCode =
                String(
                    activeBranch?.code ||
                    "branch"
                )
                    .trim()
                    .toLowerCase();


            link.href =
                url;


            link.download =
                `inventory-report-${branchCode}-${new Date()
                    .toISOString()
                    .slice(
                        0,
                        10
                    )}.csv`;


            document.body.appendChild(
                link
            );


            link.click();


            document.body.removeChild(
                link
            );


            URL.revokeObjectURL(
                url
            );

        };


    /*
    ========================================================
    LOADING
    ========================================================
    */

    if (
        loading &&
        safeProducts.length ===
            0
    ) {

        return (

            <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                    <span className="loading loading-spinner loading-lg text-primary" />


                    <p className="mt-3 text-sm text-base-content/50">

                        Building inventory report...

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

        <div className="space-y-6 pb-8">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                <div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/reports"
                            )
                        }
                        className="mb-3 flex items-center gap-2 text-sm text-base-content/50 transition hover:text-primary"
                    >

                        <FaArrowLeft />

                        Back to Reports

                    </button>


                    <div className="flex items-center gap-3">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">

                            <FaWarehouse />

                        </div>


                        <div>

                            <h1 className="text-2xl font-bold">

                                Inventory Report

                            </h1>


                            <p className="mt-1 text-sm text-base-content/55">

                                Monitor stock levels and inventory alerts for{" "}

                                <span className="font-semibold">

                                    {
                                        activeBranch?.name ||
                                        activeBranch?.code ||
                                        "the active branch"
                                    }

                                </span>

                                .

                            </p>

                        </div>

                    </div>

                </div>


                <div className="flex flex-wrap gap-2">

                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                            loadReport(
                                true
                            )
                        }
                        disabled={
                            refreshing
                        }
                    >

                        <FaSyncAlt
                            className={
                                refreshing
                                    ? "animate-spin"
                                    : ""
                            }
                        />


                        {
                            refreshing
                                ? "Refreshing"
                                : "Refresh"
                        }

                    </button>


                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={
                            handleExport
                        }
                    >

                        <FaDownload />

                        Export CSV

                    </button>

                </div>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {
                error &&
                (

                    <div className="alert alert-error">

                        <span>
                            {error}
                        </span>

                    </div>

                )
            }


            {/* =================================================
                BRANCH INDICATOR
            ================================================= */}

            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">

                    <FaWarehouse />

                </div>


                <div>

                    <p className="text-sm font-semibold">

                        {
                            activeBranch?.name ||
                            "Active Branch"
                        }

                    </p>


                    <p className="text-xs text-base-content/50">

                        {
                            activeBranch?.code
                                ? `Branch ${activeBranch.code}`
                                : "Inventory for the currently selected branch"
                        }

                    </p>

                </div>

            </div>


            {/* =================================================
                PRIMARY SUMMARY
            ================================================= */}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

                <SummaryCard
                    title="Products"
                    value={
                        formatNumber(
                            summary.totalProducts
                        )
                    }
                    description={`${summary.activeProducts} active products`}
                    icon={
                        FaBoxes
                    }
                    iconClass="bg-primary/10 text-primary"
                />


                <SummaryCard
                    title="Units in Stock"
                    value={
                        formatNumber(
                            summary.totalUnits
                        )
                    }
                    description="Current branch inventory"
                    icon={
                        FaWarehouse
                    }
                    iconClass="bg-info/10 text-info"
                />


                <SummaryCard
                    title="Low Stock"
                    value={
                        formatNumber(
                            summary.lowStock
                        )
                    }
                    description="At or below minimum stock"
                    icon={
                        FaExclamationTriangle
                    }
                    iconClass="bg-warning/10 text-warning"
                />


                <SummaryCard
                    title="Out of Stock"
                    value={
                        formatNumber(
                            summary.outOfStock
                        )
                    }
                    description="Zero units remaining"
                    icon={
                        FaTimesCircle
                    }
                    iconClass="bg-error/10 text-error"
                />

            </div>


            {/* =================================================
                INVENTORY HEALTH
            ================================================= */}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                <MiniStatusCard
                    label="Healthy"
                    value={
                        summary.healthy
                    }
                    icon={
                        FaCheckCircle
                    }
                    className="text-success"
                />


                <MiniStatusCard
                    label="Low Stock"
                    value={
                        summary.lowStock
                    }
                    icon={
                        FaExclamationTriangle
                    }
                    className="text-warning"
                />


                <MiniStatusCard
                    label="Out of Stock"
                    value={
                        summary.outOfStock
                    }
                    icon={
                        FaBoxOpen
                    }
                    className="text-error"
                />


                <MiniStatusCard
                    label="Not Configured"
                    value={
                        summary.unconfigured
                    }
                    icon={
                        FaWarehouse
                    }
                    className="text-base-content/50"
                />

            </div>


            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="rounded-xl border border-base-300 bg-base-100 p-4">

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">

                    <div className="relative xl:col-span-2">

                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/35" />


                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Search product, barcode or category..."
                            className="input input-bordered w-full pl-9"
                        />

                    </div>


                    <select
                        value={
                            categoryFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setCategoryFilter(
                                event.target
                                    .value
                            )
                        }
                        className="select select-bordered"
                    >

                        <option value="ALL">
                            All Categories
                        </option>


                        {
                            categories.map(
                                (
                                    category
                                ) => (

                                    <option
                                        key={
                                            category
                                        }
                                        value={
                                            category
                                        }
                                    >

                                        {
                                            category
                                        }

                                    </option>

                                )
                            )
                        }

                    </select>


                    <select
                        value={
                            statusFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setStatusFilter(
                                event.target
                                    .value
                            )
                        }
                        className="select select-bordered"
                    >

                        <option value="ALL">
                            All Inventory
                        </option>

                        <option value="HEALTHY">
                            In Stock
                        </option>

                        <option value="LOW">
                            Low Stock
                        </option>

                        <option value="OUT">
                            Out of Stock
                        </option>

                        <option value="UNCONFIGURED">
                            Not Configured
                        </option>

                    </select>


                    <select
                        value={
                            productStatusFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setProductStatusFilter(
                                event.target
                                    .value
                            )
                        }
                        className="select select-bordered"
                    >

                        <option value="ACTIVE">
                            Active Products
                        </option>

                        <option value="ARCHIVED">
                            Archived Products
                        </option>

                        <option value="ALL">
                            All Products
                        </option>

                    </select>

                </div>


                <div className="mt-3 flex justify-end">

                    <select
                        value={
                            sortBy
                        }
                        onChange={(
                            event
                        ) =>
                            setSortBy(
                                event.target
                                    .value
                            )
                        }
                        className="select select-bordered select-sm"
                    >

                        <option value="stock-asc">
                            Lowest Stock
                        </option>

                        <option value="stock-desc">
                            Highest Stock
                        </option>

                        <option value="minimum-desc">
                            Highest Minimum Stock
                        </option>

                        <option value="name">
                            Product Name
                        </option>

                        <option value="category">
                            Category
                        </option>

                    </select>

                </div>

            </div>


            {/* =================================================
                INVENTORY TABLE
            ================================================= */}

            <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">

                <div className="border-b border-base-200 px-5 py-4">

                    <h2 className="font-bold">

                        Branch Inventory

                    </h2>


                    <p className="mt-1 text-xs text-base-content/50">

                        {
                            filteredProducts.length
                        }{" "}

                        product

                        {
                            filteredProducts.length !==
                                1
                                ? "s"
                                : ""
                        }{" "}

                        shown

                    </p>

                </div>


                <div className="overflow-x-auto">

                    <table className="table">

                        <thead>

                            <tr>

                                <th>
                                    Product
                                </th>

                                <th>
                                    Barcode
                                </th>

                                <th>
                                    Category
                                </th>

                                <th className="text-right">
                                    Stock
                                </th>

                                <th className="text-right">
                                    Minimum
                                </th>

                                <th>
                                    Inventory Status
                                </th>

                                <th>
                                    Product Status
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                filteredProducts.map(
                                    (
                                        product
                                    ) => {

                                        const status =
                                            getInventoryStatus(
                                                product
                                            );


                                        const stock =
                                            getStock(
                                                product
                                            );


                                        const minimumStock =
                                            getMinimumStock(
                                                product
                                            );


                                        return (

                                            <tr
                                                key={
                                                    product._id ||
                                                    product.id
                                                }
                                                className="hover"
                                            >

                                                <td>

                                                    <div>

                                                        <p className="font-semibold">

                                                            {
                                                                product.name ||
                                                                "Unnamed Product"
                                                            }

                                                        </p>


                                                        {
                                                            product
                                                                ?.branchInventoryConfigured ===
                                                                false &&
                                                            (

                                                                <p className="mt-0.5 text-[10px] text-warning">

                                                                    No BranchInventory record

                                                                </p>

                                                            )
                                                        }

                                                    </div>

                                                </td>


                                                <td>

                                                    <span className="font-mono text-xs">

                                                        {
                                                            product.barcode ||
                                                            "—"
                                                        }

                                                    </span>

                                                </td>


                                                <td>

                                                    <span className="badge badge-ghost badge-sm">

                                                        {
                                                            getCategory(
                                                                product
                                                            )
                                                        }

                                                    </span>

                                                </td>


                                                <td className="text-right">

                                                    <span
                                                        className={
                                                            status.key ===
                                                                "OUT"
                                                                ? "font-bold text-error"

                                                                : status.key ===
                                                                  "LOW"
                                                                    ? "font-bold text-warning"

                                                                    : "font-bold"
                                                        }
                                                    >

                                                        {
                                                            formatNumber(
                                                                stock
                                                            )
                                                        }

                                                    </span>

                                                </td>


                                                <td className="text-right">

                                                    {
                                                        formatNumber(
                                                            minimumStock
                                                        )
                                                    }

                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            status.badgeClass
                                                        }
                                                    >

                                                        {
                                                            status.label
                                                        }

                                                    </span>

                                                </td>


                                                <td>

                                                    {
                                                        product?.isActive !==
                                                        false
                                                            ? (

                                                                <span className="badge badge-success badge-sm">

                                                                    Active

                                                                </span>

                                                            )
                                                            : (

                                                                <span className="badge badge-ghost badge-sm">

                                                                    Archived

                                                                </span>

                                                            )
                                                    }

                                                </td>

                                            </tr>

                                        );

                                    }
                                )
                            }


                            {
                                filteredProducts.length ===
                                    0 &&
                                (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="py-14 text-center"
                                        >

                                            <FaWarehouse className="mx-auto text-3xl text-base-content/15" />


                                            <p className="mt-3 font-semibold">

                                                No inventory records found

                                            </p>


                                            <p className="mt-1 text-xs text-base-content/50">

                                                Try changing the inventory filters.

                                            </p>

                                        </td>

                                    </tr>

                                )
                            }

                        </tbody>

                    </table>

                </div>

            </div>


            {/* =================================================
                LOW STOCK / OUT OF STOCK
            ================================================= */}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

                <InventoryAlertPanel
                    title="Low Stock Products"
                    description="Products at or below their minimum stock level."
                    icon={
                        FaExclamationTriangle
                    }
                    iconClass="text-warning"
                >

                    {
                        safeProducts

                            .filter(
                                (
                                    product
                                ) =>
                                    getInventoryStatus(
                                        product
                                    ).key ===
                                        "LOW" &&
                                    product?.isActive !==
                                        false
                            )

                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    getStock(
                                        a
                                    ) -
                                    getStock(
                                        b
                                    )
                            )

                            .slice(
                                0,
                                8
                            )

                            .map(
                                (
                                    product
                                ) => (

                                    <AlertRow
                                        key={
                                            product._id ||
                                            product.id
                                        }
                                        product={
                                            product
                                        }
                                    />

                                )
                            )
                    }


                    {
                        summary.lowStock ===
                            0 &&
                        (

                            <EmptyAlert text="No products are currently low on stock." />

                        )
                    }

                </InventoryAlertPanel>


                <InventoryAlertPanel
                    title="Out of Stock Products"
                    description="Products with no remaining branch inventory."
                    icon={
                        FaTimesCircle
                    }
                    iconClass="text-error"
                >

                    {
                        safeProducts

                            .filter(
                                (
                                    product
                                ) =>
                                    getInventoryStatus(
                                        product
                                    ).key ===
                                        "OUT" &&
                                    product?.isActive !==
                                        false
                            )

                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    String(
                                        a?.name ||
                                        ""
                                    ).localeCompare(
                                        String(
                                            b?.name ||
                                            ""
                                        )
                                    )
                            )

                            .slice(
                                0,
                                8
                            )

                            .map(
                                (
                                    product
                                ) => (

                                    <AlertRow
                                        key={
                                            product._id ||
                                            product.id
                                        }
                                        product={
                                            product
                                        }
                                    />

                                )
                            )
                    }


                    {
                        summary.outOfStock ===
                            0 &&
                        (

                            <EmptyAlert text="No products are currently out of stock." />

                        )
                    }

                </InventoryAlertPanel>

            </div>


            {/* =================================================
                REPORT INFORMATION
            ================================================= */}

            <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">

                <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

                        <FaWarehouse />

                    </div>


                    <div>

                        <h3 className="text-sm font-semibold">

                            About this report

                        </h3>


                        <p className="mt-1 text-xs leading-relaxed text-base-content/50">

                            This report uses the currently selected branch inventory. Product identity and category remain part of the global product catalog, while current stock and minimum stock are supplied by the branch-specific inventory record. Archived products can be included using the product status filter.

                        </p>

                    </div>

                </div>

            </div>

        </div>

    );

}


/*
============================================================
SUMMARY CARD
============================================================
*/

function SummaryCard({
    title,
    value,
    description,
    icon: Icon,
    iconClass,
}) {

    return (

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">

            <div className="flex items-start justify-between gap-3">

                <div>

                    <p className="text-xs text-base-content/50">

                        {title}

                    </p>


                    <p className="mt-2 text-xl font-bold">

                        {value}

                    </p>

                </div>


                <div
                    className={`
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-lg
                        ${iconClass}
                    `}
                >

                    <Icon />

                </div>

            </div>


            <p className="mt-2 text-[10px] text-base-content/40">

                {description}

            </p>

        </div>

    );

}


/*
============================================================
MINI STATUS CARD
============================================================
*/

function MiniStatusCard({
    label,
    value,
    icon: Icon,
    className,
}) {

    return (

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">

            <div className="flex items-center justify-between gap-3">

                <div>

                    <p className="text-xs text-base-content/50">

                        {label}

                    </p>


                    <p className="mt-1 text-lg font-bold">

                        {
                            formatNumber(
                                value
                            )
                        }

                    </p>

                </div>


                <Icon
                    className={
                        className
                    }
                />

            </div>

        </div>

    );

}


/*
============================================================
ALERT PANEL
============================================================
*/

function InventoryAlertPanel({
    title,
    description,
    icon: Icon,
    iconClass,
    children,
}) {

    return (

        <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">

            <div className="mb-4 flex items-center gap-3">

                <Icon
                    className={
                        iconClass
                    }
                />


                <div>

                    <h3 className="text-sm font-bold">

                        {title}

                    </h3>


                    <p className="mt-0.5 text-xs text-base-content/50">

                        {description}

                    </p>

                </div>

            </div>


            <div className="divide-y divide-base-200">

                {children}

            </div>

        </div>

    );

}


/*
============================================================
ALERT ROW
============================================================
*/

function AlertRow({
    product,
}) {

    const stock =
        getStock(
            product
        );


    const minimumStock =
        getMinimumStock(
            product
        );


    return (

        <div className="flex items-center justify-between gap-4 py-3">

            <div className="min-w-0">

                <p className="truncate text-sm font-medium">

                    {
                        product?.name ||
                        "Unnamed Product"
                    }

                </p>


                <p className="mt-0.5 text-[10px] text-base-content/40">

                    {
                        product?.barcode ||
                        getCategory(
                            product
                        )
                    }

                </p>

            </div>


            <div className="shrink-0 text-right">

                <p
                    className={
                        stock <=
                            0
                            ? "text-sm font-bold text-error"
                            : "text-sm font-bold text-warning"
                    }
                >

                    {
                        formatNumber(
                            stock
                        )
                    }

                </p>


                <p className="text-[10px] text-base-content/40">

                    minimum{" "}

                    {
                        formatNumber(
                            minimumStock
                        )
                    }

                </p>

            </div>

        </div>

    );

}


/*
============================================================
EMPTY ALERT
============================================================
*/

function EmptyAlert({
    text,
}) {

    return (

        <div className="py-8 text-center">

            <FaCheckCircle className="mx-auto text-2xl text-success/50" />


            <p className="mt-2 text-xs text-base-content/45">

                {text}

            </p>

        </div>

    );

}


export default InventoryReportPage;