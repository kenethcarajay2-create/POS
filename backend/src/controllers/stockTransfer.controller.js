import stockTransferService
    from "../services/stockTransfer.service.js";

import stockTransferPrinterService
    from "../services/stockTransferPrinter.service.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const createTransfer =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfer =
                await stockTransferService
                    .createTransfer(
                        req.body,
                        req.user?._id ||
                        req.user?.id,
                        req.activeBranch
                    );


            res
                .status(
                    201
                )
                .json(
                    new ApiResponse(
                        true,
                        "Stock transfer draft created successfully.",
                        transfer
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


const updateTransfer =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfer =
                await stockTransferService
                    .updateTransfer(
                        req.params.id,
                        req.body,
                        req.user?._id ||
                        req.user?.id,
                        req.activeBranch
                    );


            res.json(
                new ApiResponse(
                    true,
                    "Stock transfer updated successfully.",
                    transfer
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


const completeTransfer =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfer =
                await stockTransferService
                    .completeTransfer(
                        req.params.id,
                        req.user?._id ||
                        req.user?.id,
                        req.activeBranch
                    );


            res.json(
                new ApiResponse(
                    true,
                    "Stock transfer completed successfully.",
                    transfer
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


const cancelTransfer =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfer =
                await stockTransferService
                    .cancelTransfer(
                        req.params.id,
                        req.user?._id ||
                        req.user?.id,
                        req.activeBranch
                    );


            res.json(
                new ApiResponse(
                    true,
                    "Stock transfer cancelled successfully.",
                    transfer
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


const getTransfers =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfers =
                await stockTransferService
                    .getTransfers(
                        req.branchId,
                        {
                            status:
                                req.query.status,

                            limit:
                                req.query.limit,
                        }
                    );


            res.json(
                new ApiResponse(
                    true,
                    "Stock transfers retrieved successfully.",
                    transfers
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


const getTransferById =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfer =
                await stockTransferService
                    .getTransferById(
                        req.params.id,
                        req.branchId
                    );


            res.json(
                new ApiResponse(
                    true,
                    "Stock transfer retrieved successfully.",
                    transfer
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


const printList =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfer =
                await stockTransferService
                    .getTransferById(
                        req.params.id,
                        req.branchId
                    );


            await stockTransferPrinterService
                .printTransferList(
                    transfer
                );


            res.json(
                new ApiResponse(
                    true,
                    "Transfer list printed successfully.",
                    {
                        transferId:
                            transfer._id,

                        transferNumber:
                            transfer.transferNumber,
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


const printReceipt =
    async (
        req,
        res,
        next
    ) => {

        try {

            const transfer =
                await stockTransferService
                    .getTransferById(
                        req.params.id,
                        req.branchId
                    );


            await stockTransferPrinterService
                .printTransferReceipt(
                    transfer
                );


            res.json(
                new ApiResponse(
                    true,
                    "Transfer receipt printed successfully.",
                    {
                        transferId:
                            transfer._id,

                        transferNumber:
                            transfer.transferNumber,
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


export default {
    createTransfer,

    updateTransfer,

    completeTransfer,

    cancelTransfer,

    getTransfers,

    getTransferById,

    printList,

    printReceipt,
};