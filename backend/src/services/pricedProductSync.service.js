import mongoose from "mongoose";

import {
    connectPricingDatabase,
    getPricingConnection,
    isPricingConnected,
    isPricingConfigured,
} from "../config/pricingDatabase.js";

import Product
    from "../models/product.model.js";

import Branch
    from "../models/branch.model.js";

import BranchInventory
    from "../models/branchInventory.model.js";

import PricedProductSyncState
    from "../models/pricedProductSyncState.model.js";


/*
============================================================
CONFIGURATION
============================================================
*/

const SYNC_KEY =
    "pricedProductSync";

const REMOTE_COLLECTION =
    "pricedproducts";

const STALE_SYNC_LOCK_MS =
    5 * 60 * 1000;

const FAILURE_HISTORY_LIMIT =
    50;

const HEARTBEAT_EVERY =
    25;


/*
============================================================
GENERAL HELPERS
============================================================
*/

const normalizeText =
    (
        value
    ) => {

        return String(
            value ||
            ""
        ).trim();

    };


const objectIdOrNull =
    (
        value
    ) => {

        if (
            !value ||
            !mongoose.Types.ObjectId
                .isValid(
                    value
                )
        ) {

            return null;

        }


        return new mongoose.Types.ObjectId(
            value
        );

    };


const idsEqual =
    (
        left,
        right
    ) => {

        if (
            !left &&
            !right
        ) {

            return true;

        }


        if (
            !left ||
            !right
        ) {

            return false;

        }


        return String(
            left
        ) ===
        String(
            right
        );

    };


/*
============================================================
NORMALIZE PRICING
============================================================

IMPORTANT:

tier.price is the TOTAL PRICE for the tier quantity.

Example:

quantity: 6
price: 1000

means:

6 pieces = ₱1,000 total.

The sync must never divide the price by quantity before saving.
============================================================
*/

const normalizePricing =
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

            throw new Error(
                "At least one pricing tier is required."
            );

        }


        const tierMap =
            new Map();


        for (
            const tier
            of pricing
        ) {

            const quantity =
                Number(
                    tier?.quantity
                );

            const price =
                Number(
                    tier?.price
                );


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity <=
                    0
            ) {

                throw new Error(
                    "Pricing quantities must be positive whole numbers."
                );

            }


            if (
                !Number.isFinite(
                    price
                ) ||
                price <
                    0
            ) {

                throw new Error(
                    "Pricing prices cannot be negative."
                );

            }


            if (
                tierMap.has(
                    quantity
                )
            ) {

                throw new Error(
                    `Duplicate pricing quantity: ${quantity}.`
                );

            }


            tierMap.set(
                quantity,
                {
                    quantity,
                    price,
                }
            );

        }


        if (
            !tierMap.has(
                1
            )
        ) {

            throw new Error(
                "Pricing must include a quantity-1 tier."
            );

        }


        return Array
            .from(
                tierMap.values()
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.quantity -
                    b.quantity
            );

    };


const pricingEqual =
    (
        left,
        right
    ) => {

        const a =
            Array.isArray(
                left
            )
                ? left
                : [];

        const b =
            Array.isArray(
                right
            )
                ? right
                : [];


        if (
            a.length !==
            b.length
        ) {

            return false;

        }


        for (
            let index = 0;
            index < a.length;
            index += 1
        ) {

            if (
                Number(
                    a[index]?.quantity
                ) !==
                    Number(
                        b[index]?.quantity
                    ) ||
                Number(
                    a[index]?.price
                ) !==
                    Number(
                        b[index]?.price
                    )
            ) {

                return false;

            }

        }


        return true;

    };


/*
============================================================
NORMALIZE REMOTE PRICED PRODUCT
============================================================

Remote stock is intentionally ignored.

The Product Pricing application controls:

- barcode
- name
- costPrice
- baseUnit
- pricing
- isActive

StorePOS controls:

- category
- description
- minimumStock
- BranchInventory stock

A null remote costPrice is valid.
============================================================
*/

