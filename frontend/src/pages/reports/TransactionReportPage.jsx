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
    FaReceipt,
    FaMoneyBillWave,
    FaShoppingCart,
    FaUndo,
    FaBan,
    FaSearch,
    FaDownload,
    FaCalendarDay,
    FaEye,
    FaTimes,
    FaCheck,
    FaBuilding,
} from "react-icons/fa";

import useSaleStore from "../../store/sale.store";
import useBranchStore from "../../store/branch.store";

import ReceiptModal from "../../components/pos/ReceiptModal";


/*
============================================================
DATE HELPERS
============================================================
*/

const parseLocalDateString =
    (
        value
    ) => {

        if (
            !value
        ) {

            return null;

        }


        const [
            year,
            month,
            day,
        ] =
            String(
                value
            )
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


const startOfDay =
    (
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


const endOfDay =
    (
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


const startOfWeek =
    (
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


const endOfWeek =
    (
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


const startOfMonth =
    (
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


const endOfMonth =
    (
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


const startOfYear =
    (
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


const endOfYear =
    (
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


/*
============================================================
BRANCH HELPERS
============================================================
*/

const normalizeId =
    (
        value
    ) => {

        if (
            !value
        ) {

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


const sanitizeFilePart =
    (
        value
    ) => {

        return (
            String(
                value ||
                "branch"
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
            "branch"
        );

    };


/*
============================================================
SALE HELPERS
============================================================
*/

const getSaleDate =
    (
        sale
    ) => {

        const value =
            sale?.createdAt ||
            sale?.saleDate ||
            sale?.date;


        if (
            !value
        ) {

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


/*
============================================================
REMAINING ITEM QUANTITY
============================================================

Original quantity minus refunded quantity.
============================================================
*/

const getRemainingQuantity =
    (
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


/*
============================================================
SALE REMAINING QUANTITY
============================================================
*/

const getSaleRemainingQuantity =
    (
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
============================================================
AUTHORITATIVE NET SALE TOTAL
============================================================

Confirmed Sales History semantics:

VOIDED
    -> 0

REFUNDED
    -> 0 when fully refunded

PARTIALLY_REFUNDED
    -> remaining quantity x unit price
       minus discount

COMPLETED
    -> normal net sale

Older REFUNDED sales without item data
also return zero.
============================================================
*/

const getSaleNetTotal =
    (
        sale
    ) => {

        if (
            sale?.status ===
            "VOIDED"
        ) {

            return 0;

        }


        /*
        Compatibility fallback for older sales.
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
                0
            );


        return Math.max(
            netSubtotal -
            discount,
            0
        );

    };


/*
============================================================
ORIGINAL SALE TOTAL
============================================================
*/

const getOriginalSaleTotal =
    (
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


                    const unitPrice =
                        Number(
                            item?.unitPrice ||
                            item?.price ||
                            0
                        );


                    return (
                        sum +
                        quantity *
                        unitPrice
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
============================================================
REFUND AMOUNT
============================================================
*/

const getRefundAmount =
    (
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
            recorded >
                0
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
============================================================
ACTIVE TRANSACTION
============================================================

Confirmed POS semantics:

COMPLETED
    -> counted

PARTIALLY_REFUNDED
    -> counted

REFUNDED
    -> not counted

VOIDED
    -> not counted
============================================================
*/

const isActiveTransaction =
    (
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
============================================================
FORMAT CURRENCY
============================================================
*/

const formatCurrency =
    (
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
            ) ||
            0
        );

    };


/*
============================================================
FORMAT DATE / TIME
============================================================
*/

const formatDateTime =
    (
        value
    ) => {

        if (
            !value
        ) {

            return "—";

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

            return "—";

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
============================================================
TRANSACTION REPORT PAGE
============================================================
*/

function TransactionReportPage() {

    const navigate =
        useNavigate();


    /*
    ========================================================
    SALES STORE
    ========================================================
    */

    const {
        sales,

        loading,

        fetchSales,

        receiptOpen,

        selectedSale,

        openReceipt,

        closeReceipt,
    } =
        useSaleStore();


    /*
    ========================================================
    ACTIVE BRANCH
    ========================================================
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
    ========================================================
    FILTERS
    ========================================================
    */

    const [
        search,
        setSearch,
    ] =
        useState(
            ""
        );


    const [
        period,
        setPeriod,
    ] =
        useState(
            "This Week"
        );


    const [
        statusFilter,
        setStatusFilter,
    ] =
        useState(
            "ALL"
        );


    const [
        paymentFilter,
        setPaymentFilter,
    ] =
        useState(
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
    ] =
        useState(
            false
        );


    const [
        customStartDate,
        setCustomStartDate,
    ] =
        useState(
            ""
        );


    const [
        customEndDate,
        setCustomEndDate,
    ] =
        useState(
            ""
        );


    const [
        appliedStartDate,
        setAppliedStartDate,
    ] =
        useState(
            ""
        );


    const [
        appliedEndDate,
        setAppliedEndDate,
    ] =
        useState(
            ""
        );


    const [
        dateError,
        setDateError,
    ] =
        useState(
            ""
        );


    /*
    ========================================================
    LOAD ACTIVE BRANCH SALES
    ========================================================

    The active branch ID is intentionally
    part of the dependency list.

    Changing the Navbar branch therefore
    reloads the transaction report.

    api.js sends:

        X-Branch-Id: activeBranchId

    The backend remains authoritative for
    branch access and branch filtering.
    ========================================================
    */

    useEffect(
        () => {

            if (
                !activeBranchId
            ) {

                return;

            }


            /*
            Do not leave a receipt from the
            previous branch open after switching.
            */

            if (
                receiptOpen
            ) {

                closeReceipt();

            }


            fetchSales()
                .catch(
                    (
                        error
                    ) => {

                        console.error(
                            "Failed to load transaction report:",
                            error
                        );

                    }
                );

        },
        [
            activeBranchId,
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
                        new Date(
                            now
                        );


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
    FILTER TRANSACTIONS
    ========================================================
    */

    const filteredSales =
        useMemo(
            () => {

                const keyword =
                    search
                        .trim()
                        .toLowerCase();


                return safeSales

                    .filter(
                        (
                            sale
                        ) => {

                            /*
                            ====================================
                            DATE
                            ====================================
                            */

                            if (
                                selectedDateRange
                            ) {

                                const date =
                                    getSaleDate(
                                        sale
                                    );


                                if (
                                    !date ||
                                    date <
                                        selectedDateRange
                                            .start ||
                                    date >
                                        selectedDateRange
                                            .end
                                ) {

                                    return false;

                                }

                            }


                            /*
                            ====================================
                            STATUS
                            ====================================
                            */

                            if (
                                statusFilter !==
                                    "ALL" &&
                                String(
                                    sale?.status ||
                                    ""
                                ) !==
                                    statusFilter
                            ) {

                                return false;

                            }


                            /*
                            ====================================
                            PAYMENT
                            ====================================
                            */

                            if (
                                paymentFilter !==
                                    "ALL" &&
                                String(
                                    sale?.paymentMethod ||
                                    ""
                                ) !==
                                    paymentFilter
                            ) {

                                return false;

                            }


                            /*
                            ====================================
                            SEARCH
                            ====================================
                            */

                            if (
                                keyword
                            ) {

                                const receipt =
                                    String(
                                        sale?.receiptNumber ||
                                        ""
                                    )
                                        .toLowerCase();


                                const cashier =
                                    String(
                                        sale?.cashier
                                            ?.name ||
                                        sale?.cashier
                                            ?.username ||
                                        sale?.cashierName ||
                                        ""
                                    )
                                        .toLowerCase();


                                const productMatch =
                                    Array.isArray(
                                        sale?.items
                                    )
                                        ? sale.items.some(
                                            (
                                                item
                                            ) => {

                                                const name =
                                                    String(
                                                        item?.name ||
                                                        ""
                                                    )
                                                        .toLowerCase();


                                                const barcode =
                                                    String(
                                                        item?.barcode ||
                                                        ""
                                                    )
                                                        .toLowerCase();


                                                return (
                                                    name.includes(
                                                        keyword
                                                    ) ||
                                                    barcode.includes(
                                                        keyword
                                                    )
                                                );

                                            }
                                        )
                                        : false;


                                if (
                                    !receipt.includes(
                                        keyword
                                    ) &&
                                    !cashier.includes(
                                        keyword
                                    ) &&
                                    !productMatch
                                ) {

                                    return false;

                                }

                            }


                            return true;

                        }
                    )

                    .sort(
                        (
                            a,
                            b
                        ) => {

                            return (
                                new Date(
                                    b?.createdAt ||
                                    0
                                ) -
                                new Date(
                                    a?.createdAt ||
                                    0
                                )
                            );

                        }
                    );

            },
            [
                safeSales,
                search,
                statusFilter,
                paymentFilter,
                selectedDateRange,
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

                let netSales =
                    0;

                let activeTransactions =
                    0;

                let itemsSold =
                    0;

                let refunds =
                    0;

                let refundedTransactions =
                    0;

                let voidAmount =
                    0;

                let voidedTransactions =
                    0;


                filteredSales.forEach(
                    (
                        sale
                    ) => {

                        /*
                        ----------------------------------------
                        NET SALES
                        ----------------------------------------
                        */

                        netSales +=
                            getSaleNetTotal(
                                sale
                            );


                        /*
                        ----------------------------------------
                        TRANSACTIONS
                        ----------------------------------------
                        */

                        if (
                            isActiveTransaction(
                                sale
                            )
                        ) {

                            activeTransactions +=
                                1;

                        }


                        /*
                        ----------------------------------------
                        ITEMS
                        ----------------------------------------
                        */

                        itemsSold +=
                            getSaleRemainingQuantity(
                                sale
                            );


                        /*
                        ----------------------------------------
                        REFUNDS
                        ----------------------------------------
                        */

                        const refundAmount =
                            getRefundAmount(
                                sale
                            );


                        refunds +=
                            refundAmount;


                        if (
                            refundAmount >
                            0
                        ) {

                            refundedTransactions +=
                                1;

                        }


                        /*
                        ----------------------------------------
                        VOIDS
                        ----------------------------------------
                        */

                        if (
                            sale?.status ===
                            "VOIDED"
                        ) {

                            voidAmount +=
                                getOriginalSaleTotal(
                                    sale
                                );


                            voidedTransactions +=
                                1;

                        }

                    }
                );


                return {

                    netSales,

                    activeTransactions,

                    itemsSold,

                    refunds,

                    refundedTransactions,

                    voidAmount,

                    voidedTransactions,

                    totalRecords:
                        filteredSales.length,

                };

            },
            [
                filteredSales,
            ]
        );


    /*
    ========================================================
    STATUS BADGE
    ========================================================
    */

    const renderStatus =
        (
            status
        ) => {

            if (
                status ===
                "COMPLETED"
            ) {

                return (

                    <span className="badge badge-success badge-sm">

                        Completed

                    </span>

                );

            }


            if (
                status ===
                "PARTIALLY_REFUNDED"
            ) {

                return (

                    <span className="badge badge-info badge-sm">

                        Partially Refunded

                    </span>

                );

            }


            if (
                status ===
                "REFUNDED"
            ) {

                return (

                    <span className="badge badge-warning badge-sm">

                        Refunded

                    </span>

                );

            }


            if (
                status ===
                "VOIDED"
            ) {

                return (

                    <span className="badge badge-error badge-sm">

                        Voided

                    </span>

                );

            }


            return (

                <span className="badge badge-ghost badge-sm">

                    {
                        status ||
                        "Unknown"
                    }

                </span>

            );

        };


    /*
    ========================================================
    PERIOD CHANGE
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


                setDateError(
                    ""
                );


                return;

            }


            setPeriod(
                value
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
    OPEN CUSTOM RANGE
    ========================================================
    */

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


            setDateError(
                ""
            );


            setShowCustomRange(
                true
            );

        };


    /*
    ========================================================
    APPLY CUSTOM RANGE
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


            setShowCustomRange(
                false
            );


            setDateError(
                ""
            );

        };


    /*
    ========================================================
    EXPORT CSV
    ========================================================
    */

    const handleExport =
        () => {

            if (
                filteredSales.length ===
                0
            ) {

                window.alert(
                    "There are no transactions to export."
                );


                return;

            }


            const rows = [

                [
                    "Transaction Report",
                ],

                [
                    "Branch",
                    activeBranchLabel,
                ],

                [
                    "Report Period",
                    period ===
                        "Custom Range"
                        ? `${appliedStartDate} to ${appliedEndDate}`
                        : period,
                ],

                [],

                [
                    "Receipt",
                    "Date",
                    "Cashier",
                    "Payment Method",
                    "Status",
                    "Items Sold",
                    "Original Total",
                    "Refund Amount",
                    "Net Total",
                ],

            ];


            filteredSales.forEach(
                (
                    sale
                ) => {

                    rows.push([

                        sale?.receiptNumber ||
                            "",

                        formatDateTime(
                            sale?.createdAt
                        ),

                        sale?.cashier
                            ?.name ||
                            sale?.cashier
                            ?.username ||
                            sale?.cashierName ||
                            "",

                        sale?.paymentMethod ||
                            "",

                        sale?.status ||
                            "",

                        getSaleRemainingQuantity(
                            sale
                        ),

                        getOriginalSaleTotal(
                            sale
                        ).toFixed(
                            2
                        ),

                        getRefundAmount(
                            sale
                        ).toFixed(
                            2
                        ),

                        getSaleNetTotal(
                            sale
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
                "Net Sales",
                summary.netSales.toFixed(
                    2
                ),
            ]);


            rows.push([
                "Active Transactions",
                summary.activeTransactions,
            ]);


            rows.push([
                "Items Sold",
                summary.itemsSold,
            ]);


            rows.push([
                "Refunded Amount",
                summary.refunds.toFixed(
                    2
                ),
            ]);


            rows.push([
                "Transactions With Refunds",
                summary.refundedTransactions,
            ]);


            rows.push([
                "Void Amount",
                summary.voidAmount.toFixed(
                    2
                ),
            ]);


            rows.push([
                "Voided Transactions",
                summary.voidedTransactions,
            ]);


            rows.push([
                "Matching Records",
                summary.totalRecords,
            ]);


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
                rows
                    .map(
                        (
                            row
                        ) => {

                            return row
                                .map(
                                    escapeCsv
                                )
                                .join(
                                    ","
                                );

                        }
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
                        ? `${appliedStartDate}-${appliedEndDate}`
                        : period
                );


            link.href =
                url;


            link.download =
                `transaction-report-${branchPart}-${periodPart}-${new Date()
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
        safeSales.length ===
            0
    ) {

        return (

            <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                    <span className="loading loading-spinner loading-lg text-primary" />


                    <p className="mt-3 text-sm text-base-content/50">

                        Building transaction report...

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

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">

                            <FaReceipt />

                        </div>


                        <div>

                            <h1 className="text-2xl font-bold">

                                Transaction Report

                            </h1>


                            <p className="mt-1 text-sm text-base-content/55">

                                Review completed, refunded, partially refunded, and voided transactions.

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


                    {
                        period ===
                            "Custom Range" &&
                        !showCustomRange &&
                        (

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

                        )
                    }


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
                ACTIVE BRANCH
            ================================================= */}

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


            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

                <SummaryCard
                    title="Net Sales"
                    value={
                        formatCurrency(
                            summary.netSales
                        )
                    }
                    description="Net of refunds and voids"
                    icon={
                        FaMoneyBillWave
                    }
                    iconClass="bg-success/10 text-success"
                />


                <SummaryCard
                    title="Transactions"
                    value={
                        summary.activeTransactions
                    }
                    description="Completed and partial-refund transactions"
                    icon={
                        FaReceipt
                    }
                    iconClass="bg-primary/10 text-primary"
                />


                <SummaryCard
                    title="Items Sold"
                    value={
                        summary.itemsSold
                    }
                    description="Net quantity after refunds"
                    icon={
                        FaShoppingCart
                    }
                    iconClass="bg-info/10 text-info"
                />


                <SummaryCard
                    title="Records"
                    value={
                        summary.totalRecords
                    }
                    description="All matching transaction records"
                    icon={
                        FaCalendarDay
                    }
                    iconClass="bg-secondary/10 text-secondary"
                />

            </div>


            {/* =================================================
                REFUND / VOID SUMMARY
            ================================================= */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <SummaryCard
                    title="Refunded Amount"
                    value={
                        formatCurrency(
                            summary.refunds
                        )
                    }
                    description={`${summary.refundedTransactions} transaction(s) with refunds`}
                    icon={
                        FaUndo
                    }
                    iconClass="bg-warning/10 text-warning"
                />


                <SummaryCard
                    title="Void Amount"
                    value={
                        formatCurrency(
                            summary.voidAmount
                        )
                    }
                    description={`${summary.voidedTransactions} voided transaction(s)`}
                    icon={
                        FaBan
                    }
                    iconClass="bg-error/10 text-error"
                />

            </div>


            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="rounded-xl border border-base-300 bg-base-100 p-4">

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">

                    <div className="relative lg:col-span-2">

                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/35" />


                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) => {

                                setSearch(
                                    event.target
                                        .value
                                );

                            }}
                            placeholder="Search receipt, cashier, product or barcode..."
                            className="input input-bordered w-full pl-9"
                        />

                    </div>


                    <select
                        value={
                            statusFilter
                        }
                        onChange={(
                            event
                        ) => {

                            setStatusFilter(
                                event.target
                                    .value
                            );

                        }}
                        className="select select-bordered"
                    >

                        <option value="ALL">
                            All Statuses
                        </option>

                        <option value="COMPLETED">
                            Completed
                        </option>

                        <option value="PARTIALLY_REFUNDED">
                            Partially Refunded
                        </option>

                        <option value="REFUNDED">
                            Refunded
                        </option>

                        <option value="VOIDED">
                            Voided
                        </option>

                    </select>


                    <select
                        value={
                            paymentFilter
                        }
                        onChange={(
                            event
                        ) => {

                            setPaymentFilter(
                                event.target
                                    .value
                            );

                        }}
                        className="select select-bordered"
                    >

                        <option value="ALL">
                            All Payment Methods
                        </option>

                        <option value="Cash">
                            Cash
                        </option>

                        <option value="GCash">
                            GCash
                        </option>

                        <option value="Card">
                            Card
                        </option>

                    </select>

                </div>

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">

                <div className="border-b border-base-200 px-5 py-4">

                    <h2 className="font-bold">

                        Transactions

                    </h2>


                    <p className="mt-1 text-xs text-base-content/50">

                        {
                            filteredSales.length
                        }{" "}

                        matching record

                        {
                            filteredSales.length !==
                                1
                                ? "s"
                                : ""
                        }{" "}

                        in{" "}

                        {
                            activeBranchCode ||
                            activeBranchName ||
                            "active branch"
                        }

                    </p>

                </div>


                <div className="overflow-x-auto">

                    <table className="table">

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
                                    Payment
                                </th>

                                <th className="text-right">
                                    Items
                                </th>

                                <th className="text-right">
                                    Original
                                </th>

                                <th className="text-right">
                                    Refund
                                </th>

                                <th className="text-right">
                                    Net Total
                                </th>

                                <th>
                                    Status
                                </th>

                                <th />

                            </tr>

                        </thead>


                        <tbody>

                            {
                                filteredSales.map(
                                    (
                                        sale
                                    ) => (

                                        <tr
                                            key={
                                                sale._id ||
                                                sale.id
                                            }
                                            className="hover"
                                        >

                                            <td className="font-medium">

                                                {
                                                    sale.receiptNumber ||
                                                    "—"
                                                }

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
                                                    sale.cashier
                                                        ?.name ||
                                                    sale.cashier
                                                        ?.username ||
                                                    sale.cashierName ||
                                                    "Cashier"
                                                }

                                            </td>


                                            <td>

                                                <span className="badge badge-ghost badge-sm">

                                                    {
                                                        sale.paymentMethod ||
                                                        "—"
                                                    }

                                                </span>

                                            </td>


                                            <td className="text-right">

                                                {
                                                    getSaleRemainingQuantity(
                                                        sale
                                                    )
                                                }

                                            </td>


                                            <td className="text-right">

                                                {
                                                    formatCurrency(
                                                        getOriginalSaleTotal(
                                                            sale
                                                        )
                                                    )
                                                }

                                            </td>


                                            <td className="text-right">

                                                <span
                                                    className={
                                                        getRefundAmount(
                                                            sale
                                                        ) >
                                                        0
                                                            ? "font-medium text-warning"
                                                            : ""
                                                    }
                                                >

                                                    {
                                                        formatCurrency(
                                                            getRefundAmount(
                                                                sale
                                                            )
                                                        )
                                                    }

                                                </span>

                                            </td>


                                            <td className="text-right font-bold">

                                                <span
                                                    className={
                                                        sale.status ===
                                                            "VOIDED" ||
                                                        sale.status ===
                                                            "REFUNDED"
                                                            ? "text-error"
                                                            : ""
                                                    }
                                                >

                                                    {
                                                        formatCurrency(
                                                            getSaleNetTotal(
                                                                sale
                                                            )
                                                        )
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                {
                                                    renderStatus(
                                                        sale.status
                                                    )
                                                }

                                            </td>


                                            <td>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() =>
                                                        openReceipt(
                                                            sale._id ||
                                                            sale.id
                                                        )
                                                    }
                                                >

                                                    <FaEye />

                                                    View

                                                </button>

                                            </td>

                                        </tr>

                                    )
                                )
                            }


                            {
                                filteredSales.length ===
                                    0 &&
                                (

                                    <tr>

                                        <td
                                            colSpan="10"
                                            className="py-14 text-center"
                                        >

                                            <FaReceipt className="mx-auto text-3xl text-base-content/15" />


                                            <p className="mt-3 font-semibold">

                                                No transactions found

                                            </p>


                                            <p className="mt-1 text-xs text-base-content/50">

                                                No matching transactions were found for{" "}

                                                {
                                                    activeBranchLabel
                                                }.

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
                RECEIPT MODAL
            ================================================= */}

            <ReceiptModal
                open={
                    receiptOpen
                }

                sale={
                    selectedSale
                }

                onClose={
                    closeReceipt
                }

                canRefund={
                    false
                }

                canVoid={
                    false
                }

                canReprint={
                    false
                }
            />


            {/* =================================================
                CUSTOM RANGE MODAL
            ================================================= */}

            {
                showCustomRange &&
                (

                    <dialog
                        open
                        className="modal modal-open"
                    >

                        <div className="modal-box max-w-lg">

                            <div className="flex items-start justify-between gap-4">

                                <div>

                                    <h3 className="text-xl font-bold">

                                        Custom Date Range

                                    </h3>


                                    <p className="mt-1 text-sm text-base-content/50">

                                        Select the transaction report period.

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

                                {/* FROM */}

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
                                                event.target
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
                                                event.target
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

                            {
                                customStartDate &&
                                customEndDate &&
                                customStartDate <=
                                    customEndDate &&
                                (

                                    <div className="mt-4 rounded-xl border border-info/20 bg-info/5 p-4">

                                        <p className="text-xs text-base-content/50">

                                            Selected Range

                                        </p>


                                        <p className="mt-1 font-semibold">

                                            {
                                                customStartDate ===
                                                customEndDate
                                                    ? new Date(
                                                        `${customStartDate}T00:00:00`
                                                    )
                                                        .toLocaleDateString(
                                                            "en-PH",
                                                            {
                                                                month:
                                                                    "short",

                                                                day:
                                                                    "numeric",

                                                                year:
                                                                    "numeric",
                                                            }
                                                        )

                                                    : `${new Date(
                                                        `${customStartDate}T00:00:00`
                                                    ).toLocaleDateString(
                                                        "en-PH",
                                                        {
                                                            month:
                                                                "short",

                                                            day:
                                                                "numeric",

                                                            year:
                                                                "numeric",
                                                        }
                                                    )} - ${new Date(
                                                        `${customEndDate}T00:00:00`
                                                    ).toLocaleDateString(
                                                        "en-PH",
                                                        {
                                                            month:
                                                                "short",

                                                            day:
                                                                "numeric",

                                                            year:
                                                                "numeric",
                                                        }
                                                    )}`
                                            }

                                        </p>

                                    </div>

                                )
                            }


                            {/* ERROR */}

                            {
                                dateError &&
                                (

                                    <div className="alert alert-error mt-4">

                                        <span>

                                            {
                                                dateError
                                            }

                                        </span>

                                    </div>

                                )
                            }


                            {/* ACTIONS */}

                            <div className="modal-action">

                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {

                                        setShowCustomRange(
                                            false
                                        );


                                        setDateError(
                                            ""
                                        );

                                    }}
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

                )
            }

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


export default TransactionReportPage;