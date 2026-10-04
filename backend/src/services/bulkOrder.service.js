import mongoose from "mongoose";

import BulkOrder
    from "../models/bulkOrder.model.js";

import Product
    from "../models/product.model.js";

import ApiError
    from "../utils/ApiError.js";

import withTransaction
    from "../utils/withTransaction.js";

import syncOutboxService
    from "./syncOutbox.service.js";


/*
============================================================
CONFIG
============================================================
*/

const MAX_HISTORY_LIMIT =
    300;

const DEFAULT_HISTORY_LIMIT =
    100;

const MAX_CUSTOMER_NAME_LENGTH =
    200;

const MAX_NOTES_LENGTH =
    1000;

const PRICING_MODES = [
    "RETAIL",
    "WHOLESALE",
];


/*
============================================================
OBJECT ID
============================================================
*/

const requireObjectId =
    (
        value,
        label
    ) => {

        const id =
            value?._id ||
            value;


        if (
            !id ||
            !mongoose.Types.ObjectId
                .isValid(
                    id
                )
        ) {

            throw new ApiError(
                400,
                `Invalid ${label}.`
            );

        }


        return String(
            id
        );

    };


/*
============================================================
ACTIVE BRANCH CONTEXT
============================================================
*/

const buildBranchContext =
    (
        activeBranch
    ) => {

        if (
            !activeBranch ||
            typeof activeBranch !==
                "object"
        ) {

            throw new ApiError(
                400,
                "Complete active branch information is required."
            );

        }


        const branchId =
            requireObjectId(
                activeBranch._id,
                "active branch"
            );


        if (
            activeBranch.isActive ===
            false
        ) {

            throw new ApiError(
                400,
                "The active branch is inactive."
            );

        }


        const code =
            String(
                activeBranch.code ||
                ""
            )
                .trim()
                .toUpperCase();


        const name =
            String(
                activeBranch.name ||
                ""
            )
                .trim();


        if (
            !code ||
            !name
        ) {

            throw new ApiError(
                400,
                "The active branch has incomplete information."
            );

        }


        return {
            branchId,

            snapshot: {
                code,

                name,

                address:
                    String(
                        activeBranch.address ||
                        ""
                    )
                        .trim(),

                phone:
                    String(
                        activeBranch.phone ||
                        ""
                    )
                        .trim(),
            },
        };

    };


/*
============================================================
NORMALIZE CUSTOMER NAME
============================================================
*/

const normalizeCustomerName =
    (
        value
    ) => {

        return String(
            value ||
            ""
        )
            .trim()
            .slice(
                0,
                MAX_CUSTOMER_NAME_LENGTH
            );

    };


/*
============================================================
NORMALIZE NOTES
============================================================
*/

const normalizeNotes =
    (
        value
    ) => {

        return String(
            value ||
            ""
        )
            .trim()
            .slice(
                0,
                MAX_NOTES_LENGTH
            );

    };


/*
============================================================
NORMALIZE PRICING MODE
============================================================

The backend is authoritative.

Accepted values:

RETAIL
WHOLESALE

Existing Bulk Orders that do not yet contain pricingMode are
treated as RETAIL for backward compatibility.
============================================================
*/

const normalizePricingMode =
    (
        value,
        fallback = "RETAIL"
    ) => {

        const normalized =
            String(
                value ||
                fallback ||
                "RETAIL"
            )
                .trim()
                .toUpperCase();


        if (
            !PRICING_MODES.includes(
                normalized
            )
        ) {

            throw new ApiError(
                400,
                "Pricing mode must be RETAIL or WHOLESALE."
            );

        }


        return normalized;

    };


/*
============================================================
ROUND MONEY
============================================================

Final monetary amounts are rounded to two decimal places.

IMPORTANT:

Wholesale unit rates are NOT prematurely rounded.

Example:

6 pieces = ₱1,000

Wholesale unit rate:

1000 / 6
=
166.666666...

For quantity 3:

(1000 / 6) * 3
=
500

NOT:

166.67 * 3
=
500.01
============================================================
*/

const roundMoney =
    (
        value
    ) => {

        const number =
            Number(
                value
            );


        if (
            !Number.isFinite(
                number
            )
        ) {

            return 0;

        }


        return Math.round(
            (
                number +
                Number.EPSILON
            ) *
            100
        ) /
        100;

    };


/*
============================================================
NORMALIZE UNIT
============================================================
*/

const normalizeUnit =
    (
        value
    ) => {

        return String(
            value ||
            "Piece"
        )
            .trim()
            .toUpperCase()
            .replace(
                /\./g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            );

    };


/*
============================================================
UNIT SORT INFORMATION
============================================================

Bulk/package units appear first.

Single-item units appear in PIECE.

IMPORTANT:

Bottle, Sachet, Can, Pouch, Jar, Tube and Unit represent an
individual product unit for sorting purposes.

We do NOT infer packaging from:

- product name
- pricing tiers
- quantity

Only Product.baseUnit is used.
============================================================
*/

