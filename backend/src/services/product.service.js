import Product from "../models/product.model.js";

import Branch from "../models/branch.model.js";

import BranchInventory from "../models/branchInventory.model.js";

import ApiError from "../utils/ApiError.js";

import mongoose from "mongoose";

import {
    Types,
} from "mongoose";

import Counter from "../models/counter.model.js";

import withTransaction from "../utils/withTransaction.js";

import branchInventoryService from "./branch-inventory.service.js";

import syncOutboxService from "./syncOutbox.service.js";


/*
============================================================
GENERATE UNIQUE INTERNAL PRODUCT CODE
============================================================
*/

const generateUniqueBarcode =
    async () => {

        const counter =
            await Counter.findOneAndUpdate(
                {
                    _id:
                        "product_barcode",
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
            )
                .lean();


        if (
            !counter ||
            !Number.isSafeInteger(
                counter.sequence
            ) ||
            counter.sequence <=
                0
        ) {

            throw new ApiError(
                500,
                "Unable to generate product code."
            );

        }


        const sequence =
            String(
                counter.sequence
            )
                .padStart(
                    12,
                    "0"
                );


        const barcode =
            `PRD-${sequence}`;


        const existing =
            await Product.exists({
                barcode,
            });


        if (
            existing
        ) {

            throw new ApiError(
                409,
                "Generated product code already exists."
            );

        }


        return barcode;

    };


/*
============================================================
VALIDATE PRICING
============================================================
*/

const validatePricing =
    (
        pricing
    ) => {

        if (
            !Array.isArray(
                pricing
            ) ||
            pricing.length ===
                0
        ) {

            throw new ApiError(
                400,
                "At least one pricing option is required."
            );

        }


        const normalizedPricing =
            pricing.map(
                (
                    item
                ) => {

                    const quantity =
                        Number(
                            item?.quantity
                        );


                    const price =
                        Number(
                            item?.price
                        );


                    if (
                        !Number.isFinite(
                            quantity
                        ) ||
                        quantity <=
                            0
                    ) {

                        throw new ApiError(
                            400,
                            "Pricing quantity must be greater than zero."
                        );

                    }


                    if (
                        !Number.isFinite(
                            price
                        ) ||
                        price <
                            0
                    ) {

                        throw new ApiError(
                            400,
                            "Pricing price cannot be negative."
                        );

                    }


                    return {

                        ...item,

                        quantity,

                        price,

                    };

                }
            );


        const quantities =
            normalizedPricing.map(
                (
                    price
                ) =>
                    price.quantity
            );


        if (
            !quantities.includes(
                1
            )
        ) {

            throw new ApiError(
                400,
                "Pricing must include quantity 1."
            );

        }


        const duplicates =
            quantities.filter(
                (
                    quantity,
                    index
                ) =>
                    quantities.indexOf(
                        quantity
                    ) !==
                    index
            );


        if (
            duplicates.length >
            0
        ) {

            throw new ApiError(
                400,
                "Duplicate pricing quantities are not allowed."
            );

        }


        normalizedPricing.sort(
            (
                a,
                b
            ) =>
                a.quantity -
                b.quantity
        );


        return normalizedPricing;

    };


/*
============================================================
GET UNIT PRICE
============================================================
*/

const getUnitPrice =
    (
        pricing,
        quantity
    ) => {

        if (
            !Array.isArray(
                pricing
            ) ||
            pricing.length ===
                0
        ) {

            return 0;

        }


        const numericQuantity =
            Number(
                quantity
            );


        if (
            !Number.isFinite(
                numericQuantity
            ) ||
            numericQuantity <=
                0
        ) {

            return Number(
                pricing[0]?.price ||
                0
            );

        }


        const sortedPricing =
            [
                ...pricing,
            ].sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a?.quantity ||
                        0
                    ) -
                    Number(
                        b?.quantity ||
                        0
                    )
            );


        let selectedPrice =
            Number(
                sortedPricing[0]
                    ?.price ||
                0
            );


        for (
            const tier
            of sortedPricing
        ) {

            const tierQuantity =
                Number(
                    tier?.quantity ||
                    0
                );


            const tierPrice =
                Number(
                    tier?.price ||
                    0
                );


            if (
                numericQuantity >=
                    tierQuantity
            ) {

                selectedPrice =
                    tierPrice;

            } else {

                break;

            }

        }


        return selectedPrice;

    };


