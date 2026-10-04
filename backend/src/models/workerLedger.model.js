import mongoose from "mongoose";


const workerLedgerSchema =
    new mongoose.Schema(
        {

            /*
            ====================================================
            BRANCH
            ====================================================
            */

            branch: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Branch",

                default:
                    null,

            },


            /*
            ====================================================
            BRANCH SNAPSHOT
            ====================================================
            */

            branchSnapshot: {

                code: {

                    type:
                        String,

                    default:
                        "",

                    trim:
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


            /*
            ====================================================
            WORKER
            ====================================================
            */

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
            PAY FREQUENCY
            ====================================================
            */

            payFrequency: {

                type:
                    String,

                enum: [
                    "WEEKLY",
                    "MONTHLY",
                ],

                required:
                    true,

            },


            /*
            ====================================================
            PAY PERIOD
            ====================================================
            */

            periodStart: {

                type:
                    Date,

                required:
                    true,

            },


            periodEnd: {

                type:
                    Date,

                required:
                    true,

            },


            /*
            ====================================================
            SCHEDULED PAY DATE
            ====================================================
            */

            scheduledPayDate: {

                type:
                    Date,

                required:
                    true,

            },


            /*
            ====================================================
            PERIOD NUMBER
            ====================================================
            */

            periodNumber: {

                type:
                    Number,

                required:
                    true,

                min:
                    1,

            },


            /*
            ====================================================
            YEAR / MONTH
            ====================================================
            */

            year: {

                type:
                    Number,

                required:
                    true,

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


            /*
            ====================================================
            SALARY SNAPSHOT
            ====================================================
            */

            salary: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

            },


            /*
            ====================================================
            TOTALS
            ====================================================
            */

            totalCredits: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            totalCashAdvances: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            totalPayments: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            remainingSalary: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

            },


            /*
            ====================================================
            STATUS
            ====================================================
            */

            status: {

                type:
                    String,

                enum: [
                    "OPEN",
                    "CLOSED",
                    "PAID",
                ],

                default:
                    "OPEN",

                required:
                    true,

            },


            /*
            ====================================================
            DATES
            ====================================================
            */

            closedAt: {

                type:
                    Date,

                default:
                    null,

            },


            paidAt: {

                type:
                    Date,

                default:
                    null,

            },


            /*
            ====================================================
            ACTUAL SALARY RELEASED
            ====================================================
            */

            salaryReleased: {

                type:
                    Number,

                default:
                    null,

                min:
                    0,

            },


            /*
            ====================================================
            REMARKS
            ====================================================
            */

            remarks: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

            },

        },
        {

            timestamps:
                true,


            toJSON: {

                virtuals:
                    true,

            },


            toObject: {

                virtuals:
                    true,

            },

        }
    );


/*
============================================================
CALCULATE REMAINING SALARY
============================================================
*/

workerLedgerSchema.methods
    .calculateRemainingSalary =
    function () {

        const salary =
            Number(
                this.salary
            ) || 0;


        const credits =
            Number(
                this.totalCredits
            ) || 0;


        const cashAdvances =
            Number(
                this.totalCashAdvances
            ) || 0;


        this.remainingSalary =
            Math.max(
                salary -
                credits -
                cashAdvances,
                0
            );


        return this.remainingSalary;

    };


/*
============================================================
VALIDATE WORKER LEDGER
============================================================
*/

