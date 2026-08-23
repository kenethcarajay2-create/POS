import mongoose from "mongoose";


const inventoryMovementSchema =
    new mongoose.Schema(
        {

            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },


            type: {
                type: String,
                enum: [
                    "RESTOCK",
                    "ADJUSTMENT",
                    "SALE",
                    "RETURN",
                ],
                required: true,
            },


            quantity: {
                type: Number,
                required: true,
            },


            previousStock: {
                type: Number,
                required: true,
                min: 0,
            },


            newStock: {
                type: Number,
                required: true,
                min: 0,
            },


            reason: {
                type: String,
                default: "",
                trim: true,
            },


            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },

        },
        {
            timestamps: true,
        }
    );


const InventoryMovement =
    mongoose.model(
        "InventoryMovement",
        inventoryMovementSchema
    );


export default InventoryMovement;