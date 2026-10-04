import {
    getCloudConnection,
    isCloudConnected,
    connectCloudDatabase,
} from "../config/cloudDatabase.js";

import SyncState
    from "../models/syncState.model.js";

import Branch
    from "../models/branch.model.js";

import BranchInventory
    from "../models/branchInventory.model.js";

import Product
    from "../models/product.model.js";

import Sale
    from "../models/sale.model.js";

import SaleItem
    from "../models/saleItem.model.js";

import User
    from "../models/user.model.js";

import Counter
    from "../models/counter.model.js";

import Customer
    from "../models/customer.model.js";

import CustomerCounter
    from "../models/customerCounter.model.js";

import LoyaltyTransaction
    from "../models/loyaltyTransaction.model.js";

import InventoryMovement
    from "../models/inventoryMovement.model.js";

import InventoryTransaction
    from "../models/inventoryTransaction.model.js";

import LedgerAccount
    from "../models/ledgerAccount.model.js";

import LedgerTransaction
    from "../models/ledgerTransaction.model.js";

import WorkerLedger
    from "../models/workerLedger.model.js";

import WorkerAttendance
    from "../models/workerAttendance.model.js";

import StockTransfer
    from "../models/stockTransfer.model.js";

import BulkOrder
    from "../models/bulkOrder.model.js";


/*
============================================================
SYNC CONFIG
============================================================
*/

const SYNC_KEY =
    "cloudSync";


/*
============================================================
STALE LOCK TIMEOUT
============================================================

If StorePOS crashes while status is SYNCING, the database
can retain that value.

After this amount of time we consider the old SYNCING state
abandoned and allow synchronization to recover.

Five minutes is intentionally much longer than the normal
live-sync interval.
============================================================
*/

const STALE_SYNC_LOCK_MS =
    5 * 60 * 1000;


/*
============================================================
COLLECTION REGISTRY
============================================================

LOCAL DATABASE
        ↓
CLOUD DATABASE

Cloud remains a one-way mirror.

The local StorePOS database is authoritative.

syncMode:

incremental
    Uses updatedAt.

full
    Synchronizes the complete collection every run.

Counter requires full mode because it intentionally has no
updatedAt field.
============================================================
*/

