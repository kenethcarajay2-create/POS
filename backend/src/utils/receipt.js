import mongoose from "mongoose";

import Counter from "../models/counter.model.js";

import ApiError from "./ApiError.js";


/*
============================================================
NORMALIZE BRANCH
============================================================
*/

const normalizeBranch =
    (
        branch
    ) => {

        if (
            !branch
        ) {

            throw new ApiError(
                400,
                "A branch is required to generate a receipt number."
            );

        }


        const branchId =
            branch?._id ||
            branch;


        if (
            !branchId ||
            !mongoose.Types.ObjectId.isValid(
                branchId
            )
        ) {

            throw new ApiError(
                400,
                "A valid branch is required to generate a receipt number."
            );

        }


        const branchCode =
            String(
                branch?.code ||
                ""
            )
                .trim()
                .toUpperCase();


        if (
            !branchCode
        ) {

            throw new ApiError(
                400,
                "Branch code is required to generate a receipt number."
            );

        }


        /*
        Keep receipt prefixes predictable.

        Examples:

        MAIN
        BR02
        CDO-02
        */

        const safeBranchCode =
            branchCode

                .replace(
                    /[^A-Z0-9_-]/g,
                    "-"
                )

                .replace(
                    /-+/g,
                    "-"
                )

                .replace(
                    /^[-_]+|[-_]+$/g,
                    ""
                );


        if (
            !safeBranchCode
        ) {

            throw new ApiError(
                400,
                "Branch code cannot be used as a receipt prefix."
            );

        }


        return {

            branchId:
                String(
                    branchId
                ),

            branchCode:
                safeBranchCode,

        };

    };


/*
============================================================
FORMAT DATE KEY
============================================================

Example:

September 7, 2026
        ↓
20260907

This preserves the previous server-local date behavior.
============================================================
*/

const getReceiptDateKey =
    (
        value =
            new Date()
    ) => {

        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            throw new ApiError(
                500,
                "Unable to determine receipt date."
            );

        }


        const year =
            String(
                date.getFullYear()
            );


        const month =
            String(
                date.getMonth() +
                1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return (
            `${year}${month}${day}`
        );

    };


/*
============================================================
GENERATE RECEIPT NUMBER
============================================================

VISIBLE FORMAT:

BRANCH-YYYYMMDD-000001

Examples:

MAIN-20260907-000001
MAIN-20260907-000002

BR02-20260907-000001


COUNTER KEY:

receipt:<BRANCH_OBJECT_ID>:YYYYMMDD


Example:

receipt:68bd1234567890abcdef1234:20260907


WHY OBJECT ID?

Branch code is editable.

If:

MAIN
    ↓
CENTRAL

the counter must continue from the same sequence instead of
starting again.

The branch ObjectId is immutable and therefore is the safer
counter namespace.


IMPORTANT:

The counter increment is atomic.

When session is supplied, the increment participates in the
same checkout transaction as:

- inventory deduction
- Sale creation
- loyalty changes

A failed checkout therefore rolls the counter back too.
============================================================
*/

export const generateReceiptNumber =
    async (
        branch,
        session =
            null
    ) => {

        const {
            branchId,
            branchCode,
        } =
            normalizeBranch(
                branch
            );


        const dateKey =
            getReceiptDateKey();


        /*
        ====================================================
        IMMUTABLE COUNTER KEY
        ====================================================
        */

        const counterId =
            `receipt:${branchId}:${dateKey}`;


        /*
        ====================================================
        ATOMIC SEQUENCE
        ====================================================
        */

        const counter =
            await Counter.findOneAndUpdate(

                {
                    _id:
                        counterId,
                },

                {
                    $inc: {
                        sequence:
                            1,
                    },
                },

                {
                    new:
                        true,

                    upsert:
                        true,

                    setDefaultsOnInsert:
                        true,

                    runValidators:
                        true,

                    session:
                        session ||
                        undefined,
                }

            );


        if (
            !counter ||
            !Number.isInteger(
                Number(
                    counter.sequence
                )
            ) ||
            Number(
                counter.sequence
            ) <= 0
        ) {

            throw new ApiError(
                500,
                "Failed to generate receipt sequence."
            );

        }


        const sequence =
            String(
                counter.sequence
            ).padStart(
                6,
                "0"
            );


        /*
        ====================================================
        VISIBLE RECEIPT
        ====================================================

        The human-readable branch code remains visible even
        though the internal counter namespace uses ObjectId.
        ====================================================
        */

        return (
            `${branchCode}-${dateKey}-${sequence}`
        );

    };


/*
============================================================
EXPORT HELPERS
============================================================
*/

export const receiptUtils = {

    getReceiptDateKey,

};