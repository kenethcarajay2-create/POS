import {
    useEffect,
    useMemo,
    useRef,
} from "react";

import useProductStore from "../../store/product.store";
import useCartStore from "../../store/cart.store";


/*
============================================================
RETAIL DISPLAY PRICE
============================================================

The product grid shows the normal quantity-1 retail price.

Quantity-based tier discounts are still handled by the cart
after products are added.

Example:

1 = P200
6 = P1000
12 = P1900

Grid in Retail mode:

P200.00
============================================================
*/

const getRetailDisplayPrice =
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


        const validTiers =
            pricing
                .map(
                    (
                        tier
                    ) => ({

                        quantity:
                            Number(
                                tier?.quantity
                            ),

                        price:
                            Number(
                                tier?.price
                            ),

                    })
                )
                .filter(
                    (
                        tier
                    ) => (

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

                    )
                );


        if (
            validTiers.length ===
                0
        ) {

            return 0;

        }


        /*
        Prefer the explicit quantity-1 tier.
        */

        const singleTier =
            validTiers.find(
                (
                    tier
                ) =>
                    tier.quantity ===
                    1
            );


        if (
            singleTier
        ) {

            return singleTier.price;

        }


        /*
        Fallback for malformed/older products that do not have
        a quantity-1 tier.

        Use the smallest configured quantity's effective price.
        */

        const smallestTier =
            [...validTiers]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.quantity -
                        b.quantity
                )[0];


        return (
            smallestTier.price /
            smallestTier.quantity
        );

    };


/*
============================================================
WHOLESALE DISPLAY PRICE
============================================================

Wholesale displays the LOWEST configured effective unit
price regardless of tier minimum quantity.

Example:

1  = P200      -> P200.00 each
6  = P1000     -> P166.67 each
12 = P1900     -> P158.33 each

Grid in Wholesale mode:

P158.33
============================================================
*/

const getWholesaleDisplayPrice =
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


        const validTiers =
            pricing
                .map(
                    (
                        tier
                    ) => ({

                        quantity:
                            Number(
                                tier?.quantity
                            ),

                        price:
                            Number(
                                tier?.price
                            ),

                    })
                )
                .filter(
                    (
                        tier
                    ) => (

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

                    )
                );


        if (
            validTiers.length ===
                0
        ) {

            return 0;

        }


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


                    if (
                        currentUnitPrice <
                        bestUnitPrice
                    ) {

                        return tier;

                    }


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


        return bestTier

            ? (
                bestTier.price /
                bestTier.quantity
            )

            : 0;

    };


/*
============================================================
PRODUCT GRID
============================================================
*/

