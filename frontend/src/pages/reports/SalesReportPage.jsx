import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    FaArrowLeft,
    FaChartLine,
    FaReceipt,
    FaMoneyBillWave,
    FaShoppingCart,
    FaPercentage,
    FaUndo,
    FaDownload,
    FaCalendarDay,
    FaClock,
    FaTrophy,
    FaBoxes,
    FaExchangeAlt,
    FaTimes,
    FaCheck,
    FaBuilding,
} from "react-icons/fa";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import useSaleStore from "../../store/sale.store";
import useBranchStore from "../../store/branch.store";


/*
==========================================================
DATE HELPERS
==========================================================
*/

const parseLocalDateString = (
    value
) => {

    if (!value) {
        return null;
    }


    const [
        year,
        month,
        day,
    ] = String(
        value
    )
        .split("-")
        .map(
            Number
        );


    if (
        !year ||
        !month ||
        !day
    ) {
        return null;
    }


    return new Date(
        year,
        month - 1,
        day
    );

};


const getSaleDate = (
    sale
) => {

    const value =
        sale?.createdAt ||
        sale?.saleDate ||
        sale?.date;


    if (!value) {
        return null;
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
        return null;
    }


    return date;

};


const startOfDay = (
    value
) => {

    const date =
        new Date(
            value
        );


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

};


const endOfDay = (
    value
) => {

    const date =
        new Date(
            value
        );


    date.setHours(
        23,
        59,
        59,
        999
    );


    return date;

};


const startOfWeek = (
    value
) => {

    const date =
        startOfDay(
            value
        );


    const day =
        date.getDay();


    /*
    Monday = first day of week.
    */

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


const endOfWeek = (
    value
) => {

    const start =
        startOfWeek(
            value
        );


    const end =
        new Date(
            start
        );


    end.setDate(
        end.getDate() +
        6
    );


    return endOfDay(
        end
    );

};


const startOfMonth = (
    value
) => {

    const date =
        new Date(
            value
        );


    return new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
        0,
        0,
        0,
        0
    );

};


const endOfMonth = (
    value
) => {

    const date =
        new Date(
            value
        );


    return new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
    );

};


const startOfYear = (
    value
) => {

    const date =
        new Date(
            value
        );


    return new Date(
        date.getFullYear(),
        0,
        1,
        0,
        0,
        0,
        0
    );

};


const endOfYear = (
    value
) => {

    const date =
        new Date(
            value
        );


    return new Date(
        date.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999
    );

};


const addDays = (
    value,
    amount
) => {

    const date =
        new Date(
            value
        );


    date.setDate(
        date.getDate() +
        amount
    );


    return date;

};


const addMonths = (
    value,
    amount
) => {

    const date =
        new Date(
            value
        );


    return new Date(
        date.getFullYear(),
        date.getMonth() +
        amount,
        1
    );

};


const daysBetween = (
    start,
    end
) => {

    const first =
        startOfDay(
            start
        );


    const second =
        startOfDay(
            end
        );


    return (
        Math.floor(
            (
                second -
                first
            ) /
            86400000
        ) + 1
    );

};


/*
==========================================================
BRANCH HELPERS
==========================================================
*/

const normalizeId = (
    value
) => {

    if (!value) {
        return "";
    }


    if (
        typeof value ===
        "object"
    ) {

        return String(
            value._id ||
            value.id ||
            ""
        );

    }


    return String(
        value
    );

};


const sanitizeFilePart = (
    value
) => {

    return String(
        value || "branch"
    )
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9-_]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        ) ||
        "branch";

};


/*
==========================================================
SALE CALCULATION HELPERS
==========================================================
*/

const getRemainingQuantity = (
    item
) => {

    const quantity =
        Number(
            item?.quantity ||
            0
        );


    const refundedQuantity =
        Number(
            item?.refundedQuantity ||
            0
        );


    return Math.max(
        quantity -
        refundedQuantity,
        0
    );

};


const getSaleRemainingQuantity = (
    sale
) => {

    if (
        sale?.status ===
        "VOIDED"
    ) {
        return 0;
    }


    if (
        !Array.isArray(
            sale?.items
        )
    ) {
        return 0;
    }


    return sale.items.reduce(
        (
            sum,
            item
        ) =>
            sum +
            getRemainingQuantity(
                item
            ),
        0
    );

};


/*
==========================================================
REFUND AMOUNT
==========================================================
*/

const getSaleRefundAmount = (
    sale
) => {

    const recordedRefund =
        Number(
            sale?.refundAmount
        );


    if (
        Number.isFinite(
            recordedRefund
        ) &&
        recordedRefund >
        0
    ) {
        return recordedRefund;
    }


    if (
        !Array.isArray(
            sale?.items
        )
    ) {
        return 0;
    }


    return sale.items.reduce(
        (
            sum,
            item
        ) => {

            const refundedQuantity =
                Number(
                    item?.refundedQuantity ||
                    0
                );


            const unitPrice =
                Number(
                    item?.unitPrice ||
                    item?.price ||
                    0
                );


            return (
                sum +
                refundedQuantity *
                unitPrice
            );

        },
        0
    );

};


/*
==========================================================
ORIGINAL SALE TOTAL
==========================================================
*/

const getSaleOriginalTotal = (
    sale
) => {

    const total =
        Number(
            sale?.total ??
            sale?.grandTotal ??
            sale?.totalAmount
        );


    if (
        Number.isFinite(
            total
        )
    ) {
        return total;
    }


    if (
        !Array.isArray(
            sale?.items
        )
    ) {
        return 0;
    }


    const subtotal =
        sale.items.reduce(
            (
                sum,
                item
            ) => {

                const quantity =
                    Number(
                        item?.quantity ||
                        0
                    );


                const price =
                    Number(
                        item?.unitPrice ||
                        item?.price ||
                        0
                    );


                return (
                    sum +
                    quantity *
                    price
                );

            },
            0
        );


    const discount =
        Number(
            sale?.discount ||
            0
        );


    return Math.max(
        subtotal -
        discount,
        0
    );

};


/*
==========================================================
NET SALE TOTAL
==========================================================

Matches Sales History semantics:

VOIDED
    = 0

PARTIALLY_REFUNDED
    = remaining quantity × unit price
      minus discount

REFUNDED
    = 0 when all quantities were refunded

COMPLETED
    = normal sale total

Older sales without items:
    falls back to stored total.
==========================================================
*/

