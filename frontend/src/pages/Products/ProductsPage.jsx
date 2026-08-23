import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import SearchInput from "../../components/common/SearchInput";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import ProductModal from "../../components/products/ProductModal";

import useProductStore from "../../store/product.store";
import BarcodeNotFoundModal from "../../components/products/BarcodeNotFoundModal";
function ProductsPage() {
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


    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {

    let barcodeBuffer = "";
    let barcodeTimer = null;

    const handleKeyDown = (e) => {

        // Don't interfere with normal typing
        if (
            e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.tagName === "SELECT"
        ) {
            return;
        }

        // Scanner finishes with ENTER
        if (e.key === "Enter") {

            if (!barcodeBuffer) {
                return;
            }

            e.preventDefault();

            const barcode =
                barcodeBuffer.trim();

            barcodeBuffer = "";

            clearTimeout(barcodeTimer);

            // Put scanned barcode into search
            setSearch(barcode);

            // Find exact barcode
            const product =
                useProductStore
                    .getState()
                    .products
                    .find(
                        (product) =>
                            String(
                                product.barcode
                            ).trim() === barcode
                    );

            if (product) {

                // Product exists.
                // Search bar now shows its barcode.
                console.log(
                    "Product found:",
                    product.name
                );

                return;
            }

            // Product doesn't exist
            setScannedBarcode(barcode);

            setBarcodeNotFound(true);

            return;
        }

        // Capture barcode characters
        if (e.key.length === 1) {

            barcodeBuffer += e.key;

            clearTimeout(barcodeTimer);

            barcodeTimer = setTimeout(() => {

                barcodeBuffer = "";

            }, 100);

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

        clearTimeout(barcodeTimer);

    };

}, [setSearch]);

    const [barcodeNotFound, setBarcodeNotFound] =
    useState(false);

const [scannedBarcode, setScannedBarcode] =
    useState("");

    const [newProductBarcode, setNewProductBarcode] =
    useState("");


    // =========================================
    // PRODUCT STATISTICS
    // =========================================

    const totalProducts = products?.length || 0;

    const activeProducts =
        products?.filter(
            (product) => product.isActive
        ).length || 0;

    const outOfStockProducts =
        products?.filter(
            (product) =>
                Number(product.stock || 0) <= 0
        ).length || 0;

    const lowStockProducts =
        products?.filter(
            (product) =>
                Number(product.stock || 0) > 0 &&
                Number(product.stock || 0) <= 5
        ).length || 0;


    // =========================================
    // TABLE COLUMNS
    // =========================================

    const columns = [
        {
            header: "Barcode",
            accessor: "barcode",
        },

        {
            header: "Product",
            accessor: "name",
        },

        {
            header: "Category",
            accessor: "category",
        },

        {
            header: "Pricing",

            render: (product) => (
                <div className="text-xs space-y-1">

                    {product.pricing?.map((tier) => (
                        <div key={tier.quantity}>

                            {tier.quantity}{" "}
                            {product.baseUnit}

                            {tier.quantity > 1
                                ? "s"
                                : ""}

                            {" - "}

                            ₱
                            {Number(
                                tier.price || 0
                            ).toFixed(2)}

                        </div>
                    ))}

                </div>
            ),
        },

        {
            header: "Stock",

            render: (product) => {

                const stock =
                    Number(product.stock || 0);

                return (
                    <div className="flex flex-col gap-1">

                        <span>
                            {stock}{" "}
                            {product.baseUnit}

                            {stock !== 1
                                ? "s"
                                : ""}
                        </span>

                        {stock === 0 && (
                            <span className="text-xs text-error font-medium">
                                Out of stock
                            </span>
                        )}

                        {stock > 0 && stock <= 5 && (
                            <span className="text-xs text-warning font-medium">
                                Low stock
                            </span>
                        )}

                        {stock > 5 && (
                            <span className="text-xs text-success font-medium">
                                In stock
                            </span>
                        )}

                    </div>
                );
            },
        },

        {
            header: "Status",

            render: (product) => (
                <StatusBadge
                    active={product.isActive}
                />
            ),
        },

        {
            header: "Actions",

            render: (product) => (
                <div className="flex gap-2">

                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                            openEditModal(product)
                        }
                    >
                        Edit
                    </button>

                    <button
                        className={`btn btn-sm ${
                            product.isActive
                                ? "btn-error"
                                : "btn-success"
                        }`}
                        onClick={() =>
                            handleToggleStatus(product)
                        }
                    >
                        {product.isActive
                            ? "Archive"
                            : "Activate"}
                    </button>

                </div>
            ),
        },
    ];


    // =========================================
    // CREATE / UPDATE
    // =========================================

    const handleSubmit = async (
        productData
    ) => {

        if (selectedProduct) {

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


    // =========================================
    // ACTIVATE / ARCHIVE
    // =========================================

    const handleToggleStatus = async (
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

        if (!confirmed) return;

        await updateStatus(
            product._id,
            !product.isActive
        );
    };


    return (
        <div className="space-y-4">

            {/* =================================
                PAGE HEADER
            ================================= */}

            <PageHeader
                title="Products"
                subtitle="Manage your inventory products"
                action={
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {

    setNewProductBarcode("");

    openCreateModal();

}}
                    >
                        + Add Product
                    </button>
                }
            />


            {/* =================================
                STATISTICS
            ================================= */}

            <div className="grid grid-cols-4 gap-3">

                {/* TOTAL PRODUCTS */}

                <div className="
                    bg-base-100
                    rounded-xl
                    border
                    border-base-200
                    shadow-sm
                    p-4
                ">

                    <div className="flex items-center gap-3">

                        <div className="
                            w-10
                            h-10
                            rounded-xl
                            bg-primary/10
                            text-primary
                            flex
                            items-center
                            justify-center
                            text-lg
                        ">
                            🛍️
                        </div>

                        <div>

                            <p className="text-xs text-base-content/60">
                                Total Products
                            </p>

                            <p className="text-2xl font-bold">
                                {totalProducts}
                            </p>

                        </div>

                    </div>

                    <p className="text-[11px] text-base-content/50 mt-2">
                        All products in inventory
                    </p>

                </div>


                {/* ACTIVE PRODUCTS */}

                <div className="
                    bg-base-100
                    rounded-xl
                    border
                    border-base-200
                    shadow-sm
                    p-4
                ">

                    <div className="flex items-center gap-3">

                        <div className="
                            w-10
                            h-10
                            rounded-xl
                            bg-success/10
                            text-success
                            flex
                            items-center
                            justify-center
                            text-lg
                        ">
                            ✓
                        </div>

                        <div>

                            <p className="text-xs text-base-content/60">
                                Active Products
                            </p>

                            <p className="text-2xl font-bold">
                                {activeProducts}
                            </p>

                        </div>

                    </div>

                    <p className="text-[11px] text-base-content/50 mt-2">
                        Currently available for sale
                    </p>

                </div>


                {/* LOW STOCK */}

                <div className="
                    bg-base-100
                    rounded-xl
                    border
                    border-base-200
                    shadow-sm
                    p-4
                ">

                    <div className="flex items-center gap-3">

                        <div className="
                            w-10
                            h-10
                            rounded-xl
                            bg-warning/10
                            text-warning
                            flex
                            items-center
                            justify-center
                            text-lg
                        ">
                            ⚠
                        </div>

                        <div>

                            <p className="text-xs text-base-content/60">
                                Low Stock Items
                            </p>

                            <p className="text-2xl font-bold">
                                {lowStockProducts}
                            </p>

                        </div>

                    </div>

                    <p className="text-[11px] text-base-content/50 mt-2">
                        Products needing attention
                    </p>

                </div>


                {/* OUT OF STOCK */}

                <div className="
                    bg-base-100
                    rounded-xl
                    border
                    border-base-200
                    shadow-sm
                    p-4
                ">

                    <div className="flex items-center gap-3">

                        <div className="
                            w-10
                            h-10
                            rounded-xl
                            bg-error/10
                            text-error
                            flex
                            items-center
                            justify-center
                            text-lg
                        ">
                            !
                        </div>

                        <div>

                            <p className="text-xs text-base-content/60">
                                Out of Stock
                            </p>

                            <p className="text-2xl font-bold">
                                {outOfStockProducts}
                            </p>

                        </div>

                    </div>

                    <p className="text-[11px] text-base-content/50 mt-2">
                        Products needing restocking
                    </p>

                </div>

            </div>


            {/* =================================
                SEARCH
            ================================= */}

            <div className="
                bg-base-100
                rounded-xl
                border
                border-base-200
                shadow-sm
                p-3
            ">

                <SearchInput
                    value={search}
                    onChange={(e) =>
                        setSearch(
                            e.target.value
                        )
                    }
                    placeholder="Search by barcode, name or category..."
                />

            </div>


            {/* =================================
                PRODUCTS TABLE
            ================================= */}

            <div className="
                bg-base-100
                rounded-xl
                border
                border-base-200
                shadow-sm
                overflow-hidden
            ">

                <DataTable
                    columns={columns}
                    data={filteredProducts()}
                    loading={loading}
                />

            </div>

            <BarcodeNotFoundModal
    open={barcodeNotFound}
    barcode={scannedBarcode}
    onCancel={() => {
        setBarcodeNotFound(false);
    }}
    onAddProduct={() => {

        setBarcodeNotFound(false);

        setNewProductBarcode(
            scannedBarcode
        );

        openCreateModal();

    }}
/>


            {/* =================================
                PRODUCT MODAL
            ================================= */}

            <ProductModal
                open={modalOpen}
                title={
                    selectedProduct
                        ? "Edit Product"
                        : "Add Product"
                }
               initialValues={
    selectedProduct || {
        barcode: newProductBarcode,
    }
}
                onClose={closeModal}
                onSubmit={handleSubmit}
                loading={loading}
            />

        </div>
    );
}

export default ProductsPage;