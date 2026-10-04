import mongoose from "mongoose";

import Branch from "../models/branch.model.js";

import branchService from "./branch.service.js";

import syncOutboxService from "./syncOutbox.service.js";

import withTransaction from "../utils/withTransaction.js";

import ApiError from "../utils/ApiError.js";


/*
============================================================
NORMALIZE OBJECT ID
============================================================
*/

const normalizeObjectId =
    (
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
            !mongoose.Types.ObjectId
                .isValid(
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
UNIQUE IDS
============================================================
*/

const uniqueIds =
    (
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
VALIDATE BRANCH IDS
============================================================

Used when an Admin assigns branches to a user.

Every branch:
- must exist
- must currently be active
============================================================
*/

const validateBranchIds =
    async (
        branchIds = []
    ) => {

        const ids =
            uniqueIds(
                branchIds
            );


        if (
            ids.length ===
            0
        ) {

            return [];

        }


        const branches =
            await Branch.find({
                _id: {
                    $in:
                        ids,
                },

                isActive:
                    true,
            });


        if (
            branches.length !==
            ids.length
        ) {

            throw new ApiError(
                400,
                "One or more selected branches are invalid or inactive."
            );

        }


        return branches;

    };


/*
============================================================
QUEUE USER REPAIR SYNC
============================================================

Used only for automatic compatibility/repair writes performed
inside this service.

The User repair and SyncOutbox event participate in the SAME
local MongoDB transaction.

This means:

- if the User repair commits, the outbox event commits
- if the User repair rolls back, the outbox event rolls back
- cloud availability never affects the local operation
============================================================
*/

const enqueueUserRepairSync =
    async (
        user,
        session
    ) => {

        await syncOutboxService
            .enqueueSyncRequest({

                source:
                    "USER",

                action:
                    "BRANCH_ACCESS_REPAIR",

                aggregateId:
                    user._id,

                /*
                User is a global record.

                The assigned/default branches are stored on the
                User document, but the User itself is not owned
                by one branch.
                */

                branchId:
                    null,

                session,

            });

    };


/*
============================================================
ENSURE EXISTING USER HAS BRANCH
============================================================

Compatibility migration for users that existed before branch
management.

Existing users may have:

branches: undefined
defaultBranch: undefined

We safely assign a valid default branch.

Calling this repeatedly is safe.

IMPORTANT:

Automatic User repairs are performed transactionally together
with their persistent outbox event.
============================================================
*/

const ensureLegacyUserBranch =
    async (
        user
    ) => {

        if (
            !user
        ) {

            throw new ApiError(
                401,
                "User account could not be loaded."
            );

        }


        /*
        --------------------------------------------------------
        ENSURE THE SYSTEM HAS A DEFAULT BRANCH
        --------------------------------------------------------

        branchService.ensureDefaultBranch() owns its own branch
        repair transaction and BRANCH outbox event when needed.

        We deliberately call it BEFORE the User transaction so
        we do not create nested MongoDB transactions.
        --------------------------------------------------------
        */

        const mainBranch =
            await branchService
                .ensureDefaultBranch();


        /*
        --------------------------------------------------------
        DETERMINE WHETHER THIS USER ACTUALLY NEEDS REPAIR
        --------------------------------------------------------
        */

        const currentDefaultId =
            normalizeObjectId(
                user.defaultBranch
            );


        /*
        --------------------------------------------------------
        ADMIN
        --------------------------------------------------------

        Admins automatically have global branch access.

        Only their default branch needs compatibility repair.
        --------------------------------------------------------
        */

        if (
            user.role ===
            "admin"
        ) {

            if (
                currentDefaultId
            ) {

                return user;

            }


            return withTransaction(
                async (
                    session
                ) => {

                    /*
                    Reload inside the transaction.

                    Another request may have repaired the same
                    user between our initial check and now.
                    */

                    const currentUser =
                        await user.constructor
                            .findById(
                                user._id
                            )
                            .session(
                                session
                            );


                    if (
                        !currentUser
                    ) {

                        throw new ApiError(
                            401,
                            "User account could not be loaded."
                        );

                    }


                    const latestDefaultId =
                        normalizeObjectId(
                            currentUser.defaultBranch
                        );


                    /*
                    Another request already repaired it.
                    */

                    if (
                        latestDefaultId
                    ) {

                        return currentUser;

                    }


                    currentUser.defaultBranch =
                        mainBranch._id;


                    await currentUser.save({
                        session,
                    });


                    await enqueueUserRepairSync(
                        currentUser,
                        session
                    );


                    return currentUser;

                }
            );

        }


        /*
        --------------------------------------------------------
        NON-ADMIN

        Work out whether the currently loaded User appears to
        require compatibility repair before opening a write
        transaction.
        --------------------------------------------------------
        */

        const assignedIds =
            uniqueIds(
                user.branches ||
                []
            );


        const needsAssignedBranch =
            assignedIds.length ===
            0;


        const expectedAssignedIds =
            needsAssignedBranch
                ? [
                    String(
                        mainBranch._id
                    ),
                ]
                : assignedIds;


        const needsDefaultBranch =
            !currentDefaultId ||
            !expectedAssignedIds.includes(
                currentDefaultId
            );


        if (
            !needsAssignedBranch &&
            !needsDefaultBranch
        ) {

            return user;

        }


        /*
        --------------------------------------------------------
        PERFORM REPAIR ATOMICALLY
        --------------------------------------------------------
        */

        return withTransaction(
            async (
                session
            ) => {

                /*
                Reload the latest User document inside the
                transaction.

                This prevents us from blindly saving a stale
                request-time User document over a newer admin
                branch assignment.
                */

                const currentUser =
                    await user.constructor
                        .findById(
                            user._id
                        )
                        .session(
                            session
                        );


                if (
                    !currentUser
                ) {

                    throw new ApiError(
                        401,
                        "User account could not be loaded."
                    );

                }


                const latestAssignedIds =
                    uniqueIds(
                        currentUser.branches ||
                        []
                    );


                let changed =
                    false;


                /*
                Existing single-store user:
                assign the system default branch automatically.
                */

                if (
                    latestAssignedIds.length ===
                    0
                ) {

                    currentUser.branches = [
                        mainBranch._id,
                    ];

                    changed =
                        true;

                }


                const finalAssignedIds =
                    uniqueIds(
                        currentUser.branches ||
                        []
                    );


                const latestDefaultId =
                    normalizeObjectId(
                        currentUser.defaultBranch
                    );


                /*
                If there is no default branch, or the default no
                longer belongs to the assigned branches, choose
                the first assigned branch.
                */

                if (
                    !latestDefaultId ||
                    !finalAssignedIds.includes(
                        latestDefaultId
                    )
                ) {

                    currentUser.defaultBranch =
                        finalAssignedIds[0];

                    changed =
                        true;

                }


                /*
                Another request may already have completed the
                repair before this transaction acquired access.
                */

                if (
                    !changed
                ) {

                    return currentUser;

                }


                await currentUser.save({
                    session,
                });


                await enqueueUserRepairSync(
                    currentUser,
                    session
                );


                return currentUser;

            }
        );

    };


/*
============================================================
GET ACCESSIBLE BRANCHES
============================================================
*/

const getAccessibleBranches =
    async (
        user
    ) => {

        const resolvedUser =
            await ensureLegacyUserBranch(
                user
            );


        /*
        --------------------------------------------------------
        ADMIN

        Admin automatically sees every active branch.
        --------------------------------------------------------
        */

        if (
            resolvedUser.role ===
            "admin"
        ) {

            return Branch
                .find({
                    isActive:
                        true,
                })
                .sort({
                    isDefault:
                        -1,

                    name:
                        1,
                });

        }


        /*
        --------------------------------------------------------
        OTHER USERS
        --------------------------------------------------------
        */

        const branchIds =
            uniqueIds(
                resolvedUser.branches ||
                []
            );


        return Branch
            .find({
                _id: {
                    $in:
                        branchIds,
                },

                isActive:
                    true,
            })
            .sort({
                isDefault:
                    -1,

                name:
                    1,
            });

    };


/*
============================================================
BUILD BRANCH CONTEXT
============================================================
*/

const buildBranchContext =
    async (
        user
    ) => {

        let resolvedUser =
            await ensureLegacyUserBranch(
                user
            );


        const accessibleBranches =
            await getAccessibleBranches(
                resolvedUser
            );


        if (
            accessibleBranches.length ===
            0
        ) {

            throw new ApiError(
                403,
                "This account does not have access to an active branch."
            );

        }


        let defaultBranch =
            null;


        const defaultId =
            normalizeObjectId(
                resolvedUser.defaultBranch
            );


        if (
            defaultId
        ) {

            defaultBranch =
                accessibleBranches.find(
                    (
                        branch
                    ) =>
                        String(
                            branch._id
                        ) ===
                        defaultId
                ) ||
                null;

        }


        /*
        --------------------------------------------------------
        FALLBACK DEFAULT REPAIR
        --------------------------------------------------------

        This can happen when:

        - a previously assigned branch was disabled
        - branch access was changed
        - an old default is no longer accessible

        This is also a User write, so it must commit with an
        outbox event.
        --------------------------------------------------------
        */

        if (
            !defaultBranch
        ) {

            const fallbackBranch =
                accessibleBranches[0];


            resolvedUser =
                await withTransaction(
                    async (
                        session
                    ) => {

                        const currentUser =
                            await resolvedUser.constructor
                                .findById(
                                    resolvedUser._id
                                )
                                .session(
                                    session
                                );


                        if (
                            !currentUser
                        ) {

                            throw new ApiError(
                                401,
                                "User account could not be loaded."
                            );

                        }


                        currentUser.defaultBranch =
                            fallbackBranch._id;


                        await currentUser.save({
                            session,
                        });


                        await enqueueUserRepairSync(
                            currentUser,
                            session
                        );


                        return currentUser;

                    }
                );


            defaultBranch =
                fallbackBranch;

        }


        return {

            branches:
                accessibleBranches,

            defaultBranch,

        };

    };


/*
============================================================
USER CAN ACCESS BRANCH
============================================================
*/

const userCanAccessBranch =
    async (
        user,
        branchId
    ) => {

        const requestedId =
            normalizeObjectId(
                branchId
            );


        if (
            !requestedId
        ) {

            return false;

        }


        const accessibleBranches =
            await getAccessibleBranches(
                user
            );


        return accessibleBranches.some(
            (
                branch
            ) =>
                String(
                    branch._id
                ) ===
                requestedId
        );

    };


/*
============================================================
REQUIRE BRANCH ACCESS
============================================================

Checkout, reports, sales history, inventory, etc. call this
before using a branch supplied by the frontend.
============================================================
*/

const requireBranchAccess =
    async (
        user,
        branchId
    ) => {

        const allowed =
            await userCanAccessBranch(
                user,
                branchId
            );


        if (
            !allowed
        ) {

            throw new ApiError(
                403,
                "You do not have access to this branch."
            );

        }


        return Branch.findById(
            branchId
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    normalizeObjectId,

    uniqueIds,

    validateBranchIds,

    ensureLegacyUserBranch,

    getAccessibleBranches,

    buildBranchContext,

    userCanAccessBranch,

    requireBranchAccess,

};