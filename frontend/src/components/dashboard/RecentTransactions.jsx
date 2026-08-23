function RecentTransactions({ sales = [] }) {

    return (

        <div className="space-y-2">

            {sales.length === 0 ? (

                <p className="
                    text-xs
                    text-base-content/50
                    py-4
                ">
                    No recent transactions.
                </p>

            ) : (

                sales.map((sale) => (

                    <div
                        key={sale._id}
                        className="
                            flex
                            justify-between
                            items-center
                            py-2
                            border-b
                            border-base-200
                            last:border-0
                        "
                    >

                        {/* Transaction Information */}

                        <div className="min-w-0">

                            <p className="
                                text-xs
                                font-semibold
                                truncate
                            ">

                                {sale.receiptNumber}

                            </p>

                            <p className="
                                text-[10px]
                                text-base-content/50
                            ">

                                {new Date(
                                    sale.createdAt
                                ).toLocaleTimeString(
                                    [],
                                    {
                                        hour: "numeric",
                                        minute: "2-digit",
                                    }
                                )}

                            </p>

                        </div>


                        {/* Amount */}

                        <div className="text-right">

                            <p className="text-xs font-bold">

                                ₱
                                {sale.total.toFixed(2)}

                            </p>

                            <span className="
                                text-[10px]
                                text-base-content/50
                            ">

                                {sale.paymentMethod}

                            </span>

                        </div>

                    </div>

                ))

            )}

        </div>

    );
}

export default RecentTransactions;