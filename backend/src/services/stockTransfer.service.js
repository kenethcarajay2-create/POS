import mongoose from "mongoose";

import StockTransfer
    from "../models/stockTransfer.model.js";

import InventoryTransaction
    from "../models/inventoryTransaction.model.js";

import Product
    from "../models/product.model.js";

import Branch
    from "../models/branch.model.js";

import ApiError
    from "../utils/ApiError.js";

import withTransaction
    from "../utils/withTransaction.js";

import branchInventoryService
    from "./branch-inventory.service.js";

import syncOutboxService
    from "./syncOutbox.service.js";


/*
============================================================
OBJECT ID
============================================================
*/

const requireObjectId =
    (
        value,
        label
    ) => {

        const id =
            value?._id ||
            value;


        if (
            !id ||
            !mongoose.Types.ObjectId
                .isValid(
                    id
                )
        ) {

            throw new ApiError(
                400,
                `Invalid ${label}.`
            );

        }


        return String(
            id
        );

    };


/*
============================================================
SOURCE BRANCH CONTEXT
============================================================
*/

const buildSourceBranchContext =
    (
        activeBranch
    ) => {

        if (
            !activeBranch ||
            typeof activeBranch !==
                "object"
        ) {

            throw new ApiError(
                400,
                "Complete active branch information is required."
            );

        }


        const branchId =
            requireObjectId(
                activeBranch._id,
                "source branch"
            );


        if (
            activeBranch.isActive ===
            false
        ) {

            throw new ApiError(
                400,
                "The active source branch is inactive."
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
            ).trim();


        if (
            !code ||
            !name
        ) {

            throw new ApiError(
                400,
                "The active source branch has incomplete information."
            );

        }


        return {
            branchId,

            snapshot: {
                code,
                name,
            },
        };

    };


/*
============================================================
DESTINATION BRANCH
============================================================
*/

const requireDestinationBranch =
    async (
        destinationBranchId,
        sourceBranchId,
        session = null
    ) => {

        const destinationId =
            requireObjectId(
                destinationBranchId,
                "destination branch"
            );


        if (
            destinationId ===
            String(
                sourceBranchId
            )
        ) {

            throw new ApiError(
                400,
                "Source and destination branches must be different."
            );

        }


        let query =
            Branch.findById(
                destinationId
            );


        if (
            session
        ) {

            query =
                query.session(
                    session
                );

        }


        const branch =
            await query;


        if (
            !branch
        ) {

            throw new ApiError(
                404,
                "Destination branch not found."
            );

        }


        if (
            branch.isActive ===
            false
        ) {

            throw new ApiError(
                400,
                "Destination branch is inactive."
            );

        }


        return branch;

    };


/*
============================================================
NORMALIZE ITEMS
============================================================
*/

const normalizeItems =
    (
        items
    ) => {

        if (
            !Array.isArray(
                items
            ) ||
            items.length ===
                0
        ) {

            throw new ApiError(
                400,
                "At least one transfer item is required."
            );

        }


        const seen =
            new Set();


        return items.map(
            (
                item
            ) => {

                const productId =
                    requireObjectId(
                        item?.productId ||
                        item?.product,
                        "product ID"
                    );


                if (
                    seen.has(
                        productId
                    )
                ) {

                    throw new ApiError(
                        400,
                        "A product may only appear once in a transfer."
                    );

                }


                seen.add(
                    productId
                );


                const quantity =
                    Number(
                        item?.quantity
                    );


                if (
                    !Number.isInteger(
                        quantity
                    ) ||
                    quantity <=
                        0
                ) {

                    throw new ApiError(
                        400,
                        "Transfer quantity must be a positive whole number."
                    );

                }


                return {
                    productId,
                    quantity,
                };

            }
        );

    };


/*
============================================================
TRANSFER NUMBER
============================================================

Uses the StockTransfer ObjectId itself to guarantee uniqueness.

Example:

TR-MAIN-20260913-A1B2C3
============================================================
*/

const buildTransferNumber =
    (
        sourceCode,
        transferId
    ) => {

        const now =
            new Date();


        const year =
            String(
                now.getFullYear()
            );


        const month =
            String(
                now.getMonth() +
                1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            );


        const suffix =
            String(
                transferId
            )
                .slice(
                    -6
                )
                .toUpperCase();


        return `TR-${sourceCode}-${year}${month}${day}-${suffix}`;

    };


/*
============================================================
LOAD / VALIDATE DRAFT ITEMS
============================================================
*/

const buildDraftItems =
    async (
        normalizedItems,
        sourceBranchId,
        session = null
    ) => {

        const result =
            [];


        for (
            const item
            of normalizedItems
        ) {

            let productQuery =
                Product.findById(
                    item.productId
                );


            if (
                session
            ) {

                productQuery =
                    productQuery.session(
                        session
                    );

            }


            const product =
                await productQuery;


            if (
                !product
            ) {

                throw new ApiError(
                    404,
                    "A selected product no longer exists."
                );

            }


            if (
                product.isActive ===
                false
            ) {

                throw new ApiError(
                    400,
                    `${product.name} is inactive.`
                );

            }


            const inventory =
                await branchInventoryService
                    .requireInventory(
                        sourceBranchId,
                        product._id,
                        {
                            session,
                        }
                    );


            const available =
                Number(
                    inventory.stock
                ) || 0;


            if (
                available <
                item.quantity
            ) {

                throw new ApiError(
                    400,
                    `Insufficient stock for ${product.name}. Requested: ${item.quantity}. Available: ${available}.`
                );

            }


            result.push({
                product:
                    product._id,

                barcode:
                    product.barcode ||
                    "",

                name:
                    product.name,

                baseUnit:
                    product.baseUnit ||
                    "Piece",

                quantity:
                    item.quantity,

                sourceStockBefore:
                    null,

                sourceStockAfter:
                    null,

                destinationStockBefore:
                    null,

                destinationStockAfter:
                    null,
            });

        }


        return result;

    };


/*
============================================================
TOTALS
============================================================
*/

const calculateTotals =
    (
        items
    ) => {

        return {
            totalItems:
                items.length,

            totalQuantity:
                items.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        Number(
                            item.quantity ||
                            0
                        ),
                    0
                ),
        };

    };


