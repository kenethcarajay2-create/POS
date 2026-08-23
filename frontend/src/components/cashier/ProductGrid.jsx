import { useEffect } from "react";

import useProductStore from "../../store/product.store";
import ProductCard from "./ProductCard";

function ProductGrid() {
    const {
        fetchProducts,
        filteredProducts,
    } = useProductStore();

    useEffect(() => {
        fetchProducts();
    }, []);

    const products = filteredProducts().filter(
        (product) =>
            product.isActive &&
            product.stock > 0
    );

    const handleAdd = (product) => {
        console.log(product);
    };

    return (
        <div
            className="
                grid
                grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-4
                gap-4
            "
        >
            {products.map((product) => (
                <ProductCard
                    key={product._id}
                    product={product}
                    onAdd={handleAdd}
                />
            ))}
        </div>
    );
}

export default ProductGrid;