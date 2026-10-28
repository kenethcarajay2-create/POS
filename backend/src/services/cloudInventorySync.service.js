import os from "node:os";

import mongoose from "mongoose";

import {
    connectCloudDatabase,
    getCloudConnection,
    isCloudConnected,
} from "../config/cloudDatabase.js";

import Branch from "../models/branch.model.js";
import Product from "../models/product.model.js";
import InventorySyncCursor from "../models/inventorySyncCursor.model.js";
import InventorySyncReceipt from "../models/inventorySyncReceipt.model.js";

import withTransaction from "../utils/withTransaction.js";
import branchInventoryService from "./branch-inventory.service.js";


/*
============================================================
CONFIG
============================================================
*/

const CURSOR_KEY =
    "inventoryCloudPull";

const CLOUD_MODEL_NAME =
    "InventorySyncEvent";

const CLOUD_COLLECTION_NAME =
    "inventorysyncevents";


/*
============================================================
NODE ID
============================================================

Set STOREPOS_NODE_ID in .env if you want an explicit name:

Computer 1:
    STOREPOS_NODE_ID=POS-01

Computer 2:
    STOREPOS_NODE_ID=POS-02

If not supplied, Windows/computer hostname is used.
============================================================
*/

const getNodeId =
    () => {

        const value =
            String(
                process.env.STOREPOS_NODE_ID ||
                os.hostname() ||
                "STOREPOS"
            )
                .trim()
                .toUpperCase();


        return value ||
            "STOREPOS";

    };


/*
============================================================
CLOUD EVENT SCHEMA
============================================================

Atlas stores immutable inventory deltas.

The eventId is globally unique and makes retries idempotent.
============================================================
*/

const cloudInventoryEventSchema =
    new mongoose.Schema(
        {
            eventId: {
                type: String,
                required: true,
                unique: true,
                index: true,
                trim: true,
            },

            originNodeId: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
                index: true,
            },

            productBarcode: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },

            branchCode: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
                index: true,
            },

            quantityChange: {
                type: Number,
                required: true,
            },

            source: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
            },

            action: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
            },

            referenceId: {
                type: String,
                default: "",
                trim: true,
            },

            occurredAt: {
                type: Date,
                required: true,
                default: Date.now,
                index: true,
            },
        },
        {
            timestamps: true,
        }
    );


cloudInventoryEventSchema.index({
    _id: 1,
    originNodeId: 1,
});


/*
============================================================
ENSURE CLOUD CONNECTION
============================================================
*/

const ensureCloudConnection =
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

            throw new Error(
                "Cloud database is unavailable."
            );

        }


        return connection;

    };


/*
============================================================
GET CLOUD MODEL
============================================================
*/

const getCloudInventoryEventModel =
    async () => {

        const connection =
            await ensureCloudConnection();


        if (
            connection.models[
                CLOUD_MODEL_NAME
            ]
        ) {

            return connection.models[
                CLOUD_MODEL_NAME
            ];

        }


        return connection.model(
            CLOUD_MODEL_NAME,
            cloudInventoryEventSchema,
            CLOUD_COLLECTION_NAME
        );

    };


/*
============================================================
PUBLISH INVENTORY CHANGE
============================================================

Retry-safe:

The same eventId can be sent repeatedly but Atlas inserts it
only once.
============================================================
*/

const publishInventoryChange =
    async (
        event
    ) => {

        const payload =
            event?.commandPayload ||
            {};


        const eventId =
            String(
                event?.eventId ||
                ""
            ).trim();


        const productBarcode =
            String(
                payload.productBarcode ||
                ""
            ).trim();


        const branchCode =
            String(
                payload.branchCode ||
                ""
            )
                .trim()
                .toUpperCase();


        const quantityChange =
            Number(
                payload.quantityChange
            );


        if (
            !eventId
        ) {

            throw new Error(
                "Inventory synchronization event ID is missing."
            );

        }


        if (
            !productBarcode
        ) {

            throw new Error(
                "Inventory synchronization product barcode is missing."
            );

        }


        if (
            !branchCode
        ) {

            throw new Error(
                "Inventory synchronization branch code is missing."
            );

        }


        if (
            !Number.isFinite(
                quantityChange
            ) ||
            quantityChange ===
                0
        ) {

            throw new Error(
                "Inventory synchronization quantity change is invalid."
            );

        }


        const CloudInventoryEvent =
            await getCloudInventoryEventModel();


        const result =
            await CloudInventoryEvent.updateOne(
                {
                    eventId,
                },
                {
                    $setOnInsert: {
                        eventId,
                        originNodeId:
                            getNodeId(),
                        productBarcode,
                        branchCode,
                        quantityChange,
                        source:
                            String(
                                event?.source ||
                                "INVENTORY"
                            )
                                .trim()
                                .toUpperCase(),
                        action:
                            String(
                                event?.action ||
                                "UPDATE"
                            )
                                .trim()
                                .toUpperCase(),
                        referenceId:
                            payload.referenceId
                                ? String(
                                    payload.referenceId
                                )
                                : "",
                        occurredAt:
                            event?.createdAt ||
                            new Date(),
                    },
                },
                {
                    upsert:
                        true,
                }
            );


        return {
            success:
                true,
            eventId,
            created:
                result.upsertedCount >
                0,
        };

    };


/*
============================================================
GET / CREATE LOCAL CURSOR
============================================================
*/

