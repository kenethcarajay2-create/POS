import escpos from "node-escpos-win";
import iconv from "iconv-lite";


/*
============================================================
PRINTER CONFIGURATION
============================================================
*/

const PRINTER_WIDTH = 32;


/*
============================================================
HELPERS
============================================================
*/

const repeat = (
    char,
    count
) => {

    return char.repeat(
        count
    );

};


const formatMoney = (
    value
) => {

    return `P ${Number(
        value ?? 0
    ).toFixed(2)}`;

};


const padRight = (
    text,
    length
) => {

    text =
        String(
            text
        );


    if (
        text.length >=
        length
    ) {

        return text.substring(
            0,
            length
        );

    }


    return (
        text +
        " ".repeat(
            length -
            text.length
        )
    );

};


const padLeft = (
    text,
    length
) => {

    text =
        String(
            text
        );


    if (
        text.length >=
        length
    ) {

        return text.substring(
            0,
            length
        );

    }


    return (
        " ".repeat(
            length -
            text.length
        ) +
        text
    );

};


const twoColumns = (
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

        return right.substring(
            0,
            PRINTER_WIDTH
        );

    }


    if (
        left.length >
        available
    ) {

        left =
            left.substring(
                0,
                available
            );

    }


    return (
        padRight(
            left,
            available
        ) +
        right
    );

};


/*
============================================================
FORMAT DATE
============================================================
*/

const formatDate = (
    value
) => {

    if (!value) {

        return "";

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

        return "";

    }


    return date.toLocaleDateString(
        "en-PH",
        {
            year:
                "numeric",

            month:
                "short",

            day:
                "numeric",
        }
    );

};


/*
============================================================
FORMAT DATE + TIME
============================================================
*/

const formatDateTime = (
    value
) => {

    if (!value) {

        return "";

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

        return "";

    }


    return date.toLocaleString(
        "en-PH"
    );

};


/*
============================================================
FIND XPRINTER
============================================================
*/

const getPrinter = () => {

    const devices =
        escpos.GetDeviceList(
            "USB"
        );


    if (
        !devices ||
        !devices.list ||
        devices.list.length ===
            0
    ) {

        throw new Error(
            "No USB devices detected."
        );

    }


    const printer =
        devices.list.find(
            (
                device
            ) =>
                device.service ===
                "usbprint"
        );


    if (!printer) {

        throw new Error(
            "Xprinter USB printer was not found."
        );

    }


    return printer;

};


/*
============================================================
SLEEP
============================================================
*/

const sleep = (
    ms
) => {

    return new Promise(
        (
            resolve
        ) => {

            setTimeout(
                resolve,
                ms
            );

        }
    );

};


/*
============================================================
PRINTER QUEUE
============================================================
*/

let printerQueue =
    Promise.resolve();


/*
============================================================
RAW PRINT ATTEMPT
============================================================
*/

const rawPrint = (
    receipt,
    encoding = "cp858"
) => {

    const printer =
        getPrinter();


    const data =
        iconv.encode(
            receipt,
            encoding
        );


    console.log(
        `Sending ${data.length} bytes to printer...`
    );


    const result =
        escpos.Print(
            printer.path,
            data
        );


    console.log(
        "Print result:",
        result
    );


    return result;

};


/*
============================================================
SEND TO PRINTER
============================================================
*/

