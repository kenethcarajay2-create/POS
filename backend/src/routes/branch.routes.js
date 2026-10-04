import express from "express";

import branchController from "../controllers/branch.controller.js";

import protect from "../middleware/auth.middleware.js";

import authorize from "../middleware/role.middleware.js";

import resolveActiveBranch from "../middleware/branch.middleware.js";


const router =
    express.Router();


/*
============================================================
ACCESSIBLE BRANCHES
============================================================
*/

router.get(
    "/accessible",
    protect,
    branchController
        .getAccessibleBranches
);


/*
============================================================
ACTIVE BRANCH
============================================================
*/

router.get(
    "/active",
    protect,
    resolveActiveBranch,
    branchController
        .getActiveBranch
);


/*
============================================================
DEFAULT BRANCH
============================================================
*/

router.get(
    "/default",
    protect,
    branchController
        .getDefaultBranch
);


/*
============================================================
ADMIN - GET ALL BRANCHES
============================================================
*/

router.get(
    "/",
    protect,
    authorize(
        "admin"
    ),
    branchController
        .getBranches
);


/*
============================================================
ADMIN - GET BRANCH BY ID
============================================================
*/

router.get(
    "/:id",
    protect,
    authorize(
        "admin"
    ),
    branchController
        .getBranchById
);


/*
============================================================
ADMIN - CREATE BRANCH
============================================================
*/

router.post(
    "/",
    protect,
    authorize(
        "admin"
    ),
    branchController
        .createBranch
);


/*
============================================================
ADMIN - UPDATE BRANCH
============================================================
*/

router.patch(
    "/:id",
    protect,
    authorize(
        "admin"
    ),
    branchController
        .updateBranch
);


/*
============================================================
ADMIN - DISABLE BRANCH
============================================================
*/

router.patch(
    "/:id/disable",
    protect,
    authorize(
        "admin"
    ),
    branchController
        .disableBranch
);


/*
============================================================
ADMIN - ENABLE BRANCH
============================================================
*/

router.patch(
    "/:id/enable",
    protect,
    authorize(
        "admin"
    ),
    branchController
        .enableBranch
);


export default router;