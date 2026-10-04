import crypto
    from "node:crypto";

import mongoose
    from "mongoose";

import {
    connectCloudDatabase,
    getCloudConnection,
    isCloudConnected,
}
from "../config/cloudDatabase.js";

import preparedCartSchema
    from "../models/preparedCart.model.js";

import Product
    from "../models/product.model.js";

import Branch
    from "../models/branch.model.js";

import BranchInventory
    from "../models/branchInventory.model.js";

import User
    from "../models/user.model.js";

import ApiError
    from "../utils/ApiError.js";


/*
============================================================
CONFIG
============================================================
*/

const PREPARED_CART_MODEL_NAME =
    "PreparedCart";


const PREPARED_CART_EXPIRY_MS =
    30 * 60 * 1000;


/*
============================================================
REQUIRE OBJECT ID
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
                `A valid ${label} is required.`
            );

        }


        return new mongoose.Types.ObjectId(
            id
        );

    };


/*
============================================================
ENSURE CLOUD CONNECTION
============================================================
*/

const requireCloudConnection =
    async () => {

        if (
            !isCloudConnected()
        ) {

            await connectCloudDatabase();

        }


        const connection =
            getCloudConnection();


        if (
            !connection
        ) {

            throw new ApiError(
                503,
                "Online prepared-cart service is currently unavailable."
            );

        }


        return connection;

    };


/*
============================================================
GET CLOUD MODEL
============================================================
*/

const getCloudModel =
    (
        connection,
        modelName,
        schema,
        collectionName
    ) => {

        if (
            connection.models[
                modelName
            ]
        ) {

            return connection.models[
                modelName
            ];

        }


        return connection.model(
            modelName,
            schema,
            collectionName
        );

    };


/*
============================================================
GET PREPARED CART MODEL
============================================================
*/

const getPreparedCartModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            PREPARED_CART_MODEL_NAME,
            preparedCartSchema,
            "preparedcarts"
        );

    };


/*
============================================================
GET CLOUD PRODUCT MODEL
============================================================
*/

const getCloudProductModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "Product",
            Product.schema,
            Product.collection.name
        );

    };


/*
============================================================
GET CLOUD BRANCH MODEL
============================================================
*/

const getCloudBranchModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "Branch",
            Branch.schema,
            Branch.collection.name
        );

    };


/*
============================================================
GET CLOUD BRANCH INVENTORY MODEL
============================================================
*/

const getCloudBranchInventoryModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "BranchInventory",
            BranchInventory.schema,
            BranchInventory.collection.name
        );

    };


/*
============================================================
GET CLOUD USER MODEL
============================================================
*/

const getCloudUserModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "User",
            User.schema,
            User.collection.name
        );

    };


/*
============================================================
GET UNIT PRICE
============================================================

Uses the same tier behavior as the main Product service.

Example:

pricing:

[
    { quantity: 1,  price: 10 },
    { quantity: 12, price: 9 }
]

quantity 1  -> 10
quantity 6  -> 10
quantity 12 -> 9
quantity 24 -> 9
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
CREATE RAW TOKEN
============================================================

256 bits of randomness.

The raw token is returned to the mobile client once and is
never persisted.
============================================================
*/

const createRawToken =
    () => {

        return crypto
            .randomBytes(
                32
            )
            .toString(
                "base64url"
            );

    };


/*
============================================================
HASH TOKEN
============================================================
*/

const hashToken =
    (
        rawToken
    ) => {

        const token =
            String(
                rawToken ||
                ""
            )
                .trim();


        if (
            !token
        ) {

            throw new ApiError(
                400,
                "Prepared-cart token is required."
            );

        }


        return crypto
            .createHash(
                "sha256"
            )
            .update(
                token,
                "utf8"
            )
            .digest(
                "hex"
            );

    };


/*
============================================================
NORMALIZE QR TOKEN
============================================================

Accepted input:

    POSCART:<token>

or:

    <token>
============================================================
*/