const getSaleNetTotal = (
    sale
) => {

    if (
        sale?.status ===
        "VOIDED"
    ) {
        return 0;
    }


    /*
    Compatibility fallback for older
    sales without embedded item data.
    */

    if (
        !Array.isArray(
            sale?.items
        )
    ) {

        if (
            sale?.status ===
            "REFUNDED"
        ) {
            return 0;
        }


        return Number(
            sale?.total ||
            sale?.grandTotal ||
            sale?.totalAmount ||
            0
        );

    }


    const netSubtotal =
        sale.items.reduce(
            (
                sum,
                item
            ) => {

                const remainingQuantity =
                    getRemainingQuantity(
                        item
                    );


                const unitPrice =
                    Number(
                        item?.unitPrice ||
                        item?.price ||
                        0
                    );


                return (
                    sum +
                    remainingQuantity *
                    unitPrice
                );

            },
            0
        );


    const discount =
        Number(
            sale?.discount ||
            sale?.discountAmount ||
            0
        );


    return Math.max(
        netSubtotal -
        discount,
        0
    );

};


const getSaleDiscount = (
    sale
) => {

    if (
        sale?.status ===
        "VOIDED"
    ) {
        return 0;
    }


    return Number(
        sale?.discount ??
        sale?.discountAmount ??
        0
    ) || 0;

};


/*
==========================================================
COUNTED TRANSACTION
==========================================================

Matches Sales History:

COMPLETED
    counted

PARTIALLY_REFUNDED
    counted

REFUNDED
    not counted

VOIDED
    not counted
==========================================================
*/

const isCountedTransaction = (
    sale
) => {

    return (
        sale?.status !==
            "VOIDED" &&
        sale?.status !==
            "REFUNDED"
    );

};


/*
==========================================================
SALES REPORT PAGE
==========================================================
*/

