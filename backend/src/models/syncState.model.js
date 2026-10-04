import mongoose from "mongoose";


/*
============================================================
SYNC STATE
============================================================

Stores the local StorePOS cloud synchronization checkpoint.

IMPORTANT:

This document belongs ONLY to the local database.

It must never be mirrored to the cloud because it describes
the synchronization state of this specific StorePOS server.
============================================================
*/

const syncStateSchema =
    new mongoose.Schema(
        {

            /*
            ====================================================
            STATE KEY
            ====================================================

            Example:

                cloudSync

            Only one document is currently required.
            ====================================================
            */

            key: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                trim:
                    true,

            },


            /*
            ====================================================
            LAST COMPLETED SYNC WINDOW
            ====================================================

            Documents newer than this timestamp are eligible
            for the next incremental synchronization.

            This value advances only after EVERY configured
            collection finishes successfully.
            ====================================================
            */

            lastSyncAt: {

                type:
                    Date,

                default:
                    null,

            },


            /*
            ====================================================
            LAST SUCCESS
            ====================================================
            */

            lastSuccessAt: {

                type:
                    Date,

                default:
                    null,

            },


            /*
            ====================================================
            LAST ERROR
            ====================================================
            */

            lastError: {

                type:
                    String,

                default:
                    "",

            },


            /*
            ====================================================
            STATUS
            ====================================================
            */

            status: {

                type:
                    String,

                enum: [
                    "IDLE",
                    "SYNCING",
                    "SUCCESS",
                    "FAILED",
                ],

                default:
                    "IDLE",

                index:
                    true,

            },


            /*
            ====================================================
            LEASE OWNER TOKEN
            ====================================================

            Every sync attempt receives a random UUID.

            Only the process holding this exact token may:

            - renew the lease
            - mark the sync SUCCESS
            - mark the sync FAILED
            - release the lease

            This prevents an older sync attempt from changing
            the state after another worker has taken ownership.
            ====================================================
            */

            leaseOwnerToken: {

                type:
                    String,

                default:
                    "",

                index:
                    true,

            },


            /*
            ====================================================
            LEASE ACQUIRED AT
            ====================================================
            */

            leaseAcquiredAt: {

                type:
                    Date,

                default:
                    null,

            },


            /*
            ====================================================
            LEASE HEARTBEAT
            ====================================================

            Updated periodically while the owning process is
            still actively synchronizing.
            ====================================================
            */

            leaseHeartbeatAt: {

                type:
                    Date,

                default:
                    null,

            },


            /*
            ====================================================
            LEASE EXPIRATION
            ====================================================

            Another worker may acquire the synchronization lock
            only after this timestamp has expired.

            A healthy owner continuously extends this value.
            ====================================================
            */

            leaseExpiresAt: {

                type:
                    Date,

                default:
                    null,

                index:
                    true,

            },

        },
        {

            timestamps:
                true,

        }
    );


/*
============================================================
INDEXES
============================================================

Helps the lease acquisition / stale lock checks.

The unique key index is already generated by unique: true.
============================================================
*/

syncStateSchema.index({

    status:
        1,

    leaseExpiresAt:
        1,

});


/*
============================================================
EXPORT
============================================================
*/

export default mongoose.model(
    "SyncState",
    syncStateSchema
);