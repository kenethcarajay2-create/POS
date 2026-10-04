import mongoose from "mongoose";

import Product from "../models/product.model.js";

import InventoryTransaction from "../models/inventoryTransaction.model.js";

import ApiError from "../utils/ApiError.js";

import withTransaction from "../utils/withTransaction.js";

import branchInventoryService from "./branch-inventory.service.js";

import syncOutboxService from "./syncOutbox.service.js";


/*
============================================================
HELPERS
============================================================
*/

const validateObjectId =
    (
        id,
        fieldName = "ID"
    ) => {

        if (
            !id ||
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {

            throw new ApiError(
                400,
                `Invalid ${fieldName}.`
            );

        }

    };


/*
============================================================
BUILD BRANCH CONTEXT
============================================================
*/

const buildBranchContext =
    (
        activeBranch
    ) => {

        if (
            !activeBranch
        ) {

            throw new ApiError(
                400,
                "A valid branch context is required."
            );

        }


        const branchId =
            activeBranch?._id ||
            activeBranch;


        validateObjectId(
            branchId,
            "branch ID"
        );


        /*
        If we only received a branch ObjectId, we cannot
        safely build the snapshot.

        Stock-changing operations should therefore receive
        req.activeBranch from the controller.
        */

        if (
            typeof activeBranch !==
            "object"
        ) {

            throw new ApiError(
                400,
                "Complete branch information is required for inventory changes."
            );

        }


        if (
            activeBranch.isActive ===
            false
        ) {

            throw new ApiError(
                400,
                "The selected branch is inactive."
            );

        }


        const code =
            String(
                activeBranch.code ||
                ""
            )
                .trim()
                .toUpperCase();


        const name =
            String(
                activeBranch.name ||
                ""
            )
                .trim();


        if (
            !code ||
            !name
        ) {

            throw new ApiError(
                400,
                "The selected branch has incomplete branch information."
            );

        }


        return {

            branchId:
                String(
                    branchId
                ),

            branchSnapshot: {

                code,

                name,

            },

        };

    };


/*
============================================================
BUILD PRODUCT RESPONSE
============================================================
*/

const buildProductResponse =
    (
        product,
        inventory
    ) => {

        const rawProduct =
            typeof product?.toObject ===
            "function"
                ? product.toObject()
                : {
                    ...product,
                };


        return {

            ...rawProduct,


            /*
            ====================================================
            AUTHORITATIVE BRANCH INVENTORY
            ====================================================
            */

            stock:
                Number(
                    inventory?.stock
                ) ||
                0,

            minimumStock:
                Number(
                    inventory?.minimumStock
                ) ||
                0,

            branchInventoryId:
                inventory?._id ||
                null,

            branchId:
                inventory?.branch ||
                null,

            branchInventoryConfigured:
                Boolean(
                    inventory
                ),

            branchInventoryActive:
                inventory
                    ? inventory.isActive !==
                      false
                    : false,

        };

    };


/*
============================================================
GET PRODUCT AFTER INVENTORY CHANGE
============================================================
*/

const loadProductResponse =
    async (
        productId,
        branchId
    ) => {

        const product =
            await Product.findById(
                productId
            );


        if (
            !product
        ) {

            throw new ApiError(
                404,
                "Product not found."
            );

        }


        const inventory =
            await branchInventoryService
                .requireInventory(
                    branchId,
                    productId
                );


        return buildProductResponse(
            product,
            inventory
        );

    };


/*
============================================================
STOCK IN
============================================================
*/

const stockIn =
    async (
        data,
        userId,
        activeBranch
    ) => {

        const {
            productId,
            quantity,
            remarks,
        } =
            data;


        validateObjectId(
            productId,
            "product ID"
        );


        validateObjectId(
            userId,
            "user ID"
        );


        const numericQuantity =
            Number(
                quantity
            );


        if (
            !Number.isInteger(
                numericQuantity
            ) ||
            numericQuantity <=
                0
        ) {

            throw new ApiError(
                400,
                "Quantity must be a positive whole number."
            );

        }


        const {
            branchId,
            branchSnapshot,
        } =
            buildBranchContext(
                activeBranch
            );


        const result =
            await withTransaction(
                async (
                    session
                ) => {

                    /*
                    =================================================
                    PRODUCT
                    =================================================
                    */

                    const product =
                        await Product
                            .findById(
                                productId
                            )
                            .session(
                                session
                            );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            404,
                            "Product not found."
                        );

                    }


                    if (
                        !product.isActive
                    ) {

                        throw new ApiError(
                            400,
                            "Cannot update an inactive product."
                        );

                    }


                    /*
                    =================================================
                    REQUIRE INVENTORY
                    =================================================
                    */

                    await branchInventoryService
                        .requireInventory(
                            branchId,
                            product._id,
                            {
                                session,
                            }
                        );


                    /*
                    =================================================
                    ATOMIC ADD
                    =================================================
                    */

                    const movement =
                        await branchInventoryService
                            .addStock(
                                branchId,
                                product._id,
                                numericQuantity,
                                {
                                    session,
                                }
                            );


                    /*
                    =================================================
                    INVENTORY TRANSACTION
                    =================================================
                    */

                    const [
                        transaction,
                    ] =
                        await InventoryTransaction
                            .create(
                                [
                                    {
                                        branch:
                                            branchId,

                                        branchSnapshot,

                                        product:
                                            product._id,

                                        type:
                                            "STOCK_IN",

                                        quantity:
                                            movement.quantity,

                                        previousStock:
                                            movement.previousStock,

                                        newStock:
                                            movement.newStock,

                                        remarks:
                                            String(
                                                remarks ||
                                                ""
                                            ).trim(),

                                        createdBy:
                                            userId,
                                    },
                                ],
                                {
                                    session,
                                }
                            );


                    /*
                    =================================================
                    CLOUD SYNC OUTBOX
                    =================================================

                    The outbox request participates in the SAME
                    MongoDB transaction as:

                    - BranchInventory stock change
                    - InventoryTransaction audit record

                    If either operation rolls back, this outbox
                    event rolls back as well.
                    =================================================
                    */

                    await syncOutboxService
                        .enqueueSyncRequest({

                            source:
                                "INVENTORY",

                            action:
                                "STOCK_IN",

                            aggregateId:
                                transaction._id,

                            branchId,

                            session,

                        });


                    return {

                        productId:
                            product._id,

                        transactionId:
                            transaction._id,

                    };

                }
            );


        /*
        ========================================================
        RESPONSE
        ========================================================
        */

        const product =
            await loadProductResponse(
                result.productId,
                branchId
            );


        const transaction =
            await InventoryTransaction
                .findById(
                    result.transactionId
                )
                .populate(
                    "product",
                    "name barcode"
                )
                .populate(
                    "createdBy",
                    "name username role"
                );


        return {

            product,

            transaction,

        };

    };


