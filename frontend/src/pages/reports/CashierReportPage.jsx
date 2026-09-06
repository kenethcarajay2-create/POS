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
    FaUserTie,
    FaMoneyBillWave,
    FaReceipt,
    FaShoppingCart,
    FaChartLine,
    FaPercentage,
    FaUndo,
    FaBan,
    FaCalendarDay,
    FaClock,
    FaSearch,
    FaDownload,
    FaTimes,
    FaCheck,
    FaEye,
    FaTrophy,
    FaUsers,
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
import userService from "../../services/user.service";


/*
============================================================
DATE HELPERS
============================================================
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
    ] = String(value)
        .split("-")
        .map(Number);


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


const startOfDay = (
    value
) => {

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


const endOfDay = (
    value
) => {

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


const startOfWeek = (
    value
) => {

    const date =
        startOfDay(
            value
        );


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

    return new Date(
        value.getFullYear(),
        value.getMonth() +
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


const formatDate = (
    value
) => {

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
            new Date(
                value
            );

    }


    if (
        !date ||
        Number.isNaN(
            date.getTime()
        )
    ) {
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
============================================================
SALE HELPERS
============================================================
*/

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


const getCashierId = (
    sale
) => {

    const cashier =
        sale?.cashier;


    if (
        cashier &&
        typeof cashier ===
        "object"
    ) {

        return String(
            cashier._id ||
            cashier.id ||
            ""
        );

    }


    return String(
        cashier ||
        sale?.cashierId ||
        ""
    );

};


const getCashierName = (
    sale
) => {

    return (
        sale?.cashier?.name ||
        sale?.cashier?.username ||
        sale?.cashierName ||
        "Unknown Cashier"
    );

};


const getCashierUsername = (
    sale
) => {

    return (
        sale?.cashier?.username ||
        ""
    );

};


const getRemainingQuantity = (
    item
) => {

    const quantity =
        Number(
            item?.quantity ||
            0
        );


    const refunded =
        Number(
            item?.refundedQuantity ||
            0
        );


    return Math.max(
        quantity -
        refunded,
        0
    );

};


