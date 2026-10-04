import dotenv from "dotenv";

import mongoose from "mongoose";

import connectDB from "../config/database.js";

import Product from "../models/product.model.js";

import BranchInventory from "../models/branchInventory.model.js";

import branchService from "../services/branch.service.js";


dotenv.config();


/*
============================================================
CREATE / INITIALIZE BRANCH 2
============================================================

PURPOSE

Creates the second branch used for controlled multi-branch
testing.

Branch:

    Code: BR02
    Name: Branch 2

Then ensures every existing global Product has a
BranchInventory record for BR02.


IMPORTANT SAFETY RULES

1. MAIN is never modified.
2. MAIN inventory is never copied.
3. BR02 starts with stock 0.
4. Existing BR02 inventory is never overwritten.
5. Existing BR02 stock is never reset to 0.
6. Existing products are never modified.
7. BR02 is NOT made the default branch.
8. Script can safely be rerun.
============================================================
*/


/*
============================================================
BRANCH CONFIGURATION
============================================================
*/

const BRANCH_CODE =
    "BR02";


const BRANCH_NAME =
    "Branch 2";


/*
============================================================
GET OR CREATE BRANCH 2
============================================================
*/

const getOrCreateBranch =
    async () => {

        /*
        ====================================================
        CHECK EXISTING
        ====================================================
        */

        try {

            const existing =
                await branchService
                    .getBranchByCode(
                        BRANCH_CODE
                    );


            /*
            BR02 must never become default from this script.
            We also do not silently change its existing
            configuration.
            */

            if (
                existing.isDefault
            ) {

                throw new Error(
                    `${BRANCH_CODE} already exists but is marked as the default branch. Aborting because this setup script must not change the default branch.`
                );

            }


            if (
                !existing.isActive
            ) {

                console.warn(
                    `⚠️ ${BRANCH_CODE} already exists but is disabled.`
                );

                console.warn(
                    "⚠️ Enabling the existing branch for controlled testing."
                );


                const enabled =
                    await branchService
                        .enableBranch(
                            existing._id
                        );


                return {

                    branch:
                        enabled,

                    created:
                        false,

                };

            }


            return {

                branch:
                    existing,

                created:
                    false,

            };


        } catch (
            error
        ) {

            /*
            =================================================
            ONLY CREATE WHEN BRANCH DOES NOT EXIST
            =================================================
            */

            if (
                error?.statusCode !==
                    404 &&
                error?.status !==
                    404
            ) {

                throw error;

            }

        }


        /*
        ====================================================
        CREATE BR02
        ====================================================
        */

        const branch =
            await branchService
                .createBranch({

                    code:
                        BRANCH_CODE,

                    name:
                        BRANCH_NAME,

                    address:
                        "",

                    phone:
                        "",

                    email:
                        "",

                    isDefault:
                        false,

                    isActive:
                        true,

                });


        return {

            branch,

            created:
                true,

        };

    };


/*
============================================================
ENSURE BRANCH INVENTORY
============================================================
*/

