function DataTable({
    columns = [],
    data = [],
    loading = false,
    emptyMessage = "No records found.",
}) {
    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-base-100 rounded-xl shadow">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.header}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="text-center py-8"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr key={row._id}>
                                {columns.map((column) => (
                                    <td key={column.header}>
                                        {column.render
                                            ? column.render(row)
                                            : row[column.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;