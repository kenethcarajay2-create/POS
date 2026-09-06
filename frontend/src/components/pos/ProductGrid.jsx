import {
    useEffect,
    useMemo,
    useRef,
} from "react";

import useProductStore from "../../store/product.store";
import useCartStore from "../../store/cart.store";


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
    RESET SELECTION WHEN SEARCH / CATEGORY CHANGES
    ============================================================

    IMPORTANT:

    DO NOT clear productRefs.current here.

    React's ref callbacks populate the array during render.
    Clearing the array afterward destroys the references that
    scrolling needs.
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


            /*
            If current selection became invalid,
            move it to the last available item.
            */

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
        ]
    );


    /*
    ============================================================
    AUTO SCROLL SELECTED PRODUCT
    ============================================================

    This is the important part.

    We directly manipulate the scrollTop of the product list.

    No smooth scrolling.
    No scrollIntoView().
    No offsetTop dependency.

    We compare the real visible rectangle of the selected
    product against the real visible rectangle of the list.
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


            /*
            Wait until browser has painted the new highlight.
            */

            const animationFrame =
                requestAnimationFrame(
                    () => {

                        const containerRect =
                            container
                                .getBoundingClientRect();


                        const rowRect =
                            selectedRow
                                .getBoundingClientRect();


                        /*
                        Give selected row a little breathing room.
                        */

                        const padding =
                            4;


                        /*
                        ============================================
                        SELECTED ROW IS BELOW VIEW
                        ============================================
                        */

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


                        /*
                        ============================================
                        SELECTED ROW IS ABOVE VIEW
                        ============================================
                        */

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


            {/* =================================================
                HEADER
            ================================================= */}

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


            {/* =================================================
                TABLE HEADER
            ================================================= */}

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

                        Price

                    </div>


                    <div className="col-span-2 text-center">

                        Stock

                    </div>

                </div>

            </div>


            {/* =================================================
                SCROLLABLE PRODUCT LIST
            ================================================= */}

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


                                        {/* =================================
                                            BARCODE
                                        ================================= */}

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


                                        {/* =================================
                                            PRODUCT
                                        ================================= */}

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


                                        {/* =================================
                                            PRICE
                                        ================================= */}

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
                                                    product
                                                        .pricing?.[0]
                                                        ?.price ??
                                                    0
                                                ).toFixed(
                                                    2
                                                )
                                            }

                                        </div>


                                        {/* =================================
                                            STOCK
                                        ================================= */}

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


            {/* =================================================
                KEYBOARD HELP
            ================================================= */}

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