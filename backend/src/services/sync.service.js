
import {
    getCloudConnection,
    isCloudConnected,
    connectCloudDatabase,
} from "../config/cloudDatabase.js";

import SyncState from "../models/syncState.model.js";

import Product from "../models/product.model.js";
import Sale from "../models/sale.model.js";
import User from "../models/user.model.js";

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

/*
============================================================
SYNC CONFIG
============================================================
*/

const SYNC_KEY = "cloudSync";


/*
============================================================
COLLECTION REGISTRY
============================================================

Add more local models here later.

Example:

{
    key: "inventoryTransactions",
    model: InventoryTransaction,
    modelName: "InventoryTransaction",
}

The sync engine below will automatically include them.
============================================================
*/const SYNC_COLLECTIONS = [

    {
        key: "products",
        model: Product,
        modelName: "Product",
    },

    {
        key: "sales",
        model: Sale,
        modelName: "Sale",
    },

    {
        key: "users",
        model: User,
        modelName: "User",
    },

    {
        key: "inventoryMovements",
        model: InventoryMovement,
        modelName: "InventoryMovement",
    },

    {
        key: "inventoryTransactions",
        model: InventoryTransaction,
        modelName: "InventoryTransaction",
    },

    {
        key: "ledgerAccounts",
        model: LedgerAccount,
        modelName: "LedgerAccount",
    },

    {
        key: "ledgerTransactions",
        model: LedgerTransaction,
        modelName: "LedgerTransaction",
    },

    {
        key: "workerLedgers",
        model: WorkerLedger,
        modelName: "WorkerLedger",
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
            key: SYNC_KEY,
        });


    if (!state) {

        state =
            await SyncState.create({
                key: SYNC_KEY,
            });

    }


    return state;
};


/*
============================================================
GET CLOUD MODEL
============================================================

Uses the LOCAL schema but registers it against
the separate Atlas connection.
============================================================
*/

const getCloudModel = (
    localModel,
    modelName
) => {

    const cloudConnection =
        getCloudConnection();


    if (!cloudConnection) {

        throw new Error(
            "Cloud database is not connected."
        );

    }


    /*
    Reuse already-registered cloud model.
    */

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
SYNC COLLECTION
============================================================

Incremental sync:

First sync:
    uploads everything

Next syncs:
    only documents where updatedAt > lastSyncAt

Each document keeps the SAME _id locally and in Atlas.
============================================================
*/

const syncCollection = async ({
    localModel,
    cloudModel,
    lastSyncAt,
    syncStartedAt,
}) => {

    /*
    ========================================================
    QUERY
    ========================================================

    The upper bound prevents us from including documents
    modified after this sync started.

    Those documents will be picked up by the next sync.
    ========================================================
    */

    const query = {

        ...(lastSyncAt
            ? {
                updatedAt: {
                    $gt: lastSyncAt,
                    $lte: syncStartedAt,
                },
            }
            : {
                updatedAt: {
                    $lte: syncStartedAt,
                },
            }),

    };


    const documents =
        await localModel
            .find(query)
            .lean();


    if (
        documents.length === 0
    ) {

        return {
            scanned: 0,
            synced: 0,
        };

    }


    /*
    ========================================================
    BULK UPSERT
    ========================================================

    Much faster than one updateOne() request per document.
    ========================================================
    */

    const operations =
        documents.map(
            (document) => {

                const {
                    _id,
                    ...data
                } = document;


                return {

                    updateOne: {

                        filter: {
                            _id,
                        },

                        update: {
                            $set: data,
                        },

                        upsert: true,

                    },

                };

            }
        );


    const result =
        await cloudModel.bulkWrite(
            operations,
            {
                ordered: false,
            }
        );


    return {

        scanned:
            documents.length,

        synced:
            documents.length,

        matched:
            result.matchedCount || 0,

        modified:
            result.modifiedCount || 0,

        upserted:
            result.upsertedCount || 0,

    };
};


/*
============================================================
SYNC TO CLOUD
============================================================
*/

const syncToCloud = async () => {

    const state =
        await getSyncState();


    /*
    ========================================================
    PREVENT OVERLAPPING RUNS
    ========================================================
    */

    if (
        state.status ===
        "SYNCING"
    ) {

        return {

            success: false,

            message:
                "A cloud sync is already running.",

        };

    }


    /*
    ========================================================
    MARK AS SYNCING
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
        ENSURE CLOUD CONNECTION
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
        SYNC WINDOW
        ====================================================
        */

        const syncStartedAt =
            new Date();


        const lastSyncAt =
            state.lastSyncAt;


        /*
        ====================================================
        RESULT OBJECT
        ====================================================
        */

        const collections = {};


        /*
        ====================================================
        SYNC REGISTERED COLLECTIONS
        ====================================================
        */

        for (
            const config of
            SYNC_COLLECTIONS
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

                });


            collections[
                config.key
            ] = result;


            console.log(
                `☁️ ${config.key}: ${result.synced} synced`
            );

        }


        /*
        ====================================================
        SYNC SUCCESS
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

            success: true,

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
        SYNC FAILED
        ====================================================
        */

        state.status =
            "FAILED";


        state.lastError =
            error.message;


        await state.save();


        console.error(
            "☁️ Cloud sync failed:",
            error
        );


        throw error;

    }

};


/*
============================================================
GET SYNC STATUS
============================================================
*/
/*
============================================================
GET NEXT SCHEDULED SYNC
============================================================

Automatic sync runs every 6 hours:

12:00 AM
6:00 AM
12:00 PM
6:00 PM
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
            (scheduledHour) =>
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

        /*
        Next sync is midnight tomorrow.
        */

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

    const state =
        await getSyncState();


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

        syncIntervalHours:
            6,

        collections:
            SYNC_COLLECTIONS.map(
                (item) =>
                    item.key
            ),

    };

};

/*
============================================================
RESET SYNC STATE
============================================================

Useful if you ever want to force a complete upload again.

This does NOT delete anything from Atlas.

It only clears lastSyncAt so the next sync sends
all local documents again.
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

        success: true,

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