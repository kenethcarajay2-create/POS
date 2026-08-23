import Sale from "../models/sale.model.js";

export const generateReceiptNumber = async () => {
    const today = new Date();

    const date =
        today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");

    const latestSale = await Sale.findOne({
        receiptNumber: new RegExp(`^${date}`),
    })
        .sort({ receiptNumber: -1 })
        .select("receiptNumber");

    let sequence = 1;

    if (latestSale) {
        const lastSequence = parseInt(
            latestSale.receiptNumber.split("-")[1]
        );

        sequence = lastSequence + 1;
    }

    return `${date}-${String(sequence).padStart(6, "0")}`;
};