const normalizeRawToken =
    (
        value
    ) => {

        let token =
            String(
                value ||
                ""
            )
                .trim();


        if (
            token
                .toUpperCase()
                .startsWith(
                    "POSCART:"
                )
        ) {

            token =
                token.substring(
                    "POSCART:".length
                )
                .trim();

        }


        if (
            !token
        ) {

            throw new ApiError(
                400,
                "Prepared-cart token is required."
            );

        }


        return token;

    };


/*
============================================================
BUILD QR VALUE
============================================================
*/

const buildQrValue =
    (
        rawToken
    ) => {

        return (
            `POSCART:${rawToken}`
        );

    };


/*
============================================================
EXPIRE CART IF NECESSARY
============================================================
*/

const expirePreparedCartIfNeeded =
    async (
        cart
    ) => {

        if (
            !cart
        ) {

            return null;

        }


        if (
            cart.status !==
            "OPEN"
        ) {

            return cart;

        }


        const expiresAt =
            new Date(
                cart.expiresAt
            );


        if (
            expiresAt.getTime() >
            Date.now()
        ) {

            return cart;

        }


        const PreparedCart =
            await getPreparedCartModel();


        const expired =
            await PreparedCart
                .findOneAndUpdate(
                    {
                        _id:
                            cart._id,

                        status:
                            "OPEN",

                        expiresAt: {
                            $lte:
                                new Date(),
                        },
                    },
                    {
                        $set: {

                            status:
                                "EXPIRED",

                        },
                    },
                    {
                        new:
                            true,
                    }
                );


        if (
            expired
        ) {

            return expired;

        }


        return PreparedCart.findById(
            cart._id
        );

    };


/*
============================================================
CREATE PREPARED CART
============================================================

This method stores snapshots.

It does NOT:

- reserve inventory
- deduct stock
- create a Sale
- update loyalty
- modify local POS data
============================================================
*/

