import productService from "../services/product.service.js";

import ApiResponse from "../utils/ApiResponse.js";


/*
============================================================
CREATE PRODUCT
============================================================

Products are global.

Initial inventory is created for the currently selected
branch.

resolveActiveBranch has already validated req.branchId.
============================================================
*/

const createProduct =
    async (
        req,
        res,
        next
    ) => {

        try {

            const product =
                await productService
                    .createProduct(
                        req.body,
                        req.branchId
                    );


            res
                .status(
                    201
                )
                .json(
                    new ApiResponse(
                        true,
                        "Product created successfully",
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


/*
============================================================
GET ALL PRODUCTS
============================================================

Returns global products decorated with inventory belonging
to the active branch.
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
                await productService
                    .getProducts(
                        req.branchId
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Products retrieved successfully",
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
GET PRODUCT BY ID
============================================================
*/

const getProductById =
    async (
        req,
        res,
        next
    ) => {

        try {

            const product =
                await productService
                    .getProductById(
                        req.params.id,
                        req.branchId
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Product retrieved successfully",
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


/*
============================================================
UPDATE PRODUCT
============================================================

Global product fields are updated on Product.

Branch-specific fields such as minimumStock are handled
against the currently selected BranchInventory.

Stock itself must still be changed through Inventory
Adjustment.
============================================================
*/

const updateProduct =
    async (
        req,
        res,
        next
    ) => {

        try {

            const product =
                await productService
                    .updateProduct(
                        req.params.id,
                        req.body,
                        req.branchId
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Product updated successfully",
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


/*
============================================================
UPDATE PRODUCT STATUS
============================================================

Product status remains global.

Response is decorated with the current branch inventory.
============================================================
*/

const updateProductStatus =
    async (
        req,
        res,
        next
    ) => {

        try {

            const product =
                await productService
                    .updateProductStatus(
                        req.params.id,
                        req.body.isActive,
                        req.branchId
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Product status updated successfully",
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


/*
============================================================
GENERATE BARCODE
============================================================
*/

const generateBarcode =
    async (
        req,
        res,
        next
    ) => {

        try {

            const barcode =
                await productService
                    .generateUniqueBarcode();


            res
                .status(
                    200
                )
                .json({

                    success:
                        true,

                    message:
                        "Barcode generated successfully.",

                    data: {

                        barcode,

                    },

                });


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

    createProduct,

    getProducts,

    getProductById,

    updateProduct,

    updateProductStatus,

    generateBarcode,

};