import { create } from "zustand";
import productService from "../services/product.service";

const useProductStore = create((set, get) => ({
    // ===========================
    // State
    // ===========================

    products: [],
    loading: false,

    search: "",
    selectedCategory: "All",

    modalOpen: false,
    selectedProduct: null,

    // ===========================
    // Search & Category
    // ===========================

    setSearch: (value) => {
        set({
            search: value,
        });
    },

    setSelectedCategory: (category) => {
        set({
            selectedCategory: category,
        });
    },

    // ===========================
    // Computed Products
    // ===========================

    filteredProducts: () => {
    const {
        products,
        search,
        selectedCategory,
    } = get();

    const keyword = search.toLowerCase();

    return products.filter((product) => {

        const matchesSearch =
            product.name.toLowerCase().includes(keyword) ||
            product.barcode.includes(keyword) ||
            product.category
                .toLowerCase()
                .includes(keyword);

        const matchesCategory =
            selectedCategory === "All" ||
            product.category === selectedCategory;

        return (
            matchesSearch &&
            matchesCategory
        );

    });
},

    // ===========================
    // Fetch Products
    // ===========================

    fetchProducts: async () => {
        try {
            set({ loading: true });

            const products =
                await productService.getProducts();

            set({
                products,
                loading: false,
            });

        } catch (error) {

            console.error(error);

            set({
                loading: false,
            });

        }
    },

    // ===========================
    // Create Product
    // ===========================

    createProduct: async (productData) => {
        try {
            set({ loading: true });

            await productService.createProduct(
                productData
            );

            await get().fetchProducts();

            set({
                loading: false,
                modalOpen: false,
            });

            return true;

        } catch (error) {

            set({
                loading: false,
            });

            throw error;

        }
    },

    // ===========================
    // Update Product
    // ===========================

    updateProduct: async (
        id,
        productData
    ) => {
        try {

            set({
                loading: true,
            });

            await productService.updateProduct(
                id,
                productData
            );

            await get().fetchProducts();

            set({
                loading: false,
                modalOpen: false,
                selectedProduct: null,
            });

        } catch (error) {

            set({
                loading: false,
            });

            throw error;

        }
    },

    // ===========================
    // Archive / Activate
    // ===========================

    updateStatus: async (
        id,
        isActive
    ) => {
        try {

            set({
                loading: true,
            });

            await productService.updateStatus(
                id,
                isActive
            );

            await get().fetchProducts();

            set({
                loading: false,
            });

        } catch (error) {

            set({
                loading: false,
            });

            throw error;

        }
    },

    // ===========================
    // Modal Controls
    // ===========================

    openCreateModal: () =>
        set({
            modalOpen: true,
            selectedProduct: null,
        }),

    openEditModal: (product) =>
        set({
            modalOpen: true,
            selectedProduct: product,
        }),

    closeModal: () =>
        set({
            modalOpen: false,
            selectedProduct: null,
        }),
}));

export default useProductStore;