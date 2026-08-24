import mongoose from "mongoose";


const syncStateSchema =
    new mongoose.Schema(
        {
            key: {
                type: String,
                required: true,
                unique: true,
                trim: true,
            },

            lastSyncAt: {
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

            status: {
                type: String,
                enum: [
                    "IDLE",
                    "SYNCING",
                    "SUCCESS",
                    "FAILED",
                ],
                default: "IDLE",
            },
        },
        {
            timestamps: true,
        }
    );


const SyncState =
    mongoose.model(
        "SyncState",
        syncStateSchema
    );


export default SyncState;