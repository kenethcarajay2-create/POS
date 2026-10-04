import dotenv from "dotenv";

import mongoose from "mongoose";

import connectDB from "../config/database.js";

import InventoryTransaction from "../models/inventoryTransaction.model.js";

import branchService from "../services/branch.service.js";


dotenv.config();


/*
============================================================
INVENTORY TRANSACTION → MAIN MIGRATION
============================================================

Existing inventory history belongs to the original single
store, which is now represented by MAIN.

SAFETY:

- quantities are not changed
- previousStock is not changed
- newStock is not changed
- products are not changed
- users are not changed
- timestamps are not changed
- only missing branch data is added
- safe to rerun
============================================================
*/

const runMigration =
    async () => {

        console.log(
            "============================================================"
        );

        console.log(
            "🚀 INVENTORY TRANSACTIONS → MAIN BRANCH MIGRATION"
        );

        console.log(
            "============================================================"
        );


        /*
        ====================================================
        CONNECT DATABASE
        ====================================================
        */

        await connectDB();


        /*
        ====================================================
        ENSURE MAIN
        ====================================================
        */

        const mainBranch =
            await branchService
                .ensureDefaultBranch();


        const branchSnapshot = {

            code:
                mainBranch.code,

            name:
                mainBranch.name,

        };


        console.log(
            `🏪 Branch: ${mainBranch.name} (${mainBranch.code})`
        );

        console.log(
            `🆔 Branch ID: ${mainBranch._id}`
        );


        /*
        ====================================================
        COUNTS
        ====================================================
        */

        const totalTransactions =
            await InventoryTransaction
                .countDocuments({});


        console.log(
            `📦 Total inventory transactions: ${totalTransactions}`
        );


        /*
        ====================================================
        MISSING BRANCH QUERY
        ====================================================
        */

        const missingBranchQuery = {

            $or: [

                {
                    branch: {
                        $exists:
                            false,
                    },
                },

                {
                    branch:
                        null,
                },

            ],

        };


        const missingBranchCount =
            await InventoryTransaction
                .countDocuments(
                    missingBranchQuery
                );


        console.log(
            `📍 Transactions missing branch: ${missingBranchCount}`
        );


        /*
        ====================================================
        BACKFILL
        ====================================================
        */

        if (
            missingBranchCount >
            0
        ) {

            const result =
                await InventoryTransaction
                    .updateMany(
                        missingBranchQuery,
                        {
                            $set: {

                                branch:
                                    mainBranch._id,

                                branchSnapshot,

                            },
                        }
                    );


            console.log(
                `✅ Branch backfill matched: ${result.matchedCount}`
            );

            console.log(
                `✅ Branch backfill modified: ${result.modifiedCount}`
            );

        } else {

            console.log(
                "➖ No inventory transactions require branch backfill."
            );

        }


        /*
        ====================================================
        REPAIR MAIN SNAPSHOTS
        ====================================================
        */

        const missingSnapshotQuery = {

            branch:
                mainBranch._id,

            $or: [

                {
                    "branchSnapshot.code": {
                        $exists:
                            false,
                    },
                },

                {
                    "branchSnapshot.code":
                        "",
                },

                {
                    "branchSnapshot.code":
                        null,
                },

                {
                    "branchSnapshot.name": {
                        $exists:
                            false,
                    },
                },

                {
                    "branchSnapshot.name":
                        "",
                },

                {
                    "branchSnapshot.name":
                        null,
                },

            ],

        };


        const missingSnapshotCount =
            await InventoryTransaction
                .countDocuments(
                    missingSnapshotQuery
                );


        console.log(
            `📷 MAIN transactions missing snapshot: ${missingSnapshotCount}`
        );


        if (
            missingSnapshotCount >
            0
        ) {

            const snapshotResult =
                await InventoryTransaction
                    .updateMany(
                        missingSnapshotQuery,
                        {
                            $set: {

                                branchSnapshot,

                            },
                        }
                    );


            console.log(
                `✅ Snapshot repair matched: ${snapshotResult.matchedCount}`
            );

            console.log(
                `✅ Snapshot repair modified: ${snapshotResult.modifiedCount}`
            );

        }


        /*
        ====================================================
        VERIFY
        ====================================================
        */

        const remainingWithoutBranch =
            await InventoryTransaction
                .countDocuments({

                    $or: [

                        {
                            branch: {
                                $exists:
                                    false,
                            },
                        },

                        {
                            branch:
                                null,
                        },

                    ],

                });


        const remainingWithoutSnapshot =
            await InventoryTransaction
                .countDocuments({

                    $or: [

                        {
                            "branchSnapshot.code": {
                                $exists:
                                    false,
                            },
                        },

                        {
                            "branchSnapshot.code":
                                "",
                        },

                        {
                            "branchSnapshot.code":
                                null,
                        },

                        {
                            "branchSnapshot.name": {
                                $exists:
                                    false,
                            },
                        },

                        {
                            "branchSnapshot.name":
                                "",
                        },

                        {
                            "branchSnapshot.name":
                                null,
                        },

                    ],

                });


        /*
        ====================================================
        SUMMARY
        ====================================================
        */

        console.log(
            ""
        );

        console.log(
            "============================================================"
        );

        console.log(
            "📊 MIGRATION SUMMARY"
        );

        console.log(
            "============================================================"
        );


        console.log(
            `Total transactions:          ${totalTransactions}`
        );

        console.log(
            `Missing branch:              ${remainingWithoutBranch}`
        );

        console.log(
            `Missing snapshot:            ${remainingWithoutSnapshot}`
        );


        if (
            remainingWithoutBranch >
                0 ||
            remainingWithoutSnapshot >
                0
        ) {

            console.error(
                ""
            );

            console.error(
                "❌ Inventory transaction migration verification failed."
            );


            process.exitCode =
                1;


            return;

        }


        console.log(
            ""
        );

        console.log(
            "✅ Inventory transaction migration completed successfully."
        );

        console.log(
            "✅ Every historical inventory transaction has a branch."
        );

        console.log(
            "✅ Every historical inventory transaction has a branch snapshot."
        );

    };


/*
============================================================
RUN
============================================================
*/

try {

    await runMigration();


} catch (
    error
) {

    console.error(
        ""
    );

    console.error(
        "============================================================"
    );

    console.error(
        "❌ INVENTORY TRANSACTION MIGRATION FAILED"
    );

    console.error(
        "============================================================"
    );

    console.error(
        error
    );


    process.exitCode =
        1;


} finally {

    try {

        await mongoose.connection
            .close();

    } catch (
        error
    ) {

        console.error(
            "Failed to close MongoDB connection:"
        );

        console.error(
            error.message
        );

    }

}