function SalesReportPage() {

    const navigate =
        useNavigate();


    /*
    ======================================================
    REAL SALES STORE
    ======================================================
    */

    const {
        sales,
        loading,
        fetchSales,
    } =
        useSaleStore();


    /*
    ======================================================
    ACTIVE BRANCH
    ======================================================
    */

    const activeBranch =
        useBranchStore(
            (
                state
            ) =>
                state.activeBranch
        );


    const activeBranchId =
        normalizeId(
            activeBranch
        );


    const activeBranchCode =
        String(
            activeBranch?.code ||
            ""
        );


    const activeBranchName =
        String(
            activeBranch?.name ||
            ""
        );


    const activeBranchLabel =
        activeBranchCode &&
        activeBranchName
            ? `${activeBranchCode} — ${activeBranchName}`
            : activeBranchName ||
              activeBranchCode ||
              "Active Branch";


    /*
    ======================================================
    PERIOD STATE
    ======================================================
    */

    const [
        period,
        setPeriod,
    ] = useState(
        "This Week"
    );


    /*
    ======================================================
    CUSTOM RANGE STATE
    ======================================================
    */

    const [
        showCustomRange,
        setShowCustomRange,
    ] = useState(
        false
    );


    const [
        customStartDate,
        setCustomStartDate,
    ] = useState(
        ""
    );


    const [
        customEndDate,
        setCustomEndDate,
    ] = useState(
        ""
    );


    const [
        appliedStartDate,
        setAppliedStartDate,
    ] = useState(
        ""
    );


    const [
        appliedEndDate,
        setAppliedEndDate,
    ] = useState(
        ""
    );


    const [
        dateError,
        setDateError,
    ] = useState(
        ""
    );


    /*
    ======================================================
    LOAD REAL SALES
    ======================================================

    activeBranchId is intentionally included.

    When the Navbar changes branch:

        MAIN -> BR02

    this report immediately fetches the sales
    for the newly active branch.

    api.js provides X-Branch-Id.
    ======================================================
    */

    useEffect(
        () => {

            if (
                !activeBranchId
            ) {
                return;
            }


            fetchSales();

        },
        [
            fetchSales,
            activeBranchId,
        ]
    );


    /*
    ======================================================
    FORMAT CURRENCY
    ======================================================
    */

    const formatCurrency = (
        value
    ) => {

        const number =
            Number(
                value
            ) ||
            0;


        return `₱${number.toLocaleString(
            "en-PH",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2,
            }
        )}`;

    };


    /*
    ======================================================
    FORMAT DATE
    ======================================================
    */

    const formatDate = (
        dateString
    ) => {

        const date =
            parseLocalDateString(
                dateString
            );


        if (!date) {
            return "";
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


    /*
    ======================================================
    CUSTOM RANGE LABEL
    ======================================================
    */

    const customRangeLabel =
        appliedStartDate &&
        appliedEndDate
            ? appliedStartDate ===
              appliedEndDate
                ? formatDate(
                    appliedStartDate
                )
                : `${formatDate(
                    appliedStartDate
                )} – ${formatDate(
                    appliedEndDate
                )}`
            : "Custom Range";


    /*
    ======================================================
    CURRENT PERIOD TITLE
    ======================================================
    */

    const currentPeriodTitle =
        period ===
        "Custom Range"
            ? customRangeLabel
            : period;


    /*
    ======================================================
    SELECT DATE RANGE
    ======================================================
    */

    const selectedDateRange =
        useMemo(
            () => {

                const now =
                    new Date();


                if (
                    period ===
                    "Today"
                ) {

                    return {

                        start:
                            startOfDay(
                                now
                            ),

                        end:
                            endOfDay(
                                now
                            ),

                    };

                }


                if (
                    period ===
                    "Yesterday"
                ) {

                    const yesterday =
                        addDays(
                            now,
                            -1
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
                    period ===
                    "This Week"
                ) {

                    return {

                        start:
                            startOfWeek(
                                now
                            ),

                        end:
                            endOfWeek(
                                now
                            ),

                    };

                }


                if (
                    period ===
                    "This Month"
                ) {

                    return {

                        start:
                            startOfMonth(
                                now
                            ),

                        end:
                            endOfMonth(
                                now
                            ),

                    };

                }


                if (
                    period ===
                    "This Year"
                ) {

                    return {

                        start:
                            startOfYear(
                                now
                            ),

                        end:
                            endOfYear(
                                now
                            ),

                    };

                }


                if (
                    period ===
                        "Custom Range" &&
                    appliedStartDate &&
                    appliedEndDate
                ) {

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


                    return {

                        start:
                            startOfDay(
                                start
                            ),

                        end:
                            endOfDay(
                                end
                            ),

                    };

                }


                return null;

            },
            [
                period,
                appliedStartDate,
                appliedEndDate,
            ]
        );


    /*
    ======================================================
    FILTER REAL SALES
    ======================================================
    */

    const filteredSales =
        useMemo(
            () => {

                if (
                    !Array.isArray(
                        sales
                    ) ||
                    !selectedDateRange
                ) {
                    return [];
                }


                return sales.filter(
                    (
                        sale
                    ) => {

                        const saleDate =
                            getSaleDate(
                                sale
                            );


                        if (!saleDate) {
                            return false;
                        }


                        return (
                            saleDate >=
                                selectedDateRange
                                    .start &&
                            saleDate <=
                                selectedDateRange
                                    .end
                        );

                    }
                );

            },
            [
                sales,
                selectedDateRange,
            ]
        );


    /*
    ======================================================
    CUSTOM GRAPH GRANULARITY
    ======================================================

    Single day:
        Hourly

    2 - 31 days:
        Daily

    32 - 180 days:
        Weekly

    181 - 730 days:
        Monthly

    More than 730 days:
        Yearly
    ======================================================
    */

    const customGranularity =
        useMemo(
            () => {

                if (
                    period !==
                        "Custom Range" ||
                    !selectedDateRange
                ) {
                    return null;
                }


                const totalDays =
                    daysBetween(
                        selectedDateRange
                            .start,
                        selectedDateRange
                            .end
                    );


                if (
                    totalDays ===
                    1
                ) {
                    return "hour";
                }


                if (
                    totalDays <=
                    31
                ) {
                    return "day";
                }


                if (
                    totalDays <=
                    180
                ) {
                    return "week";
                }


                if (
                    totalDays <=
                    730
                ) {
                    return "month";
                }


                return "year";

            },
            [
                period,
                selectedDateRange,
            ]
        );


    /*
    ======================================================
    GRAPH GRANULARITY
    ======================================================
    */

    const graphGranularity =
        period ===
            "Today" ||
        period ===
            "Yesterday"
            ? "hour"

            : period ===
              "This Week"
                ? "week-day"

                : period ===
                  "This Month"
                    ? "day"

                    : period ===
                      "This Year"
                        ? "month"

                        : customGranularity;


    /*
    ======================================================
    CREATE HOURLY GRAPH DATA
    ======================================================
    */

    const createHourlyData =
        (
            salesData
        ) => {

            const buckets =
                Array.from(
                    {
                        length:
                            24,
                    },
                    (
                        _,
                        hour
                    ) => {

                        const label =
                            new Date(
                                2000,
                                0,
                                1,
                                hour
                            )
                                .toLocaleTimeString(
                                    "en-PH",
                                    {
                                        hour:
                                            "numeric",

                                        hour12:
                                            true,
                                    }
                                );


                        return {

                            label,

                            hour,

                            sales:
                                0,

                            transactions:
                                0,

                        };

                    }
                );


            salesData.forEach(
                (
                    sale
                ) => {

                    const saleDate =
                        getSaleDate(
                            sale
                        );


                    if (!saleDate) {
                        return;
                    }


                    const hour =
                        saleDate.getHours();


                    buckets[
                        hour
                    ].sales +=
                        getSaleNetTotal(
                            sale
                        );


                    if (
                        isCountedTransaction(
                            sale
                        )
                    ) {

                        buckets[
                            hour
                        ].transactions +=
                            1;

                    }

                }
            );


            return buckets.map(
                ({
                    hour,
                    ...item
                }) =>
                    item
            );

        };


    /*
    ======================================================
    CREATE WEEK DATA
    ======================================================

    Always shows:
    Mon Tue Wed Thu Fri Sat Sun
    ======================================================
    */

    const createWeekDayData =
        (
            salesData,
            rangeStart
        ) => {

            const buckets =
                [];


            for (
                let index =
                    0;

                index <
                7;

                index++
            ) {

                const date =
                    addDays(
                        rangeStart,
                        index
                    );


                buckets.push({

                    date:
                        startOfDay(
                            date
                        ),

                    label:
                        date
                            .toLocaleDateString(
                                "en-PH",
                                {
                                    weekday:
                                        "short",
                                }
                            ),

                    sales:
                        0,

                    transactions:
                        0,

                });

            }


            salesData.forEach(
                (
                    sale
                ) => {

                    const saleDate =
                        getSaleDate(
                            sale
                        );


                    if (!saleDate) {
                        return;
                    }


                    const index =
                        daysBetween(
                            rangeStart,
                            saleDate
                        ) -
                        1;


                    if (
                        index <
                            0 ||
                        index >=
                            7
                    ) {
                        return;
                    }


                    buckets[
                        index
                    ].sales +=
                        getSaleNetTotal(
                            sale
                        );


                    if (
                        isCountedTransaction(
                            sale
                        )
                    ) {

                        buckets[
                            index
                        ].transactions +=
                            1;

                    }

                }
            );


            return buckets.map(
                ({
                    date,
                    ...item
                }) =>
                    item
            );

        };


    /*
    ======================================================
    CREATE DAILY GRAPH DATA
    ======================================================
    */

    const createDailyData =
        (
            salesData,
            rangeStart,
            rangeEnd
        ) => {

            const buckets =
                [];


            const bucketMap =
                new Map();


            let cursor =
                startOfDay(
                    rangeStart
                );


            const finish =
                startOfDay(
                    rangeEnd
                );


            while (
                cursor <=
                finish
            ) {

                const key =
                    `${cursor.getFullYear()}-${String(
                        cursor.getMonth() +
                        1
                    ).padStart(
                        2,
                        "0"
                    )}-${String(
                        cursor.getDate()
                    ).padStart(
                        2,
                        "0"
                    )}`;


                const bucket = {

                    key,

                    label:
                        cursor
                            .toLocaleDateString(
                                "en-PH",
                                {
                                    month:
                                        "short",

                                    day:
                                        "numeric",
                                }
                            ),

                    sales:
                        0,

                    transactions:
                        0,

                };


                bucketMap.set(
                    key,
                    bucket
                );


                buckets.push(
                    bucket
                );


                cursor =
                    addDays(
                        cursor,
                        1
                    );

            }


            salesData.forEach(
                (
                    sale
                ) => {

                    const saleDate =
                        getSaleDate(
                            sale
                        );


                    if (!saleDate) {
                        return;
                    }


                    const key =
                        `${saleDate.getFullYear()}-${String(
                            saleDate.getMonth() +
                            1
                        ).padStart(
                            2,
                            "0"
                        )}-${String(
                            saleDate.getDate()
                        ).padStart(
                            2,
                            "0"
                        )}`;


                    const bucket =
                        bucketMap.get(
                            key
                        );


                    if (!bucket) {
                        return;
                    }


                    bucket.sales +=
                        getSaleNetTotal(
                            sale
                        );


                    if (
                        isCountedTransaction(
                            sale
                        )
                    ) {

                        bucket.transactions +=
                            1;

                    }

                }
            );


            return buckets.map(
                ({
                    key,
                    ...item
                }) =>
                    item
            );

        };


    /*
    ======================================================
    CREATE WEEKLY CUSTOM DATA
    ======================================================

    Custom ranges between 32 and 180 days
    are grouped into 7-day blocks.
    ======================================================
    */

    const createWeeklyData =
        (
            salesData,
            rangeStart,
            rangeEnd
        ) => {

            const buckets =
                [];


            let cursor =
                startOfDay(
                    rangeStart
                );


            const finish =
                startOfDay(
                    rangeEnd
                );


            while (
                cursor <=
                finish
            ) {

                const bucketStart =
                    new Date(
                        cursor
                    );


                let bucketEnd =
                    addDays(
                        bucketStart,
                        6
                    );


                if (
                    bucketEnd >
                    finish
                ) {

                    bucketEnd =
                        new Date(
                            finish
                        );

                }


                buckets.push({

                    start:
                        startOfDay(
                            bucketStart
                        ),

                    end:
                        endOfDay(
                            bucketEnd
                        ),

                    label:
                        `${bucketStart.toLocaleDateString(
                            "en-PH",
                            {
                                month:
                                    "short",

                                day:
                                    "numeric",
                            }
                        )} – ${bucketEnd.toLocaleDateString(
                            "en-PH",
                            {
                                month:
                                    "short",

                                day:
                                    "numeric",
                            }
                        )}`,

                    sales:
                        0,

                    transactions:
                        0,

                });


                cursor =
                    addDays(
                        bucketEnd,
                        1
                    );

            }


            salesData.forEach(
                (
                    sale
                ) => {

                    const saleDate =
                        getSaleDate(
                            sale
                        );


                    if (!saleDate) {
                        return;
                    }


                    const bucket =
                        buckets.find(
                            (
                                item
                            ) =>
                                saleDate >=
                                    item.start &&
                                saleDate <=
                                    item.end
                        );


                    if (!bucket) {
                        return;
                    }


                    bucket.sales +=
                        getSaleNetTotal(
                            sale
                        );


                    if (
                        isCountedTransaction(
                            sale
                        )
                    ) {

                        bucket.transactions +=
                            1;

                    }

                }
            );


            return buckets.map(
                ({
                    start,
                    end,
                    ...item
                }) =>
                    item
            );

        };


    /*
    ======================================================
    CREATE MONTHLY GRAPH DATA
    ======================================================
    */

    const createMonthlyData =
        (
            salesData,
            rangeStart,
            rangeEnd
        ) => {

            const buckets =
                [];


            const bucketMap =
                new Map();


            let cursor =
                new Date(
                    rangeStart.getFullYear(),
                    rangeStart.getMonth(),
                    1
                );


            const finish =
                new Date(
                    rangeEnd.getFullYear(),
                    rangeEnd.getMonth(),
                    1
                );


            while (
                cursor <=
                finish
            ) {

                const key =
                    `${cursor.getFullYear()}-${cursor.getMonth()}`;


                const showYear =
                    rangeStart.getFullYear() !==
                    rangeEnd.getFullYear();


                const bucket = {

                    key,

                    label:
                        cursor
                            .toLocaleDateString(
                                "en-PH",
                                {
                                    month:
                                        "short",

                                    ...(showYear
                                        ? {
                                              year:
                                                  "numeric",
                                          }
                                        : {}),
                                }
                            ),

                    sales:
                        0,

                    transactions:
                        0,

                };


                bucketMap.set(
                    key,
                    bucket
                );


                buckets.push(
                    bucket
                );


                cursor =
                    addMonths(
                        cursor,
                        1
                    );

            }


            salesData.forEach(
                (
                    sale
                ) => {

                    const saleDate =
                        getSaleDate(
                            sale
                        );


                    if (!saleDate) {
                        return;
                    }


                    const key =
                        `${saleDate.getFullYear()}-${saleDate.getMonth()}`;


                    const bucket =
                        bucketMap.get(
                            key
                        );


                    if (!bucket) {
                        return;
                    }


                    bucket.sales +=
                        getSaleNetTotal(
                            sale
                        );


                    if (
                        isCountedTransaction(
                            sale
                        )
                    ) {

                        bucket.transactions +=
                            1;

                    }

                }
            );


            return buckets.map(
                ({
                    key,
                    ...item
                }) =>
                    item
            );

        };


    /*
    ======================================================
    CREATE YEARLY GRAPH DATA
    ======================================================
    */

    const createYearlyData =
        (
            salesData,
            rangeStart,
            rangeEnd
        ) => {

            const buckets =
                [];


            const bucketMap =
                new Map();


            for (
                let year =
                    rangeStart.getFullYear();

                year <=
                    rangeEnd.getFullYear();

                year++
            ) {

                const bucket = {

                    year,

                    label:
                        String(
                            year
                        ),

                    sales:
                        0,

                    transactions:
                        0,

                };


                bucketMap.set(
                    year,
                    bucket
                );


                buckets.push(
                    bucket
                );

            }


            salesData.forEach(
                (
                    sale
                ) => {

                    const saleDate =
                        getSaleDate(
                            sale
                        );


                    if (!saleDate) {
                        return;
                    }


                    const year =
                        saleDate.getFullYear();


                    const bucket =
                        bucketMap.get(
                            year
                        );


                    if (!bucket) {
                        return;
                    }


                    bucket.sales +=
                        getSaleNetTotal(
                            sale
                        );


                    if (
                        isCountedTransaction(
                            sale
                        )
                    ) {

                        bucket.transactions +=
                            1;

                    }

                }
            );


            return buckets.map(
                ({
                    year,
                    ...item
                }) =>
                    item
            );

        };


    /*
    ======================================================
    CURRENT GRAPH DATA
    ======================================================
    */

    const currentData =
        useMemo(
            () => {

                if (
                    !selectedDateRange
                ) {
                    return [];
                }


                if (
                    graphGranularity ===
                    "hour"
                ) {

                    return createHourlyData(
                        filteredSales
                    );

                }


                if (
                    graphGranularity ===
                    "week-day"
                ) {

                    return createWeekDayData(
                        filteredSales,
                        selectedDateRange
                            .start
                    );

                }


                if (
                    graphGranularity ===
                    "day"
                ) {

                    return createDailyData(
                        filteredSales,
                        selectedDateRange
                            .start,
                        selectedDateRange
                            .end
                    );

                }


                if (
                    graphGranularity ===
                    "week"
                ) {

                    return createWeeklyData(
                        filteredSales,
                        selectedDateRange
                            .start,
                        selectedDateRange
                            .end
                    );

                }


                if (
                    graphGranularity ===
                    "month"
                ) {

                    return createMonthlyData(
                        filteredSales,
                        selectedDateRange
                            .start,
                        selectedDateRange
                            .end
                    );

                }


                if (
                    graphGranularity ===
                    "year"
                ) {

                    return createYearlyData(
                        filteredSales,
                        selectedDateRange
                            .start,
                        selectedDateRange
                            .end
                    );

                }


                return [];

            },
            [
                filteredSales,
                selectedDateRange,
                graphGranularity,
            ]
        );


    /*
    ======================================================
    SUMMARY CALCULATIONS
    ======================================================
    */

    const summary =
        useMemo(
            () => {

                const totalSales =
                    currentData.reduce(
                        (
                            sum,
                            item
                        ) =>
                            sum +
                            Number(
                                item.sales ||
                                0
                            ),
                        0
                    );


                const transactions =
                    currentData.reduce(
                        (
                            sum,
                            item
                        ) =>
                            sum +
                            Number(
                                item.transactions ||
                                0
                            ),
                        0
                    );


                const averageSale =
                    transactions >
                    0
                        ? totalSales /
                          transactions
                        : 0;


                let bestPeriod =
                    null;


                currentData.forEach(
                    (
                        item
                    ) => {

                        if (
                            !bestPeriod ||
                            Number(
                                item.sales
                            ) >
                                Number(
                                    bestPeriod.sales
                                )
                        ) {

                            bestPeriod =
                                item;

                        }

                    }
                );


                if (
                    !bestPeriod ||
                    Number(
                        bestPeriod.sales
                    ) <=
                        0
                ) {

                    bestPeriod =
                        null;

                }


                return {

                    totalSales,

                    transactions,

                    averageSale,

                    bestPeriod,

                };

            },
            [
                currentData,
            ]
        );


    /*
    ======================================================
    ITEMS SOLD
    ======================================================
    */

    const itemsSold =
        useMemo(
            () => {

                return filteredSales.reduce(
                    (
                        sum,
                        sale
                    ) =>
                        sum +
                        getSaleRemainingQuantity(
                            sale
                        ),
                    0
                );

            },
            [
                filteredSales,
            ]
        );


    /*
    ======================================================
    DISCOUNTS
    ======================================================
    */

    const discounts =
        useMemo(
            () => {

                return filteredSales.reduce(
                    (
                        sum,
                        sale
                    ) =>
                        sum +
                        getSaleDiscount(
                            sale
                        ),
                    0
                );

            },
            [
                filteredSales,
            ]
        );


    /*
    ======================================================
    REFUNDS
    ======================================================
    */

    const refunds =
        useMemo(
            () => {

                return filteredSales.reduce(
                    (
                        sum,
                        sale
                    ) =>
                        sum +
                        getSaleRefundAmount(
                            sale
                        ),
                    0
                );

            },
            [
                filteredSales,
            ]
        );


    /*
    ======================================================
    VOID AMOUNT
    ======================================================
    */

    const voidAmount =
        useMemo(
            () => {

                return filteredSales.reduce(
                    (
                        sum,
                        sale
                    ) => {

                        if (
                            sale?.status !==
                            "VOIDED"
                        ) {
                            return sum;
                        }


                        return (
                            sum +
                            getSaleOriginalTotal(
                                sale
                            )
                        );

                    },
                    0
                );

            },
            [
                filteredSales,
            ]
        );


    /*
    ======================================================
    AVERAGE ITEMS / SALE
    ======================================================
    */

    const averageItemsPerSale =
        summary.transactions >
        0
            ? itemsSold /
              summary.transactions
            : 0;


    /*
    ======================================================
    PERIOD DESCRIPTION
    ======================================================
    */

    const periodDescription = {

        Today:
            "Hourly sales performance for today.",

        Yesterday:
            "Hourly sales performance from yesterday.",

        "This Week":
            "Daily sales performance for the current week.",

        "This Month":
            "Daily sales performance for the current month.",

        "This Year":
            "Monthly sales performance for the current year.",

        "Custom Range":
            appliedStartDate ===
            appliedEndDate
                ? "Hourly sales performance for the selected date."
                : graphGranularity ===
                  "day"
                    ? "Daily sales performance for the selected date range."
                    : graphGranularity ===
                      "week"
                        ? "Weekly sales performance for the selected date range."
                        : graphGranularity ===
                          "month"
                            ? "Monthly sales performance for the selected date range."
                            : "Yearly sales performance for the selected date range.",

    };


    const currentPeriodDescription =
        periodDescription[
            period
        ] ||
        "Sales performance for the selected period.";


    /*
    ======================================================
    BEST PERIOD TYPE
    ======================================================
    */

    const bestPeriodType =
        graphGranularity ===
            "hour"
            ? "Best Hour"

            : graphGranularity ===
              "month"
                ? "Best Month"

                : graphGranularity ===
                  "year"
                    ? "Best Year"

                    : graphGranularity ===
                      "week"
                        ? "Best Week"

                        : "Best Day";


    /*
    ======================================================
    GRAPH LABEL
    ======================================================
    */

    const graphPeriodLabel =
        graphGranularity ===
            "hour"
            ? "Hourly"

            : graphGranularity ===
              "week-day"
                ? "Daily"

                : graphGranularity ===
                  "day"
                    ? "Daily"

                    : graphGranularity ===
                      "week"
                        ? "Weekly"

                        : graphGranularity ===
                          "month"
                            ? "Monthly"

                            : graphGranularity ===
                              "year"
                                ? "Yearly"

                                : "Sales";


    /*
    ======================================================
    CHART COLOR
    ======================================================
    */

    const chartColor =
        "#4f46e5";


    /*
    ======================================================
    TOOLTIP
    ======================================================
    */

    const CustomTooltip = ({
        active,
        payload,
        label,
    }) => {

        if (
            !active ||
            !payload ||
            payload.length ===
                0
        ) {
            return null;
        }


        const data =
            payload[0]
                ?.payload;


        return (

            <div className="min-w-[180px] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl">

                <p className="mb-2 text-xs text-base-content/50">

                    {label}

                </p>


                <div className="flex items-center justify-between gap-5">

                    <div className="flex items-center gap-2">

                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                                backgroundColor:
                                    chartColor,
                            }}
                        />


                        <span className="text-xs">
                            Sales
                        </span>

                    </div>


                    <span className="text-sm font-bold">

                        {formatCurrency(
                            data?.sales ||
                            0
                        )}

                    </span>

                </div>


                <div className="mt-2 flex items-center justify-between">

                    <span className="text-xs text-base-content/50">
                        Transactions
                    </span>


                    <span className="text-xs font-semibold">

                        {
                            data?.transactions ||
                            0
                        }

                    </span>

                </div>

            </div>

        );

    };


    /*
    ======================================================
    HANDLE PERIOD CHANGE
    ======================================================
    */

    const handlePeriodChange =
        (
            event
        ) => {

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
    ======================================================
    HANDLE CUSTOM RANGE OPEN
    ======================================================
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
    ======================================================
    HANDLE CUSTOM RANGE APPLY
    ======================================================
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
    ======================================================
    HANDLE CUSTOM RANGE CANCEL
    ======================================================
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
    ======================================================
    HANDLE EXPORT
    ======================================================

    Export is branch-specific.

    The CSV includes branch identity and
    the filename contains the branch code.
    ======================================================
    */

    const handleExport =
        () => {

            const rows = [

                [
                    "Sales Report",
                ],

                [
                    "Branch",
                    activeBranchLabel,
                ],

                [
                    "Report Period",
                    currentPeriodTitle,
                ],

                [],

                [
                    "Period",
                    "Transactions",
                    "Sales",
                    "Average Sale",
                ],

            ];


            currentData.forEach(
                (
                    item
                ) => {

                    const average =
                        item.transactions >
                        0
                            ? item.sales /
                              item.transactions
                            : 0;


                    rows.push([

                        item.label,

                        item.transactions,

                        Number(
                            item.sales
                        ).toFixed(
                            2
                        ),

                        Number(
                            average
                        ).toFixed(
                            2
                        ),

                    ]);

                }
            );


            rows.push(
                []
            );


            rows.push([
                "Total Sales",
                summary.totalSales.toFixed(
                    2
                ),
            ]);


            rows.push([
                "Transactions",
                summary.transactions,
            ]);


            rows.push([
                "Items Sold",
                itemsSold,
            ]);


            rows.push([
                "Average Sale",
                summary.averageSale.toFixed(
                    2
                ),
            ]);


            rows.push([
                "Discounts",
                discounts.toFixed(
                    2
                ),
            ]);


            rows.push([
                "Refunds",
                refunds.toFixed(
                    2
                ),
            ]);


            rows.push([
                "Voids",
                voidAmount.toFixed(
                    2
                ),
            ]);


            const csv =
                rows
                    .map(
                        (
                            row
                        ) =>
                            row
                                .map(
                                    (
                                        value
                                    ) =>
                                        `"${String(
                                            value ??
                                            ""
                                        ).replaceAll(
                                            '"',
                                            '""'
                                        )}"`
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


            const branchPart =
                sanitizeFilePart(
                    activeBranchCode ||
                    activeBranchName
                );


            const periodPart =
                sanitizeFilePart(
                    period ===
                        "Custom Range"
                        ? currentPeriodTitle
                        : period
                );


            link.href =
                url;


            link.download =
                `sales-report-${branchPart}-${periodPart}-${new Date()
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
    ======================================================
    HANDLE BACK
    ======================================================
    */

    const handleBack =
        () => {

            navigate(
                "/reports"
            );

        };


    /*
    ======================================================
    LOADING
    ======================================================
    */

    if (
        loading
    ) {

        return (

            <div className="flex min-h-[60vh] items-center justify-center">

                <span className="loading loading-spinner loading-lg text-primary" />

            </div>

        );

    }


    /*
    ======================================================
    RENDER
    ======================================================
    */

    return (

        <div className="space-y-6 pb-6">


            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>

                    <button
                        type="button"
                        onClick={
                            handleBack
                        }
                        className="mb-2 flex items-center gap-2 text-sm text-base-content/50 transition hover:text-primary"
                    >

                        <FaArrowLeft />

                        <span>
                            Back to Reports
                        </span>

                    </button>


                    <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">

                            <FaChartLine />

                        </div>


                        <div>

                            <h1 className="text-2xl font-bold">
                                Sales Report
                            </h1>


                            <p className="text-sm text-base-content/60">

                                Monitor sales performance,
                                revenue, and transactions.

                            </p>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    CONTROLS
                ================================================== */}

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

                        <option value="Today">
                            Today
                        </option>


                        <option value="Yesterday">
                            Yesterday
                        </option>


                        <option value="This Week">
                            This Week
                        </option>


                        <option value="This Month">
                            This Month
                        </option>


                        <option value="This Year">
                            This Year
                        </option>


                        <option value="Custom Range">
                            Custom Range...
                        </option>

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
                        onClick={
                            handleExport
                        }
                        className="btn btn-outline btn-sm"
                    >

                        <FaDownload />

                        <span>
                            Export
                        </span>

                    </button>

                </div>

            </div>


            {/* ==================================================
                ACTIVE BRANCH
            ================================================== */}

            <div className="flex items-center gap-3 rounded-xl border border-info/20 bg-info/5 px-4 py-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">

                    <FaBuilding />

                </div>


                <div>

                    <p className="text-xs text-base-content/50">
                        Active Branch
                    </p>


                    <p className="text-sm font-semibold">

                        {
                            activeBranchLabel
                        }

                    </p>

                </div>

            </div>


            {/* ==================================================
                CURRENT PERIOD INDICATOR
            ================================================== */}

            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">

                    {graphGranularity ===
                    "hour" ? (

                        <FaClock />

                    ) : (

                        <FaCalendarDay />

                    )}

                </div>


                <div>

                    <p className="text-sm font-semibold">

                        {
                            currentPeriodTitle
                        }

                    </p>


                    <p className="text-xs text-base-content/50">

                        {
                            currentPeriodDescription
                        }

                    </p>

                </div>

            </div>


            {/* ==================================================
                SUMMARY CARDS
            ================================================== */}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">


                {/* TOTAL SALES */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Total Sales
                        </span>


                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">

                            <FaMoneyBillWave />

                        </div>

                    </div>


                    <p className="mt-3 text-xl font-bold">

                        {formatCurrency(
                            summary.totalSales
                        )}

                    </p>


                    <p className="mt-1 text-[10px] text-success">
                        Net sales revenue
                    </p>

                </div>


                {/* TRANSACTIONS */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Transactions
                        </span>


                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">

                            <FaReceipt />

                        </div>

                    </div>


                    <p className="mt-3 text-xl font-bold">

                        {
                            summary.transactions
                                .toLocaleString()
                        }

                    </p>


                    <p className="mt-1 text-[10px] text-base-content/50">
                        Completed and partial-refund transactions
                    </p>

                </div>


                {/* ITEMS SOLD */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Items Sold
                        </span>


                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">

                            <FaShoppingCart />

                        </div>

                    </div>


                    <p className="mt-3 text-xl font-bold">

                        {
                            itemsSold
                                .toLocaleString()
                        }

                    </p>


                    <p className="mt-1 text-[10px] text-base-content/50">
                        Net quantity after refunds
                    </p>

                </div>


                {/* AVERAGE SALE */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Average Sale
                        </span>


                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">

                            <FaChartLine />

                        </div>

                    </div>


                    <p className="mt-3 text-xl font-bold">

                        {formatCurrency(
                            summary.averageSale
                        )}

                    </p>


                    <p className="mt-1 text-[10px] text-base-content/50">
                        Average counted transaction value
                    </p>

                </div>

            </div>


            {/* ==================================================
                SECONDARY SUMMARY
            ================================================== */}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">


                {/* DISCOUNTS */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">

                            <FaPercentage />

                        </div>


                        <div>

                            <p className="text-xs text-base-content/50">
                                Discounts
                            </p>


                            <p className="font-bold">

                                {formatCurrency(
                                    discounts
                                )}

                            </p>

                        </div>

                    </div>

                </div>


                {/* REFUNDS */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error/10 text-error">

                            <FaUndo />

                        </div>


                        <div>

                            <p className="text-xs text-base-content/50">
                                Refunds
                            </p>


                            <p className="font-bold">

                                {formatCurrency(
                                    refunds
                                )}

                            </p>

                        </div>

                    </div>

                </div>


                {/* VOIDS */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-200 text-base-content/60">

                            <FaExchangeAlt />

                        </div>


                        <div>

                            <p className="text-xs text-base-content/50">
                                Voids
                            </p>


                            <p className="font-bold">

                                {formatCurrency(
                                    voidAmount
                                )}

                            </p>

                        </div>

                    </div>

                </div>


                {/* ITEMS PER SALE */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">

                            <FaBoxes />

                        </div>


                        <div>

                            <p className="text-xs text-base-content/50">
                                Items / Sale
                            </p>


                            <p className="font-bold">

                                {averageItemsPerSale.toFixed(
                                    2
                                )}

                            </p>

                        </div>

                    </div>

                </div>

            </div>


            {/* ==================================================
                SALES GRAPH
            ================================================== */}

            <div className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">


                {/* GRAPH HEADER */}

                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                        <h2 className="text-base font-bold">
                            Sales Revenue
                        </h2>


                        <p className="mt-1 text-xs text-base-content/50">

                            {
                                graphPeriodLabel
                            }{" "}

                            breakdown.{" "}

                            {
                                currentPeriodDescription
                            }

                        </p>

                    </div>


                    <div className="flex items-center gap-2 text-xs text-base-content/60">

                        <span
                            className="h-3 w-3 rounded-full"
                            style={{
                                backgroundColor:
                                    chartColor,
                            }}
                        />


                        <span>
                            Sales Revenue
                        </span>

                    </div>

                </div>


                {/* CHART */}

                {summary.totalSales >
                    0 ||
                summary.transactions >
                    0 ? (

                    <div className="h-80 w-full">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <BarChart
                                data={
                                    currentData
                                }
                                margin={{
                                    top:
                                        10,

                                    right:
                                        10,

                                    left:
                                        0,

                                    bottom:
                                        5,
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={
                                        false
                                    }
                                    opacity={
                                        0.2
                                    }
                                />


                                <XAxis
                                    dataKey="label"
                                    tick={{
                                        fontSize:
                                            11,
                                    }}
                                    tickLine={
                                        false
                                    }
                                    axisLine={
                                        false
                                    }
                                    interval={
                                        graphGranularity ===
                                            "hour"
                                            ? 1
                                            : graphGranularity ===
                                                  "day" &&
                                              currentData.length >
                                                  20
                                                ? 1
                                                : 0
                                    }
                                    minTickGap={
                                        10
                                    }
                                />


                                <YAxis
                                    tick={{
                                        fontSize:
                                            11,
                                    }}
                                    tickLine={
                                        false
                                    }
                                    axisLine={
                                        false
                                    }
                                    tickFormatter={(
                                        value
                                    ) => {

                                        if (
                                            Number(
                                                value
                                            ) >=
                                            1000000
                                        ) {

                                            return `₱${(
                                                Number(
                                                    value
                                                ) /
                                                1000000
                                            ).toFixed(
                                                1
                                            )}M`;

                                        }


                                        if (
                                            Number(
                                                value
                                            ) >=
                                            1000
                                        ) {

                                            return `₱${(
                                                Number(
                                                    value
                                                ) /
                                                1000
                                            ).toFixed(
                                                0
                                            )}k`;

                                        }


                                        return `₱${value}`;

                                    }}
                                />


                                <Tooltip
                                    content={
                                        <CustomTooltip />
                                    }
                                />


                                <Bar
                                    dataKey="sales"
                                    fill={
                                        chartColor
                                    }
                                    radius={[
                                        5,
                                        5,
                                        0,
                                        0,
                                    ]}
                                    maxBarSize={
                                        42
                                    }
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                ) : (

                    <div className="flex h-80 flex-col items-center justify-center px-4 text-center">

                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-base-200 text-base-content/40">

                            <FaChartLine className="text-xl" />

                        </div>


                        <p className="font-semibold">
                            No sales found
                        </p>


                        <p className="mt-2 max-w-md text-xs text-base-content/50">

                            There are no sales
                            records for{" "}
                            {
                                currentPeriodTitle
                            }{" "}
                            in{" "}
                            {
                                activeBranchLabel
                            }.

                        </p>

                    </div>

                )}

            </div>


            {/* ==================================================
                SALES HIGHLIGHTS
            ================================================== */}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">


                {/* BEST PERIOD */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">

                                {
                                    bestPeriodType
                                }

                            </p>


                            <p className="mt-2 text-xl font-bold">

                                {
                                    summary.bestPeriod
                                        ?.label ||
                                    "-"
                                }

                            </p>

                        </div>


                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">

                            <FaTrophy />

                        </div>

                    </div>


                    <p className="mt-3 text-sm font-semibold text-success">

                        {formatCurrency(
                            summary.bestPeriod
                                ?.sales ||
                            0
                        )}

                    </p>


                    <p className="mt-1 text-xs text-base-content/50">
                        Highest sales during this period
                    </p>

                </div>


                {/* BEST PERIOD TRANSACTIONS */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">

                                Transactions During Best Period

                            </p>


                            <p className="mt-2 text-xl font-bold">

                                {
                                    summary.bestPeriod
                                        ?.transactions ||
                                    0
                                }

                            </p>

                        </div>


                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">

                            <FaReceipt />

                        </div>

                    </div>


                    <p className="mt-3 text-xs text-base-content/50">

                        {
                            summary.bestPeriod
                                ?.label ||
                            "-"
                        }

                    </p>

                </div>


                {/* AVERAGE ITEMS */}

                <div className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">
                                Average Items / Sale
                            </p>


                            <p className="mt-2 text-xl font-bold">

                                {averageItemsPerSale.toFixed(
                                    2
                                )}

                            </p>

                        </div>


                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info">

                            <FaBoxes />

                        </div>

                    </div>


                    <p className="mt-3 text-xs text-base-content/50">
                        Average net quantity per counted transaction
                    </p>

                </div>

            </div>


            {/* ==================================================
                SALES BREAKDOWN
            ================================================== */}

            <div className="overflow-hidden rounded-xl border border-base-200 bg-base-100 shadow-sm">


                <div className="flex flex-col gap-2 border-b border-base-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                        <h2 className="text-base font-bold">
                            Sales Breakdown
                        </h2>


                        <p className="mt-1 text-xs text-base-content/50">

                            {
                                graphPeriodLabel
                            }{" "}

                            sales performance for{" "}

                            {
                                currentPeriodTitle
                            }.

                        </p>

                    </div>


                    <div className="text-xs text-base-content/50">

                        {
                            filteredSales.length
                        }{" "}

                        sales records

                    </div>

                </div>


                <div className="overflow-x-auto">

                    <table className="table table-sm">

                        <thead>

                            <tr>

                                <th>
                                    Period
                                </th>

                                <th className="text-right">
                                    Transactions
                                </th>

                                <th className="text-right">
                                    Sales
                                </th>

                                <th className="text-right">
                                    Avg. Sale
                                </th>

                                <th className="text-right">
                                    Share
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {currentData.map(
                                (
                                    item,
                                    index
                                ) => {

                                    const average =
                                        item.transactions >
                                        0
                                            ? item.sales /
                                              item.transactions
                                            : 0;


                                    const share =
                                        summary.totalSales >
                                        0
                                            ? (
                                                item.sales /
                                                summary.totalSales
                                            ) *
                                              100
                                            : 0;


                                    return (

                                        <tr
                                            key={`${item.label}-${index}`}
                                        >

                                            <td className="font-medium">

                                                {
                                                    item.label
                                                }

                                            </td>


                                            <td className="text-right">

                                                {
                                                    item.transactions
                                                }

                                            </td>


                                            <td className="text-right font-semibold">

                                                {formatCurrency(
                                                    item.sales
                                                )}

                                            </td>


                                            <td className="text-right">

                                                {formatCurrency(
                                                    average
                                                )}

                                            </td>


                                            <td className="text-right">

                                                <span className="badge badge-ghost badge-sm">

                                                    {
                                                        share.toFixed(
                                                            1
                                                        )
                                                    }
                                                    %

                                                </span>

                                            </td>

                                        </tr>

                                    );

                                }
                            )}

                        </tbody>


                        <tfoot>

                            <tr>

                                <th>
                                    Total
                                </th>


                                <th className="text-right">

                                    {
                                        summary.transactions
                                    }

                                </th>


                                <th className="text-right">

                                    {formatCurrency(
                                        summary.totalSales
                                    )}

                                </th>


                                <th className="text-right">

                                    {formatCurrency(
                                        summary.averageSale
                                    )}

                                </th>


                                <th className="text-right">

                                    {summary.totalSales >
                                    0
                                        ? "100%"
                                        : "0%"}

                                </th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>


            {/* ==================================================
                REPORT INFORMATION
            ================================================== */}

            <div className="rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">

                <div className="flex items-start gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

                        <FaChartLine />

                    </div>


                    <div>

                        <h3 className="text-sm font-semibold">
                            About this report
                        </h3>


                        <p className="mt-1 text-xs leading-relaxed text-base-content/50">

                            This report uses actual POS sales
                            records for the currently active
                            branch. Today and Yesterday are
                            displayed by hour, This Week is
                            displayed by day, This Month is
                            displayed by date, and This Year
                            is displayed by month. Custom
                            ranges automatically choose an
                            appropriate graph interval based
                            on the length of the selected
                            range. Fully refunded and voided
                            sales are excluded from the
                            transaction count, while partially
                            refunded transactions remain
                            counted.

                        </p>

                    </div>

                </div>

            </div>


            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="flex items-center justify-between pb-4 text-xs text-base-content/40">

                <span>

                    Showing{" "}

                    {
                        currentPeriodTitle
                    }{" "}

                    sales for{" "}

                    {
                        activeBranchCode ||
                        activeBranchName ||
                        "active branch"
                    }

                </span>


                <button
                    type="button"
                    onClick={
                        handleBack
                    }
                    className="transition hover:text-primary"
                >

                    Back to Reports

                </button>

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

                                        Choose the sales
                                        period you want
                                        to analyze.

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
                                                        )} – ${formatDate(
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


                                                        if (
                                                            totalDays ===
                                                            1
                                                        ) {
                                                            return "The graph will show hourly sales.";
                                                        }


                                                        if (
                                                            totalDays <=
                                                            31
                                                        ) {
                                                            return "The graph will show daily sales.";
                                                        }


                                                        if (
                                                            totalDays <=
                                                            180
                                                        ) {
                                                            return "The graph will show weekly sales.";
                                                        }


                                                        if (
                                                            totalDays <=
                                                            730
                                                        ) {
                                                            return "The graph will show monthly sales.";
                                                        }


                                                        return "The graph will show yearly sales.";

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


export default SalesReportPage;