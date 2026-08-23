import {
    useEffect,
    useRef,
    useState,
} from "react";

import useCartStore from "../../store/cart.store";


function CartPanel({
    onCheckout,
}) {

    const {
        items,

        increaseQuantity,
        decreaseQuantity,
        removeItem,

        wholesaleMode,

        heldCarts,
        resumeCart,
        deleteHeldCart,

        // F7 MULTIPLIER
        pendingMultiplier,
        setPendingMultiplier,
        resetPendingMultiplier,

    } = useCartStore();


    /*
    ============================================================
    F7 MULTIPLIER STATE
    ============================================================
    */

    const [
        multiplierOpen,
        setMultiplierOpen,
    ] = useState(false);


    const [
        multiplierValue,
        setMultiplierValue,
    ] = useState("");


    /*
    ============================================================
    AUTO CLOSE TIMER
    ============================================================

    After the cashier stops typing for a short moment,
    the small multiplier display disappears.

    The multiplier itself stays ACTIVE until the next
    product is scanned/clicked.

    This is important so the barcode scanner can be used
    normally after entering the multiplier.
    ============================================================
    */

    const closeTimerRef =
        useRef(null);


    /*
    ============================================================
    SUBTOTAL
    ============================================================
    */

    const subtotal =
        items.reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(
                    item.subtotal ??
                    0
                ),
            0
        );


    /*
    ============================================================
    START AUTO CLOSE TIMER
    ============================================================
    */

    const scheduleMultiplierClose =
        () => {

            if (
                closeTimerRef.current
            ) {

                clearTimeout(
                    closeTimerRef.current
                );

            }


            closeTimerRef.current =
                setTimeout(
                    () => {

                        setMultiplierOpen(
                            false
                        );

                    },
                    600
                );

        };


    /*
    ============================================================
    OPEN F7 MULTIPLIER
    ============================================================
    */

    const openMultiplier =
        () => {

            if (
                closeTimerRef.current
            ) {

                clearTimeout(
                    closeTimerRef.current
                );

            }


            /*
            Start fresh.

            Press F7
            then type quantity.
            */

            setMultiplierValue(
                ""
            );


            setMultiplierOpen(
                true
            );

        };


    /*
    ============================================================
    CANCEL MULTIPLIER
    ============================================================
    */

    const cancelMultiplier =
        () => {

            if (
                closeTimerRef.current
            ) {

                clearTimeout(
                    closeTimerRef.current
                );

            }


            resetPendingMultiplier();


            setMultiplierValue(
                ""
            );


            setMultiplierOpen(
                false
            );

        };


    /*
    ============================================================
    HANDLE NUMBER KEY
    ============================================================

    NO ENTER REQUIRED.

    Every number typed immediately updates:

    pendingMultiplier

    Example:

    F7

    press 1
    pendingMultiplier = 1

    press 5
    pendingMultiplier = 15

    The next product added will therefore use quantity 15.
    ============================================================
    */

    const addMultiplierDigit = (
        digit
    ) => {

        setMultiplierValue(
            (
                previous
            ) => {

                /*
                Maximum four digits.
                */

                if (
                    previous.length >=
                    4
                ) {

                    return previous;

                }


                /*
                Prevent leading zero.
                */

                if (
                    previous === "" &&
                    digit === "0"
                ) {

                    return previous;

                }


                const nextValue =
                    previous +
                    digit;


                const quantity =
                    Number(
                        nextValue
                    );


                if (
                    Number.isInteger(
                        quantity
                    ) &&
                    quantity >= 1
                ) {

                    /*
                    IMPORTANT:

                    Immediately arm the multiplier.
                    No Enter key required.
                    */

                    setPendingMultiplier(
                        quantity
                    );

                }


                /*
                Close the little entry box after typing stops.
                The multiplier remains active.
                */

                scheduleMultiplierClose();


                return nextValue;

            }
        );

    };


    /*
    ============================================================
    BACKSPACE
    ============================================================
    */

    const removeMultiplierDigit =
        () => {

            setMultiplierValue(
                (
                    previous
                ) => {

                    const nextValue =
                        previous.slice(
                            0,
                            -1
                        );


                    if (
                        nextValue
                    ) {

                        setPendingMultiplier(
                            Number(
                                nextValue
                            )
                        );

                    } else {

                        resetPendingMultiplier();

                    }


                    scheduleMultiplierClose();


                    return nextValue;

                }
            );

        };


    /*
    ============================================================
    KEYBOARD SHORTCUTS
    ============================================================
    */

    useEffect(
        () => {

            const handleKeyDown = (
                event
            ) => {

                /*
                =================================================
                F7
                =================================================
                */

                if (
                    event.key ===
                    "F7"
                ) {

                    event.preventDefault();

                    openMultiplier();

                    return;

                }


                /*
                =================================================
                ONLY CAPTURE NUMBERS WHILE F7 BOX IS OPEN
                =================================================
                */

                if (
                    !multiplierOpen
                ) {

                    return;

                }


                /*
                =================================================
                ESC = CANCEL MULTIPLIER
                =================================================
                */

                if (
                    event.key ===
                    "Escape"
                ) {

                    event.preventDefault();

                    cancelMultiplier();

                    return;

                }


                /*
                =================================================
                BACKSPACE
                =================================================
                */

                if (
                    event.key ===
                    "Backspace"
                ) {

                    event.preventDefault();

                    removeMultiplierDigit();

                    return;

                }


                /*
                =================================================
                NUMBER 0-9
                =================================================
                */

                if (
                    /^[0-9]$/.test(
                        event.key
                    )
                ) {

                    event.preventDefault();

                    addMultiplierDigit(
                        event.key
                    );

                }

            };


            window.addEventListener(
                "keydown",
                handleKeyDown
            );


            return () => {

                window.removeEventListener(
                    "keydown",
                    handleKeyDown
                );

            };

        },
        [
            multiplierOpen,
        ]
    );


    /*
    ============================================================
    CLEAN TIMER
    ============================================================
    */

    useEffect(
        () => {

            return () => {

                if (
                    closeTimerRef.current
                ) {

                    clearTimeout(
                        closeTimerRef.current
                    );

                }

            };

        },
        []
    );


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <div
            className="
                relative
                bg-base-100
                rounded-xl
                shadow-sm
                border
                border-base-200
                h-full
                flex
                flex-col
                min-h-0
            "
        >

            <div
                className="
                    p-3
                    flex
                    flex-col
                    h-full
                    min-h-0
                "
            >


                {/* ==========================================
                    HELD SALES
                ========================================== */}

                {heldCarts.length > 0 && (

                    <div
                        className="
                            shrink-0
                            mb-2
                            pb-2
                            border-b
                            border-base-200
                        "
                    >

                        <div
                            className="
                                flex
                                items-center
                                justify-between
                                mb-1.5
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-1.5
                                "
                            >

                                <span className="text-xs">
                                    🕐
                                </span>


                                <span
                                    className="
                                        text-[10px]
                                        font-bold
                                    "
                                >
                                    Held Sales
                                </span>


                                <span
                                    className="
                                        badge
                                        badge-warning
                                        badge-xs
                                    "
                                >

                                    {
                                        heldCarts.length
                                    }

                                </span>

                            </div>

                        </div>


                        <div
                            className="
                                flex
                                gap-1.5
                                overflow-x-auto
                                pb-1
                            "
                        >

                            {heldCarts.map(
                                (
                                    cart
                                ) => (

                                    <div
                                        key={
                                            cart.id
                                        }
                                        className="
                                            shrink-0
                                            w-[105px]
                                            border
                                            border-base-300
                                            rounded-lg
                                            p-1.5
                                            bg-base-200/50
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                justify-between
                                                items-center
                                            "
                                        >

                                            <span
                                                className="
                                                    text-[9px]
                                                    font-bold
                                                "
                                            >

                                                Hold #
                                                {
                                                    cart.holdNumber
                                                }

                                            </span>

                                        </div>


                                        <div
                                            className="
                                                text-[8px]
                                                text-base-content/50
                                                mt-0.5
                                            "
                                        >

                                            {
                                                cart.items.length
                                            } item

                                            {
                                                cart.items.length !==
                                                1 &&
                                                "s"
                                            }

                                            {" • ₱"}

                                            {
                                                Number(
                                                    cart.subtotal ??
                                                    0
                                                ).toFixed(
                                                    2
                                                )
                                            }

                                        </div>


                                        <div
                                            className="
                                                text-[8px]
                                                text-base-content/40
                                                mt-0.5
                                            "
                                        >

                                            {
                                                new Date(
                                                    cart.createdAt
                                                )
                                                    .toLocaleTimeString(
                                                        [],
                                                        {
                                                            hour:
                                                                "2-digit",

                                                            minute:
                                                                "2-digit",
                                                        }
                                                    )
                                            }

                                        </div>


                                        <div
                                            className="
                                                flex
                                                gap-1
                                                mt-1.5
                                            "
                                        >

                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-primary
                                                    btn-xs
                                                    h-5
                                                    min-h-0
                                                    text-[8px]
                                                    flex-1
                                                "
                                                onClick={() =>
                                                    resumeCart(
                                                        cart.id
                                                    )
                                                }
                                            >

                                                Resume

                                            </button>


                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-ghost
                                                    btn-xs
                                                    h-5
                                                    min-h-0
                                                    px-1
                                                    text-[9px]
                                                    text-error
                                                "
                                                title="Delete held sale"
                                                onClick={() => {

                                                    if (
                                                        window.confirm(
                                                            `Delete Hold #${cart.holdNumber}?`
                                                        )
                                                    ) {

                                                        deleteHeldCart(
                                                            cart.id
                                                        );

                                                    }

                                                }}
                                            >

                                                ×

                                            </button>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    </div>

                )}


                {/* ==========================================
                    CURRENT SALE HEADER
                ========================================== */}

                <div
                    className="
                        shrink-0
                        flex
                        justify-between
                        items-center
                        pb-2
                        border-b
                        border-base-200
                    "
                >

                    <div>

                        <h2
                            className="
                                text-sm
                                font-bold
                            "
                        >
                            Current Sale
                        </h2>


                        <p
                            className="
                                text-[9px]
                                text-base-content/50
                            "
                        >
                            Receipt
                        </p>

                    </div>


                    <div
                        className="
                            flex
                            items-center
                            gap-2
                        "
                    >


                        {/* ==================================
                            MULTIPLIER ACTIVE BADGE
                        ================================== */}

                        {Number(
                            pendingMultiplier
                        ) > 1 && (

                            <button
                                type="button"
                                onClick={
                                    cancelMultiplier
                                }
                                className="
                                    badge
                                    badge-warning
                                    badge-sm
                                    font-black
                                    cursor-pointer
                                    gap-1
                                "
                                title="Click to cancel multiplier"
                            >

                                X
                                {
                                    pendingMultiplier
                                }

                                <span className="text-[8px]">
                                    ×
                                </span>

                            </button>

                        )}


                        <span
                            className="
                                badge
                                badge-primary
                                badge-sm
                            "
                        >

                            {
                                items.length
                            } item

                            {
                                items.length !==
                                1 &&
                                "s"
                            }

                        </span>

                    </div>

                </div>


                {/* ==========================================
                    ACTIVE MULTIPLIER NOTICE
                ========================================== */}

                {Number(
                    pendingMultiplier
                ) > 1 && (

                    <div
                        className="
                            shrink-0
                            mt-2
                            rounded-lg
                            border
                            border-warning/40
                            bg-warning/10
                            px-3
                            py-2
                            flex
                            items-center
                            justify-between
                            gap-2
                        "
                    >

                        <div
                            className="
                                flex
                                items-center
                                gap-2
                            "
                        >

                            <div
                                className="
                                    h-7
                                    min-w-7
                                    px-1.5
                                    rounded-md
                                    bg-warning
                                    text-warning-content
                                    flex
                                    items-center
                                    justify-center
                                    text-xs
                                    font-black
                                "
                            >

                                X
                                {
                                    pendingMultiplier
                                }

                            </div>


                            <div>

                                <p
                                    className="
                                        text-[9px]
                                        font-bold
                                    "
                                >
                                    NEXT ITEM
                                </p>


                                <p
                                    className="
                                        text-[8px]
                                        text-base-content/50
                                    "
                                >

                                    Scan or select product

                                </p>

                            </div>

                        </div>


                        <button
                            type="button"
                            className="
                                text-[9px]
                                text-error
                                hover:underline
                            "
                            onClick={
                                cancelMultiplier
                            }
                        >

                            Cancel

                        </button>

                    </div>

                )}


                {/* ==========================================
                    COLUMN HEADERS
                ========================================== */}

                {items.length > 0 && (

                    <div
                        className="
                            shrink-0
                            grid
                            grid-cols-[1fr_50px_45px_18px]
                            gap-2
                            items-center
                            text-[9px]
                            text-base-content/50
                            px-1
                            py-2
                        "
                    >

                        <span>
                            Item
                        </span>

                        <span className="text-right">
                            Price
                        </span>

                        <span className="text-center">
                            Qty
                        </span>

                        <span />

                    </div>

                )}


                {/* ==========================================
                    CART ITEMS
                ========================================== */}

                <div
                    className="
                        flex-1
                        min-h-0
                        overflow-y-auto
                        overflow-x-hidden
                    "
                >

                    {items.length === 0 ? (

                        <div
                            className="
                                h-full
                                flex
                                flex-col
                                items-center
                                justify-center
                                text-base-content/40
                            "
                        >

                            <div
                                className="
                                    w-14
                                    h-14
                                    rounded-full
                                    bg-indigo-50
                                    flex
                                    items-center
                                    justify-center
                                    mb-3
                                "
                            >

                                <span
                                    className="
                                        text-2xl
                                        text-indigo-400
                                    "
                                >
                                    🛒
                                </span>

                            </div>


                            <p
                                className="
                                    text-xs
                                    font-medium
                                "
                            >
                                Cart is empty
                            </p>


                            <p
                                className="
                                    text-[9px]
                                    mt-1
                                "
                            >
                                Scan or select a product
                            </p>


                            {Number(
                                pendingMultiplier
                            ) > 1 && (

                                <div
                                    className="
                                        mt-4
                                        badge
                                        badge-warning
                                        font-bold
                                    "
                                >

                                    Next item X
                                    {
                                        pendingMultiplier
                                    }

                                </div>

                            )}

                        </div>

                    ) : (

                        <div>

                            {items.map(
                                (
                                    item
                                ) => (

                                    <div
                                        key={
                                            item._id
                                        }
                                        className="
                                            grid
                                            grid-cols-[1fr_50px_45px_18px]
                                            gap-2
                                            items-center
                                            border-b
                                            border-base-200
                                            px-1
                                            py-2
                                            hover:bg-base-200/50
                                            transition
                                        "
                                    >

                                        {/* ITEM */}

                                        <div className="min-w-0">

                                            <p
                                                className="
                                                    text-[10px]
                                                    font-semibold
                                                    truncate
                                                "
                                            >

                                                {
                                                    item.name
                                                }

                                            </p>


                                            <p
                                                className="
                                                    text-[9px]
                                                    text-base-content/50
                                                "
                                            >

                                                ₱

                                                {(() => {

                                                    if (
                                                        !item.pricing ||
                                                        item.pricing.length ===
                                                        0
                                                    ) {

                                                        return Number(
                                                            item.unitPrice ??
                                                            item.price ??
                                                            0
                                                        ).toFixed(
                                                            2
                                                        );

                                                    }


                                                    /*
                                                    NORMAL PRICE
                                                    */

                                                    if (
                                                        !wholesaleMode
                                                    ) {

                                                        const regularPrice =
                                                            item.pricing
                                                                .find(
                                                                    (
                                                                        tier
                                                                    ) =>
                                                                        Number(
                                                                            tier.quantity
                                                                        ) ===
                                                                        1
                                                                )
                                                                ?.price ??
                                                            0;


                                                        return Number(
                                                            regularPrice
                                                        ).toFixed(
                                                            2
                                                        );

                                                    }


                                                    /*
                                                    WHOLESALE PRICE
                                                    */

                                                    const wholesaleTier =
                                                        item.pricing.reduce(
                                                            (
                                                                best,
                                                                tier
                                                            ) => {

                                                                const quantity =
                                                                    Number(
                                                                        tier.quantity
                                                                    );


                                                                const price =
                                                                    Number(
                                                                        tier.price
                                                                    );


                                                                if (
                                                                    quantity <=
                                                                        0 ||
                                                                    price <=
                                                                        0
                                                                ) {

                                                                    return best;

                                                                }


                                                                const unitPrice =
                                                                    price /
                                                                    quantity;


                                                                if (
                                                                    !best ||
                                                                    unitPrice <
                                                                    best.unitPrice
                                                                ) {

                                                                    return {
                                                                        unitPrice,
                                                                    };

                                                                }


                                                                return best;

                                                            },
                                                            null
                                                        );


                                                    return Number(
                                                        wholesaleTier
                                                            ?.unitPrice ??
                                                        0
                                                    ).toFixed(
                                                        2
                                                    );

                                                })()}

                                            </p>

                                        </div>


                                        {/* PRICE */}

                                        <div
                                            className="
                                                text-right
                                                text-[10px]
                                                font-medium
                                            "
                                        >

                                            ₱
                                            {
                                                Number(
                                                    item.subtotal ??
                                                    0
                                                ).toFixed(
                                                    2
                                                )
                                            }

                                        </div>


                                        {/* QUANTITY */}

                                        <div
                                            className="
                                                flex
                                                items-center
                                                justify-center
                                            "
                                        >

                                            <div
                                                className="
                                                    flex
                                                    items-center
                                                    border
                                                    border-base-300
                                                    rounded-md
                                                    overflow-hidden
                                                "
                                            >

                                                <button
                                                    type="button"
                                                    className="
                                                        w-5
                                                        h-5
                                                        text-[10px]
                                                        hover:bg-base-200
                                                    "
                                                    onClick={() =>
                                                        decreaseQuantity(
                                                            item._id
                                                        )
                                                    }
                                                >

                                                    -

                                                </button>


                                                <span
                                                    className="
                                                        w-6
                                                        text-center
                                                        text-[9px]
                                                        font-semibold
                                                    "
                                                >

                                                    {
                                                        item.quantity
                                                    }

                                                </span>


                                                <button
                                                    type="button"
                                                    className="
                                                        w-5
                                                        h-5
                                                        text-[10px]
                                                        hover:bg-base-200
                                                    "
                                                    onClick={() =>
                                                        increaseQuantity(
                                                            item._id
                                                        )
                                                    }
                                                >

                                                    +

                                                </button>

                                            </div>

                                        </div>


                                        {/* REMOVE */}

                                        <button
                                            type="button"
                                            className="
                                                text-[10px]
                                                text-base-content/40
                                                hover:text-error
                                                transition
                                            "
                                            title="Remove item"
                                            onClick={() =>
                                                removeItem(
                                                    item._id
                                                )
                                            }
                                        >

                                            ×

                                        </button>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>


                {/* ==========================================
                    TOTALS
                ========================================== */}

                <div
                    className="
                        shrink-0
                        border-t
                        border-base-300
                        mt-2
                        pt-2
                    "
                >

                    <div
                        className="
                            flex
                            justify-between
                            text-xs
                            mb-1
                        "
                    >

                        <span className="text-base-content/60">
                            Subtotal
                        </span>


                        <span>

                            ₱
                            {
                                subtotal.toFixed(
                                    2
                                )
                            }

                        </span>

                    </div>


                    <div
                        className="
                            flex
                            justify-between
                            text-xs
                            mb-2
                        "
                    >

                        <span className="text-base-content/60">
                            Discount
                        </span>


                        <span>
                            ₱0.00
                        </span>

                    </div>


                    <div
                        className="
                            flex
                            justify-between
                            items-center
                            border-t
                            border-base-200
                            pt-2
                        "
                    >

                        <span
                            className="
                                text-sm
                                font-bold
                            "
                        >
                            Total
                        </span>


                        <span
                            className="
                                text-lg
                                font-bold
                            "
                        >

                            ₱
                            {
                                subtotal.toFixed(
                                    2
                                )
                            }

                        </span>

                    </div>


                    <button
                        type="button"
                        className="
                            btn
                            btn-primary
                            btn-sm
                            w-full
                            mt-3
                        "
                        disabled={
                            items.length ===
                            0
                        }
                        onClick={
                            onCheckout
                        }
                    >

                        Checkout


                        <kbd
                            className="
                                kbd
                                kbd-xs
                                ml-1
                            "
                        >

                            F2

                        </kbd>

                    </button>

                </div>

            </div>


            {/* ==================================================
                F7 MULTIPLIER POPUP

                IMPORTANT:
                ABSOLUTE — NOT FIXED.

                Therefore it only covers the CART PANEL,
                not the product section.
            ================================================== */}

            {multiplierOpen && (

                <div
                    className="
                        absolute
                        inset-0
                        z-[200]
                        flex
                        items-center
                        justify-center
                        rounded-xl
                        bg-base-100/75
                        backdrop-blur-[2px]
                    "
                >

                    <div
                        className="
                            w-[190px]
                            h-[190px]
                            rounded-2xl
                            border-2
                            border-primary/30
                            bg-base-100
                            shadow-xl
                            flex
                            flex-col
                            items-center
                            justify-center
                        "
                    >

                        {/* F7 */}

                        <div
                            className="
                                text-[9px]
                                uppercase
                                tracking-[0.18em]
                                font-bold
                                text-base-content/40
                            "
                        >

                            F7 Multiplier

                        </div>


                        {/* ==================================
                            LIVE VALUE

                            Type:

                            1 → X1
                            5 → X15

                            No Enter.
                        ================================== */}

                        <div
                            className="
                                mt-3
                                text-6xl
                                font-black
                                tracking-tight
                                text-primary
                            "
                        >

                            X
                            {
                                multiplierValue ||
                                "0"
                            }

                        </div>


                        <div
                            className="
                                mt-3
                                text-[10px]
                                text-base-content/50
                            "
                        >

                            Type quantity

                        </div>


                        <div
                            className="
                                mt-2
                                text-[8px]
                                text-base-content/35
                            "
                        >

                            No Enter required

                        </div>


                        <button
                            type="button"
                            onClick={
                                cancelMultiplier
                            }
                            className="
                                mt-3
                                text-[9px]
                                text-error
                                hover:underline
                            "
                        >

                            Esc to cancel

                        </button>

                    </div>

                </div>

            )}

        </div>

    );

}


export default CartPanel;