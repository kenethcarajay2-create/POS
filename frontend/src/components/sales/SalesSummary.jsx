function SalesSummary({ sales }) {
    const totalSales = sales.reduce(
        (sum, sale) => sum + sale.total,
        0
    );

    const totalTransactions = sales.length;

    const totalItems = sales.reduce(
        (sum, sale) =>
            sum +
            sale.items.reduce(
                (qty, item) => qty + item.quantity,
                0
            ),
        0
    );

    const averageSale =
        totalTransactions === 0
            ? 0
            : totalSales / totalTransactions;

    const cards = [
        {
            title: "Sales",
            value: `₱${totalSales.toFixed(2)}`,
        },
        {
            title: "Transactions",
            value: totalTransactions,
        },
        {
            title: "Items Sold",
            value: totalItems,
        },
        {
            title: "Average Sale",
            value: `₱${averageSale.toFixed(2)}`,
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-4 mb-6">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className="card bg-base-100 shadow"
                >
                    <div className="card-body p-4">
                        <div className="text-sm opacity-70">
                            {card.title}
                        </div>

                        <div className="text-2xl font-bold">
                            {card.value}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default SalesSummary;