import escpos from "node-escpos-win";

import iconv from "iconv-lite";


/*
============================================================
CONFIG
============================================================
*/

const PRINTER_WIDTH =
    32;


/*
============================================================
BASIC HELPERS
============================================================
*/

const repeat =
    (
        value,
        count
    ) =>
        String(
            value
        ).repeat(
            count
        );


const twoColumns =
    (
        left,
        right
    ) => {

        left =
            String(
                left ??
                ""
            );


        right =
            String(
                right ??
                ""
            );


        const available =
            PRINTER_WIDTH -
            right.length;


        if (
            available <=
            0
        ) {

            return right.slice(
                0,
                PRINTER_WIDTH
            );

        }


        return (
            left
                .slice(
                    0,
                    available
                )
                .padEnd(
                    available,
                    " "
                ) +
            right
        );

    };


/*
============================================================
WRAP TEXT
============================================================
*/

const wrapText =
    (
        value,
        width = PRINTER_WIDTH
    ) => {

        const text =
            String(
                value ||
                ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        if (
            !text
        ) {

            return [];

        }


        const lines =
            [];


        let remaining =
            text;


        while (
            remaining.length >
            width
        ) {

            let breakAt =
                remaining.lastIndexOf(
                    " ",
                    width
                );


            if (
                breakAt <=
                0
            ) {

                breakAt =
                    width;

            }


            lines.push(
                remaining
                    .slice(
                        0,
                        breakAt
                    )
                    .trim()
            );


            remaining =
                remaining
                    .slice(
                        breakAt
                    )
                    .trim();

        }


        if (
            remaining
        ) {

            lines.push(
                remaining
            );

        }


        return lines;

    };


/*
============================================================
DATE / TIME
============================================================
*/

const formatDateTime =
    (
        value
    ) => {

        if (
            !value
        ) {

            return "";

        }


        return new Date(
            value
        ).toLocaleString(
            "en-PH"
        );

    };


/*
============================================================
MONEY
============================================================

We intentionally omit "P" from product rows.

With a 32-column thermal printer, every character matters.

The header:

QTY UNIT PRICE TOTAL

already tells the worker what the numbers represent.

The grand total uses P for clarity.
============================================================
*/

const formatMoney =
    (
        value
    ) => {

        const amount =
            Number(
                value
            );


        if (
            !Number.isFinite(
                amount
            )
        ) {

            return "0.00";

        }


        return amount.toLocaleString(
            "en-PH",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2,
            }
        );

    };


const formatMoneyWithCurrency =
    (
        value
    ) => {

        return `P${formatMoney(
            value
        )}`;

    };


/*
============================================================
QUANTITY
============================================================
*/

const formatQuantity =
    (
        value
    ) => {

        const quantity =
            Number(
                value
            );


        if (
            !Number.isFinite(
                quantity
            )
        ) {

            return "0";

        }


        return quantity.toLocaleString(
            "en-PH",
            {
                maximumFractionDigits:
                    3,
            }
        );

    };


/*
============================================================
USER DISPLAY NAME
============================================================
*/

const getUserDisplayName =
    (
        user
    ) => {

        return (
            user?.name ||
            user?.username ||
            "Unknown"
        );

    };


/*
============================================================
UNIT
============================================================
*/

const normalizeUnit =
    (
        value
    ) => {

        const unit =
            String(
                value ||
                "PC"
            )
                .trim()
                .toUpperCase();


        /*
        Compact common units for thermal printing.
        */

        const aliases =
            {

                PIECE:
                    "PC",

                PIECES:
                    "PC",

                EACH:
                    "PC",

                EA:
                    "PC",

                PCS:
                    "PC",

                PC:
                    "PC",

                CASE:
                    "CASE",

                CSE:
                    "CASE",

                CS:
                    "CASE",

                BOX:
                    "BOX",

                BX:
                    "BOX",

                SACK:
                    "SACK",

                SCK:
                    "SACK",

                PACKAGE:
                    "PKG",

                PACK:
                    "PKG",

                PKG:
                    "PKG",

                PK:
                    "PKG",

                BUNDLE:
                    "BDL",

                BDL:
                    "BDL",

                DOZEN:
                    "DOZ",

                DOZ:
                    "DOZ",

                DZ:
                    "DOZ",

                TRAY:
                    "TRAY",

                TRY:
                    "TRAY",

                BAG:
                    "BAG",

                BG:
                    "BAG",

            };


        return (
            aliases[
                unit
            ] ||
            unit.slice(
                0,
                4
            )
        );

    };


