import { useEffect, useRef, useState } from "react";

import useProductStore from "../../store/product.store";
import useCartStore from "../../store/cart.store";

function ProductGrid() {
    const fetchProducts = useProductStore(
        (state) => state.fetchProducts
    );

    const products = useProductStore(
        (state) => state.products
    );

    const search = useProductStore(
        (state) => state.search
    );

    const selectedCategory = useProductStore(
        (state) => state.selectedCategory
    );

    const addItem = useCartStore(
        (state) => state.addItem
    );

    const [selectedIndex, setSelectedIndex] =
        useState(0);

    // =========================================
    // REFS FOR AUTO SCROLL
    // =========================================

    const productRefs = useRef([]);

    // =========================================
    // FETCH PRODUCTS
    // =========================================

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // =========================================
    // FILTER PRODUCTS
    // =========================================

    const filteredProducts = products.filter(
        (product) => {

            const keyword =
                search.toLowerCase();

            const matchesSearch =
                product.name
                    .toLowerCase()
                    .includes(keyword) ||

                product.barcode
                    .includes(keyword) ||

                product.category
                    .toLowerCase()
                    .includes(keyword);

            const matchesCategory =
                selectedCategory === "All" ||
                product.category ===
                    selectedCategory;

            return (
                product.isActive &&
                product.stock > 0 &&
                matchesSearch &&
                matchesCategory
            );
        }
    );

    // =========================================
    // RESET SELECTION WHEN PRODUCTS CHANGE
    // =========================================

    useEffect(() => {

        setSelectedIndex(0);

        productRefs.current = [];

    }, [
        search,
        selectedCategory,
        products.length,
    ]);

    // =========================================
    // AUTO SCROLL SELECTED PRODUCT
    // =========================================

    useEffect(() => {

        const selectedProduct =
            productRefs.current[
                selectedIndex
            ];

        if (!selectedProduct) {
            return;
        }

        selectedProduct.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
        });

    }, [selectedIndex]);

    // =========================================
    // KEYBOARD CONTROLS
    // =========================================

    useEffect(() => {

        const handleKeys = (e) => {

            if (
                filteredProducts.length === 0
            ) {
                return;
            }

            // -------------------------
            // ARROW DOWN
            // -------------------------

            if (e.key === "ArrowDown") {

                e.preventDefault();

                setSelectedIndex(
                    (prev) =>
                        Math.min(
                            prev + 1,
                            filteredProducts.length - 1
                        )
                );

                return;
            }

            // -------------------------
            // ARROW UP
            // -------------------------

            if (e.key === "ArrowUp") {

                e.preventDefault();

                setSelectedIndex(
                    (prev) =>
                        Math.max(
                            prev - 1,
                            0
                        )
                );

                return;
            }

            // -------------------------
            // ENTER
            // -------------------------

            if (e.key === "Enter") {

                e.preventDefault();

                const product =
                    filteredProducts[
                        selectedIndex
                    ];

                if (product) {
                    addItem(product);
                }

                return;
            }
        };

        window.addEventListener(
            "keydown",
            handleKeys
        );

        return () => {

            window.removeEventListener(
                "keydown",
                handleKeys
            );

        };

    }, [
        filteredProducts,
        selectedIndex,
        addItem,
    ]);

    // =========================================
    // RENDER
    // =========================================

    return (
        <div className="bg-base-100 rounded-xl shadow h-full flex flex-col min-h-0">

            {/* ================================
                HEADER
            ================================= */}

            <div className="flex justify-between items-center px-4 py-3 border-b shrink-0">

                <div className="font-semibold">
                    Products
                </div>

                <div className="text-sm text-gray-500">
                    Showing{" "}
                    {filteredProducts.length}{" "}
                    products
                </div>

            </div>


            {/* ================================
                TABLE HEADER
            ================================= */}

            <div className="border-b bg-base-200 shrink-0">

                <div className="grid grid-cols-12 gap-2 px-4 py-3 font-semibold text-sm">

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


            {/* ================================
                PRODUCT LIST
            ================================= */}

            <div className="overflow-y-auto flex-1 min-h-0">

                {filteredProducts.length === 0 ? (

                    <div className="text-center py-10 text-gray-500">
                        No products found.
                    </div>

                ) : (

                    filteredProducts.map(
                        (product, index) => (

                            <div
                                key={product._id}

                                ref={(element) => {
                                    productRefs.current[
                                        index
                                    ] = element;
                                }}

                                onClick={() =>
                                    addItem(product)
                                }

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
                                    duration-150

                                    ${
                                        selectedIndex ===
                                        index
                                            ? "bg-primary text-primary-content"
                                            : "hover:bg-base-200"
                                    }
                                `}
                            >

                                {/* BARCODE */}

                                <div className="col-span-3 font-mono text-xs flex items-center">

                                    {product.barcode}

                                </div>


                                {/* PRODUCT */}

                                <div className="col-span-5 flex items-center font-medium truncate">

                                    {product.name}

                                </div>


                                {/* PRICE */}

                                <div className="col-span-2 flex items-center justify-end font-semibold tabular-nums">

                                    ₱
                                    {product.pricing?.[0]?.price?.toFixed(
                                        2
                                    ) ?? "0.00"}

                                </div>


                                {/* STOCK */}

                                <div className="col-span-2 flex justify-center items-center">

                                    <span
                                        className={`
                                            badge
                                            badge-sm

                                            ${
                                                product.stock ===
                                                0
                                                    ? "badge-error"
                                                    : product.stock <=
                                                      product.minimumStock
                                                    ? "badge-warning"
                                                    : "badge-success"
                                            }
                                        `}
                                    >

                                        {product.stock}

                                    </span>

                                </div>

                            </div>

                        )
                    )

                )}

            </div>

        </div>
    );
}

export default ProductGrid;