const createPreparedCart =
    async ({
        branchId,
        createdBy,
        items,
    }) => {

        const resolvedBranchId =
            requireObjectId(
                branchId,
                "branch ID"
            );


        const resolvedCreatedBy =
            requireObjectId(
                createdBy,
                "creator user ID"
            );


        if (
            !Array.isArray(
                items
            ) ||
            items.length ===
                0
        ) {

            throw new ApiError(
                400,
                "Prepared cart must contain at least one item."
            );

        }


        const [
            PreparedCart,
            CloudProduct,
            CloudBranch,
            CloudBranchInventory,
            CloudUser,
        ] =
            await Promise.all([

                getPreparedCartModel(),

                getCloudProductModel(),

                getCloudBranchModel(),

                getCloudBranchInventoryModel(),

                getCloudUserModel(),

            ]);


        /*
        ========================================================
        VALIDATE BRANCH
        ========================================================
        */

        const branch =
            await CloudBranch
                .findOne({

                    _id:
                        resolvedBranchId,

                    isActive:
                        true,

                })
                .select(
                    "_id code name"
                )
                .lean();


        if (
            !branch
        ) {

            throw new ApiError(
                400,
                "The selected branch is invalid or disabled."
            );

        }


        /*
        ========================================================
        VALIDATE CREATOR
        ========================================================
        */

        const creator =
            await CloudUser
                .findOne({

                    _id:
                        resolvedCreatedBy,

                    isActive: {
                        $ne:
                            false,
                    },

                })
                .select(
                    "_id"
                )
                .lean();


        if (
            !creator
        ) {

            throw new ApiError(
                403,
                "The prepared-cart user is invalid or disabled."
            );

        }


        /*
        ========================================================
        NORMALIZE ITEMS
        ========================================================
        */

        const normalizedItems =
            items.map(
                (
                    item,
                    index
                ) => {

                    const productId =
                        requireObjectId(
                            item?.product ||
                            item?.productId,
                            `product ID for item ${
                                index +
                                1
                            }`
                        );


                    const quantity =
                        Number(
                            item?.quantity
                        );


                    if (
                        !Number.isSafeInteger(
                            quantity
                        ) ||
                        quantity <=
                            0
                    ) {

                        throw new ApiError(
                            400,
                            `Quantity for item ${
                                index +
                                1
                            } must be a positive whole number.`
                        );

                    }


                    return {

                        productId,

                        quantity,

                    };

                }
            );


        /*
        ========================================================
        PREVENT DUPLICATES
        ========================================================
        */

        const productKeys =
            normalizedItems.map(
                (
                    item
                ) =>
                    String(
                        item.productId
                    )
            );


        if (
            new Set(
                productKeys
            ).size !==
            productKeys.length
        ) {

            throw new ApiError(
                400,
                "Prepared cart contains duplicate product rows."
            );

        }


        const productIds =
            normalizedItems.map(
                (
                    item
                ) =>
                    item.productId
            );


        /*
        ========================================================
        LOAD PRODUCTS
        ========================================================
        */

        const products =
            await CloudProduct
                .find({

                    _id: {
                        $in:
                            productIds,
                    },

                    isActive: {
                        $ne:
                            false,
                    },

                })
                .lean();


        const productMap =
            new Map(
                products.map(
                    (
                        product
                    ) => [

                        String(
                            product._id
                        ),

                        product,

                    ]
                )
            );


        /*
        ========================================================
        LOAD BRANCH INVENTORY
        ========================================================
        */

        const inventories =
            await CloudBranchInventory
                .find({

                    branch:
                        resolvedBranchId,

                    product: {
                        $in:
                            productIds,
                    },

                    isActive: {
                        $ne:
                            false,
                    },

                })
                .lean();


        const inventoryMap =
            new Map(
                inventories.map(
                    (
                        inventory
                    ) => [

                        String(
                            inventory.product
                        ),

                        inventory,

                    ]
                )
            );


        /*
        ========================================================
        BUILD SNAPSHOTS
        ========================================================
        */

        const snapshotItems =
            normalizedItems.map(
                (
                    item
                ) => {

                    const product =
                        productMap.get(
                            String(
                                item.productId
                            )
                        );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            400,
                            "One or more products no longer exist or are disabled."
                        );

                    }


                    const inventory =
                        inventoryMap.get(
                            String(
                                item.productId
                            )
                        );


                    if (
                        !inventory
                    ) {

                        throw new ApiError(
                            400,
                            `Product "${product.name}" is not configured for this branch.`
                        );

                    }


                    const unitPrice =
                        getUnitPrice(
                            product.pricing,
                            item.quantity
                        );


                    if (
                        !Number.isFinite(
                            unitPrice
                        ) ||
                        unitPrice <
                            0
                    ) {

                        throw new ApiError(
                            500,
                            `Product "${product.name}" has invalid pricing.`
                        );

                    }


                    return {

                        product:
                            product._id,

                        barcodeSnapshot:
                            String(
                                product.barcode ||
                                ""
                            ),

                        nameSnapshot:
                            String(
                                product.name ||
                                "Unnamed Product"
                            ),

                        quantity:
                            item.quantity,

                        unitPriceSnapshot:
                            unitPrice,

                        subtotalSnapshot:
                            unitPrice *
                            item.quantity,

                    };

                }
            );


        /*
        ========================================================
        TOKEN
        ========================================================
        */

        const rawToken =
            createRawToken();


        const tokenHash =
            hashToken(
                rawToken
            );


        const expiresAt =
            new Date(
                Date.now() +
                PREPARED_CART_EXPIRY_MS
            );


        /*
        ========================================================
        CREATE CLOUD RECORD
        ========================================================
        */

        let cart;


        try {

            cart =
                await PreparedCart.create({

                    branch:
                        resolvedBranchId,

                    createdBy:
                        resolvedCreatedBy,

                    items:
                        snapshotItems,

                    tokenHash,

                    status:
                        "OPEN",

                    expiresAt,

                });


        } catch (
            error
        ) {

            if (
                error?.code ===
                11000
            ) {

                throw new ApiError(
                    500,
                    "Unable to create a unique prepared-cart token. Please try again."
                );

            }


            throw error;

        }


        return {

            cart: {

                _id:
                    cart._id,

                branch:
                    cart.branch,

                createdBy:
                    cart.createdBy,

                items:
                    cart.items,

                status:
                    cart.status,

                expiresAt:
                    cart.expiresAt,

                createdAt:
                    cart.createdAt,

            },

            token:
                rawToken,

            qrValue:
                buildQrValue(
                    rawToken
                ),

        };

    };


