import "dotenv/config";

import mongoose from "mongoose";

import connectDB from "../config/database.js";

import LedgerAccount from "../models/ledgerAccount.model.js";

import WorkerLedger from "../models/workerLedger.model.js";

import LedgerTransaction from "../models/ledgerTransaction.model.js";

import branchService from "../services/branch.service.js";


/*
============================================================
BUILD SNAPSHOT
============================================================
*/

const buildSnapshot = (
    branch
) => {

    return {

        code:
            String(
                branch?.code ||
                ""
            )
                .trim()
                .toUpperCase(),

        name:
            String(
                branch?.name ||
                ""
            ).trim(),

    };

};


/*
============================================================
MIGRATE COLLECTION
============================================================
*/

const migrateCollection = async (
    Model,
    label,
    mainBranch,
    snapshot
) => {

    console.log(
        `\nMIGRATING ${label}`
    );


    const total =
        await Model.countDocuments();


    /*
    ========================================================
    ASSIGN MAIN TO RECORDS WITHOUT BRANCH
    ========================================================
    */

    const missingBranchResult =
        await Model.updateMany(
            {
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
            },
            {
                $set: {

                    branch:
                        mainBranch._id,

                    branchSnapshot:
                        snapshot,

                },
            }
        );


    /*
    ========================================================
    REPAIR SNAPSHOT
    ========================================================
    */

    const snapshotRepairResult =
        await Model.updateMany(
            {
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
                        "branchSnapshot.name": {
                            $exists:
                                false,
                        },
                    },

                    {
                        "branchSnapshot.name":
                            "",
                    },

                ],
            },
            {
                $set: {

                    branchSnapshot:
                        snapshot,

                },
            }
        );


    /*
    ========================================================
    VERIFY
    ========================================================
    */

    const missingBranch =
        await Model.countDocuments(
            {
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
            }
        );


    const missingSnapshot =
        await Model.countDocuments(
            {
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
                        "branchSnapshot.name": {
                            $exists:
                                false,
                        },
                    },

                    {
                        "branchSnapshot.name":
                            "",
                    },

                ],
            }
        );


    console.log(
        `Total:                 ${total}`
    );

    console.log(
        `Assigned MAIN:         ${missingBranchResult.modifiedCount}`
    );

    console.log(
        `Snapshots repaired:    ${snapshotRepairResult.modifiedCount}`
    );

    console.log(
        `Missing branch:        ${missingBranch}`
    );

    console.log(
        `Missing snapshot:      ${missingSnapshot}`
    );


    return {

        label,

        total,

        assigned:
            missingBranchResult.modifiedCount,

        snapshotsRepaired:
            snapshotRepairResult.modifiedCount,

        missingBranch,

        missingSnapshot,

        valid:
            missingBranch ===
                0 &&
            missingSnapshot ===
                0,

    };

};


/*
============================================================
RUN
============================================================
*/

