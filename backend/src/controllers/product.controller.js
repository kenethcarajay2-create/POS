import productService from "../services/product.service.js";
import ApiResponse from "../utils/ApiResponse.js";

const createProduct = async (req, res, next) => {
    try {
        const product = await productService.createProduct(req.body);

        res.status(201).json(
            new ApiResponse(
                true,
                "Product created successfully",
                product
            )
        );
    } catch (error) {
        next(error);
    }
};

const getProducts = async (req, res, next) => {
    try {
        const products = await productService.getProducts();

        res.status(200).json(
            new ApiResponse(
                true,
                "Products retrieved successfully",
                products
            )
        );
    } catch (error) {
        next(error);
    }
};

const getProductById = async (req, res, next) => {
    try {
        const product = await productService.getProductById(req.params.id);

        res.status(200).json(
            new ApiResponse(
                true,
                "Product retrieved successfully",
                product
            )
        );
    } catch (error) {
        next(error);
    }
};
const updateProduct = async (req, res, next) => {
    try {

        const product = await productService.updateProduct(
            req.params.id,
            req.body
        );

        res.status(200).json(
            new ApiResponse(
                true,
                "Product updated successfully",
                product
            )
        );

    } catch (error) {
        next(error);
    }
};

const updateProductStatus = async (req, res, next) => {
    try {
        const product = await productService.updateProductStatus(
            req.params.id,
            req.body.isActive
        );

        res.status(200).json(
            new ApiResponse(
                true,
                "Product status updated successfully",
                product
            )
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    updateProductStatus
};