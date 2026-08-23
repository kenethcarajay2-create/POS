import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    FaWarehouse,
    FaBox,
    FaExclamationTriangle,
    FaTimesCircle,
    FaMoneyBillWave,
    FaSearch,
    FaSyncAlt,
    FaPlus,
    FaArrowDown,
    FaArrowUp,
    FaHistory,
    FaTimes,
    FaEdit,
    FaMinus,
} from "react-icons/fa";

import productService from "../../services/product.service";
import inventoryService from "../../services/inventory.service";


function InventoryPage() {

    /*
    ==========================================================
    PRODUCTS
    ==========================================================
    */

    const [products, setProducts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);


    /*
    ==========================================================
    TRANSACTIONS
    ==========================================================
    */

    const [transactions, setTransactions] =
        useState([]);

    const [transactionsLoading, setTransactionsLoading] =
        useState(false);

    const [transactionType, setTransactionType] =
        useState("all");


    /*
    ==========================================================
    FILTERS
    ==========================================================
    */

    const [search, setSearch] =
        useState("");

    const [categoryFilter, setCategoryFilter] =
        useState("all");

    const [stockFilter, setStockFilter] =
        useState("all");


    /*
    ==========================================================
    ADJUSTMENT MODAL
    ==========================================================
    */

    const [showAdjustModal, setShowAdjustModal] =
        useState(false);

    const [selectedProduct, setSelectedProduct] =
        useState(null);

    const [adjustmentType, setAdjustmentType] =
        useState("STOCK_IN");

    const [adjustmentQuantity, setAdjustmentQuantity] =
        useState("");

    const [newStock, setNewStock] =
        useState("");

    const [remarks, setRemarks] =
        useState("");

    const [saving, setSaving] =
        useState(false);


    /*
    ==========================================================
    LOAD PRODUCTS
    ==========================================================
    */

    const loadProducts = async () => {

        try {

            setLoading(true);
            setError(null);

            const data =
                await productService.getProducts();

            setProducts(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (error) {

            console.error(
                "Failed to load inventory:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load inventory."
            );

        } finally {

            setLoading(false);

        }

    };


    /*
    ==========================================================
    LOAD TRANSACTIONS
    ==========================================================
    */

    const loadTransactions = async () => {

        try {

            setTransactionsLoading(true);

            const params = {};


            if (
                transactionType !==
                "all"
            ) {

                params.type =
                    transactionType;

            }


            const data =
                await inventoryService.getTransactions(
                    params
                );


            setTransactions(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (error) {

            console.error(
                "Failed to load inventory transactions:",
                error
            );

        } finally {

            setTransactionsLoading(false);

        }

    };


    /*
    ==========================================================
    INITIAL LOAD
    ==========================================================
    */

    useEffect(() => {

        loadProducts();

    }, []);


    /*
    ==========================================================
    LOAD TRANSACTIONS
    ==========================================================
    */

    useEffect(() => {

        loadTransactions();

    }, [transactionType]);


    /*
    ==========================================================
    GET STOCK
    ==========================================================
    */

    const getStock = (product) => {

        return Number(
            product?.stock ?? 0
        );

    };


    /*
    ==========================================================
    GET MINIMUM STOCK
    ==========================================================
    */

    const getMinimumStock = (product) => {

        return Number(
            product?.minimumStock ?? 0
        );

    };


    /*
    ==========================================================
    GET COST PRICE
    ==========================================================
    */

    const getCostPrice = (product) => {

        return Number(
            product?.costPrice ?? 0
        );

    };


    /*
    ==========================================================
    GET SELLING PRICE
    ==========================================================
    */

    const getSellingPrice = (product) => {

        if (
            !Array.isArray(
                product?.pricing
            )
        ) {

            return 0;

        }


        if (
            product.pricing.length === 0
        ) {

            return 0;

        }


        /*
        Prefer the quantity 1 price
        as the regular/single price.
        */

        const singlePrice =
            product.pricing.find(
                (item) =>
                    Number(
                        item.quantity
                    ) === 1
            );


        if (singlePrice) {

            return Number(
                singlePrice.price ?? 0
            );

        }


        return Number(
            product.pricing[0]?.price ??
            0
        );

    };


    /*
    ==========================================================
    GET CATEGORY
    ==========================================================
    */

    const getCategory = (product) => {

        if (
            typeof product?.category ===
            "string"
        ) {

            return product.category;

        }


        return (
            product?.category?.name ||
            "Others"
        );

    };


    /*
    ==========================================================
    GET STOCK STATUS
    ==========================================================
    */

    const getStockStatus = (product) => {

        const stock =
            getStock(product);


        const minimumStock =
            getMinimumStock(product);


        if (stock <= 0) {

            return "out";

        }


        if (
            minimumStock > 0 &&
            stock <= minimumStock
        ) {

            return "low";

        }


        return "healthy";

    };


    /*
    ==========================================================
    CATEGORIES
    ==========================================================
    */

    const categories = useMemo(() => {

        const categorySet =
            new Set();


        products.forEach(
            (product) => {

                categorySet.add(
                    getCategory(product)
                );

            }
        );


        return Array.from(
            categorySet
        ).sort();

    }, [products]);


    /*
    ==========================================================
    SUMMARY
    ==========================================================
    */

    const totalProducts =
        products.length;


    const totalUnits =
        products.reduce(
            (
                total,
                product
            ) => {

                return (
                    total +
                    getStock(product)
                );

            },
            0
        );


    const lowStockProducts =
        products.filter(
            (product) =>
                getStockStatus(product) ===
                "low"
        ).length;


    const outOfStockProducts =
        products.filter(
            (product) =>
                getStockStatus(product) ===
                "out"
        ).length;


    const inventoryValue =
        products.reduce(
            (
                total,
                product
            ) => {

                return (
                    total +
                    (
                        getStock(product) *
                        getCostPrice(product)
                    )
                );

            },
            0
        );


    /*
    ==========================================================
    FILTER PRODUCTS
    ==========================================================
    */

    const filteredProducts =
        useMemo(() => {

            const query =
                search
                    .trim()
                    .toLowerCase();


            return products.filter(
                (product) => {

                    const name =
                        String(
                            product?.name ||
                            ""
                        )
                            .toLowerCase();


                    const barcode =
                        String(
                            product?.barcode ||
                            ""
                        )
                            .toLowerCase();


                    const matchesSearch =
                        !query ||
                        name.includes(query) ||
                        barcode.includes(query);


                    const matchesCategory =
                        categoryFilter ===
                            "all" ||
                        getCategory(
                            product
                        ) ===
                            categoryFilter;


                    const status =
                        getStockStatus(
                            product
                        );


                    const matchesStock =
                        stockFilter ===
                            "all" ||
                        status ===
                            stockFilter;


                    return (
                        matchesSearch &&
                        matchesCategory &&
                        matchesStock
                    );

                }
            );

        }, [
            products,
            search,
            categoryFilter,
            stockFilter,
        ]);


    /*
    ==========================================================
    FORMAT MONEY
    ==========================================================
    */

    const formatMoney = (value) => {

        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: "PHP",
            }
        ).format(
            Number(value) || 0
        );

    };


    /*
    ==========================================================
    FORMAT NUMBER
    ==========================================================
    */

    const formatNumber = (value) => {

        return Number(
            value || 0
        ).toLocaleString(
            "en-PH"
        );

    };


    /*
    ==========================================================
    OPEN ADJUST MODAL
    ==========================================================
    */

    const openAdjustModal = (
        product = null
    ) => {

        setSelectedProduct(
            product
        );


        setAdjustmentType(
            "STOCK_IN"
        );


        setAdjustmentQuantity(
            ""
        );


        setNewStock(
            product
                ? String(
                    getStock(product)
                )
                : ""
        );


        setRemarks("");


        setShowAdjustModal(
            true
        );

    };


    /*
    ==========================================================
    CLOSE ADJUST MODAL
    ==========================================================
    */

    const closeAdjustModal = () => {

        if (saving) {
            return;
        }


        setShowAdjustModal(
            false
        );


        setSelectedProduct(
            null
        );


        setAdjustmentType(
            "STOCK_IN"
        );


        setAdjustmentQuantity(
            ""
        );


        setNewStock(
            ""
        );


        setRemarks("");

    };


    /*
    ==========================================================
    SELECT PRODUCT
    ==========================================================
    */

    const handleProductSelection = (
        productId
    ) => {

        const product =
            products.find(
                (item) =>
                    item._id ===
                    productId
            );


        setSelectedProduct(
            product || null
        );


        if (product) {

            setNewStock(
                String(
                    getStock(product)
                )
            );

        } else {

            setNewStock("");

        }


        setAdjustmentQuantity("");

    };


    /*
    ==========================================================
    CALCULATED NEW STOCK
    ==========================================================
    */

    const calculatedNewStock =
        useMemo(() => {

            if (!selectedProduct) {

                return 0;

            }


            const currentStock =
                getStock(
                    selectedProduct
                );


            const quantity =
                Number(
                    adjustmentQuantity ||
                    0
                );


            if (
                adjustmentType ===
                "STOCK_IN"
            ) {

                return (
                    currentStock +
                    (
                        Number.isFinite(
                            quantity
                        )
                            ? quantity
                            : 0
                    )
                );

            }


            if (
                adjustmentType ===
                "STOCK_OUT"
            ) {

                return Math.max(
                    currentStock -
                    (
                        Number.isFinite(
                            quantity
                        )
                            ? quantity
                            : 0
                    ),
                    0
                );

            }


            if (
                adjustmentType ===
                "ADJUSTMENT"
            ) {

                const exactStock =
                    Number(
                        newStock || 0
                    );


                return Math.max(
                    Number.isFinite(
                        exactStock
                    )
                        ? exactStock
                        : 0,
                    0
                );

            }


            return currentStock;

        }, [
            selectedProduct,
            adjustmentType,
            adjustmentQuantity,
            newStock,
        ]);


    /*
    ==========================================================
    HANDLE STOCK ADJUSTMENT
    ==========================================================
    */

    const handleAdjustStock =
        async () => {

            if (!selectedProduct) {

                alert(
                    "Please select a product."
                );

                return;

            }


            const productId =
                selectedProduct._id;


            try {

                setSaving(true);


                /*
                ==============================================
                STOCK IN
                ==============================================
                */

                if (
                    adjustmentType ===
                    "STOCK_IN"
                ) {

                    const quantity =
                        Number(
                            adjustmentQuantity
                        );


                    if (
                        !Number.isFinite(
                            quantity
                        ) ||
                        quantity <= 0
                    ) {

                        alert(
                            "Please enter a valid quantity greater than zero."
                        );

                        return;

                    }


                    await inventoryService.stockIn({

                        productId,

                        quantity,

                        remarks:
                            remarks.trim(),

                    });

                }


                /*
                ==============================================
                STOCK OUT
                ==============================================
                */

                else if (
                    adjustmentType ===
                    "STOCK_OUT"
                ) {

                    const quantity =
                        Number(
                            adjustmentQuantity
                        );


                    if (
                        !Number.isFinite(
                            quantity
                        ) ||
                        quantity <= 0
                    ) {

                        alert(
                            "Please enter a valid quantity greater than zero."
                        );

                        return;

                    }


                    const currentStock =
                        getStock(
                            selectedProduct
                        );


                    if (
                        quantity >
                        currentStock
                    ) {

                        alert(
                            "You cannot remove more stock than is currently available."
                        );

                        return;

                    }


                    await inventoryService.stockOut({

                        productId,

                        quantity,

                        remarks:
                            remarks.trim(),

                    });

                }


                /*
                ==============================================
                EXACT STOCK ADJUSTMENT
                ==============================================
                */

                else if (
                    adjustmentType ===
                    "ADJUSTMENT"
                ) {

                    const stock =
                        Number(
                            newStock
                        );


                    if (
                        !Number.isFinite(
                            stock
                        ) ||
                        stock < 0
                    ) {

                        alert(
                            "Please enter a valid stock quantity."
                        );

                        return;

                    }


                    await inventoryService.adjustStock({

                        productId,

                        newStock:
                            stock,

                        remarks:
                            remarks.trim(),

                    });

                }


                /*
                ==============================================
                REFRESH
                ==============================================
                */

                await loadProducts();


                closeAdjustModal();

            } catch (error) {

                console.error(
                    "Failed to adjust stock:",
                    error
                );


                alert(
                    error.response?.data?.message ||
                    "Failed to update inventory."
                );

            } finally {

                setSaving(false);

            }

        };


    /*
    ==========================================================
    STOCK STATUS COMPONENT
    ==========================================================
    */

    const StockStatus = ({
        product,
    }) => {

        const status =
            getStockStatus(
                product
            );


        if (status === "out") {

            return (

                <span className="badge badge-error badge-sm gap-1">

                    <FaTimesCircle />

                    Out of Stock

                </span>

            );

        }


        if (status === "low") {

            return (

                <span className="badge badge-warning badge-sm gap-1">

                    <FaExclamationTriangle />

                    Low Stock

                </span>

            );

        }


        return (

            <span className="badge badge-success badge-sm gap-1">

                <span className="w-1.5 h-1.5 rounded-full bg-current" />

                Healthy

            </span>

        );

    };


    /*
    ==========================================================
    STOCK INDICATOR
    ==========================================================
    */

    const StockIndicator = ({
        product,
    }) => {

        const stock =
            getStock(product);


        const minimumStock =
            getMinimumStock(
                product
            );


        const status =
            getStockStatus(
                product
            );


        let percentage = 100;


        if (
            minimumStock > 0
        ) {

            percentage =
                Math.min(
                    (
                        stock /
                        (
                            minimumStock *
                            3
                        )
                    ) *
                    100,
                    100
                );

        }


        return (

            <div className="min-w-[150px]">

                <div className="flex items-center justify-between mb-1">

                    <span className="font-semibold text-sm">

                        {
                            formatNumber(
                                stock
                            )
                        }

                        {" "}

                        <span className="font-normal text-xs text-base-content/50">

                            {
                                product.baseUnit ||
                                "Piece"
                            }

                        </span>

                    </span>


                    <span className="text-[10px] text-base-content/40">

                        Min: {
                            minimumStock
                        }

                    </span>

                </div>


                <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">

                    <div
                        className={`
                            h-full
                            rounded-full
                            transition-all
                            ${
                                status === "out"
                                    ? "bg-error"
                                    : status === "low"
                                        ? "bg-warning"
                                        : "bg-success"
                            }
                        `}
                        style={{
                            width:
                                `${percentage}%`,
                        }}
                    />

                </div>

            </div>

        );

    };


    /*
    ==========================================================
    LOADING STATE
    ==========================================================
    */

    if (
        loading &&
        products.length === 0
    ) {

        return (

            <div className="space-y-6">

                <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">

                        <FaWarehouse />

                    </div>


                    <div>

                        <h1 className="text-2xl font-bold">
                            Inventory
                        </h1>


                        <p className="text-sm text-base-content/60 mt-1">
                            Monitor stock levels and
                            inventory health.
                        </p>

                    </div>

                </div>


                <div className="bg-base-100 border border-base-200 rounded-xl p-16 flex flex-col items-center justify-center">

                    <span className="loading loading-spinner loading-lg text-primary" />


                    <p className="text-sm text-base-content/50 mt-4">
                        Loading inventory...
                    </p>

                </div>

            </div>

        );

    }


    /*
    ==========================================================
    MAIN RENDER
    ==========================================================
    */

    return (

        <div className="space-y-6 pb-8">


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">

                        <FaWarehouse />

                    </div>


                    <div>

                        <h1 className="text-2xl font-bold">
                            Inventory
                        </h1>


                        <p className="text-sm text-base-content/60 mt-1">
                            Monitor stock levels and
                            inventory health.
                        </p>

                    </div>

                </div>


                <div className="flex items-center gap-2">

                    <button
                        type="button"
                        onClick={
                            loadProducts
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
                        onClick={() =>
                            openAdjustModal()
                        }
                        className="btn btn-primary"
                    >

                        <FaPlus />

                        Adjust Stock

                    </button>

                </div>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (

                <div className="alert alert-error">

                    <div>

                        <p className="font-semibold">
                            Unable to load inventory
                        </p>


                        <p className="text-sm">
                            {error}
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={
                            loadProducts
                        }
                        className="btn btn-sm"
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* ==================================================
                SUMMARY CARDS
            ================================================== */}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">


                {/* TOTAL PRODUCTS */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Total Products
                        </span>


                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                            <FaBox />

                        </div>

                    </div>


                    <p className="text-2xl font-bold mt-3">

                        {
                            formatNumber(
                                totalProducts
                            )
                        }

                    </p>


                    <p className="text-[10px] text-base-content/50 mt-1">
                        Products in catalog
                    </p>

                </div>


                {/* LOW STOCK */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Low Stock
                        </span>


                        <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">

                            <FaExclamationTriangle />

                        </div>

                    </div>


                    <p className="text-2xl font-bold mt-3">

                        {
                            formatNumber(
                                lowStockProducts
                            )
                        }

                    </p>


                    <p className="text-[10px] text-warning mt-1">
                        Need attention
                    </p>

                </div>


                {/* OUT OF STOCK */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Out of Stock
                        </span>


                        <div className="w-9 h-9 rounded-lg bg-error/10 text-error flex items-center justify-center">

                            <FaTimesCircle />

                        </div>

                    </div>


                    <p className="text-2xl font-bold mt-3">

                        {
                            formatNumber(
                                outOfStockProducts
                            )
                        }

                    </p>


                    <p className="text-[10px] text-error mt-1">
                        Cannot be sold
                    </p>

                </div>


                {/* INVENTORY VALUE */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Inventory Value
                        </span>


                        <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center">

                            <FaMoneyBillWave />

                        </div>

                    </div>


                    <p className="text-2xl font-bold mt-3">

                        {
                            formatMoney(
                                inventoryValue
                            )
                        }

                    </p>


                    <p className="text-[10px] text-base-content/50 mt-1">
                        Based on cost price
                    </p>

                </div>

            </div>


            {/* ==================================================
                FILTER BAR
            ================================================== */}

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm p-4">

                <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">


                    {/* SEARCH */}

                    <div className="relative w-full xl:w-96">

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
                            placeholder="Search product or barcode..."
                            className="input input-bordered input-sm w-full pl-9"
                        />

                    </div>


                    {/* FILTERS */}

                    <div className="flex flex-col sm:flex-row gap-2">


                        <select
                            value={
                                categoryFilter
                            }
                            onChange={(e) =>
                                setCategoryFilter(
                                    e.target.value
                                )
                            }
                            className="select select-bordered select-sm"
                        >

                            <option value="all">
                                All Categories
                            </option>


                            {categories.map(
                                (category) => (

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
                            )}

                        </select>


                        <select
                            value={
                                stockFilter
                            }
                            onChange={(e) =>
                                setStockFilter(
                                    e.target.value
                                )
                            }
                            className="select select-bordered select-sm"
                        >

                            <option value="all">
                                All Stock
                            </option>

                            <option value="healthy">
                                Healthy
                            </option>

                            <option value="low">
                                Low Stock
                            </option>

                            <option value="out">
                                Out of Stock
                            </option>

                        </select>

                    </div>

                </div>

            </div>


            {/* ==================================================
                INVENTORY TABLE
            ================================================== */}

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-hidden">


                <div className="px-5 py-4 border-b border-base-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    <div>

                        <h2 className="font-bold">
                            Stock Overview
                        </h2>


                        <p className="text-xs text-base-content/50 mt-1">

                            Showing{" "}
                            {
                                filteredProducts.length
                            }{" "}
                            of{" "}
                            {
                                products.length
                            }{" "}
                            products

                        </p>

                    </div>


                    <div className="flex items-center gap-3 text-[10px]">

                        <span className="flex items-center gap-1">

                            <span className="w-2 h-2 rounded-full bg-success" />

                            Healthy

                        </span>


                        <span className="flex items-center gap-1">

                            <span className="w-2 h-2 rounded-full bg-warning" />

                            Low

                        </span>


                        <span className="flex items-center gap-1">

                            <span className="w-2 h-2 rounded-full bg-error" />

                            Out

                        </span>

                    </div>

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
                                    Stock
                                </th>

                                <th>
                                    Cost
                                </th>

                                <th>
                                    Selling Price
                                </th>

                                <th>
                                    Status
                                </th>

                                <th className="text-right">
                                    Action
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {filteredProducts.map(
                                (product) => (

                                    <tr
                                        key={
                                            product._id
                                        }
                                        className="hover"
                                    >


                                        {/* PRODUCT */}

                                        <td>

                                            <div className="flex items-center gap-3">

                                                <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center overflow-hidden shrink-0">

                                                    {product.image ? (

                                                        <img
                                                            src={
                                                                product.image
                                                            }
                                                            alt={
                                                                product.name
                                                            }
                                                            className="w-full h-full object-cover"
                                                        />

                                                    ) : (

                                                        <FaBox className="text-base-content/30" />

                                                    )}

                                                </div>


                                                <div>

                                                    <p className="font-semibold text-sm">

                                                        {
                                                            product.name
                                                        }

                                                    </p>


                                                    <p className="text-[10px] text-base-content/40">

                                                        {
                                                            getCategory(
                                                                product
                                                            )
                                                        }

                                                    </p>

                                                </div>

                                            </div>

                                        </td>


                                        {/* BARCODE */}

                                        <td>

                                            <span className="font-mono text-xs text-base-content/60">

                                                {
                                                    product.barcode ||
                                                    "—"
                                                }

                                            </span>

                                        </td>


                                        {/* STOCK */}

                                        <td>

                                            <StockIndicator
                                                product={
                                                    product
                                                }
                                            />

                                        </td>


                                        {/* COST */}

                                        <td>

                                            <span className="text-sm">

                                                {
                                                    formatMoney(
                                                        getCostPrice(
                                                            product
                                                        )
                                                    )
                                                }

                                            </span>

                                        </td>


                                        {/* SELLING PRICE */}

                                        <td>

                                            <span className="text-sm font-medium">

                                                {
                                                    formatMoney(
                                                        getSellingPrice(
                                                            product
                                                        )
                                                    )
                                                }

                                            </span>

                                        </td>


                                        {/* STATUS */}

                                        <td>

                                            <StockStatus
                                                product={
                                                    product
                                                }
                                            />

                                        </td>


                                        {/* ACTION */}

                                        <td className="text-right">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openAdjustModal(
                                                        product
                                                    )
                                                }
                                                className="btn btn-primary btn-xs"
                                            >

                                                <FaEdit />

                                                Adjust

                                            </button>

                                        </td>

                                    </tr>

                                )
                            )}


                            {/* EMPTY */}

                            {!loading &&
                                filteredProducts.length ===
                                    0 && (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="py-16 text-center"
                                        >

                                            <div className="flex flex-col items-center gap-3">

                                                <FaSearch className="text-3xl text-base-content/20" />


                                                <div>

                                                    <p className="font-semibold">
                                                        No products found
                                                    </p>


                                                    <p className="text-xs text-base-content/50 mt-1">

                                                        Try changing
                                                        your search
                                                        or filters.

                                                    </p>

                                                </div>

                                            </div>

                                        </td>

                                    </tr>

                                )}

                        </tbody>

                    </table>

                </div>


                {/* TABLE FOOTER */}

                <div className="px-5 py-3 border-t border-base-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-base-content/40">

                    <span>

                        {
                            filteredProducts.length
                        }{" "}
                        products displayed

                    </span>


                    <span>

                        {
                            formatNumber(
                                totalUnits
                            )
                        }{" "}
                        total units

                    </span>

                </div>

            </div>


            {/* ==================================================
                INVENTORY SUMMARY
            ================================================== */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">


                {/* TOTAL UNITS */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-5 shadow-sm">

                    <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">

                            <FaArrowUp />

                        </div>


                        <div>

                            <h3 className="font-semibold text-sm">
                                Total Units
                            </h3>


                            <p className="text-xs text-base-content/50">
                                Current quantity across
                                all products.
                            </p>

                        </div>

                    </div>


                    <p className="text-3xl font-bold mt-4">

                        {
                            formatNumber(
                                totalUnits
                            )
                        }

                    </p>


                    <p className="text-xs text-base-content/50 mt-1">

                        units currently in inventory

                    </p>

                </div>


                {/* RESTOCK ATTENTION */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-5 shadow-sm">

                    <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">

                            <FaArrowDown />

                        </div>


                        <div>

                            <h3 className="font-semibold text-sm">
                                Restock Attention
                            </h3>


                            <p className="text-xs text-base-content/50">
                                Products that need
                                replenishment.
                            </p>

                        </div>

                    </div>


                    <p className="text-3xl font-bold mt-4">

                        {
                            formatNumber(
                                lowStockProducts +
                                outOfStockProducts
                            )
                        }

                    </p>


                    <p className="text-xs text-warning mt-1">

                        products need attention

                    </p>

                </div>

            </div>

{/* ==================================================
    STOCK MOVEMENTS
================================================== */}

<div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-hidden">

    {/* HEADER */}

    <div className="px-5 py-4 border-b border-base-200">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                    <FaHistory />

                </div>

                <div>

                    <h2 className="font-bold">
                        Recent Stock Movements
                    </h2>

                    <p className="text-xs text-base-content/50 mt-1">
                        Track inventory changes and stock history.
                    </p>

                </div>

            </div>


            {/* TRANSACTION FILTER */}

            <select
                value={transactionType}
                onChange={(e) =>
                    setTransactionType(
                        e.target.value
                    )
                }
                className="select select-bordered select-sm w-full lg:w-44"
            >

                <option value="all">
                    All Movements
                </option>

                <option value="STOCK_IN">
                    Stock In
                </option>

                <option value="STOCK_OUT">
                    Stock Out
                </option>

                <option value="ADJUSTMENT">
                    Adjustments
                </option>

                <option value="SALE">
                    Sales
                </option>

            </select>

        </div>

    </div>


    {/* TABLE */}

    <div className="overflow-x-auto">

        <table className="table">

            <thead>

                <tr>

                    <th>
                        Product
                    </th>

                    <th>
                        Type
                    </th>

                    <th>
                        Change
                    </th>

                    <th>
                        Stock
                    </th>

                    <th>
                        User
                    </th>

                    <th>
                        Remarks
                    </th>

                    <th>
                        Date
                    </th>

                </tr>

            </thead>


            <tbody>

                {transactionsLoading && (

                    <tr>

                        <td
                            colSpan="7"
                            className="py-12 text-center"
                        >

                            <span className="loading loading-spinner loading-md text-primary" />

                            <p className="text-xs text-base-content/50 mt-3">
                                Loading stock movements...
                            </p>

                        </td>

                    </tr>

                )}


                {!transactionsLoading &&
                    transactions.length === 0 && (

                    <tr>

                        <td
                            colSpan="7"
                            className="py-14 text-center"
                        >

                            <div className="flex flex-col items-center">

                                <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center text-base-content/30">

                                    <FaHistory />

                                </div>


                                <p className="font-semibold mt-3">
                                    No stock movements yet
                                </p>


                                <p className="text-xs text-base-content/50 mt-1">
                                    Inventory transactions will appear here.
                                </p>

                            </div>

                        </td>

                    </tr>

                )}


                {!transactionsLoading &&
                    transactions.map(
                        (transaction) => {

                            const product =
                                transaction.product;


                            const createdBy =
                                transaction.createdBy;


                            const type =
                                transaction.type;


                            const quantity =
                                Number(
                                    transaction.quantity ||
                                    0
                                );


                            const previousStock =
                                Number(
                                    transaction.previousStock ||
                                    0
                                );


                            const currentStock =
                                Number(
                                    transaction.newStock ||
                                    0
                                );


                            let typeLabel =
                                "Adjustment";


                            let typeClass =
                                "badge-info";


                            let icon =
                                <FaEdit />;


                            let changeClass =
                                "text-info";


                            let changePrefix =
                                "";


                            if (
                                type ===
                                "STOCK_IN"
                            ) {

                                typeLabel =
                                    "Stock In";

                                typeClass =
                                    "badge-success";

                                icon =
                                    <FaArrowUp />;

                                changeClass =
                                    "text-success";

                                changePrefix =
                                    "+";

                            }


                            else if (
                                type ===
                                "STOCK_OUT"
                            ) {

                                typeLabel =
                                    "Stock Out";

                                typeClass =
                                    "badge-error";

                                icon =
                                    <FaArrowDown />;

                                changeClass =
                                    "text-error";

                                changePrefix =
                                    "-";

                            }


                            else if (
                                type ===
                                "SALE"
                            ) {

                                typeLabel =
                                    "Sale";

                                typeClass =
                                    "badge-primary";

                                icon =
                                    <FaMoneyBillWave />;

                                changeClass =
                                    "text-primary";

                                changePrefix =
                                    "-";

                            }


                            const date =
                                transaction.createdAt
                                    ? new Date(
                                        transaction.createdAt
                                    )
                                    : null;


                            const formattedDate =
                                date
                                    ? date.toLocaleDateString(
                                        "en-PH",
                                        {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        }
                                    )
                                    : "—";


                            const formattedTime =
                                date
                                    ? date.toLocaleTimeString(
                                        "en-PH",
                                        {
                                            hour: "numeric",
                                            minute: "2-digit",
                                        }
                                    )
                                    : "";


                            return (

                                <tr
                                    key={
                                        transaction._id
                                    }
                                    className="hover"
                                >

                                    {/* PRODUCT */}

                                    <td>

                                        <div className="flex items-center gap-3">

                                            <div className="w-9 h-9 rounded-lg bg-base-200 flex items-center justify-center shrink-0">

                                                <FaBox className="text-base-content/30 text-sm" />

                                            </div>


                                            <div className="min-w-0">

                                                <p className="font-semibold text-sm truncate max-w-[180px]">

                                                    {
                                                        product?.name ||
                                                        "Unknown Product"
                                                    }

                                                </p>


                                                <p className="text-[10px] text-base-content/40 font-mono">

                                                    {
                                                        product?.barcode ||
                                                        "No barcode"
                                                    }

                                                </p>

                                            </div>

                                        </div>

                                    </td>


                                    {/* TYPE */}

                                    <td>

                                        <span
                                            className={`
                                                badge
                                                badge-sm
                                                gap-1
                                                ${typeClass}
                                            `}
                                        >

                                            {icon}

                                            {
                                                typeLabel
                                            }

                                        </span>

                                    </td>


                                    {/* CHANGE */}

                                    <td>

                                        <span
                                            className={`
                                                font-bold
                                                text-sm
                                                ${changeClass}
                                            `}
                                        >

                                            {
                                                changePrefix
                                            }

                                            {
                                                formatNumber(
                                                    quantity
                                                )
                                            }

                                        </span>

                                    </td>


                                    {/* STOCK */}

                                    <td>

                                        <div className="flex items-center gap-2">

                                            <span className="text-xs text-base-content/50">

                                                {
                                                    formatNumber(
                                                        previousStock
                                                    )
                                                }

                                            </span>


                                            <span className="text-base-content/30">
                                                →
                                            </span>


                                            <span className="font-semibold text-sm">

                                                {
                                                    formatNumber(
                                                        currentStock
                                                    )
                                                }

                                            </span>

                                        </div>

                                    </td>


                                    {/* USER */}

                                    <td>

                                        <div>

                                            <p className="text-xs font-medium">

                                                {
                                                    createdBy?.name ||
                                                    createdBy?.username ||
                                                    "Unknown User"
                                                }

                                            </p>


                                            {createdBy?.role && (

                                                <p className="text-[10px] text-base-content/40 capitalize">

                                                    {
                                                        createdBy.role
                                                    }

                                                </p>

                                            )}

                                        </div>

                                    </td>


                                    {/* REMARKS */}

                                    <td>

                                        <span className="text-xs text-base-content/60 max-w-[180px] block truncate">

                                            {
                                                transaction.remarks ||
                                                "—"
                                            }

                                        </span>

                                    </td>


                                    {/* DATE */}

                                    <td>

                                        <div className="whitespace-nowrap">

                                            <p className="text-xs font-medium">

                                                {
                                                    formattedDate
                                                }

                                            </p>


                                            <p className="text-[10px] text-base-content/40">

                                                {
                                                    formattedTime
                                                }

                                            </p>

                                        </div>

                                    </td>

                                </tr>

                            );

                        }
                    )}

            </tbody>

        </table>

    </div>


    {/* FOOTER */}

    {!transactionsLoading &&
        transactions.length > 0 && (

        <div className="px-5 py-3 border-t border-base-200 flex items-center justify-between">

            <span className="text-xs text-base-content/40">

                Showing{" "}
                {
                    transactions.length
                }{" "}
                recent movements

            </span>


            <button
                type="button"
                onClick={
                    loadTransactions
                }
                className="btn btn-ghost btn-xs"
            >

                <FaSyncAlt />

                Refresh

            </button>

        </div>

    )}

</div>  


            {/* ==================================================
                ADJUST STOCK MODAL
            ================================================== */}

            {showAdjustModal && (

                <dialog className="modal modal-open">

                    <div className="modal-box max-w-lg">


                        {/* HEADER */}

                        <div className="flex items-center justify-between mb-6">

                            <div>

                                <div className="flex items-center gap-2">

                                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                                        <FaWarehouse />

                                    </div>


                                    <h2 className="text-xl font-bold">

                                        Adjust Stock

                                    </h2>

                                </div>


                                <p className="text-xs text-base-content/50 mt-2">

                                    Add, remove, or correct
                                    product inventory.

                                </p>

                            </div>


                            <button
                                type="button"
                                onClick={
                                    closeAdjustModal
                                }
                                className="btn btn-ghost btn-sm btn-square"
                                disabled={
                                    saving
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        <div className="space-y-4">


                            {/* PRODUCT */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Product
                                    </span>

                                </label>


                                <select
                                    value={
                                        selectedProduct?._id ||
                                        ""
                                    }
                                    onChange={(e) =>
                                        handleProductSelection(
                                            e.target.value
                                        )
                                    }
                                    className="select select-bordered w-full"
                                    disabled={
                                        saving
                                    }
                                >

                                    <option value="">
                                        Select a product
                                    </option>


                                    {products
                                        .filter(
                                            (
                                                product
                                            ) =>
                                                product.isActive !==
                                                false
                                        )
                                        .map(
                                            (
                                                product
                                            ) => (

                                                <option
                                                    key={
                                                        product._id
                                                    }
                                                    value={
                                                        product._id
                                                    }
                                                >

                                                    {
                                                        product.name
                                                    }

                                                    {" — Stock: "}

                                                    {
                                                        getStock(
                                                            product
                                                        )
                                                    }

                                                </option>

                                            )
                                        )}

                                </select>

                            </div>


                            {/* CURRENT STOCK */}

                            {selectedProduct && (

                                <div className="bg-base-200 rounded-lg p-4">

                                    <div className="flex items-center justify-between">

                                        <div>

                                            <p className="text-xs text-base-content/50">
                                                Current Stock
                                            </p>


                                            <p className="text-xl font-bold mt-1">

                                                {
                                                    getStock(
                                                        selectedProduct
                                                    )
                                                }

                                                {" "}

                                                <span className="text-sm font-normal text-base-content/50">

                                                    {
                                                        selectedProduct.baseUnit ||
                                                        "Piece"
                                                    }

                                                </span>

                                            </p>

                                        </div>


                                        <div className="text-right">

                                            <p className="text-xs text-base-content/50">
                                                Minimum Stock
                                            </p>


                                            <p className="font-semibold mt-1">

                                                {
                                                    getMinimumStock(
                                                        selectedProduct
                                                    )
                                                }

                                            </p>

                                        </div>

                                    </div>

                                </div>

                            )}


                            {/* ADJUSTMENT TYPE */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Adjustment Type
                                    </span>

                                </label>


                                <div className="grid grid-cols-3 gap-2">


                                    {/* STOCK IN */}

                                    <button
                                        type="button"
                                        onClick={() => {

                                            setAdjustmentType(
                                                "STOCK_IN"
                                            );

                                            setAdjustmentQuantity(
                                                ""
                                            );

                                        }}
                                        className={`
                                            btn
                                            ${
                                                adjustmentType ===
                                                "STOCK_IN"
                                                    ? "btn-success"
                                                    : "btn-outline"
                                            }
                                        `}
                                        disabled={
                                            saving
                                        }
                                    >

                                        <FaPlus />

                                        Stock In

                                    </button>


                                    {/* STOCK OUT */}

                                    <button
                                        type="button"
                                        onClick={() => {

                                            setAdjustmentType(
                                                "STOCK_OUT"
                                            );

                                            setAdjustmentQuantity(
                                                ""
                                            );

                                        }}
                                        className={`
                                            btn
                                            ${
                                                adjustmentType ===
                                                "STOCK_OUT"
                                                    ? "btn-error"
                                                    : "btn-outline"
                                            }
                                        `}
                                        disabled={
                                            saving
                                        }
                                    >

                                        <FaMinus />

                                        Stock Out

                                    </button>


                                    {/* EXACT */}

                                    <button
                                        type="button"
                                        onClick={() => {

                                            setAdjustmentType(
                                                "ADJUSTMENT"
                                            );

                                            setNewStock(

                                                selectedProduct

                                                    ? String(
                                                        getStock(
                                                            selectedProduct
                                                        )
                                                    )

                                                    : ""

                                            );

                                        }}
                                        className={`
                                            btn
                                            ${
                                                adjustmentType ===
                                                "ADJUSTMENT"
                                                    ? "btn-primary"
                                                    : "btn-outline"
                                            }
                                        `}
                                        disabled={
                                            saving
                                        }
                                    >

                                        <FaEdit />

                                        Set Stock

                                    </button>

                                </div>

                            </div>


                            {/* QUANTITY */}

                            {(
                                adjustmentType ===
                                    "STOCK_IN" ||
                                adjustmentType ===
                                    "STOCK_OUT"
                            ) && (

                                <div>

                                    <label className="label">

                                        <span className="label-text font-medium">

                                            Quantity

                                        </span>

                                    </label>


                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={
                                            adjustmentQuantity
                                        }
                                        onChange={(e) =>
                                            setAdjustmentQuantity(
                                                e.target.value
                                            )
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="Enter quantity"
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                            )}


                            {/* EXACT STOCK */}

                            {adjustmentType ===
                                "ADJUSTMENT" && (

                                <div>

                                    <label className="label">

                                        <span className="label-text font-medium">

                                            New Stock

                                        </span>

                                    </label>


                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={
                                            newStock
                                        }
                                        onChange={(e) =>
                                            setNewStock(
                                                e.target.value
                                            )
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="Enter exact stock quantity"
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                            )}


                            {/* NEW STOCK PREVIEW */}

                            {selectedProduct && (

                                <div className="border border-primary/20 bg-primary/5 rounded-lg p-4">

                                    <div className="flex items-center justify-between">

                                        <div>

                                            <p className="text-xs text-base-content/50">

                                                New Stock

                                            </p>


                                            <p className="text-2xl font-bold text-primary mt-1">

                                                {
                                                    formatNumber(
                                                        calculatedNewStock
                                                    )
                                                }

                                                {" "}

                                                <span className="text-sm font-normal">

                                                    {
                                                        selectedProduct.baseUnit ||
                                                        "Piece"
                                                    }

                                                </span>

                                            </p>

                                        </div>


                                        <div>

                                            {calculatedNewStock >
                                                getStock(
                                                    selectedProduct
                                                ) && (

                                                <div className="flex items-center gap-1 text-success text-xs font-medium">

                                                    <FaArrowUp />

                                                    Increasing

                                                </div>

                                            )}


                                            {calculatedNewStock <
                                                getStock(
                                                    selectedProduct
                                                ) && (

                                                <div className="flex items-center gap-1 text-error text-xs font-medium">

                                                    <FaArrowDown />

                                                    Decreasing

                                                </div>

                                            )}


                                            {calculatedNewStock ===
                                                getStock(
                                                    selectedProduct
                                                ) && (

                                                <div className="text-xs text-base-content/40">

                                                    No change

                                                </div>

                                            )}

                                        </div>

                                    </div>

                                </div>

                            )}


                            {/* REMARKS */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Remarks
                                    </span>

                                    <span className="label-text-alt text-base-content/40">
                                        Optional
                                    </span>

                                </label>


                                <textarea
                                    value={
                                        remarks
                                    }
                                    onChange={(e) =>
                                        setRemarks(
                                            e.target.value
                                        )
                                    }
                                    className="textarea textarea-bordered w-full"
                                    rows="3"
                                    placeholder="e.g. New delivery, damaged items, stock count correction..."
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* WARNING */}

                            {adjustmentType ===
                                "STOCK_OUT" &&
                                selectedProduct &&
                                Number(
                                    adjustmentQuantity
                                ) >
                                    getStock(
                                        selectedProduct
                                    ) && (

                                    <div className="alert alert-error text-sm">

                                        <FaExclamationTriangle />

                                        <span>
                                            The quantity cannot
                                            exceed the current
                                            stock.
                                        </span>

                                    </div>

                                )}

                        </div>


                        {/* MODAL ACTIONS */}

                        <div className="modal-action">

                            <button
                                type="button"
                                onClick={
                                    closeAdjustModal
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
                                    handleAdjustStock
                                }
                                className="btn btn-primary"
                                disabled={

                                    saving ||

                                    !selectedProduct ||

                                    (
                                        (
                                            adjustmentType ===
                                            "STOCK_IN" ||

                                            adjustmentType ===
                                            "STOCK_OUT"
                                        ) &&

                                        (
                                            !adjustmentQuantity ||
                                            Number(
                                                adjustmentQuantity
                                            ) <= 0
                                        )
                                    ) ||

                                    (
                                        adjustmentType ===
                                        "STOCK_OUT" &&

                                        Number(
                                            adjustmentQuantity
                                        ) >
                                            (
                                                selectedProduct
                                                    ? getStock(
                                                        selectedProduct
                                                    )
                                                    : 0
                                            )
                                    )

                                }
                            >

                                {saving && (

                                    <span className="loading loading-spinner loading-sm" />

                                )}


                                {!saving && (
                                    <FaWarehouse />
                                )}


                                {saving
                                    ? "Saving..."
                                    : "Save Adjustment"}

                            </button>

                        </div>

                    </div>

                </dialog>

            )}

        </div>

    );

}


export default InventoryPage;