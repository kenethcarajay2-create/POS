import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
} from "react-router-dom";

import {
    FaChartLine,
    FaShoppingCart,
    FaBoxOpen,
    FaMoneyBillWave,
    FaPlus,
    FaWarehouse,
    FaReceipt,
    FaExclamationTriangle,
    FaSyncAlt,
    FaArrowRight,
    FaBook,
    FaUserTie,
    FaChartBar,
    FaClock,
    FaCalendarDay,
} from "react-icons/fa";

import useDashboardStore from "../../store/dashboard.store";
import useSaleStore from "../../store/sale.store";

import RecentTransactions from "../../components/dashboard/RecentTransactions";


/*
============================================================
DASHBOARD PAGE
============================================================

Uses:

- dashboard.store
- sale.store
- real sales data for today's hourly chart
- low stock data
- best sellers
- recent transactions

Quick access:

- POS
- Products
- Inventory
- Sales
- Ledger
- Workers
============================================================
*/


/*
============================================================
MONEY FORMATTER
============================================================
*/

const formatMoney = (
    value
) => {

    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }
    ).format(
        Number(value) || 0
    );

};


/*
============================================================
NUMBER FORMATTER
============================================================
*/

const formatNumber = (
    value
) => {

    return new Intl.NumberFormat(
        "en-PH"
    ).format(
        Number(value) || 0
    );

};


/*
============================================================
GET SALE TOTAL
============================================================

Supports a few likely property names so the dashboard
doesn't break if your Sale model calls the total slightly
differently.
============================================================
*/

const getSaleTotal = (
    sale
) => {

    return Number(
        sale?.total ??
        sale?.grandTotal ??
        sale?.totalAmount ??
        sale?.amount ??
        0
    ) || 0;

};


/*
============================================================
GET SALE DATE
============================================================
*/

const getSaleDate = (
    sale
) => {

    const value =
        sale?.createdAt ||
        sale?.date ||
        sale?.saleDate ||
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
IS SAME LOCAL DAY
============================================================
*/

const isToday = (
    date
) => {

    if (!date) {

        return false;

    }


    const now =
        new Date();


    return (
        date.getFullYear() ===
            now.getFullYear() &&
        date.getMonth() ===
            now.getMonth() &&
        date.getDate() ===
            now.getDate()
    );

};


/*
============================================================
GREETING
============================================================
*/

const getGreeting = () => {

    const hour =
        new Date().getHours();


    if (
        hour < 12
    ) {

        return "Good morning";

    }


    if (
        hour < 18
    ) {

        return "Good afternoon";

    }


    return "Good evening";

};


/*
============================================================
CURRENT DATE LABEL
============================================================
*/

const getCurrentDateLabel = () => {

    return new Intl.DateTimeFormat(
        "en-PH",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        }
    ).format(
        new Date()
    );

};


/*
============================================================
CURRENT TIME LABEL
============================================================
*/

const getCurrentTimeLabel = () => {

    return new Intl.DateTimeFormat(
        "en-PH",
        {
            hour: "numeric",
            minute: "2-digit",
        }
    ).format(
        new Date()
    );

};


/*
============================================================
DASHBOARD PAGE
============================================================
*/

