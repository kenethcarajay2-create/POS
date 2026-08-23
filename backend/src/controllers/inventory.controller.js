import inventoryService from "../services/inventory.service.js";
import ApiResponse from "../utils/ApiResponse.js";

const stockIn = async (req, res, next) => {
    try {
        const result = await inventoryService.stockIn(
            req.body,
            req.user.id
        );

        res.status(200).json(
            new ApiResponse(
                true,
                "Stock added successfully",
                result
            )
        );
    } catch (error) {
        next(error);
    }
};
const stockOut = async (req, res, next) => {
    try {
        const result = await inventoryService.stockOut(
            req.body,
            req.user.id
        );

        res.status(200).json(
            new ApiResponse(
                true,
                "Stock removed successfully",
                result
            )
        );
    } catch (error) {
        next(error);
    }
};
const adjustStock = async (req, res, next) => {
    try {
        const result = await inventoryService.adjustStock(
            req.body,
            req.user.id
        );

        res.status(200).json(
            new ApiResponse(
                true,
                "Stock adjusted successfully",
                result
            )
        );
    } catch (error) {
        next(error);
    }
};

const getTransactions = async (req, res, next) => {

    try {

        const transactions =
            await inventoryService.getTransactions({
                productId:
                    req.query.productId,

                type:
                    req.query.type,

                limit:
                    req.query.limit,
            });


        res.status(200).json(

            new ApiResponse(
                true,
                "Inventory transactions retrieved successfully",
                transactions
            )

        );

    } catch (error) {

        next(error);

    }

};  

export default {
    stockIn,
    stockOut,
    adjustStock,
    getTransactions,
};