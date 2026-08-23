function DateRangeFilter({
    value,
    onChange,
}) {
    return (
        <select
            className="select select-bordered"
            value={value}
            onChange={(e) =>
                onChange(e.target.value)
            }
        >
            <option value="today">
                Today
            </option>

            <option value="yesterday">
                Yesterday
            </option>

            <option value="week">
                This Week
            </option>

            <option value="month">
                This Month
            </option>

            <option value="year">
                This Year
            </option>

            <option value="all">
                All Time
            </option>
        </select>
    );
}

export default DateRangeFilter;