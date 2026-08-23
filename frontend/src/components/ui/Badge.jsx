function Badge({
    children,
    color = "primary",
}) {
    return (
        <div className={`badge badge-${color}`}>
            {children}
        </div>
    );
}

export default Badge;