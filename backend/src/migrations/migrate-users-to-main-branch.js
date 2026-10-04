import dotenv from "dotenv";

import mongoose from "mongoose";

import connectDB from "../config/database.js";

import User from "../models/user.model.js";

import branchService from "../services/branch.service.js";


/*
============================================================
ENVIRONMENT
============================================================
*/

dotenv.config();


/*
============================================================
MIGRATION NAME
============================================================
*/

const MIGRATION_NAME =
    "Migrate existing users to MAIN branch";


/*
============================================================
NORMALIZE OBJECT ID
============================================================
*/

const normalizeObjectId = (
    value
) => {

    if (
        !value
    ) {

        return null;

    }


    const id =
        value?._id ||
        value;


    if (
        !mongoose.Types.ObjectId.isValid(
            id
        )
    ) {

        return null;

    }


    return String(
        id
    );

};


/*
============================================================
UNIQUE OBJECT IDS
============================================================
*/

const uniqueObjectIds = (
    values = []
) => {

    const ids =
        new Set();


    for (
        const value of
        values
    ) {

        const id =
            normalizeObjectId(
                value
            );


        if (
            id
        ) {

            ids.add(
                id
            );

        }

    }


    return [
        ...ids,
    ];

};


/*
============================================================
MIGRATE SINGLE USER
============================================================

Rules:

ADMIN
------------------------------------------------------------
- Admin keeps global branch access.
- branches is normalized to [].
- defaultBranch becomes MAIN only if missing/invalid.

NON-ADMIN
------------------------------------------------------------
- Existing branch assignments are preserved.
- If no branch assignment exists, MAIN is assigned.
- If defaultBranch is missing or not one of the assigned
  branches, MAIN is used when MAIN is assigned; otherwise
  the first assigned branch becomes default.

IMPORTANT
------------------------------------------------------------
The migration never deletes the user.
The migration never changes passwords.
The migration never changes permissions.
The migration never disables users.
============================================================
*/

const migrateUser =
    async (
        user,
        mainBranch
    ) => {

        let changed =
            false;


        const mainBranchId =
            String(
                mainBranch._id
            );


        /*
        ====================================================
        ADMIN USER
        ====================================================
        */

        if (
            user.role ===
            "admin"
        ) {

            /*
            Admin branch access is dynamic.

            We intentionally keep the stored branch list empty.
            */

            if (
                Array.isArray(
                    user.branches
                ) &&
                user.branches.length >
                    0
            ) {

                user.branches =
                    [];

                changed =
                    true;

            }


            const currentDefaultId =
                normalizeObjectId(
                    user.defaultBranch
                );


            /*
            Only assign MAIN when there is no usable default.

            We do not unnecessarily overwrite an existing
            valid branch ID during migration.
            */

            if (
                !currentDefaultId
            ) {

                user.defaultBranch =
                    mainBranch._id;

                changed =
                    true;

            }


            if (
                changed
            ) {

                await user.save();

            }


            return {

                changed,

                assignedMain:
                    false,

                defaultChanged:
                    !currentDefaultId,

            };

        }


        /*
        ====================================================
        NON-ADMIN USER
        ====================================================
        */

        let branchIds =
            uniqueObjectIds(
                user.branches ||
                []
            );


        let assignedMain =
            false;


        /*
        ====================================================
        NO BRANCH ASSIGNMENT
        ====================================================

        Existing single-store users are migrated to MAIN.
        ====================================================
        */

        if (
            branchIds.length ===
            0
        ) {

            user.branches = [
                mainBranch._id,
            ];


            branchIds = [
                mainBranchId,
            ];


            assignedMain =
                true;


            changed =
                true;

        }


        /*
        ====================================================
        DEFAULT BRANCH
        ====================================================
        */

        const existingDefaultId =
            normalizeObjectId(
                user.defaultBranch
            );


        const defaultBelongsToAssignedBranches =
            existingDefaultId &&
            branchIds.includes(
                existingDefaultId
            );


        let defaultChanged =
            false;


        if (
            !defaultBelongsToAssignedBranches
        ) {

            /*
            Prefer MAIN when MAIN is one of the user's
            assigned branches.

            Otherwise preserve the user's existing assignment
            and use the first assigned branch.
            */

            const selectedDefaultId =
                branchIds.includes(
                    mainBranchId
                )
                    ? mainBranchId
                    : branchIds[0];


            user.defaultBranch =
                selectedDefaultId;


            changed =
                true;


            defaultChanged =
                true;

        }


        /*
        ====================================================
        SAVE ONLY WHEN SOMETHING ACTUALLY CHANGED
        ====================================================

        This is what makes rerunning the migration safe.
        ====================================================
        */

        if (
            changed
        ) {

            await user.save();

        }


        return {

            changed,

            assignedMain,

            defaultChanged,

        };

    };


/*
============================================================
VERIFY MIGRATION
============================================================
*/

