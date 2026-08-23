import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import SearchBar from "../../components/pos/SearchBar";
import CategorySidebar from "../../components/pos/CategorySidebar";
import ProductGrid from "../../components/pos/ProductGrid";
import CartPanel from "../../components/pos/CartPanel";
import BarcodeScanner from "../../components/pos/BarcodeScanner";
import ShortcutBar from "../../components/pos/ShortcutBar";
import CheckoutModal from "../../components/pos/CheckoutModal";
import ReceiptModal from "../../components/pos/ReceiptModal";

import saleService from "../../services/sale.service";

import useCartStore from "../../store/cart.store";
import useAuthStore from "../../store/auth.store";


function POSPage() {

    /*
    ============================================================
    USER
    ============================================================
    */

    const user =
        useAuthStore(
            (state) =>
                state.user
        );


    /*
    ============================================================
    CART STORE
    ============================================================
    */

    const {
        items,

        clearCart,

        holdCart,

        resumeLatestCart,

        wholesaleMode,

        toggleWholesale,

        /*
        --------------------------------------------------------
        F7 MULTIPLIER
        --------------------------------------------------------
        */

        pendingMultiplier,

        /*
        --------------------------------------------------------
        F6 OPEN PRICE
        --------------------------------------------------------
        */

        addOpenPriceItem,

    } = useCartStore();


    /*
    ============================================================
    CHECKOUT
    ============================================================
    */

    const [
        checkoutOpen,
        setCheckoutOpen,
    ] = useState(false);


    /*
    ============================================================
    RECEIPT
    ============================================================
    */

    const [
        receiptOpen,
        setReceiptOpen,
    ] = useState(false);


    const [
        lastSale,
        setLastSale,
    ] = useState(null);


    /*
    ============================================================
    F6 OPEN PRICE
    ============================================================
    */

    const [
        openPriceOpen,
        setOpenPriceOpen,
    ] = useState(false);


    const [
        openPriceValue,
        setOpenPriceValue,
    ] = useState("");


    const openPriceInputRef =
        useRef(null);


    /*
    ============================================================
    SUBTOTAL
    ============================================================
    */

    const subtotal =
        useMemo(
            () => {

                return items.reduce(
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

            },
            [
                items,
            ]
        );


    /*
    ============================================================
    OPEN F6 OPEN PRICE
    ============================================================
    */
const openOpenPrice = () => {

    /*
    Remove focus from POS search / barcode inputs first.
    */

    if (
        document.activeElement instanceof
        HTMLElement
    ) {

        document.activeElement.blur();

    }


    setOpenPriceValue(
        ""
    );


    setOpenPriceOpen(
        true
    );

};

    /*
    ============================================================
    CLOSE F6 OPEN PRICE
    ============================================================
    */

    const closeOpenPrice =
        () => {

            setOpenPriceOpen(
                false
            );


            setOpenPriceValue(
                ""
            );

        };


    /*
    ============================================================
    ADD OPEN PRICE ITEM
    ============================================================
    */

    const handleAddOpenPrice =
        () => {

            const amount =
                Number(
                    openPriceValue
                );


            if (
                !Number.isFinite(
                    amount
                ) ||
                amount <= 0
            ) {

                return;

            }


            const success =
                addOpenPriceItem({
                    name:
                        "Grocery",

                    amount,
                });


            if (
                success === false
            ) {

                return;

            }


            closeOpenPrice();

        };


    /*
    ============================================================
    AUTO FOCUS OPEN PRICE INPUT
    ============================================================
    */
useEffect(
    () => {

        if (
            !openPriceOpen
        ) {

            return;

        }


        const timer =
            setTimeout(
                () => {

                    const input =
                        openPriceInputRef.current;


                    if (!input) {

                        return;

                    }


                    input.focus();


                    /*
                    Put cursor at the end.
                    */

                    const length =
                        input.value.length;


                    input.setSelectionRange(
                        length,
                        length
                    );

                },
                50
            );


        return () => {

            clearTimeout(
                timer
            );

        };

    },
    [
        openPriceOpen,
    ]
);

    /*
    ============================================================
    CHECKOUT
    ============================================================
    */

    const handleCheckout =
        async (
            paymentInfo
        ) => {

            try {

                /*
                ====================================================
                BUILD CHECKOUT PAYLOAD
                ====================================================

                NORMAL PRODUCTS:
                productId + quantity

                OPEN PRICE ITEMS:
                manual line data

                NOTE:
                Your backend must also support open-price items.
                ====================================================
                */

                const checkoutData = {

                    items:
                        items.map(
                            (
                                item
                            ) => {

                                /*
                                ------------------------------------
                                OPEN PRICE / GROCERY
                                ------------------------------------
                                */

                                if (
                                    item.isOpenPrice
                                ) {

                                    return {

                                        isOpenPrice:
                                            true,

                                        name:
                                            item.name,

                                        quantity:
                                            item.quantity,

                                        unitPrice:
                                            Number(
                                                item.unitPrice
                                            ),

                                    };

                                }


                                /*
                                ------------------------------------
                                NORMAL PRODUCT
                                ------------------------------------
                                */

                                return {

                                    isOpenPrice:
                                        false,

                                    productId:
                                        item._id,

                                    quantity:
                                        item.quantity,

                                };

                            }
                        ),

                    discount:
                        0,

                    payment:
                        paymentInfo
                            .cashReceived,

                    paymentMethod:
                        "Cash",

                };


                /*
                ====================================================
                COMPLETE SALE
                ====================================================
                */

                const sale =
                    await saleService
                        .checkout(
                            checkoutData
                        );


                /*
                ====================================================
                OPEN CASH DRAWER
                ====================================================
                */

                try {

                    await saleService
                        .openCashDrawer();

                } catch (
                    drawerError
                ) {

                    console.error(
                        "Cash drawer failed to open:",
                        drawerError
                    );

                }


                /*
                ====================================================
                AUTOMATIC PRINT
                ====================================================
                */

                if (
                    paymentInfo
                        .printReceipt ===
                    true
                ) {

                    try {

                        await saleService
                            .printSale(
                                sale._id
                            );

                    } catch (
                        printError
                    ) {

                        console.error(
                            "Receipt printing failed:",
                            printError
                        );

                    }

                }


                /*
                ====================================================
                FINISH SALE
                ====================================================
                */

                clearCart();


                setCheckoutOpen(
                    false
                );


                setLastSale(
                    sale
                );


                setReceiptOpen(
                    true
                );


            } catch (
                error
            ) {

                alert(
                    error.response
                        ?.data
                        ?.message ??
                    "Checkout failed."
                );

            }

        };


    /*
    ============================================================
    KEYBOARD SHORTCUTS
    ============================================================
    */

    useEffect(
        () => {

            const handleShortcuts =
                (
                    event
                ) => {

                    /*
                    =================================================
                    F6 POPUP IS OPEN
                    =================================================
                    */

                    if (
                        openPriceOpen
                    ) {

                        /*
                        ESCAPE
                        */

                        if (
                            event.key ===
                            "Escape"
                        ) {

                            event.preventDefault();

                            closeOpenPrice();

                            return;

                        }


                        /*
                        Let the amount input handle:
                        - digits
                        - decimal point
                        - backspace
                        - Enter
                        */

                        return;

                    }


                    const activeElement =
                        document.activeElement;


                    /*
                    =================================================
                    IGNORE SHORTCUTS WHILE TYPING
                    =================================================
                    */

                    if (
                        activeElement &&
                        (
                            activeElement
                                .tagName ===
                                "INPUT" ||

                            activeElement
                                .tagName ===
                                "TEXTAREA"
                        )
                    ) {

                        return;

                    }


                    switch (
                        event.key
                    ) {

                        /*
                        =================================================
                        F2 CHECKOUT
                        =================================================
                        */

                        case "F2":

                            event.preventDefault();


                            if (
                                items.length ===
                                0
                            ) {

                                return;

                            }


                            setCheckoutOpen(
                                true
                            );


                            break;


                        /*
                        =================================================
                        F6 OPEN PRICE
                        =================================================
                        */

                        case "F6":

                            event.preventDefault();


                            openOpenPrice();


                            break;


                        /*
                        =================================================
                        F8 HOLD
                        =================================================
                        */

                        case "F8":

                            event.preventDefault();


                            if (
                                items.length
                            ) {

                                holdCart();

                            }


                            break;


                        /*
                        =================================================
                        F9 RESUME
                        =================================================
                        */

                        case "F9":

                            event.preventDefault();


                            if (
                                items.length ===
                                0
                            ) {

                                resumeLatestCart();

                            }


                            break;


                        /*
                        =================================================
                        F10 CLEAR
                        =================================================
                        */

                        case "F10":

                            event.preventDefault();


                            if (
                                items.length &&
                                window.confirm(
                                    "Clear the current cart?"
                                )
                            ) {

                                clearCart();

                            }


                            break;


                        /*
                        =================================================
                        F11 WHOLESALE
                        =================================================
                        */

                        case "F11":

                            event.preventDefault();


                            if (
                                user?.role !==
                                "admin"
                            ) {

                                alert(
                                    "Only an admin can use wholesale pricing."
                                );

                                return;

                            }


                            toggleWholesale();


                            break;


                        default:

                            break;

                    }

                };


            window.addEventListener(
                "keydown",
                handleShortcuts
            );


            return () =>
                window.removeEventListener(
                    "keydown",
                    handleShortcuts
                );

        },
        [
            items,
            clearCart,
            holdCart,
            resumeLatestCart,
            user,
            toggleWholesale,
            openPriceOpen,
        ]
    );


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <>

            <BarcodeScanner />


            {/* =================================================
                WHOLESALE MODE INDICATOR
            ================================================= */}

            {wholesaleMode && (

                <div
                    className="
                        mb-3
                        px-4
                        py-2.5
                        rounded-lg
                        border-2
                        border-warning
                        bg-warning/10
                        flex
                        items-center
                        justify-between
                        shadow-sm
                    "
                >

                    {/* LEFT */}

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                        "
                    >

                        <div
                            className="
                                w-8
                                h-8
                                rounded-full
                                bg-warning
                                text-warning-content
                                flex
                                items-center
                                justify-center
                                font-bold
                                text-lg
                            "
                        >

                            %

                        </div>


                        <div>

                            <div
                                className="
                                    font-bold
                                    text-sm
                                    text-warning-content
                                "
                            >

                                WHOLESALE MODE ACTIVE

                            </div>


                            <div
                                className="
                                    text-[11px]
                                    text-base-content/60
                                "
                            >

                                Bulk pricing is being applied
                                regardless of minimum quantity.

                            </div>

                        </div>

                    </div>


                    {/* RIGHT */}

                    <div
                        className="
                            flex
                            items-center
                            gap-2
                        "
                    >

                        <kbd className="kbd kbd-sm">
                            F11
                        </kbd>


                        <span
                            className="
                                text-xs
                                text-base-content/60
                            "
                        >

                            Disable

                        </span>

                    </div>

                </div>

            )}


            {/* =================================================
                POS WORKING AREA
            =================================================

                IMPORTANT:

                This wrapper is RELATIVE.

                The F6 popup is positioned ABSOLUTE inside this
                area, so it appears in the center of PRODUCTS
                + CART, but does NOT cover the sidebar or bottom
                shortcut bar.
            ================================================= */}

            <div
                className="
                    relative
                    grid
                    grid-cols-12
                    gap-4
                    h-[calc(100vh-155px)]
                    min-h-0
                    overflow-hidden
                "
            >

                {/* =============================================
                    PRODUCTS
                ============================================= */}

                <div
                    className="
                        col-span-8
                        flex
                        flex-col
                        gap-3
                        min-h-0
                    "
                >

                    {/* SEARCH BAR */}

                    <div className="shrink-0">

                        <SearchBar />

                    </div>


                    {/* CATEGORY BAR */}

                    <div className="shrink-0">

                        <CategorySidebar />

                    </div>


                    {/* PRODUCT TABLE */}

                    <div
                        className="
                            flex-1
                            min-h-0
                            overflow-hidden
                        "
                    >

                        <ProductGrid />

                    </div>

                </div>


                {/* =============================================
                    CART
                ============================================= */}

                <div
                    className="
                        col-span-4
                        h-full
                        min-h-0
                    "
                >

                    <CartPanel
                        onCheckout={() =>
                            setCheckoutOpen(
                                true
                            )
                        }
                    />

                </div>


                {/* =================================================
                    F6 OPEN PRICE POPUP
                =================================================

                    CENTERED OVER PRODUCTS + CART.

                    It does not belong to CartPanel anymore.
                ================================================= */}

                {openPriceOpen && (

                    <div
                        className="
                            absolute
                            inset-0
                            z-[300]
                            flex
                            items-center
                            justify-center
                            bg-black/20
                            backdrop-blur-[1px]
                        "
                    >

                        <form
    onSubmit={(event) => {

        event.preventDefault();
        event.stopPropagation();

        handleAddOpenPrice();

    }}

    onKeyDown={(event) => {

        /*
        ====================================================
        ENTER
        ====================================================

        Force Enter to belong to this popup.

        It will NOT reach:
        - SearchBar
        - Product search
        - barcode handlers
        - other POS shortcuts
        ====================================================
        */

        if (
            event.key ===
            "Enter"
        ) {

            event.preventDefault();
            event.stopPropagation();


            handleAddOpenPrice();

            return;

        }


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
            event.stopPropagation();


            closeOpenPrice();

        }

    }}
                            className="
                                w-[310px]
                                rounded-2xl
                                border
                                border-base-300
                                bg-base-100
                                p-6
                                shadow-2xl
                            "
                        >

                            {/* ==================================
                                HEADER
                            ================================== */}

                            <div className="text-center">

                                <div
                                    className="
                                        text-[10px]
                                        font-bold
                                        uppercase
                                        tracking-[0.18em]
                                        text-base-content/40
                                    "
                                >

                                    F6 Open Price

                                </div>


                                <div
                                    className="
                                        mt-2
                                        text-xl
                                        font-black
                                    "
                                >

                                    GROCERY

                                </div>


                                <div
                                    className="
                                        mt-1
                                        text-[10px]
                                        text-base-content/45
                                    "
                                >

                                    Manual price item

                                </div>

                            </div>


                            {/* ==================================
                                F7 MULTIPLIER INDICATOR
                            ================================== */}

                            {Number(
                                pendingMultiplier
                            ) > 1 && (

                                <div
                                    className="
                                        mt-4
                                        flex
                                        justify-center
                                    "
                                >

                                    <span
                                        className="
                                            badge
                                            badge-warning
                                            badge-lg
                                            font-black
                                        "
                                    >

                                        Qty X
                                        {
                                            pendingMultiplier
                                        }

                                    </span>

                                </div>

                            )}


                            {/* ==================================
                                LIVE PRICE
                            ================================== */}

                            <div
                                className="
                                    mt-6
                                    text-center
                                    text-5xl
                                    font-black
                                    tracking-tight
                                    text-primary
                                "
                            >

                                ₱
                                {
                                    openPriceValue ||
                                    "0"
                                }

                            </div>


                            {/* ==================================
                                INPUT
                            ================================== */}

                            <input
                                ref={
                                    openPriceInputRef
                                }
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                value={
                                    openPriceValue
                                }
                                onChange={(
                                    event
                                ) => {

                                    let value =
                                        event.target
                                            .value;


                                    /*
                                    --------------------------------
                                    ONLY NUMBERS + DECIMAL
                                    --------------------------------
                                    */

                                    value =
                                        value.replace(
                                            /[^0-9.]/g,
                                            ""
                                        );


                                    /*
                                    --------------------------------
                                    ONLY ONE DECIMAL POINT
                                    --------------------------------
                                    */

                                    const firstDot =
                                        value.indexOf(
                                            "."
                                        );


                                    if (
                                        firstDot !==
                                        -1
                                    ) {

                                        value =
                                            value.slice(
                                                0,
                                                firstDot +
                                                1
                                            ) +
                                            value
                                                .slice(
                                                    firstDot +
                                                    1
                                                )
                                                .replace(
                                                    /\./g,
                                                    ""
                                                );

                                    }


                                    /*
                                    --------------------------------
                                    MAX 2 DECIMAL PLACES
                                    --------------------------------
                                    */

                                    if (
                                        value.includes(
                                            "."
                                        )
                                    ) {

                                        const [
                                            whole,
                                            decimal,
                                        ] =
                                            value.split(
                                                "."
                                            );


                                        value =
                                            `${whole}.${(
                                                decimal ||
                                                ""
                                            ).slice(
                                                0,
                                                2
                                            )}`;

                                    }


                                    /*
                                    --------------------------------
                                    MAX LENGTH
                                    --------------------------------
                                    */

                                    if (
                                        value.length >
                                        10
                                    ) {

                                        value =
                                            value.slice(
                                                0,
                                                10
                                            );

                                    }


                                    setOpenPriceValue(
                                        value
                                    );

                                }}
                                className="
                                    input
                                    input-bordered
                                    mt-5
                                    w-full
                                    text-center
                                    text-xl
                                    font-bold
                                "
                                placeholder="Enter amount"
                            />


                            {/* ==================================
                                MULTIPLIER TOTAL PREVIEW
                            ================================== */}

                            {Number(
                                pendingMultiplier
                            ) > 1 &&
                            Number(
                                openPriceValue
                            ) > 0 && (

                                <div
                                    className="
                                        mt-4
                                        rounded-xl
                                        bg-base-200
                                        px-4
                                        py-3
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            items-center
                                            justify-between
                                            text-xs
                                        "
                                    >

                                        <span className="text-base-content/50">

                                            Unit Price

                                        </span>


                                        <span className="font-semibold">

                                            ₱
                                            {
                                                Number(
                                                    openPriceValue
                                                ).toFixed(
                                                    2
                                                )
                                            }

                                        </span>

                                    </div>


                                    <div
                                        className="
                                            mt-1
                                            flex
                                            items-center
                                            justify-between
                                            text-xs
                                        "
                                    >

                                        <span className="text-base-content/50">

                                            Quantity

                                        </span>


                                        <span className="font-semibold">

                                            X
                                            {
                                                pendingMultiplier
                                            }

                                        </span>

                                    </div>


                                    <div
                                        className="
                                            mt-2
                                            border-t
                                            border-base-300
                                            pt-2
                                            flex
                                            items-center
                                            justify-between
                                        "
                                    >

                                        <span className="text-sm font-bold">

                                            Total

                                        </span>


                                        <span className="text-lg font-black">

                                            ₱
                                            {
                                                (
                                                    Number(
                                                        openPriceValue
                                                    ) *
                                                    Number(
                                                        pendingMultiplier
                                                    )
                                                ).toFixed(
                                                    2
                                                )
                                            }

                                        </span>

                                    </div>

                                </div>

                            )}


                            {/* ==================================
                                BUTTONS
                            ================================== */}

                            <div
                                className="
                                    mt-5
                                    grid
                                    grid-cols-2
                                    gap-2
                                "
                            >

                                <button
                                    type="button"
                                    className="btn"
                                    onClick={
                                        closeOpenPrice
                                    }
                                >

                                    Cancel

                                </button>


                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        !openPriceValue ||
                                        Number(
                                            openPriceValue
                                        ) <= 0
                                    }
                                >

                                    Add Grocery

                                </button>

                            </div>


                            {/* ==================================
                                SHORTCUT HELP
                            ================================== */}

                            <div
                                className="
                                    mt-3
                                    text-center
                                    text-[10px]
                                    text-base-content/40
                                "
                            >

                                <kbd className="kbd kbd-xs">
                                    Enter
                                </kbd>

                                {" "}Add

                                <span className="mx-2">
                                    •
                                </span>

                                <kbd className="kbd kbd-xs">
                                    Esc
                                </kbd>

                                {" "}Cancel

                            </div>

                        </form>

                    </div>

                )}

            </div>


            {/* =================================================
                FIXED BOTTOM SHORTCUT BAR
            ================================================= */}

            <div
                className="
                    fixed
                    bottom-0
                    left-[225px]
                    right-0
                    h-14
                    bg-base-100
                    border-t
                    border-base-300
                    flex
                    items-center
                    justify-center
                    z-[100]
                "
            >

                <ShortcutBar />

            </div>


            {/* =================================================
                CHECKOUT MODAL
            ================================================= */}

            <CheckoutModal
                open={
                    checkoutOpen
                }
                subtotal={
                    subtotal
                }
                onClose={() =>
                    setCheckoutOpen(
                        false
                    )
                }
                onComplete={
                    handleCheckout
                }
            />


            {/* =================================================
                RECEIPT MODAL
            ================================================= */}

            <ReceiptModal
                open={
                    receiptOpen
                }
                sale={
                    lastSale
                }
                onClose={() => {

                    setReceiptOpen(
                        false
                    );


                    setLastSale(
                        null
                    );

                }}
            />

        </>

    );

}


export default POSPage;