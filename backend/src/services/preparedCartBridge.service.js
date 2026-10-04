import crypto from "node:crypto";

import mongoose from "mongoose";

import Product
    from "../models/product.model.js";

import BranchInventory
    from "../models/branchInventory.model.js";

import SyncOutbox
    from "../models/syncOutbox.model.js";

import {
    connectCloudDatabase,
    getCloudConnection,
    isCloudConnected,
} from "../config/cloudDatabase.js";

import ApiError
    from "../utils/ApiError.js";

import {
    calculateSubtotal,
} from "../utils/pricing.js";


/*
============================================================
CONFIGURATION
============================================================
*/

const QR_PREFIX =
    "POSCART:";


const CLAIM_DURATION_MINUTES =
    5;


/*
============================================================
CLOUD MODEL
============================================================

PreparedCart remains CLOUD-OWNED.

It must never be added to the normal local -> cloud
collection synchronization registry.
============================================================
*/

let CloudPreparedCart =
    null;


/*
============================================================
PREPARED CART ITEM SCHEMA
============================================================
*/

const preparedCartItemSchema =
    new mongoose.Schema(
        {

            product: {

                type:
                    mongoose.Schema.Types.ObjectId,

            },

            barcode: {

                type:
                    String,

            },

            name: {

                type:
                    String,

            },

            baseUnit: {

                type:
                    String,

            },

            quantity: {

                type:
                    Number,

            },

            selectedUnitPrice: {

                type:
                    Number,

            },

            pricingSnapshot: {

                type:
                    Array,

                default:
                    [],

            },

            stockSnapshot: {

                type:
                    Number,

            },

            lineTotalSnapshot: {

                type:
                    Number,

            },

        },
        {

            _id:
                false,

            strict:
                false,

        }
    );


/*
============================================================
PREPARED CART SCHEMA
============================================================
*/

const preparedCartSchema =
    new mongoose.Schema(
        {

            branch: {

                type:
                    mongoose.Schema.Types.ObjectId,

                index:
                    true,

            },

            createdBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

            },

            items: {

                type: [
                    preparedCartItemSchema,
                ],

                default:
                    [],

            },

            itemCount: {

                type:
                    Number,

            },

            totalQuantity: {

                type:
                    Number,

            },

            totalSnapshot: {

                type:
                    Number,

            },

            tokenHash: {

                type:
                    String,

                index:
                    true,

            },

            status: {

                type:
                    String,

                index:
                    true,

            },

            expiresAt: {

                type:
                    Date,

                index:
                    true,

            },

            claimTokenHash: {

                type:
                    String,

                default:
                    null,

            },

            claimedAt: {

                type:
                    Date,

                default:
                    null,

            },

            claimExpiresAt: {

                type:
                    Date,

                default:
                    null,

            },

            claimedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

            },

            consumedAt: {

                type:
                    Date,

                default:
                    null,

            },

            consumedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

            },

            saleId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default:
                    null,

            },

            cancelledAt: {

                type:
                    Date,

                default:
                    null,

            },

        },
        {

            timestamps:
                true,

            strict:
                false,

        }
    );


/*
============================================================
GET CLOUD MODEL
============================================================
*/

const getCloudPreparedCartModel =
    async () => {

        if (
            !isCloudConnected()
        ) {

            await connectCloudDatabase();

        }


        const cloudConnection =
            getCloudConnection();


        if (
            !cloudConnection
        ) {

            throw new ApiError(
                503,
                "Cloud connection is unavailable."
            );

        }


        if (
            CloudPreparedCart
        ) {

            return CloudPreparedCart;

        }


        CloudPreparedCart =
            cloudConnection.models.PreparedCart ||
            cloudConnection.model(
                "PreparedCart",
                preparedCartSchema,
                "preparedcarts"
            );


        return CloudPreparedCart;

    };


/*
============================================================
HASH TOKEN
============================================================
*/

const hashToken =
    (
        token
    ) => {

        return crypto
            .createHash(
                "sha256"
            )
            .update(
                String(
                    token
                )
            )
            .digest(
                "hex"
            );

    };


/*
============================================================
GENERATE CLAIM TOKEN
============================================================
*/

const generateClaimToken =
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
PARSE QR PAYLOAD
============================================================
*/