/*
============================================================
STOCK OUT
============================================================
*/

const stockOut =
    async (
        data,
        userId,
        activeBranch
    ) => {

        const {
            productId,
            quantity,
            remarks,
        } =
            data;


        validateObjectId(
            productId,
            "product ID"
        );


        validateObjectId(
            userId,
            "user ID"
        );


        const numericQuantity =
            Number(
                quantity
            );


        if (
            !Number.isInteger(
                numericQuantity
            ) ||
            numericQuantity <=
                0
        ) {

            throw new ApiError(
                400,
                "Quantity must be a positive whole number."
            );

        }


        const {
            branchId,
            branchSnapshot,
        } =
            buildBranchContext(
                activeBranch
            );


        const result =
            await withTransaction(
                async (
                    session
                ) => {

                    /*
                    =================================================
                    PRODUCT
                    =================================================
                    */

                    const product =
                        await Product
                            .findById(
                                productId
                            )
                            .session(
                                session
                            );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            404,
                            "Product not found."
                        );

                    }


                    if (
                        !product.isActive
                    ) {

                        throw new ApiError(
                            400,
                            "Cannot update an inactive product."
                        );

                    }


                    /*
                    =================================================
                    REQUIRE INVENTORY
                    =================================================
                    */

                    await branchInventoryService
                        .requireInventory(
                            branchId,
                            product._id,
                            {
                                session,
                            }
                        );


                    /*
                    =================================================
                    ATOMIC DEDUCT
                    =================================================
                    */

                    const movement =
                        await branchInventoryService
                            .deductStock(
                                branchId,
                                product._id,
                                numericQuantity,
                                {
                                    session,
                                }
                            );


                    /*
                    =================================================
                    INVENTORY TRANSACTION
                    =================================================
                    */

                    const [
                        transaction,
                    ] =
                        await InventoryTransaction
                            .create(
                                [
                                    {
                                        branch:
                                            branchId,

                                        branchSnapshot,

                                        product:
                                            product._id,

                                        type:
                                            "STOCK_OUT",

                                        quantity:
                                            movement.quantity,

                                        previousStock:
                                            movement.previousStock,

                                        newStock:
                                            movement.newStock,

                                        remarks:
                                            String(
                                                remarks ||
                                                ""
                                            ).trim(),

                                        createdBy:
                                            userId,
                                    },
                                ],
                                {
                                    session,
                                }
                            );


                    /*
                    =================================================
                    CLOUD SYNC OUTBOX
                    =================================================
                    */

                    await syncOutboxService
                        .enqueueSyncRequest({

                            source:
                                "INVENTORY",

                            action:
                                "STOCK_OUT",

                            aggregateId:
                                transaction._id,

                            branchId,

                            session,

                        });


                    return {

                        productId:
                            product._id,

                        transactionId:
                            transaction._id,

                    };

                }
            );


        /*
        ========================================================
        RESPONSE
        ========================================================
        */

        const product =
            await loadProductResponse(
                result.productId,
                branchId
            );


        const transaction =
            await InventoryTransaction
                .findById(
                    result.transactionId
                )
                .populate(
                    "product",
                    "name barcode"
                )
                .populate(
                    "createdBy",
                    "name username role"
                );


        return {

            product,

            transaction,

        };

    };


