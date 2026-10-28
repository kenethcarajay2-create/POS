import mongoose from "mongoose";

import BranchInventory from "../models/branchInventory.model.js";

import Branch from "../models/branch.model.js";

import Product from "../models/product.model.js";

import ApiError from "../utils/ApiError.js";

import syncOutboxService from "./syncOutbox.service.js";


/*
============================================================
NORMALIZE OBJECT ID
============================================================
*/

const normalizeObjectId = (
    value
) => {

    const rawValue =
        value?._id ||
        value;


    if (
        !rawValue ||
        !mongoose.Types.ObjectId
            .isValid(
                rawValue
            )
    ) {

        return null;

    }


    return String(
        rawValue
    );

};


/*
============================================================
REQUIRE OBJECT ID
============================================================
*/

const requireObjectId = (
    value,
    label = "ID"
) => {

    const id =
        normalizeObjectId(
            value
        );


    if (
        !id
    ) {

        throw new ApiError(
            400,
            `Invalid ${label}.`
        );

    }


    return id;

};


/*
============================================================
POSITIVE INTEGER
============================================================
*/

const normalizePositiveInteger = (
    value,
    label = "Quantity"
) => {

    const numericValue =
        Number(
            value
        );


    if (
        !Number.isInteger(
            numericValue
        ) ||
        numericValue <=
            0
    ) {

        throw new ApiError(
            400,
            `${label} must be a positive whole number.`
        );

    }


    return numericValue;

};


/*
============================================================
NON-NEGATIVE NUMBER
============================================================
*/

const normalizeNonNegativeNumber = (
    value,
    label = "Stock"
) => {

    const numericValue =
        Number(
            value
        );


    if (
        !Number.isFinite(
            numericValue
        ) ||
        numericValue <
            0
    ) {

        throw new ApiError(
            400,
            `${label} cannot be negative.`
        );

    }


    return numericValue;

};


/*
============================================================
REQUIRE PRODUCT
============================================================
*/

const requireProduct = async (
    productId,
    {
        requireActive = true,
        session = null,
    } = {}
) => {

    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    let query =
        Product.findById(
            resolvedProductId
        );


    if (
        session
    ) {

        query =
            query.session(
                session
            );

    }


    const product =
        await query;


    if (
        !product
    ) {

        throw new ApiError(
            404,
            "Product not found."
        );

    }


    if (
        requireActive &&
        product.isActive ===
            false
    ) {

        throw new ApiError(
            400,
            `${product.name} is inactive.`
        );

    }


    return product;

};


/*
============================================================
ENQUEUE INVENTORY SYNC CHANGE
============================================================

Every real local stock mutation creates a durable delta event
in the SAME MongoDB transaction when a session is supplied.

Remote cloud events call the stock helpers with:

    skipSyncEvent: true

so an incoming event never creates another outgoing event.
============================================================
*/

const enqueueInventorySyncChange =
    async ({
        branchId,
        productId,
        quantityChange,
        source = "INVENTORY",
        action = "UPDATE",
        referenceId = null,
        session = null,
        skipSyncEvent = false,
    }) => {

        if (
            skipSyncEvent
        ) {

            return;

        }


        const numericQuantityChange =
            Number(
                quantityChange
            );


        if (
            !Number.isFinite(
                numericQuantityChange
            ) ||
            numericQuantityChange ===
                0
        ) {

            return;

        }


        let productQuery =
            Product.findById(
                productId
            );


        let branchQuery =
            Branch.findById(
                branchId
            );


        if (
            session
        ) {

            productQuery =
                productQuery.session(
                    session
                );


            branchQuery =
                branchQuery.session(
                    session
                );

        }


        const [
            product,
            branch,
        ] =
            await Promise.all([
                productQuery,
                branchQuery,
            ]);


        if (
            !product
        ) {

            throw new ApiError(
                404,
                "Product not found while creating inventory synchronization event."
            );

        }


        if (
            !branch
        ) {

            throw new ApiError(
                404,
                "Branch not found while creating inventory synchronization event."
            );

        }


        const barcode =
            String(
                product.barcode ||
                ""
            ).trim();


        const branchCode =
            String(
                branch.code ||
                ""
            )
                .trim()
                .toUpperCase();


        if (
            !barcode
        ) {

            throw new ApiError(
                409,
                `Product ${product.name || product._id} does not have a barcode and cannot be synchronized between POS computers.`
            );

        }


        if (
            !branchCode
        ) {

            throw new ApiError(
                409,
                "The branch does not have a branch code and cannot be synchronized between POS computers."
            );

        }


        await syncOutboxService
            .enqueueInventoryChange({

                productId:
                    product._id,

                productBarcode:
                    barcode,

                branchId:
                    branch._id,

                branchCode,

                quantityChange:
                    numericQuantityChange,

                source,

                action,

                referenceId,

                session,

            });

    };