/*
============================================================
SORT ITEMS
============================================================

Physical print order:

1. Bulk / package units
2. Piece units

Within the section:

sortPriority
baseUnit
name
============================================================
*/

const sortOrderItems =
    (
        items
    ) => {

        return [
            ...(
                Array.isArray(
                    items
                )
                    ? items
                    : []
            ),
        ]
            .sort(
                (
                    a,
                    b
                ) => {

                    const aGroup =
                        String(
                            a?.sortGroup ||
                            "BULK"
                        )
                            .toUpperCase();


                    const bGroup =
                        String(
                            b?.sortGroup ||
                            "BULK"
                        )
                            .toUpperCase();


                    if (
                        aGroup !==
                        bGroup
                    ) {

                        if (
                            aGroup ===
                            "PIECE"
                        ) {

                            return 1;

                        }


                        if (
                            bGroup ===
                            "PIECE"
                        ) {

                            return -1;

                        }

                    }


                    const aPriority =
                        Number(
                            a?.sortPriority
                        ) ||
                        500;


                    const bPriority =
                        Number(
                            b?.sortPriority
                        ) ||
                        500;


                    if (
                        aPriority !==
                        bPriority
                    ) {

                        return (
                            aPriority -
                            bPriority
                        );

                    }


                    const unitCompare =
                        normalizeUnit(
                            a?.baseUnit
                        )
                            .localeCompare(
                                normalizeUnit(
                                    b?.baseUnit
                                )
                            );


                    if (
                        unitCompare !==
                        0
                    ) {

                        return unitCompare;

                    }


                    return String(
                        a?.name ||
                        ""
                    )
                        .localeCompare(
                            String(
                                b?.name ||
                                ""
                            )
                        );

                }
            );

    };


/*
============================================================
PRINTER
============================================================
*/

const getPrinter =
    () => {

        const devices =
            escpos.GetDeviceList(
                "USB"
            );


        const printer =
            devices?.list?.find(
                (
                    device
                ) =>
                    device.service ===
                    "usbprint"
            );


        if (
            !printer
        ) {

            throw new Error(
                "Xprinter USB printer was not found."
            );

        }


        return printer;

    };


/*
============================================================
PRINT QUEUE
============================================================
*/

let printerQueue =
    Promise.resolve();


const rawPrint =
    (
        receipt
    ) => {

        const printer =
            getPrinter();


        const data =
            iconv.encode(
                receipt,
                "cp858"
            );


        return escpos.Print(
            printer.path,
            data
        );

    };


const sendToPrinter =
    (
        receipt
    ) => {

        const job =
            async () => {

                const result =
                    rawPrint(
                        receipt
                    );


                if (
                    !result ||
                    Number(
                        result.success
                    ) !==
                    1
                ) {

                    throw new Error(
                        `Printer failed. Error code: ${
                            result?.err ??
                            "unknown"
                        }`
                    );

                }


                return result;

            };


        const queued =
            printerQueue
                .catch(
                    () => {}
                )
                .then(
                    job
                );


        printerQueue =
            queued.catch(
                () => {}
            );


        return queued;

    };


/*
============================================================
COMPACT PRODUCT DETAIL ROW
============================================================

32-column format:

    25 PCS 159.20     3,980.00

Column widths:

QTY   = 5
UNIT  = 5
PRICE = 9
TOTAL = 13

Total = 32

No item number is printed.
============================================================
*/

