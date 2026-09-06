import Product from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";
import { Types } from "mongoose";
import Counter from "../models/counter.model.js";

/*
============================================================
GENERATE UNIQUE INTERNAL PRODUCT CODE
============================================================
*/

const generateUniqueBarcode =
    async () => {

        /*
        Atomic sequence increment.

        MongoDB guarantees that each successful increment
        receives a different number, even when multiple
        requests happen at the same time.
        */

        const counter =
            await Counter.findOneAndUpdate(
                {
                    _id:
                        "product_barcode",
                },
                {
                    $inc: {
                        sequence:
                            1,
                    },
                },
                {
                    new:
                        true,

                    upsert:
                        true,

                    setDefaultsOnInsert:
                        true,
                }
            )
                .lean();


        if (
            !counter ||
            !Number.isSafeInteger(
                counter.sequence
            ) ||
            counter.sequence <= 0
        ) {

            throw new ApiError(
                500,
                "Unable to generate product code."
            );

        }


        const sequence =
            String(
                counter.sequence
            )
                .padStart(
                    12,
                    "0"
                );


        const barcode =
            `PRD-${sequence}`;


        /*
        Defensive check.

        The atomic counter should already prevent generated
        duplicates, but the product collection's unique index
        is still the final protection.
        */

        const existing =
            await Product.exists({
                barcode,
            });


        if (
            existing
        ) {

            throw new ApiError(
                409,
                "Generated product code already exists."
            );

        }


        return barcode;

    };

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
const createProduct =
    async (
        productData
    ) => {

        const barcode =
            String(
                productData.barcode ||
                ""
            ).trim();


        if (
            !barcode
        ) {

            throw new ApiError(
                400,
                "Barcode is required."
            );

        }


        /*
        ========================================================
        FRIENDLY PRE-CHECK
        ========================================================
        */

        const existingProduct =
            await Product.findOne({
                barcode,
            })
                .select(
                    "_id barcode name"
                )
                .lean();


        if (
            existingProduct
        ) {

            throw new ApiError(
                409,
                "A product with this barcode already exists."
            );

        }


        productData.barcode =
            barcode;


        productData.pricing =
            validatePricing(
                productData.pricing
            );


        try {

            const product =
                await Product.create(
                    productData
                );


            return product;


        } catch (error) {

            /*
            ====================================================
            RACE-CONDITION PROTECTION

            MongoDB unique barcode index is the final guarantee.
            ====================================================
            */

            if (
                error?.code ===
                11000 &&
                (
                    error?.keyPattern
                        ?.barcode ||
                    error?.keyValue
                        ?.barcode
                )
            ) {

                throw new ApiError(
                    409,
                    "This barcode is already assigned to another product."
                );

            }


            throw error;

        }

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
const updateProduct =
    async (
        id,
        productData
    ) => {

        if (
            !Types.ObjectId.isValid(
                id
            )
        ) {

            throw new ApiError(
                400,
                "Invalid product ID."
            );

        }


        const product =
            await Product.findById(
                id
            );


        if (
            !product
        ) {

            throw new ApiError(
                404,
                "Product not found."
            );

        }


        if (
            productData.barcode
        ) {

            productData.barcode =
                String(
                    productData.barcode
                ).trim();


            if (
                productData.barcode !==
                product.barcode
            ) {

                const existing =
                    await Product.findOne({
                        barcode:
                            productData.barcode,

                        _id: {
                            $ne:
                                product._id,
                        },
                    })
                        .select("_id")
                        .lean();


                if (
                    existing
                ) {

                    throw new ApiError(
                        409,
                        "Another product already uses this barcode."
                    );

                }

            }

        }


        if (
            productData.pricing
        ) {

            productData.pricing =
                validatePricing(
                    productData.pricing
                );

        }


        Object.assign(
            product,
            productData
        );


        try {

            await product.save();


            return product;


        } catch (error) {

            if (
                error?.code ===
                11000 &&
                (
                    error?.keyPattern
                        ?.barcode ||
                    error?.keyValue
                        ?.barcode
                )
            ) {

                throw new ApiError(
                    409,
                    "Another product already uses this barcode."
                );

            }


            throw error;

        }

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
  getUnitPrice,
  generateUniqueBarcode
};
