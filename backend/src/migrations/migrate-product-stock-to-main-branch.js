import dotenv from "dotenv";

import mongoose from "mongoose";

import connectDB from "../config/database.js";

import Product from "../models/product.model.js";

import BranchInventory from "../models/branchInventory.model.js";

import branchService from "../services/branch.service.js";


dotenv.config();


/*
============================================================
PRODUCT STOCK → MAIN BRANCH INVENTORY
============================================================

PURPOSE

The old application stored stock directly on:

Product.stock

Multi-branch inventory requires:

BranchInventory {
    branch,
    product,
    stock
}


MIGRATION RULE

Every existing Product.stock belongs to MAIN because all
existing inventory originated from the original single store.


IMPORTANT SAFETY RULES

1. Product.stock is NOT deleted.
2. Product.stock is NOT modified.
3. Product.minimumStock is NOT modified.
4. Product pricing is NOT modified.
5. Product catalog data is NOT modified.
6. Existing BranchInventory records are NOT blindly
   overwritten.
7. Migration can be rerun safely.
============================================================
*/


/*
============================================================
NORMALIZE NUMBER
============================================================
*/

const normalizeNonNegativeNumber =
    (
        value,
        fallback = 0
    ) => {

        const numericValue =
            Number(
                value
            );


        if (
            !Number.isFinite(
                numericValue
            ) ||
            numericValue <
                0
        ) {

            return fallback;

        }


        return numericValue;

    };


/*
============================================================
MIGRATE ONE PRODUCT
============================================================

IMPORTANT:

We only CREATE the MAIN BranchInventory record if it does
not already exist.

If it already exists, we compare it with Product.stock but
do not overwrite it.

That prevents a migration retry from destroying newer
branch-specific stock changes.
============================================================
*/

const migrateProduct =
    async (
        product,
        mainBranch
    ) => {

        const legacyStock =
            normalizeNonNegativeNumber(
                product.stock,
                0
            );


        const legacyMinimumStock =
            normalizeNonNegativeNumber(
                product.minimumStock,
                0
            );


        /*
        ====================================================
        TRY EXISTING FIRST
        ====================================================
        */

        const existing =
            await BranchInventory.findOne({

                branch:
                    mainBranch._id,

                product:
                    product._id,

            });


        if (
            existing
        ) {

            return {

                status:
                    "existing",

                productId:
                    product._id,

                productName:
                    product.name,

                productStock:
                    legacyStock,

                branchStock:
                    Number(
                        existing.stock
                    ) || 0,

                matchesLegacyStock:
                    Number(
                        existing.stock
                    ) ===
                    legacyStock,

            };

        }


        /*
        ====================================================
        CREATE WITH UPSERT-LIKE DUPLICATE PROTECTION
        ====================================================

        We intentionally attempt creation only after checking.

        If another process creates the record between the
        find and create, the unique branch+product index will
        reject this duplicate.

        We then reload the winning record.
        ====================================================
        */

        try {

            const created =
                await BranchInventory.create({

                    branch:
                        mainBranch._id,

                    product:
                        product._id,

                    stock:
                        legacyStock,

                    minimumStock:
                        legacyMinimumStock,

                    isActive:
                        product.isActive !==
                        false,

                });


            return {

                status:
                    "created",

                productId:
                    product._id,

                productName:
                    product.name,

                productStock:
                    legacyStock,

                branchStock:
                    Number(
                        created.stock
                    ) || 0,

                matchesLegacyStock:
                    Number(
                        created.stock
                    ) ===
                    legacyStock,

            };


        } catch (
            error
        ) {

            /*
            =================================================
            DUPLICATE CREATED CONCURRENTLY
            =================================================
            */

            if (
                error?.code ===
                11000
            ) {

                const winner =
                    await BranchInventory.findOne({

                        branch:
                            mainBranch._id,

                        product:
                            product._id,

                    });


                if (
                    winner
                ) {

                    return {

                        status:
                            "existing",

                        productId:
                            product._id,

                        productName:
                            product.name,

                        productStock:
                            legacyStock,

                        branchStock:
                            Number(
                                winner.stock
                            ) || 0,

                        matchesLegacyStock:
                            Number(
                                winner.stock
                            ) ===
                            legacyStock,

                    };

                }

            }


            throw error;

        }

    };


