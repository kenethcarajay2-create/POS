import {
    useEffect,
    useRef,
} from "react";

import useProductStore
    from "../../store/product.store";

import useCartStore
    from "../../store/cart.store";

import preparedCartService
    from "../../services/preparedCart.service";


const PREPARED_CART_PREFIX =
    "POSCART:";


function BarcodeScanner({
    onNotFound,
    onPreparedCartLoaded,
    onPreparedCartError,
}) {

    const products =
        useProductStore(
            (
                state
            ) =>
                state.products
        );


    const setSearch =
        useProductStore(
            (
                state
            ) =>
                state.setSearch
        );


    const addItem =
        useCartStore(
            (
                state
            ) =>
                state.addItem
        );


    const importPreparedCart =
        useCartStore(
            (
                state
            ) =>
                state.importPreparedCart
        );


    const items =
        useCartStore(
            (
                state
            ) =>
                state.items
        );


    const preparedCart =
        useCartStore(
            (
                state
            ) =>
                state.preparedCart
        );


    /*
    ============================================================
    SCANNER STATE
    ============================================================
    */

    const mode =
        useRef(
            "NORMAL"
        );


    const quantity =
        useRef(
            1
        );


    const quantityBuffer =
        useRef(
            ""
        );


    const barcodeBuffer =
        useRef(
            ""
        );


    const quantityTimer =
        useRef(
            null
        );


    const processingPreparedCart =
        useRef(
            false
        );


    const recoveryAttempted =
        useRef(
            false
        );


    /*
    ============================================================
    LATEST CART STATE
    ============================================================
    */

    const itemsRef =
        useRef(
            items
        );


    const preparedCartRef =
        useRef(
            preparedCart
        );


    useEffect(
        () => {

            itemsRef.current =
                items;

        },
        [
            items,
        ]
    );


    useEffect(
        () => {

            preparedCartRef.current =
                preparedCart;

        },
        [
            preparedCart,
        ]
    );


    /*
    ============================================================
    RESET SCANNER
    ============================================================
    */

    const resetScanner =
        () => {

            barcodeBuffer.current =
                "";

            quantity.current =
                1;

            quantityBuffer.current =
                "";

            mode.current =
                "NORMAL";

        };


    /*
    ============================================================
    IMPORT CLAIM RESULT
    ============================================================
    */

    const importClaimResult =
        async (
            claimedCart
        ) => {

            /*
            Save claim BEFORE importing.

            If the page crashes immediately after the cloud
            claim succeeds, Ctrl+R can still recover it.
            */

            preparedCartService
                .saveRecoveryClaim({

                    preparedCartId:
                        claimedCart
                            .preparedCartId,

                    claimToken:
                        claimedCart
                            .claimToken,

                });


            const imported =
                importPreparedCart(
                    claimedCart
                );


            if (
                imported
            ) {

                return true;

            }


            /*
            Local cart changed while cloud request was in
            flight.

            Release the claim if possible.
            */

            try {

                await preparedCartService
                    .releasePreparedCart(

                        claimedCart
                            .preparedCartId,

                        claimedCart
                            .claimToken

                    );


                preparedCartService
                    .clearRecoveryClaim();


            } catch (
                releaseError
            ) {

                /*
                Keep recovery credentials.

                If release failed because of a network problem,
                losing the token would strand the CLAIMED cart.
                */

                console.warn(
                    "Unable to release PreparedCart after import failure:",
                    releaseError
                );

            }


            return false;

        };


    /*
    ============================================================
    PROCESS NEW QR CLAIM
    ============================================================
    */

    const processPreparedCart =
        async (
            qrPayload
        ) => {

            if (
                processingPreparedCart.current
            ) {

                return;

            }


            if (
                itemsRef.current.length >
                    0 ||
                preparedCartRef.current
            ) {

                onPreparedCartError?.(
                    "Clear or complete the current cart before scanning a mobile order."
                );


                return;

            }


            processingPreparedCart.current =
                true;


            try {

                const claimedCart =
                    await preparedCartService
                        .claimPreparedCart(
                            qrPayload
                        );


                const imported =
                    await importClaimResult(
                        claimedCart
                    );


                if (
                    !imported
                ) {

                    onPreparedCartError?.(
                        "The mobile order was claimed but could not be loaded because the desktop cart changed."
                    );


                    return;

                }


                onPreparedCartLoaded?.(
                    claimedCart
                );


            } catch (
                error
            ) {

                onPreparedCartError?.(
                    error?.response
                        ?.data
                        ?.message ||
                    error?.message ||
                    "Unable to load mobile prepared cart."
                );


            } finally {

                processingPreparedCart.current =
                    false;

            }

        };


    /*
    ============================================================
    AUTO-RECOVER AFTER REFRESH
    ============================================================
    */

    useEffect(
        () => {

            if (
                recoveryAttempted.current
            ) {

                return;

            }


            recoveryAttempted.current =
                true;


            const recover =
                async () => {

                    const recoveryClaim =
                        preparedCartService
                            .getRecoveryClaim();


                    if (
                        !recoveryClaim
                    ) {

                        return;

                    }


                    /*
                    If something already rebuilt the cart, do
                    not overwrite it.
                    */

                    if (
                        itemsRef.current.length >
                            0 ||
                        preparedCartRef.current
                    ) {

                        return;

                    }


                    processingPreparedCart.current =
                        true;


                    try {

                        const recoveredCart =
                            await preparedCartService
                                .recoverPreparedCart(

                                    recoveryClaim
                                        .preparedCartId,

                                    recoveryClaim
                                        .claimToken

                                );


                        const imported =
                            importPreparedCart(
                                recoveredCart
                            );


                        if (
                            !imported
                        ) {

                            return;

                        }


                        onPreparedCartLoaded?.({

                            ...recoveredCart,

                            recovered:
                                true,

                        });


                    } catch (
                        error
                    ) {

                        const status =
                            error?.response
                                ?.status;


                        /*
                        ------------------------------------------------
                        TERMINAL RECOVERY RESULTS
                        ------------------------------------------------

                        404:
                            cart no longer exists

                        409:
                            consumed/cancelled/local sale already
                            committed/claim no longer belongs here

                        410:
                            expired

                        In these cases the saved credential must not
                        keep retrying forever after every refresh.

                        503/network errors are intentionally retained.
                        ------------------------------------------------
                        */

                        if (
                            status ===
                                404 ||
                            status ===
                                409 ||
                            status ===
                                410
                        ) {

                            preparedCartService
                                .clearRecoveryClaim();

                        }


                        onPreparedCartError?.(
                            error?.response
                                ?.data
                                ?.message ||
                            error?.message ||
                            "Unable to recover the mobile order."
                        );


                    } finally {

                        processingPreparedCart.current =
                            false;

                    }

                };


            recover();

        },
        [
            importPreparedCart,
            onPreparedCartLoaded,
            onPreparedCartError,
        ]
    );


    /*
    ============================================================
    GLOBAL BARCODE LISTENER
    ============================================================
    */

    useEffect(
        () => {

            const handleKeyDown =
                (
                    event
                ) => {

                    /*
                    =============================================
                    F7 QUANTITY MODE
                    =============================================
                    */

                    if (
                        event.key ===
                        "F7"
                    ) {

                        event.preventDefault();


                        mode.current =
                            "QUANTITY";


                        quantityBuffer.current =
                            "";


                        console.log(
                            "Enter Quantity..."
                        );


                        return;

                    }


                    /*
                    =============================================
                    ESCAPE
                    =============================================
                    */

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        resetScanner();


                        console.log(
                            "Cancelled"
                        );


                        return;

                    }


                    /*
                    =============================================
                    QUANTITY MODE
                    =============================================
                    */

                    if (
                        mode.current ===
                        "QUANTITY"
                    ) {

                        if (
                            /^[0-9]$/
                                .test(
                                    event.key
                                )
                        ) {

                            quantityBuffer.current +=
                                event.key;


                            console.log(
                                "Qty:",
                                quantityBuffer.current
                            );


                            clearTimeout(
                                quantityTimer.current
                            );


                            quantityTimer.current =
                                setTimeout(
                                    () => {

                                        quantity.current =
                                            Number(
                                                quantityBuffer.current
                                            ) ||
                                            1;


                                        mode.current =
                                            "WAIT_SCAN";


                                        console.log(
                                            "Waiting for barcode..."
                                        );

                                    },
                                    500
                                );

                        }


                        return;

                    }


                    /*
                    =============================================
                    ENTER - SCAN COMPLETE
                    =============================================
                    */

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        if (
                            !barcodeBuffer.current
                        ) {

                            return;

                        }


                        event.preventDefault();

                        event.stopImmediatePropagation();


                        const scannedValue =
                            barcodeBuffer.current
                                .trim();


                        /*
                        IMPORTANT:

                        Save quantity BEFORE resetScanner().
                        */

                        const scannedQuantity =
                            quantity.current;


                        resetScanner();


                        /*
                        =========================================
                        PREPARED CART
                        =========================================
                        */

                        if (
                            scannedValue.startsWith(
                                PREPARED_CART_PREFIX
                            )
                        ) {

                            processPreparedCart(
                                scannedValue
                            );


                            return;

                        }


                        /*
                        =========================================
                        NORMAL PRODUCT BARCODE
                        =========================================
                        */

                        setSearch(
                            scannedValue
                        );


                        const product =
                            products.find(
                                (
                                    productItem
                                ) =>

                                    String(
                                        productItem.barcode
                                    ).trim() ===
                                    scannedValue
                            );


                        if (
                            product
                        ) {

                            addItem(
                                product,
                                scannedQuantity
                            );


                            console.log(
                                `Added ${product.name} x${scannedQuantity}`
                            );


                            return;

                        }


                        console.log(
                            "Product not found:",
                            scannedValue
                        );


                        onNotFound?.(
                            scannedValue
                        );


                        return;

                    }


                    /*
                    =============================================
                    BARCODE CHARACTERS
                    =============================================
                    */

                    if (
                        mode.current ===
                            "NORMAL" ||
                        mode.current ===
                            "WAIT_SCAN"
                    ) {

                        if (
                            event.key.length ===
                            1
                        ) {

                            barcodeBuffer.current +=
                                event.key;

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

        },
        [
            products,
            addItem,
            setSearch,
            onNotFound,
        ]
    );


    return null;

}


export default BarcodeScanner;