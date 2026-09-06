import {
    useEffect,
    useRef,
    useState,
} from "react";

import PageHeader from "../../components/common/PageHeader";
import SearchInput from "../../components/common/SearchInput";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import ProductModal from "../../components/products/ProductModal";
import BarcodeNotFoundModal from "../../components/products/BarcodeNotFoundModal";

import useProductStore from "../../store/product.store";


function ProductsPage() {

    /*
    ============================================================
    PRODUCT STORE
    ============================================================
    */

    const {
        products,
        loading,
        search,
        setSearch,

        fetchProducts,
        filteredProducts,

        modalOpen,
        selectedProduct,

        openCreateModal,
        openEditModal,
        closeModal,

        createProduct,
        updateProduct,
        updateStatus,
    } = useProductStore();


    /*
    ============================================================
    LOCAL STATE
    ============================================================
    */

    const [
        barcodeNotFound,
        setBarcodeNotFound,
    ] = useState(false);


    const [
        scannedBarcode,
        setScannedBarcode,
    ] = useState("");


    const [
        newProductBarcode,
        setNewProductBarcode,
    ] = useState("");


    /*
    ============================================================
    SEARCH CONTAINER REF
    ============================================================
    */

    const searchContainerRef =
        useRef(null);


    /*
    ============================================================
    FOCUS SEARCH INPUT
    ============================================================
    */

    const focusSearchInput =
        () => {

            requestAnimationFrame(
                () => {

                    const input =
                        searchContainerRef
                            .current
                            ?.querySelector(
                                "input"
                            );


                    input
                        ?.focus();

                }
            );

        };


    /*
    ============================================================
    OPEN ADD PRODUCT FROM UNKNOWN VALUE
    ============================================================

    Used by:

    - unknown scanned barcode
    - unknown search value

    The unknown value is placed into the barcode field.
    ============================================================
    */

    const openUnknownProduct =
        () => {

            const barcode =
                String(
                    scannedBarcode ||
                    search ||
                    ""
                ).trim();


            setBarcodeNotFound(
                false
            );


            setNewProductBarcode(
                barcode
            );


            openCreateModal();

        };


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
    F4 - CLEAR SEARCH
    ============================================================

    F4:

    1. Clears search
    2. Returns focus to product search

    Disabled while product modal is open.
    ============================================================
    */

    useEffect(
        () => {

            const handleF4 =
                (
                    event
                ) => {

                    if (
                        event.key !==
                        "F4"
                    ) {

                        return;

                    }


                    if (
                        modalOpen
                    ) {

                        return;

                    }


                    event.preventDefault();

                    event.stopPropagation();


                    setSearch(
                        ""
                    );


                    setScannedBarcode(
                        ""
                    );


                    setBarcodeNotFound(
                        false
                    );


                    focusSearchInput();

                };


            window.addEventListener(
                "keydown",
                handleF4,
                true
            );


            return () => {

                window.removeEventListener(
                    "keydown",
                    handleF4,
                    true
                );

            };

        },
        [
            modalOpen,
            setSearch,
        ]
    );


    /*
    ============================================================
    ENTER WHILE PRODUCT NOT FOUND MODAL IS OPEN
    ============================================================

    Enter:

    Product Not Found
        ↓
    Add Product Modal

    The unknown barcode/search value is prefilled.
    ============================================================
    */

    useEffect(
        () => {

            if (
                !barcodeNotFound
            ) {

                return;

            }


            const handleEnter =
                (
                    event
                ) => {

                    if (
                        event.key !==
                        "Enter"
                    ) {

                        return;

                    }


                    event.preventDefault();

                    event.stopPropagation();


                    openUnknownProduct();

                };


            window.addEventListener(
                "keydown",
                handleEnter,
                true
            );


            return () => {

                window.removeEventListener(
                    "keydown",
                    handleEnter,
                    true
                );

            };

        },
        [
            barcodeNotFound,
            scannedBarcode,
            search,
        ]
    );


    /*
    ============================================================
    BARCODE SCANNER
    ============================================================

    Scanner behavior:

    - scanner types characters quickly
    - scanner finishes with Enter
    - exact barcode lookup is performed
    - if missing:
        Product Not Found modal opens
    ============================================================
    */

    useEffect(
        () => {

            let barcodeBuffer =
                "";


            let barcodeTimer =
                null;


            const handleKeyDown =
                (
                    event
                ) => {

                    /*
                    --------------------------------------------
                    F4 IS HANDLED ELSEWHERE
                    --------------------------------------------
                    */

                    if (
                        event.key ===
                        "F4"
                    ) {

                        return;

                    }


                    /*
                    --------------------------------------------
                    PRODUCT MODAL OPEN
                    --------------------------------------------
                    */

                    if (
                        modalOpen
                    ) {

                        return;

                    }


                    /*
                    --------------------------------------------
                    PRODUCT NOT FOUND MODAL OPEN
                    --------------------------------------------

                    Its Enter handler owns keyboard control.
                    --------------------------------------------
                    */

                    if (
                        barcodeNotFound
                    ) {

                        return;

                    }


                    /*
                    --------------------------------------------
                    DON'T INTERFERE WITH NORMAL TYPING
                    --------------------------------------------
                    */

                    const tagName =
                        event.target
                            ?.tagName;


                    if (
                        tagName ===
                            "INPUT" ||
                        tagName ===
                            "TEXTAREA" ||
                        tagName ===
                            "SELECT"
                    ) {

                        return;

                    }


                    /*
                    --------------------------------------------
                    SCANNER FINISHES WITH ENTER
                    --------------------------------------------
                    */

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        if (
                            !barcodeBuffer
                        ) {

                            return;

                        }


                        event.preventDefault();


                        const barcode =
                            barcodeBuffer
                                .trim();


                        barcodeBuffer =
                            "";


                        clearTimeout(
                            barcodeTimer
                        );


                        /*
                        ----------------------------------------
                        PUT SCANNED BARCODE IN SEARCH
                        ----------------------------------------
                        */

                        setSearch(
                            barcode
                        );


                        /*
                        ----------------------------------------
                        EXACT BARCODE LOOKUP
                        ----------------------------------------
                        */

                        const product =
                            useProductStore
                                .getState()
                                .products
                                .find(
                                    (
                                        product
                                    ) =>
                                        String(
                                            product.barcode ||
                                            ""
                                        ).trim() ===
                                        barcode
                                );


                        /*
                        ----------------------------------------
                        PRODUCT FOUND
                        ----------------------------------------
                        */

                        if (
                            product
                        ) {

                            console.log(
                                "Product found:",
                                product.name
                            );


                            focusSearchInput();


                            return;

                        }


                        /*
                        ----------------------------------------
                        PRODUCT NOT FOUND
                        ----------------------------------------
                        */

                        setScannedBarcode(
                            barcode
                        );


                        setBarcodeNotFound(
                            true
                        );


                        return;

                    }


                    /*
                    --------------------------------------------
                    CAPTURE BARCODE CHARACTERS
                    --------------------------------------------
                    */

                    if (
                        event.key.length ===
                        1
                    ) {

                        barcodeBuffer +=
                            event.key;


                        clearTimeout(
                            barcodeTimer
                        );


                        barcodeTimer =
                            setTimeout(
                                () => {

                                    barcodeBuffer =
                                        "";

                                },
                                100
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


                clearTimeout(
                    barcodeTimer
                );

            };

        },
        [
            modalOpen,
            barcodeNotFound,
            setSearch,
        ]
    );


    /*
    ============================================================
    PRODUCT STATISTICS
    ============================================================
    */

    const totalProducts =
        products?.length ||
        0;


    const activeProducts =
        products?.filter(
            (
                product
            ) =>
                product.isActive
        ).length ||
        0;


    const outOfStockProducts =
        products?.filter(
            (
                product
            ) =>
                Number(
                    product.stock ||
                    0
                ) <=
                0
        ).length ||
        0;


    const lowStockProducts =
        products?.filter(
            (
                product
            ) =>
                Number(
                    product.stock ||
                    0
                ) >
                    0 &&

                Number(
                    product.stock ||
                    0
                ) <=
                    5
        ).length ||
        0;


    /*
    ============================================================
    CREATE / UPDATE
    ============================================================
    */

    const handleSubmit =
        async (
            productData
        ) => {

            if (
                selectedProduct
            ) {

                await updateProduct(
                    selectedProduct._id,
                    productData
                );

            } else {

                await createProduct(
                    productData
                );

            }

        };


    /*
    ============================================================
    ACTIVATE / ARCHIVE
    ============================================================
    */

    const handleToggleStatus =
        async (
            product
        ) => {

            const confirmed =
                window.confirm(
                    `Are you sure you want to ${
                        product.isActive
                            ? "archive"
                            : "activate"
                    } "${product.name}"?`
                );


            if (
                !confirmed
            ) {

                return;

            }


            await updateStatus(
                product._id,
                !product.isActive
            );

        };


    /*
    ============================================================
    TABLE COLUMNS
    ============================================================
    */

    const columns = [

        /*
        --------------------------------------------------------
        BARCODE
        --------------------------------------------------------
        */

        {
            header:
                "Barcode",

            accessor:
                "barcode",
        },


        /*
        --------------------------------------------------------
        PRODUCT
        --------------------------------------------------------
        */

        {
            header:
                "Product",

            accessor:
                "name",
        },


        /*
        --------------------------------------------------------
        CATEGORY
        --------------------------------------------------------
        */

        {
            header:
                "Category",

            accessor:
                "category",
        },


        /*
        --------------------------------------------------------
        PRICING
        --------------------------------------------------------
        */

        {
            header:
                "Pricing",


            render:
                (
                    product
                ) => (

                    <div className="text-xs space-y-1">

                        {
                            product.pricing
                                ?.map(
                                    (
                                        tier
                                    ) => (

                                        <div
                                            key={
                                                tier.quantity
                                            }
                                        >

                                            {
                                                tier.quantity
                                            }

                                            {" "}

                                            {
                                                product.baseUnit
                                            }

                                            {
                                                tier.quantity >
                                                1
                                                    ? "s"
                                                    : ""
                                            }

                                            {" - "}

                                            ₱
                                            {
                                                Number(
                                                    tier.price ||
                                                    0
                                                ).toFixed(
                                                    2
                                                )
                                            }

                                        </div>

                                    )
                                )
                        }

                    </div>

                ),
        },


        /*
        --------------------------------------------------------
        STOCK
        --------------------------------------------------------
        */

        {
            header:
                "Stock",


            render:
                (
                    product
                ) => {

                    const stock =
                        Number(
                            product.stock ||
                            0
                        );


                    return (

                        <div className="flex flex-col gap-1">

                            <span>

                                {
                                    stock
                                }

                                {" "}

                                {
                                    product.baseUnit
                                }

                                {
                                    stock !==
                                    1
                                        ? "s"
                                        : ""
                                }

                            </span>


                            {
                                stock ===
                                0 && (

                                    <span
                                        className="
                                            text-xs
                                            text-error
                                            font-medium
                                        "
                                    >

                                        Out of stock

                                    </span>

                                )
                            }


                            {
                                stock >
                                    0 &&
                                stock <=
                                    5 && (

                                    <span
                                        className="
                                            text-xs
                                            text-warning
                                            font-medium
                                        "
                                    >

                                        Low stock

                                    </span>

                                )
                            }


                            {
                                stock >
                                5 && (

                                    <span
                                        className="
                                            text-xs
                                            text-success
                                            font-medium
                                        "
                                    >

                                        In stock

                                    </span>

                                )
                            }

                        </div>

                    );

                },
        },


        /*
        --------------------------------------------------------
        STATUS
        --------------------------------------------------------
        */

        {
            header:
                "Status",


            render:
                (
                    product
                ) => (

                    <StatusBadge
                        active={
                            product.isActive
                        }
                    />

                ),
        },


        /*
        --------------------------------------------------------
        ACTIONS
        --------------------------------------------------------
        */

        {
            header:
                "Actions",


            render:
                (
                    product
                ) => (

                    <div className="flex gap-2">

                        <button
                            type="button"
                            className="
                                btn
                                btn-primary
                                btn-sm
                            "
                            onClick={() =>
                                openEditModal(
                                    product
                                )
                            }
                        >

                            Edit

                        </button>


                        <button
                            type="button"
                            className={`btn btn-sm ${
                                product.isActive
                                    ? "btn-error"
                                    : "btn-success"
                            }`}
                            onClick={() =>
                                handleToggleStatus(
                                    product
                                )
                            }
                        >

                            {
                                product.isActive
                                    ? "Archive"
                                    : "Activate"
                            }

                        </button>

                    </div>

                ),
        },

    ];


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <div className="space-y-4">


            {/* ===============================================
                PAGE HEADER
            =============================================== */}

            <PageHeader
                title="Products"
                subtitle="Manage your inventory products"
                action={

                    <button
                        type="button"
                        className="
                            btn
                            btn-primary
                            btn-sm
                        "
                        onClick={() => {

                            setNewProductBarcode(
                                ""
                            );


                            openCreateModal();

                        }}
                    >

                        + Add Product

                    </button>

                }
            />


            {/* ===============================================
                STATISTICS
            =============================================== */}

            <div className="grid grid-cols-4 gap-3">


                {/* ===========================================
                    TOTAL PRODUCTS
                =========================================== */}

                <div
                    className="
                        bg-base-100
                        rounded-xl
                        border
                        border-base-200
                        shadow-sm
                        p-4
                    "
                >

                    <div className="flex items-center gap-3">

                        <div
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-primary/10
                                text-primary
                                flex
                                items-center
                                justify-center
                                text-lg
                            "
                        >

                            🛍️

                        </div>


                        <div>

                            <p
                                className="
                                    text-xs
                                    text-base-content/60
                                "
                            >

                                Total Products

                            </p>


                            <p className="text-2xl font-bold">

                                {
                                    totalProducts
                                }

                            </p>

                        </div>

                    </div>


                    <p
                        className="
                            text-[11px]
                            text-base-content/50
                            mt-2
                        "
                    >

                        All products in inventory

                    </p>

                </div>


                {/* ===========================================
                    ACTIVE PRODUCTS
                =========================================== */}

                <div
                    className="
                        bg-base-100
                        rounded-xl
                        border
                        border-base-200
                        shadow-sm
                        p-4
                    "
                >

                    <div className="flex items-center gap-3">

                        <div
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-success/10
                                text-success
                                flex
                                items-center
                                justify-center
                                text-lg
                            "
                        >

                            ✓

                        </div>


                        <div>

                            <p
                                className="
                                    text-xs
                                    text-base-content/60
                                "
                            >

                                Active Products

                            </p>


                            <p className="text-2xl font-bold">

                                {
                                    activeProducts
                                }

                            </p>

                        </div>

                    </div>


                    <p
                        className="
                            text-[11px]
                            text-base-content/50
                            mt-2
                        "
                    >

                        Currently available for sale

                    </p>

                </div>


                {/* ===========================================
                    LOW STOCK
                =========================================== */}

                <div
                    className="
                        bg-base-100
                        rounded-xl
                        border
                        border-base-200
                        shadow-sm
                        p-4
                    "
                >

                    <div className="flex items-center gap-3">

                        <div
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-warning/10
                                text-warning
                                flex
                                items-center
                                justify-center
                                text-lg
                            "
                        >

                            ⚠

                        </div>


                        <div>

                            <p
                                className="
                                    text-xs
                                    text-base-content/60
                                "
                            >

                                Low Stock Items

                            </p>


                            <p className="text-2xl font-bold">

                                {
                                    lowStockProducts
                                }

                            </p>

                        </div>

                    </div>


                    <p
                        className="
                            text-[11px]
                            text-base-content/50
                            mt-2
                        "
                    >

                        Products needing attention

                    </p>

                </div>


                {/* ===========================================
                    OUT OF STOCK
                =========================================== */}

                <div
                    className="
                        bg-base-100
                        rounded-xl
                        border
                        border-base-200
                        shadow-sm
                        p-4
                    "
                >

                    <div className="flex items-center gap-3">

                        <div
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-error/10
                                text-error
                                flex
                                items-center
                                justify-center
                                text-lg
                            "
                        >

                            !

                        </div>


                        <div>

                            <p
                                className="
                                    text-xs
                                    text-base-content/60
                                "
                            >

                                Out of Stock

                            </p>


                            <p className="text-2xl font-bold">

                                {
                                    outOfStockProducts
                                }

                            </p>

                        </div>

                    </div>


                    <p
                        className="
                            text-[11px]
                            text-base-content/50
                            mt-2
                        "
                    >

                        Products needing restocking

                    </p>

                </div>

            </div>


            {/* ===============================================
                SEARCH
            =============================================== */}

            <div
                ref={
                    searchContainerRef
                }

                /*
                =================================================
                ENTER ON SEARCH INPUT
                =================================================

                If search returns no matching product:

                Enter
                → Product Not Found modal
                =================================================
                */

                onKeyDownCapture={(
                    event
                ) => {

                    if (
                        event.key !==
                        "Enter"
                    ) {

                        return;

                    }


                    /*
                    --------------------------------------------
                    ONLY HANDLE SEARCH INPUT
                    --------------------------------------------
                    */

                    const input =
                        searchContainerRef
                            .current
                            ?.querySelector(
                                "input"
                            );


                    if (
                        document.activeElement !==
                        input
                    ) {

                        return;

                    }


                    const query =
                        String(
                            search ||
                            ""
                        ).trim();


                    if (
                        !query
                    ) {

                        return;

                    }


                    /*
                    --------------------------------------------
                    CHECK SEARCH RESULTS
                    --------------------------------------------
                    */

                    const matchingProducts =
                        filteredProducts();


                    /*
                    Product exists.
                    */

                    if (
                        matchingProducts.length >
                        0
                    ) {

                        return;

                    }


                    /*
                    Product not found.
                    */

                    event.preventDefault();

                    event.stopPropagation();


                    setScannedBarcode(
                        query
                    );


                    setBarcodeNotFound(
                        true
                    );

                }}

                className="
                    bg-base-100
                    rounded-xl
                    border
                    border-base-200
                    shadow-sm
                    p-3
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <div className="flex-1">

                        <SearchInput
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search by barcode, name or category..."
                        />

                    </div>


                    {/* =======================================
                        F4 SHORTCUT
                    ======================================= */}

                    <div
                        className="
                            hidden
                            md:flex
                            items-center
                            gap-2
                            whitespace-nowrap
                            text-xs
                            text-base-content/50
                        "
                    >

                        <kbd className="kbd kbd-sm">

                            F4

                        </kbd>

                        <span>

                            Clear Search

                        </span>

                    </div>

                </div>

            </div>


            {/* ===============================================
                PRODUCTS TABLE
            =============================================== */}

            <div
                className="
                    bg-base-100
                    rounded-xl
                    border
                    border-base-200
                    shadow-sm
                    overflow-hidden
                "
            >

                <DataTable
                    columns={
                        columns
                    }
                    data={
                        filteredProducts()
                    }
                    loading={
                        loading
                    }
                />

            </div>


            {/* ===============================================
                BARCODE / PRODUCT NOT FOUND
            =============================================== */}

            <BarcodeNotFoundModal
                open={
                    barcodeNotFound
                }

                barcode={
                    scannedBarcode
                }

                onCancel={() => {

                    setBarcodeNotFound(
                        false
                    );


                    setTimeout(
                        () => {

                            focusSearchInput();

                        },
                        50
                    );

                }}

                onAddProduct={
                    openUnknownProduct
                }
            />


            {/* ===============================================
                PRODUCT MODAL
            =============================================== */}

            <ProductModal
                open={
                    modalOpen
                }

                title={
                    selectedProduct
                        ? "Edit Product"
                        : "Add Product"
                }

                initialValues={
                    selectedProduct ||
                    {
                        barcode:
                            newProductBarcode,
                    }
                }

                onClose={() => {

                    closeModal();


                    setTimeout(
                        () => {

                            focusSearchInput();

                        },
                        50
                    );

                }}

                onSubmit={
                    handleSubmit
                }

                loading={
                    loading
                }
            />

        </div>

    );

}


export default ProductsPage;