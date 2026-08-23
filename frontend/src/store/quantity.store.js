import { create } from "zustand";

const useQuantityStore = create((set) => ({
    quantity: 1,

    quantityMode: false,

    setQuantity: (quantity) =>
        set({
            quantity,
        }),

    enableQuantityMode: () =>
        set({
            quantityMode: true,
            quantity: "",
        }),

    disableQuantityMode: () =>
        set({
            quantityMode: false,
        }),

    resetQuantity: () =>
        set({
            quantity: 1,
            quantityMode: false,
        }),
}));

export default useQuantityStore;