const SYNC_COLLECTIONS = [

    {
        key:
            "branches",

        model:
            Branch,

        modelName:
            "Branch",

        syncMode:
            "incremental",
    },


    {
        key:
            "products",

        model:
            Product,

        modelName:
            "Product",

        syncMode:
            "incremental",
    },


    {
        key:
            "users",

        model:
            User,

        modelName:
            "User",

        syncMode:
            "incremental",
    },


    /*
    Counter must be backed up because it contains sequences
    such as receipt numbers and product barcode sequences.

    Counter does not have timestamps, so the entire tiny
    collection is copied every synchronization.
    */

    {
        key:
            "counters",

        model:
            Counter,

        modelName:
            "Counter",

        syncMode:
            "full",
    },


    {
        key:
            "customerCounters",

        model:
            CustomerCounter,

        modelName:
            "CustomerCounter",

        syncMode:
            "incremental",
    },


    /*
    Customers can reference LedgerAccount, so accounts are
    uploaded first.
    */

    {
        key:
            "ledgerAccounts",

        model:
            LedgerAccount,

        modelName:
            "LedgerAccount",

        syncMode:
            "incremental",
    },


    {
        key:
            "customers",

        model:
            Customer,

        modelName:
            "Customer",

        syncMode:
            "incremental",
    },


    /*
    BranchInventory is the authoritative stock source.

    Product.stock remains legacy compatibility data only.
    */

    {
        key:
            "branchInventories",

        model:
            BranchInventory,

        modelName:
            "BranchInventory",

        syncMode:
            "incremental",
    },


    {
        key:
            "sales",

        model:
            Sale,

        modelName:
            "Sale",

        syncMode:
            "incremental",
    },


    /*
    SaleItem remains included because it is still a real
    persisted model even though Sale may also contain
    embedded item information.
    */

    {
        key:
            "saleItems",

        model:
            SaleItem,

        modelName:
            "SaleItem",

        syncMode:
            "incremental",
    },


    {
        key:
            "loyaltyTransactions",

        model:
            LoyaltyTransaction,

        modelName:
            "LoyaltyTransaction",

        syncMode:
            "incremental",
    },


    {
        key:
            "inventoryMovements",

        model:
            InventoryMovement,

        modelName:
            "InventoryMovement",

        syncMode:
            "incremental",
    },


    {
        key:
            "inventoryTransactions",

        model:
            InventoryTransaction,

        modelName:
            "InventoryTransaction",

        syncMode:
            "incremental",
    },


    {
        key:
            "ledgerTransactions",

        model:
            LedgerTransaction,

        modelName:
            "LedgerTransaction",

        syncMode:
            "incremental",
    },


    {
        key:
            "workerLedgers",

        model:
            WorkerLedger,

        modelName:
            "WorkerLedger",

        syncMode:
            "incremental",
    },


    /*
    Worker attendance is branch-owned operational data.

    Only absence overrides / attendance corrections are
    persisted locally.

    Since WorkerAttendance has timestamps, incremental sync
    safely mirrors both:

    PRESENT -> ABSENT
    ABSENT  -> PRESENT
    */

    {
        key:
            "workerAttendances",

        model:
            WorkerAttendance,

        modelName:
            "WorkerAttendance",

        syncMode:
            "incremental",
    },


    /*
    Stock transfers are normal locally-owned operational
    records.

    PreparedCart is intentionally NOT included here because
    PreparedCart is cloud-owned and uses its own durable
    finalize command workflow.
    */

    {
        key:
            "stockTransfers",

        model:
            StockTransfer,

        modelName:
            "StockTransfer",

        syncMode:
            "incremental",
    },


    /*
    ========================================================
    BULK ORDERS
    ========================================================

    Bulk Orders are locally-owned branch operational records.

    They are created and edited on the StorePOS desktop/local
    database and mirrored to the cloud.

    Bulk Orders do NOT:

    - reserve inventory
    - deduct inventory
    - create Sales
    - process payment

    When a Bulk Order is eventually loaded into POS, the
    normal Sale workflow remains authoritative.

    BulkOrder has timestamps, so incremental synchronization
    safely captures:

    - CREATE
    - SAVE
    - UPDATE / REVISION
    - PRINT AUDIT
    - CANCEL
    - COMPLETE / SALE LINK

    PreparedCart remains different because PreparedCart is
    cloud-owned and is intentionally excluded from this
    registry.
    ========================================================
    */

    {
        key:
            "bulkOrders",

        model:
            BulkOrder,

        modelName:
            "BulkOrder",

        syncMode:
            "incremental",
    },

];


/*
============================================================
GET / CREATE SYNC STATE
============================================================
*/

const getSyncState = async () => {

    let state =
        await SyncState.findOne({
            key:
                SYNC_KEY,
        });


    if (
        !state
    ) {

        state =
            await SyncState.create({
                key:
                    SYNC_KEY,
            });

    }


    return state;

};


/*
============================================================
CHECK STALE SYNC LOCK
============================================================

A real running synchronization updates SyncState when it
enters SYNCING.

If StorePOS crashes after that point, the document can stay
SYNCING forever.

We use updatedAt to determine whether the lock is stale.
============================================================
*/

const isSyncLockStale = (
    state
) => {

    if (
        !state ||
        state.status !==
            "SYNCING"
    ) {

        return false;

    }


    if (
        !state.updatedAt
    ) {

        return true;

    }


    const updatedAt =
        new Date(
            state.updatedAt
        ).getTime();


    if (
        Number.isNaN(
            updatedAt
        )
    ) {

        return true;

    }


    const age =
        Date.now() -
        updatedAt;


    return (
        age >=
        STALE_SYNC_LOCK_MS
    );

};


/*
============================================================
RECOVER STALE SYNC LOCK
============================================================
*/

const recoverStaleSyncLock =
    async (
        state
    ) => {

        if (
            !isSyncLockStale(
                state
            )
        ) {

            return false;

        }


        console.warn(
            "☁️ Recovering stale cloud sync lock."
        );


        state.status =
            "FAILED";


        state.lastError =
            "Previous cloud sync was interrupted and its stale lock was automatically recovered.";


        await state.save();


        return true;

    };


/*
============================================================
GET CLOUD MODEL
============================================================
*/

