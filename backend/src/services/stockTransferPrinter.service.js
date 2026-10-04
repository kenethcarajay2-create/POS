import escpos from "node-escpos-win";

import iconv from "iconv-lite";


const PRINTER_WIDTH =
    32;


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


        const words =
            text.split(
                " "
            );


        const lines =
            [];


        let line =
            "";


        for (
            const word
            of words
        ) {

            const candidate =
                line
                    ? `${line} ${word}`
                    : word;


            if (
                candidate.length <=
                width
            ) {

                line =
                    candidate;

            } else {

                if (
                    line
                ) {

                    lines.push(
                        line
                    );

                }


                line =
                    word;

            }

        }


        if (
            line
        ) {

            lines.push(
                line
            );

        }


        return lines;

    };


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
WORKER PICK LIST
============================================================
*/

const printTransferList =
    async (
        transfer
    ) => {

        let receipt =
            "";


        receipt +=
            "\x1B\x40";


        receipt +=
            "\x1B\x61\x01";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "STOREPOS\n";


        receipt +=
            "STOCK TRANSFER LIST\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            "\n";


        receipt +=
            "\x1B\x61\x00";


        receipt +=
            `Transfer: ${transfer.transferNumber}\n`;


        receipt +=
            `Status: ${transfer.status}\n`;


        receipt +=
            `Prepared: ${formatDateTime(
                transfer.createdAt
            )}\n`;


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            `FROM: ${transfer.sourceBranchSnapshot.code}\n`;


        receipt +=
            `${transfer.sourceBranchSnapshot.name}\n`;


        receipt +=
            "\n";


        receipt +=
            `TO: ${transfer.destinationBranchSnapshot.code}\n`;


        receipt +=
            `${transfer.destinationBranchSnapshot.name}\n`;


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "ITEMS TO PREPARE\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        for (
            const item
            of transfer.items ||
            []
        ) {

            receipt +=
                String(
                    item.name ||
                    "Item"
                )
                    .slice(
                        0,
                        PRINTER_WIDTH
                    ) +
                "\n";


            receipt +=
                twoColumns(
                    "Quantity",
                    `${item.quantity} ${
                        item.baseUnit ||
                        "pc"
                    }`
                ) +
                "\n";


            receipt +=
                "\n";

        }


        receipt +=
            repeat(
                "=",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Items",
                transfer.totalItems
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Total Qty",
                transfer.totalQuantity
            ) +
            "\n";


        if (
            transfer.remarks
        ) {

            receipt +=
                repeat(
                    "-",
                    PRINTER_WIDTH
                ) +
                "\n";


            receipt +=
                "Remarks:\n";


            for (
                const line
                of wrapText(
                    transfer.remarks
                )
            ) {

                receipt +=
                    `${line}\n`;

            }

        }


        receipt +=
            "\n";


        receipt +=
            "Prepared By:\n";


        receipt +=
            `${
                transfer.createdBy?.name ||
                transfer.createdBy?.username ||
                "________________"
            }\n`;


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


        receipt +=
            "\n\n\n";


        return await sendToPrinter(
            receipt
        );

    };


/*
============================================================
COMPLETED RECEIPT
============================================================
*/

const printTransferReceipt =
    async (
        transfer
    ) => {

        if (
            transfer.status !==
            "COMPLETED"
        ) {

            throw new Error(
                "Only completed transfers can print a transfer receipt."
            );

        }


        let receipt =
            "";


        receipt +=
            "\x1B\x40";


        receipt +=
            "\x1B\x61\x01";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "STOREPOS\n";


        receipt +=
            "STOCK TRANSFER RECEIPT\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            "\n";


        receipt +=
            "\x1B\x61\x00";


        receipt +=
            `Transfer: ${transfer.transferNumber}\n`;


        receipt +=
            `Completed: ${formatDateTime(
                transfer.completedAt
            )}\n`;


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            `FROM: ${transfer.sourceBranchSnapshot.code}\n`;


        receipt +=
            `${transfer.sourceBranchSnapshot.name}\n\n`;


        receipt +=
            `TO: ${transfer.destinationBranchSnapshot.code}\n`;


        receipt +=
            `${transfer.destinationBranchSnapshot.name}\n`;


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        for (
            const item
            of transfer.items ||
            []
        ) {

            receipt +=
                String(
                    item.name ||
                    "Item"
                )
                    .slice(
                        0,
                        PRINTER_WIDTH
                    ) +
                "\n";


            receipt +=
                twoColumns(
                    "Transferred",
                    `${item.quantity} ${
                        item.baseUnit ||
                        "pc"
                    }`
                ) +
                "\n";


            receipt +=
                "\n";

        }


        receipt +=
            repeat(
                "=",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Items",
                transfer.totalItems
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Total Qty",
                transfer.totalQuantity
            ) +
            "\n";


        if (
            transfer.remarks
        ) {

            receipt +=
                repeat(
                    "-",
                    PRINTER_WIDTH
                ) +
                "\n";


            receipt +=
                "Remarks:\n";


            for (
                const line
                of wrapText(
                    transfer.remarks
                )
            ) {

                receipt +=
                    `${line}\n`;

            }

        }


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            `Transferred By:\n${
                transfer.completedBy?.name ||
                transfer.completedBy?.username ||
                "Unknown"
            }\n`;


        receipt +=
            "\n";


        receipt +=
            "Released By:\n";


        receipt +=
            "____________________________\n";


        receipt +=
            "\n";


        receipt +=
            "Received By:\n";


        receipt +=
            "____________________________\n";


        receipt +=
            "\n\n\n";


        return await sendToPrinter(
            receipt
        );

    };


export default {
    printTransferList,

    printTransferReceipt,
};