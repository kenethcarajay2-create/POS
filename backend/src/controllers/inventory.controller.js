import inventoryService from "../services/inventory.service.js";

import ApiResponse from "../utils/ApiResponse.js";


/*
============================================================
STOCK IN
============================================================

Adds stock only to the currently active branch.

Example:

MAIN + 10
    affects MAIN only

BR02 + 10
    affects BR02 only
============================================================
*/

const stockIn =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await inventoryService
                    .stockIn(
                        req.body,
                        req.user?._id ||
                        req.user?.id,
                        req.activeBranch
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Stock added successfully",
                        result
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
STOCK OUT
============================================================

Removes stock only from the currently active branch.
============================================================
*/

const stockOut =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await inventoryService
                    .stockOut(
                        req.body,
                        req.user?._id ||
                        req.user?.id,
                        req.activeBranch
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Stock removed successfully",
                        result
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
ADJUST STOCK
============================================================

Sets / corrects stock only for the selected branch.

The service creates an InventoryTransaction so changes are
auditable.
============================================================
*/

const adjustStock =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await inventoryService
                    .adjustStock(
                        req.body,
                        req.user?._id ||
                        req.user?.id,
                        req.activeBranch
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Stock adjusted successfully",
                        result
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
GET TRANSACTIONS
============================================================

IMPORTANT SERVICE SIGNATURE:

inventoryService.getTransactions(
    filters,
    branchId
)

The branch must therefore be supplied as the SECOND
argument.

Do not put branchId inside the filter object.
============================================================
*/

const getTransactions =
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            ====================================================
            FILTERS
            ====================================================

            These are user-controlled query filters only.

            Branch selection is NOT accepted from req.query.
            ====================================================
            */

            const filters = {

                productId:
                    req.query
                        .productId,

                type:
                    req.query
                        .type,

                limit:
                    req.query
                        .limit,

            };


            /*
            ====================================================
            SERVER-RESOLVED BRANCH
            ====================================================

            resolveActiveBranch middleware has already:

                validated X-Branch-Id
                checked user access
                checked branch status

            and produced:

                req.branchId
            ====================================================
            */

            const transactions =
                await inventoryService
                    .getTransactions(
                        filters,
                        req.branchId
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Inventory transactions retrieved successfully",
                        transactions
                    )
                );


        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    stockIn,

    stockOut,

    adjustStock,

    getTransactions,

};