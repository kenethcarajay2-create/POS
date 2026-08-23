import { useState } from "react";

import {
    FaPrint,
    FaTrash,
} from "react-icons/fa";

import useSaleStore from "../../store/sale.store";
import saleService from "../../services/sale.service";


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
RECEIPT MODAL
============================================================
*/

function ReceiptModal({
    open,
    sale,
    onClose,
    onVoid,

    /*
    ========================================================
    ACTION PERMISSIONS
    ========================================================

    These come from SalesPage.

    Admin:
        canRefund = true
        canVoid = true
        canReprint = true

    Restricted cashier:
        false
        false
        false
    ========================================================
    */

    canRefund = false,
    canVoid = false,
    canReprint = false,
}) {

    const {
        refundSale,
    } = useSaleStore();


    const [
        refundItem,
        setRefundItem,
    ] = useState(null);


    const [
        refundQuantity,
        setRefundQuantity,
    ] = useState(1);


    const [
        refunding,
        setRefunding,
    ] = useState(false);


    const [
        voiding,
        setVoiding,
    ] = useState(false);


    /*
    ========================================================
    EARLY RETURN
    ========================================================
    */

    if (
        !open ||
        !sale
    ) {

        return null;

    }


    /*
    ========================================================
    CALCULATE ITEM VALUES
    ========================================================
    */

    const getRefundedQuantity = (
        item
    ) => {

        return Number(
            item?.refundedQuantity ||
            0
        );

    };


    const getRemainingQuantity = (
        item
    ) => {

        return Math.max(
            Number(
                item?.quantity ||
                0
            ) -
            getRefundedQuantity(
                item
            ),
            0
        );

    };


    const getOriginalItemTotal = (
        item
    ) => {

        return Number(
            item?.subtotal ||
            (
                Number(
                    item?.quantity ||
                    0
                ) *
                Number(
                    item?.unitPrice ||
                    0
                )
            )
        );

    };


    const getRefundedItemAmount = (
        item
    ) => {

        return (
            getRefundedQuantity(
                item
            ) *
            Number(
                item?.unitPrice ||
                0
            )
        );

    };


    const getRemainingItemTotal = (
        item
    ) => {

        return (
            getRemainingQuantity(
                item
            ) *
            Number(
                item?.unitPrice ||
                0
            )
        );

    };


    /*
    ========================================================
    RECEIPT TOTALS
    ========================================================
    */

    const originalSubtotal =
        Number(
            sale.subtotal ||
            0
        );


    const originalTotal =
        Number(
            sale.total ||
            0
        );


    const refundedAmount =
        Array.isArray(
            sale.items
        )
            ? sale.items.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    getRefundedItemAmount(
                        item
                    ),
                0
            )
            : 0;


    const currentSubtotal =
        Math.max(
            originalSubtotal -
            refundedAmount,
            0
        );


    const currentTotal =
        sale.status ===
        "VOIDED"
            ? 0
            : Math.max(
                currentSubtotal -
                Number(
                    sale.discount ||
                    0
                ),
                0
            );


    /*
    ========================================================
    REFUNDABLE QUANTITY
    ========================================================
    */

    const availableRefundQuantity =
        refundItem
            ? getRemainingQuantity(
                refundItem
            )
            : 0;


    /*
    ========================================================
    REFUND
    ========================================================
    */

    const handleRefund =
        async () => {

            /*
            Extra frontend protection.

            Even if this function somehow gets triggered,
            a user without permission cannot continue.
            */

            if (
                !canRefund
            ) {

                alert(
                    "You do not have permission to refund sales."
                );

                return;

            }


            if (
                !refundItem
            ) {

                return;

            }


            try {

                setRefunding(
                    true
                );


                const refundData = {

                    quantity:
                        refundQuantity,

                };


                /*
                Use saleItemId whenever possible.
                */

                if (
                    refundItem._id
                ) {

                    refundData.saleItemId =
                        refundItem._id;

                } else if (
                    refundItem.product
                ) {

                    refundData.productId =
                        refundItem.product;

                } else {

                    throw new Error(
                        "This receipt item cannot be identified for refund."
                    );

                }


                await refundSale(
                    sale._id,
                    [
                        refundData,
                    ]
                );


                setRefundItem(
                    null
                );


                setRefundQuantity(
                    1
                );


            } catch (
                error
            ) {

                console.error(
                    "REFUND ERROR:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    error.message ||
                    "Failed to refund item."
                );


            } finally {

                setRefunding(
                    false
                );

            }

        };


    /*
    ========================================================
    OPEN REFUND
    ========================================================
    */

    const openRefund =
        (
            item
        ) => {

            if (
                !canRefund
            ) {

                return;

            }


            setRefundItem(
                item
            );


            setRefundQuantity(
                1
            );

        };


    /*
    ========================================================
    VOID
    ========================================================
    */

    const handleVoid =
        async () => {

            if (
                !canVoid
            ) {

                alert(
                    "You do not have permission to void sales."
                );

                return;

            }


            if (
                !onVoid ||
                voiding
            ) {

                return;

            }


            try {

                setVoiding(
                    true
                );


                await onVoid(
                    sale
                );


            } catch (
                error
            ) {

                console.error(
                    "VOID ERROR:",
                    error
                );


            } finally {

                setVoiding(
                    false
                );

            }

        };


    /*
    ========================================================
    REPRINT
    ========================================================
    */

    const handleReprint =
        async () => {

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
                    "Failed to print receipt."
                );

            }

        };


    /*
    ========================================================
    STATUS BADGE
    ========================================================
    */

    const renderStatus = () => {

        if (
            sale.status ===
            "COMPLETED"
        ) {

            return (

                <span className="badge badge-success">
                    Completed
                </span>

            );

        }


        if (
            sale.status ===
            "PARTIALLY_REFUNDED"
        ) {

            return (

                <span className="badge badge-warning">
                    Partially Refunded
                </span>

            );

        }


        if (
            sale.status ===
            "REFUNDED"
        ) {

            return (

                <span className="badge badge-info">
                    Refunded
                </span>

            );

        }


        if (
            sale.status ===
            "VOIDED"
        ) {

            return (

                <span className="badge badge-error">
                    Voided
                </span>

            );

        }


        return (

            <span className="badge">
                {sale.status}
            </span>

        );

    };


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <dialog
            className="
                modal
                modal-open
            "
        >

            <div
                className="
                    modal-box
                    max-w-md
                "
            >


                {/* ==========================================
                    HEADER
                ========================================== */}

                <h2
                    className="
                        text-center
                        text-2xl
                        font-bold
                    "
                >

                    {
                        sale.status ===
                        "VOIDED"
                            ? "SALE VOIDED"

                            : sale.status ===
                              "REFUNDED"
                                ? "SALE REFUNDED"

                                : "SALE RECEIPT"
                    }

                </h2>


                <div className="divider my-3" />


                {/* ==========================================
                    SALE INFORMATION
                ========================================== */}

                <div
                    className="
                        space-y-2
                        text-sm
                    "
                >

                    <div className="flex justify-between">

                        <span>
                            Receipt
                        </span>

                        <span>
                            {sale.receiptNumber}
                        </span>

                    </div>


                    <div className="flex justify-between">

                        <span>
                            Date
                        </span>

                        <span>

                            {
                                new Date(
                                    sale.createdAt
                                ).toLocaleString()
                            }

                        </span>

                    </div>


                    <div className="flex justify-between">

                        <span>
                            Cashier
                        </span>

                        <span>

                            {
                                sale.cashier
                                    ?.name ||
                                "Cashier"
                            }

                        </span>

                    </div>


                    <div className="flex justify-between">

                        <span>
                            Status
                        </span>

                        <span>
                            {renderStatus()}
                        </span>

                    </div>

                </div>


                <div className="divider" />


                {/* ==========================================
                    ITEMS
                ========================================== */}

                <div
                    className="
                        max-h-72
                        space-y-3
                        overflow-y-auto
                        pr-1
                    "
                >

                    {
                        sale.items.map(
                            (
                                item,
                                index
                            ) => {

                                const refunded =
                                    getRefundedQuantity(
                                        item
                                    );


                                const remaining =
                                    getRemainingQuantity(
                                        item
                                    );


                                const originalItemTotal =
                                    getOriginalItemTotal(
                                        item
                                    );


                                const refundedItemAmount =
                                    getRefundedItemAmount(
                                        item
                                    );


                                const remainingItemTotal =
                                    getRemainingItemTotal(
                                        item
                                    );


                                return (

                                    <div
                                        key={
                                            item._id ||
                                            item.product ||
                                            `${item.name}-${index}`
                                        }
                                        className="
                                            rounded-lg
                                            border
                                            p-3
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                justify-between
                                                gap-3
                                            "
                                        >

                                            <div className="min-w-0">

                                                <p className="font-medium">

                                                    {
                                                        item.name
                                                    }

                                                </p>


                                                <p
                                                    className="
                                                        text-xs
                                                        text-gray-500
                                                    "
                                                >

                                                    {
                                                        item.quantity
                                                    }

                                                    {" × ₱"}

                                                    {
                                                        formatMoney(
                                                            item.unitPrice
                                                        )
                                                    }

                                                </p>


                                                {
                                                    item.isOpenPrice && (

                                                        <p
                                                            className="
                                                                mt-0.5
                                                                text-[10px]
                                                                text-purple-500
                                                            "
                                                        >

                                                            Open Price

                                                        </p>

                                                    )
                                                }


                                                {
                                                    refunded >
                                                    0 && (

                                                        <div
                                                            className="
                                                                mt-1
                                                                space-y-0.5
                                                            "
                                                        >

                                                            <p
                                                                className="
                                                                    text-xs
                                                                    font-medium
                                                                    text-warning
                                                                "
                                                            >

                                                                Refunded:{" "}

                                                                {
                                                                    refunded
                                                                }

                                                            </p>


                                                            <p
                                                                className="
                                                                    text-[10px]
                                                                    text-warning
                                                                "
                                                            >

                                                                -₱
                                                                {
                                                                    formatMoney(
                                                                        refundedItemAmount
                                                                    )
                                                                }

                                                            </p>


                                                            {
                                                                remaining >
                                                                0 && (

                                                                    <p
                                                                        className="
                                                                            text-[10px]
                                                                            text-base-content/50
                                                                        "
                                                                    >

                                                                        Remaining:{" "}

                                                                        {
                                                                            remaining
                                                                        }

                                                                    </p>

                                                                )
                                                            }

                                                        </div>

                                                    )
                                                }

                                            </div>


                                            <div className="text-right">

                                                {
                                                    refunded >
                                                    0 ? (

                                                        <>

                                                            <div
                                                                className="
                                                                    text-xs
                                                                    text-base-content/35
                                                                    line-through
                                                                "
                                                            >

                                                                ₱
                                                                {
                                                                    formatMoney(
                                                                        originalItemTotal
                                                                    )
                                                                }

                                                            </div>


                                                            <div className="font-semibold">

                                                                ₱
                                                                {
                                                                    formatMoney(
                                                                        remainingItemTotal
                                                                    )
                                                                }

                                                            </div>

                                                        </>

                                                    ) : (

                                                        <div className="font-semibold">

                                                            ₱
                                                            {
                                                                formatMoney(
                                                                    originalItemTotal
                                                                )
                                                            }

                                                        </div>

                                                    )
                                                }

                                            </div>

                                        </div>


                                        {/* ==============================
                                            REFUND BUTTON

                                            Only visible when:
                                            1. User has salesRefund
                                            2. Sale isn't voided
                                            3. Sale isn't fully refunded
                                            4. Item still has quantity
                                        ============================== */}

                                        {
                                            canRefund &&

                                            sale.status !==
                                                "VOIDED" &&

                                            sale.status !==
                                                "REFUNDED" &&

                                            remaining >
                                                0 && (

                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-warning
                                                        btn-xs
                                                        mt-2
                                                    "
                                                    onClick={() =>
                                                        openRefund(
                                                            item
                                                        )
                                                    }
                                                >

                                                    Refund

                                                </button>

                                            )
                                        }

                                    </div>

                                );

                            }
                        )
                    }

                </div>


                <div className="divider" />


                {/* ==========================================
                    TOTALS
                ========================================== */}

                <div className="space-y-2">


                    {
                        refundedAmount >
                        0 && (

                            <div
                                className="
                                    flex
                                    justify-between
                                    text-sm
                                    text-base-content/50
                                "
                            >

                                <span>
                                    Original Subtotal
                                </span>

                                <span className="line-through">

                                    ₱
                                    {
                                        formatMoney(
                                            originalSubtotal
                                        )
                                    }

                                </span>

                            </div>

                        )
                    }


                    {
                        refundedAmount >
                        0 && (

                            <div
                                className="
                                    flex
                                    justify-between
                                    text-sm
                                    text-warning
                                "
                            >

                                <span>
                                    Refunded
                                </span>

                                <span>

                                    -₱
                                    {
                                        formatMoney(
                                            refundedAmount
                                        )
                                    }

                                </span>

                            </div>

                        )
                    }


                    <div className="flex justify-between">

                        <span>

                            {
                                refundedAmount >
                                0
                                    ? "Current Subtotal"
                                    : "Subtotal"
                            }

                        </span>


                        <span>

                            ₱
                            {
                                formatMoney(
                                    currentSubtotal
                                )
                            }

                        </span>

                    </div>


                    {
                        Number(
                            sale.discount ||
                            0
                        ) >
                        0 && (

                            <div className="flex justify-between">

                                <span>
                                    Discount
                                </span>

                                <span className="text-error">

                                    -₱
                                    {
                                        formatMoney(
                                            sale.discount
                                        )
                                    }

                                </span>

                            </div>

                        )
                    }


                    {
                        refundedAmount >
                        0 && (

                            <div
                                className="
                                    flex
                                    justify-between
                                    text-sm
                                    text-base-content/50
                                "
                            >

                                <span>
                                    Original Total
                                </span>

                                <span className="line-through">

                                    ₱
                                    {
                                        formatMoney(
                                            originalTotal
                                        )
                                    }

                                </span>

                            </div>

                        )
                    }


                    <div
                        className="
                            flex
                            justify-between
                            border-t
                            border-base-200
                            pt-2
                        "
                    >

                        <span className="font-bold">

                            {
                                sale.status ===
                                "VOIDED"
                                    ? "Net Total"

                                    : refundedAmount >
                                      0
                                        ? "Current Total"

                                        : "Total"
                            }

                        </span>


                        <span
                            className="
                                text-lg
                                font-bold
                            "
                        >

                            ₱
                            {
                                formatMoney(
                                    currentTotal
                                )
                            }

                        </span>

                    </div>


                    <div className="flex justify-between">

                        <span>
                            Payment
                        </span>

                        <span>

                            ₱
                            {
                                formatMoney(
                                    sale.payment
                                )
                            }

                        </span>

                    </div>


                    <div className="flex justify-between">

                        <span>
                            Change
                        </span>

                        <span
                            className="
                                font-bold
                                text-success
                            "
                        >

                            ₱
                            {
                                formatMoney(
                                    sale.change
                                )
                            }

                        </span>

                    </div>

                </div>


                {/* ==========================================
                    ACTIONS
                ========================================== */}

                <div
                    className="
                        modal-action
                        print:hidden
                    "
                >


                    {/* ======================================
                        VOID SALE

                        Hidden completely when the user
                        doesn't have salesVoid.
                    ====================================== */}

                    {
                        canVoid &&

                        sale.status ===
                            "COMPLETED" &&

                        onVoid && (

                            <button
                                type="button"
                                className="
                                    btn
                                    btn-error
                                    btn-outline
                                    mr-auto
                                "
                                disabled={
                                    voiding
                                }
                                onClick={
                                    handleVoid
                                }
                            >

                                <FaTrash />

                                {
                                    voiding
                                        ? "Voiding..."
                                        : "Void Sale"
                                }

                            </button>

                        )
                    }


                    {/* ======================================
                        REPRINT

                        Hidden completely when the user
                        doesn't have salesReprint.
                    ====================================== */}

                    {
                        canReprint && (

                            <button
                                type="button"
                                className="
                                    btn
                                    btn-secondary
                                "
                                onClick={
                                    handleReprint
                                }
                            >

                                <FaPrint />

                                Reprint

                            </button>

                        )
                    }


                    {/* ======================================
                        DONE

                        Everyone who can view Sales can close
                        the receipt.
                    ====================================== */}

                    <button
                        type="button"
                        className="btn"
                        onClick={
                            onClose
                        }
                    >

                        Done

                    </button>

                </div>

            </div>


            {/* ==============================================
                REFUND MODAL

                Double protected with canRefund.
            ============================================== */}

            {
                canRefund &&
                refundItem && (

                    <div
                        className="
                            modal
                            modal-open
                        "
                    >

                        <div className="modal-box">

                            <h3
                                className="
                                    text-lg
                                    font-bold
                                "
                            >

                                Refund Item

                            </h3>


                            <div
                                className="
                                    space-y-2
                                    py-4
                                "
                            >

                                <p className="font-semibold">

                                    {
                                        refundItem.name
                                    }

                                </p>


                                <p
                                    className="
                                        text-sm
                                        opacity-70
                                    "
                                >

                                    Purchased:{" "}

                                    {
                                        refundItem.quantity
                                    }

                                </p>


                                <p
                                    className="
                                        text-sm
                                        opacity-70
                                    "
                                >

                                    Already refunded:{" "}

                                    {
                                        getRefundedQuantity(
                                            refundItem
                                        )
                                    }

                                </p>


                                <p
                                    className="
                                        text-sm
                                        opacity-70
                                    "
                                >

                                    Available to refund:{" "}

                                    {
                                        availableRefundQuantity
                                    }

                                </p>


                                <p
                                    className="
                                        text-sm
                                        opacity-70
                                    "
                                >

                                    Unit price: ₱
                                    {
                                        formatMoney(
                                            refundItem.unitPrice
                                        )
                                    }

                                </p>


                                {/* QUANTITY */}

                                <div
                                    className="
                                        mt-5
                                        flex
                                        items-center
                                        justify-center
                                        gap-5
                                    "
                                >

                                    <button
                                        type="button"
                                        className="
                                            btn
                                            btn-sm
                                        "
                                        disabled={
                                            refundQuantity <=
                                                1 ||
                                            refunding
                                        }
                                        onClick={() =>
                                            setRefundQuantity(
                                                (
                                                    quantity
                                                ) =>
                                                    quantity -
                                                    1
                                            )
                                        }
                                    >

                                        −

                                    </button>


                                    <span
                                        className="
                                            w-8
                                            text-center
                                            text-xl
                                            font-bold
                                        "
                                    >

                                        {
                                            refundQuantity
                                        }

                                    </span>


                                    <button
                                        type="button"
                                        className="
                                            btn
                                            btn-sm
                                        "
                                        disabled={
                                            refundQuantity >=
                                                availableRefundQuantity ||
                                            refunding
                                        }
                                        onClick={() =>
                                            setRefundQuantity(
                                                (
                                                    quantity
                                                ) =>
                                                    quantity +
                                                    1
                                            )
                                        }
                                    >

                                        +

                                    </button>

                                </div>


                                {/* REFUND VALUE */}

                                <div
                                    className="
                                        mt-4
                                        rounded-lg
                                        bg-warning/10
                                        p-3
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            justify-between
                                            text-sm
                                        "
                                    >

                                        <span>
                                            Refund Amount
                                        </span>


                                        <span className="font-bold">

                                            ₱
                                            {
                                                formatMoney(
                                                    Number(
                                                        refundItem.unitPrice ||
                                                        0
                                                    ) *
                                                    refundQuantity
                                                )
                                            }

                                        </span>

                                    </div>

                                </div>

                            </div>


                            <div className="modal-action">

                                <button
                                    type="button"
                                    className="btn"
                                    disabled={
                                        refunding
                                    }
                                    onClick={() => {

                                        setRefundItem(
                                            null
                                        );

                                        setRefundQuantity(
                                            1
                                        );

                                    }}
                                >

                                    Cancel

                                </button>


                                <button
                                    type="button"
                                    className="
                                        btn
                                        btn-warning
                                    "
                                    disabled={
                                        refunding ||
                                        refundQuantity <
                                            1 ||
                                        refundQuantity >
                                            availableRefundQuantity
                                    }
                                    onClick={
                                        handleRefund
                                    }
                                >

                                    {
                                        refunding
                                            ? "Refunding..."

                                            : `Refund ₱${formatMoney(
                                                Number(
                                                    refundItem.unitPrice ||
                                                    0
                                                ) *
                                                refundQuantity
                                            )}`
                                    }

                                </button>

                            </div>

                        </div>

                    </div>

                )
            }


            {/* ==============================================
                THERMAL RECEIPT
            ============================================== */}

            <div
                id="thermal-receipt"
                className="hidden"
            >

                <div className="thermal-header">

                    <h1>
                        STOREPOS
                    </h1>

                    <p>
                        Your Store Name
                    </p>

                </div>


                <div className="thermal-info">

                    <div>

                        Receipt:{" "}

                        {
                            sale.receiptNumber
                        }

                    </div>


                    <div>

                        Date:{" "}

                        {
                            new Date(
                                sale.createdAt
                            ).toLocaleString()
                        }

                    </div>


                    <div>

                        Cashier:{" "}

                        {
                            sale.cashier
                                ?.name ||
                            "Cashier"
                        }

                    </div>


                    <div>

                        Status:{" "}

                        {
                            sale.status
                        }

                    </div>

                </div>


                <div className="thermal-line">

                    ------------------------------

                </div>


                {/* ITEMS */}

                {
                    sale.items.map(
                        (
                            item,
                            index
                        ) => {

                            const refunded =
                                getRefundedQuantity(
                                    item
                                );


                            const remaining =
                                getRemainingQuantity(
                                    item
                                );


                            return (

                                <div
                                    key={
                                        item._id ||
                                        item.product ||
                                        `${item.name}-print-${index}`
                                    }
                                    className="thermal-item"
                                >

                                    <div className="thermal-name">

                                        {
                                            item.name
                                        }

                                    </div>


                                    <div className="thermal-item-row">

                                        <span>

                                            {
                                                item.quantity
                                            }

                                            {" × ₱"}

                                            {
                                                formatMoney(
                                                    item.unitPrice
                                                )
                                            }

                                        </span>


                                        <span>

                                            ₱
                                            {
                                                formatMoney(
                                                    getOriginalItemTotal(
                                                        item
                                                    )
                                                )
                                            }

                                        </span>

                                    </div>


                                    {
                                        refunded >
                                        0 && (

                                            <>

                                                <div className="thermal-item-row">

                                                    <span>

                                                        Refunded{" "}

                                                        {
                                                            refunded
                                                        }

                                                    </span>


                                                    <span>

                                                        -₱
                                                        {
                                                            formatMoney(
                                                                getRefundedItemAmount(
                                                                    item
                                                                )
                                                            )
                                                        }

                                                    </span>

                                                </div>


                                                {
                                                    remaining >
                                                    0 && (

                                                        <div className="thermal-item-row">

                                                            <span>
                                                                Remaining
                                                            </span>

                                                            <span>

                                                                ₱
                                                                {
                                                                    formatMoney(
                                                                        getRemainingItemTotal(
                                                                            item
                                                                        )
                                                                    )
                                                                }

                                                            </span>

                                                        </div>

                                                    )
                                                }

                                            </>

                                        )
                                    }

                                </div>

                            );

                        }
                    )
                }


                <div className="thermal-line">

                    ------------------------------

                </div>


                {/* TOTALS */}

                <div className="thermal-totals">


                    {
                        refundedAmount >
                        0 && (

                            <>

                                <div>

                                    <span>
                                        Original
                                    </span>

                                    <span>

                                        ₱
                                        {
                                            formatMoney(
                                                originalTotal
                                            )
                                        }

                                    </span>

                                </div>


                                <div>

                                    <span>
                                        Refunded
                                    </span>

                                    <span>

                                        -₱
                                        {
                                            formatMoney(
                                                refundedAmount
                                            )
                                        }

                                    </span>

                                </div>

                            </>

                        )
                    }


                    {
                        Number(
                            sale.discount ||
                            0
                        ) >
                        0 && (

                            <div>

                                <span>
                                    Discount
                                </span>

                                <span>

                                    -₱
                                    {
                                        formatMoney(
                                            sale.discount
                                        )
                                    }

                                </span>

                            </div>

                        )
                    }


                    <div className="thermal-grand-total">

                        <span>

                            {
                                refundedAmount >
                                0
                                    ? "NET TOTAL"
                                    : "TOTAL"
                            }

                        </span>


                        <span>

                            ₱
                            {
                                formatMoney(
                                    currentTotal
                                )
                            }

                        </span>

                    </div>


                    <div>

                        <span>
                            Cash
                        </span>

                        <span>

                            ₱
                            {
                                formatMoney(
                                    sale.payment
                                )
                            }

                        </span>

                    </div>


                    <div>

                        <span>
                            Change
                        </span>

                        <span>

                            ₱
                            {
                                formatMoney(
                                    sale.change
                                )
                            }

                        </span>

                    </div>

                </div>


                <div className="thermal-line">

                    ------------------------------

                </div>


                <div className="thermal-footer">

                    <p>
                        THANK YOU!
                    </p>

                    <p>
                        Please come again.
                    </p>

                </div>

            </div>

        </dialog>

    );

}


export default ReceiptModal;