const getUnitSortInfo =
    (
        baseUnit
    ) => {

        const unit =
            normalizeUnit(
                baseUnit
            );


        /*
        --------------------------------------------------------
        CASE
        --------------------------------------------------------
        */

        if (
            [
                "CASE",
                "CASES",
                "CS",
                "CSE",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    10,
            };

        }


        /*
        --------------------------------------------------------
        BOX
        --------------------------------------------------------
        */

        if (
            [
                "BOX",
                "BOXES",
                "BX",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    20,
            };

        }


        /*
        --------------------------------------------------------
        SACK
        --------------------------------------------------------
        */

        if (
            [
                "SACK",
                "SACKS",
                "SCK",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    30,
            };

        }


        /*
        --------------------------------------------------------
        PACK
        --------------------------------------------------------
        */

        if (
            [
                "PACK",
                "PACKS",
                "PK",
                "PKG",
                "PACKAGE",
                "PACKAGES",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    40,
            };

        }


        /*
        --------------------------------------------------------
        BUNDLE
        --------------------------------------------------------
        */

        if (
            [
                "BUNDLE",
                "BUNDLES",
                "BDL",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    50,
            };

        }


        /*
        --------------------------------------------------------
        DOZEN
        --------------------------------------------------------
        */

        if (
            [
                "DOZEN",
                "DOZENS",
                "DZ",
                "DOZ",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    60,
            };

        }


        /*
        --------------------------------------------------------
        TRAY
        --------------------------------------------------------
        */

        if (
            [
                "TRAY",
                "TRAYS",
                "TRY",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    70,
            };

        }


        /*
        --------------------------------------------------------
        BAG
        --------------------------------------------------------
        */

        if (
            [
                "BAG",
                "BAGS",
                "BG",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "BULK",

                sortPriority:
                    80,
            };

        }


        /*
        --------------------------------------------------------
        SINGLE-ITEM / PIECE UNITS
        --------------------------------------------------------
        */

        if (
            [
                "PIECE",
                "PIECES",
                "PC",
                "PCS",
                "EA",
                "EACH",

                "BOTTLE",
                "BOTTLES",
                "BTL",
                "BOT",

                "SACHET",
                "SACHETS",

                "CAN",
                "CANS",

                "POUCH",
                "POUCHES",

                "JAR",
                "JARS",

                "TUBE",
                "TUBES",

                "UNIT",
                "UNITS",
            ].includes(
                unit
            )
        ) {

            return {
                sortGroup:
                    "PIECE",

                sortPriority:
                    1000,
            };

        }


        /*
        --------------------------------------------------------
        UNKNOWN UNIT
        --------------------------------------------------------

        Unknown units remain BULK/OTHER.

        We do not guess that an unknown unit is a piece.
        --------------------------------------------------------
        */

        return {
            sortGroup:
                "BULK",

            sortPriority:
                500,
        };

    };


/*
============================================================
NORMALIZE PRICING TIERS
============================================================

Product pricing example:

[
    {
        quantity: 1,
        price: 200
    },
    {
        quantity: 6,
        price: 1000
    },
    {
        quantity: 12,
        price: 1900
    }
]

IMPORTANT:

price is the TOTAL configured price for the tier.

It is not automatically a per-piece price.
============================================================
*/

const normalizePricingTiers =
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

            throw new ApiError(
                400,
                "Product does not have valid pricing."
            );

        }


        const tierMap =
            new Map();


        for (
            const tier
            of pricing
        ) {

            const quantity =
                Number(
                    tier?.quantity
                );


            const price =
                Number(
                    tier?.price
                );


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity <=
                    0
            ) {

                continue;

            }


            if (
                !Number.isFinite(
                    price
                ) ||
                price <
                    0
            ) {

                continue;

            }


            tierMap.set(
                quantity,
                {
                    quantity,

                    price:
                        roundMoney(
                            price
                        ),
                }
            );

        }


        const tiers =
            Array.from(
                tierMap.values()
            );


        if (
            tiers.length ===
                0
        ) {

            throw new ApiError(
                400,
                "Product does not have valid pricing."
            );

        }


        return tiers;

    };


/*
============================================================
CALCULATE RETAIL PRODUCT PRICE
============================================================

Retail uses the normal quantity-tier calculation.

Largest applicable quantity tier is used first.

Example:

1  = ₱200
6  = ₱1,000
12 = ₱1,900

Quantity 5:

5 x quantity-1 tier
=
₱1,000

Quantity 6:

1 x quantity-6 tier
=
₱1,000

Quantity 25:

2 x quantity-12 tier
+
1 x quantity-1 tier
=
₱4,000

This preserves the existing Bulk Order pricing behavior.
============================================================
*/

const calculateRetailProductPrice =
    (
        product,
        requestedQuantity
    ) => {

        const quantity =
            Number(
                requestedQuantity
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <=
                0
        ) {

            throw new ApiError(
                400,
                "Bulk Order quantity must be a positive whole number."
            );

        }


        const tiers =
            normalizePricingTiers(
                product?.pricing
            )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b.quantity -
                        a.quantity
                );


        let remaining =
            quantity;


        const pricingBreakdown =
            [];


        for (
            const tier
            of tiers
        ) {

            if (
                remaining <
                tier.quantity
            ) {

                continue;

            }


            const bundles =
                Math.floor(
                    remaining /
                    tier.quantity
                );


            if (
                bundles <=
                    0
            ) {

                continue;

            }


            const coveredQuantity =
                tier.quantity *
                bundles;


            const subtotal =
                roundMoney(
                    tier.price *
                    bundles
                );


            pricingBreakdown.push({
                tierQuantity:
                    tier.quantity,

                tierPrice:
                    tier.price,

                bundles,

                coveredQuantity,

                subtotal,
            });


            remaining -=
                coveredQuantity;


            if (
                remaining ===
                    0
            ) {

                break;

            }

        }


        if (
            remaining !==
                0
        ) {

            throw new ApiError(
                400,
                `${product.name} cannot price the requested quantity of ${quantity} using its current retail pricing tiers.`
            );

        }


        const lineTotal =
            roundMoney(
                pricingBreakdown.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        Number(
                            item.subtotal ||
                            0
                        ),
                    0
                )
            );


        const effectiveUnitPrice =
            quantity >
                0
                ?
                lineTotal /
                    quantity
                :
                0;


        return {
            pricingBreakdown,

            effectiveUnitPrice,

            lineTotal,
        };

    };


