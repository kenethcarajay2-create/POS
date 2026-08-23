import { useEffect, useRef } from "react";

import useProductStore from "../../store/product.store";
import useCartStore from "../../store/cart.store";

function BarcodeScanner({ onNotFound }) {

    const products = useProductStore(
        (state) => state.products
    );

    const setSearch = useProductStore(
        (state) => state.setSearch
    );

    const addItem = useCartStore(
        (state) => state.addItem
    );


    // NORMAL
    // QUANTITY
    // WAIT_SCAN

    const mode = useRef("NORMAL");

    const quantity = useRef(1);

    const quantityBuffer = useRef("");

    const barcodeBuffer = useRef("");

    const quantityTimer = useRef(null);


    useEffect(() => {

        const handleKeyDown = (e) => {

            // =================================
            // F7 - QUANTITY MODE
            // =================================

            if (e.key === "F7") {

                e.preventDefault();

                mode.current = "QUANTITY";

                quantityBuffer.current = "";

                console.log(
                    "Enter Quantity..."
                );

                return;
            }


            // =================================
            // ESC - CANCEL
            // =================================

            if (e.key === "Escape") {

                mode.current = "NORMAL";

                quantity.current = 1;

                quantityBuffer.current = "";

                barcodeBuffer.current = "";

                console.log("Cancelled");

                return;
            }


            // =================================
            // QUANTITY MODE
            // =================================

            if (
                mode.current === "QUANTITY"
            ) {

                if (
                    /^[0-9]$/.test(e.key)
                ) {

                    quantityBuffer.current +=
                        e.key;

                    console.log(
                        "Qty:",
                        quantityBuffer.current
                    );

                    clearTimeout(
                        quantityTimer.current
                    );

                    quantityTimer.current =
                        setTimeout(() => {

                            quantity.current =
                                Number(
                                    quantityBuffer.current
                                ) || 1;

                            mode.current =
                                "WAIT_SCAN";

                            console.log(
                                "Waiting for barcode..."
                            );

                        }, 500);

                }

                return;
            }


            // =================================
            // ENTER - BARCODE COMPLETE
            // =================================

            if (e.key === "Enter") {

                if (
                    !barcodeBuffer.current
                ) {
                    return;
                }

                e.preventDefault();

                // Prevent ProductGrid from
                // also processing this Enter.
                e.stopImmediatePropagation();


                const scannedBarcode =
                    barcodeBuffer.current.trim();


                // ---------------------------------
                // SHOW BARCODE IN SEARCH BAR
                // ---------------------------------

                setSearch(
                    scannedBarcode
                );


                // ---------------------------------
                // FIND PRODUCT
                // ---------------------------------

                const product =
                    products.find(
                        (p) =>
                            String(
                                p.barcode
                            ).trim() ===
                            scannedBarcode
                    );


                // ---------------------------------
                // PRODUCT FOUND
                // ---------------------------------

                if (product) {

                    addItem(
                        product,
                        quantity.current
                    );

                    console.log(
                        `Added ${product.name} x${quantity.current}`
                    );

                }


                // ---------------------------------
                // PRODUCT NOT FOUND
                // ---------------------------------

                else {

                    console.log(
                        "Product not found:",
                        scannedBarcode
                    );

                    if (onNotFound) {

                        onNotFound(
                            scannedBarcode
                        );

                    }

                }


                // ---------------------------------
                // RESET
                // ---------------------------------

                barcodeBuffer.current = "";

                quantity.current = 1;

                quantityBuffer.current = "";

                mode.current = "NORMAL";

                return;
            }


            // =================================
            // BARCODE CHARACTERS
            // =================================

            if (
                mode.current === "NORMAL" ||
                mode.current === "WAIT_SCAN"
            ) {

                if (
                    e.key.length === 1
                ) {

                    barcodeBuffer.current +=
                        e.key;

                }

            }

        };


        window.addEventListener(
            "keydown",
            handleKeyDown
        );


        return () => {

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );

            clearTimeout(
                quantityTimer.current
            );

        };

    }, [
        products,
        addItem,
        setSearch,
        onNotFound,
    ]);


    return null;
}

export default BarcodeScanner;