import { FaSearch } from "react-icons/fa";

function SearchInput({
    value,
    onChange,
    placeholder = "Search...",
}) {
    return (
        <label className="input input-bordered flex items-center gap-2 w-full">

            <FaSearch className="text-gray-400" />

            <input
                type="text"
                className="grow"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />

        </label>
    );
}

export default SearchInput;