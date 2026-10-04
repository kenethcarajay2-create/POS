import syncService
    from "../services/sync.service.js";

import pricedProductSyncService
    from "../services/pricedProductSync.service.js";

import ApiResponse
    from "../utils/ApiResponse.js";


/*
============================================================
RUN CLOUD SYNC
============================================================
*/

const syncNow = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await syncService
                .syncToCloud();


        res.status(
            200
        ).json(

            new ApiResponse(
                true,
                "Cloud sync completed successfully.",
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
GET CLOUD SYNC STATUS
============================================================
*/

const getSyncStatus = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await syncService
                .getSyncStatus();


        res.status(
            200
        ).json(

            new ApiResponse(
                true,
                "Cloud sync status retrieved successfully.",
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
SYNC PRICED PRODUCTS INTO LOCAL POS
============================================================

This is the opposite direction from normal cloud backup:

Product Pricing database
        ↓
StorePOS local Product catalog

BranchInventory stock is never overwritten.
============================================================
*/

const syncPricedProducts = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await pricedProductSyncService
                .syncPricedProducts();


        res.status(
            200
        ).json(

            new ApiResponse(
                true,
                result?.success ===
                    false
                    ? result.message
                    : result?.failed >
                        0
                        ? "Priced-product sync completed with some failed products."
                        : "Priced products synchronized successfully.",
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
GET PRICED PRODUCT SYNC STATUS
============================================================
*/

const getPricedProductSyncStatus = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await pricedProductSyncService
                .getPricedProductSyncStatus();


        res.status(
            200
        ).json(

            new ApiResponse(
                true,
                "Priced-product sync status retrieved successfully.",
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
EXPORT
============================================================
*/

export default {
    syncNow,
    getSyncStatus,
    syncPricedProducts,
    getPricedProductSyncStatus,
};
