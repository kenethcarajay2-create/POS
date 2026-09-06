import mongoose from "mongoose";

import Sale from "../models/sale.model.js";
import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";
import Customer from "../models/customer.model.js";
import LoyaltyTransaction from "../models/loyaltyTransaction.model.js";

import ApiError from "../utils/ApiError.js";
import { generateReceiptNumber } from "../utils/receipt.js";

import {
    calculateSubtotal,
} from "../utils/pricing.js";


/*
============================================================
LOYALTY CONFIGURATION
============================================================

EARNING:
₱100 spent = 1 point

REDEMPTION:
1 point = ₱1

Minimum redemption:
10 points

Redemption increment:
10 points

Maximum redemption:
50% of the amount before loyalty discount
============================================================
*/

const LOYALTY_SPEND_PER_POINT =
    100;

const LOYALTY_POINT_VALUE =
    1;

const LOYALTY_MIN_REDEMPTION =
    10;

const LOYALTY_REDEMPTION_STEP =
    10;

const LOYALTY_MAX_REDEMPTION_RATE =
    0.50;


/*
============================================================
CALCULATE LOYALTY POINTS
============================================================
*/

const calculateLoyaltyPoints = (
    amount
) => {

    const numericAmount =
        Number(
            amount
        ) || 0;


    if (
        numericAmount <= 0
    ) {

        return 0;

    }


    return Math.floor(
        numericAmount /
        LOYALTY_SPEND_PER_POINT
    );

};


/*
============================================================
CUSTOMER POPULATE FIELDS
============================================================
*/

const CUSTOMER_POPULATE_FIELDS = `
    customerCode
    name
    phone
    rfidUid
    loyaltyPoints
    lifetimePoints
    loyaltyTier
    isActive
`;


/*
============================================================
CHECKOUT
============================================================

Supports:

1. NORMAL INVENTORY PRODUCT

{
    isOpenPrice: false,
    productId: "...",
    quantity: 2
}


2. OPEN PRICE / GROCERY

{
    isOpenPrice: true,
    name: "Grocery",
    note: "Vegetables",
    quantity: 1,
    unitPrice: 125
}


3. OPTIONAL REGISTERED CUSTOMER

{
    customerId: "..."
}


4. OPTIONAL LOYALTY REDEMPTION

{
    loyaltyPointsToRedeem: 50
}


No customerId:
→ Walk-in customer

With customerId:
→ Sale is linked to Customer

Open-price items:
→ Optional note/description
→ No Product required
→ No inventory deduction
→ No inventory transaction

Loyalty:
→ Registered customers only
→ ₱100 final spend = 1 point
→ 1 point = ₱1 discount
→ Minimum 10 points
→ Multiples of 10
→ Maximum 50% of purchase
============================================================
*/