const getSaleItemsSold = (
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


const getRefundAmount = (
    sale
) => {

    const recorded =
        Number(
            sale?.refundAmount
        );


    if (
        Number.isFinite(
            recorded
        ) &&
        recorded > 0
    ) {
        return recorded;
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

            const quantity =
                Number(
                    item?.refundedQuantity ||
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

};


const getOriginalSaleTotal = (
    sale
) => {

    const explicit =
        Number(
            sale?.total ??
            sale?.grandTotal ??
            sale?.totalAmount
        );


    if (
        Number.isFinite(
            explicit
        )
    ) {
        return explicit;
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

};


const getNetSaleTotal = (
    sale
) => {

    if (
        sale?.status ===
        "VOIDED"
    ) {
        return 0;
    }


    return Math.max(
        getOriginalSaleTotal(
            sale
        ) -
        getRefundAmount(
            sale
        ),
        0
    );

};


const getDiscount = (
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


const isCountedTransaction = (
    sale
) => {

    return (
        sale?.status !==
        "VOIDED"
    );

};


/*
============================================================
CASHIER REPORT PAGE
============================================================
*/

function CashierReportPage() {

    const navigate =
        useNavigate();


    const {
        sales,
        loading: salesLoading,
        fetchSales,
    } =
        useSaleStore();


    /*
    ========================================================
    USER STATE
    ========================================================
    */

    const [
        users,
        setUsers,
    ] = useState([]);


    const [
        usersLoading,
        setUsersLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    /*
    ========================================================
    FILTER STATE
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
        userStatus,
        setUserStatus,
    ] = useState(
        "ALL"
    );


    /*
    ========================================================
    CUSTOM RANGE
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
    CASHIER DETAIL
    ========================================================
    */

    const [
        selectedCashier,
        setSelectedCashier,
    ] = useState(null);


    /*
    ========================================================
    LOAD DATA
    ========================================================
    */

    useEffect(
        () => {

            const load =
                async () => {

                    try {

                        setError("");


                        await Promise.all([
                            fetchSales(),

                            userService
                                .getUsers()
                                .then(
                                    (
                                        data
                                    ) => {

                                        setUsers(
                                            Array.isArray(
                                                data
                                            )
                                                ? data
                                                : []
                                        );

                                    }
                                ),
                        ]);


                    } catch (err) {

                        console.error(
                            "Failed to load cashier report:",
                            err
                        );


                        setError(
                            err?.response
                                ?.data
                                ?.message ||
                            err?.message ||
                            "Failed to load cashier report."
                        );


                    } finally {

                        setUsersLoading(
                            false
                        );

                    }

                };


            load();

        },
        [
            fetchSales,
        ]
    );


    /*
    ========================================================
    SAFE SALES
    ========================================================
    */

    const safeSales =
        Array.isArray(
            sales
        )
            ? sales
            : [];


    /*
    ========================================================
    FORMATTERS
    ========================================================
    */

    const formatCurrency = (
        value
    ) => {

        return new Intl.NumberFormat(
            "en-PH",
            {
                style:
                    "currency",

                currency:
                    "PHP",

                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2,
            }
        ).format(
            Number(
                value
            ) || 0
        );

    };


    /*
    ========================================================
    DATE RANGE
    ========================================================
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
                    "Custom Range"
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
                        start &&
                        end
                    ) {

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
    ========================================================
    PERIOD SALES
    ========================================================
    */

    const periodSales =
        useMemo(
            () => {

                if (
                    !selectedDateRange
                ) {
                    return [];
                }


                return safeSales.filter(
                    (
                        sale
                    ) => {

                        const date =
                            getSaleDate(
                                sale
                            );


                        if (!date) {
                            return false;
                        }


                        return (
                            date >=
                                selectedDateRange
                                    .start &&
                            date <=
                                selectedDateRange
                                    .end
                        );

                    }
                );

            },
            [
                safeSales,
                selectedDateRange,
            ]
        );


    /*
    ========================================================
    USERS ELIGIBLE FOR CASHIER REPORT
    ========================================================

    Includes:

    - cashier role
    - admin / manager if they have POS permission
    - custom users with POS permission

    This means sales made by non-cashier users can still
    be attributed correctly.
    ========================================================
    */

    const cashierUsers =
        useMemo(
            () => {

                return users.filter(
                    (
                        user
                    ) => {

                        if (
                            user?.role ===
                            "cashier"
                        ) {
                            return true;
                        }


                        if (
                            user?.role ===
                                "admin" ||
                            user?.role ===
                                "manager"
                        ) {
                            return true;
                        }


                        return Boolean(
                            user?.permissions
                                ?.pos
                        );

                    }
                );

            },
            [
                users,
            ]
        );


    /*
    ========================================================
    BUILD CASHIER REPORT
    ========================================================
    */

    const cashierReport =
        useMemo(
            () => {

                const map =
                    new Map();


                /*
                ------------------------------------------------
                FIRST ADD ALL USERS
                ------------------------------------------------

                Important:
                Cashiers with zero sales still appear.
                ------------------------------------------------
                */

                cashierUsers.forEach(
                    (
                        user
                    ) => {

                        const id =
                            String(
                                user?._id ||
                                user?.id ||
                                ""
                            );


                        if (!id) {
                            return;
                        }


                        map.set(
                            id,
                            {
                                id,

                                name:
                                    user?.name ||
                                    user?.username ||
                                    "Unnamed User",

                                username:
                                    user?.username ||
                                    "",

                                role:
                                    user?.role ||
                                    "cashier",

                                isActive:
                                    user?.isActive !==
                                    false,

                                sales:
                                    [],

                                netSales:
                                    0,

                                transactions:
                                    0,

                                itemsSold:
                                    0,

                                discounts:
                                    0,

                                refunds:
                                    0,

                                refundCount:
                                    0,

                                voidAmount:
                                    0,

                                voidCount:
                                    0,
                            }
                        );

                    }
                );


                /*
                ------------------------------------------------
                APPLY SALES
                ------------------------------------------------
                */

                periodSales.forEach(
                    (
                        sale
                    ) => {

                        let cashierId =
                            getCashierId(
                                sale
                            );


                        /*
                        Historical fallback:
                        if sale has cashier name but no ID,
                        try matching the user.
                        */

                        if (!cashierId) {

                            const saleName =
                                String(
                                    getCashierName(
                                        sale
                                    )
                                )
                                    .trim()
                                    .toLowerCase();


                            const saleUsername =
                                String(
                                    getCashierUsername(
                                        sale
                                    )
                                )
                                    .trim()
                                    .toLowerCase();


                            const match =
                                cashierUsers.find(
                                    (
                                        user
                                    ) => {

                                        const name =
                                            String(
                                                user?.name ||
                                                ""
                                            )
                                                .trim()
                                                .toLowerCase();


                                        const username =
                                            String(
                                                user?.username ||
                                                ""
                                            )
                                                .trim()
                                                .toLowerCase();


                                        return (
                                            (
                                                saleUsername &&
                                                username ===
                                                    saleUsername
                                            ) ||
                                            (
                                                saleName &&
                                                name ===
                                                    saleName
                                            )
                                        );

                                    }
                                );


                            if (match) {

                                cashierId =
                                    String(
                                        match._id ||
                                        match.id
                                    );

                            }

                        }


                        /*
                        Historical user no longer in Users DB.
                        */

                        if (
                            !cashierId
                        ) {

                            cashierId =
                                `historical-${getCashierName(
                                    sale
                                )}`;

                        }


                        if (
                            !map.has(
                                cashierId
                            )
                        ) {

                            map.set(
                                cashierId,
                                {
                                    id:
                                        cashierId,

                                    name:
                                        getCashierName(
                                            sale
                                        ),

                                    username:
                                        getCashierUsername(
                                            sale
                                        ),

                                    role:
                                        "historical",

                                    isActive:
                                        false,

                                    sales:
                                        [],

                                    netSales:
                                        0,

                                    transactions:
                                        0,

                                    itemsSold:
                                        0,

                                    discounts:
                                        0,

                                    refunds:
                                        0,

                                    refundCount:
                                        0,

                                    voidAmount:
                                        0,

                                    voidCount:
                                        0,
                                }
                            );

                        }


                        const cashier =
                            map.get(
                                cashierId
                            );


                        cashier.sales.push(
                            sale
                        );


                        cashier.netSales +=
                            getNetSaleTotal(
                                sale
                            );


                        if (
                            isCountedTransaction(
                                sale
                            )
                        ) {

                            cashier.transactions +=
                                1;

                        }


                        cashier.itemsSold +=
                            getSaleItemsSold(
                                sale
                            );


                        cashier.discounts +=
                            getDiscount(
                                sale
                            );


                        const refundAmount =
                            getRefundAmount(
                                sale
                            );


                        cashier.refunds +=
                            refundAmount;


                        if (
                            refundAmount >
                            0
                        ) {

                            cashier.refundCount +=
                                1;

                        }


                        if (
                            sale?.status ===
                            "VOIDED"
                        ) {

                            cashier.voidAmount +=
                                getOriginalSaleTotal(
                                    sale
                                );


                            cashier.voidCount +=
                                1;

                        }

                    }
                );


                return Array.from(
                    map.values()
                ).map(
                    (
                        cashier
                    ) => ({

                        ...cashier,

                        averageSale:
                            cashier.transactions >
                            0
                                ? cashier.netSales /
                                  cashier.transactions
                                : 0,

                    })
                );

            },
            [
                cashierUsers,
                periodSales,
            ]
        );


    /*
    ========================================================
    SEARCH / STATUS FILTER
    ========================================================
    */

    const filteredCashiers =
        useMemo(
            () => {

                const query =
                    search
                        .trim()
                        .toLowerCase();


                return cashierReport
                    .filter(
                        (
                            cashier
                        ) => {

                            const matchesSearch =
                                !query ||
                                cashier.name
                                    .toLowerCase()
                                    .includes(
                                        query
                                    ) ||
                                cashier.username
                                    .toLowerCase()
                                    .includes(
                                        query
                                    );


                            const matchesStatus =
                                userStatus ===
                                "ALL"
                                    ? true
                                    : userStatus ===
                                      "ACTIVE"
                                        ? cashier
                                            .isActive ===
                                          true
                                        : cashier
                                            .isActive ===
                                          false;


                            return (
                                matchesSearch &&
                                matchesStatus
                            );

                        }
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            b.netSales -
                            a.netSales
                    );

            },
            [
                cashierReport,
                search,
                userStatus,
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

                const totalSales =
                    cashierReport.reduce(
                        (
                            sum,
                            cashier
                        ) =>
                            sum +
                            cashier.netSales,
                        0
                    );


                const totalTransactions =
                    cashierReport.reduce(
                        (
                            sum,
                            cashier
                        ) =>
                            sum +
                            cashier.transactions,
                        0
                    );


                const totalItems =
                    cashierReport.reduce(
                        (
                            sum,
                            cashier
                        ) =>
                            sum +
                            cashier.itemsSold,
                        0
                    );


                const averageSale =
                    totalTransactions >
                    0
                        ? totalSales /
                          totalTransactions
                        : 0;


                const topCashier =
                    [
                        ...cashierReport,
                    ]
                        .filter(
                            (
                                cashier
                            ) =>
                                cashier.netSales >
                                0
                        )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                b.netSales -
                                a.netSales
                        )[0] ||
                    null;


                return {
                    totalSales,
                    totalTransactions,
                    totalItems,
                    averageSale,
                    topCashier,
                };

            },
            [
                cashierReport,
            ]
        );


    /*
    ========================================================
    PERIOD TITLE
    ========================================================
    */

    const currentPeriodTitle =
        period ===
        "Custom Range"
            ? appliedStartDate ===
              appliedEndDate
                ? formatDate(
                    appliedStartDate
                )
                : `${formatDate(
                    appliedStartDate
                )} - ${formatDate(
                    appliedEndDate
                )}`
            : period;


    /*
    ========================================================
    CUSTOM GRAPH GRANULARITY
    ========================================================
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
    ========================================================
    SELECTED CASHIER SALES
    ========================================================
    */

    const selectedCashierSales =
        selectedCashier
            ? selectedCashier.sales
            : [];


    /*
    ========================================================
    CREATE GRAPH DATA
    ========================================================
    */

    const cashierGraphData =
        useMemo(
            () => {

                if (
                    !selectedCashier ||
                    !selectedDateRange
                ) {
                    return [];
                }


                /*
                ------------------------------------------------
                HOURLY
                ------------------------------------------------
                */

                if (
                    graphGranularity ===
                    "hour"
                ) {

                    const buckets =
                        Array.from(
                            {
                                length:
                                    24,
                            },
                            (
                                _,
                                hour
                            ) => ({

                                label:
                                    new Date(
                                        2000,
                                        0,
                                        1,
                                        hour
                                    ).toLocaleTimeString(
                                        "en-PH",
                                        {
                                            hour:
                                                "numeric",

                                            hour12:
                                                true,
                                        }
                                    ),

                                hour,

                                sales:
                                    0,

                                transactions:
                                    0,
                            })
                        );


                    selectedCashierSales.forEach(
                        (
                            sale
                        ) => {

                            const date =
                                getSaleDate(
                                    sale
                                );


                            if (!date) {
                                return;
                            }


                            const bucket =
                                buckets[
                                    date.getHours()
                                ];


                            bucket.sales +=
                                getNetSaleTotal(
                                    sale
                                );


                            if (
                                isCountedTransaction(
                                    sale
                                )
                            ) {

                                bucket.transactions++;

                            }

                        }
                    );


                    return buckets.map(
                        ({
                            hour,
                            ...item
                        }) => item
                    );

                }


                /*
                ------------------------------------------------
                THIS WEEK
                ------------------------------------------------
                */

                if (
                    graphGranularity ===
                    "week-day"
                ) {

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
                                selectedDateRange
                                    .start,
                                index
                            );


                        buckets.push({
                            date:
                                startOfDay(
                                    date
                                ),

                            label:
                                date.toLocaleDateString(
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


                    selectedCashierSales.forEach(
                        (
                            sale
                        ) => {

                            const date =
                                getSaleDate(
                                    sale
                                );


                            if (!date) {
                                return;
                            }


                            const index =
                                daysBetween(
                                    selectedDateRange
                                        .start,
                                    date
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
                                getNetSaleTotal(
                                    sale
                                );


                            if (
                                isCountedTransaction(
                                    sale
                                )
                            ) {

                                buckets[
                                    index
                                ].transactions++;

                            }

                        }
                    );


                    return buckets.map(
                        ({
                            date,
                            ...item
                        }) => item
                    );

                }


                /*
                ------------------------------------------------
                DAILY
                ------------------------------------------------
                */

                if (
                    graphGranularity ===
                    "day"
                ) {

                    const buckets =
                        [];


                    const map =
                        new Map();


                    let cursor =
                        startOfDay(
                            selectedDateRange
                                .start
                        );


                    const finish =
                        startOfDay(
                            selectedDateRange
                                .end
                        );


                    while (
                        cursor <=
                        finish
                    ) {

                        const key =
                            `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;


                        const bucket = {
                            key,

                            label:
                                cursor.toLocaleDateString(
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


                        map.set(
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


                    selectedCashierSales.forEach(
                        (
                            sale
                        ) => {

                            const date =
                                getSaleDate(
                                    sale
                                );


                            if (!date) {
                                return;
                            }


                            const key =
                                `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;


                            const bucket =
                                map.get(
                                    key
                                );


                            if (!bucket) {
                                return;
                            }


                            bucket.sales +=
                                getNetSaleTotal(
                                    sale
                                );


                            if (
                                isCountedTransaction(
                                    sale
                                )
                            ) {

                                bucket.transactions++;

                            }

                        }
                    );


                    return buckets.map(
                        ({
                            key,
                            ...item
                        }) => item
                    );

                }


                /*
                ------------------------------------------------
                WEEKLY CUSTOM
                ------------------------------------------------
                */

                if (
                    graphGranularity ===
                    "week"
                ) {

                    const buckets =
                        [];


                    let cursor =
                        startOfDay(
                            selectedDateRange
                                .start
                        );


                    const finish =
                        startOfDay(
                            selectedDateRange
                                .end
                        );


                    while (
                        cursor <=
                        finish
                    ) {

                        const start =
                            new Date(
                                cursor
                            );


                        let end =
                            addDays(
                                start,
                                6
                            );


                        if (
                            end >
                            finish
                        ) {

                            end =
                                new Date(
                                    finish
                                );

                        }


                        buckets.push({
                            start:
                                startOfDay(
                                    start
                                ),

                            end:
                                endOfDay(
                                    end
                                ),

                            label:
                                `${start.toLocaleDateString(
                                    "en-PH",
                                    {
                                        month:
                                            "short",
                                        day:
                                            "numeric",
                                    }
                                )} - ${end.toLocaleDateString(
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
                                end,
                                1
                            );

                    }


                    selectedCashierSales.forEach(
                        (
                            sale
                        ) => {

                            const date =
                                getSaleDate(
                                    sale
                                );


                            if (!date) {
                                return;
                            }


                            const bucket =
                                buckets.find(
                                    (
                                        item
                                    ) =>
                                        date >=
                                            item.start &&
                                        date <=
                                            item.end
                                );


                            if (!bucket) {
                                return;
                            }


                            bucket.sales +=
                                getNetSaleTotal(
                                    sale
                                );


                            if (
                                isCountedTransaction(
                                    sale
                                )
                            ) {

                                bucket.transactions++;

                            }

                        }
                    );


                    return buckets.map(
                        ({
                            start,
                            end,
                            ...item
                        }) => item
                    );

                }


                /*
                ------------------------------------------------
                MONTHLY
                ------------------------------------------------
                */

                if (
                    graphGranularity ===
                    "month"
                ) {

                    const buckets =
                        [];


                    const map =
                        new Map();


                    let cursor =
                        new Date(
                            selectedDateRange
                                .start
                                .getFullYear(),
                            selectedDateRange
                                .start
                                .getMonth(),
                            1
                        );


                    const finish =
                        new Date(
                            selectedDateRange
                                .end
                                .getFullYear(),
                            selectedDateRange
                                .end
                                .getMonth(),
                            1
                        );


                    while (
                        cursor <=
                        finish
                    ) {

                        const key =
                            `${cursor.getFullYear()}-${cursor.getMonth()}`;


                        const showYear =
                            selectedDateRange
                                .start
                                .getFullYear() !==
                            selectedDateRange
                                .end
                                .getFullYear();


                        const bucket = {
                            key,

                            label:
                                cursor.toLocaleDateString(
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


                        map.set(
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


                    selectedCashierSales.forEach(
                        (
                            sale
                        ) => {

                            const date =
                                getSaleDate(
                                    sale
                                );


                            if (!date) {
                                return;
                            }


                            const key =
                                `${date.getFullYear()}-${date.getMonth()}`;


                            const bucket =
                                map.get(
                                    key
                                );


                            if (!bucket) {
                                return;
                            }


                            bucket.sales +=
                                getNetSaleTotal(
                                    sale
                                );


                            if (
                                isCountedTransaction(
                                    sale
                                )
                            ) {

                                bucket.transactions++;

                            }

                        }
                    );


                    return buckets.map(
                        ({
                            key,
                            ...item
                        }) => item
                    );

                }


                /*
                ------------------------------------------------
                YEARLY CUSTOM
                ------------------------------------------------
                */

                if (
                    graphGranularity ===
                    "year"
                ) {

                    const buckets =
                        [];


                    const map =
                        new Map();


                    for (
                        let year =
                            selectedDateRange
                                .start
                                .getFullYear();

                        year <=
                        selectedDateRange
                            .end
                            .getFullYear();

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


                        map.set(
                            year,
                            bucket
                        );


                        buckets.push(
                            bucket
                        );

                    }


                    selectedCashierSales.forEach(
                        (
                            sale
                        ) => {

                            const date =
                                getSaleDate(
                                    sale
                                );


                            if (!date) {
                                return;
                            }


                            const bucket =
                                map.get(
                                    date.getFullYear()
                                );


                            if (!bucket) {
                                return;
                            }


                            bucket.sales +=
                                getNetSaleTotal(
                                    sale
                                );


                            if (
                                isCountedTransaction(
                                    sale
                                )
                            ) {

                                bucket.transactions++;

                            }

                        }
                    );


                    return buckets.map(
                        ({
                            year,
                            ...item
                        }) => item
                    );

                }


                return [];

            },
            [
                selectedCashier,
                selectedCashierSales,
                selectedDateRange,
                graphGranularity,
            ]
        );


    /*
    ========================================================
    HANDLERS
    ========================================================
    */

    const handlePeriodChange =
        (
            event
        ) => {

            const value =
                event.target.value;


            if (
                value ===
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
                value
            );

        };


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
                    "Start date cannot be after the end date."
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


            setShowCustomRange(
                false
            );


            setDateError(
                ""
            );

        };


    const handleOpenCustomRange =
        () => {

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
    EXPORT
    ========================================================
    */

    const handleExport =
        () => {

            if (
                filteredCashiers.length ===
                0
            ) {

                window.alert(
                    "There is no cashier report data to export."
                );


                return;

            }


            const headers = [
                "Cashier",
                "Username",
                "Role",
                "Status",
                "Net Sales",
                "Transactions",
                "Items Sold",
                "Average Sale",
                "Discounts",
                "Refund Amount",
                "Refund Count",
                "Void Amount",
                "Void Count",
            ];


            const rows =
                filteredCashiers.map(
                    (
                        cashier
                    ) => [

                        cashier.name,

                        cashier.username,

                        cashier.role,

                        cashier.isActive
                            ? "Active"
                            : "Inactive",

                        cashier.netSales.toFixed(
                            2
                        ),

                        cashier.transactions,

                        cashier.itemsSold,

                        cashier.averageSale.toFixed(
                            2
                        ),

                        cashier.discounts.toFixed(
                            2
                        ),

                        cashier.refunds.toFixed(
                            2
                        ),

                        cashier.refundCount,

                        cashier.voidAmount.toFixed(
                            2
                        ),

                        cashier.voidCount,
                    ]
                );


            const escape =
                (
                    value
                ) =>
                    `"${String(
                        value ??
                        ""
                    ).replace(
                        /"/g,
                        '""'
                    )}"`;


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
                                    escape
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


            link.href =
                url;


            link.download =
                `cashier-report-${period
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "-"
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
    TOOLTIP
    ========================================================
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

            <div className="rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl">

                <p className="mb-2 text-xs text-base-content/50">
                    {label}
                </p>


                <p className="text-sm font-bold">

                    {formatCurrency(
                        data?.sales ||
                        0
                    )}

                </p>


                <p className="mt-1 text-xs text-base-content/50">

                    {data?.transactions ||
                        0}{" "}

                    transaction

                    {(data?.transactions ||
                        0) !==
                    1
                        ? "s"
                        : ""}

                </p>

            </div>

        );

    };


    /*
    ========================================================
    LOADING
    ========================================================
    */

    if (
        (
            salesLoading ||
            usersLoading
        ) &&
        users.length ===
            0 &&
        safeSales.length ===
            0
    ) {

        return (

            <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                    <span className="loading loading-spinner loading-lg text-primary" />


                    <p className="mt-3 text-sm text-base-content/50">

                        Building cashier report...

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


            {/* HEADER */}

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

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10 text-info">

                            <FaUserTie />

                        </div>


                        <div>

                            <h1 className="text-2xl font-bold">
                                Cashier Report
                            </h1>


                            <p className="mt-1 text-sm text-base-content/55">

                                Compare sales performance across POS users.

                            </p>

                        </div>

                    </div>

                </div>


                {/* CONTROLS */}

                <div className="flex flex-wrap gap-2">

                    <select
                        value={
                            showCustomRange
                                ? "Custom Range"
                                : period
                        }
                        onChange={
                            handlePeriodChange
                        }
                        className="select select-bordered select-sm"
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
                            className="btn btn-ghost btn-sm"
                            onClick={
                                handleOpenCustomRange
                            }
                        >

                            <FaCalendarDay />

                            Change Range

                        </button>

                    )}


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


            {/* ERROR */}

            {error && (

                <div className="alert alert-error">

                    <span>
                        {error}
                    </span>

                </div>

            )}


            {/* PERIOD */}

            <div className="flex items-center gap-3 rounded-xl border border-info/20 bg-info/5 px-4 py-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">

                    {graphGranularity ===
                    "hour" ? (

                        <FaClock />

                    ) : (

                        <FaCalendarDay />

                    )}

                </div>


                <div>

                    <p className="text-sm font-semibold">
                        {currentPeriodTitle}
                    </p>


                    <p className="text-xs text-base-content/50">

                        {
                            periodSales.length
                        }{" "}

                        sales record

                        {
                            periodSales.length !==
                            1
                                ? "s"
                                : ""
                        }{" "}

                        included

                    </p>

                </div>

            </div>


            {/* SUMMARY */}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">

                <SummaryCard
                    title="POS Users"
                    value={
                        cashierReport.length
                    }
                    description="Users included in report"
                    icon={
                        FaUsers
                    }
                    iconClass="bg-info/10 text-info"
                />


                <SummaryCard
                    title="Net Sales"
                    value={
                        formatCurrency(
                            summary.totalSales
                        )
                    }
                    description="Sales after refunds and voids"
                    icon={
                        FaMoneyBillWave
                    }
                    iconClass="bg-success/10 text-success"
                />


                <SummaryCard
                    title="Transactions"
                    value={
                        summary.totalTransactions
                    }
                    description="Non-voided transactions"
                    icon={
                        FaReceipt
                    }
                    iconClass="bg-primary/10 text-primary"
                />


                <SummaryCard
                    title="Items Sold"
                    value={
                        summary.totalItems
                    }
                    description="Net quantity after refunds"
                    icon={
                        FaShoppingCart
                    }
                    iconClass="bg-warning/10 text-warning"
                />


                <SummaryCard
                    title="Average Sale"
                    value={
                        formatCurrency(
                            summary.averageSale
                        )
                    }
                    description="Average transaction value"
                    icon={
                        FaChartLine
                    }
                    iconClass="bg-secondary/10 text-secondary"
                />

            </div>


            {/* TOP CASHIER */}

            {summary.topCashier && (

                <div className="rounded-xl border border-warning/20 bg-warning/5 p-5">

                    <div className="flex items-center gap-4">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">

                            <FaTrophy />

                        </div>


                        <div className="flex-1">

                            <p className="text-xs text-base-content/50">

                                Top Cashier — {currentPeriodTitle}

                            </p>


                            <h2 className="mt-1 text-lg font-bold">

                                {
                                    summary.topCashier
                                        .name
                                }

                            </h2>


                            <p className="text-xs text-base-content/50">

                                {
                                    summary.topCashier
                                        .transactions
                                }{" "}

                                transactions •{" "}

                                {
                                    summary.topCashier
                                        .itemsSold
                                }{" "}

                                items

                            </p>

                        </div>


                        <div className="text-right">

                            <p className="text-xl font-bold text-success">

                                {
                                    formatCurrency(
                                        summary
                                            .topCashier
                                            .netSales
                                    )
                                }

                            </p>


                            <p className="text-xs text-base-content/45">
                                net sales
                            </p>

                        </div>

                    </div>

                </div>

            )}


            {/* FILTERS */}

            <div className="rounded-xl border border-base-300 bg-base-100 p-4">

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                    <div className="relative">

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
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Search cashier..."
                            className="input input-bordered w-full pl-9"
                        />

                    </div>


                    <select
                        value={
                            userStatus
                        }
                        onChange={(
                            event
                        ) =>
                            setUserStatus(
                                event
                                    .target
                                    .value
                            )
                        }
                        className="select select-bordered"
                    >

                        <option value="ALL">
                            All Users
                        </option>

                        <option value="ACTIVE">
                            Active Users
                        </option>

                        <option value="INACTIVE">
                            Inactive / Historical
                        </option>

                    </select>

                </div>

            </div>


            {/* CASHIER TABLE */}

            <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">

                <div className="border-b border-base-200 px-5 py-4">

                    <h2 className="font-bold">
                        Cashier Performance
                    </h2>


                    <p className="mt-1 text-xs text-base-content/50">

                        Every POS-capable user is included, including users with zero sales.

                    </p>

                </div>


                <div className="overflow-x-auto">

                    <table className="table">

                        <thead>

                            <tr>

                                <th>
                                    Rank
                                </th>

                                <th>
                                    Cashier
                                </th>

                                <th>
                                    Net Sales
                                </th>

                                <th>
                                    Transactions
                                </th>

                                <th>
                                    Items
                                </th>

                                <th>
                                    Avg. Sale
                                </th>

                                <th>
                                    Discounts
                                </th>

                                <th>
                                    Refunds
                                </th>

                                <th>
                                    Voids
                                </th>

                                <th>
                                    Status
                                </th>

                                <th />

                            </tr>

                        </thead>


                        <tbody>

                            {filteredCashiers.map(
                                (
                                    cashier,
                                    index
                                ) => (

                                    <tr
                                        key={
                                            cashier.id
                                        }
                                        className="hover"
                                    >

                                        <td>

                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-200 text-xs font-bold">

                                                {index + 1}

                                            </div>

                                        </td>


                                        <td>

                                            <div className="flex items-center gap-3">

                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10 font-bold text-info">

                                                    {
                                                        cashier.name
                                                            .charAt(
                                                                0
                                                            )
                                                            .toUpperCase()
                                                    }

                                                </div>


                                                <div>

                                                    <p className="font-semibold">

                                                        {
                                                            cashier.name
                                                        }

                                                    </p>


                                                    <p className="text-[10px] text-base-content/40">

                                                        {
                                                            cashier.username
                                                                ? `@${cashier.username}`
                                                                : cashier.role ===
                                                                  "historical"
                                                                    ? "Historical cashier"
                                                                    : cashier.role
                                                        }

                                                    </p>

                                                </div>

                                            </div>

                                        </td>


                                        <td className="font-bold text-success">

                                            {
                                                formatCurrency(
                                                    cashier.netSales
                                                )
                                            }

                                        </td>


                                        <td>

                                            {
                                                cashier.transactions
                                            }

                                        </td>


                                        <td>

                                            {
                                                cashier.itemsSold
                                            }

                                        </td>


                                        <td>

                                            {
                                                formatCurrency(
                                                    cashier.averageSale
                                                )
                                            }

                                        </td>


                                        <td>

                                            <span className="text-warning">

                                                {
                                                    formatCurrency(
                                                        cashier.discounts
                                                    )
                                                }

                                            </span>

                                        </td>


                                        <td>

                                            <div className="text-error">

                                                {
                                                    formatCurrency(
                                                        cashier.refunds
                                                    )
                                                }

                                            </div>


                                            <div className="text-[10px] text-base-content/40">

                                                {
                                                    cashier.refundCount
                                                }{" "}

                                                refund

                                                {
                                                    cashier.refundCount !==
                                                    1
                                                        ? "s"
                                                        : ""
                                                }

                                            </div>

                                        </td>


                                        <td>

                                            <div className="text-error">

                                                {
                                                    formatCurrency(
                                                        cashier.voidAmount
                                                    )
                                                }

                                            </div>


                                            <div className="text-[10px] text-base-content/40">

                                                {
                                                    cashier.voidCount
                                                }{" "}

                                                void

                                                {
                                                    cashier.voidCount !==
                                                    1
                                                        ? "s"
                                                        : ""
                                                }

                                            </div>

                                        </td>


                                        <td>

                                            {cashier.isActive ? (

                                                <span className="badge badge-success badge-sm">
                                                    Active
                                                </span>

                                            ) : (

                                                <span className="badge badge-ghost badge-sm">
                                                    Inactive
                                                </span>

                                            )}

                                        </td>


                                        <td>

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline"
                                                onClick={() =>
                                                    setSelectedCashier(
                                                        cashier
                                                    )
                                                }
                                            >

                                                <FaEye />

                                                View

                                            </button>

                                        </td>

                                    </tr>

                                )
                            )}


                            {filteredCashiers.length ===
                                0 && (

                                <tr>

                                    <td
                                        colSpan="11"
                                        className="py-14 text-center"
                                    >

                                        <FaUserTie className="mx-auto text-3xl text-base-content/15" />


                                        <p className="mt-3 font-semibold">
                                            No cashiers found
                                        </p>


                                        <p className="mt-1 text-xs text-base-content/50">
                                            Try changing the current filters.
                                        </p>

                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* CASHIER DETAIL */}

            {selectedCashier && (

                <dialog
                    open
                    className="modal modal-open"
                >

                    <div className="modal-box max-w-6xl">

                        <div className="flex items-start justify-between gap-4">

                            <div>

                                <h2 className="text-xl font-bold">

                                    {
                                        selectedCashier
                                            .name
                                    }

                                </h2>


                                <p className="mt-1 text-sm text-base-content/50">

                                    Cashier performance •{" "}

                                    {
                                        currentPeriodTitle
                                    }

                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={() =>
                                    setSelectedCashier(
                                        null
                                    )
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

                            <MiniCard
                                label="Net Sales"
                                value={
                                    formatCurrency(
                                        selectedCashier
                                            .netSales
                                    )
                                }
                            />


                            <MiniCard
                                label="Transactions"
                                value={
                                    selectedCashier
                                        .transactions
                                }
                            />


                            <MiniCard
                                label="Items Sold"
                                value={
                                    selectedCashier
                                        .itemsSold
                                }
                            />


                            <MiniCard
                                label="Average Sale"
                                value={
                                    formatCurrency(
                                        selectedCashier
                                            .averageSale
                                    )
                                }
                            />

                        </div>


                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">

                            <MiniCard
                                label="Discounts"
                                value={
                                    formatCurrency(
                                        selectedCashier
                                            .discounts
                                    )
                                }
                            />


                            <MiniCard
                                label="Refunds"
                                value={
                                    `${formatCurrency(
                                        selectedCashier
                                            .refunds
                                    )} (${selectedCashier.refundCount})`
                                }
                            />


                            <MiniCard
                                label="Voids"
                                value={
                                    `${formatCurrency(
                                        selectedCashier
                                            .voidAmount
                                    )} (${selectedCashier.voidCount})`
                                }
                            />

                        </div>


                        <div className="mt-6 rounded-xl border border-base-300 p-5">

                            <h3 className="font-bold">
                                Sales Performance
                            </h3>


                            <p className="mt-1 text-xs text-base-content/50">

                                {
                                    graphGranularity ===
                                    "hour"
                                        ? "Hourly"
                                        : graphGranularity ===
                                          "month"
                                            ? "Monthly"
                                            : graphGranularity ===
                                              "year"
                                                ? "Yearly"
                                                : graphGranularity ===
                                                  "week"
                                                    ? "Weekly"
                                                    : "Daily"
                                }{" "}

                                sales breakdown.

                            </p>


                            <div className="mt-5 h-72">

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <BarChart
                                        data={
                                            cashierGraphData
                                        }
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
                                                    10,
                                            }}
                                            axisLine={
                                                false
                                            }
                                            tickLine={
                                                false
                                            }
                                        />


                                        <YAxis
                                            tick={{
                                                fontSize:
                                                    10,
                                            }}
                                            axisLine={
                                                false
                                            }
                                            tickLine={
                                                false
                                            }
                                            tickFormatter={(
                                                value
                                            ) =>
                                                Number(
                                                    value
                                                ) >=
                                                1000
                                                    ? `₱${(
                                                        Number(
                                                            value
                                                        ) /
                                                        1000
                                                    ).toFixed(
                                                        0
                                                    )}k`
                                                    : `₱${value}`
                                            }
                                        />


                                        <Tooltip
                                            content={
                                                <CustomTooltip />
                                            }
                                        />


                                        <Bar
                                            dataKey="sales"
                                            fill="#0ea5e9"
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

                        </div>


                        {/* TRANSACTIONS */}

                        <div className="mt-6 overflow-hidden rounded-xl border border-base-300">

                            <div className="border-b border-base-200 px-5 py-4">

                                <h3 className="font-bold">
                                    Transactions
                                </h3>


                                <p className="mt-1 text-xs text-base-content/50">

                                    {
                                        selectedCashier
                                            .sales
                                            .length
                                    }{" "}

                                    sale records for this period.

                                </p>

                            </div>


                            <div className="max-h-[380px] overflow-auto">

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
                                                Items
                                            </th>

                                            <th>
                                                Net Total
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {[
                                            ...selectedCashier
                                                .sales,
                                        ]
                                            .sort(
                                                (
                                                    a,
                                                    b
                                                ) =>
                                                    new Date(
                                                        b.createdAt
                                                    ) -
                                                    new Date(
                                                        a.createdAt
                                                    )
                                            )
                                            .map(
                                                (
                                                    sale
                                                ) => (

                                                    <tr
                                                        key={
                                                            sale._id ||
                                                            sale.id
                                                        }
                                                    >

                                                        <td className="font-medium">

                                                            {
                                                                sale.receiptNumber ||
                                                                "—"
                                                            }

                                                        </td>


                                                        <td>

                                                            {new Date(
                                                                sale.createdAt
                                                            ).toLocaleString(
                                                                "en-PH",
                                                                {
                                                                    month:
                                                                        "short",
                                                                    day:
                                                                        "numeric",
                                                                    hour:
                                                                        "numeric",
                                                                    minute:
                                                                        "2-digit",
                                                                }
                                                            )}

                                                        </td>


                                                        <td>

                                                            {
                                                                getSaleItemsSold(
                                                                    sale
                                                                )
                                                            }

                                                        </td>


                                                        <td className="font-semibold">

                                                            {
                                                                formatCurrency(
                                                                    getNetSaleTotal(
                                                                        sale
                                                                    )
                                                                )
                                                            }

                                                        </td>


                                                        <td>

                                                            <span
                                                                className={
                                                                    sale.status ===
                                                                    "VOIDED"
                                                                        ? "badge badge-error badge-sm"
                                                                        : sale.status ===
                                                                          "REFUNDED"
                                                                            ? "badge badge-warning badge-sm"
                                                                            : sale.status ===
                                                                              "PARTIALLY_REFUNDED"
                                                                                ? "badge badge-info badge-sm"
                                                                                : "badge badge-success badge-sm"
                                                                }
                                                            >

                                                                {
                                                                    sale.status ||
                                                                    "COMPLETED"
                                                                }

                                                            </span>

                                                        </td>

                                                    </tr>

                                                )
                                            )}


                                        {selectedCashier
                                            .sales
                                            .length ===
                                            0 && (

                                            <tr>

                                                <td
                                                    colSpan="5"
                                                    className="py-10 text-center text-base-content/50"
                                                >
                                                    No sales during this period.
                                                </td>

                                            </tr>

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>


                        <div className="modal-action">

                            <button
                                type="button"
                                className="btn"
                                onClick={() =>
                                    setSelectedCashier(
                                        null
                                    )
                                }
                            >
                                Close
                            </button>

                        </div>

                    </div>

                </dialog>

            )}


            {/* CUSTOM RANGE */}

            {showCustomRange && (

                <dialog
                    open
                    className="modal modal-open"
                >

                    <div className="modal-box max-w-lg">

                        <div className="flex items-start justify-between">

                            <div>

                                <h3 className="text-xl font-bold">
                                    Custom Date Range
                                </h3>


                                <p className="mt-1 text-sm text-base-content/50">
                                    Select the cashier report period.
                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={() => {

                                    setShowCustomRange(
                                        false
                                    );

                                    setDateError(
                                        ""
                                    );

                                }}
                            >

                                <FaTimes />

                            </button>

                        </div>


                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        From
                                    </span>

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


                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        To
                                    </span>

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


                        {customStartDate &&
                            customEndDate &&
                            customStartDate <=
                                customEndDate && (

                            <div className="mt-4 rounded-xl border border-info/20 bg-info/5 p-4">

                                <p className="text-xs text-base-content/50">
                                    Selected Range
                                </p>


                                <p className="mt-1 font-semibold">

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

                            </div>

                        )}


                        {dateError && (

                            <div className="alert alert-error mt-4">

                                <span>
                                    {dateError}
                                </span>

                            </div>

                        )}


                        <div className="modal-action">

                            <button
                                type="button"
                                className="btn"
                                onClick={() =>
                                    setShowCustomRange(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={
                                    handleApplyCustomRange
                                }
                            >

                                <FaCheck />

                                Apply Range

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
MINI CARD
============================================================
*/

function MiniCard({
    label,
    value,
}) {

    return (

        <div className="rounded-xl border border-base-300 bg-base-100 p-4">

            <p className="text-xs text-base-content/50">
                {label}
            </p>


            <p className="mt-1 text-lg font-bold">
                {value}
            </p>

        </div>

    );

}


export default CashierReportPage;