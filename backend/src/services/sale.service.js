import mongoose from "mongoose";

import Sale from "../models/sale.model.js";

import Product from "../models/product.model.js";

import BulkOrder from "../models/bulkOrder.model.js";

import InventoryTransaction from "../models/inventoryTransaction.model.js";

import Customer from "../models/customer.model.js";

import LoyaltyTransaction from "../models/loyaltyTransaction.model.js";

import ApiError from "../utils/ApiError.js";

import withTransaction from "../utils/withTransaction.js";

import branchInventoryService from "./branch-inventory.service.js";

import bulkOrderService from "./bulkOrder.service.js";

import syncOutboxService
    from "./syncOutbox.service.js";

import {
    generateReceiptNumber,
} from "../utils/receipt.js";

import {
    calculateSubtotal,
} from "../utils/pricing.js";


/*
============================================================
LOYALTY CONFIGURATION
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
POPULATE FIELDS
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


const BRANCH_POPULATE_FIELDS = `
    code
    name
    address
    phone
    email
    isDefault
    isActive
`;


/*
============================================================
MONEY
============================================================
*/

const roundMoney = (
    value
) => {

    const number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return 0;

    }


    return Math.round(
        (
            number +
            Number.EPSILON
        ) *
        100
    ) /
    100;

};


/*
============================================================
LOYALTY POINT CALCULATION
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
        numericAmount <=
        0
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
BRANCH HELPERS
============================================================
*/

const normalizeBranchId = (
    value
) => {

    const branchId =
        value?._id ||
        value;


    if (
        !branchId ||
        !mongoose.Types.ObjectId
            .isValid(
                branchId
            )
    ) {

        return null;

    }


    return String(
        branchId
    );

};


const requireBranchId = (
    value
) => {

    const branchId =
        normalizeBranchId(
            value
        );


    if (
        !branchId
    ) {

        throw new ApiError(
            400,
            "A valid branch context is required."
        );

    }


    return branchId;

};


const buildBranchSnapshot = (
    branch
) => {

    if (
        !branch
    ) {

        throw new ApiError(
            400,
            "Branch information is required to complete the sale."
        );

    }


    const branchId =
        requireBranchId(
            branch
        );


    const code =
        String(
            branch.code ||
            ""
        )
            .trim()
            .toUpperCase();


    const name =
        String(
            branch.name ||
            ""
        ).trim();


    if (
        !code ||
        !name
    ) {

        throw new ApiError(
            400,
            "The selected branch has incomplete branch information."
        );

    }


    if (
        branch.isActive ===
        false
    ) {

        throw new ApiError(
            400,
            "The selected branch is inactive."
        );

    }


    return {

        branchId,

        snapshot: {

            code,

            name,

        },

    };

};


/*
============================================================
NORMALIZE PREPARED CART CONTEXT
============================================================
*/

const normalizePreparedCartContext = (
    preparedCartContext
) => {

    if (
        !preparedCartContext
    ) {

        return null;

    }


    const preparedCartId =
        String(
            preparedCartContext
                .preparedCartId ||
            ""
        ).trim();


    const claimToken =
        String(
            preparedCartContext
                .claimToken ||
            ""
        ).trim();


    if (
        !preparedCartId &&
        !claimToken
    ) {

        return null;

    }


    if (
        !preparedCartId ||
        !claimToken
    ) {

        throw new ApiError(
            400,
            "Prepared cart ID and claim token are both required."
        );

    }


    if (
        !mongoose.Types.ObjectId
            .isValid(
                preparedCartId
            )
    ) {

        throw new ApiError(
            400,
            "Invalid prepared cart ID."
        );

    }


    return {

        preparedCartId,

        claimToken,

    };

};


/*
============================================================
POPULATE SALE
============================================================
*/