function DashboardPage() {

    /*
    ========================================================
    STORES
    ========================================================
    */

    const {
        dashboard,
        loading,
        fetchDashboard,
    } = useDashboardStore();


    const {
        sales,
        fetchSales,
    } = useSaleStore();


    /*
    ========================================================
    LOCAL STATE
    ========================================================
    */

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);


    const [
        currentTime,
        setCurrentTime,
    ] = useState(
        getCurrentTimeLabel()
    );


    /*
    ========================================================
    LOAD DATA
    ========================================================
    */

    const loadDashboard =
        useCallback(
            async (
                manual = false
            ) => {

                try {

                    if (
                        manual
                    ) {

                        setRefreshing(
                            true
                        );

                    }


                    await Promise.all([
                        fetchDashboard(),
                        fetchSales(),
                    ]);


                } catch (error) {

                    console.error(
                        "Failed to refresh dashboard:",
                        error
                    );


                } finally {

                    if (
                        manual
                    ) {

                        setRefreshing(
                            false
                        );

                    }

                }

            },
            [
                fetchDashboard,
                fetchSales,
            ]
        );


    useEffect(
        () => {

            loadDashboard();

        },
        [
            loadDashboard,
        ]
    );


    /*
    ========================================================
    UPDATE CLOCK
    ========================================================
    */

    useEffect(
        () => {

            const interval =
                setInterval(
                    () => {

                        setCurrentTime(
                            getCurrentTimeLabel()
                        );

                    },
                    30000
                );


            return () => {

                clearInterval(
                    interval
                );

            };

        },
        []
    );


    /*
    ========================================================
    SAFE DASHBOARD DATA
    ========================================================
    */

    const todayRevenue =
        Number(
            dashboard?.todayRevenue
        ) || 0;


    const todayTransactions =
        Number(
            dashboard?.todayTransactions
        ) || 0;


    const todayItemsSold =
        Number(
            dashboard?.todayItemsSold
        ) || 0;


    const averageSale =
        Number(
            dashboard?.averageSale
        ) || 0;


    const lowStock =
        Array.isArray(
            dashboard?.lowStock
        )
            ? dashboard.lowStock
            : [];


    const bestSellers =
        Array.isArray(
            dashboard?.bestSellers
        )
            ? dashboard.bestSellers
            : [];


    const safeSales =
        Array.isArray(
            sales
        )
            ? sales
            : [];


    /*
    ========================================================
    TODAY SALES
    ========================================================
    */

    const todaysSales =
        useMemo(
            () => {

                return safeSales.filter(
                    (
                        sale
                    ) => {

                        const date =
                            getSaleDate(
                                sale
                            );


                        return isToday(
                            date
                        );

                    }
                );

            },
            [
                safeSales,
            ]
        );


    /*
    ========================================================
    HOURLY SALES CHART
    ========================================================

    Creates groups:

    6 AM
    8 AM
    10 AM
    12 PM
    2 PM
    4 PM
    6 PM
    8 PM

    Revenue from actual sales is assigned to the nearest
    2-hour range.
    ========================================================
    */

    const hourlySales =
        useMemo(
            () => {

                const buckets = [
                    {
                        hour: 6,
                        label: "6 AM",
                        revenue: 0,
                    },
                    {
                        hour: 8,
                        label: "8 AM",
                        revenue: 0,
                    },
                    {
                        hour: 10,
                        label: "10 AM",
                        revenue: 0,
                    },
                    {
                        hour: 12,
                        label: "12 PM",
                        revenue: 0,
                    },
                    {
                        hour: 14,
                        label: "2 PM",
                        revenue: 0,
                    },
                    {
                        hour: 16,
                        label: "4 PM",
                        revenue: 0,
                    },
                    {
                        hour: 18,
                        label: "6 PM",
                        revenue: 0,
                    },
                    {
                        hour: 20,
                        label: "8 PM",
                        revenue: 0,
                    },
                ];


                for (
                    const sale
                    of todaysSales
                ) {

                    const date =
                        getSaleDate(
                            sale
                        );


                    if (!date) {

                        continue;

                    }


                    const hour =
                        date.getHours();


                    /*
                    Store hours before 6 AM in first bucket.
                    Store hours after 8 PM in last bucket.
                    */

                    let bucketIndex =
                        Math.floor(
                            (
                                hour -
                                6
                            ) /
                            2
                        );


                    bucketIndex =
                        Math.max(
                            0,
                            Math.min(
                                buckets.length -
                                    1,
                                bucketIndex
                            )
                        );


                    buckets[
                        bucketIndex
                    ].revenue +=
                        getSaleTotal(
                            sale
                        );

                }


                return buckets;

            },
            [
                todaysSales,
            ]
        );


    /*
    ========================================================
    MAX CHART VALUE
    ========================================================
    */

    const maxHourlyRevenue =
        useMemo(
            () => {

                const highest =
                    Math.max(
                        ...hourlySales.map(
                            (
                                item
                            ) =>
                                item.revenue
                        ),
                        0
                    );


                return (
                    highest > 0
                        ? highest
                        : 1
                );

            },
            [
                hourlySales,
            ]
        );


    /*
    ========================================================
    RECENT SALES
    ========================================================
    */

    const recentSales =
        useMemo(
            () => {

                return [
                    ...safeSales,
                ]
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            const dateA =
                                getSaleDate(
                                    a
                                );


                            const dateB =
                                getSaleDate(
                                    b
                                );


                            return (
                                (
                                    dateB?.getTime() ||
                                    0
                                ) -
                                (
                                    dateA?.getTime() ||
                                    0
                                )
                            );

                        }
                    )
                    .slice(
                        0,
                        5
                    );

            },
            [
                safeSales,
            ]
        );


    /*
    ========================================================
    INITIAL LOADING
    ========================================================
    */

    if (
        loading &&
        !dashboard
    ) {

        return (

            <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                    <span className="loading loading-spinner loading-lg text-primary" />


                    <p className="mt-3 text-sm text-base-content/50">
                        Loading dashboard...
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

        <div className="w-full space-y-6 pb-8">


            {/* ==================================================
                HEADER
            ================================================== */}

            <div
                className="
                    flex
                    flex-col
                    gap-4
                    xl:flex-row
                    xl:items-center
                    xl:justify-between
                "
            >

                <div>

                    <h1 className="text-2xl font-bold">

                        {getGreeting()}, Administrator!

                    </h1>


                    <div
                        className="
                            mt-2
                            flex
                            flex-wrap
                            items-center
                            gap-x-4
                            gap-y-1
                            text-xs
                            text-base-content/50
                        "
                    >

                        <span className="flex items-center gap-1.5">

                            <FaCalendarDay />

                            {getCurrentDateLabel()}

                        </span>


                        <span className="flex items-center gap-1.5">

                            <FaClock />

                            {currentTime}

                        </span>

                    </div>

                </div>


                <div className="flex items-center gap-2">

                    <Link
                        to="/pos"
                        className="btn btn-primary btn-sm"
                    >

                        <FaShoppingCart />

                        New Sale

                    </Link>


                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={
                            refreshing ||
                            loading
                        }
                        onClick={() =>
                            loadDashboard(
                                true
                            )
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

                </div>

            </div>


            {/* ==================================================
                KPI CARDS
            ================================================== */}

            <div
                className="
                    grid
                    grid-cols-1
                    gap-4
                    sm:grid-cols-2
                    xl:grid-cols-4
                "
            >

                <KpiCard
                    title="Today's Revenue"
                    value={
                        formatMoney(
                            todayRevenue
                        )
                    }
                    description="Total sales collected today"
                    icon={
                        FaChartLine
                    }
                    iconClass="bg-purple-100 text-purple-600"
                />


                <KpiCard
                    title="Transactions"
                    value={
                        formatNumber(
                            todayTransactions
                        )
                    }
                    description="Completed sales today"
                    icon={
                        FaShoppingCart
                    }
                    iconClass="bg-blue-100 text-blue-600"
                />


                <KpiCard
                    title="Items Sold"
                    value={
                        formatNumber(
                            todayItemsSold
                        )
                    }
                    description="Units sold today"
                    icon={
                        FaBoxOpen
                    }
                    iconClass="bg-green-100 text-green-600"
                />


                <KpiCard
                    title="Average Sale"
                    value={
                        formatMoney(
                            averageSale
                        )
                    }
                    description="Average transaction value"
                    icon={
                        FaMoneyBillWave
                    }
                    iconClass="bg-orange-100 text-orange-600"
                />

            </div>


            {/* ==================================================
                SALES OVERVIEW + QUICK ACTIONS
            ================================================== */}

            <div
                className="
                    grid
                    grid-cols-1
                    gap-4
                    xl:grid-cols-3
                "
            >


                {/* ==================================================
                    SALES OVERVIEW
                ================================================== */}

                <div
                    className="
                        xl:col-span-2
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
                            gap-2
                            border-b
                            border-base-200
                            p-5
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                        "
                    >

                        <div>

                            <h2 className="font-bold">
                                Today's Sales Overview
                            </h2>


                            <p className="mt-1 text-xs text-base-content/50">
                                Revenue activity throughout the day
                            </p>

                        </div>


                        <div className="text-right">

                            <div className="text-xl font-bold">

                                {
                                    formatMoney(
                                        todayRevenue
                                    )
                                }

                            </div>


                            <div className="text-xs text-base-content/50">

                                {
                                    todayTransactions
                                } transaction
                                {
                                    todayTransactions !==
                                    1
                                        ? "s"
                                        : ""
                                }

                            </div>

                        </div>

                    </div>


                    <div className="p-5">

                        {todaysSales.length ===
                            0 ? (

                            <div
                                className="
                                    flex
                                    h-[260px]
                                    flex-col
                                    items-center
                                    justify-center
                                    text-center
                                "
                            >

                                <FaChartBar className="text-4xl text-base-content/15" />


                                <h3 className="mt-3 font-semibold">
                                    No sales yet today
                                </h3>


                                <p className="mt-1 text-xs text-base-content/50">
                                    Sales activity will appear here after the first transaction.
                                </p>


                                <Link
                                    to="/pos"
                                    className="btn btn-primary btn-sm mt-4"
                                >
                                    Start a Sale
                                </Link>

                            </div>

                        ) : (

                            <div>

                                {/* CHART */}

                                <div
                                    className="
                                        flex
                                        h-[220px]
                                        items-end
                                        gap-2
                                        border-b
                                        border-base-200
                                        px-1
                                    "
                                >

                                    {hourlySales.map(
                                        (
                                            item
                                        ) => {

                                            const percentage =
                                                item.revenue >
                                                0
                                                    ? Math.max(
                                                        (
                                                            item.revenue /
                                                            maxHourlyRevenue
                                                        ) *
                                                        100,
                                                        5
                                                    )
                                                    : 2;


                                            return (

                                                <div
                                                    key={
                                                        item.hour
                                                    }
                                                    className="
                                                        group
                                                        relative
                                                        flex
                                                        h-full
                                                        flex-1
                                                        items-end
                                                    "
                                                >

                                                    {/* TOOLTIP */}

                                                    <div
                                                        className="
                                                            pointer-events-none
                                                            absolute
                                                            left-1/2
                                                            z-10
                                                            hidden
                                                            -translate-x-1/2
                                                            rounded-md
                                                            bg-neutral
                                                            px-2
                                                            py-1
                                                            text-[10px]
                                                            whitespace-nowrap
                                                            text-neutral-content
                                                            shadow-lg
                                                            group-hover:block
                                                        "
                                                        style={{
                                                            bottom:
                                                                `${Math.min(
                                                                    percentage +
                                                                        8,
                                                                    90
                                                                )}%`,
                                                        }}
                                                    >

                                                        {
                                                            formatMoney(
                                                                item.revenue
                                                            )
                                                        }

                                                    </div>


                                                    <div
                                                        className="
                                                            w-full
                                                            rounded-t-md
                                                            bg-primary
                                                            transition-all
                                                            duration-300
                                                            group-hover:opacity-80
                                                        "
                                                        style={{
                                                            height:
                                                                `${percentage}%`,
                                                        }}
                                                    />

                                                </div>

                                            );

                                        }
                                    )}

                                </div>


                                {/* LABELS */}

                                <div
                                    className="
                                        mt-2
                                        grid
                                        grid-cols-8
                                        gap-2
                                        text-center
                                        text-[9px]
                                        text-base-content/45
                                    "
                                >

                                    {hourlySales.map(
                                        (
                                            item
                                        ) => (

                                            <span
                                                key={
                                                    item.hour
                                                }
                                            >

                                                {
                                                    item.label
                                                }

                                            </span>

                                        )
                                    )}

                                </div>


                                {/* CHART FOOTER */}

                                <div
                                    className="
                                        mt-5
                                        flex
                                        flex-wrap
                                        items-center
                                        justify-between
                                        gap-3
                                    "
                                >

                                    <div className="text-xs text-base-content/50">

                                        Based on today's recorded sales.

                                    </div>


                                    <Link
                                        to="/sales"
                                        className="
                                            flex
                                            items-center
                                            gap-1
                                            text-xs
                                            font-semibold
                                            text-primary
                                            hover:underline
                                        "
                                    >

                                        View Sales

                                        <FaArrowRight />

                                    </Link>

                                </div>

                            </div>

                        )}

                    </div>

                </div>


                {/* ==================================================
                    QUICK ACTIONS
                ================================================== */}

                <div
                    className="
                        rounded-xl
                        border
                        border-base-300
                        bg-base-100
                        shadow-sm
                    "
                >

                    <div className="border-b border-base-200 p-5">

                        <h2 className="font-bold">
                            Quick Actions
                        </h2>


                        <p className="mt-1 text-xs text-base-content/50">
                            Common store operations
                        </p>

                    </div>


                    <div className="grid grid-cols-2 gap-3 p-4">

                        <QuickAction
                            to="/pos"
                            icon={
                                FaShoppingCart
                            }
                            title="New Sale"
                            description="Open POS"
                        />


                        <QuickAction
                            to="/products"
                            icon={
                                FaPlus
                            }
                            title="Products"
                            description="Manage items"
                        />


                        <QuickAction
                            to="/inventory"
                            icon={
                                FaWarehouse
                            }
                            title="Inventory"
                            description="Manage stock"
                        />


                        <QuickAction
                            to="/sales"
                            icon={
                                FaReceipt
                            }
                            title="Sales"
                            description="Sale history"
                        />


                        <QuickAction
                            to="/ledger"
                            icon={
                                FaBook
                            }
                            title="Ledger"
                            description="Credit accounts"
                        />


                        <QuickAction
                            to="/workers"
                            icon={
                                FaUserTie
                            }
                            title="Workers"
                            description="Salary & payroll"
                        />

                    </div>

                </div>

            </div>


            {/* ==================================================
                LOW STOCK + BEST SELLERS
            ================================================== */}

            <div
                className="
                    grid
                    grid-cols-1
                    gap-4
                    xl:grid-cols-2
                "
            >


                {/* ==================================================
                    LOW STOCK
                ================================================== */}

                <DashboardPanel
                    title="Low Stock Products"
                    description="Products that may need restocking"
                    icon={
                        <FaExclamationTriangle className="text-error" />
                    }
                    link="/inventory"
                    linkText="Open Inventory"
                >

                    {lowStock.length ===
                        0 ? (

                        <EmptyState
                            icon={
                                FaWarehouse
                            }
                            title="Stock levels look good"
                            description="No products currently need restocking."
                        />

                    ) : (

                        <div className="divide-y divide-base-200">

                            {lowStock
                                .slice(
                                    0,
                                    6
                                )
                                .map(
                                    (
                                        product
                                    ) => (

                                        <div
                                            key={
                                                product._id ||
                                                product.id
                                            }
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                                gap-4
                                                py-3
                                            "
                                        >

                                            <div className="min-w-0">

                                                <div className="truncate text-sm font-semibold">

                                                    {
                                                        product.name
                                                    }

                                                </div>


                                                <div className="mt-1 text-xs text-base-content/50">

                                                    Available stock

                                                </div>

                                            </div>


                                            <div className="text-right">

                                                <span className="badge badge-error badge-outline">

                                                    {
                                                        formatNumber(
                                                            product.stock
                                                        )
                                                    } left

                                                </span>

                                            </div>

                                        </div>

                                    )
                                )}

                        </div>

                    )}

                </DashboardPanel>


                {/* ==================================================
                    BEST SELLERS
                ================================================== */}

                <DashboardPanel
                    title="Best Sellers"
                    description="Top-selling products"
                    icon={
                        <FaChartLine className="text-primary" />
                    }
                    link="/reports/products"
                    linkText="Product Report"
                >

                    {bestSellers.length ===
                        0 ? (

                        <EmptyState
                            icon={
                                FaChartLine
                            }
                            title="No sales ranking yet"
                            description="Best-selling products will appear here."
                        />

                    ) : (

                        <div className="divide-y divide-base-200">

                            {bestSellers
                                .slice(
                                    0,
                                    6
                                )
                                .map(
                                    (
                                        item,
                                        index
                                    ) => (

                                        <div
                                            key={
                                                item._id ||
                                                item.id ||
                                                `${item.name}-${index}`
                                            }
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                                gap-4
                                                py-3
                                            "
                                        >

                                            <div className="flex min-w-0 items-center gap-3">

                                                <div
                                                    className="
                                                        flex
                                                        h-8
                                                        w-8
                                                        shrink-0
                                                        items-center
                                                        justify-center
                                                        rounded-full
                                                        bg-primary/10
                                                        text-xs
                                                        font-bold
                                                        text-primary
                                                    "
                                                >

                                                    {
                                                        index +
                                                        1
                                                    }

                                                </div>


                                                <div className="min-w-0">

                                                    <div className="truncate text-sm font-semibold">

                                                        {
                                                            item.name ||
                                                            "Product"
                                                        }

                                                    </div>


                                                    <div className="mt-1 text-xs text-base-content/50">

                                                        Units sold

                                                    </div>

                                                </div>

                                            </div>


                                            <div className="font-bold text-primary">

                                                {
                                                    formatNumber(
                                                        item.quantitySold
                                                    )
                                                }

                                            </div>

                                        </div>

                                    )
                                )}

                        </div>

                    )}

                </DashboardPanel>

            </div>


            {/* ==================================================
                RECENT TRANSACTIONS
            ================================================== */}

            <div
                className="
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
                        items-center
                        justify-between
                        gap-4
                        border-b
                        border-base-200
                        p-5
                    "
                >

                    <div>

                        <div className="flex items-center gap-2">

                            <FaReceipt className="text-primary" />


                            <h2 className="font-bold">
                                Recent Transactions
                            </h2>

                        </div>


                        <p className="mt-1 text-xs text-base-content/50">
                            Latest completed sales
                        </p>

                    </div>


                    <Link
                        to="/sales"
                        className="btn btn-sm btn-ghost"
                    >

                        View All

                        <FaArrowRight />

                    </Link>

                </div>


                <div className="p-4">

                    {recentSales.length ===
                        0 ? (

                        <EmptyState
                            icon={
                                FaReceipt
                            }
                            title="No transactions yet"
                            description="Your latest sales will appear here."
                        />

                    ) : (

                        <RecentTransactions
                            sales={
                                recentSales
                            }
                        />

                    )}

                </div>

            </div>

        </div>

    );

}


/*
============================================================
KPI CARD
============================================================
*/

function KpiCard({
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

            <div className="flex items-start justify-between gap-4">

                <div>

                    <p className="text-xs font-medium text-base-content/55">

                        {title}

                    </p>


                    <h2 className="mt-2 text-2xl font-bold">

                        {value}

                    </h2>

                </div>


                <div
                    className={`
                        flex
                        h-11
                        w-11
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


            <p className="mt-3 text-xs text-base-content/45">

                {description}

            </p>

        </div>

    );

}


/*
============================================================
QUICK ACTION
============================================================
*/

function QuickAction({
    to,
    icon: Icon,
    title,
    description,
}) {

    return (

        <Link
            to={
                to
            }
            className="
                group
                rounded-xl
                border
                border-base-200
                p-4
                transition
                hover:border-primary/40
                hover:bg-primary/5
                hover:shadow-sm
            "
        >

            <div
                className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-primary/10
                    text-primary
                    transition
                    group-hover:bg-primary
                    group-hover:text-primary-content
                "
            >

                <Icon />

            </div>


            <div className="mt-3 text-sm font-semibold">

                {title}

            </div>


            <div className="mt-1 text-[11px] text-base-content/50">

                {description}

            </div>

        </Link>

    );

}


/*
============================================================
DASHBOARD PANEL
============================================================
*/

function DashboardPanel({
    title,
    description,
    icon,
    link,
    linkText,
    children,
}) {

    return (

        <div
            className="
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
                    items-center
                    justify-between
                    gap-4
                    border-b
                    border-base-200
                    p-5
                "
            >

                <div>

                    <div className="flex items-center gap-2">

                        {icon}


                        <h2 className="font-bold">

                            {title}

                        </h2>

                    </div>


                    <p className="mt-1 text-xs text-base-content/50">

                        {description}

                    </p>

                </div>


                {link && (

                    <Link
                        to={
                            link
                        }
                        className="
                            hidden
                            items-center
                            gap-1
                            text-xs
                            font-semibold
                            text-primary
                            hover:underline
                            sm:flex
                        "
                    >

                        {linkText}

                        <FaArrowRight />

                    </Link>

                )}

            </div>


            <div className="px-5 py-2">

                {children}

            </div>

        </div>

    );

}


/*
============================================================
EMPTY STATE
============================================================
*/

function EmptyState({
    icon: Icon,
    title,
    description,
}) {

    return (

        <div className="py-10 text-center">

            <Icon className="mx-auto text-3xl text-base-content/15" />


            <h3 className="mt-3 text-sm font-semibold">

                {title}

            </h3>


            <p className="mt-1 text-xs text-base-content/45">

                {description}

            </p>

        </div>

    );

}


export default DashboardPage;