/*
============================================================
POPULATE TRANSFER
============================================================
*/

const populateTransfer =
    async (
        id
    ) => {

        return await StockTransfer
            .findById(
                id
            )

            .populate(
                "sourceBranch",
                "code name address phone"
            )

            .populate(
                "destinationBranch",
                "code name address phone"
            )

            .populate(
                "createdBy",
                "name username role"
            )

            .populate(
                "completedBy",
                "name username role"
            )

            .populate(
                "cancelledBy",
                "name username role"
            );

    };


/*
============================================================
CREATE DRAFT
============================================================
*/

const createTransfer =
    async (
        data,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const {
            branchId:
                sourceBranchId,

            snapshot:
                sourceBranchSnapshot,
        } =
            buildSourceBranchContext(
                activeBranch
            );


        const normalizedItems =
            normalizeItems(
                data?.items
            );


        const remarks =
            String(
                data?.remarks ||
                ""
            )
                .trim()
                .slice(
                    0,
                    500
                );


        const transferId =
            new mongoose.Types.ObjectId();


        const result =
            await withTransaction(
                async (
                    session
                ) => {

                    const destinationBranch =
                        await requireDestinationBranch(
                            data?.destinationBranchId,
                            sourceBranchId,
                            session
                        );


                    const items =
                        await buildDraftItems(
                            normalizedItems,
                            sourceBranchId,
                            session
                        );


                    const totals =
                        calculateTotals(
                            items
                        );


                    const transferNumber =
                        buildTransferNumber(
                            sourceBranchSnapshot.code,
                            transferId
                        );


                    const [
                        transfer,
                    ] =
                        await StockTransfer.create(
                            [
                                {
                                    _id:
                                        transferId,

                                    transferNumber,

                                    sourceBranch:
                                        sourceBranchId,

                                    sourceBranchSnapshot,

                                    destinationBranch:
                                        destinationBranch._id,

                                    destinationBranchSnapshot: {
                                        code:
                                            destinationBranch.code,

                                        name:
                                            destinationBranch.name,
                                    },

                                    items,

                                    totalItems:
                                        totals.totalItems,

                                    totalQuantity:
                                        totals.totalQuantity,

                                    remarks,

                                    status:
                                        "DRAFT",

                                    createdBy:
                                        resolvedUserId,
                                },
                            ],
                            {
                                session,
                            }
                        );


                    await syncOutboxService
                        .enqueueSyncRequest({
                            source:
                                "STOCK_TRANSFER",

                            action:
                                "CREATE",

                            aggregateId:
                                transfer._id,

                            branchId:
                                sourceBranchId,

                            session,
                        });


                    return transfer._id;

                }
            );


        return await populateTransfer(
            result
        );

    };


