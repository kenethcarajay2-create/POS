function ProductCard({ product, onAdd }) {
    return (
<div
    className="card bg-base-100 shadow cursor-pointer hover:shadow-lg transition"
    onClick={() => onProductClick(product)}
>            <div className="card-body p-4">

                <h2 className="card-title text-base">
                    {product.name}
                </h2>

                <p className="text-sm text-gray-500">
                    {product.category}
                </p>

                <div className="mt-2 space-y-1 text-sm">
                    <p>
                        <span className="font-semibold">
                            Stock:
                        </span>{" "}
                        {product.stock}
                    </p>

                    <p className="text-lg font-bold text-primary">
                        ₱{product.sellingPrice.toFixed(2)}
                    </p>
                </div>

                <button
                    className="btn btn-primary btn-sm mt-3 w-full"
                    onClick={() => onAdd(product)}
                >
                    + Add
                </button>

            </div>
        </div>
    );
}

export default ProductCard;