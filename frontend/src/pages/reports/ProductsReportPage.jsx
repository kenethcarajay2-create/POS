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
    FaTimes,
    FaCheck,
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
    "Custom Range",
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
PARSE LOCAL DATE STRING
============================================================

Avoids YYYY-MM-DD being interpreted as UTC.

Example:
2026-09-04

becomes local:
Sep 4, 2026 12:00 AM
============================================================
*/

const parseLocalDateString = (value) => {

    if (!value) {

        return null;

    }


    const parts =
        String(value)
            .split("-")
            .map(Number);


    if (
        parts.length !== 3
    ) {

        return null;

    }


    const [
        year,
        month,
        day,
    ] = parts;


    if (
        !year ||
        !month ||
        !day
    ) {

        return null;

    }


    const date =
        new Date(
            year,
            month - 1,
            day
        );


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
DAYS BETWEEN
============================================================
*/

const daysBetween = (
    start,
    end
) => {

    const first =
        startOfDay(start);

    const second =
        startOfDay(end);


    return (
        Math.floor(
            (
                second.getTime() -
                first.getTime()
            ) /
            86400000
        ) + 1
    );

};


/*
============================================================
FORMAT DATE
============================================================
*/

const formatDate = (value) => {

    if (!value) {

        return "";

    }


    let date;


    if (
        typeof value ===
        "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {

        date =
            parseLocalDateString(
                value
            );

    } else {

        date =
            new Date(value);

    }


    if (
        !date ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return new Intl.DateTimeFormat(
        "en-PH",
        {
            month: "short",
            day: "numeric",
            year: "numeric",
        }
    ).format(date);

};


/*
============================================================
GET PERIOD RANGE
============================================================

Existing period function preserved.

Now also supports:
Custom Range
============================================================
*/

const getPeriodRange = (
    period,
    customStartDate = "",
    customEndDate = ""
) => {

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


    if (
        period === "Custom Range"
    ) {

        const customStart =
            parseLocalDateString(
                customStartDate
            );


        const customEnd =
            parseLocalDateString(
                customEndDate
            );


        if (
            customStart &&
            customEnd
        ) {

            return {
                start:
                    startOfDay(
                        customStart
                    ),

                end:
                    endOfDay(
                        customEnd
                    ),
            };

        }


        return {
            start:
                startOfDay(now),

            end:
                endOfDay(now),
        };

    }


    /*
    THIS YEAR
    */

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

const getPeriodDateLabel = (
    period,
    customStartDate = "",
    customEndDate = ""
) => {

    const {
        start,
        end,
    } =
        getPeriodRange(
            period,
            customStartDate,
            customEndDate
        );


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

Existing function preserved.

Now supports custom dates.
============================================================
*/

const isSaleInPeriod = (
    sale,
    period,
    customStartDate = "",
    customEndDate = ""
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
        getPeriodRange(
            period,
            customStartDate,
            customEndDate
        );


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
REFUNDED QUANTITY
============================================================
*/

const getItemRefundedQuantity = (
    item
) => {

    return Number(
        item?.refundedQuantity ??
        item?.refundQuantity ??
        0
    ) || 0;

};


/*
============================================================
NET ITEM QUANTITY
============================================================

Refunded quantities are removed from
the product report.
============================================================
*/

const getNetItemQuantity = (
    item
) => {

    const quantity =
        getItemQuantity(
            item
        );


    const refunded =
        getItemRefundedQuantity(
            item
        );


    return Math.max(
        quantity -
        refunded,
        0
    );

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

Existing function preserved.
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
NET ITEM TOTAL
============================================================

Used by report so refunded quantities
do not remain counted as revenue.
============================================================
*/

const getNetItemTotal = (
    item
) => {

    return (
        getNetItemQuantity(
            item
        ) *
        getItemUnitPrice(
            item
        )
    );

};


/*
============================================================
IS VOIDED SALE
============================================================
*/

const isVoidedSale = (sale) => {

    return (
        String(
            sale?.status ||
            ""
        ).toUpperCase() ===
        "VOIDED"
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

Existing function preserved.

Custom ranges use a scaled threshold
based on number of selected days.
============================================================
*/

const getSalesVelocity = (
    sold,
    period,
    customRangeDays = null
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


    /*
    --------------------------------------------------------
    CUSTOM RANGE
    --------------------------------------------------------

    Approximate daily thresholds:

    Fast:
    about 7 units / day

    Normal:
    about 3 units / day

    Minimum thresholds prevent very small
    ranges becoming too sensitive.
    --------------------------------------------------------
    */

    if (
        period ===
        "Custom Range"
    ) {

        const days =
            Math.max(
                Number(
                    customRangeDays
                ) || 1,
                1
            );


        fastThreshold =
            Math.max(
                Math.ceil(
                    days * 7
                ),
                15
            );


        normalThreshold =
            Math.max(
                Math.ceil(
                    days * 3
                ),
                5
            );

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
    CUSTOM RANGE STATE
    ========================================================
    */

    const [
        showCustomRange,
        setShowCustomRange,
    ] = useState(false);


    const [
        customStartDate,
        setCustomStartDate,
    ] = useState("");


    const [
        customEndDate,
        setCustomEndDate,
    ] = useState("");


    const [
        appliedStartDate,
        setAppliedStartDate,
    ] = useState("");


    const [
        appliedEndDate,
        setAppliedEndDate,
    ] = useState("");


    const [
        dateError,
        setDateError,
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
    CUSTOM RANGE DAYS
    ========================================================
    */

    const customRangeDays =
        useMemo(
            () => {

                if (
                    period !==
                    "Custom Range" ||
                    !appliedStartDate ||
                    !appliedEndDate
                ) {

                    return null;

                }


                const start =
                    parseLocalDateString(
                        appliedStartDate
                    );


                const end =
                    parseLocalDateString(
                        appliedEndDate
                    );


                if (
                    !start ||
                    !end
                ) {

                    return null;

                }


                return daysBetween(
                    start,
                    end
                );

            },
            [
                period,
                appliedStartDate,
                appliedEndDate,
            ]
        );


    /*
    ========================================================
    CURRENT PERIOD TITLE
    ========================================================
    */

    const currentPeriodTitle =
        period ===
        "Custom Range"
            ? (
                appliedStartDate ===
                appliedEndDate
                    ? formatDate(
                        appliedStartDate
                    )
                    : `${formatDate(
                        appliedStartDate
                    )} - ${formatDate(
                        appliedEndDate
                    )}`
            )
            : period;


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
                            period,
                            appliedStartDate,
                            appliedEndDate
                        )
                );

            },
            [
                safeSales,
                period,
                appliedStartDate,
                appliedEndDate,
            ]
        );


    /*
    ========================================================
    BUILD PRODUCT REPORT
    ========================================================

    Sales still control which products appear.

    Current Products database supplies:
    - stock
    - category
    - current product name
    - current barcode

    Voided sales are excluded.

    Refunded quantities are subtracted.
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

                    /*
                    ----------------------------------------
                    DO NOT COUNT VOIDED SALES
                    ----------------------------------------
                    */

                    if (
                        isVoidedSale(
                            sale
                        )
                    ) {

                        continue;

                    }


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


                        /*
                        ----------------------------------------
                        NET QUANTITY AFTER REFUNDS
                        ----------------------------------------
                        */

                        const quantity =
                            getNetItemQuantity(
                                item
                            );


                        /*
                        ----------------------------------------
                        NET REVENUE AFTER REFUNDS
                        ----------------------------------------
                        */

                        const revenue =
                            getNetItemTotal(
                                item
                            );


                        const unitPrice =
                            getItemUnitPrice(
                                item
                            );


                        /*
                        If fully refunded, there is nothing
                        left to count as product sales.
                        */

                        if (
                            quantity <= 0 &&
                            revenue <= 0
                        ) {

                            continue;

                        }


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
                        Always use LIVE stock.
                        */

                        if (
                            currentStock !==
                            null
                        ) {

                            product.stock =
                                currentStock;

                        }


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
                                period,
                                customRangeDays
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
                customRangeDays,
            ]
        );


    /*
    ========================================================
    HANDLE PERIOD CHANGE
    ========================================================
    */

    const handlePeriodChange =
        (event) => {

            const selectedPeriod =
                event.target.value;


            if (
                selectedPeriod ===
                "Custom Range"
            ) {

                setShowCustomRange(
                    true
                );


                setDateError(
                    ""
                );


                return;

            }


            setPeriod(
                selectedPeriod
            );


            setShowCustomRange(
                false
            );


            setDateError(
                ""
            );

        };


    /*
    ========================================================
    HANDLE OPEN CUSTOM RANGE
    ========================================================
    */

    const handleOpenCustomRange =
        () => {

            setDateError(
                ""
            );


            if (
                appliedStartDate
            ) {

                setCustomStartDate(
                    appliedStartDate
                );

            }


            if (
                appliedEndDate
            ) {

                setCustomEndDate(
                    appliedEndDate
                );

            }


            setShowCustomRange(
                true
            );

        };


    /*
    ========================================================
    HANDLE APPLY CUSTOM RANGE
    ========================================================
    */

    const handleApplyCustomRange =
        () => {

            if (
                !customStartDate ||
                !customEndDate
            ) {

                setDateError(
                    "Please select both a start date and an end date."
                );


                return;

            }


            if (
                customStartDate >
                customEndDate
            ) {

                setDateError(
                    "The start date cannot be after the end date."
                );


                return;

            }


            setAppliedStartDate(
                customStartDate
            );


            setAppliedEndDate(
                customEndDate
            );


            setPeriod(
                "Custom Range"
            );


            setDateError(
                ""
            );


            setShowCustomRange(
                false
            );

        };


    /*
    ========================================================
    HANDLE CANCEL CUSTOM RANGE
    ========================================================
    */

    const handleCancelCustomRange =
        () => {

            setDateError(
                ""
            );


            setShowCustomRange(
                false
            );

        };


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
                            period,
                            customRangeDays
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
            period ===
            "Custom Range"
                ? `${appliedStartDate}-to-${appliedEndDate}`
                : period
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
                        value={
                            showCustomRange
                                ? "Custom Range"
                                : period
                        }
                        onChange={
                            handlePeriodChange
                        }
                        className="select select-bordered select-sm bg-base-100"
                    >

                        {PERIOD_OPTIONS.map(
                            (option) => (

                                <option
                                    key={
                                        option
                                    }
                                    value={
                                        option
                                    }
                                >

                                    {option ===
                                    "Custom Range"
                                        ? "Custom Range..."
                                        : option}

                                </option>

                            )
                        )}

                    </select>


                    {period ===
                        "Custom Range" &&
                        !showCustomRange && (

                            <button
                                type="button"
                                onClick={
                                    handleOpenCustomRange
                                }
                                className="btn btn-ghost btn-sm"
                            >

                                <FaCalendarDay />


                                <span className="hidden sm:inline">

                                    Change Range

                                </span>

                            </button>

                        )}


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

                            {
                                currentPeriodTitle
                            }

                        </p>


                        <p className="text-xs text-base-content/50">

                            {
                                getPeriodDateLabel(
                                    period,
                                    appliedStartDate,
                                    appliedEndDate
                                )
                            }

                        </p>


                        {period ===
                            "Custom Range" &&
                            customRangeDays && (

                                <p className="mt-1 text-[10px] text-base-content/40">

                                    {customRangeDays}{" "}
                                    {customRangeDays ===
                                    1
                                        ? "day"
                                        : "days"}{" "}
                                    selected

                                </p>

                            )}

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
                        periodSales.length !==
                        1
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
                    description="Net units sold after refunds"
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
                    description="Net revenue from product sales"
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
                    description={
                        period ===
                        "Custom Range"
                            ? "Adjusted for selected range"
                            : "High-performing products"
                    }
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
                        summary.productsWithStock >
                        0
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
                                    summary.productsWithStock >
                                    0
                                        ? `${summary.lowStock} products`
                                        : "Stock data unavailable"
                                }

                            </h2>


                            <p className="mt-1 text-xs text-base-content/50">

                                {
                                    summary.productsWithStock >
                                    0
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
                                value={
                                    search
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Search product..."
                                className="input input-bordered input-sm w-full pl-8 sm:w-64"
                            />

                        </div>


                        <select
                            value={
                                sortBy
                            }
                            onChange={(
                                event
                            ) =>
                                setSortBy(
                                    event
                                        .target
                                        .value
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
                                            period,
                                            customRangeDays
                                        );


                                    const averagePrice =
                                        product.sold >
                                        0
                                            ? product.revenue /
                                              product.sold
                                            : product.price;


                                    return (

                                        <tr
                                            key={
                                                product.id
                                            }
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
                                                        index +
                                                        1
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
                                                    product.stock ===
                                                    null
                                                        ? (

                                                            <span className="text-xs text-base-content/40">
                                                                —
                                                            </span>

                                                        )
                                                        : (

                                                            <span
                                                                className={
                                                                    product.stock <=
                                                                    5
                                                                        ? "font-bold text-error"
                                                                        : product.stock <=
                                                                          10
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


                            {filteredProducts.length ===
                                0 && (

                                <tr>

                                    <td
                                        colSpan="9"
                                        className="py-14 text-center"
                                    >

                                        <FaSearch className="mx-auto text-3xl text-base-content/15" />


                                        <h3 className="mt-3 font-semibold">

                                            {
                                                products.length ===
                                                0
                                                    ? "No product sales in this period"
                                                    : "No matching products"
                                            }

                                        </h3>


                                        <p className="mt-1 text-xs text-base-content/50">

                                            {
                                                products.length ===
                                                0
                                                    ? "Choose another period or make a sale."
                                                    : "Try another product, barcode or category."
                                            }

                                        </p>


                                        {products.length ===
                                            0 && (

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

                        Period:{" "}

                        {
                            currentPeriodTitle
                        }

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
                                    period,
                                    customRangeDays
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
                                    key={
                                        product.id
                                    }
                                    title={
                                        product.name
                                    }
                                    subtitle={
                                        product.category
                                    }
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
                                    period,
                                    customRangeDays
                                ).label ===
                                "Fast Moving"
                        ).length ===
                        0 && (

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
                                product.stock !==
                                    null &&
                                product.stock <=
                                    10
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
                                    key={
                                        product.id
                                    }
                                    title={
                                        product.name
                                    }
                                    subtitle={
                                        product.category
                                    }
                                    value={
                                        formatNumber(
                                            product.stock
                                        )
                                    }
                                    valueLabel="remaining"
                                    danger={
                                        product.stock <=
                                        5
                                    }
                                />

                            )
                        )}


                    {
                        summary.productsWithStock ===
                        0
                            ? (

                                <EmptyInsight
                                    text="No matching current stock information was found."
                                />

                            )
                            : products.filter(
                                (product) =>
                                    product.stock !==
                                        null &&
                                    product.stock <=
                                        10
                            ).length ===
                              0
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

                            Sales figures are calculated from your actual sales records for the selected period. Voided transactions are excluded, refunded quantities are removed from units sold and revenue, and current stock, category, product name and barcode are matched against your live Products database. Custom Range lets you analyze any selected period.

                        </p>

                    </div>

                </div>

            </div>


            {/* ==================================================
                CUSTOM RANGE MODAL
            ================================================== */}

            {showCustomRange && (

                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">


                    {/* BACKDROP */}

                    <button
                        type="button"
                        aria-label="Close custom date range"
                        onClick={
                            handleCancelCustomRange
                        }
                        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                    />


                    {/* MODAL */}

                    <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-2xl">


                        {/* HEADER */}

                        <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">

                            <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">

                                    <FaCalendarDay />

                                </div>


                                <div>

                                    <h2 className="font-bold">

                                        Custom Date Range

                                    </h2>


                                    <p className="text-xs text-base-content/50">

                                        Choose the product sales period you want to analyze.

                                    </p>

                                </div>

                            </div>


                            <button
                                type="button"
                                onClick={
                                    handleCancelCustomRange
                                }
                                className="btn btn-ghost btn-sm btn-square"
                            >

                                <FaTimes />

                            </button>

                        </div>


                        {/* BODY */}

                        <div className="space-y-5 p-5">

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">


                                {/* FROM */}

                                <div>

                                    <label className="mb-2 block text-xs font-semibold text-base-content/60">

                                        From

                                    </label>


                                    <input
                                        type="date"
                                        value={
                                            customStartDate
                                        }
                                        max={
                                            customEndDate ||
                                            undefined
                                        }
                                        onChange={(
                                            event
                                        ) => {

                                            setCustomStartDate(
                                                event
                                                    .target
                                                    .value
                                            );


                                            setDateError(
                                                ""
                                            );

                                        }}
                                        className="input input-bordered w-full"
                                    />

                                </div>


                                {/* TO */}

                                <div>

                                    <label className="mb-2 block text-xs font-semibold text-base-content/60">

                                        To

                                    </label>


                                    <input
                                        type="date"
                                        value={
                                            customEndDate
                                        }
                                        min={
                                            customStartDate ||
                                            undefined
                                        }
                                        onChange={(
                                            event
                                        ) => {

                                            setCustomEndDate(
                                                event
                                                    .target
                                                    .value
                                            );


                                            setDateError(
                                                ""
                                            );

                                        }}
                                        className="input input-bordered w-full"
                                    />

                                </div>

                            </div>


                            {/* RANGE PREVIEW */}

                            {customStartDate &&
                                customEndDate &&
                                customStartDate <=
                                    customEndDate && (

                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">

                                    <div className="flex items-start gap-3">

                                        <FaCalendarDay className="mt-0.5 shrink-0 text-primary" />


                                        <div>

                                            <p className="text-xs text-base-content/50">

                                                Selected Range

                                            </p>


                                            <p className="mt-1 text-sm font-semibold">

                                                {customStartDate ===
                                                customEndDate
                                                    ? formatDate(
                                                        customStartDate
                                                    )
                                                    : `${formatDate(
                                                        customStartDate
                                                    )} - ${formatDate(
                                                        customEndDate
                                                    )}`}

                                            </p>


                                            <p className="mt-2 text-xs text-base-content/50">

                                                {(() => {

                                                    const start =
                                                        parseLocalDateString(
                                                            customStartDate
                                                        );


                                                    const end =
                                                        parseLocalDateString(
                                                            customEndDate
                                                        );


                                                    if (
                                                        !start ||
                                                        !end
                                                    ) {

                                                        return "";

                                                    }


                                                    const totalDays =
                                                        daysBetween(
                                                            start,
                                                            end
                                                        );


                                                    return `${totalDays} ${
                                                        totalDays ===
                                                        1
                                                            ? "day"
                                                            : "days"
                                                    } of product sales will be analyzed.`;

                                                })()}

                                            </p>

                                        </div>

                                    </div>

                                </div>

                            )}


                            {/* ERROR */}

                            {dateError && (

                                <div className="alert alert-error py-3">

                                    <span className="text-sm">

                                        {
                                            dateError
                                        }

                                    </span>

                                </div>

                            )}

                        </div>


                        {/* FOOTER */}

                        <div className="flex items-center justify-end gap-2 border-t border-base-200 px-5 py-4">

                            <button
                                type="button"
                                onClick={
                                    handleCancelCustomRange
                                }
                                className="btn btn-ghost btn-sm"
                            >

                                Cancel

                            </button>


                            <button
                                type="button"
                                onClick={
                                    handleApplyCustomRange
                                }
                                className="btn btn-primary btn-sm"
                            >

                                <FaCheck />

                                Apply Range

                            </button>

                        </div>

                    </div>

                </div>

            )}

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