/*
============================================================
UPDATE DRAFT
============================================================
*/

const updateTransfer =
    async (
        transferId,
        data,
        userId,
        activeBranch
    ) => {

        requireObjectId(
            userId,
            "user ID"
        );


        const resolvedTransferId =
            requireObjectId(
                transferId,
                "stock transfer ID"
            );


        const {
            branchId:
                sourceBranchId,

            snapshot:
                sourceBranchSnapshot,
        } =
            buildSourceBranchContext(
                activeBranch
            );


        const normalizedItems =
            normalizeItems(
                data?.items
            );


        await withTransaction(
            async (
                session
            ) => {

                const transfer =
                    await StockTransfer
                        .findOne({
                            _id:
                                resolvedTransferId,

                            sourceBranch:
                                sourceBranchId,
                        })
                        .session(
                            session
                        );


                if (
                    !transfer
                ) {

                    throw new ApiError(
                        404,
                        "Stock transfer not found in the active branch."
                    );

                }


                if (
                    transfer.status !==
                    "DRAFT"
                ) {

                    throw new ApiError(
                        409,
                        "Only draft transfers can be edited."
                    );

                }


                const destinationBranch =
                    await requireDestinationBranch(
                        data?.destinationBranchId ||
                        transfer.destinationBranch,
                        sourceBranchId,
                        session
                    );


                const items =
                    await buildDraftItems(
                        normalizedItems,
                        sourceBranchId,
                        session
                    );


                const totals =
                    calculateTotals(
                        items
                    );


                transfer.sourceBranchSnapshot =
                    sourceBranchSnapshot;


                transfer.destinationBranch =
                    destinationBranch._id;


                transfer.destinationBranchSnapshot = {
                    code:
                        destinationBranch.code,

                    name:
                        destinationBranch.name,
                };


                transfer.items =
                    items;


                transfer.totalItems =
                    totals.totalItems;


                transfer.totalQuantity =
                    totals.totalQuantity;


                transfer.remarks =
                    String(
                        data?.remarks ??
                        transfer.remarks ??
                        ""
                    )
                        .trim()
                        .slice(
                            0,
                            500
                        );


                await transfer.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "STOCK_TRANSFER",

                        action:
                            "UPDATE",

                        aggregateId:
                            transfer._id,

                        branchId:
                            sourceBranchId,

                        session,
                    });

            }
        );


        return await populateTransfer(
            resolvedTransferId
        );

    };


/*
============================================================
COMPLETE TRANSFER
============================================================
*/

