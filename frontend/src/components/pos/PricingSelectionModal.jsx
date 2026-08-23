function PricingSelectionModal({
    open,
    product,
    onClose,
    onSelect,
}) {
    if (!open || !product) return null;

    return (
        <dialog className="modal modal-open">
            <div className="modal-box max-w-lg">

                <h2 className="text-2xl font-bold">
                    {product.name}
                </h2>

                <p className="text-gray-500 mb-6">
                    Select a pricing option
                </p>

                <div className="space-y-3">

                    {product.pricing.map((tier) => (

                        <button
                            key={tier.quantity}
                            className="w-full border rounded-xl p-4 hover:bg-base-200 transition text-left"
                            onClick={() => {
                                onSelect({
                                    productId: product._id,
                                    barcode: product.barcode,
                                    name: product.name,
                                    baseUnit: product.baseUnit,

                                    quantity: tier.quantity,

                                    unitPrice: tier.price,
                                });
                            }}
                        >

                            <div className="flex justify-between items-center">

                                <div>

                                    <h3 className="font-bold text-lg">
                                        {tier.quantity}{" "}
                                        {product.baseUnit}
                                        {tier.quantity > 1
                                            ? "s"
                                            : ""}
                                    </h3>

                                    <p className="text-gray-500">
                                        Qty: {tier.quantity}
                                    </p>

                                </div>

                                <div className="text-xl font-bold">

                                    ₱{tier.price.toFixed(2)}

                                </div>

                            </div>

                        </button>

                    ))}

                </div>

                <div className="modal-action">

                    <button
                        className="btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                </div>

            </div>
        </dialog>
    );
}

export default PricingSelectionModal;