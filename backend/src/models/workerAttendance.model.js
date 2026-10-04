import mongoose from "mongoose";


/*
============================================================
WORKER ATTENDANCE
============================================================

Only absence overrides are explicitly recorded.

isAbsent = true
    Worker is absent on this date.

isAbsent = false
    Absence was cancelled / worker is present.

The document is kept instead of deleted so attendance
changes remain auditable.
============================================================
*/

const workerAttendanceSchema =
    new mongoose.Schema(
        {
            branch: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                required:
                    true,

                index:
                    true,
            },


            branchSnapshot: {
                code: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,

                    uppercase:
                        true,

                    maxlength:
                        20,
                },

                name: {
                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,

                    maxlength:
                        120,
                },
            },


            worker: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "LedgerAccount",

                required:
                    true,

                index:
                    true,
            },


            /*
            ====================================================
            DATE KEY
            ====================================================

            YYYY-MM-DD avoids timezone shifting.

            Example:
                2026-09-13
            ====================================================
            */

            dateKey: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                match:
                    /^\d{4}-\d{2}-\d{2}$/,
            },


            year: {
                type:
                    Number,

                required:
                    true,

                min:
                    2000,

                max:
                    2200,
            },


            month: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,

                max:
                    12,
            },


            day: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,

                max:
                    31,
            },


            /*
            ====================================================
            ATTENDANCE
            ====================================================
            */

            isAbsent: {
                type:
                    Boolean,

                required:
                    true,

                default:
                    true,
            },


            /*
            ====================================================
            AUDIT
            ====================================================
            */

            recordedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                required:
                    true,
            },


            lastChangedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                required:
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
UNIQUE DATE PER WORKER / BRANCH
============================================================
*/

workerAttendanceSchema.index(
    {
        branch:
            1,

        worker:
            1,

        dateKey:
            1,
    },
    {
        unique:
            true,

        name:
            "worker_attendance_unique_date",
    }
);


/*
============================================================
MONTH LOOKUP
============================================================
*/

workerAttendanceSchema.index(
    {
        branch:
            1,

        worker:
            1,

        year:
            1,

        month:
            1,
    },
    {
        name:
            "worker_attendance_month",
    }
);


/*
============================================================
BRANCH DATE LOOKUP
============================================================
*/

workerAttendanceSchema.index(
    {
        branch:
            1,

        dateKey:
            1,

        isAbsent:
            1,
    },
    {
        name:
            "worker_attendance_branch_date",
    }
);


/*
============================================================
MODEL
============================================================
*/

const WorkerAttendance =
    mongoose.models.WorkerAttendance ||
    mongoose.model(
        "WorkerAttendance",
        workerAttendanceSchema
    );


export default WorkerAttendance;