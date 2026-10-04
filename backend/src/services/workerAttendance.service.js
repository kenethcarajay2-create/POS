import mongoose from "mongoose";

import WorkerAttendance
    from "../models/workerAttendance.model.js";

import LedgerAccount
    from "../models/ledgerAccount.model.js";

import ApiError
    from "../utils/ApiError.js";

import withTransaction
    from "../utils/withTransaction.js";

import syncOutboxService
    from "./syncOutbox.service.js";


/*
============================================================
OBJECT ID
============================================================
*/

const validateObjectId = (
    id,
    fieldName = "ID"
) => {

    if (
        !id ||
        !mongoose.Types.ObjectId
            .isValid(
                id
            )
    ) {

        throw new ApiError(
            400,
            `Invalid ${fieldName}.`
        );

    }

};


/*
============================================================
BRANCH ID
============================================================
*/

const requireBranchId = (
    value
) => {

    const branchId =
        value?._id ||
        value;


    validateObjectId(
        branchId,
        "branch ID"
    );


    return String(
        branchId
    );

};


/*
============================================================
BUILD BRANCH SNAPSHOT
============================================================
*/

const buildBranchSnapshot = (
    activeBranch
) => {

    if (
        !activeBranch ||
        typeof activeBranch !==
            "object"
    ) {

        throw new ApiError(
            400,
            "Complete branch information is required."
        );

    }


    if (
        activeBranch.isActive ===
        false
    ) {

        throw new ApiError(
            400,
            "The active branch is inactive."
        );

    }


    const code =
        String(
            activeBranch.code ||
            ""
        )
            .trim()
            .toUpperCase();


    const name =
        String(
            activeBranch.name ||
            ""
        )
            .trim();


    if (
        !code ||
        !name
    ) {

        throw new ApiError(
            400,
            "The active branch has incomplete information."
        );

    }


    return {
        code,
        name,
    };

};


/*
============================================================
PHILIPPINE TODAY
============================================================
*/

const getTodayDateKey = () => {

    const formatter =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Asia/Manila",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit",
            }
        );


    const parts =
        formatter.formatToParts(
            new Date()
        );


    const getPart = (
        type
    ) => {

        return (
            parts.find(
                (
                    part
                ) =>
                    part.type ===
                    type
            )?.value ||
            ""
        );

    };


    return (
        `${getPart("year")}-` +
        `${getPart("month")}-` +
        `${getPart("day")}`
    );

};


/*
============================================================
VALIDATE DATE KEY
============================================================
*/

const parseDateKey = (
    value
) => {

    const dateKey =
        String(
            value ||
            ""
        ).trim();


    if (
        !/^\d{4}-\d{2}-\d{2}$/
            .test(
                dateKey
            )
    ) {

        throw new ApiError(
            400,
            "Attendance date must use YYYY-MM-DD format."
        );

    }


    const [
        year,
        month,
        day,
    ] =
        dateKey
            .split("-")
            .map(
                Number
            );


    const testDate =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    if (
        testDate.getUTCFullYear() !==
            year ||
        testDate.getUTCMonth() +
            1 !==
            month ||
        testDate.getUTCDate() !==
            day
    ) {

        throw new ApiError(
            400,
            "Attendance date is invalid."
        );

    }


    if (
        dateKey >
        getTodayDateKey()
    ) {

        throw new ApiError(
            400,
            "Future dates cannot be marked absent."
        );

    }


    return {
        dateKey,
        year,
        month,
        day,
    };

};


/*
============================================================
REQUIRE WORKER
============================================================
*/

const requireWorker =
    async (
        workerId,
        branchId,
        session = null
    ) => {

        validateObjectId(
            workerId,
            "worker ID"
        );


        const query =
            LedgerAccount.findOne({

                _id:
                    workerId,

                branch:
                    requireBranchId(
                        branchId
                    ),

                type:
                    "WORKER",

            });


        if (
            session
        ) {

            query.session(
                session
            );

        }


        const worker =
            await query;


        if (
            !worker
        ) {

            throw new ApiError(
                404,
                "Worker not found in the active branch."
            );

        }


        return worker;

    };


/*
============================================================
ENQUEUE ATTENDANCE SYNC
============================================================
*/

const enqueueAttendanceSync =
    async ({
        action,
        attendanceId,
        branchId,
        session,
    }) => {

        await syncOutboxService
            .enqueueSyncRequest({

                source:
                    "WORKER_ATTENDANCE",

                action,

                aggregateId:
                    attendanceId,

                branchId,

                session,

            });

    };


/*
============================================================
GET MONTH
============================================================
*/

