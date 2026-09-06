import express from "express";

import customerController from "../controllers/customer.controller.js";

import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import customerValidator from "../validators/customer.validator.js";


const router =
    express.Router();


/*
============================================================
IDENTIFY CUSTOMER

IMPORTANT:
Put this BEFORE /:id
============================================================
*/

router.get(
    "/identify/:identifier",

    protect,

    authorize(
        "admin",
        "cashier"
    ),

    customerController
        .identifyCustomer
);


/*
============================================================
GET CUSTOMERS
============================================================
*/

router.get(
    "/",

    protect,

    authorize(
        "admin",
        "cashier"
    ),

    customerController
        .getCustomers
);


/*
============================================================
CREATE CUSTOMER
============================================================
*/

router.post(
    "/",

    protect,

    authorize(
        "admin"
    ),

    validate(
        customerValidator
            .createCustomerSchema
    ),

    customerController
        .createCustomer
);


/*
============================================================
CUSTOMER ANALYTICS
============================================================
*/

router.get(
    "/:id/analytics",

    protect,

    authorize(
        "admin",
        "cashier"
    ),

    customerController
        .getCustomerAnalytics
);


/*
============================================================
CUSTOMER SALES
============================================================
*/

router.get(
    "/:id/sales",

    protect,

    authorize(
        "admin",
        "cashier"
    ),

    customerController
        .getCustomerSales
);


/*
============================================================
UPDATE CUSTOMER
============================================================
*/

router.patch(
    "/:id",

    protect,

    authorize(
        "admin"
    ),

    validate(
        customerValidator
            .updateCustomerSchema
    ),

    customerController
        .updateCustomer
);


/*
============================================================
GET CUSTOMER BY ID
============================================================
*/

router.get(
    "/:id",

    protect,

    authorize(
        "admin",
        "cashier"
    ),

    customerController
        .getCustomerById
);


export default router;