import saleService
    from "../services/sale.service.js";

import printerService
    from "../services/printer.service.js";

import ApiResponse
    from "../utils/ApiResponse.js";


/*
============================================================
CHECKOUT
============================================================
*/

const checkout =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            ====================================================
            OPTIONAL PREPARED CART CONTEXT
            ====================================================

            Ordinary POS checkouts do not send these headers.

            A mobile PreparedCart checkout sends both.

            Branch is still resolved independently through
            resolveActiveBranch and is never trusted from the
            frontend body.
            ====================================================
            */

            const preparedCartId =
                String(
                    req.get(
                        "X-Prepared-Cart-Id"
                    ) ||
                    ""
                ).trim();


            const claimToken =
                String(
                    req.get(
                        "X-Prepared-Cart-Claim-Token"
                    ) ||
                    ""
                ).trim();


            let preparedCartContext =
                null;


            if (
                preparedCartId ||
                claimToken
            ) {

                preparedCartContext = {

                    preparedCartId,

                    claimToken,

                };

            }


            const sale =
                await saleService
                    .checkout(

                        req.body,

                        req.user?._id ||
                        req.user?.id,

                        req.activeBranch,

                        preparedCartContext

                    );


            return res
                .status(
                    201
                )
                .json(
                    new ApiResponse(
                        true,
                        "Sale completed successfully.",
                        sale
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
GET SALES
============================================================
*/

const getSales =
    async (
        req,
        res,
        next
    ) => {

        try {

            const sales =
                await saleService
                    .getSales(
                        req.branchId
                    );


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Sales retrieved successfully.",
                        sales
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
GET SALE BY ID
============================================================
*/

const getSaleById =
    async (
        req,
        res,
        next
    ) => {

        try {

            const sale =
                await saleService
                    .getSaleById(
                        req.params.id,
                        req.branchId
                    );


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Sale retrieved successfully.",
                        sale
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
VOID SALE
============================================================
*/

const voidSale =
    async (
        req,
        res,
        next
    ) => {

        try {

            const sale =
                await saleService
                    .voidSale(

                        req.params.id,

                        req.user?._id ||
                        req.user?.id,

                        req.branchId

                    );


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Sale voided successfully.",
                        sale
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
REFUND SALE
============================================================
*/

const refundSale =
    async (
        req,
        res,
        next
    ) => {

        try {

            const sale =
                await saleService
                    .refundSale(

                        req.params.id,

                        req.body?.items,

                        req.user?._id ||
                        req.user?.id,

                        req.branchId

                    );


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Sale refunded successfully.",
                        sale
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
PRINT / REPRINT SALE
============================================================

Loads the sale through saleService using the ACTIVE branch.

This preserves branch isolation:

- a sale from another branch cannot be printed
- supplying another sale ID is not enough
- getSaleById already enforces branch ownership

printerService.printSale() performs the actual ESC/POS print.
============================================================
*/

const printSale =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            ====================================================
            LOAD SALE FROM ACTIVE BRANCH
            ====================================================
            */

            const sale =
                await saleService
                    .getSaleById(
                        req.params.id,
                        req.branchId
                    );


            /*
            ====================================================
            PRINT
            ====================================================
            */

            await printerService
                .printSale(
                    sale
                );


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Receipt printed successfully.",
                        {
                            saleId:
                                sale._id,

                            receiptNumber:
                                sale.receiptNumber,
                        }
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    checkout,

    getSales,

    getSaleById,

    voidSale,

    refundSale,

    printSale,

};