const parseQrPayload =
    (
        value
    ) => {

        const input =
            String(
                value ||
                ""
            ).trim();


        if (
            !input
        ) {

            throw new ApiError(
                400,
                "Prepared cart QR value is required."
            );

        }


        if (
            !input.startsWith(
                QR_PREFIX
            )
        ) {

            throw new ApiError(
                400,
                "Invalid prepared cart QR code."
            );

        }


        const token =
            input
                .slice(
                    QR_PREFIX.length
                )
                .trim();


        if (
            !token
        ) {

            throw new ApiError(
                400,
                "Prepared cart token is missing."
            );

        }


        if (
            token.length <
                40 ||
            token.length >
                100 ||
            !/^[A-Za-z0-9_-]+$/
                .test(
                    token
                )
        ) {

            throw new ApiError(
                400,
                "Invalid prepared cart token."
            );

        }


        return token;

    };


/*
============================================================
MONEY CHANGED
============================================================
*/

const moneyChanged =
    (
        first,
        second
    ) => {

        return (
            Math.abs(
                (
                    Number(
                        first
                    ) || 0
                ) -
                (
                    Number(
                        second
                    ) || 0
                )
            ) >=
            0.005
        );

    };


/*
============================================================
CHECK LOCAL SALE FINALIZATION
============================================================

CRITICAL RECOVERY SAFETY.

If the local Sale transaction already committed, the same
transaction also committed PREPARED_CART / FINALIZE.

Even if Atlas still says CLAIMED because the internet is
offline, that cart MUST NOT be rebuilt after browser refresh.
============================================================
*/

const hasLocalFinalizeCommand =
    async (
        preparedCartId,
        branchId
    ) => {

        const existing =
            await SyncOutbox
                .findOne({

                    type:
                        "CLOUD_COMMAND",

                    source:
                        "PREPARED_CART",

                    action:
                        "FINALIZE",

                    aggregateId:
                        preparedCartId,

                    branch:
                        branchId,

                })
                .select(
                    "_id eventId status commandPayload.saleId"
                )
                .lean();


        return Boolean(
            existing
        );

    };


/*
============================================================
MARK OPEN CART EXPIRED
============================================================
*/

const expireOpenCart =
    async (
        PreparedCart,
        tokenHash,
        branchId,
        now
    ) => {

        await PreparedCart.updateOne(
            {

                tokenHash,

                branch:
                    branchId,

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

    };


/*
============================================================
BUILD BRIDGE RESPONSE
============================================================
*/

const buildBridgeResponse =
    (
        claimedCart,
        claimToken,
        revalidated,
        {
            recovered = false,
        } = {}
    ) => {

        return {

            preparedCartId:
                claimedCart._id,

            status:
                claimedCart.status,

            claimToken,

            claimExpiresAt:
                claimedCart.claimExpiresAt,

            preparedAt:
                claimedCart.createdAt,

            preparedBy:
                claimedCart.createdBy,

            snapshotTotal:
                Number(
                    claimedCart.totalSnapshot ||
                    0
                ),

            currentTotal:
                revalidated.currentTotal,

            hasChanges:
                revalidated.hasChanges,

            warnings:
                revalidated.warnings,

            items:
                revalidated.items,

            recovered:
                Boolean(
                    recovered
                ),

        };

    };


/*
============================================================
CLAIM PREPARED CART
============================================================
*/

const claimPreparedCart =
    async ({
        qrPayload,
        branchId,
        userId,
    }) => {

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    branchId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid active branch."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    userId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid authenticated user."
            );

        }


        const token =
            parseQrPayload(
                qrPayload
            );


        const tokenHash =
            hashToken(
                token
            );


        const PreparedCart =
            await getCloudPreparedCartModel();


        const now =
            new Date();


        await expireOpenCart(
            PreparedCart,
            tokenHash,
            branchId,
            now
        );


        const rawClaimToken =
            generateClaimToken();


        const claimTokenHash =
            hashToken(
                rawClaimToken
            );


        const claimExpiresAt =
            new Date(
                now.getTime() +
                CLAIM_DURATION_MINUTES *
                60 *
                1000
            );


        const claimedCart =
            await PreparedCart
                .findOneAndUpdate(
                    {

                        tokenHash,

                        branch:
                            branchId,

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
                                "CLAIMED",

                            claimTokenHash,

                            claimedAt:
                                now,

                            claimExpiresAt,

                            claimedBy:
                                userId,

                        },

                    },
                    {

                        new:
                            true,

                        runValidators:
                            true,

                    }
                )
                .lean();


        if (
            !claimedCart
        ) {

            const existing =
                await PreparedCart
                    .findOne({
                        tokenHash,
                    })
                    .select(
                        `
                            branch
                            status
                            expiresAt
                            claimExpiresAt
                            claimedBy
                            saleId
                        `
                    )
                    .lean();


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
                    branchId
                )
            ) {

                throw new ApiError(
                    403,
                    "This prepared cart belongs to a different branch."
                );

            }


            if (
                existing.status ===
                "CANCELLED"
            ) {

                throw new ApiError(
                    409,
                    "This prepared cart was cancelled."
                );

            }


            if (
                existing.status ===
                "CONSUMED"
            ) {

                throw new ApiError(
                    409,
                    "This prepared cart has already been completed."
                );

            }


            if (
                existing.status ===
                    "EXPIRED" ||
                (
                    existing.expiresAt &&
                    new Date(
                        existing.expiresAt
                    ).getTime() <=
                        now.getTime()
                )
            ) {

                throw new ApiError(
                    410,
                    "This prepared cart has expired."
                );

            }


            if (
                existing.status ===
                "CLAIMED"
            ) {

                throw new ApiError(
                    409,
                    "This prepared cart is already claimed. If this browser was refreshed, the existing claim will be recovered automatically."
                );

            }


            throw new ApiError(
                409,
                "Prepared cart could not be claimed."
            );

        }


        try {

            const revalidated =
                await revalidateClaimedCart(
                    claimedCart,
                    branchId
                );


            return buildBridgeResponse(
                claimedCart,
                rawClaimToken,
                revalidated
            );


        } catch (
            error
        ) {

            try {

                await PreparedCart.updateOne(
                    {

                        _id:
                            claimedCart._id,

                        branch:
                            branchId,

                        status:
                            "CLAIMED",

                        claimedBy:
                            userId,

                        claimTokenHash,

                    },
                    {

                        $set: {

                            status:
                                "OPEN",

                            claimTokenHash:
                                null,

                            claimedAt:
                                null,

                            claimExpiresAt:
                                null,

                            claimedBy:
                                null,

                        },

                    }
                );


            } catch (
                releaseError
            ) {

                console.error(
                    "Unable to release PreparedCart after validation failure:",
                    releaseError
                );

            }


            throw error;

        }

    };


