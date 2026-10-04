import mongoose from "mongoose";

import Sale from "../models/sale.model.js";

import BranchInventory from "../models/branchInventory.model.js";

import ApiError from "../utils/ApiError.js";


/*
============================================================
REQUIRE BRANCH ID
============================================================
*/

const requireBranchId = (
    value
) => {

    const branchId =
        value?._id ||
        value;


    if (
        !branchId ||
        !mongoose.Types.ObjectId
            .isValid(
                branchId
            )
    ) {

        throw new ApiError(
            400,
            "A valid branch context is required."
        );

    }


    return String(
        branchId
    );

};


/*
============================================================
SALE HELPERS
============================================================
*/

const getRemainingQuantity = (
    item
) => {

    const quantity =
        Number(
            item?.quantity ||
            0
        );


    const refunded =
        Number(
            item?.refundedQuantity ||
            0
        );


    return Math.max(
        quantity -
        refunded,
        0
    );

};


const getItemNetTotal = (
    item
) => {

    const remainingQuantity =
        getRemainingQuantity(
            item
        );


    const unitPrice =
        Number(
            item?.unitPrice ||
            0
        );


    return (
        remainingQuantity *
        unitPrice
    );

};


const getSaleNetTotal = (
    sale
) => {

    if (
        sale?.status ===
        "VOIDED"
    ) {

        return 0;

    }


    if (
        !Array.isArray(
            sale?.items
        )
    ) {

        return Number(
            sale?.total ||
            0
        );

    }


    const netSubtotal =
        sale.items.reduce(
            (
                sum,
                item
            ) =>
                sum +
                getItemNetTotal(
                    item
                ),
            0
        );


    const discount =
        Number(
            sale?.discount ||
            0
        );


    return Math.max(
        netSubtotal -
        discount,
        0
    );

};


const getSaleRemainingQuantity = (
    sale
) => {

    if (
        sale?.status ===
        "VOIDED"
    ) {

        return 0;

    }


    if (
        !Array.isArray(
            sale?.items
        )
    ) {

        return 0;

    }


    return sale.items.reduce(
        (
            sum,
            item
        ) =>
            sum +
            getRemainingQuantity(
                item
            ),
        0
    );

};


const isCountedTransaction = (
    sale
) => {

    return (
        sale?.status !==
            "VOIDED" &&
        sale?.status !==
            "REFUNDED"
    );

};


/*
============================================================
LOW STOCK
============================================================
*/

const getLowStockProducts = async (
    branchId
) => {

    const inventoryRecords =
        await BranchInventory
            .find({

                branch:
                    branchId,

                isActive:
                    true,

                $expr: {

                    $lte: [
                        "$stock",
                        "$minimumStock",
                    ],

                },

            })

            .populate(
                "product",
                `
                    barcode
                    name
                    description
                    category
                    costPrice
                    baseUnit
                    pricing
                    isActive
                `
            )

            .sort({

                stock:
                    1,

            })

            .limit(
                10
            )

            .lean();


    /*
    Preserve the old Dashboard frontend expectation:

        product.stock
        product.minimumStock

    but those values now come from BranchInventory.
    */

    return inventoryRecords

        .filter(
            (
                inventory
            ) =>
                inventory.product &&
                inventory.product
                    .isActive !==
                    false
        )

        .slice(
            0,
            5
        )

        .map(
            (
                inventory
            ) => ({

                ...inventory.product,

                stock:
                    Number(
                        inventory.stock
                    ) || 0,

                minimumStock:
                    Number(
                        inventory.minimumStock
                    ) || 0,

                branchInventoryId:
                    inventory._id,

                branchId:
                    inventory.branch,

                branchInventoryActive:
                    inventory.isActive !==
                    false,

            })
        );

};


/*
============================================================
BEST SELLERS
============================================================

Net of:

- voided sales
- refunded item quantities
============================================================
*/

