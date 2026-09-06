import mongoose from "mongoose";

const productSchema =
    new mongoose.Schema(
        {
            barcode: {
                type: String,
                required: true,
                unique: true,
                trim: true,
            },

            name: {
                type: String,
                required: true,
                trim: true,
            },

            description: {
                type: String,
                default: "",
                trim: true,
            },

            category: {
                type: String,
                enum: [
                    "Beverages",
                    "Snacks",
                    "Canned Goods",
                    "Frozen",
                    "Household",
                    "Personal Care",
                    "Others",
                ],
                default: "Others",
            },

            costPrice: {
                type: Number,
                required: true,
                min: 0,
            },

            baseUnit: {
                type: String,
                required: true,
                default: "Piece",
                trim: true,
            },

            pricing: [
                {
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
                },
            ],

            stock: {
                type: Number,
                default: 0,
                min: 0,
            },

            minimumStock: {
                type: Number,
                default: 5,
                min: 0,
            },

            isActive: {
                type: Boolean,
                default: true,
            },
        },
        {
            timestamps: true,
        }
    );

const Product =
    mongoose.model(
        "Product",
        productSchema
    );

export default Product;