const getCloudModel = (
    localModel,
    modelName
) => {

    const cloudConnection =
        getCloudConnection();


    if (
        !cloudConnection
    ) {

        throw new Error(
            "Cloud database is not connected."
        );

    }


    if (
        cloudConnection.models[
            modelName
        ]
    ) {

        return cloudConnection.models[
            modelName
        ];

    }


    return cloudConnection.model(
        modelName,
        localModel.schema,
        localModel.collection.name
    );

};


/*
============================================================
BUILD INCREMENTAL QUERY
============================================================
*/

const buildIncrementalQuery = ({
    lastSyncAt,
    syncStartedAt,
}) => {

    if (
        lastSyncAt
    ) {

        return {

            updatedAt: {

                $gt:
                    lastSyncAt,

                $lte:
                    syncStartedAt,

            },

        };

    }


    return {

        updatedAt: {

            $lte:
                syncStartedAt,

        },

    };

};


/*
============================================================
SYNC COLLECTION
============================================================
*/

const syncCollection = async ({
    localModel,
    cloudModel,
    lastSyncAt,
    syncStartedAt,
    syncMode = "incremental",
}) => {

    let query =
        {};


    /*
    ========================================================
    QUERY MODE
    ========================================================
    */

    if (
        syncMode ===
        "incremental"
    ) {

        query =
            buildIncrementalQuery({
                lastSyncAt,
                syncStartedAt,
            });

    } else if (
        syncMode ===
        "full"
    ) {

        query =
            {};

    } else {

        throw new Error(
            `Unsupported cloud sync mode: ${syncMode}`
        );

    }


    /*
    ========================================================
    LOAD LOCAL DOCUMENTS
    ========================================================
    */

    const documents =
        await localModel
            .find(
                query
            )
            .lean();


    if (
        documents.length ===
        0
    ) {

        return {

            scanned:
                0,

            synced:
                0,

            matched:
                0,

            modified:
                0,

            upserted:
                0,

            syncMode,

        };

    }


    /*
    ========================================================
    BUILD CLOUD UPSERTS
    ========================================================
    */

    const operations =
        documents.map(
            (
                document
            ) => {

                const {
                    _id,
                    ...data
                } =
                    document;


                return {

                    updateOne: {

                        filter: {
                            _id,
                        },

                        update: {

                            $set:
                                data,

                        },

                        upsert:
                            true,

                    },

                };

            }
        );


    /*
    ========================================================
    WRITE TO CLOUD
    ========================================================
    */

    const result =
        await cloudModel.bulkWrite(
            operations,
            {
                ordered:
                    false,
            }
        );


    return {

        scanned:
            documents.length,

        synced:
            documents.length,

        matched:
            result.matchedCount ||
            0,

        modified:
            result.modifiedCount ||
            0,

        upserted:
            result.upsertedCount ||
            0,

        syncMode,

    };

};


/*
============================================================
SYNC TO CLOUD
============================================================
*/