const buildProductDetailRow =
    (
        item
    ) => {

        const quantity =
            formatQuantity(
                item?.quantity
            );


        const unit =
            normalizeUnit(
                item?.baseUnit
            );


        const price =
            formatMoney(
                item?.effectiveUnitPrice
            );


        const total =
            formatMoney(
                item?.lineTotal
            );


        return (
            quantity
                .slice(
                    0,
                    5
                )
                .padStart(
                    5,
                    " "
                ) +

            unit
                .slice(
                    0,
                    5
                )
                .padEnd(
                    5,
                    " "
                ) +

            price
                .slice(
                    0,
                    9
                )
                .padStart(
                    9,
                    " "
                ) +

            total
                .slice(
                    0,
                    13
                )
                .padStart(
                    13,
                    " "
                )
        );

    };


/*
============================================================
PRODUCT TABLE HEADER
============================================================
*/

const buildProductHeader =
    () => {

        return (
            "QTY"
                .padStart(
                    5,
                    " "
                ) +

            "UNIT"
                .padEnd(
                    5,
                    " "
                ) +

            "PRICE"
                .padStart(
                    9,
                    " "
                ) +

            "TOTAL"
                .padStart(
                    13,
                    " "
                )
        );

    };


/*
============================================================
APPEND PRODUCT
============================================================

Compact layout:

[ ] Bear Brand Milk
    5 BOX  450.00     2,250.00

The checkbox is always attached to the product name.

There are NO item numbers.
============================================================
*/

