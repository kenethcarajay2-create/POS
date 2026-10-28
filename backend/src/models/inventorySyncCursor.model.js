import mongoose from "mongoose";


const inventorySyncCursorSchema =
    new mongoose.Schema(
        {
            key: {
                type: String,
                required: true,
                unique: true,
                index: true,
                trim: true,
            },

            lastCloudEventId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
        },
        {
            timestamps: true,
        }
    );


const InventorySyncCursor =
    mongoose.models.InventorySyncCursor ||
    mongoose.model(
        "InventorySyncCursor",
        inventorySyncCursorSchema
    );


export default InventorySyncCursor;
