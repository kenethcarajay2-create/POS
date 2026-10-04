import dotenv from "dotenv";

import mongoose from "mongoose";

import connectDB from "../config/database.js";

import Sale from "../models/sale.model.js";

import branchService from "../services/branch.service.js";


/*
============================================================
ENVIRONMENT
============================================================
*/

dotenv.config();


/*
============================================================
MIGRATION
============================================================

Purpose:

Existing StorePOS sales were created before branch support.

Every historical sale therefore belongs to the original store,
which becomes:

MAIN
Main Branch


SAFETY RULES
============================================================

1. Existing sale values are NOT recalculated.
2. Existing receipt numbers are NOT changed.
3. Existing cashier/customer references are NOT changed.
4. Existing totals/refunds/statuses are NOT changed.
5. Only missing branch information is backfilled.
6. Running this script repeatedly is safe.
============================================================
*/


const runMigration =
    async () => {

        console.log(
            "============================================================"
        );

        console.log(
            "🚀 SALES → MAIN BRANCH MIGRATION"
        );

        console.log(
            "============================================================"
        );


        /*
        ========================================================
        DATABASE
        ========================================================
        */

        await connectDB();


        /*
        ========================================================
        ENSURE MAIN BRANCH
        ========================================================
        */

        const mainBranch =
            await branchService
                .ensureDefaultBranch();


        const mainBranchId =
            mainBranch._id;


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
            `🆔 Branch ID: ${mainBranchId}`
        );


        /*
        ========================================================
        CURRENT SALES COUNT
        ========================================================
        */

        const totalSales =
            await Sale.countDocuments(
                {}
            );


        console.log(
            `🧾 Total sales: ${totalSales}`
        );


        /*
        ========================================================
        SALES MISSING BRANCH
        ========================================================

        This includes both:

        branch field does not exist

        OR

        branch is null
        ========================================================
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


        const salesMissingBranch =
            await Sale.countDocuments(
                missingBranchQuery
            );


        console.log(
            `📦 Sales missing branch: ${salesMissingBranch}`
        );


        /*
        ========================================================
        BACKFILL BRANCH
        ========================================================

        updateMany is intentionally used here.

        It updates only records whose branch is missing.

        If the migration is interrupted and rerun, records
        already migrated will not be touched again.
        ========================================================
        */

        if (
            salesMissingBranch >
            0
        ) {

            const branchResult =
                await Sale.updateMany(
                    missingBranchQuery,
                    {
                        $set: {

                            branch:
                                mainBranchId,

                            branchSnapshot:
                                branchSnapshot,

                        },
                    }
                );


            console.log(
                `✅ Branch backfill matched: ${branchResult.matchedCount}`
            );

            console.log(
                `✅ Branch backfill modified: ${branchResult.modifiedCount}`
            );

        } else {

            console.log(
                "➖ No sales require branch backfill."
            );

        }


        /*
        ========================================================
        REPAIR MAIN SALES MISSING SNAPSHOT
        ========================================================

        This is separate so that a migration interrupted after
        branch assignment can safely be rerun.

        IMPORTANT:

        We ONLY repair snapshot data for MAIN sales.

        We never overwrite another branch's historical identity.
        ========================================================
        */

        const mainSalesMissingSnapshotQuery = {

            branch:
                mainBranchId,

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


        const mainSalesMissingSnapshot =
            await Sale.countDocuments(
                mainSalesMissingSnapshotQuery
            );


        console.log(
            `📷 MAIN sales missing branch snapshot: ${mainSalesMissingSnapshot}`
        );


        if (
            mainSalesMissingSnapshot >
            0
        ) {

            const snapshotResult =
                await Sale.updateMany(
                    mainSalesMissingSnapshotQuery,
                    {
                        $set: {

                            branchSnapshot:
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

        } else {

            console.log(
                "➖ No MAIN sales require snapshot repair."
            );

        }


        /*
        ========================================================
        VERIFY BRANCH
        ========================================================
        */

        const remainingWithoutBranch =
            await Sale.countDocuments({

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


        /*
        ========================================================
        VERIFY SNAPSHOT
        ========================================================
        */

        const remainingWithoutSnapshot =
            await Sale.countDocuments({

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
        ========================================================
        VERIFY MAIN SALES
        ========================================================
        */

        const mainSales =
            await Sale.countDocuments({

                branch:
                    mainBranchId,

            });


        /*
        ========================================================
        SUMMARY
        ========================================================
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
            `Total sales:                 ${totalSales}`
        );

        console.log(
            `Sales assigned to MAIN:      ${mainSales}`
        );

        console.log(
            `Sales missing branch:        ${remainingWithoutBranch}`
        );

        console.log(
            `Sales missing snapshot:      ${remainingWithoutSnapshot}`
        );


        /*
        ========================================================
        FAILURE
        ========================================================
        */

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
                "❌ Sales migration verification failed."
            );


            if (
                remainingWithoutBranch >
                0
            ) {

                console.error(
                    `❌ ${remainingWithoutBranch} sale(s) still have no branch.`
                );

            }


            if (
                remainingWithoutSnapshot >
                0
            ) {

                console.error(
                    `❌ ${remainingWithoutSnapshot} sale(s) still have incomplete branch snapshot data.`
                );

            }


            process.exitCode =
                1;


            return;

        }


        /*
        ========================================================
        SUCCESS
        ========================================================
        */

        console.log(
            ""
        );

        console.log(
            "✅ Sales branch migration completed successfully."
        );

        console.log(
            "✅ Every existing sale has a branch."
        );

        console.log(
            "✅ Every existing sale has a branch snapshot."
        );


    };


/*
============================================================
START
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
        "❌ SALES MIGRATION FAILED"
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