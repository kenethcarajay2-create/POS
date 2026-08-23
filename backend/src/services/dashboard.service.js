import Sale from "../models/sale.model.js";
import Product from "../models/product.model.js";

const getDashboard = async () => {

    const startOfToday = new Date();

    startOfToday.setHours(
        0,
        0,
        0,
        0
    );

    const todaySales = await Sale.find({
        createdAt: {
            $gte: startOfToday,
        },
    });

    const todayRevenue = todaySales.reduce(
        (sum, sale) => sum + sale.total,
        0
    );

    const todayTransactions =
        todaySales.length;

    const todayItemsSold =
        todaySales.reduce(
            (sum, sale) =>
                sum +
                sale.items.reduce(
                    (qty, item) =>
                        qty + item.quantity,
                    0
                ),
            0
        );

    const averageSale =
        todayTransactions === 0
            ? 0
            : todayRevenue /
              todayTransactions;

    const lowStock =
        await Product.find({
            $expr: {
                $lte: [
                    "$stock",
                    "$minimumStock",
                ],
            },
        })
            .sort({
                stock: 1,
            })
            .limit(5);
            const bestSellers = await Sale.aggregate([

    { $unwind: "$items" },

    {
        $group: {
            _id: "$items.product",

            name: {
                $first: "$items.name",
            },

            barcode: {
                $first: "$items.barcode",
            },

            quantitySold: {
                $sum: "$items.quantity",
            },
        },
    },

    {
        $sort: {
            quantitySold: -1,
        },
    },

    {
        $limit: 5,
    },

]);
const recentTransactions = await Sale.find()
    .select(
        "receiptNumber total paymentMethod createdAt"
    )
    .sort({
        createdAt: -1,
    })
    .limit(5);

    return {
        todayRevenue,
        todayTransactions,
        todayItemsSold,
        averageSale,
        lowStock, bestSellers,recentTransactions
    };

};

export default {
    getDashboard,
};