/*
============================================================
ADJUST STOCK
============================================================
*/

const adjustStock =
    async (
        data,
        userId,
        activeBranch
    ) => {

        const {
            productId,
            newStock,
            remarks,
        } =
            data;


        validateObjectId(
            productId,
            "product ID"
        );


        validateObjectId(
            userId,
            "user ID"
        );


        const numericNewStock =
            Number(
                newStock
            );


        if (
            !Number.isInteger(
                numericNewStock
            ) ||
            numericNewStock <
                0
        ) {

            throw new ApiError(
                400,
                "New stock must be a non-negative whole number."
            );

        }


        const {
            branchId,
            branchSnapshot,
        } =
            buildBranchContext(
                activeBranch
            );


        const result =
            await withTransaction(
                async (
                    session
                ) => {

                    /*
                    =================================================
                    PRODUCT
                    =================================================
                    */

                    const product =
                        await Product
                            .findById(
                                productId
                            )
                            .session(
                                session
                            );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            404,
                            "Product not found."
                        );

                    }


                    if (
                        !product.isActive
                    ) {

                        throw new ApiError(
                            400,
                            "Cannot update an inactive product."
                        );

                    }


                    /*
                    =================================================
                    CURRENT INVENTORY
                    =================================================
                    */

                    const inventory =
                        await branchInventoryService
                            .requireInventory(
                                branchId,
                                product._id,
                                {
                                    session,
                                }
                            );


                    const previousStock =
                        Number(
                            inventory.stock
                        ) ||
                        0;


                    /*
                    =================================================
                    NO CHANGE
                    =================================================

                    Do NOT create:

                    - InventoryTransaction quantity 0
                    - unnecessary outbox event
                    =================================================
                    */

                    if (
                        previousStock ===
                        numericNewStock
                    ) {

                        return {

                            productId:
                                product._id,

                            transactionId:
                                null,

                        };

                    }


                    /*
                    =================================================
                    SET ABSOLUTE STOCK
                    =================================================
                    */

                    const movement =
                        await branchInventoryService
                            .setStock(
                                branchId,
                                product._id,
                                numericNewStock,
                                {
                                    session,
                                }
                            );


                    if (
                        !Number.isFinite(
                            Number(
                                movement.quantity
                            )
                        ) ||
                        Number(
                            movement.quantity
                        ) <=
                            0
                    ) {

                        throw new ApiError(
                            500,
                            "Inventory adjustment produced an invalid stock movement."
                        );

                    }


                    /*
                    =================================================
                    INVENTORY TRANSACTION
                    =================================================
                    */

                    const [
                        transaction,
                    ] =
                        await InventoryTransaction
                            .create(
                                [
                                    {
                                        branch:
                                            branchId,

                                        branchSnapshot,

                                        product:
                                            product._id,

                                        type:
                                            "ADJUSTMENT",

                                        quantity:
                                            movement.quantity,

                                        previousStock:
                                            movement.previousStock,

                                        newStock:
                                            movement.newStock,

                                        remarks:
                                            String(
                                                remarks ||
                                                ""
                                            ).trim(),

                                        createdBy:
                                            userId,
                                    },
                                ],
                                {
                                    session,
                                }
                            );


                    /*
                    =================================================
                    CLOUD SYNC OUTBOX
                    =================================================
                    */

                    await syncOutboxService
                        .enqueueSyncRequest({

                            source:
                                "INVENTORY",

                            action:
                                "ADJUST",

                            aggregateId:
                                transaction._id,

                            branchId,

                            session,

                        });


                    return {

                        productId:
                            product._id,

                        transactionId:
                            transaction._id,

                    };

                }
            );


        /*
        ========================================================
        RESPONSE
        ========================================================
        */

        const product =
            await loadProductResponse(
                result.productId,
                branchId
            );


        const transaction =
            result.transactionId
                ? await InventoryTransaction
                    .findById(
                        result.transactionId
                    )
                    .populate(
                        "product",
                        "name barcode"
                    )
                    .populate(
                        "createdBy",
                        "name username role"
                    )
                : null;


        return {

            product,

            transaction,

        };

    };


/*
============================================================
GET TRANSACTIONS
============================================================
*/

const getTransactions =
    async (
        {
            productId,
            type,
            limit = 50,
        } = {},
        branchId
    ) => {

        validateObjectId(
            branchId,
            "branch ID"
        );


        const filter = {

            branch:
                branchId,

        };


        if (
            productId
        ) {

            validateObjectId(
                productId,
                "product ID"
            );


            filter.product =
                productId;

        }


        if (
            type
        ) {

            filter.type =
                type;

        }


        const numericLimit =
            Math.min(
                Math.max(
                    Number(
                        limit
                    ) ||
                    50,
                    1
                ),
                200
            );


        return InventoryTransaction
            .find(
                filter
            )
            .populate(
                "product",
                "name barcode"
            )
            .populate(
                "createdBy",
                "name username role"
            )
            .sort({
                createdAt:
                    -1,
            })
            .limit(
                numericLimit
            );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    stockIn,

    stockOut,

    adjustStock,

    getTransactions,

};