/*
============================================================
RECOVER PREPARED CART
============================================================

Recovery does NOT claim again.

Required proof:

- same PreparedCart ID
- same branch
- same cashier
- status still CLAIMED
- SHA256(raw claim token) matches Atlas

And critically:

- no local PREPARED_CART / FINALIZE outbox command exists

If such an outbox command exists, a local sale already
committed and recovery is rejected.
============================================================
*/

const recoverPreparedCart =
    async ({
        preparedCartId,
        claimToken,
        branchId,
        userId,
    }) => {

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    preparedCartId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid prepared cart ID."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    branchId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid active branch."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    userId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid authenticated user."
            );

        }


        const rawClaimToken =
            String(
                claimToken ||
                ""
            ).trim();


        if (
            !rawClaimToken
        ) {

            throw new ApiError(
                400,
                "Claim token is required."
            );

        }


        /*
        ========================================================
        LOCAL SALE COMMIT CHECK
        ========================================================
        */

        const alreadyCommittedLocally =
            await hasLocalFinalizeCommand(
                preparedCartId,
                branchId
            );


        if (
            alreadyCommittedLocally
        ) {

            throw new ApiError(
                409,
                "This mobile order has already been completed locally and cannot be recovered into the cart."
            );

        }


        const PreparedCart =
            await getCloudPreparedCartModel();


        const claimTokenHash =
            hashToken(
                rawClaimToken
            );


        const claimedCart =
            await PreparedCart
                .findOne({

                    _id:
                        preparedCartId,

                    branch:
                        branchId,

                })
                .select(
                    `
                        branch
                        createdBy
                        items
                        itemCount
                        totalQuantity
                        totalSnapshot
                        status
                        expiresAt
                        claimTokenHash
                        claimedAt
                        claimExpiresAt
                        claimedBy
                        consumedAt
                        consumedBy
                        saleId
                        createdAt
                        updatedAt
                    `
                )
                .lean();


        if (
            !claimedCart
        ) {

            throw new ApiError(
                404,
                "Prepared cart was not found."
            );

        }


        if (
            claimedCart.status ===
            "CONSUMED"
        ) {

            throw new ApiError(
                409,
                "This mobile order has already been completed."
            );

        }


        if (
            claimedCart.status ===
            "CANCELLED"
        ) {

            throw new ApiError(
                409,
                "This mobile order was cancelled."
            );

        }


        if (
            claimedCart.status ===
            "EXPIRED"
        ) {

            throw new ApiError(
                410,
                "This mobile order has expired."
            );

        }


        if (
            claimedCart.status !==
            "CLAIMED"
        ) {

            throw new ApiError(
                409,
                `Prepared cart cannot be recovered from status ${claimedCart.status}.`
            );

        }


        if (
            String(
                claimedCart.claimedBy
            ) !==
            String(
                userId
            )
        ) {

            throw new ApiError(
                409,
                "This prepared cart claim belongs to a different cashier."
            );

        }


        if (
            claimedCart.claimTokenHash !==
            claimTokenHash
        ) {

            throw new ApiError(
                409,
                "Prepared cart recovery credentials no longer match the active claim."
            );

        }


        /*
        Do not reject because claimExpiresAt has passed.

        This is recovery by the SAME claim owner, not a new
        acquisition.

        The raw claim token proves possession.
        */


        const revalidated =
            await revalidateClaimedCart(
                claimedCart,
                branchId
            );


        return buildBridgeResponse(
            claimedCart,
            rawClaimToken,
            revalidated,
            {
                recovered:
                    true,
            }
        );

    };


