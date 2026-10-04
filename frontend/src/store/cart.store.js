import { create } from "zustand";

import { calculateBestPrice }
    from "../utils/pricing";

import preparedCartService
    from "../services/preparedCart.service";


/*
============================================================
WHOLESALE PRICE
============================================================
*/
/*
============================================================
WHOLESALE PRICE
============================================================

Wholesale mode ignores tier minimum quantities.

It selects the configured pricing tier with the LOWEST
effective price per base unit.

Example:

1  = P200      -> P200.00 each
6  = P1000     -> P166.67 each
12 = P1900     -> P158.33 each

Wholesale price = P158.33 each.

The exact ratio is retained internally. We do not round the
unit price before calculating the subtotal.
============================================================
*/

const calculateWholesalePrice =
    (
        pricing
    ) => {

        if (
            !Array.isArray(
                pricing
            ) ||
            pricing.length ===
                0
        ) {

            return 0;

        }


        /*
        --------------------------------------------------------
        NORMALIZE VALID TIERS
        --------------------------------------------------------
        */

        const validTiers =
            pricing
                .map(
                    (
                        tier
                    ) => {

                        return {

                            quantity:
                                Number(
                                    tier?.quantity
                                ),

                            price:
                                Number(
                                    tier?.price
                                ),

                        };

                    }
                )
                .filter(
                    (
                        tier
                    ) => {

                        return (

                            Number.isFinite(
                                tier.quantity
                            ) &&

                            Number.isFinite(
                                tier.price
                            ) &&

                            tier.quantity >
                                0 &&

                            tier.price >=
                                0

                        );

                    }
                );


        if (
            validTiers.length ===
                0
        ) {

            return 0;

        }


        /*
        --------------------------------------------------------
        FIND LOWEST EFFECTIVE UNIT PRICE
        --------------------------------------------------------
        */

        const bestTier =
            validTiers.reduce(
                (
                    best,
                    tier
                ) => {

                    if (
                        !best
                    ) {

                        return tier;

                    }


                    const currentUnitPrice =
                        tier.price /
                        tier.quantity;


                    const bestUnitPrice =
                        best.price /
                        best.quantity;


                    /*
                    Lower effective unit price wins.
                    */

                    if (
                        currentUnitPrice <
                        bestUnitPrice
                    ) {

                        return tier;

                    }


                    /*
                    If the effective unit prices are exactly the
                    same, prefer the larger tier.
                    */

                    if (
                        currentUnitPrice ===
                            bestUnitPrice &&

                        tier.quantity >
                            best.quantity
                    ) {

                        return tier;

                    }


                    return best;

                },
                null
            );


        if (
            !bestTier
        ) {

            return 0;

        }


        return (
            bestTier.price /
            bestTier.quantity
        );

    };

/*
============================================================
HAS PREPARED ITEMS
============================================================
*/

const hasPreparedCartItems =
    (
        items
    ) => {

        return Array.isArray(
            items
        ) &&
        items.some(
            (
                item
            ) =>
                item
                    ?.preparedCartItem ===
                true
        );

    };


/*
============================================================
RELEASE PREPARED CART SAFELY
============================================================
*/

