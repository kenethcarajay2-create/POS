import mongoose from "mongoose";

import Branch from "../models/branch.model.js";

import Product from "../models/product.model.js";

import BranchInventory from "../models/branchInventory.model.js";

import ApiError from "../utils/ApiError.js";

import withTransaction from "../utils/withTransaction.js";

import syncOutboxService from "./syncOutbox.service.js";


/*
============================================================
NORMALIZE BRANCH CODE
============================================================
*/

const normalizeCode =
    (
        value
    ) => {

        return String(
            value ||
            ""
        )
            .trim()
            .toUpperCase();

    };


/*
============================================================
NORMALIZE TEXT
============================================================
*/

const normalizeText =
    (
        value
    ) => {

        return String(
            value ||
            ""
        ).trim();

    };


/*
============================================================
VALIDATE BRANCH ID
============================================================
*/

const validateBranchId =
    (
        branchId
    ) => {

        const id =
            branchId?._id ||
            branchId;


        if (
            !id ||
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {

            throw new ApiError(
                400,
                "Invalid branch ID."
            );

        }


        return id;

    };


/*
============================================================
APPLY OPTIONAL SESSION
============================================================
*/

const applySession =
    (
        query,
        session = null
    ) => {

        if (
            session
        ) {

            query.session(
                session
            );

        }


        return query;

    };


/*
============================================================
GET BRANCH BY ID INTERNAL
============================================================
*/

const getBranchByIdInternal =
    async (
        branchId,
        session = null
    ) => {

        const id =
            validateBranchId(
                branchId
            );


        let query =
            Branch.findById(
                id
            );


        query =
            applySession(
                query,
                session
            );


        const branch =
            await query;


        if (
            !branch
        ) {

            throw new ApiError(
                404,
                "Branch not found."
            );

        }


        return branch;

    };


/*
============================================================
PROVISION BRANCH INVENTORY
============================================================

Creates a BranchInventory record for EVERY global product.

IMPORTANT:

- New branch stock always starts at 0.
- Existing inventory is NEVER overwritten.
- Product.stock remains legacy-only.
- Operation participates in the same MongoDB transaction.
============================================================
*/

const provisionBranchInventoryInSession =
    async (
        branchId,
        session
    ) => {

        const resolvedBranchId =
            validateBranchId(
                branchId
            );


        const products =
            await Product
                .find({})
                .select(
                    `
                        _id
                        minimumStock
                        isActive
                    `
                )
                .session(
                    session
                )
                .lean();


        if (
            products.length ===
            0
        ) {

            return {

                totalProducts:
                    0,

                provisioned:
                    0,

            };

        }


        const operations =
            products.map(
                (
                    product
                ) => {

                    const minimumStock =
                        Math.max(
                            Number(
                                product.minimumStock
                            ) ||
                            0,
                            0
                        );


                    return {

                        updateOne: {

                            filter: {

                                branch:
                                    resolvedBranchId,

                                product:
                                    product._id,

                            },

                            update: {

                                $setOnInsert: {

                                    branch:
                                        resolvedBranchId,

                                    product:
                                        product._id,

                                    stock:
                                        0,

                                    minimumStock,

                                    isActive:
                                        true,

                                },

                            },

                            upsert:
                                true,

                        },

                    };

                }
            );


        const result =
            await BranchInventory
                .bulkWrite(
                    operations,
                    {
                        session,
                        ordered:
                            true,
                    }
                );


        return {

            totalProducts:
                products.length,

            provisioned:
                Number(
                    result.upsertedCount ||
                    0
                ),

        };

    };


/*
============================================================
QUEUE BRANCH SYNC
============================================================
*/

const enqueueBranchSync =
    async (
        branch,
        action,
        session
    ) => {

        await syncOutboxService
            .enqueueSyncRequest({

                source:
                    "BRANCH",

                action,

                aggregateId:
                    branch._id,

                /*
                The branch being changed is itself the
                applicable branch context.
                */

                branchId:
                    branch._id,

                session,

            });

    };


/*
============================================================
SET DEFAULT INSIDE TRANSACTION
============================================================
*/

const setDefaultBranchInSession =
    async (
        branchId,
        session
    ) => {

        const branch =
            await getBranchByIdInternal(
                branchId,
                session
            );


        branch.isActive =
            true;

        branch.isDefault =
            true;


        await branch.save({
            session,
        });


        await Branch.updateMany(
            {
                _id: {
                    $ne:
                        branch._id,
                },

                isDefault:
                    true,
            },
            {
                $set: {
                    isDefault:
                        false,
                },
            },
            {
                session,
            }
        );


        return branch;

    };


/*
============================================================
GET ALL BRANCHES
============================================================
*/

const getBranches =
    async (
        {
            includeInactive =
                false,
        } = {}
    ) => {

        const filter = {};


        if (
            !includeInactive
        ) {

            filter.isActive =
                true;

        }


        return Branch
            .find(
                filter
            )
            .sort({

                isDefault:
                    -1,

                name:
                    1,

            });

    };


/*
============================================================
GET BRANCH BY ID
============================================================
*/

const getBranchById =
    async (
        branchId
    ) => {

        return getBranchByIdInternal(
            branchId
        );

    };


/*
============================================================
GET BRANCH BY CODE
============================================================
*/

const getBranchByCode =
    async (
        code
    ) => {

        const normalizedCode =
            normalizeCode(
                code
            );


        if (
            !normalizedCode
        ) {

            throw new ApiError(
                400,
                "Branch code is required."
            );

        }


        const branch =
            await Branch.findOne({

                code:
                    normalizedCode,

            });


        if (
            !branch
        ) {

            throw new ApiError(
                404,
                "Branch not found."
            );

        }


        return branch;

    };


/*
============================================================
GET DEFAULT BRANCH
============================================================
*/

const getDefaultBranch =
    async () => {

        return Branch
            .findOne({

                isDefault:
                    true,

                isActive:
                    true,

            })
            .sort({

                updatedAt:
                    -1,

                createdAt:
                    1,

            });

    };


/*
============================================================
ENSURE DEFAULT BRANCH
============================================================

This operation may perform repair work.

An outbox event is created ONLY when something actually
changes:

- default state repaired
- inactive default reactivated
- duplicate defaults removed
- missing BranchInventory provisioned
- MAIN/default branch created
============================================================
*/

const ensureDefaultBranch =
    async () => {

        return withTransaction(
            async (
                session
            ) => {

                const defaults =
                    await Branch
                        .find({

                            isDefault:
                                true,

                        })
                        .sort({

                            isActive:
                                -1,

                            updatedAt:
                                -1,

                            createdAt:
                                1,

                        })
                        .session(
                            session
                        );


                /*
                =================================================
                EXISTING DEFAULT
                =================================================
                */

                if (
                    defaults.length >
                    0
                ) {

                    const keeper =
                        defaults[0];


                    let repaired =
                        false;


                    if (
                        keeper.isActive !==
                        true
                    ) {

                        keeper.isActive =
                            true;

                        repaired =
                            true;

                    }


                    if (
                        keeper.isDefault !==
                        true
                    ) {

                        keeper.isDefault =
                            true;

                        repaired =
                            true;

                    }


                    if (
                        repaired
                    ) {

                        await keeper.save({
                            session,
                        });

                    }


                    let duplicateDefaultsRemoved =
                        false;


                    if (
                        defaults.length >
                        1
                    ) {

                        const result =
                            await Branch.updateMany(
                                {
                                    _id: {
                                        $ne:
                                            keeper._id,
                                    },

                                    isDefault:
                                        true,
                                },
                                {
                                    $set: {
                                        isDefault:
                                            false,
                                    },
                                },
                                {
                                    session,
                                }
                            );


                        duplicateDefaultsRemoved =
                            Number(
                                result.modifiedCount ||
                                0
                            ) >
                            0;

                    }


                    const provisioning =
                        await provisionBranchInventoryInSession(
                            keeper._id,
                            session
                        );


                    if (
                        repaired ||
                        duplicateDefaultsRemoved ||
                        provisioning.provisioned >
                            0
                    ) {

                        await enqueueBranchSync(
                            keeper,
                            "REPAIR",
                            session
                        );

                    }


                    return keeper;

                }


                /*
                =================================================
                PREFER EXISTING MAIN
                =================================================
                */

                const existingMain =
                    await Branch
                        .findOne({

                            code:
                                "MAIN",

                        })
                        .session(
                            session
                        );


                if (
                    existingMain
                ) {

                    existingMain.isActive =
                        true;

                    existingMain.isDefault =
                        true;


                    await existingMain.save({
                        session,
                    });


                    await Branch.updateMany(
                        {
                            _id: {
                                $ne:
                                    existingMain._id,
                            },

                            isDefault:
                                true,
                        },
                        {
                            $set: {
                                isDefault:
                                    false,
                            },
                        },
                        {
                            session,
                        }
                    );


                    await provisionBranchInventoryInSession(
                        existingMain._id,
                        session
                    );


                    await enqueueBranchSync(
                        existingMain,
                        "REPAIR",
                        session
                    );


                    return existingMain;

                }


                /*
                =================================================
                FALL BACK TO EXISTING BRANCH
                =================================================
                */

                const existingBranch =
                    await Branch
                        .findOne({})
                        .sort({

                            isActive:
                                -1,

                            createdAt:
                                1,

                        })
                        .session(
                            session
                        );


                if (
                    existingBranch
                ) {

                    existingBranch.isActive =
                        true;

                    existingBranch.isDefault =
                        true;


                    await existingBranch.save({
                        session,
                    });


                    await Branch.updateMany(
                        {
                            _id: {
                                $ne:
                                    existingBranch._id,
                            },

                            isDefault:
                                true,
                        },
                        {
                            $set: {
                                isDefault:
                                    false,
                            },
                        },
                        {
                            session,
                        }
                    );


                    await provisionBranchInventoryInSession(
                        existingBranch._id,
                        session
                    );


                    await enqueueBranchSync(
                        existingBranch,
                        "REPAIR",
                        session
                    );


                    return existingBranch;

                }


                /*
                =================================================
                CREATE MAIN
                =================================================
                */

                const created =
                    await Branch.create(
                        [
                            {
                                code:
                                    "MAIN",

                                name:
                                    "Main Branch",

                                address:
                                    "",

                                phone:
                                    "",

                                email:
                                    "",

                                isDefault:
                                    true,

                                isActive:
                                    true,
                            },
                        ],
                        {
                            session,
                        }
                    );


                const branch =
                    created[0];


                await provisionBranchInventoryInSession(
                    branch._id,
                    session
                );


                await enqueueBranchSync(
                    branch,
                    "CREATE",
                    session
                );


                return branch;

            }
        );

    };


/*
============================================================
CREATE BRANCH
============================================================
*/

const createBranch =
    async (
        data = {}
    ) => {

        const code =
            normalizeCode(
                data.code
            );


        const name =
            normalizeText(
                data.name
            );


        const address =
            normalizeText(
                data.address
            );


        const phone =
            normalizeText(
                data.phone
            );


        const email =
            normalizeText(
                data.email
            )
                .toLowerCase();


        if (
            !code
        ) {

            throw new ApiError(
                400,
                "Branch code is required."
            );

        }


        if (
            !name
        ) {

            throw new ApiError(
                400,
                "Branch name is required."
            );

        }


        try {

            return await withTransaction(
                async (
                    session
                ) => {

                    const existing =
                        await Branch
                            .findOne({

                                code,

                            })
                            .session(
                                session
                            );


                    if (
                        existing
                    ) {

                        throw new ApiError(
                            409,
                            "A branch with this code already exists."
                        );

                    }


                    const branchCount =
                        await Branch
                            .countDocuments(
                                {}
                            )
                            .session(
                                session
                            );


                    const shouldBeDefault =
                        branchCount ===
                            0 ||
                        data.isDefault ===
                            true;


                    const created =
                        await Branch.create(
                            [
                                {
                                    code,

                                    name,

                                    address,

                                    phone,

                                    email,

                                    isDefault:
                                        shouldBeDefault,

                                    isActive:
                                        shouldBeDefault
                                            ? true
                                            : data.isActive !==
                                              false,
                                },
                            ],
                            {
                                session,
                            }
                        );


                    const branch =
                        created[0];


                    await provisionBranchInventoryInSession(
                        branch._id,
                        session
                    );


                    if (
                        shouldBeDefault
                    ) {

                        await Branch.updateMany(
                            {
                                _id: {
                                    $ne:
                                        branch._id,
                                },

                                isDefault:
                                    true,
                            },
                            {
                                $set: {
                                    isDefault:
                                        false,
                                },
                            },
                            {
                                session,
                            }
                        );

                    }


                    /*
                    =================================================
                    CLOUD SYNC OUTBOX
                    =================================================

                    Branch + all provisioned BranchInventory rows
                    commit together with this event.
                    =================================================
                    */

                    await enqueueBranchSync(
                        branch,
                        "CREATE",
                        session
                    );


                    return branch;

                }
            );


        } catch (
            error
        ) {

            if (
                error?.code ===
                11000
            ) {

                throw new ApiError(
                    409,
                    "A branch with this code already exists."
                );

            }


            throw error;

        }

    };


/*
============================================================
UPDATE BRANCH
============================================================
*/

const updateBranch =
    async (
        branchId,
        data = {}
    ) => {

        try {

            return await withTransaction(
                async (
                    session
                ) => {

                    const branch =
                        await getBranchByIdInternal(
                            branchId,
                            session
                        );


                    if (
                        data.code !==
                        undefined
                    ) {

                        const code =
                            normalizeCode(
                                data.code
                            );


                        if (
                            !code
                        ) {

                            throw new ApiError(
                                400,
                                "Branch code cannot be empty."
                            );

                        }


                        const existing =
                            await Branch
                                .findOne({

                                    code,

                                    _id: {
                                        $ne:
                                            branch._id,
                                    },

                                })
                                .session(
                                    session
                                );


                        if (
                            existing
                        ) {

                            throw new ApiError(
                                409,
                                "A branch with this code already exists."
                            );

                        }


                        branch.code =
                            code;

                    }


                    if (
                        data.name !==
                        undefined
                    ) {

                        const name =
                            normalizeText(
                                data.name
                            );


                        if (
                            !name
                        ) {

                            throw new ApiError(
                                400,
                                "Branch name cannot be empty."
                            );

                        }


                        branch.name =
                            name;

                    }


                    if (
                        data.address !==
                        undefined
                    ) {

                        branch.address =
                            normalizeText(
                                data.address
                            );

                    }


                    if (
                        data.phone !==
                        undefined
                    ) {

                        branch.phone =
                            normalizeText(
                                data.phone
                            );

                    }


                    if (
                        data.email !==
                        undefined
                    ) {

                        branch.email =
                            normalizeText(
                                data.email
                            )
                                .toLowerCase();

                    }


                    if (
                        data.isDefault ===
                            false &&
                        branch.isDefault ===
                            true
                    ) {

                        throw new ApiError(
                            400,
                            "You cannot remove the default branch status directly. Set another branch as default instead."
                        );

                    }


                    if (
                        data.isActive !==
                        undefined
                    ) {

                        const requestedActive =
                            Boolean(
                                data.isActive
                            );


                        if (
                            branch.isDefault &&
                            requestedActive ===
                                false
                        ) {

                            throw new ApiError(
                                400,
                                "The default branch cannot be disabled. Set another branch as default first."
                            );

                        }


                        branch.isActive =
                            requestedActive;

                    }


                    if (
                        data.isDefault ===
                        true
                    ) {

                        branch.isActive =
                            true;

                        branch.isDefault =
                            true;


                        await branch.save({
                            session,
                        });


                        await Branch.updateMany(
                            {
                                _id: {
                                    $ne:
                                        branch._id,
                                },

                                isDefault:
                                    true,
                            },
                            {
                                $set: {
                                    isDefault:
                                        false,
                                },
                            },
                            {
                                session,
                            }
                        );


                        await provisionBranchInventoryInSession(
                            branch._id,
                            session
                        );


                        await enqueueBranchSync(
                            branch,
                            "SET_DEFAULT",
                            session
                        );


                        return branch;

                    }


                    await branch.save({
                        session,
                    });


                    await enqueueBranchSync(
                        branch,
                        "UPDATE",
                        session
                    );


                    return branch;

                }
            );


        } catch (
            error
        ) {

            if (
                error?.code ===
                11000
            ) {

                throw new ApiError(
                    409,
                    "A branch with this code already exists."
                );

            }


            throw error;

        }

    };


/*
============================================================
DISABLE BRANCH
============================================================
*/

const disableBranch =
    async (
        branchId
    ) => {

        return withTransaction(
            async (
                session
            ) => {

                const branch =
                    await getBranchByIdInternal(
                        branchId,
                        session
                    );


                if (
                    branch.isDefault
                ) {

                    throw new ApiError(
                        400,
                        "The default branch cannot be disabled. Set another branch as default first."
                    );

                }


                if (
                    branch.isActive ===
                    false
                ) {

                    return branch;

                }


                branch.isActive =
                    false;


                await branch.save({
                    session,
                });


                await enqueueBranchSync(
                    branch,
                    "DISABLE",
                    session
                );


                return branch;

            }
        );

    };


/*
============================================================
ENABLE BRANCH
============================================================
*/

const enableBranch =
    async (
        branchId
    ) => {

        return withTransaction(
            async (
                session
            ) => {

                const branch =
                    await getBranchByIdInternal(
                        branchId,
                        session
                    );


                if (
                    branch.isActive ===
                    true
                ) {

                    const provisioning =
                        await provisionBranchInventoryInSession(
                            branch._id,
                            session
                        );


                    /*
                    No state change means no unnecessary event.
                    */

                    if (
                        provisioning.provisioned >
                        0
                    ) {

                        await enqueueBranchSync(
                            branch,
                            "REPAIR",
                            session
                        );

                    }


                    return branch;

                }


                branch.isActive =
                    true;


                await branch.save({
                    session,
                });


                await provisionBranchInventoryInSession(
                    branch._id,
                    session
                );


                await enqueueBranchSync(
                    branch,
                    "ENABLE",
                    session
                );


                return branch;

            }
        );

    };


/*
============================================================
SET DEFAULT BRANCH
============================================================
*/

const setDefaultBranch =
    async (
        branchId
    ) => {

        return withTransaction(
            async (
                session
            ) => {

                await provisionBranchInventoryInSession(
                    branchId,
                    session
                );


                const branch =
                    await setDefaultBranchInSession(
                        branchId,
                        session
                    );


                await enqueueBranchSync(
                    branch,
                    "SET_DEFAULT",
                    session
                );


                return branch;

            }
        );

    };


/*
============================================================
BRANCH EXISTS
============================================================
*/

const branchExists =
    async (
        branchId,
        {
            activeOnly =
                false,
        } = {}
    ) => {

        const id =
            validateBranchId(
                branchId
            );


        const filter = {

            _id:
                id,

        };


        if (
            activeOnly
        ) {

            filter.isActive =
                true;

        }


        const exists =
            await Branch.exists(
                filter
            );


        return Boolean(
            exists
        );

    };


/*
============================================================
GET ACTIVE BRANCHES
============================================================
*/

const getActiveBranches =
    async () => {

        return Branch
            .find({

                isActive:
                    true,

            })
            .sort({

                isDefault:
                    -1,

                name:
                    1,

            });

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    normalizeCode,

    validateBranchId,

    getBranches,

    getActiveBranches,

    getBranchById,

    getBranchByCode,

    getDefaultBranch,

    ensureDefaultBranch,

    createBranch,

    updateBranch,

    disableBranch,

    enableBranch,

    setDefaultBranch,

    branchExists,

};