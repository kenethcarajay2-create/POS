// backend/src/services/customer.service.js

import mongoose from "mongoose";

import Customer from "../models/customer.model.js";
import CustomerCounter from "../models/customerCounter.model.js";
import Sale from "../models/sale.model.js";

import ApiError from "../utils/ApiError.js";


/*
============================================================
CUSTOMER CODE
============================================================
*/

const generateCustomerCode =
    async () => {

        const counter =
            await CustomerCounter.findOneAndUpdate(
                {
                    key:
                        "customer",
                },
                {
                    $inc: {
                        sequence:
                            1,
                    },
                },
                {
                    new:
                        true,

                    upsert:
                        true,

                    setDefaultsOnInsert:
                        true,
                }
            );


        return `CUST-${String(
            counter.sequence
        ).padStart(
            6,
            "0"
        )}`;

    };


/*
============================================================
NORMALIZE RFID
============================================================
*/

const normalizeRfid = (
    value
) => {

    if (!value) {
        return null;
    }


    const normalized =
        String(value)
            .trim()
            .toUpperCase();


    return (
        normalized ||
        null
    );

};


/*
============================================================
GET CUSTOMERS
============================================================
*/

const getCustomers =
    async ({
        search = "",
        isActive,
    } = {}) => {

        const filter =
            {};


        if (
            typeof isActive ===
            "boolean"
        ) {

            filter.isActive =
                isActive;

        }


        const query =
            String(
                search ||
                ""
            )
                .trim();


        if (query) {

            filter.$or = [

                {
                    name: {
                        $regex:
                            query,

                        $options:
                            "i",
                    },
                },

                {
                    phone: {
                        $regex:
                            query,

                        $options:
                            "i",
                    },
                },

                {
                    customerCode: {
                        $regex:
                            query,

                        $options:
                            "i",
                    },
                },

                {
                    rfidUid: {
                        $regex:
                            query,

                        $options:
                            "i",
                    },
                },

            ];

        }


        return await Customer.find(
            filter
        )
            .sort({
                createdAt:
                    -1,
            });

    };


/*
============================================================
GET CUSTOMER
============================================================
*/

const getCustomerById =
    async (
        customerId
    ) => {

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    customerId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid customer ID."
            );

        }


        const customer =
            await Customer.findById(
                customerId
            );


        if (!customer) {

            throw new ApiError(
                404,
                "Customer not found."
            );

        }


        return customer;

    };


/*
============================================================
CREATE CUSTOMER
============================================================
*/

const createCustomer =
    async ({
        name,
        phone = "",
        rfidUid = null,
    }) => {

        const normalizedName =
            String(
                name ||
                ""
            ).trim();


        if (
            !normalizedName
        ) {

            throw new ApiError(
                400,
                "Customer name is required."
            );

        }


        const normalizedRfid =
            normalizeRfid(
                rfidUid
            );


        /*
        --------------------------------------------------------
        RFID MUST BE UNIQUE
        --------------------------------------------------------
        */

        if (
            normalizedRfid
        ) {

            const existingRfid =
                await Customer.findOne({
                    rfidUid:
                        normalizedRfid,
                });


            if (
                existingRfid
            ) {

                throw new ApiError(
                    409,
                    "This RFID card is already assigned to another customer."
                );

            }

        }


        const customerCode =
            await generateCustomerCode();


        const customer =
            await Customer.create({

                customerCode,

                name:
                    normalizedName,

                phone:
                    String(
                        phone ||
                        ""
                    ).trim(),

                rfidUid:
                    normalizedRfid,

                loyaltyPoints:
                    0,

                lifetimePoints:
                    0,

                loyaltyTier:
                    "REGULAR",

                isActive:
                    true,

            });


        return customer;

    };


/*
============================================================
UPDATE CUSTOMER
============================================================
*/