const checkout = async (
    data,
    userId
) => {

    const {
        items,
        discount = 0,
        payment,
        paymentMethod = "Cash",
        customerId = null,
        loyaltyPointsToRedeem = 0,
    } = data;


    /*
    ========================================================
    CUSTOMER VALIDATION
    ========================================================
    */

    let customer =
        null;


    if (
        customerId
    ) {

        /*
        ----------------------------------------------------
        VALID OBJECT ID
        ----------------------------------------------------
        */

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    customerId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid customer ID."
            );

        }


        /*
        ----------------------------------------------------
        FIND CUSTOMER
        ----------------------------------------------------
        */

        customer =
            await Customer.findById(
                customerId
            );


        if (
            !customer
        ) {

            throw new ApiError(
                404,
                "Customer not found."
            );

        }


        /*
        ----------------------------------------------------
        ACTIVE CUSTOMER CHECK
        ----------------------------------------------------
        */

        if (
            customer.isActive ===
            false
        ) {

            throw new ApiError(
                400,
                "The selected customer is inactive."
            );

        }

    }


    /*
    ========================================================
    BASIC CART VALIDATION
    ========================================================
    */

    if (
        !Array.isArray(
            items
        ) ||
        items.length === 0
    ) {

        throw new ApiError(
            400,
            "Cart is empty."
        );

    }


    let subtotal =
        0;


    const saleItems =
        [];


    /*
    ========================================================
    PROCESS CART ITEMS
    ========================================================
    */

    for (
        const cartItem
        of items
    ) {

        const quantity =
            Number(
                cartItem.quantity
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity < 1
        ) {

            throw new ApiError(
                400,
                "Invalid item quantity."
            );

        }


        /*
        ====================================================
        OPEN PRICE ITEM
        ====================================================
        */

        if (
            cartItem.isOpenPrice ===
            true
        ) {

            /*
            ------------------------------------------------
            UNIT PRICE
            ------------------------------------------------
            */

            const unitPrice =
                Number(
                    cartItem.unitPrice
                );


            if (
                !Number.isFinite(
                    unitPrice
                ) ||
                unitPrice <= 0
            ) {

                throw new ApiError(
                    400,
                    "Open-price item must have a valid price."
                );

            }


            /*
            ------------------------------------------------
            NAME
            ------------------------------------------------
            */

            const name =
                String(
                    cartItem.name ||
                    "Grocery"
                )
                    .trim()
                    .slice(
                        0,
                        100
                    );


            if (
                !name
            ) {

                throw new ApiError(
                    400,
                    "Open-price item name is required."
                );

            }


            /*
            ------------------------------------------------
            NOTE
            ------------------------------------------------

            Optional description of what the cashier sold.

            Examples:

            Grocery
            note: "Vegetables"

            Grocery
            note: "Rice"

            Grocery
            note: "Ice"

            We sanitize again here even though Joi already
            validates the request.

            This gives the service its own defensive boundary.
            ------------------------------------------------
            */

            const note =
                String(
                    cartItem.note ||
                    ""
                )
                    .trim()
                    .slice(
                        0,
                        80
                    );


            /*
            ------------------------------------------------
            LINE SUBTOTAL
            ------------------------------------------------
            */

            const lineSubtotal =
                unitPrice *
                quantity;


            subtotal +=
                lineSubtotal;


            /*
            ------------------------------------------------
            ADD OPEN PRICE SALE ITEM
            ------------------------------------------------
            */

            saleItems.push({

                product:
                    null,

                productDocument:
                    null,

                isOpenPrice:
                    true,

                barcode:
                    "",

                name,

                note,

                quantity,

                unitPrice,

                subtotal:
                    lineSubtotal,

            });


            continue;

        }


        /*
        ====================================================
        NORMAL INVENTORY PRODUCT
        ====================================================
        */

        if (
            !cartItem.productId
        ) {

            throw new ApiError(
                400,
                "Product ID is required."
            );

        }


        /*
        ----------------------------------------------------
        VALID PRODUCT ID
        ----------------------------------------------------
        */

        if (
            !mongoose.Types.ObjectId
                .isValid(
                    cartItem.productId
                )
        ) {

            throw new ApiError(
                400,
                "Invalid product ID."
            );

        }


        /*
        ----------------------------------------------------
        FIND PRODUCT
        ----------------------------------------------------
        */

        const product =
            await Product.findById(
                cartItem.productId
            );


        if (
            !product
        ) {

            throw new ApiError(
                404,
                "Product not found."
            );

        }


        /*
        ----------------------------------------------------
        ACTIVE CHECK
        ----------------------------------------------------
        */

        if (
            !product.isActive
        ) {

            throw new ApiError(
                400,
                `${product.name} is inactive.`
            );

        }


        /*
        ----------------------------------------------------
        STOCK CHECK
        ----------------------------------------------------
        */

        if (
            Number(
                product.stock
            ) <
            quantity
        ) {

            throw new ApiError(
                400,
                `Insufficient stock for ${product.name}.`
            );

        }


        /*
        ----------------------------------------------------
        CALCULATE PRICE
        ----------------------------------------------------
        */

        const lineSubtotal =
            calculateSubtotal(
                product.pricing,
                quantity
            );


        const unitPrice =
            lineSubtotal /
            quantity;


        subtotal +=
            lineSubtotal;


        /*
        ----------------------------------------------------
        ADD NORMAL SALE ITEM
        ----------------------------------------------------

        Normal inventory products do not use the Grocery
        note field.

        We explicitly store an empty string so every sale
        item has a consistent structure.
        ----------------------------------------------------
        */

        saleItems.push({

            product:
                product._id,

            productDocument:
                product,

            isOpenPrice:
                false,

            barcode:
                product.barcode ||
                "",

            name:
                product.name,

            note:
                "",

            quantity,

            unitPrice,

            subtotal:
                lineSubtotal,

        });

    }


    /*
    ========================================================
    NORMAL DISCOUNT
    ========================================================
    */

    const numericDiscount =
        Number(
            discount
        ) || 0;


    if (
        numericDiscount < 0
    ) {

        throw new ApiError(
            400,
            "Discount cannot be negative."
        );

    }


    if (
        numericDiscount >
        subtotal
    ) {

        throw new ApiError(
            400,
            "Discount cannot exceed subtotal."
        );

    }


    /*
    ========================================================
    TOTAL BEFORE LOYALTY
    ========================================================
    */

    const totalBeforeLoyalty =
        Math.max(
            0,
            subtotal -
            numericDiscount
        );


    /*
    ========================================================
    LOYALTY REDEMPTION
    ========================================================
    */

    const requestedPoints =
        Number(
            loyaltyPointsToRedeem
        ) || 0;


    let loyaltyPointsRedeemed =
        0;


    let loyaltyDiscount =
        0;


    /*
    --------------------------------------------------------
    NEGATIVE POINTS ARE INVALID
    --------------------------------------------------------
    */

    if (
        requestedPoints < 0
    ) {

        throw new ApiError(
            400,
            "Loyalty points cannot be negative."
        );

    }


    /*
    --------------------------------------------------------
    CUSTOMER REQUIRED
    --------------------------------------------------------
    */

    if (
        requestedPoints > 0 &&
        !customer
    ) {

        throw new ApiError(
            400,
            "A registered customer is required to redeem loyalty points."
        );

    }


    /*
    --------------------------------------------------------
    VALIDATE REDEMPTION
    --------------------------------------------------------
    */

    if (
        requestedPoints > 0
    ) {

        /*
        ----------------------------------------------------
        WHOLE NUMBER ONLY
        ----------------------------------------------------
        */

        if (
            !Number.isInteger(
                requestedPoints
            )
        ) {

            throw new ApiError(
                400,
                "Loyalty points must be a whole number."
            );

        }


        /*
        ----------------------------------------------------
        MINIMUM REDEMPTION
        ----------------------------------------------------
        */

        if (
            requestedPoints <
            LOYALTY_MIN_REDEMPTION
        ) {

            throw new ApiError(
                400,
                `Minimum loyalty redemption is ${LOYALTY_MIN_REDEMPTION} points.`
            );

        }


        /*
        ----------------------------------------------------
        REDEMPTION STEP
        ----------------------------------------------------
        */

        if (
            requestedPoints %
                LOYALTY_REDEMPTION_STEP !==
            0
        ) {

            throw new ApiError(
                400,
                `Loyalty points must be redeemed in increments of ${LOYALTY_REDEMPTION_STEP}.`
            );

        }


        /*
        ----------------------------------------------------
        AVAILABLE CUSTOMER POINTS
        ----------------------------------------------------
        */

        const availablePoints =
            Number(
                customer.loyaltyPoints
            ) || 0;


        if (
            requestedPoints >
            availablePoints
        ) {

            throw new ApiError(
                400,
                `Customer only has ${availablePoints} loyalty point(s).`
            );

        }


        /*
        ----------------------------------------------------
        POINTS → PESO DISCOUNT
        ----------------------------------------------------
        */

        const requestedDiscount =
            requestedPoints *
            LOYALTY_POINT_VALUE;


        /*
        ----------------------------------------------------
        MAXIMUM REDEMPTION

        Maximum = 50% of total before loyalty.

        We floor this to whole pesos because:
        1 point = ₱1
        ----------------------------------------------------
        */

        const maximumLoyaltyDiscount =
            Math.floor(
                totalBeforeLoyalty *
                LOYALTY_MAX_REDEMPTION_RATE
            );


        if (
            requestedDiscount >
            maximumLoyaltyDiscount
        ) {

            throw new ApiError(
                400,
                `Loyalty redemption cannot exceed 50% of the purchase. Maximum loyalty discount is ₱${maximumLoyaltyDiscount.toFixed(
                    2
                )}.`
            );

        }


        loyaltyPointsRedeemed =
            requestedPoints;


        loyaltyDiscount =
            requestedDiscount;

    }


    /*
    ========================================================
    FINAL TOTAL
    ========================================================
    */

    const total =
        Math.max(
            0,
            totalBeforeLoyalty -
            loyaltyDiscount
        );


    /*
    ========================================================
    LOYALTY POINTS EARNED
    ========================================================

    Registered customers only.

    Points are based on the amount AFTER:

    - normal discount
    - loyalty redemption
    ========================================================
    */

    const loyaltyPointsEarned =
        customer
            ? calculateLoyaltyPoints(
                total
            )
            : 0;


    /*
    ========================================================
    PAYMENT
    ========================================================
    */

    const numericPayment =
        Number(
            payment
        );


    if (
        !Number.isFinite(
            numericPayment
        )
    ) {

        throw new ApiError(
            400,
            "Invalid payment amount."
        );

    }


    if (
        numericPayment <
        total
    ) {

        throw new ApiError(
            400,
            "Insufficient payment."
        );

    }


    const change =
        numericPayment -
        total;


    /*
    ========================================================
    RECEIPT NUMBER
    ========================================================
    */

    const receiptNumber =
        await generateReceiptNumber();


    /*
    ========================================================
    CREATE SALE
    ========================================================
    */

    const sale =
        await Sale.create({

            receiptNumber,


            /*
            ------------------------------------------------
            CASHIER
            ------------------------------------------------
            */

            cashier:
                userId ||
                null,


            /*
            ------------------------------------------------
            CUSTOMER
            ------------------------------------------------
            */

            customer:
                customer?._id ||
                null,


            /*
            ------------------------------------------------
            ITEMS
            ------------------------------------------------
            */

            items:
                saleItems.map(
                    (
                        item
                    ) => ({

                        product:
                            item.product,

                        isOpenPrice:
                            item.isOpenPrice,

                        barcode:
                            item.barcode,

                        name:
                            item.name,


                        /*
                        ====================================
                        ITEM NOTE
                        ====================================

                        For Grocery/open-price items this
                        contains the cashier's description.

                        Normal products contain "".
                        ====================================
                        */

                        note:
                            item.note ||
                            "",

                        quantity:
                            item.quantity,

                        unitPrice:
                            item.unitPrice,

                        subtotal:
                            item.subtotal,

                    })
                ),


            /*
            ------------------------------------------------
            TOTALS
            ------------------------------------------------
            */

            subtotal,

            discount:
                numericDiscount,


            /*
            ------------------------------------------------
            LOYALTY
            ------------------------------------------------
            */

            loyaltyPointsRedeemed,

            loyaltyDiscount,

            loyaltyPointsEarned,

            loyaltyEarnedPointsReversed:
                0,

            loyaltyRedeemedPointsRestored:
                0,


            /*
            ------------------------------------------------
            FINAL TOTAL
            ------------------------------------------------
            */

            total,


            /*
            ------------------------------------------------
            PAYMENT
            ------------------------------------------------
            */

            payment:
                numericPayment,

            paymentMethod,

            change,

        });


    /*
    ========================================================
    DEDUCT INVENTORY
    ========================================================

    Only normal products affect inventory.

    Open-price Grocery items are skipped completely.
    ========================================================
    */

    for (
        const item
        of saleItems
    ) {

        if (
            item.isOpenPrice ||
            !item.productDocument
        ) {

            continue;

        }


        const product =
            item.productDocument;


        const previousStock =
            Number(
                product.stock
            );


        const newStock =
            previousStock -
            item.quantity;


        product.stock =
            newStock;


        await product.save();


        /*
        ----------------------------------------------------
        INVENTORY TRANSACTION
        ----------------------------------------------------
        */

        await InventoryTransaction.create({

            product:
                item.product,

            type:
                "SALE",

            quantity:
                item.quantity,

            previousStock,

            newStock,

            remarks:
                `Receipt ${receiptNumber}`,

            createdBy:
                userId,

        });

    }


    /*
    ========================================================
    PROCESS CUSTOMER LOYALTY
    ========================================================

    IMPORTANT ORDER:

    1. Redeem old points
    2. Award newly earned points

    Example:

    Starting = 128

    Redeem 50
    → 78

    Earn 4
    → 82
    ========================================================
    */

    if (
        customer
    ) {

        /*
        ====================================================
        REDEEM POINTS
        ====================================================
        */

        if (
            loyaltyPointsRedeemed >
            0
        ) {

            const balanceBefore =
                Number(
                    customer.loyaltyPoints
                ) || 0;


            const balanceAfter =
                balanceBefore -
                loyaltyPointsRedeemed;


            /*
            ------------------------------------------------
            SAFETY CHECK
            ------------------------------------------------
            */

            if (
                balanceAfter < 0
            ) {

                throw new ApiError(
                    400,
                    "Customer does not have enough loyalty points."
                );

            }


            customer.loyaltyPoints =
                balanceAfter;


            await customer.save();


            /*
            ------------------------------------------------
            LOYALTY AUDIT RECORD
            ------------------------------------------------
            */

            await LoyaltyTransaction.create({

                customer:
                    customer._id,

                sale:
                    sale._id,

                type:
                    "REDEEM",

                points:
                    -loyaltyPointsRedeemed,

                balanceBefore,

                balanceAfter,

                description:
                    `${loyaltyPointsRedeemed} point(s) redeemed on Receipt ${receiptNumber}`,

                createdBy:
                    userId ||
                    null,

            });

        }


        /*
        ====================================================
        EARN NEW POINTS
        ====================================================
        */

        if (
            loyaltyPointsEarned >
            0
        ) {

            const balanceBefore =
                Number(
                    customer.loyaltyPoints
                ) || 0;


            const balanceAfter =
                balanceBefore +
                loyaltyPointsEarned;


            /*
            ------------------------------------------------
            AVAILABLE POINT BALANCE
            ------------------------------------------------
            */

            customer.loyaltyPoints =
                balanceAfter;


            /*
            ------------------------------------------------
            LIFETIME POINTS

            Lifetime points represent all points earned.

            Redemption does NOT decrease lifetimePoints.
            ------------------------------------------------
            */

            customer.lifetimePoints =
                (
                    Number(
                        customer.lifetimePoints
                    ) || 0
                ) +
                loyaltyPointsEarned;


            await customer.save();


            /*
            ------------------------------------------------
            LOYALTY AUDIT RECORD
            ------------------------------------------------
            */

            await LoyaltyTransaction.create({

                customer:
                    customer._id,

                sale:
                    sale._id,

                type:
                    "EARN",

                points:
                    loyaltyPointsEarned,

                balanceBefore,

                balanceAfter,

                description:
                    `${loyaltyPointsEarned} point(s) earned from Receipt ${receiptNumber}`,

                createdBy:
                    userId ||
                    null,

            });

        }

    }


    /*
    ========================================================
    RETURN POPULATED SALE
    ========================================================
    */

    const completedSale =
        await Sale.findById(
            sale._id
        )

            .populate(
                "cashier",
                "name username"
            )

            .populate(
                "customer",
                CUSTOMER_POPULATE_FIELDS
            );


    return completedSale;

};