/*
============================================================
FIND PREPARED CART BY TOKEN
============================================================
*/

const findPreparedCartByToken =
    async (
        token
    ) => {

        const rawToken =
            normalizeRawToken(
                token
            );


        const tokenHash =
            hashToken(
                rawToken
            );


        const PreparedCart =
            await getPreparedCartModel();


        let cart =
            await PreparedCart.findOne({

                tokenHash,

            });


        if (
            !cart
        ) {

            throw new ApiError(
                404,
                "Prepared cart was not found."
            );

        }


        cart =
            await expirePreparedCartIfNeeded(
                cart
            );


        return cart;

    };


/*
============================================================
RESOLVE PREPARED CART FOR DESKTOP
============================================================

This is the authoritative QR import validation step.

IMPORTANT:

This function DOES NOT:

- consume the PreparedCart
- create a Sale
- deduct inventory
- reserve inventory
- update Product
- update BranchInventory

It only validates the current state and returns a safe
desktop-cart preview.
============================================================
*/

const resolvePreparedCart =
    async ({
        token,
        branchId,
    }) => {

        const resolvedBranchId =
            requireObjectId(
                branchId,
                "branch ID"
            );


        /*
        ========================================================
        FIND CART
        ========================================================
        */

        const cart =
            await findPreparedCartByToken(
                token
            );


        /*
        ========================================================
        STATUS
        ========================================================
        */

        if (
            cart.status ===
            "EXPIRED"
        ) {

            throw new ApiError(
                410,
                "Prepared cart has expired."
            );

        }


        if (
            cart.status ===
            "CONSUMED"
        ) {

            throw new ApiError(
                409,
                "Prepared cart has already been used."
            );

        }


        if (
            cart.status ===
            "CANCELLED"
        ) {

            throw new ApiError(
                409,
                "Prepared cart has been cancelled."
            );

        }


        if (
            cart.status !==
            "OPEN"
        ) {

            throw new ApiError(
                409,
                "Prepared cart is not available."
            );

        }


        /*
        ========================================================
        SAME BRANCH
        ========================================================

        A QR prepared for BR02 must never be imported into a
        desktop currently operating on MAIN.
        ========================================================
        */

        if (
            String(
                cart.branch
            ) !==
            String(
                resolvedBranchId
            )
        ) {

            throw new ApiError(
                409,
                "Prepared cart belongs to a different branch."
            );

        }


        /*
        ========================================================
        CLOUD MODELS
        ========================================================
        */

        const [
            CloudProduct,
            CloudBranch,
            CloudBranchInventory,
        ] =
            await Promise.all([

                getCloudProductModel(),

                getCloudBranchModel(),

                getCloudBranchInventoryModel(),

            ]);


        /*
        ========================================================
        VERIFY CURRENT BRANCH
        ========================================================
        */

        const branch =
            await CloudBranch
                .findOne({

                    _id:
                        resolvedBranchId,

                    isActive:
                        true,

                })
                .select(
                    "_id code name"
                )
                .lean();


        if (
            !branch
        ) {

            throw new ApiError(
                400,
                "The active branch is invalid or disabled."
            );

        }


        const productIds =
            cart.items.map(
                (
                    item
                ) =>
                    item.product
            );


        /*
        ========================================================
        CURRENT PRODUCTS
        ========================================================

        Do not filter isActive here.

        We need to know whether a product:

        - exists and is active
        - exists but is disabled
        - no longer exists

        so the desktop can display the correct warning.
        ========================================================
        */

        const products =
            await CloudProduct
                .find({

                    _id: {
                        $in:
                            productIds,
                    },

                })
                .lean();


        const productMap =
            new Map(
                products.map(
                    (
                        product
                    ) => [

                        String(
                            product._id
                        ),

                        product,

                    ]
                )
            );


        /*
        ========================================================
        CURRENT BRANCH INVENTORY
        ========================================================
        */

        const inventories =
            await CloudBranchInventory
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
            new Map(
                inventories.map(
                    (
                        inventory
                    ) => [

                        String(
                            inventory.product
                        ),

                        inventory,

                    ]
                )
            );


        /*
        ========================================================
        RESOLVE ITEMS
        ========================================================
        */

        const resolvedItems =
            cart.items.map(
                (
                    preparedItem
                ) => {

                    const productId =
                        String(
                            preparedItem.product
                        );


                    const product =
                        productMap.get(
                            productId
                        ) ||
                        null;


                    const inventory =
                        inventoryMap.get(
                            productId
                        ) ||
                        null;


                    const requestedQuantity =
                        Number(
                            preparedItem.quantity ||
                            0
                        );


                    const snapshotUnitPrice =
                        Number(
                            preparedItem
                                .unitPriceSnapshot ||
                            0
                        );


                    /*
                    ====================================================
                    PRODUCT AVAILABILITY
                    ====================================================
                    */

                    const productExists =
                        Boolean(
                            product
                        );


                    const productActive =
                        Boolean(
                            product &&
                            product.isActive !==
                                false
                        );


                    /*
                    ====================================================
                    INVENTORY AVAILABILITY
                    ====================================================
                    */

                    const inventoryConfigured =
                        Boolean(
                            inventory
                        );


                    const inventoryActive =
                        Boolean(
                            inventory &&
                            inventory.isActive !==
                                false
                        );


                    const availableStock =
                        inventoryConfigured &&
                        inventoryActive
                            ? Math.max(
                                Number(
                                    inventory.stock ||
                                    0
                                ),
                                0
                            )
                            : 0;


                    /*
                    ====================================================
                    CURRENT PRICE
                    ====================================================
                    */

                    let currentUnitPrice =
                        null;


                    if (
                        productExists &&
                        productActive
                    ) {

                        currentUnitPrice =
                            getUnitPrice(
                                product.pricing,
                                requestedQuantity
                            );


                        if (
                            !Number.isFinite(
                                currentUnitPrice
                            ) ||
                            currentUnitPrice <
                                0
                        ) {

                            currentUnitPrice =
                                null;

                        }

                    }


                    /*
                    ====================================================
                    FULFILLABLE QUANTITY
                    ====================================================
                    */

                    const fulfillableQuantity =
                        Math.max(
                            Math.min(
                                requestedQuantity,
                                availableStock
                            ),
                            0
                        );


                    /*
                    ====================================================
                    WARNINGS
                    ====================================================
                    */

                    const productIssue =
                        !productExists ||
                        !productActive;


                    const inventoryIssue =
                        !inventoryConfigured ||
                        !inventoryActive;


                    const stockIssue =
                        inventoryIssue ||
                        availableStock <
                            requestedQuantity;


                    const pricingIssue =
                        currentUnitPrice ===
                        null;


                    const priceChanged =
                        currentUnitPrice !==
                            null &&
                        currentUnitPrice !==
                            snapshotUnitPrice;


                    /*
                    ====================================================
                    IMPORT ELIGIBILITY
                    ====================================================

                    A row is importable only when:

                    - product still exists
                    - product is globally active
                    - inventory exists for active branch
                    - branch inventory is active
                    - at least one requested unit is in stock
                    - pricing is valid

                    Quantity shortages can still be imported at the
                    fulfillable quantity after cashier review.
                    ====================================================
                    */

                    const canImport =
                        !productIssue &&
                        !inventoryIssue &&
                        !pricingIssue &&
                        fulfillableQuantity >
                            0;


                    return {

                        productId:
                            preparedItem.product,

                        barcode:
                            productExists
                                ? product.barcode
                                : preparedItem
                                    .barcodeSnapshot,

                        name:
                            productExists
                                ? product.name
                                : preparedItem
                                    .nameSnapshot,

                        baseUnit:
                            productExists
                                ? product.baseUnit
                                : null,


                        /*
                        ================================================
                        QUANTITY
                        ================================================
                        */

                        requestedQuantity,

                        availableStock,

                        fulfillableQuantity,


                        /*
                        ================================================
                        PRICE
                        ================================================
                        */

                        snapshotUnitPrice,

                        currentUnitPrice,

                        currentSubtotal:
                            currentUnitPrice !==
                                null
                                ? currentUnitPrice *
                                    fulfillableQuantity
                                : null,


                        /*
                        ================================================
                        STATE
                        ================================================
                        */

                        productExists,

                        productActive,

                        inventoryConfigured,

                        inventoryActive,

                        productIssue,

                        inventoryIssue,

                        stockIssue,

                        pricingIssue,

                        priceChanged,

                        canImport,

                    };

                }
            );


        /*
        ========================================================
        SUMMARY
        ========================================================
        */

        const hasProductIssues =
            resolvedItems.some(
                (
                    item
                ) =>
                    item.productIssue
            );


        const hasInventoryIssues =
            resolvedItems.some(
                (
                    item
                ) =>
                    item.inventoryIssue
            );


        const hasStockIssues =
            resolvedItems.some(
                (
                    item
                ) =>
                    item.stockIssue
            );


        const hasPricingIssues =
            resolvedItems.some(
                (
                    item
                ) =>
                    item.pricingIssue
            );


        const hasPriceChanges =
            resolvedItems.some(
                (
                    item
                ) =>
                    item.priceChanged
            );


        const hasUnimportableItems =
            resolvedItems.some(
                (
                    item
                ) =>
                    !item.canImport
            );


        /*
        ========================================================
        TOTALS
        ========================================================

        Snapshot total represents what the mobile worker saw.

        Current total represents the currently fulfillable
        quantity at current pricing.
        ========================================================
        */

        const snapshotTotal =
            cart.items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.subtotalSnapshot ||
                        0
                    ),
                0
            );


        const currentTotal =
            resolvedItems.reduce(
                (
                    total,
                    item
                ) => {

                    if (
                        item.currentSubtotal ===
                        null
                    ) {

                        return total;

                    }


                    return (
                        total +
                        item.currentSubtotal
                    );

                },
                0
            );


        /*
        ========================================================
        RESPONSE
        ========================================================
        */

        return {

            cartId:
                cart._id,

            status:
                cart.status,

            branch: {

                _id:
                    branch._id,

                code:
                    branch.code,

                name:
                    branch.name,

            },

            createdBy:
                cart.createdBy,

            createdAt:
                cart.createdAt,

            expiresAt:
                cart.expiresAt,

            items:
                resolvedItems,

            snapshotTotal,

            currentTotal,

            hasProductIssues,

            hasInventoryIssues,

            hasStockIssues,

            hasPricingIssues,

            hasPriceChanges,

            hasUnimportableItems,

            canImport:
                resolvedItems.some(
                    (
                        item
                    ) =>
                        item.canImport
                ),

        };

    };


