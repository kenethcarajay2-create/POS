function Input({
    label,
    className = "",
    ...props
}) {
    return (
        <div className="form-control w-full">

            {label && (
                <label className="label">
                    <span className="label-text">
                        {label}
                    </span>
                </label>
            )}

            <input
                className={`input input-bordered w-full ${className}`}
                {...props}
            />

        </div>
    );
}

export default Input;