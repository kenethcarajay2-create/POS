import Joi from "joi";

const pricingSchema = Joi.object({
    quantity: Joi.number()
        .min(1)
        .required(),

    price: Joi.number()
        .min(0)
        .required(),
});

const createProductSchema = Joi.object({
    barcode: Joi.string().trim().required(),

    name: Joi.string().trim().required(),

    description: Joi.string().allow("").optional(),

    category: Joi.string().required(),

    costPrice: Joi.number().min(0).required(),

    baseUnit: Joi.string().trim().required(),

    pricing: Joi.array()
        .items(pricingSchema)
        .min(1)
        .required(),

    stock: Joi.number().min(0).default(0),

    minimumStock: Joi.number().min(0).default(5),
});

const updateProductSchema = Joi.object({
    barcode: Joi.string().trim(),

    name: Joi.string().trim(),

    description: Joi.string().allow("").trim(),

    category: Joi.string().valid(
        "Beverages",
        "Snacks",
        "Canned Goods",
        "Frozen",
        "Household",
        "Personal Care",
        "Others"
    ),

    costPrice: Joi.number().min(0),

    baseUnit: Joi.string().trim(),

    pricing: Joi.array().items(pricingSchema),

    stock: Joi.number().min(0),

    minimumStock: Joi.number().integer().min(0),

    isActive: Joi.boolean(),
});

const updateProductStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

export default {
    createProductSchema,
    updateProductSchema,
    updateProductStatusSchema,
};