import mongoose from "mongoose";


/*
============================================================
PRICING MODE
============================================================

RETAIL

Normal quantity-tier pricing applies.

Example:

1  = ₱200
6  = ₱1,000
12 = ₱1,900

Quantity 1:
₱200

Quantity 6:
₱1,000


WHOLESALE

The order uses the configured wholesale effective unit rate
regardless of the ordered quantity.

The backend remains authoritative for calculating the actual
price.

Example:

1  = ₱200
6  = ₱1,000
12 = ₱1,900

If the selected wholesale tier is:

6 = ₱1,000

Wholesale effective unit price:

₱1,000 / 6
============================================================
*/

const PRICING_MODES = [
    "RETAIL",
    "WHOLESALE",
];


/*
============================================================
PRICING BREAKDOWN SCHEMA
============================================================

Stores exactly how a line total was calculated.

RETAIL example:

1 piece   = ₱180
6 pieces  = ₱1,000
12 pieces = ₱1,900

If customer orders 25 pieces:

2 x 12-piece tier = ₱3,800
1 x 1-piece tier  = ₱180

Total = ₱3,980


WHOLESALE:

The service may store the wholesale tier used as the pricing
basis.

The authoritative values remain:

- quantity
- effectiveUnitPrice
- lineTotal

Historical Bulk Orders therefore preserve the price that was
actually calculated when the order was saved.
============================================================
*/

const pricingBreakdownSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            TIER QUANTITY
            ====================================================

            Number of base units represented by the pricing
            tier.

            Example:

            12 pieces = ₱1,900

            tierQuantity = 12
            ====================================================
            */

            tierQuantity: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,
            },


            /*
            ====================================================
            TIER PRICE
            ====================================================

            TOTAL configured price for the tier.

            Example:

            12 pieces = ₱1,900

            tierPrice = 1900
            ====================================================
            */

            tierPrice: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
            },


            /*
            ====================================================
            BUNDLES
            ====================================================

            Number of complete pricing bundles represented by
            this breakdown entry.

            Retail tier calculations normally use whole bundle
            counts.

            Wholesale calculations should not use fractional
            bundle counts merely to represent the order
            quantity. Wholesale pricing is represented by the
            selected tier plus effectiveUnitPrice / lineTotal.
            ====================================================
            */

            bundles: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
            },


            /*
            ====================================================
            COVERED QUANTITY
            ====================================================

            Number of ordered units represented by this
            breakdown entry.
            ====================================================
            */

            coveredQuantity: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
            },


            /*
            ====================================================
            SUBTOTAL
            ====================================================

            Monetary subtotal represented by this pricing
            breakdown entry.
            ====================================================
            */

            subtotal: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
            },
        },
        {
            _id:
                false,
        }
    );


/*
============================================================
BULK ORDER ITEM SCHEMA
============================================================

Each item stores a snapshot of the Product information used
when the order was saved.

Historical Bulk Orders must not change when the Product name,
barcode, base unit, or pricing changes later.
============================================================
*/

const bulkOrderItemSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            PRODUCT REFERENCE
            ====================================================
            */

            product: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                required:
                    true,
            },


            /*
            ====================================================
            PRODUCT SNAPSHOT
            ====================================================
            */

            barcode: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,
            },


            name: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,
            },


            baseUnit: {
                type:
                    String,

                required:
                    true,

                default:
                    "Piece",

                trim:
                    true,
            },


            /*
            ====================================================
            ORDERED QUANTITY
            ====================================================

            Number of the Product's base unit being ordered.

            Examples:

            baseUnit = Piece
            quantity = 24

            baseUnit = Case
            quantity = 2
            ====================================================
            */

            quantity: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,
            },


            /*
            ====================================================
            PRICING BREAKDOWN
            ====================================================

            RETAIL:

            Stores the actual quantity-tier calculation.

            WHOLESALE:

            Stores the tier used as the wholesale pricing basis.

            The service is responsible for creating the correct
            representation.

            The frontend is never trusted to provide this.
            ====================================================
            */

            pricingBreakdown: [
                pricingBreakdownSchema,
            ],


            /*
            ====================================================
            EFFECTIVE UNIT PRICE
            ====================================================

            Informational/display unit price.

            RETAIL example:

            lineTotal = ₱3,980
            quantity  = 25

            effectiveUnitPrice = 159.2


            WHOLESALE example:

            wholesale tier:

            6 = ₱1,000

            effectiveUnitPrice =
                1000 / 6

            The backend may retain more precision internally
            than the two decimal places shown to the user.

            lineTotal remains authoritative.
            ====================================================
            */

            effectiveUnitPrice: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
            },


            /*
            ====================================================
            LINE TOTAL
            ====================================================

            Final authoritative amount for this item.

            This value is stored rather than recalculated when
            viewing historical orders.
            ====================================================
            */

            lineTotal: {
                type:
                    Number,

                required:
                    true,

                min:
                    0,
            },


            /*
            ====================================================
            SORT GROUP
            ====================================================

            BULK:
            Case, Box, Sack, Pack, Bundle, etc.

            PIECE:
            Piece, Pieces, PC, PCS, Bottle, Sachet, etc.

            BULK items appear first.

            PIECE items appear last.
            ====================================================
            */

            sortGroup: {
                type:
                    String,

                enum: [
                    "BULK",
                    "PIECE",
                ],

                required:
                    true,
            },


            /*
            ====================================================
            SORT PRIORITY
            ====================================================
            */

            sortPriority: {
                type:
                    Number,

                required:
                    true,

                default:
                    500,
            },
        },
        {
            _id:
                true,
        }
    );