const appendProduct =
    (
        receipt,
        item
    ) => {

        const checkbox =
            "[ ]";


        const name =
            String(
                item?.name ||
                "Item"
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        /*
        First line:

        [ ] + space = 4 characters

        Leaves 28 characters for product name.
        */

        const nameWidth =
            PRINTER_WIDTH -
            4;


        const nameLines =
            wrapText(
                name,
                nameWidth
            );


        if (
            nameLines.length ===
            0
        ) {

            receipt +=
                `${checkbox} Item\n`;

        }
        else {

            receipt +=
                `${checkbox} ${nameLines[0]}\n`;


            /*
            Long names continue below the first line.

            Four spaces keep the continuation aligned with
            the start of the product name.
            */

            for (
                const line
                of nameLines.slice(
                    1
                )
            ) {

                receipt +=
                    `    ${line}\n`;

            }

        }


        receipt +=
            `${buildProductDetailRow(
                item
            )}\n`;


        return receipt;

    };


/*
============================================================
APPEND ITEM SECTION
============================================================
*/

const appendItemSection =
    (
        receipt,
        title,
        items
    ) => {

        if (
            !Array.isArray(
                items
            ) ||
            items.length ===
                0
        ) {

            return receipt;

        }


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            `${title}\n`;


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            `${buildProductHeader()}\n`;


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        for (
            const item
            of items
        ) {

            receipt =
                appendProduct(
                    receipt,
                    item
                );

        }


        return receipt;

    };


/*
============================================================
PRINT BULK ORDER LIST
============================================================
*/

const printBulkOrderList =
    async (
        order
    ) => {

        if (
            !order
        ) {

            throw new Error(
                "Bulk Order is required."
            );

        }


        if (
            order.status ===
            "DRAFT"
        ) {

            throw new Error(
                "Save the Bulk Order before printing."
            );

        }


        if (
            order.status ===
            "CANCELLED"
        ) {

            throw new Error(
                "Cancelled Bulk Orders cannot be printed."
            );

        }


        const sortedItems =
            sortOrderItems(
                order.items
            );


        const bulkItems =
            sortedItems.filter(
                (
                    item
                ) =>
                    String(
                        item?.sortGroup ||
                        ""
                    )
                        .toUpperCase() !==
                    "PIECE"
            );


        const pieceItems =
            sortedItems.filter(
                (
                    item
                ) =>
                    String(
                        item?.sortGroup ||
                        ""
                    )
                        .toUpperCase() ===
                    "PIECE"
            );


        let receipt =
            "";


        /*
        ========================================================
        INITIALIZE PRINTER
        ========================================================
        */

        receipt +=
            "\x1B\x40";


        /*
        ========================================================
        HEADER
        ========================================================
        */

        receipt +=
            "\x1B\x61\x01";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "STOREPOS\n";


        receipt +=
            "BULK ORDER LIST\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            "\n";


        receipt +=
            "\x1B\x61\x00";


        /*
        ========================================================
        ORDER INFORMATION
        ========================================================
        */

        receipt +=
            `Order: ${
                order.orderNumber ||
                ""
            }\n`;


        receipt +=
            twoColumns(
                "Revision",
                Number(
                    order.revision
                ) ||
                1
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Status",
                order.status ||
                ""
            ) +
            "\n";


        receipt +=
            `Date: ${formatDateTime(
                order.updatedAt ||
                order.createdAt
            )}\n`;


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        /*
        ========================================================
        CUSTOMER
        ========================================================
        */

        receipt +=
            "Customer:\n";


        const customerName =
            String(
                order.customerName ||
                "Walk-in Customer"
            )
                .trim();


        for (
            const line
            of wrapText(
                customerName
            )
        ) {

            receipt +=
                `${line}\n`;

        }


        /*
        ========================================================
        BRANCH
        ========================================================
        */

        if (
            order.branchSnapshot
        ) {

            receipt +=
                `Branch: ${
                    order.branchSnapshot.code ||
                    ""
                }\n`;


            for (
                const line
                of wrapText(
                    order.branchSnapshot.name
                )
            ) {

                receipt +=
                    `${line}\n`;

            }

        }


        receipt +=
            repeat(
                "=",
                PRINTER_WIDTH
            ) +
            "\n";


        /*
        ========================================================
        BULK / PACKAGE ITEMS
        ========================================================
        */

        receipt =
            appendItemSection(
                receipt,
                "BULK / PACKAGE ITEMS",
                bulkItems
            );


        /*
        Add a divider only when both sections exist.
        */

        if (
            bulkItems.length >
                0 &&
            pieceItems.length >
                0
        ) {

            receipt +=
                repeat(
                    "-",
                    PRINTER_WIDTH
                ) +
                "\n";

        }


        /*
        ========================================================
        PIECE ITEMS
        ========================================================
        */

        receipt =
            appendItemSection(
                receipt,
                "PIECE ITEMS",
                pieceItems
            );


        /*
        ========================================================
        TOTALS
        ========================================================
        */

        receipt +=
            repeat(
                "=",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Total Items",
                order.totalLines ??
                sortedItems.length
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Total Qty",
                formatQuantity(
                    order.totalQuantity
                )
            ) +
            "\n";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            twoColumns(
                "GRAND TOTAL",
                formatMoneyWithCurrency(
                    order.totalAmount
                )
            ) +
            "\n";


        receipt +=
            "\x1B\x45\x00";


        /*
        ========================================================
        NOTES
        ========================================================
        */

        if (
            order.notes
        ) {

            receipt +=
                repeat(
                    "-",
                    PRINTER_WIDTH
                ) +
                "\n";


            receipt +=
                "Notes:\n";


            for (
                const line
                of wrapText(
                    order.notes
                )
            ) {

                receipt +=
                    `${line}\n`;

            }

        }


        /*
        ========================================================
        WORKER AREA
        ========================================================
        */

        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            `Prepared: ${getUserDisplayName(
                order.createdBy
            )}\n`;


        receipt +=
            "\n";


        receipt +=
            "Picked By:\n";


        receipt +=
            "____________________________\n";


        receipt +=
            "\n";


        receipt +=
            "Checked By:\n";


        receipt +=
            "____________________________\n";


        /*
        ========================================================
        REVISION FOOTER
        ========================================================
        */

        receipt +=
            "\n";


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            "\x1B\x61\x01";


        receipt +=
            `REVISION ${
                Number(
                    order.revision
                ) ||
                1
            }\n`;


        receipt +=
            `Printed ${formatDateTime(
                new Date()
            )}\n`;


        receipt +=
            "\x1B\x61\x00";


        receipt +=
            "\n\n\n";


        /*
        ========================================================
        SEND
        ========================================================
        */

        return await sendToPrinter(
            receipt
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    printBulkOrderList,

};