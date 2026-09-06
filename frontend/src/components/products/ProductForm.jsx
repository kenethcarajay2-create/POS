import {
    useEffect,
    useRef,
    useState,
} from "react";

import productService from "../../services/product.service";


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

    /*
    ============================================================
    REFS
    ============================================================
    */

    const barcodeRef =
        useRef(null);


    const productNameRef =
        useRef(null);


    /*
    ============================================================
    LOCAL STATE
    ============================================================
    */

    const [
        showBulkPricing,
        setShowBulkPricing,
    ] = useState(false);


    const [
        form,
        setForm,
    ] = useState(
        DEFAULT_PRODUCT
    );


    const [
        generatingBarcode,
        setGeneratingBarcode,
    ] = useState(false);


    /*
    ============================================================
    LOAD PRODUCT
    ============================================================
    */

    useEffect(() => {

        const basePrice =
            initialValues?.pricing?.find(
                (price) =>
                    Number(
                        price.quantity
                    ) === 1
            );


        setForm({

            ...DEFAULT_PRODUCT,

            ...initialValues,

            barcode:
                initialValues?.barcode ??
                "",

            name:
                initialValues?.name ??
                "",

            description:
                initialValues?.description ??
                "",

            category:
                initialValues?.category ??
                "Others",

            baseUnit:
                initialValues?.baseUnit ??
                "Piece",

            costPrice:
                initialValues?.costPrice !==
                    undefined &&
                initialValues?.costPrice !==
                    null
                    ? String(
                        initialValues.costPrice
                    )
                    : "",

            sellingPrice:
                basePrice?.price !==
                    undefined &&
                basePrice?.price !==
                    null
                    ? String(
                        basePrice.price
                    )
                    : "",

            stock:
                initialValues?.stock !==
                    undefined &&
                initialValues?.stock !==
                    null
                    ? String(
                        initialValues.stock
                    )
                    : "",

            minimumStock:
                initialValues?.minimumStock !==
                    undefined &&
                initialValues?.minimumStock !==
                    null
                    ? String(
                        initialValues.minimumStock
                    )
                    : "5",

            pricing:
                initialValues?.pricing
                    ?.filter(
                        (price) =>
                            Number(
                                price.quantity
                            ) !== 1
                    )
                    .map(
                        (price) => ({

                            quantity:
                                String(
                                    price.quantity
                                ),

                            price:
                                String(
                                    price.price
                                ),

                        })
                    ) ??
                [],

        });


        setShowBulkPricing(
            (
                initialValues
                    ?.pricing
                    ?.length ??
                0
            ) > 1
        );


        setTimeout(() => {

            barcodeRef
                .current
                ?.focus();

        }, 100);

    }, [
        initialValues,
    ]);


    /*
    ============================================================
    FORM CHANGE
    ============================================================
    */

    const handleChange = (
        event
    ) => {

        const {
            name,
            value,
        } =
            event.target;


        setForm(
            (
                previous
            ) => ({

                ...previous,

                [name]:
                    value,

            })
        );

    };


    /*
    ============================================================
    GENERATE UNIQUE BARCODE
    ============================================================
    */

    const handleGenerateBarcode =
        async () => {

            if (
                generatingBarcode ||
                loading
            ) {

                return;

            }


            const existingBarcode =
                String(
                    form.barcode ||
                    ""
                )
                    .trim();


            /*
            --------------------------------------------------------
            DO NOT SILENTLY REPLACE EXISTING BARCODE
            --------------------------------------------------------
            */

            if (
                existingBarcode
            ) {

                const shouldReplace =
                    window.confirm(
                        "A barcode is already entered. Replace it with a generated barcode?"
                    );


                if (
                    !shouldReplace
                ) {

                    return;

                }

            }


            try {

                setGeneratingBarcode(
                    true
                );


                const barcode =
                    await productService
                        .generateBarcode();


                if (
                    !barcode
                ) {

                    throw new Error(
                        "The server did not return a barcode."
                    );

                }


                setForm(
                    (
                        previous
                    ) => ({

                        ...previous,

                        barcode:
                            String(
                                barcode
                            ),

                    })
                );


                /*
                --------------------------------------------------------
                MOVE TO PRODUCT NAME
                --------------------------------------------------------
                */

                setTimeout(() => {

                    productNameRef
                        .current
                        ?.focus();

                }, 50);


            } catch (
                error
            ) {

                console.error(
                    "Failed to generate barcode:",
                    error
                );


                alert(
                    error?.response
                        ?.data
                        ?.message ||
                    error?.message ||
                    "Failed to generate barcode."
                );


            } finally {

                setGeneratingBarcode(
                    false
                );

            }

        };


    /*
    ============================================================
    BULK PRICING
    ============================================================
    */

    const handlePricingChange = (
        index,
        field,
        value
    ) => {

        setForm(
            (
                previous
            ) => {

                const pricing =
                    previous.pricing
                        .map(
                            (
                                tier,
                                tierIndex
                            ) => {

                                if (
                                    tierIndex !==
                                    index
                                ) {

                                    return tier;

                                }


                                return {

                                    ...tier,

                                    [field]:
                                        value,

                                };

                            }
                        );


                return {

                    ...previous,

                    pricing,

                };

            }
        );

    };


    const addPricingRow =
        () => {

            setShowBulkPricing(
                true
            );


            setForm(
                (
                    previous
                ) => ({

                    ...previous,

                    pricing: [

                        ...previous
                            .pricing,

                        {
                            quantity:
                                "",

                            price:
                                "",
                        },

                    ],

                })
            );

        };


    const removePricingRow = (
        index
    ) => {

        setForm(
            (
                previous
            ) => {

                const pricing =
                    previous.pricing
                        .filter(
                            (
                                _,
                                tierIndex
                            ) =>
                                tierIndex !==
                                index
                        );


                return {

                    ...previous,

                    pricing,

                };

            }
        );

    };


    /*
    ============================================================
    SUBMIT
    ============================================================
    */

    const handleSubmit = (
        event
    ) => {

        event.preventDefault();


        /*
        --------------------------------------------------------
        BASIC BARCODE VALIDATION
        --------------------------------------------------------
        */

        const barcode =
            String(
                form.barcode ||
                ""
            )
                .trim();


        if (
            !barcode
        ) {

            alert(
                "Barcode is required."
            );


            barcodeRef
                .current
                ?.focus();


            return;

        }


        /*
        --------------------------------------------------------
        PRODUCT NAME
        --------------------------------------------------------
        */

        const name =
            String(
                form.name ||
                ""
            )
                .trim();


        if (
            !name
        ) {

            alert(
                "Product name is required."
            );


            productNameRef
                .current
                ?.focus();


            return;

        }


        /*
        --------------------------------------------------------
        BASE PRICE
        --------------------------------------------------------
        */

        const sellingPrice =
            Number(
                form.sellingPrice
            );


        if (
            !Number.isFinite(
                sellingPrice
            ) ||
            sellingPrice <
                0
        ) {

            alert(
                "Enter a valid selling price."
            );


            return;

        }


        /*
        --------------------------------------------------------
        COST PRICE
        --------------------------------------------------------
        */

        const costPrice =
            Number(
                form.costPrice
            );


        if (
            !Number.isFinite(
                costPrice
            ) ||
            costPrice <
                0
        ) {

            alert(
                "Enter a valid cost price."
            );


            return;

        }


        /*
        --------------------------------------------------------
        STOCK
        --------------------------------------------------------
        */

        const stock =
            form.stock ===
                ""
                ? 0
                : Number(
                    form.stock
                );


        if (
            !Number.isFinite(
                stock
            ) ||
            stock <
                0
        ) {

            alert(
                "Initial stock cannot be negative."
            );


            return;

        }


        /*
        --------------------------------------------------------
        MINIMUM STOCK
        --------------------------------------------------------
        */

        const minimumStock =
            form.minimumStock ===
                ""
                ? 0
                : Number(
                    form.minimumStock
                );


        if (
            !Number.isFinite(
                minimumStock
            ) ||
            minimumStock <
                0
        ) {

            alert(
                "Minimum stock cannot be negative."
            );


            return;

        }


        /*
        --------------------------------------------------------
        BUILD PRICING
        --------------------------------------------------------
        */

        const pricing = [

            {
                quantity:
                    1,

                price:
                    sellingPrice,
            },

            ...form.pricing
                .map(
                    (
                        tier
                    ) => ({

                        quantity:
                            Number(
                                tier.quantity
                            ),

                        price:
                            Number(
                                tier.price
                            ),

                    })
                ),

        ];


        /*
        --------------------------------------------------------
        VALIDATE BULK TIERS
        --------------------------------------------------------
        */

        for (
            const tier of
            pricing
        ) {

            if (
                !Number.isFinite(
                    tier.quantity
                ) ||
                tier.quantity <
                    1
            ) {

                alert(
                    "Every pricing quantity must be at least 1."
                );


                return;

            }


            if (
                !Number.isFinite(
                    tier.price
                ) ||
                tier.price <
                    0
            ) {

                alert(
                    "Every pricing tier must have a valid price."
                );


                return;

            }

        }


        /*
        --------------------------------------------------------
        QUANTITY 1 IS RESERVED FOR BASE PRICE
        --------------------------------------------------------
        */

        const invalidBulkTier =
            form.pricing
                .some(
                    (
                        tier
                    ) =>
                        Number(
                            tier.quantity
                        ) <
                        2
                );


        if (
            invalidBulkTier
        ) {

            alert(
                "Bulk pricing quantities must be 2 or greater."
            );


            return;

        }


        /*
        --------------------------------------------------------
        NO DUPLICATE QUANTITIES
        --------------------------------------------------------
        */

        const quantities =
            pricing.map(
                (
                    price
                ) =>
                    price.quantity
            );


        if (
            new Set(
                quantities
            ).size !==
            quantities.length
        ) {

            alert(
                "Each pricing quantity must be unique."
            );


            return;

        }


        pricing.sort(
            (
                first,
                second
            ) =>
                first.quantity -
                second.quantity
        );


        /*
        --------------------------------------------------------
        CLEAN PAYLOAD
        --------------------------------------------------------
        */

        const payload = {

            barcode,

            name,

            description:
                String(
                    form.description ||
                    ""
                )
                    .trim(),

            category:
                form.category ||
                "Others",

            baseUnit:
                String(
                    form.baseUnit ||
                    "Piece"
                )
                    .trim() ||
                "Piece",

            costPrice,

            sellingPrice,

            stock,

            minimumStock,

            pricing,

        };


        onSubmit(
            payload
        );

    };


    /*
    ============================================================
    PROFIT
    ============================================================
    */

    const cost =
        Number(
            form.costPrice
        ) ||
        0;


    const selling =
        Number(
            form.sellingPrice
        ) ||
        0;


    const profit =
        selling -
        cost;


    const profitPercent =
        cost > 0
            ? (
                profit /
                cost
            ) *
            100
            : 0;


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <form
            onSubmit={
                handleSubmit
            }
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

                            {
                                initialValues?._id
                                    ? "Edit Product"
                                    : "Add Product"
                            }

                        </h3>


                        <p className="text-xs text-base-content/60">

                            {
                                initialValues?._id
                                    ? "Update product information"
                                    : "Add a new product to your inventory"
                            }

                        </p>

                    </div>

                </div>


                <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={
                        onCancel
                    }
                    disabled={
                        loading ||
                        generatingBarcode
                    }
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


                    {/* =================================
                        BARCODE
                    ================================= */}

                    <div>

                        <label className="text-xs font-semibold">
                            Barcode
                        </label>


                        <div className="flex gap-2 mt-1">

                            <input
                                ref={
                                    barcodeRef
                                }
                                className="
                                    input
                                    input-bordered
                                    input-sm
                                    flex-1
                                    min-w-0
                                "
                                name="barcode"
                                value={
                                    form.barcode
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Scan or enter barcode"
                                autoComplete="off"
                                required
                                disabled={
                                    loading ||
                                    generatingBarcode
                                }
                            />


                            <button
                                type="button"
                                className="
                                    btn
                                    btn-sm
                                    btn-outline
                                    btn-primary
                                    whitespace-nowrap
                                "
                                onClick={
                                    handleGenerateBarcode
                                }
                                disabled={
                                    loading ||
                                    generatingBarcode
                                }
                            >

                                {generatingBarcode ? (

                                    <>

                                        <span className="loading loading-spinner loading-xs" />

                                        Generating

                                    </>

                                ) : (

                                    <>

                                        <span>
                                            ▦
                                        </span>

                                        Generate

                                    </>

                                )}

                            </button>

                        </div>


                        <p className="text-[10px] text-base-content/50 mt-1">

                            Scan an existing barcode or generate a unique internal barcode.

                        </p>

                    </div>


                    {/* =================================
                        PRODUCT NAME
                    ================================= */}

                    <div>

                        <label className="text-xs font-semibold">
                            Product Name
                        </label>


                        <input
                            ref={
                                productNameRef
                            }
                            className="
                                input
                                input-bordered
                                input-sm
                                w-full
                                mt-1
                            "
                            name="name"
                            value={
                                form.name
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Enter product name"
                            required
                            disabled={
                                loading
                            }
                        />

                    </div>


                    {/* =================================
                        DESCRIPTION
                    ================================= */}

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
                            value={
                                form.description
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Optional description"
                            disabled={
                                loading
                            }
                        />

                    </div>


                    {/* =================================
                        CATEGORY + UNIT
                    ================================= */}

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
                                value={
                                    form.category
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    loading
                                }
                            >

                                <option>
                                    Beverages
                                </option>

                                <option>
                                    Snacks
                                </option>

                                <option>
                                    Canned Goods
                                </option>

                                <option>
                                    Frozen
                                </option>

                                <option>
                                    Household
                                </option>

                                <option>
                                    Personal Care
                                </option>

                                <option>
                                    Others
                                </option>

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
                                value={
                                    form.baseUnit
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Piece"
                                required
                                disabled={
                                    loading
                                }
                            />

                        </div>

                    </div>


                    {/* =================================
                        PRICES
                    ================================= */}

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
                                    value={
                                        form.costPrice
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    min={
                                        0
                                    }
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                    disabled={
                                        loading
                                    }
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
                                    value={
                                        form.sellingPrice
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    min={
                                        0
                                    }
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                    disabled={
                                        loading
                                    }
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

                    {/* =================================
                        INVENTORY
                    ================================= */}

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
                                    value={
                                        form.stock
                                    }
                                    placeholder="0"
                                    onChange={
                                        handleChange
                                    }
                                    min={
                                        0
                                    }
                                    disabled={
                                        loading
                                    }
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
                                    value={
                                        form.minimumStock
                                    }
                                    placeholder="5"
                                    onChange={
                                        handleChange
                                    }
                                    min={
                                        0
                                    }
                                    disabled={
                                        loading
                                    }
                                />

                            </div>

                        </div>

                    </div>


                    {/* =================================
                        BULK PRICING
                    ================================= */}

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
                                    onClick={
                                        addPricingRow
                                    }
                                    disabled={
                                        loading
                                    }
                                >

                                    + Add Tier

                                </button>

                            )}

                        </div>


                        {showBulkPricing && (

                            <div className="mt-3 space-y-2">

                                {form.pricing.map(
                                    (
                                        tier,
                                        index
                                    ) => (

                                        <div
                                            key={
                                                index
                                            }
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
                                                    min={
                                                        2
                                                    }
                                                    className="
                                                        input
                                                        input-bordered
                                                        input-xs
                                                        w-full
                                                    "
                                                    value={
                                                        tier.quantity
                                                    }
                                                    placeholder="6"
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handlePricingChange(
                                                            index,
                                                            "quantity",
                                                            event.target.value
                                                        )
                                                    }
                                                    disabled={
                                                        loading
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
                                                        min={
                                                            0
                                                        }
                                                        step="0.01"
                                                        className="grow"
                                                        value={
                                                            tier.price
                                                        }
                                                        placeholder="0.00"
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            handlePricingChange(
                                                                index,
                                                                "price",
                                                                event.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            loading
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
                                                    removePricingRow(
                                                        index
                                                    )
                                                }
                                                disabled={
                                                    loading
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
                                    onClick={
                                        addPricingRow
                                    }
                                    disabled={
                                        loading
                                    }
                                >

                                    + Add Another Tier

                                </button>

                            </div>

                        )}

                    </div>


                    {/* =================================
                        PRICING SUMMARY
                    ================================= */}

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

                                ₱
                                {
                                    selling.toFixed(
                                        2
                                    )
                                }

                            </span>

                        </div>


                        <div className="flex justify-between text-xs mb-2">

                            <span className="text-base-content/60">
                                Cost Price
                            </span>


                            <span>

                                ₱
                                {
                                    cost.toFixed(
                                        2
                                    )
                                }

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
                                        profit >=
                                        0
                                            ? "text-success"
                                            : "text-error"
                                    }
                                `}
                            >

                                ₱
                                {
                                    profit.toFixed(
                                        2
                                    )
                                }

                                {" "}

                                <span className="text-xs">

                                    (
                                    {
                                        profitPercent.toFixed(
                                            0
                                        )
                                    }
                                    %)

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
                    onClick={
                        onCancel
                    }
                    disabled={
                        loading ||
                        generatingBarcode
                    }
                >

                    Cancel

                </button>


                <button
                    type="submit"
                    className="btn btn-sm btn-primary px-6"
                    disabled={
                        loading ||
                        generatingBarcode
                    }
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