/*
============================================================
GET INVENTORY
============================================================
*/

const getInventory = async (
    branchId,
    productId,
    {
        populateProduct = false,
        session = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    let query =
        BranchInventory.findOne({

            branch:
                resolvedBranchId,

            product:
                resolvedProductId,

        });


    if (
        session
    ) {

        query =
            query.session(
                session
            );

    }


    if (
        populateProduct
    ) {

        query =
            query.populate(
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
            );

    }


    return await query;

};


/*
============================================================
REQUIRE INVENTORY
============================================================
*/

const requireInventory = async (
    branchId,
    productId,
    {
        session = null,
    } = {}
) => {

    const inventory =
        await getInventory(
            branchId,
            productId,
            {
                session,
            }
        );


    if (
        !inventory
    ) {

        throw new ApiError(
            409,
            "This product does not have an inventory record in the selected branch."
        );

    }


    if (
        inventory.isActive ===
        false
    ) {

        throw new ApiError(
            400,
            "This product is inactive in the selected branch."
        );

    }


    return inventory;

};


/*
============================================================
ENSURE INVENTORY
============================================================

Used for controlled branch provisioning.

Never automatically called by checkout.
============================================================
*/

const ensureInventory = async (
    branchId,
    productId,
    {
        stock = 0,
        minimumStock = 0,
        isActive = true,
        session = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const product =
        await requireProduct(
            productId,
            {
                requireActive:
                    false,

                session,
            }
        );


    const initialStock =
        normalizeNonNegativeNumber(
            stock,
            "Initial stock"
        );


    const initialMinimumStock =
        normalizeNonNegativeNumber(
            minimumStock,
            "Minimum stock"
        );


    return await BranchInventory
        .findOneAndUpdate(
            {
                branch:
                    resolvedBranchId,

                product:
                    product._id,
            },
            {
                $setOnInsert: {

                    branch:
                        resolvedBranchId,

                    product:
                        product._id,

                    stock:
                        initialStock,

                    minimumStock:
                        initialMinimumStock,

                    isActive:
                        Boolean(
                            isActive
                        ),

                },
            },
            {
                new:
                    true,

                upsert:
                    true,

                runValidators:
                    true,

                setDefaultsOnInsert:
                    true,

                session:
                    session ||
                    undefined,
            }
        );

};


/*
============================================================
GET BRANCH INVENTORY
============================================================
*/

const getBranchInventory = async (
    branchId,
    {
        includeInactive = false,
        session = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const filter = {

        branch:
            resolvedBranchId,

    };


    if (
        !includeInactive
    ) {

        filter.isActive =
            true;

    }


    let query =
        BranchInventory
            .find(
                filter
            )

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

                createdAt:
                    1,

            });


    if (
        session
    ) {

        query =
            query.session(
                session
            );

    }


    return await query;

};


/*
============================================================
GET STOCK
============================================================
*/

const getStock = async (
    branchId,
    productId,
    {
        session = null,
    } = {}
) => {

    const inventory =
        await requireInventory(
            branchId,
            productId,
            {
                session,
            }
        );


    return Number(
        inventory.stock
    ) || 0;

};


/*
============================================================
ATOMIC DEDUCT
============================================================
*/

const deductStock = async (
    branchId,
    productId,
    quantity,
    {
        session = null,
        skipSyncEvent = false,
        source = "INVENTORY",
        action = "DEDUCT",
        referenceId = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    const numericQuantity =
        normalizePositiveInteger(
            quantity
        );


    const inventory =
        await BranchInventory
            .findOneAndUpdate(
                {
                    branch:
                        resolvedBranchId,

                    product:
                        resolvedProductId,

                    isActive:
                        true,

                    stock: {

                        $gte:
                            numericQuantity,

                    },
                },
                {
                    $inc: {

                        stock:
                            -numericQuantity,

                    },
                },
                {
                    new:
                        true,

                    runValidators:
                        true,

                    session:
                        session ||
                        undefined,
                }
            );


    if (
        inventory
    ) {

        const newStock =
            Number(
                inventory.stock
            );


        await enqueueInventorySyncChange({

            branchId:
                resolvedBranchId,

            productId:
                resolvedProductId,

            quantityChange:
                -numericQuantity,

            source,

            action,

            referenceId,

            session,

            skipSyncEvent,

        });


        return {

            inventory,

            quantity:
                numericQuantity,

            previousStock:
                newStock +
                numericQuantity,

            newStock,

        };

    }


    let query =
        BranchInventory.findOne({

            branch:
                resolvedBranchId,

            product:
                resolvedProductId,

        });


    if (
        session
    ) {

        query =
            query.session(
                session
            );

    }


    const existing =
        await query;


    if (
        !existing
    ) {

        throw new ApiError(
            409,
            "This product does not have inventory in the selected branch."
        );

    }


    if (
        existing.isActive ===
        false
    ) {

        throw new ApiError(
            400,
            "This product is inactive in the selected branch."
        );

    }


    throw new ApiError(
        400,
        `Insufficient stock. Only ${
            Number(
                existing.stock
            ) || 0
        } unit(s) available.`
    );

};


/*
============================================================
ATOMIC ADD
============================================================
*/

const addStock = async (
    branchId,
    productId,
    quantity,
    {
        session = null,
        skipSyncEvent = false,
        source = "INVENTORY",
        action = "ADD",
        referenceId = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    const numericQuantity =
        normalizePositiveInteger(
            quantity
        );


    const inventory =
        await BranchInventory
            .findOneAndUpdate(
                {
                    branch:
                        resolvedBranchId,

                    product:
                        resolvedProductId,

                    isActive:
                        true,
                },
                {
                    $inc: {

                        stock:
                            numericQuantity,

                    },
                },
                {
                    new:
                        true,

                    runValidators:
                        true,

                    session:
                        session ||
                        undefined,
                }
            );


    if (
        inventory
    ) {

        const newStock =
            Number(
                inventory.stock
            );


        await enqueueInventorySyncChange({

            branchId:
                resolvedBranchId,

            productId:
                resolvedProductId,

            quantityChange:
                numericQuantity,

            source,

            action,

            referenceId,

            session,

            skipSyncEvent,

        });


        return {

            inventory,

            quantity:
                numericQuantity,

            previousStock:
                newStock -
                numericQuantity,

            newStock,

        };

    }


    let query =
        BranchInventory.findOne({

            branch:
                resolvedBranchId,

            product:
                resolvedProductId,

        });


    if (
        session
    ) {

        query =
            query.session(
                session
            );

    }


    const existing =
        await query;


    if (
        !existing
    ) {

        throw new ApiError(
            409,
            "This product does not have inventory in the selected branch."
        );

    }


    throw new ApiError(
        400,
        "This product is inactive in the selected branch."
    );

};


/*
============================================================
STOCK IN / STOCK OUT
============================================================
*/

const stockIn = async (
    branchId,
    productId,
    quantity,
    options = {}
) => {

    return await addStock(
        branchId,
        productId,
        quantity,
        options
    );

};


const stockOut = async (
    branchId,
    productId,
    quantity,
    options = {}
) => {

    return await deductStock(
        branchId,
        productId,
        quantity,
        options
    );

};


/*
============================================================
SET ABSOLUTE STOCK
============================================================
*/

const setStock = async (
    branchId,
    productId,
    newStock,
    {
        session = null,
        skipSyncEvent = false,
        source = "INVENTORY",
        action = "SET",
        referenceId = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    const numericNewStock =
        normalizeNonNegativeNumber(
            newStock,
            "New stock"
        );


    let query =
        BranchInventory.findOne({

            branch:
                resolvedBranchId,

            product:
                resolvedProductId,

            isActive:
                true,

        });


    if (
        session
    ) {

        query =
            query.session(
                session
            );

    }


    const current =
        await query;


    if (
        !current
    ) {

        throw new ApiError(
            404,
            "Active branch inventory record not found."
        );

    }


    const previousStock =
        Number(
            current.stock
        ) || 0;


    /*
    Optimistic concurrency guard.
    */

    const inventory =
        await BranchInventory
            .findOneAndUpdate(
                {
                    _id:
                        current._id,

                    stock:
                        previousStock,

                    isActive:
                        true,
                },
                {
                    $set: {

                        stock:
                            numericNewStock,

                    },
                },
                {
                    new:
                        true,

                    runValidators:
                        true,

                    session:
                        session ||
                        undefined,
                }
            );


    if (
        !inventory
    ) {

        throw new ApiError(
            409,
            "Inventory changed while the adjustment was being processed. Refresh and try again."
        );

    }


    await enqueueInventorySyncChange({

        branchId:
            resolvedBranchId,

        productId:
            resolvedProductId,

        quantityChange:
            numericNewStock -
            previousStock,

        source,

        action,

        referenceId,

        session,

        skipSyncEvent,

    });


    return {

        inventory,

        previousStock,

        newStock:
            numericNewStock,

        quantity:
            Math.abs(
                numericNewStock -
                previousStock
            ),

    };

};


/*
============================================================
MINIMUM STOCK
============================================================
*/

const setMinimumStock = async (
    branchId,
    productId,
    minimumStock,
    {
        session = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    const numericMinimumStock =
        normalizeNonNegativeNumber(
            minimumStock,
            "Minimum stock"
        );


    const inventory =
        await BranchInventory
            .findOneAndUpdate(
                {
                    branch:
                        resolvedBranchId,

                    product:
                        resolvedProductId,
                },
                {
                    $set: {

                        minimumStock:
                            numericMinimumStock,

                    },
                },
                {
                    new:
                        true,

                    runValidators:
                        true,

                    session:
                        session ||
                        undefined,
                }
            );


    if (
        !inventory
    ) {

        throw new ApiError(
            404,
            "Branch inventory record not found."
        );

    }


    return inventory;

};


/*
============================================================
ENABLE / DISABLE
============================================================
*/

const enableInventory = async (
    branchId,
    productId,
    {
        session = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    const inventory =
        await BranchInventory
            .findOneAndUpdate(
                {
                    branch:
                        resolvedBranchId,

                    product:
                        resolvedProductId,
                },
                {
                    $set: {

                        isActive:
                            true,

                    },
                },
                {
                    new:
                        true,

                    session:
                        session ||
                        undefined,
                }
            );


    if (
        !inventory
    ) {

        throw new ApiError(
            404,
            "Branch inventory record not found."
        );

    }


    return inventory;

};


const disableInventory = async (
    branchId,
    productId,
    {
        session = null,
    } = {}
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const resolvedProductId =
        requireObjectId(
            productId,
            "product ID"
        );


    const inventory =
        await BranchInventory
            .findOneAndUpdate(
                {
                    branch:
                        resolvedBranchId,

                    product:
                        resolvedProductId,
                },
                {
                    $set: {

                        isActive:
                            false,

                    },
                },
                {
                    new:
                        true,

                    session:
                        session ||
                        undefined,
                }
            );


    if (
        !inventory
    ) {

        throw new ApiError(
            404,
            "Branch inventory record not found."
        );

    }


    return inventory;

};


/*
============================================================
LOW STOCK
============================================================
*/

const getLowStockInventory = async (
    branchId
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    return await BranchInventory
        .find({

            branch:
                resolvedBranchId,

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
            "barcode name category baseUnit pricing isActive"
        )

        .sort({

            stock:
                1,

        });

};


/*
============================================================
VERIFY
============================================================
*/

const verifyInventory = async (
    branchId,
    productId
) => {

    const resolvedBranchId =
        requireObjectId(
            branchId,
            "branch ID"
        );


    const product =
        await requireProduct(
            productId,
            {
                requireActive:
                    false,
            }
        );


    const inventory =
        await BranchInventory.findOne({

            branch:
                resolvedBranchId,

            product:
                product._id,

        });


    return {

        exists:
            Boolean(
                inventory
            ),

        branchId:
            resolvedBranchId,

        productId:
            String(
                product._id
            ),

        productName:
            product.name,

        legacyProductStock:
            Number(
                product.stock
            ) || 0,

        branchStock:
            inventory
                ? Number(
                    inventory.stock
                ) || 0
                : null,

        matchesLegacy:
            inventory
                ? Number(
                    inventory.stock
                ) ===
                  (
                      Number(
                          product.stock
                      ) || 0
                  )
                : false,

    };

};


export default {

    normalizeObjectId,

    requireObjectId,

    requireProduct,

    getInventory,

    requireInventory,

    ensureInventory,

    getBranchInventory,

    getStock,

    deductStock,

    addStock,

    stockIn,

    stockOut,

    setStock,

    setMinimumStock,

    enableInventory,

    disableInventory,

    getLowStockInventory,

    verifyInventory,

};