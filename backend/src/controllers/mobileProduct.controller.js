import mobileProductService
    from "../services/mobileProduct.service.js";

import ApiResponse
    from "../utils/ApiResponse.js";


/*
============================================================
GET PRODUCTS
============================================================
*/

const getProducts =
    async (
        req,
        res,
        next
    ) => {

        try {

            const products =
                await mobileProductService
                    .getProducts({

                        branchId:
                            req.branchId,

                        search:
                            req.query.search,

                        category:
                            req.query.category,

                    });


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Online products retrieved successfully",
                        products
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
GET PRODUCT BY BARCODE
============================================================
*/

const getProductByBarcode =
    async (
        req,
        res,
        next
    ) => {

        try {

            const product =
                await mobileProductService
                    .getProductByBarcode({

                        branchId:
                            req.branchId,

                        barcode:
                            req.params.barcode,

                    });


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Online product retrieved successfully",
                        product
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

    getProducts,

    getProductByBarcode,

};