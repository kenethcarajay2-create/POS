import workerAttendanceService
    from "../services/workerAttendance.service.js";

import ApiResponse
    from "../utils/ApiResponse.js";


/*
============================================================
GET ATTENDANCE MONTH
============================================================
*/

const getMonth =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await workerAttendanceService
                    .getMonth(
                        req.params.id,
                        req.branchId,
                        req.query.year,
                        req.query.month
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Worker attendance retrieved successfully.",
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
MARK ABSENT
============================================================
*/

const markAbsent =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await workerAttendanceService
                    .markAbsent(
                        req.params.id,
                        req.params.dateKey,
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
                        "Worker marked absent.",
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
MARK PRESENT
============================================================
*/

const markPresent =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await workerAttendanceService
                    .markPresent(
                        req.params.id,
                        req.params.dateKey,
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
                        "Worker marked present.",
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


export default {
    getMonth,

    markAbsent,

    markPresent,
};