const updateCustomer =
    async (
        customerId,
        data
    ) => {

        const customer =
            await getCustomerById(
                customerId
            );


        /*
        --------------------------------------------------------
        NAME
        --------------------------------------------------------
        */

        if (
            data.name !==
            undefined
        ) {

            const name =
                String(
                    data.name
                ).trim();


            if (!name) {

                throw new ApiError(
                    400,
                    "Customer name cannot be empty."
                );

            }


            customer.name =
                name;

        }


        /*
        --------------------------------------------------------
        PHONE
        --------------------------------------------------------
        */

        if (
            data.phone !==
            undefined
        ) {

            customer.phone =
                String(
                    data.phone ||
                    ""
                ).trim();

        }


        /*
        --------------------------------------------------------
        RFID
        --------------------------------------------------------
        */

        if (
            data.rfidUid !==
            undefined
        ) {

            const normalizedRfid =
                normalizeRfid(
                    data.rfidUid
                );


            if (
                normalizedRfid
            ) {

                const duplicate =
                    await Customer.findOne({

                        rfidUid:
                            normalizedRfid,

                        _id: {
                            $ne:
                                customer._id,
                        },

                    });


                if (duplicate) {

                    throw new ApiError(
                        409,
                        "This RFID card is already assigned to another customer."
                    );

                }

            }


            customer.rfidUid =
                normalizedRfid;

        }


        /*
        --------------------------------------------------------
        STATUS
        --------------------------------------------------------
        */

        if (
            data.isActive !==
            undefined
        ) {

            customer.isActive =
                Boolean(
                    data.isActive
                );

        }


        await customer.save();


        return customer;

    };


/*
============================================================
IDENTIFY CUSTOMER
============================================================

Accepts:

CUST-000001

STOREPOS:CUST-000001

RFID UID
============================================================
*/

const identifyCustomer =
    async (
        identifier
    ) => {

        let value =
            String(
                identifier ||
                ""
            )
                .trim()
                .toUpperCase();


        if (!value) {

            throw new ApiError(
                400,
                "Customer identifier is required."
            );

        }


        /*
        --------------------------------------------------------
        QR FORMAT

        STOREPOS:CUST-000001
        --------------------------------------------------------
        */

        if (
            value.startsWith(
                "STOREPOS:"
            )
        ) {

            value =
                value.substring(
                    "STOREPOS:"
                        .length
                );

        }


        const customer =
            await Customer.findOne({

                $or: [

                    {
                        customerCode:
                            value,
                    },

                    {
                        rfidUid:
                            value,
                    },

                ],

            });


        if (!customer) {

            throw new ApiError(
                404,
                "Customer not found."
            );

        }


        if (
            !customer.isActive
        ) {

            throw new ApiError(
                403,
                "This customer account is inactive."
            );

        }


        return customer;

    };


/*
============================================================
NET SALE AMOUNT
============================================================

VOIDED
→ 0

REFUNDED
→ 0

PARTIALLY REFUNDED
→ remaining quantities only

Discount is proportionally applied to remaining items.
============================================================
*/

const calculateNetSaleAmount =
    (
        sale
    ) => {

        if (
            sale.status ===
                "VOIDED" ||
            sale.status ===
                "REFUNDED"
        ) {

            return 0;

        }


        /*
        --------------------------------------------------------
        NORMAL COMPLETED SALE
        --------------------------------------------------------
        */

        if (
            sale.status ===
            "COMPLETED"
        ) {

            return Number(
                sale.total
            ) || 0;

        }


        /*
        --------------------------------------------------------
        PARTIAL REFUND
        --------------------------------------------------------
        */

        let remainingSubtotal =
            0;


        for (
            const item
            of sale.items || []
        ) {

            const quantity =
                Number(
                    item.quantity
                ) || 0;


            const refunded =
                Number(
                    item.refundedQuantity
                ) || 0;


            const remainingQuantity =
                Math.max(
                    quantity -
                    refunded,
                    0
                );


            remainingSubtotal +=
                remainingQuantity *
                (
                    Number(
                        item.unitPrice
                    ) || 0
                );

        }


        const originalSubtotal =
            Number(
                sale.subtotal
            ) || 0;


        const discount =
            Number(
                sale.discount
            ) || 0;


        /*
        --------------------------------------------------------
        APPLY DISCOUNT PROPORTIONALLY
        --------------------------------------------------------
        */

        if (
            originalSubtotal >
            0 &&
            discount >
            0
        ) {

            const discountRate =
                Math.min(
                    discount /
                    originalSubtotal,
                    1
                );


            remainingSubtotal *=
                1 -
                discountRate;

        }


        return Math.max(
            Number(
                remainingSubtotal.toFixed(
                    2
                )
            ),
            0
        );

    };


/*
============================================================
DATE RANGES
============================================================
*/