/*
============================================================
REVISION SNAPSHOT SCHEMA
============================================================

Stores previous versions of a SAVED Bulk Order.

IMPORTANT:

pricingMode is part of the revision.

This means changing an order from RETAIL to WHOLESALE or
WHOLESALE to RETAIL creates a historical record that retains
the previous pricing behavior.
============================================================
*/

const bulkOrderRevisionSchema =
    new mongoose.Schema(
        {
            revision: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,
            },


            /*
            ====================================================
            PRICING MODE SNAPSHOT
            ====================================================
            */

            pricingMode: {
                type:
                    String,

                enum:
                    PRICING_MODES,

                required:
                    true,

                default:
                    "RETAIL",
            },


            customerName: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    200,
            },


            notes: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    1000,
            },


            items: [
                bulkOrderItemSchema,
            ],


            totalLines: {
                type:
                    Number,

                required:
                    true,

                default:
                    0,

                min:
                    0,
            },


            totalQuantity: {
                type:
                    Number,

                required:
                    true,

                default:
                    0,

                min:
                    0,
            },


            totalAmount: {
                type:
                    Number,

                required:
                    true,

                default:
                    0,

                min:
                    0,
            },


            changedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },


            changedAt: {
                type:
                    Date,

                required:
                    true,

                default:
                    Date.now,
            },
        },
        {
            _id:
                false,
        }
    );


/*
============================================================
BULK ORDER SCHEMA
============================================================

A Bulk Order is an editable preparation/order list.

Creating, saving, editing, printing, duplicating, or
cancelling a Bulk Order does NOT by itself:

- create a Sale
- deduct inventory
- receive payment

A SAVED Bulk Order can later be completed through the paid
order workflow.

That workflow must create the Sale, deduct BranchInventory,
create inventory audit records, and mark this Bulk Order
COMPLETED inside one local MongoDB transaction.
============================================================
*/

const bulkOrderSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            ORDER NUMBER
            ====================================================
            */

            orderNumber: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                uppercase:
                    true,

                trim:
                    true,

                index:
                    true,
            },


            /*
            ====================================================
            BRANCH
            ====================================================
            */

            branch: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                required:
                    true,

                index:
                    true,
            },


            /*
            ====================================================
            BRANCH SNAPSHOT
            ====================================================
            */

            branchSnapshot: {
                code: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,
                },


                name: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,
                },


                address: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,
                },


                phone: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,
                },
            },


            /*
            ====================================================
            PRICING MODE
            ====================================================

            RETAIL

            Normal quantity-tier behavior.

            WHOLESALE

            Wholesale pricing applies regardless of the order
            quantity.

            IMPORTANT:

            This is stored on the Bulk Order itself so the
            backend paid-order workflow knows which pricing
            behavior was used.

            The frontend cannot determine the authoritative
            Sale amount by itself.
            ====================================================
            */

            pricingMode: {
                type:
                    String,

                enum:
                    PRICING_MODES,

                required:
                    true,

                default:
                    "RETAIL",

                index:
                    true,
            },


            /*
            ====================================================
            CUSTOMER
            ====================================================
            */

            customerName: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    200,
            },


            /*
            ====================================================
            NOTES
            ====================================================
            */

            notes: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    1000,
            },


            /*
            ====================================================
            STATUS
            ====================================================

            DRAFT

                Order is still being prepared.


            SAVED

                Order is saved and can still be edited,
                printed, duplicated, cancelled, or paid.


            COMPLETED

                A normal Sale was successfully created for this
                order and the inventory operation completed.

                The Bulk Order is linked to that Sale.


            CANCELLED

                Order was cancelled without deleting its
                historical record.
            ====================================================
            */

            status: {
                type:
                    String,

                enum: [
                    "DRAFT",
                    "SAVED",
                    "COMPLETED",
                    "CANCELLED",
                ],

                default:
                    "DRAFT",

                index:
                    true,
            },


            /*
            ====================================================
            REVISION NUMBER
            ====================================================
            */

            revision: {
                type:
                    Number,

                default:
                    1,

                min:
                    1,
            },


            /*
            ====================================================
            CURRENT ORDER ITEMS
            ====================================================
            */

            items: [
                bulkOrderItemSchema,
            ],


            /*
            ====================================================
            TOTALS
            ====================================================
            */

            totalLines: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },


            totalQuantity: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },


            totalAmount: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },


            /*
            ====================================================
            REVISION HISTORY
            ====================================================
            */

            revisions: [
                bulkOrderRevisionSchema,
            ],


            /*
            ====================================================
            CREATED / MODIFIED BY
            ====================================================
            */

            createdBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                required:
                    true,
            },


            lastModifiedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },


            /*
            ====================================================
            PRINT AUDIT
            ====================================================
            */

            lastPrintedAt: {
                type:
                    Date,

                default:
                    null,
            },


            printCount: {
                type:
                    Number,

                default:
                    0,

                min:
                    0,
            },


            /*
            ====================================================
            CANCEL AUDIT
            ====================================================
            */

            cancelledBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },


            cancelledAt: {
                type:
                    Date,

                default:
                    null,
            },


            /*
            ====================================================
            SALE CONNECTION
            ====================================================

            Once payment succeeds:

            status = COMPLETED
            sale = created Sale ObjectId
            saleNumber = receipt/sale number
            completedBy = cashier/user
            completedAt = timestamp

            This relationship is created as part of the same
            transaction as Sale creation and inventory
            deduction.
            ====================================================
            */

            sale: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Sale",

                default:
                    null,

                index:
                    true,
            },


            saleNumber: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,
            },


            completedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,
            },


            completedAt: {
                type:
                    Date,

                default:
                    null,
            },
        },
        {
            timestamps:
                true,
        }
    );


/*
============================================================
INDEXES
============================================================
*/


/*
------------------------------------------------------------
BRANCH ORDER HISTORY
------------------------------------------------------------
*/

bulkOrderSchema.index({
    branch:
        1,

    createdAt:
        -1,
});


/*
------------------------------------------------------------
BRANCH + STATUS HISTORY
------------------------------------------------------------
*/

bulkOrderSchema.index({
    branch:
        1,

    status:
        1,

    createdAt:
        -1,
});


/*
------------------------------------------------------------
BRANCH + PRICING MODE

Useful for history/filtering and keeps the persisted pricing
mode easy to query.
------------------------------------------------------------
*/

bulkOrderSchema.index({
    branch:
        1,

    pricingMode:
        1,

    createdAt:
        -1,
});


/*
------------------------------------------------------------
CUSTOMER HISTORY
------------------------------------------------------------
*/

bulkOrderSchema.index({
    branch:
        1,

    customerName:
        1,

    createdAt:
        -1,
});


/*
------------------------------------------------------------
RECENTLY UPDATED ORDERS
------------------------------------------------------------
*/

bulkOrderSchema.index({
    branch:
        1,

    updatedAt:
        -1,
});


/*
------------------------------------------------------------
SALE LOOKUP
------------------------------------------------------------
*/

bulkOrderSchema.index({
    branch:
        1,

    sale:
        1,
});


/*
============================================================
MODEL
============================================================
*/

const BulkOrder =
    mongoose.model(
        "BulkOrder",
        bulkOrderSchema
    );


export default BulkOrder;