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
    FULLSCREEN
    ============================================================
    */

    const [
        isFullscreen,
        setIsFullscreen,
    ] = useState(
        Boolean(
            document.fullscreenElement
        )
    );


    /*
    ============================================================
    FULLSCREEN CHANGE LISTENER
    ============================================================

    Keeps the UI synchronized when:

    - Full Screen button is clicked
    - ESC exits fullscreen
    - Browser exits fullscreen for another reason
    ============================================================
    */

    useEffect(
        () => {

            const handleFullscreenChange =
                () => {

                    setIsFullscreen(
                        Boolean(
                            document.fullscreenElement
                        )
                    );

                };


            document.addEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );


            return () => {

                document.removeEventListener(
                    "fullscreenchange",
                    handleFullscreenChange
                );

            };

        },
        []
    );


    /*
    ============================================================
    TOGGLE FULLSCREEN
    ============================================================
    */

    const toggleFullscreen =
        async () => {

            try {

                if (
                    document.fullscreenElement
                ) {

                    await document
                        .exitFullscreen();


                    return;

                }


                await document
                    .documentElement
                    .requestFullscreen();

            } catch (
                error
            ) {

                console.error(
                    "Unable to toggle fullscreen:",
                    error
                );

            }

        };


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
        addItem,
        increaseQuantity,
        decreaseQuantity,
        removeItem,
        wholesaleMode,
        toggleWholesale,
        pendingMultiplier,
        addOpenPriceItem,

        preparedCart,
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
    MOBILE ORDER TOAST
    ============================================================
    */

    const [
        mobileOrderToast,
        setMobileOrderToast,
    ] = useState(null);


    const mobileOrderToastTimerRef =
        useRef(null);


    const showMobileOrderToast =
        (
            message,
            type = "success"
        ) => {

            if (
                mobileOrderToastTimerRef.current
            ) {

                clearTimeout(
                    mobileOrderToastTimerRef.current
                );

            }


            setMobileOrderToast({

                message,

                type,

            });


            mobileOrderToastTimerRef.current =
                setTimeout(
                    () => {

                        setMobileOrderToast(
                            null
                        );


                        mobileOrderToastTimerRef.current =
                            null;

                    },
                    2500
                );

        };


    /*
    ============================================================
    CLEANUP TOAST TIMER
    ============================================================
    */

    useEffect(
        () => {

            return () => {

                if (
                    mobileOrderToastTimerRef.current
                ) {

                    clearTimeout(
                        mobileOrderToastTimerRef.current
                    );

                }

            };

        },
        []
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
                    await saleService.checkout(
                        checkoutData,

                        preparedCart
                            ? {
                                preparedCartId:
                                    preparedCart.preparedCartId,

                                claimToken:
                                    preparedCart.claimToken,
                            }
                            : null
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

                await clearCart({

                    releasePreparedCart:
                        false,

                });


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
                MOBILE ORDER TOAST
            ================================================= */}

            {
                mobileOrderToast && (

                    <div
                        className="
                            fixed
                            top-5
                            right-5
                            z-[1000]
                            max-w-sm
                            animate-[fadeIn_0.2s_ease-out]
                        "
                    >

                        <div
                            className={`
                                flex
                                items-start
                                gap-3
                                rounded-xl
                                border
                                px-4
                                py-3
                                shadow-xl
                                backdrop-blur-sm

                                ${
                                    mobileOrderToast.type ===
                                    "error"

                                        ? `
                                            border-error/30
                                            bg-error
                                            text-error-content
                                        `

                                        : mobileOrderToast.type ===
                                          "warning"

                                            ? `
                                                border-warning/30
                                                bg-warning
                                                text-warning-content
                                            `

                                            : `
                                                border-success/30
                                                bg-success
                                                text-success-content
                                            `
                                }
                            `}
                        >

                            <div
                                className="
                                    mt-0.5
                                    flex
                                    h-6
                                    w-6
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-black/10
                                    text-sm
                                    font-black
                                "
                            >

                                {
                                    mobileOrderToast.type ===
                                    "error"

                                        ? "!"

                                        : mobileOrderToast.type ===
                                          "warning"

                                            ? "!"

                                            : "✓"
                                }

                            </div>


                            <div
                                className="
                                    min-w-0
                                    flex-1
                                "
                            >

                                <div
                                    className="
                                        text-sm
                                        font-bold
                                    "
                                >

                                    {
                                        mobileOrderToast.type ===
                                        "error"

                                            ? "Mobile Order Error"

                                            : mobileOrderToast.type ===
                                              "warning"

                                                ? "Mobile Order Loaded"

                                                : "Mobile Order Loaded"
                                    }

                                </div>


                                <div
                                    className="
                                        mt-0.5
                                        whitespace-pre-line
                                        text-xs
                                        opacity-90
                                    "
                                >

                                    {
                                        mobileOrderToast.message
                                    }

                                </div>

                            </div>

                        </div>

                    </div>

                )
            }


            {/* =================================================
                BARCODE SCANNER
            ================================================= */}

            <BarcodeScanner

                onPreparedCartLoaded={(
                    claimedCart
                ) => {

                    const hasWarnings =
                        Array.isArray(
                            claimedCart?.warnings
                        ) &&
                        claimedCart.warnings.length >
                            0;


                    if (
                        hasWarnings
                    ) {

                        showMobileOrderToast(
                            `Order loaded successfully.\n${claimedCart.warnings.join(
                                "\n"
                            )}`,
                            "warning"
                        );


                        return;

                    }


                    showMobileOrderToast(
                        "Order loaded successfully.",
                        "success"
                    );

                }}

                onPreparedCartError={(
                    message
                ) => {

                    showMobileOrderToast(
                        message ||
                        "Unable to load mobile order.",
                        "error"
                    );

                }}

            />


            {/* =================================================
    FLOATING FULLSCREEN CONTROL
================================================= */}

<button
    type="button"

    onClick={
        toggleFullscreen
    }

    className="
        fixed
        top-15
        right-3
        z-[500]
        btn
        btn-circle
        btn-sm
        bg-base-100
        border
        border-base-300
        shadow-lg
        hover:shadow-xl
    "

    title={
        isFullscreen
            ? "Exit Full Screen"
            : "Enter Full Screen"
    }

    aria-label={
        isFullscreen
            ? "Exit Full Screen"
            : "Enter Full Screen"
    }
>

    <span
        className="
            text-lg
            leading-none
        "
    >

        {
            isFullscreen
                ? "⤢"
                : "⛶"
        }

    </span>

</button>


            {/* =================================================
                POS WORKING AREA
            ================================================= */}

            <div
                className={`
                    relative
                    grid
                    grid-cols-12
                    gap-4
                    min-h-0
                    overflow-hidden

                    ${
                        isFullscreen
                            ? `
                                h-[calc(100vh-56px)]
                                p-4
                            `
                            : `
                                h-[calc(100vh-155px)]
                            `
                    }
                `}
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
                className={`
                    fixed
                    bottom-0
                    right-0
                    h-14
                    bg-base-100
                    border-t
                    border-base-300
                    flex
                    items-center
                    justify-center
                    z-[100]

                    ${
                        isFullscreen
                            ? "left-0"
                            : "left-[225px]"
                    }
                `}
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