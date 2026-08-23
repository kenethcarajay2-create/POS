import mongoose from "mongoose";
import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";
import ApiError from "../utils/ApiError.js";
import withTransaction from "../utils/withTransaction.js";

   const stockIn = async (data, userId) => {
    const { productId, quantity, remarks } = data;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new ApiError(400, "Invalid product ID.");
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new ApiError(404, "Product not found.");
    }

    if (!product.isActive) {
        throw new ApiError(400, "Cannot update an inactive product.");
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    product.stock = newStock;
    await product.save();

    const transaction = await InventoryTransaction.create({
        product: product._id,
        type: "STOCK_IN",
        quantity,
        previousStock,
        newStock,
        remarks,
        createdBy: userId,
    });

    return {
        product,
        transaction,
    };
};

const stockOut = async (data, userId) => {
    const { productId, quantity, remarks } = data;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new ApiError(400, "Invalid product ID.");
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new ApiError(404, "Product not found.");
    }

    if (!product.isActive) {
        throw new ApiError(400, "Cannot update an inactive product.");
    }

    if (product.stock < quantity) {
        throw new ApiError(
            400,
            "Insufficient stock."
        );
    }

    const previousStock = product.stock;
    const newStock = previousStock - quantity;

    product.stock = newStock;

    await product.save();

    const transaction = await InventoryTransaction.create({
        product: product._id,
        type: "STOCK_OUT",
        quantity,
        previousStock,
        newStock,
        remarks,
        createdBy: userId,
    });

    return {
        product,
        transaction,
    };
};
const adjustStock = async (data, userId) => {
    const { productId, newStock, remarks } = data;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new ApiError(400, "Invalid product ID.");
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new ApiError(404, "Product not found.");
    }

    if (!product.isActive) {
        throw new ApiError(400, "Cannot update an inactive product.");
    }

    const previousStock = product.stock;

    product.stock = newStock;

    await product.save();

    const transaction = await InventoryTransaction.create({
        product: product._id,
        type: "ADJUSTMENT",
        quantity: Math.abs(newStock - previousStock),
        previousStock,
        newStock,
        remarks,
        createdBy: userId,
    });

    return {
        product,
        transaction, adjustStock
    };
};

const getTransactions = async ({
    productId,
    type,
    limit = 50,
}) => {

    const filter = {};

    // Filter by product
    if (productId) {
        filter.product = productId;
    }

    // Filter by transaction type
    if (type) {
        filter.type = type;
    }

    const transactions =
        await InventoryTransaction.find(filter)
            .populate(
                "product",
                "name barcode"
            )
            .populate(
                "createdBy",
                "name username role"
            )
            .sort({
                createdAt: -1,
            })
            .limit(
                Number(limit) || 50
            );

    return transactions;
};

export default {
    stockIn,
    stockOut,
    adjustStock,
    getTransactions,
};