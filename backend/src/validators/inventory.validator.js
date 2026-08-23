import Joi from "joi";

const stockInSchema = Joi.object({
    productId: Joi.string().required(),

    quantity: Joi.number()
        .integer()
        .positive()
        .required(),

    remarks: Joi.string()
        .allow("")
        .default(""),
});

const stockOutSchema = Joi.object({
    productId: Joi.string().required(),

    quantity: Joi.number()
        .integer()
        .positive()
        .required(),

    remarks: Joi.string()
        .allow("")
        .default(""),
});

const stockAdjustmentSchema = Joi.object({
    productId: Joi.string().required(),

    newStock: Joi.number()
        .integer()
        .min(0)
        .required(),

    remarks: Joi.string()
        .allow("")
        .default(""),
});

export default {
    stockInSchema, stockOutSchema, stockAdjustmentSchema
};