/*
============================================================
FIND WHOLESALE TIER
============================================================

Wholesale uses the configured tier with the LOWEST effective
per-unit price.

Example:

1  = ₱200
6  = ₱1,000
12 = ₱1,900

Effective prices:

1:
200 / 1
=
200

6:
1000 / 6
=
166.666...

12:
1900 / 12
=
158.333...

Therefore the 12-piece tier is the wholesale basis.

This applies immediately even if the customer orders only
one unit.

Tie rule:

If two tiers have exactly the same effective rate, the larger
quantity tier wins.
============================================================
*/

const findWholesaleTier =
    (
        pricing
    ) => {

        const tiers =
            normalizePricingTiers(
                pricing
            );


        const sorted =
            [
                ...tiers,
            ]
                .sort(
                    (
                        a,
                        b
                    ) => {

                        const aRate =
                            a.price /
                            a.quantity;


                        const bRate =
                            b.price /
                            b.quantity;


                        if (
                            aRate !==
                            bRate
                        ) {

                            return aRate -
                                bRate;

                        }


                        return b.quantity -
                            a.quantity;

                    }
                );


        return sorted[0];

    };


/*
============================================================
CALCULATE WHOLESALE PRODUCT PRICE
============================================================

Wholesale ignores minimum tier quantity.

The cheapest configured effective per-unit price is applied
to the actual requested quantity.

IMPORTANT:

We calculate using the exact ratio first.

Example:

6 = ₱1,000

Quantity 3:

(1000 / 6) * 3
=
500

We do NOT do:

166.67 * 3
=
500.01

Only the final line total is rounded to currency precision.
============================================================
*/

const calculateWholesaleProductPrice =
    (
        product,
        requestedQuantity
    ) => {

        const quantity =
            Number(
                requestedQuantity
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <=
                0
        ) {

            throw new ApiError(
                400,
                "Bulk Order quantity must be a positive whole number."
            );

        }


        const wholesaleTier =
            findWholesaleTier(
                product?.pricing
            );


        if (
            !wholesaleTier
        ) {

            throw new ApiError(
                400,
                `${product?.name || "Product"} does not have valid wholesale pricing.`
            );

        }


        const exactUnitPrice =
            wholesaleTier.price /
            wholesaleTier.quantity;


        const lineTotal =
            roundMoney(
                exactUnitPrice *
                quantity
            );


        /*
        --------------------------------------------------------
        WHOLESALE BREAKDOWN

        We deliberately do NOT store:

        bundles = quantity / tierQuantity

        because that creates confusing fractional bundle values
        such as:

        0.5 x 4
        0.1666 x 6

        Instead this entry identifies the configured tier that
        supplied the wholesale rate while the actual order
        quantity and final line total remain explicit.
        --------------------------------------------------------
        */

        const pricingBreakdown = [
            {
                tierQuantity:
                    wholesaleTier.quantity,

                tierPrice:
                    wholesaleTier.price,

                bundles:
                    0,

                coveredQuantity:
                    quantity,

                subtotal:
                    lineTotal,
            },
        ];


        return {
            pricingBreakdown,

            /*
            Do not round this prematurely.

            This preserves the exact configured tier ratio for
            calculations and history.

            UI/printing can display it to two decimal places.
            */

            effectiveUnitPrice:
                exactUnitPrice,

            lineTotal,
        };

    };


/*
============================================================
CALCULATE PRODUCT PRICE
============================================================
*/

const calculateProductPrice =
    (
        product,
        requestedQuantity,
        pricingMode
    ) => {

        const mode =
            normalizePricingMode(
                pricingMode
            );


        if (
            mode ===
            "WHOLESALE"
        ) {

            return calculateWholesaleProductPrice(
                product,
                requestedQuantity
            );

        }


        return calculateRetailProductPrice(
            product,
            requestedQuantity
        );

    };


/*
============================================================
NORMALIZE REQUEST ITEMS
============================================================

Frontend only needs to send:

{
    productId,
    quantity
}

or:

{
    product,
    quantity
}

Frontend prices and snapshots are NOT trusted.
============================================================
*/

const normalizeRequestItems =
    (
        items
    ) => {

        if (
            !Array.isArray(
                items
            ) ||
            items.length ===
                0
        ) {

            throw new ApiError(
                400,
                "At least one Bulk Order item is required."
            );

        }


        const merged =
            new Map();


        for (
            const item
            of items
        ) {

            const productId =
                requireObjectId(
                    item?.productId ||
                    item?.product,
                    "product ID"
                );


            const quantity =
                Number(
                    item?.quantity
                );


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity <=
                    0
            ) {

                throw new ApiError(
                    400,
                    "Bulk Order quantities must be positive whole numbers."
                );

            }


            const existing =
                merged.get(
                    productId
                );


            if (
                existing
            ) {

                existing.quantity +=
                    quantity;

            }
            else {

                merged.set(
                    productId,
                    {
                        productId,

                        quantity,
                    }
                );

            }

        }


        return Array.from(
            merged.values()
        );

    };


/*
============================================================
BUILD ORDER ITEMS
============================================================

Loads current Products from the database.

The frontend cannot provide trusted:

- barcode snapshot
- name snapshot
- baseUnit snapshot
- pricingBreakdown
- effectiveUnitPrice
- lineTotal
- sortGroup
- sortPriority

pricingMode is supplied separately and validated by the
backend.
============================================================
*/