/*
============================================================
REVALIDATE CLAIMED CART
============================================================
*/

const revalidateClaimedCart =
    async (
        claimedCart,
        branchId
    ) => {

        const cloudItems =
            Array.isArray(
                claimedCart.items
            )
                ? claimedCart.items
                : [];


        if (
            cloudItems.length ===
            0
        ) {

            throw new ApiError(
                409,
                "Prepared cart contains no items."
            );

        }


        const productIds =
            cloudItems
                .map(
                    (
                        item
                    ) =>
                        item.product
                )
                .filter(
                    (
                        id
                    ) =>
                        mongoose.Types.ObjectId
                            .isValid(
                                id
                            )
                );


        if (
            productIds.length !==
            cloudItems.length
        ) {

            throw new ApiError(
                409,
                "Prepared cart contains invalid product references."
            );

        }


        const products =
            await Product
                .find({

                    _id: {
                        $in:
                            productIds,
                    },

                })
                .select(
                    `
                        _id
                        barcode
                        name
                        baseUnit
                        pricing
                        isActive
                    `
                )
                .lean();


        const productMap =
            new Map();


        for (
            const product
            of products
        ) {

            productMap.set(
                String(
                    product._id
                ),
                product
            );

        }


        const inventories =
            await BranchInventory
                .find({

                    branch:
                        branchId,

                    product: {
                        $in:
                            productIds,
                    },

                })
                .select(
                    `
                        _id
                        branch
                        product
                        stock
                        minimumStock
                        isActive
                    `
                )
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


        const resultItems =
            [];


        const warnings =
            [];


        let currentTotal =
            0;


        let hasChanges =
            false;


        for (
            const cloudItem
            of cloudItems
        ) {

            const key =
                String(
                    cloudItem.product
                );


            const product =
                productMap.get(
                    key
                );


            if (
                !product
            ) {

                throw new ApiError(
                    409,
                    `${cloudItem.name || "A product"} no longer exists in the local POS catalog.`
                );

            }


            if (
                product.isActive ===
                false
            ) {

                throw new ApiError(
                    409,
                    `${product.name} is currently disabled.`
                );

            }


            const inventory =
                inventoryMap.get(
                    key
                );


            if (
                !inventory ||
                inventory.isActive ===
                    false
            ) {

                throw new ApiError(
                    409,
                    `${product.name} is not active in this branch.`
                );

            }


            const requestedQuantity =
                Number(
                    cloudItem.quantity
                );


            if (
                !Number.isSafeInteger(
                    requestedQuantity
                ) ||
                requestedQuantity <=
                    0
            ) {

                throw new ApiError(
                    409,
                    `${product.name} has an invalid prepared quantity.`
                );

            }


            const currentStock =
                Math.max(
                    Number(
                        inventory.stock
                    ) || 0,
                    0
                );


            if (
                currentStock <
                requestedQuantity
            ) {

                throw new ApiError(
                    409,
                    `Insufficient current stock for ${product.name}. Requested: ${requestedQuantity}. Available: ${currentStock}.`
                );

            }


            const currentLineTotal =
                Number(
                    calculateSubtotal(
                        product.pricing,
                        requestedQuantity
                    )
                );


            if (
                !Number.isFinite(
                    currentLineTotal
                ) ||
                currentLineTotal <
                    0
            ) {

                throw new ApiError(
                    409,
                    `${product.name} does not currently have valid pricing.`
                );

            }


            const roundedLineTotal =
                Number(
                    currentLineTotal.toFixed(
                        2
                    )
                );


            const currentUnitPrice =
                Number(
                    (
                        roundedLineTotal /
                        requestedQuantity
                    ).toFixed(
                        6
                    )
                );


            const snapshotUnitPrice =
                Number(
                    cloudItem.selectedUnitPrice ||
                    0
                );


            const snapshotLineTotal =
                Number(
                    cloudItem.lineTotalSnapshot ||
                    0
                );


            const priceChanged =

                moneyChanged(
                    currentUnitPrice,
                    snapshotUnitPrice
                ) ||

                moneyChanged(
                    roundedLineTotal,
                    snapshotLineTotal
                );


            if (
                priceChanged
            ) {

                hasChanges =
                    true;


                warnings.push(
                    `${product.name} price changed. Prepared total: ${snapshotLineTotal.toFixed(
                        2
                    )}. Current total: ${roundedLineTotal.toFixed(
                        2
                    )}.`
                );

            }


            const oldStock =
                Number(
                    cloudItem.stockSnapshot ||
                    0
                );


            if (
                oldStock !==
                currentStock
            ) {

                hasChanges =
                    true;


                warnings.push(
                    `${product.name} stock changed from ${oldStock} to ${currentStock}.`
                );

            }


            currentTotal +=
                roundedLineTotal;


            resultItems.push({

                productId:
                    product._id,

                barcode:
                    product.barcode,

                name:
                    product.name,

                baseUnit:
                    product.baseUnit ||
                    "Piece",

                quantity:
                    requestedQuantity,

                unitPrice:
                    currentUnitPrice,

                lineTotal:
                    roundedLineTotal,

                availableStock:
                    currentStock,

                /*
                Keep current pricing in desktop cart state so
                quantity edits can still reprice correctly.
                */

                pricing:
                    Array.isArray(
                        product.pricing
                    )
                        ? product.pricing
                        : [],

                originalUnitPrice:
                    snapshotUnitPrice,

                originalLineTotal:
                    snapshotLineTotal,

                priceChanged,

            });

        }


        return {

            items:
                resultItems,

            currentTotal:
                Number(
                    currentTotal.toFixed(
                        2
                    )
                ),

            hasChanges,

            warnings,

        };

    };