/*
============================================================
GET SALES
============================================================
*/

const getSales = async () => {

    return await Sale.find()

        .populate(
            "cashier",
            "name username"
        )

        .populate(
            "customer",
            CUSTOMER_POPULATE_FIELDS
        )

        .sort({
            createdAt:
                -1,
        });

};


/*
============================================================
GET SALE BY ID
============================================================
*/

const getSaleById = async (
    id
) => {

    /*
    --------------------------------------------------------
    VALIDATE SALE ID
    --------------------------------------------------------
    */

    if (
        !mongoose.Types.ObjectId
            .isValid(
                id
            )
    ) {

        throw new ApiError(
            400,
            "Invalid sale ID."
        );

    }


    const sale =
        await Sale.findById(
            id
        )

            .populate(
                "cashier",
                "name username"
            )

            .populate(
                "customer",
                CUSTOMER_POPULATE_FIELDS
            );


    if (
        !sale
    ) {

        throw new ApiError(
            404,
            "Sale not found."
        );

    }


    return sale;

};


/*
============================================================
VOID SALE
============================================================

Normal product:
→ restore inventory

Open-price item:
→ no inventory restoration

Grocery note:
→ remains part of the original sale item

Loyalty:

If sale earned points:
→ remove earned points

If sale redeemed points:
→ restore redeemed points
============================================================
*/

