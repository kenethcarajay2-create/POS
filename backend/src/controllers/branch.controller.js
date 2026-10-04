import branchService from "../services/branch.service.js";

import branchAccessService from "../services/branch-access.service.js";

import ApiResponse from "../utils/ApiResponse.js";


/*
============================================================
GET ALL BRANCHES
============================================================

Admin only route.

Supports:

?includeInactive=true
============================================================
*/

const getBranches =
    async (
        req,
        res,
        next
    ) => {

        try {

            const includeInactive =
                req.query
                    .includeInactive ===
                "true";


            const branches =
                await branchService
                    .getBranches({
                        includeInactive,
                    });


            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Branches retrieved successfully.",
                    branches
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
GET ACCESSIBLE BRANCHES
============================================================

Returns the branches the CURRENT authenticated user may use.

Admin:
    all active branches

Other roles:
    explicitly assigned active branches
============================================================
*/

const getAccessibleBranches =
    async (
        req,
        res,
        next
    ) => {

        try {

            const branchContext =
                await branchAccessService
                    .buildBranchContext(
                        req.user
                    );


            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Accessible branches retrieved successfully.",
                    {
                        branches:
                            branchContext
                                .branches,

                        defaultBranch:
                            branchContext
                                .defaultBranch,
                    }
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
GET ACTIVE BRANCH CONTEXT
============================================================

Uses resolveActiveBranch middleware.

Useful for testing X-Branch-Id behavior before we connect
checkout, inventory, reports, etc.
============================================================
*/

const getActiveBranch =
    async (
        req,
        res,
        next
    ) => {

        try {

            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Active branch resolved successfully.",
                    {
                        activeBranch:
                            req.activeBranch,
                    }
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
GET DEFAULT BRANCH
============================================================
*/

const getDefaultBranch =
    async (
        req,
        res,
        next
    ) => {

        try {

            const branch =
                await branchService
                    .ensureDefaultBranch();


            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Default branch retrieved successfully.",
                    branch
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
GET BRANCH BY ID
============================================================
*/

const getBranchById =
    async (
        req,
        res,
        next
    ) => {

        try {

            const branch =
                await branchService
                    .getBranchById(
                        req.params.id
                    );


            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Branch retrieved successfully.",
                    branch
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
CREATE BRANCH
============================================================
*/

const createBranch =
    async (
        req,
        res,
        next
    ) => {

        try {

            const branch =
                await branchService
                    .createBranch(
                        req.body
                    );


            res.status(
                201
            ).json(
                new ApiResponse(
                    true,
                    "Branch created successfully.",
                    branch
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
UPDATE BRANCH
============================================================
*/

const updateBranch =
    async (
        req,
        res,
        next
    ) => {

        try {

            const branch =
                await branchService
                    .updateBranch(
                        req.params.id,
                        req.body
                    );


            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Branch updated successfully.",
                    branch
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
DISABLE BRANCH
============================================================
*/

const disableBranch =
    async (
        req,
        res,
        next
    ) => {

        try {

            const branch =
                await branchService
                    .disableBranch(
                        req.params.id
                    );


            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Branch disabled successfully.",
                    branch
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
ENABLE BRANCH
============================================================
*/

const enableBranch =
    async (
        req,
        res,
        next
    ) => {

        try {

            const branch =
                await branchService
                    .enableBranch(
                        req.params.id
                    );


            res.status(
                200
            ).json(
                new ApiResponse(
                    true,
                    "Branch enabled successfully.",
                    branch
                )
            );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    getBranches,

    getAccessibleBranches,

    getActiveBranch,

    getDefaultBranch,

    getBranchById,

    createBranch,

    updateBranch,

    disableBranch,

    enableBranch,

};