/*
============================================================
RELEASE CLAIM
============================================================
*/

const releasePreparedCart =
    async ({
        preparedCartId,
        claimToken,
        branchId,
        userId,
    }) => {

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    preparedCartId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid prepared cart ID."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    branchId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid active branch."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    userId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid authenticated user."
            );

        }


        const rawClaimToken =
            String(
                claimToken ||
                ""
            ).trim();


        if (
            !rawClaimToken
        ) {

            throw new ApiError(
                400,
                "Claim token is required."
            );

        }


        /*
        A locally committed sale must never have its cloud
        claim reopened.
        */

        const alreadyCommittedLocally =
            await hasLocalFinalizeCommand(
                preparedCartId,
                branchId
            );


        if (
            alreadyCommittedLocally
        ) {

            throw new ApiError(
                409,
                "This mobile order has already been completed locally and its claim cannot be released."
            );

        }


        const PreparedCart =
            await getCloudPreparedCartModel();


        const claimTokenHash =
            hashToken(
                rawClaimToken
            );


        const released =
            await PreparedCart
                .findOneAndUpdate(
                    {

                        _id:
                            preparedCartId,

                        branch:
                            branchId,

                        status:
                            "CLAIMED",

                        claimedBy:
                            userId,

                        claimTokenHash,

                    },
                    {

                        $set: {

                            status:
                                "OPEN",

                            claimTokenHash:
                                null,

                            claimedAt:
                                null,

                            claimExpiresAt:
                                null,

                            claimedBy:
                                null,

                        },

                    },
                    {

                        new:
                            true,

                        runValidators:
                            true,

                    }
                )
                .select(
                    "_id status expiresAt"
                )
                .lean();


        if (
            !released
        ) {

            throw new ApiError(
                409,
                "Prepared cart claim could not be released."
            );

        }


        return released;

    };