const voidSale = async (
    saleId,
    userId
) => {

    /*
    --------------------------------------------------------
    VALIDATE SALE ID
    --------------------------------------------------------
    */

    if (
        !mongoose.Types.ObjectId
            .isValid(
                saleId
            )
    ) {

        throw new ApiError(
            400,
            "Invalid sale ID."
        );

    }


    const sale =
        await Sale.findById(
            saleId
        );


    if (
        !sale
    ) {

        throw new ApiError(
            404,
            "Sale not found."
        );

    }


    /*
    ========================================================
    VALIDATE SALE STATUS
    ========================================================
    */

    if (
        sale.status ===
        "VOIDED"
    ) {

        throw new ApiError(
            400,
            "This sale has already been voided."
        );

    }


    if (
        sale.status ===
        "REFUNDED"
    ) {

        throw new ApiError(
            400,
            "A refunded sale cannot be voided."
        );

    }


    if (
        sale.status ===
        "PARTIALLY_REFUNDED"
    ) {

        throw new ApiError(
            400,
            "A partially refunded sale cannot be voided."
        );

    }


    /*
    ========================================================
    RESTORE INVENTORY
    ========================================================
    */

    for (
        const item
        of sale.items
    ) {

        /*
        ----------------------------------------------------
        OPEN PRICE
        ----------------------------------------------------
        */

        if (
            item.isOpenPrice ===
                true ||
            !item.product
        ) {

            continue;

        }


        /*
        ----------------------------------------------------
        NORMAL PRODUCT
        ----------------------------------------------------
        */

        const product =
            await Product.findById(
                item.product
            );


        if (
            !product
        ) {

            throw new ApiError(
                404,
                `Product for ${item.name} no longer exists.`
            );

        }


        const previousStock =
            Number(
                product.stock
            );


        const newStock =
            previousStock +
            Number(
                item.quantity
            );


        product.stock =
            newStock;


        await product.save();


        /*
        ----------------------------------------------------
        INVENTORY TRANSACTION
        ----------------------------------------------------
        */

        await InventoryTransaction.create({

            product:
                product._id,

            type:
                "ADJUSTMENT",

            quantity:
                item.quantity,

            previousStock,

            newStock,

            remarks:
                `Void Sale - Receipt ${sale.receiptNumber}`,

            createdBy:
                userId,

        });

    }


    /*
    ========================================================
    LOYALTY REVERSAL
    ========================================================
    */

    if (
        sale.customer
    ) {

        const customer =
            await Customer.findById(
                sale.customer
            );


        if (
            customer
        ) {

            /*
            =================================================
            REMOVE EARNED POINTS
            =================================================
            */

            const earnedPoints =
                Number(
                    sale.loyaltyPointsEarned
                ) || 0;


            const alreadyReversed =
                Number(
                    sale.loyaltyEarnedPointsReversed
                ) || 0;


            const pointsToReverse =
                Math.max(
                    0,
                    earnedPoints -
                    alreadyReversed
                );


            if (
                pointsToReverse >
                0
            ) {

                const balanceBefore =
                    Number(
                        customer.loyaltyPoints
                    ) || 0;


                const actualPointsRemoved =
                    Math.min(
                        balanceBefore,
                        pointsToReverse
                    );


                const balanceAfter =
                    balanceBefore -
                    actualPointsRemoved;


                customer.loyaltyPoints =
                    balanceAfter;


                customer.lifetimePoints =
                    Math.max(
                        0,
                        (
                            Number(
                                customer.lifetimePoints
                            ) || 0
                        ) -
                        pointsToReverse
                    );


                sale.loyaltyEarnedPointsReversed =
                    alreadyReversed +
                    pointsToReverse;


                await customer.save();


                await LoyaltyTransaction.create({

                    customer:
                        customer._id,

                    sale:
                        sale._id,

                    type:
                        "REVERSAL",

                    points:
                        -actualPointsRemoved,

                    balanceBefore,

                    balanceAfter,

                    description:
                        `Earned loyalty points reversed because Receipt ${sale.receiptNumber} was voided.`,

                    createdBy:
                        userId ||
                        null,

                });

            }


            /*
            =================================================
            RESTORE REDEEMED POINTS
            =================================================
            */

            const redeemedPoints =
                Number(
                    sale.loyaltyPointsRedeemed
                ) || 0;


            const alreadyRestored =
                Number(
                    sale.loyaltyRedeemedPointsRestored
                ) || 0;


            const pointsToRestore =
                Math.max(
                    0,
                    redeemedPoints -
                    alreadyRestored
                );


            if (
                pointsToRestore >
                0
            ) {

                const balanceBefore =
                    Number(
                        customer.loyaltyPoints
                    ) || 0;


                const balanceAfter =
                    balanceBefore +
                    pointsToRestore;


                customer.loyaltyPoints =
                    balanceAfter;


                sale.loyaltyRedeemedPointsRestored =
                    alreadyRestored +
                    pointsToRestore;


                await customer.save();


                await LoyaltyTransaction.create({

                    customer:
                        customer._id,

                    sale:
                        sale._id,

                    type:
                        "REVERSAL",

                    points:
                        pointsToRestore,

                    balanceBefore,

                    balanceAfter,

                    description:
                        `Redeemed loyalty points restored because Receipt ${sale.receiptNumber} was voided.`,

                    createdBy:
                        userId ||
                        null,

                });

            }

        }

    }


    /*
    ========================================================
    UPDATE SALE
    ========================================================
    */

    sale.status =
        "VOIDED";


    await sale.save();


    /*
    ========================================================
    RETURN POPULATED SALE
    ========================================================
    */

    return await Sale.findById(
        sale._id
    )

        .populate(
            "cashier",
            "name username"
        )

        .populate(
            "customer",
            CUSTOMER_POPULATE_FIELDS
        );

};