const completeTransfer =
    async (
        transferId,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedTransferId =
            requireObjectId(
                transferId,
                "stock transfer ID"
            );


        const {
            branchId:
                sourceBranchId,
        } =
            buildSourceBranchContext(
                activeBranch
            );


        await withTransaction(
            async (
                session
            ) => {

                const transfer =
                    await StockTransfer
                        .findOne({
                            _id:
                                resolvedTransferId,

                            sourceBranch:
                                sourceBranchId,
                        })
                        .session(
                            session
                        );


                if (
                    !transfer
                ) {

                    throw new ApiError(
                        404,
                        "Stock transfer not found in the active source branch."
                    );

                }


                if (
                    transfer.status !==
                    "DRAFT"
                ) {

                    throw new ApiError(
                        409,
                        `Only DRAFT transfers can be completed. Current status: ${transfer.status}.`
                    );

                }


                const destinationBranch =
                    await requireDestinationBranch(
                        transfer.destinationBranch,
                        sourceBranchId,
                        session
                    );


                const completedItems =
                    [];


                for (
                    const transferItem
                    of transfer.items
                ) {

                    const product =
                        await Product
                            .findById(
                                transferItem.product
                            )
                            .session(
                                session
                            );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            404,
                            `${transferItem.name} no longer exists.`
                        );

                    }


                    if (
                        product.isActive ===
                        false
                    ) {

                        throw new ApiError(
                            400,
                            `${product.name} is inactive.`
                        );

                    }


                    const quantity =
                        Number(
                            transferItem.quantity
                        );


                    /*
                    ============================================
                    SOURCE OUT
                    ============================================
                    */

                    const sourceMovement =
                        await branchInventoryService
                            .deductStock(
                                sourceBranchId,
                                product._id,
                                quantity,
                                {
                                    session,
                                }
                            );


                    /*
                    ============================================
                    DESTINATION INVENTORY
                    ============================================
                    */

                    let destinationInventory =
                        await branchInventoryService
                            .getInventory(
                                destinationBranch._id,
                                product._id,
                                {
                                    session,
                                }
                            );


                    if (
                        !destinationInventory
                    ) {

                        destinationInventory =
                            await branchInventoryService
                                .ensureInventory(
                                    destinationBranch._id,
                                    product._id,
                                    {
                                        stock:
                                            0,

                                        minimumStock:
                                            0,

                                        isActive:
                                            true,

                                        session,
                                    }
                                );

                    }


                    if (
                        destinationInventory.isActive ===
                        false
                    ) {

                        throw new ApiError(
                            400,
                            `${product.name} inventory is disabled at ${destinationBranch.name}.`
                        );

                    }


                    const destinationMovement =
                        await branchInventoryService
                            .addStock(
                                destinationBranch._id,
                                product._id,
                                quantity,
                                {
                                    session,
                                }
                            );


                    /*
                    ============================================
                    SOURCE AUDIT
                    ============================================
                    */

                    await InventoryTransaction
                        .create(
                            [
                                {
                                    branch:
                                        sourceBranchId,

                                    branchSnapshot:
                                        transfer.sourceBranchSnapshot,

                                    product:
                                        product._id,

                                    type:
                                        "TRANSFER_OUT",

                                    quantity,

                                    previousStock:
                                        sourceMovement.previousStock,

                                    newStock:
                                        sourceMovement.newStock,

                                    stockTransfer:
                                        transfer._id,

                                    transferNumber:
                                        transfer.transferNumber,

                                    remarks:
                                        `Transfer to ${transfer.destinationBranchSnapshot.code} - ${transfer.transferNumber}`,

                                    createdBy:
                                        resolvedUserId,
                                },
                            ],
                            {
                                session,
                            }
                        );


                    /*
                    ============================================
                    DESTINATION AUDIT
                    ============================================
                    */

                    await InventoryTransaction
                        .create(
                            [
                                {
                                    branch:
                                        destinationBranch._id,

                                    branchSnapshot: {
                                        code:
                                            destinationBranch.code,

                                        name:
                                            destinationBranch.name,
                                    },

                                    product:
                                        product._id,

                                    type:
                                        "TRANSFER_IN",

                                    quantity,

                                    previousStock:
                                        destinationMovement.previousStock,

                                    newStock:
                                        destinationMovement.newStock,

                                    stockTransfer:
                                        transfer._id,

                                    transferNumber:
                                        transfer.transferNumber,

                                    remarks:
                                        `Transfer from ${transfer.sourceBranchSnapshot.code} - ${transfer.transferNumber}`,

                                    createdBy:
                                        resolvedUserId,
                                },
                            ],
                            {
                                session,
                            }
                        );


                    completedItems.push({
                        product:
                            product._id,

                        barcode:
                            product.barcode ||
                            transferItem.barcode ||
                            "",

                        name:
                            product.name,

                        baseUnit:
                            product.baseUnit ||
                            transferItem.baseUnit ||
                            "Piece",

                        quantity,

                        sourceStockBefore:
                            sourceMovement.previousStock,

                        sourceStockAfter:
                            sourceMovement.newStock,

                        destinationStockBefore:
                            destinationMovement.previousStock,

                        destinationStockAfter:
                            destinationMovement.newStock,
                    });

                }


                transfer.items =
                    completedItems;


                transfer.status =
                    "COMPLETED";


                transfer.completedBy =
                    resolvedUserId;


                transfer.completedAt =
                    new Date();


                await transfer.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "STOCK_TRANSFER",

                        action:
                            "COMPLETE",

                        aggregateId:
                            transfer._id,

                        branchId:
                            sourceBranchId,

                        session,
                    });

            }
        );


        return await populateTransfer(
            resolvedTransferId
        );

    };


