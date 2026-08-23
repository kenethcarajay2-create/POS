import { useEffect } from "react";

import {
    FaSearch,
    FaEye,
    FaPrint,
    FaReceipt,
    FaShoppingCart,
    FaBoxes,
    FaChartLine,
} from "react-icons/fa";

import useSaleStore from "../../store/sale.store";
import ReceiptModal from "../../components/pos/ReceiptModal";
import SearchInput from "../../components/common/SearchInput";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import saleService from "../../services/sale.service";
import useAuthStore from "../../store/auth.store";


/*
============================================================
FORMAT MONEY
============================================================
*/

const formatMoney = (value) => {

    return Number(
        value || 0
    ).toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    );

};


/*
============================================================
GET ITEM REMAINING QUANTITY
============================================================
*/

const getRemainingQuantity = (item) => {

    const quantity =
        Number(
            item?.quantity || 0
        );


    const refunded =
        Number(
            item?.refundedQuantity || 0
        );


    return Math.max(
        quantity - refunded,
        0
    );

};


/*
============================================================
GET ITEM NET TOTAL
============================================================
*/

const getItemNetTotal = (item) => {

    const remainingQuantity =
        getRemainingQuantity(
            item
        );


    const unitPrice =
        Number(
            item?.unitPrice || 0
        );


    return (
        remainingQuantity *
        unitPrice
    );

};


/*
============================================================
GET SALE NET TOTAL
============================================================
*/

const getSaleNetTotal = (sale) => {

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

        return Number(
            sale?.total || 0
        );

    }


    const netSubtotal =
        sale.items.reduce(
            (
                sum,
                item
            ) => {

                return (
                    sum +
                    getItemNetTotal(
                        item
                    )
                );

            },
            0
        );


    const discount =
        Number(
            sale?.discount || 0
        );


    return Math.max(
        netSubtotal -
        discount,
        0
    );

};


/*
============================================================
GET SALE REMAINING ITEMS
============================================================
*/

const getSaleRemainingQuantity = (sale) => {

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
        ) => {

            return (
                sum +
                getRemainingQuantity(
                    item
                )
            );

        },
        0
    );

};


/*
============================================================
SALES PAGE
============================================================
*/