const buildOrderItems =
    async (
        normalizedItems,
        pricingMode,
        session = null
    ) => {

        const mode =
            normalizePricingMode(
                pricingMode
            );


        const result =
            [];


        for (
            const item
            of normalizedItems
        ) {

            let productQuery =
                Product.findById(
                    item.productId
                );


            if (
                session
            ) {

                productQuery =
                    productQuery.session(
                        session
                    );

            }


            const product =
                await productQuery;


            if (
                !product
            ) {

                throw new ApiError(
                    404,
                    "A selected product no longer exists."
                );

            }


            if (
                product.isActive ===
                    false
            ) {

                throw new ApiError(
                    400,
                    `${product.name} is inactive.`
                );

            }


            const price =
                calculateProductPrice(
                    product,
                    item.quantity,
                    mode
                );


            const sortInfo =
                getUnitSortInfo(
                    product.baseUnit
                );


            result.push({
                product:
                    product._id,

                barcode:
                    String(
                        product.barcode ||
                        ""
                    )
                        .trim(),

                name:
                    String(
                        product.name ||
                        ""
                    )
                        .trim(),

                baseUnit:
                    String(
                        product.baseUnit ||
                        "Piece"
                    )
                        .trim(),

                quantity:
                    item.quantity,

                pricingBreakdown:
                    price.pricingBreakdown,

                effectiveUnitPrice:
                    price.effectiveUnitPrice,

                lineTotal:
                    price.lineTotal,

                sortGroup:
                    sortInfo.sortGroup,

                sortPriority:
                    sortInfo.sortPriority,
            });

        }


        /*
        ========================================================
        SERVER-SIDE SORTING
        ========================================================
        */

        result.sort(
            (
                a,
                b
            ) => {

                if (
                    a.sortGroup !==
                    b.sortGroup
                ) {

                    return a.sortGroup ===
                        "PIECE"
                        ?
                        1
                        :
                        -1;

                }


                if (
                    a.sortPriority !==
                    b.sortPriority
                ) {

                    return a.sortPriority -
                        b.sortPriority;

                }


                const unitCompare =
                    String(
                        a.baseUnit ||
                        ""
                    )
                        .localeCompare(
                            String(
                                b.baseUnit ||
                                ""
                            ),
                            undefined,
                            {
                                sensitivity:
                                    "base",
                            }
                        );


                if (
                    unitCompare !==
                    0
                ) {

                    return unitCompare;

                }


                return String(
                    a.name ||
                    ""
                )
                    .localeCompare(
                        String(
                            b.name ||
                            ""
                        ),
                        undefined,
                        {
                            sensitivity:
                                "base",
                        }
                    );

            }
        );


        return result;

    };


/*
============================================================
CALCULATE TOTALS
============================================================
*/

const calculateTotals =
    (
        items
    ) => {

        const totalLines =
            items.length;


        const totalQuantity =
            items.reduce(
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


        const totalAmount =
            roundMoney(
                items.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        Number(
                            item.lineTotal ||
                            0
                        ),
                    0
                )
            );


        return {
            totalLines,

            totalQuantity,

            totalAmount,
        };

    };


/*
============================================================
BUILD ORDER NUMBER
============================================================
*/

const buildOrderNumber =
    (
        branchCode,
        orderId
    ) => {

        const now =
            new Date();


        const year =
            String(
                now.getFullYear()
            );


        const month =
            String(
                now.getMonth() +
                1
            )
                .padStart(
                    2,
                    "0"
                );


        const day =
            String(
                now.getDate()
            )
                .padStart(
                    2,
                    "0"
                );


        const suffix =
            String(
                orderId
            )
                .slice(
                    -6
                )
                .toUpperCase();


        return `BO-${branchCode}-${year}${month}${day}-${suffix}`;

    };


/*
============================================================
BUILD REVISION SNAPSHOT
============================================================
*/

const buildRevisionSnapshot =
    (
        order,
        changedBy
    ) => {

        return {
            revision:
                Number(
                    order.revision
                ) || 1,

            pricingMode:
                normalizePricingMode(
                    order.pricingMode ||
                    "RETAIL"
                ),

            customerName:
                order.customerName ||
                "",

            notes:
                order.notes ||
                "",

            items:
                order.items.map(
                    (
                        item
                    ) => {

                        return {
                            product:
                                item.product,

                            barcode:
                                item.barcode,

                            name:
                                item.name,

                            baseUnit:
                                item.baseUnit,

                            quantity:
                                item.quantity,

                            pricingBreakdown:
                                (
                                    item.pricingBreakdown ||
                                    []
                                )
                                    .map(
                                        (
                                            pricePart
                                        ) => {

                                            return {
                                                tierQuantity:
                                                    pricePart.tierQuantity,

                                                tierPrice:
                                                    pricePart.tierPrice,

                                                bundles:
                                                    pricePart.bundles,

                                                coveredQuantity:
                                                    pricePart.coveredQuantity,

                                                subtotal:
                                                    pricePart.subtotal,
                                            };

                                        }
                                    ),

                            effectiveUnitPrice:
                                item.effectiveUnitPrice,

                            lineTotal:
                                item.lineTotal,

                            sortGroup:
                                item.sortGroup,

                            sortPriority:
                                item.sortPriority,
                        };

                    }
                ),

            totalLines:
                order.totalLines,

            totalQuantity:
                order.totalQuantity,

            totalAmount:
                order.totalAmount,

            changedBy,

            changedAt:
                new Date(),
        };

    };


/*
============================================================
POPULATE ORDER
============================================================
*/

const populateOrder =
    async (
        id
    ) => {

        return await BulkOrder
            .findById(
                id
            )

            .populate(
                "branch",
                "code name address phone"
            )

            .populate(
                "createdBy",
                "name username role"
            )

            .populate(
                "lastModifiedBy",
                "name username role"
            )

            .populate(
                "cancelledBy",
                "name username role"
            )

            .populate(
                "completedBy",
                "name username role"
            )

            .populate(
                "sale",
                "saleNumber receiptNumber totalAmount total createdAt"
            );

    };


/*
============================================================
CREATE ORDER
============================================================
*/

