import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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


/*
==========================================================
SALES REPORT PAGE
==========================================================

Current functionality:

1. Today
   - Hourly sales

2. Yesterday
   - Hourly sales

3. This Week
   - Daily sales

4. This Month
   - Daily sales

5. This Year
   - Monthly sales

6. Dynamic summary cards

7. Dynamic best period

8. Responsive Recharts graph

9. Sales tooltip

10. Sales breakdown table

11. Sales highlights

12. Export button placeholder

13. Back to Reports navigation

The data below is temporary sample data.

Later we will replace it with data from:

GET /sales

==========================================================
*/


function SalesReportPage() {

    const navigate = useNavigate();


    /*
    ======================================================
    PERIOD STATE
    ======================================================
    */

    const [period, setPeriod] = useState("This Week");


    /*
    ======================================================
    SAMPLE DATA
    ======================================================
    */

    const reportData = {

        Today: [
            {
                label: "8 AM",
                sales: 320,
                transactions: 3,
            },
            {
                label: "9 AM",
                sales: 480,
                transactions: 5,
            },
            {
                label: "10 AM",
                sales: 610,
                transactions: 7,
            },
            {
                label: "11 AM",
                sales: 420,
                transactions: 4,
            },
            {
                label: "12 PM",
                sales: 780,
                transactions: 8,
            },
            {
                label: "1 PM",
                sales: 520,
                transactions: 5,
            },
            {
                label: "2 PM",
                sales: 690,
                transactions: 6,
            },
            {
                label: "3 PM",
                sales: 850,
                transactions: 9,
            },
            {
                label: "4 PM",
                sales: 920,
                transactions: 10,
            },
            {
                label: "5 PM",
                sales: 1180,
                transactions: 12,
            },
            {
                label: "6 PM",
                sales: 960,
                transactions: 9,
            },
            {
                label: "7 PM",
                sales: 720,
                transactions: 7,
            },
            {
                label: "8 PM",
                sales: 540,
                transactions: 5,
            },
        ],


        Yesterday: [
            {
                label: "8 AM",
                sales: 280,
                transactions: 3,
            },
            {
                label: "9 AM",
                sales: 410,
                transactions: 4,
            },
            {
                label: "10 AM",
                sales: 530,
                transactions: 6,
            },
            {
                label: "11 AM",
                sales: 390,
                transactions: 4,
            },
            {
                label: "12 PM",
                sales: 710,
                transactions: 7,
            },
            {
                label: "1 PM",
                sales: 580,
                transactions: 6,
            },
            {
                label: "2 PM",
                sales: 640,
                transactions: 6,
            },
            {
                label: "3 PM",
                sales: 790,
                transactions: 8,
            },
            {
                label: "4 PM",
                sales: 870,
                transactions: 9,
            },
            {
                label: "5 PM",
                sales: 1050,
                transactions: 11,
            },
            {
                label: "6 PM",
                sales: 900,
                transactions: 9,
            },
            {
                label: "7 PM",
                sales: 680,
                transactions: 7,
            },
            {
                label: "8 PM",
                sales: 460,
                transactions: 4,
            },
        ],


        "This Week": [
            {
                label: "Mon",
                sales: 3200,
                transactions: 24,
            },
            {
                label: "Tue",
                sales: 4100,
                transactions: 31,
            },
            {
                label: "Wed",
                sales: 2800,
                transactions: 21,
            },
            {
                label: "Thu",
                sales: 5200,
                transactions: 39,
            },
            {
                label: "Fri",
                sales: 4900,
                transactions: 36,
            },
            {
                label: "Sat",
                sales: 6100,
                transactions: 45,
            },
            {
                label: "Sun",
                sales: 3280,
                transactions: 28,
            },
        ],


        "This Month": [
            {
                label: "Aug 1",
                sales: 3100,
                transactions: 25,
            },
            {
                label: "Aug 2",
                sales: 2800,
                transactions: 22,
            },
            {
                label: "Aug 3",
                sales: 3900,
                transactions: 30,
            },
            {
                label: "Aug 4",
                sales: 4200,
                transactions: 33,
            },
            {
                label: "Aug 5",
                sales: 3600,
                transactions: 28,
            },
            {
                label: "Aug 6",
                sales: 4700,
                transactions: 36,
            },
            {
                label: "Aug 7",
                sales: 5100,
                transactions: 40,
            },
            {
                label: "Aug 8",
                sales: 4500,
                transactions: 35,
            },
            {
                label: "Aug 9",
                sales: 3800,
                transactions: 30,
            },
            {
                label: "Aug 10",
                sales: 5200,
                transactions: 41,
            },
            {
                label: "Aug 11",
                sales: 4800,
                transactions: 37,
            },
            {
                label: "Aug 12",
                sales: 5400,
                transactions: 42,
            },
            {
                label: "Aug 13",
                sales: 5900,
                transactions: 45,
            },
            {
                label: "Aug 14",
                sales: 6200,
                transactions: 48,
            },
        ],


        "This Year": [
            {
                label: "Jan",
                sales: 82400,
                transactions: 620,
            },
            {
                label: "Feb",
                sales: 91200,
                transactions: 690,
            },
            {
                label: "Mar",
                sales: 97800,
                transactions: 730,
            },
            {
                label: "Apr",
                sales: 103500,
                transactions: 780,
            },
            {
                label: "May",
                sales: 112300,
                transactions: 840,
            },
            {
                label: "Jun",
                sales: 108900,
                transactions: 810,
            },
            {
                label: "Jul",
                sales: 124600,
                transactions: 930,
            },
            {
                label: "Aug",
                sales: 98400,
                transactions: 742,
            },
            {
                label: "Sep",
                sales: 115800,
                transactions: 870,
            },
            {
                label: "Oct",
                sales: 121400,
                transactions: 910,
            },
            {
                label: "Nov",
                sales: 138200,
                transactions: 1020,
            },
            {
                label: "Dec",
                sales: 154200,
                transactions: 1140,
            },
        ],

    };


    /*
    ======================================================
    CURRENT DATA
    ======================================================
    */

    const currentData = reportData[period] || [];


    /*
    ======================================================
    FORMAT CURRENCY
    ======================================================
    */

    const formatCurrency = (value) => {

        const number = Number(value) || 0;

        return `₱${number.toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        )}`;

    };


    /*
    ======================================================
    SUMMARY CALCULATIONS
    ======================================================
    */

    const summary = useMemo(() => {

        const totalSales = currentData.reduce(
            (sum, item) => {
                return sum + Number(item.sales || 0);
            },
            0
        );


        const transactions = currentData.reduce(
            (sum, item) => {
                return sum + Number(
                    item.transactions || 0
                );
            },
            0
        );


        const averageSale =
            transactions > 0
                ? totalSales / transactions
                : 0;


        let bestPeriod = null;


        currentData.forEach((item) => {

            if (!bestPeriod) {

                bestPeriod = item;

                return;
            }


            if (
                Number(item.sales) >
                Number(bestPeriod.sales)
            ) {

                bestPeriod = item;

            }

        });


        return {
            totalSales,
            transactions,
            averageSale,
            bestPeriod,
        };

    }, [currentData]);


    /*
    ======================================================
    SAMPLE ITEMS SOLD
    ======================================================

    Later this will be calculated from actual
    sale item quantities.
    */

    const itemsSold = Math.round(
        summary.transactions * 1.74
    );


    /*
    ======================================================
    SAMPLE DISCOUNT DATA
    ======================================================
    */

    const discounts = useMemo(() => {

        return Math.round(
            summary.totalSales * 0.05
        );

    }, [summary.totalSales]);


    /*
    ======================================================
    SAMPLE REFUND DATA
    ======================================================
    */

    const refunds = useMemo(() => {

        return Math.round(
            summary.totalSales * 0.015
        );

    }, [summary.totalSales]);


    /*
    ======================================================
    SAMPLE VOID DATA
    ======================================================
    */

    const voidAmount = useMemo(() => {

        return Math.round(
            summary.totalSales * 0.005
        );

    }, [summary.totalSales]);


    /*
    ======================================================
    AVERAGE ITEMS PER SALE
    ======================================================
    */

    const averageItemsPerSale =
        summary.transactions > 0
            ? itemsSold / summary.transactions
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

    };


    /*
    ======================================================
    BEST PERIOD TYPE
    ======================================================
    */

    const bestPeriodType =
        period === "Today" ||
        period === "Yesterday"
            ? "Best Hour"
            : period === "This Year"
                ? "Best Month"
                : "Best Day";


    /*
    ======================================================
    CHART COLORS
    ======================================================
    */

    const chartColor = "#4f46e5";


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
            payload.length === 0
        ) {
            return null;
        }


        const data = payload[0]?.payload;


        return (
            <div className="bg-base-100 border border-base-300 rounded-lg shadow-xl p-3 min-w-[170px]">

                <p className="text-xs text-base-content/50 mb-2">
                    {label}
                </p>


                <div className="flex items-center justify-between gap-5">

                    <div className="flex items-center gap-2">

                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                                backgroundColor:
                                    chartColor,
                            }}
                        />

                        <span className="text-xs">
                            Sales
                        </span>

                    </div>


                    <span className="font-bold text-sm">
                        {formatCurrency(
                            data?.sales || 0
                        )}
                    </span>

                </div>


                <div className="flex items-center justify-between mt-2">

                    <span className="text-xs text-base-content/50">
                        Transactions
                    </span>

                    <span className="text-xs font-semibold">
                        {data?.transactions || 0}
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

    const handlePeriodChange = (event) => {

        setPeriod(event.target.value);

    };


    /*
    ======================================================
    HANDLE EXPORT
    ======================================================

    Placeholder for now.
    Later this can generate CSV/PDF.
    */

    const handleExport = () => {

        alert(
            "Sales report export will be connected to the report API next."
        );

    };


    /*
    ======================================================
    HANDLE BACK
    ======================================================
    */

    const handleBack = () => {

        navigate("/reports");

    };


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

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div>

                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center gap-2 text-sm text-base-content/50 hover:text-primary transition mb-2"
                    >

                        <FaArrowLeft />

                        <span>
                            Back to Reports
                        </span>

                    </button>


                    <div className="flex items-center gap-3">

                        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">

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

                <div className="flex items-center gap-2">

                    <select
                        value={period}
                        onChange={handlePeriodChange}
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

                    </select>


                    <button
                        type="button"
                        onClick={handleExport}
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
                CURRENT PERIOD INDICATOR
            ================================================== */}

            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">

                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                    {period === "Today" ||
                    period === "Yesterday" ? (
                        <FaClock />
                    ) : (
                        <FaCalendarDay />
                    )}

                </div>


                <div>

                    <p className="text-sm font-semibold">
                        {period}
                    </p>

                    <p className="text-xs text-base-content/50">
                        {periodDescription[period]}
                    </p>

                </div>

            </div>


            {/* ==================================================
                SUMMARY CARDS
            ================================================== */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">


                {/* TOTAL SALES */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Total Sales
                        </span>


                        <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center">

                            <FaMoneyBillWave />

                        </div>

                    </div>


                    <p className="text-xl font-bold mt-3">
                        {formatCurrency(
                            summary.totalSales
                        )}
                    </p>


                    <p className="text-[10px] text-success mt-1">
                        Gross sales revenue
                    </p>

                </div>


                {/* TRANSACTIONS */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Transactions
                        </span>


                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                            <FaReceipt />

                        </div>

                    </div>


                    <p className="text-xl font-bold mt-3">
                        {summary.transactions.toLocaleString()}
                    </p>


                    <p className="text-[10px] text-base-content/50 mt-1">
                        Completed transactions
                    </p>

                </div>


                {/* ITEMS SOLD */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Items Sold
                        </span>


                        <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center">

                            <FaShoppingCart />

                        </div>

                    </div>


                    <p className="text-xl font-bold mt-3">
                        {itemsSold.toLocaleString()}
                    </p>


                    <p className="text-[10px] text-base-content/50 mt-1">
                        Total quantity sold
                    </p>

                </div>


                {/* AVERAGE SALE */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center justify-between">

                        <span className="text-xs text-base-content/50">
                            Average Sale
                        </span>


                        <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">

                            <FaChartLine />

                        </div>

                    </div>


                    <p className="text-xl font-bold mt-3">
                        {formatCurrency(
                            summary.averageSale
                        )}
                    </p>


                    <p className="text-[10px] text-base-content/50 mt-1">
                        Average transaction value
                    </p>

                </div>

            </div>


            {/* ==================================================
                SECONDARY SUMMARY
            ================================================== */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">


                {/* DISCOUNTS */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">

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

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center">

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

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-lg bg-base-200 text-base-content/60 flex items-center justify-center">

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

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center">

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

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm p-5">


                {/* GRAPH HEADER */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

                    <div>

                        <h2 className="font-bold text-base">
                            Sales Revenue
                        </h2>


                        <p className="text-xs text-base-content/50 mt-1">
                            {periodDescription[period]}
                        </p>

                    </div>


                    {/* LEGEND */}

                    <div className="flex items-center gap-2 text-xs text-base-content/60">

                        <span
                            className="w-3 h-3 rounded-full"
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

                <div className="w-full h-80">

                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >

                        <BarChart
                            data={currentData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 5,
                            }}
                        >

                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                opacity={0.2}
                            />


                            <XAxis
                                dataKey="label"
                                tick={{
                                    fontSize: 11,
                                }}
                                tickLine={false}
                                axisLine={false}
                            />


                            <YAxis
                                tick={{
                                    fontSize: 11,
                                }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => {

                                    if (
                                        Number(value) >=
                                        1000
                                    ) {

                                        return `₱${(
                                            Number(value) /
                                            1000
                                        ).toFixed(0)}k`;

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
                                fill={chartColor}
                                radius={[
                                    5,
                                    5,
                                    0,
                                    0,
                                ]}
                                maxBarSize={42}
                            />

                        </BarChart>

                    </ResponsiveContainer>

                </div>

            </div>


            {/* ==================================================
                SALES HIGHLIGHTS
            ================================================== */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">


                {/* BEST PERIOD */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">
                                {bestPeriodType}
                            </p>


                            <p className="text-xl font-bold mt-2">
                                {summary.bestPeriod?.label ||
                                    "-"}
                            </p>

                        </div>


                        <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">

                            <FaTrophy />

                        </div>

                    </div>


                    <p className="text-sm text-success font-semibold mt-3">
                        {formatCurrency(
                            summary.bestPeriod?.sales ||
                            0
                        )}
                    </p>


                    <p className="text-xs text-base-content/50 mt-1">
                        Highest sales during this period
                    </p>

                </div>


                {/* BEST PERIOD TRANSACTIONS */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">
                                Transactions During Best Period
                            </p>


                            <p className="text-xl font-bold mt-2">
                                {summary.bestPeriod?.transactions ||
                                    0}
                            </p>

                        </div>


                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">

                            <FaReceipt />

                        </div>

                    </div>


                    <p className="text-xs text-base-content/50 mt-3">
                        {summary.bestPeriod?.label ||
                            "-"}
                    </p>

                </div>


                {/* AVERAGE ITEMS */}

                <div className="bg-base-100 border border-base-200 rounded-xl p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">
                                Average Items / Sale
                            </p>


                            <p className="text-xl font-bold mt-2">
                                {averageItemsPerSale.toFixed(
                                    2
                                )}
                            </p>

                        </div>


                        <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center">

                            <FaBoxes />

                        </div>

                    </div>


                    <p className="text-xs text-base-content/50 mt-3">
                        Average quantity per transaction
                    </p>

                </div>

            </div>


            {/* ==================================================
                SALES BREAKDOWN TABLE
            ================================================== */}

            <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-hidden">


                {/* TABLE HEADER */}

                <div className="px-5 py-4 border-b border-base-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

                    <div>

                        <h2 className="font-bold text-base">
                            Sales Breakdown
                        </h2>


                        <p className="text-xs text-base-content/50 mt-1">
                            Detailed sales performance for{" "}
                            {period.toLowerCase()}.
                        </p>

                    </div>


                    <div className="text-xs text-base-content/50">

                        {currentData.length} periods

                    </div>

                </div>


                {/* TABLE */}

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
                                (item) => {

                                    const average =
                                        item.transactions >
                                        0
                                            ? item.sales /
                                              item.transactions
                                            : 0;


                                    const salesShare =
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
                                            key={
                                                item.label
                                            }
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

                                                <span className="badge badge-sm badge-ghost">

                                                    {salesShare.toFixed(
                                                        1
                                                    )}
                                                    %

                                                </span>

                                            </td>

                                        </tr>

                                    );

                                }
                            )}

                        </tbody>


                        {/* TABLE FOOTER */}

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
                                    100%
                                </th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>


            {/* ==================================================
                REPORT INFORMATION
            ================================================== */}

            <div className="bg-base-100 border border-base-200 rounded-xl p-5 shadow-sm">

                <div className="flex items-start gap-3">

                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">

                        <FaChartLine />

                    </div>


                    <div>

                        <h3 className="font-semibold text-sm">
                            About this report
                        </h3>


                        <p className="text-xs text-base-content/50 mt-1 leading-relaxed">

                            This report summarizes sales activity
                            based on the selected time period.
                            Today and Yesterday are displayed
                            by hour, the weekly and monthly
                            reports are displayed by day, and
                            the yearly report is displayed by
                            month.

                        </p>

                    </div>

                </div>

            </div>


            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="flex items-center justify-between text-xs text-base-content/40 pb-4">

                <span>
                    Showing {period.toLowerCase()} sales
                </span>


                <button
                    type="button"
                    onClick={handleBack}
                    className="hover:text-primary transition"
                >
                    Back to Reports
                </button>

            </div>

        </div>
    );
}


export default SalesReportPage;