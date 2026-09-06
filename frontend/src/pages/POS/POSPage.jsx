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
import useProductStore from "../../store/product.store";


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


        /*
        --------------------------------------------------------
        CART ITEM CONTROL
        --------------------------------------------------------
        */

        addItem,

        increaseQuantity,

        decreaseQuantity,

        removeItem,


        /*
        --------------------------------------------------------
        WHOLESALE
        --------------------------------------------------------
        */

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
    PRODUCT SEARCH
    ============================================================
    */

    const setSearch =
        useProductStore(
            (state) =>
                state.setSearch
        );


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
    KEYBOARD NAVIGATION ZONE
    ============================================================
    */

    const [
        keyboardZone,
        setKeyboardZone,
    ] = useState(
        "products"
    );


    /*
    ============================================================
    SELECTED PRODUCT
    ============================================================
    */

    const [
        selectedProductIndex,
        setSelectedProductIndex,
    ] = useState(
        0
    );


    /*
    ============================================================
    SELECTED CART ITEM
    ============================================================
    */

    const [
        selectedCartIndex,
        setSelectedCartIndex,
    ] = useState(
        0
    );


    /*
    ============================================================
    CURRENT FILTERED PRODUCTS
    ============================================================
    */

    const [
        keyboardProducts,
        setKeyboardProducts,
    ] = useState([]);


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


    const [
        openPriceNote,
        setOpenPriceNote,
    ] = useState("");


    const openPriceInputRef =
        useRef(null);


    const openPriceNoteInputRef =
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
    KEEP PRODUCT SELECTION VALID
    ============================================================
    */

    useEffect(
        () => {

            if (
                keyboardProducts.length ===
                0
            ) {

                setSelectedProductIndex(
                    0
                );

                return;

            }


            setSelectedProductIndex(
                (
                    previous
                ) =>
                    Math.min(
                        Math.max(
                            previous,
                            0
                        ),
                        keyboardProducts.length -
                            1
                    )
            );

        },
        [
            keyboardProducts.length,
        ]
    );


    /*
    ============================================================
    KEEP CART SELECTION VALID
    ============================================================
    */

    useEffect(
        () => {

            if (
                items.length ===
                0
            ) {

                setSelectedCartIndex(
                    0
                );

                return;

            }


            setSelectedCartIndex(
                (
                    previous
                ) =>
                    Math.min(
                        Math.max(
                            previous,
                            0
                        ),
                        items.length -
                            1
                    )
            );

        },
        [
            items.length,
        ]
    );


    /*
    ============================================================
    OPEN F6 OPEN PRICE
    ============================================================
    */

    const openOpenPrice =
        () => {

            if (
                document.activeElement
                    instanceof
                    HTMLElement
            ) {

                document.activeElement
                    .blur();

            }


            setOpenPriceValue(
                ""
            );


            setOpenPriceNote(
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


            setOpenPriceNote(
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


            const note =
                String(
                    openPriceNote ||
                    ""
                )
                    .trim();


            const success =
                addOpenPriceItem({

                    name:
                        "Grocery",

                    amount,

                    note,

                });


            if (
                success ===
                false
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
                            openPriceInputRef
                                .current;


                        if (
                            !input
                        ) {

                            return;

                        }


                        input.focus();


                        const length =
                            input.value
                                .length;


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
    SWITCH TO PRODUCTS
    ============================================================
    */

    const activateProducts =
        () => {

            if (
                document.activeElement
                    instanceof
                    HTMLElement
            ) {

                document.activeElement
                    .blur();

            }


            setKeyboardZone(
                "products"
            );


            if (
                keyboardProducts.length >
                0
            ) {

                setSelectedProductIndex(
                    (
                        previous
                    ) =>
                        Math.min(
                            Math.max(
                                previous,
                                0
                            ),
                            keyboardProducts.length -
                                1
                        )
                );

            }

        };


    /*
    ============================================================
    SWITCH TO CART
    ============================================================
    */

    const activateCart =
        () => {

            if (
                document.activeElement
                    instanceof
                    HTMLElement
            ) {

                document.activeElement
                    .blur();

            }


            setKeyboardZone(
                "cart"
            );


            if (
                items.length >
                0
            ) {

                setSelectedCartIndex(
                    (
                        previous
                    ) => {

                        if (
                            previous >= 0 &&
                            previous <
                                items.length
                        ) {

                            return previous;

                        }


                        return (
                            items.length -
                            1
                        );

                    }
                );

            }

        };


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

                const checkoutData = {

                    customerId:

                        paymentInfo.customerId ||

                        null,


                    loyaltyPointsToRedeem:

                        Number(
                            paymentInfo
                                .loyaltyPointsToRedeem
                        ) ||
                        0,


                    items:

                        items.map(
                            (
                                item
                            ) => {

                                /*
                                ------------------------------------
                                OPEN PRICE
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

                                        note:
                                            item.note ||
                                            "",

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

                        Number(
                            paymentInfo
                                .cashReceived
                        ),


                    paymentMethod:
                        "Cash",

                };


                console.log(
                    "CHECKOUT DATA SENT TO BACKEND:",
                    checkoutData
                );


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
                PRINT RECEIPT
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


                setSelectedCartIndex(
                    0
                );


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
                    F6 POPUP HAS CONTROL
                    =================================================
                    */

                    if (
                        openPriceOpen
                    ) {

                        if (
                            event.key ===
                            "Escape"
                        ) {

                            event.preventDefault();


                            closeOpenPrice();

                        }


                        return;

                    }


                    if (
                        checkoutOpen
                    ) {

                        return;

                    }


                    if (
                        receiptOpen
                    ) {

                        return;

                    }


                    const activeElement =
                        document.activeElement;


                    const typing =

                        activeElement &&

                        (
                            activeElement
                                .tagName ===
                                "INPUT" ||

                            activeElement
                                .tagName ===
                                "TEXTAREA" ||

                            activeElement
                                .tagName ===
                                "SELECT" ||

                            activeElement
                                .isContentEditable
                        );


                    const previousKeys = [

                        "MediaTrackPrevious",

                        "MediaPreviousTrack",

                        "BrowserBack",

                    ];


                    const nextKeys = [

                        "MediaTrackNext",

                        "MediaNextTrack",

                        "BrowserForward",

                    ];


                    const previousCodes = [

                        "MediaTrackPrevious",

                        "MediaPreviousTrack",

                        "BrowserBack",

                    ];


                    const nextCodes = [

                        "MediaTrackNext",

                        "MediaNextTrack",

                        "BrowserForward",

                    ];


                    if (
                        previousKeys.includes(
                            event.key
                        ) ||

                        previousCodes.includes(
                            event.code
                        )
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        activateProducts();


                        return;

                    }


                    if (
                        nextKeys.includes(
                            event.key
                        ) ||

                        nextCodes.includes(
                            event.code
                        )
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        activateCart();


                        return;

                    }


                    if (
                        typing
                    ) {

                        const allowedWhileTyping = [

                            "F2",

                            "F4",

                            "F6",

                            "F8",

                            "F9",

                            "F10",

                            "F11",

                        ];


                        if (
                            !allowedWhileTyping
                                .includes(
                                    event.key
                                )
                        ) {

                            return;

                        }

                    }


                    switch (
                        event.key
                    ) {

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


                            return;


                        case "F4":

                            event.preventDefault();


                            setSearch(
                                ""
                            );


                            setSelectedProductIndex(
                                0
                            );


                            setKeyboardZone(
                                "products"
                            );


                            return;


                        case "F6":

                            event.preventDefault();


                            openOpenPrice();


                            return;


                        case "F8":

                            event.preventDefault();


                            if (
                                items.length
                            ) {

                                holdCart();


                                setSelectedCartIndex(
                                    0
                                );

                            }


                            return;


                        case "F9":

                            event.preventDefault();


                            if (
                                items.length ===
                                0
                            ) {

                                resumeLatestCart();


                                setKeyboardZone(
                                    "cart"
                                );


                                setSelectedCartIndex(
                                    0
                                );

                            }


                            return;


                        case "F10":

                            event.preventDefault();


                            if (
                                items.length &&
                                window.confirm(
                                    "Clear the current cart?"
                                )
                            ) {

                                clearCart();


                                setSelectedCartIndex(
                                    0
                                );


                                setKeyboardZone(
                                    "products"
                                );

                            }


                            return;


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


                            return;


                        default:

                            break;

                    }


                    /*
                    =================================================
                    PRODUCTS ZONE
                    =================================================
                    */

                    if (
                        keyboardZone ===
                        "products"
                    ) {

                        if (
                            keyboardProducts.length ===
                            0
                        ) {

                            return;

                        }


                        if (
                            event.key ===
                            "ArrowDown"
                        ) {

                            event.preventDefault();


                            setSelectedProductIndex(
                                (
                                    previous
                                ) =>
                                    Math.min(
                                        previous +
                                            1,
                                        keyboardProducts.length -
                                            1
                                    )
                            );


                            return;

                        }


                        if (
                            event.key ===
                            "ArrowUp"
                        ) {

                            event.preventDefault();


                            setSelectedProductIndex(
                                (
                                    previous
                                ) =>
                                    Math.max(
                                        previous -
                                            1,
                                        0
                                    )
                            );


                            return;

                        }


                        if (
                            event.key ===
                            "Enter"
                        ) {

                            event.preventDefault();


                            const product =
                                keyboardProducts[
                                    selectedProductIndex
                                ];


                            if (
                                !product
                            ) {

                                return;

                            }


                            addItem(
                                product
                            );


                            return;

                        }


                        return;

                    }


                    /*
                    =================================================
                    CART ZONE
                    =================================================
                    */

                    if (
                        keyboardZone ===
                        "cart"
                    ) {

                        if (
                            items.length ===
                            0
                        ) {

                            return;

                        }


                        const safeIndex =
                            Math.min(
                                Math.max(
                                    selectedCartIndex,
                                    0
                                ),
                                items.length -
                                    1
                            );


                        const selectedItem =
                            items[
                                safeIndex
                            ];


                        if (
                            !selectedItem
                        ) {

                            return;

                        }


                        if (
                            event.key ===
                            "ArrowDown"
                        ) {

                            event.preventDefault();


                            setSelectedCartIndex(
                                (
                                    previous
                                ) =>
                                    Math.min(
                                        previous +
                                            1,
                                        items.length -
                                            1
                                    )
                            );


                            return;

                        }


                        if (
                            event.key ===
                            "ArrowUp"
                        ) {

                            event.preventDefault();


                            setSelectedCartIndex(
                                (
                                    previous
                                ) =>
                                    Math.max(
                                        previous -
                                            1,
                                        0
                                    )
                            );


                            return;

                        }


                        if (
                            event.key ===
                            "ArrowRight"
                        ) {

                            event.preventDefault();


                            increaseQuantity(
                                selectedItem._id
                            );


                            return;

                        }


                        if (
                            event.key ===
                            "ArrowLeft"
                        ) {

                            event.preventDefault();


                            if (
                                Number(
                                    selectedItem
                                        .quantity
                                ) <= 1
                            ) {

                                return;

                            }


                            decreaseQuantity(
                                selectedItem._id
                            );


                            return;

                        }


                        if (
                            event.key ===
                                "Delete" ||

                            event.key ===
                                "Del"
                        ) {

                            event.preventDefault();


                            const currentLength =
                                items.length;


                            removeItem(
                                selectedItem._id
                            );


                            const nextLength =
                                currentLength -
                                1;


                            if (
                                nextLength <= 0
                            ) {

                                setSelectedCartIndex(
                                    0
                                );


                                return;

                            }


                            setSelectedCartIndex(
                                Math.min(
                                    safeIndex,
                                    nextLength -
                                        1
                                )
                            );


                            return;

                        }

                    }

                };


            window.addEventListener(
                "keydown",
                handleShortcuts
            );


            return () => {

                window.removeEventListener(
                    "keydown",
                    handleShortcuts
                );

            };

        },
        [
            items,

            user,

            keyboardZone,

            keyboardProducts,

            selectedProductIndex,

            selectedCartIndex,

            checkoutOpen,

            receiptOpen,

            openPriceOpen,

            clearCart,

            holdCart,

            resumeLatestCart,

            toggleWholesale,

            setSearch,

            addItem,

            increaseQuantity,

            decreaseQuantity,

            removeItem,
        ]
    );


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <>

            {/* =================================================
                BARCODE SCANNER
            ================================================= */}

            <BarcodeScanner />


            {/* =================================================
                WHOLESALE MODE INDICATOR
            ================================================= */}

            {
                wholesaleMode && (

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

                )
            }


            {/* =================================================
                POS WORKING AREA
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

                    <div className="shrink-0">

                        <SearchBar />

                    </div>


                    <div className="shrink-0">

                        <CategorySidebar />

                    </div>


                    <div
                        className="
                            flex-1
                            min-h-0
                            overflow-hidden
                        "
                    >

                        <ProductGrid

                            keyboardActive={
                                keyboardZone ===
                                "products"
                            }

                            selectedIndex={
                                selectedProductIndex
                            }

                            onSelectedIndexChange={
                                setSelectedProductIndex
                            }

                            onProductsChange={
                                setKeyboardProducts
                            }

                        />

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

                        onCheckout={() => {

                            if (
                                items.length ===
                                0
                            ) {

                                return;

                            }


                            setCheckoutOpen(
                                true
                            );

                        }}

                        keyboardActive={
                            keyboardZone ===
                            "cart"
                        }

                        selectedIndex={
                            selectedCartIndex
                        }

                        onSelectedIndexChange={
                            setSelectedCartIndex
                        }

                    />

                </div>


                {/* =================================================
                    F6 OPEN PRICE POPUP
                ================================================= */}

                {
                    openPriceOpen && (

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
                                onSubmit={(
                                    event
                                ) => {

                                    event.preventDefault();

                                    event.stopPropagation();


                                    handleAddOpenPrice();

                                }}

                                onKeyDown={(
                                    event
                                ) => {

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
                                    w-[340px]
                                    rounded-2xl
                                    border
                                    border-base-300
                                    bg-base-100
                                    p-6
                                    shadow-2xl
                                "
                            >

                                {/* ==============================
                                    HEADER
                                ============================== */}

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


                                {/* ==============================
                                    F7 MULTIPLIER
                                ============================== */}

                                {
                                    Number(
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

                                    )
                                }


                                {/* ==============================
                                    LIVE PRICE
                                ============================== */}

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


                                {/* ==============================
                                    AMOUNT INPUT
                                ============================== */}

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


                                        value =
                                            value.replace(
                                                /[^0-9.]/g,
                                                ""
                                            );


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

                                    onKeyDown={(
                                        event
                                    ) => {

                                        if (
                                            event.key ===
                                            "Enter"
                                        ) {

                                            event.preventDefault();

                                            event.stopPropagation();


                                            if (
                                                Number(
                                                    openPriceValue
                                                ) > 0
                                            ) {

                                                openPriceNoteInputRef
                                                    .current
                                                    ?.focus();

                                            }

                                        }

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


                                {/* ==============================
                                    GROCERY NOTE
                                ============================== */}

                                <div className="mt-4">

                                    <div
                                        className="
                                            mb-1.5
                                            flex
                                            items-center
                                            justify-between
                                        "
                                    >

                                        <label
                                            className="
                                                text-[10px]
                                                font-bold
                                                uppercase
                                                tracking-wide
                                                text-base-content/50
                                            "
                                        >

                                            Grocery Note

                                        </label>


                                        <span
                                            className="
                                                text-[9px]
                                                text-base-content/35
                                            "
                                        >

                                            Optional

                                        </span>

                                    </div>


                                    <input
                                        ref={
                                            openPriceNoteInputRef
                                        }

                                        type="text"

                                        autoComplete="off"

                                        value={
                                            openPriceNote
                                        }

                                        maxLength={
                                            80
                                        }

                                        onChange={(
                                            event
                                        ) => {

                                            setOpenPriceNote(
                                                event.target
                                                    .value
                                                    .slice(
                                                        0,
                                                        80
                                                    )
                                            );

                                        }}

                                        onKeyDown={(
                                            event
                                        ) => {

                                            if (
                                                event.key ===
                                                "Enter"
                                            ) {

                                                event.preventDefault();

                                                event.stopPropagation();


                                                handleAddOpenPrice();

                                            }

                                        }}

                                        className="
                                            input
                                            input-bordered
                                            w-full
                                            text-sm
                                        "

                                        placeholder="e.g. Rice, vegetables, ice..."
                                    />


                                    <div
                                        className="
                                            mt-1
                                            flex
                                            items-center
                                            justify-between
                                            text-[9px]
                                            text-base-content/35
                                        "
                                    >

                                        <span>
                                            What was sold?
                                        </span>


                                        <span>

                                            {
                                                openPriceNote.length
                                            }
                                            /80

                                        </span>

                                    </div>

                                </div>


                                {/* ==============================
                                    MULTIPLIER PREVIEW
                                ============================== */}

                                {
                                    Number(
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

                                    )
                                }


                                {/* ==============================
                                    BUTTONS
                                ============================== */}

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


                                {/* ==============================
                                    HELP
                                ============================== */}

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

                                    {" "}Next / Add


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

                    )
                }

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


                    setKeyboardZone(
                        "products"
                    );


                    setSelectedProductIndex(
                        0
                    );

                }}
            />

        </>

    );

}


export default POSPage;