/*
============================================================
GET PREPARED CART BY ID
============================================================
*/

const getPreparedCartById =
    async (
        id
    ) => {

        const cartId =
            requireObjectId(
                id,
                "prepared cart ID"
            );


        const PreparedCart =
            await getPreparedCartModel();


        let cart =
            await PreparedCart.findById(
                cartId
            );


        if (
            !cart
        ) {

            throw new ApiError(
                404,
                "Prepared cart was not found."
            );

        }


        cart =
            await expirePreparedCartIfNeeded(
                cart
            );


        return cart;

    };


/*
============================================================
CANCEL PREPARED CART
============================================================
*/

const cancelPreparedCart =
    async ({
        cartId,
        cancelledBy,
    }) => {

        const resolvedCartId =
            requireObjectId(
                cartId,
                "prepared cart ID"
            );


        const resolvedCancelledBy =
            requireObjectId(
                cancelledBy,
                "user ID"
            );


        const PreparedCart =
            await getPreparedCartModel();


        const now =
            new Date();


        /*
        Expired carts should become EXPIRED instead of
        CANCELLED.
        */

        await PreparedCart.updateOne(
            {
                _id:
                    resolvedCartId,

                status:
                    "OPEN",

                expiresAt: {
                    $lte:
                        now,
                },
            },
            {
                $set: {

                    status:
                        "EXPIRED",

                },
            }
        );


        const cart =
            await PreparedCart
                .findOneAndUpdate(
                    {
                        _id:
                            resolvedCartId,

                        status:
                            "OPEN",

                        expiresAt: {
                            $gt:
                                now,
                        },
                    },
                    {
                        $set: {

                            status:
                                "CANCELLED",

                            cancelledAt:
                                now,

                            cancelledBy:
                                resolvedCancelledBy,

                        },
                    },
                    {
                        new:
                            true,
                    }
                );


        if (
            cart
        ) {

            return cart;

        }


        const existing =
            await PreparedCart.findById(
                resolvedCartId
            );


        if (
            !existing
        ) {

            throw new ApiError(
                404,
                "Prepared cart was not found."
            );

        }


        if (
            existing.status ===
            "EXPIRED"
        ) {

            throw new ApiError(
                410,
                "Prepared cart has expired."
            );

        }


        if (
            existing.status ===
            "CONSUMED"
        ) {

            throw new ApiError(
                409,
                "A consumed prepared cart cannot be cancelled."
            );

        }


        if (
            existing.status ===
            "CANCELLED"
        ) {

            return existing;

        }


        throw new ApiError(
            409,
            "Prepared cart could not be cancelled."
        );

    };


