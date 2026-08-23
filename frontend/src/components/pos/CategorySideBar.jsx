import useProductStore from "../../store/product.store";

const categories = [
    "All",
    "Beverages",
    "Snacks",
    "Canned Goods",
    "Frozen",
    "Household",
    "Personal Care",
    "Others",
];

function CategorySidebar() {

    const selectedCategory = useProductStore(
        (state) => state.selectedCategory
    );

    const setSelectedCategory = useProductStore(
        (state) => state.setSelectedCategory
    );

    return (

        <div className="flex gap-2 overflow-x-auto pb-2">

            {categories.map((category) => (

                <button
                    key={category}
                    className={`btn btn-sm whitespace-nowrap ${
                        selectedCategory === category
                            ? "btn-primary"
                            : "btn-outline"
                    }`}
                    onClick={() =>
                        setSelectedCategory(category)
                    }
                >
                    {category}
                </button>

            ))}

        </div>

    );
}

export default CategorySidebar;