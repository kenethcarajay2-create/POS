import { useEffect, useRef, useState } from "react";

const DEFAULT_PRODUCT = {
    barcode: "",
    name: "",
    description: "",
    category: "Others",
    baseUnit: "Piece",
    costPrice: "",
    sellingPrice: "",
    pricing: [],
    stock: "",
    minimumStock: "5",
};

function ProductForm({
    initialValues = DEFAULT_PRODUCT,
    onSubmit,
    onCancel,
    loading = false,
}) {

    const barcodeRef = useRef(null);

    const [showBulkPricing, setShowBulkPricing] =
        useState(false);

    const [form, setForm] =
        useState(DEFAULT_PRODUCT);


    // =========================================
    // LOAD PRODUCT
    // =========================================

    useEffect(() => {

        const basePrice =
            initialValues?.pricing?.find(
                (p) => p.quantity === 1
            );

        setForm({
            ...DEFAULT_PRODUCT,

            ...initialValues,

            costPrice:
                initialValues?.costPrice?.toString() ?? "",

            sellingPrice:
                basePrice?.price?.toString() ?? "",

            stock:
                initialValues?.stock !== undefined
                    ? initialValues.stock.toString()
                    : "",

            minimumStock:
                initialValues?.minimumStock !== undefined
                    ? initialValues.minimumStock.toString()
                    : "5",

            pricing:
                initialValues?.pricing
                    ?.filter(
                        (p) => p.quantity !== 1
                    )
                    .map((p) => ({
                        quantity:
                            p.quantity.toString(),

                        price:
                            p.price.toString(),
                    })) ?? [],
        });

        setTimeout(() => {
            barcodeRef.current?.focus();
        }, 100);

        setShowBulkPricing(
            (initialValues?.pricing?.length ?? 0) > 1
        );

    }, [initialValues]);


    // =========================================
    // FORM CHANGE
    // =========================================

    const handleChange = (e) => {

        const {
            name,
            value,
        } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };


    // =========================================
    // BULK PRICING
    // =========================================

    const handlePricingChange = (
        index,
        field,
        value
    ) => {

        const pricing = [...form.pricing];

        pricing[index][field] = value;

        setForm((prev) => ({
            ...prev,
            pricing,
        }));
    };


    const addPricingRow = () => {

        setShowBulkPricing(true);

        setForm((prev) => ({
            ...prev,

            pricing: [
                ...prev.pricing,

                {
                    quantity: "",
                    price: "",
                },
            ],
        }));
    };


    const removePricingRow = (index) => {

        setForm((prev) => ({
            ...prev,

            pricing:
                prev.pricing.filter(
                    (_, i) => i !== index
                ),
        }));
    };


    // =========================================
    // SUBMIT
    // =========================================

    const handleSubmit = (e) => {

        e.preventDefault();

        const pricing = [

            {
                quantity: 1,

                price: Number(
                    form.sellingPrice
                ),
            },

            ...form.pricing.map((tier) => ({
                quantity: Number(
                    tier.quantity
                ),

                price: Number(
                    tier.price
                ),
            })),

        ];


        const quantities =
            pricing.map(
                (p) => p.quantity
            );


        if (
            new Set(quantities).size !==
            quantities.length
        ) {

            alert(
                "Each quantity must be unique."
            );

            return;
        }


        pricing.sort(
            (a, b) =>
                a.quantity - b.quantity
        );


        onSubmit({

            ...form,

            costPrice:
                Number(form.costPrice),

            sellingPrice:
                Number(form.sellingPrice),

            stock:
                Number(form.stock),

            minimumStock:
                Number(form.minimumStock),

            pricing,

        });
    };


    // =========================================
    // PROFIT
    // =========================================

    const cost =
        Number(form.costPrice) || 0;

    const selling =
        Number(form.sellingPrice) || 0;

    const profit =
        selling - cost;

    const profitPercent =
        cost > 0
            ? (profit / cost) * 100
            : 0;


    return (

        <form
            onSubmit={handleSubmit}
            className="flex flex-col max-h-[92vh]"
        >

            {/* =================================
                HEADER
            ================================= */}

            <div
                className="
                    flex
                    items-center
                    justify-between
                    px-6
                    py-4
                    border-b
                    border-base-200
                    shrink-0
                "
            >

                <div className="flex items-center gap-3">

                    <div
                        className="
                            w-10
                            h-10
                            rounded-xl
                            bg-primary
                            text-primary-content
                            flex
                            items-center
                            justify-center
                            text-lg
                        "
                    >
                        🛍️
                    </div>

                    <div>

                        <h3 className="text-xl font-bold">
                            Add Product
                        </h3>

                        <p className="text-xs text-base-content/60">
                            Add a new product to your inventory
                        </p>

                    </div>

                </div>


                <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={onCancel}
                >
                    ✕
                </button>

            </div>


            {/* =================================
                MAIN CONTENT
            ================================= */}

            <div
                className="
                    grid
                    grid-cols-12
                    gap-5
                    p-5
                    overflow-hidden
                    min-h-0
                "
            >

                {/* =================================
                    LEFT SIDE
                ================================= */}

                <div
                    className="
                        col-span-7
                        border
                        border-base-200
                        rounded-xl
                        p-4
                        space-y-3
                    "
                >

                    <h4 className="font-semibold text-sm mb-1">
                        Product Information
                    </h4>


                    {/* BARCODE */}

                    <div>

                        <label className="text-xs font-semibold">
                            Barcode
                        </label>

                        <input
                            ref={barcodeRef}
                            className="
                                input
                                input-bordered
                                input-sm
                                w-full
                                mt-1
                            "
                            name="barcode"
                            value={form.barcode}
                            onChange={handleChange}
                            placeholder="Scan or enter barcode"
                            autoComplete="off"
                            required
                        />

                    </div>


                    {/* PRODUCT NAME */}

                    <div>

                        <label className="text-xs font-semibold">
                            Product Name
                        </label>

                        <input
                            className="
                                input
                                input-bordered
                                input-sm
                                w-full
                                mt-1
                            "
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Enter product name"
                            required
                        />

                    </div>


                    {/* DESCRIPTION */}

                    <div>

                        <label className="text-xs font-semibold">
                            Description
                        </label>

                        <textarea
                            className="
                                textarea
                                textarea-bordered
                                w-full
                                mt-1
                                h-16
                                min-h-16
                                resize-none
                                text-sm
                            "
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Optional description"
                        />

                    </div>


                    {/* CATEGORY + UNIT */}

                    <div className="grid grid-cols-2 gap-3">

                        <div>

                            <label className="text-xs font-semibold">
                                Category
                            </label>

                            <select
                                className="
                                    select
                                    select-bordered
                                    select-sm
                                    w-full
                                    mt-1
                                "
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                            >

                                <option>Beverages</option>
                                <option>Snacks</option>
                                <option>Canned Goods</option>
                                <option>Frozen</option>
                                <option>Household</option>
                                <option>Personal Care</option>
                                <option>Others</option>

                            </select>

                        </div>


                        <div>

                            <label className="text-xs font-semibold">
                                Base Unit
                            </label>

                            <input
                                className="
                                    input
                                    input-bordered
                                    input-sm
                                    w-full
                                    mt-1
                                "
                                name="baseUnit"
                                value={form.baseUnit}
                                onChange={handleChange}
                                placeholder="Piece"
                                required
                            />

                        </div>

                    </div>


                    {/* PRICES */}

                    <div className="grid grid-cols-2 gap-3">

                        <div>

                            <label className="text-xs font-semibold">
                                Cost Price
                            </label>

                            <label
                                className="
                                    input
                                    input-bordered
                                    input-sm
                                    flex
                                    items-center
                                    gap-1
                                    mt-1
                                "
                            >

                                <span className="text-xs">
                                    ₱
                                </span>

                                <input
                                    type="number"
                                    className="grow"
                                    name="costPrice"
                                    value={form.costPrice}
                                    onChange={handleChange}
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                />

                            </label>

                        </div>


                        <div>

                            <label className="text-xs font-semibold">
                                Selling Price
                            </label>

                            <label
                                className="
                                    input
                                    input-bordered
                                    input-sm
                                    flex
                                    items-center
                                    gap-1
                                    mt-1
                                "
                            >

                                <span className="text-xs">
                                    ₱
                                </span>

                                <input
                                    type="number"
                                    className="grow"
                                    name="sellingPrice"
                                    value={form.sellingPrice}
                                    onChange={handleChange}
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                />

                            </label>

                        </div>

                    </div>

                </div>


                {/* =================================
                    RIGHT SIDE
                ================================= */}

                <div
                    className="
                        col-span-5
                        space-y-4
                    "
                >

                    {/* INVENTORY */}

                    <div
                        className="
                            border
                            border-base-200
                            rounded-xl
                            p-4
                        "
                    >

                        <h4 className="font-semibold text-sm mb-3">
                            📦 Inventory
                        </h4>

                        <div className="grid grid-cols-2 gap-3">

                            <div>

                                <label className="text-xs font-semibold">
                                    Initial Stock
                                </label>

                                <input
                                    type="number"
                                    className="
                                        input
                                        input-bordered
                                        input-sm
                                        w-full
                                        mt-1
                                    "
                                    name="stock"
                                    value={form.stock}
                                    placeholder="0"
                                    onChange={handleChange}
                                    min={0}
                                />

                            </div>


                            <div>

                                <label className="text-xs font-semibold">
                                    Minimum Stock
                                </label>

                                <input
                                    type="number"
                                    className="
                                        input
                                        input-bordered
                                        input-sm
                                        w-full
                                        mt-1
                                    "
                                    name="minimumStock"
                                    value={form.minimumStock}
                                    placeholder="5"
                                    onChange={handleChange}
                                    min={0}
                                />

                            </div>

                        </div>

                    </div>


                    {/* BULK PRICING */}

                    <div
                        className="
                            border
                            border-base-200
                            rounded-xl
                            p-4
                        "
                    >

                        <div className="flex justify-between items-center">

                            <div>

                                <h4 className="font-semibold text-sm">
                                    Bulk Pricing
                                </h4>

                                <p className="text-[10px] text-base-content/50">
                                    Optional quantity discounts
                                </p>

                            </div>

                            {!showBulkPricing && (

                                <button
                                    type="button"
                                    className="
                                        btn
                                        btn-primary
                                        btn-xs
                                        btn-outline
                                    "
                                    onClick={addPricingRow}
                                >
                                    + Add Tier
                                </button>

                            )}

                        </div>


                        {showBulkPricing && (

                            <div className="mt-3 space-y-2">

                                {form.pricing.map(
                                    (tier, index) => (

                                        <div
                                            key={index}
                                            className="
                                                grid
                                                grid-cols-[1fr_1fr_auto]
                                                gap-2
                                                items-end
                                            "
                                        >

                                            <div>

                                                <label className="text-[10px]">
                                                    Quantity
                                                </label>

                                                <input
                                                    type="number"
                                                    min={2}
                                                    className="
                                                        input
                                                        input-bordered
                                                        input-xs
                                                        w-full
                                                    "
                                                    value={tier.quantity}
                                                    placeholder="6"
                                                    onChange={(e) =>
                                                        handlePricingChange(
                                                            index,
                                                            "quantity",
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                            </div>


                                            <div>

                                                <label className="text-[10px]">
                                                    Price
                                                </label>

                                                <label
                                                    className="
                                                        input
                                                        input-bordered
                                                        input-xs
                                                        flex
                                                        items-center
                                                        gap-1
                                                    "
                                                >

                                                    ₱

                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        className="grow"
                                                        value={tier.price}
                                                        placeholder="0.00"
                                                        onChange={(e) =>
                                                            handlePricingChange(
                                                                index,
                                                                "price",
                                                                e.target.value
                                                            )
                                                        }
                                                    />

                                                </label>

                                            </div>


                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-error
                                                    btn-xs
                                                "
                                                onClick={() =>
                                                    removePricingRow(index)
                                                }
                                            >
                                                ✕
                                            </button>

                                        </div>

                                    )
                                )}


                                <button
                                    type="button"
                                    className="
                                        btn
                                        btn-primary
                                        btn-xs
                                        btn-outline
                                        w-full
                                    "
                                    onClick={addPricingRow}
                                >
                                    + Add Another Tier
                                </button>

                            </div>

                        )}

                    </div>


                    {/* PRICING SUMMARY */}

                    <div
                        className="
                            border
                            border-base-200
                            rounded-xl
                            p-4
                            bg-base-200/30
                        "
                    >

                        <h4 className="font-semibold text-sm mb-3">
                            💰 Pricing Summary
                        </h4>


                        <div className="flex justify-between text-xs mb-2">

                            <span className="text-base-content/60">
                                Unit Price
                            </span>

                            <span className="font-semibold">
                                ₱{selling.toFixed(2)}
                            </span>

                        </div>


                        <div className="flex justify-between text-xs mb-2">

                            <span className="text-base-content/60">
                                Cost Price
                            </span>

                            <span>
                                ₱{cost.toFixed(2)}
                            </span>

                        </div>


                        <div className="border-t border-base-300 my-2" />


                        <div className="flex justify-between">

                            <span className="text-xs font-semibold">
                                Profit
                            </span>

                            <span
                                className={`
                                    font-bold
                                    text-sm
                                    ${
                                        profit >= 0
                                            ? "text-success"
                                            : "text-error"
                                    }
                                `}
                            >
                                ₱{profit.toFixed(2)}
                                {" "}
                                <span className="text-xs">
                                    ({profitPercent.toFixed(0)}%)
                                </span>
                            </span>

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================
                FOOTER
            ================================= */}

            <div
                className="
                    flex
                    justify-between
                    items-center
                    px-6
                    py-3
                    border-t
                    border-base-200
                    shrink-0
                "
            >

                <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={onCancel}
                >
                    Cancel
                </button>


                <button
                    type="submit"
                    className="btn btn-sm btn-primary px-6"
                    disabled={loading}
                >

                    {loading ? (

                        <>
                            <span className="loading loading-spinner loading-xs" />
                            Saving...
                        </>

                    ) : (

                        "Save Product"

                    )}

                </button>

            </div>

        </form>
    );
}

export default ProductForm;