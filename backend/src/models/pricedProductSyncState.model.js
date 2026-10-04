import mongoose from "mongoose";


const syncFailureSchema =
    new mongoose.Schema(
        {
            pricingSourceId: {
                type: String,
                default: "",
            },

            sourceCaptureId: {
                type: String,
                default: "",
            },

            barcode: {
                type: String,
                default: "",
            },

            name: {
                type: String,
                default: "",
            },

            reason: {
                type: String,
                required: true,
            },
        },
        {
            _id: false,
        }
    );


const pricedProductSyncStateSchema =
    new mongoose.Schema(
        {
            key: {
                type: String,
                required: true,
                unique: true,
                default: "pricedProductSync",
            },

            status: {
                type: String,
                enum: [
                    "IDLE",
                    "SYNCING",
                    "SUCCESS",
                    "PARTIAL",
                    "FAILED",
                ],
                default: "IDLE",
            },

            startedAt: {
                type: Date,
                default: null,
            },

            heartbeatAt: {
                type: Date,
                default: null,
            },

            lastCompletedAt: {
                type: Date,
                default: null,
            },

            lastSuccessAt: {
                type: Date,
                default: null,
            },

            lastError: {
                type: String,
                default: "",
            },

            sourceDatabase: {
                type: String,
                default: "",
            },

            received: {
                type: Number,
                default: 0,
                min: 0,
            },

            created: {
                type: Number,
                default: 0,
                min: 0,
            },

            updated: {
                type: Number,
                default: 0,
                min: 0,
            },

            unchanged: {
                type: Number,
                default: 0,
                min: 0,
            },

            failed: {
                type: Number,
                default: 0,
                min: 0,
            },

            branchInventoriesCreated: {
                type: Number,
                default: 0,
                min: 0,
            },

            failures: {
                type: [syncFailureSchema],
                default: [],
            },
        },
        {
            timestamps: true,
            collection: "pricedproductsyncstates",
        }
    );


const PricedProductSyncState =
    mongoose.model(
        "PricedProductSyncState",
        pricedProductSyncStateSchema
    );


export default PricedProductSyncState;
