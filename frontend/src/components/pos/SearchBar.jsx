import useProductStore from "../../store/product.store";
function SearchBar() {

    const search = useProductStore(
        (state) => state.search
    );

    const setSearch = useProductStore(
        (state) => state.setSearch
    );

    return (

        <input
            className="input input-bordered w-full"

            placeholder="Search or scan barcode..."

            value={search}

            onChange={(e) =>
                setSearch(e.target.value)
            }

        />

    );

}

export default SearchBar;