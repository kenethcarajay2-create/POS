import {
    useEffect,
    useRef,
    useState,
} from "react";

import useCartStore from "../../store/cart.store";


function CartPanel({
    onCheckout,

    // Keyboard navigation controlled by POSPage
    keyboardActive = false,
    selectedIndex = 0,
    onSelectedIndexChange,
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
    REFS
    ============================================================
    */

    const closeTimerRef =
        useRef(null);


    const cartItemRefs =
        useRef([]);


    /*
    Actual scrollable cart container.
    */

    const cartListRef =
        useRef(null);


    /*
    Used to detect when a NEW cart line has been added.
    */

    const previousItemCountRef =
        useRef(
            items.length
        );


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
    KEEP SELECTED CART ITEM VALID
    ============================================================
    */

    useEffect(
        () => {

            if (
                items.length ===
                0
            ) {

                onSelectedIndexChange?.(
                    0
                );

                return;

            }


            if (
                selectedIndex >
                items.length - 1
            ) {

                onSelectedIndexChange?.(
                    items.length - 1
                );

            }

        },
        [
            items.length,
            selectedIndex,
            onSelectedIndexChange,
        ]
    );


    /*
    ============================================================
    AUTO FOLLOW NEWLY ADDED CART ITEM
    ============================================================

    When a NEW product line is added:

    1. Detect that items.length increased
    2. Select the newest cart item
    3. Scroll the cart list to the bottom

    Quantity changes do not trigger this because items.length
    does not change.
    ============================================================
    */

    useEffect(
        () => {

            const previousCount =
                previousItemCountRef.current;


            const currentCount =
                items.length;


            /*
            ====================================================
            NEW CART LINE ADDED
            ====================================================
            */

            if (
                currentCount >
                previousCount
            ) {

                const newestIndex =
                    currentCount -
                    1;


                /*
                Make newest item the current cart selection.
                */

                onSelectedIndexChange?.(
                    newestIndex
                );


                /*
                Wait until React renders the new cart row.
                */

                const frame =
                    requestAnimationFrame(
                        () => {

                            const container =
                                cartListRef.current;


                            if (
                                !container
                            ) {

                                return;

                            }


                            /*
                            Force the cart to the bottom.

                            This is intentionally direct instead of
                            smooth scrolling because barcode scanning
                            can add products very quickly.
                            */

                            container.scrollTop =
                                container.scrollHeight;


                            /*
                            Run once more after layout settles.

                            This handles cases where the row changes
                            the container's scrollHeight during paint.
                            */

                            requestAnimationFrame(
                                () => {

                                    if (
                                        cartListRef.current
                                    ) {

                                        cartListRef.current
                                            .scrollTop =
                                            cartListRef.current
                                                .scrollHeight;

                                    }

                                }
                            );

                        }
                    );


                /*
                Save count immediately.
                */

                previousItemCountRef.current =
                    currentCount;


                return () => {

                    cancelAnimationFrame(
                        frame
                    );

                };

            }


            /*
            ====================================================
            CART ITEM REMOVED / CART CLEARED
            ====================================================
            */

            previousItemCountRef.current =
                currentCount;

        },
        [
            items.length,
            onSelectedIndexChange,
        ]
    );


    /*
    ============================================================
    AUTO SCROLL SELECTED CART ITEM
    ============================================================

    Used when keyboard navigation is ACTIVE.

    ↑ / ↓ changes selectedIndex and this makes sure the
    highlighted cart row stays visible.
    ============================================================
    */

    useEffect(
        () => {

            if (
                !keyboardActive
            ) {

                return;

            }


            const container =
                cartListRef.current;


            const element =
                cartItemRefs.current[
                    selectedIndex
                ];


            if (
                !container ||
                !element
            ) {

                return;

            }


            const frame =
                requestAnimationFrame(
                    () => {

                        const containerRect =
                            container
                                .getBoundingClientRect();


                        const elementRect =
                            element
                                .getBoundingClientRect();


                        const padding =
                            4;


                        /*
                        Selected row below visible area.
                        */

                        if (
                            elementRect.bottom >
                            containerRect.bottom -
                                padding
                        ) {

                            container.scrollTop +=
                                elementRect.bottom -
                                containerRect.bottom +
                                padding;


                            return;

                        }


                        /*
                        Selected row above visible area.
                        */

                        if (
                            elementRect.top <
                            containerRect.top +
                                padding
                        ) {

                            container.scrollTop -=
                                containerRect.top -
                                elementRect.top +
                                padding;

                        }

                    }
                );


            return () => {

                cancelAnimationFrame(
                    frame
                );

            };

        },
        [
            selectedIndex,
            keyboardActive,
        ]
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
    */

    const addMultiplierDigit = (
        digit
    ) => {

        setMultiplierValue(
            (
                previous
            ) => {

                /*
                Maximum four digits
                */

                if (
                    previous.length >=
                    4
                ) {

                    return previous;

                }


                /*
                Prevent leading zero
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

                    setPendingMultiplier(
                        quantity
                    );

                }


                scheduleMultiplierClose();


                return nextValue;

            }
        );

    };


    /*
    ============================================================
    REMOVE MULTIPLIER DIGIT
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
    F7 KEYBOARD SHORTCUT
    ============================================================

    Main cart navigation:
        Up
        Down
        Left
        Right
        Delete

    is handled by POSPage.

    CartPanel only owns the F7 multiplier keyboard.
    ============================================================
    */

    useEffect(
        () => {

            const handleKeyDown =
                (
                    event
                ) => {

                    /*
                    =============================================
                    F7
                    =============================================
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
                    =============================================
                    ONLY CAPTURE WHILE MULTIPLIER IS OPEN
                    =============================================
                    */

                    if (
                        !multiplierOpen
                    ) {

                        return;

                    }


                    /*
                    =============================================
                    ESCAPE
                    =============================================
                    */

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        event.preventDefault();

                        event.stopImmediatePropagation?.();


                        cancelMultiplier();

                        return;

                    }


                    /*
                    =============================================
                    BACKSPACE
                    =============================================
                    */

                    if (
                        event.key ===
                        "Backspace"
                    ) {

                        event.preventDefault();

                        event.stopImmediatePropagation?.();


                        removeMultiplierDigit();

                        return;

                    }


                    /*
                    =============================================
                    NUMBERS 0-9
                    =============================================
                    */

                    if (
                        /^[0-9]$/.test(
                            event.key
                        )
                    ) {

                        event.preventDefault();

                        event.stopImmediatePropagation?.();


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
    PRICE DISPLAY HELPER
    ============================================================
    */

    const getDisplayUnitPrice =
        (
            item
        ) => {

            /*
            ----------------------------------------------------
            OPEN PRICE / NO PRICING TIERS
            ----------------------------------------------------
            */

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
            ----------------------------------------------------
            NORMAL PRICE
            ----------------------------------------------------
            */

            if (
                !wholesaleMode
            ) {

                const regularPrice =
                    item.pricing.find(
                        (
                            tier
                        ) =>
                            Number(
                                tier.quantity
                            ) ===
                            1
                    )?.price ??
                    item.pricing[0]
                        ?.price ??
                    0;


                return Number(
                    regularPrice
                ).toFixed(
                    2
                );

            }


            /*
            ----------------------------------------------------
            WHOLESALE PRICE
            ----------------------------------------------------
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

        };


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <div
            className={`
                relative
                bg-base-100
                rounded-xl
                shadow-sm
                border-2
                h-full
                flex
                flex-col
                min-h-0
                transition-all
                duration-150

                ${
                    keyboardActive

                        ? `
                            border-primary
                            ring-2
                            ring-primary/20
                          `

                        : `
                            border-base-200
                          `
                }
            `}
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

                {
                    heldCarts.length >
                    0 && (

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

                                {
                                    heldCarts.map(
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
                                    )
                                }

                            </div>

                        </div>

                    )
                }


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

                        <div
                            className="
                                flex
                                items-center
                                gap-2
                            "
                        >

                            <h2
                                className="
                                    text-sm
                                    font-bold
                                "
                            >

                                Current Sale

                            </h2>


                            {
                                keyboardActive && (

                                    <span
                                        className="
                                            badge
                                            badge-primary
                                            badge-xs
                                            font-bold
                                        "
                                    >

                                        ACTIVE

                                    </span>

                                )
                            }

                        </div>


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

                        {
                            Number(
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

                            )
                        }


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

                {
                    Number(
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

                    )
                }


                {/* ==========================================
                    COLUMN HEADERS
                ========================================== */}

                {
                    items.length >
                    0 && (

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

                    )
                }


                {/* ==========================================
                    CART ITEMS
                ========================================== */}

                <div
                    ref={
                        cartListRef
                    }
                    className="
                        flex-1
                        min-h-0
                        overflow-y-auto
                        overflow-x-hidden
                    "
                >

                    {
                        items.length ===
                        0 ? (

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


                                {
                                    Number(
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

                                    )
                                }

                            </div>

                        ) : (

                            <div>

                                {
                                    items.map(
                                        (
                                            item,
                                            index
                                        ) => {

                                            const selected =

                                                keyboardActive &&

                                                selectedIndex ===
                                                    index;


                                            return (

                                                <div
                                                    key={
                                                        item._id
                                                    }

                                                    ref={(
                                                        element
                                                    ) => {

                                                        cartItemRefs
                                                            .current[
                                                                index
                                                            ] =
                                                            element;

                                                    }}

                                                    onClick={() => {

                                                        onSelectedIndexChange?.(
                                                            index
                                                        );

                                                    }}

                                                    className={`
                                                        grid
                                                        grid-cols-[1fr_50px_45px_18px]
                                                        gap-2
                                                        items-center
                                                        border-b
                                                        px-1
                                                        py-2
                                                        transition-all
                                                        duration-100
                                                        cursor-pointer

                                                        ${
                                                            selected

                                                                ? `
                                                                    bg-primary
                                                                    text-primary-content
                                                                    border-primary
                                                                  `

                                                                : `
                                                                    border-base-200
                                                                    hover:bg-base-200/50
                                                                  `
                                                        }
                                                    `}
                                                >


                                                    {/* =====================
                                                        ITEM
                                                    ===================== */}

                                                    <div className="min-w-0">

                                                        {/* PRODUCT NAME */}

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


                                                        {/* OPEN PRICE NOTE */}

                                                        {
                                                            item.isOpenPrice &&
                                                            item.note && (

                                                                <p
                                                                    className={`
                                                                        mt-0.5
                                                                        text-[9px]
                                                                        font-medium
                                                                        leading-tight
                                                                        truncate

                                                                        ${
                                                                            selected

                                                                                ? "text-primary-content/90"

                                                                                : "text-primary"
                                                                        }
                                                                    `}
                                                                    title={
                                                                        item.note
                                                                    }
                                                                >

                                                                    {
                                                                        item.note
                                                                    }

                                                                </p>

                                                            )
                                                        }


                                                        {/* UNIT PRICE */}

                                                        <p
                                                            className={`
                                                                text-[9px]

                                                                ${
                                                                    selected

                                                                        ? "text-primary-content/70"

                                                                        : "text-base-content/50"
                                                                }
                                                            `}
                                                        >

                                                            ₱

                                                            {
                                                                getDisplayUnitPrice(
                                                                    item
                                                                )
                                                            }

                                                        </p>

                                                    </div>


                                                    {/* =====================
                                                        PRICE
                                                    ===================== */}

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


                                                    {/* =====================
                                                        QUANTITY
                                                    ===================== */}

                                                    <div
                                                        className="
                                                            flex
                                                            items-center
                                                            justify-center
                                                        "
                                                    >

                                                        <div
                                                            className={`
                                                                flex
                                                                items-center
                                                                border
                                                                rounded-md
                                                                overflow-hidden

                                                                ${
                                                                    selected

                                                                        ? "border-primary-content/40"

                                                                        : "border-base-300"
                                                                }
                                                            `}
                                                        >

                                                            <button
                                                                type="button"
                                                                className={`
                                                                    w-5
                                                                    h-5
                                                                    text-[10px]

                                                                    ${
                                                                        selected

                                                                            ? "hover:bg-primary-content/20"

                                                                            : "hover:bg-base-200"
                                                                    }
                                                                `}
                                                                onClick={(
                                                                    event
                                                                ) => {

                                                                    event.stopPropagation();


                                                                    onSelectedIndexChange?.(
                                                                        index
                                                                    );


                                                                    if (
                                                                        Number(
                                                                            item.quantity
                                                                        ) >
                                                                        1
                                                                    ) {

                                                                        decreaseQuantity(
                                                                            item._id
                                                                        );

                                                                    }

                                                                }}
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
                                                                className={`
                                                                    w-5
                                                                    h-5
                                                                    text-[10px]

                                                                    ${
                                                                        selected

                                                                            ? "hover:bg-primary-content/20"

                                                                            : "hover:bg-base-200"
                                                                    }
                                                                `}
                                                                onClick={(
                                                                    event
                                                                ) => {

                                                                    event.stopPropagation();


                                                                    onSelectedIndexChange?.(
                                                                        index
                                                                    );


                                                                    increaseQuantity(
                                                                        item._id
                                                                    );

                                                                }}
                                                            >

                                                                +

                                                            </button>

                                                        </div>

                                                    </div>


                                                    {/* =====================
                                                        REMOVE
                                                    ===================== */}

                                                    <button
                                                        type="button"
                                                        className={`
                                                            text-[10px]
                                                            transition

                                                            ${
                                                                selected

                                                                    ? `
                                                                        text-primary-content/70
                                                                        hover:text-primary-content
                                                                      `

                                                                    : `
                                                                        text-base-content/40
                                                                        hover:text-error
                                                                      `
                                                            }
                                                        `}
                                                        title="Remove item"
                                                        onClick={(
                                                            event
                                                        ) => {

                                                            event.stopPropagation();


                                                            removeItem(
                                                                item._id
                                                            );

                                                        }}
                                                    >

                                                        ×

                                                    </button>

                                                </div>

                                            );

                                        }
                                    )
                                }

                            </div>

                        )
                    }

                </div>


                {/* ==========================================
                    KEYBOARD HELP
                ========================================== */}

                {
                    keyboardActive &&
                    items.length >
                        0 && (

                        <div
                            className="
                                shrink-0
                                border-t
                                border-primary/20
                                bg-primary/5
                                px-2
                                py-1.5
                                flex
                                flex-wrap
                                justify-center
                                gap-x-3
                                gap-y-1
                                text-[8px]
                                text-base-content/60
                            "
                        >

                            <span>

                                <kbd className="kbd kbd-xs">
                                    ↑
                                </kbd>

                                {" "}

                                <kbd className="kbd kbd-xs">
                                    ↓
                                </kbd>

                                {" "}Select

                            </span>


                            <span>

                                <kbd className="kbd kbd-xs">
                                    ←
                                </kbd>

                                {" "}− Qty

                            </span>


                            <span>

                                <kbd className="kbd kbd-xs">
                                    →
                                </kbd>

                                {" "}+ Qty

                            </span>


                            <span>

                                <kbd className="kbd kbd-xs">
                                    Del
                                </kbd>

                                {" "}Remove

                            </span>

                        </div>

                    )
                }


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
            ================================================== */}

            {
                multiplierOpen && (

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

                )
            }

        </div>

    );

}


export default CartPanel;