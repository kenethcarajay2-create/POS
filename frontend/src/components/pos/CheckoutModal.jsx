import { useEffect, useMemo, useState } from "react";

function CheckoutModal({
    open,
    subtotal,
    onClose,
    onComplete,
}) {

    const [cashReceived, setCashReceived] =
        useState("");

    const [printReceipt, setPrintReceipt] =
        useState(true);


    // =========================================
    // RESET WHEN MODAL OPENS
    // =========================================

    useEffect(() => {

        if (open) {

            setCashReceived("");

            // Receipt printing ON by default
            setPrintReceipt(true);

        }

    }, [open]);


    // =========================================
    // CALCULATE CHANGE
    // =========================================

    const change = useMemo(() => {

        const cash =
            parseFloat(cashReceived);

        if (isNaN(cash)) {
            return 0;
        }

        return Math.max(
            cash - subtotal,
            0
        );

    }, [
        cashReceived,
        subtotal,
    ]);


    // =========================================
    // COMPLETE SALE
    // =========================================

    const completeSale = () => {

        const cash =
            parseFloat(
                cashReceived || 0
            );


        // Don't complete if payment
        // is insufficient

        if (cash < subtotal) {
            return;
        }


        onComplete({

            cashReceived: cash,

            change,

            printReceipt,

        });

    };


    // =========================================
    // ENTER KEY
    // =========================================

   useEffect(() => {

    if (!open) return;


    const handleKeyboard = (e) => {

        // =========================================
        // CHECKOUT MODAL HAS KEYBOARD CONTROL
        // =========================================

        // Always prevent the POS global keyboard
        // handlers from receiving these events.

        if (
            e.key === "Enter" ||
            /^[0-9]$/.test(e.key) ||
            e.key === "Backspace" ||
            e.key === "Delete" ||
            e.key === "." ||
            e.key === "Escape"
        ) {

            e.stopPropagation();

        }


        // =========================================
        // ENTER = COMPLETE SALE
        // =========================================

        if (e.key === "Enter") {

            e.preventDefault();

            const cash =
                parseFloat(
                    cashReceived || 0
                );


            // Don't complete if payment
            // is insufficient.

            if (cash < subtotal) {
                return;
            }


            completeSale();

        }

    };


    // Capture phase
    window.addEventListener(
        "keydown",
        handleKeyboard,
        true
    );


    return () => {

        window.removeEventListener(
            "keydown",
            handleKeyboard,
            true
        );

    };

}, [
    open,
    cashReceived,
    subtotal,
    completeSale,
]); 


    // =========================================
    // HIDDEN
    // =========================================

    if (!open) {
        return null;
    }


    return (
        <dialog className="modal modal-open">

            <div className="modal-box max-w-lg">


                {/* ==========================
                    HEADER
                =========================== */}

                <h2 className="
                    font-bold
                    text-2xl
                    mb-6
                ">
                    Checkout
                </h2>


                <div className="space-y-5">


                    {/* ==========================
                        TOTAL
                    =========================== */}

                    <div className="
                        flex
                        justify-between
                        text-xl
                    ">

                        <span>
                            Total
                        </span>

                        <span className="
                            font-bold
                        ">
                            ₱{subtotal.toFixed(2)}
                        </span>

                    </div>


                    {/* ==========================
                        CASH RECEIVED
                    =========================== */}

                    <div>

                        <label className="label">

                            <span className="
                                label-text
                            ">
                                Cash Received
                            </span>

                        </label>


                        <input
                            autoFocus
                            type="number"
                            className="
                                input
                                input-bordered
                                w-full
                                text-lg
                            "
                            value={cashReceived}
                            onChange={(e) =>
                                setCashReceived(
                                    e.target.value
                                )
                            }
                            placeholder="0.00"
                        />

                    </div>


                    {/* ==========================
                        CHANGE
                    =========================== */}

                    <div className="
                        flex
                        justify-between
                        text-xl
                    ">

                        <span>
                            Change
                        </span>

                        <span className="
                            font-bold
                            text-success
                        ">
                            ₱{change.toFixed(2)}
                        </span>

                    </div>


                    {/* ==========================
                        PRINT RECEIPT
                    =========================== */}

                    <div className="
                        border
                        border-base-300
                        rounded-lg
                        p-4
                        bg-base-200
                    ">

                        <label className="
                            flex
                            items-center
                            justify-between
                            cursor-pointer
                        ">

                            <div>

                                <div className="
                                    font-semibold
                                ">
                                    Print Receipt
                                </div>

                                <div className="
                                    text-xs
                                    text-base-content/60
                                    mt-1
                                ">
                                    Print a receipt after
                                    completing the sale.
                                </div>

                            </div>


                            <input
                                type="checkbox"
                                className="
                                    toggle
                                    toggle-primary
                                "
                                checked={
                                    printReceipt
                                }
                                onChange={(e) =>
                                    setPrintReceipt(
                                        e.target.checked
                                    )
                                }
                            />

                        </label>

                    </div>

                </div>


                {/* ==========================
                    BUTTONS
                =========================== */}

                <div className="
                    modal-action
                ">

                    <button
                        className="btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>


                    <button
                        className="
                            btn
                            btn-primary
                        "
                        disabled={
                            parseFloat(
                                cashReceived || 0
                            ) < subtotal
                        }
                        onClick={
                            completeSale
                        }
                    >
                        Complete Sale
                    </button>

                </div>

            </div>

        </dialog>
    );
}

export default CheckoutModal;