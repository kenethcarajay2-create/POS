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
    FaBox,
    FaTrophy,
    FaExclamationTriangle,
    FaMoneyBillWave,
    FaShoppingCart,
    FaSearch,
    FaDownload,
    FaArrowUp,
    FaSyncAlt,
    FaWarehouse,
    FaCalendarDay,
    FaBoxes,
} from "react-icons/fa";

import useSaleStore from "../../store/sale.store";
import useProductStore from "../../store/product.store";


/*
============================================================
PERIOD OPTIONS
============================================================
*/

const PERIOD_OPTIONS = [
    "Today",
    "Yesterday",
    "This Week",
    "This Month",
    "This Year",
];


/*
============================================================
FORMAT CURRENCY
============================================================
*/

const formatCurrency = (value) => {

    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    ).format(
        Number(value) || 0
    );

};


/*
============================================================
FORMAT NUMBER
============================================================
*/

const formatNumber = (value) => {

    return new Intl.NumberFormat(
        "en-PH"
    ).format(
        Number(value) || 0
    );

};


/*
============================================================
DATE HELPERS
============================================================
*/

const startOfDay = (value) => {

    const date =
        new Date(value);

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;

};


const endOfDay = (value) => {

    const date =
        new Date(value);

    date.setHours(
        23,
        59,
        59,
        999
    );

    return date;

};


const startOfWeek = (value) => {

    const date =
        startOfDay(value);

    const day =
        date.getDay();

    const difference =
        day === 0
            ? -6
            : 1 - day;

    date.setDate(
        date.getDate() +
        difference
    );

    return date;

};


const endOfWeek = (value) => {

    const start =
        startOfWeek(value);

    const end =
        new Date(start);

    end.setDate(
        end.getDate() +
        6
    );

    return endOfDay(end);

};


/*
============================================================
GET PERIOD RANGE
============================================================
*/

const getPeriodRange = (period) => {

    const now =
        new Date();


    if (
        period === "Today"
    ) {

        return {
            start:
                startOfDay(now),

            end:
                endOfDay(now),
        };

    }


    if (
        period === "Yesterday"
    ) {

        const yesterday =
            new Date(now);

        yesterday.setDate(
            yesterday.getDate() -
            1
        );

        return {
            start:
                startOfDay(
                    yesterday
                ),

            end:
                endOfDay(
                    yesterday
                ),
        };

    }


    if (
        period === "This Week"
    ) {

        return {
            start:
                startOfWeek(now),

            end:
                endOfWeek(now),
        };

    }


    if (
        period === "This Month"
    ) {

        return {
            start:
                startOfDay(
                    new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        1
                    )
                ),

            end:
                endOfDay(
                    new Date(
                        now.getFullYear(),
                        now.getMonth() + 1,
                        0
                    )
                ),
        };

    }


    return {
        start:
            startOfDay(
                new Date(
                    now.getFullYear(),
                    0,
                    1
                )
            ),

        end:
            endOfDay(
                new Date(
                    now.getFullYear(),
                    11,
                    31
                )
            ),
    };

};


/*
============================================================
PERIOD LABEL
============================================================
*/

const getPeriodDateLabel = (period) => {

    const {
        start,
        end,
    } =
        getPeriodRange(period);


    const formatter =
        new Intl.DateTimeFormat(
            "en-PH",
            {
                month: "short",
                day: "numeric",
                year: "numeric",
            }
        );


    if (
        start.toDateString() ===
        end.toDateString()
    ) {

        return formatter.format(
            start
        );

    }


    return (
        `${formatter.format(start)} - ${formatter.format(end)}`
    );

};


/*
============================================================
GET SALE DATE
============================================================
*/

