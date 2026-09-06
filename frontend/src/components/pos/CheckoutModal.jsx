import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    FaSearch,
    FaQrcode,
    FaWifi,
    FaTimes,
    FaUser,
    FaCheckCircle,
    FaStar,
    FaGift,
} from "react-icons/fa";

import customerService from "../../services/customer.service";


/*
============================================================
LOYALTY CONFIGURATION
============================================================

Earn:
₱100 = 1 point

Redeem:
1 point = ₱1

Minimum:
10 points

Increment:
10 points

Maximum:
50% of purchase
============================================================
*/

const LOYALTY_SPEND_PER_POINT =
    100;

const LOYALTY_POINT_VALUE =
    1;

const LOYALTY_MIN_REDEMPTION =
    10;

const LOYALTY_REDEMPTION_STEP =
    10;

const LOYALTY_MAX_REDEMPTION_RATE =
    0.50;


function CheckoutModal({
    open,
    subtotal,
    onClose,
    onComplete,
}) {

    /*
    ============================================================
    PAYMENT
    ============================================================
    */

    const [
        cashReceived,
        setCashReceived,
    ] = useState("");


    const [
        printReceipt,
        setPrintReceipt,
    ] = useState(true);


    /*
    ============================================================
    CUSTOMER
    ============================================================
    */

    const [
        selectedCustomer,
        setSelectedCustomer,
    ] = useState(null);


    const [
        customerSearch,
        setCustomerSearch,
    ] = useState("");


    const [
        customerResults,
        setCustomerResults,
    ] = useState([]);


    const [
        customerSearching,
        setCustomerSearching,
    ] = useState(false);


    const [
        customerError,
        setCustomerError,
    ] = useState("");


    /*
    ============================================================
    LOYALTY
    ============================================================
    */

    const [
        loyaltyPointsToRedeem,
        setLoyaltyPointsToRedeem,
    ] = useState(0);


    /*
    ============================================================
    REFS
    ============================================================
    */

    const customerInputRef =
        useRef(null);


    const cashInputRef =
        useRef(null);


    /*
    ============================================================
    RESET
    ============================================================
    */

    useEffect(
        () => {

            if (!open) {
                return;
            }


            setCashReceived("");

            setPrintReceipt(true);

            setSelectedCustomer(null);

            setCustomerSearch("");

            setCustomerResults([]);

            setCustomerError("");

            setLoyaltyPointsToRedeem(0);


            const timer =
                setTimeout(
                    () => {

                        customerInputRef
                            .current
                            ?.focus();

                    },
                    80
                );


            return () => {

                clearTimeout(timer);

            };

        },
        [
            open,
        ]
    );


    /*
    ============================================================
    CUSTOMER POINTS
    ============================================================
    */

    const customerPoints =
        Number(
            selectedCustomer
                ?.loyaltyPoints
        ) || 0;


    /*
    ============================================================
    MAXIMUM LOYALTY DISCOUNT
    ============================================================
    */

    const maximumLoyaltyDiscount =
        Math.floor(
            Number(subtotal) *
            LOYALTY_MAX_REDEMPTION_RATE
        );


    /*
    ============================================================
    MAXIMUM REDEEMABLE POINTS
    ============================================================
    */

    const maximumRedeemablePoints =
        useMemo(
            () => {

                if (!selectedCustomer) {
                    return 0;
                }


                const maxByPurchase =
                    Math.floor(
                        maximumLoyaltyDiscount /
                        LOYALTY_POINT_VALUE
                    );


                const rawMaximum =
                    Math.min(
                        customerPoints,
                        maxByPurchase
                    );


                return (
                    Math.floor(
                        rawMaximum /
                        LOYALTY_REDEMPTION_STEP
                    ) *
                    LOYALTY_REDEMPTION_STEP
                );

            },
            [
                selectedCustomer,
                customerPoints,
                maximumLoyaltyDiscount,
            ]
        );


    /*
    ============================================================
    LOYALTY VALIDATION
    ============================================================
    */

    const loyaltyRedemptionIsValid =
        useMemo(
            () => {

                if (
                    loyaltyPointsToRedeem ===
                    0
                ) {
                    return true;
                }


                if (!selectedCustomer) {
                    return false;
                }


                if (
                    !Number.isInteger(
                        loyaltyPointsToRedeem
                    )
                ) {
                    return false;
                }


                if (
                    loyaltyPointsToRedeem <
                    LOYALTY_MIN_REDEMPTION
                ) {
                    return false;
                }


                if (
                    loyaltyPointsToRedeem %
                        LOYALTY_REDEMPTION_STEP !==
                    0
                ) {
                    return false;
                }


                if (
                    loyaltyPointsToRedeem >
                    maximumRedeemablePoints
                ) {
                    return false;
                }


                return true;

            },
            [
                loyaltyPointsToRedeem,
                selectedCustomer,
                maximumRedeemablePoints,
            ]
        );


    /*
    ============================================================
    LOYALTY ERROR
    ============================================================
    */

    const loyaltyError =
        useMemo(
            () => {

                if (
                    loyaltyPointsToRedeem ===
                    0
                ) {
                    return "";
                }


                if (
                    loyaltyPointsToRedeem <
                    LOYALTY_MIN_REDEMPTION
                ) {

                    return (
                        `Minimum redemption is ${LOYALTY_MIN_REDEMPTION} points.`
                    );

                }


                if (
                    loyaltyPointsToRedeem %
                        LOYALTY_REDEMPTION_STEP !==
                    0
                ) {

                    return (
                        `Redeem points in multiples of ${LOYALTY_REDEMPTION_STEP}.`
                    );

                }


                if (
                    loyaltyPointsToRedeem >
                    customerPoints
                ) {

                    return (
                        `Customer only has ${customerPoints} loyalty point(s).`
                    );

                }


                if (
                    loyaltyPointsToRedeem >
                    maximumRedeemablePoints
                ) {

                    return (
                        `Maximum allowed is ${maximumRedeemablePoints} points.`
                    );

                }


                return "";

            },
            [
                loyaltyPointsToRedeem,
                customerPoints,
                maximumRedeemablePoints,
            ]
        );


    /*
    ============================================================
    LOYALTY DISCOUNT
    ============================================================
    */

    const loyaltyDiscount =
        loyaltyRedemptionIsValid

            ? loyaltyPointsToRedeem *
                LOYALTY_POINT_VALUE

            : 0;


    /*
    ============================================================
    FINAL TOTAL
    ============================================================
    */

    const finalTotal =
        Math.max(
            Number(subtotal) -
                loyaltyDiscount,
            0
        );


    /*
    ============================================================
    POINTS EARNED
    ============================================================
    */

    const estimatedPointsEarned =
        selectedCustomer

            ? Math.floor(
                finalTotal /
                LOYALTY_SPEND_PER_POINT
            )

            : 0;


    /*
    ============================================================
    ENDING POINTS
    ============================================================
    */

    const estimatedEndingPoints =
        selectedCustomer

            ? (
                customerPoints -
                (
                    loyaltyRedemptionIsValid
                        ? loyaltyPointsToRedeem
                        : 0
                ) +
                estimatedPointsEarned
            )

            : 0;


    /*
    ============================================================
    CHANGE
    ============================================================
    */

    const change =
        useMemo(
            () => {

                const cash =
                    parseFloat(
                        cashReceived
                    );


                if (
                    Number.isNaN(cash)
                ) {
                    return 0;
                }


                return Math.max(
                    cash -
                        finalTotal,
                    0
                );

            },
            [
                cashReceived,
                finalTotal,
            ]
        );


    /*
    ============================================================
    SEARCH CUSTOMERS
    ============================================================
    */

    useEffect(
        () => {

            if (
                !open ||
                selectedCustomer
            ) {
                return;
            }


            const query =
                customerSearch
                    .trim();


            if (
                query.length <
                2
            ) {

                setCustomerResults([]);

                return;

            }


            const timer =
                setTimeout(
                    async () => {

                        try {

                            setCustomerSearching(
                                true
                            );

                            setCustomerError("");


                            const result =
                                await customerService
                                    .getCustomers({
                                        search:
                                            query,

                                        isActive:
                                            true,
                                    });


                            const list =
                                Array.isArray(result)
                                    ? result
                                    : [];


                            setCustomerResults(
                                list.slice(
                                    0,
                                    5
                                )
                            );

                        } catch (error) {

                            console.error(
                                "CUSTOMER SEARCH ERROR:",
                                error
                            );


                            setCustomerResults([]);

                        } finally {

                            setCustomerSearching(
                                false
                            );

                        }

                    },
                    250
                );


            return () => {

                clearTimeout(timer);

            };

        },
        [
            open,
            customerSearch,
            selectedCustomer,
        ]
    );


    /*
    ============================================================
    SELECT CUSTOMER
    ============================================================
    */

    const selectCustomer =
        (
            customer
        ) => {

            if (!customer) {
                return;
            }


            setSelectedCustomer(
                customer
            );

            setCustomerSearch("");

            setCustomerResults([]);

            setCustomerError("");

            setLoyaltyPointsToRedeem(0);


            setTimeout(
                () => {

                    cashInputRef
                        .current
                        ?.focus();

                },
                50
            );

        };


    /*
    ============================================================
    IDENTIFY CUSTOMER
    ============================================================
    */

    const identifyCustomer =
        async () => {

            const identifier =
                customerSearch
                    .trim();


            if (!identifier) {

                cashInputRef
                    .current
                    ?.focus();

                return;

            }


            try {

                setCustomerSearching(
                    true
                );

                setCustomerError("");


                const customer =
                    await customerService
                        .identifyCustomer(
                            identifier
                        );


                selectCustomer(
                    customer
                );

            } catch (error) {

                if (
                    customerResults.length ===
                    1
                ) {

                    selectCustomer(
                        customerResults[0]
                    );

                    return;

                }


                setCustomerError(
                    error.response
                        ?.data
                        ?.message ||
                    "Customer not found."
                );

            } finally {

                setCustomerSearching(
                    false
                );

            }

        };


    /*
    ============================================================
    REMOVE CUSTOMER
    ============================================================
    */

    const removeCustomer =
        () => {

            setSelectedCustomer(null);

            setCustomerSearch("");

            setCustomerResults([]);

            setCustomerError("");

            setLoyaltyPointsToRedeem(0);

            setCashReceived("");


            setTimeout(
                () => {

                    customerInputRef
                        .current
                        ?.focus();

                },
                50
            );

        };


    /*
    ============================================================
    WALK-IN
    ============================================================
    */

    const useWalkIn =
        () => {

            setSelectedCustomer(null);

            setCustomerSearch("");

            setCustomerResults([]);

            setCustomerError("");

            setLoyaltyPointsToRedeem(0);


            cashInputRef
                .current
                ?.focus();

        };


    /*
    ============================================================
    REDEEM ALL
    ============================================================
    */

    const redeemAll =
        () => {

            if (
                maximumRedeemablePoints <
                LOYALTY_MIN_REDEMPTION
            ) {
                return;
            }


            setLoyaltyPointsToRedeem(
                maximumRedeemablePoints
            );

        };


    /*
    ============================================================
    COMPLETE SALE
    ============================================================
    */

    const completeSale =
        () => {

            if (
                !loyaltyRedemptionIsValid
            ) {
                return;
            }


            const cash =
                parseFloat(
                    cashReceived ||
                    0
                );


            if (
                cash <
                finalTotal
            ) {
                return;
            }


            onComplete({

                cashReceived:
                    cash,

                change,

                printReceipt,

                customerId:
                    selectedCustomer?._id ||
                    selectedCustomer?.id ||
                    null,

                customer:
                    selectedCustomer,

                loyaltyPointsToRedeem:
                    loyaltyRedemptionIsValid
                        ? loyaltyPointsToRedeem
                        : 0,

                loyaltyDiscount,

                estimatedPointsEarned,

                finalTotal,

            });

        };


    /*
    ============================================================
    KEYBOARD CONTROL
    ============================================================
    */

    const handleModalKeyDown =
        (
            event
        ) => {

            event.stopPropagation();


            /*
            ====================================================
            ESCAPE
            ====================================================
            */

            if (
                event.key ===
                "Escape"
            ) {

                event.preventDefault();

                onClose();

                return;

            }


            /*
            ====================================================
            CUSTOMER ENTER
            ====================================================
            */

            if (
                event.target ===
                customerInputRef.current
            ) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    identifyCustomer();

                }

                return;

            }


            /*
            ====================================================
            CASH ENTER
            ====================================================
            */

            if (
                event.target ===
                    cashInputRef.current &&
                event.key ===
                    "Enter"
            ) {

                event.preventDefault();


                const cash =
                    parseFloat(
                        cashReceived ||
                        0
                    );


                if (
                    cash >=
                        finalTotal &&
                    loyaltyRedemptionIsValid
                ) {

                    completeSale();

                }

            }

        };


    /*
    ============================================================
    HIDDEN
    ============================================================
    */

    if (!open) {
        return null;
    }


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <dialog
            className="
                modal
                modal-open
                p-2
                sm:p-3
            "
        >

            <div
                className="
                    modal-box

                    w-[96vw]
                    max-w-[1180px]

                    h-[94vh]
                    max-h-[94vh]

                    p-0

                    overflow-hidden

                    flex
                    flex-col

                    rounded-2xl
                "
                onKeyDownCapture={
                    handleModalKeyDown
                }
            >


                {/* =================================================
                    FIXED HEADER
                ================================================= */}

                <div
                    className="
                        shrink-0

                        px-5
                        sm:px-6

                        pt-4
                        pb-3

                        border-b
                        border-base-200

                        bg-base-100

                        flex
                        items-center
                        justify-between
                        gap-4
                    "
                >

                    <div className="min-w-0">

                        <h2
                            className="
                                font-bold
                                text-2xl
                            "
                        >
                            Checkout
                        </h2>


                        <p
                            className="
                                text-xs
                                text-base-content/50
                                mt-1
                            "
                        >
                            Select a customer or continue as walk-in.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="
                            btn
                            btn-ghost
                            btn-sm
                            btn-square
                            shrink-0
                        "
                        onClick={
                            onClose
                        }
                    >
                        <FaTimes />
                    </button>

                </div>


                {/* =================================================
                    SCROLLABLE BODY
                ================================================= */}

                <div
                    className="
                        flex-1
                        min-h-0

                        overflow-y-auto
                        overflow-x-hidden

                        px-5
                        sm:px-6

                        py-4
                    "
                >

                    <div
                        className="
                            grid
                            grid-cols-1

                            xl:grid-cols-[1.15fr_0.85fr]

                            gap-4

                            items-start
                        "
                    >


                        {/* =================================================
                            LEFT COLUMN
                        ================================================= */}

                        <div
                            className="
                                space-y-4
                                min-w-0
                            "
                        >


                            {/* =============================================
                                CUSTOMER
                            ============================================= */}

                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-base-300
                                    p-4
                                "
                            >

                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        gap-3
                                        mb-3
                                    "
                                >

                                    <div>

                                        <div
                                            className="
                                                font-semibold
                                                text-sm
                                            "
                                        >
                                            Customer
                                        </div>


                                        <div
                                            className="
                                                text-[10px]
                                                text-base-content/50
                                                mt-1
                                            "
                                        >
                                            Search, scan QR, or tap RFID.
                                        </div>

                                    </div>


                                    {
                                        !selectedCustomer && (

                                            <span className="badge badge-ghost">
                                                Walk-in
                                            </span>

                                        )
                                    }

                                </div>


                                {/* =========================================
                                    SELECTED CUSTOMER
                                ========================================= */}

                                {
                                    selectedCustomer ? (

                                        <div
                                            className="
                                                rounded-xl
                                                bg-success/10
                                                border
                                                border-success/20
                                                p-3
                                            "
                                        >

                                            <div
                                                className="
                                                    flex
                                                    items-start
                                                    justify-between
                                                    gap-3
                                                "
                                            >

                                                <div
                                                    className="
                                                        flex
                                                        items-start
                                                        gap-3
                                                        min-w-0
                                                    "
                                                >

                                                    <div
                                                        className="
                                                            w-9
                                                            h-9
                                                            rounded-full
                                                            bg-success/20
                                                            text-success
                                                            flex
                                                            items-center
                                                            justify-center
                                                            shrink-0
                                                        "
                                                    >
                                                        <FaCheckCircle />
                                                    </div>


                                                    <div className="min-w-0">

                                                        <div
                                                            className="
                                                                font-bold
                                                                truncate
                                                            "
                                                        >
                                                            {
                                                                selectedCustomer.name
                                                            }
                                                        </div>


                                                        <div
                                                            className="
                                                                text-xs
                                                                text-base-content/60
                                                                mt-1
                                                            "
                                                        >

                                                            {
                                                                selectedCustomer
                                                                    .customerCode
                                                            }

                                                            {
                                                                selectedCustomer.phone
                                                                    ? ` • ${selectedCustomer.phone}`
                                                                    : ""
                                                            }

                                                        </div>


                                                        <div
                                                            className="
                                                                flex
                                                                flex-wrap
                                                                gap-3
                                                                mt-2
                                                                text-[10px]
                                                                text-base-content/50
                                                            "
                                                        >

                                                            <span>
                                                                Loyalty:{" "}

                                                                <strong>
                                                                    {
                                                                        customerPoints
                                                                    } pts
                                                                </strong>
                                                            </span>


                                                            <span>
                                                                Tier:{" "}

                                                                <strong>
                                                                    {
                                                                        selectedCustomer
                                                                            .loyaltyTier ||
                                                                        "REGULAR"
                                                                    }
                                                                </strong>
                                                            </span>

                                                        </div>

                                                    </div>

                                                </div>


                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-ghost
                                                        btn-xs
                                                        btn-square
                                                    "
                                                    onClick={
                                                        removeCustomer
                                                    }
                                                    title="Remove customer"
                                                >
                                                    <FaTimes />
                                                </button>

                                            </div>

                                        </div>

                                    ) : (

                                        <>

                                            {/* =================================
                                                SEARCH
                                            ================================= */}

                                            <div className="relative">

                                                <FaSearch
                                                    className="
                                                        absolute
                                                        left-3
                                                        top-1/2
                                                        -translate-y-1/2
                                                        text-base-content/40
                                                        z-10
                                                    "
                                                />


                                                <input
                                                    ref={
                                                        customerInputRef
                                                    }
                                                    type="text"
                                                    value={
                                                        customerSearch
                                                    }
                                                    onChange={(
                                                        event
                                                    ) => {

                                                        setCustomerSearch(
                                                            event.target.value
                                                        );

                                                        setCustomerError("");

                                                    }}
                                                    className="
                                                        input
                                                        input-bordered
                                                        input-sm
                                                        w-full
                                                        pl-10
                                                    "
                                                    placeholder="Search name / phone or scan QR / RFID..."
                                                    autoComplete="off"
                                                />


                                                {
                                                    customerSearching && (

                                                        <span
                                                            className="
                                                                loading
                                                                loading-spinner
                                                                loading-sm
                                                                absolute
                                                                right-3
                                                                top-1/2
                                                                -translate-y-1/2
                                                            "
                                                        />

                                                    )
                                                }

                                            </div>


                                            {/* =================================
                                                HELP
                                            ================================= */}

                                            <div
                                                className="
                                                    flex
                                                    flex-wrap
                                                    items-center
                                                    gap-4
                                                    mt-2
                                                    text-[10px]
                                                    text-base-content/45
                                                "
                                            >

                                                <span
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                    "
                                                >
                                                    <FaQrcode />
                                                    QR
                                                </span>


                                                <span
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                    "
                                                >
                                                    <FaWifi />
                                                    RFID / NFC
                                                </span>


                                                <span>
                                                    Press Enter after scan
                                                </span>

                                            </div>


                                            {
                                                customerError && (

                                                    <div
                                                        className="
                                                            mt-2
                                                            text-xs
                                                            text-error
                                                        "
                                                    >
                                                        {
                                                            customerError
                                                        }
                                                    </div>

                                                )
                                            }


                                            {/* =================================
                                                RESULTS
                                            ================================= */}

                                            {
                                                customerResults.length >
                                                    0 && (

                                                    <div
                                                        className="
                                                            mt-2
                                                            border
                                                            border-base-300
                                                            rounded-lg
                                                            overflow-hidden
                                                            max-h-36
                                                            overflow-y-auto
                                                        "
                                                    >

                                                        {
                                                            customerResults.map(
                                                                (
                                                                    customer
                                                                ) => (

                                                                    <button
                                                                        key={
                                                                            customer._id ||
                                                                            customer.id
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            selectCustomer(
                                                                                customer
                                                                            )
                                                                        }
                                                                        className="
                                                                            w-full
                                                                            flex
                                                                            items-center
                                                                            justify-between
                                                                            gap-4
                                                                            p-2.5
                                                                            text-left
                                                                            border-b
                                                                            last:border-b-0
                                                                            border-base-200
                                                                            hover:bg-base-200/60
                                                                        "
                                                                    >

                                                                        <div
                                                                            className="
                                                                                flex
                                                                                items-center
                                                                                gap-3
                                                                                min-w-0
                                                                            "
                                                                        >

                                                                            <FaUser
                                                                                className="
                                                                                    text-base-content/30
                                                                                    shrink-0
                                                                                "
                                                                            />


                                                                            <div className="min-w-0">

                                                                                <div
                                                                                    className="
                                                                                        text-sm
                                                                                        font-semibold
                                                                                        truncate
                                                                                    "
                                                                                >
                                                                                    {
                                                                                        customer.name
                                                                                    }
                                                                                </div>


                                                                                <div
                                                                                    className="
                                                                                        text-[10px]
                                                                                        text-base-content/40
                                                                                    "
                                                                                >

                                                                                    {
                                                                                        customer.customerCode
                                                                                    }

                                                                                    {
                                                                                        customer.phone
                                                                                            ? ` • ${customer.phone}`
                                                                                            : ""
                                                                                    }

                                                                                </div>

                                                                            </div>

                                                                        </div>


                                                                        <div
                                                                            className="
                                                                                text-right
                                                                                text-[10px]
                                                                                shrink-0
                                                                            "
                                                                        >

                                                                            <div className="font-bold">
                                                                                {
                                                                                    Number(
                                                                                        customer.loyaltyPoints
                                                                                    ) || 0
                                                                                } pts
                                                                            </div>

                                                                        </div>

                                                                    </button>

                                                                )
                                                            )
                                                        }

                                                    </div>

                                                )
                                            }


                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-ghost
                                                    btn-xs
                                                    w-full
                                                    mt-2
                                                "
                                                onClick={
                                                    useWalkIn
                                                }
                                            >
                                                Continue as Walk-in Customer
                                            </button>

                                        </>

                                    )
                                }

                            </div>


                            {/* =============================================
                                LOYALTY
                            ============================================= */}

                            {
                                selectedCustomer && (

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
                                                flex
                                                items-center
                                                justify-between
                                                gap-3
                                            "
                                        >

                                            <div
                                                className="
                                                    flex
                                                    items-center
                                                    gap-3
                                                "
                                            >

                                                <div
                                                    className="
                                                        w-9
                                                        h-9
                                                        rounded-lg
                                                        bg-warning/15
                                                        text-warning
                                                        flex
                                                        items-center
                                                        justify-center
                                                        shrink-0
                                                    "
                                                >
                                                    <FaStar />
                                                </div>


                                                <div>

                                                    <p
                                                        className="
                                                            font-semibold
                                                            text-sm
                                                        "
                                                    >
                                                        Loyalty Rewards
                                                    </p>


                                                    <p
                                                        className="
                                                            text-[10px]
                                                            text-base-content/50
                                                        "
                                                    >
                                                        1 pt = ₱1 • Min 10 • Multiples of 10
                                                    </p>

                                                </div>

                                            </div>


                                            <div className="text-right shrink-0">

                                                <p
                                                    className="
                                                        text-[10px]
                                                        text-base-content/40
                                                    "
                                                >
                                                    Available
                                                </p>


                                                <p
                                                    className="
                                                        font-bold
                                                        text-lg
                                                    "
                                                >
                                                    {
                                                        customerPoints
                                                    } pts
                                                </p>

                                            </div>

                                        </div>


                                        {/* =================================
                                            REDEEM
                                        ================================= */}

                                        <div
                                            className="
                                                grid
                                                grid-cols-[1fr_auto]
                                                gap-2
                                                mt-3
                                            "
                                        >

                                            <input
                                                type="number"
                                                min="0"
                                                step={
                                                    LOYALTY_REDEMPTION_STEP
                                                }
                                                value={
                                                    loyaltyPointsToRedeem ||
                                                    ""
                                                }
                                                onChange={(
                                                    event
                                                ) => {

                                                    const rawValue =
                                                        event.target.value;


                                                    if (
                                                        rawValue ===
                                                        ""
                                                    ) {

                                                        setLoyaltyPointsToRedeem(
                                                            0
                                                        );

                                                        return;

                                                    }


                                                    const value =
                                                        Number(
                                                            rawValue
                                                        );


                                                    if (
                                                        !Number.isFinite(
                                                            value
                                                        )
                                                    ) {
                                                        return;
                                                    }


                                                    setLoyaltyPointsToRedeem(
                                                        Math.max(
                                                            0,
                                                            Math.floor(
                                                                value
                                                            )
                                                        )
                                                    );

                                                }}
                                                className="
                                                    input
                                                    input-bordered
                                                    input-sm
                                                    w-full
                                                "
                                                placeholder="Points to redeem"
                                            />


                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-warning
                                                    btn-sm
                                                "
                                                disabled={
                                                    maximumRedeemablePoints <
                                                    LOYALTY_MIN_REDEMPTION
                                                }
                                                onClick={
                                                    redeemAll
                                                }
                                            >
                                                Redeem All
                                            </button>

                                        </div>


                                        <div
                                            className="
                                                flex
                                                justify-between
                                                gap-3
                                                mt-2
                                                text-[10px]
                                                text-base-content/45
                                            "
                                        >

                                            <span>
                                                Max:{" "}

                                                <strong>
                                                    {
                                                        maximumRedeemablePoints
                                                    } pts
                                                </strong>
                                            </span>


                                            <span>
                                                Max discount:{" "}

                                                <strong>
                                                    ₱
                                                    {
                                                        maximumLoyaltyDiscount
                                                            .toFixed(
                                                                2
                                                            )
                                                    }
                                                </strong>
                                            </span>

                                        </div>


                                        {
                                            loyaltyError && (

                                                <div
                                                    className="
                                                        text-xs
                                                        text-error
                                                        mt-2
                                                    "
                                                >
                                                    {
                                                        loyaltyError
                                                    }
                                                </div>

                                            )
                                        }


                                        {/* =================================
                                            COMPACT LOYALTY SUMMARY
                                        ================================= */}

                                        <div
                                            className="
                                                grid
                                                grid-cols-2
                                                gap-x-5
                                                gap-y-1
                                                bg-base-100/70
                                                rounded-lg
                                                p-3
                                                mt-3
                                                text-xs
                                            "
                                        >

                                            <div className="flex justify-between">

                                                <span className="text-base-content/60">
                                                    Redeemed
                                                </span>

                                                <strong>
                                                    {
                                                        loyaltyRedemptionIsValid
                                                            ? loyaltyPointsToRedeem
                                                            : 0
                                                    }
                                                </strong>

                                            </div>


                                            <div className="flex justify-between">

                                                <span className="text-base-content/60">
                                                    Discount
                                                </span>

                                                <strong className="text-warning">
                                                    -₱
                                                    {
                                                        loyaltyDiscount
                                                            .toFixed(
                                                                2
                                                            )
                                                    }
                                                </strong>

                                            </div>


                                            <div className="flex justify-between">

                                                <span className="text-base-content/60">
                                                    Earn
                                                </span>

                                                <strong className="text-success">
                                                    +
                                                    {
                                                        estimatedPointsEarned
                                                    }
                                                </strong>

                                            </div>


                                            <div className="flex justify-between">

                                                <span className="text-base-content/60">
                                                    Balance
                                                </span>

                                                <strong>
                                                    {
                                                        estimatedEndingPoints
                                                    }
                                                </strong>

                                            </div>

                                        </div>

                                    </div>

                                )
                            }

                        </div>


                        {/* =================================================
                            RIGHT COLUMN — PAYMENT
                        ================================================= */}

                        <div
                            className="
                                rounded-xl
                                border
                                border-base-300
                                p-4

                                flex
                                flex-col
                                gap-3

                                min-w-0
                            "
                        >


                            {/* =============================================
                                PRICE SUMMARY
                            ============================================= */}

                            <div>

                                <div
                                    className="
                                        text-xs
                                        font-bold
                                        uppercase
                                        tracking-wide
                                        text-base-content/40
                                        mb-3
                                    "
                                >
                                    Payment
                                </div>


                                <div
                                    className="
                                        bg-base-200/50
                                        rounded-xl
                                        p-4
                                        space-y-2
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            justify-between
                                            text-sm
                                        "
                                    >

                                        <span className="text-base-content/60">
                                            Purchase Total
                                        </span>


                                        <span>
                                            ₱
                                            {
                                                Number(
                                                    subtotal
                                                ).toFixed(
                                                    2
                                                )
                                            }
                                        </span>

                                    </div>


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

                                                <span className="text-base-content/60">
                                                    Loyalty Discount
                                                </span>


                                                <span
                                                    className="
                                                        text-warning
                                                        font-semibold
                                                    "
                                                >
                                                    -₱
                                                    {
                                                        loyaltyDiscount
                                                            .toFixed(
                                                                2
                                                            )
                                                    }
                                                </span>

                                            </div>

                                        )
                                    }


                                    <div
                                        className="
                                            border-t
                                            border-base-300
                                            pt-3
                                            mt-2

                                            flex
                                            justify-between
                                            items-center
                                            gap-4
                                        "
                                    >

                                        <span
                                            className="
                                                text-lg
                                                font-semibold
                                            "
                                        >
                                            Amount Due
                                        </span>


                                        <span
                                            className="
                                                text-3xl
                                                font-black
                                                text-right
                                            "
                                        >
                                            ₱
                                            {
                                                finalTotal
                                                    .toFixed(
                                                        2
                                                    )
                                            }
                                        </span>

                                    </div>

                                </div>

                            </div>


                            {/* =============================================
                                CASH
                            ============================================= */}

                            <div>

                                <label className="label py-1">

                                    <span
                                        className="
                                            label-text
                                            font-semibold
                                        "
                                    >
                                        Cash Received
                                    </span>

                                </label>


                                <input
                                    ref={
                                        cashInputRef
                                    }
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="
                                        input
                                        input-bordered
                                        w-full
                                        text-2xl
                                        font-bold
                                        h-14
                                    "
                                    value={
                                        cashReceived
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCashReceived(
                                            event.target.value
                                        )
                                    }
                                    placeholder="0.00"
                                />

                            </div>


                            {/* =============================================
                                CHANGE
                            ============================================= */}

                            <div
                                className="
                                    rounded-xl
                                    bg-success/5
                                    border
                                    border-success/20
                                    p-4

                                    flex
                                    justify-between
                                    items-center
                                    gap-4
                                "
                            >

                                <span
                                    className="
                                        text-lg
                                        font-semibold
                                    "
                                >
                                    Change
                                </span>


                                <span
                                    className="
                                        font-black
                                        text-success
                                        text-3xl
                                        text-right
                                    "
                                >
                                    ₱
                                    {
                                        change
                                            .toFixed(
                                                2
                                            )
                                    }
                                </span>

                            </div>


                            {/* =============================================
                                POINTS AFTER CHECKOUT
                            ============================================= */}

                            {
                                selectedCustomer && (

                                    <div
                                        className="
                                            rounded-lg
                                            bg-success/10
                                            border
                                            border-success/20
                                            p-3

                                            flex
                                            items-center
                                            justify-between
                                            gap-3
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-2
                                            "
                                        >

                                            <FaGift className="text-success" />


                                            <span className="text-sm">
                                                Points after checkout
                                            </span>

                                        </div>


                                        <strong className="text-success shrink-0">
                                            {
                                                estimatedEndingPoints
                                            } pts
                                        </strong>

                                    </div>

                                )
                            }


                            {/* =============================================
                                PRINT
                            ============================================= */}

                            <div
                                className="
                                    border
                                    border-base-300
                                    rounded-lg
                                    p-3
                                    bg-base-200/50
                                "
                            >

                                <label
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        cursor-pointer
                                        gap-4
                                    "
                                >

                                    <div>

                                        <div className="font-semibold">
                                            Print Receipt
                                        </div>


                                        <div
                                            className="
                                                text-[10px]
                                                text-base-content/50
                                                mt-1
                                            "
                                        >
                                            Print after completing the sale.
                                        </div>

                                    </div>


                                    <input
                                        type="checkbox"
                                        className="
                                            toggle
                                            toggle-primary
                                        "
                                        checked={
                                            printReceipt
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPrintReceipt(
                                                event.target.checked
                                            )
                                        }
                                    />

                                </label>

                            </div>

                        </div>

                    </div>

                </div>


                {/* =================================================
                    FIXED FOOTER
                ================================================= */}

                <div
                    className="
                        shrink-0

                        border-t
                        border-base-200

                        bg-base-100

                        px-5
                        sm:px-6
                        py-3
                    "
                >

                    <div
                        className="
                            flex
                            justify-end
                            gap-2
                        "
                    >

                        <button
                            type="button"
                            className="
                                btn
                                btn-sm
                                min-w-32
                            "
                            onClick={
                                onClose
                            }
                        >
                            Cancel
                        </button>


                        <button
                            type="button"
                            className="
                                btn
                                btn-primary
                                btn-sm
                                min-w-44
                            "
                            disabled={
                                !loyaltyRedemptionIsValid ||

                                parseFloat(
                                    cashReceived ||
                                    0
                                ) <
                                finalTotal
                            }
                            onClick={
                                completeSale
                            }
                        >
                            Complete Sale
                        </button>

                    </div>

                </div>

            </div>

        </dialog>

    );

}


export default CheckoutModal;