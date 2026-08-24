import express from "express";

import syncController from "../controllers/sync.controller.js";

import protect from "../middleware/auth.middleware.js";
import permit from "../middleware/permission.middleware.js";


const router = express.Router();


/*
============================================================
RUN CLOUD SYNC
============================================================
POST /api/sync
============================================================
*/

router.post(
    "/",
    protect,
    permit("settings"),
    syncController.syncNow
);


/*
============================================================
GET CLOUD SYNC STATUS
============================================================
GET /api/sync/status
============================================================
*/

router.get(
    "/status",
    protect,
    permit("settings"),
    syncController.getSyncStatus
);


export default router;