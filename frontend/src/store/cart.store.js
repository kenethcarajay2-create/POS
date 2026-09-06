import { create } from "zustand";
import { calculateBestPrice } from "../utils/pricing";


/*
============================================================
WHOLESALE PRICE
============================================================
*/

const calculateWholesalePrice = (pricing) => {

    if (
        !pricing ||
        pricing.length === 0
    ) {
        return 0;
    }


    const bulkTiers = pricing
        .filter(
            (tier) =>
                Number(tier.quantity) > 1
        )
        .sort(
            (a, b) =>
                Number(a.quantity) -
                Number(b.quantity)
        );


    /*
    --------------------------------------------------------
    NO BULK PRICING
    --------------------------------------------------------
    */

    if (
        bulkTiers.length === 0
    ) {

        const regularTier =
            pricing.find(
                (tier) =>
                    Number(tier.quantity) === 1
            );


        return Number(
            regularTier?.price ?? 0
        );

    }


    /*
    --------------------------------------------------------
    FIRST BULK TIER
    --------------------------------------------------------
    */

    const bulkTier =
        bulkTiers[0];


    const bulkQuantity =
        Number(
            bulkTier.quantity
        );


    const bulkTotal =
        Number(
            bulkTier.price
        );


    if (
        bulkQuantity <= 0
    ) {
        return 0;
    }


    return (
        bulkTotal /
        bulkQuantity
    );

};


/*
============================================================
CART STORE
============================================================
*/

