import mongoose from "mongoose";


const workerLedgerSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            WORKER
            ====================================================
            */

            worker: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "LedgerAccount",
                required: true,
                index: true,
            },


            /*
            ====================================================
            PAY FREQUENCY
            ====================================================
            */

            payFrequency: {
                type: String,
                enum: [
                    "WEEKLY",
                    "MONTHLY",
                ],
                required: true,
            },


            /*
            ====================================================
            PAY PERIOD
            ====================================================
            */

            periodStart: {
                type: Date,
                required: true,
            },

            periodEnd: {
                type: Date,
                required: true,
            },


            /*
            ====================================================
            SCHEDULED PAY DATE
            ====================================================
            */

            scheduledPayDate: {
                type: Date,
                required: true,
            },


            /*
            ====================================================
            PERIOD NUMBER
            ====================================================
            */

            periodNumber: {
                type: Number,
                required: true,
                min: 1,
            },


            /*
            ====================================================
            YEAR / MONTH

            Kept for compatibility with your current routes.
            ====================================================
            */

            year: {
                type: Number,
                required: true,
            },

            month: {
                type: Number,
                required: true,
                min: 1,
                max: 12,
            },


            /*
            ====================================================
            SALARY SNAPSHOT
            ====================================================
            */

            salary: {
                type: Number,
                required: true,
                min: 0,
            },


            /*
            ====================================================
            CREDITS
            ====================================================
            */

            totalCredits: {
                type: Number,
                default: 0,
                min: 0,
            },


            /*
            ====================================================
            CASH ADVANCES
            ====================================================
            */

            totalCashAdvances: {
                type: Number,
                default: 0,
                min: 0,
            },


            /*
            ====================================================
            CREDIT PAYMENTS
            ====================================================

            These are credit repayments.

            They DO NOT restore remaining salary.
            ====================================================
            */

            totalPayments: {
                type: Number,
                default: 0,
                min: 0,
            },


            /*
            ====================================================
            REMAINING SALARY

            salary
            - credits
            - cash advances
            ====================================================
            */

            remainingSalary: {
                type: Number,
                default: 0,
                min: 0,
            },


            /*
            ====================================================
            STATUS
            ====================================================
            */

            status: {
                type: String,
                enum: [
                    "OPEN",
                    "CLOSED",
                    "PAID",
                ],
                default: "OPEN",
                required: true,
            },


            /*
            ====================================================
            DATES
            ====================================================
            */

            closedAt: {
                type: Date,
                default: null,
            },

            paidAt: {
                type: Date,
                default: null,
            },


            /*
            ====================================================
            ACTUAL SALARY RELEASED
            ====================================================
            */

            salaryReleased: {
                type: Number,
                default: null,
                min: 0,
            },


            /*
            ====================================================
            REMARKS
            ====================================================
            */

            remarks: {
                type: String,
                default: "",
                trim: true,
            },
        },
        {
            timestamps: true,

            toJSON: {
                virtuals: true,
            },

            toObject: {
                virtuals: true,
            },
        }
    );


/*
============================================================
CALCULATE REMAINING SALARY
============================================================

IMPORTANT:

Payments are NOT included.

Example:

Salary          10,000
Credit           1,000
Cash Advance     2,000
----------------------
Remaining        7,000
============================================================
*/

workerLedgerSchema.methods.calculateRemainingSalary =
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

IMPORTANT FIX:

DO NOT USE:

function(next)

DO NOT CALL:

next()

Your current error:

"next is not a function"

comes from using callback-style middleware here.

This middleware is synchronous.
============================================================
*/

workerLedgerSchema.pre(
    "validate",
    function () {

        /*
        --------------------------------------------------------
        PERIOD VALIDATION
        --------------------------------------------------------
        */

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


        /*
        --------------------------------------------------------
        SCHEDULED PAY DATE
        --------------------------------------------------------
        */

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


        /*
        --------------------------------------------------------
        INITIAL REMAINING SALARY
        --------------------------------------------------------

        For a fresh OPEN ledger:

        salary = 10,000
        credits = 0
        advances = 0

        remainingSalary = 10,000
        --------------------------------------------------------
        */

        if (
            this.status ===
            "OPEN"
        ) {

            this.calculateRemainingSalary();

        }


        /*
        --------------------------------------------------------
        PAID LEDGER
        --------------------------------------------------------
        */

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


            if (!this.paidAt) {

                this.paidAt =
                    new Date();

            }


            if (!this.closedAt) {

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

Internal backend helper only.

There is NO Mark as Paid button on LedgerPage.

WorkersPage uses Pay Worker.
============================================================
*/

workerLedgerSchema.methods.markAsPaid =
    function (
        paymentDate = new Date()
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
VIRTUAL: OUTSTANDING CREDIT
============================================================

Credits minus credit payments.
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


/*
============================================================
VIRTUAL: IS OPEN
============================================================
*/

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


/*
============================================================
VIRTUAL: IS PAID
============================================================
*/

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
ONLY ONE OPEN LEDGER PER WORKER
============================================================

This is extremely important.

Allowed:

Period #1 PAID
Period #2 PAID
Period #3 OPEN

Not allowed:

Period #3 OPEN
Period #4 OPEN
============================================================
*/

workerLedgerSchema.index(
    {
        worker: 1,
    },
    {
        unique: true,

        partialFilterExpression: {
            status: "OPEN",
        },

        name:
            "one_open_worker_ledger",
    }
);


/*
============================================================
UNIQUE PERIOD NUMBER
============================================================
*/

workerLedgerSchema.index(
    {
        worker: 1,
        periodNumber: 1,
    },
    {
        unique: true,

        name:
            "worker_period_number_unique",
    }
);


/*
============================================================
WORKER HISTORY INDEX
============================================================
*/

workerLedgerSchema.index(
    {
        worker: 1,
        periodStart: -1,
        periodEnd: -1,
    },
    {
        name:
            "worker_period_history",
    }
);


/*
============================================================
PAYDAY LOOKUP INDEX
============================================================
*/

workerLedgerSchema.index(
    {
        status: 1,
        scheduledPayDate: 1,
    },
    {
        name:
            "worker_status_payday",
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