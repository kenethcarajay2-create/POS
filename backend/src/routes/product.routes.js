import express from "express";

import productController from "../controllers/product.controller.js";

import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import productValidator from "../validators/product.validator.js";


const router = express.Router();


/*
==========================================================
CREATE PRODUCT
==========================================================

Admin only.
Cashiers can use products but cannot create them.
*/

router.post(
    "/",
    protect,
    authorize("admin"),
    validate(
        productValidator.createProductSchema
    ),
    productController.createProduct
);


/*
==========================================================
GET ALL PRODUCTS
==========================================================

Admin + Cashier.

Cashiers need this for the POS.
*/

router.get(
    "/",
    protect,
    productController.getProducts
);


/*
==========================================================
GET PRODUCT BY ID
==========================================================

Admin + Cashier.

Useful for POS product lookup/barcode lookup.
*/

router.get(
    "/:id",
    protect,
    productController.getProductById
);


/*
==========================================================
UPDATE PRODUCT
==========================================================

Admin only.
*/

router.put(
    "/:id",
    protect,
    authorize("admin"),
    validate(
        productValidator.updateProductSchema
    ),
    productController.updateProduct
);


/*
==========================================================
UPDATE PRODUCT STATUS
==========================================================

Admin only.
*/

router.patch(
    "/:id/status",
    protect,
    authorize("admin"),
    validate(
        productValidator.updateProductStatusSchema
    ),
    productController.updateProductStatus
);


export default router;