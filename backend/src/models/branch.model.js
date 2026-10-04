import mongoose from "mongoose";


/*
============================================================
BRANCH SCHEMA
============================================================

A Branch represents one physical store/location.

Examples:

MAIN
Main Branch

B002
Uptown Branch

Branches should normally be disabled instead of deleted so
historical sales and inventory records never lose their
branch reference.
============================================================
*/

const branchSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            BRANCH CODE
            ====================================================

            Used for:
            - receipt numbering
            - reports
            - branch selector
            - human-readable references

            Examples:
            MAIN
            B002
            CDO01
            ====================================================
            */

            code: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                trim:
                    true,

                uppercase:
                    true,

                minlength:
                    2,

                maxlength:
                    20,
            },


            /*
            ====================================================
            BRANCH NAME
            ====================================================
            */

            name: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    120,
            },


            /*
            ====================================================
            ADDRESS
            ====================================================
            */

            address: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    300,
            },


            /*
            ====================================================
            PHONE
            ====================================================
            */

            phone: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    50,
            },


            /*
            ====================================================
            EMAIL
            ====================================================
            */

            email: {
                type:
                    String,

                default:
                    "",

                trim:
                    true,

                lowercase:
                    true,

                maxlength:
                    120,
            },


            /*
            ====================================================
            DEFAULT BRANCH
            ====================================================

            During migration, the existing POS will initially
            use one default branch:

            MAIN
            Main Branch

            Only one branch should normally be marked default.
            ====================================================
            */

            isDefault: {
                type:
                    Boolean,

                default:
                    false,
            },


            /*
            ====================================================
            ACTIVE STATUS
            ====================================================

            We disable branches instead of deleting them so
            historical records remain valid.
            ====================================================
            */

            isActive: {
                type:
                    Boolean,

                default:
                    true,
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

branchSchema.index({
    isActive:
        1,

    name:
        1,
});


branchSchema.index({
    isDefault:
        1,
});


/*
============================================================
MODEL
============================================================
*/

const Branch =
    mongoose.model(
        "Branch",
        branchSchema
    );


export default Branch;