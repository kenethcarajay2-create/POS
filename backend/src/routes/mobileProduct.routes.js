import express from "express";

import mobileProductController
    from "../controllers/mobileProduct.controller.js";

import protectOnline
    from "../middleware/onlineAuth.middleware.js";

import resolveOnlineActiveBranch
    from "../middleware/onlineBranch.middleware.js";

import permit
    from "../middleware/permission.middleware.js";


const router =
    express.Router();


/*
============================================================
ALL MOBILE PRODUCT ROUTES
============================================================

Required:

1. Valid online JWT
2. Valid current cloud user
3. Valid accessible branch
4. POS permission
============================================================
*/


/*
============================================================
GET PRODUCTS
============================================================

GET /api/online/products

Optional:

?search=coke
?category=Beverages
============================================================
*/

router.get(
    "/",

    protectOnline,

    resolveOnlineActiveBranch,

    permit(
        "pos"
    ),

    mobileProductController
        .getProducts
);


/*
============================================================
GET PRODUCT BY BARCODE
============================================================

GET /api/online/products/barcode/:barcode

Must remain before a future /:id route.
============================================================
*/

router.get(
    "/barcode/:barcode",

    protectOnline,

    resolveOnlineActiveBranch,

    permit(
        "pos"
    ),

    mobileProductController
        .getProductByBarcode
);


export default router;