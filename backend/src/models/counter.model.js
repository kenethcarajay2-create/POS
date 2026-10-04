import mongoose from "mongoose";


/*
============================================================
COUNTER
============================================================

Shared atomic sequence storage.

Examples:

Product barcode:

    _id:
        "product_barcode"

    sequence:
        125


Branch/date receipt:

    _id:
        "receipt:MAIN:20260907"

    sequence:
        37


Another branch:

    _id:
        "receipt:BR02:20260907"

    sequence:
        14


Because _id is unique, every logical counter has exactly
one document.
============================================================
*/

const counterSchema =
    new mongoose.Schema(
        {

            /*
            ====================================================
            COUNTER KEY
            ====================================================
            */

            _id: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

            },


            /*
            ====================================================
            CURRENT SEQUENCE
            ====================================================
            */

            sequence: {

                type:
                    Number,

                required:
                    true,

                default:
                    0,

                min:
                    0,

            },

        },
        {

            /*
            Counters do not need __v.
            */

            versionKey:
                false,

        }
    );


/*
============================================================
MODEL
============================================================
*/

const Counter =
    mongoose.model(
        "Counter",
        counterSchema
    );


export default Counter;