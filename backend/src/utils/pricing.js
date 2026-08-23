export const getPricingTier = (pricing, quantity) => {

    let selectedTier = pricing[0];

    for (const tier of pricing) {

        if (quantity >= tier.quantity) {
            selectedTier = tier;
        } else {
            break;
        }

    }

    return selectedTier;

};

export const getUnitPrice = (pricing, quantity) => {

    const tier = getPricingTier(pricing, quantity);

    return tier.price / tier.quantity;

};

export const calculateSubtotal = (pricing, quantity) => {

    const tier = getPricingTier(pricing, quantity);

    // If buying exactly the tier quantity,
    // use the bundle price.
    if (quantity === tier.quantity) {
        return tier.price;
    }

    // Otherwise use the effective unit price.
    return (tier.price / tier.quantity) * quantity;

};