const syncToCloud = async () => {

    let state =
        await getSyncState();


    /*
    ========================================================
    STALE LOCK RECOVERY
    ========================================================
    */

    if (
        state.status ===
        "SYNCING"
    ) {

        const recovered =
            await recoverStaleSyncLock(
                state
            );


        if (
            recovered
        ) {

            state =
                await getSyncState();

        }

    }


    /*
    ========================================================
    PREVENT REAL OVERLAPPING RUNS
    ========================================================
    */

    if (
        state.status ===
        "SYNCING"
    ) {

        return {

            success:
                false,

            message:
                "A cloud sync is already running.",

        };

    }


    /*
    ========================================================
    MARK SYNCING
    ========================================================
    */

    state.status =
        "SYNCING";


    state.lastError =
        "";


    await state.save();


    try {

        /*
        ====================================================
        CLOUD CONNECTION
        ====================================================
        */

        if (
            !isCloudConnected()
        ) {

            await connectCloudDatabase();

        }


        if (
            !isCloudConnected()
        ) {

            throw new Error(
                "Cloud database is unavailable."
            );

        }


        /*
        ====================================================
        COMMON SYNC WINDOW
        ====================================================
        */

        const syncStartedAt =
            new Date();


        const lastSyncAt =
            state.lastSyncAt;


        const collections =
            {};


        /*
        ====================================================
        SYNC COLLECTIONS
        ====================================================
        */

        for (
            const config
            of SYNC_COLLECTIONS
        ) {

            const CloudModel =
                getCloudModel(
                    config.model,
                    config.modelName
                );


            console.log(
                `☁️ Syncing ${config.key}...`
            );


            const result =
                await syncCollection({

                    localModel:
                        config.model,

                    cloudModel:
                        CloudModel,

                    lastSyncAt,

                    syncStartedAt,

                    syncMode:
                        config.syncMode,

                });


            collections[
                config.key
            ] =
                result;


            console.log(
                `☁️ ${config.key}: ${result.synced} synced (${result.syncMode})`
            );

        }


        /*
        ====================================================
        SUCCESS
        ====================================================
        */

        state.lastSyncAt =
            syncStartedAt;


        state.lastSuccessAt =
            new Date();


        state.status =
            "SUCCESS";


        state.lastError =
            "";


        await state.save();


        return {

            success:
                true,

            syncedAt:
                state.lastSuccessAt,

            lastSyncAt:
                state.lastSyncAt,

            collections,

        };


    } catch (
        error
    ) {

        /*
        ====================================================
        FAILURE
        ====================================================

        lastSyncAt intentionally remains unchanged.

        Therefore all unsynchronized local changes remain
        eligible for the next retry.
        ====================================================
        */

        state.status =
            "FAILED";


        state.lastError =
            error?.message ||
            "Unknown cloud synchronization error.";


        try {

            await state.save();

        } catch (
            stateError
        ) {

            console.error(
                "☁️ Unable to save failed sync state:",
                stateError
            );

        }


        console.error(
            "☁️ Cloud sync failed:",
            error
        );


        throw error;

    }

};


/*
============================================================
GET NEXT SCHEDULED SYNC
============================================================
*/

const getNextSyncTime = () => {

    const now =
        new Date();


    const next =
        new Date(
            now
        );


    const hour =
        now.getHours();


    const scheduledHours = [
        0,
        6,
        12,
        18,
    ];


    const nextHour =
        scheduledHours.find(
            (
                scheduledHour
            ) =>
                scheduledHour >
                hour
        );


    if (
        nextHour !==
        undefined
    ) {

        next.setHours(
            nextHour,
            0,
            0,
            0
        );

    } else {

        next.setDate(
            next.getDate() +
                1
        );


        next.setHours(
            0,
            0,
            0,
            0
        );

    }


    return next;

};


/*
============================================================
GET SYNC STATUS
============================================================
*/

const getSyncStatus = async () => {

    let state =
        await getSyncState();


    if (
        state.status ===
        "SYNCING" &&
        isSyncLockStale(
            state
        )
    ) {

        await recoverStaleSyncLock(
            state
        );


        state =
            await getSyncState();

    }


    return {

        status:
            state.status,

        lastSyncAt:
            state.lastSyncAt,

        lastSuccessAt:
            state.lastSuccessAt,

        lastError:
            state.lastError,

        cloudConnected:
            isCloudConnected(),

        nextSyncAt:
            getNextSyncTime(),

        automaticSync:
            true,

        /*
        The 6-hour sync remains our slower safety /
        reconciliation schedule.

        The live outbox worker operates separately.
        */

        syncIntervalHours:
            6,

        liveSyncEnabled:
            true,

        liveSyncIntervalSeconds:
            5,

        staleLockTimeoutMinutes:
            STALE_SYNC_LOCK_MS /
            60000,

        collections:
            SYNC_COLLECTIONS.map(
                (
                    item
                ) => ({

                    key:
                        item.key,

                    syncMode:
                        item.syncMode,

                })
            ),

    };

};


/*
============================================================
RESET SYNC STATE
============================================================
*/

const resetSyncState = async () => {

    const state =
        await getSyncState();


    state.lastSyncAt =
        null;


    state.status =
        "IDLE";


    state.lastError =
        "";


    await state.save();


    return {

        success:
            true,

        message:
            "Sync state reset. Next sync will perform a full upload.",

    };

};


/*
============================================================
EXPORT
============================================================
*/

export default {

    syncToCloud,

    getSyncStatus,

    resetSyncState,

};