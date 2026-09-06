import mongoose from "mongoose";


const customerSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            CUSTOMER CODE
            ====================================================

            Public membership identifier.

            Example:
            CUST-000001
            ====================================================
            */

            customerCode: {
                type: String,
                required: true,
                unique: true,
                trim: true,
                uppercase: true,
                index: true,
            },


            /*
            ====================================================
            BASIC INFORMATION
            ====================================================
            */

            name: {
                type: String,
                required: true,
                trim: true,
            },


            phone: {
                type: String,
                default: "",
                trim: true,
                index: true,
            },


            /*
            ====================================================
            RFID / NFC UID
            ====================================================

            Optional.

            A customer can use QR only, RFID only, or both.
            ====================================================
            */

            rfidUid: {
                type: String,
                default: null,
                trim: true,
                uppercase: true,
                index: true,
            },


            /*
            ====================================================
            LOYALTY
            ====================================================

            We are only preparing the account now.

            Detailed earn/redeem history should later live in
            a separate LoyaltyTransaction collection.
            ====================================================
            */

            loyaltyPoints: {
                type: Number,
                default: 0,
                min: 0,
            },


            lifetimePoints: {
                type: Number,
                default: 0,
                min: 0,
            },


            loyaltyTier: {
                type: String,
                enum: [
                    "REGULAR",
                    "SILVER",
                    "GOLD",
                    "PLATINUM",
                ],
                default: "REGULAR",
            },


            /*
            ====================================================
            OPTIONAL LEDGER LINK
            ====================================================

            Not every loyalty customer needs an utang/credit
            account.

            This can remain null.
            ====================================================
            */

            ledgerAccount: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "LedgerAccount",
                default: null,
                index: true,
            },


            /*
            ====================================================
            STATUS
            ====================================================
            */

            isActive: {
                type: Boolean,
                default: true,
            },
        },
        {
            timestamps: true,
        }
    );


/*
============================================================
INDEXES
============================================================
*/

customerSchema.index({
    name: 1,
});

customerSchema.index({
    isActive: 1,
    name: 1,
});


/*
============================================================
EXPORT
============================================================
*/

export default mongoose.model(
    "Customer",
    customerSchema
);