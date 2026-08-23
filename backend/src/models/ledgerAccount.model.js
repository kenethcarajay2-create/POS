import mongoose from "mongoose";


const ledgerAccountSchema =
    new mongoose.Schema(
        {
            /*
            ====================================================
            BASIC INFORMATION
            ====================================================
            */

            name: {
                type: String,
                required: true,
                trim: true,
                minlength: 2,
                maxlength: 100,
            },

            phone: {
                type: String,
                default: "",
                trim: true,
                maxlength: 30,
            },


            /*
            ====================================================
            ACCOUNT TYPE
            ====================================================
            */

            type: {
                type: String,
                enum: [
                    "WORKER",
                    "CUSTOMER",
                ],
                required: true,
                index: true,
            },


            /*
            ====================================================
            WORKER SALARY
            ====================================================

            WEEKLY:
                salary = weekly salary

            MONTHLY:
                salary = monthly salary

            Customers do not use this field.
            ====================================================
            */

            salary: {
                type: Number,
                default: null,
                min: 0,
            },


            /*
            ====================================================
            PAY FREQUENCY
            ====================================================

            Only used by WORKER accounts.
            ====================================================
            */

            payFrequency: {
                type: String,
                enum: [
                    "WEEKLY",
                    "MONTHLY",
                ],
                default: null,
            },


            /*
            ====================================================
            MONTHLY PAYDAY
            ====================================================

            Example:

            11 = every 11th
            15 = every 15th
            30 = every 30th

            Only used when:

            payFrequency === "MONTHLY"
            ====================================================
            */

            payDay: {
                type: Number,
                default: null,
                min: 1,
                max: 31,
            },


            /*
            ====================================================
            WEEKLY PAYDAY
            ====================================================

            JavaScript weekday numbers:

            0 = Sunday
            1 = Monday
            2 = Tuesday
            3 = Wednesday
            4 = Thursday
            5 = Friday
            6 = Saturday

            Only used when:

            payFrequency === "WEEKLY"
            ====================================================
            */

            payDayOfWeek: {
                type: Number,
                default: null,
                min: 0,
                max: 6,
            },


            /*
            ====================================================
            OPTIONAL SALARY PERIOD LABEL
            ====================================================

            This is just an optional display field.

            Examples:

            "Regular Monthly Salary"
            "Weekly Salary"
            ====================================================
            */

            salaryPeriod: {
                type: String,
                default: "",
                trim: true,
                maxlength: 100,
            },


            /*
            ====================================================
            ACCOUNT STATUS
            ====================================================
            */

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        {
            timestamps: true,
        }
    );


/*
============================================================
VALIDATE WORKER SETTINGS
============================================================

IMPORTANT:

We DO NOT use:

function(next)

or:

next()

This avoids your:

"next is not a function"

error.

If something is invalid, simply throw an Error.
============================================================
*/

ledgerAccountSchema.pre(
    "validate",
    function () {

        /*
        ========================================================
        CUSTOMER
        ========================================================

        Customers should not have worker salary settings.
        ========================================================
        */

        if (
            this.type ===
            "CUSTOMER"
        ) {

            this.salary =
                null;

            this.payFrequency =
                null;

            this.payDay =
                null;

            this.payDayOfWeek =
                null;

            this.salaryPeriod =
                "";

            return;

        }


        /*
        ========================================================
        WORKER
        ========================================================
        */

        if (
            this.type !==
            "WORKER"
        ) {

            return;

        }


        /*
        --------------------------------------------------------
        SALARY
        --------------------------------------------------------
        */

        const salary =
            Number(
                this.salary
            );


        if (
            this.salary === null ||
            this.salary === undefined ||
            !Number.isFinite(
                salary
            ) ||
            salary < 0
        ) {

            throw new Error(
                "Worker salary is required and must be a valid amount."
            );

        }


        this.salary =
            salary;


        /*
        --------------------------------------------------------
        PAY FREQUENCY
        --------------------------------------------------------
        */

        if (
            ![
                "WEEKLY",
                "MONTHLY",
            ].includes(
                this.payFrequency
            )
        ) {

            throw new Error(
                "Pay frequency must be WEEKLY or MONTHLY."
            );

        }


        /*
        ========================================================
        WEEKLY
        ========================================================
        */

        if (
            this.payFrequency ===
            "WEEKLY"
        ) {

            const payDayOfWeek =
                Number(
                    this.payDayOfWeek
                );


            if (
                this.payDayOfWeek ===
                    null ||
                this.payDayOfWeek ===
                    undefined ||
                !Number.isInteger(
                    payDayOfWeek
                ) ||
                payDayOfWeek < 0 ||
                payDayOfWeek > 6
            ) {

                throw new Error(
                    "Weekly workers require a valid payday."
                );

            }


            this.payDayOfWeek =
                payDayOfWeek;


            /*
            Weekly worker does not use monthly payday.
            */

            this.payDay =
                null;

        }


        /*
        ========================================================
        MONTHLY
        ========================================================
        */

        if (
            this.payFrequency ===
            "MONTHLY"
        ) {

            const payDay =
                Number(
                    this.payDay
                );


            if (
                this.payDay ===
                    null ||
                this.payDay ===
                    undefined ||
                !Number.isInteger(
                    payDay
                ) ||
                payDay < 1 ||
                payDay > 31
            ) {

                throw new Error(
                    "Monthly workers require a valid payday between 1 and 31."
                );

            }


            this.payDay =
                payDay;


            /*
            Monthly worker does not use weekly payday.
            */

            this.payDayOfWeek =
                null;

        }

    }
);


/*
============================================================
INDEXES
============================================================
*/

ledgerAccountSchema.index(
    {
        type: 1,
        isActive: 1,
    },
    {
        name:
            "ledger_account_type_active",
    }
);


ledgerAccountSchema.index(
    {
        name: 1,
    },
    {
        name:
            "ledger_account_name",
    }
);


/*
============================================================
VIRTUAL: IS WORKER
============================================================
*/

ledgerAccountSchema.virtual(
    "isWorker"
).get(
    function () {

        return (
            this.type ===
            "WORKER"
        );

    }
);


/*
============================================================
VIRTUAL: IS CUSTOMER
============================================================
*/

ledgerAccountSchema.virtual(
    "isCustomer"
).get(
    function () {

        return (
            this.type ===
            "CUSTOMER"
        );

    }
);


/*
============================================================
MODEL
============================================================
*/

const LedgerAccount =
    mongoose.model(
        "LedgerAccount",
        ledgerAccountSchema
    );


export default LedgerAccount;