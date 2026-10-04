import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import api from "../../api/api";

import branchService
    from "../../services/branch.service";

import stockTransferService
    from "../../services/stockTransfer.service";


/*
============================================================
HELPERS
============================================================
*/

const formatNumber =
    (
        value
    ) => {

        return Number(
            value ||
            0
        ).toLocaleString();

    };


const formatDate =
    (
        value
    ) => {

        if (
            !value
        ) {

            return "-";

        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "-";

        }


        return date.toLocaleString(
            "en-PH"
        );

    };


const getErrorMessage =
    (
        error,
        fallback
    ) => {

        return (
            error?.response
                ?.data
                ?.message ||

            error?.message ||

            fallback
        );

    };


const getProductId =
    (
        product
    ) => {

        return String(
            product?._id ||
            product?.id ||
            ""
        );

    };


/*
============================================================
PAGE
============================================================
*/

function StockTransferPage() {

    /*
    ============================================================
    MODE
    ============================================================
    */

    const [
        tab,
        setTab,
    ] =
        useState(
            "new"
        );


    /*
    ============================================================
    BRANCHES
    ============================================================
    */

    const [
        activeBranch,
        setActiveBranch,
    ] =
        useState(
            null
        );


    const [
        branches,
        setBranches,
    ] =
        useState(
            []
        );


    const [
        destinationBranchId,
        setDestinationBranchId,
    ] =
        useState(
            ""
        );


    /*
    ============================================================
    PRODUCTS
    ============================================================
    */

    const [
        products,
        setProducts,
    ] =
        useState(
            []
        );


    const [
        productSearch,
        setProductSearch,
    ] =
        useState(
            ""
        );


    const searchInputRef =
        useRef(
            null
        );


    const productResultsRef =
        useRef(
            null
        );


    const productResultRefs =
        useRef(
            []
        );


    const [
        highlightedProductIndex,
        setHighlightedProductIndex,
    ] =
        useState(
            0
        );


    /*
    ============================================================
    TRANSFER CART
    ============================================================
    */

    const [
        transferItems,
        setTransferItems,
    ] =
        useState(
            []
        );


    const [
        remarks,
        setRemarks,
    ] =
        useState(
            ""
        );


    /*
    ============================================================
    SAVED DRAFT
    ============================================================
    */

    const [
        currentTransfer,
        setCurrentTransfer,
    ] =
        useState(
            null
        );


    /*
    ============================================================
    HISTORY
    ============================================================
    */

    const [
        transfers,
        setTransfers,
    ] =
        useState(
            []
        );


    const [
        selectedTransfer,
        setSelectedTransfer,
    ] =
        useState(
            null
        );


    const [
        statusFilter,
        setStatusFilter,
    ] =
        useState(
            ""
        );


    /*
    ============================================================
    UI STATE
    ============================================================
    */

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );


    const [
        toast,
        setToast,
    ] =
        useState(
            null
        );


    const toastTimerRef =
        useRef(
            null
        );


    /*
    ============================================================
    TOAST
    ============================================================
    */

    const showToast =
        useCallback(
            (
                message,
                type = "success"
            ) => {

                if (
                    toastTimerRef.current
                ) {

                    clearTimeout(
                        toastTimerRef.current
                    );

                }


                setToast({

                    message,

                    type,

                });


                toastTimerRef.current =
                    setTimeout(
                        () => {

                            setToast(
                                null
                            );


                            toastTimerRef.current =
                                null;

                        },
                        2800
                    );

            },
            []
        );


    useEffect(
        () => {

            return () => {

                if (
                    toastTimerRef.current
                ) {

                    clearTimeout(
                        toastTimerRef.current
                    );

                }

            };

        },
        []
    );


    /*
    ============================================================
    LOAD PRODUCTS
    ============================================================

    This intentionally reads the active branch product list.

    X-Branch-Id is automatically supplied by api.js, so stock
    shown here belongs to the current source branch.
    ============================================================
    */

    const loadProducts =
        useCallback(
            async () => {

                const response =
                    await api.get(
                        "/products"
                    );


                const rawData =
                    response.data?.data;


                /*
                Support common response shapes without coupling
                this page tightly to one pagination format.
                */

                let result =
                    [];


                if (
                    Array.isArray(
                        rawData
                    )
                ) {

                    result =
                        rawData;

                }
                else if (
                    Array.isArray(
                        rawData?.products
                    )
                ) {

                    result =
                        rawData.products;

                }
                else if (
                    Array.isArray(
                        rawData?.items
                    )
                ) {

                    result =
                        rawData.items;

                }


                setProducts(
                    result
                );

            },
            []
        );


    /*
    ============================================================
    LOAD BRANCHES
    ============================================================
    */

    const loadBranches =
        useCallback(
            async () => {

                const [
                    active,
                    accessible,
                ] =
                    await Promise.all([

                        branchService
                            .getActiveBranch(),

                        branchService
                            .getAccessibleBranches(),

                    ]);


                setActiveBranch(
                    active
                );


                const branchList =
                    Array.isArray(
                        accessible?.branches
                    )
                        ? accessible.branches
                        : [];


                setBranches(
                    branchList
                );


                const activeId =
                    String(
                        active?._id ||
                        ""
                    );


                const firstDestination =
                    branchList.find(
                        (
                            branch
                        ) =>

                            String(
                                branch._id
                            ) !==
                                activeId &&

                            branch.isActive !==
                                false
                    );


                setDestinationBranchId(
                    (
                        previous
                    ) => {

                        if (
                            previous &&
                            previous !==
                                activeId
                        ) {

                            return previous;

                        }


                        return (
                            firstDestination
                                ?._id ||
                            ""
                        );

                    }
                );

            },
            []
        );


    /*
    ============================================================
    LOAD HISTORY
    ============================================================
    */

    const loadTransfers =
        useCallback(
            async (
                filter =
                    statusFilter
            ) => {

                const result =
                    await stockTransferService
                        .getTransfers({

                            status:
                                filter,

                            limit:
                                150,

                        });


                setTransfers(
                    Array.isArray(
                        result
                    )
                        ? result
                        : []
                );

            },
            [
                statusFilter,
            ]
        );


    /*
    ============================================================
    INITIAL LOAD
    ============================================================
    */

    useEffect(
        () => {

            const load =
                async () => {

                    setLoading(
                        true
                    );


                    try {

                        await Promise.all([

                            loadBranches(),

                            loadProducts(),

                            loadTransfers(
                                ""
                            ),

                        ]);


                    } catch (
                        error
                    ) {

                        showToast(
                            getErrorMessage(
                                error,
                                "Unable to load stock transfer page."
                            ),
                            "error"
                        );


                    } finally {

                        setLoading(
                            false
                        );

                    }

                };


            load();

        },
        [
            loadBranches,
            loadProducts,
            loadTransfers,
            showToast,
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

                const query =
                    String(
                        productSearch ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                if (
                    !query
                ) {

                    return products
                        .filter(
                            (
                                product
                            ) =>

                                product.isActive !==
                                    false &&

                                Number(
                                    product.stock
                                ) >
                                    0
                        )
                        .slice(
                            0,
                            50
                        );

                }


                return products
                    .filter(
                        (
                            product
                        ) => {

                            if (
                                product.isActive ===
                                false
                            ) {

                                return false;

                            }


                            const barcode =
                                String(
                                    product.barcode ||
                                    ""
                                )
                                    .toLowerCase();


                            const name =
                                String(
                                    product.name ||
                                    ""
                                )
                                    .toLowerCase();


                            return (
                                barcode.includes(
                                    query
                                ) ||
                                name.includes(
                                    query
                                )
                            );

                        }
                    )
                    .slice(
                        0,
                        50
                    );

            },
            [
                products,
                productSearch,
            ]
        );


    /*
    ============================================================
    KEYBOARD PRODUCT NAVIGATION
    ============================================================
    */

    useEffect(
        () => {

            setHighlightedProductIndex(
                (current) => {

                    if (
                        filteredProducts.length ===
                        0
                    ) {

                        return 0;

                    }


                    return Math.min(
                        current,
                        filteredProducts.length -
                        1
                    );

                }
            );

        },
        [
            filteredProducts.length,
        ]
    );


    useEffect(
        () => {

            const node =
                productResultRefs.current[
                    highlightedProductIndex
                ];


            if (
                !node
            ) {

                return;

            }


            node.scrollIntoView({
                block:
                    "nearest",
            });

        },
        [
            highlightedProductIndex,
            filteredProducts,
        ]
    );


    /*
    ============================================================
    TOTALS
    ============================================================
    */

    const totalQuantity =
        useMemo(
            () => {

                return transferItems
                    .reduce(
                        (
                            sum,
                            item
                        ) =>
                            sum +
                            Number(
                                item.quantity ||
                                0
                            ),
                        0
                    );

            },
            [
                transferItems,
            ]
        );


    /*
    ============================================================
    RESET FORM
    ============================================================
    */

    const resetTransferForm =
        () => {

            setTransferItems(
                []
            );


            setRemarks(
                ""
            );


            setCurrentTransfer(
                null
            );


            setProductSearch(
                ""
            );

        };


    /*
    ============================================================
    ADD PRODUCT
    ============================================================
    */

    const addProduct =
        (
            product,
            {
                clearSearch = true,
                selectSearchText = false,
            } = {}
        ) => {

            if (
                currentTransfer &&
                currentTransfer.status !==
                    "DRAFT"
            ) {

                return;

            }


            const id =
                getProductId(
                    product
                );


            if (
                !id
            ) {

                return;

            }


            const stock =
                Number(
                    product.stock ||
                    0
                );


            if (
                stock <=
                0
            ) {

                showToast(
                    `${product.name} has no available stock.`,
                    "error"
                );


                return;

            }


            setTransferItems(
                (
                    current
                ) => {

                    const existing =
                        current.find(
                            (
                                item
                            ) =>
                                item.productId ===
                                id
                        );


                    if (
                        existing
                    ) {

                        if (
                            existing.quantity >=
                            stock
                        ) {

                            showToast(
                                `Only ${stock} ${product.baseUnit || "unit"}(s) available.`,
                                "error"
                            );


                            return current;

                        }


                        return current.map(
                            (
                                item
                            ) =>

                                item.productId ===
                                id

                                    ? {
                                        ...item,

                                        quantity:
                                            item.quantity +
                                            1,
                                    }

                                    : item
                        );

                    }


                    return [
                        ...current,
                        {
                            productId:
                                id,

                            barcode:
                                product.barcode ||
                                "",

                            name:
                                product.name,

                            baseUnit:
                                product.baseUnit ||
                                "Piece",

                            stock,

                            quantity:
                                1,
                        },
                    ];

                }
            );


            if (
                clearSearch
            ) {

                setProductSearch(
                    ""
                );

            }


            requestAnimationFrame(
                () => {

                    const input =
                        searchInputRef.current;


                    input?.focus();


                    if (
                        selectSearchText
                    ) {

                        input?.select();

                    }

                }
            );

        };


    /*
    ============================================================
    SEARCH ENTER / BARCODE
    ============================================================
    */

    const handleSearchKeyDown =
        (
            event
        ) => {

            if (
                currentTransfer?.status ===
                "COMPLETED"
            ) {

                return;

            }


            if (
                event.key ===
                "ArrowDown"
            ) {

                event.preventDefault();


                if (
                    filteredProducts.length ===
                    0
                ) {

                    return;

                }


                setHighlightedProductIndex(
                    (current) =>
                        Math.min(
                            current +
                            1,
                            filteredProducts.length -
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


                if (
                    filteredProducts.length ===
                    0
                ) {

                    return;

                }


                setHighlightedProductIndex(
                    (current) =>
                        Math.max(
                            current -
                            1,
                            0
                        )
                );


                return;

            }


            if (
                event.key ===
                "Escape"
            ) {

                event.preventDefault();

                setProductSearch(
                    ""
                );

                setHighlightedProductIndex(
                    0
                );


                return;

            }


            if (
                event.key !==
                "Enter"
            ) {

                return;

            }


            event.preventDefault();


            const query =
                String(
                    productSearch ||
                    ""
                ).trim();


            if (
                query
            ) {

                const exactBarcode =
                    products.find(
                        (
                            product
                        ) =>
                            String(
                                product.barcode ||
                                ""
                            ).trim() ===
                            query
                    );


                if (
                    exactBarcode
                ) {

                    addProduct(
                        exactBarcode,
                        {
                            clearSearch:
                                false,

                            selectSearchText:
                                true,
                        }
                    );


                    return;

                }

            }


            const highlightedProduct =
                filteredProducts[
                    highlightedProductIndex
                ] ||
                filteredProducts[
                    0
                ];


            if (
                highlightedProduct
            ) {

                addProduct(
                    highlightedProduct,
                    {
                        clearSearch:
                            false,

                        selectSearchText:
                            true,
                    }
                );

            }

        };


    /*
    ============================================================
    CHANGE QUANTITY
    ============================================================
    */

    const changeQuantity =
        (
            productId,
            value
        ) => {

            const numericQuantity =
                Math.max(
                    1,
                    Math.floor(
                        Number(
                            value
                        ) ||
                        1
                    )
                );


            setTransferItems(
                (
                    current
                ) =>
                    current.map(
                        (
                            item
                        ) => {

                            if (
                                item.productId !==
                                productId
                            ) {

                                return item;

                            }


                            return {

                                ...item,

                                quantity:
                                    Math.min(
                                        numericQuantity,
                                        Number(
                                            item.stock ||
                                            0
                                        )
                                    ),

                            };

                        }
                    )
            );

        };


    /*
    ============================================================
    REMOVE ITEM
    ============================================================
    */

    const removeItem =
        (
            productId
        ) => {

            setTransferItems(
                (
                    current
                ) =>
                    current.filter(
                        (
                            item
                        ) =>
                            item.productId !==
                            productId
                    )
            );

        };


    /*
    ============================================================
    BUILD PAYLOAD
    ============================================================
    */

    const buildTransferPayload =
        () => {

            return {

                destinationBranchId,

                remarks:
                    String(
                        remarks ||
                        ""
                    )
                        .trim(),

                items:
                    transferItems.map(
                        (
                            item
                        ) => ({
                            productId:
                                item.productId,

                            quantity:
                                Number(
                                    item.quantity
                                ),
                        })
                    ),

            };

        };


    /*
    ============================================================
    SAVE DRAFT
    ============================================================
    */

    const saveDraft =
        async () => {

            if (
                !destinationBranchId
            ) {

                showToast(
                    "Select a destination branch.",
                    "error"
                );


                return;

            }


            if (
                transferItems.length ===
                0
            ) {

                showToast(
                    "Add at least one product.",
                    "error"
                );


                return;

            }


            setSaving(
                true
            );


            try {

                const payload =
                    buildTransferPayload();


                let transfer;


                if (
                    currentTransfer?._id
                ) {

                    transfer =
                        await stockTransferService
                            .updateTransfer(
                                currentTransfer._id,
                                payload
                            );

                } else {

                    transfer =
                        await stockTransferService
                            .createTransfer(
                                payload
                            );

                }


                setCurrentTransfer(
                    transfer
                );


                showToast(
                    currentTransfer?._id
                        ? "Transfer draft updated."
                        : "Transfer draft created."
                );


                await loadTransfers();


            } catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to save transfer draft."
                    ),
                    "error"
                );


            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ============================================================
    PRINT LIST
    ============================================================
    */

    const printList =
        async () => {

            if (
                !currentTransfer?._id
            ) {

                showToast(
                    "Save the transfer draft before printing.",
                    "error"
                );


                return;

            }


            try {

                await stockTransferService
                    .printTransferList(
                        currentTransfer._id
                    );


                showToast(
                    "Worker transfer list printed."
                );


            } catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to print transfer list."
                    ),
                    "error"
                );

            }

        };


    /*
    ============================================================
    COMPLETE
    ============================================================
    */

    const completeTransfer =
        async () => {

            if (
                !currentTransfer?._id
            ) {

                showToast(
                    "Save the transfer draft first.",
                    "error"
                );


                return;

            }


            const confirmed =
                window.confirm(
                    `Complete ${currentTransfer.transferNumber}?\n\nThis will deduct stock from ${activeBranch?.code || "the source branch"} and add it to the destination branch.`
                );


            if (
                !confirmed
            ) {

                return;

            }


            setSaving(
                true
            );


            try {

                /*
                Save any last edits before completing.
                */

                const updated =
                    await stockTransferService
                        .updateTransfer(
                            currentTransfer._id,
                            buildTransferPayload()
                        );


                const completed =
                    await stockTransferService
                        .completeTransfer(
                            updated._id
                        );


                setCurrentTransfer(
                    completed
                );


                showToast(
                    "Stock transfer completed successfully."
                );


                await Promise.all([

                    loadProducts(),

                    loadTransfers(),

                ]);


            } catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to complete stock transfer."
                    ),
                    "error"
                );


            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ============================================================
    PRINT RECEIPT
    ============================================================
    */

    const printReceipt =
        async () => {

            if (
                currentTransfer?.status !==
                "COMPLETED"
            ) {

                showToast(
                    "Only completed transfers have a transfer receipt.",
                    "error"
                );


                return;

            }


            try {

                await stockTransferService
                    .printTransferReceipt(
                        currentTransfer._id
                    );


                showToast(
                    "Transfer receipt printed."
                );


            } catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to print transfer receipt."
                    ),
                    "error"
                );

            }

        };


    /*
    ============================================================
    OPEN HISTORY ITEM
    ============================================================
    */

    const openTransfer =
        async (
            transfer
        ) => {

            try {

                const fullTransfer =
                    await stockTransferService
                        .getTransferById(
                            transfer._id
                        );


                setSelectedTransfer(
                    fullTransfer
                );


            } catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to load transfer."
                    ),
                    "error"
                );

            }

        };


    /*
    ============================================================
    CANCEL HISTORY DRAFT
    ============================================================
    */

    const cancelTransfer =
        async (
            transfer
        ) => {

            if (
                transfer.status !==
                "DRAFT"
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    `Cancel ${transfer.transferNumber}?`
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                const cancelled =
                    await stockTransferService
                        .cancelTransfer(
                            transfer._id
                        );


                if (
                    currentTransfer?._id ===
                    transfer._id
                ) {

                    setCurrentTransfer(
                        cancelled
                    );

                }


                setSelectedTransfer(
                    null
                );


                await loadTransfers();


                showToast(
                    "Transfer cancelled."
                );


            } catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to cancel transfer."
                    ),
                    "error"
                );

            }

        };


    /*
    ============================================================
    LOAD DRAFT INTO EDITOR
    ============================================================
    */

    const editDraft =
        (
            transfer
        ) => {

            if (
                transfer.status !==
                "DRAFT"
            ) {

                return;

            }


            setCurrentTransfer(
                transfer
            );


            setDestinationBranchId(
                String(
                    transfer.destinationBranch
                        ?._id ||
                    transfer.destinationBranch ||
                    ""
                )
            );


            setRemarks(
                transfer.remarks ||
                ""
            );


            setTransferItems(
                (
                    transfer.items ||
                    []
                ).map(
                    (
                        item
                    ) => {

                        const productId =
                            String(
                                item.product?._id ||
                                item.product ||
                                ""
                            );


                        const currentProduct =
                            products.find(
                                (
                                    product
                                ) =>
                                    getProductId(
                                        product
                                    ) ===
                                    productId
                            );


                        return {

                            productId,

                            barcode:
                                item.barcode ||
                                currentProduct?.barcode ||
                                "",

                            name:
                                item.name ||
                                currentProduct?.name ||
                                "Product",

                            baseUnit:
                                item.baseUnit ||
                                currentProduct?.baseUnit ||
                                "Piece",

                            stock:
                                Number(
                                    currentProduct?.stock ||
                                    0
                                ),

                            quantity:
                                Number(
                                    item.quantity ||
                                    1
                                ),

                        };

                    }
                )
            );


            setSelectedTransfer(
                null
            );


            setTab(
                "new"
            );

        };


    /*
    ============================================================
    DESTINATIONS
    ============================================================
    */

    const destinationBranches =
        useMemo(
            () => {

                const activeId =
                    String(
                        activeBranch?._id ||
                        ""
                    );


                return branches.filter(
                    (
                        branch
                    ) =>

                        branch.isActive !==
                            false &&

                        String(
                            branch._id
                        ) !==
                            activeId
                );

            },
            [
                branches,
                activeBranch,
            ]
        );


    /*
    ============================================================
    KEEP SEARCH READY FOR FAST KEYBOARD / SCANNER ENTRY
    ============================================================
    */

    useEffect(
        () => {

            if (
                tab !==
                "new" ||
                loading ||
                currentTransfer?.status ===
                "COMPLETED"
            ) {

                return;

            }


            const timer =
                setTimeout(
                    () => {

                        searchInputRef.current
                            ?.focus();

                    },
                    0
                );


            return () =>
                clearTimeout(
                    timer
                );

        },
        [
            tab,
            loading,
            currentTransfer?.status,
        ]
    );


    /*
    ============================================================
    LOADING
    ============================================================
    */

    if (
        loading
    ) {

        return (

            <div
                className="
                    flex
                    min-h-[60vh]
                    items-center
                    justify-center
                "
            >

                <span
                    className="
                        loading
                        loading-spinner
                        loading-lg
                    "
                />

            </div>

        );

    }


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <div
            className="
                space-y-2
                pb-1
                text-[13px]
            "
        >

            {/* =================================================
                TOAST
            ================================================= */}

            {
                toast && (

                    <div
                        className="
                            fixed
                            right-5
                            top-5
                            z-[1000]
                            max-w-sm
                        "
                    >

                        <div
                            className={`
                                rounded-xl
                                px-4
                                py-3
                                shadow-xl
                                text-sm
                                font-semibold

                                ${
                                    toast.type ===
                                    "error"

                                        ? "bg-error text-error-content"

                                        : "bg-success text-success-content"
                                }
                            `}
                        >

                            {
                                toast.message
                            }

                        </div>

                    </div>

                )
            }


            {/* =================================================
                HEADER
            ================================================= */}

            <div
                className="
                    flex
                    flex-wrap
                    items-center
                    justify-between
                    gap-3
                "
            >

                <div>

                    <div
                        className="
                            text-lg
                            font-black
                        "
                    >

                        Stock Transfer

                    </div>


                    <div
                        className="
                            mt-0.5
                            text-[11px]
                            text-base-content/55
                        "
                    >

                        Move inventory between branches with
                        printable transfer records.

                    </div>

                </div>


                <div
                    className="
                        tabs
                        tabs-boxed
                        tabs-sm
                        text-xs
                    "
                >

                    <button
                        type="button"
                        className={`
                            tab
                            ${
                                tab ===
                                "new"
                                    ? "tab-active"
                                    : ""
                            }
                        `}
                        onClick={() =>
                            setTab(
                                "new"
                            )
                        }
                    >

                        New Transfer

                    </button>


                    <button
                        type="button"
                        className={`
                            tab
                            ${
                                tab ===
                                "history"
                                    ? "tab-active"
                                    : ""
                            }
                        `}
                        onClick={() => {

                            setTab(
                                "history"
                            );


                            loadTransfers();

                        }}
                    >

                        Transfer History

                    </button>

                </div>

            </div>


            {/* =================================================
                NEW TRANSFER
            ================================================= */}

            {
                tab ===
                "new" && (

                    <div
                        className="
                            grid
                            grid-cols-1
                            gap-2
                            lg:h-[calc(100dvh-17.5rem)]
                            lg:min-h-[440px]
                            lg:grid-cols-12
                        "
                    >

                        {/* =====================================
                            LEFT SIDE
                        ===================================== */}

                        <div
                            className="
                                min-h-0
                                space-y-2
                                lg:col-span-7
                                lg:flex
                                lg:h-full
                                lg:flex-col
                            "
                        >

                            {/* =================================
                                BRANCHES
                            ================================= */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-base-300
                                    bg-base-100
                                    p-2.5
                                    shadow-sm
                                "
                            >

                                <div
                                    className="
                                        grid
                                        grid-cols-1
                                        gap-2
                                        sm:grid-cols-2
                                    "
                                >

                                    <div>

                                        <label
                                            className="
                                                mb-1
                                                block
                                                text-[10px]
                                                font-bold
                                                uppercase
                                                tracking-wide
                                                text-base-content/50
                                            "
                                        >

                                            From Branch

                                        </label>


                                        <div
                                            className="
                                                rounded-xl
                                                border
                                                border-base-300
                                                bg-base-200
                                                px-2.5
                                                py-1.5
                                                text-sm
                                            "
                                        >

                                            <div
                                                className="
                                                    font-bold
                                                "
                                            >

                                                {
                                                    activeBranch?.code ||
                                                    "-"
                                                }

                                                {" — "}

                                                {
                                                    activeBranch?.name ||
                                                    "No active branch"
                                                }

                                            </div>


                                            <div
                                                className="
                                                    mt-0.5
                                                    text-[10px]
                                                    text-base-content/50
                                                "
                                            >

                                                Current active branch

                                            </div>

                                        </div>

                                    </div>


                                    <div>

                                        <label
                                            className="
                                                mb-1
                                                block
                                                text-[10px]
                                                font-bold
                                                uppercase
                                                tracking-wide
                                                text-base-content/50
                                            "
                                        >

                                            To Branch

                                        </label>


                                        <select
                                            className="
                                                select
                                                select-bordered
                                                select-sm
                                                w-full
                                                text-xs
                                            "
                                            value={
                                                destinationBranchId
                                            }
                                            disabled={
                                                currentTransfer?.status ===
                                                "COMPLETED"
                                            }
                                            onChange={(
                                                event
                                            ) => {

                                                setDestinationBranchId(
                                                    event.target.value
                                                );

                                            }}
                                        >

                                            <option value="">

                                                Select destination

                                            </option>


                                            {
                                                destinationBranches.map(
                                                    (
                                                        branch
                                                    ) => (

                                                        <option
                                                            key={
                                                                branch._id
                                                            }
                                                            value={
                                                                branch._id
                                                            }
                                                        >

                                                            {
                                                                branch.code
                                                            }

                                                            {" — "}

                                                            {
                                                                branch.name
                                                            }

                                                        </option>

                                                    )
                                                )
                                            }

                                        </select>

                                    </div>

                                </div>

                            </div>


                            {/* =================================
                                PRODUCT SEARCH
                            ================================= */}

                            <div
                                className="
                                    flex
                                    min-h-full
                                    flex-col
                                    rounded-2xl
                                    border
                                    border-base-300
                                    bg-base-100
                                    p-2.5
                                    shadow-sm
                                    lg:flex-1
                                "
                            >

                                <div
                                    className="
                                        mb-2
                                        flex
                                        items-center
                                        justify-between
                                    "
                                >

                                    <div>

                                        <div
                                            className="
                                                text-sm
                                                font-bold
                                            "
                                        >

                                            Add Products

                                        </div>


                                        <div
                                            className="
                                                text-[10px]
                                                text-base-content/50
                                            "
                                        >

                                            Scan barcode or search by name. ↑/↓ navigate · Enter add · Esc clear

                                        </div>

                                    </div>

                                </div>


                                <input
                                    ref={
                                        searchInputRef
                                    }
                                    type="text"
                                    className="
                                        input
                                        input-bordered
                                        input-sm
                                        w-full
                                        text-xs
                                    "
                                    placeholder="Scan barcode or search product..."
                                    value={
                                        productSearch
                                    }
                                    disabled={
                                        currentTransfer?.status ===
                                        "COMPLETED"
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setProductSearch(
                                            event.target.value
                                        );

                                    }}
                                    onKeyDown={
                                        handleSearchKeyDown
                                    }
                                />


                                <div
                                    ref={
                                        productResultsRef
                                    }
                                    className="
                                        mt-2
                                        min-h-0
                                        flex-1
                                        overflow-y-auto
                                        overscroll-contain
                                        rounded-xl
                                        border
                                        border-base-200
                                    "
                                >

                                    {
                                        filteredProducts.length ===
                                        0
                                            ? (

                                                <div
                                                    className="
                                                        p-5
                                                        text-center
                                                        text-xs
                                                        text-base-content/45
                                                    "
                                                >

                                                    No matching products.

                                                </div>

                                            )
                                            : filteredProducts.map(
                                                (
                                                    product,
                                                    index
                                                ) => {

                                                    const alreadyAdded =
                                                        transferItems.some(
                                                            (
                                                                item
                                                            ) =>
                                                                item.productId ===
                                                                getProductId(
                                                                    product
                                                                )
                                                        );


                                                    return (

                                                        <button
                                                            key={
                                                                getProductId(
                                                                    product
                                                                )
                                                            }
                                                            ref={(node) => {

                                                                productResultRefs.current[
                                                                    index
                                                                ] =
                                                                    node;

                                                            }}
                                                            type="button"
                                                            disabled={
                                                                currentTransfer?.status ===
                                                                "COMPLETED"
                                                            }
                                                            className={`
                                                                flex
                                                                w-full
                                                                items-center
                                                                justify-between
                                                                border-b
                                                                border-base-200
                                                                px-2.5
                                                                py-1.5
                                                                text-left
                                                                text-sm
                                                                transition
                                                                last:border-b-0
                                                                hover:bg-base-200
                                                                disabled:opacity-50

                                                                ${
                                                                    index ===
                                                                    highlightedProductIndex
                                                                        ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                                                                        : ""
                                                                }
                                                            `}
                                                            onMouseEnter={() =>
                                                                setHighlightedProductIndex(
                                                                    index
                                                                )
                                                            }
                                                            onFocus={() =>
                                                                setHighlightedProductIndex(
                                                                    index
                                                                )
                                                            }
                                                            onClick={() => {

                                                                addProduct(
                                                                    product
                                                                );

                                                            }}
                                                        >

                                                            <div>

                                                                <div
                                                                    className="
                                                                        font-semibold
                                                                    "
                                                                >

                                                                    {
                                                                        product.name
                                                                    }

                                                                </div>


                                                                <div
                                                                    className="
                                                                        mt-0.5
                                                                        text-[10px]
                                                                        text-base-content/45
                                                                    "
                                                                >

                                                                    {
                                                                        product.barcode ||
                                                                        "No barcode"
                                                                    }

                                                                </div>

                                                            </div>


                                                            <div
                                                                className="
                                                                    text-right
                                                                "
                                                            >

                                                                <div
                                                                    className="
                                                                        text-[10px]
                                                                        text-base-content/45
                                                                    "
                                                                >

                                                                    Available

                                                                </div>


                                                                <div
                                                                    className="
                                                                        font-black
                                                                    "
                                                                >

                                                                    {
                                                                        formatNumber(
                                                                            product.stock
                                                                        )
                                                                    }

                                                                    {" "}

                                                                    {
                                                                        product.baseUnit ||
                                                                        "pc"
                                                                    }

                                                                </div>


                                                                {
                                                                    alreadyAdded && (

                                                                        <div
                                                                            className="
                                                                                mt-1
                                                                                text-[9px]
                                                                                font-semibold
                                                                                text-primary
                                                                            "
                                                                        >

                                                                            Added

                                                                        </div>

                                                                    )
                                                                }

                                                            </div>

                                                        </button>

                                                    );

                                                }
                                            )
                                    }

                                </div>

                            </div>

                        </div>


                        {/* =====================================
                            RIGHT SIDE
                        ===================================== */}

                        <div
                            className="
                                min-h-full
                                lg:col-span-5
                                lg:h-full
                            "
                        >

                            <div
                                className="
                                    flex
                                    min-h-full
                                    flex-col
                                    rounded-2xl
                                    border
                                    border-base-300
                                    bg-base-100
                                    shadow-sm
                                    lg:h-full   
                                "
                            >

                                <div
                                    className="
                                        border-b
                                        border-base-200
                                        p-2.5
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            items-start
                                            justify-between
                                            gap-3
                                        "
                                    >

                                        <div>

                                            <div
                                                className="
                                                    text-sm
                                                    font-black
                                                "
                                            >

                                                Transfer Items

                                            </div>


                                            {
                                                currentTransfer && (

                                                    <div
                                                        className="
                                                            mt-1
                                                            text-[10px]
                                                            text-base-content/50
                                                        "
                                                    >

                                                        {
                                                            currentTransfer
                                                                .transferNumber
                                                        }

                                                    </div>

                                                )
                                            }

                                        </div>


                                        {
                                            currentTransfer && (

                                                <span
                                                    className={`
                                                        badge
                                                        font-bold

                                                        ${
                                                            currentTransfer.status ===
                                                            "COMPLETED"

                                                                ? "badge-success"

                                                                : currentTransfer.status ===
                                                                  "CANCELLED"

                                                                    ? "badge-error"

                                                                    : "badge-warning"
                                                        }
                                                    `}
                                                >

                                                    {
                                                        currentTransfer.status
                                                    }

                                                </span>

                                            )
                                        }

                                    </div>

                                </div>


                                {/* =============================
                                    ITEMS
                                ============================= */}

                                <div
                                    className="
                                        min-h-0
                                        flex-1
                                        overflow-y-auto
                                        overscroll-contain
                                    "
                                >

                                    {
                                        transferItems.length ===
                                        0
                                            ? (

                                                <div
                                                    className="
                                                        p-10
                                                        text-center
                                                        text-sm
                                                        text-base-content/45
                                                    "
                                                >

                                                    No products added yet.

                                                </div>

                                            )
                                            : transferItems.map(
                                                (
                                                    item
                                                ) => (

                                                    <div
                                                        key={
                                                            item.productId
                                                        }
                                                        className="
                                                            border-b
                                                            border-base-200
                                                            p-2.5
                                                            last:border-b-0
                                                        "
                                                    >

                                                        <div
                                                            className="
                                                                flex
                                                                items-start
                                                                justify-between
                                                                gap-3
                                                            "
                                                        >

                                                            <div
                                                                className="
                                                                    min-w-0
                                                                    flex-1
                                                                "
                                                            >

                                                                <div
                                                                    className="
                                                                        truncate
                                                                        text-sm
                                                                        font-semibold
                                                                    "
                                                                >

                                                                    {
                                                                        item.name
                                                                    }

                                                                </div>


                                                                <div
                                                                    className="
                                                                        mt-0.5
                                                                        text-[10px]
                                                                        text-base-content/45
                                                                    "
                                                                >

                                                                    Available:{" "}

                                                                    {
                                                                        formatNumber(
                                                                            item.stock
                                                                        )
                                                                    }

                                                                    {" "}

                                                                    {
                                                                        item.baseUnit
                                                                    }

                                                                </div>

                                                            </div>


                                                            {
                                                                currentTransfer?.status !==
                                                                "COMPLETED" && (

                                                                    <button
                                                                        type="button"
                                                                        className="
                                                                            btn
                                                                            btn-ghost
                                                                            btn-xs
                                                                            text-error
                                                                        "
                                                                        onClick={() =>
                                                                            removeItem(
                                                                                item.productId
                                                                            )
                                                                        }
                                                                    >

                                                                        Remove

                                                                    </button>

                                                                )
                                                            }

                                                        </div>


                                                        <div
                                                            className="
                                                                mt-2
                                                                flex
                                                                items-center
                                                                gap-2
                                                            "
                                                        >

                                                            <button
                                                                type="button"
                                                                className="
                                                                    btn
                                                                    btn-xs
                                                                    btn-square
                                                                "
                                                                disabled={
                                                                    currentTransfer?.status ===
                                                                    "COMPLETED"
                                                                }
                                                                onClick={() =>
                                                                    changeQuantity(
                                                                        item.productId,
                                                                        item.quantity -
                                                                            1
                                                                    )
                                                                }
                                                            >

                                                                −

                                                            </button>


                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={
                                                                    item.stock
                                                                }
                                                                className="
                                                                    input
                                                                    input-bordered
                                                                    input-xs
                                                                    w-16
                                                                    text-center
                                                                    font-bold
                                                                "
                                                                value={
                                                                    item.quantity
                                                                }
                                                                disabled={
                                                                    currentTransfer?.status ===
                                                                    "COMPLETED"
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) => {

                                                                    changeQuantity(
                                                                        item.productId,
                                                                        event.target.value
                                                                    );

                                                                }}
                                                            />


                                                            <button
                                                                type="button"
                                                                className="
                                                                    btn
                                                                    btn-xs
                                                                    btn-square
                                                                "
                                                                disabled={
                                                                    currentTransfer?.status ===
                                                                    "COMPLETED" ||
                                                                    Number(
                                                                        item.quantity
                                                                    ) >=
                                                                    Number(
                                                                        item.stock
                                                                    )
                                                                }
                                                                onClick={() =>
                                                                    changeQuantity(
                                                                        item.productId,
                                                                        item.quantity +
                                                                            1
                                                                    )
                                                                }
                                                            >

                                                                +

                                                            </button>


                                                            <div
                                                                className="
                                                                    ml-auto
                                                                    text-xs
                                                                    font-semibold
                                                                "
                                                            >

                                                                {
                                                                    item.quantity
                                                                }

                                                                {" "}

                                                                {
                                                                    item.baseUnit
                                                                }

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )
                                    }

                                </div>


                                {/* =============================
                                    SUMMARY
                                ============================= */}

                                <div
                                    className="
                                        border-t
                                        border-base-200
                                        p-1.5
                                    "
                                >

                                    <div
                                        className="
                                            grid
                                            grid-cols-2
                                            gap-2
                                        "
                                    >

                                        <div
                                            className="
                                                rounded-lg
                                                bg-base-200
                                                p-1.5
                                            "
                                        >

                                            <div
                                                className="
                                                    text-[10px]
                                                    text-base-content/50
                                                "
                                            >

                                                Products

                                            </div>


                                            <div
                                                className="
                                                    mt-0.5
                                                    text-base
                                                    font-black
                                                "
                                            >

                                                {
                                                    transferItems.length
                                                }

                                            </div>

                                        </div>


                                        <div
                                            className="
                                                rounded-lg
                                                bg-base-200
                                                p-1.5
                                            "
                                        >

                                            <div
                                                className="
                                                    text-[10px]
                                                    text-base-content/50
                                                "
                                            >

                                                Total Quantity

                                            </div>


                                            <div
                                                className="
                                                    mt-0.5
                                                    text-base
                                                    font-black
                                                "
                                            >

                                                {
                                                    totalQuantity
                                                }

                                            </div>

                                        </div>

                                    </div>


                                    <textarea
                                        className="
                                            textarea
                                            textarea-bordered
                                            mt-1.5
                                            min-h-[2.5rem]
                                            w-full
                                            text-xs
                                        "
                                        rows="2"
                                        maxLength="500"
                                        placeholder="Remarks / instructions for workers..."
                                        value={
                                            remarks
                                        }
                                        disabled={
                                            currentTransfer?.status ===
                                            "COMPLETED"
                                        }
                                        onChange={(
                                            event
                                        ) => {

                                            setRemarks(
                                                event.target.value
                                            );

                                        }}
                                    />


                                    {/* =========================
                                        DRAFT ACTIONS
                                    ========================= */}

                                    {
                                        currentTransfer?.status !==
                                        "COMPLETED" &&
                                        currentTransfer?.status !==
                                        "CANCELLED" && (

                                            <div
                                                className="
                                                    mt-1.5
                                                    grid
                                                    grid-cols-2
                                                    gap-2
                                                "
                                            >

                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-sm
                                                    "
                                                    disabled={
                                                        saving
                                                    }
                                                    onClick={
                                                        saveDraft
                                                    }
                                                >

                                                    {
                                                        saving
                                                            ? "Saving..."
                                                            : currentTransfer
                                                                ? "Update Draft"
                                                                : "Save Draft"
                                                    }

                                                </button>


                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-sm
                                                        btn-outline
                                                    "
                                                    disabled={
                                                        !currentTransfer?._id
                                                    }
                                                    onClick={
                                                        printList
                                                    }
                                                >

                                                    Print Worker List

                                                </button>


                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-sm
                                                        btn-primary
                                                        col-span-2
                                                    "
                                                    disabled={
                                                        !currentTransfer?._id ||
                                                        saving
                                                    }
                                                    onClick={
                                                        completeTransfer
                                                    }
                                                >

                                                    Complete Transfer

                                                </button>

                                            </div>

                                        )
                                    }


                                    {/* =========================
                                        COMPLETED ACTIONS
                                    ========================= */}

                                    {
                                        currentTransfer?.status ===
                                        "COMPLETED" && (

                                            <div
                                                className="
                                                    mt-2
                                                    space-y-2
                                                "
                                            >

                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-primary
                                                        w-full
                                                    "
                                                    onClick={
                                                        printReceipt
                                                    }
                                                >

                                                    Print Transfer Receipt

                                                </button>


                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        w-full
                                                    "
                                                    onClick={() => {

                                                        resetTransferForm();

                                                    }}
                                                >

                                                    New Transfer

                                                </button>

                                            </div>

                                        )
                                    }

                                </div>

                            </div>

                        </div>

                    </div>

                )
            }


            {/* =================================================
                HISTORY
            ================================================= */}

            {
                tab ===
                "history" && (

                    <div
                        className="
                            rounded-2xl
                            border
                            border-base-300
                            bg-base-100
                            shadow-sm
                        "
                    >

                        <div
                            className="
                                flex
                                flex-wrap
                                items-center
                                justify-between
                                gap-3
                                border-b
                                border-base-200
                                p-5
                            "
                        >

                            <div>

                                <div
                                    className="
                                        text-lg
                                        font-black
                                    "
                                >

                                    Transfer History

                                </div>


                                <div
                                    className="
                                        text-xs
                                        text-base-content/50
                                    "
                                >

                                    Incoming and outgoing transfers
                                    involving the active branch.

                                </div>

                            </div>


                            <select
                                className="
                                    select
                                    select-bordered
                                    select-sm
                                "
                                value={
                                    statusFilter
                                }
                                onChange={async (
                                    event
                                ) => {

                                    const value =
                                        event.target.value;


                                    setStatusFilter(
                                        value
                                    );


                                    try {

                                        await loadTransfers(
                                            value
                                        );

                                    } catch (
                                        error
                                    ) {

                                        showToast(
                                            getErrorMessage(
                                                error,
                                                "Unable to filter transfers."
                                            ),
                                            "error"
                                        );

                                    }

                                }}
                            >

                                <option value="">

                                    All Statuses

                                </option>


                                <option value="DRAFT">

                                    Draft

                                </option>


                                <option value="COMPLETED">

                                    Completed

                                </option>


                                <option value="CANCELLED">

                                    Cancelled

                                </option>

                            </select>

                        </div>


                        <div
                            className="
                                overflow-x-auto
                            "
                        >

                            <table
                                className="
                                    table
                                    table-zebra
                                "
                            >

                                <thead>

                                    <tr>

                                        <th>
                                            Transfer
                                        </th>

                                        <th>
                                            From
                                        </th>

                                        <th>
                                            To
                                        </th>

                                        <th>
                                            Items
                                        </th>

                                        <th>
                                            Qty
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                        <th />

                                    </tr>

                                </thead>


                                <tbody>

                                    {
                                        transfers.length ===
                                        0
                                            ? (

                                                <tr>

                                                    <td
                                                        colSpan="8"
                                                        className="
                                                            py-10
                                                            text-center
                                                            text-base-content/45
                                                        "
                                                    >

                                                        No stock transfers found.

                                                    </td>

                                                </tr>

                                            )
                                            : transfers.map(
                                                (
                                                    transfer
                                                ) => (

                                                    <tr
                                                        key={
                                                            transfer._id
                                                        }
                                                    >

                                                        <td
                                                            className="
                                                                font-semibold
                                                            "
                                                        >

                                                            {
                                                                transfer.transferNumber
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                transfer.sourceBranchSnapshot
                                                                    ?.code ||
                                                                transfer.sourceBranch
                                                                    ?.code ||
                                                                "-"
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                transfer.destinationBranchSnapshot
                                                                    ?.code ||
                                                                transfer.destinationBranch
                                                                    ?.code ||
                                                                "-"
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                transfer.totalItems
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                transfer.totalQuantity
                                                            }

                                                        </td>


                                                        <td>

                                                            <span
                                                                className={`
                                                                    badge
                                                                    badge-sm

                                                                    ${
                                                                        transfer.status ===
                                                                        "COMPLETED"

                                                                            ? "badge-success"

                                                                            : transfer.status ===
                                                                              "CANCELLED"

                                                                                ? "badge-error"

                                                                                : "badge-warning"
                                                                    }
                                                                `}
                                                            >

                                                                {
                                                                    transfer.status
                                                                }

                                                            </span>

                                                        </td>


                                                        <td
                                                            className="
                                                                text-xs
                                                            "
                                                        >

                                                            {
                                                                formatDate(
                                                                    transfer.createdAt
                                                                )
                                                            }

                                                        </td>


                                                        <td>

                                                            <button
                                                                type="button"
                                                                className="
                                                                    btn
                                                                    btn-sm
                                                                "
                                                                onClick={() =>
                                                                    openTransfer(
                                                                        transfer
                                                                    )
                                                                }
                                                            >

                                                                View

                                                            </button>

                                                        </td>

                                                    </tr>

                                                )
                                            )
                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                )
            }


            {/* =================================================
                DETAIL MODAL
            ================================================= */}

            {
                selectedTransfer && (

                    <div
                        className="
                            fixed
                            inset-0
                            z-[900]
                            flex
                            items-center
                            justify-center
                            bg-black/40
                            p-5
                        "
                        onClick={() =>
                            setSelectedTransfer(
                                null
                            )
                        }
                    >

                        <div
                            className="
                                max-h-[90vh]
                                w-full
                                max-w-2xl
                                overflow-y-auto
                                rounded-2xl
                                bg-base-100
                                shadow-2xl
                            "
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            <div
                                className="
                                    flex
                                    items-start
                                    justify-between
                                    border-b
                                    border-base-200
                                    p-5
                                "
                            >

                                <div>

                                    <div
                                        className="
                                            text-lg
                                            font-black
                                        "
                                    >

                                        {
                                            selectedTransfer
                                                .transferNumber
                                        }

                                    </div>


                                    <div
                                        className="
                                            mt-1
                                            text-xs
                                            text-base-content/50
                                        "
                                    >

                                        {
                                            formatDate(
                                                selectedTransfer
                                                    .createdAt
                                            )
                                        }

                                    </div>

                                </div>


                                <button
                                    type="button"
                                    className="
                                        btn
                                        btn-circle
                                        btn-ghost
                                        btn-sm
                                    "
                                    onClick={() =>
                                        setSelectedTransfer(
                                            null
                                        )
                                    }
                                >

                                    ✕

                                </button>

                            </div>


                            <div
                                className="
                                    space-y-5
                                    p-5
                                "
                            >

                                <div
                                    className="
                                        grid
                                        grid-cols-2
                                        gap-3
                                    "
                                >

                                    <div
                                        className="
                                            rounded-xl
                                            bg-base-200
                                            p-4
                                        "
                                    >

                                        <div
                                            className="
                                                text-xs
                                                text-base-content/50
                                            "
                                        >

                                            From

                                        </div>


                                        <div
                                            className="
                                                mt-1
                                                font-bold
                                            "
                                        >

                                            {
                                                selectedTransfer
                                                    .sourceBranchSnapshot
                                                    ?.code
                                            }

                                            {" — "}

                                            {
                                                selectedTransfer
                                                    .sourceBranchSnapshot
                                                    ?.name
                                            }

                                        </div>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            bg-base-200
                                            p-4
                                        "
                                    >

                                        <div
                                            className="
                                                text-xs
                                                text-base-content/50
                                            "
                                        >

                                            To

                                        </div>


                                        <div
                                            className="
                                                mt-1
                                                font-bold
                                            "
                                        >

                                            {
                                                selectedTransfer
                                                    .destinationBranchSnapshot
                                                    ?.code
                                            }

                                            {" — "}

                                            {
                                                selectedTransfer
                                                    .destinationBranchSnapshot
                                                    ?.name
                                            }

                                        </div>

                                    </div>

                                </div>


                                <div
                                    className="
                                        divide-y
                                        divide-base-200
                                        rounded-xl
                                        border
                                        border-base-200
                                    "
                                >

                                    {
                                        (
                                            selectedTransfer.items ||
                                            []
                                        ).map(
                                            (
                                                item
                                            ) => (

                                                <div
                                                    key={
                                                        item._id ||
                                                        item.product
                                                    }
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-4
                                                        p-3
                                                    "
                                                >

                                                    <div>

                                                        <div
                                                            className="
                                                                font-semibold
                                                            "
                                                        >

                                                            {
                                                                item.name
                                                            }

                                                        </div>


                                                        <div
                                                            className="
                                                                text-xs
                                                                text-base-content/45
                                                            "
                                                        >

                                                            {
                                                                item.barcode ||
                                                                "No barcode"
                                                            }

                                                        </div>

                                                    </div>


                                                    <div
                                                        className="
                                                            text-right
                                                        "
                                                    >

                                                        <div
                                                            className="
                                                                font-black
                                                            "
                                                        >

                                                            {
                                                                item.quantity
                                                            }

                                                            {" "}

                                                            {
                                                                item.baseUnit
                                                            }

                                                        </div>


                                                        {
                                                            selectedTransfer.status ===
                                                            "COMPLETED" && (

                                                                <div
                                                                    className="
                                                                        mt-1
                                                                        text-[10px]
                                                                        text-base-content/45
                                                                    "
                                                                >

                                                                    Source:{" "}

                                                                    {
                                                                        item.sourceStockBefore
                                                                    }

                                                                    {" → "}

                                                                    {
                                                                        item.sourceStockAfter
                                                                    }

                                                                </div>

                                                            )
                                                        }

                                                    </div>

                                                </div>

                                            )
                                        )
                                    }

                                </div>


                                {
                                    selectedTransfer.remarks && (

                                        <div
                                            className="
                                                rounded-xl
                                                bg-base-200
                                                p-4
                                            "
                                        >

                                            <div
                                                className="
                                                    text-xs
                                                    font-bold
                                                    uppercase
                                                    text-base-content/45
                                                "
                                            >

                                                Remarks

                                            </div>


                                            <div
                                                className="
                                                    mt-1
                                                    text-sm
                                                "
                                            >

                                                {
                                                    selectedTransfer.remarks
                                                }

                                            </div>

                                        </div>

                                    )
                                }


                                <div
                                    className="
                                        flex
                                        flex-wrap
                                        justify-end
                                        gap-2
                                    "
                                >

                                    {
                                        selectedTransfer.status ===
                                        "DRAFT" && (

                                            <>
                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                    "
                                                    onClick={() =>
                                                        editDraft(
                                                            selectedTransfer
                                                        )
                                                    }
                                                >

                                                    Edit Draft

                                                </button>


                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-outline
                                                    "
                                                    onClick={async () => {

                                                        try {

                                                            await stockTransferService
                                                                .printTransferList(
                                                                    selectedTransfer._id
                                                                );


                                                            showToast(
                                                                "Worker transfer list printed."
                                                            );


                                                        } catch (
                                                            error
                                                        ) {

                                                            showToast(
                                                                getErrorMessage(
                                                                    error,
                                                                    "Unable to print transfer list."
                                                                ),
                                                                "error"
                                                            );

                                                        }

                                                    }}
                                                >

                                                    Print List

                                                </button>


                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-error
                                                        btn-outline
                                                    "
                                                    onClick={() =>
                                                        cancelTransfer(
                                                            selectedTransfer
                                                        )
                                                    }
                                                >

                                                    Cancel Draft

                                                </button>
                                            </>

                                        )
                                    }


                                    {
                                        selectedTransfer.status ===
                                        "COMPLETED" && (

                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-primary
                                                "
                                                onClick={async () => {

                                                    try {

                                                        await stockTransferService
                                                            .printTransferReceipt(
                                                                selectedTransfer._id
                                                            );


                                                        showToast(
                                                            "Transfer receipt printed."
                                                        );


                                                    } catch (
                                                        error
                                                    ) {

                                                        showToast(
                                                            getErrorMessage(
                                                                error,
                                                                "Unable to print transfer receipt."
                                                            ),
                                                            "error"
                                                        );

                                                    }

                                                }}
                                            >

                                                Print Receipt

                                            </button>

                                        )
                                    }

                                </div>

                            </div>

                        </div>

                    </div>

                )
            }

        </div>

    );

}


export default StockTransferPage;