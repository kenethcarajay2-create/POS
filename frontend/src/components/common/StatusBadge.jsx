function StatusBadge({ active }) {
    return (
        <div
            className={`badge ${
                active
                    ? "badge-success"
                    : "badge-error"
            }`}
        >
            {active ? "Active" : "Inactive"}
        </div>
    );
}

export default StatusBadge;