const ensureBranchInventory =
    async (
        product,
        branch
    ) => {

        /*
        ====================================================
        EXISTING RECORD
        ====================================================
        */

        const existing =
            await BranchInventory
                .findOne({

                    branch:
                        branch._id,

                    product:
                        product._id,

                });


        if (
            existing
        ) {

            /*
            Never overwrite existing branch stock.

            This is critical for retry safety.
            */

            return {

                status:
                    "existing",

                productId:
                    product._id,

                productName:
                    product.name,

                stock:
                    Number(
                        existing.stock
                    ) ||
                    0,

            };

        }


        /*
        ====================================================
        CREATE ZERO-STOCK INVENTORY
        ====================================================

        New branches do NOT inherit MAIN stock.
        ====================================================
        */

        try {

            const created =
                await BranchInventory
                    .create({

                        branch:
                            branch._id,

                        product:
                            product._id,

                        stock:
                            0,

                        minimumStock:
                            0,

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

                stock:
                    Number(
                        created.stock
                    ) ||
                    0,

            };


        } catch (
            error
        ) {

            /*
            =================================================
            CONCURRENT DUPLICATE PROTECTION
            =================================================

            branch + product has a unique index.

            If another process creates the inventory between
            our find and create, reload the winning record
            instead of treating it as a destructive failure.
            =================================================
            */

            if (
                error?.code ===
                11000
            ) {

                const winner =
                    await BranchInventory
                        .findOne({

                            branch:
                                branch._id,

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

                        stock:
                            Number(
                                winner.stock
                            ) ||
                            0,

                    };

                }

            }


            throw error;

        }

    };


/*
============================================================
VERIFY DEFAULT BRANCH
============================================================
*/

const verifyDefaultBranch =
    async (
        expectedDefaultBranchId
    ) => {

        const defaultBranch =
            await branchService
                .getDefaultBranch();


        if (
            !defaultBranch
        ) {

            throw new Error(
                "No active default branch exists after BR02 setup."
            );

        }


        if (
            String(
                defaultBranch._id
            ) !==
            String(
                expectedDefaultBranchId
            )
        ) {

            throw new Error(
                `Default branch changed unexpectedly. Expected ${expectedDefaultBranchId}, found ${defaultBranch._id}.`
            );

        }


        return defaultBranch;

    };


/*
============================================================
VERIFY BRANCH INVENTORY
============================================================
*/

const verifyBranchInventory =
    async (
        products,
        branch
    ) => {

        const problems =
            [];


        for (
            const product
            of products
        ) {

            const inventory =
                await BranchInventory
                    .findOne({

                        branch:
                            branch._id,

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
                        `Missing ${BRANCH_CODE} BranchInventory record.`,

                });


                continue;

            }


            const stock =
                Number(
                    inventory.stock
                );


            if (
                !Number.isFinite(
                    stock
                ) ||
                stock <
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
                        `Invalid ${BRANCH_CODE} stock value.`,

                });

            }

        }


        /*
        ====================================================
        DUPLICATE CHECK
        ====================================================
        */

        const duplicates =
            await BranchInventory
                .aggregate([
                    {
                        $match: {

                            branch:
                                branch._id,

                        },
                    },

                    {
                        $group: {

                            _id:
                                "$product",

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

                product:
                    String(
                        duplicate._id
                    ),

                problem:
                    `Duplicate ${BRANCH_CODE} BranchInventory records detected: ${duplicate.count}`,

            });

        }


        return problems;

    };


/*
============================================================
VERIFY MAIN INVENTORY STILL EXISTS
============================================================

We don't compare stock values.

MAIN stock may legitimately differ from legacy Product.stock
now that BranchInventory is authoritative.

We only verify that MAIN inventory records still exist.
============================================================
*/

const verifyMainInventory =
    async (
        products,
        mainBranch
    ) => {

        const count =
            await BranchInventory
                .countDocuments({

                    branch:
                        mainBranch._id,

                    product: {
                        $in:
                            products.map(
                                (
                                    product
                                ) =>
                                    product._id
                            ),
                    },

                });


        return {

            expected:
                products.length,

            actual:
                count,

            complete:
                count ===
                products.length,

        };

    };


/*
============================================================
RUN SETUP
============================================================
*/

