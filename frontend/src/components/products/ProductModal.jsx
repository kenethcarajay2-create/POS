import ProductForm from "./ProductForm";

function ProductModal({
    open,
    title,
    initialValues,
    onClose,
    onSubmit,
    loading,
}) {
    if (!open) return null;

    return (
        <dialog className="modal modal-open">

            <div
                className="
                    modal-box
                    w-[95vw]
                    max-w-5xl
                    max-h-[92vh]
                    p-0
                    overflow-hidden
                    rounded-2xl
                "
            >

                <ProductForm
                    initialValues={initialValues}
                    onSubmit={onSubmit}
                    onCancel={onClose}
                    loading={loading}
                />

            </div>

        </dialog>
    );
}

export default ProductModal;