const normalizeRemoteProduct =
    (
        remote
    ) => {

        const pricingSourceId =
            objectIdOrNull(
                remote?._id
            );

        const sourceCaptureId =
            objectIdOrNull(
                remote?.sourceCaptureId
            );

        const barcode =
            normalizeText(
                remote?.barcode
            );

        const name =
            normalizeText(
                remote?.name
            );

        const baseUnit =
            normalizeText(
                remote?.baseUnit
            ) ||
            "Piece";


        if (
            !pricingSourceId
        ) {

            throw new Error(
                "Remote priced product has an invalid _id."
            );

        }


        if (
            !sourceCaptureId
        ) {

            throw new Error(
                "Remote priced product has an invalid sourceCaptureId."
            );

        }


        if (
            !barcode
        ) {

            throw new Error(
                "Barcode is required."
            );

        }


        if (
            !name
        ) {

            throw new Error(
                "Product name is required."
            );

        }


        let costPrice =
            null;


        if (
            remote?.costPrice !==
                null &&
            remote?.costPrice !==
                undefined &&
            remote?.costPrice !==
                ""
        ) {

            const numericCost =
                Number(
                    remote.costPrice
                );


            if (
                !Number.isFinite(
                    numericCost
                ) ||
                numericCost <
                    0
            ) {

                throw new Error(
                    "Cost price cannot be negative or invalid."
                );

            }


            costPrice =
                numericCost;

        }


        return {
            pricingSourceId,
            sourceCaptureId,
            barcode,
            name,
            costPrice,
            baseUnit,

            pricing:
                normalizePricing(
                    remote?.pricing
                ),

            isActive:
                remote?.isActive !==
                false,
        };

    };


/*
============================================================
SYNC STATE
============================================================
*/

const ensureSyncState =
    async () => {

        await PricedProductSyncState
            .updateOne(
                {
                    key:
                        SYNC_KEY,
                },
                {
                    $setOnInsert: {
                        key:
                            SYNC_KEY,

                        status:
                            "IDLE",
                    },
                },
                {
                    upsert:
                        true,
                }
            );


        return PricedProductSyncState
            .findOne({
                key:
                    SYNC_KEY,
            });

    };


const acquireSyncLock =
    async () => {

        await ensureSyncState();


        const now =
            new Date();

        const staleBefore =
            new Date(
                Date.now() -
                STALE_SYNC_LOCK_MS
            );


        return PricedProductSyncState
            .findOneAndUpdate(
                {
                    key:
                        SYNC_KEY,

                    $or: [
                        {
                            status: {
                                $ne:
                                    "SYNCING",
                            },
                        },
                        {
                            heartbeatAt:
                                null,
                        },
                        {
                            heartbeatAt: {
                                $lt:
                                    staleBefore,
                            },
                        },
                    ],
                },
                {
                    $set: {
                        status:
                            "SYNCING",

                        startedAt:
                            now,

                        heartbeatAt:
                            now,

                        lastError:
                            "",

                        received:
                            0,

                        created:
                            0,

                        updated:
                            0,

                        unchanged:
                            0,

                        failed:
                            0,

                        branchInventoriesCreated:
                            0,

                        failures:
                            [],
                    },
                },
                {
                    new:
                        true,
                }
            );

    };


const heartbeat =
    async () => {

        await PricedProductSyncState
            .updateOne(
                {
                    key:
                        SYNC_KEY,

                    status:
                        "SYNCING",
                },
                {
                    $set: {
                        heartbeatAt:
                            new Date(),
                    },
                }
            );

    };


/*
============================================================
FIND MATCHING LOCAL PRODUCT
============================================================

Matching identity:

1. pricingSourceId
2. sourceCaptureId
3. barcode

All matches are loaded intentionally.

If multiple local products match different remote identifiers,
the synchronization refuses to guess and reports a conflict.
============================================================
*/

const findMatchingLocalProduct =
    async (
        normalized,
        session
    ) => {

        const matches =
            await Product
                .find({
                    $or: [
                        {
                            pricingSourceId:
                                normalized
                                    .pricingSourceId,
                        },
                        {
                            sourceCaptureId:
                                normalized
                                    .sourceCaptureId,
                        },
                        {
                            barcode:
                                normalized
                                    .barcode,
                        },
                    ],
                })
                .session(
                    session
                );


        if (
            matches.length >
            1
        ) {

            throw new Error(
                "Product identity conflict: source IDs and barcode match different local products."
            );

        }


        return matches[0] ||
            null;

    };


/*
============================================================
PROVISION BRANCH INVENTORY
============================================================

Only ACTIVE branches receive missing BranchInventory records.

Existing inventory documents are never modified.

This preserves:

- stock
- minimumStock
- existing inventory state

A newly inserted BranchInventory always starts with stock 0.
============================================================
*/