const sendToPrinter = (
    receipt,
    encoding = "cp858"
) => {

    const job =
        async () => {

            const MAX_ATTEMPTS =
                3;


            for (
                let attempt = 1;
                attempt <=
                MAX_ATTEMPTS;
                attempt++
            ) {

                try {

                    console.log(
                        `Printer attempt ${attempt}/${MAX_ATTEMPTS}`
                    );


                    const result =
                        rawPrint(
                            receipt,
                            encoding
                        );


                    if (
                        result &&
                        Number(
                            result.success
                        ) ===
                        1
                    ) {

                        console.log(
                            "Printer job completed successfully."
                        );


                        await sleep(
                            500
                        );


                        return result;

                    }


                    console.error(
                        "Printer returned an error:",
                        result
                    );


                    if (
                        attempt <
                        MAX_ATTEMPTS
                    ) {

                        await sleep(
                            1500
                        );


                        continue;

                    }


                    throw new Error(
                        `Printer failed after ${MAX_ATTEMPTS} attempts. ` +
                        `Printer error code: ${
                            result?.err ??
                            "unknown"
                        }`
                    );


                } catch (
                    error
                ) {

                    console.error(
                        `Printer attempt ${attempt} failed:`,
                        error
                    );


                    if (
                        attempt >=
                        MAX_ATTEMPTS
                    ) {

                        throw error;

                    }


                    await sleep(
                        1500
                    );

                }

            }


            throw new Error(
                "Printer failed unexpectedly."
            );

        };


    const queuedJob =
        printerQueue
            .catch(
                () => {
                    // Keep queue alive.
                }
            )
            .then(
                job
            );


    printerQueue =
        queuedJob.catch(
            () => {
                // Keep queue usable after failure.
            }
        );


    return queuedJob;

};


/*
============================================================
PRINT SALE
============================================================
*/