/*
============================================================
FINALIZE PREPARED CART
============================================================
*/

const finalizePreparedCart =
    async ({
        preparedCartId,
        claimToken,
        saleId,
        branchId,
        userId,
    }) => {

        const terminalError =
            (
                message
            ) => {

                const error =
                    new Error(
                        message
                    );


                error.retryable =
                    false;


                return error;

            };


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    preparedCartId
                )
        ) {

            throw terminalError(
                "Invalid prepared cart ID."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    saleId
                )
        ) {

            throw terminalError(
                "Invalid sale ID."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    branchId
                )
        ) {

            throw terminalError(
                "Invalid prepared cart branch."
            );

        }


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    userId
                )
        ) {

            throw terminalError(
                "Invalid prepared cart cashier."
            );

        }


        const rawClaimToken =
            String(
                claimToken ||
                ""
            ).trim();


        if (
            !rawClaimToken
        ) {

            throw terminalError(
                "Prepared cart claim token is missing."
            );

        }


        const PreparedCart =
            await getCloudPreparedCartModel();


        const claimTokenHash =
            hashToken(
                rawClaimToken
            );


        const existing =
            await PreparedCart
                .findById(
                    preparedCartId
                )
                .select(
                    `
                        _id
                        branch
                        status
                        claimedBy
                        claimTokenHash
                        saleId
                        consumedAt
                        consumedBy
                    `
                )
                .lean();


        if (
            !existing
        ) {

            throw terminalError(
                "Prepared cart no longer exists in the cloud database."
            );

        }


        if (
            String(
                existing.branch
            ) !==
            String(
                branchId
            )
        ) {

            throw terminalError(
                "Prepared cart branch does not match the completed sale."
            );

        }


        if (
            existing.status ===
                "CONSUMED" &&
            String(
                existing.saleId
            ) ===
                String(
                    saleId
                )
        ) {

            return {

                preparedCartId:
                    existing._id,

                saleId:
                    existing.saleId,

                status:
                    "CONSUMED",

                idempotent:
                    true,

            };

        }


        if (
            existing.status ===
            "CONSUMED"
        ) {

            throw terminalError(
                "Prepared cart was already consumed by a different sale."
            );

        }


        if (
            existing.status !==
            "CLAIMED"
        ) {

            throw terminalError(
                `Prepared cart cannot be finalized from status ${existing.status}.`
            );

        }


        if (
            String(
                existing.claimedBy
            ) !==
            String(
                userId
            )
        ) {

            throw terminalError(
                "Prepared cart claim belongs to a different cashier."
            );

        }


        if (
            existing.claimTokenHash !==
            claimTokenHash
        ) {

            throw terminalError(
                "Prepared cart claim token no longer matches."
            );

        }


        const now =
            new Date();


        const consumed =
            await PreparedCart
                .findOneAndUpdate(
                    {

                        _id:
                            preparedCartId,

                        branch:
                            branchId,

                        status:
                            "CLAIMED",

                        claimedBy:
                            userId,

                        claimTokenHash,

                    },
                    {

                        $set: {

                            status:
                                "CONSUMED",

                            consumedAt:
                                now,

                            consumedBy:
                                userId,

                            saleId,

                            claimTokenHash:
                                null,

                            claimExpiresAt:
                                null,

                        },

                    },
                    {

                        new:
                            true,

                        runValidators:
                            true,

                    }
                )
                .select(
                    `
                        _id
                        status
                        saleId
                        consumedAt
                    `
                )
                .lean();


        if (
            consumed
        ) {

            return {

                preparedCartId:
                    consumed._id,

                saleId:
                    consumed.saleId,

                status:
                    consumed.status,

                consumedAt:
                    consumed.consumedAt,

                idempotent:
                    false,

            };

        }


        const afterRace =
            await PreparedCart
                .findById(
                    preparedCartId
                )
                .select(
                    "_id status saleId"
                )
                .lean();


        if (
            afterRace?.status ===
                "CONSUMED" &&
            String(
                afterRace.saleId
            ) ===
                String(
                    saleId
                )
        ) {

            return {

                preparedCartId:
                    afterRace._id,

                saleId:
                    afterRace.saleId,

                status:
                    "CONSUMED",

                idempotent:
                    true,

            };

        }


        throw terminalError(
            "Prepared cart changed before finalization could complete."
        );

    };


export default {

    claimPreparedCart,

    recoverPreparedCart,

    releasePreparedCart,

    finalizePreparedCart,

};