const getCursor =
    async () => {

        return await InventorySyncCursor
            .findOneAndUpdate(
                {
                    key:
                        CURSOR_KEY,
                },
                {
                    $setOnInsert: {
                        key:
                            CURSOR_KEY,
                        lastCloudEventId:
                            null,
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
            );

    };


/*
============================================================
ADVANCE CURSOR
============================================================
*/

const advanceCursor =
    async (
        cloudEventId
    ) => {

        await InventorySyncCursor.updateOne(
            {
                key:
                    CURSOR_KEY,
            },
            {
                $set: {
                    lastCloudEventId:
                        cloudEventId,
                },
            },
            {
                upsert:
                    true,
            }
        );

    };


/*
============================================================
APPLY ONE REMOTE EVENT
============================================================
*/

const applyRemoteEvent =
    async (
        event
    ) => {

        const existingReceipt =
            await InventorySyncReceipt.findOne({
                eventId:
                    event.eventId,
            });


        if (
            existingReceipt
        ) {

            return {
                applied:
                    false,
                alreadyApplied:
                    true,
            };

        }


        const branch =
            await Branch.findOne({
                code:
                    String(
                        event.branchCode ||
                        ""
                    )
                        .trim()
                        .toUpperCase(),
            });


        if (
            !branch
        ) {

            throw new Error(
                `Cannot apply cloud inventory event ${event.eventId}: branch ${event.branchCode} does not exist locally.`
            );

        }


        const product =
            await Product.findOne({
                barcode:
                    String(
                        event.productBarcode ||
                        ""
                    ).trim(),
            });


        if (
            !product
        ) {

            throw new Error(
                `Cannot apply cloud inventory event ${event.eventId}: product barcode ${event.productBarcode} does not exist locally.`
            );

        }


        const quantityChange =
            Number(
                event.quantityChange
            );


        if (
            !Number.isFinite(
                quantityChange
            ) ||
            quantityChange ===
                0
        ) {

            throw new Error(
                `Cannot apply cloud inventory event ${event.eventId}: invalid quantity change.`
            );

        }


        await withTransaction(
            async (
                session
            ) => {

                const receiptInsideTransaction =
                    await InventorySyncReceipt
                        .findOne({
                            eventId:
                                event.eventId,
                        })
                        .session(
                            session
                        );


                if (
                    receiptInsideTransaction
                ) {

                    return;

                }


                await branchInventoryService
                    .requireInventory(
                        branch._id,
                        product._id,
                        {
                            session,
                        }
                    );


                if (
                    quantityChange >
                    0
                ) {

                    await branchInventoryService
                        .addStock(
                            branch._id,
                            product._id,
                            quantityChange,
                            {
                                session,
                                skipSyncEvent:
                                    true,
                                source:
                                    "CLOUD",
                                action:
                                    "REMOTE_ADD",
                            }
                        );

                } else {

                    await branchInventoryService
                        .deductStock(
                            branch._id,
                            product._id,
                            Math.abs(
                                quantityChange
                            ),
                            {
                                session,
                                skipSyncEvent:
                                    true,
                                source:
                                    "CLOUD",
                                action:
                                    "REMOTE_DEDUCT",
                            }
                        );

                }


                await InventorySyncReceipt.create(
                    [
                        {
                            eventId:
                                event.eventId,
                            cloudEventId:
                                event._id,
                            originNodeId:
                                event.originNodeId,
                            product:
                                product._id,
                            branch:
                                branch._id,
                            quantityChange,
                            appliedAt:
                                new Date(),
                        },
                    ],
                    {
                        session,
                    }
                );

            }
        );


        return {
            applied:
                true,
            alreadyApplied:
                false,
        };

    };


/*
============================================================
PULL INCOMING INVENTORY CHANGES
============================================================

Runs on every POS computer.

Each computer reads Atlas events in order. Events created by
that same computer are skipped because their stock change was
already applied locally before the event was uploaded.
============================================================
*/

const pullIncomingInventoryChanges =
    async ({
        limit = 100,
    } = {}) => {

        const CloudInventoryEvent =
            await getCloudInventoryEventModel();


        const cursor =
            await getCursor();


        const filter =
            {};


        if (
            cursor.lastCloudEventId
        ) {

            filter._id = {
                $gt:
                    cursor.lastCloudEventId,
            };

        }


        const events =
            await CloudInventoryEvent
                .find(
                    filter
                )
                .sort({
                    _id:
                        1,
                })
                .limit(
                    Math.max(
                        1,
                        Math.min(
                            Number(
                                limit
                            ) || 100,
                            500
                        )
                    )
                )
                .lean();


        if (
            events.length ===
            0
        ) {

            return {
                scanned:
                    0,
                applied:
                    0,
                skippedOwn:
                    0,
                alreadyApplied:
                    0,
            };

        }


        const localNodeId =
            getNodeId();


        let applied =
            0;

        let skippedOwn =
            0;

        let alreadyApplied =
            0;


        for (
            const event
            of events
        ) {

            if (
                String(
                    event.originNodeId ||
                    ""
                )
                    .trim()
                    .toUpperCase() ===
                localNodeId
            ) {

                skippedOwn +=
                    1;


                await advanceCursor(
                    event._id
                );


                continue;

            }


            const result =
                await applyRemoteEvent(
                    event
                );


            if (
                result.applied
            ) {

                applied +=
                    1;

            }


            if (
                result.alreadyApplied
            ) {

                alreadyApplied +=
                    1;

            }


            await advanceCursor(
                event._id
            );

        }


        return {
            scanned:
                events.length,
            applied,
            skippedOwn,
            alreadyApplied,
        };

    };


export default {
    getNodeId,
    publishInventoryChange,
    pullIncomingInventoryChanges,
};
