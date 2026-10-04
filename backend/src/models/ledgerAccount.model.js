import mongoose from "mongoose";


const ledgerAccountSchema =
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
            BASIC INFORMATION
            ====================================================
            */

            name: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                minlength:
                    2,

                maxlength:
                    100,

            },


            phone: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    30,

            },


            /*
            ====================================================
            ACCOUNT TYPE
            ====================================================
            */

            type: {

                type:
                    String,

                enum: [
                    "WORKER",
                    "CUSTOMER",
                ],

                required:
                    true,

                index:
                    true,

            },


            /*
            ====================================================
            WORKER SALARY
            ====================================================
            */

            salary: {

                type:
                    Number,

                default:
                    null,

                min:
                    0,

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

                default:
                    null,

            },


            /*
            ====================================================
            MONTHLY PAYDAY
            ====================================================
            */

            payDay: {

                type:
                    Number,

                default:
                    null,

                min:
                    1,

                max:
                    31,

            },


            /*
            ====================================================
            WEEKLY PAYDAY
            ====================================================
            */

            payDayOfWeek: {

                type:
                    Number,

                default:
                    null,

                min:
                    0,

                max:
                    6,

            },


            /*
            ====================================================
            OPTIONAL SALARY PERIOD LABEL
            ====================================================
            */

            salaryPeriod: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

                maxlength:
                    100,

            },


            /*
            ====================================================
            ACCOUNT STATUS
            ====================================================
            */

            isActive: {

                type:
                    Boolean,

                default:
                    true,

                index:
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
VALIDATE WORKER SETTINGS
============================================================
*/

ledgerAccountSchema.pre(
    "validate",
    function () {

        /*
        ========================================================
        CUSTOMER
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


        const salary =
            Number(
                this.salary
            );


        if (
            this.salary ===
                null ||
            this.salary ===
                undefined ||
            !Number.isFinite(
                salary
            ) ||
            salary <
                0
        ) {

            throw new Error(
                "Worker salary is required and must be a valid amount."
            );

        }


        this.salary =
            salary;


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
                payDayOfWeek <
                    0 ||
                payDayOfWeek >
                    6
            ) {

                throw new Error(
                    "Weekly workers require a valid payday."
                );

            }


            this.payDayOfWeek =
                payDayOfWeek;


            this.payDay =
                null;

        }


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
                payDay <
                    1 ||
                payDay >
                    31
            ) {

                throw new Error(
                    "Monthly workers require a valid payday between 1 and 31."
                );

            }


            this.payDay =
                payDay;


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
        type:
            1,

        isActive:
            1,
    },
    {
        name:
            "ledger_account_type_active",
    }
);


ledgerAccountSchema.index(
    {
        name:
            1,
    },
    {
        name:
            "ledger_account_name",
    }
);


/*
============================================================
BRANCH INDEXES
============================================================
*/

ledgerAccountSchema.index(
    {
        branch:
            1,

        type:
            1,

        isActive:
            1,
    },
    {
        name:
            "ledger_account_branch_type_active",
    }
);


ledgerAccountSchema.index(
    {
        branch:
            1,

        name:
            1,
    },
    {
        name:
            "ledger_account_branch_name",
    }
);


/*
============================================================
VIRTUALS
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