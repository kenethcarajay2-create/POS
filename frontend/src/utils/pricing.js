export function calculateBestPrice(pricing, quantity) {

    if (
        !pricing ||
        pricing.length === 0 ||
        quantity <= 0
    ) {
        return 0;
    }

    const tiers = [...pricing]
        .sort(
            (a, b) =>
                Number(a.quantity) -
                Number(b.quantity)
        );


    // =========================================
    // Find the highest tier the customer
    // currently qualifies for.
    // =========================================

    let applicableTier =
        tiers[0];


    for (const tier of tiers) {

        if (
            Number(tier.quantity) <=
            Number(quantity)
        ) {
            applicableTier = tier;
        }

    }


    // =========================================
    // Regular pricing
    // =========================================

    if (
        Number(applicableTier.quantity) === 1
    ) {

        return (
            Number(applicableTier.price) *
            Number(quantity)
        );

    }


    // =========================================
    // Bulk pricing
    //
    // Example:
    //
    // 6 pieces = ₱1000
    //
    // ₱1000 / 6 = ₱166.67 each
    //
    // =========================================

    const bulkQuantity =
        Number(applicableTier.quantity);

    const bulkTotal =
        Number(applicableTier.price);

    const unitPrice =
        bulkTotal / bulkQuantity;


    return (
        unitPrice *
        Number(quantity)
    );
}