const useCartStore =
    create(
        (
            set,
            get
        ) => ({

            /*
            ====================================================
            STATE
            ====================================================
            */

            items: [],

            heldCarts: [],

            nextHeldNumber: 1,

            wholesaleMode: false,

            selectedIndex: 0,


            /*
            ====================================================
            F7 PENDING MULTIPLIER
            ====================================================

            Applies ONLY to the next product/open-price item.

            Example:

            F7 -> X10

            Scan Coke
            -> Coke x10

            multiplier resets to x1
            ====================================================
            */

            pendingMultiplier: 1,


            /*
            ====================================================
            SET PENDING MULTIPLIER
            ====================================================
            */

            setPendingMultiplier:
                (
                    quantity
                ) => {

                    const multiplier =
                        Number(
                            quantity
                        );


                    if (
                        !Number.isInteger(
                            multiplier
                        ) ||
                        multiplier < 1
                    ) {

                        return false;

                    }


                    set({

                        pendingMultiplier:
                            multiplier,

                    });


                    return true;

                },


            /*
            ====================================================
            RESET PENDING MULTIPLIER
            ====================================================
            */

            resetPendingMultiplier:
                () => {

                    set({

                        pendingMultiplier:
                            1,

                    });

                },


            /*
            ====================================================
            WHOLESALE MODE
            ====================================================
            */

            setWholesaleMode:
                (
                    enabled
                ) => {

                    set({

                        wholesaleMode:
                            Boolean(
                                enabled
                            ),

                    });

                },


            /*
            ====================================================
            SELECTED CART ITEM
            ====================================================
            */

            setSelectedIndex:
                (
                    index
                ) => {

                    const {
                        items,
                    } = get();


                    if (
                        items.length ===
                        0
                    ) {

                        set({

                            selectedIndex:
                                0,

                        });


                        return;

                    }


                    const safeIndex =
                        Math.max(
                            0,
                            Math.min(
                                Number(
                                    index
                                ) || 0,
                                items.length -
                                    1
                            )
                        );


                    set({

                        selectedIndex:
                            safeIndex,

                    });

                },


            /*
            ====================================================
            SELECT NEXT
            ====================================================
            */

            selectNext:
                () => {

                    const {
                        items,
                        selectedIndex,
                    } = get();


                    if (
                        items.length ===
                        0
                    ) {

                        return;

                    }


                    set({

                        selectedIndex:
                            (
                                selectedIndex +
                                1
                            ) %
                            items.length,

                    });

                },


            /*
            ====================================================
            SELECT PREVIOUS
            ====================================================
            */

            selectPrevious:
                () => {

                    const {
                        items,
                        selectedIndex,
                    } = get();


                    if (
                        items.length ===
                        0
                    ) {

                        return;

                    }


                    set({

                        selectedIndex:
                            selectedIndex ===
                            0

                                ? items.length -
                                    1

                                : selectedIndex -
                                    1,

                    });

                },


            /*
            ====================================================
            REMOVE SELECTED
            ====================================================
            */

            removeSelected:
                () => {

                    const {
                        items,
                        selectedIndex,
                    } = get();


                    if (
                        items.length ===
                        0
                    ) {

                        return;

                    }


                    const updated =
                        items.filter(
                            (
                                _,
                                index
                            ) =>
                                index !==
                                selectedIndex
                        );


                    set({

                        items:
                            updated,

                        selectedIndex:
                            Math.max(
                                0,
                                Math.min(
                                    selectedIndex,
                                    updated.length -
                                        1
                                )
                            ),

                    });

                },


            /*
            ====================================================
            CALCULATE ITEM SUBTOTAL
            ====================================================
            */

            calculateItemSubtotal:
                (
                    pricing,
                    quantity
                ) => {

                    const {
                        wholesaleMode,
                    } = get();


                    if (
                        !pricing ||
                        pricing.length ===
                        0
                    ) {

                        return 0;

                    }


                    const qty =
                        Number(
                            quantity
                        ) || 0;


                    /*
                    ------------------------------------------------
                    WHOLESALE MODE
                    ------------------------------------------------
                    */

                    if (
                        wholesaleMode
                    ) {

                        const wholesalePrice =
                            calculateWholesalePrice(
                                pricing
                            );


                        return (
                            wholesalePrice *
                            qty
                        );

                    }


                    /*
                    ------------------------------------------------
                    NORMAL MODE
                    ------------------------------------------------
                    */

                    return calculateBestPrice(
                        pricing,
                        qty
                    );

                },


            /*
            ====================================================
            ADD NORMAL PRODUCT
            ====================================================

            Uses F7 multiplier if one is armed.

            Example:

            F7 -> X12

            addItem(product)

            Adds 12 units.

            Then multiplier resets to 1.
            ====================================================
            */

            addItem:
                (
                    product,
                    quantityToAdd = 1
                ) => {

                    const {
                        items,
                        pendingMultiplier,
                    } = get();


                    const baseQuantity =
                        Number(
                            quantityToAdd
                        ) || 1;


                    const multiplier =
                        Number(
                            pendingMultiplier
                        ) || 1;


                    const actualQuantityToAdd =
                        baseQuantity *
                        multiplier;


                    /*
                    ------------------------------------------------
                    FIND EXISTING PRODUCT
                    ------------------------------------------------
                    */

                    const existingIndex =
                        items.findIndex(
                            (
                                item
                            ) =>
                                !item.isOpenPrice &&

                                String(
                                    item._id
                                ) ===
                                String(
                                    product._id
                                )
                        );


                    const existing =
                        existingIndex >=
                        0

                            ? items[
                                existingIndex
                            ]

                            : null;


                    const currentQuantity =
                        Number(
                            existing
                                ?.quantity ??
                            0
                        );


                    const requestedQuantity =
                        currentQuantity +
                        actualQuantityToAdd;


                    /*
                    =================================================
                    STOCK CHECK
                    =================================================
                    */

                    const availableStock =
                        Number(
                            product.stock
                        );


                    if (
                        Number.isFinite(
                            availableStock
                        ) &&
                        requestedQuantity >
                        availableStock
                    ) {

                        alert(
                            `Only ${availableStock} ${
                                product.baseUnit ||
                                "item"
                            }(s) available for ${
                                product.name
                            }.`
                        );


                        return false;

                    }


                    /*
                    =================================================
                    EXISTING PRODUCT
                    =================================================
                    */

                    if (
                        existing
                    ) {

                        const updatedItems =
                            items.map(
                                (
                                    item,
                                    index
                                ) => {

                                    if (
                                        index !==
                                        existingIndex
                                    ) {

                                        return item;

                                    }


                                    return {

                                        ...item,

                                        quantity:
                                            requestedQuantity,

                                        subtotal:
                                            get()
                                                .calculateItemSubtotal(
                                                    item.pricing,
                                                    requestedQuantity
                                                ),

                                    };

                                }
                            );


                        set({

                            items:
                                updatedItems,

                            selectedIndex:
                                existingIndex,

                            pendingMultiplier:
                                1,

                        });


                        return true;

                    }


                    /*
                    =================================================
                    NEW NORMAL PRODUCT
                    =================================================
                    */

                    const newItem = {

                        ...product,

                        isOpenPrice:
                            false,

                        quantity:
                            actualQuantityToAdd,

                        subtotal:
                            get()
                                .calculateItemSubtotal(
                                    product.pricing,
                                    actualQuantityToAdd
                                ),

                    };


                    set({

                        items: [
                            ...items,
                            newItem,
                        ],

                        selectedIndex:
                            items.length,

                        pendingMultiplier:
                            1,

                    });


                    return true;

                },


            /*
            ====================================================
            ADD OPEN PRICE ITEM
            ====================================================

            Used for:

            - Grocery
            - Miscellaneous
            - Manual amount

            Supports an optional note describing what was sold.

            Example:

            amount = 125
            note = "Vegetables"

            Adds:

            Grocery
            Vegetables
            Qty 1
            Unit Price ₱125
            Total ₱125

            If F7 X3 is active:

            Grocery
            Vegetables
            Qty 3
            Unit Price ₱125
            Total ₱375

            Open price items do NOT affect inventory.
            ====================================================
            */

            addOpenPriceItem:
                ({
                    name = "Grocery",
                    amount,
                    note = "",
                } = {}) => {

                    const {
                        items,
                        pendingMultiplier,
                    } = get();


                    /*
                    ------------------------------------------------
                    VALIDATE AMOUNT
                    ------------------------------------------------
                    */

                    const unitPrice =
                        Number(
                            amount
                        );


                    if (
                        !Number.isFinite(
                            unitPrice
                        ) ||
                        unitPrice <= 0
                    ) {

                        return false;

                    }


                    /*
                    ------------------------------------------------
                    SANITIZE NAME
                    ------------------------------------------------
                    */

                    const safeName =
                        String(
                            name ||
                            "Grocery"
                        )
                            .trim()
                            .slice(
                                0,
                                80
                            ) ||
                        "Grocery";


                    /*
                    ------------------------------------------------
                    SANITIZE NOTE
                    ------------------------------------------------

                    The note is optional.

                    Examples:

                    Rice
                    Vegetables
                    Ice
                    Candy
                    Cooking ingredients
                    ------------------------------------------------
                    */

                    const safeNote =
                        String(
                            note ||
                            ""
                        )
                            .trim()
                            .slice(
                                0,
                                80
                            );


                    /*
                    ------------------------------------------------
                    USE F7 MULTIPLIER
                    ------------------------------------------------
                    */

                    const multiplier =
                        Number(
                            pendingMultiplier
                        );


                    const quantity =
                        Number.isInteger(
                            multiplier
                        ) &&
                        multiplier >
                        0

                            ? multiplier

                            : 1;


                    /*
                    ------------------------------------------------
                    CALCULATE SUBTOTAL
                    ------------------------------------------------
                    */

                    const subtotal =
                        unitPrice *
                        quantity;


                    /*
                    ------------------------------------------------
                    UNIQUE ID
                    ------------------------------------------------

                    Every open-price item remains its own line.

                    Grocery ₱100 / Rice

                    and

                    Grocery ₱100 / Vegetables

                    stay separate.
                    ------------------------------------------------
                    */

                    const openItemId =
                        `OPEN-${Date.now()}-${Math.random()
                            .toString(
                                36
                            )
                            .slice(
                                2,
                                8
                            )}`;


                    /*
                    ------------------------------------------------
                    CREATE OPEN PRICE ITEM
                    ------------------------------------------------
                    */

                    const newItem = {

                        _id:
                            openItemId,

                        productId:
                            null,

                        isOpenPrice:
                            true,

                        name:
                            safeName,


                        /*
                        ============================================
                        OPEN PRICE NOTE
                        ============================================
                        */

                        note:
                            safeNote,


                        category:
                            "OPEN PRICE",

                        barcode:
                            "",

                        quantity,

                        unitPrice,

                        price:
                            unitPrice,

                        subtotal,


                        /*
                        No regular pricing tiers.
                        */

                        pricing: [],


                        /*
                        No inventory stock because this is
                        not a registered inventory product.
                        */

                        stock:
                            null,

                        baseUnit:
                            "pc",

                    };


                    /*
                    ------------------------------------------------
                    ADD TO CART
                    ------------------------------------------------
                    */

                    set({

                        items: [
                            ...items,
                            newItem,
                        ],


                        /*
                        Select the newly added cart item.
                        */

                        selectedIndex:
                            items.length,


                        /*
                        F7 is one-shot.
                        */

                        pendingMultiplier:
                            1,

                    });


                    return true;

                },


            /*
            ====================================================
            INCREASE QUANTITY
            ====================================================

            Open-price items use:

            unitPrice × quantity

            Normal products use normal/bulk pricing.
            ====================================================
            */

            increaseQuantity:
                (
                    id
                ) => {

                    const {
                        items,
                    } = get();


                    const index =
                        items.findIndex(
                            (
                                item
                            ) =>
                                String(
                                    item._id
                                ) ===
                                String(
                                    id
                                )
                        );


                    if (
                        index <
                        0
                    ) {

                        return false;

                    }


                    const item =
                        items[
                            index
                        ];


                    const quantity =
                        Number(
                            item.quantity
                        ) +
                        1;


                    /*
                    ------------------------------------------------
                    STOCK CHECK

                    Skip this for open-price items.
                    ------------------------------------------------
                    */

                    if (
                        !item.isOpenPrice
                    ) {

                        const availableStock =
                            Number(
                                item.stock
                            );


                        if (
                            Number.isFinite(
                                availableStock
                            ) &&
                            quantity >
                            availableStock
                        ) {

                            alert(
                                `Only ${availableStock} ${
                                    item.baseUnit ||
                                    "item"
                                }(s) available for ${
                                    item.name
                                }.`
                            );


                            return false;

                        }

                    }


                    const updatedItems =
                        items.map(
                            (
                                cartItem,
                                itemIndex
                            ) => {

                                if (
                                    itemIndex !==
                                    index
                                ) {

                                    return cartItem;

                                }


                                /*
                                ------------------------------------
                                OPEN PRICE
                                ------------------------------------
                                */

                                if (
                                    cartItem.isOpenPrice
                                ) {

                                    return {

                                        ...cartItem,

                                        quantity,

                                        subtotal:
                                            Number(
                                                cartItem.unitPrice ||
                                                cartItem.price ||
                                                0
                                            ) *
                                            quantity,

                                    };

                                }


                                /*
                                ------------------------------------
                                NORMAL PRODUCT
                                ------------------------------------
                                */

                                return {

                                    ...cartItem,

                                    quantity,

                                    subtotal:
                                        get()
                                            .calculateItemSubtotal(
                                                cartItem.pricing,
                                                quantity
                                            ),

                                };

                            }
                        );


                    set({

                        items:
                            updatedItems,

                        selectedIndex:
                            index,

                    });


                    return true;

                },


            /*
            ====================================================
            DECREASE QUANTITY
            ====================================================
            */

            decreaseQuantity:
                (
                    id
                ) => {

                    const {
                        items,
                        selectedIndex,
                    } = get();


                    const index =
                        items.findIndex(
                            (
                                item
                            ) =>
                                String(
                                    item._id
                                ) ===
                                String(
                                    id
                                )
                        );


                    if (
                        index <
                        0
                    ) {

                        return false;

                    }


                    const item =
                        items[
                            index
                        ];


                    const quantity =
                        Number(
                            item.quantity
                        ) -
                        1;


                    /*
                    ------------------------------------------------
                    REMOVE AT ZERO
                    ------------------------------------------------
                    */

                    if (
                        quantity <=
                        0
                    ) {

                        const updated =
                            items.filter(
                                (
                                    _,
                                    itemIndex
                                ) =>
                                    itemIndex !==
                                    index
                            );


                        set({

                            items:
                                updated,

                            selectedIndex:
                                Math.max(
                                    0,
                                    Math.min(
                                        selectedIndex,
                                        updated.length -
                                            1
                                    )
                                ),

                        });


                        return true;

                    }


                    /*
                    ------------------------------------------------
                    UPDATE QUANTITY
                    ------------------------------------------------
                    */

                    const updated =
                        items.map(
                            (
                                cartItem,
                                itemIndex
                            ) => {

                                if (
                                    itemIndex !==
                                    index
                                ) {

                                    return cartItem;

                                }


                                /*
                                ------------------------------------
                                OPEN PRICE
                                ------------------------------------
                                */

                                if (
                                    cartItem.isOpenPrice
                                ) {

                                    return {

                                        ...cartItem,

                                        quantity,

                                        subtotal:
                                            Number(
                                                cartItem.unitPrice ||
                                                cartItem.price ||
                                                0
                                            ) *
                                            quantity,

                                    };

                                }


                                /*
                                ------------------------------------
                                NORMAL PRODUCT
                                ------------------------------------
                                */

                                return {

                                    ...cartItem,

                                    quantity,

                                    subtotal:
                                        get()
                                            .calculateItemSubtotal(
                                                cartItem.pricing,
                                                quantity
                                            ),

                                };

                            }
                        );


                    set({

                        items:
                            updated,

                        selectedIndex:
                            index,

                    });


                    return true;

                },


            /*
            ====================================================
            REMOVE ITEM
            ====================================================
            */

            removeItem:
                (
                    id
                ) => {

                    const {
                        items,
                        selectedIndex,
                    } = get();


                    const updated =
                        items.filter(
                            (
                                item
                            ) =>
                                String(
                                    item._id
                                ) !==
                                String(
                                    id
                                )
                        );


                    set({

                        items:
                            updated,

                        selectedIndex:
                            Math.max(
                                0,
                                Math.min(
                                    selectedIndex,
                                    updated.length -
                                        1
                                )
                            ),

                    });

                },


            /*
            ====================================================
            CLEAR CART
            ====================================================
            */

            clearCart:
                () => {

                    set({

                        items: [],

                        selectedIndex:
                            0,

                        pendingMultiplier:
                            1,

                    });

                },


            /*
            ====================================================
            TOGGLE WHOLESALE
            ====================================================

            IMPORTANT:

            Open-price items are NOT affected by wholesale mode.

            Grocery ₱125 stays ₱125.
            ====================================================
            */

            toggleWholesale:
                () => {

                    const newMode =
                        !get()
                            .wholesaleMode;


                    const items =
                        get()
                            .items;


                    const updatedItems =
                        items.map(
                            (
                                item
                            ) => {

                                /*
                                ------------------------------------
                                OPEN PRICE ITEMS

                                Leave unchanged, including note.
                                ------------------------------------
                                */

                                if (
                                    item.isOpenPrice
                                ) {

                                    return item;

                                }


                                if (
                                    !item.pricing ||
                                    item.pricing.length ===
                                    0
                                ) {

                                    return item;

                                }


                                let subtotal;


                                /*
                                ------------------------------------
                                WHOLESALE ON
                                ------------------------------------
                                */

                                if (
                                    newMode
                                ) {

                                    const wholesalePrice =
                                        calculateWholesalePrice(
                                            item.pricing
                                        );


                                    subtotal =
                                        wholesalePrice *
                                        Number(
                                            item.quantity
                                        );

                                }


                                /*
                                ------------------------------------
                                WHOLESALE OFF
                                ------------------------------------
                                */

                                else {

                                    subtotal =
                                        calculateBestPrice(
                                            item.pricing,
                                            item.quantity
                                        );

                                }


                                return {

                                    ...item,

                                    subtotal,

                                };

                            }
                        );


                    set({

                        wholesaleMode:
                            newMode,

                        items:
                            updatedItems,

                    });

                },


            /*
            ====================================================
            HOLD CART
            ====================================================

            The complete cart item is copied using ...item,
            so open-price notes are preserved.
            ====================================================
            */

            holdCart:
                () => {

                    const {
                        items,
                        heldCarts,
                        nextHeldNumber,
                        wholesaleMode,
                    } = get();


                    if (
                        items.length ===
                        0
                    ) {

                        return false;

                    }


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


                    set({

                        heldCarts: [

                            ...heldCarts,

                            {

                                id:
                                    Date.now(),

                                holdNumber:
                                    nextHeldNumber,

                                items:
                                    items.map(
                                        (
                                            item
                                        ) => ({

                                            ...item,

                                        })
                                    ),

                                subtotal,

                                wholesaleMode,

                                createdAt:
                                    new Date(),

                            },

                        ],

                        items: [],

                        selectedIndex:
                            0,

                        nextHeldNumber:
                            nextHeldNumber +
                            1,

                        pendingMultiplier:
                            1,

                    });


                    return true;

                },


            /*
            ====================================================
            RESUME CART
            ====================================================

            Since the whole item is restored using ...item,
            Grocery notes are restored automatically.
            ====================================================
            */

            resumeCart:
                (
                    id
                ) => {

                    const {
                        heldCarts,
                    } = get();


                    const held =
                        heldCarts.find(
                            (
                                cart
                            ) =>
                                cart.id ===
                                id
                        );


                    if (
                        !held
                    ) {

                        return false;

                    }


                    set({

                        items:
                            held.items.map(
                                (
                                    item
                                ) => ({

                                    ...item,

                                })
                            ),

                        selectedIndex:
                            0,

                        wholesaleMode:
                            held.wholesaleMode ??
                            false,

                        heldCarts:
                            heldCarts.filter(
                                (
                                    cart
                                ) =>
                                    cart.id !==
                                    id
                            ),

                        pendingMultiplier:
                            1,

                    });


                    return true;

                },


            /*
            ====================================================
            DELETE HELD CART
            ====================================================
            */

            deleteHeldCart:
                (
                    id
                ) => {

                    set({

                        heldCarts:
                            get()
                                .heldCarts
                                .filter(
                                    (
                                        cart
                                    ) =>
                                        cart.id !==
                                        id
                                ),

                    });

                },


            /*
            ====================================================
            RESUME LATEST CART
            ====================================================
            */

            resumeLatestCart:
                () => {

                    const {
                        heldCarts,
                    } = get();


                    if (
                        heldCarts.length ===
                        0
                    ) {

                        return false;

                    }


                    const latestCart =
                        heldCarts[
                            heldCarts.length -
                            1
                        ];


                    set({

                        items:
                            latestCart.items.map(
                                (
                                    item
                                ) => ({

                                    ...item,

                                })
                            ),

                        selectedIndex:
                            0,

                        wholesaleMode:
                            latestCart
                                .wholesaleMode ??
                            false,

                        heldCarts:
                            heldCarts.filter(
                                (
                                    cart
                                ) =>
                                    cart.id !==
                                    latestCart.id
                            ),

                        pendingMultiplier:
                            1,

                    });


                    return true;

                },

        })
    );


export default useCartStore;