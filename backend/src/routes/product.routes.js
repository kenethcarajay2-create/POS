import express from "express";

import productController from "../controllers/product.controller.js";

import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import productValidator from "../validators/product.validator.js";


const router =
    express.Router();


/*
==========================================================
CREATE PRODUCT
==========================================================
*/

router.post(
    "/",
    protect,
    authorize(
        "admin"
    ),
    validate(
        productValidator
            .createProductSchema
    ),
    productController
        .createProduct
);


/*
==========================================================
GENERATE UNIQUE BARCODE
==========================================================

IMPORTANT:
This MUST appear before /:id.
*/

router.get(
    "/generate-barcode",
    protect,
    authorize(
        "admin"
    ),
    productController
        .generateBarcode
);


/*
==========================================================
GET ALL PRODUCTS
==========================================================
*/

router.get(
    "/",
    protect,
    productController
        .getProducts
);


/*
==========================================================
GET PRODUCT BY ID
==========================================================
*/

router.get(
    "/:id",
    protect,
    productController
        .getProductById
);


/*
==========================================================
UPDATE PRODUCT
==========================================================
*/

router.put(
    "/:id",
    protect,
    authorize(
        "admin"
    ),
    validate(
        productValidator
            .updateProductSchema
    ),
    productController
        .updateProduct
);


/*
==========================================================
UPDATE PRODUCT STATUS
==========================================================
*/

router.patch(
    "/:id/status",
    protect,
    authorize(
        "admin"
    ),
    validate(
        productValidator
            .updateProductStatusSchema
    ),
    productController
        .updateProductStatus
);


export default router;