/*
============================================================
VERIFY MIGRATION
============================================================
*/

const verifyMigration =
    async (
        products,
        mainBranch
    ) => {

        const problems =
            [];


        /*
        ====================================================
        VERIFY EVERY PRODUCT HAS MAIN INVENTORY
        ====================================================
        */

        for (
            const product
            of products
        ) {

            const inventory =
                await BranchInventory.findOne({

                    branch:
                        mainBranch._id,

                    product:
                        product._id,

                });


            if (
                !inventory
            ) {

                problems.push({

                    productId:
                        String(
                            product._id
                        ),

                    productName:
                        product.name,

                    problem:
                        "Missing MAIN BranchInventory record.",

                });


                continue;

            }


            /*
            =================================================
            VALID STOCK
            =================================================
            */

            const inventoryStock =
                Number(
                    inventory.stock
                );


            if (
                !Number.isFinite(
                    inventoryStock
                ) ||
                inventoryStock <
                    0
            ) {

                problems.push({

                    productId:
                        String(
                            product._id
                        ),

                    productName:
                        product.name,

                    problem:
                        "BranchInventory has invalid stock.",

                });

            }

        }


        /*
        ====================================================
        VERIFY NO DUPLICATES
        ====================================================

        Unique index should already prevent this, but explicit
        verification gives us extra migration confidence.
        ====================================================
        */

        const duplicates =
            await BranchInventory.aggregate([
                {
                    $group: {

                        _id: {

                            branch:
                                "$branch",

                            product:
                                "$product",

                        },

                        count: {
                            $sum:
                                1,
                        },

                    },
                },

                {
                    $match: {

                        count: {
                            $gt:
                                1,
                        },

                    },
                },
            ]);


        for (
            const duplicate
            of duplicates
        ) {

            problems.push({

                branch:
                    String(
                        duplicate._id
                            .branch
                    ),

                product:
                    String(
                        duplicate._id
                            .product
                    ),

                problem:
                    `Duplicate BranchInventory records detected: ${duplicate.count}`,

            });

        }


        return problems;

    };


/*
============================================================
RUN MIGRATION
============================================================
*/