const getSaleDate = (sale) => {

    const value =
        sale?.createdAt ||
        sale?.date ||
        sale?.saleDate ||
        sale?.transactionDate ||
        sale?.completedAt ||
        null;


    if (!value) {

        return null;

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

};


/*
============================================================
SALE IN PERIOD
============================================================
*/

const isSaleInPeriod = (
    sale,
    period
) => {

    const date =
        getSaleDate(sale);


    if (!date) {

        return false;

    }


    const {
        start,
        end,
    } =
        getPeriodRange(period);


    const time =
        date.getTime();


    return (
        time >= start.getTime() &&
        time <= end.getTime()
    );

};


/*
============================================================
GET SALE ITEMS
============================================================
*/

const getSaleItems = (sale) => {

    if (
        Array.isArray(
            sale?.items
        )
    ) {

        return sale.items;

    }


    if (
        Array.isArray(
            sale?.saleItems
        )
    ) {

        return sale.saleItems;

    }


    return [];

};


/*
============================================================
PRODUCT ID
============================================================
*/

const getItemProductId = (item) => {

    const product =
        item?.product;


    if (
        product &&
        typeof product === "object"
    ) {

        return String(
            product._id ||
            product.id ||
            ""
        );

    }


    return String(
        item?.productId ||
        item?.product_id ||
        product ||
        ""
    );

};


/*
============================================================
ITEM NAME
============================================================
*/

const getItemName = (item) => {

    return (
        item?.name ||
        item?.product?.name ||
        item?.productName ||
        "Unknown Product"
    );

};


/*
============================================================
ITEM BARCODE
============================================================
*/

const getItemBarcode = (item) => {

    return String(
        item?.barcode ||
        item?.product?.barcode ||
        ""
    );

};


/*
============================================================
ITEM CATEGORY
============================================================
*/

const getItemCategory = (item) => {

    const category =
        item?.category ||
        item?.product?.category ||
        "Uncategorized";


    if (
        typeof category ===
        "object"
    ) {

        return (
            category?.name ||
            "Uncategorized"
        );

    }


    return String(category);

};


/*
============================================================
PRODUCT CATEGORY
============================================================
*/

const getProductCategory = (product) => {

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
ITEM QUANTITY
============================================================
*/

const getItemQuantity = (item) => {

    return Number(
        item?.quantity ??
        item?.qty ??
        0
    ) || 0;

};


/*
============================================================
ITEM UNIT PRICE
============================================================
*/

const getItemUnitPrice = (item) => {

    return Number(
        item?.unitPrice ??
        item?.price ??
        item?.sellingPrice ??
        item?.product?.price ??
        0
    ) || 0;

};


/*
============================================================
ITEM TOTAL
============================================================
*/

const getItemTotal = (item) => {

    const value =
        item?.subtotal ??
        item?.total ??
        item?.amount;


    if (
        value !== undefined &&
        value !== null
    ) {

        const explicit =
            Number(value);


        if (
            Number.isFinite(
                explicit
            )
        ) {

            return explicit;

        }

    }


    return (
        getItemQuantity(item) *
        getItemUnitPrice(item)
    );

};


/*
============================================================
FIND CURRENT PRODUCT
============================================================

Matching priority:

1. MongoDB product ID
2. Barcode
3. Product name

This makes the report work with older sale snapshots too.
============================================================
*/

const findCurrentProduct = (
    saleItem,
    productCatalog
) => {

    const saleProductId =
        getItemProductId(
            saleItem
        );


    /*
    --------------------------------------------------------
    MATCH BY ID
    --------------------------------------------------------
    */

    if (
        saleProductId
    ) {

        const product =
            productCatalog.find(
                (item) => {

                    const id =
                        String(
                            item?._id ||
                            item?.id ||
                            ""
                        );


                    return (
                        id &&
                        id ===
                        saleProductId
                    );

                }
            );


        if (product) {

            return product;

        }

    }


    /*
    --------------------------------------------------------
    MATCH BY BARCODE
    --------------------------------------------------------
    */

    const barcode =
        getItemBarcode(
            saleItem
        );


    if (barcode) {

        const product =
            productCatalog.find(
                (item) =>
                    String(
                        item?.barcode ||
                        ""
                    ) ===
                    barcode
            );


        if (product) {

            return product;

        }

    }


    /*
    --------------------------------------------------------
    MATCH BY NAME
    --------------------------------------------------------
    */

    const name =
        getItemName(
            saleItem
        )
            .trim()
            .toLowerCase();


    if (
        name &&
        name !== "unknown product"
    ) {

        return (
            productCatalog.find(
                (item) =>
                    String(
                        item?.name ||
                        ""
                    )
                        .trim()
                        .toLowerCase() ===
                    name
            ) ||
            null
        );

    }


    return null;

};


/*
============================================================
CURRENT STOCK
============================================================
*/

const getCurrentStock = (
    product
) => {

    if (!product) {

        return null;

    }


    /*
    Try common stock field names.
    */

    const value =
        product?.stock ??
        product?.quantity ??
        product?.stockQuantity ??
        product?.currentStock ??
        product?.inventory ??
        null;


    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }


    const stock =
        Number(value);


    return Number.isFinite(stock)
        ? stock
        : null;

};


/*
============================================================
STOCK STATUS
============================================================
*/

const getStockStatus = (stock) => {

    if (
        stock === null
    ) {

        return {
            label:
                "Not Available",

            className:
                "badge badge-ghost badge-sm",
        };

    }


    if (
        stock <= 0
    ) {

        return {
            label:
                "Out of Stock",

            className:
                "badge badge-error badge-sm",
        };

    }


    if (
        stock <= 5
    ) {

        return {
            label:
                "Critical",

            className:
                "badge badge-error badge-sm",
        };

    }


    if (
        stock <= 10
    ) {

        return {
            label:
                "Low Stock",

            className:
                "badge badge-warning badge-sm",
        };

    }


    return {
        label:
            "Healthy",

        className:
            "badge badge-success badge-sm",
    };

};


/*
============================================================
SALES VELOCITY
============================================================
*/

const getSalesVelocity = (
    sold,
    period
) => {

    let fastThreshold =
        50;

    let normalThreshold =
        20;


    if (
        period === "Today" ||
        period === "Yesterday"
    ) {

        fastThreshold =
            15;

        normalThreshold =
            5;

    }


    if (
        period === "This Week"
    ) {

        fastThreshold =
            50;

        normalThreshold =
            20;

    }


    if (
        period === "This Month"
    ) {

        fastThreshold =
            150;

        normalThreshold =
            50;

    }


    if (
        period === "This Year"
    ) {

        fastThreshold =
            1000;

        normalThreshold =
            300;

    }


    if (
        sold >= fastThreshold
    ) {

        return {
            label:
                "Fast Moving",

            className:
                "badge badge-success badge-sm",
        };

    }


    if (
        sold >= normalThreshold
    ) {

        return {
            label:
                "Normal",

            className:
                "badge badge-info badge-sm",
        };

    }


    if (
        sold > 0
    ) {

        return {
            label:
                "Slow Moving",

            className:
                "badge badge-warning badge-sm",
        };

    }


    return {
        label:
            "No Sales",

        className:
            "badge badge-ghost badge-sm",
    };

};


/*
============================================================
PRODUCTS REPORT PAGE
============================================================
*/

function ProductsReportPage() {

    const navigate =
        useNavigate();


    /*
    ========================================================
    SALE STORE
    ========================================================
    */

    const {
        sales,
        fetchSales,
    } =
        useSaleStore();


    /*
    ========================================================
    PRODUCT STORE
    ========================================================

    IMPORTANT:
    Zustand hooks MUST be called inside the component.
    ========================================================
    */

    const {
        products: productCatalog,
        fetchProducts,
    } =
        useProductStore();


    /*
    ========================================================
    STATE
    ========================================================
    */

    const [
        period,
        setPeriod,
    ] = useState(
        "This Week"
    );


    const [
        search,
        setSearch,
    ] = useState("");


    const [
        sortBy,
        setSortBy,
    ] = useState(
        "sold"
    );


    const [
        refreshing,
        setRefreshing,
    ] = useState(false);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    /*
    ========================================================
    LOAD SALES + PRODUCTS
    ========================================================
    */

    const loadReport =
        useCallback(
            async (
                manual = false
            ) => {

                try {

                    setError("");


                    if (manual) {

                        setRefreshing(
                            true
                        );

                    } else {

                        setLoading(
                            true
                        );

                    }


                    await Promise.all([
                        fetchSales(),
                        fetchProducts(),
                    ]);


                } catch (err) {

                    console.error(
                        "Failed to load product report:",
                        err
                    );


                    setError(
                        err?.response
                            ?.data
                            ?.message ||
                        err?.message ||
                        "Failed to load product report."
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
                fetchSales,
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
    SAFE DATA
    ========================================================
    */

    const safeSales =
        Array.isArray(sales)
            ? sales
            : [];


    const safeProductCatalog =
        Array.isArray(
            productCatalog
        )
            ? productCatalog
            : [];


    /*
    ========================================================
    SALES FOR SELECTED PERIOD
    ========================================================
    */

    const periodSales =
        useMemo(
            () => {

                return safeSales.filter(
                    (sale) =>
                        isSaleInPeriod(
                            sale,
                            period
                        )
                );

            },
            [
                safeSales,
                period,
            ]
        );


    /*
    ========================================================
    BUILD PRODUCT REPORT
    ========================================================

    IMPORTANT:

    Sales still control which products appear in the table.

    This preserves your CURRENT layout/behavior.

    Product store is only used to supply CURRENT:

    - stock
    - category
    - product name
    - barcode
    ========================================================
    */

    const products =
        useMemo(
            () => {

                const map =
                    new Map();


                for (
                    const sale
                    of periodSales
                ) {

                    const items =
                        getSaleItems(
                            sale
                        );


                    for (
                        const item
                        of items
                    ) {

                        const currentProduct =
                            findCurrentProduct(
                                item,
                                safeProductCatalog
                            );


                        /*
                        ----------------------------------------
                        REPORT KEY
                        ----------------------------------------
                        */

                        const productId =
                            String(
                                currentProduct?._id ||
                                currentProduct?.id ||
                                getItemProductId(
                                    item
                                ) ||
                                getItemBarcode(
                                    item
                                ) ||
                                getItemName(
                                    item
                                )
                            );


                        const quantity =
                            getItemQuantity(
                                item
                            );


                        const revenue =
                            getItemTotal(
                                item
                            );


                        const unitPrice =
                            getItemUnitPrice(
                                item
                            );


                        /*
                        ----------------------------------------
                        LIVE PRODUCT DATA
                        ----------------------------------------
                        */

                        const currentStock =
                            getCurrentStock(
                                currentProduct
                            );


                        const currentName =
                            currentProduct?.name ||
                            getItemName(
                                item
                            );


                        const currentBarcode =
                            currentProduct?.barcode ||
                            getItemBarcode(
                                item
                            );


                        const currentCategory =
                            currentProduct
                                ? getProductCategory(
                                    currentProduct
                                )
                                : getItemCategory(
                                    item
                                );


                        if (
                            !map.has(
                                productId
                            )
                        ) {

                            map.set(
                                productId,
                                {
                                    id:
                                        productId,

                                    name:
                                        currentName,

                                    barcode:
                                        currentBarcode,

                                    category:
                                        currentCategory,

                                    sold:
                                        0,

                                    revenue:
                                        0,

                                    stock:
                                        currentStock,

                                    price:
                                        unitPrice,

                                    transactions:
                                        0,

                                    currentProduct:
                                        Boolean(
                                            currentProduct
                                        ),
                                }
                            );

                        }


                        const product =
                            map.get(
                                productId
                            );


                        product.sold +=
                            quantity;


                        product.revenue +=
                            revenue;


                        product.transactions +=
                            1;


                        /*
                        Always use LIVE stock from Products.
                        */

                        if (
                            currentStock !==
                            null
                        ) {

                            product.stock =
                                currentStock;

                        }


                        /*
                        Use current product information.
                        */

                        if (
                            currentProduct
                        ) {

                            product.name =
                                currentName;

                            product.barcode =
                                currentBarcode;

                            product.category =
                                currentCategory;

                            product.currentProduct =
                                true;

                        }


                        if (
                            unitPrice > 0
                        ) {

                            product.price =
                                unitPrice;

                        }

                    }

                }


                return Array.from(
                    map.values()
                );

            },
            [
                periodSales,
                safeProductCatalog,
            ]
        );


    /*
    ========================================================
    FILTER + SORT
    ========================================================
    */

    const filteredProducts =
        useMemo(
            () => {

                let result = [
                    ...products,
                ];


                if (
                    search.trim()
                ) {

                    const query =
                        search
                            .toLowerCase()
                            .trim();


                    result =
                        result.filter(
                            (product) => {

                                return (
                                    String(
                                        product.name ||
                                        ""
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query
                                        ) ||

                                    String(
                                        product.barcode ||
                                        ""
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query
                                        ) ||

                                    String(
                                        product.category ||
                                        ""
                                    )
                                        .toLowerCase()
                                        .includes(
                                            query
                                        )
                                );

                            }
                        );

                }


                result.sort(
                    (
                        a,
                        b
                    ) => {

                        if (
                            sortBy === "sold"
                        ) {

                            return (
                                b.sold -
                                a.sold
                            );

                        }


                        if (
                            sortBy === "revenue"
                        ) {

                            return (
                                b.revenue -
                                a.revenue
                            );

                        }


                        if (
                            sortBy === "stock"
                        ) {

                            if (
                                a.stock === null
                            ) {

                                return 1;

                            }


                            if (
                                b.stock === null
                            ) {

                                return -1;

                            }


                            return (
                                a.stock -
                                b.stock
                            );

                        }


                        if (
                            sortBy === "name"
                        ) {

                            return String(
                                a.name
                            ).localeCompare(
                                String(
                                    b.name
                                )
                            );

                        }


                        return 0;

                    }
                );


                return result;

            },
            [
                products,
                search,
                sortBy,
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

                const totalSold =
                    products.reduce(
                        (
                            sum,
                            product
                        ) =>
                            sum +
                            Number(
                                product.sold
                            ),
                        0
                    );


                const totalRevenue =
                    products.reduce(
                        (
                            sum,
                            product
                        ) =>
                            sum +
                            Number(
                                product.revenue
                            ),
                        0
                    );


                const productsWithStock =
                    products.filter(
                        (product) =>
                            product.stock !==
                            null
                    );


                const lowStock =
                    productsWithStock.filter(
                        (product) =>
                            product.stock <=
                            10
                    ).length;


                const outOfStock =
                    productsWithStock.filter(
                        (product) =>
                            product.stock <=
                            0
                    ).length;


                const fastMoving =
                    products.filter(
                        (product) =>
                            getSalesVelocity(
                                product.sold,
                                period
                            ).label ===
                            "Fast Moving"
                    ).length;


                const bestSelling =
                    [
                        ...products,
                    ].sort(
                        (
                            a,
                            b
                        ) =>
                            b.sold -
                            a.sold
                    )[0] ||
                    null;


                const highestRevenue =
                    [
                        ...products,
                    ].sort(
                        (
                            a,
                            b
                        ) =>
                            b.revenue -
                            a.revenue
                    )[0] ||
                    null;


                return {
                    totalSold,
                    totalRevenue,
                    lowStock,
                    outOfStock,
                    fastMoving,
                    bestSelling,
                    highestRevenue,

                    productsWithStock:
                        productsWithStock.length,
                };

            },
            [
                products,
                period,
            ]
        );


    /*
    ========================================================
    EXPORT CSV
    ========================================================
    */

    const handleExport = () => {

        if (
            filteredProducts.length ===
            0
        ) {

            window.alert(
                "There are no products to export."
            );

            return;

        }


        const headers = [
            "Rank",
            "Product",
            "Barcode",
            "Category",
            "Units Sold",
            "Revenue",
            "Average Price",
            "Stock",
            "Sales Status",
            "Stock Status",
        ];


        const rows =
            filteredProducts.map(
                (
                    product,
                    index
                ) => {

                    const velocity =
                        getSalesVelocity(
                            product.sold,
                            period
                        );


                    const stockStatus =
                        getStockStatus(
                            product.stock
                        );


                    const averagePrice =
                        product.sold > 0
                            ? product.revenue /
                              product.sold
                            : product.price;


                    return [
                        index + 1,
                        product.name,
                        product.barcode,
                        product.category,
                        product.sold,
                        Number(
                            product.revenue
                        ).toFixed(2),
                        Number(
                            averagePrice
                        ).toFixed(2),
                        product.stock ?? "",
                        velocity.label,
                        stockStatus.label,
                    ];

                }
            );


        const escapeCsv = (
            value
        ) => {

            const text =
                String(
                    value ??
                    ""
                );


            return `"${text.replace(
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
                    (row) =>
                        row
                            .map(
                                escapeCsv
                            )
                            .join(",")
                )
                .join("\n");


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


        const anchor =
            document.createElement(
                "a"
            );


        const safePeriod =
            period
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "-"
                );


        anchor.href =
            url;


        anchor.download =
            `product-report-${safePeriod}.csv`;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        document.body.removeChild(
            anchor
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
        safeSales.length === 0
    ) {

        return (

            <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                    <span className="loading loading-spinner loading-lg text-primary" />

                    <p className="mt-3 text-sm text-base-content/50">
                        Building product report...
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


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                <div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/reports"
                            )
                        }
                        className="
                            mb-3
                            flex
                            items-center
                            gap-2
                            text-sm
                            text-base-content/50
                            transition
                            hover:text-primary
                        "
                    >

                        <FaArrowLeft />

                        Back to Reports

                    </button>


                    <div className="flex items-center gap-3">

                        <div
                            className="
                                flex
                                h-12
                                w-12
                                items-center
                                justify-center
                                rounded-xl
                                bg-primary/10
                                text-primary
                            "
                        >

                            <FaBox />

                        </div>


                        <div>

                            <h1 className="text-2xl font-bold">
                                Products Report
                            </h1>


                            <p className="mt-1 text-sm text-base-content/55">
                                Actual product sales, revenue and inventory performance.
                            </p>

                        </div>

                    </div>

                </div>


                {/* CONTROLS */}

                <div className="flex flex-wrap items-center gap-2">

                    <select
                        value={period}
                        onChange={(event) =>
                            setPeriod(
                                event.target.value
                            )
                        }
                        className="select select-bordered select-sm bg-base-100"
                    >

                        {PERIOD_OPTIONS.map(
                            (option) => (

                                <option
                                    key={option}
                                    value={option}
                                >
                                    {option}
                                </option>

                            )
                        )}

                    </select>


                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                            loadReport(true)
                        }
                        disabled={refreshing}
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
                        onClick={
                            handleExport
                        }
                        className="btn btn-primary btn-sm"
                    >

                        <FaDownload />

                        Export CSV

                    </button>

                </div>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (

                <div className="alert alert-error">

                    <span>
                        {error}
                    </span>

                </div>

            )}


            {/* ==================================================
                PERIOD INDICATOR
            ================================================== */}

            <div
                className="
                    flex
                    flex-col
                    gap-3
                    rounded-xl
                    border
                    border-primary/20
                    bg-primary/5
                    px-4
                    py-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                "
            >

                <div className="flex items-center gap-3">

                    <div
                        className="
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-lg
                            bg-primary/10
                            text-primary
                        "
                    >

                        <FaCalendarDay />

                    </div>


                    <div>

                        <p className="text-sm font-bold">
                            {period}
                        </p>


                        <p className="text-xs text-base-content/50">

                            {
                                getPeriodDateLabel(
                                    period
                                )
                            }

                        </p>

                    </div>

                </div>


                <div className="text-sm text-base-content/55">

                    {
                        formatNumber(
                            periodSales.length
                        )
                    }

                    {" "}sale

                    {
                        periodSales.length !== 1
                            ? "s"
                            : ""
                    }

                    {" "}included

                </div>

            </div>


            {/* ==================================================
                SUMMARY
            ================================================== */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <ReportCard
                    title="Items Sold"
                    value={
                        formatNumber(
                            summary.totalSold
                        )
                    }
                    description="Total units sold"
                    icon={
                        FaShoppingCart
                    }
                    iconClass="bg-primary/10 text-primary"
                />


                <ReportCard
                    title="Product Revenue"
                    value={
                        formatCurrency(
                            summary.totalRevenue
                        )
                    }
                    description="Revenue from product sales"
                    icon={
                        FaMoneyBillWave
                    }
                    iconClass="bg-success/10 text-success"
                />


                <ReportCard
                    title="Fast Moving"
                    value={
                        formatNumber(
                            summary.fastMoving
                        )
                    }
                    description="High-performing products"
                    icon={
                        FaArrowUp
                    }
                    iconClass="bg-info/10 text-info"
                />


                <ReportCard
                    title="Low Stock"
                    value={
                        formatNumber(
                            summary.lowStock
                        )
                    }
                    description={
                        summary.productsWithStock > 0
                            ? "Products needing attention"
                            : "No matching live stock data"
                    }
                    icon={
                        FaExclamationTriangle
                    }
                    iconClass="bg-warning/10 text-warning"
                />

            </div>


            {/* ==================================================
                HIGHLIGHTS
            ================================================== */}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                <HighlightCard
                    label="Best Selling Product"
                    title={
                        summary.bestSelling
                            ?.name ||
                        "No sales yet"
                    }
                    subtitle={
                        summary.bestSelling
                            ?.category ||
                        "—"
                    }
                    icon={
                        FaTrophy
                    }
                    iconClass="bg-warning/10 text-warning"
                    footerLabel="Units sold"
                    footerValue={
                        formatNumber(
                            summary.bestSelling
                                ?.sold
                        )
                    }
                />


                <HighlightCard
                    label="Highest Revenue"
                    title={
                        summary.highestRevenue
                            ?.name ||
                        "No sales yet"
                    }
                    subtitle={
                        summary.highestRevenue
                            ?.category ||
                        "—"
                    }
                    icon={
                        FaMoneyBillWave
                    }
                    iconClass="bg-success/10 text-success"
                    footerLabel="Revenue"
                    footerValue={
                        formatCurrency(
                            summary.highestRevenue
                                ?.revenue
                        )
                    }
                />


                {/* INVENTORY WARNING */}

                <div
                    className="
                        rounded-xl
                        border
                        border-base-300
                        bg-base-100
                        p-5
                        shadow-sm
                    "
                >

                    <div className="flex items-start justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">
                                Inventory Warning
                            </p>


                            <h2 className="mt-2 text-lg font-bold">

                                {
                                    summary.productsWithStock > 0
                                        ? `${summary.lowStock} products`
                                        : "Stock data unavailable"
                                }

                            </h2>


                            <p className="mt-1 text-xs text-base-content/50">

                                {
                                    summary.productsWithStock > 0
                                        ? `${summary.outOfStock} currently out of stock`
                                        : "No matching live product stock was found."
                                }

                            </p>

                        </div>


                        <div
                            className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                bg-error/10
                                text-error
                            "
                        >

                            <FaWarehouse />

                        </div>

                    </div>


                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/inventory"
                            )
                        }
                        className="btn btn-sm btn-outline mt-5"
                    >

                        Open Inventory

                    </button>

                </div>

            </div>


            {/* ==================================================
                PRODUCT TABLE
            ================================================== */}

            <div
                className="
                    overflow-hidden
                    rounded-xl
                    border
                    border-base-300
                    bg-base-100
                    shadow-sm
                "
            >

                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        border-b
                        border-base-200
                        p-5
                        lg:flex-row
                        lg:items-center
                        lg:justify-between
                    "
                >

                    <div>

                        <h2 className="font-bold">
                            Product Performance
                        </h2>


                        <p className="mt-1 text-xs text-base-content/50">
                            Products aggregated from actual sales in the selected period.
                        </p>

                    </div>


                    <div className="flex flex-col gap-2 sm:flex-row">

                        <div className="relative">

                            <FaSearch
                                className="
                                    absolute
                                    left-3
                                    top-1/2
                                    -translate-y-1/2
                                    text-xs
                                    text-base-content/35
                                "
                            />


                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Search product..."
                                className="input input-bordered input-sm w-full pl-8 sm:w-64"
                            />

                        </div>


                        <select
                            value={sortBy}
                            onChange={(event) =>
                                setSortBy(
                                    event.target.value
                                )
                            }
                            className="select select-bordered select-sm"
                        >

                            <option value="sold">
                                Units Sold
                            </option>

                            <option value="revenue">
                                Revenue
                            </option>

                            <option value="stock">
                                Lowest Stock
                            </option>

                            <option value="name">
                                Product Name
                            </option>

                        </select>

                    </div>

                </div>


                <div className="overflow-x-auto">

                    <table className="table">

                        <thead>

                            <tr>

                                <th>
                                    Rank
                                </th>

                                <th>
                                    Product
                                </th>

                                <th>
                                    Category
                                </th>

                                <th>
                                    Units Sold
                                </th>

                                <th>
                                    Revenue
                                </th>

                                <th>
                                    Avg. Price
                                </th>

                                <th>
                                    Stock
                                </th>

                                <th>
                                    Sales Status
                                </th>

                                <th>
                                    Stock Status
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {filteredProducts.map(
                                (
                                    product,
                                    index
                                ) => {

                                    const stockStatus =
                                        getStockStatus(
                                            product.stock
                                        );


                                    const velocity =
                                        getSalesVelocity(
                                            product.sold,
                                            period
                                        );


                                    const averagePrice =
                                        product.sold > 0
                                            ? product.revenue /
                                              product.sold
                                            : product.price;


                                    return (

                                        <tr
                                            key={product.id}
                                            className="hover"
                                        >

                                            <td>

                                                <div
                                                    className="
                                                        flex
                                                        h-8
                                                        w-8
                                                        items-center
                                                        justify-center
                                                        rounded-lg
                                                        bg-base-200
                                                        text-xs
                                                        font-bold
                                                    "
                                                >

                                                    {
                                                        index + 1
                                                    }

                                                </div>

                                            </td>


                                            <td>

                                                <div>

                                                    <p className="font-semibold">

                                                        {
                                                            product.name
                                                        }

                                                    </p>


                                                    <p className="mt-0.5 text-[10px] text-base-content/40">

                                                        {
                                                            product.barcode ||
                                                            "No barcode"
                                                        }

                                                    </p>

                                                </div>

                                            </td>


                                            <td>

                                                <span className="badge badge-ghost badge-sm">

                                                    {
                                                        product.category
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                <span className="font-bold">

                                                    {
                                                        formatNumber(
                                                            product.sold
                                                        )
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                <span className="font-semibold">

                                                    {
                                                        formatCurrency(
                                                            product.revenue
                                                        )
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                {
                                                    formatCurrency(
                                                        averagePrice
                                                    )
                                                }

                                            </td>


                                            <td>

                                                {
                                                    product.stock === null
                                                        ? (

                                                            <span className="text-xs text-base-content/40">
                                                                —
                                                            </span>

                                                        )
                                                        : (

                                                            <span
                                                                className={
                                                                    product.stock <= 5
                                                                        ? "font-bold text-error"
                                                                        : product.stock <= 10
                                                                            ? "font-bold text-warning"
                                                                            : "font-semibold"
                                                                }
                                                            >

                                                                {
                                                                    formatNumber(
                                                                        product.stock
                                                                    )
                                                                }

                                                            </span>

                                                        )
                                                }

                                            </td>


                                            <td>

                                                <span
                                                    className={
                                                        velocity.className
                                                    }
                                                >

                                                    {
                                                        velocity.label
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                <span
                                                    className={
                                                        stockStatus.className
                                                    }
                                                >

                                                    {
                                                        stockStatus.label
                                                    }

                                                </span>

                                            </td>

                                        </tr>

                                    );

                                }
                            )}


                            {filteredProducts.length === 0 && (

                                <tr>

                                    <td
                                        colSpan="9"
                                        className="py-14 text-center"
                                    >

                                        <FaSearch className="mx-auto text-3xl text-base-content/15" />


                                        <h3 className="mt-3 font-semibold">

                                            {
                                                products.length === 0
                                                    ? "No product sales in this period"
                                                    : "No matching products"
                                            }

                                        </h3>


                                        <p className="mt-1 text-xs text-base-content/50">

                                            {
                                                products.length === 0
                                                    ? "Choose another period or make a sale."
                                                    : "Try another product, barcode or category."
                                            }

                                        </p>


                                        {products.length === 0 && (

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigate(
                                                        "/pos"
                                                    )
                                                }
                                                className="btn btn-primary btn-sm mt-4"
                                            >

                                                Open POS

                                            </button>

                                        )}

                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>


                <div
                    className="
                        flex
                        flex-col
                        gap-2
                        border-t
                        border-base-200
                        px-5
                        py-3
                        text-xs
                        text-base-content/40
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >

                    <span>

                        Showing{" "}

                        {
                            filteredProducts.length
                        }

                        {" "}of{" "}

                        {
                            products.length
                        }

                        {" "}products

                    </span>


                    <span>
                        Period: {period}
                    </span>

                </div>

            </div>


            {/* ==================================================
                INSIGHTS
            ================================================== */}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                <InsightPanel
                    title="Fast-Moving Products"
                    description="Products with the strongest sales activity."
                    icon={
                        FaArrowUp
                    }
                    iconClass="bg-success/10 text-success"
                >

                    {[
                        ...products,
                    ]
                        .filter(
                            (product) =>
                                getSalesVelocity(
                                    product.sold,
                                    period
                                ).label ===
                                "Fast Moving"
                        )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                b.sold -
                                a.sold
                        )
                        .slice(
                            0,
                            5
                        )
                        .map(
                            (product) => (

                                <InsightRow
                                    key={product.id}
                                    title={product.name}
                                    subtitle={product.category}
                                    value={
                                        formatNumber(
                                            product.sold
                                        )
                                    }
                                    valueLabel="sold"
                                />

                            )
                        )}


                    {
                        products.filter(
                            (product) =>
                                getSalesVelocity(
                                    product.sold,
                                    period
                                ).label ===
                                "Fast Moving"
                        ).length === 0 && (

                            <EmptyInsight
                                text="No products reached the fast-moving threshold for this period."
                            />

                        )
                    }

                </InsightPanel>


                <InsightPanel
                    title="Products Needing Restock"
                    description="Current stock warnings from the Products database."
                    icon={
                        FaExclamationTriangle
                    }
                    iconClass="bg-warning/10 text-warning"
                >

                    {products
                        .filter(
                            (product) =>
                                product.stock !== null &&
                                product.stock <= 10
                        )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                a.stock -
                                b.stock
                        )
                        .slice(
                            0,
                            5
                        )
                        .map(
                            (product) => (

                                <InsightRow
                                    key={product.id}
                                    title={product.name}
                                    subtitle={product.category}
                                    value={
                                        formatNumber(
                                            product.stock
                                        )
                                    }
                                    valueLabel="remaining"
                                    danger={
                                        product.stock <= 5
                                    }
                                />

                            )
                        )}


                    {
                        summary.productsWithStock === 0
                            ? (

                                <EmptyInsight
                                    text="No matching current stock information was found."
                                />

                            )
                            : products.filter(
                                (product) =>
                                    product.stock !== null &&
                                    product.stock <= 10
                            ).length === 0
                                ? (

                                    <EmptyInsight
                                        text="No products currently need restocking."
                                    />

                                )
                                : null
                    }

                </InsightPanel>

            </div>


            {/* ==================================================
                REPORT INFORMATION
            ================================================== */}

            <div
                className="
                    rounded-xl
                    border
                    border-base-300
                    bg-base-100
                    p-5
                    shadow-sm
                "
            >

                <div className="flex items-start gap-3">

                    <div
                        className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-primary/10
                            text-primary
                        "
                    >

                        <FaBoxes />

                    </div>


                    <div>

                        <h3 className="text-sm font-semibold">
                            About this report
                        </h3>


                        <p className="mt-1 text-xs leading-relaxed text-base-content/50">

                            Sales figures are calculated from your actual sales records for the selected period. Current stock, product category, name and barcode are matched against your live Products database.

                        </p>

                    </div>

                </div>

            </div>

        </div>

    );

}


/*
============================================================
REPORT CARD
============================================================
*/

function ReportCard({
    title,
    value,
    description,
    icon: Icon,
    iconClass,
}) {

    return (

        <div
            className="
                rounded-xl
                border
                border-base-300
                bg-base-100
                p-5
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:shadow-md
            "
        >

            <div className="flex items-start justify-between gap-3">

                <div>

                    <p className="text-xs text-base-content/50">
                        {title}
                    </p>


                    <p className="mt-2 text-2xl font-bold">
                        {value}
                    </p>

                </div>


                <div
                    className={`
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        ${iconClass}
                    `}
                >

                    <Icon />

                </div>

            </div>


            <p className="mt-3 text-[11px] text-base-content/45">
                {description}
            </p>

        </div>

    );

}


/*
============================================================
HIGHLIGHT CARD
============================================================
*/

function HighlightCard({
    label,
    title,
    subtitle,
    icon: Icon,
    iconClass,
    footerLabel,
    footerValue,
}) {

    return (

        <div
            className="
                rounded-xl
                border
                border-base-300
                bg-base-100
                p-5
                shadow-sm
            "
        >

            <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                    <p className="text-xs text-base-content/50">
                        {label}
                    </p>


                    <h2 className="mt-2 truncate text-lg font-bold">
                        {title}
                    </h2>


                    <p className="mt-1 text-xs text-base-content/45">
                        {subtitle}
                    </p>

                </div>


                <div
                    className={`
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        ${iconClass}
                    `}
                >

                    <Icon />

                </div>

            </div>


            <div className="mt-5 flex items-center justify-between">

                <span className="text-xs text-base-content/50">
                    {footerLabel}
                </span>


                <span className="font-bold">
                    {footerValue}
                </span>

            </div>

        </div>

    );

}


/*
============================================================
INSIGHT PANEL
============================================================
*/

function InsightPanel({
    title,
    description,
    icon: Icon,
    iconClass,
    children,
}) {

    return (

        <div
            className="
                rounded-xl
                border
                border-base-300
                bg-base-100
                p-5
                shadow-sm
            "
        >

            <div className="mb-4 flex items-center gap-3">

                <div
                    className={`
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-lg
                        ${iconClass}
                    `}
                >

                    <Icon />

                </div>


                <div>

                    <h3 className="text-sm font-bold">
                        {title}
                    </h3>


                    <p className="mt-1 text-xs text-base-content/50">
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
INSIGHT ROW
============================================================
*/

function InsightRow({
    title,
    subtitle,
    value,
    valueLabel,
    danger = false,
}) {

    return (

        <div className="flex items-center justify-between gap-4 py-3">

            <div className="min-w-0">

                <p className="truncate text-sm font-medium">
                    {title}
                </p>


                <p className="mt-0.5 text-[10px] text-base-content/40">
                    {subtitle}
                </p>

            </div>


            <div className="shrink-0 text-right">

                <p
                    className={
                        danger
                            ? "text-sm font-bold text-error"
                            : "text-sm font-bold"
                    }
                >

                    {value}

                </p>


                <p className="text-[10px] text-base-content/40">
                    {valueLabel}
                </p>

            </div>

        </div>

    );

}


/*
============================================================
EMPTY INSIGHT
============================================================
*/

function EmptyInsight({
    text,
}) {

    return (

        <div className="py-8 text-center">

            <p className="text-xs text-base-content/45">
                {text}
            </p>

        </div>

    );

}


export default ProductsReportPage;