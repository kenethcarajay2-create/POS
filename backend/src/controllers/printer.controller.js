import printerService from "../services/printer.service.js";


/*
============================================================
PRINTER ERROR RESPONSE
============================================================

Printer/cash-drawer failures are hardware failures.

They must NEVER affect:
- completed sales
- stock deductions
- receipt creation
- customer loyalty
- checkout transaction

A sale may already be committed before printing starts.
============================================================
*/

const sendPrinterError =
    (
        res,
        error,
        fallbackMessage
    ) => {

        const message =
            error?.message ||
            fallbackMessage;


        console.error(
            "PRINTER HARDWARE ERROR:",
            message
        );


        /*
        503 is more accurate than 500.

        The POS/server itself is functioning.
        The external printer hardware is unavailable.
        */

        return res
            .status(
                503
            )
            .json({

                success:
                    false,

                message,

                hardwareFailure:
                    true,

                data:
                    null,

            });

    };


/*
============================================================
TEST PRINT
============================================================
*/

const testPrint =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            IMPORTANT:

            printerService.testPrint() returns a Promise because
            it uses the printer queue.

            It MUST be awaited.
            */

            const result =
                await printerService
                    .testPrint();


            return res
                .status(
                    200
                )
                .json({

                    success:
                        true,

                    message:
                        "Printer test completed successfully.",

                    data:
                        result,

                });


        } catch (
            error
        ) {

            return sendPrinterError(
                res,
                error,
                "Unable to print the test receipt."
            );

        }

    };


/*
============================================================
OPEN CASH DRAWER
============================================================
*/

const openCashDrawer =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            Await also works if the implementation currently
            returns a synchronous value.

            This keeps the controller correct if the service is
            made asynchronous later.
            */

            const result =
                await printerService
                    .openCashDrawer();


            return res
                .status(
                    200
                )
                .json({

                    success:
                        true,

                    message:
                        "Cash drawer command sent successfully.",

                    data:
                        result,

                });


        } catch (
            error
        ) {

            return sendPrinterError(
                res,
                error,
                "Unable to open the cash drawer."
            );

        }

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    testPrint,

    openCashDrawer,

};