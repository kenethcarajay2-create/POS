import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        type: {
            type: String,
            enum: [
                "STOCK_IN",
                "STOCK_OUT",
                "ADJUSTMENT",
                "SALE",
            ],
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        previousStock: {
            type: Number,
            required: true,
        },

        newStock: {
            type: Number,
            required: true,
        },

        remarks: {
            type: String,
            default: "",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "InventoryTransaction",
    inventoryTransactionSchema
);