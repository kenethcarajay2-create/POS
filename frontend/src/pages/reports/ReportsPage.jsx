import { useNavigate } from "react-router-dom";

function ReportsPage() {

    const navigate = useNavigate();


    const reports = [
        {
            title: "Sales Report",
            description:
                "View sales performance, revenue trends, and sales by day, week, or month.",
            icon: "📈",
            stat: "Sales & Revenue",
            color: "text-primary",
            bg: "bg-primary/10",
            path: "/reports/sales",
        },

        {
            title: "Transaction Report",
            description:
                "Review completed, voided, and refunded transactions.",
            icon: "🧾",
            stat: "Transaction History",
            color: "text-secondary",
            bg: "bg-secondary/10",
            path: "/reports/transactions",
        },

        {
            title: "Product Report",
            description:
                "See your best-selling products, revenue by product, and product performance.",
            icon: "🛒",
            stat: "Product Performance",
            color: "text-success",
            bg: "bg-success/10",
            path: "/reports/products",
        },

        {
            title: "Inventory Report",
            description:
                "Monitor stock levels, low-stock products, and out-of-stock products.",
            icon: "📦",
            stat: "Inventory Status",
            color: "text-warning",
            bg: "bg-warning/10",
            path: "/reports/inventory",
        },

        {
            title: "Cashier Report",
            description:
                "Compare cashier sales, transactions, items sold, and performance.",
            icon: "👨‍💼",
            stat: "Cashier Performance",
            color: "text-info",
            bg: "bg-info/10",
            path: "/reports/cashiers",
        },

        {
            title: "Payment Report",
            description:
                "See how much revenue came from cash, GCash, cards, and other payment methods.",
            icon: "💰",
            stat: "Payment Methods",
            color: "text-accent",
            bg: "bg-accent/10",
            path: "/reports/payments",
        },

        {
            title: "Wholesale Report",
            description:
                "Analyze wholesale sales, bulk pricing usage, and discounts given.",
            icon: "🏷️",
            stat: "Wholesale & Discounts",
            color: "text-error",
            bg: "bg-error/10",
            path: "/reports/wholesale",
        },

        {
            title: "Refunds & Voids",
            description:
                "Review refunded and voided sales, amounts, and transaction activity.",
            icon: "↩️",
            stat: "Refunds & Voids",
            color: "text-error",
            bg: "bg-error/10",
            path: "/reports/refunds",
        },

        {
            title: "Product Movement",
            description:
                "Identify fast-moving, slow-moving, and never-sold products.",
            icon: "🚀",
            stat: "Product Movement",
            color: "text-primary",
            bg: "bg-primary/10",
            path: "/reports/movement",
        },

        {
            title: "Customer Report",
            description:
                "View frequent customers, spending patterns, and customer activity.",
            icon: "👥",
            stat: "Customer Analytics",
            color: "text-secondary",
            bg: "bg-secondary/10",
            path: "/reports/customers",
            comingSoon: true,
        },
    ];


    return (

        <div className="space-y-6">

            {/* =====================================
                HEADER
            ===================================== */}

            <div>

                <h1 className="
                    text-2xl
                    font-bold
                    tracking-tight
                ">
                    Reports
                </h1>

                <p className="
                    text-sm
                    text-base-content/60
                    mt-1
                ">
                    View sales, inventory, product,
                    cashier, and business performance.
                </p>

            </div>


            {/* =====================================
                QUICK SUMMARY
            ===================================== */}

            <div className="
                grid
                grid-cols-2
                md:grid-cols-4
                gap-3
            ">

                <div className="
                    bg-base-100
                    border
                    border-base-200
                    rounded-xl
                    p-4
                    shadow-sm
                ">

                    <p className="
                        text-xs
                        text-base-content/50
                    ">
                        Sales
                    </p>

                    <p className="
                        text-xl
                        font-bold
                        mt-1
                    ">
                        —
                    </p>

                    <p className="
                        text-[10px]
                        text-base-content/40
                        mt-1
                    ">
                        Select a report to view
                    </p>

                </div>


                <div className="
                    bg-base-100
                    border
                    border-base-200
                    rounded-xl
                    p-4
                    shadow-sm
                ">

                    <p className="
                        text-xs
                        text-base-content/50
                    ">
                        Transactions
                    </p>

                    <p className="
                        text-xl
                        font-bold
                        mt-1
                    ">
                        —
                    </p>

                    <p className="
                        text-[10px]
                        text-base-content/40
                        mt-1
                    ">
                        Report data coming soon
                    </p>

                </div>


                <div className="
                    bg-base-100
                    border
                    border-base-200
                    rounded-xl
                    p-4
                    shadow-sm
                ">

                    <p className="
                        text-xs
                        text-base-content/50
                    ">
                        Items Sold
                    </p>

                    <p className="
                        text-xl
                        font-bold
                        mt-1
                    ">
                        —
                    </p>

                    <p className="
                        text-[10px]
                        text-base-content/40
                        mt-1
                    ">
                        Report data coming soon
                    </p>

                </div>


                <div className="
                    bg-base-100
                    border
                    border-base-200
                    rounded-xl
                    p-4
                    shadow-sm
                ">

                    <p className="
                        text-xs
                        text-base-content/50
                    ">
                        Inventory Alerts
                    </p>

                    <p className="
                        text-xl
                        font-bold
                        mt-1
                    ">
                        —
                    </p>

                    <p className="
                        text-[10px]
                        text-base-content/40
                        mt-1
                    ">
                        Report data coming soon
                    </p>

                </div>

            </div>


            {/* =====================================
                REPORT CARDS
            ===================================== */}

            <div>

                <div className="
                    flex
                    items-center
                    justify-between
                    mb-3
                ">

                    <div>

                        <h2 className="
                            text-lg
                            font-bold
                        ">
                            Available Reports
                        </h2>

                        <p className="
                            text-xs
                            text-base-content/50
                        ">
                            Select a report to view detailed information.
                        </p>

                    </div>

                </div>


                <div className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    xl:grid-cols-3
                    gap-4
                ">

                    {reports.map((report) => (

                        <button
                            key={report.title}
                            type="button"
                            disabled={report.comingSoon}
                            onClick={() =>
                                navigate(report.path)
                            }
                            className={`
                                text-left
                                bg-base-100
                                border
                                border-base-200
                                rounded-xl
                                p-5
                                shadow-sm
                                transition-all
                                duration-200
                                group

                                ${
                                    report.comingSoon
                                        ? "opacity-60 cursor-not-allowed"
                                        : "hover:-translate-y-1 hover:shadow-md hover:border-base-300 cursor-pointer"
                                }
                            `}
                        >

                            {/* ICON + ARROW */}

                            <div className="
                                flex
                                items-start
                                justify-between
                            ">

                                <div className={`
                                    w-11
                                    h-11
                                    rounded-xl
                                    flex
                                    items-center
                                    justify-center
                                    text-xl
                                    ${report.bg}
                                `}>
                                    {report.icon}
                                </div>


                                {!report.comingSoon && (

                                    <span className="
                                        text-base-content/30
                                        group-hover:text-primary
                                        group-hover:translate-x-1
                                        transition-all
                                    ">
                                        →
                                    </span>

                                )}

                            </div>


                            {/* TITLE */}

                            <h3 className="
                                font-bold
                                text-base
                                mt-4
                            ">
                                {report.title}
                            </h3>


                            {/* DESCRIPTION */}

                            <p className="
                                text-xs
                                text-base-content/60
                                leading-relaxed
                                mt-1.5
                                min-h-[40px]
                            ">
                                {report.description}
                            </p>


                            {/* FOOTER */}

                            <div className="
                                flex
                                items-center
                                justify-between
                                mt-4
                                pt-3
                                border-t
                                border-base-200
                            ">

                                <span className={`
                                    text-[10px]
                                    font-semibold
                                    ${report.color}
                                `}>
                                    {report.stat}
                                </span>


                                {report.comingSoon ? (

                                    <span className="
                                        badge
                                        badge-ghost
                                        badge-sm
                                        text-[9px]
                                    ">
                                        Coming Soon
                                    </span>

                                ) : (

                                    <span className="
                                        text-[10px]
                                        text-base-content/40
                                        group-hover:text-primary
                                    ">
                                        View Report
                                    </span>

                                )}

                            </div>

                        </button>

                    ))}

                </div>

            </div>

        </div>
    );
}

export default ReportsPage;