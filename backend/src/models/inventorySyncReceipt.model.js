import mongoose from "mongoose";


const inventorySyncReceiptSchema =
    new mongoose.Schema(
        {
            eventId: {
                type: String,
                required: true,
                unique: true,
                index: true,
                trim: true,
            },

            cloudEventId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                index: true,
            },

            originNodeId: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },

            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
                index: true,
            },

            branch: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Branch",
                required: true,
                index: true,
            },

            quantityChange: {
                type: Number,
                required: true,
            },

            appliedAt: {
                type: Date,
                default: Date.now,
                required: true,
            },
        },
        {
            timestamps: true,
        }
    );


inventorySyncReceiptSchema.index({
    branch: 1,
    product: 1,
    appliedAt: -1,
});


const InventorySyncReceipt =
    mongoose.models.InventorySyncReceipt ||
    mongoose.model(
        "InventorySyncReceipt",
        inventorySyncReceiptSchema
    );


export default InventorySyncReceipt;
