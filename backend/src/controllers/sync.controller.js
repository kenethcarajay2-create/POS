import syncService from "../services/sync.service.js";
import ApiResponse from "../utils/ApiResponse.js";


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
GET SYNC STATUS
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
EXPORT
============================================================
*/

export default {

    syncNow,

    getSyncStatus,

};