const getAnalyticsRanges =
    () => {

        const now =
            new Date();


        /*
        --------------------------------------------------------
        TODAY
        --------------------------------------------------------
        */

        const todayStart =
            new Date(
                now
            );

        todayStart.setHours(
            0,
            0,
            0,
            0
        );


        /*
        --------------------------------------------------------
        WEEK

        Monday = first day.
        --------------------------------------------------------
        */

        const weekStart =
            new Date(
                todayStart
            );


        const day =
            weekStart.getDay();


        const difference =
            day === 0
                ? -6
                : 1 - day;


        weekStart.setDate(
            weekStart.getDate() +
            difference
        );


        /*
        --------------------------------------------------------
        MONTH
        --------------------------------------------------------
        */

        const monthStart =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );


        /*
        --------------------------------------------------------
        YEAR
        --------------------------------------------------------
        */

        const yearStart =
            new Date(
                now.getFullYear(),
                0,
                1
            );


        return {
            now,
            todayStart,
            weekStart,
            monthStart,
            yearStart,
        };

    };


/*
============================================================
GET CUSTOMER SALES
============================================================
*/

const getCustomerSales =
    async (
        customerId,
        {
            limit = 100,
        } = {}
    ) => {

        await getCustomerById(
            customerId
        );


        const safeLimit =
            Math.min(
                Math.max(
                    Number(
                        limit
                    ) || 100,
                    1
                ),
                500
            );


        const sales =
            await Sale.find({
                customer:
                    customerId,
            })

                .populate(
                    "cashier",
                    "name username"
                )

                .sort({
                    createdAt:
                        -1,
                })

                .limit(
                    safeLimit
                )

                .lean();


        return sales.map(
            (
                sale
            ) => ({

                ...sale,

                netAmount:
                    calculateNetSaleAmount(
                        sale
                    ),

            })
        );

    };


/*
============================================================
GET CUSTOMER ANALYTICS
============================================================
*/

const getCustomerAnalytics =
    async (
        customerId
    ) => {

        const customer =
            await getCustomerById(
                customerId
            );


        const {
            todayStart,
            weekStart,
            monthStart,
            yearStart,
        } =
            getAnalyticsRanges();


        /*
        --------------------------------------------------------
        We need all sales because lifetime analytics and
        refunds are calculated from the original sale data.
        --------------------------------------------------------
        */

        const sales =
            await Sale.find({
                customer:
                    customer._id,
            })
                .sort({
                    createdAt:
                        -1,
                })
                .lean();


        let todaySpent =
            0;

        let weekSpent =
            0;

        let monthSpent =
            0;

        let yearSpent =
            0;

        let lifetimeSpent =
            0;

        let transactionCount =
            0;

        let lastPurchaseAt =
            null;


        for (
            const sale
            of sales
        ) {

            const netAmount =
                calculateNetSaleAmount(
                    sale
                );


            /*
            ----------------------------------------------------
            Don't count fully voided/refunded sales as completed
            customer purchases.
            ----------------------------------------------------
            */

            if (
                netAmount <=
                0
            ) {

                continue;

            }


            const saleDate =
                new Date(
                    sale.createdAt
                );


            lifetimeSpent +=
                netAmount;


            transactionCount +=
                1;


            if (
                !lastPurchaseAt
            ) {

                lastPurchaseAt =
                    sale.createdAt;

            }


            if (
                saleDate >=
                todayStart
            ) {

                todaySpent +=
                    netAmount;

            }


            if (
                saleDate >=
                weekStart
            ) {

                weekSpent +=
                    netAmount;

            }


            if (
                saleDate >=
                monthStart
            ) {

                monthSpent +=
                    netAmount;

            }


            if (
                saleDate >=
                yearStart
            ) {

                yearSpent +=
                    netAmount;

            }

        }


        const averageTransaction =
            transactionCount >
            0
                ? lifetimeSpent /
                    transactionCount
                : 0;


        return {

            customer: {

                id:
                    customer._id,

                customerCode:
                    customer.customerCode,

                name:
                    customer.name,

                phone:
                    customer.phone,

                rfidUid:
                    customer.rfidUid,

                loyaltyPoints:
                    customer.loyaltyPoints,

                lifetimePoints:
                    customer.lifetimePoints,

                loyaltyTier:
                    customer.loyaltyTier,

                isActive:
                    customer.isActive,

            },


            spending: {

                today:
                    Number(
                        todaySpent.toFixed(
                            2
                        )
                    ),

                week:
                    Number(
                        weekSpent.toFixed(
                            2
                        )
                    ),

                month:
                    Number(
                        monthSpent.toFixed(
                            2
                        )
                    ),

                year:
                    Number(
                        yearSpent.toFixed(
                            2
                        )
                    ),

                lifetime:
                    Number(
                        lifetimeSpent.toFixed(
                            2
                        )
                    ),

            },


            transactionCount,


            averageTransaction:
                Number(
                    averageTransaction.toFixed(
                        2
                    )
                ),


            lastPurchaseAt,

        };

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

    getCustomerSales,

    getCustomerAnalytics,

};