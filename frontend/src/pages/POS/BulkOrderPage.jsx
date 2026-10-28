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

import bulkOrderService
    from "../../services/bulkOrder.service";


/*
============================================================
UNIT CLASSIFICATION
============================================================

IMPORTANT:

Only units that are explicitly known to be packaging /
grouped units are classified as BULK.

Everything else defaults to PIECE.

This prevents units such as:

Bottle
Sachet
Can
Pouch
Jar
Tube

from accidentally appearing under BULK / PACKAGE.
============================================================
*/


/*
============================================================
KNOWN PIECE / SINGLE-ITEM UNITS
============================================================
*/

const PIECE_UNITS =
    new Set([
        "PIECE",
        "PIECES",
        "PC",
        "PCS",
        "EA",
        "EACH",

        "BOTTLE",
        "BOTTLES",
        "BTL",
        "BTLS",

        "SACHET",
        "SACHETS",
        "SACH",

        "CAN",
        "CANS",

        "POUCH",
        "POUCHES",

        "JAR",
        "JARS",

        "TUBE",
        "TUBES",

        "CUP",
        "CUPS",

        "ROLL",
        "ROLLS",

        "BAR",
        "BARS",

        "STICK",
        "STICKS",

        "PAD",
        "PADS",

        "UNIT",
        "UNITS",
    ]);


/*
============================================================
KNOWN BULK / PACKAGE UNITS
============================================================
*/

const BULK_UNIT_PRIORITY = {

    CASE: 10,
    CS: 10,
    CSE: 10,
    CASES: 10,

    BOX: 20,
    BX: 20,
    BOXES: 20,

    SACK: 30,
    SCK: 30,
    SACKS: 30,

    PACK: 40,
    PK: 40,
    PKG: 40,
    PACKAGE: 40,
    PACKS: 40,
    PACKAGES: 40,

    BUNDLE: 50,
    BDL: 50,
    BUNDLES: 50,

    DOZEN: 60,
    DZ: 60,
    DOZ: 60,

    TRAY: 70,
    TRY: 70,
    TRAYS: 70,

    BAG: 80,
    BG: 80,
    BAGS: 80,

};


/*
============================================================
GENERAL HELPERS
============================================================
*/

const formatMoney =
    (
        value
    ) => {

        const number =
            Number(
                value
            );


        return (
            Number.isFinite(
                number
            )
                ? number
                : 0
        ).toLocaleString(
            "en-PH",
            {
                style:
                    "currency",

                currency:
                    "PHP",

                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2,
            }
        );

    };


const formatNumber =
    (
        value
    ) => {

        return Number(
            value ||
            0
        ).toLocaleString(
            "en-PH"
        );

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


const normalizeUnit =
    (
        value
    ) => {

        return String(
            value ||
            "Piece"
        )
            .trim()
            .toUpperCase();

    };


/*
============================================================
UNIT SORT INFORMATION
============================================================

RULE:

Known bulk unit
    -> BULK

Known piece unit
    -> PIECE

Unknown unit
    -> PIECE

Unknown units intentionally default to PIECE.

That is safer than automatically treating every new unit
as a package.
============================================================
*/

const getLocalSortInfo =
    (
        baseUnit
    ) => {

        const unit =
            normalizeUnit(
                baseUnit
            );


        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    BULK_UNIT_PRIORITY,
                    unit
                )
        ) {

            return {

                group:
                    "BULK",

                priority:
                    BULK_UNIT_PRIORITY[
                        unit
                    ],

            };

        }


        if (
            PIECE_UNITS.has(
                unit
            )
        ) {

            return {

                group:
                    "PIECE",

                priority:
                    1000,

            };

        }


        /*
        ========================================================
        UNKNOWN UNIT
        ========================================================

        Default to PIECE.

        Example:

        Bottle -> if not listed, still Piece
        Sachet -> if not listed, still Piece
        Container -> Piece
        Packet -> Piece

        Only explicitly recognized packaging units go to BULK.
        ========================================================
        */

        return {

            group:
                "PIECE",

            priority:
                1000,

        };

    };


/*
============================================================
NORMALIZE PRICING TIERS
============================================================
*/