/*
============================================================
REFUND SALE
============================================================

Supports:

- normal inventory products
- open-price Grocery items

Normal product:
→ inventory restored

Open-price:
→ no inventory restoration

Grocery note:
→ does not affect refund calculations

FULL REFUND:
→ earned points reversed
→ redeemed points restored

PARTIAL REFUND:
→ inventory/refunded quantities are updated

We deliberately do NOT perform proportional loyalty
recalculation for partial refunds yet.
============================================================
*/

const refundSale = async (
    saleId,
    refundItems,
    userId
) => {

    /*
    --------------------------------------------------------
    VALIDATE SALE ID
    --------------------------------------------------------
    */

    if (
        !mongoose.Types.ObjectId
            .isValid(
                saleId
            )
    ) {

        throw new ApiError(
            400,
            "Invalid sale ID."
        );

    }


    const sale =
        await Sale.findById(
            saleId
        );


    if (
        !sale
    ) {

        throw new ApiError(
            404,
            "Sale not found."
        );

    }


    /*
    ========================================================
    VALIDATE STATUS
    ========================================================
    */

    if (
        sale.status ===
        "VOIDED"
    ) {

        throw new ApiError(
            400,
            "A voided sale cannot be refunded."
        );

    }


    if (
        sale.status ===
        "REFUNDED"
    ) {

        throw new ApiError(
            400,
            "This sale has already been fully refunded."
        );

    }


    if (
        !Array.isArray(
            refundItems
        ) ||
        refundItems.length === 0
    ) {

        throw new ApiError(
            400,
            "No refund items provided."
        );

    }


    /*
    ========================================================
    PROCESS REFUNDS
    ========================================================
    */

    for (
        const refundItem
        of refundItems
    ) {

        const quantity =
            Number(
                refundItem.quantity
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity < 1
        ) {

            throw new ApiError(
                400,
                "Refund quantity must be at least 1."
            );

        }


        /*
        ====================================================
        FIND SALE ITEM
        ====================================================
        */

        let saleItem;


        /*
        ----------------------------------------------------
        SALE ITEM ID
        ----------------------------------------------------
        */

        if (
            refundItem.saleItemId
        ) {

            saleItem =
                sale.items.id(
                    refundItem.saleItemId
                );

        }


        /*
        ----------------------------------------------------
        PRODUCT ID FALLBACK
        ----------------------------------------------------
        */

        if (
            !saleItem &&
            refundItem.productId
        ) {

            saleItem =
                sale.items.find(
                    (
                        item
                    ) =>

                        item.product &&

                        item.product
                            .toString() ===
                        refundItem
                            .productId
                            .toString()
                );

        }


        if (
            !saleItem
        ) {

            throw new ApiError(
                400,
                "Item was not included in this sale."
            );

        }


        /*
        ====================================================
        REFUNDABLE QUANTITY
        ====================================================
        */

        const refundedQuantity =
            Number(
                saleItem
                    .refundedQuantity ||
                0
            );


        const refundableQuantity =
            Number(
                saleItem.quantity
            ) -
            refundedQuantity;


        if (
            quantity >
            refundableQuantity
        ) {

            throw new ApiError(
                400,
                `Only ${refundableQuantity} unit(s) of ${saleItem.name} can be refunded.`
            );

        }


        /*
        ====================================================
        NORMAL PRODUCT

        Restore inventory.
        ====================================================
        */

        if (
            saleItem.isOpenPrice !==
                true &&
            saleItem.product
        ) {

            const product =
                await Product.findById(
                    saleItem.product
                );


            if (
                !product
            ) {

                throw new ApiError(
                    404,
                    `Product "${saleItem.name}" no longer exists.`
                );

            }


            const previousStock =
                Number(
                    product.stock
                );


            const newStock =
                previousStock +
                quantity;


            product.stock =
                newStock;


            await product.save();


            /*
            ------------------------------------------------
            INVENTORY TRANSACTION
            ------------------------------------------------
            */

            await InventoryTransaction.create({

                product:
                    product._id,

                type:
                    "ADJUSTMENT",

                quantity,

                previousStock,

                newStock,

                remarks:
                    `Refund - Receipt ${sale.receiptNumber}`,

                createdBy:
                    userId,

            });

        }


        /*
        ====================================================
        UPDATE REFUNDED QUANTITY
        ====================================================
        */

        saleItem.refundedQuantity =
            refundedQuantity +
            quantity;

    }


    /*
    ========================================================
    DETERMINE SALE STATUS
    ========================================================
    */

    const fullyRefunded =
        sale.items.every(
            (
                item
            ) =>

                Number(
                    item.refundedQuantity ||
                    0
                ) >=

                Number(
                    item.quantity
                )
        );


    sale.status =
        fullyRefunded
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED";


    /*
    ========================================================
    FULL REFUND LOYALTY REVERSAL
    ========================================================

    Full refund:

    1. Remove points earned by this sale
    2. Restore points redeemed on this sale

    Partial refunds are intentionally handled separately
    later.
    ========================================================
    */

    if (
        fullyRefunded &&
        sale.customer
    ) {

        const customer =
            await Customer.findById(
                sale.customer
            );


        if (
            customer
        ) {

            /*
            =================================================
            REMOVE EARNED POINTS
            =================================================
            */

            const earnedPoints =
                Number(
                    sale.loyaltyPointsEarned
                ) || 0;


            const alreadyReversed =
                Number(
                    sale.loyaltyEarnedPointsReversed
                ) || 0;


            const pointsToReverse =
                Math.max(
                    0,
                    earnedPoints -
                    alreadyReversed
                );


            if (
                pointsToReverse >
                0
            ) {

                const balanceBefore =
                    Number(
                        customer.loyaltyPoints
                    ) || 0;


                const actualPointsRemoved =
                    Math.min(
                        balanceBefore,
                        pointsToReverse
                    );


                const balanceAfter =
                    balanceBefore -
                    actualPointsRemoved;


                customer.loyaltyPoints =
                    balanceAfter;


                customer.lifetimePoints =
                    Math.max(
                        0,
                        (
                            Number(
                                customer.lifetimePoints
                            ) || 0
                        ) -
                        pointsToReverse
                    );


                sale.loyaltyEarnedPointsReversed =
                    alreadyReversed +
                    pointsToReverse;


                await customer.save();


                await LoyaltyTransaction.create({

                    customer:
                        customer._id,

                    sale:
                        sale._id,

                    type:
                        "REVERSAL",

                    points:
                        -actualPointsRemoved,

                    balanceBefore,

                    balanceAfter,

                    description:
                        `Earned loyalty points reversed because Receipt ${sale.receiptNumber} was fully refunded.`,

                    createdBy:
                        userId ||
                        null,

                });

            }


            /*
            =================================================
            RESTORE REDEEMED POINTS
            =================================================
            */

            const redeemedPoints =
                Number(
                    sale.loyaltyPointsRedeemed
                ) || 0;


            const alreadyRestored =
                Number(
                    sale.loyaltyRedeemedPointsRestored
                ) || 0;


            const pointsToRestore =
                Math.max(
                    0,
                    redeemedPoints -
                    alreadyRestored
                );


            if (
                pointsToRestore >
                0
            ) {

                const balanceBefore =
                    Number(
                        customer.loyaltyPoints
                    ) || 0;


                const balanceAfter =
                    balanceBefore +
                    pointsToRestore;


                customer.loyaltyPoints =
                    balanceAfter;


                sale.loyaltyRedeemedPointsRestored =
                    alreadyRestored +
                    pointsToRestore;


                await customer.save();


                await LoyaltyTransaction.create({

                    customer:
                        customer._id,

                    sale:
                        sale._id,

                    type:
                        "REVERSAL",

                    points:
                        pointsToRestore,

                    balanceBefore,

                    balanceAfter,

                    description:
                        `Redeemed loyalty points restored because Receipt ${sale.receiptNumber} was fully refunded.`,

                    createdBy:
                        userId ||
                        null,

                });

            }

        }

    }


    /*
    ========================================================
    SAVE SALE
    ========================================================
    */

    await sale.save();


    /*
    ========================================================
    RETURN POPULATED SALE
    ========================================================
    */

    return await Sale.findById(
        sale._id
    )

        .populate(
            "cashier",
            "name username"
        )

        .populate(
            "customer",
            CUSTOMER_POPULATE_FIELDS
        );

};


/*
============================================================
EXPORT
============================================================
*/

export default {

    checkout,

    getSales,

    getSaleById,

    voidSale,

    refundSale,

};