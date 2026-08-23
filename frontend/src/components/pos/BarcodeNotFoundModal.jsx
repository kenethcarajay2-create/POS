function BarcodeNotFoundModal({
    open,
    barcode,
    onCancel,
    onAddProduct,
}) {

    if (!open) {
        return null;
    }


    return (
        <dialog className="modal modal-open">

            <div className="modal-box max-w-md">

                {/* ICON */}

                <div className="flex justify-center mb-4">

                    <div
                        className="
                            w-14
                            h-14
                            rounded-full
                            bg-warning/15
                            text-warning
                            flex
                            items-center
                            justify-center
                            text-2xl
                        "
                    >
                        !
                    </div>

                </div>


                {/* TITLE */}

                <h3 className="text-xl font-bold text-center">

                    Product Not Found

                </h3>


                {/* MESSAGE */}

                <p className="text-center text-base-content/60 mt-2">

                    The barcode

                </p>


                <p
                    className="
                        text-center
                        font-mono
                        font-semibold
                        text-primary
                        mt-1
                    "
                >
                    {barcode}
                </p>


                <p className="text-center text-base-content/60 mt-2">

                    was not found in your products.

                </p>


                <p className="text-center font-medium mt-4">

                    Do you want to add this product?

                </p>


                {/* ACTIONS */}

                <div className="modal-action justify-center">

                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onAddProduct}
                    >
                        + Add Product
                    </button>

                </div>

            </div>

        </dialog>
    );
}

export default BarcodeNotFoundModal;