const normalizePricingTiers =
    (
        pricing
    ) => {

        return (
            Array.isArray(
                pricing
            )
                ? pricing
                : []
        )
            .map(
                (
                    tier
                ) => ({

                    quantity:
                        Math.floor(
                            Number(
                                tier?.quantity
                            )
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
                ) =>

                    Number.isFinite(
                        tier.quantity
                    ) &&

                    tier.quantity >
                        0 &&

                    Number.isFinite(
                        tier.price
                    ) &&

                    tier.price >=
                        0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.quantity -
                    a.quantity
            );

    };


/*
============================================================
RETAIL PRICING
============================================================

Retail uses the normal quantity-tier behavior.

Example:

1  = P180
6  = P1000
12 = P1900

Retail automatically activates configured bundle tiers when
the requested quantity reaches them, then prices any remainder
using smaller tiers.
============================================================
*/

const calculateRetailPricing =
    (
        pricing,
        requestedQuantity
    ) => {

        const quantity =
            Math.max(
                1,
                Math.floor(
                    Number(requestedQuantity) || 1
                )
            );

        const tiers =
            normalizePricingTiers(pricing);

        if (tiers.length === 0) {
            return {
                pricingBreakdown: [],
                effectiveUnitPrice: null,
                lineTotal: null,
            };
        }

        let remaining = quantity;
        let lineTotal = 0;
        const pricingBreakdown = [];

        for (const tier of tiers) {
            if (remaining < tier.quantity) {
                continue;
            }

            const bundles =
                Math.floor(remaining / tier.quantity);

            if (bundles <= 0) {
                continue;
            }

            const coveredQuantity =
                bundles * tier.quantity;

            const subtotal =
                bundles * tier.price;

            pricingBreakdown.push({
                tierQuantity: tier.quantity,
                tierPrice: tier.price,
                bundles,
                coveredQuantity,
                subtotal,
            });

            lineTotal += subtotal;
            remaining -= coveredQuantity;
        }

        if (remaining > 0) {
            return {
                pricingBreakdown: [],
                effectiveUnitPrice: null,
                lineTotal: null,
            };
        }

        return {
            pricingBreakdown,
            effectiveUnitPrice: lineTotal / quantity,
            lineTotal,
        };

    };


/*
============================================================
WHOLESALE PRICING
============================================================

Wholesale immediately uses the configured tier with the
lowest effective per-unit price, regardless of requested
quantity.

The exact tier ratio is retained internally and the final
line total is rounded once. Fractional bundle labels are not
created.
============================================================
*/

const calculateWholesalePricing =
    (
        pricing,
        requestedQuantity
    ) => {

        const quantity =
            Math.max(
                1,
                Math.floor(
                    Number(requestedQuantity) || 1
                )
            );

        const tiers =
            normalizePricingTiers(pricing);

        if (tiers.length === 0) {
            return {
                pricingBreakdown: [],
                effectiveUnitPrice: null,
                lineTotal: null,
            };
        }

        const wholesaleTier =
            tiers.reduce(
                (best, tier) => {
                    if (!best) {
                        return tier;
                    }

                    const tierUnitPrice =
                        tier.price / tier.quantity;

                    const bestUnitPrice =
                        best.price / best.quantity;

                    if (tierUnitPrice < bestUnitPrice) {
                        return tier;
                    }

                    if (
                        tierUnitPrice === bestUnitPrice &&
                        tier.quantity > best.quantity
                    ) {
                        return tier;
                    }

                    return best;
                },
                null
            );

        const effectiveUnitPrice =
            wholesaleTier.price / wholesaleTier.quantity;

        const lineTotal =
            Math.round(
                (
                    effectiveUnitPrice *
                    quantity +
                    Number.EPSILON
                ) *
                100
            ) /
            100;

        return {
            pricingBreakdown: [
                {
                    tierQuantity: wholesaleTier.quantity,
                    tierPrice: wholesaleTier.price,

                    /*
                    WHOLESALE records the selected tier as the
                    pricing basis. It does not represent the
                    requested quantity as a fractional bundle.
                    */
                    bundles: 0,

                    coveredQuantity: quantity,
                    subtotal: lineTotal,
                },
            ],
            effectiveUnitPrice,
            lineTotal,
        };

    };


/*
============================================================
CALCULATE LIVE PRICING
============================================================
*/

const calculateLivePricing =
    (
        pricing,
        requestedQuantity,
        pricingMode
    ) => {

        if (
            pricingMode ===
            "WHOLESALE"
        ) {

            return calculateWholesalePricing(
                pricing,
                requestedQuantity
            );

        }


        return calculateRetailPricing(
            pricing,
            requestedQuantity
        );

    };


/*
============================================================
SORT ORDER ITEMS
============================================================
*/

const sortOrderItems =
    (
        items
    ) => {

        return [
            ...items,
        ].sort(
            (
                a,
                b
            ) => {

                /*
                Always classify using the current frontend unit
                rules.

                This intentionally fixes older locally loaded
                items that may have been marked BULK simply
                because Bottle/Sachet was unknown.
                */

                const aInfo =
                    getLocalSortInfo(
                        a.baseUnit
                    );


                const bInfo =
                    getLocalSortInfo(
                        b.baseUnit
                    );


                if (
                    aInfo.group !==
                    bInfo.group
                ) {

                    return (
                        aInfo.group ===
                        "PIECE"
                            ? 1
                            : -1
                    );

                }


                if (
                    aInfo.priority !==
                    bInfo.priority
                ) {

                    return (
                        aInfo.priority -
                        bInfo.priority
                    );

                }


                return String(
                    a.name ||
                    ""
                ).localeCompare(
                    String(
                        b.name ||
                        ""
                    )
                );

            }
        );

    };


const getStatusBadge =
    (
        status
    ) => {

        switch (
            status
        ) {

            case "COMPLETED":

                return "badge-success";


            case "CANCELLED":

                return "badge-error";


            case "SAVED":

                return "badge-info";


            default:

                return "badge-warning";

        }

    };


/*
============================================================
PRINT / PDF HELPERS
============================================================

The browser print dialog is used intentionally so the same clean
A4 document can be printed to paper or saved as PDF without adding
a client-side PDF dependency.
============================================================
*/

const escapePrintHtml =
    (
        value
    ) => {

        return String(
            value ??
            ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    };


const buildBulkOrderPrintHtml =
    (
        order,
        branch
    ) => {

        const orderedItems =
            sortOrderItems(
                order?.items ||
                []
            );


        const totalQuantity =
            Number(
                order?.totalQuantity
            ) ||
            orderedItems.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item?.quantity ||
                        0
                    ),
                0
            );


        const totalLines =
            order?.totalLines ??
            orderedItems.length;


        let previousGroup =
            null;


        const itemRows =
            orderedItems.map(
                (
                    item
                ) => {

                    const sortInfo =
                        getLocalSortInfo(
                            item?.baseUnit
                        );


                    const section =
                        sortInfo.group !==
                        previousGroup
                            ? `
                                <tr class="section-row">
                                    <td colspan="6">
                                        ${
                                            sortInfo.group ===
                                            "PIECE"
                                                ? "PIECE ITEMS"
                                                : "BULK / PACKAGE ITEMS"
                                        }
                                    </td>
                                </tr>
                            `
                            : "";


                    previousGroup =
                        sortInfo.group;


                    const barcode =
                        String(
                            item?.barcode ||
                            ""
                        ).trim();


                    return `
                        ${section}

                        <tr class="item-row">
                            <td class="check-cell">
                                <span class="check-box"></span>
                            </td>

                            <td class="product-cell">
                                <div class="product-name">
                                    ${escapePrintHtml(
                                        item?.name ||
                                        "Product"
                                    )}
                                </div>

                                ${
                                    barcode
                                        ? `
                                            <div class="barcode">
                                                ${escapePrintHtml(
                                                    barcode
                                                )}
                                            </div>
                                        `
                                        : ""
                                }
                            </td>

                            <td>
                                ${escapePrintHtml(
                                    item?.baseUnit ||
                                    "Piece"
                                )}
                            </td>

                            <td class="number-cell quantity-cell">
                                ${formatNumber(
                                    item?.quantity
                                )}
                            </td>

                            <td class="number-cell">
                                ${escapePrintHtml(
                                    formatMoney(
                                        item?.effectiveUnitPrice
                                    )
                                )}
                            </td>

                            <td class="number-cell amount-cell">
                                ${escapePrintHtml(
                                    formatMoney(
                                        item?.lineTotal
                                    )
                                )}
                            </td>
                        </tr>
                    `;

                }
            ).join(
                ""
            );


        const branchLabel =
            [
                branch?.code,
                branch?.name,
            ]
                .filter(
                    Boolean
                )
                .join(
                    " — "
                ) ||
            "Branch";


        const orderDate =
            formatDate(
                order?.updatedAt ||
                order?.createdAt
            );


        const notes =
            String(
                order?.notes ||
                ""
            ).trim();


        const orderNumber =
            order?.orderNumber ||
            "Bulk Order";


        return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapePrintHtml(orderNumber)}</title>

    <style>
        @page {
            size: A4 portrait;
            margin: 10mm;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            line-height: 1.25;
        }

        body {
            padding: 0;
        }

        .sheet {
            width: 100%;
        }

        .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 6px;
            border-bottom: 1.5px solid #111111;
        }

        .store-name {
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.2px;
        }

        .branch {
            margin-top: 2px;
            color: #555555;
            font-size: 9px;
        }

        .order-heading {
            text-align: right;
        }

        .order-title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.5px;
        }

        .order-number {
            margin-top: 2px;
            font-size: 10px;
            font-weight: 700;
        }

        .meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px 20px;
            padding: 6px 0;
            border-bottom: 1px solid #bdbdbd;
        }

        .meta-line {
            display: flex;
            gap: 5px;
            min-width: 0;
        }

        .meta-label {
            flex: 0 0 auto;
            color: #666666;
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .meta-value {
            min-width: 0;
            font-weight: 700;
        }

        table {
            width: 100%;
            margin-top: 6px;
            border-collapse: collapse;
            table-layout: fixed;
        }

        thead {
            display: table-header-group;
        }

        th {
            padding: 4px 4px;
            border-top: 1px solid #111111;
            border-bottom: 1px solid #111111;
            font-size: 8px;
            font-weight: 800;
            text-align: left;
            text-transform: uppercase;
        }

        td {
            padding: 4px;
            border-bottom: 1px solid #dddddd;
            vertical-align: middle;
        }

        tr {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .section-row td {
            padding: 4px;
            background: #eeeeee;
            border-top: 1px solid #bdbdbd;
            border-bottom: 1px solid #bdbdbd;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.35px;
        }

        .check-column,
        .check-cell {
            width: 7%;
            text-align: center;
        }

        .product-column {
            width: 41%;
        }

        .unit-column {
            width: 13%;
        }

        .qty-column {
            width: 9%;
        }

        .price-column {
            width: 14%;
        }

        .amount-column {
            width: 16%;
        }

        .check-box {
            display: inline-block;
            width: 13px;
            height: 13px;
            border: 1.5px solid #111111;
            border-radius: 2px;
            vertical-align: middle;
        }

        .product-name {
            font-size: 9.5px;
            font-weight: 700;
            overflow-wrap: anywhere;
        }

        .barcode {
            margin-top: 1px;
            color: #666666;
            font-size: 7.5px;
        }

        .number-cell {
            text-align: right;
            white-space: nowrap;
        }

        .quantity-cell {
            font-size: 11px;
            font-weight: 900;
        }

        .amount-cell {
            font-weight: 800;
        }

        .summary {
            display: grid;
            grid-template-columns: auto auto auto;
            justify-content: end;
            gap: 18px;
            padding: 6px 0;
            border-bottom: 1px solid #bdbdbd;
            font-size: 9px;
        }

        .summary strong {
            font-size: 10px;
        }

        .grand-total {
            font-size: 13px !important;
            font-weight: 900;
        }

        .notes {
            padding: 6px 0;
            border-bottom: 1px solid #bdbdbd;
        }

        .notes-title {
            margin-bottom: 2px;
            color: #666666;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .notes-body {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }

        .verification {
            padding-top: 7px;
        }

        .all-checked {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 13px;
            font-weight: 700;
        }

        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 35px;
        }

        .signature-line {
            padding-top: 14px;
            border-bottom: 1px solid #111111;
        }

        .signature-label {
            margin-top: 2px;
            color: #666666;
            font-size: 8px;
            text-align: center;
        }

        .footer {
            margin-top: 8px;
            color: #777777;
            font-size: 7px;
            text-align: right;
        }

        @media print {
            .sheet {
                width: auto;
            }
        }
    </style>
</head>
<body>
    <main class="sheet">
        <header class="header">
            <div>
                <div class="store-name">
                    BULK ORDER
                </div>

                <div class="branch">
                    ${escapePrintHtml(branchLabel)}
                </div>
            </div>

            <div class="order-heading">
                <div class="order-title">
                    ${escapePrintHtml(orderNumber)}
                </div>

                <div class="order-number">
                    Revision ${escapePrintHtml(order?.revision || 1)}
                </div>
            </div>
        </header>

        <section class="meta">
            <div class="meta-line">
                <span class="meta-label">Customer</span>
                <span class="meta-value">
                    ${escapePrintHtml(order?.customerName || "-")}
                </span>
            </div>

            <div class="meta-line">
                <span class="meta-label">Date</span>
                <span class="meta-value">
                    ${escapePrintHtml(orderDate)}
                </span>
            </div>

            <div class="meta-line">
                <span class="meta-label">Pricing</span>
                <span class="meta-value">
                    ${escapePrintHtml(order?.pricingMode || "RETAIL")}
                </span>
            </div>

            <div class="meta-line">
                <span class="meta-label">Status</span>
                <span class="meta-value">
                    ${escapePrintHtml(order?.status || "-")}
                </span>
            </div>
        </section>

        <table>
            <thead>
                <tr>
                    <th class="check-column">✓</th>
                    <th class="product-column">Product</th>
                    <th class="unit-column">Unit</th>
                    <th class="qty-column number-cell">Qty</th>
                    <th class="price-column number-cell">Price</th>
                    <th class="amount-column number-cell">Total</th>
                </tr>
            </thead>

            <tbody>
                ${itemRows}
            </tbody>
        </table>

        <section class="summary">
            <div>
                Items: <strong>${escapePrintHtml(totalLines)}</strong>
            </div>

            <div>
                Qty: <strong>${escapePrintHtml(formatNumber(totalQuantity))}</strong>
            </div>

            <div>
                TOTAL:
                <strong class="grand-total">
                    ${escapePrintHtml(formatMoney(order?.totalAmount))}
                </strong>
            </div>
        </section>

        ${
            notes
                ? `
                    <section class="notes">
                        <div class="notes-title">Notes</div>
                        <div class="notes-body">
                            ${escapePrintHtml(notes)}
                        </div>
                    </section>
                `
                : ""
        }

        <section class="verification">
            <div class="all-checked">
                <span class="check-box"></span>
                <span>All products and quantities checked</span>
            </div>

            <div class="signatures">
                <div>
                    <div class="signature-line"></div>
                    <div class="signature-label">Prepared by</div>
                </div>

                <div>
                    <div class="signature-line"></div>
                    <div class="signature-label">Checked by</div>
                </div>
            </div>
        </section>

        <div class="footer">
            Printed ${escapePrintHtml(new Date().toLocaleString("en-PH"))}
        </div>
    </main>
</body>
</html>`;

    };


const openBulkOrderPrintWindow =
    (
        printWindow,
        order,
        branch
    ) => {

        if (
            !printWindow
        ) {

            throw new Error(
                "The print window was blocked. Allow pop-ups for this POS and try again."
            );

        }


        const html =
            buildBulkOrderPrintHtml(
                order,
                branch
            );


        printWindow.document.open();
        printWindow.document.write(
            html
        );
        printWindow.document.close();


        printWindow.focus();


        const triggerPrint =
            () => {

                window.setTimeout(
                    () => {

                        printWindow.print();

                    },
                    150
                );

            };


        if (
            printWindow.document.readyState ===
            "complete"
        ) {

            triggerPrint();

        }
        else {

            printWindow.addEventListener(
                "load",
                triggerPrint,
                {
                    once:
                        true,
                }
            );

        }

    };



/*
============================================================
UNSAVED BULK ORDER LOCAL DRAFT
============================================================

Keeps the current Bulk Order in this browser when the user:

- switches to Order History
- navigates to another POS page
- refreshes the browser
- closes and reopens the POS

The local draft is removed only when:

- the user explicitly starts a New Blank Order
- the current local order is successfully saved
- a locked/completed/cancelled order replaces the editor

The branch ID is included in the storage key so one branch's
unfinished order cannot appear in another branch.
============================================================
*/

const BULK_ORDER_LOCAL_DRAFT_PREFIX =
    "storepos:bulk-order-local-draft:v1";


const getBulkOrderLocalDraftKey =
    (
        branch
    ) => {

        const branchId =
            String(
                branch?._id ||
                branch?.id ||
                localStorage.getItem(
                    "activeBranchId"
                ) ||
                "default"
            );


        return `${BULK_ORDER_LOCAL_DRAFT_PREFIX}:${branchId}`;

    };


const readBulkOrderLocalDraft =
    (
        branch
    ) => {

        try {

            const raw =
                localStorage.getItem(
                    getBulkOrderLocalDraftKey(
                        branch
                    )
                );


            if (
                !raw
            ) {

                return null;

            }


            const parsed =
                JSON.parse(
                    raw
                );


            if (
                !parsed ||
                typeof parsed !==
                    "object"
            ) {

                return null;

            }


            return parsed;

        }
        catch (
            error
        ) {

            console.warn(
                "Unable to restore local Bulk Order draft:",
                error
            );


            return null;

        }

    };


const writeBulkOrderLocalDraft =
    (
        branch,
        draft
    ) => {

        try {

            localStorage.setItem(
                getBulkOrderLocalDraftKey(
                    branch
                ),
                JSON.stringify(
                    draft
                )
            );

        }
        catch (
            error
        ) {

            console.warn(
                "Unable to save local Bulk Order draft:",
                error
            );

        }

    };


const clearBulkOrderLocalDraft =
    (
        branch
    ) => {

        try {

            localStorage.removeItem(
                getBulkOrderLocalDraftKey(
                    branch
                )
            );

        }
        catch (
            error
        ) {

            console.warn(
                "Unable to clear local Bulk Order draft:",
                error
            );

        }

    };


/*
============================================================
PAGE
============================================================
*/

function BulkOrderPage() {

    /*
    ============================================================
    FULLSCREEN
    ============================================================
    */

    const [
        isFullscreen,
        setIsFullscreen,
    ] = useState(
        Boolean(
            document.fullscreenElement
        )
    );


    useEffect(
        () => {

            const handleFullscreenChange =
                () => {

                    setIsFullscreen(
                        Boolean(
                            document.fullscreenElement
                        )
                    );

                };


            document.addEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );


            return () => {

                document.removeEventListener(
                    "fullscreenchange",
                    handleFullscreenChange
                );

            };

        },
        []
    );


    const toggleFullscreen =
        async () => {

            try {

                if (
                    document.fullscreenElement
                ) {

                    await document
                        .exitFullscreen();

                    return;

                }


                await document
                    .documentElement
                    .requestFullscreen();

            } catch (
                error
            ) {

                console.error(
                    "Unable to toggle fullscreen:",
                    error
                );

            }

        };

    /*
    ============================================================
    TAB
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
    PRICING MODE
    ============================================================

    RETAIL
    -> normal quantity tiers activate at their thresholds

    WHOLESALE
    -> best configured effective unit price applies immediately

    The selected mode is persisted by the backend.

    Product prices remain backend-authoritative.
    ============================================================
    */

    const [
        pricingMode,
        setPricingMode,
    ] =
        useState(
            "WHOLESALE"
        );


    /*
    ============================================================
    BRANCH
    ============================================================
    */

    const [
        activeBranch,
        setActiveBranch,
    ] =
        useState(
            null
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


    const [
        highlightedProductIndex,
        setHighlightedProductIndex,
    ] =
        useState(
            0
        );


    const searchInputRef =
        useRef(
            null
        );


    const productResultRefs =
        useRef(
            []
        );


    /*
    ============================================================
    ORDER
    ============================================================
    */

    const [
        items,
        setItems,
    ] =
        useState(
            []
        );


    const [
        customerName,
        setCustomerName,
    ] =
        useState(
            ""
        );


    const [
        notes,
        setNotes,
    ] =
        useState(
            ""
        );


    const [
        currentOrder,
        setCurrentOrder,
    ] =
        useState(
            null
        );


    /*
    ============================================================
    LOCAL UNSAVED DRAFT RESTORATION
    ============================================================
    */

    const localDraftRestoredRef =
        useRef(
            false
        );


    /*
    ============================================================
    QUANTITY POPUP
    ============================================================
    */

    const [
        quantityProduct,
        setQuantityProduct,
    ] =
        useState(
            null
        );


    const [
        quantityValue,
        setQuantityValue,
    ] =
        useState(
            "1"
        );


    const quantityInputRef =
        useRef(
            null
        );


    /*
    ============================================================
    HISTORY
    ============================================================
    */

    const [
        orders,
        setOrders,
    ] =
        useState(
            []
        );


    const [
        historySearch,
        setHistorySearch,
    ] =
        useState(
            ""
        );


    const [
        statusFilter,
        setStatusFilter,
    ] =
        useState(
            ""
        );


    const [
        selectedOrder,
        setSelectedOrder,
    ] =
        useState(
            null
        );


    /*
    ============================================================
    PAYMENT
    ============================================================
    */

    const [
        paymentOrder,
        setPaymentOrder,
    ] =
        useState(
            null
        );


    const [
        paymentAmount,
        setPaymentAmount,
    ] =
        useState(
            ""
        );


    const [
        paymentMethod,
        setPaymentMethod,
    ] =
        useState(
            "Cash"
        );


    const [
        paying,
        setPaying,
    ] =
        useState(
            false
        );


    /*
    ============================================================
    UI
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
        printing,
        setPrinting,
    ] =
        useState(
            false
        );


    /*
    ============================================================
    PRINT CHOICE
    ============================================================

    Printing is intentionally split into two independent paths:

    RECEIPT
    -> uses the existing backend printOrder() action
    -> sends the order to the configured thermal printer

    A4 / PDF
    -> loads the saved order from the backend
    -> opens the clean A4 checklist in the browser print dialog
    -> does NOT call printOrder(), so it does not trigger the
       thermal printer
    ============================================================
    */

    const [
        printChoiceOrder,
        setPrintChoiceOrder,
    ] =
        useState(
            null
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
                    result.filter(
                        (
                            product
                        ) =>
                            product.isActive !==
                            false
                    )
                );

            },
            []
        );


    /*
    ============================================================
    LOAD ACTIVE BRANCH
    ============================================================
    */

    const loadActiveBranch =
        useCallback(
            async () => {

                const branch =
                    await branchService
                        .getActiveBranch();


                setActiveBranch(
                    branch
                );

            },
            []
        );


    /*
    ============================================================
    LOAD ORDERS
    ============================================================
    */

    const loadOrders =
        useCallback(
            async ({
                status =
                    statusFilter,

                search =
                    historySearch,
            } = {}) => {

                const result =
                    await bulkOrderService
                        .getOrders({

                            status,

                            search,

                            limit:
                                200,

                        });


                setOrders(
                    Array.isArray(
                        result
                    )
                        ? result
                        : []
                );

            },
            [
                historySearch,
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

                            loadProducts(),

                            loadActiveBranch(),

                            loadOrders({
                                status:
                                    "",

                                search:
                                    "",
                            }),

                        ]);

                    }
                    catch (
                        error
                    ) {

                        showToast(
                            getErrorMessage(
                                error,
                                "Unable to load Bulk Orders."
                            ),
                            "error"
                        );

                    }
                    finally {

                        setLoading(
                            false
                        );

                    }

                };


            load();

        },
        [
            loadProducts,
            loadActiveBranch,
            loadOrders,
            showToast,
        ]
    );


    /*
    ============================================================
    RESTORE UNSAVED LOCAL ORDER
    ============================================================

    Wait until the active branch and products are loaded before
    restoring. Product data is used to refresh pricing and unit
    information while retaining the user's unfinished quantities.
    ============================================================
    */

    useEffect(
        () => {

            if (
                loading ||
                localDraftRestoredRef.current
            ) {

                return;

            }


            localDraftRestoredRef.current =
                true;


            const draft =
                readBulkOrderLocalDraft(
                    activeBranch
                );


            if (
                !draft
            ) {

                return;

            }


            const restoredMode =
                draft.pricingMode ===
                    "RETAIL"
                    ? "RETAIL"
                    : "WHOLESALE";


            setPricingMode(
                restoredMode
            );


            setCustomerName(
                String(
                    draft.customerName ||
                    ""
                )
            );


            setNotes(
                String(
                    draft.notes ||
                    ""
                )
            );


            /*
            A locally persisted editor can remember the backend
            order metadata when the user was editing an already
            saved order. This means Update Order continues to
            target the same order after navigating away.

            Completed/cancelled orders are not restored as an
            editable local draft.
            */

            const restoredOrder =
                draft.currentOrder &&
                ![
                    "COMPLETED",
                    "CANCELLED",
                ].includes(
                    draft.currentOrder.status
                )
                    ? draft.currentOrder
                    : null;


            setCurrentOrder(
                restoredOrder
            );


            const restoredItems =
                (
                    Array.isArray(
                        draft.items
                    )
                        ? draft.items
                        : []
                )
                    .map(
                        (
                            savedItem
                        ) => {

                            const id =
                                String(
                                    savedItem.productId ||
                                    ""
                                );


                            if (
                                !id
                            ) {

                                return null;

                            }


                            const product =
                                products.find(
                                    (
                                        candidate
                                    ) =>
                                        getProductId(
                                            candidate
                                        ) ===
                                        id
                                );


                            const quantity =
                                Math.max(
                                    1,
                                    Math.floor(
                                        Number(
                                            savedItem.quantity
                                        ) ||
                                        1
                                    )
                                );


                            const pricing =
                                (
                                    Array.isArray(
                                        product?.pricing
                                    ) &&
                                    product.pricing.length >
                                        0
                                )
                                    ? product.pricing
                                    : (
                                        savedItem.pricing ||
                                        []
                                    );


                            const baseUnit =
                                product?.baseUnit ||
                                savedItem.baseUnit ||
                                "Piece";


                            const livePricing =
                                calculateLivePricing(
                                    pricing,
                                    quantity,
                                    restoredMode
                                );


                            const sortInfo =
                                getLocalSortInfo(
                                    baseUnit
                                );


                            return {

                                productId:
                                    id,

                                barcode:
                                    product?.barcode ||
                                    savedItem.barcode ||
                                    "",

                                name:
                                    product?.name ||
                                    savedItem.name ||
                                    "Product",

                                baseUnit,

                                quantity,

                                pricing,

                                pricingBreakdown:
                                    livePricing
                                        .pricingBreakdown,

                                effectiveUnitPrice:
                                    livePricing
                                        .effectiveUnitPrice,

                                lineTotal:
                                    livePricing
                                        .lineTotal,

                                sortGroup:
                                    sortInfo.group,

                                sortPriority:
                                    sortInfo.priority,

                            };

                        }
                    )
                    .filter(
                        Boolean
                    );


            setItems(
                restoredItems
            );


            /*
            Keep the user's last page inside Bulk Orders as well.
            If they left while viewing History, returning to this
            page will still preserve the unfinished New Order.
            */

            if (
                draft.tab ===
                    "history" ||
                draft.tab ===
                    "new"
            ) {

                setTab(
                    draft.tab
                );

            }


            if (
                restoredItems.length >
                    0 ||
                draft.customerName ||
                draft.notes
            ) {

                showToast(
                    "Unfinished Bulk Order restored."
                );

            }

        },
        [
            loading,
            activeBranch,
            products,
            showToast,
        ]
    );


    /*
    ============================================================
    AUTO-SAVE UNSAVED ORDER LOCALLY
    ============================================================

    This does not create/update anything in MongoDB. It only
    preserves the editor in localStorage until the user explicitly
    saves or clears it.
    ============================================================
    */

    useEffect(
        () => {

            if (
                loading ||
                !localDraftRestoredRef.current
            ) {

                return;

            }


            const hasLocalWork =
                items.length >
                    0 ||
                String(
                    customerName ||
                    ""
                ).trim() !==
                    "" ||
                String(
                    notes ||
                    ""
                ).trim() !==
                    "";


            /*
            A completed/cancelled order is not an unfinished
            editor and should never be persisted as one.
            */

            if (
                currentOrder?.status ===
                    "COMPLETED" ||
                currentOrder?.status ===
                    "CANCELLED"
            ) {

                clearBulkOrderLocalDraft(
                    activeBranch
                );


                return;

            }


            if (
                !hasLocalWork
            ) {

                clearBulkOrderLocalDraft(
                    activeBranch
                );


                return;

            }


            const timer =
                window.setTimeout(
                    () => {

                        writeBulkOrderLocalDraft(
                            activeBranch,
                            {
                                version:
                                    1,

                                savedAt:
                                    new Date()
                                        .toISOString(),

                                tab,

                                pricingMode,

                                customerName,

                                notes,

                                currentOrder:
                                    currentOrder
                                        ? {
                                            _id:
                                                currentOrder._id,

                                            orderNumber:
                                                currentOrder.orderNumber,

                                            revision:
                                                currentOrder.revision,

                                            status:
                                                currentOrder.status,

                                            pricingMode:
                                                currentOrder.pricingMode,
                                        }
                                        : null,

                                items:
                                    items.map(
                                        (
                                            item
                                        ) => ({

                                            productId:
                                                item.productId,

                                            barcode:
                                                item.barcode ||
                                                "",

                                            name:
                                                item.name ||
                                                "Product",

                                            baseUnit:
                                                item.baseUnit ||
                                                "Piece",

                                            quantity:
                                                Number(
                                                    item.quantity ||
                                                    1
                                                ),

                                            pricing:
                                                Array.isArray(
                                                    item.pricing
                                                )
                                                    ? item.pricing
                                                    : [],

                                        })
                                    ),
                            }
                        );

                    },
                    150
                );


            return () => {

                window.clearTimeout(
                    timer
                );

            };

        },
        [
            loading,
            activeBranch,
            tab,
            pricingMode,
            customerName,
            notes,
            currentOrder,
            items,
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


                const source =
                    query

                        ? products.filter(
                            (
                                product
                            ) => {

                                const name =
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


                                return (
                                    name.includes(
                                        query
                                    ) ||
                                    barcode.includes(
                                        query
                                    )
                                );

                            }
                        )

                        : products;


                return source.slice(
                    0,
                    100
                );

            },
            [
                products,
                productSearch,
            ]
        );


    /*
    ============================================================
    PRODUCT HIGHLIGHT
    ============================================================
    */

    useEffect(
        () => {

            setHighlightedProductIndex(
                (
                    current
                ) => {

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


            node?.scrollIntoView({
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
    SORTED ITEMS
    ============================================================
    */

    const sortedItems =
        useMemo(
            () => {

                return sortOrderItems(
                    items
                );

            },
            [
                items,
            ]
        );


    /*
    ============================================================
    TOTAL QUANTITY
    ============================================================
    */

    const totalQuantity =
        useMemo(
            () => {

                return items.reduce(
                    (
                        sum,
                        item
                    ) => {

                        return (
                            sum +
                            Number(
                                item.quantity ||
                                0
                            )
                        );

                    },
                    0
                );

            },
            [
                items,
            ]
        );


    /*
    ============================================================
    DISPLAYED TOTAL
    ============================================================
    */

    const displayedTotal =
        useMemo(
            () => {

                return items.reduce(
                    (
                        sum,
                        item
                    ) => {

                        const lineTotal =
                            Number(
                                item.lineTotal
                            );


                        if (
                            !Number.isFinite(
                                lineTotal
                            )
                        ) {

                            return sum;

                        }


                        return (
                            sum +
                            lineTotal
                        );

                    },
                    0
                );

            },
            [
                items,
            ]
        );


    /*
    ============================================================
    LOCKED ORDER
    ============================================================
    */

    const locked =
        currentOrder?.status ===
            "COMPLETED" ||
        currentOrder?.status ===
            "CANCELLED";


    /*
    ============================================================
    SEARCH FOCUS
    ============================================================
    */

    const focusSearch =
        useCallback(
            () => {

                requestAnimationFrame(
                    () => {

                        searchInputRef.current
                            ?.focus();

                    }
                );

            },
            []
        );


    useEffect(
        () => {

            if (
                tab !==
                    "new" ||
                loading ||
                quantityProduct ||
                locked
            ) {

                return;

            }


            focusSearch();

        },
        [
            tab,
            loading,
            quantityProduct,
            locked,
            focusSearch,
        ]
    );


    /*
    ============================================================
    QUANTITY POPUP FOCUS
    ============================================================
    */

    useEffect(
        () => {

            if (
                !quantityProduct
            ) {

                return;

            }


            requestAnimationFrame(
                () => {

                    quantityInputRef.current
                        ?.focus();


                    quantityInputRef.current
                        ?.select();

                }
            );

        },
        [
            quantityProduct,
        ]
    );


    /*
    ============================================================
    RECALCULATE ALL ITEMS
    ============================================================

    Called when Retail / Wholesale mode changes.
    ============================================================
    */

    const recalculateAllItems =
        useCallback(
            (
                mode
            ) => {

                setItems(
                    (
                        current
                    ) =>
                        current.map(
                            (
                                item
                            ) => {

                                const product =
                                    products.find(
                                        (
                                            candidate
                                        ) =>
                                            getProductId(
                                                candidate
                                            ) ===
                                            item.productId
                                    );


                                const pricing =
                                    (
                                        Array.isArray(
                                            item.pricing
                                        ) &&
                                        item.pricing.length >
                                            0
                                    )

                                        ? item.pricing

                                        : (
                                            product?.pricing ||
                                            []
                                        );


                                const livePricing =
                                    calculateLivePricing(
                                        pricing,
                                        item.quantity,
                                        mode
                                    );


                                const sortInfo =
                                    getLocalSortInfo(
                                        item.baseUnit
                                    );


                                return {

                                    ...item,

                                    pricing,

                                    pricingBreakdown:
                                        livePricing
                                            .pricingBreakdown,

                                    effectiveUnitPrice:
                                        livePricing
                                            .effectiveUnitPrice,

                                    lineTotal:
                                        livePricing
                                            .lineTotal,

                                    sortGroup:
                                        sortInfo.group,

                                    sortPriority:
                                        sortInfo.priority,

                                };

                            }
                        )
                );

            },
            [
                products,
            ]
        );


    /*
    ============================================================
    CHANGE PRICING MODE
    ============================================================
    */

    const changePricingMode =
        (
            mode
        ) => {

            if (
                locked
            ) {

                return;

            }


            if (
                mode ===
                pricingMode
            ) {

                return;

            }


            setPricingMode(
                mode
            );


            recalculateAllItems(
                mode
            );

        };


    /*
    ============================================================
    OPEN QUANTITY POPUP
    ============================================================
    */

    const openQuantityPopup =
        (
            product
        ) => {

            if (
                locked
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


            const existing =
                items.find(
                    (
                        item
                    ) =>
                        item.productId ===
                        id
                );


            setQuantityProduct(
                product
            );


            setQuantityValue(
                String(
                    existing?.quantity ||
                    1
                )
            );

        };


    /*
    ============================================================
    QUANTITY POPUP LIVE PRICE
    ============================================================
    */

    const quantityPreview =
        useMemo(
            () => {

                if (
                    !quantityProduct
                ) {

                    return null;

                }


                return calculateLivePricing(
                    quantityProduct.pricing,
                    quantityValue,
                    pricingMode
                );

            },
            [
                quantityProduct,
                quantityValue,
                pricingMode,
            ]
        );


    /*
    ============================================================
    CONFIRM QUANTITY
    ============================================================
    */

    const confirmQuantity =
        () => {

            if (
                !quantityProduct
            ) {

                return;

            }


            const id =
                getProductId(
                    quantityProduct
                );


            if (
                !id
            ) {

                return;

            }


            const quantity =
                Math.max(
                    1,
                    Math.floor(
                        Number(
                            quantityValue
                        ) ||
                        1
                    )
                );


            const sortInfo =
                getLocalSortInfo(
                    quantityProduct.baseUnit
                );


            const livePricing =
                calculateLivePricing(
                    quantityProduct.pricing,
                    quantity,
                    pricingMode
                );


            setItems(
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

                        return current.map(
                            (
                                item
                            ) => {

                                if (
                                    item.productId !==
                                    id
                                ) {

                                    return item;

                                }


                                return {

                                    ...item,

                                    quantity,

                                    pricing:
                                        quantityProduct.pricing ||
                                        item.pricing ||
                                        [],

                                    pricingBreakdown:
                                        livePricing
                                            .pricingBreakdown,

                                    effectiveUnitPrice:
                                        livePricing
                                            .effectiveUnitPrice,

                                    lineTotal:
                                        livePricing
                                            .lineTotal,

                                    sortGroup:
                                        sortInfo.group,

                                    sortPriority:
                                        sortInfo.priority,

                                };

                            }
                        );

                    }


                    return [
                        ...current,
                        {
                            productId:
                                id,

                            barcode:
                                quantityProduct.barcode ||
                                "",

                            name:
                                quantityProduct.name ||
                                "Product",

                            baseUnit:
                                quantityProduct.baseUnit ||
                                "Piece",

                            quantity,

                            pricing:
                                quantityProduct.pricing ||
                                [],

                            pricingBreakdown:
                                livePricing
                                    .pricingBreakdown,

                            effectiveUnitPrice:
                                livePricing
                                    .effectiveUnitPrice,

                            lineTotal:
                                livePricing
                                    .lineTotal,

                            sortGroup:
                                sortInfo.group,

                            sortPriority:
                                sortInfo.priority,
                        },
                    ];

                }
            );


            setQuantityProduct(
                null
            );


            setQuantityValue(
                "1"
            );


            setProductSearch(
                ""
            );


            focusSearch();

        };


    /*
    ============================================================
    SEARCH KEYBOARD / BARCODE
    ============================================================
    */

    const handleSearchKeyDown =
        (
            event
        ) => {

            if (
                locked
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
                    (
                        current
                    ) =>
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
                    (
                        current
                    ) =>
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


            const exactBarcode =
                query

                    ? products.find(
                        (
                            product
                        ) =>
                            String(
                                product.barcode ||
                                ""
                            ).trim() ===
                            query
                    )

                    : null;


            const selectedProduct =
                exactBarcode ||
                filteredProducts[
                    highlightedProductIndex
                ] ||
                filteredProducts[
                    0
                ];


            if (
                selectedProduct
            ) {

                openQuantityPopup(
                    selectedProduct
                );

            }

        };


    /*
    ============================================================
    CHANGE ITEM QUANTITY
    ============================================================
    */

    const changeQuantity =
        (
            id,
            value
        ) => {

            const quantity =
                Math.max(
                    1,
                    Math.floor(
                        Number(
                            value
                        ) ||
                        1
                    )
                );


            setItems(
                (
                    current
                ) =>
                    current.map(
                        (
                            item
                        ) => {

                            if (
                                item.productId !==
                                id
                            ) {

                                return item;

                            }


                            const product =
                                products.find(
                                    (
                                        candidate
                                    ) =>
                                        getProductId(
                                            candidate
                                        ) ===
                                        id
                                );


                            const pricing =
                                (
                                    Array.isArray(
                                        item.pricing
                                    ) &&
                                    item.pricing.length >
                                        0
                                )

                                    ? item.pricing

                                    : (
                                        product?.pricing ||
                                        []
                                    );


                            const livePricing =
                                calculateLivePricing(
                                    pricing,
                                    quantity,
                                    pricingMode
                                );


                            const sortInfo =
                                getLocalSortInfo(
                                    item.baseUnit
                                );


                            return {

                                ...item,

                                quantity,

                                pricing,

                                pricingBreakdown:
                                    livePricing
                                        .pricingBreakdown,

                                effectiveUnitPrice:
                                    livePricing
                                        .effectiveUnitPrice,

                                lineTotal:
                                    livePricing
                                        .lineTotal,

                                sortGroup:
                                    sortInfo.group,

                                sortPriority:
                                    sortInfo.priority,

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
            id
        ) => {

            setItems(
                (
                    current
                ) =>
                    current.filter(
                        (
                            item
                        ) =>
                            item.productId !==
                            id
                    )
            );

        };


    /*
    ============================================================
    BUILD PAYLOAD
    ============================================================
    */

    const buildPayload =
        (
            status
        ) => {

            return {

                customerName:
                    String(
                        customerName ||
                        ""
                    )
                        .trim(),

                notes:
                    String(
                        notes ||
                        ""
                    )
                        .trim(),

                ...(
                    status
                        ? {
                            status,
                        }
                        : {}
                ),

                /*
                Only the pricing MODE is sent.

                Product prices, line totals and pricing
                breakdowns remain backend-authoritative.
                */

                pricingMode,

                items:
                    items.map(
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
    HYDRATE ORDER
    ============================================================
    */

    const hydrateOrder =
        (
            order
        ) => {

            setCurrentOrder(
                order
            );


            setPricingMode(
                order?.pricingMode ===
                    "WHOLESALE"
                    ? "WHOLESALE"
                    : "RETAIL"
            );


            setCustomerName(
                order.customerName ||
                ""
            );


            setNotes(
                order.notes ||
                ""
            );


            setItems(
                (
                    order.items ||
                    []
                ).map(
                    (
                        item
                    ) => {

                        const id =
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
                                    id
                            );


                        const pricing =
                            currentProduct?.pricing ||
                            [];


                        /*
                        Use the frontend's corrected classification
                        rather than trusting an older stored
                        Bottle/Sachet BULK classification.
                        */

                        const sortInfo =
                            getLocalSortInfo(
                                item.baseUnit ||
                                currentProduct?.baseUnit
                            );


                        return {

                            productId:
                                id,

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

                            quantity:
                                Number(
                                    item.quantity ||
                                    1
                                ),

                            pricing,

                            pricingBreakdown:
                                item.pricingBreakdown ||
                                [],

                            effectiveUnitPrice:
                                item.effectiveUnitPrice,

                            lineTotal:
                                item.lineTotal,

                            sortGroup:
                                sortInfo.group,

                            sortPriority:
                                sortInfo.priority,

                        };

                    }
                )
            );

        };


    /*
    ============================================================
    RESET ORDER
    ============================================================
    */

    const resetOrder =
        (
            {
                clearLocalDraft =
                    true,
            } = {}
        ) => {

            if (
                clearLocalDraft
            ) {

                clearBulkOrderLocalDraft(
                    activeBranch
                );

            }


            setCurrentOrder(
                null
            );


            setCustomerName(
                ""
            );


            setNotes(
                ""
            );


            setItems(
                []
            );


            setProductSearch(
                ""
            );


            setQuantityProduct(
                null
            );


            setQuantityValue(
                "1"
            );


            /*
            Default new Bulk Orders to Wholesale because this
            page is specifically intended for larger retailer
            orders.

            You can change this to "RETAIL" if preferred.
            */

            setPricingMode(
                "WHOLESALE"
            );


            focusSearch();

        };


    /*
    ============================================================
    SAVE ORDER
    ============================================================
    */

    const saveOrder =
        async () => {

            if (
                items.length ===
                0
            ) {

                showToast(
                    "Add at least one product.",
                    "error"
                );


                return;

            }


            if (
                locked
            ) {

                showToast(
                    "This order can no longer be edited.",
                    "error"
                );


                return;

            }


            setSaving(
                true
            );


            try {

                let order;


                if (
                    currentOrder?._id
                ) {

                    order =
                        await bulkOrderService
                            .updateOrder(
                                currentOrder._id,
                                buildPayload()
                            );

                }
                else {

                    order =
                        await bulkOrderService
                            .createOrder(
                                buildPayload(
                                    "SAVED"
                                )
                            );

                }


                if (
                    order.status ===
                    "DRAFT"
                ) {

                    order =
                        await bulkOrderService
                            .saveDraft(
                                order._id
                            );

                }


                hydrateOrder(
                    order
                );


                /*
                The editor is now safely stored by the backend,
                so the temporary browser copy is no longer needed.
                */

                clearBulkOrderLocalDraft(
                    activeBranch
                );


                /*
                The current order remains visible after saving, but it is no
                longer an *unsaved local draft*. The next actual edit will
                naturally be persisted again by the autosave effect.
                */

                await loadOrders();


                showToast(
                    currentOrder?._id
                        ? "Bulk Order updated."
                        : "Bulk Order saved."
                );

            }
            catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to save Bulk Order."
                    ),
                    "error"
                );

            }
            finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ============================================================
    OPEN PRINT CHOICE
    ============================================================
    */

    const openPrintChoice =
        (
            order
        ) => {

            if (
                !order?._id
            ) {

                showToast(
                    "Save the order before printing.",
                    "error"
                );


                return;

            }


            if (
                order.status ===
                "DRAFT"
            ) {

                showToast(
                    "Save the draft before printing.",
                    "error"
                );


                return;

            }


            if (
                order.status ===
                "CANCELLED"
            ) {

                showToast(
                    "Cancelled orders cannot be printed.",
                    "error"
                );


                return;

            }


            setPrintChoiceOrder(
                order
            );

        };


    /*
    ============================================================
    CLOSE PRINT CHOICE
    ============================================================
    */

    const closePrintChoice =
        () => {

            if (
                printing
            ) {

                return;

            }


            setPrintChoiceOrder(
                null
            );

        };


    /*
    ============================================================
    SYNC REFRESHED ORDER
    ============================================================
    */

    const syncRefreshedOrder =
        (
            order
        ) => {

            if (
                !order?._id
            ) {

                return;

            }


            if (
                currentOrder?._id ===
                order._id
            ) {

                hydrateOrder(
                    order
                );

            }


            if (
                selectedOrder?._id ===
                order._id
            ) {

                setSelectedOrder(
                    order
                );

            }

        };


    /*
    ============================================================
    PRINT THERMAL RECEIPT
    ============================================================

    This preserves the original Bulk Order thermal-print flow.
    The backend remains responsible for talking to the receipt
    printer and for its existing print-count / audit behavior.
    ============================================================
    */

    const printThermalReceipt =
        async () => {

            if (
                !printChoiceOrder?._id ||
                printing
            ) {

                return;

            }


            setPrinting(
                true
            );


            try {

                const updated =
                    await bulkOrderService
                        .printOrder(
                            printChoiceOrder._id
                        );


                syncRefreshedOrder(
                    updated
                );


                setPrintChoiceOrder(
                    null
                );


                await loadOrders();


                showToast(
                    "Bulk Order receipt sent to the thermal printer."
                );

            }
            catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to print the Bulk Order receipt."
                    ),
                    "error"
                );

            }
            finally {

                setPrinting(
                    false
                );

            }

        };


    /*
    ============================================================
    PRINT A4 / SAVE AS PDF
    ============================================================

    IMPORTANT:

    This path intentionally does NOT call printOrder(). Calling
    printOrder() would also activate the thermal printer.

    Instead, the latest saved order is fetched and rendered into
    the clean A4 checklist. The browser print dialog then allows
    either physical A4 printing or Save as PDF.
    ============================================================
    */

    const printA4Order =
        async () => {

            if (
                !printChoiceOrder?._id ||
                printing
            ) {

                return;

            }


            const printWindow =
                window.open(
                    "",
                    "_blank"
                );


            if (
                !printWindow
            ) {

                showToast(
                    "The print window was blocked. Allow pop-ups and try again.",
                    "error"
                );


                return;

            }


            try {

                printWindow.opener =
                    null;

            }
            catch {

                // Some browsers do not allow changing opener.

            }


            setPrinting(
                true
            );


            try {

                const freshOrder =
                    await bulkOrderService
                        .getOrderById(
                            printChoiceOrder._id
                        );


                syncRefreshedOrder(
                    freshOrder
                );


                openBulkOrderPrintWindow(
                    printWindow,
                    freshOrder,
                    activeBranch
                );


                setPrintChoiceOrder(
                    null
                );


                showToast(
                    "A4 print view opened. Choose your printer or Save as PDF."
                );

            }
            catch (
                error
            ) {

                printWindow.close();


                showToast(
                    getErrorMessage(
                        error,
                        "Unable to prepare the A4 Bulk Order."
                    ),
                    "error"
                );

            }
            finally {

                setPrinting(
                    false
                );

            }

        };


    /*
    ============================================================
    OPEN HISTORY ORDER
    ============================================================
    */

    const openOrder =
        async (
            order
        ) => {

            try {

                const fullOrder =
                    await bulkOrderService
                        .getOrderById(
                            order._id
                        );


                setSelectedOrder(
                    fullOrder
                );

            }
            catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to load Bulk Order."
                    ),
                    "error"
                );

            }

        };


    /*
    ============================================================
    EDIT HISTORY ORDER
    ============================================================
    */

    const editOrder =
        (
            order
        ) => {

            if (
                ![
                    "DRAFT",
                    "SAVED",
                ].includes(
                    order.status
                )
            ) {

                return;

            }


            hydrateOrder(
                order
            );


            setSelectedOrder(
                null
            );


            setTab(
                "new"
            );


            focusSearch();

        };


    /*
    ============================================================
    DUPLICATE ORDER
    ============================================================
    */

    const duplicateOrder =
        async (
            order
        ) => {

            try {

                const copy =
                    await bulkOrderService
                        .duplicateOrder(
                            order._id
                        );


                hydrateOrder(
                    copy
                );


                setSelectedOrder(
                    null
                );


                setTab(
                    "new"
                );


                await loadOrders();


                showToast(
                    "Bulk Order duplicated as a new draft."
                );

            }
            catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to duplicate Bulk Order."
                    ),
                    "error"
                );

            }

        };


    /*
    ============================================================
    CANCEL ORDER
    ============================================================
    */

    const cancelOrder =
        async (
            order
        ) => {

            if (
                ![
                    "DRAFT",
                    "SAVED",
                ].includes(
                    order.status
                )
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    `Cancel ${order.orderNumber}?`
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                const cancelled =
                    await bulkOrderService
                        .cancelOrder(
                            order._id
                        );


                if (
                    currentOrder?._id ===
                    cancelled._id
                ) {

                    hydrateOrder(
                        cancelled
                    );

                }


                setSelectedOrder(
                    null
                );


                await loadOrders();


                showToast(
                    "Bulk Order cancelled."
                );

            }
            catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to cancel Bulk Order."
                    ),
                    "error"
                );

            }

        };


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
                    min-h-[70vh]
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

    /*
    ============================================================
    PAYMENT MODAL ACTIONS
    ============================================================
    */

    const openPaymentModal =
        (
            order
        ) => {

            if (
                order?.status !==
                "SAVED"
            ) {

                return;

            }


            const total =
                Number(
                    order.totalAmount ||
                    0
                );


            setPaymentOrder(
                order
            );


            setPaymentMethod(
                "Cash"
            );


            setPaymentAmount(
                Number.isFinite(
                    total
                )
                    ? total.toFixed(
                        2
                    )
                    : ""
            );

        };


    const closePaymentModal =
        () => {

            if (
                paying
            ) {

                return;

            }


            setPaymentOrder(
                null
            );


            setPaymentAmount(
                ""
            );


            setPaymentMethod(
                "Cash"
            );

        };


    const payBulkOrder =
        async () => {

            if (
                !paymentOrder?._id ||
                paymentOrder.status !==
                    "SAVED" ||
                paying
            ) {

                return;

            }


            const total =
                Number(
                    paymentOrder.totalAmount ||
                    0
                );


            const tendered =
                Number(
                    paymentAmount
                );


            if (
                !Number.isFinite(
                    tendered
                ) ||
                tendered <
                    0
            ) {

                showToast(
                    "Enter a valid payment amount.",
                    "error"
                );


                return;

            }


            if (
                tendered <
                total
            ) {

                showToast(
                    `Payment is short by ${formatMoney(
                        total -
                        tendered
                    )}.`,
                    "error"
                );


                return;

            }


            setPaying(
                true
            );


            try {

                const result =
                    await bulkOrderService
                        .payOrder(
                            paymentOrder._id,
                            {
                                payment:
                                    tendered,

                                paymentMethod,

                                customerId:
                                    null,

                                loyaltyPointsToRedeem:
                                    0,
                            }
                        );


                const completedOrder =
                    result?.order ||
                    result?.bulkOrder ||
                    (
                        result?.status ===
                        "COMPLETED"
                            ? result
                            : null
                    );


                setPaymentOrder(
                    null
                );


                setPaymentAmount(
                    ""
                );


                if (
                    completedOrder
                ) {

                    setSelectedOrder(
                        completedOrder
                    );


                    if (
                        currentOrder?._id ===
                        completedOrder._id
                    ) {

                        hydrateOrder(
                            completedOrder
                        );

                    }

                }
                else {

                    setSelectedOrder(
                        null
                    );

                }


                await loadOrders();


                showToast(
                    result?.alreadyCompleted
                        ? "Bulk Order was already paid."
                        : "Bulk Order paid and completed."
                );

            }
            catch (
                error
            ) {

                showToast(
                    getErrorMessage(
                        error,
                        "Unable to process Bulk Order payment."
                    ),
                    "error"
                );

            }
            finally {

                setPaying(
                    false
                );

            }

        };


    return (

        <div
            className={`
                flex
                min-h-0
                flex-col
                gap-3
                overflow-hidden
                text-[13px]

                ${
                    isFullscreen
                        ? "h-screen p-4"
                        : "h-[calc(100dvh-7rem)] pb-1"
                }
            `}
        >

            {/* =================================================
                FLOATING FULLSCREEN CONTROL
            ================================================= */}

            <button
                type="button"
                onClick={
                    toggleFullscreen
                }
                className={`
                    fixed
                    right-3
                    z-[850]
                    btn
                    btn-circle
                    btn-sm
                    bg-base-100
                    border
                    border-base-300
                    shadow-lg
                    hover:shadow-xl

                    ${
                        isFullscreen
                            ? "top-3"
                            : "top-[76px]"
                    }
                `}
                title={
                    isFullscreen
                        ? "Exit Full Screen"
                        : "Enter Full Screen"
                }
                aria-label={
                    isFullscreen
                        ? "Exit Full Screen"
                        : "Enter Full Screen"
                }
            >

                <span
                    className="
                        text-lg
                        leading-none
                    "
                >

                    {
                        isFullscreen
                            ? "⤢"
                            : "⛶"
                    }

                </span>

            </button>

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
                                text-sm
                                font-semibold
                                shadow-xl

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
                    shrink-0
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

                        Bulk Orders

                    </div>


                    <div
                        className="
                            mt-0.5
                            text-[11px]
                            text-base-content/55
                        "
                    >

                        Build, revise and print large customer
                        orders without changing inventory.

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
                        onClick={() => {

                            setTab(
                                "new"
                            );

                        }}
                    >

                        New Order

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


                            loadOrders();

                        }}
                    >

                        Order History

                    </button>

                </div>

            </div>


            {/* =================================================
                NEW ORDER
            ================================================= */}

            {
                tab ===
                "new" && (

                    <div
                        className="
                            grid
                            min-h-0
                            flex-1
                            grid-cols-1
                            gap-3
                            overflow-hidden
                            xl:grid-cols-12
                        "
                    >

                        {/* =====================================
                            LEFT SIDE
                        ===================================== */}

                        <div
                            className="
                                flex
                                min-h-0
                                flex-col
                                gap-3
                                overflow-hidden
                                xl:col-span-7
                            "
                        >

                            {/* =================================
                                ORDER INFORMATION
                            ================================= */}

                            <div
                                className="
                                    shrink-0
                                    rounded-2xl
                                    border
                                    border-base-300
                                    bg-base-100
                                    p-3
                                    shadow-sm
                                "
                            >

                                <div
                                    className="
                                        grid
                                        grid-cols-1
                                        gap-3
                                        md:grid-cols-12
                                    "
                                >

                                    {/* BRANCH */}

                                    <div
                                        className="
                                            md:col-span-3
                                        "
                                    >

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

                                            Branch

                                        </label>


                                        <div
                                            className="
                                                flex
                                                h-10
                                                items-center
                                                rounded-xl
                                                border
                                                border-base-300
                                                bg-base-200
                                                px-3
                                            "
                                        >

                                            <div
                                                className="
                                                    truncate
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

                                        </div>

                                    </div>


                                    {/* CUSTOMER */}

                                    <div
                                        className="
                                            md:col-span-5
                                        "
                                    >

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

                                            Customer

                                        </label>


                                        <input
                                            type="text"
                                            className="
                                                input
                                                input-bordered
                                                input-sm
                                                h-10
                                                w-full
                                            "
                                            placeholder="Customer / retailer name"
                                            value={
                                                customerName
                                            }
                                            disabled={
                                                locked
                                            }
                                            onChange={(
                                                event
                                            ) => {

                                                setCustomerName(
                                                    event.target.value
                                                );

                                            }}
                                        />

                                    </div>


                                    {/* PRICING MODE */}

                                    <div
                                        className="
                                            md:col-span-4
                                        "
                                    >

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

                                            Pricing Mode

                                        </label>


                                        <div
                                            className="
                                                grid
                                                h-10
                                                grid-cols-2
                                                overflow-hidden
                                                rounded-xl
                                                border
                                                border-base-300
                                                bg-base-200
                                                p-1
                                            "
                                        >

                                            <button
                                                type="button"
                                                disabled={
                                                    locked
                                                }
                                                className={`
                                                    rounded-lg
                                                    px-2
                                                    text-xs
                                                    font-bold
                                                    transition

                                                    ${
                                                        pricingMode ===
                                                        "RETAIL"

                                                            ? "bg-base-100 shadow-sm text-primary"

                                                            : "text-base-content/55 hover:text-base-content"
                                                    }
                                                `}
                                                onClick={() => {

                                                    changePricingMode(
                                                        "RETAIL"
                                                    );

                                                }}
                                            >

                                                Retail

                                            </button>


                                            <button
                                                type="button"
                                                disabled={
                                                    locked
                                                }
                                                className={`
                                                    rounded-lg
                                                    px-2
                                                    text-xs
                                                    font-bold
                                                    transition

                                                    ${
                                                        pricingMode ===
                                                        "WHOLESALE"

                                                            ? "bg-primary text-primary-content shadow-sm"

                                                            : "text-base-content/55 hover:text-base-content"
                                                    }
                                                `}
                                                onClick={() => {

                                                    changePricingMode(
                                                        "WHOLESALE"
                                                    );

                                                }}
                                            >

                                                Wholesale

                                            </button>

                                        </div>

                                    </div>

                                </div>


                                {/* PRICING EXPLANATION */}

                                <div
                                    className="
                                        mt-2
                                        flex
                                        flex-wrap
                                        items-center
                                        justify-between
                                        gap-2
                                    "
                                >

                                    <div
                                        className="
                                            text-[10px]
                                            text-base-content/50
                                        "
                                    >

                                        {
                                            pricingMode ===
                                            "WHOLESALE"

                                                ? "Wholesale: the best configured bulk rate applies immediately, even for quantity 1."

                                                : "Retail: normal quantity tiers activate automatically at their configured quantities."
                                        }

                                    </div>


                                    {
                                        currentOrder && (

                                            <div
                                                className="
                                                    flex
                                                    flex-wrap
                                                    items-center
                                                    gap-2
                                                    text-[10px]
                                                "
                                            >

                                                <span
                                                    className="
                                                        font-bold
                                                    "
                                                >

                                                    {
                                                        currentOrder.orderNumber
                                                    }

                                                </span>


                                                <span>

                                                    Rev{" "}

                                                    {
                                                        currentOrder.revision ||
                                                        1
                                                    }

                                                </span>


                                                <span
                                                    className={`
                                                        badge
                                                        badge-xs
                                                        ${getStatusBadge(
                                                            currentOrder.status
                                                        )}
                                                    `}
                                                >

                                                    {
                                                        currentOrder.status
                                                    }

                                                </span>

                                            </div>

                                        )
                                    }

                                </div>

                            </div>


                            {/* =================================
                                ADD PRODUCTS
                            ================================= */}

                            <div
                                className="
                                    flex
                                    min-h-0
                                    flex-1
                                    flex-col
                                    overflow-hidden
                                    rounded-2xl
                                    border
                                    border-base-300
                                    bg-base-100
                                    shadow-sm
                                "
                            >

                                <div
                                    className="
                                        shrink-0
                                        p-3
                                        pb-2
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            items-center
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

                                                Add Products

                                            </div>


                                            <div
                                                className="
                                                    text-[10px]
                                                    text-base-content/50
                                                "
                                            >

                                                Scan barcode or search by
                                                name · ↑/↓ navigate · Enter
                                                quantity · Esc clear

                                            </div>

                                        </div>


                                        <span
                                            className={`
                                                badge
                                                badge-sm
                                                font-bold

                                                ${
                                                    pricingMode ===
                                                    "WHOLESALE"

                                                        ? "badge-primary"

                                                        : "badge-ghost"
                                                }
                                            `}
                                        >

                                            {
                                                pricingMode ===
                                                "WHOLESALE"

                                                    ? "Wholesale"

                                                    : "Retail"
                                            }

                                        </span>

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
                                            mt-2
                                            h-10
                                            w-full
                                        "
                                        placeholder="Scan barcode or search product..."
                                        value={
                                            productSearch
                                        }
                                        disabled={
                                            locked
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

                                </div>


                                {/* PRODUCT LIST */}

                                <div
                                    className="
                                        mx-3
                                        mb-3
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
                                                        flex
                                                        min-h-[300px]
                                                        items-center
                                                        justify-center
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

                                                    const id =
                                                        getProductId(
                                                            product
                                                        );


                                                    const existing =
                                                        items.find(
                                                            (
                                                                item
                                                            ) =>
                                                                item.productId ===
                                                                id
                                                        );


                                                    const sortInfo =
                                                        getLocalSortInfo(
                                                            product.baseUnit
                                                        );


                                                    const oneUnitPrice =
                                                        calculateLivePricing(
                                                            product.pricing,
                                                            1,
                                                            pricingMode
                                                        );


                                                    return (

                                                        <button
                                                            key={
                                                                id
                                                            }
                                                            ref={(
                                                                node
                                                            ) => {

                                                                productResultRefs.current[
                                                                    index
                                                                ] =
                                                                    node;

                                                            }}
                                                            type="button"
                                                            disabled={
                                                                locked
                                                            }
                                                            className={`
                                                                flex
                                                                w-full
                                                                items-center
                                                                justify-between
                                                                gap-3
                                                                border-b
                                                                border-base-200
                                                                px-3
                                                                py-2
                                                                text-left
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
                                                            onMouseEnter={() => {

                                                                setHighlightedProductIndex(
                                                                    index
                                                                );

                                                            }}
                                                            onFocus={() => {

                                                                setHighlightedProductIndex(
                                                                    index
                                                                );

                                                            }}
                                                            onClick={() => {

                                                                openQuantityPopup(
                                                                    product
                                                                );

                                                            }}
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
                                                                    shrink-0
                                                                    text-right
                                                                "
                                                            >

                                                                {
                                                                    oneUnitPrice
                                                                        .lineTotal !==
                                                                    null && (

                                                                        <div
                                                                            className="
                                                                                text-xs
                                                                                font-black
                                                                            "
                                                                        >

                                                                            {
                                                                                formatMoney(
                                                                                    oneUnitPrice
                                                                                        .lineTotal
                                                                                )
                                                                            }

                                                                        </div>

                                                                    )
                                                                }


                                                                <div
                                                                    className="
                                                                        text-[10px]
                                                                        font-semibold
                                                                    "
                                                                >

                                                                    {
                                                                        product.baseUnit ||
                                                                        "Piece"
                                                                    }

                                                                </div>


                                                                <div
                                                                    className={`
                                                                        text-[9px]
                                                                        font-bold

                                                                        ${
                                                                            sortInfo.group ===
                                                                            "PIECE"

                                                                                ? "text-info"

                                                                                : "text-primary"
                                                                        }
                                                                    `}
                                                                >

                                                                    {
                                                                        sortInfo.group ===
                                                                        "PIECE"

                                                                            ? "PIECE"

                                                                            : "BULK / PACKAGE"
                                                                    }

                                                                </div>


                                                                {
                                                                    existing && (

                                                                        <div
                                                                            className="
                                                                                text-[9px]
                                                                                font-bold
                                                                                text-success
                                                                            "
                                                                        >

                                                                            Added ×{" "}

                                                                            {
                                                                                existing.quantity
                                                                            }

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
                            RIGHT SIDE - ORDER ITEMS
                        ===================================== */}

                        <div
                            className="
                                min-h-0
                                overflow-hidden
                                xl:col-span-5
                            "
                        >

                            <div
                                className="
                                    flex
                                    h-full
                                    min-h-0
                                    flex-col
                                    overflow-hidden
                                    rounded-2xl
                                    border
                                    border-base-300
                                    bg-base-100
                                    shadow-sm
                                "
                            >

                                {/* CART HEADER */}

                                <div
                                    className="
                                        flex
                                        shrink-0
                                        items-start
                                        justify-between
                                        gap-3
                                        border-b
                                        border-base-200
                                        p-3
                                    "
                                >

                                    <div>

                                        <div
                                            className="
                                                text-sm
                                                font-black
                                            "
                                        >

                                            Order Items

                                        </div>


                                        <div
                                            className="
                                                mt-0.5
                                                text-[10px]
                                                text-base-content/45
                                            "
                                        >

                                            Packages first · Single-item
                                            units such as Bottle and Sachet
                                            stay under Piece Items.

                                        </div>

                                    </div>


                                    <div
                                        className="
                                            flex
                                            items-center
                                            gap-1.5
                                        "
                                    >

                                        <span
                                            className={`
                                                badge
                                                badge-sm
                                                font-bold

                                                ${
                                                    pricingMode ===
                                                    "WHOLESALE"

                                                        ? "badge-primary"

                                                        : "badge-ghost"
                                                }
                                            `}
                                        >

                                            {
                                                pricingMode ===
                                                "WHOLESALE"

                                                    ? "Wholesale"

                                                    : "Retail"
                                            }

                                        </span>


                                        {
                                            currentOrder && (

                                                <span
                                                    className={`
                                                        badge
                                                        badge-sm
                                                        font-bold
                                                        ${getStatusBadge(
                                                            currentOrder.status
                                                        )}
                                                    `}
                                                >

                                                    {
                                                        currentOrder.status
                                                    }

                                                </span>

                                            )
                                        }

                                    </div>

                                </div>


                                {/* ITEMS */}

                                <div
                                    className="
                                        min-h-0
                                        flex-1
                                        overflow-y-auto
                                        overscroll-contain
                                    "
                                >

                                    {
                                        sortedItems.length ===
                                        0
                                            ? (

                                                <div
                                                    className="
                                                        flex
                                                        h-full
                                                        min-h-[350px]
                                                        items-center
                                                        justify-center
                                                        p-10
                                                        text-center
                                                        text-sm
                                                        text-base-content/45
                                                    "
                                                >

                                                    No products added yet.

                                                </div>

                                            )
                                            : sortedItems.map(
                                                (
                                                    item,
                                                    index
                                                ) => {

                                                    const currentSort =
                                                        getLocalSortInfo(
                                                            item.baseUnit
                                                        );


                                                    const previousItem =
                                                        index >
                                                            0
                                                            ? sortedItems[
                                                                index -
                                                                1
                                                            ]
                                                            : null;


                                                    const previousSort =
                                                        previousItem

                                                            ? getLocalSortInfo(
                                                                previousItem.baseUnit
                                                            )

                                                            : null;


                                                    const showSection =
                                                        !previousSort ||
                                                        previousSort.group !==
                                                            currentSort.group;


                                                    return (

                                                        <div
                                                            key={
                                                                item.productId
                                                            }
                                                        >

                                                            {
                                                                showSection && (

                                                                    <div
                                                                        className="
                                                                            sticky
                                                                            top-0
                                                                            z-[1]
                                                                            border-b
                                                                            border-base-200
                                                                            bg-base-200
                                                                            px-3
                                                                            py-1.5
                                                                            text-[9px]
                                                                            font-black
                                                                            uppercase
                                                                            tracking-wide
                                                                            text-base-content/55
                                                                        "
                                                                    >

                                                                        {
                                                                            currentSort.group ===
                                                                            "PIECE"

                                                                                ? "Piece Items"

                                                                                : "Bulk / Package Items"
                                                                        }

                                                                    </div>

                                                                )
                                                            }


                                                            <div
                                                                className="
                                                                    border-b
                                                                    border-base-200
                                                                    p-3
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
                                                                                flex
                                                                                flex-wrap
                                                                                items-center
                                                                                gap-1.5
                                                                                text-[10px]
                                                                                text-base-content/45
                                                                            "
                                                                        >

                                                                            <span>

                                                                                {
                                                                                    item.barcode ||
                                                                                    "No barcode"
                                                                                }

                                                                            </span>


                                                                            <span>

                                                                                ·

                                                                            </span>


                                                                            <span>

                                                                                {
                                                                                    item.baseUnit
                                                                                }

                                                                            </span>


                                                                            <span
                                                                                className={`
                                                                                    badge
                                                                                    badge-xs

                                                                                    ${
                                                                                        currentSort.group ===
                                                                                        "PIECE"

                                                                                            ? "badge-info"

                                                                                            : "badge-primary"
                                                                                    }
                                                                                `}
                                                                            >

                                                                                {
                                                                                    currentSort.group ===
                                                                                    "PIECE"

                                                                                        ? "Piece"

                                                                                        : "Package"
                                                                                }

                                                                            </span>

                                                                        </div>

                                                                    </div>


                                                                    {
                                                                        !locked && (

                                                                            <button
                                                                                type="button"
                                                                                className="
                                                                                    btn
                                                                                    btn-ghost
                                                                                    btn-xs
                                                                                    text-error
                                                                                "
                                                                                onClick={() => {

                                                                                    removeItem(
                                                                                        item.productId
                                                                                    );

                                                                                }}
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
                                                                        gap-1.5
                                                                    "
                                                                >

                                                                    <button
                                                                        type="button"
                                                                        className="
                                                                            btn
                                                                            btn-square
                                                                            btn-xs
                                                                        "
                                                                        disabled={
                                                                            locked
                                                                        }
                                                                        onClick={() => {

                                                                            changeQuantity(
                                                                                item.productId,
                                                                                item.quantity -
                                                                                1
                                                                            );

                                                                        }}
                                                                    >

                                                                        −

                                                                    </button>


                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        step="1"
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
                                                                            locked
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
                                                                            btn-square
                                                                            btn-xs
                                                                        "
                                                                        disabled={
                                                                            locked
                                                                        }
                                                                        onClick={() => {

                                                                            changeQuantity(
                                                                                item.productId,
                                                                                item.quantity +
                                                                                1
                                                                            );

                                                                        }}
                                                                    >

                                                                        +

                                                                    </button>


                                                                    <div
                                                                        className="
                                                                            text-[10px]
                                                                            font-semibold
                                                                            text-base-content/55
                                                                        "
                                                                    >

                                                                        {
                                                                            item.baseUnit
                                                                        }

                                                                    </div>


                                                                    <div
                                                                        className="
                                                                            ml-auto
                                                                            text-right
                                                                        "
                                                                    >

                                                                        {
                                                                            item.lineTotal !==
                                                                                null &&
                                                                            item.lineTotal !==
                                                                                undefined
                                                                                ? (

                                                                                    <>

                                                                                        <div
                                                                                            className="
                                                                                                font-black
                                                                                            "
                                                                                        >

                                                                                            {
                                                                                                formatMoney(
                                                                                                    item.lineTotal
                                                                                                )
                                                                                            }

                                                                                        </div>


                                                                                        <div
                                                                                            className="
                                                                                                text-[9px]
                                                                                                text-base-content/45
                                                                                            "
                                                                                        >

                                                                                            {
                                                                                                formatMoney(
                                                                                                    item.effectiveUnitPrice
                                                                                                )
                                                                                            }

                                                                                            {" / each"}

                                                                                        </div>

                                                                                    </>

                                                                                )
                                                                                : (

                                                                                    <div
                                                                                        className="
                                                                                            text-[10px]
                                                                                            font-semibold
                                                                                            text-error
                                                                                        "
                                                                                    >

                                                                                        Pricing unavailable

                                                                                    </div>

                                                                                )
                                                                        }

                                                                    </div>

                                                                </div>


                                                                {
                                                                    pricingMode ===
                                                                        "WHOLESALE" &&
                                                                    Array.isArray(
                                                                        item.pricingBreakdown
                                                                    ) &&
                                                                    item.pricingBreakdown.length >
                                                                        0 && (

                                                                        <div
                                                                            className="
                                                                                mt-2
                                                                                flex
                                                                                flex-wrap
                                                                                gap-1
                                                                            "
                                                                        >

                                                                            {
                                                                                item.pricingBreakdown.map(
                                                                                    (
                                                                                        tier,
                                                                                        tierIndex
                                                                                    ) => (

                                                                                        <span
                                                                                            key={
                                                                                                `${item.productId}-${tierIndex}`
                                                                                            }
                                                                                            className="
                                                                                                badge
                                                                                                badge-ghost
                                                                                                badge-xs
                                                                                                text-[9px]
                                                                                            "
                                                                                        >

                                                                                            {
                                                                                                tier.bundles
                                                                                            }

                                                                                            ×{" "}

                                                                                            {
                                                                                                tier.tierQuantity
                                                                                            }

                                                                                            {" = "}

                                                                                            {
                                                                                                formatMoney(
                                                                                                    tier.subtotal
                                                                                                )
                                                                                            }

                                                                                        </span>

                                                                                    )
                                                                                )
                                                                            }

                                                                        </div>

                                                                    )
                                                                }

                                                            </div>

                                                        </div>

                                                    );

                                                }
                                            )
                                    }

                                </div>


                                {/* SUMMARY */}

                                <div
                                    className="
                                        shrink-0
                                        border-t
                                        border-base-200
                                        bg-base-100
                                        p-2
                                    "
                                >

                                    <div
                                        className="
                                            grid
                                            grid-cols-3
                                            gap-2
                                        "
                                    >

                                        <div
                                            className="
                                                rounded-lg
                                                bg-base-200
                                                p-2
                                            "
                                        >

                                            <div
                                                className="
                                                    text-[9px]
                                                    text-base-content/50
                                                "
                                            >

                                                Products

                                            </div>


                                            <div
                                                className="
                                                    font-black
                                                "
                                            >

                                                {
                                                    items.length
                                                }

                                            </div>

                                        </div>


                                        <div
                                            className="
                                                rounded-lg
                                                bg-base-200
                                                p-2
                                            "
                                        >

                                            <div
                                                className="
                                                    text-[9px]
                                                    text-base-content/50
                                                "
                                            >

                                                Quantity

                                            </div>


                                            <div
                                                className="
                                                    font-black
                                                "
                                            >

                                                {
                                                    formatNumber(
                                                        totalQuantity
                                                    )
                                                }

                                            </div>

                                        </div>


                                        <div
                                            className="
                                                rounded-lg
                                                bg-base-200
                                                p-2
                                            "
                                        >

                                            <div
                                                className="
                                                    text-[9px]
                                                    text-base-content/50
                                                "
                                            >

                                                {
                                                    pricingMode ===
                                                    "WHOLESALE"

                                                        ? "Wholesale Total"

                                                        : "Retail Total"
                                                }

                                            </div>


                                            <div
                                                className="
                                                    truncate
                                                    font-black
                                                "
                                            >

                                                {
                                                    formatMoney(
                                                        displayedTotal
                                                    )
                                                }

                                            </div>

                                        </div>

                                    </div>


                                    <textarea
                                        className="
                                            textarea
                                            textarea-bordered
                                            mt-2
                                            min-h-[3rem]
                                            w-full
                                            text-xs
                                        "
                                        rows="2"
                                        maxLength="1000"
                                        placeholder="Notes / special instructions..."
                                        value={
                                            notes
                                        }
                                        disabled={
                                            locked
                                        }
                                        onChange={(
                                            event
                                        ) => {

                                            setNotes(
                                                event.target.value
                                            );

                                        }}
                                    />


                                    {
                                        !locked
                                            ? (

                                                <div
                                                    className="
                                                        mt-2
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
                                                            saveOrder
                                                        }
                                                    >

                                                        {
                                                            saving
                                                                ? "Saving..."
                                                                : currentOrder?._id
                                                                    ? "Update Order"
                                                                    : "Save Order"
                                                        }

                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="
                                                            btn
                                                            btn-outline
                                                            btn-sm
                                                        "
                                                        disabled={
                                                            !currentOrder?._id ||
                                                            currentOrder?.status ===
                                                                "DRAFT" ||
                                                            printing
                                                        }
                                                        onClick={() => {

                                                            openPrintChoice(
                                                                currentOrder
                                                            );

                                                        }}
                                                    >

                                                        {
                                                            printing
                                                                ? "Printing..."
                                                                : "Print Order"
                                                        }

                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="
                                                            btn
                                                            btn-ghost
                                                            btn-sm
                                                            col-span-2
                                                        "
                                                        onClick={() => {

                                                            if (
                                                                items.length >
                                                                    0 &&
                                                                !window.confirm(
                                                                    "Clear the current Bulk Order and start a new one?"
                                                                )
                                                            ) {

                                                                return;

                                                            }


                                                            resetOrder();

                                                        }}
                                                    >

                                                        New Blank Order

                                                    </button>

                                                </div>

                                            )
                                            : (

                                                <button
                                                    type="button"
                                                    className="
                                                        btn
                                                        btn-sm
                                                        mt-2
                                                        w-full
                                                    "
                                                    onClick={
                                                        resetOrder
                                                    }
                                                >

                                                    New Order

                                                </button>

                                            )
                                    }

                                </div>

                            </div>

                        </div>

                    </div>

                )
            }


            {/* =================================================
                ORDER HISTORY
            ================================================= */}

            {
                tab ===
                "history" && (

                    <div
                        className="
                            flex-1
                            overflow-hidden
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
                                items-end
                                justify-between
                                gap-3
                                border-b
                                border-base-200
                                p-4
                            "
                        >

                            <div>

                                <div
                                    className="
                                        text-lg
                                        font-black
                                    "
                                >

                                    Order History

                                </div>


                                <div
                                    className="
                                        text-xs
                                        text-base-content/50
                                    "
                                >

                                    Reopen, revise, print, duplicate
                                    or cancel saved Bulk Orders.

                                </div>

                            </div>


                            <div
                                className="
                                    flex
                                    flex-wrap
                                    gap-2
                                "
                            >

                                <input
                                    type="text"
                                    className="
                                        input
                                        input-bordered
                                        input-sm
                                        w-56
                                    "
                                    placeholder="Order or customer..."
                                    value={
                                        historySearch
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setHistorySearch(
                                            event.target.value
                                        );

                                    }}
                                    onKeyDown={(
                                        event
                                    ) => {

                                        if (
                                            event.key ===
                                            "Enter"
                                        ) {

                                            loadOrders();

                                        }

                                    }}
                                />


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

                                            await loadOrders({
                                                status:
                                                    value,

                                                search:
                                                    historySearch,
                                            });

                                        }
                                        catch (
                                            error
                                        ) {

                                            showToast(
                                                getErrorMessage(
                                                    error,
                                                    "Unable to filter Bulk Orders."
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

                                    <option value="SAVED">
                                        Saved
                                    </option>

                                    <option value="COMPLETED">
                                        Completed
                                    </option>

                                    <option value="CANCELLED">
                                        Cancelled
                                    </option>

                                </select>


                                <button
                                    type="button"
                                    className="
                                        btn
                                        btn-sm
                                    "
                                    onClick={async () => {

                                        try {

                                            await loadOrders();

                                        }
                                        catch (
                                            error
                                        ) {

                                            showToast(
                                                getErrorMessage(
                                                    error,
                                                    "Unable to search Bulk Orders."
                                                ),
                                                "error"
                                            );

                                        }

                                    }}
                                >

                                    Search

                                </button>

                            </div>

                        </div>


                        <div
                            className={`
                                overflow-auto

                                ${
                                    isFullscreen
                                        ? "max-h-[calc(100dvh-9rem)]"
                                        : "max-h-[calc(100dvh-15rem)]"
                                }
                            `}
                        >

                            <table
                                className="
                                    table
                                    table-zebra
                                "
                            >

                                <thead
                                    className="
                                        sticky
                                        top-0
                                        z-[1]
                                        bg-base-100
                                    "
                                >

                                    <tr>

                                        <th>
                                            Order
                                        </th>

                                        <th>
                                            Customer
                                        </th>

                                        <th>
                                            Rev
                                        </th>

                                        <th>
                                            Products
                                        </th>

                                        <th>
                                            Qty
                                        </th>

                                        <th>
                                            Total
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Updated
                                        </th>

                                        <th />

                                    </tr>

                                </thead>


                                <tbody>

                                    {
                                        orders.length ===
                                        0
                                            ? (

                                                <tr>

                                                    <td
                                                        colSpan="9"
                                                        className="
                                                            py-10
                                                            text-center
                                                            text-base-content/45
                                                        "
                                                    >

                                                        No Bulk Orders found.

                                                    </td>

                                                </tr>

                                            )
                                            : orders.map(
                                                (
                                                    order
                                                ) => (

                                                    <tr
                                                        key={
                                                            order._id
                                                        }
                                                    >

                                                        <td
                                                            className="
                                                                font-semibold
                                                            "
                                                        >

                                                            {
                                                                order.orderNumber
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                order.customerName ||
                                                                "-"
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                order.revision ||
                                                                1
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                order.totalLines ??
                                                                order.items?.length ??
                                                                0
                                                            }

                                                        </td>


                                                        <td>

                                                            {
                                                                formatNumber(
                                                                    order.totalQuantity
                                                                )
                                                            }

                                                        </td>


                                                        <td
                                                            className="
                                                                font-semibold
                                                            "
                                                        >

                                                            {
                                                                formatMoney(
                                                                    order.totalAmount
                                                                )
                                                            }

                                                        </td>


                                                        <td>

                                                            <span
                                                                className={`
                                                                    badge
                                                                    badge-sm
                                                                    ${getStatusBadge(
                                                                        order.status
                                                                    )}
                                                                `}
                                                            >

                                                                {
                                                                    order.status
                                                                }

                                                            </span>

                                                        </td>


                                                        <td
                                                            className="
                                                                whitespace-nowrap
                                                                text-xs
                                                            "
                                                        >

                                                            {
                                                                formatDate(
                                                                    order.updatedAt
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
                                                                onClick={() => {

                                                                    openOrder(
                                                                        order
                                                                    );

                                                                }}
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
                QUANTITY MULTIPLIER POPUP
            ================================================= */}

            {
                quantityProduct && (

                    <div
                        className="
                            fixed
                            inset-0
                            z-[950]
                            flex
                            items-center
                            justify-center
                            bg-black/40
                            p-5
                        "
                        onMouseDown={(
                            event
                        ) => {

                            if (
                                event.target ===
                                event.currentTarget
                            ) {

                                setQuantityProduct(
                                    null
                                );


                                focusSearch();

                            }

                        }}
                    >

                        <div
                            className="
                                w-full
                                max-w-sm
                                rounded-2xl
                                bg-base-100
                                p-5
                                shadow-2xl
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    gap-2
                                "
                            >

                                <div
                                    className="
                                        text-xs
                                        font-bold
                                        uppercase
                                        tracking-wide
                                        text-base-content/45
                                    "
                                >

                                    Quantity Multiplier

                                </div>


                                <span
                                    className={`
                                        badge
                                        badge-sm
                                        font-bold

                                        ${
                                            pricingMode ===
                                            "WHOLESALE"

                                                ? "badge-primary"

                                                : "badge-ghost"
                                        }
                                    `}
                                >

                                    {
                                        pricingMode ===
                                        "WHOLESALE"

                                            ? "Wholesale"

                                            : "Retail"
                                    }

                                </span>

                            </div>


                            <div
                                className="
                                    mt-1
                                    text-lg
                                    font-black
                                "
                            >

                                {
                                    quantityProduct.name
                                }

                            </div>


                            <div
                                className="
                                    text-xs
                                    text-base-content/50
                                "
                            >

                                {
                                    quantityProduct.barcode ||
                                    "No barcode"
                                }

                                {" · "}

                                {
                                    quantityProduct.baseUnit ||
                                    "Piece"
                                }

                                {" · "}

                                {
                                    getLocalSortInfo(
                                        quantityProduct.baseUnit
                                    ).group ===
                                    "PIECE"

                                        ? "Piece Item"

                                        : "Bulk / Package"
                                }

                            </div>


                            <div
                                className="
                                    mt-4
                                    flex
                                    items-center
                                    gap-2
                                "
                            >

                                <span
                                    className="
                                        text-xl
                                        font-black
                                    "
                                >

                                    ×

                                </span>


                                <input
                                    ref={
                                        quantityInputRef
                                    }
                                    type="number"
                                    min="1"
                                    step="1"
                                    className="
                                        input
                                        input-bordered
                                        input-lg
                                        w-full
                                        text-center
                                        text-2xl
                                        font-black
                                    "
                                    value={
                                        quantityValue
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setQuantityValue(
                                            event.target.value
                                        );

                                    }}
                                    onKeyDown={(
                                        event
                                    ) => {

                                        if (
                                            event.key ===
                                            "Enter"
                                        ) {

                                            event.preventDefault();


                                            confirmQuantity();

                                        }


                                        if (
                                            event.key ===
                                            "Escape"
                                        ) {

                                            event.preventDefault();


                                            setQuantityProduct(
                                                null
                                            );


                                            focusSearch();

                                        }

                                    }}
                                />

                            </div>


                            {/* LIVE PRICE */}

                            <div
                                className="
                                    mt-3
                                    rounded-xl
                                    bg-base-200
                                    p-3
                                "
                            >

                                {
                                    quantityPreview?.lineTotal !==
                                        null &&
                                    quantityPreview?.lineTotal !==
                                        undefined
                                        ? (

                                            <>

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-3
                                                    "
                                                >

                                                    <div>

                                                        <div
                                                            className="
                                                                text-[10px]
                                                                font-bold
                                                                uppercase
                                                                text-base-content/45
                                                            "
                                                        >

                                                            Price / Each

                                                        </div>


                                                        <div
                                                            className="
                                                                text-sm
                                                                font-bold
                                                            "
                                                        >

                                                            {
                                                                formatMoney(
                                                                    quantityPreview
                                                                        .effectiveUnitPrice
                                                                )
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
                                                                font-bold
                                                                uppercase
                                                                text-base-content/45
                                                            "
                                                        >

                                                            Line Total

                                                        </div>


                                                        <div
                                                            className="
                                                                text-xl
                                                                font-black
                                                            "
                                                        >

                                                            {
                                                                formatMoney(
                                                                    quantityPreview
                                                                        .lineTotal
                                                                )
                                                            }

                                                        </div>

                                                    </div>

                                                </div>


                                                {
                                                    pricingMode ===
                                                        "WHOLESALE" &&
                                                    quantityPreview
                                                        .pricingBreakdown
                                                        .length >
                                                        0 && (

                                                        <div
                                                            className="
                                                                mt-2
                                                                flex
                                                                flex-wrap
                                                                gap-1
                                                            "
                                                        >

                                                            {
                                                                quantityPreview
                                                                    .pricingBreakdown
                                                                    .map(
                                                                        (
                                                                            tier,
                                                                            index
                                                                        ) => (

                                                                            <span
                                                                                key={
                                                                                    index
                                                                                }
                                                                                className="
                                                                                    badge
                                                                                    badge-ghost
                                                                                    badge-sm
                                                                                    text-[10px]
                                                                                "
                                                                            >

                                                                                {
                                                                                    tier.bundles
                                                                                }

                                                                                ×{" "}

                                                                                {
                                                                                    tier.tierQuantity
                                                                                }

                                                                                {" = "}

                                                                                {
                                                                                    formatMoney(
                                                                                        tier.subtotal
                                                                                    )
                                                                                }

                                                                            </span>

                                                                        )
                                                                    )
                                                            }

                                                        </div>

                                                    )
                                                }

                                            </>

                                        )
                                        : (

                                            <div
                                                className="
                                                    text-center
                                                    text-xs
                                                    font-semibold
                                                    text-error
                                                "
                                            >

                                                Pricing unavailable for this quantity.

                                            </div>

                                        )
                                }

                            </div>


                            <div
                                className="
                                    mt-4
                                    grid
                                    grid-cols-2
                                    gap-2
                                "
                            >

                                <button
                                    type="button"
                                    className="
                                        btn
                                    "
                                    onClick={() => {

                                        setQuantityProduct(
                                            null
                                        );


                                        focusSearch();

                                    }}
                                >

                                    Cancel

                                </button>


                                <button
                                    type="button"
                                    className="
                                        btn
                                        btn-primary
                                    "
                                    onClick={
                                        confirmQuantity
                                    }
                                >

                                    Add ×{" "}

                                    {
                                        Math.max(
                                            1,
                                            Math.floor(
                                                Number(
                                                    quantityValue
                                                ) ||
                                                1
                                            )
                                        )
                                    }

                                </button>

                            </div>

                        </div>

                    </div>

                )
            }


            {/* =================================================
                PRINT CHOICE MODAL
            ================================================= */}

            {
                printChoiceOrder && (

                    <div
                        className="
                            fixed
                            inset-0
                            z-[990]
                            flex
                            items-center
                            justify-center
                            bg-black/50
                            p-5
                        "
                        onMouseDown={(
                            event
                        ) => {

                            if (
                                event.target ===
                                    event.currentTarget &&
                                !printing
                            ) {

                                closePrintChoice();

                            }

                        }}
                    >

                        <div
                            className="
                                w-full
                                max-w-md
                                rounded-2xl
                                bg-base-100
                                p-5
                                shadow-2xl
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
                                            text-lg
                                            font-black
                                        "
                                    >

                                        Print Bulk Order

                                    </div>


                                    <div
                                        className="
                                            mt-1
                                            text-xs
                                            text-base-content/50
                                        "
                                    >

                                        {
                                            printChoiceOrder.orderNumber ||
                                            "Bulk Order"
                                        }

                                        {
                                            printChoiceOrder.customerName
                                                ? ` · ${printChoiceOrder.customerName}`
                                                : ""
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
                                    disabled={
                                        printing
                                    }
                                    onClick={
                                        closePrintChoice
                                    }
                                >

                                    ✕

                                </button>

                            </div>


                            <div
                                className="
                                    mt-5
                                    grid
                                    grid-cols-1
                                    gap-3
                                    sm:grid-cols-2
                                "
                            >

                                <button
                                    type="button"
                                    className="
                                        btn
                                        h-auto
                                        min-h-[110px]
                                        flex-col
                                        gap-2
                                        px-4
                                        py-4
                                        text-center
                                    "
                                    disabled={
                                        printing
                                    }
                                    onClick={
                                        printThermalReceipt
                                    }
                                >

                                    <span
                                        className="
                                            text-2xl
                                            leading-none
                                        "
                                    >

                                        🧾

                                    </span>


                                    <span
                                        className="
                                            font-black
                                        "
                                    >

                                        Receipt

                                    </span>


                                    <span
                                        className="
                                            whitespace-normal
                                            text-[10px]
                                            font-normal
                                            leading-snug
                                            opacity-60
                                        "
                                    >

                                        Print using the configured thermal printer

                                    </span>

                                </button>


                                <button
                                    type="button"
                                    className="
                                        btn
                                        btn-primary
                                        h-auto
                                        min-h-[110px]
                                        flex-col
                                        gap-2
                                        px-4
                                        py-4
                                        text-center
                                    "
                                    disabled={
                                        printing
                                    }
                                    onClick={
                                        printA4Order
                                    }
                                >

                                    <span
                                        className="
                                            text-2xl
                                            leading-none
                                        "
                                    >

                                        📄

                                    </span>


                                    <span
                                        className="
                                            font-black
                                        "
                                    >

                                        A4 / PDF

                                    </span>


                                    <span
                                        className="
                                            whitespace-normal
                                            text-[10px]
                                            font-normal
                                            leading-snug
                                            opacity-80
                                        "
                                    >

                                        Open the clean checklist for A4 printing or Save as PDF

                                    </span>

                                </button>

                            </div>


                            {
                                printing && (

                                    <div
                                        className="
                                            mt-4
                                            flex
                                            items-center
                                            justify-center
                                            gap-2
                                            text-xs
                                            font-semibold
                                            text-base-content/60
                                        "
                                    >

                                        <span
                                            className="
                                                loading
                                                loading-spinner
                                                loading-sm
                                            "
                                        />

                                        Preparing print...

                                    </div>

                                )
                            }

                        </div>

                    </div>

                )
            }


            {/* =================================================
                PAYMENT MODAL
            ================================================= */}

            {
                paymentOrder && (

                    <div
                        className="
                            fixed
                            inset-0
                            z-[980]
                            flex
                            items-center
                            justify-center
                            bg-black/50
                            p-5
                        "
                        onMouseDown={(
                            event
                        ) => {

                            if (
                                event.target ===
                                    event.currentTarget &&
                                !paying
                            ) {

                                closePaymentModal();

                            }

                        }}
                    >

                        <div className="w-full max-w-md rounded-2xl bg-base-100 p-5 shadow-2xl">

                            <div className="flex items-start justify-between gap-3">

                                <div>

                                    <div className="text-lg font-black">
                                        Mark as Paid
                                    </div>

                                    <div className="mt-1 text-xs text-base-content/50">

                                        {
                                            paymentOrder.orderNumber
                                        }

                                        {
                                            paymentOrder.customerName
                                                ? ` · ${paymentOrder.customerName}`
                                                : ""
                                        }

                                    </div>

                                </div>


                                <button
                                    type="button"
                                    className="btn btn-circle btn-ghost btn-sm"
                                    disabled={
                                        paying
                                    }
                                    onClick={
                                        closePaymentModal
                                    }
                                >
                                    ✕
                                </button>

                            </div>


                            <div className="mt-4 rounded-xl bg-base-200 p-4">

                                <div className="text-[10px] font-bold uppercase text-base-content/50">
                                    Order Total
                                </div>

                                <div className="mt-1 text-2xl font-black">

                                    {
                                        formatMoney(
                                            paymentOrder.totalAmount
                                        )
                                    }

                                </div>

                                <div className="mt-1 text-xs text-base-content/50">

                                    {
                                        paymentOrder.pricingMode ||
                                        "RETAIL"
                                    }

                                    {" pricing"}

                                </div>

                            </div>


                            <div className="mt-4">

                                <label className="mb-1 block text-[10px] font-bold uppercase text-base-content/50">
                                    Payment Method
                                </label>

                                <select
                                    className="select select-bordered w-full"
                                    value={
                                        paymentMethod
                                    }
                                    disabled={
                                        paying
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setPaymentMethod(
                                            event.target.value
                                        );

                                    }}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="GCash">GCash</option>
                                    <option value="Maya">Maya</option>
                                    <option value="Card">Card</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>

                            </div>


                            <div className="mt-3">

                                <label className="mb-1 block text-[10px] font-bold uppercase text-base-content/50">
                                    Amount Tendered
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input input-bordered w-full text-right text-lg font-black"
                                    value={
                                        paymentAmount
                                    }
                                    disabled={
                                        paying
                                    }
                                    onChange={(
                                        event
                                    ) => {

                                        setPaymentAmount(
                                            event.target.value
                                        );

                                    }}
                                    onKeyDown={(
                                        event
                                    ) => {

                                        if (
                                            event.key ===
                                                "Enter" &&
                                            !paying
                                        ) {

                                            event.preventDefault();

                                            payBulkOrder();

                                        }

                                    }}
                                />

                            </div>


                            <div className="mt-3 flex items-center justify-between rounded-xl bg-base-200 p-3">

                                <span className="text-xs font-bold">
                                    Change
                                </span>

                                <span className="text-lg font-black">

                                    {
                                        formatMoney(
                                            Math.max(
                                                0,
                                                (
                                                    Number(
                                                        paymentAmount
                                                    ) ||
                                                    0
                                                ) -
                                                Number(
                                                    paymentOrder.totalAmount ||
                                                    0
                                                )
                                            )
                                        )
                                    }

                                </span>

                            </div>


                            <div className="mt-5 grid grid-cols-2 gap-2">

                                <button
                                    type="button"
                                    className="btn"
                                    disabled={
                                        paying
                                    }
                                    onClick={
                                        closePaymentModal
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-success"
                                    disabled={
                                        paying ||
                                        !Number.isFinite(
                                            Number(
                                                paymentAmount
                                            )
                                        ) ||
                                        Number(
                                            paymentAmount
                                        ) <
                                        Number(
                                            paymentOrder.totalAmount ||
                                            0
                                        )
                                    }
                                    onClick={
                                        payBulkOrder
                                    }
                                >

                                    {
                                        paying
                                            ? (
                                                <>
                                                    <span className="loading loading-spinner loading-sm" />
                                                    Processing...
                                                </>
                                            )
                                            : "Confirm Payment"
                                    }

                                </button>

                            </div>

                        </div>

                    </div>

                )
            }


            {/* =================================================
                ORDER DETAIL MODAL
            ================================================= */}

            {
                selectedOrder && (

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
                        onClick={() => {

                            setSelectedOrder(
                                null
                            );

                        }}
                    >

                        <div
                            className="
                                max-h-[90vh]
                                w-full
                                max-w-3xl
                                overflow-y-auto
                                rounded-2xl
                                bg-base-100
                                shadow-2xl
                            "
                            onClick={(
                                event
                            ) => {

                                event.stopPropagation();

                            }}
                        >

                            {/* HEADER */}

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
                                            selectedOrder.orderNumber
                                        }

                                    </div>


                                    <div
                                        className="
                                            mt-1
                                            text-xs
                                            text-base-content/50
                                        "
                                    >

                                        Revision{" "}

                                        {
                                            selectedOrder.revision ||
                                            1
                                        }

                                        {" · "}

                                        {
                                            formatDate(
                                                selectedOrder.updatedAt
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
                                    onClick={() => {

                                        setSelectedOrder(
                                            null
                                        );

                                    }}
                                >

                                    ✕

                                </button>

                            </div>


                            {/* BODY */}

                            <div
                                className="
                                    space-y-4
                                    p-5
                                "
                            >

                                <div
                                    className="
                                        grid
                                        grid-cols-1
                                        gap-3
                                        sm:grid-cols-3
                                    "
                                >

                                    <div
                                        className="
                                            rounded-xl
                                            bg-base-200
                                            p-3
                                        "
                                    >

                                        <div
                                            className="
                                                text-[10px]
                                                uppercase
                                                text-base-content/45
                                            "
                                        >

                                            Customer

                                        </div>


                                        <div
                                            className="
                                                mt-1
                                                font-bold
                                            "
                                        >

                                            {
                                                selectedOrder.customerName ||
                                                "-"
                                            }

                                        </div>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            bg-base-200
                                            p-3
                                        "
                                    >

                                        <div
                                            className="
                                                text-[10px]
                                                uppercase
                                                text-base-content/45
                                            "
                                        >

                                            Status

                                        </div>


                                        <div
                                            className="
                                                mt-1
                                            "
                                        >

                                            <span
                                                className={`
                                                    badge
                                                    badge-sm
                                                    ${getStatusBadge(
                                                        selectedOrder.status
                                                    )}
                                                `}
                                            >

                                                {
                                                    selectedOrder.status
                                                }

                                            </span>

                                        </div>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            bg-base-200
                                            p-3
                                        "
                                    >

                                        <div
                                            className="
                                                text-[10px]
                                                uppercase
                                                text-base-content/45
                                            "
                                        >

                                            Printed

                                        </div>


                                        <div
                                            className="
                                                mt-1
                                                font-bold
                                            "
                                        >

                                            {
                                                selectedOrder.printCount ||
                                                0
                                            }

                                            {" time(s)"}

                                        </div>

                                    </div>

                                </div>


                                {/* ITEMS */}

                                <div
                                    className="
                                        overflow-hidden
                                        rounded-xl
                                        border
                                        border-base-200
                                    "
                                >

                                    {
                                        sortOrderItems(
                                            selectedOrder.items ||
                                            []
                                        ).map(
                                            (
                                                item,
                                                index,
                                                allItems
                                            ) => {

                                                const currentSort =
                                                    getLocalSortInfo(
                                                        item.baseUnit
                                                    );


                                                const previous =
                                                    index >
                                                        0
                                                        ? allItems[
                                                            index -
                                                            1
                                                        ]
                                                        : null;


                                                const previousSort =
                                                    previous

                                                        ? getLocalSortInfo(
                                                            previous.baseUnit
                                                        )

                                                        : null;


                                                const showHeader =
                                                    !previousSort ||
                                                    previousSort.group !==
                                                        currentSort.group;


                                                return (

                                                    <div
                                                        key={
                                                            item._id ||
                                                            item.product ||
                                                            `${item.name}-${index}`
                                                        }
                                                    >

                                                        {
                                                            showHeader && (

                                                                <div
                                                                    className="
                                                                        border-b
                                                                        border-base-200
                                                                        bg-base-200
                                                                        px-3
                                                                        py-1.5
                                                                        text-[10px]
                                                                        font-black
                                                                        uppercase
                                                                        text-base-content/55
                                                                    "
                                                                >

                                                                    {
                                                                        currentSort.group ===
                                                                        "PIECE"

                                                                            ? "Piece Items"

                                                                            : "Bulk / Package Items"
                                                                    }

                                                                </div>

                                                            )
                                                        }


                                                        <div
                                                            className="
                                                                flex
                                                                items-center
                                                                justify-between
                                                                gap-4
                                                                border-b
                                                                border-base-200
                                                                p-3
                                                                last:border-b-0
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
                                                                        item.quantity
                                                                    }

                                                                    {" "}

                                                                    {
                                                                        item.baseUnit
                                                                    }

                                                                    {" · "}

                                                                    {
                                                                        formatMoney(
                                                                            item.effectiveUnitPrice
                                                                        )
                                                                    }

                                                                    {" each"}

                                                                </div>

                                                            </div>


                                                            <div
                                                                className="
                                                                    shrink-0
                                                                    text-right
                                                                    font-black
                                                                "
                                                            >

                                                                {
                                                                    formatMoney(
                                                                        item.lineTotal
                                                                    )
                                                                }

                                                            </div>

                                                        </div>

                                                    </div>

                                                );

                                            }
                                        )
                                    }

                                </div>


                                {/* TOTALS */}

                                <div
                                    className="
                                        flex
                                        justify-end
                                    "
                                >

                                    <div
                                        className="
                                            w-full
                                            max-w-sm
                                            rounded-xl
                                            bg-base-200
                                            p-3
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                justify-between
                                                text-xs
                                            "
                                        >

                                            <span>
                                                Products
                                            </span>


                                            <span
                                                className="
                                                    font-bold
                                                "
                                            >

                                                {
                                                    selectedOrder.totalLines ??
                                                    selectedOrder.items?.length ??
                                                    0
                                                }

                                            </span>

                                        </div>


                                        <div
                                            className="
                                                mt-1
                                                flex
                                                justify-between
                                                text-xs
                                            "
                                        >

                                            <span>
                                                Total Quantity
                                            </span>


                                            <span
                                                className="
                                                    font-bold
                                                "
                                            >

                                                {
                                                    formatNumber(
                                                        selectedOrder.totalQuantity
                                                    )
                                                }

                                            </span>

                                        </div>


                                        <div
                                            className="
                                                mt-2
                                                flex
                                                justify-between
                                                border-t
                                                border-base-300
                                                pt-2
                                                text-base
                                                font-black
                                            "
                                        >

                                            <span>
                                                Total
                                            </span>


                                            <span>

                                                {
                                                    formatMoney(
                                                        selectedOrder.totalAmount
                                                    )
                                                }

                                            </span>

                                        </div>

                                    </div>

                                </div>


                                {/* NOTES */}

                                {
                                    selectedOrder.notes && (

                                        <div
                                            className="
                                                rounded-xl
                                                bg-base-200
                                                p-3
                                            "
                                        >

                                            <div
                                                className="
                                                    text-[10px]
                                                    font-bold
                                                    uppercase
                                                    text-base-content/45
                                                "
                                            >

                                                Notes

                                            </div>


                                            <div
                                                className="
                                                    mt-1
                                                    whitespace-pre-wrap
                                                    text-sm
                                                "
                                            >

                                                {
                                                    selectedOrder.notes
                                                }

                                            </div>

                                        </div>

                                    )
                                }


                                {/* ACTIONS */}

                                <div
                                    className="
                                        flex
                                        flex-wrap
                                        justify-end
                                        gap-2
                                    "
                                >

                                    {
                                        [
                                            "DRAFT",
                                            "SAVED",
                                        ].includes(
                                            selectedOrder.status
                                        ) && (

                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                "
                                                onClick={() => {

                                                    editOrder(
                                                        selectedOrder
                                                    );

                                                }}
                                            >

                                                Edit

                                            </button>

                                        )
                                    }


                                    {
                                        selectedOrder.status !==
                                            "DRAFT" &&
                                        selectedOrder.status !==
                                            "CANCELLED" && (

                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-outline
                                                "
                                                disabled={
                                                    printing
                                                }
                                                onClick={() => {

                                                    openPrintChoice(
                                                        selectedOrder
                                                    );

                                                }}
                                            >

                                                {
                                                    printing
                                                        ? "Printing..."
                                                        : "Print"
                                                }

                                            </button>

                                        )
                                    }


                                    {
                                        selectedOrder.status ===
                                            "SAVED" && (

                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-success
                                                "
                                                disabled={
                                                    paying
                                                }
                                                onClick={() => {

                                                    openPaymentModal(
                                                        selectedOrder
                                                    );

                                                }}
                                            >

                                                Mark as Paid

                                            </button>

                                        )
                                    }


                                    <button
                                        type="button"
                                        className="
                                            btn
                                            btn-outline
                                        "
                                        onClick={() => {

                                            duplicateOrder(
                                                selectedOrder
                                            );

                                        }}
                                    >

                                        Duplicate

                                    </button>


                                    {
                                        [
                                            "DRAFT",
                                            "SAVED",
                                        ].includes(
                                            selectedOrder.status
                                        ) && (

                                            <button
                                                type="button"
                                                className="
                                                    btn
                                                    btn-error
                                                    btn-outline
                                                "
                                                onClick={() => {

                                                    cancelOrder(
                                                        selectedOrder
                                                    );

                                                }}
                                            >

                                                Cancel

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


export default BulkOrderPage;