const runMigration =
    async () => {

        console.log(
            "============================================================"
        );

        console.log(
            "🚀 PRODUCT STOCK → MAIN BRANCH INVENTORY"
        );

        console.log(
            "============================================================"
        );


        /*
        ====================================================
        CONNECT
        ====================================================
        */

        await connectDB();


        /*
        ====================================================
        MAIN BRANCH
        ====================================================
        */

        const mainBranch =
            await branchService
                .ensureDefaultBranch();


        console.log(
            `🏪 Branch: ${mainBranch.name} (${mainBranch.code})`
        );

        console.log(
            `🆔 Branch ID: ${mainBranch._id}`
        );


        /*
        ====================================================
        LOAD PRODUCTS
        ====================================================
        */

        const products =
            await Product.find({})
                .sort({
                    name:
                        1,
                });


        console.log(
            `📦 Products found: ${products.length}`
        );


        /*
        ====================================================
        COUNTERS
        ====================================================
        */

        let createdCount =
            0;

        let existingCount =
            0;

        let matchingExistingCount =
            0;

        let differingExistingCount =
            0;

        let failureCount =
            0;


        /*
        ====================================================
        MIGRATE SEQUENTIALLY
        ====================================================

        Sequential processing is deliberate.

        This migration is a one-time safety operation and does
        not benefit enough from aggressive concurrency to
        justify adding avoidable database pressure.
        ====================================================
        */

        for (
            const product
            of products
        ) {

            try {

                const result =
                    await migrateProduct(
                        product,
                        mainBranch
                    );


                if (
                    result.status ===
                    "created"
                ) {

                    createdCount +=
                        1;


                    console.log(
                        `✅ Created: ${result.productName} | stock ${result.branchStock}`
                    );


                    continue;

                }


                existingCount +=
                    1;


                if (
                    result.matchesLegacyStock
                ) {

                    matchingExistingCount +=
                        1;


                    console.log(
                        `➖ Existing: ${result.productName} | stock ${result.branchStock}`
                    );

                } else {

                    differingExistingCount +=
                        1;


                    /*
                    =================================================
                    DO NOT OVERWRITE
                    =================================================

                    This is intentional.

                    A different BranchInventory stock value may be a
                    legitimate newer value.

                    Automatically copying Product.stock over it could
                    destroy real stock changes.
                    =================================================
                    */

                    console.warn(
                        `⚠️ Existing stock differs: ${result.productName} | Product.stock=${result.productStock} | MAIN stock=${result.branchStock}`
                    );

                }


            } catch (
                error
            ) {

                failureCount +=
                    1;


                console.error(
                    `❌ Failed: ${product.name}`
                );

                console.error(
                    error.message
                );

            }

        }


        /*
        ====================================================
        VERIFICATION
        ====================================================
        */

        console.log(
            ""
        );

        console.log(
            "VERIFYING MIGRATION"
        );


        const verificationProblems =
            await verifyMigration(
                products,
                mainBranch
            );


        const mainInventoryCount =
            await BranchInventory.countDocuments({

                branch:
                    mainBranch._id,

            });


        /*
        ====================================================
        SUMMARY
        ====================================================
        */

        console.log(
            ""
        );

        console.log(
            "============================================================"
        );

        console.log(
            "📊 MIGRATION SUMMARY"
        );

        console.log(
            "============================================================"
        );


        console.log(
            `Total products:             ${products.length}`
        );

        console.log(
            `MAIN inventory records:     ${mainInventoryCount}`
        );

        console.log(
            `Created:                    ${createdCount}`
        );

        console.log(
            `Already existing:           ${existingCount}`
        );

        console.log(
            `Existing matching legacy:   ${matchingExistingCount}`
        );

        console.log(
            `Existing differing legacy:  ${differingExistingCount}`
        );

        console.log(
            `Processing failures:        ${failureCount}`
        );

        console.log(
            `Verification problems:      ${verificationProblems.length}`
        );


        /*
        ====================================================
        DISPLAY VERIFICATION PROBLEMS
        ====================================================
        */

        if (
            verificationProblems.length >
            0
        ) {

            console.log(
                ""
            );

            console.error(
                "VERIFICATION PROBLEMS"
            );


            for (
                const problem
                of verificationProblems
            ) {

                console.error(
                    problem
                );

            }

        }


        /*
        ====================================================
        RESULT
        ====================================================
        */

        if (
            failureCount >
                0 ||
            verificationProblems.length >
                0
        ) {

            console.error(
                ""
            );

            console.error(
                "❌ Branch inventory migration did not complete cleanly."
            );


            process.exitCode =
                1;


            return;

        }


        console.log(
            ""
        );

        console.log(
            "✅ Branch inventory migration completed successfully."
        );

        console.log(
            "✅ Every product now has a MAIN inventory record."
        );

        console.log(
            "✅ Product.stock was preserved and was NOT deleted."
        );


        if (
            differingExistingCount >
            0
        ) {

            console.log(
                ""
            );

            console.warn(
                "⚠️ Some existing BranchInventory values differ from Product.stock."
            );

            console.warn(
                "⚠️ They were intentionally NOT overwritten."
            );

        }

    };


/*
============================================================
START
============================================================
*/

try {

    await runMigration();


} catch (
    error
) {

    console.error(
        ""
    );

    console.error(
        "============================================================"
    );

    console.error(
        "❌ BRANCH INVENTORY MIGRATION FAILED"
    );

    console.error(
        "============================================================"
    );

    console.error(
        error
    );


    process.exitCode =
        1;


} finally {

    try {

        await mongoose.connection
            .close();

    } catch (
        error
    ) {

        console.error(
            "Failed to close MongoDB connection:"
        );

        console.error(
            error.message
        );

    }

}