const releasePreparedCartSafely =
    async (
        preparedCart
    ) => {

        if (
            !preparedCart
        ) {

            return true;

        }


        try {

            await preparedCartService
                .releasePreparedCart(

                    preparedCart
                        .preparedCartId,

                    preparedCart
                        .claimToken

                );


            preparedCartService
                .clearRecoveryClaim();


            return true;


        } catch (
            error
        ) {

            console.warn(
                "Unable to release PreparedCart claim:",
                error?.response
                    ?.data
                    ?.message ||
                error?.message ||
                error
            );


            /*
            Keep recovery credentials.

            Losing them after a network failure would strand
            the CLAIMED cart.
            */

            return false;

        }

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

            items:
                [],

            heldCarts:
                [],

            nextHeldNumber:
                1,

            wholesaleMode:
                false,

            selectedIndex:
                0,

            pendingMultiplier:
                1,

            preparedCart:
                null,


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
                        multiplier <
                            1
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

            /*
============================================================
SET WHOLESALE MODE
============================================================

Used by the Retail / Wholesale selector.

Changing the pricing mode immediately recalculates every
normal product already inside the cart.

Open-price Grocery items are intentionally unchanged.

Prepared mobile carts cannot change pricing mode because
their pricing must remain tied to their claimed cart.
============================================================
*/

setWholesaleMode:
    (
        enabled
    ) => {

        if (
            get()
                .preparedCart
        ) {

            alert(
                "Wholesale mode cannot be changed while a mobile prepared cart is loaded."
            );


            return false;

        }


        const newMode =
            Boolean(
                enabled
            );


        const currentMode =
            get()
                .wholesaleMode;


        /*
        Nothing to do.
        */

        if (
            newMode ===
            currentMode
        ) {

            return true;

        }


        const items =
            get()
                .items;


        const updatedItems =
            items.map(
                (
                    item
                ) => {

                    /*
                    Manual/open-price products do not participate
                    in Retail / Wholesale tier pricing.
                    */

                    if (
                        item.isOpenPrice
                    ) {

                        return item;

                    }


                    if (
                        !Array.isArray(
                            item.pricing
                        ) ||
                        item.pricing.length ===
                            0
                    ) {

                        return item;

                    }


                    let subtotal;


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
                                item.quantity ||
                                0
                            );

                    } else {

                        subtotal =
                            calculateBestPrice(
                                item.pricing,
                                Number(
                                    item.quantity ||
                                    0
                                )
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


        return true;

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
                    } =
                        get();


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
                                ) ||
                                0,
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
                    } =
                        get();


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
                    } =
                        get();


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
                        preparedCart,
                    } =
                        get();


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


                    const shouldDetachPreparedCart =
                        preparedCart &&
                        !hasPreparedCartItems(
                            updated
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

                        preparedCart:
                            shouldDetachPreparedCart
                                ? null
                                : preparedCart,

                    });


                    if (
                        shouldDetachPreparedCart
                    ) {

                        releasePreparedCartSafely(
                            preparedCart
                        );

                    }

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
                    } =
                        get();


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
                        ) ||
                        0;


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


                    return calculateBestPrice(
                        pricing,
                        qty
                    );

                },


            /*
            ====================================================
            IMPORT PREPARED CART
            ====================================================
            */

            importPreparedCart:
                (
                    claimedCart
                ) => {

                    if (
                        !claimedCart ||
                        !claimedCart
                            .preparedCartId ||
                        !claimedCart
                            .claimToken ||
                        !Array.isArray(
                            claimedCart.items
                        ) ||
                        claimedCart.items.length ===
                            0
                    ) {

                        return false;

                    }


                    const {
                        items,
                        preparedCart,
                    } =
                        get();


                    if (
                        items.length >
                            0 ||
                        preparedCart
                    ) {

                        return false;

                    }


                    const importedItems =
                        claimedCart.items.map(
                            (
                                item
                            ) => {

                                const quantity =
                                    Number(
                                        item.quantity
                                    );


                                const lineTotal =
                                    Number(
                                        item.lineTotal
                                    );


                                const unitPrice =
                                    Number(
                                        item.unitPrice
                                    );


                                return {

                                    _id:
                                        item.productId,

                                    productId:
                                        item.productId,

                                    isOpenPrice:
                                        false,

                                    barcode:
                                        item.barcode ||
                                        "",

                                    name:
                                        item.name,

                                    baseUnit:
                                        item.baseUnit ||
                                        "Piece",

                                    quantity,

                                    unitPrice,

                                    price:
                                        unitPrice,

                                    subtotal:
                                        lineTotal,

                                    stock:
                                        Number(
                                            item.availableStock
                                        ),

                                    pricing:
                                        Array.isArray(
                                            item.pricing
                                        )
                                            ? item.pricing
                                            : [],

                                    preparedCartItem:
                                        true,

                                };

                            }
                        );


                    preparedCartService
                        .saveRecoveryClaim({

                            preparedCartId:
                                claimedCart
                                    .preparedCartId,

                            claimToken:
                                claimedCart
                                    .claimToken,

                        });


                    set({

                        items:
                            importedItems,

                        selectedIndex:
                            0,

                        pendingMultiplier:
                            1,

                        wholesaleMode:
                            false,

                        preparedCart: {

                            preparedCartId:
                                String(
                                    claimedCart
                                        .preparedCartId
                                ),

                            claimToken:
                                claimedCart
                                    .claimToken,

                            claimExpiresAt:
                                claimedCart
                                    .claimExpiresAt ||
                                null,

                            preparedAt:
                                claimedCart
                                    .preparedAt ||
                                null,

                            snapshotTotal:
                                Number(
                                    claimedCart
                                        .snapshotTotal ||
                                    0
                                ),

                            currentTotal:
                                Number(
                                    claimedCart
                                        .currentTotal ||
                                    0
                                ),

                            hasChanges:
                                Boolean(
                                    claimedCart
                                        .hasChanges
                                ),

                            warnings:
                                Array.isArray(
                                    claimedCart
                                        .warnings
                                )
                                    ? claimedCart
                                        .warnings
                                    : [],

                        },

                    });


                    return true;

                },


            /*
            ====================================================
            ADD NORMAL PRODUCT
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
                    } =
                        get();


                    const baseQuantity =
                        Number(
                            quantityToAdd
                        ) ||
                        1;


                    const multiplier =
                        Number(
                            pendingMultiplier
                        ) ||
                        1;


                    const actualQuantityToAdd =
                        baseQuantity *
                        multiplier;


                    const existingIndex =
                        items.findIndex(
                            (
                                item
                            ) =>

                                !item
                                    .isOpenPrice &&

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


                    if (
                        existing
                    ) {

                        const pricing =
                            Array.isArray(
                                existing.pricing
                            ) &&
                            existing.pricing.length >
                                0

                                ? existing.pricing

                                : product.pricing;


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

                                        pricing,

                                        quantity:
                                            requestedQuantity,

                                        subtotal:
                                            get()
                                                .calculateItemSubtotal(
                                                    pricing,
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
                    } =
                        get();


                    const unitPrice =
                        Number(
                            amount
                        );


                    if (
                        !Number.isFinite(
                            unitPrice
                        ) ||
                        unitPrice <=
                            0
                    ) {

                        return false;

                    }


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


                    const subtotal =
                        unitPrice *
                        quantity;


                    const openItemId =
                        `OPEN-${Date.now()}-${Math.random()
                            .toString(
                                36
                            )
                            .slice(
                                2,
                                8
                            )}`;


                    const newItem = {

                        _id:
                            openItemId,

                        productId:
                            null,

                        isOpenPrice:
                            true,

                        name:
                            safeName,

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

                        pricing:
                            [],

                        stock:
                            null,

                        baseUnit:
                            "pc",

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
            INCREASE QUANTITY
            ====================================================
            */

            increaseQuantity:
                (
                    id
                ) => {

                    const {
                        items,
                    } =
                        get();


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
                        preparedCart,
                    } =
                        get();


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


                        const shouldDetachPreparedCart =
                            preparedCart &&
                            !hasPreparedCartItems(
                                updated
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

                            preparedCart:
                                shouldDetachPreparedCart
                                    ? null
                                    : preparedCart,

                        });


                        if (
                            shouldDetachPreparedCart
                        ) {

                            releasePreparedCartSafely(
                                preparedCart
                            );

                        }


                        return true;

                    }


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
                        preparedCart,
                    } =
                        get();


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


                    const shouldDetachPreparedCart =
                        preparedCart &&
                        !hasPreparedCartItems(
                            updated
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

                        preparedCart:
                            shouldDetachPreparedCart
                                ? null
                                : preparedCart,

                    });


                    if (
                        shouldDetachPreparedCart
                    ) {

                        releasePreparedCartSafely(
                            preparedCart
                        );

                    }

                },


            /*
            ====================================================
            CLEAR CART
            ====================================================

            USER CLEAR:

            clearCart()

                local cart clears
                claim release attempted
                recovery credentials clear only after release

            SUCCESSFUL CHECKOUT:

            clearCart({
                releasePreparedCart: false
            })

                local Sale already committed
                durable finalize event exists
                browser recovery credential is deleted
            ====================================================
            */

            clearCart:
                async (
                    {
                        releasePreparedCart = true,
                    } = {}
                ) => {

                    const {
                        preparedCart,
                    } =
                        get();


                    set({

                        items:
                            [],

                        selectedIndex:
                            0,

                        pendingMultiplier:
                            1,

                        preparedCart:
                            null,

                    });


                    if (
                        !preparedCart
                    ) {

                        return true;

                    }


                    /*
                    Successful local checkout.
                    */

                    if (
                        releasePreparedCart ===
                        false
                    ) {

                        preparedCartService
                            .clearRecoveryClaim();


                        return true;

                    }


                    /*
                    User intentionally discarded order.
                    */

                    return await releasePreparedCartSafely(
                        preparedCart
                    );

                },


            /*
            ====================================================
            TOGGLE WHOLESALE
            ====================================================
            */

            /*
============================================================
TOGGLE WHOLESALE
============================================================

F11 uses this function.

The actual mode change is delegated to setWholesaleMode()
so keyboard and button controls always behave identically.
============================================================
*/

toggleWholesale:
    () => {

        const {
            wholesaleMode,
            setWholesaleMode,
        } =
            get();


        return setWholesaleMode(
            !wholesaleMode
        );

    },
            /*
            ====================================================
            HOLD CART
            ====================================================
            */

            holdCart:
                () => {

                    const {
                        items,
                        heldCarts,
                        nextHeldNumber,
                        wholesaleMode,
                        preparedCart,
                    } =
                        get();


                    if (
                        items.length ===
                        0
                    ) {

                        return false;

                    }


                    if (
                        preparedCart
                    ) {

                        alert(
                            "A mobile prepared cart cannot be placed on hold. Complete or clear it first."
                        );


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

                        items:
                            [],

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
            */

            resumeCart:
                (
                    id
                ) => {

                    if (
                        get()
                            .preparedCart
                    ) {

                        return false;

                    }


                    const {
                        heldCarts,
                    } =
                        get();


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

                    if (
                        get()
                            .preparedCart
                    ) {

                        return false;

                    }


                    const {
                        heldCarts,
                    } =
                        get();


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