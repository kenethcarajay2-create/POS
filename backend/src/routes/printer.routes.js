import express from "express";

import printerController
    from "../controllers/printer.controller.js";

const router = express.Router();

router.post(
    "/test",
    printerController.testPrint
);
router.post(
    "/cash-drawer",
    
   
    printerController.openCashDrawer
);

export default router;