function ProductGrid({
    keyboardActive = false,
    selectedIndex = 0,
    onSelectedIndexChange,
    onProductsChange,
}) {

    /*
    ============================================================
    PRODUCT STORE
    ============================================================
    */

    const fetchProducts =
        useProductStore(
            (state) =>
                state.fetchProducts
        );


    const products =
        useProductStore(
            (state) =>
                state.products
        );


    const search =
        useProductStore(
            (state) =>
                state.search
        );


    const selectedCategory =
        useProductStore(
            (state) =>
                state.selectedCategory
        );


    /*
    ============================================================
    CART STORE
    ============================================================
    */

    const addItem =
        useCartStore(
            (state) =>
                state.addItem
        );


    const wholesaleMode =
        useCartStore(
            (state) =>
                state.wholesaleMode
        );


    /*
    ============================================================
    SCROLL REFS
    ============================================================
    */

    const listContainerRef =
        useRef(null);


    const productRefs =
        useRef([]);


    /*
    ============================================================
    FETCH PRODUCTS
    ============================================================
    */

    useEffect(
        () => {

            fetchProducts();

        },
        [
            fetchProducts,
        ]
    );


    /*
    ============================================================
    FILTER PRODUCTS
    ============================================================
    */

    const filteredProducts =
        useMemo(
            () => {

                const keyword =
                    String(
                        search ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                return products.filter(
                    (
                        product
                    ) => {

                        const productName =
                            String(
                                product.name ||
                                ""
                            )
                                .toLowerCase();


                        const barcode =
                            String(
                                product.barcode ||
                                ""
                            )
                                .toLowerCase();


                        const category =
                            String(
                                product.category ||
                                ""
                            )
                                .toLowerCase();


                        const matchesSearch =

                            !keyword ||

                            productName.includes(
                                keyword
                            ) ||

                            barcode.includes(
                                keyword
                            ) ||

                            category.includes(
                                keyword
                            );


                        const matchesCategory =

                            selectedCategory ===
                                "All" ||

                            product.category ===
                                selectedCategory;


                        return (

                            product.isActive ===
                                true &&

                            Number(
                                product.stock
                            ) > 0 &&

                            matchesSearch &&

                            matchesCategory

                        );

                    }
                );

            },
            [
                products,
                search,
                selectedCategory,
            ]
        );


    /*
    ============================================================
    SEND FILTERED PRODUCTS TO POS PAGE
    ============================================================
    */

    useEffect(
        () => {

            onProductsChange?.(
                filteredProducts
            );

        },
        [
            filteredProducts,
            onProductsChange,
        ]
    );


    /*
    ============================================================
    KEEP SELECTION VALID
    ============================================================
    */

    useEffect(
        () => {

            if (
                filteredProducts.length ===
                0
            ) {

                onSelectedIndexChange?.(
                    0
                );


                if (
                    listContainerRef.current
                ) {

                    listContainerRef.current
                        .scrollTop =
                        0;

                }


                return;

            }


            if (
                selectedIndex >=
                filteredProducts.length
            ) {

                onSelectedIndexChange?.(
                    filteredProducts.length -
                        1
                );

            }

        },
        [
            filteredProducts.length,
            selectedIndex,
            onSelectedIndexChange,
        ]
    );


    /*
    ============================================================
    RESET TO TOP ON SEARCH / CATEGORY CHANGE
    ============================================================
    */

    useEffect(
        () => {

            onSelectedIndexChange?.(
                0
            );


            if (
                listContainerRef.current
            ) {

                listContainerRef.current
                    .scrollTop =
                    0;

            }

        },
        [
            search,
            selectedCategory,
            onSelectedIndexChange,
        ]
    );


    /*
    ============================================================
    AUTO SCROLL SELECTED PRODUCT
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
                listContainerRef.current;


            const selectedRow =
                productRefs.current[
                    selectedIndex
                ];


            if (
                !container ||
                !selectedRow
            ) {

                return;

            }


            const animationFrame =
                requestAnimationFrame(
                    () => {

                        const containerRect =
                            container
                                .getBoundingClientRect();


                        const rowRect =
                            selectedRow
                                .getBoundingClientRect();


                        const padding =
                            4;


                        if (
                            rowRect.bottom >
                            containerRect.bottom -
                                padding
                        ) {

                            const amountBelow =
                                rowRect.bottom -
                                containerRect.bottom +
                                padding;


                            container.scrollTop =
                                container.scrollTop +
                                amountBelow;


                            return;

                        }


                        if (
                            rowRect.top <
                            containerRect.top +
                                padding
                        ) {

                            const amountAbove =
                                containerRect.top -
                                rowRect.top +
                                padding;


                            container.scrollTop =
                                Math.max(
                                    0,
                                    container.scrollTop -
                                        amountAbove
                                );

                        }

                    }
                );


            return () => {

                cancelAnimationFrame(
                    animationFrame
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
    RENDER
    ============================================================
    */

    return (

        <div
            className={`
                bg-base-100
                rounded-xl
                shadow
                h-full
                flex
                flex-col
                min-h-0
                border-2
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
                            border-transparent
                          `
                }
            `}
        >

            {/* HEADER */}

            <div
                className="
                    flex
                    justify-between
                    items-center
                    px-4
                    py-3
                    border-b
                    shrink-0
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-2
                    "
                >

                    <div className="font-semibold">

                        Products

                    </div>


                    {
                        keyboardActive && (

                            <span
                                className="
                                    badge
                                    badge-primary
                                    badge-sm
                                    font-bold
                                "
                            >

                                ACTIVE

                            </span>

                        )
                    }


                    <span
                        className={`
                            badge
                            badge-sm
                            font-bold

                            ${
                                wholesaleMode

                                    ? "badge-warning"

                                    : "badge-ghost"
                            }
                        `}
                    >

                        {
                            wholesaleMode

                                ? "WHOLESALE"

                                : "RETAIL"
                        }

                    </span>

                </div>


                <div
                    className="
                        text-sm
                        text-base-content/50
                    "
                >

                    Showing{" "}

                    {
                        filteredProducts.length
                    }

                    {" "}products

                </div>

            </div>


            {/* TABLE HEADER */}

            <div
                className="
                    border-b
                    bg-base-200
                    shrink-0
                "
            >

                <div
                    className="
                        grid
                        grid-cols-12
                        gap-2
                        px-4
                        py-3
                        font-semibold
                        text-sm
                    "
                >

                    <div className="col-span-3">

                        Barcode

                    </div>


                    <div className="col-span-5">

                        Product

                    </div>


                    <div className="col-span-2 text-right">

                        {
                            wholesaleMode

                                ? "Wholesale"

                                : "Price"
                        }

                    </div>


                    <div className="col-span-2 text-center">

                        Stock

                    </div>

                </div>

            </div>


            {/* PRODUCT LIST */}

            <div
                ref={
                    listContainerRef
                }

                className="
                    flex-1
                    min-h-0
                    overflow-y-auto
                    overflow-x-hidden
                "
            >

                {
                    filteredProducts.length ===
                    0 ? (

                        <div
                            className="
                                text-center
                                py-10
                                text-base-content/50
                            "
                        >

                            No products found.

                        </div>

                    ) : (

                        filteredProducts.map(
                            (
                                product,
                                index
                            ) => {

                                const selected =

                                    keyboardActive &&

                                    selectedIndex ===
                                        index;


                                const displayPrice =
                                    wholesaleMode

                                        ? getWholesaleDisplayPrice(
                                            product.pricing
                                        )

                                        : getRetailDisplayPrice(
                                            product.pricing
                                        );


                                return (

                                    <div
                                        key={
                                            product._id
                                        }

                                        ref={(
                                            element
                                        ) => {

                                            productRefs
                                                .current[
                                                    index
                                                ] =
                                                element;

                                        }}

                                        onClick={() => {

                                            onSelectedIndexChange?.(
                                                index
                                            );


                                            addItem(
                                                product
                                            );

                                        }}

                                        className={`
                                            grid
                                            grid-cols-12
                                            gap-2
                                            px-2
                                            py-1.5
                                            border-b
                                            border-base-200
                                            cursor-pointer
                                            text-sm
                                            transition-colors
                                            duration-75

                                            ${
                                                selected

                                                    ? `
                                                        bg-primary
                                                        text-primary-content
                                                        font-semibold
                                                      `

                                                    : `
                                                        hover:bg-base-200
                                                      `
                                            }
                                        `}
                                    >

                                        <div
                                            className="
                                                col-span-3
                                                font-mono
                                                text-xs
                                                flex
                                                items-center
                                            "
                                        >

                                            {
                                                product.barcode
                                            }

                                        </div>


                                        <div
                                            className="
                                                col-span-5
                                                flex
                                                items-center
                                                font-medium
                                                truncate
                                            "
                                        >

                                            {
                                                product.name
                                            }

                                        </div>


                                        <div
                                            className="
                                                col-span-2
                                                flex
                                                items-center
                                                justify-end
                                                font-semibold
                                                tabular-nums
                                            "
                                        >

                                            ₱
                                            {
                                                Number(
                                                    displayPrice ||
                                                    0
                                                ).toFixed(
                                                    2
                                                )
                                            }

                                        </div>


                                        <div
                                            className="
                                                col-span-2
                                                flex
                                                justify-center
                                                items-center
                                            "
                                        >

                                            <span
                                                className={`
                                                    badge
                                                    badge-sm

                                                    ${
                                                        Number(
                                                            product.stock
                                                        ) <=
                                                        Number(
                                                            product.minimumStock
                                                        )

                                                            ? "badge-warning"

                                                            : "badge-success"
                                                    }
                                                `}
                                            >

                                                {
                                                    product.stock
                                                }

                                            </span>

                                        </div>

                                    </div>

                                );

                            }
                        )

                    )
                }

            </div>


            {
                keyboardActive && (

                    <div
                        className="
                            shrink-0
                            border-t
                            border-primary/20
                            bg-primary/5
                            px-3
                            py-1.5
                            text-[9px]
                            text-base-content/60
                            flex
                            items-center
                            justify-center
                            gap-3
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

                            {" "}Navigate

                        </span>


                        <span>

                            <kbd className="kbd kbd-xs">
                                Enter
                            </kbd>

                            {" "}Add

                        </span>

                    </div>

                )
            }

        </div>

    );

}


export default ProductGrid;