/*
============================================================
REQUIRE BRANCH ID
============================================================
*/

const requireBranchId =
    (
        value
    ) => {

        return branchInventoryService
            .requireObjectId(
                value,
                "branch ID"
            );

    };


/*
============================================================
NORMALIZE NON-NEGATIVE NUMBER
============================================================
*/

const normalizeNonNegativeNumber =
    (
        value,
        label
    ) => {

        const numericValue =
            Number(
                value ??
                0
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
DECORATE PRODUCT WITH BRANCH INVENTORY
============================================================
*/

const decorateProductWithInventory =
    (
        product,
        inventory,
        branchId
    ) => {

        const productData =
            typeof product?.toObject ===
            "function"
                ? product.toObject()
                : {
                    ...product,
                };


        const legacyStock =
            Number(
                productData.stock
            ) ||
            0;


        const legacyMinimumStock =
            Number(
                productData.minimumStock
            ) ||
            0;


        const configured =
            Boolean(
                inventory
            );


        const branchStock =
            configured
                ? Number(
                    inventory.stock
                ) ||
                  0
                : 0;


        const branchMinimumStock =
            configured
                ? Number(
                    inventory.minimumStock
                ) ||
                  0
                : 0;


        return {

            ...productData,

            stock:
                branchStock,

            minimumStock:
                branchMinimumStock,

            branchInventoryId:
                inventory?._id ||
                null,

            branchId:
                inventory?.branch ||
                branchId ||
                null,

            branchInventoryConfigured:
                configured,

            branchInventoryActive:
                configured
                    ? inventory.isActive !==
                      false
                    : false,

            legacyStock,

            legacyMinimumStock,

        };

    };


/*
============================================================
CREATE PRODUCT
============================================================
*/

const createProduct =
    async (
        productData,
        activeBranch
    ) => {

        const branchId =
            requireBranchId(
                activeBranch
            );


        const barcode =
            String(
                productData?.barcode ||
                ""
            )
                .trim();


        if (
            !barcode
        ) {

            throw new ApiError(
                400,
                "Barcode is required."
            );

        }


        const initialStock =
            normalizeNonNegativeNumber(
                productData?.stock,
                "Initial stock"
            );


        const initialMinimumStock =
            normalizeNonNegativeNumber(
                productData
                    ?.minimumStock,
                "Minimum stock"
            );


        const existingProduct =
            await Product.findOne({

                barcode,

            })
                .select(
                    "_id barcode name"
                )
                .lean();


        if (
            existingProduct
        ) {

            throw new ApiError(
                409,
                "A product with this barcode already exists."
            );

        }


        const globalProductData = {

            ...productData,

            barcode,

            pricing:
                validatePricing(
                    productData
                        ?.pricing
                ),

        };


        delete globalProductData
            .stock;

        delete globalProductData
            .minimumStock;

        delete globalProductData
            .branchInventoryId;

        delete globalProductData
            .branchId;

        delete globalProductData
            .branchInventoryConfigured;

        delete globalProductData
            .branchInventoryActive;

        delete globalProductData
            .legacyStock;

        delete globalProductData
            .legacyMinimumStock;


        try {

            const result =
                await withTransaction(
                    async (
                        session
                    ) => {

                        /*
                        =========================================
                        VERIFY ACTIVE BRANCH
                        =========================================
                        */

                        const currentBranch =
                            await Branch
                                .findOne({

                                    _id:
                                        branchId,

                                    isActive:
                                        true,

                                })
                                .select(
                                    "_id"
                                )
                                .session(
                                    session
                                )
                                .lean();


                        if (
                            !currentBranch
                        ) {

                            throw new ApiError(
                                400,
                                "The active branch is invalid or disabled."
                            );

                        }


                        /*
                        =========================================
                        LOAD ALL BRANCHES
                        =========================================
                        */

                        const allBranches =
                            await Branch
                                .find({})
                                .select(
                                    "_id"
                                )
                                .session(
                                    session
                                )
                                .lean();


                        if (
                            allBranches.length ===
                            0
                        ) {

                            throw new ApiError(
                                500,
                                "No branches are configured."
                            );

                        }


                        /*
                        =========================================
                        CREATE GLOBAL PRODUCT
                        =========================================
                        */

                        const [
                            product,
                        ] =
                            await Product.create(
                                [
                                    globalProductData,
                                ],
                                {
                                    session,
                                }
                            );


                        /*
                        =========================================
                        CREATE INVENTORY FOR EVERY BRANCH
                        =========================================
                        */

                        const inventoryRows =
                            allBranches.map(
                                (
                                    branch
                                ) => {

                                    const isActiveBranch =
                                        String(
                                            branch._id
                                        ) ===
                                        String(
                                            branchId
                                        );


                                    return {

                                        branch:
                                            branch._id,

                                        product:
                                            product._id,

                                        stock:
                                            isActiveBranch
                                                ? initialStock
                                                : 0,

                                        minimumStock:
                                            initialMinimumStock,

                                        isActive:
                                            true,

                                    };

                                }
                            );


                        await BranchInventory.insertMany(
                            inventoryRows,
                            {
                                session,
                                ordered:
                                    true,
                            }
                        );


                        /*
                        =========================================
                        GET ACTIVE BRANCH INVENTORY
                        =========================================
                        */

                        const activeInventory =
                            await BranchInventory
                                .findOne({

                                    branch:
                                        branchId,

                                    product:
                                        product._id,

                                })
                                .session(
                                    session
                                );


                        if (
                            !activeInventory
                        ) {

                            throw new ApiError(
                                500,
                                "Unable to initialize product inventory for the active branch."
                            );

                        }


                        /*
                        =========================================
                        CLOUD SYNC OUTBOX
                        =========================================

                        Product creation and every branch
                        inventory row are committed together
                        with this durable synchronization
                        request.
                        =========================================
                        */

                        await syncOutboxService
                            .enqueueSyncRequest({

                                source:
                                    "PRODUCT",

                                action:
                                    "CREATE",

                                aggregateId:
                                    product._id,

                                branchId,

                                session,

                            });


                        return {

                            product,

                            inventory:
                                activeInventory,

                        };

                    }
                );


            return decorateProductWithInventory(
                result.product,
                result.inventory,
                branchId
            );


        } catch (
            error
        ) {

            if (
                error?.code ===
                    11000 &&
                (
                    error?.keyPattern
                        ?.barcode ||
                    error?.keyValue
                        ?.barcode
                )
            ) {

                throw new ApiError(
                    409,
                    "This barcode is already assigned to another product."
                );

            }


            throw error;

        }

    };


/*
============================================================
GET PRODUCTS
============================================================
*/

const getProducts =
    async (
        branchId
    ) => {

        const resolvedBranchId =
            requireBranchId(
                branchId
            );


        const products =
            await Product
                .find({})
                .sort({

                    createdAt:
                        -1,

                })
                .lean();


        if (
            products.length ===
                0
        ) {

            return [];

        }


        const productIds =
            products.map(
                (
                    product
                ) =>
                    product._id
            );


        const inventories =
            await BranchInventory
                .find({

                    branch:
                        resolvedBranchId,

                    product: {

                        $in:
                            productIds,

                    },

                })
                .lean();


        const inventoryMap =
            new Map();


        for (
            const inventory
            of inventories
        ) {

            inventoryMap.set(
                String(
                    inventory.product
                ),
                inventory
            );

        }


        return products.map(
            (
                product
            ) => {

                const inventory =
                    inventoryMap.get(
                        String(
                            product._id
                        )
                    ) ||
                    null;


                return decorateProductWithInventory(
                    product,
                    inventory,
                    resolvedBranchId
                );

            }
        );

    };


/*
============================================================
GET PRODUCT BY ID
============================================================
*/

const getProductById =
    async (
        id,
        branchId
    ) => {

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    id
                )
        ) {

            throw new ApiError(
                400,
                "Invalid product ID."
            );

        }


        const resolvedBranchId =
            requireBranchId(
                branchId
            );


        const product =
            await Product.findById(
                id
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
            await BranchInventory
                .findOne({

                    branch:
                        resolvedBranchId,

                    product:
                        product._id,

                });


        return decorateProductWithInventory(
            product,
            inventory,
            resolvedBranchId
        );

    };


/*
============================================================
UPDATE PRODUCT
============================================================
*/

const updateProduct =
    async (
        id,
        productData,
        activeBranch
    ) => {

        if (
            !Types.ObjectId.isValid(
                id
            )
        ) {

            throw new ApiError(
                400,
                "Invalid product ID."
            );

        }


        const branchId =
            requireBranchId(
                activeBranch
            );


        return withTransaction(
            async (
                session
            ) => {

                const product =
                    await Product
                        .findById(
                            id
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


                const inventory =
                    await branchInventoryService
                        .requireInventory(
                            branchId,
                            product._id,
                            {
                                session,
                            }
                        );


                /*
                ====================================================
                STOCK FIELD COMPATIBILITY
                ====================================================
                */

                if (
                    productData?.stock !==
                    undefined
                ) {

                    const requestedStock =
                        Number(
                            productData
                                .stock
                        );


                    const currentBranchStock =
                        Number(
                            inventory.stock
                        ) ||
                        0;


                    if (
                        !Number.isFinite(
                            requestedStock
                        ) ||
                        requestedStock <
                            0
                    ) {

                        throw new ApiError(
                            400,
                            "Stock cannot be negative."
                        );

                    }


                    if (
                        requestedStock !==
                        currentBranchStock
                    ) {

                        throw new ApiError(
                            400,
                            "Stock must be changed through Inventory Adjustment."
                        );

                    }

                }


                /*
                ====================================================
                BRANCH MINIMUM STOCK
                ====================================================
                */

                let updatedInventory =
                    inventory;


                if (
                    productData
                        ?.minimumStock !==
                    undefined
                ) {

                    updatedInventory =
                        await branchInventoryService
                            .setMinimumStock(
                                branchId,
                                product._id,
                                productData
                                    .minimumStock,
                                {
                                    session,
                                }
                            );

                }


                /*
                ====================================================
                GLOBAL PRODUCT DATA
                ====================================================
                */

                const globalProductData = {

                    ...productData,

                };


                delete globalProductData
                    .stock;

                delete globalProductData
                    .minimumStock;

                delete globalProductData
                    .branchInventoryId;

                delete globalProductData
                    .branchId;

                delete globalProductData
                    .branchInventoryConfigured;

                delete globalProductData
                    .branchInventoryActive;

                delete globalProductData
                    .legacyStock;

                delete globalProductData
                    .legacyMinimumStock;


                /*
                ====================================================
                BARCODE
                ====================================================
                */

                if (
                    globalProductData
                        .barcode !==
                    undefined
                ) {

                    const barcode =
                        String(
                            globalProductData
                                .barcode ||
                            ""
                        )
                            .trim();


                    if (
                        !barcode
                    ) {

                        throw new ApiError(
                            400,
                            "Barcode cannot be empty."
                        );

                    }


                    globalProductData
                        .barcode =
                        barcode;


                    if (
                        barcode !==
                        product.barcode
                    ) {

                        const existing =
                            await Product
                                .findOne({

                                    barcode,

                                    _id: {
                                        $ne:
                                            product._id,
                                    },

                                })
                                .select(
                                    "_id"
                                )
                                .session(
                                    session
                                )
                                .lean();


                        if (
                            existing
                        ) {

                            throw new ApiError(
                                409,
                                "Another product already uses this barcode."
                            );

                        }

                    }

                }


                /*
                ====================================================
                PRICING
                ====================================================
                */

                if (
                    globalProductData
                        .pricing !==
                    undefined
                ) {

                    globalProductData
                        .pricing =
                        validatePricing(
                            globalProductData
                                .pricing
                        );

                }


                /*
                ====================================================
                APPLY GLOBAL UPDATE
                ====================================================
                */

                Object.assign(
                    product,
                    globalProductData
                );


                try {

                    await product.save({
                        session,
                    });


                } catch (
                    error
                ) {

                    if (
                        error?.code ===
                            11000 &&
                        (
                            error?.keyPattern
                                ?.barcode ||
                            error?.keyValue
                                ?.barcode
                        )
                    ) {

                        throw new ApiError(
                            409,
                            "Another product already uses this barcode."
                        );

                    }


                    throw error;

                }


                /*
                ====================================================
                CLOUD SYNC OUTBOX
                ====================================================

                Covers both:

                - global Product changes
                - branch minimumStock changes

                because they occur within the same transaction.
                ====================================================
                */

                await syncOutboxService
                    .enqueueSyncRequest({

                        source:
                            "PRODUCT",

                        action:
                            "UPDATE",

                        aggregateId:
                            product._id,

                        branchId,

                        session,

                    });


                return decorateProductWithInventory(
                    product,
                    updatedInventory,
                    branchId
                );

            }
        );

    };


/*
============================================================
UPDATE GLOBAL PRODUCT STATUS
============================================================

Product.isActive is global.

This operation is now transactional so the product status
change and its durable outbox event cannot become separated.
============================================================
*/

const updateProductStatus =
    async (
        id,
        isActive,
        activeBranch
    ) => {

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    id
                )
        ) {

            throw new ApiError(
                400,
                "Invalid product ID."
            );

        }


        const branchId =
            requireBranchId(
                activeBranch
            );


        if (
            typeof isActive !==
            "boolean"
        ) {

            throw new ApiError(
                400,
                "Product status must be true or false."
            );

        }


        return await withTransaction(
            async (
                session
            ) => {

                const product =
                    await Product
                        .findById(
                            id
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


                /*
                ====================================================
                UPDATE GLOBAL STATUS
                ====================================================
                */

                product.isActive =
                    isActive;


                await product.save({
                    session,
                });


                /*
                ====================================================
                ACTIVE BRANCH INVENTORY
                ====================================================

                Inventory status itself is NOT being changed.

                We only load the branch inventory so the API
                response remains compatible with the existing
                frontend.
                ====================================================
                */

                const inventory =
                    await BranchInventory
                        .findOne({

                            branch:
                                branchId,

                            product:
                                product._id,

                        })
                        .session(
                            session
                        );


                /*
                ====================================================
                CLOUD SYNC OUTBOX
                ====================================================
                */

                await syncOutboxService
                    .enqueueSyncRequest({

                        source:
                            "PRODUCT",

                        action:
                            isActive
                                ? "ENABLE"
                                : "DISABLE",

                        aggregateId:
                            product._id,

                        branchId,

                        session,

                    });


                return decorateProductWithInventory(
                    product,
                    inventory,
                    branchId
                );

            }
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    createProduct,

    getProducts,

    getProductById,

    updateProduct,

    updateProductStatus,

    getUnitPrice,

    generateUniqueBarcode,

};