const createOrder =
    async (
        data,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const {
            branchId,

            snapshot:
                branchSnapshot,
        } =
            buildBranchContext(
                activeBranch
            );


        const normalizedItems =
            normalizeRequestItems(
                data?.items
            );


        const pricingMode =
            normalizePricingMode(
                data?.pricingMode ||
                "RETAIL"
            );


        const requestedStatus =
            String(
                data?.status ||
                "SAVED"
            )
                .trim()
                .toUpperCase();


        if (
            ![
                "DRAFT",
                "SAVED",
            ].includes(
                requestedStatus
            )
        ) {

            throw new ApiError(
                400,
                "A new Bulk Order can only be DRAFT or SAVED."
            );

        }


        const customerName =
            normalizeCustomerName(
                data?.customerName
            );


        const notes =
            normalizeNotes(
                data?.notes
            );


        const orderId =
            new mongoose.Types.ObjectId();


        const result =
            await withTransaction(
                async (
                    session
                ) => {

                    const items =
                        await buildOrderItems(
                            normalizedItems,
                            pricingMode,
                            session
                        );


                    const totals =
                        calculateTotals(
                            items
                        );


                    const orderNumber =
                        buildOrderNumber(
                            branchSnapshot.code,
                            orderId
                        );


                    const [
                        order,
                    ] =
                        await BulkOrder.create(
                            [
                                {
                                    _id:
                                        orderId,

                                    orderNumber,

                                    branch:
                                        branchId,

                                    branchSnapshot,

                                    pricingMode,

                                    customerName,

                                    notes,

                                    status:
                                        requestedStatus,

                                    revision:
                                        1,

                                    items,

                                    totalLines:
                                        totals.totalLines,

                                    totalQuantity:
                                        totals.totalQuantity,

                                    totalAmount:
                                        totals.totalAmount,

                                    revisions:
                                        [],

                                    createdBy:
                                        resolvedUserId,

                                    lastModifiedBy:
                                        resolvedUserId,
                                },
                            ],
                            {
                                session,
                            }
                        );


                    await syncOutboxService
                        .enqueueSyncRequest({
                            source:
                                "BULK_ORDER",

                            action:
                                "CREATE",

                            aggregateId:
                                order._id,

                            branchId,

                            session,
                        });


                    return order._id;

                }
            );


        return await populateOrder(
            result
        );

    };


/*
============================================================
UPDATE ORDER
============================================================

DRAFT and SAVED orders can be edited.

If pricingMode changes, all prices are recalculated by the
backend using current Product pricing.

For a SAVED order the previous pricingMode and previous item
prices are preserved in revisions[].
============================================================
*/

const updateOrder =
    async (
        orderId,
        data,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedOrderId =
            requireObjectId(
                orderId,
                "Bulk Order ID"
            );


        const {
            branchId,

            snapshot:
                branchSnapshot,
        } =
            buildBranchContext(
                activeBranch
            );


        const normalizedItems =
            normalizeRequestItems(
                data?.items
            );


        await withTransaction(
            async (
                session
            ) => {

                const order =
                    await BulkOrder
                        .findOne({
                            _id:
                                resolvedOrderId,

                            branch:
                                branchId,
                        })
                        .session(
                            session
                        );


                if (
                    !order
                ) {

                    throw new ApiError(
                        404,
                        "Bulk Order not found in the active branch."
                    );

                }


                if (
                    ![
                        "DRAFT",
                        "SAVED",
                    ].includes(
                        order.status
                    )
                ) {

                    throw new ApiError(
                        409,
                        `${order.status} Bulk Orders cannot be edited.`
                    );

                }


                const pricingMode =
                    normalizePricingMode(
                        data?.pricingMode ??
                        order.pricingMode ??
                        "RETAIL"
                    );


                const items =
                    await buildOrderItems(
                        normalizedItems,
                        pricingMode,
                        session
                    );


                const totals =
                    calculateTotals(
                        items
                    );


                /*
                =================================================
                REVISION HISTORY
                =================================================
                */

                if (
                    order.status ===
                    "SAVED"
                ) {

                    const previousRevision =
                        buildRevisionSnapshot(
                            order,
                            resolvedUserId
                        );


                    order.revisions.push(
                        previousRevision
                    );


                    order.revision =
                        (
                            Number(
                                order.revision
                            ) || 1
                        ) +
                        1;

                }


                const requestedStatus =
                    data?.status !==
                        undefined
                        ?
                        String(
                            data.status
                        )
                            .trim()
                            .toUpperCase()
                        :
                        order.status;


                if (
                    ![
                        "DRAFT",
                        "SAVED",
                    ].includes(
                        requestedStatus
                    )
                ) {

                    throw new ApiError(
                        400,
                        "Bulk Order can only be updated as DRAFT or SAVED."
                    );

                }


                if (
                    order.status ===
                        "SAVED" &&
                    requestedStatus ===
                        "DRAFT"
                ) {

                    throw new ApiError(
                        409,
                        "A saved Bulk Order cannot be changed back to DRAFT."
                    );

                }


                order.branchSnapshot =
                    branchSnapshot;


                order.pricingMode =
                    pricingMode;


                order.customerName =
                    normalizeCustomerName(
                        data?.customerName ??
                        order.customerName
                    );


                order.notes =
                    normalizeNotes(
                        data?.notes ??
                        order.notes
                    );


                order.items =
                    items;


                order.totalLines =
                    totals.totalLines;


                order.totalQuantity =
                    totals.totalQuantity;


                order.totalAmount =
                    totals.totalAmount;


                order.status =
                    requestedStatus;


                order.lastModifiedBy =
                    resolvedUserId;


                await order.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "BULK_ORDER",

                        action:
                            "UPDATE",

                        aggregateId:
                            order._id,

                        branchId,

                        session,
                    });

            }
        );


        return await populateOrder(
            resolvedOrderId
        );

    };


