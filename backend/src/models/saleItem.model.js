import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
    {
        sale: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sale",
            required: true,
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("SaleItem", saleItemSchema);