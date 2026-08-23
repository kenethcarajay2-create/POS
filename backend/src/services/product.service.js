import Product from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";
import { Types } from "mongoose";

const validatePricing = (pricing) => {
  if (!pricing || pricing.length === 0) {
    throw new ApiError(400, "At least one pricing option is required.");
  }

  const quantities = pricing.map((p) => p.quantity);

  if (!quantities.includes(1)) {
    throw new ApiError(400, "Pricing must include quantity 1.");
  }

  const duplicates = quantities.filter(
    (q, index) => quantities.indexOf(q) !== index,
  );

  if (duplicates.length > 0) {
    throw new ApiError(400, "Duplicate pricing quantities are not allowed.");
  }

  pricing.sort((a, b) => a.quantity - b.quantity);

  return pricing;
};
const getUnitPrice = (pricing, quantity) => {

    let selectedPrice = pricing[0].price;

    for (const tier of pricing) {

        if (quantity >= tier.quantity) {
            selectedPrice = tier.price;
        } else {
            break;
        }

    }

    return selectedPrice;

};

const createProduct = async (productData) => {
  const existingProduct = await Product.findOne({
    barcode: productData.barcode,
  });

  if (existingProduct) {
    throw new ApiError(409, "A product with this barcode already exists.");
  }

  productData.pricing = validatePricing(productData.pricing);

  const product = await Product.create(productData);

  return product;
};

const getProducts = async () => {
  const products = await Product.find().sort({ createdAt: -1 });

  return products;
};

const getProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid product ID.");
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  return product;
};

const updateProduct = async (id, productData) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid product ID.");
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  if (productData.barcode && productData.barcode !== product.barcode) {
    const existing = await Product.findOne({
      barcode: productData.barcode,
      _id: { $ne: id },
    });

    if (existing) {
      throw new ApiError(409, "Another product already uses this barcode.");
    }
  }

  if (productData.pricing) {
    productData.pricing = validatePricing(productData.pricing);
  }

  Object.assign(product, productData);

  await product.save();

  return product;
};
const updateProductStatus = async (id, isActive) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid product ID.");
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  product.isActive = isActive;

  await product.save();

  return product;
};

export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  getUnitPrice
};
