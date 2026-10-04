import express from "express";

import dashboardController from "../controllers/dashboard.controller.js";

import protect from "../middleware/auth.middleware.js";

import authorize from "../middleware/role.middleware.js";

import resolveActiveBranch from "../middleware/branch.middleware.js";


const router =
    express.Router();


router.get(
    "/",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    dashboardController
        .getDashboard
);


export default router;