const getBestSellers = async (
    branchId
) => {

    const objectBranchId =
        new mongoose.Types.ObjectId(
            branchId
        );


    return await Sale.aggregate([

        /*
        --------------------------------------------------------
        ACTIVE BRANCH
        --------------------------------------------------------
        */

        {
            $match: {

                branch:
                    objectBranchId,

                status: {
                    $ne:
                        "VOIDED",
                },

            },
        },


        /*
        --------------------------------------------------------
        ITEMS
        --------------------------------------------------------
        */

        {
            $unwind:
                "$items",
        },


        /*
        --------------------------------------------------------
        REMAINING QUANTITY
        --------------------------------------------------------
        */

        {
            $addFields: {

                remainingQuantity: {

                    $max: [

                        {
                            $subtract: [

                                {
                                    $ifNull: [
                                        "$items.quantity",
                                        0,
                                    ],
                                },

                                {
                                    $ifNull: [
                                        "$items.refundedQuantity",
                                        0,
                                    ],
                                },

                            ],
                        },

                        0,

                    ],

                },

            },
        },


        /*
        --------------------------------------------------------
        REMOVE FULLY REFUNDED ITEMS
        --------------------------------------------------------
        */

        {
            $match: {

                remainingQuantity: {
                    $gt:
                        0,
                },

            },
        },


        /*
        --------------------------------------------------------
        GROUP
        --------------------------------------------------------
        */

        {
            $group: {

                /*
                Product normally identifies the item.

                Open-price items have product = null, so their
                name is included in the fallback key.
                */

                _id: {

                    product:
                        "$items.product",

                    fallbackName: {

                        $cond: [
                            {
                                $eq: [
                                    "$items.product",
                                    null,
                                ],
                            },
                            "$items.name",
                            "",
                        ],

                    },

                },

                product: {
                    $first:
                        "$items.product",
                },

                name: {
                    $first:
                        "$items.name",
                },

                barcode: {
                    $first:
                        "$items.barcode",
                },

                quantitySold: {
                    $sum:
                        "$remainingQuantity",
                },

            },
        },


        /*
        --------------------------------------------------------
        SORT
        --------------------------------------------------------
        */

        {
            $sort: {
                quantitySold:
                    -1,
            },
        },


        {
            $limit:
                5,
        },


        /*
        --------------------------------------------------------
        RESPONSE SHAPE
        --------------------------------------------------------
        */

        {
            $project: {

                _id:
                    "$product",

                name:
                    1,

                barcode:
                    1,

                quantitySold:
                    1,

            },
        },

    ]);

};


/*
============================================================
GET DASHBOARD
============================================================
*/

const getDashboard = async (
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    /*
    ========================================================
    TODAY
    ========================================================
    */

    const startOfToday =
        new Date();


    startOfToday.setHours(
        0,
        0,
        0,
        0
    );


    /*
    ========================================================
    TODAY'S SALES
    ========================================================
    */

    const todaySales =
        await Sale.find({

            branch:
                resolvedBranchId,

            createdAt: {
                $gte:
                    startOfToday,
            },

        })
            .select(
                `
                    items
                    total
                    discount
                    status
                `
            )
            .lean();


    /*
    ========================================================
    TODAY REVENUE
    ========================================================

    Net of refunds and voids.
    ========================================================
    */

    const todayRevenue =
        todaySales.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                getSaleNetTotal(
                    sale
                ),
            0
        );


    /*
    ========================================================
    TRANSACTIONS
    ========================================================

    COMPLETED              counts
    PARTIALLY_REFUNDED     counts
    REFUNDED               does not count
    VOIDED                 does not count
    ========================================================
    */

    const todayTransactions =
        todaySales.filter(
            isCountedTransaction
        ).length;


    /*
    ========================================================
    ITEMS SOLD
    ========================================================

    Remaining quantity after refunds.

    Voided sales contribute zero.
    ========================================================
    */

    const todayItemsSold =
        todaySales.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                getSaleRemainingQuantity(
                    sale
                ),
            0
        );


    /*
    ========================================================
    AVERAGE SALE
    ========================================================
    */

    const averageSale =
        todayTransactions ===
            0
            ? 0
            : todayRevenue /
              todayTransactions;


    /*
    ========================================================
    LOW STOCK
    ========================================================
    */

    const lowStock =
        await getLowStockProducts(
            resolvedBranchId
        );


    /*
    ========================================================
    BEST SELLERS
    ========================================================
    */

    const bestSellers =
        await getBestSellers(
            resolvedBranchId
        );


    /*
    ========================================================
    RECENT TRANSACTIONS
    ========================================================
    */

    const recentTransactions =
        await Sale.find({

            branch:
                resolvedBranchId,

        })

            .select(
                `
                    receiptNumber
                    total
                    paymentMethod
                    status
                    createdAt
                `
            )

            .sort({
                createdAt:
                    -1,
            })

            .limit(
                5
            )

            .lean();


    /*
    ========================================================
    RESULT
    ========================================================
    */

    return {

        todayRevenue,

        todayTransactions,

        todayItemsSold,

        averageSale,

        lowStock,

        bestSellers,

        recentTransactions,

    };

};


export default {

    getDashboard,

};