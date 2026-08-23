import saleService from "../services/sale.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import printerService from "../services/printer.service.js";
const checkout = async (req, res, next) => {
    try {

        const result = await saleService.checkout(
    req.body,
    req.user.id
);

        res.status(200).json(
            new ApiResponse(
                true,
                "Sale completed successfully.",
                result
            )
        );

    } catch (error) {
        next(error);
    }
};

const getSales = async (req, res, next) => {
    try {

        const sales =
            await saleService.getSales();

        res.status(200).json(
            new ApiResponse(
                true,
                "Sales retrieved successfully.",
                sales
            )
        );

    } catch (error) {
        next(error);
    }
};

const getSaleById = async (req, res, next) => {
    try {

        const sale =
            await saleService.getSaleById(
                req.params.id
            );

        res.status(200).json(
            new ApiResponse(
                true,
                "Sale retrieved successfully.",
                sale
            )
        );

    } catch (error) {
        next(error);
    }
};
const printSale = async (req, res, next) => {

    try {

        const sale =
            await saleService.getSaleById(
                req.params.id
            );

        const result =
            printerService.printSale(
                sale
            );

        res.status(200).json(
            new ApiResponse(
                true,
                "Receipt printed successfully.",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};
const voidSale = async (req, res, next) => {

    try {

        const sale =
            await saleService.voidSale(
                req.params.id,
                req.user?.id
            );

        res.status(200).json(
            new ApiResponse(
                true,
                "Sale voided successfully.",
                sale
            )
        );

    } catch (error) {

        next(error);

    }
};
const refundSale = async (req, res, next) => {

    try {

        const sale =
            await saleService.refundSale(
                req.params.id,
                req.body.items,
                req.user?.id
            );

        res.status(200).json(
            new ApiResponse(
                true,
                "Sale refunded successfully.",
                sale
            )
        );

    } catch (error) {

        next(error);

    }
};
export default {
    checkout,
    getSales,
    getSaleById,
    voidSale,
    refundSale, printSale
};