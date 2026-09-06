// backend/src/controllers/customer.controller.js

import customerService from "../services/customer.service.js";
import ApiResponse from "../utils/ApiResponse.js";


/*
============================================================
GET CUSTOMERS
============================================================
*/

const getCustomers =
    async (
        req,
        res,
        next
    ) => {

        try {

            let isActive;


            if (
                req.query.isActive !==
                undefined
            ) {

                isActive =
                    req.query.isActive ===
                    "true";

            }


            const customers =
                await customerService
                    .getCustomers({

                        search:
                            req.query.search ||
                            "",

                        isActive,

                    });


            res.status(
                200
            ).json(

                new ApiResponse(
                    true,
                    "Customers retrieved successfully",
                    customers
                )

            );

        } catch (
            error
        ) {

            next(error);

        }

    };


/*
============================================================
GET CUSTOMER
============================================================
*/

const getCustomerById =
    async (
        req,
        res,
        next
    ) => {

        try {

            const customer =
                await customerService
                    .getCustomerById(
                        req.params.id
                    );


            res.status(
                200
            ).json(

                new ApiResponse(
                    true,
                    "Customer retrieved successfully",
                    customer
                )

            );

        } catch (
            error
        ) {

            next(error);

        }

    };


/*
============================================================
CREATE CUSTOMER
============================================================
*/

const createCustomer =
    async (
        req,
        res,
        next
    ) => {

        try {

            const customer =
                await customerService
                    .createCustomer(
                        req.body
                    );


            res.status(
                201
            ).json(

                new ApiResponse(
                    true,
                    "Customer created successfully",
                    customer
                )

            );

        } catch (
            error
        ) {

            next(error);

        }

    };


/*
============================================================
UPDATE CUSTOMER
============================================================
*/

const updateCustomer =
    async (
        req,
        res,
        next
    ) => {

        try {

            const customer =
                await customerService
                    .updateCustomer(
                        req.params.id,
                        req.body
                    );


            res.status(
                200
            ).json(

                new ApiResponse(
                    true,
                    "Customer updated successfully",
                    customer
                )

            );

        } catch (
            error
        ) {

            next(error);

        }

    };


/*
============================================================
IDENTIFY CUSTOMER
============================================================
*/

const identifyCustomer =
    async (
        req,
        res,
        next
    ) => {

        try {

            const customer =
                await customerService
                    .identifyCustomer(
                        req.params.identifier
                    );


            res.status(
                200
            ).json(

                new ApiResponse(
                    true,
                    "Customer identified successfully",
                    customer
                )

            );

        } catch (
            error
        ) {

            next(error);

        }

    };


/*
============================================================
CUSTOMER ANALYTICS
============================================================
*/

const getCustomerAnalytics =
    async (
        req,
        res,
        next
    ) => {

        try {

            const analytics =
                await customerService
                    .getCustomerAnalytics(
                        req.params.id
                    );


            res.status(
                200
            ).json(

                new ApiResponse(
                    true,
                    "Customer analytics retrieved successfully",
                    analytics
                )

            );

        } catch (
            error
        ) {

            next(error);

        }

    };


/*
============================================================
CUSTOMER SALES
============================================================
*/

const getCustomerSales =
    async (
        req,
        res,
        next
    ) => {

        try {

            const sales =
                await customerService
                    .getCustomerSales(
                        req.params.id,
                        {
                            limit:
                                req.query.limit,
                        }
                    );


            res.status(
                200
            ).json(

                new ApiResponse(
                    true,
                    "Customer sales retrieved successfully",
                    sales
                )

            );

        } catch (
            error
        ) {

            next(error);

        }

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    getCustomers,

    getCustomerById,

    createCustomer,

    updateCustomer,

    identifyCustomer,

    getCustomerAnalytics,

    getCustomerSales,

};