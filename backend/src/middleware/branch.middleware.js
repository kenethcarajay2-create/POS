import ApiError from "../utils/ApiError.js";

import branchAccessService from "../services/branch-access.service.js";


/*
============================================================
RESOLVE ACTIVE BRANCH
============================================================

This middleware determines which branch the current request
is operating on.

Expected flow:

protect
    ↓
req.user
req.accessibleBranches
req.defaultBranch
    ↓
resolveActiveBranch
    ↓
req.activeBranch
req.branchId


The frontend MAY send:

X-Branch-Id: <branch ObjectId>

But the backend never trusts that value without validating
that the current user actually has access to that branch.
============================================================
*/

const resolveActiveBranch =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            ====================================================
            REQUIRE AUTHENTICATED USER
            ====================================================
            */

            if (
                !req.user
            ) {

                throw new ApiError(
                    401,
                    "Authentication is required before resolving a branch."
                );

            }


            /*
            ====================================================
            READ REQUESTED BRANCH
            ====================================================

            Express converts header names to lowercase.

            Supported header:

            X-Branch-Id
            ====================================================
            */

            const requestedBranchId =
                req.headers[
                    "x-branch-id"
                ];


            /*
            ====================================================
            HEADER SUPPLIED
            ====================================================

            If the client explicitly requests a branch,
            validate it against the CURRENT user's access.
            ====================================================
            */

            if (
                requestedBranchId
            ) {

                const normalizedBranchId =
                    branchAccessService
                        .normalizeObjectId(
                            requestedBranchId
                        );


                if (
                    !normalizedBranchId
                ) {

                    throw new ApiError(
                        400,
                        "Invalid X-Branch-Id header."
                    );

                }


                const branch =
                    await branchAccessService
                        .requireBranchAccess(
                            req.user,
                            normalizedBranchId
                        );


                if (
                    !branch
                ) {

                    throw new ApiError(
                        404,
                        "Branch not found."
                    );

                }


                if (
                    branch.isActive ===
                    false
                ) {

                    throw new ApiError(
                        403,
                        "The selected branch is inactive."
                    );

                }


                /*
                =================================================
                ATTACH ACTIVE BRANCH
                =================================================
                */

                req.activeBranch =
                    branch;


                req.branchId =
                    branch._id;


                return next();

            }


            /*
            ====================================================
            NO HEADER
            ====================================================

            Use the branch context already resolved by the
            protect middleware whenever possible.
            ====================================================
            */

            let defaultBranch =
                req.defaultBranch;


            /*
            ====================================================
            FALLBACK
            ====================================================

            Defensive fallback in case this middleware is ever
            used after protect but req.defaultBranch was not
            populated for some reason.
            ====================================================
            */

            if (
                !defaultBranch
            ) {

                const branchContext =
                    await branchAccessService
                        .buildBranchContext(
                            req.user
                        );


                defaultBranch =
                    branchContext
                        .defaultBranch;

            }


            if (
                !defaultBranch
            ) {

                throw new ApiError(
                    403,
                    "This account does not have a default branch."
                );

            }


            if (
                defaultBranch.isActive ===
                    false
            ) {

                throw new ApiError(
                    403,
                    "The default branch is inactive."
                );

            }


            /*
            ====================================================
            ATTACH DEFAULT ACTIVE BRANCH
            ====================================================
            */

            req.activeBranch =
                defaultBranch;


            req.branchId =
                defaultBranch._id;


            next();


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


export default resolveActiveBranch;