/*
============================================================
CANCEL DRAFT
============================================================
*/

const cancelTransfer =
    async (
        transferId,
        userId,
        activeBranch
    ) => {

        const resolvedUserId =
            requireObjectId(
                userId,
                "user ID"
            );


        const resolvedTransferId =
            requireObjectId(
                transferId,
                "stock transfer ID"
            );


        const {
            branchId:
                sourceBranchId,
        } =
            buildSourceBranchContext(
                activeBranch
            );


        await withTransaction(
            async (
                session
            ) => {

                const transfer =
                    await StockTransfer
                        .findOne({
                            _id:
                                resolvedTransferId,

                            sourceBranch:
                                sourceBranchId,
                        })
                        .session(
                            session
                        );


                if (
                    !transfer
                ) {

                    throw new ApiError(
                        404,
                        "Stock transfer not found."
                    );

                }


                if (
                    transfer.status !==
                    "DRAFT"
                ) {

                    throw new ApiError(
                        409,
                        "Only a draft transfer can be cancelled."
                    );

                }


                transfer.status =
                    "CANCELLED";


                transfer.cancelledBy =
                    resolvedUserId;


                transfer.cancelledAt =
                    new Date();


                await transfer.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({
                        source:
                            "STOCK_TRANSFER",

                        action:
                            "CANCEL",

                        aggregateId:
                            transfer._id,

                        branchId:
                            sourceBranchId,

                        session,
                    });

            }
        );


        return await populateTransfer(
            resolvedTransferId
        );

    };


/*
============================================================
GET TRANSFERS
============================================================
*/

const getTransfers =
    async (
        branchId,
        {
            status,
            limit = 100,
        } = {}
    ) => {

        const resolvedBranchId =
            requireObjectId(
                branchId,
                "branch ID"
            );


        const filter = {
            $or: [
                {
                    sourceBranch:
                        resolvedBranchId,
                },

                {
                    destinationBranch:
                        resolvedBranchId,
                },
            ],
        };


        if (
            status
        ) {

            filter.status =
                String(
                    status
                )
                    .trim()
                    .toUpperCase();

        }


        const safeLimit =
            Math.min(
                Math.max(
                    Number(
                        limit
                    ) || 100,
                    1
                ),
                300
            );


        return await StockTransfer
            .find(
                filter
            )

            .populate(
                "sourceBranch",
                "code name"
            )

            .populate(
                "destinationBranch",
                "code name"
            )

            .populate(
                "createdBy",
                "name username"
            )

            .populate(
                "completedBy",
                "name username"
            )

            .sort({
                createdAt:
                    -1,
            })

            .limit(
                safeLimit
            );

    };


/*
============================================================
GET TRANSFER
============================================================
*/

const getTransferById =
    async (
        transferId,
        branchId
    ) => {

        const resolvedTransferId =
            requireObjectId(
                transferId,
                "stock transfer ID"
            );


        const resolvedBranchId =
            requireObjectId(
                branchId,
                "branch ID"
            );


        const transfer =
            await StockTransfer
                .findOne({
                    _id:
                        resolvedTransferId,

                    $or: [
                        {
                            sourceBranch:
                                resolvedBranchId,
                        },

                        {
                            destinationBranch:
                                resolvedBranchId,
                        },
                    ],
                })

                .populate(
                    "sourceBranch",
                    "code name address phone"
                )

                .populate(
                    "destinationBranch",
                    "code name address phone"
                )

                .populate(
                    "createdBy",
                    "name username role"
                )

                .populate(
                    "completedBy",
                    "name username role"
                )

                .populate(
                    "cancelledBy",
                    "name username role"
                );


        if (
            !transfer
        ) {

            throw new ApiError(
                404,
                "Stock transfer not found for the active branch."
            );

        }


        return transfer;

    };


export default {
    createTransfer,

    updateTransfer,

    completeTransfer,

    cancelTransfer,

    getTransfers,

    getTransferById,
};