workerLedgerSchema.pre(
    "validate",
    function () {

        if (
            this.periodStart &&
            this.periodEnd
        ) {

            const start =
                new Date(
                    this.periodStart
                );


            const end =
                new Date(
                    this.periodEnd
                );


            if (
                Number.isNaN(
                    start.getTime()
                )
            ) {

                throw new Error(
                    "Invalid worker ledger period start date."
                );

            }


            if (
                Number.isNaN(
                    end.getTime()
                )
            ) {

                throw new Error(
                    "Invalid worker ledger period end date."
                );

            }


            if (
                end.getTime() <
                start.getTime()
            ) {

                throw new Error(
                    "Worker ledger period end cannot be before period start."
                );

            }

        }


        if (
            this.scheduledPayDate
        ) {

            const scheduled =
                new Date(
                    this.scheduledPayDate
                );


            if (
                Number.isNaN(
                    scheduled.getTime()
                )
            ) {

                throw new Error(
                    "Invalid scheduled worker payday."
                );

            }

        }


        if (
            this.status ===
            "OPEN"
        ) {

            this.calculateRemainingSalary();

        }


        if (
            this.status ===
            "PAID"
        ) {

            this.calculateRemainingSalary();


            if (
                this.salaryReleased ===
                    null ||
                this.salaryReleased ===
                    undefined
            ) {

                this.salaryReleased =
                    this.remainingSalary;

            }


            if (
                !this.paidAt
            ) {

                this.paidAt =
                    new Date();

            }


            if (
                !this.closedAt
            ) {

                this.closedAt =
                    this.paidAt;

            }

        }

    }
);


/*
============================================================
MARK AS PAID
============================================================
*/

workerLedgerSchema.methods
    .markAsPaid =
    function (
        paymentDate =
            new Date()
    ) {

        if (
            this.status !==
            "OPEN"
        ) {

            throw new Error(
                "Only an OPEN worker ledger can be paid."
            );

        }


        const paidDate =
            new Date(
                paymentDate
            );


        if (
            Number.isNaN(
                paidDate.getTime()
            )
        ) {

            throw new Error(
                "Invalid worker payment date."
            );

        }


        this.calculateRemainingSalary();


        this.salaryReleased =
            this.remainingSalary;


        this.status =
            "PAID";


        this.paidAt =
            paidDate;


        this.closedAt =
            paidDate;


        return this;

    };


/*
============================================================
VIRTUALS
============================================================
*/

workerLedgerSchema.virtual(
    "outstandingCredit"
).get(
    function () {

        const credits =
            Number(
                this.totalCredits
            ) || 0;


        const payments =
            Number(
                this.totalPayments
            ) || 0;


        return Math.max(
            credits -
            payments,
            0
        );

    }
);


workerLedgerSchema.virtual(
    "isOpen"
).get(
    function () {

        return (
            this.status ===
            "OPEN"
        );

    }
);


workerLedgerSchema.virtual(
    "isPaid"
).get(
    function () {

        return (
            this.status ===
            "PAID"
        );

    }
);


/*
============================================================
EXISTING UNIQUE INDEXES
============================================================
*/

workerLedgerSchema.index(
    {
        worker:
            1,
    },
    {
        unique:
            true,

        partialFilterExpression: {

            status:
                "OPEN",

        },

        name:
            "one_open_worker_ledger",

    }
);


workerLedgerSchema.index(
    {
        worker:
            1,

        periodNumber:
            1,
    },
    {
        unique:
            true,

        name:
            "worker_period_number_unique",

    }
);


workerLedgerSchema.index(
    {
        worker:
            1,

        periodStart:
            -1,

        periodEnd:
            -1,
    },
    {
        name:
            "worker_period_history",

    }
);


workerLedgerSchema.index(
    {
        status:
            1,

        scheduledPayDate:
            1,
    },
    {
        name:
            "worker_status_payday",

    }
);


/*
============================================================
BRANCH INDEXES
============================================================
*/

workerLedgerSchema.index(
    {
        branch:
            1,

        worker:
            1,

        periodStart:
            -1,
    },
    {
        name:
            "worker_ledger_branch_history",

    }
);


workerLedgerSchema.index(
    {
        branch:
            1,

        status:
            1,

        scheduledPayDate:
            1,
    },
    {
        name:
            "worker_ledger_branch_payday",

    }
);


/*
============================================================
MODEL
============================================================
*/

const WorkerLedger =
    mongoose.model(
        "WorkerLedger",
        workerLedgerSchema
    );


export default WorkerLedger;