const provisionBranchInventories =
    async (
        product,
        session
    ) => {

        const branches =
            await Branch
                .find({
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
            branches.length ===
            0
        ) {

            return 0;

        }


        const minimumStock =
            Math.max(
                Number(
                    product.minimumStock
                ) ||
                0,
                0
            );


        const operations =
            branches.map(
                (
                    branch
                ) => ({
                    updateOne: {

                        filter: {
                            branch:
                                branch._id,

                            product:
                                product._id,
                        },

                        update: {
                            $setOnInsert: {
                                branch:
                                    branch._id,

                                product:
                                    product._id,

                                stock:
                                    999,

                                minimumStock,

                                isActive:
                                    true,
                            },
                        },

                        upsert:
                            true,
                    },
                })
            );


        const result =
            await BranchInventory
                .bulkWrite(
                    operations,
                    {
                        session,

                        ordered:
                            false,
                    }
                );


        return Number(
            result.upsertedCount ||
            0
        );

    };


/*
============================================================
SYNC ONE PRODUCT
============================================================
*/

const syncOneProduct =
    async (
        remote
    ) => {

        const normalized =
            normalizeRemoteProduct(
                remote
            );


        const session =
            await mongoose
                .startSession();


        try {

            let result =
                null;


            await session.withTransaction(
                async () => {

                    const existing =
                        await findMatchingLocalProduct(
                            normalized,
                            session
                        );


                    /*
                    ============================================
                    CREATE NEW LOCAL PRODUCT
                    ============================================

                    category defaults to Others.

                    costPrice may be null.

                    Remote stock is NEVER imported.
                    ============================================
                    */

                    if (
                        !existing
                    ) {

                        const created =
                            await Product.create(
                                [
                                    {
                                        pricingSourceId:
                                            normalized
                                                .pricingSourceId,

                                        sourceCaptureId:
                                            normalized
                                                .sourceCaptureId,

                                        barcode:
                                            normalized
                                                .barcode,

                                        name:
                                            normalized
                                                .name,

                                        category:
                                            "Others",

                                        costPrice:
                                            normalized
                                                .costPrice,

                                        baseUnit:
                                            normalized
                                                .baseUnit,

                                        pricing:
                                            normalized
                                                .pricing,

                                        isActive:
                                            normalized
                                                .isActive,
                                    },
                                ],
                                {
                                    session,
                                }
                            );


                        const product =
                            created[0];


                        const branchInventoriesCreated =
                            await provisionBranchInventories(
                                product,
                                session
                            );


                        result = {
                            action:
                                "created",

                            branchInventoriesCreated,
                        };


                        return;

                    }


                    /*
                    ============================================
                    UPDATE / UNCHANGED
                    ============================================

                    IMPORTANT:

                    category
                    description
                    minimumStock

                    are StorePOS-owned fields and are NOT
                    overwritten here.
                    ============================================
                    */

                    const existingPricing =
                        Array.isArray(
                            existing.pricing
                        )
                            ? existing.pricing
                                .map(
                                    (
                                        tier
                                    ) => ({
                                        quantity:
                                            Number(
                                                tier.quantity
                                            ),

                                        price:
                                            Number(
                                                tier.price
                                            ),
                                    })
                                )
                                .sort(
                                    (
                                        a,
                                        b
                                    ) =>
                                        a.quantity -
                                        b.quantity
                                )
                            : [];


                    /*
                    If remote costPrice is null:

                    Existing StorePOS costPrice is preserved.

                    This prevents a remote null value from erasing
                    a cost that was later manually entered locally.
                    */

                    const shouldUpdateCost =
                        normalized.costPrice !==
                        null;


                    const changed =
                        !idsEqual(
                            existing.pricingSourceId,
                            normalized.pricingSourceId
                        ) ||
                        !idsEqual(
                            existing.sourceCaptureId,
                            normalized.sourceCaptureId
                        ) ||
                        existing.barcode !==
                            normalized.barcode ||
                        existing.name !==
                            normalized.name ||
                        existing.baseUnit !==
                            normalized.baseUnit ||
                        existing.isActive !==
                            normalized.isActive ||
                        (
                            shouldUpdateCost &&
                            Number(
                                existing.costPrice
                            ) !==
                                Number(
                                    normalized.costPrice
                                )
                        ) ||
                        !pricingEqual(
                            existingPricing,
                            normalized.pricing
                        );


                    existing.pricingSourceId =
                        normalized.pricingSourceId;

                    existing.sourceCaptureId =
                        normalized.sourceCaptureId;

                    existing.barcode =
                        normalized.barcode;

                    existing.name =
                        normalized.name;

                    existing.baseUnit =
                        normalized.baseUnit;

                    existing.pricing =
                        normalized.pricing;

                    existing.isActive =
                        normalized.isActive;


                    if (
                        shouldUpdateCost
                    ) {

                        existing.costPrice =
                            normalized.costPrice;

                    }


                    if (
                        changed
                    ) {

                        await existing.save({
                            session,
                        });

                    }


                    /*
                    Ensure missing inventories exist for active
                    branches.

                    Existing inventory quantities are never touched.
                    */

                    const branchInventoriesCreated =
                        await provisionBranchInventories(
                            existing,
                            session
                        );


                    result = {
                        action:
                            changed
                                ? "updated"
                                : "unchanged",

                        branchInventoriesCreated,
                    };

                }
            );


            return result;

        } catch (
            error
        ) {

            if (
                error?.code ===
                11000
            ) {

                throw new Error(
                    "A local uniqueness conflict was detected for this product."
                );

            }


            throw error;

        } finally {

            await session.endSession();

        }

    };


/*
============================================================
BUILD FAILURE ENTRY
============================================================
*/

const buildFailureEntry =
    (
        remote,
        error
    ) => {

        return {
            pricingSourceId:
                normalizeText(
                    remote?._id
                ),

            sourceCaptureId:
                normalizeText(
                    remote?.sourceCaptureId
                ),

            barcode:
                normalizeText(
                    remote?.barcode
                ),

            name:
                normalizeText(
                    remote?.name
                ),

            reason:
                error?.message ||
                "Unknown product synchronization error.",
        };

    };


/*
============================================================
SYNC PRICED PRODUCTS
============================================================
*/

const syncPricedProducts =
    async () => {

        const lock =
            await acquireSyncLock();


        if (
            !lock
        ) {

            return {
                success:
                    false,

                message:
                    "A priced-product synchronization is already running.",
            };

        }


        try {

            /*
            ====================================================
            CONNECT TO PRICING DATABASE
            ====================================================
            */

            const connection =
                await connectPricingDatabase();


            const database =
                connection.db;


            if (
                !database
            ) {

                throw new Error(
                    "Pricing database handle is unavailable."
                );

            }


            /*
            ====================================================
            LOAD REMOTE PRODUCTS
            ====================================================

            stock is intentionally NOT selected.
            category is intentionally NOT selected.

            Category is managed by StorePOS.
            ====================================================
            */

            const remoteProducts =
                await database
                    .collection(
                        REMOTE_COLLECTION
                    )
                    .find(
                        {}
                    )
                    .project({
                        _id:
                            1,

                        sourceCaptureId:
                            1,

                        barcode:
                            1,

                        name:
                            1,

                        costPrice:
                            1,

                        baseUnit:
                            1,

                        pricing:
                            1,

                        isActive:
                            1,

                        updatedAt:
                            1,
                    })
                    .sort({
                        _id:
                            1,
                    })
                    .toArray();


            /*
            ====================================================
            SUMMARY
            ====================================================
            */

            const summary = {
                success:
                    true,

                sourceDatabase:
                    connection.name ||
                    "",

                received:
                    remoteProducts.length,

                created:
                    0,

                updated:
                    0,

                unchanged:
                    0,

                failed:
                    0,

                branchInventoriesCreated:
                    0,

                failures:
                    [],
            };


            /*
            ====================================================
            PROCESS PRODUCTS
            ====================================================
            */

            for (
                let index = 0;
                index < remoteProducts.length;
                index += 1
            ) {

                const remote =
                    remoteProducts[
                        index
                    ];


                try {

                    const result =
                        await syncOneProduct(
                            remote
                        );


                    if (
                        result?.action ===
                        "created"
                    ) {

                        summary.created +=
                            1;

                    } else if (
                        result?.action ===
                        "updated"
                    ) {

                        summary.updated +=
                            1;

                    } else {

                        summary.unchanged +=
                            1;

                    }


                    summary.branchInventoriesCreated +=
                        Number(
                            result
                                ?.branchInventoriesCreated ||
                            0
                        );


                } catch (
                    error
                ) {

                    summary.failed +=
                        1;


                    if (
                        summary.failures.length <
                        FAILURE_HISTORY_LIMIT
                    ) {

                        summary.failures.push(
                            buildFailureEntry(
                                remote,
                                error
                            )
                        );

                    }


                    console.error(
                        "🏷️ Priced product sync item failed:",
                        {
                            barcode:
                                remote?.barcode,

                            name:
                                remote?.name,

                            error:
                                error?.message,
                        }
                    );

                }


                if (
                    (
                        index +
                        1
                    ) %
                        HEARTBEAT_EVERY ===
                    0
                ) {

                    await heartbeat();

                }

            }


            /*
            ====================================================
            SAVE SUCCESS / PARTIAL RESULT
            ====================================================
            */

            const completedAt =
                new Date();


            const finalStatus =
                summary.failed >
                0
                    ? "PARTIAL"
                    : "SUCCESS";


            await PricedProductSyncState
                .updateOne(
                    {
                        key:
                            SYNC_KEY,
                    },
                    {
                        $set: {
                            status:
                                finalStatus,

                            heartbeatAt:
                                completedAt,

                            lastCompletedAt:
                                completedAt,

                            ...(
                                finalStatus ===
                                "SUCCESS"
                                    ? {
                                        lastSuccessAt:
                                            completedAt,
                                    }
                                    : {}
                            ),

                            lastError:
                                summary.failed >
                                0
                                    ? `${summary.failed} priced product(s) could not be synchronized.`
                                    : "",

                            sourceDatabase:
                                summary.sourceDatabase,

                            received:
                                summary.received,

                            created:
                                summary.created,

                            updated:
                                summary.updated,

                            unchanged:
                                summary.unchanged,

                            failed:
                                summary.failed,

                            branchInventoriesCreated:
                                summary.branchInventoriesCreated,

                            failures:
                                summary.failures,
                        },
                    }
                );


            return {
                ...summary,

                status:
                    finalStatus,

                completedAt,
            };


        } catch (
            error
        ) {

            /*
            ====================================================
            SAVE COMPLETE SYNC FAILURE
            ====================================================
            */

            const failedAt =
                new Date();


            await PricedProductSyncState
                .updateOne(
                    {
                        key:
                            SYNC_KEY,
                    },
                    {
                        $set: {
                            status:
                                "FAILED",

                            heartbeatAt:
                                failedAt,

                            lastCompletedAt:
                                failedAt,

                            lastError:
                                error?.message ||
                                "Priced-product synchronization failed.",
                        },
                    }
                )
                .catch(
                    (
                        stateError
                    ) => {

                        console.error(
                            "Unable to save priced-product sync failure state:",
                            stateError
                        );

                    }
                );


            throw error;

        }

    };


/*
============================================================
GET STATUS
============================================================
*/

const getPricedProductSyncStatus =
    async () => {

        const state =
            await ensureSyncState();


        let status =
            state.status;

        let lastError =
            state.lastError;


        /*
        ========================================================
        STALE LOCK RECOVERY
        ========================================================
        */

        if (
            status ===
            "SYNCING"
        ) {

            const heartbeatTime =
                state.heartbeatAt
                    ? new Date(
                        state.heartbeatAt
                    ).getTime()
                    : 0;


            const stale =
                !heartbeatTime ||
                Date.now() -
                    heartbeatTime >=
                    STALE_SYNC_LOCK_MS;


            if (
                stale
            ) {

                status =
                    "FAILED";


                lastError =
                    "Previous priced-product sync was interrupted and its stale lock was recovered.";


                await PricedProductSyncState
                    .updateOne(
                        {
                            key:
                                SYNC_KEY,
                        },
                        {
                            $set: {
                                status,
                                lastError,
                            },
                        }
                    );

            }

        }


        /*
        ========================================================
        RETURN STATUS
        ========================================================
        */

        return {
            status,

            sourceConfigured:
                isPricingConfigured(),

            sourceConnected:
                isPricingConnected(),

            sourceDatabase:
                state.sourceDatabase ||
                getPricingConnection()?.name ||
                "",

            startedAt:
                state.startedAt,

            lastCompletedAt:
                state.lastCompletedAt,

            lastSuccessAt:
                state.lastSuccessAt,

            lastError,

            received:
                state.received ||
                0,

            created:
                state.created ||
                0,

            updated:
                state.updated ||
                0,

            unchanged:
                state.unchanged ||
                0,

            failed:
                state.failed ||
                0,

            branchInventoriesCreated:
                state.branchInventoriesCreated ||
                0,

            failures:
                Array.isArray(
                    state.failures
                )
                    ? state.failures
                    : [],

            remoteCollection:
                REMOTE_COLLECTION,

            inventoryPolicy:
                "PRESERVE_BRANCH_INVENTORY",
        };

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    syncPricedProducts,

    getPricedProductSyncStatus,

};