const populateSale = async (
    saleId
) => {

    return await Sale
        .findById(
            saleId
        )

        .populate(
            "branch",
            BRANCH_POPULATE_FIELDS
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
LOAD CUSTOMER FOR TRANSACTION
============================================================
*/

const loadCheckoutCustomer = async (
    customerId,
    session
) => {

    if (
        !customerId
    ) {

        return null;

    }


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


    const customer =
        await Customer
            .findById(
                customerId
            )
            .session(
                session
            );


    if (
        !customer
    ) {

        throw new ApiError(
            404,
            "Customer not found."
        );

    }


    if (
        customer.isActive ===
        false
    ) {

        throw new ApiError(
            400,
            "The selected customer is inactive."
        );

    }


    return customer;

};


/*
============================================================
CALCULATE LOYALTY
============================================================
*/

const calculateCheckoutLoyalty = (
    {
        customer,
        totalBeforeLoyalty,
        loyaltyPointsToRedeem,
    }
) => {

    const requestedPoints =
        Number(
            loyaltyPointsToRedeem
        ) || 0;


    let loyaltyPointsRedeemed =
        0;


    let loyaltyDiscount =
        0;


    if (
        requestedPoints <
        0
    ) {

        throw new ApiError(
            400,
            "Loyalty points cannot be negative."
        );

    }


    if (
        requestedPoints >
            0 &&
        !customer
    ) {

        throw new ApiError(
            400,
            "A registered customer is required to redeem loyalty points."
        );

    }


    if (
        requestedPoints >
        0
    ) {

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


        if (
            requestedPoints <
            LOYALTY_MIN_REDEMPTION
        ) {

            throw new ApiError(
                400,
                `Minimum loyalty redemption is ${LOYALTY_MIN_REDEMPTION} points.`
            );

        }


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


        const requestedDiscount =
            requestedPoints *
            LOYALTY_POINT_VALUE;


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


    return {
        loyaltyPointsRedeemed,

        loyaltyDiscount,
    };

};


/*
============================================================
APPLY LOYALTY
============================================================
*/

const applyCheckoutLoyalty = async (
    {
        customer,
        sale,
        receiptNumber,
        loyaltyPointsRedeemed,
        loyaltyPointsEarned,
        userId,
        session,
    }
) => {

    if (
        !customer
    ) {

        return;

    }


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


        if (
            balanceAfter <
            0
        ) {

            throw new ApiError(
                400,
                "Customer does not have enough loyalty points."
            );

        }


        customer.loyaltyPoints =
            balanceAfter;


        await customer.save({
            session,
        });


        await LoyaltyTransaction
            .create(
                [
                    {
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
                    },
                ],
                {
                    session,
                }
            );

    }


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


        customer.loyaltyPoints =
            balanceAfter;


        customer.lifetimePoints =
            (
                Number(
                    customer.lifetimePoints
                ) || 0
            ) +
            loyaltyPointsEarned;


        await customer.save({
            session,
        });


        await LoyaltyTransaction
            .create(
                [
                    {
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
                    },
                ],
                {
                    session,
                }
            );

    }

};


/*
============================================================
CHECKOUT
============================================================
*/

const checkout = async (
    data,
    userId,
    activeBranch,
    preparedCartContext = null
) => {

    const {
        branchId,
        snapshot:
            branchSnapshot,
    } =
        buildBranchSnapshot(
            activeBranch
        );


    const normalizedPreparedCart =
        normalizePreparedCartContext(
            preparedCartContext
        );


    const {
        items,
        discount = 0,
        payment,
        paymentMethod = "Cash",
        customerId = null,
        loyaltyPointsToRedeem = 0,
    } =
        data;


    /*
    ========================================================
    BASIC CART
    ========================================================
    */

    if (
        !Array.isArray(
            items
        ) ||
        items.length ===
            0
    ) {

        throw new ApiError(
            400,
            "Cart is empty."
        );

    }


    /*
    ========================================================
    TRANSACTION
    ========================================================
    */

    const saleId =
        await withTransaction(
            async (
                session
            ) => {

                /*
                =============================================
                CUSTOMER
                =============================================
                */

                const customer =
                    await loadCheckoutCustomer(
                        customerId,
                        session
                    );


                let subtotal =
                    0;


                const saleItems =
                    [];


                /*
                =============================================
                PREPARE ITEMS
                =============================================
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
                        quantity <
                            1
                    ) {

                        throw new ApiError(
                            400,
                            "Invalid item quantity."
                        );

                    }


                    /*
                    -----------------------------------------
                    OPEN PRICE
                    -----------------------------------------
                    */

                    if (
                        cartItem.isOpenPrice ===
                        true
                    ) {

                        const unitPrice =
                            Number(
                                cartItem.unitPrice
                            );


                        if (
                            !Number.isFinite(
                                unitPrice
                            ) ||
                            unitPrice <=
                                0
                        ) {

                            throw new ApiError(
                                400,
                                "Open-price item must have a valid price."
                            );

                        }


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


                        const lineSubtotal =
                            unitPrice *
                            quantity;


                        subtotal +=
                            lineSubtotal;


                        saleItems.push({

                            product:
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
                    -----------------------------------------
                    NORMAL PRODUCT
                    -----------------------------------------
                    */

                    if (
                        !cartItem.productId ||
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


                    const product =
                        await Product
                            .findById(
                                cartItem.productId
                            )
                            .session(
                                session
                            );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            404,
                            "Product not found."
                        );

                    }


                    if (
                        !product.isActive
                    ) {

                        throw new ApiError(
                            400,
                            `${product.name} is inactive.`
                        );

                    }


                    await branchInventoryService
                        .requireInventory(
                            branchId,
                            product._id,
                            {
                                session,
                            }
                        );


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


                    saleItems.push({

                        product:
                            product._id,

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
                =============================================
                DISCOUNT
                =============================================
                */

                const numericDiscount =
                    Number(
                        discount
                    ) || 0;


                if (
                    numericDiscount <
                    0
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


                const totalBeforeLoyalty =
                    Math.max(
                        0,
                        subtotal -
                        numericDiscount
                    );


                /*
                =============================================
                LOYALTY
                =============================================
                */

                const {
                    loyaltyPointsRedeemed,
                    loyaltyDiscount,
                } =
                    calculateCheckoutLoyalty({
                        customer,

                        totalBeforeLoyalty,

                        loyaltyPointsToRedeem,
                    });


                const total =
                    Math.max(
                        0,
                        totalBeforeLoyalty -
                        loyaltyDiscount
                    );


                const loyaltyPointsEarned =
                    customer
                        ? calculateLoyaltyPoints(
                            total
                        )
                        : 0;


                /*
                =============================================
                PAYMENT
                =============================================
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
                =============================================
                RECEIPT NUMBER
                =============================================
                */

                const receiptNumber =
                    await generateReceiptNumber(
                        activeBranch,
                        session
                    );


                /*
                =============================================
                DEDUCT BRANCH INVENTORY
                =============================================
                */

                for (
                    const item
                    of saleItems
                ) {

                    if (
                        item.isOpenPrice ||
                        !item.product
                    ) {

                        continue;

                    }


                    const movement =
                        await branchInventoryService
                            .deductStock(
                                branchId,
                                item.product,
                                item.quantity,
                                {
                                    session,
                                }
                            );


                    await InventoryTransaction
                        .create(
                            [
                                {
                                    branch:
                                        branchId,

                                    branchSnapshot,

                                    product:
                                        item.product,

                                    type:
                                        "SALE",

                                    quantity:
                                        item.quantity,

                                    previousStock:
                                        movement
                                            .previousStock,

                                    newStock:
                                        movement
                                            .newStock,

                                    remarks:
                                        `Receipt ${receiptNumber}`,

                                    createdBy:
                                        userId,
                                },
                            ],
                            {
                                session,
                            }
                        );

                }


                /*
                =============================================
                CREATE SALE
                =============================================
                */

                const [
                    sale,
                ] =
                    await Sale.create(
                        [
                            {
                                branch:
                                    branchId,

                                branchSnapshot,

                                receiptNumber,

                                cashier:
                                    userId ||
                                    null,

                                customer:
                                    customer?._id ||
                                    null,

                                items:
                                    saleItems,

                                subtotal,

                                discount:
                                    numericDiscount,

                                loyaltyPointsRedeemed,

                                loyaltyDiscount,

                                loyaltyPointsEarned,

                                loyaltyEarnedPointsReversed:
                                    0,

                                loyaltyRedeemedPointsRestored:
                                    0,

                                total,

                                payment:
                                    numericPayment,

                                paymentMethod,

                                change,
                            },
                        ],
                        {
                            session,
                        }
                    );


                /*
                =============================================
                LOYALTY TRANSACTIONS
                =============================================
                */

                await applyCheckoutLoyalty({
                    customer,

                    sale,

                    receiptNumber,

                    loyaltyPointsRedeemed,

                    loyaltyPointsEarned,

                    userId,

                    session,
                });


                /*
                =============================================
                NORMAL CLOUD SYNC EVENT
                =============================================
                */

                await syncOutboxService
                    .enqueueSyncRequest({

                        source:
                            "SALE",

                        action:
                            "CHECKOUT",

                        aggregateId:
                            sale._id,

                        branchId,

                        session,

                    });


                /*
                =============================================
                PREPARED CART FINALIZE EVENT
                =============================================
                */

                if (
                    normalizedPreparedCart
                ) {

                    await syncOutboxService
                        .enqueuePreparedCartFinalize({

                            preparedCartId:
                                normalizedPreparedCart
                                    .preparedCartId,

                            saleId:
                                sale._id,

                            claimToken:
                                normalizedPreparedCart
                                    .claimToken,

                            userId,

                            branchId,

                            session,

                        });

                }


                return sale._id;

            }
        );


    return await populateSale(
        saleId
    );

};


/*
============================================================
CHECKOUT BULK ORDER
============================================================

Direct Bulk Order History payment workflow.

SAVED BULK ORDER
        ↓
PAY
        ↓
NORMAL SALE
        ↓
BRANCH INVENTORY DEDUCTION
        ↓
INVENTORY AUDIT
        ↓
BULK ORDER COMPLETED


SECURITY

The frontend does NOT provide:

- items
- product IDs
- quantities
- item prices
- subtotal
- branch ID

Those values are loaded from the SAVED Bulk Order.

The frontend provides only payment/customer/loyalty data.


PRICING

The saved Bulk Order line totals are treated as the agreed
price.

This means a Product price change after the order was saved
does not silently change the amount when the customer pays.


ATOMICITY

Sale creation
+
inventory deduction
+
inventory audit
+
loyalty
+
Bulk Order completion
+
sync outbox

all use the SAME MongoDB transaction.
============================================================
*/

const checkoutBulkOrder = async (
    bulkOrderId,
    data,
    userId,
    activeBranch
) => {

    /*
    ========================================================
    VALIDATE BULK ORDER ID
    ========================================================
    */

    if (
        !bulkOrderId ||
        !mongoose.Types.ObjectId
            .isValid(
                bulkOrderId
            )
    ) {

        throw new ApiError(
            400,
            "Invalid Bulk Order ID."
        );

    }


    const {
        branchId,
        snapshot:
            branchSnapshot,
    } =
        buildBranchSnapshot(
            activeBranch
        );


    const {
        payment,
        paymentMethod = "Cash",
        customerId = null,
        loyaltyPointsToRedeem = 0,
    } =
        data ||
        {};


    /*
    ========================================================
    IMPORTANT

    Bulk Order payment does not accept an additional manual
    POS discount.

    The saved Bulk Order total is the agreed merchandise
    subtotal.

    Loyalty redemption can still reduce the final payable
    amount in the same way as ordinary POS checkout.
    ========================================================
    */


    /*
    ========================================================
    FAST IDEMPOTENCY CHECK
    ========================================================

    If a previous request already committed successfully but
    the browser retried because the response was lost, return
    the existing Sale instead of creating another one.

    The transaction performs the same check again.
    ========================================================
    */

    const existingOrder =
        await BulkOrder
            .findOne({
                _id:
                    bulkOrderId,

                branch:
                    branchId,
            })
            .select(
                "status sale saleNumber"
            );


    if (
        !existingOrder
    ) {

        throw new ApiError(
            404,
            "Bulk Order not found in the active branch."
        );

    }


    if (
        existingOrder.status ===
            "COMPLETED"
    ) {

        if (
            !existingOrder.sale
        ) {

            throw new ApiError(
                409,
                "Bulk Order is completed but does not contain a linked Sale."
            );

        }


        const existingSale =
            await populateSale(
                existingOrder.sale
            );


        if (
            !existingSale
        ) {

            throw new ApiError(
                409,
                "Bulk Order references a Sale that could not be found."
            );

        }


        return {
            alreadyCompleted:
                true,

            bulkOrderId:
                existingOrder._id,

            orderNumber:
                existingOrder.orderNumber,

            sale:
                existingSale,
        };

    }


    /*
    ========================================================
    TRANSACTION
    ========================================================
    */

    const result =
        await withTransaction(
            async (
                session
            ) => {

                /*
                =============================================
                LOAD AUTHORITATIVE BULK ORDER
                =============================================
                */

                const order =
                    await BulkOrder
                        .findOne({
                            _id:
                                bulkOrderId,

                            branch:
                                branchId,
                        })
                        .session(
                            session
                        );


                if (
                    !order
                ) {

                    throw new ApiError(
                        404,
                        "Bulk Order not found in the active branch."
                    );

                }


                /*
                =============================================
                IDEMPOTENCY INSIDE TRANSACTION
                =============================================
                */

                if (
                    order.status ===
                    "COMPLETED"
                ) {

                    if (
                        !order.sale
                    ) {

                        throw new ApiError(
                            409,
                            "Bulk Order is completed but does not contain a linked Sale."
                        );

                    }


                    return {
                        alreadyCompleted:
                            true,

                        bulkOrderId:
                            order._id,

                        saleId:
                            order.sale,
                    };

                }


                if (
                    order.status !==
                    "SAVED"
                ) {

                    throw new ApiError(
                        409,
                        `Only SAVED Bulk Orders can be paid. Current status: ${order.status}.`
                    );

                }


                if (
                    order.sale
                ) {

                    throw new ApiError(
                        409,
                        "Bulk Order already contains a Sale reference."
                    );

                }


                if (
                    !Array.isArray(
                        order.items
                    ) ||
                    order.items.length ===
                        0
                ) {

                    throw new ApiError(
                        400,
                        "Bulk Order does not contain any items."
                    );

                }


                /*
                =============================================
                CUSTOMER
                =============================================
                */

                const customer =
                    await loadCheckoutCustomer(
                        customerId,
                        session
                    );


                /*
                =============================================
                PREPARE SALE ITEMS
                =============================================

                Product identity and availability are
                revalidated.

                Prices come from the SAVED Bulk Order.
                =============================================
                */

                const saleItems =
                    [];


                let subtotal =
                    0;


                for (
                    const orderItem
                    of order.items
                ) {

                    const quantity =
                        Number(
                            orderItem.quantity
                        );


                    if (
                        !Number.isInteger(
                            quantity
                        ) ||
                        quantity <
                            1
                    ) {

                        throw new ApiError(
                            409,
                            `Bulk Order contains an invalid quantity for ${orderItem.name || "an item"}.`
                        );

                    }


                    if (
                        !orderItem.product ||
                        !mongoose.Types.ObjectId
                            .isValid(
                                orderItem.product
                            )
                    ) {

                        throw new ApiError(
                            409,
                            `Bulk Order item ${orderItem.name || ""} no longer has a valid Product reference.`
                        );

                    }


                    const product =
                        await Product
                            .findById(
                                orderItem.product
                            )
                            .session(
                                session
                            );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            404,
                            `Product "${orderItem.name || "Unknown"}" no longer exists.`
                        );

                    }


                    if (
                        !product.isActive
                    ) {

                        throw new ApiError(
                            400,
                            `${product.name} is inactive.`
                        );

                    }


                    /*
                    -----------------------------------------
                    REQUIRE BRANCH INVENTORY RECORD
                    -----------------------------------------
                    */

                    await branchInventoryService
                        .requireInventory(
                            branchId,
                            product._id,
                            {
                                session,
                            }
                        );


                    /*
                    -----------------------------------------
                    SAVED AGREED PRICE
                    -----------------------------------------
                    */

                    const lineSubtotal =
                        Number(
                            orderItem.lineTotal
                        );


                    if (
                        !Number.isFinite(
                            lineSubtotal
                        ) ||
                        lineSubtotal <
                            0
                    ) {

                        throw new ApiError(
                            409,
                            `Bulk Order contains an invalid saved price for ${orderItem.name || product.name}.`
                        );

                    }


                    const normalizedLineSubtotal =
                        roundMoney(
                            lineSubtotal
                        );


                    const unitPrice =
                        normalizedLineSubtotal /
                        quantity;


                    subtotal +=
                        normalizedLineSubtotal;


                    saleItems.push({

                        product:
                            product._id,

                        isOpenPrice:
                            false,

                        /*
                        Use the historical Bulk Order snapshot
                        for the receipt identity.

                        This prevents a later Product rename
                        from changing what the customer agreed
                        to buy.
                        */

                        barcode:
                            String(
                                orderItem.barcode ||
                                product.barcode ||
                                ""
                            ),

                        name:
                            String(
                                orderItem.name ||
                                product.name ||
                                ""
                            ),

                        note:
                            "",

                        quantity,

                        unitPrice,

                        subtotal:
                            normalizedLineSubtotal,

                    });

                }


                subtotal =
                    roundMoney(
                        subtotal
                    );


                /*
                =============================================
                VERIFY STORED TOTAL
                =============================================

                Detect corrupted/inconsistent Bulk Order data
                before any stock deduction occurs.
                =============================================
                */

                const storedOrderTotal =
                    roundMoney(
                        order.totalAmount
                    );


                if (
                    Math.abs(
                        subtotal -
                        storedOrderTotal
                    ) >
                    0.009
                ) {

                    throw new ApiError(
                        409,
                        "Bulk Order item totals do not match the saved order total. Edit and save the order again before payment."
                    );

                }


                /*
                =============================================
                DISCOUNT
                =============================================

                Bulk Order already contains its agreed item
                prices.

                No extra POS discount is accepted here.
                =============================================
                */

                const numericDiscount =
                    0;


                const totalBeforeLoyalty =
                    subtotal;


                /*
                =============================================
                LOYALTY REDEMPTION
                =============================================
                */

                const {
                    loyaltyPointsRedeemed,
                    loyaltyDiscount,
                } =
                    calculateCheckoutLoyalty({
                        customer,

                        totalBeforeLoyalty,

                        loyaltyPointsToRedeem,
                    });


                const total =
                    roundMoney(
                        Math.max(
                            0,
                            totalBeforeLoyalty -
                            loyaltyDiscount
                        )
                    );


                const loyaltyPointsEarned =
                    customer
                        ? calculateLoyaltyPoints(
                            total
                        )
                        : 0;


                /*
                =============================================
                PAYMENT
                =============================================
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
                    roundMoney(
                        numericPayment -
                        total
                    );


                /*
                =============================================
                RECEIPT NUMBER
                =============================================
                */

                const receiptNumber =
                    await generateReceiptNumber(
                        activeBranch,
                        session
                    );


                /*
                =============================================
                DEDUCT BRANCH INVENTORY
                =============================================

                deductStock() remains authoritative for the
                final stock check.

                If ANY item fails, the transaction rolls back.
                =============================================
                */

                for (
                    const item
                    of saleItems
                ) {

                    const movement =
                        await branchInventoryService
                            .deductStock(
                                branchId,
                                item.product,
                                item.quantity,
                                {
                                    session,
                                }
                            );


                    await InventoryTransaction
                        .create(
                            [
                                {
                                    branch:
                                        branchId,

                                    branchSnapshot,

                                    product:
                                        item.product,

                                    type:
                                        "SALE",

                                    quantity:
                                        item.quantity,

                                    previousStock:
                                        movement
                                            .previousStock,

                                    newStock:
                                        movement
                                            .newStock,

                                    remarks:
                                        `Receipt ${receiptNumber} - Bulk Order ${order.orderNumber}`,

                                    createdBy:
                                        userId,
                                },
                            ],
                            {
                                session,
                            }
                        );

                }


                /*
                =============================================
                CREATE NORMAL SALE
                =============================================
                */

                const [
                    sale,
                ] =
                    await Sale.create(
                        [
                            {
                                branch:
                                    branchId,

                                branchSnapshot,

                                receiptNumber,

                                cashier:
                                    userId ||
                                    null,

                                customer:
                                    customer?._id ||
                                    null,

                                items:
                                    saleItems,

                                subtotal,

                                discount:
                                    numericDiscount,

                                loyaltyPointsRedeemed,

                                loyaltyDiscount,

                                loyaltyPointsEarned,

                                loyaltyEarnedPointsReversed:
                                    0,

                                loyaltyRedeemedPointsRestored:
                                    0,

                                total,

                                payment:
                                    numericPayment,

                                paymentMethod,

                                change,
                            },
                        ],
                        {
                            session,
                        }
                    );


                /*
                =============================================
                LOYALTY
                =============================================
                */

                await applyCheckoutLoyalty({
                    customer,

                    sale,

                    receiptNumber,

                    loyaltyPointsRedeemed,

                    loyaltyPointsEarned,

                    userId,

                    session,
                });


                /*
                =============================================
                COMPLETE BULK ORDER
                =============================================

                CRITICAL:

                We pass the SAME session.

                completeWithSale() must therefore NOT open a
                second transaction.
                =============================================
                */

                await bulkOrderService
                    .completeWithSale(
                        order._id,
                        sale._id,
                        receiptNumber,
                        userId,
                        activeBranch,
                        {
                            session,
                        }
                    );


                /*
                =============================================
                SALE CLOUD SYNC
                =============================================

                completeWithSale() separately creates the
                BULK_ORDER / COMPLETE outbox event using the
                same transaction.
                =============================================
                */

                await syncOutboxService
                    .enqueueSyncRequest({

                        source:
                            "SALE",

                        action:
                            "CHECKOUT",

                        aggregateId:
                            sale._id,

                        branchId,

                        session,

                    });


                return {
                    alreadyCompleted:
                        false,

                    bulkOrderId:
                        order._id,

                    saleId:
                        sale._id,
                };

            }
        );


    /*
    ========================================================
    RESPONSE
    ========================================================

    If a transaction retry observes the order already
    completed, return the existing linked Sale.

    Otherwise return the Sale just created.
    ========================================================
    */

    const sale =
        await populateSale(
            result.saleId
        );


    if (
        !sale
    ) {

        throw new ApiError(
            500,
            "Sale was completed but could not be loaded."
        );

    }


    const completedOrder =
        await BulkOrder
            .findOne({
                _id:
                    result.bulkOrderId,

                branch:
                    branchId,
            })
            .select(
                "orderNumber status pricingMode revision totalAmount sale saleNumber completedAt"
            );


    return {
        alreadyCompleted:
            result.alreadyCompleted ===
            true,

        bulkOrderId:
            completedOrder?._id ||
            result.bulkOrderId,

        orderNumber:
            completedOrder?.orderNumber ||
            "",

        pricingMode:
            completedOrder?.pricingMode ||
            "RETAIL",

        status:
            completedOrder?.status ||
            "COMPLETED",

        sale,

        bulkOrder:
            completedOrder,
    };

};


/*
============================================================
GET SALES
============================================================
*/

const getSales = async (
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    return await Sale
        .find({

            branch:
                resolvedBranchId,

        })

        .populate(
            "branch",
            BRANCH_POPULATE_FIELDS
        )

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
    id,
    branchId
) => {

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


    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const sale =
        await Sale
            .findOne({

                _id:
                    id,

                branch:
                    resolvedBranchId,

            })

            .populate(
                "branch",
                BRANCH_POPULATE_FIELDS
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
            "Sale not found in the selected branch."
        );

    }


    return sale;

};


/*
============================================================
VOID SALE
============================================================
*/

const voidSale = async (
    saleId,
    userId,
    branchId
) => {

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


    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const completedSaleId =
        await withTransaction(
            async (
                session
            ) => {

                const sale =
                    await Sale
                        .findOne({

                            _id:
                                saleId,

                            branch:
                                resolvedBranchId,

                        })
                        .session(
                            session
                        );


                if (
                    !sale
                ) {

                    throw new ApiError(
                        404,
                        "Sale not found in the selected branch."
                    );

                }


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


                for (
                    const item
                    of sale.items
                ) {

                    if (
                        item.isOpenPrice ===
                            true ||
                        !item.product
                    ) {

                        continue;

                    }


                    const product =
                        await Product
                            .findById(
                                item.product
                            )
                            .session(
                                session
                            );


                    if (
                        !product
                    ) {

                        throw new ApiError(
                            404,
                            `Product for ${item.name} no longer exists.`
                        );

                    }


                    const movement =
                        await branchInventoryService
                            .addStock(
                                resolvedBranchId,
                                product._id,
                                Number(
                                    item.quantity
                                ),
                                {
                                    session,
                                }
                            );


                    await InventoryTransaction
                        .create(
                            [
                                {
                                    branch:
                                        resolvedBranchId,

                                    branchSnapshot: {

                                        code:
                                            sale
                                                .branchSnapshot
                                                ?.code ||
                                            "",

                                        name:
                                            sale
                                                .branchSnapshot
                                                ?.name ||
                                            "",

                                    },

                                    product:
                                        product._id,

                                    type:
                                        "ADJUSTMENT",

                                    quantity:
                                        Number(
                                            item.quantity
                                        ),

                                    previousStock:
                                        movement
                                            .previousStock,

                                    newStock:
                                        movement
                                            .newStock,

                                    remarks:
                                        `Void Sale - Receipt ${sale.receiptNumber}`,

                                    createdBy:
                                        userId,
                                },
                            ],
                            {
                                session,
                            }
                        );

                }


                if (
                    sale.customer
                ) {

                    const customer =
                        await Customer
                            .findById(
                                sale.customer
                            )
                            .session(
                                session
                            );


                    if (
                        customer
                    ) {

                        const earnedPoints =
                            Number(
                                sale
                                    .loyaltyPointsEarned
                            ) || 0;


                        const alreadyReversed =
                            Number(
                                sale
                                    .loyaltyEarnedPointsReversed
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
                                    customer
                                        .loyaltyPoints
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
                                            customer
                                                .lifetimePoints
                                        ) || 0
                                    ) -
                                    pointsToReverse
                                );


                            sale.loyaltyEarnedPointsReversed =
                                alreadyReversed +
                                pointsToReverse;


                            await customer.save({
                                session,
                            });


                            await LoyaltyTransaction
                                .create(
                                    [
                                        {
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
                                        },
                                    ],
                                    {
                                        session,
                                    }
                                );

                        }


                        const redeemedPoints =
                            Number(
                                sale
                                    .loyaltyPointsRedeemed
                            ) || 0;


                        const alreadyRestored =
                            Number(
                                sale
                                    .loyaltyRedeemedPointsRestored
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
                                    customer
                                        .loyaltyPoints
                                ) || 0;


                            const balanceAfter =
                                balanceBefore +
                                pointsToRestore;


                            customer.loyaltyPoints =
                                balanceAfter;


                            sale.loyaltyRedeemedPointsRestored =
                                alreadyRestored +
                                pointsToRestore;


                            await customer.save({
                                session,
                            });


                            await LoyaltyTransaction
                                .create(
                                    [
                                        {
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
                                    },
                                ],
                                {
                                    session,
                                }
                            );

                        }

                    }

                }


                sale.status =
                    "VOIDED";


                await sale.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({

                        source:
                            "SALE",

                        action:
                            "VOID",

                        aggregateId:
                            sale._id,

                        branchId:
                            resolvedBranchId,

                        session,

                    });


                return sale._id;

            }
        );


    return await populateSale(
        completedSaleId
    );

};