const verifyMigration =
    async (
        mainBranch
    ) => {

        const users =
            await User.find({})

                .select(
                    "_id username role branches defaultBranch"
                );


        const problems =
            [];


        for (
            const user of
            users
        ) {

            /*
            =================================================
            ADMIN
            =================================================
            */

            if (
                user.role ===
                "admin"
            ) {

                const defaultId =
                    normalizeObjectId(
                        user.defaultBranch
                    );


                if (
                    !defaultId
                ) {

                    problems.push({
                        userId:
                            String(
                                user._id
                            ),

                        username:
                            user.username,

                        issue:
                            "Admin has no valid defaultBranch.",
                    });

                }


                continue;

            }


            /*
            =================================================
            NON-ADMIN
            =================================================
            */

            const branchIds =
                uniqueObjectIds(
                    user.branches ||
                    []
                );


            if (
                branchIds.length ===
                0
            ) {

                problems.push({
                    userId:
                        String(
                            user._id
                        ),

                    username:
                        user.username,

                    issue:
                        "Non-admin user has no assigned branch.",
                });


                continue;

            }


            const defaultId =
                normalizeObjectId(
                    user.defaultBranch
                );


            if (
                !defaultId
            ) {

                problems.push({
                    userId:
                        String(
                            user._id
                        ),

                    username:
                        user.username,

                    issue:
                        "Non-admin user has no valid defaultBranch.",
                });


                continue;

            }


            if (
                !branchIds.includes(
                    defaultId
                )
            ) {

                problems.push({
                    userId:
                        String(
                            user._id
                        ),

                    username:
                        user.username,

                    issue:
                        "defaultBranch is not included in the user's branches.",
                });

            }

        }


        return {

            totalUsers:
                users.length,

            mainBranchId:
                String(
                    mainBranch._id
                ),

            problems,

        };

    };


/*
============================================================
RUN MIGRATION
============================================================
*/

const run =
    async () => {

        console.log(
            "============================================================"
        );

        console.log(
            `🚀 ${MIGRATION_NAME}`
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
        ENSURE MAIN EXISTS
        ====================================================
        */

        const mainBranch =
            await branchService
                .ensureDefaultBranch();


        console.log(
            `🏪 Default branch: ${mainBranch.name} (${mainBranch.code})`
        );

        console.log(
            `🆔 Branch ID: ${mainBranch._id}`
        );


        /*
        ====================================================
        LOAD USERS
        ====================================================
        */

        const users =
            await User.find({});


        console.log(
            `👥 Users found: ${users.length}`
        );


        /*
        ====================================================
        COUNTERS
        ====================================================
        */

        let changedUsers =
            0;


        let unchangedUsers =
            0;


        let usersAssignedMain =
            0;


        let defaultBranchesUpdated =
            0;


        let failedUsers =
            0;


        /*
        ====================================================
        PROCESS USERS ONE AT A TIME
        ====================================================

        We intentionally avoid Promise.all() here.

        Reasons:

        - easier to retry
        - easier to diagnose failures
        - prevents unnecessary database spikes
        - one failed user does not corrupt another user
        ====================================================
        */

        for (
            const user of
            users
        ) {

            try {

                const result =
                    await migrateUser(
                        user,
                        mainBranch
                    );


                if (
                    result.changed
                ) {

                    changedUsers +=
                        1;


                    console.log(
                        `✅ Updated: ${user.username} (${user.role})`
                    );

                } else {

                    unchangedUsers +=
                        1;


                    console.log(
                        `➖ Already valid: ${user.username} (${user.role})`
                    );

                }


                if (
                    result.assignedMain
                ) {

                    usersAssignedMain +=
                        1;

                }


                if (
                    result.defaultChanged
                ) {

                    defaultBranchesUpdated +=
                        1;

                }


            } catch (
                error
            ) {

                failedUsers +=
                    1;


                console.error(
                    `❌ Failed: ${user.username || user._id}`
                );

                console.error(
                    error.message
                );

            }

        }


        /*
        ====================================================
        VERIFY
        ====================================================
        */

        console.log(
            ""
        );

        console.log(
            "============================================================"
        );

        console.log(
            "🔍 VERIFYING MIGRATION"
        );

        console.log(
            "============================================================"
        );


        const verification =
            await verifyMigration(
                mainBranch
            );


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
            `Total users:               ${verification.totalUsers}`
        );

        console.log(
            `Updated users:             ${changedUsers}`
        );

        console.log(
            `Already valid:             ${unchangedUsers}`
        );

        console.log(
            `Assigned to MAIN:          ${usersAssignedMain}`
        );

        console.log(
            `Default branches updated:  ${defaultBranchesUpdated}`
        );

        console.log(
            `Processing failures:       ${failedUsers}`
        );

        console.log(
            `Verification problems:     ${verification.problems.length}`
        );


        /*
        ====================================================
        VERIFICATION FAILURE
        ====================================================
        */

        if (
            verification.problems.length >
            0
        ) {

            console.error(
                ""
            );

            console.error(
                "❌ Migration verification found problems:"
            );


            for (
                const problem of
                verification.problems
            ) {

                console.error(
                    `- ${problem.username || problem.userId}: ${problem.issue}`
                );

            }


            process.exitCode =
                1;


            return;

        }


        if (
            failedUsers >
            0
        ) {

            console.error(
                ""
            );

            console.error(
                "⚠️ Migration completed, but one or more users failed."
            );

            console.error(
                "Rerun the migration after fixing the reported error."
            );


            process.exitCode =
                1;


            return;

        }


        console.log(
            ""
        );

        console.log(
            "✅ User branch migration completed successfully."
        );

        console.log(
            "✅ Every non-admin user has an assigned branch."
        );

        console.log(
            "✅ Every user has a valid default branch reference."
        );


    };


/*
============================================================
START
============================================================
*/

try {

    await run();


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
        "❌ MIGRATION FAILED"
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

    /*
    ========================================================
    CLOSE DATABASE CONNECTION
    ========================================================
    */

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