const runSetup =
    async () => {

        console.log(
            "============================================================"
        );

        console.log(
            "🏪 CREATE / INITIALIZE BRANCH 2"
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
        CAPTURE CURRENT DEFAULT
        ====================================================

        This must remain MAIN throughout the setup.
        ====================================================
        */

        const mainBranch =
            await branchService
                .ensureDefaultBranch();


        if (
            mainBranch.code !==
            "MAIN"
        ) {

            throw new Error(
                `Expected MAIN to be the default branch before creating BR02, but current default is ${mainBranch.code}.`
            );

        }


        const originalDefaultBranchId =
            String(
                mainBranch._id
            );


        console.log(
            `🏠 Current default: ${mainBranch.name} (${mainBranch.code})`
        );


        console.log(
            `🆔 MAIN ID: ${mainBranch._id}`
        );


        /*
        ====================================================
        CREATE / LOAD BR02
        ====================================================
        */

        const {
            branch:
                branch2,

            created:
                branchCreated,
        } =
            await getOrCreateBranch();


        console.log(
            ""
        );


        if (
            branchCreated
        ) {

            console.log(
                `✅ Created branch: ${branch2.name} (${branch2.code})`
            );

        } else {

            console.log(
                `➖ Existing branch: ${branch2.name} (${branch2.code})`
            );

        }


        console.log(
            `🆔 BR02 ID: ${branch2._id}`
        );


        /*
        ====================================================
        VERIFY DEFAULT DID NOT CHANGE
        ====================================================
        */

        const verifiedDefault =
            await verifyDefaultBranch(
                originalDefaultBranchId
            );


        console.log(
            `✅ Default remains: ${verifiedDefault.name} (${verifiedDefault.code})`
        );


        /*
        ====================================================
        LOAD GLOBAL PRODUCTS
        ====================================================
        */

        const products =
            await Product.find({})
                .sort({
                    name:
                        1,
                });


        console.log(
            ""
        );


        console.log(
            `📦 Global products found: ${products.length}`
        );


        /*
        ====================================================
        INITIALIZE INVENTORY
        ====================================================
        */

        let createdCount =
            0;

        let existingCount =
            0;

        let existingNonZeroCount =
            0;

        let failureCount =
            0;


        for (
            const product
            of products
        ) {

            try {

                const result =
                    await ensureBranchInventory(
                        product,
                        branch2
                    );


                if (
                    result.status ===
                    "created"
                ) {

                    createdCount +=
                        1;


                    console.log(
                        `✅ Initialized: ${result.productName} | BR02 stock ${result.stock}`
                    );


                    continue;

                }


                existingCount +=
                    1;


                if (
                    result.stock >
                    0
                ) {

                    existingNonZeroCount +=
                        1;


                    console.warn(
                        `⚠️ Existing: ${result.productName} | BR02 stock ${result.stock} | preserved`
                    );

                } else {

                    console.log(
                        `➖ Existing: ${result.productName} | BR02 stock ${result.stock}`
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
        VERIFY
        ====================================================
        */

        console.log(
            ""
        );

        console.log(
            "VERIFYING BRANCH 2"
        );


        const verificationProblems =
            await verifyBranchInventory(
                products,
                branch2
            );


        const branch2InventoryCount =
            await BranchInventory
                .countDocuments({

                    branch:
                        branch2._id,

                });


        const mainInventory =
            await verifyMainInventory(
                products,
                mainBranch
            );


        const finalDefault =
            await verifyDefaultBranch(
                originalDefaultBranchId
            );


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
            "📊 BRANCH 2 SETUP SUMMARY"
        );

        console.log(
            "============================================================"
        );


        console.log(
            `Branch:                     ${branch2.name} (${branch2.code})`
        );

        console.log(
            `Branch active:              ${branch2.isActive}`
        );

        console.log(
            `Branch default:             ${branch2.isDefault}`
        );

        console.log(
            `Default branch:             ${finalDefault.name} (${finalDefault.code})`
        );

        console.log(
            `Total global products:      ${products.length}`
        );

        console.log(
            `BR02 inventory records:     ${branch2InventoryCount}`
        );

        console.log(
            `Created BR02 records:       ${createdCount}`
        );

        console.log(
            `Existing BR02 records:      ${existingCount}`
        );

        console.log(
            `Existing non-zero records:  ${existingNonZeroCount}`
        );

        console.log(
            `MAIN inventory records:     ${mainInventory.actual}`
        );

        console.log(
            `Processing failures:        ${failureCount}`
        );

        console.log(
            `Verification problems:      ${verificationProblems.length}`
        );


        /*
        ====================================================
        PROBLEMS
        ====================================================
        */

        if (
            !mainInventory.complete
        ) {

            console.error(
                ""
            );

            console.error(
                `❌ MAIN inventory verification failed. Expected ${mainInventory.expected}, found ${mainInventory.actual}.`
            );

        }


        if (
            verificationProblems.length >
            0
        ) {

            console.error(
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
                0 ||
            !mainInventory.complete
        ) {

            console.error(
                ""
            );

            console.error(
                "❌ BR02 setup did not complete cleanly."
            );


            process.exitCode =
                1;


            return;

        }


        console.log(
            ""
        );

        console.log(
            "✅ BR02 setup completed successfully."
        );

        console.log(
            "✅ MAIN remains the default branch."
        );

        console.log(
            "✅ MAIN inventory was not modified."
        );

        console.log(
            "✅ Every product has a BR02 inventory record."
        );


        if (
            existingNonZeroCount >
            0
        ) {

            console.log(
                ""
            );

            console.warn(
                "⚠️ Some BR02 inventory records already contained stock."
            );

            console.warn(
                "⚠️ Those values were intentionally preserved."
            );

        }

    };


/*
============================================================
START
============================================================
*/

try {

    await runSetup();


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
        "❌ BRANCH 2 SETUP FAILED"
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