function SalesPage() {

    /*
    ========================================================
    AUTH USER
    ========================================================
    */

    const user =
        useAuthStore(
            (state) =>
                state.user
        );


    /*
    ========================================================
    PERMISSION CHECK
    ========================================================

    ADMIN:
    Always allowed.

    OTHER USERS:
    Must have the exact action permission.
    ========================================================
    */

    const can = (
        permission
    ) => {

        if (!user) {

            return false;

        }


        /*
        Admin bypass.
        */

        if (
            user.role ===
            "admin"
        ) {

            return true;

        }


        return (
            user.permissions?.[
                permission
            ] === true
        );

    };


    /*
    ========================================================
    ACTION PERMISSIONS
    ========================================================
    */

    const canReprint =
        can(
            "salesReprint"
        );


    const canVoid =
        can(
            "salesVoid"
        );


    /*
    Refund itself is handled inside ReceiptModal.
    */

    const canRefund =
        can(
            "salesRefund"
        );


    /*
    ========================================================
    SALE STORE
    ========================================================
    */

    const {
        sales,

        loading,

        search,
        setSearch,

        fetchSales,
        filteredSales,

        dateFilter,
        setDateFilter,

        receiptOpen,
        selectedSale,
        openReceipt,
        closeReceipt,

        voidSale,

    } = useSaleStore();


    /*
    ========================================================
    FETCH SALES
    ========================================================
    */

    useEffect(
        () => {

            fetchSales();

        },
        [
            fetchSales,
        ]
    );


    /*
    ========================================================
    FILTERED SALES
    ========================================================
    */

    const displayedSales =
        filteredSales();


    /*
    ========================================================
    TOTAL SALES
    ========================================================
    */

    const totalSales =
        displayedSales.reduce(
            (
                sum,
                sale
            ) => {

                return (
                    sum +
                    getSaleNetTotal(
                        sale
                    )
                );

            },
            0
        );


    /*
    ========================================================
    TRANSACTIONS
    ========================================================
    */

    const transactions =
        displayedSales.filter(
            (sale) =>

                sale.status !==
                    "VOIDED" &&

                sale.status !==
                    "REFUNDED"
        ).length;


    /*
    ========================================================
    ITEMS SOLD
    ========================================================
    */

    const itemsSold =
        displayedSales.reduce(
            (
                sum,
                sale
            ) => {

                return (
                    sum +
                    getSaleRemainingQuantity(
                        sale
                    )
                );

            },
            0
        );


    /*
    ========================================================
    AVERAGE SALE
    ========================================================
    */

    const averageSale =
        transactions >
        0
            ? totalSales /
              transactions
            : 0;


    /*
    ========================================================
    PRINT
    ========================================================

    Frontend permission check.

    Backend should ALSO protect:
    POST /sales/:id/print
    with permit("salesReprint")
    ========================================================
    */

    const handlePrint =
        async (
            sale
        ) => {

            if (
                !canReprint
            ) {

                alert(
                    "You do not have permission to reprint receipts."
                );

                return;

            }


            try {

                await saleService
                    .printSale(
                        sale._id
                    );


            } catch (
                error
            ) {

                console.error(
                    "PRINT ERROR:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    error.message ||
                    "Failed to print receipt."
                );

            }

        };


    /*
    ========================================================
    VOID
    ========================================================

    Frontend permission check.

    Backend should ALSO protect:
    PATCH /sales/:id/void
    with permit("salesVoid")
    ========================================================
    */

    const handleVoid =
        async (
            sale
        ) => {

            if (
                !canVoid
            ) {

                alert(
                    "You do not have permission to void sales."
                );

                return;

            }


            if (!sale) {

                return;

            }


            const confirmed =
                window.confirm(
                    `Void receipt ${sale.receiptNumber}? This will restore all non-refunded inventory items.`
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                await voidSale(
                    sale._id
                );


                await fetchSales();


                closeReceipt();


            } catch (
                error
            ) {

                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to void sale."
                );

            }

        };


    /*
    ========================================================
    STATUS
    ========================================================
    */

    const renderStatus = (
        status
    ) => {

        if (
            status ===
            "COMPLETED"
        ) {

            return (

                <span
                    className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-emerald-50
                        px-3
                        py-1
                        text-xs
                        font-medium
                        text-emerald-600
                    "
                >

                    <span
                        className="
                            h-1.5
                            w-1.5
                            rounded-full
                            bg-emerald-500
                        "
                    />

                    Completed

                </span>

            );

        }


        if (
            status ===
            "PARTIALLY_REFUNDED"
        ) {

            return (

                <span
                    className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-amber-50
                        px-3
                        py-1
                        text-xs
                        font-medium
                        text-amber-600
                    "
                >

                    <span
                        className="
                            h-1.5
                            w-1.5
                            rounded-full
                            bg-amber-500
                        "
                    />

                    Partially Refunded

                </span>

            );

        }


        if (
            status ===
            "REFUNDED"
        ) {

            return (

                <span
                    className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-blue-50
                        px-3
                        py-1
                        text-xs
                        font-medium
                        text-blue-600
                    "
                >

                    <span
                        className="
                            h-1.5
                            w-1.5
                            rounded-full
                            bg-blue-500
                        "
                    />

                    Refunded

                </span>

            );

        }


        if (
            status ===
            "VOIDED"
        ) {

            return (

                <span
                    className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-red-50
                        px-3
                        py-1
                        text-xs
                        font-medium
                        text-red-600
                    "
                >

                    <span
                        className="
                            h-1.5
                            w-1.5
                            rounded-full
                            bg-red-500
                        "
                    />

                    Voided

                </span>

            );

        }


        return (

            <span className="badge badge-ghost">

                {status}

            </span>

        );

    };


    /*
    ========================================================
    LOADING
    ========================================================
    */

    if (
        loading
    ) {

        return (

            <div
                className="
                    flex
                    min-h-[60vh]
                    items-center
                    justify-center
                "
            >

                <span
                    className="
                        loading
                        loading-spinner
                        loading-lg
                        text-primary
                    "
                />

            </div>

        );

    }


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <div
            className="
                w-full
                space-y-5
            "
        >


            {/* ==============================================
                PAGE HEADER
            ============================================== */}

            <div
                className="
                    flex
                    items-center
                    justify-between
                "
            >

                <div>

                    <h1
                        className="
                            text-2xl
                            font-bold
                            tracking-tight
                            text-base-content
                        "
                    >

                        Sales History

                    </h1>


                    <p
                        className="
                            mt-1
                            text-sm
                            text-base-content/50
                        "
                    >

                        View your store's sales transactions.

                    </p>

                </div>

            </div>


            {/* ==============================================
                SEARCH + FILTER
            ============================================== */}

            <div
                className="
                    flex
                    flex-col
                    gap-3
                    lg:flex-row
                    lg:items-center
                "
            >

                <div
                    className="
                        flex-1
                        [&>input]:h-11
                        [&>input]:rounded-xl
                        [&>input]:border-base-300
                        [&>input]:bg-base-100
                        [&>input]:text-sm
                    "
                >

                    <SearchInput
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

                        placeholder="Search receipt, cashier, barcode or product..."
                    />

                </div>


                <div
                    className="
                        w-full
                        lg:w-52
                    "
                >

                    <DateRangeFilter
                        value={
                            dateFilter
                        }

                        onChange={
                            setDateFilter
                        }
                    />

                </div>

            </div>


            {/* ==============================================
                SUMMARY CARDS
            ============================================== */}

            <div
                className="
                    grid
                    grid-cols-1
                    gap-4
                    sm:grid-cols-2
                    xl:grid-cols-4
                "
            >


                {/* TOTAL SALES */}

                <div
                    className="
                        rounded-2xl
                        border
                        border-base-200
                        bg-base-100
                        p-4
                        shadow-sm
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-xs
                                    font-medium
                                    text-base-content/50
                                "
                            >

                                Total Sales

                            </p>


                            <h2
                                className="
                                    mt-2
                                    text-2xl
                                    font-bold
                                "
                            >

                                ₱
                                {
                                    formatMoney(
                                        totalSales
                                    )
                                }

                            </h2>


                            <p
                                className="
                                    mt-2
                                    text-xs
                                    text-base-content/45
                                "
                            >

                                Net of refunds and voids

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
                                bg-emerald-50
                                text-emerald-500
                            "
                        >

                            <FaReceipt />

                        </div>

                    </div>

                </div>


                {/* TRANSACTIONS */}

                <div
                    className="
                        rounded-2xl
                        border
                        border-base-200
                        bg-base-100
                        p-4
                        shadow-sm
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-xs
                                    font-medium
                                    text-base-content/50
                                "
                            >

                                Transactions

                            </p>


                            <h2
                                className="
                                    mt-2
                                    text-2xl
                                    font-bold
                                "
                            >

                                {transactions}

                            </h2>


                            <p
                                className="
                                    mt-2
                                    text-xs
                                    text-base-content/45
                                "
                            >

                                Active sales transactions

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
                                bg-blue-50
                                text-blue-500
                            "
                        >

                            <FaShoppingCart />

                        </div>

                    </div>

                </div>


                {/* ITEMS SOLD */}

                <div
                    className="
                        rounded-2xl
                        border
                        border-base-200
                        bg-base-100
                        p-4
                        shadow-sm
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-xs
                                    font-medium
                                    text-base-content/50
                                "
                            >

                                Items Sold

                            </p>


                            <h2
                                className="
                                    mt-2
                                    text-2xl
                                    font-bold
                                "
                            >

                                {itemsSold}

                            </h2>


                            <p
                                className="
                                    mt-2
                                    text-xs
                                    text-base-content/45
                                "
                            >

                                Net units after refunds

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
                                bg-purple-50
                                text-purple-500
                            "
                        >

                            <FaBoxes />

                        </div>

                    </div>

                </div>


                {/* AVERAGE SALE */}

                <div
                    className="
                        rounded-2xl
                        border
                        border-base-200
                        bg-base-100
                        p-4
                        shadow-sm
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-xs
                                    font-medium
                                    text-base-content/50
                                "
                            >

                                Average Sale

                            </p>


                            <h2
                                className="
                                    mt-2
                                    text-2xl
                                    font-bold
                                "
                            >

                                ₱
                                {
                                    formatMoney(
                                        averageSale
                                    )
                                }

                            </h2>


                            <p
                                className="
                                    mt-2
                                    text-xs
                                    text-base-content/45
                                "
                            >

                                Net per transaction

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
                                bg-orange-50
                                text-orange-500
                            "
                        >

                            <FaChartLine />

                        </div>

                    </div>

                </div>

            </div>


            {/* ==============================================
                SALES TABLE
            ============================================== */}

            <div
                className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-base-200
                    bg-base-100
                    shadow-sm
                "
            >

                {/* TABLE HEADER */}

                <div
                    className="
                        flex
                        items-center
                        justify-between
                        border-b
                        border-base-200
                        px-5
                        py-4
                    "
                >

                    <div>

                        <h2 className="font-semibold">

                            Transactions

                        </h2>


                        <p
                            className="
                                mt-0.5
                                text-xs
                                text-base-content/45
                            "
                        >

                            {
                                displayedSales.length
                            }

                            {" "}transaction

                            {
                                displayedSales.length !==
                                1
                                    ? "s"
                                    : ""
                            }

                            {" "}found

                        </p>

                    </div>

                </div>


                {/* TABLE */}

                <div className="overflow-x-auto">

                    <table
                        className="
                            w-full
                            text-sm
                        "
                    >

                        <thead>

                            <tr
                                className="
                                    border-b
                                    border-base-200
                                    bg-base-200/20
                                    text-xs
                                    text-base-content/50
                                "
                            >

                                <th className="px-5 py-3 text-left font-medium">
                                    Receipt
                                </th>

                                <th className="px-5 py-3 text-left font-medium">
                                    Date
                                </th>

                                <th className="px-5 py-3 text-left font-medium">
                                    Cashier
                                </th>

                                <th className="px-5 py-3 text-center font-medium">
                                    Items
                                </th>

                                <th className="px-5 py-3 text-right font-medium">
                                    Total
                                </th>

                                <th className="px-5 py-3 text-left font-medium">
                                    Status
                                </th>

                                <th className="px-5 py-3 text-right font-medium">
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                displayedSales.length ===
                                0
                                    ? (

                                        <tr>

                                            <td
                                                colSpan="7"
                                                className="
                                                    px-5
                                                    py-16
                                                    text-center
                                                "
                                            >

                                                <div
                                                    className="
                                                        flex
                                                        flex-col
                                                        items-center
                                                        justify-center
                                                    "
                                                >

                                                    <div
                                                        className="
                                                            mb-3
                                                            flex
                                                            h-12
                                                            w-12
                                                            items-center
                                                            justify-center
                                                            rounded-full
                                                            bg-base-200
                                                            text-base-content/40
                                                        "
                                                    >

                                                        <FaSearch />

                                                    </div>


                                                    <p className="font-medium">

                                                        No sales found

                                                    </p>


                                                    <p
                                                        className="
                                                            mt-1
                                                            text-xs
                                                            text-base-content/45
                                                        "
                                                    >

                                                        Try changing your search or date filter.

                                                    </p>

                                                </div>

                                            </td>

                                        </tr>

                                    )
                                    : displayedSales.map(
                                        (
                                            sale
                                        ) => {

                                            const netTotal =
                                                getSaleNetTotal(
                                                    sale
                                                );


                                            const remainingItems =
                                                getSaleRemainingQuantity(
                                                    sale
                                                );


                                            return (

                                                <tr
                                                    key={
                                                        sale._id
                                                    }
                                                    className="
                                                        border-b
                                                        border-base-200
                                                        last:border-0
                                                        transition-colors
                                                        hover:bg-base-200/20
                                                    "
                                                >

                                                    {/* RECEIPT */}

                                                    <td className="px-5 py-4">

                                                        <div
                                                            className="
                                                                flex
                                                                items-center
                                                                gap-3
                                                            "
                                                        >

                                                            <div
                                                                className="
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    items-center
                                                                    justify-center
                                                                    rounded-lg
                                                                    bg-emerald-50
                                                                    text-emerald-500
                                                                "
                                                            >

                                                                <FaReceipt
                                                                    size={
                                                                        13
                                                                    }
                                                                />

                                                            </div>


                                                            <span
                                                                className="
                                                                    font-medium
                                                                    whitespace-nowrap
                                                                "
                                                            >

                                                                {
                                                                    sale.receiptNumber
                                                                }

                                                            </span>

                                                        </div>

                                                    </td>


                                                    {/* DATE */}

                                                    <td
                                                        className="
                                                            px-5
                                                            py-4
                                                            text-xs
                                                            text-base-content/60
                                                            whitespace-nowrap
                                                        "
                                                    >

                                                        {
                                                            new Date(
                                                                sale.createdAt
                                                            ).toLocaleString()
                                                        }

                                                    </td>


                                                    {/* CASHIER */}

                                                    <td className="px-5 py-4">

                                                        <div
                                                            className="
                                                                flex
                                                                items-center
                                                                gap-2
                                                            "
                                                        >

                                                            <div
                                                                className="
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    items-center
                                                                    justify-center
                                                                    rounded-full
                                                                    bg-emerald-100
                                                                    text-xs
                                                                    font-semibold
                                                                    text-emerald-600
                                                                "
                                                            >

                                                                {
                                                                    (
                                                                        sale.cashier
                                                                            ?.name ||
                                                                        "C"
                                                                    )
                                                                        .charAt(
                                                                            0
                                                                        )
                                                                        .toUpperCase()
                                                                }

                                                            </div>


                                                            <span className="text-sm">

                                                                {
                                                                    sale.cashier
                                                                        ?.name ||
                                                                    "Cashier"
                                                                }

                                                            </span>

                                                        </div>

                                                    </td>


                                                    {/* ITEMS */}

                                                    <td className="px-5 py-4 text-center">

                                                        <span className="text-sm font-medium">

                                                            {
                                                                remainingItems
                                                            }

                                                        </span>

                                                    </td>


                                                    {/* TOTAL */}

                                                    <td className="px-5 py-4 text-right">

                                                        <div>

                                                            <span className="font-semibold">

                                                                ₱
                                                                {
                                                                    formatMoney(
                                                                        netTotal
                                                                    )
                                                                }

                                                            </span>


                                                            {
                                                                (
                                                                    sale.status ===
                                                                        "PARTIALLY_REFUNDED" ||
                                                                    sale.status ===
                                                                        "REFUNDED"
                                                                ) && (

                                                                    <div
                                                                        className="
                                                                            mt-0.5
                                                                            text-[9px]
                                                                            text-base-content/35
                                                                            line-through
                                                                        "
                                                                    >

                                                                        ₱
                                                                        {
                                                                            formatMoney(
                                                                                sale.total
                                                                            )
                                                                        }

                                                                    </div>

                                                                )
                                                            }

                                                        </div>

                                                    </td>


                                                    {/* STATUS */}

                                                    <td className="px-5 py-4">

                                                        {
                                                            renderStatus(
                                                                sale.status
                                                            )
                                                        }

                                                    </td>


                                                    {/* ACTIONS */}

                                                    <td className="px-5 py-4">

                                                        <div
                                                            className="
                                                                flex
                                                                justify-end
                                                                gap-2
                                                            "
                                                        >

                                                            {/* VIEW
                                                                Always available to anyone
                                                                who can access Sales.
                                                            */}

                                                            <button
                                                                type="button"
                                                                className="
                                                                    inline-flex
                                                                    h-8
                                                                    items-center
                                                                    gap-1.5
                                                                    rounded-lg
                                                                    bg-blue-50
                                                                    px-3
                                                                    text-xs
                                                                    font-medium
                                                                    text-blue-600
                                                                    transition
                                                                    hover:bg-blue-100
                                                                "
                                                                onClick={() =>
                                                                    openReceipt(
                                                                        sale._id
                                                                    )
                                                                }
                                                            >

                                                                <FaEye
                                                                    size={
                                                                        11
                                                                    }
                                                                />

                                                                View

                                                            </button>


                                                            {/* PRINT
                                                                Hidden from cashier unless
                                                                salesReprint permission exists.
                                                            */}

                                                            {
                                                                canReprint && (

                                                                    <button
                                                                        type="button"
                                                                        className="
                                                                            inline-flex
                                                                            h-8
                                                                            items-center
                                                                            gap-1.5
                                                                            rounded-lg
                                                                            bg-purple-50
                                                                            px-3
                                                                            text-xs
                                                                            font-medium
                                                                            text-purple-600
                                                                            transition
                                                                            hover:bg-purple-100
                                                                        "
                                                                        onClick={() =>
                                                                            handlePrint(
                                                                                sale
                                                                            )
                                                                        }
                                                                    >

                                                                        <FaPrint
                                                                            size={
                                                                                11
                                                                            }
                                                                        />

                                                                        Print

                                                                    </button>

                                                                )
                                                            }

                                                        </div>

                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )
                            }

                        </tbody>

                    </table>

                </div>


                {/* ==========================================
                    TABLE FOOTER
                ========================================== */}

                {
                    displayedSales.length >
                    0 && (

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
                                text-base-content/50
                                sm:flex-row
                                sm:items-center
                                sm:justify-between
                            "
                        >

                            <span>

                                Showing{" "}

                                {
                                    displayedSales.length
                                }

                                {" "}result

                                {
                                    displayedSales.length !==
                                    1
                                        ? "s"
                                        : ""
                                }

                            </span>


                            <span>
                                Sales History
                            </span>

                        </div>

                    )
                }

            </div>


            {/* ==============================================
                RECEIPT MODAL
            ==============================================

                We pass the permissions to ReceiptModal.

                Admin:
                everything = true

                Cashier:
                normally all three = false

                ReceiptModal should use these to hide:
                - Refund
                - Void
                - Reprint
            ============================================== */}

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

                onVoid={
                    canVoid
                        ? handleVoid
                        : undefined
                }

                canRefund={
                    canRefund
                }

                canVoid={
                    canVoid
                }

                canReprint={
                    canReprint
                }
            />

        </div>

    );

}


export default SalesPage;