/*
============================================================
SAVE DRAFT
============================================================
*/

const saveDraft =
    async (
        orderId,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedOrderId =
            requireObjectId(
                orderId,
                "Bulk Order ID"
            );


        const {
            branchId,
        } =
            buildBranchContext(
                activeBranch
            );


        await withTransaction(
            async (
                session
            ) => {

                const order =
                    await BulkOrder
                        .findOne({
                            _id:
                                resolvedOrderId,

                            branch:
                                branchId,
                        })
                        .session(
                            session
                        );


                if (
                    !order
                ) {

                    throw new ApiError(
                        404,
                        "Bulk Order not found in the active branch."
                    );

                }


                if (
                    order.status ===
                    "SAVED"
                ) {

                    return;

                }


                if (
                    order.status !==
                    "DRAFT"
                ) {

                    throw new ApiError(
                        409,
                        `Only DRAFT Bulk Orders can be saved. Current status: ${order.status}.`
                    );

                }


                if (
                    !Array.isArray(
                        order.items
                    ) ||
                    order.items.length ===
                        0
                ) {

                    throw new ApiError(
                        400,
                        "Cannot save an empty Bulk Order."
                    );

                }


                /*
                Old documents created before pricingMode existed
                are explicitly normalized to RETAIL.
                */

                order.pricingMode =
                    normalizePricingMode(
                        order.pricingMode ||
                        "RETAIL"
                    );


                order.status =
                    "SAVED";


                order.lastModifiedBy =
                    resolvedUserId;


                await order.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "BULK_ORDER",

                        action:
                            "SAVE",

                        aggregateId:
                            order._id,

                        branchId,

                        session,
                    });

            }
        );


        return await populateOrder(
            resolvedOrderId
        );

    };


/*
============================================================
DUPLICATE ORDER
============================================================

The duplicate preserves the selected order's pricing mode.

Product prices are recalculated from CURRENT Product pricing.

Example:

Original:
WHOLESALE

Duplicate:
WHOLESALE

The duplicate is still a new DRAFT.
============================================================
*/

const duplicateOrder =
    async (
        orderId,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedOrderId =
            requireObjectId(
                orderId,
                "Bulk Order ID"
            );


        const {
            branchId,

            snapshot:
                branchSnapshot,
        } =
            buildBranchContext(
                activeBranch
            );


        const newOrderId =
            new mongoose.Types.ObjectId();


        const result =
            await withTransaction(
                async (
                    session
                ) => {

                    const original =
                        await BulkOrder
                            .findOne({
                                _id:
                                    resolvedOrderId,

                                branch:
                                    branchId,
                            })
                            .session(
                                session
                            );


                    if (
                        !original
                    ) {

                        throw new ApiError(
                            404,
                            "Bulk Order not found in the active branch."
                        );

                    }


                    const pricingMode =
                        normalizePricingMode(
                            original.pricingMode ||
                            "RETAIL"
                        );


                    const normalizedItems =
                        original.items.map(
                            (
                                item
                            ) => {

                                return {
                                    productId:
                                        item.product,

                                    quantity:
                                        item.quantity,
                                };

                            }
                        );


                    const items =
                        await buildOrderItems(
                            normalizedItems,
                            pricingMode,
                            session
                        );


                    const totals =
                        calculateTotals(
                            items
                        );


                    const orderNumber =
                        buildOrderNumber(
                            branchSnapshot.code,
                            newOrderId
                        );


                    const [
                        duplicated,
                    ] =
                        await BulkOrder.create(
                            [
                                {
                                    _id:
                                        newOrderId,

                                    orderNumber,

                                    branch:
                                        branchId,

                                    branchSnapshot,

                                    pricingMode,

                                    customerName:
                                        original.customerName ||
                                        "",

                                    notes:
                                        original.notes ||
                                        "",

                                    status:
                                        "DRAFT",

                                    revision:
                                        1,

                                    items,

                                    totalLines:
                                        totals.totalLines,

                                    totalQuantity:
                                        totals.totalQuantity,

                                    totalAmount:
                                        totals.totalAmount,

                                    revisions:
                                        [],

                                    createdBy:
                                        resolvedUserId,

                                    lastModifiedBy:
                                        resolvedUserId,
                                },
                            ],
                            {
                                session,
                            }
                        );


                    await syncOutboxService
                        .enqueueSyncRequest({
                            source:
                                "BULK_ORDER",

                            action:
                                "DUPLICATE",

                            aggregateId:
                                duplicated._id,

                            branchId,

                            session,
                        });


                    return duplicated._id;

                }
            );


        return await populateOrder(
            result
        );

    };


/*
============================================================
CANCEL ORDER
============================================================
*/

const cancelOrder =
    async (
        orderId,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedOrderId =
            requireObjectId(
                orderId,
                "Bulk Order ID"
            );


        const {
            branchId,
        } =
            buildBranchContext(
                activeBranch
            );


        await withTransaction(
            async (
                session
            ) => {

                const order =
                    await BulkOrder
                        .findOne({
                            _id:
                                resolvedOrderId,

                            branch:
                                branchId,
                        })
                        .session(
                            session
                        );


                if (
                    !order
                ) {

                    throw new ApiError(
                        404,
                        "Bulk Order not found in the active branch."
                    );

                }


                if (
                    order.status ===
                    "CANCELLED"
                ) {

                    return;

                }


                if (
                    order.status ===
                    "COMPLETED"
                ) {

                    throw new ApiError(
                        409,
                        "A completed Bulk Order cannot be cancelled. Use the Sale refund/return workflow instead."
                    );

                }


                if (
                    ![
                        "DRAFT",
                        "SAVED",
                    ].includes(
                        order.status
                    )
                ) {

                    throw new ApiError(
                        409,
                        `Bulk Order cannot be cancelled from status ${order.status}.`
                    );

                }


                order.status =
                    "CANCELLED";


                order.cancelledBy =
                    resolvedUserId;


                order.cancelledAt =
                    new Date();


                order.lastModifiedBy =
                    resolvedUserId;


                await order.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "BULK_ORDER",

                        action:
                            "CANCEL",

                        aggregateId:
                            order._id,

                        branchId,

                        session,
                    });

            }
        );


        return await populateOrder(
            resolvedOrderId
        );

    };


