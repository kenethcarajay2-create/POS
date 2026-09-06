import { useState } from "react";

import {
    FaPrint,
    FaTrash,
    FaStar,
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
GET ITEM NOTE
============================================================

The POS cart stores Grocery / Open Price notes as:

item.note

This helper safely handles:
- missing notes
- null
- undefined
- accidental spaces
============================================================
*/

const getItemNote = (item) => {

    return String(
        item?.note ??
        ""
    ).trim();

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
    SAFE SALE ITEMS
    ========================================================
    */

    const saleItems =
        Array.isArray(
            sale.items
        )
            ? sale.items
            : [];


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
    CUSTOMER INFORMATION
    ========================================================
    */

    const hasCustomer =
        Boolean(
            sale.customer
        );


    const customerName =
        sale.customer
            ?.name ||
        "";


    const customerCode =
        sale.customer
            ?.customerCode ||
        "";


    /*
    ========================================================
    LOYALTY VALUES
    ========================================================

    These values come from the backend Sale document.

    loyaltyPointsRedeemed
    loyaltyDiscount
    loyaltyPointsEarned

    The populated customer may also contain the customer's
    current loyaltyPoints balance.
    ========================================================
    */

    const loyaltyPointsRedeemed =
        Number(
            sale.loyaltyPointsRedeemed ||
            0
        );


    const loyaltyDiscount =
        Number(
            sale.loyaltyDiscount ||
            0
        );


    const loyaltyPointsEarned =
        Number(
            sale.loyaltyPointsEarned ||
            0
        );


    const customerCurrentPoints =
        Number(
            sale.customer
                ?.loyaltyPoints ||
            0
        );


    const hasLoyaltyActivity =
        hasCustomer &&
        (
            loyaltyPointsRedeemed >
                0 ||
            loyaltyPointsEarned >
                0 ||
            loyaltyDiscount >
                0
        );


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


    /*
    --------------------------------------------------------
    IMPORTANT

    sale.total is already the FINAL checkout total.

    Example:

    subtotal = 230
    loyaltyDiscount = 40
    total = 190

    We therefore should NOT subtract the loyalty discount
    from sale.total again.
    --------------------------------------------------------
    */

    const originalTotal =
        Number(
            sale.total ||
            0
        );


    const refundedAmount =
        saleItems.reduce(
            (
                sum,
                item
            ) =>
                sum +
                getRefundedItemAmount(
                    item
                ),
            0
        );


    /*
    ========================================================
    CURRENT SUBTOTAL AFTER REFUNDS
    ========================================================
    */

    const currentSubtotal =
        Math.max(
            originalSubtotal -
            refundedAmount,
            0
        );


    /*
    ========================================================
    CURRENT TOTAL
    ========================================================

    For an untouched sale:

        currentTotal = sale.total

    For refunded sales:

        sale.total - refunded amount

    For voided sales:

        0
    ========================================================
    */

    const currentTotal =
        sale.status ===
        "VOIDED"
            ? 0
            : Math.max(
                originalTotal -
                refundedAmount,
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
                    max-h-[90vh]
                    overflow-y-auto
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


                    <div className="flex justify-between gap-4">

                        <span>
                            Date
                        </span>

                        <span className="text-right">

                            {
                                sale.createdAt
                                    ? new Date(
                                        sale.createdAt
                                    ).toLocaleString()
                                    : "—"
                            }

                        </span>

                    </div>


                    <div className="flex justify-between gap-4">

                        <span>
                            Cashier
                        </span>

                        <span className="text-right">

                            {
                                sale.cashier
                                    ?.name ||
                                sale.cashier
                                    ?.username ||
                                "Cashier"
                            }

                        </span>

                    </div>


                    {/* ======================================
                        CUSTOMER
                    ====================================== */}

                    <div className="flex justify-between gap-4">

                        <span>
                            Customer
                        </span>

                        <span className="text-right">

                            {
                                hasCustomer
                                    ? customerName
                                    : "Walk-in"
                            }

                        </span>

                    </div>


                    {
                        hasCustomer &&
                        customerCode && (

                            <div className="flex justify-between">

                                <span>
                                    Customer ID
                                </span>

                                <span>
                                    {customerCode}
                                </span>

                            </div>

                        )
                    }


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
                        saleItems.map(
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


                                const itemNote =
                                    getItemNote(
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
                                            border-base-300
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

                                            <div className="min-w-0 flex-1">

                                                {/* ==========================
                                                    PRODUCT NAME
                                                ========================== */}

                                                <p
                                                    className="
                                                        break-words
                                                        font-medium
                                                    "
                                                >

                                                    {
                                                        item.name ||
                                                        "Product"
                                                    }

                                                </p>


                                                {/* ==========================
                                                    QUANTITY × UNIT PRICE
                                                ========================== */}

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


                                                {/* ==========================
                                                    OPEN PRICE
                                                ========================== */}

                                                {
                                                    item.isOpenPrice && (

                                                        <p
                                                            className="
                                                                mt-0.5
                                                                text-[10px]
                                                                font-medium
                                                                text-purple-500
                                                            "
                                                        >

                                                            Open Price

                                                        </p>

                                                    )
                                                }


                                                {/* ==========================
                                                    ITEM NOTE
                                                ========================== */}

                                                {
                                                    itemNote && (

                                                        <div
                                                            className="
                                                                mt-2
                                                                max-w-full
                                                                rounded-md
                                                                border
                                                                border-base-300
                                                                bg-base-200/50
                                                                px-2
                                                                py-1.5
                                                            "
                                                        >

                                                            <p
                                                                className="
                                                                    text-[9px]
                                                                    font-semibold
                                                                    uppercase
                                                                    tracking-wide
                                                                    text-base-content/40
                                                                "
                                                            >

                                                                Note

                                                            </p>


                                                            <p
                                                                className="
                                                                    mt-0.5
                                                                    whitespace-pre-wrap
                                                                    break-words
                                                                    text-xs
                                                                    leading-relaxed
                                                                    text-base-content/80
                                                                "
                                                            >

                                                                {
                                                                    itemNote
                                                                }

                                                            </p>

                                                        </div>

                                                    )
                                                }


                                                {/* ==========================
                                                    REFUNDED INFORMATION
                                                ========================== */}

                                                {
                                                    refunded >
                                                    0 && (

                                                        <div
                                                            className="
                                                                mt-2
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


                                            {/* ==========================
                                                ITEM TOTAL
                                            ========================== */}

                                            <div className="shrink-0 text-right">

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
                                                        mt-3
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


                    {
                        saleItems.length ===
                        0 && (

                            <div
                                className="
                                    rounded-lg
                                    border
                                    border-base-300
                                    py-8
                                    text-center
                                    text-sm
                                    text-base-content/50
                                "
                            >

                                No receipt items found.

                            </div>

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


                    {/* ======================================
                        NORMAL DISCOUNT
                    ====================================== */}

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


                    {/* ======================================
                        LOYALTY POINTS REDEEMED
                    ====================================== */}

                    {
                        loyaltyPointsRedeemed >
                        0 && (

                            <div
                                className="
                                    flex
                                    justify-between
                                    text-sm
                                "
                            >

                                <span>
                                    Loyalty Redeemed
                                </span>

                                <span className="font-semibold">

                                    {
                                        loyaltyPointsRedeemed
                                    }

                                    {" pts"}

                                </span>

                            </div>

                        )
                    }


                    {/* ======================================
                        LOYALTY DISCOUNT
                    ====================================== */}

                    {
                        loyaltyDiscount >
                        0 && (

                            <div
                                className="
                                    flex
                                    justify-between
                                    text-sm
                                "
                            >

                                <span>
                                    Loyalty Discount
                                </span>

                                <span
                                    className="
                                        font-semibold
                                        text-warning
                                    "
                                >

                                    -₱
                                    {
                                        formatMoney(
                                            loyaltyDiscount
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


                    {/* ======================================
                        FINAL TOTAL
                    ====================================== */}

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


                    {/* ======================================
                        PAYMENT
                    ====================================== */}

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


                    {/* ======================================
                        CHANGE
                    ====================================== */}

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
                    LOYALTY SUMMARY
                ========================================== */}

                {
                    hasLoyaltyActivity && (

                        <>

                            <div className="divider" />


                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-warning/30
                                    bg-warning/5
                                    p-4
                                "
                            >

                                <div
                                    className="
                                        mb-3
                                        flex
                                        items-center
                                        gap-2
                                    "
                                >

                                    <FaStar className="text-warning" />


                                    <span className="font-bold">

                                        Loyalty Rewards

                                    </span>

                                </div>


                                <div
                                    className="
                                        space-y-2
                                        text-sm
                                    "
                                >


                                    {
                                        loyaltyPointsRedeemed >
                                        0 && (

                                            <div className="flex justify-between">

                                                <span className="text-base-content/60">

                                                    Points Redeemed

                                                </span>


                                                <span className="font-semibold">

                                                    -
                                                    {
                                                        loyaltyPointsRedeemed
                                                    }

                                                    {" pts"}

                                                </span>

                                            </div>

                                        )
                                    }


                                    {
                                        loyaltyDiscount >
                                        0 && (

                                            <div className="flex justify-between">

                                                <span className="text-base-content/60">

                                                    Reward Discount

                                                </span>


                                                <span className="font-semibold text-warning">

                                                    -₱
                                                    {
                                                        formatMoney(
                                                            loyaltyDiscount
                                                        )
                                                    }

                                                </span>

                                            </div>

                                        )
                                    }


                                    <div className="flex justify-between">

                                        <span className="text-base-content/60">

                                            Points Earned

                                        </span>


                                        <span className="font-bold text-success">

                                            +
                                            {
                                                loyaltyPointsEarned
                                            }

                                            {" pts"}

                                        </span>

                                    </div>


                                    <div
                                        className="
                                            flex
                                            justify-between
                                            border-t
                                            border-base-200
                                            pt-2
                                        "
                                    >

                                        <span className="font-semibold">

                                            Current Points

                                        </span>


                                        <span className="font-bold">

                                            {
                                                customerCurrentPoints
                                            }

                                            {" pts"}

                                        </span>

                                    </div>

                                </div>

                            </div>

                        </>

                    )
                }


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


                                {/* ==================================
                                    REFUND ITEM NOTE
                                ================================== */}

                                {
                                    getItemNote(
                                        refundItem
                                    ) && (

                                        <div
                                            className="
                                                rounded-lg
                                                border
                                                border-base-300
                                                bg-base-200/50
                                                p-3
                                            "
                                        >

                                            <p
                                                className="
                                                    text-[10px]
                                                    font-semibold
                                                    uppercase
                                                    tracking-wide
                                                    text-base-content/40
                                                "
                                            >

                                                Item Note

                                            </p>


                                            <p
                                                className="
                                                    mt-1
                                                    whitespace-pre-wrap
                                                    break-words
                                                    text-sm
                                                "
                                            >

                                                {
                                                    getItemNote(
                                                        refundItem
                                                    )
                                                }

                                            </p>

                                        </div>

                                    )
                                }


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
                            sale.createdAt
                                ? new Date(
                                    sale.createdAt
                                ).toLocaleString()
                                : "—"
                        }

                    </div>


                    <div>

                        Cashier:{" "}

                        {
                            sale.cashier
                                ?.name ||
                            sale.cashier
                                ?.username ||
                            "Cashier"
                        }

                    </div>


                    {/* ======================================
                        THERMAL CUSTOMER
                    ====================================== */}

                    <div>

                        Customer:{" "}

                        {
                            hasCustomer
                                ? customerName
                                : "Walk-in"
                        }

                    </div>


                    {
                        hasCustomer &&
                        customerCode && (

                            <div>

                                Customer ID:{" "}

                                {
                                    customerCode
                                }

                            </div>

                        )
                    }


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


                {/* ==========================================
                    THERMAL ITEMS
                ========================================== */}

                {
                    saleItems.map(
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


                            const itemNote =
                                getItemNote(
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

                                    {/* ==========================
                                        ITEM NAME
                                    ========================== */}

                                    <div className="thermal-name">

                                        {
                                            item.name ||
                                            "Product"
                                        }

                                    </div>


                                    {/* ==========================
                                        QTY / PRICE / TOTAL
                                    ========================== */}

                                    <div className="thermal-item-row">

                                        <span>

                                            {
                                                item.quantity
                                            }

                                            {" x P"}

                                            {
                                                formatMoney(
                                                    item.unitPrice
                                                )
                                            }

                                        </span>


                                        <span>

                                            P
                                            {
                                                formatMoney(
                                                    getOriginalItemTotal(
                                                        item
                                                    )
                                                )
                                            }

                                        </span>

                                    </div>


                                    {/* ==========================
                                        OPEN PRICE
                                    ========================== */}

                                    {
                                        item.isOpenPrice && (

                                            <div
                                                style={{
                                                    fontSize:
                                                        "10px",

                                                    marginTop:
                                                        "1px",
                                                }}
                                            >

                                                Open Price

                                            </div>

                                        )
                                    }


                                    {/* ==========================
                                        THERMAL ITEM NOTE
                                    ========================== */}

                                    {
                                        itemNote && (

                                            <div
                                                className="thermal-item-note"
                                                style={{
                                                    fontSize:
                                                        "10px",

                                                    marginTop:
                                                        "2px",

                                                    marginBottom:
                                                        "4px",

                                                    whiteSpace:
                                                        "pre-wrap",

                                                    overflowWrap:
                                                        "anywhere",

                                                    wordBreak:
                                                        "break-word",

                                                    lineHeight:
                                                        "1.25",
                                                }}
                                            >

                                                Note:{" "}
                                                {
                                                    itemNote
                                                }

                                            </div>

                                        )
                                    }


                                    {/* ==========================
                                        REFUNDED
                                    ========================== */}

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

                                                        -P
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

                                                                P
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


                {/* ==========================================
                    THERMAL TOTALS
                ========================================== */}

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

                                        P
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

                                        -P
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


                    {/* NORMAL DISCOUNT */}

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

                                    -P
                                    {
                                        formatMoney(
                                            sale.discount
                                        )
                                    }

                                </span>

                            </div>

                        )
                    }


                    {/* LOYALTY REDEEMED */}

                    {
                        loyaltyPointsRedeemed >
                        0 && (

                            <div>

                                <span>
                                    Points Redeemed
                                </span>

                                <span>

                                    {
                                        loyaltyPointsRedeemed
                                    }

                                    {" pts"}

                                </span>

                            </div>

                        )
                    }


                    {/* LOYALTY DISCOUNT */}

                    {
                        loyaltyDiscount >
                        0 && (

                            <div>

                                <span>
                                    Loyalty Discount
                                </span>

                                <span>

                                    -P
                                    {
                                        formatMoney(
                                            loyaltyDiscount
                                        )
                                    }

                                </span>

                            </div>

                        )
                    }


                    {/* GRAND TOTAL */}

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

                            P
                            {
                                formatMoney(
                                    currentTotal
                                )
                            }

                        </span>

                    </div>


                    {/* CASH */}

                    <div>

                        <span>
                            Cash
                        </span>

                        <span>

                            P
                            {
                                formatMoney(
                                    sale.payment
                                )
                            }

                        </span>

                    </div>


                    {/* CHANGE */}

                    <div>

                        <span>
                            Change
                        </span>

                        <span>

                            P
                            {
                                formatMoney(
                                    sale.change
                                )
                            }

                        </span>

                    </div>

                </div>


                {/* ==========================================
                    THERMAL LOYALTY
                ========================================== */}

                {
                    hasLoyaltyActivity && (

                        <>

                            <div className="thermal-line">

                                ------------------------------

                            </div>


                            <div className="thermal-info">

                                <div>

                                    LOYALTY REWARDS

                                </div>


                                {
                                    loyaltyPointsRedeemed >
                                    0 && (

                                        <div>

                                            Redeemed:{" "}

                                            {
                                                loyaltyPointsRedeemed
                                            }

                                            {" pts"}

                                        </div>

                                    )
                                }


                                {
                                    loyaltyDiscount >
                                    0 && (

                                        <div>

                                            Reward Discount: -P

                                            {
                                                formatMoney(
                                                    loyaltyDiscount
                                                )
                                            }

                                        </div>

                                    )
                                }


                                <div>

                                    Points Earned: +

                                    {
                                        loyaltyPointsEarned
                                    }

                                    {" pts"}

                                </div>


                                <div>

                                    Current Points:{" "}

                                    {
                                        customerCurrentPoints
                                    }

                                    {" pts"}

                                </div>

                            </div>

                        </>

                    )
                }


                <div className="thermal-line">

                    ------------------------------

                </div>


                <div className="thermal-footer">

                    {
                        hasCustomer && (

                            <p>

                                Thank you,{" "}

                                {
                                    customerName
                                }

                                !

                            </p>

                        )
                    }


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