const getMonth =
    async (
        workerId,
        branchId,
        year,
        month
    ) => {

        const resolvedBranchId =
            requireBranchId(
                branchId
            );


        const numericYear =
            Number(
                year
            );


        const numericMonth =
            Number(
                month
            );


        if (
            !Number.isInteger(
                numericYear
            ) ||
            numericYear < 2000 ||
            numericYear > 2200
        ) {

            throw new ApiError(
                400,
                "Invalid attendance year."
            );

        }


        if (
            !Number.isInteger(
                numericMonth
            ) ||
            numericMonth < 1 ||
            numericMonth > 12
        ) {

            throw new ApiError(
                400,
                "Invalid attendance month."
            );

        }


        const worker =
            await requireWorker(
                workerId,
                resolvedBranchId
            );


        const records =
            await WorkerAttendance
                .find({

                    branch:
                        resolvedBranchId,

                    worker:
                        worker._id,

                    year:
                        numericYear,

                    month:
                        numericMonth,

                })
                .populate(
                    "recordedBy",
                    "name username role"
                )
                .populate(
                    "lastChangedBy",
                    "name username role"
                )
                .sort({
                    day:
                        1,
                })
                .lean();


        const absentDates =
            records
                .filter(
                    (
                        record
                    ) =>
                        record.isAbsent ===
                        true
                )
                .map(
                    (
                        record
                    ) =>
                        record.dateKey
                );


        return {

            worker: {

                _id:
                    worker._id,

                name:
                    worker.name,

            },

            year:
                numericYear,

            month:
                numericMonth,

            absentDates,

            records,

        };

    };


/*
============================================================
SET ATTENDANCE
============================================================
*/

const setAttendance =
    async (
        {
            workerId,
            dateKey,
            isAbsent,
        },
        userId,
        activeBranch
    ) => {

        validateObjectId(
            userId,
            "user ID"
        );


        const branchId =
            requireBranchId(
                activeBranch
            );


        const branchSnapshot =
            buildBranchSnapshot(
                activeBranch
            );


        const parsed =
            parseDateKey(
                dateKey
            );


        const result =
            await withTransaction(
                async (
                    session
                ) => {

                    const worker =
                        await requireWorker(
                            workerId,
                            branchId,
                            session
                        );


                    /*
                    =================================================
                    FIND EXISTING DATE
                    =================================================
                    */

                    let attendance =
                        await WorkerAttendance
                            .findOne({

                                branch:
                                    branchId,

                                worker:
                                    worker._id,

                                dateKey:
                                    parsed.dateKey,

                            })
                            .session(
                                session
                            );


                    /*
                    =================================================
                    UPDATE EXISTING RECORD
                    =================================================
                    */

                    if (
                        attendance
                    ) {

                        const previousValue =
                            attendance.isAbsent;


                        attendance.isAbsent =
                            Boolean(
                                isAbsent
                            );


                        attendance.lastChangedBy =
                            userId;


                        attendance.branchSnapshot =
                            branchSnapshot;


                        await attendance.save({
                            session,
                        });


                        /*
                        Only enqueue when the actual attendance
                        value changed.

                        Repeating the same request remains safe.
                        */

                        if (
                            previousValue !==
                            attendance.isAbsent
                        ) {

                            await enqueueAttendanceSync({

                                action:
                                    attendance.isAbsent
                                        ? "MARK_ABSENT"
                                        : "MARK_PRESENT",

                                attendanceId:
                                    attendance._id,

                                branchId,

                                session,

                            });

                        }


                        return {

                            attendanceId:
                                attendance._id,

                        };

                    }


                    /*
                    =================================================
                    CREATE RECORD
                    =================================================
                    */

                    const [
                        created,
                    ] =
                        await WorkerAttendance
                            .create(
                                [
                                    {
                                        branch:
                                            branchId,

                                        branchSnapshot,

                                        worker:
                                            worker._id,

                                        dateKey:
                                            parsed.dateKey,

                                        year:
                                            parsed.year,

                                        month:
                                            parsed.month,

                                        day:
                                            parsed.day,

                                        isAbsent:
                                            Boolean(
                                                isAbsent
                                            ),

                                        recordedBy:
                                            userId,

                                        lastChangedBy:
                                            userId,
                                    },
                                ],
                                {
                                    session,
                                }
                            );


                    await enqueueAttendanceSync({

                        action:
                            created.isAbsent
                                ? "MARK_ABSENT"
                                : "MARK_PRESENT",

                        attendanceId:
                            created._id,

                        branchId,

                        session,

                    });


                    return {

                        attendanceId:
                            created._id,

                    };

                }
            );


        return WorkerAttendance
            .findById(
                result.attendanceId
            )
            .populate(
                "recordedBy",
                "name username role"
            )
            .populate(
                "lastChangedBy",
                "name username role"
            );

    };


/*
============================================================
MARK ABSENT
============================================================
*/

const markAbsent =
    async (
        workerId,
        dateKey,
        userId,
        activeBranch
    ) => {

        return setAttendance(
            {
                workerId,

                dateKey,

                isAbsent:
                    true,
            },
            userId,
            activeBranch
        );

    };


/*
============================================================
MARK PRESENT
============================================================
*/

const markPresent =
    async (
        workerId,
        dateKey,
        userId,
        activeBranch
    ) => {

        return setAttendance(
            {
                workerId,

                dateKey,

                isAbsent:
                    false,
            },
            userId,
            activeBranch
        );

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    getMonth,

    markAbsent,

    markPresent,

};