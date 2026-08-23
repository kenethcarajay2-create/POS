function Card({ children }) {
    return (
        <div className="card bg-base-100 shadow-md">
            <div className="card-body">
                {children}
            </div>
        </div>
    );
}

export default Card;    