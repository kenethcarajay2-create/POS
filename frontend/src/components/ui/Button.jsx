function Button({
    children,
    type = "button",
    className = "",
    ...props
}) {
    return (
        <button
            type={type}
            className={`btn btn-primary ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;