/*
============================================================
REFUND SALE
============================================================
*/

const refundSale = async (
    saleId,
    refundItems,
    userId,
    branchId
) => {

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


    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    if (
        !Array.isArray(
            refundItems
        ) ||
        refundItems.length ===
            0
    ) {

        throw new ApiError(
            400,
            "No refund items provided."
        );

    }


    const completedSaleId =
        await withTransaction(
            async (
                session
            ) => {

                const sale =
                    await Sale
                        .findOne({

                            _id:
                                saleId,

                            branch:
                                resolvedBranchId,

                        })
                        .session(
                            session
                        );


                if (
                    !sale
                ) {

                    throw new ApiError(
                        404,
                        "Sale not found in the selected branch."
                    );

                }


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
                        quantity <
                            1
                    ) {

                        throw new ApiError(
                            400,
                            "Refund quantity must be at least 1."
                        );

                    }


                    let saleItem;


                    if (
                        refundItem.saleItemId
                    ) {

                        saleItem =
                            sale.items.id(
                                refundItem
                                    .saleItemId
                            );

                    }


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


                    if (
                        saleItem.isOpenPrice !==
                            true &&
                        saleItem.product
                    ) {

                        const product =
                            await Product
                                .findById(
                                    saleItem.product
                                )
                                .session(
                                    session
                                );


                        if (
                            !product
                        ) {

                            throw new ApiError(
                                404,
                                `Product "${saleItem.name}" no longer exists.`
                            );

                        }


                        const movement =
                            await branchInventoryService
                                .addStock(
                                    resolvedBranchId,
                                    product._id,
                                    quantity,
                                    {
                                        session,
                                    }
                                );


                        await InventoryTransaction
                            .create(
                                [
                                    {
                                        branch:
                                            resolvedBranchId,

                                        branchSnapshot: {

                                            code:
                                                sale
                                                    .branchSnapshot
                                                    ?.code ||
                                                "",

                                            name:
                                                sale
                                                    .branchSnapshot
                                                    ?.name ||
                                                "",

                                        },

                                        product:
                                            product._id,

                                        type:
                                            "ADJUSTMENT",

                                        quantity,

                                        previousStock:
                                            movement
                                                .previousStock,

                                        newStock:
                                            movement
                                                .newStock,

                                        remarks:
                                            `Refund - Receipt ${sale.receiptNumber}`,

                                        createdBy:
                                            userId,
                                    },
                                ],
                                {
                                    session,
                                }
                            );

                    }


                    saleItem.refundedQuantity =
                        refundedQuantity +
                        quantity;

                }


                const fullyRefunded =
                    sale.items.every(
                        (
                            item
                        ) =>

                            Number(
                                item
                                    .refundedQuantity ||
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


                if (
                    fullyRefunded &&
                    sale.customer
                ) {

                    const customer =
                        await Customer
                            .findById(
                                sale.customer
                            )
                            .session(
                                session
                            );


                    if (
                        customer
                    ) {

                        const earnedPoints =
                            Number(
                                sale
                                    .loyaltyPointsEarned
                            ) || 0;


                        const alreadyReversed =
                            Number(
                                sale
                                    .loyaltyEarnedPointsReversed
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
                                    customer
                                        .loyaltyPoints
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
                                            customer
                                                .lifetimePoints
                                        ) || 0
                                    ) -
                                    pointsToReverse
                                );


                            sale.loyaltyEarnedPointsReversed =
                                alreadyReversed +
                                pointsToReverse;


                            await customer.save({
                                session,
                            });


                            await LoyaltyTransaction
                                .create(
                                    [
                                        {
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
                                        },
                                    ],
                                    {
                                        session,
                                    }
                                );

                        }


                        const redeemedPoints =
                            Number(
                                sale
                                    .loyaltyPointsRedeemed
                            ) || 0;


                        const alreadyRestored =
                            Number(
                                sale
                                    .loyaltyRedeemedPointsRestored
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
                                    customer
                                        .loyaltyPoints
                                ) || 0;


                            const balanceAfter =
                                balanceBefore +
                                pointsToRestore;


                            customer.loyaltyPoints =
                                balanceAfter;


                            sale.loyaltyRedeemedPointsRestored =
                                alreadyRestored +
                                pointsToRestore;


                            await customer.save({
                                session,
                            });


                            await LoyaltyTransaction
                                .create(
                                    [
                                        {
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
                                    },
                                ],
                                {
                                    session,
                                }
                            );

                        }

                    }

                }


                await sale.save({
                    session,
                });


                await syncOutboxService
                    .enqueueSyncRequest({

                        source:
                            "SALE",

                        action:
                            "REFUND",

                        aggregateId:
                            sale._id,

                        branchId:
                            resolvedBranchId,

                        session,

                    });


                return sale._id;

            }
        );


    return await populateSale(
        completedSaleId
    );

};


/*
============================================================
EXPORT
============================================================
*/

export default {

    checkout,

    checkoutBulkOrder,

    getSales,

    getSaleById,

    voidSale,

    refundSale,

};