const printSale = (
    sale
) => {

    if (!sale) {

        throw new Error(
            "Sale data is required for printing."
        );

    }


    console.log(
        "Printing receipt:",
        sale.receiptNumber
    );


    const saleItems =
        Array.isArray(
            sale.items
        )
            ? sale.items
            : [];


    /*
    ========================================================
    REFUND TOTALS
    ========================================================
    */

    let refundedAmount =
        0;


    let currentSubtotal =
        0;


    for (
        const item
        of saleItems
    ) {

        const quantity =
            Number(
                item.quantity ||
                0
            );


        const refundedQuantity =
            Number(
                item.refundedQuantity ||
                0
            );


        const remainingQuantity =
            Math.max(
                quantity -
                refundedQuantity,
                0
            );


        const unitPrice =
            Number(
                item.unitPrice ||
                0
            );


        refundedAmount +=
            refundedQuantity *
            unitPrice;


        currentSubtotal +=
            remainingQuantity *
            unitPrice;

    }


    const originalSubtotal =
        Number(
            sale.subtotal ||
            0
        );


    const originalTotal =
        Number(
            sale.total ||
            0
        );


    const discount =
        Number(
            sale.discount ||
            0
        );


    let currentTotal =
        Math.max(
            currentSubtotal -
            discount,
            0
        );


    if (
        sale.status ===
        "VOIDED"
    ) {

        currentTotal =
            0;

    }


    let receipt =
        "";


    /*
    --------------------------------------------------------
    INITIALIZE
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x40";


    /*
    --------------------------------------------------------
    HEADER
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x61\x01";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "STOREPOS\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        "YOUR STORE NAME\n";


    receipt +=
        "\n";


    /*
    --------------------------------------------------------
    STATUS HEADER
    --------------------------------------------------------
    */

    if (
        sale.status ===
        "VOIDED"
    ) {

        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "*** VOIDED SALE ***\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            "\n";

    }
    else if (
        sale.status ===
        "REFUNDED"
    ) {

        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "*** REFUNDED SALE ***\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            "\n";

    }
    else if (
        sale.status ===
        "PARTIALLY_REFUNDED"
    ) {

        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "*** UPDATED RECEIPT ***\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            "PARTIAL REFUND\n";


        receipt +=
            "\n";

    }


    /*
    --------------------------------------------------------
    RECEIPT INFORMATION
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x61\x00";


    receipt +=
        `Receipt: ${
            sale.receiptNumber
        }\n`;


    receipt +=
        `Date: ${
            formatDateTime(
                sale.createdAt
            )
        }\n`;


    receipt +=
        `Cashier: ${
            sale.cashier?.name ||
            "Cashier"
        }\n`;


    receipt +=
        `Status: ${
            sale.status ||
            "COMPLETED"
        }\n`;


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    ITEMS
    --------------------------------------------------------
    */

    for (
        const item
        of saleItems
    ) {

        const name =
            String(
                item.name ||
                "Item"
            ).trim();


        const quantity =
            Number(
                item.quantity ||
                0
            );


        const refundedQuantity =
            Number(
                item.refundedQuantity ||
                0
            );


        const remainingQuantity =
            Math.max(
                quantity -
                refundedQuantity,
                0
            );


        const unitPrice =
            Number(
                item.unitPrice ||
                0
            );


        const originalItemTotal =
            Number(
                item.subtotal ??
                (
                    quantity *
                    unitPrice
                )
            );


        const refundedItemAmount =
            refundedQuantity *
            unitPrice;


        const remainingItemTotal =
            remainingQuantity *
            unitPrice;


        receipt +=
            name.substring(
                0,
                PRINTER_WIDTH
            ) +
            "\n";


        if (
            item.isOpenPrice ===
            true
        ) {

            receipt +=
                "Open Price\n";

        }


        receipt +=
            twoColumns(
                `${quantity} x ${formatMoney(
                    unitPrice
                )}`,
                formatMoney(
                    originalItemTotal
                )
            ) +
            "\n";


        if (
            refundedQuantity >
            0
        ) {

            receipt +=
                twoColumns(
                    `Refunded x${refundedQuantity}`,
                    `-${formatMoney(
                        refundedItemAmount
                    )}`
                ) +
                "\n";


            if (
                remainingQuantity >
                0
            ) {

                receipt +=
                    twoColumns(
                        `Remaining x${remainingQuantity}`,
                        formatMoney(
                            remainingItemTotal
                        )
                    ) +
                    "\n";

            }
            else {

                receipt +=
                    "FULLY REFUNDED\n";

            }

        }


        receipt +=
            "\n";

    }


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    TOTALS
    --------------------------------------------------------
    */

    if (
        refundedAmount >
        0
    ) {

        receipt +=
            twoColumns(
                "Original Subtotal",
                formatMoney(
                    originalSubtotal
                )
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Refunded",
                `-${formatMoney(
                    refundedAmount
                )}`
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Current Subtotal",
                formatMoney(
                    currentSubtotal
                )
            ) +
            "\n";

    }
    else {

        receipt +=
            twoColumns(
                "Subtotal",
                formatMoney(
                    originalSubtotal
                )
            ) +
            "\n";

    }


    if (
        discount >
        0
    ) {

        receipt +=
            twoColumns(
                "Discount",
                `-${formatMoney(
                    discount
                )}`
            ) +
            "\n";

    }


    if (
        refundedAmount >
        0
    ) {

        receipt +=
            twoColumns(
                "Original Total",
                formatMoney(
                    originalTotal
                )
            ) +
            "\n";

    }


    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    NET TOTAL
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x45\x01";


    receipt +=
        twoColumns(
            sale.status ===
                "VOIDED"
                ? "NET TOTAL"
                : refundedAmount >
                    0
                    ? "NET TOTAL"
                    : "TOTAL",

            formatMoney(
                sale.status ===
                    "VOIDED"
                    ? 0
                    : refundedAmount >
                        0
                        ? currentTotal
                        : originalTotal
            )
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    ORIGINAL PAYMENT
    --------------------------------------------------------
    */

    receipt +=
        twoColumns(
            "Payment",
            formatMoney(
                sale.payment
            )
        ) +
        "\n";


    receipt +=
        twoColumns(
            "Change",
            formatMoney(
                sale.change
            )
        ) +
        "\n";


    /*
    --------------------------------------------------------
    REFUND SUMMARY
    --------------------------------------------------------
    */

    if (
        refundedAmount >
        0
    ) {

        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            twoColumns(
                "TOTAL REFUNDED",
                formatMoney(
                    refundedAmount
                )
            ) +
            "\n";


        receipt +=
            "\x1B\x45\x00";

    }


    /*
    --------------------------------------------------------
    VOID NOTICE
    --------------------------------------------------------
    */

    if (
        sale.status ===
        "VOIDED"
    ) {

        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            "\x1B\x61\x01";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "THIS SALE HAS BEEN VOIDED\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            "\x1B\x61\x00";

    }


    /*
    --------------------------------------------------------
    FOOTER
    --------------------------------------------------------
    */

    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        "\x1B\x61\x01";


    receipt +=
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "THANK YOU!\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        "Please come again.\n";


    receipt +=
        "\n\n\n";


    return sendToPrinter(
        receipt
    );

};


/*
============================================================
TEST PRINT
============================================================
*/

const testPrint = () => {

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
        "\x1B\x45\x00";


    receipt +=
        "ESC/POS TEST PRINT\n";


    receipt +=
        "\n";


    receipt +=
        "\x1B\x61\x00";


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        "Printer: Xprinter XP-58\n";


    receipt +=
        "Connection: USB\n";


    receipt +=
        "\n";


    receipt +=
        "Hello from StorePOS!\n";


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
        "TEST SUCCESSFUL\n";


    receipt +=
        "\n\n\n";


    return sendToPrinter(
        receipt,
        "cp437"
    );

};


/*
============================================================
OPEN CASH DRAWER
============================================================
*/

const openCashDrawer = () => {

    const printer =
        getPrinter();


    const data =
        Buffer.from([
            0x1B,
            0x70,
            0x00,
            0x19,
            0xFA,
        ]);


    console.log(
        "Sending cash drawer open command..."
    );


    const result =
        escpos.Print(
            printer.path,
            data
        );


    console.log(
        "Cash drawer result:",
        result
    );


    return result;

};


/*
============================================================
PRINT LEDGER
============================================================
*/

const printLedger = (
    account
) => {

    if (!account) {

        throw new Error(
            "Ledger account data is required for printing."
        );

    }


    console.log(
        "Printing ledger:",
        account.name
    );


    let receipt =
        "";


    /*
    --------------------------------------------------------
    INITIALIZE
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x40";


    /*
    --------------------------------------------------------
    HEADER
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x61\x01";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "STOREPOS\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        "ACCOUNT LEDGER\n";


    receipt +=
        "\n";


    /*
    --------------------------------------------------------
    ACCOUNT INFO
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x61\x00";


    receipt +=
        `Account: ${
            account.name ||
            "Unknown"
        }\n`;


    receipt +=
        `Type: ${
            account.type ||
            "CUSTOMER"
        }\n`;


    if (
        account.phone
    ) {

        receipt +=
            `Contact: ${
                account.phone
            }\n`;

    }


    if (
        account.type ===
            "WORKER" &&
        account.salaryPeriod
    ) {

        receipt +=
            `Period: ${
                account.salaryPeriod
            }\n`;

    }


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    TRANSACTIONS
    --------------------------------------------------------
    */

    const transactions =
        Array.isArray(
            account.transactions
        )
            ? account.transactions
            : [];


    if (
        transactions.length ===
        0
    ) {

        receipt +=
            "\n";


        receipt +=
            "No transactions recorded.\n";


        receipt +=
            "\n";

    }


    for (
        const transaction
        of transactions
    ) {

        const isPayment =
            transaction.type ===
            "PAYMENT";


        const isAdvance =
            transaction.type ===
            "CASH_ADVANCE";


        const title =
            isPayment
                ? "PAYMENT"
                : isAdvance
                    ? "CASH ADVANCE"
                    : "CREDIT PURCHASE";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            `${title}\n`;


        receipt +=
            "\x1B\x45\x00";


        if (
            transaction.createdAt ||
            transaction.date
        ) {

            receipt +=
                `${formatDateTime(
                    transaction.createdAt ||
                    transaction.date
                )}\n`;

        }


        if (
            transaction.remarks ||
            transaction.description
        ) {

            receipt +=
                `${
                    transaction.remarks ||
                    transaction.description
                }\n`;

        }


        receipt +=
            "\n";


        const items =
            Array.isArray(
                transaction.items
            )
                ? transaction.items
                : [];


        for (
            const item
            of items
        ) {

            const name =
                String(
                    item.name ||
                    item.product?.name ||
                    "Product"
                ).trim();


            const quantity =
                Number(
                    item.quantity ||
                    0
                );


            const price =
                Number(
                    item.price ??
                    item.unitPrice ??
                    item.product?.price ??
                    0
                );


            const subtotal =
                Number(
                    item.total ??
                    item.subtotal ??
                    (
                        quantity *
                        price
                    )
                );


            receipt +=
                name.substring(
                    0,
                    PRINTER_WIDTH
                ) +
                "\n";


            receipt +=
                twoColumns(
                    `${quantity} x ${formatMoney(
                        price
                    )}`,
                    formatMoney(
                        subtotal
                    )
                ) +
                "\n";

        }


        if (
            items.length >
            0
        ) {

            receipt +=
                repeat(
                    "-",
                    PRINTER_WIDTH
                ) +
                "\n";

        }


        const amount =
            Number(
                transaction.amount ||
                0
            );


        receipt +=
            twoColumns(
                title,
                isPayment
                    ? `-${formatMoney(
                        amount
                    )}`
                    : `+${formatMoney(
                        amount
                    )}`
            ) +
            "\n";


        receipt +=
            "\n";

    }


    /*
    --------------------------------------------------------
    OUTSTANDING
    --------------------------------------------------------
    */

    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        twoColumns(
            "OUTSTANDING",
            formatMoney(
                account.creditBalance
            )
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    WORKER SALARY SUMMARY
    --------------------------------------------------------
    */

    if (
        account.type ===
        "WORKER"
    ) {

        const salary =
            Number(
                account.salary ||
                0
            );


        const creditBalance =
            Number(
                account.creditBalance ||
                0
            );


        const cashAdvance =
            Number(
                account.cashAdvance ||
                0
            );


        const remainingSalary =
            Math.max(
                salary -
                creditBalance -
                cashAdvance,
                0
            );


        receipt +=
            "\n";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            "SALARY SUMMARY\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Salary",
                formatMoney(
                    salary
                )
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Credits",
                formatMoney(
                    creditBalance
                )
            ) +
            "\n";


        receipt +=
            twoColumns(
                "Cash Advances",
                formatMoney(
                    cashAdvance
                )
            ) +
            "\n";


        receipt +=
            repeat(
                "-",
                PRINTER_WIDTH
            ) +
            "\n";


        receipt +=
            "\x1B\x45\x01";


        receipt +=
            twoColumns(
                "REMAINING SALARY",
                formatMoney(
                    remainingSalary
                )
            ) +
            "\n";


        receipt +=
            "\x1B\x45\x00";


        receipt +=
            repeat(
                "=",
                PRINTER_WIDTH
            ) +
            "\n";

    }


    /*
    --------------------------------------------------------
    FOOTER
    --------------------------------------------------------
    */

    receipt +=
        "\n";


    receipt +=
        "\x1B\x61\x01";


    receipt +=
        "STOREPOS\n";


    receipt +=
        "Account Ledger\n";


    receipt +=
        "\n";


    receipt +=
        `Printed: ${
            formatDateTime(
                new Date()
            )
        }\n`;


    receipt +=
        "\n\n\n";


    return sendToPrinter(
        receipt
    );

};


/*
============================================================
PRINT WORKER SALARY RECEIPT
============================================================
*/

const printWorkerSalaryReceipt = (
    data
) => {

    if (!data) {

        throw new Error(
            "Worker salary receipt data is required."
        );

    }


    const worker =
        data.worker;


    const workerLedger =
        data.workerLedger ||
        data.ledger;


    const transactions =
        Array.isArray(
            data.transactions
        )
            ? data.transactions
            : [];


    if (!worker) {

        throw new Error(
            "Worker data is required."
        );

    }


    if (!workerLedger) {

        throw new Error(
            "Worker ledger data is required."
        );

    }


    console.log(
        "Printing worker salary receipt:",
        worker.name
    );


    const salary =
        Number(
            workerLedger.salary ||
            0
        );


    const totalCredits =
        Number(
            workerLedger.totalCredits ||
            0
        );


    const totalCashAdvances =
        Number(
            workerLedger.totalCashAdvances ||
            0
        );


    const salaryReleased =
        Number(
            workerLedger.salaryReleased ??
            workerLedger.remainingSalary ??
            Math.max(
                salary -
                totalCredits -
                totalCashAdvances,
                0
            )
        );


    const creditTransactions =
        transactions.filter(
            (
                transaction
            ) =>
                transaction.type ===
                "CREDIT"
        );


    const cashAdvanceTransactions =
        transactions.filter(
            (
                transaction
            ) =>
                transaction.type ===
                "CASH_ADVANCE"
        );


    let receipt =
        "";


    /*
    --------------------------------------------------------
    INITIALIZE
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x40";


    /*
    --------------------------------------------------------
    HEADER
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x61\x01";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "STOREPOS\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        "WORKER PAY RECEIPT\n";


    receipt +=
        "\n";


    /*
    --------------------------------------------------------
    WORKER NAME
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x45\x01";


    receipt +=
        String(
            worker.name ||
            "WORKER"
        )
            .toUpperCase()
            .substring(
                0,
                PRINTER_WIDTH
            ) +
        "\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        "\n";


    /*
    --------------------------------------------------------
    PERIOD INFORMATION
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x61\x00";


    if (
        workerLedger.periodNumber
    ) {

        receipt +=
            `Period #: ${
                workerLedger.periodNumber
            }\n`;

    }


    if (
        workerLedger.payFrequency
    ) {

        receipt +=
            `Frequency: ${
                workerLedger.payFrequency
            }\n`;

    }


    if (
        workerLedger.periodStart &&
        workerLedger.periodEnd
    ) {

        receipt +=
            `From: ${
                formatDate(
                    workerLedger.periodStart
                )
            }\n`;


        receipt +=
            `To:   ${
                formatDate(
                    workerLedger.periodEnd
                )
            }\n`;

    }


    if (
        workerLedger.paidAt
    ) {

        receipt +=
            `Paid: ${
                formatDateTime(
                    workerLedger.paidAt
                )
            }\n`;

    }


    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    SALARY
    --------------------------------------------------------
    */

    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "SALARY\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        twoColumns(
            "Basic Salary",
            formatMoney(
                salary
            )
        ) +
        "\n";


    /*
    --------------------------------------------------------
    CREDIT PURCHASES
    --------------------------------------------------------
    */

    receipt +=
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "CREDIT PURCHASES\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    if (
        creditTransactions.length ===
        0
    ) {

        receipt +=
            "No credit purchases.\n";

    }


    for (
        const transaction
        of creditTransactions
    ) {

        if (
            transaction.createdAt ||
            transaction.date
        ) {

            receipt +=
                `${formatDate(
                    transaction.createdAt ||
                    transaction.date
                )}\n`;

        }


        const description =
            String(
                transaction.description ||
                transaction.remarks ||
                ""
            ).trim();


        if (
            description
        ) {

            receipt +=
                description.substring(
                    0,
                    PRINTER_WIDTH
                ) +
                "\n";

        }


        const items =
            Array.isArray(
                transaction.items
            )
                ? transaction.items
                : [];


        if (
            items.length ===
            0
        ) {

            receipt +=
                twoColumns(
                    "Credit",
                    formatMoney(
                        transaction.amount
                    )
                ) +
                "\n";

        }


        for (
            const item
            of items
        ) {

            const name =
                String(
                    item.name ||
                    item.product?.name ||
                    "Product"
                ).trim();


            const quantity =
                Number(
                    item.quantity ||
                    0
                );


            const unitPrice =
                Number(
                    item.unitPrice ??
                    item.price ??
                    item.product?.price ??
                    0
                );


            const itemTotal =
                Number(
                    item.total ??
                    item.subtotal ??
                    (
                        quantity *
                        unitPrice
                    )
                );


            receipt +=
                name.substring(
                    0,
                    PRINTER_WIDTH
                ) +
                "\n";


            receipt +=
                twoColumns(
                    `${quantity} x ${formatMoney(
                        unitPrice
                    )}`,
                    formatMoney(
                        itemTotal
                    )
                ) +
                "\n";

        }


        receipt +=
            "\n";

    }


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        twoColumns(
            "Total Credits",
            formatMoney(
                totalCredits
            )
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x00";


    /*
    --------------------------------------------------------
    CASH ADVANCES
    --------------------------------------------------------
    */

    receipt +=
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "CASH ADVANCES\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    if (
        cashAdvanceTransactions.length ===
        0
    ) {

        if (
            totalCashAdvances >
            0
        ) {

            receipt +=
                twoColumns(
                    "Cash Advance",
                    formatMoney(
                        totalCashAdvances
                    )
                ) +
                "\n";

        }
        else {

            receipt +=
                "No cash advances.\n";

        }

    }


    for (
        const transaction
        of cashAdvanceTransactions
    ) {

        if (
            transaction.createdAt ||
            transaction.date
        ) {

            receipt +=
                `${formatDate(
                    transaction.createdAt ||
                    transaction.date
                )}\n`;

        }


        const description =
            String(
                transaction.description ||
                transaction.remarks ||
                "Cash Advance"
            ).trim();


        receipt +=
            twoColumns(
                description.substring(
                    0,
                    17
                ),
                formatMoney(
                    transaction.amount
                )
            ) +
            "\n";


        receipt +=
            "\n";

    }


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        twoColumns(
            "Total Advances",
            formatMoney(
                totalCashAdvances
            )
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x00";


    /*
    --------------------------------------------------------
    FINAL SALARY SUMMARY
    --------------------------------------------------------
    */

    receipt +=
        "\n";


    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "SALARY SUMMARY\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        repeat(
            "-",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        twoColumns(
            "Basic Salary",
            formatMoney(
                salary
            )
        ) +
        "\n";


    receipt +=
        twoColumns(
            "Less Credits",
            `-${formatMoney(
                totalCredits
            )}`
        ) +
        "\n";


    receipt +=
        twoColumns(
            "Less Advances",
            `-${formatMoney(
                totalCashAdvances
            )}`
        ) +
        "\n";


    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        twoColumns(
            "SALARY RELEASED",
            formatMoney(
                salaryReleased
            )
        ) +
        "\n";


    receipt +=
        "\x1B\x45\x00";


    receipt +=
        repeat(
            "=",
            PRINTER_WIDTH
        ) +
        "\n";


    /*
    --------------------------------------------------------
    PAID
    --------------------------------------------------------
    */

    receipt +=
        "\n";


    receipt +=
        "\x1B\x61\x01";


    receipt +=
        "\x1B\x45\x01";


    receipt +=
        "PAID\n";


    receipt +=
        "\x1B\x45\x00";


    if (
        workerLedger.paidAt
    ) {

        receipt +=
            `${formatDateTime(
                workerLedger.paidAt
            )}\n`;

    }


    receipt +=
        "\n";


    receipt +=
        "STOREPOS\n";


    receipt +=
        "\n\n\n";


    return sendToPrinter(
        receipt
    );

};


/*
============================================================
EXPORT
============================================================
*/

export default {

    testPrint,

    printSale,

    printLedger,

    printWorkerSalaryReceipt,

    openCashDrawer,

};