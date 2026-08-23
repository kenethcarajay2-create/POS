import Sale from "../models/sale.model.js";
import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";

import ApiError from "../utils/ApiError.js";
import { generateReceiptNumber } from "../utils/receipt.js";

import {
    calculateSubtotal,
} from "../utils/pricing.js";


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
    quantity: 1,
    unitPrice: 125
}

Open-price items:

- Do NOT require a Product
- Do NOT deduct inventory
- Do NOT create inventory transactions
- Use the manually entered price
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
    } = data;


    /*
    ========================================================
    BASIC VALIDATION
    ========================================================
    */

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        throw new ApiError(
            400,
            "Cart is empty."
        );

    }


    let subtotal = 0;

    const saleItems = [];


    /*
    ========================================================
    PROCESS CART ITEMS
    ========================================================
    */

    for (
        const cartItem of items
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


            const name =
                String(
                    cartItem.name ||
                    "Grocery"
                ).trim();


            if (!name) {

                throw new ApiError(
                    400,
                    "Open-price item name is required."
                );

            }


            const lineSubtotal =
                unitPrice *
                quantity;


            subtotal +=
                lineSubtotal;


            saleItems.push({

                /*
                No Product document.
                */

                product:
                    null,

                productDocument:
                    null,

                /*
                Marks this as a manual/open-price line.
                */

                isOpenPrice:
                    true,

                barcode:
                    "",

                name,

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


        const product =
            await Product.findById(
                cartItem.productId
            );


        if (!product) {

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

        IMPORTANT:
        The backend calculates normal product pricing.

        The frontend does NOT control normal product price.
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


        saleItems.push({

            product:
                product._id,

            productDocument:
                product,

            isOpenPrice:
                false,

            barcode:
                product.barcode,

            name:
                product.name,

            quantity,

            unitPrice,

            subtotal:
                lineSubtotal,

        });

    }


    /*
    ========================================================
    TOTALS
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


    const total =
        Math.max(
            0,
            subtotal -
            numericDiscount
        );


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

            cashier:
                userId ||
                null,

            items:
                saleItems.map(
                    (item) => ({

                        /*
                        Product is null for Grocery.
                        */

                        product:
                            item.product,

                        isOpenPrice:
                            item.isOpenPrice,

                        barcode:
                            item.barcode,

                        name:
                            item.name,

                        quantity:
                            item.quantity,

                        unitPrice:
                            item.unitPrice,

                        subtotal:
                            item.subtotal,

                    })
                ),

            subtotal,

            discount:
                numericDiscount,

            total,

            payment:
                numericPayment,

            paymentMethod,

            change,

        });


    /*
    ========================================================
    DEDUCT INVENTORY
    ========================================================

    ONLY normal products reach this section.

    Open-price Grocery items have:

    productDocument = null

    and are skipped.
    ========================================================
    */

    for (
        const item of saleItems
    ) {

        /*
        ----------------------------------------------------
        SKIP OPEN PRICE
        ----------------------------------------------------
        */

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
    RETURN SALE
    ========================================================
    */

    return sale;

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

    const sale =
        await Sale.findById(
            id
        )
            .populate(
                "cashier",
                "name username"
            );


    if (!sale) {

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

Normal products:
    restore inventory

Open-price Grocery:
    no inventory exists, so skip inventory restoration
============================================================
*/

const voidSale = async (
    saleId,
    userId
) => {

    const sale =
        await Sale.findById(
            saleId
        );


    if (!sale) {

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
        const item of sale.items
    ) {

        /*
        ----------------------------------------------------
        OPEN PRICE ITEM

        No inventory to restore.
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


        if (!product) {

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
    UPDATE SALE
    ========================================================
    */

    sale.status =
        "VOIDED";


    await sale.save();


    return sale;

};


/*
============================================================
REFUND SALE
============================================================

Supports both:

Normal product refund
Open-price Grocery refund

IMPORTANT:

Normal products restore inventory.

Open-price items only update refundedQuantity because
there is no inventory record to restore.
============================================================
*/

const refundSale = async (
    saleId,
    refundItems,
    userId
) => {

    const sale =
        await Sale.findById(
            saleId
        );


    if (!sale) {

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
        refundItems.length ===
        0
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
        const refundItem of
        refundItems
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

        Preferred:
        saleItemId

        Existing normal-product refund:
        productId
        ====================================================
        */

        let saleItem;


        /*
        ----------------------------------------------------
        SALE ITEM ID

        This works for both normal and open-price items.
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

        Maintains compatibility with your existing frontend.
        ----------------------------------------------------
        */

        if (
            !saleItem &&
            refundItem.productId
        ) {

            saleItem =
                sale.items.find(
                    (item) =>

                        item.product &&

                        item.product
                            .toString() ===
                        refundItem
                            .productId
                            .toString()
                );

        }


        if (!saleItem) {

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


            if (!product) {

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

        Applies to BOTH normal and open-price items.
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
            (item) =>

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


    await sale.save();


    return sale;

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