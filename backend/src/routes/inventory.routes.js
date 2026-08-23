import express from "express";
import inventoryController from "../controllers/inventory.controller.js";
import validate from "../middleware/validate.middleware.js";
import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import inventoryValidator from "../validators/inventory.validator.js";

const router = express.Router();

router.get(
    "/transactions",
    protect,
    authorize("admin"),
    inventoryController.getTransactions
);

router.post(
    "/stock-in",
    protect,
    authorize("admin"),
    validate(inventoryValidator.stockInSchema),
    inventoryController.stockIn
);

router.post(
    "/stock-out",
    protect,
    authorize("admin"),
    validate(inventoryValidator.stockOutSchema),
    inventoryController.stockOut
);
router.post(
    "/adjust",
    protect,
    authorize("admin"),
    validate(inventoryValidator.stockAdjustmentSchema),
    inventoryController.adjustStock
);

export default router;