/*
============================================================
RECORD PRINT
============================================================
*/

const recordPrint =
    async (
        orderId,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedOrderId =
            requireObjectId(
                orderId,
                "Bulk Order ID"
            );


        const {
            branchId,
        } =
            buildBranchContext(
                activeBranch
            );


        await withTransaction(
            async (
                session
            ) => {

                const order =
                    await BulkOrder
                        .findOne({
                            _id:
                                resolvedOrderId,

                            branch:
                                branchId,
                        })
                        .session(
                            session
                        );


                if (
                    !order
                ) {

                    throw new ApiError(
                        404,
                        "Bulk Order not found in the active branch."
                    );

                }


                if (
                    order.status ===
                    "DRAFT"
                ) {

                    throw new ApiError(
                        409,
                        "Save the Bulk Order before printing."
                    );

                }


                if (
                    order.status ===
                    "CANCELLED"
                ) {

                    throw new ApiError(
                        409,
                        "A cancelled Bulk Order cannot be printed."
                    );

                }


                order.printCount =
                    (
                        Number(
                            order.printCount
                        ) || 0
                    ) +
                    1;


                order.lastPrintedAt =
                    new Date();


                order.lastModifiedBy =
                    resolvedUserId;


                await order.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "BULK_ORDER",

                        action:
                            "PRINT",

                        aggregateId:
                            order._id,

                        branchId,

                        session,
                    });

            }
        );


        return await populateOrder(
            resolvedOrderId
        );

    };


/*
============================================================
COMPLETE WITH SALE
============================================================

Marks a SAVED Bulk Order COMPLETED and connects it to a Sale.

IMPORTANT:

This function itself does NOT:

- create the Sale
- deduct inventory
- process payment

For the paid Bulk Order workflow, sale.service.js will call
this function using the SAME MongoDB session that creates the
Sale and deducts inventory.

That gives us:

Sale
+
BranchInventory deduction
+
InventoryTransaction
+
BulkOrder COMPLETED

as one atomic transaction.
============================================================
*/

const completeWithSale =
    async (
        orderId,
        saleId,
        saleNumber,
        userId,
        activeBranch,
        {
            session:
                externalSession = null,
        } = {}
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedOrderId =
            requireObjectId(
                orderId,
                "Bulk Order ID"
            );


        const resolvedSaleId =
            requireObjectId(
                saleId,
                "Sale ID"
            );


        const {
            branchId,
        } =
            buildBranchContext(
                activeBranch
            );


        const normalizedSaleNumber =
            String(
                saleNumber ||
                ""
            )
                .trim();


        if (
            !normalizedSaleNumber
        ) {

            throw new ApiError(
                400,
                "Sale number is required when completing a Bulk Order."
            );

        }


        const execute =
            async (
                session
            ) => {

                let query =
                    BulkOrder.findOne({
                        _id:
                            resolvedOrderId,

                        branch:
                            branchId,
                    });


                if (
                    session
                ) {

                    query =
                        query.session(
                            session
                        );

                }


                const order =
                    await query;


                if (
                    !order
                ) {

                    throw new ApiError(
                        404,
                        "Bulk Order not found in the active branch."
                    );

                }


                /*
                =================================================
                IDEMPOTENT SAME-SALE COMPLETION
                =================================================
                */

                if (
                    order.status ===
                    "COMPLETED"
                ) {

                    if (
                        order.sale &&
                        String(
                            order.sale
                        ) ===
                            String(
                                resolvedSaleId
                            )
                    ) {

                        return order._id;

                    }


                    throw new ApiError(
                        409,
                        "Bulk Order has already been completed by another Sale."
                    );

                }


                if (
                    order.status !==
                    "SAVED"
                ) {

                    throw new ApiError(
                        409,
                        `Only SAVED Bulk Orders can be completed. Current status: ${order.status}.`
                    );

                }


                /*
                =================================================
                PREVENT SALE REUSE
                =================================================
                */

                let existingOrderQuery =
                    BulkOrder.findOne({
                        branch:
                            branchId,

                        sale:
                            resolvedSaleId,

                        _id: {
                            $ne:
                                resolvedOrderId,
                        },
                    });


                if (
                    session
                ) {

                    existingOrderQuery =
                        existingOrderQuery.session(
                            session
                        );

                }


                const existingOrder =
                    await existingOrderQuery;


                if (
                    existingOrder
                ) {

                    throw new ApiError(
                        409,
                        "This Sale is already linked to another Bulk Order."
                    );

                }


                order.status =
                    "COMPLETED";


                order.sale =
                    resolvedSaleId;


                order.saleNumber =
                    normalizedSaleNumber;


                order.completedBy =
                    resolvedUserId;


                order.completedAt =
                    new Date();


                order.lastModifiedBy =
                    resolvedUserId;


                await order.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "BULK_ORDER",

                        action:
                            "COMPLETE",

                        aggregateId:
                            order._id,

                        branchId,

                        session,
                    });


                return order._id;

            };


        let resultId;


        if (
            externalSession
        ) {

            resultId =
                await execute(
                    externalSession
                );

        }
        else {

            resultId =
                await withTransaction(
                    async (
                        session
                    ) => {

                        return await execute(
                            session
                        );

                    }
                );

        }


        if (
            externalSession
        ) {

            return resultId;

        }


        return await populateOrder(
            resultId
        );

    };