/*
============================================================
MARK PREPARED CART CONSUMED
============================================================

IMPORTANT:

This must be called ONLY AFTER a desktop Sale successfully
commits.

QR resolution alone must never consume the cart.
============================================================
*/

const consumePreparedCart =
    async ({
        cartId,
        consumedBy,
        saleId,
        branchId,
    }) => {

        const resolvedCartId =
            requireObjectId(
                cartId,
                "prepared cart ID"
            );


        const resolvedConsumedBy =
            requireObjectId(
                consumedBy,
                "user ID"
            );


        const resolvedSaleId =
            requireObjectId(
                saleId,
                "sale ID"
            );


        const resolvedBranchId =
            requireObjectId(
                branchId,
                "branch ID"
            );


        const PreparedCart =
            await getPreparedCartModel();


        const now =
            new Date();


        /*
        Expire first if necessary.
        */

        await PreparedCart.updateOne(
            {
                _id:
                    resolvedCartId,

                status:
                    "OPEN",

                expiresAt: {
                    $lte:
                        now,
                },
            },
            {
                $set: {

                    status:
                        "EXPIRED",

                },
            }
        );


        /*
        Atomic OPEN -> CONSUMED transition.
        */

        const cart =
            await PreparedCart
                .findOneAndUpdate(
                    {
                        _id:
                            resolvedCartId,

                        branch:
                            resolvedBranchId,

                        status:
                            "OPEN",

                        expiresAt: {
                            $gt:
                                now,
                        },
                    },
                    {
                        $set: {

                            status:
                                "CONSUMED",

                            consumedAt:
                                now,

                            consumedBy:
                                resolvedConsumedBy,

                            sale:
                                resolvedSaleId,

                        },
                    },
                    {
                        new:
                            true,
                    }
                );


        if (
            cart
        ) {

            return cart;

        }


        const existing =
            await PreparedCart.findById(
                resolvedCartId
            );


        if (
            !existing
        ) {

            throw new ApiError(
                404,
                "Prepared cart was not found."
            );

        }


        if (
            String(
                existing.branch
            ) !==
            String(
                resolvedBranchId
            )
        ) {

            throw new ApiError(
                409,
                "Prepared cart belongs to a different branch."
            );

        }


        if (
            existing.status ===
            "CONSUMED"
        ) {

            /*
            Idempotent retry.

            If the exact same Sale already consumed this cart,
            treat the operation as successful.
            */

            if (
                String(
                    existing.sale ||
                    ""
                ) ===
                String(
                    resolvedSaleId
                )
            ) {

                return existing;

            }


            throw new ApiError(
                409,
                "Prepared cart has already been consumed by another sale."
            );

        }


        if (
            existing.status ===
            "EXPIRED"
        ) {

            throw new ApiError(
                410,
                "Prepared cart has expired."
            );

        }


        if (
            existing.status ===
            "CANCELLED"
        ) {

            throw new ApiError(
                409,
                "Prepared cart has been cancelled."
            );

        }


        throw new ApiError(
            409,
            "Prepared cart could not be consumed."
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    getPreparedCartModel,

    createPreparedCart,

    findPreparedCartByToken,

    resolvePreparedCart,

    getPreparedCartById,

    cancelPreparedCart,

    consumePreparedCart,

    normalizeRawToken,

    hashToken,

    buildQrValue,

};