const run = async () => {

    try {

        await connectDB();


        console.log(
            "\n========================================"
        );

        console.log(
            "LEDGER BRANCH MIGRATION"
        );

        console.log(
            "========================================"
        );


        /*
        ====================================================
        MAIN BRANCH
        ====================================================
        */

        const mainBranch =
            await branchService
                .ensureDefaultBranch();


        if (
            !mainBranch
        ) {

            throw new Error(
                "Unable to resolve the default MAIN branch."
            );

        }


        const snapshot =
            buildSnapshot(
                mainBranch
            );


        if (
            !snapshot.code ||
            !snapshot.name
        ) {

            throw new Error(
                "MAIN branch has incomplete branch information."
            );

        }


        console.log(
            `\nTarget Branch: ${snapshot.code} - ${snapshot.name}`
        );


        /*
        ====================================================
        MIGRATE
        ====================================================
        */

        const accountResult =
            await migrateCollection(
                LedgerAccount,
                "LEDGER ACCOUNTS",
                mainBranch,
                snapshot
            );


        const workerLedgerResult =
            await migrateCollection(
                WorkerLedger,
                "WORKER LEDGERS",
                mainBranch,
                snapshot
            );


        const transactionResult =
            await migrateCollection(
                LedgerTransaction,
                "LEDGER TRANSACTIONS",
                mainBranch,
                snapshot
            );


        /*
        ====================================================
        VERIFY TRANSACTION -> ACCOUNT BRANCH
        ====================================================
        */

        const transactionBranchProblems =
            await LedgerTransaction
                .aggregate([

                    {
                        $lookup: {

                            from:
                                LedgerAccount
                                    .collection
                                    .name,

                            localField:
                                "account",

                            foreignField:
                                "_id",

                            as:
                                "accountDocument",

                        },
                    },


                    {
                        $unwind: {

                            path:
                                "$accountDocument",

                            preserveNullAndEmptyArrays:
                                true,

                        },
                    },


                    {
                        $match: {

                            $or: [

                                {
                                    accountDocument:
                                        null,
                                },

                                {
                                    $expr: {

                                        $ne: [
                                            "$branch",
                                            "$accountDocument.branch",
                                        ],

                                    },
                                },

                            ],

                        },
                    },


                    {
                        $count:
                            "count",
                    },

                ]);


        /*
        ====================================================
        VERIFY WORKER LEDGER -> ACCOUNT BRANCH
        ====================================================
        */

        const workerBranchProblems =
            await WorkerLedger
                .aggregate([

                    {
                        $lookup: {

                            from:
                                LedgerAccount
                                    .collection
                                    .name,

                            localField:
                                "worker",

                            foreignField:
                                "_id",

                            as:
                                "workerDocument",

                        },
                    },


                    {
                        $unwind: {

                            path:
                                "$workerDocument",

                            preserveNullAndEmptyArrays:
                                true,

                        },
                    },


                    {
                        $match: {

                            $or: [

                                {
                                    workerDocument:
                                        null,
                                },

                                {
                                    $expr: {

                                        $ne: [
                                            "$branch",
                                            "$workerDocument.branch",
                                        ],

                                    },
                                },

                            ],

                        },
                    },


                    {
                        $count:
                            "count",
                    },

                ]);


        const transactionMismatchCount =
            transactionBranchProblems[0]
                ?.count ||
            0;


        const workerMismatchCount =
            workerBranchProblems[0]
                ?.count ||
            0;


        /*
        ====================================================
        SUMMARY
        ====================================================
        */

        console.log(
            "\n========================================"
        );

        console.log(
            "MIGRATION SUMMARY"
        );

        console.log(
            "========================================"
        );


        console.log(
            `Ledger Accounts Valid:       ${accountResult.valid}`
        );

        console.log(
            `Worker Ledgers Valid:        ${workerLedgerResult.valid}`
        );

        console.log(
            `Ledger Transactions Valid:   ${transactionResult.valid}`
        );

        console.log(
            `Transaction branch mismatch: ${transactionMismatchCount}`
        );

        console.log(
            `Worker branch mismatch:      ${workerMismatchCount}`
        );


        const successful =
            accountResult.valid &&
            workerLedgerResult.valid &&
            transactionResult.valid &&
            transactionMismatchCount ===
                0 &&
            workerMismatchCount ===
                0;


        if (
            !successful
        ) {

            throw new Error(
                "Ledger branch migration verification failed."
            );

        }


        console.log(
            "\nLedger branch migration completed successfully."
        );

        console.log(
            "Every ledger account, worker ledger, and ledger transaction has a valid branch assignment."
        );


    } catch (
        error
    ) {

        console.error(
            "\nLEDGER MIGRATION FAILED"
        );


        console.error(
            error
        );


        process.exitCode =
            1;


    } finally {

        await mongoose
            .connection
            .close();

    }

};


run();