/*
============================================================
GET ORDERS / HISTORY
============================================================
*/

const getOrders =
    async (
        branchId,
        {
            status,
            search,
            limit =
                DEFAULT_HISTORY_LIMIT,
        } = {}
    ) => {

        const resolvedBranchId =
            requireObjectId(
                branchId,
                "branch ID"
            );


        const filter = {
            branch:
                resolvedBranchId,
        };


        if (
            status
        ) {

            const normalizedStatus =
                String(
                    status
                )
                    .trim()
                    .toUpperCase();


            if (
                ![
                    "DRAFT",
                    "SAVED",
                    "COMPLETED",
                    "CANCELLED",
                ].includes(
                    normalizedStatus
                )
            ) {

                throw new ApiError(
                    400,
                    "Invalid Bulk Order status."
                );

            }


            filter.status =
                normalizedStatus;

        }


        const normalizedSearch =
            String(
                search ||
                ""
            )
                .trim()
                .slice(
                    0,
                    100
                );


        if (
            normalizedSearch
        ) {

            const escaped =
                normalizedSearch
                    .replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&"
                    );


            const regex =
                new RegExp(
                    escaped,
                    "i"
                );


            filter.$or = [
                {
                    orderNumber:
                        regex,
                },

                {
                    customerName:
                        regex,
                },

                {
                    saleNumber:
                        regex,
                },
            ];

        }


        const safeLimit =
            Math.min(
                Math.max(
                    Number(
                        limit
                    ) ||
                    DEFAULT_HISTORY_LIMIT,
                    1
                ),
                MAX_HISTORY_LIMIT
            );


        return await BulkOrder
            .find(
                filter
            )

            .populate(
                "createdBy",
                "name username"
            )

            .populate(
                "lastModifiedBy",
                "name username"
            )

            .populate(
                "completedBy",
                "name username"
            )

            .populate(
                "sale",
                "saleNumber receiptNumber totalAmount total createdAt"
            )

            .sort({
                updatedAt:
                    -1,

                createdAt:
                    -1,
            })

            .limit(
                safeLimit
            );

    };


/*
============================================================
GET ORDER BY ID
============================================================
*/

const getOrderById =
    async (
        orderId,
        branchId
    ) => {

        const resolvedOrderId =
            requireObjectId(
                orderId,
                "Bulk Order ID"
            );


        const resolvedBranchId =
            requireObjectId(
                branchId,
                "branch ID"
            );


        const order =
            await BulkOrder
                .findOne({
                    _id:
                        resolvedOrderId,

                    branch:
                        resolvedBranchId,
                })

                .populate(
                    "branch",
                    "code name address phone"
                )

                .populate(
                    "createdBy",
                    "name username role"
                )

                .populate(
                    "lastModifiedBy",
                    "name username role"
                )

                .populate(
                    "cancelledBy",
                    "name username role"
                )

                .populate(
                    "completedBy",
                    "name username role"
                )

                .populate(
                    "sale",
                    "saleNumber receiptNumber totalAmount total createdAt"
                );


        if (
            !order
        ) {

            throw new ApiError(
                404,
                "Bulk Order not found for the active branch."
            );

        }


        /*
        Backward compatibility for orders created before
        pricingMode existed.
        */

        if (
            !order.pricingMode
        ) {

            order.pricingMode =
                "RETAIL";

        }


        return order;

    };


/*
============================================================
GET REVISION
============================================================
*/

const getRevision =
    async (
        orderId,
        revisionNumber,
        branchId
    ) => {

        const order =
            await getOrderById(
                orderId,
                branchId
            );


        const requestedRevision =
            Number(
                revisionNumber
            );


        if (
            !Number.isInteger(
                requestedRevision
            ) ||
            requestedRevision <=
                0
        ) {

            throw new ApiError(
                400,
                "Invalid revision number."
            );

        }


        /*
        --------------------------------------------------------
        CURRENT REVISION
        --------------------------------------------------------
        */

        if (
            requestedRevision ===
            Number(
                order.revision
            )
        ) {

            return {
                orderNumber:
                    order.orderNumber,

                revision:
                    order.revision,

                pricingMode:
                    normalizePricingMode(
                        order.pricingMode ||
                        "RETAIL"
                    ),

                customerName:
                    order.customerName,

                notes:
                    order.notes,

                items:
                    order.items,

                totalLines:
                    order.totalLines,

                totalQuantity:
                    order.totalQuantity,

                totalAmount:
                    order.totalAmount,

                current:
                    true,

                changedAt:
                    order.updatedAt,

                changedBy:
                    order.lastModifiedBy ||
                    order.createdBy,
            };

        }


        const revision =
            order.revisions.find(
                (
                    item
                ) =>
                    Number(
                        item.revision
                    ) ===
                    requestedRevision
            );


        if (
            !revision
        ) {

            throw new ApiError(
                404,
                `Revision ${requestedRevision} was not found.`
            );

        }


        return {
            orderNumber:
                order.orderNumber,

            revision:
                revision.revision,

            pricingMode:
                normalizePricingMode(
                    revision.pricingMode ||
                    "RETAIL"
                ),

            customerName:
                revision.customerName,

            notes:
                revision.notes,

            items:
                revision.items,

            totalLines:
                revision.totalLines,

            totalQuantity:
                revision.totalQuantity,

            totalAmount:
                revision.totalAmount,

            current:
                false,

            changedAt:
                revision.changedAt,

            changedBy:
                revision.changedBy,
        };

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    createOrder,

    updateOrder,

    saveDraft,

    duplicateOrder,

    cancelOrder,

    recordPrint,

    completeWithSale,

    getOrders,

    getOrderById,

    getRevision,

};