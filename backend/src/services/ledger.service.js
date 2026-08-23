import mongoose from "mongoose";

import LedgerAccount from "../models/ledgerAccount.model.js";
import LedgerTransaction from "../models/ledgerTransaction.model.js";
import WorkerLedger from "../models/workerLedger.model.js";
import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";

import ApiError from "../utils/ApiError.js";
import printerService from "./printer.service.js";


/*
============================================================
HELPERS
============================================================
*/

const validateObjectId = (
    id,
    fieldName = "ID"
) => {

    if (
        !id ||
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        throw new ApiError(
            400,
            `Invalid ${fieldName}.`
        );

    }

};


/*
============================================================
DATE HELPERS
============================================================
*/

const startOfDay = (
    value
) => {

    const date =
        new Date(value);

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;

};


const endOfDay = (
    value
) => {

    const date =
        new Date(value);

    date.setHours(
        23,
        59,
        59,
        999
    );

    return date;

};


const addDays = (
    value,
    days
) => {

    const date =
        new Date(value);

    date.setDate(
        date.getDate() +
        Number(days)
    );

    return date;

};


/*
============================================================
GET LAST DAY OF MONTH
============================================================
*/

const getLastDayOfMonth = (
    year,
    month
) => {

    return new Date(
        year,
        month,
        0
    ).getDate();

};


/*
============================================================
MONTHLY PAY DATE
============================================================

Example:

payDay = 31
February 2027

Result:

February 28, 2027
============================================================
*/

const getMonthlyPayDate = (
    year,
    month,
    payDay
) => {

    const lastDay =
        getLastDayOfMonth(
            year,
            month
        );


    const validPayDay =
        Math.min(
            Math.max(
                Number(payDay) || 1,
                1
            ),
            lastDay
        );


    return startOfDay(
        new Date(
            year,
            month - 1,
            validPayDay
        )
    );

};


/*
============================================================
NEXT OR SAME WEEKDAY
============================================================

0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
============================================================
*/

const getNextOrSameWeekday = (
    value,
    targetDay
) => {

    const date =
        startOfDay(value);


    const currentDay =
        date.getDay();


    const difference =
        (
            Number(targetDay) -
            currentDay +
            7
        ) % 7;


    return addDays(
        date,
        difference
    );

};


/*
============================================================
FORMAT WORKER LEDGER LABEL
============================================================
*/

const formatWorkerLedgerLabel = (
    ledger
) => {

    if (!ledger) {

        return "";

    }


    if (
        !ledger.periodStart
    ) {

        return (
            `Period #${
                ledger.periodNumber ||
                1
            }`
        );

    }


    const start =
        new Date(
            ledger.periodStart
        );


    const end =
        ledger.periodEnd
            ? new Date(
                ledger.periodEnd
            )
            : null;


    if (
        ledger.payFrequency ===
            "WEEKLY" &&
        end
    ) {

        const startText =
            start.toLocaleDateString(
                "en-US",
                {
                    month:
                        "short",

                    day:
                        "numeric",

                    year:
                        "numeric",
                }
            );


        const endText =
            end.toLocaleDateString(
                "en-US",
                {
                    month:
                        "short",

                    day:
                        "numeric",

                    year:
                        "numeric",
                }
            );


        return (
            `${startText} - ${endText}`
        );

    }


    return start.toLocaleDateString(
        "en-US",
        {
            month:
                "long",

            year:
                "numeric",
        }
    );

};


/*
============================================================
NORMALIZE WORKER LEDGER
============================================================
*/

const normalizeWorkerLedger = (
    ledger
) => {

    if (!ledger) {

        return null;

    }


    const raw =
        typeof ledger.toObject ===
        "function"
            ? ledger.toObject()
            : ledger;


    return {

        ...raw,

        id:
            raw._id,

        listId:
            raw._id,

        /*
        Temporary compatibility alias for older frontend.
        */

        listNumber:
            raw.periodNumber,

        label:
            formatWorkerLedgerLabel(
                raw
            ),

    };

};


/*
============================================================
GET OPEN WORKER LEDGER
============================================================

IMPORTANT:

This NEVER creates a ledger.
============================================================
*/

const getOpenWorkerLedger = async (
    workerId
) => {

    return WorkerLedger
        .findOne({

            worker:
                workerId,

            status:
                "OPEN",

        })
        .sort({

            periodNumber:
                -1,

            createdAt:
                -1,

        });

};


/*
============================================================
GET LATEST WORKER LEDGER
============================================================
*/

const getLatestWorkerLedger = async (
    workerId
) => {

    return WorkerLedger
        .findOne({

            worker:
                workerId,

        })
        .sort({

            periodNumber:
                -1,

            createdAt:
                -1,

        });

};


/*
============================================================
GET SPECIFIC WORKER LEDGER
============================================================
*/

const getSpecificWorkerLedger = async (
    worker,
    ledgerId
) => {

    validateObjectId(
        ledgerId,
        "worker ledger ID"
    );


    const ledger =
        await WorkerLedger.findOne({

            _id:
                ledgerId,

            worker:
                worker._id,

        });


    if (!ledger) {

        throw new ApiError(
            404,
            "Worker ledger period not found."
        );

    }


    return ledger;

};


/*
============================================================
VALIDATE WORKER PAY SETTINGS
============================================================
*/

const validateWorkerPaySettings = (
    worker
) => {

    if (
        worker.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "This account is not a worker."
        );

    }


    const salary =
        Number(
            worker.salary
        );


    if (
        !Number.isFinite(
            salary
        ) ||
        salary < 0
    ) {

        throw new ApiError(
            400,
            "Worker does not have a valid salary."
        );

    }


    if (
        ![
            "WEEKLY",
            "MONTHLY",
        ].includes(
            worker.payFrequency
        )
    ) {

        throw new ApiError(
            400,
            "Worker pay frequency must be WEEKLY or MONTHLY."
        );

    }


    /*
    --------------------------------------------------------
    WEEKLY
    --------------------------------------------------------
    */

    if (
        worker.payFrequency ===
        "WEEKLY"
    ) {

        const payDayOfWeek =
            Number(
                worker.payDayOfWeek
            );


        if (
            !Number.isInteger(
                payDayOfWeek
            ) ||
            payDayOfWeek < 0 ||
            payDayOfWeek > 6
        ) {

            throw new ApiError(
                400,
                "Weekly worker does not have a valid payday."
            );

        }

    }


    /*
    --------------------------------------------------------
    MONTHLY
    --------------------------------------------------------
    */

    if (
        worker.payFrequency ===
        "MONTHLY"
    ) {

        const payDay =
            Number(
                worker.payDay
            );


        if (
            !Number.isInteger(
                payDay
            ) ||
            payDay < 1 ||
            payDay > 31
        ) {

            throw new ApiError(
                400,
                "Monthly worker does not have a valid payday."
            );

        }

    }

};


/*
============================================================
BUILD FIRST WORKER PAY PERIOD
============================================================
*/

const buildInitialWorkerPeriod = (
    worker,
    referenceDate = new Date()
) => {

    validateWorkerPaySettings(
        worker
    );


    const reference =
        startOfDay(
            referenceDate
        );


    /*
    --------------------------------------------------------
    WEEKLY
    --------------------------------------------------------
    */

    if (
        worker.payFrequency ===
        "WEEKLY"
    ) {

        const scheduledPayDate =
            getNextOrSameWeekday(
                reference,
                worker.payDayOfWeek
            );


        const periodStart =
            startOfDay(
                addDays(
                    scheduledPayDate,
                    -6
                )
            );


        const periodEnd =
            endOfDay(
                scheduledPayDate
            );


        return {

            payFrequency:
                "WEEKLY",

            periodStart,

            periodEnd,

            scheduledPayDate:
                startOfDay(
                    scheduledPayDate
                ),

            year:
                periodStart
                    .getFullYear(),

            month:
                periodStart
                    .getMonth() +
                1,

        };

    }


    /*
    --------------------------------------------------------
    MONTHLY
    --------------------------------------------------------
    */

    const year =
        reference.getFullYear();


    const month =
        reference.getMonth() +
        1;


    const periodStart =
        startOfDay(
            new Date(
                year,
                month - 1,
                1
            )
        );


    const periodEnd =
        endOfDay(
            new Date(
                year,
                month,
                0
            )
        );


    const scheduledPayDate =
        getMonthlyPayDate(
            year,
            month,
            worker.payDay
        );


    return {

        payFrequency:
            "MONTHLY",

        periodStart,

        periodEnd,

        scheduledPayDate,

        year,

        month,

    };

};


/*
============================================================
BUILD NEXT WORKER PAY PERIOD
============================================================
*/

const buildNextWorkerPeriod = (
    worker,
    previousLedger
) => {

    validateWorkerPaySettings(
        worker
    );


    /*
    --------------------------------------------------------
    WEEKLY
    --------------------------------------------------------
    */

    if (
        worker.payFrequency ===
        "WEEKLY"
    ) {

        const periodStart =
            startOfDay(
                addDays(
                    previousLedger
                        .periodEnd,
                    1
                )
            );


        const periodEnd =
            endOfDay(
                addDays(
                    periodStart,
                    6
                )
            );


        return {

            payFrequency:
                "WEEKLY",

            periodStart,

            periodEnd,

            scheduledPayDate:
                startOfDay(
                    periodEnd
                ),

            year:
                periodStart
                    .getFullYear(),

            month:
                periodStart
                    .getMonth() +
                1,

        };

    }


    /*
    --------------------------------------------------------
    MONTHLY
    --------------------------------------------------------
    */

    const previousStart =
        new Date(
            previousLedger
                .periodStart
        );


    const nextMonthStart =
        startOfDay(
            new Date(
                previousStart
                    .getFullYear(),

                previousStart
                    .getMonth() +
                    1,

                1
            )
        );


    const year =
        nextMonthStart
            .getFullYear();


    const month =
        nextMonthStart
            .getMonth() +
        1;


    const periodEnd =
        endOfDay(
            new Date(
                year,
                month,
                0
            )
        );


    const scheduledPayDate =
        getMonthlyPayDate(
            year,
            month,
            worker.payDay
        );


    return {

        payFrequency:
            "MONTHLY",

        periodStart:
            nextMonthStart,

        periodEnd,

        scheduledPayDate,

        year,

        month,

    };

};


/*
============================================================
RECALCULATE WORKER LEDGER
============================================================

Salary deductions:

salary
- credit purchases
- cash advances

Credit repayments do NOT restore salary.
============================================================
*/

const recalculateWorkerLedger = async (
    workerLedger
) => {

    const salary =
        Number(
            workerLedger.salary
        ) || 0;


    const credits =
        Number(
            workerLedger
                .totalCredits
        ) || 0;


    const cashAdvances =
        Number(
            workerLedger
                .totalCashAdvances
        ) || 0;


    workerLedger.remainingSalary =
        Math.max(
            salary -
            credits -
            cashAdvances,
            0
        );


    await workerLedger.save();


    return workerLedger;

};


/*
============================================================
CALCULATE ACCOUNT BALANCE
============================================================

Primarily used for customer accounts.
============================================================
*/

const calculateBalance = async (
    accountId
) => {

    const transactions =
        await LedgerTransaction.find({

            account:
                accountId,

        });


    let creditTotal =
        0;

    let paymentTotal =
        0;

    let cashAdvanceTotal =
        0;


    for (
        const transaction
        of transactions
    ) {

        const amount =
            Number(
                transaction.amount
            ) || 0;


        if (
            transaction.type ===
            "CREDIT"
        ) {

            creditTotal +=
                amount;

        }


        if (
            transaction.type ===
            "PAYMENT"
        ) {

            paymentTotal +=
                amount;

        }


        if (
            transaction.type ===
            "CASH_ADVANCE"
        ) {

            cashAdvanceTotal +=
                amount;

        }

    }


    return {

        creditTotal,

        paymentTotal,

        creditBalance:
            Math.max(
                creditTotal -
                paymentTotal,
                0
            ),

        cashAdvanceTotal,

    };

};


/*
============================================================
GET ALL LEDGER ACCOUNTS
============================================================
*/

const getAccounts = async ({
    type,
    search,
    isActive,
} = {}) => {

    const query =
        {};


    if (type) {

        query.type =
            type;

    }


    if (
        typeof isActive ===
        "boolean"
    ) {

        query.isActive =
            isActive;

    }


    if (
        search &&
        search.trim()
    ) {

        const searchValue =
            search.trim();


        query.$or = [

            {
                name: {

                    $regex:
                        searchValue,

                    $options:
                        "i",

                },
            },

            {
                phone: {

                    $regex:
                        searchValue,

                    $options:
                        "i",

                },
            },

        ];

    }


    const accounts =
        await LedgerAccount
            .find(query)
            .sort({
                createdAt:
                    -1,
            })
            .lean();


    const results =
        [];


    for (
        const account
        of accounts
    ) {

        const balance =
            await calculateBalance(
                account._id
            );


        let currentWorkerLedger =
            null;

        let latestWorkerLedger =
            null;

        let remainingSalary =
            null;

        let workerCreditTotal =
            balance.creditTotal;

        let workerPaymentTotal =
            balance.paymentTotal;

        let workerCashAdvance =
            balance.cashAdvanceTotal;

        let workerCreditBalance =
            balance.creditBalance;


        if (
            account.type ===
            "WORKER"
        ) {

            currentWorkerLedger =
                await getOpenWorkerLedger(
                    account._id
                );


            latestWorkerLedger =
                currentWorkerLedger ||
                await getLatestWorkerLedger(
                    account._id
                );


            if (
                currentWorkerLedger
            ) {

                workerCreditTotal =
                    Number(
                        currentWorkerLedger
                            .totalCredits
                    ) || 0;


                workerPaymentTotal =
                    Number(
                        currentWorkerLedger
                            .totalPayments
                    ) || 0;


                workerCashAdvance =
                    Number(
                        currentWorkerLedger
                            .totalCashAdvances
                    ) || 0;


                workerCreditBalance =
                    Math.max(
                        workerCreditTotal -
                        workerPaymentTotal,
                        0
                    );


                remainingSalary =
                    Number(
                        currentWorkerLedger
                            .remainingSalary
                    ) || 0;

            }

        }


        results.push({

            ...account,

            creditTotal:
                workerCreditTotal,

            paymentTotal:
                workerPaymentTotal,

            creditBalance:
                workerCreditBalance,

            cashAdvance:
                workerCashAdvance,

            remainingSalary,

            currentWorkerLedger:
                normalizeWorkerLedger(
                    currentWorkerLedger
                ),

            latestWorkerLedger:
                normalizeWorkerLedger(
                    latestWorkerLedger
                ),

            /*
            ----------------------------------------------------
            CREATE NEW LEDGER RULE
            ----------------------------------------------------

            true only if:

            - no OPEN ledger
            - and no history OR latest ledger is PAID
            */

            canCreateNewLedger:
                account.type ===
                    "WORKER"
                    ? (
                        !currentWorkerLedger &&
                        (
                            !latestWorkerLedger ||
                            latestWorkerLedger
                                .status ===
                                "PAID"
                        )
                    )
                    : false,

        });

    }


    return results;

};


/*
============================================================
GET ACCOUNT BY ID
============================================================
*/

const getAccountById = async (
    accountId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const account =
        await LedgerAccount
            .findById(
                accountId
            )
            .lean();


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    const balance =
        await calculateBalance(
            account._id
        );


    const allTransactions =
        await LedgerTransaction
            .find({

                account:
                    account._id,

            })
            .populate(
                "createdBy",
                "name username role"
            )
            .populate(
                "items.product",
                "name barcode category"
            )
            .populate(
                "workerLedger",
                `
                periodNumber
                payFrequency
                periodStart
                periodEnd
                scheduledPayDate
                status
                salary
                totalCredits
                totalCashAdvances
                totalPayments
                remainingSalary
                salaryReleased
                paidAt
                `
            )
            .sort({
                createdAt:
                    -1,
            })
            .lean();


    /*
    ========================================================
    CUSTOMER
    ========================================================
    */

    if (
        account.type !==
        "WORKER"
    ) {

        return {

            ...account,

            creditTotal:
                balance.creditTotal,

            paymentTotal:
                balance.paymentTotal,

            creditBalance:
                balance.creditBalance,

            cashAdvance:
                balance.cashAdvanceTotal,

            remainingSalary:
                null,

            currentWorkerLedger:
                null,

            latestWorkerLedger:
                null,

            canCreateNewLedger:
                false,

            transactions:
                allTransactions,

        };

    }


    /*
    ========================================================
    WORKER
    ========================================================
    */

    const currentWorkerLedger =
        await getOpenWorkerLedger(
            account._id
        );


    const latestWorkerLedger =
        currentWorkerLedger ||
        await getLatestWorkerLedger(
            account._id
        );


    let transactions =
        [];

    let creditTotal =
        0;

    let paymentTotal =
        0;

    let creditBalance =
        0;

    let cashAdvance =
        0;

    let remainingSalary =
        null;


    if (
        currentWorkerLedger
    ) {

        transactions =
            allTransactions.filter(
                (
                    transaction
                ) => {

                    const workerLedgerId =
                        transaction
                            .workerLedger
                            ?._id ||
                        transaction
                            .workerLedger ||
                        null;


                    return (
                        String(
                            workerLedgerId
                        ) ===
                        String(
                            currentWorkerLedger
                                ._id
                        )
                    );

                }
            );


        creditTotal =
            Number(
                currentWorkerLedger
                    .totalCredits
            ) || 0;


        paymentTotal =
            Number(
                currentWorkerLedger
                    .totalPayments
            ) || 0;


        creditBalance =
            Math.max(
                creditTotal -
                paymentTotal,
                0
            );


        cashAdvance =
            Number(
                currentWorkerLedger
                    .totalCashAdvances
            ) || 0;


        remainingSalary =
            Number(
                currentWorkerLedger
                    .remainingSalary
            ) || 0;

    }


    return {

        ...account,

        creditTotal,

        paymentTotal,

        creditBalance,

        cashAdvance,

        remainingSalary,

        currentWorkerLedger:
            normalizeWorkerLedger(
                currentWorkerLedger
            ),

        latestWorkerLedger:
            normalizeWorkerLedger(
                latestWorkerLedger
            ),

        canCreateNewLedger:
            !currentWorkerLedger &&
            (
                !latestWorkerLedger ||
                latestWorkerLedger
                    .status ===
                    "PAID"
            ),

        transactions,

    };

};


/*
============================================================
GET WORKER LEDGER HISTORY
============================================================

Function name remains getWorkerMonths for compatibility.

It now returns pay-period history.
============================================================
*/

const getWorkerMonths = async (
    accountId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const worker =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!worker) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    if (
        worker.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Only workers have salary ledgers."
        );

    }


    const ledgers =
        await WorkerLedger
            .find({

                worker:
                    worker._id,

            })
            .sort({

                periodNumber:
                    -1,

                createdAt:
                    -1,

            });


    return ledgers.map(
        normalizeWorkerLedger
    );

};


/*
============================================================
GET SPECIFIC WORKER LEDGER PERIOD
============================================================
*/

const getWorkerMonth = async (
    accountId,
    year,
    month,
    ledgerId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const worker =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!worker) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    if (
        worker.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Only workers have salary ledgers."
        );

    }


    const ledger =
        await getSpecificWorkerLedger(
            worker,
            ledgerId
        );


    const transactions =
        await LedgerTransaction
            .find({

                workerLedger:
                    ledger._id,

            })
            .populate(
                "createdBy",
                "name username role"
            )
            .populate(
                "items.product",
                "name barcode category"
            )
            .sort({
                createdAt:
                    -1,
            })
            .lean();


    return {

        ledger:
            normalizeWorkerLedger(
                ledger
            ),

        transactions,

    };

};


/*
============================================================
CREATE ACCOUNT
============================================================
*/

const createAccount = async (
    data
) => {

    const {
        name,
        phone,
        type,
        salary,
        salaryPeriod,
        payFrequency,
        payDay,
        payDayOfWeek,
    } = data;


    if (
        !name?.trim()
    ) {

        throw new ApiError(
            400,
            "Name is required."
        );

    }


    if (
        ![
            "WORKER",
            "CUSTOMER",
        ].includes(type)
    ) {

        throw new ApiError(
            400,
            "Account type must be WORKER or CUSTOMER."
        );

    }


    /*
    ========================================================
    WORKER VALIDATION
    ========================================================
    */

    if (
        type ===
        "WORKER"
    ) {

        const parsedSalary =
            Number(
                salary
            );


        if (
            salary ===
                undefined ||
            salary ===
                null ||
            !Number.isFinite(
                parsedSalary
            ) ||
            parsedSalary < 0
        ) {

            throw new ApiError(
                400,
                "A valid worker salary is required."
            );

        }


        if (
            ![
                "WEEKLY",
                "MONTHLY",
            ].includes(
                payFrequency
            )
        ) {

            throw new ApiError(
                400,
                "Pay frequency must be WEEKLY or MONTHLY."
            );

        }


        if (
            payFrequency ===
            "WEEKLY"
        ) {

            const weeklyPayDay =
                Number(
                    payDayOfWeek
                );


            if (
                !Number.isInteger(
                    weeklyPayDay
                ) ||
                weeklyPayDay < 0 ||
                weeklyPayDay > 6
            ) {

                throw new ApiError(
                    400,
                    "A valid weekly payday is required."
                );

            }

        }


        if (
            payFrequency ===
            "MONTHLY"
        ) {

            const monthlyPayDay =
                Number(
                    payDay
                );


            if (
                !Number.isInteger(
                    monthlyPayDay
                ) ||
                monthlyPayDay < 1 ||
                monthlyPayDay > 31
            ) {

                throw new ApiError(
                    400,
                    "A valid monthly payday is required."
                );

            }

        }

    }


    const account =
        await LedgerAccount.create({

            name:
                name.trim(),

            phone:
                phone?.trim() ||
                "",

            type,

            salary:
                type ===
                "WORKER"
                    ? Number(
                        salary
                    )
                    : null,

            payFrequency:
                type ===
                "WORKER"
                    ? payFrequency
                    : null,

            payDay:
                type ===
                    "WORKER" &&
                payFrequency ===
                    "MONTHLY"
                    ? Number(
                        payDay
                    )
                    : null,

            payDayOfWeek:
                type ===
                    "WORKER" &&
                payFrequency ===
                    "WEEKLY"
                    ? Number(
                        payDayOfWeek
                    )
                    : null,

            salaryPeriod:
                type ===
                "WORKER"
                    ? salaryPeriod
                        ?.trim() ||
                        ""
                    : "",

            isActive:
                true,

        });


    /*
    IMPORTANT:

    Worker creation does NOT automatically create a ledger.
    */


    return account;

};


/*
============================================================
UPDATE ACCOUNT
============================================================
*/

const updateAccount = async (
    accountId,
    data
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const account =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    /*
    --------------------------------------------------------
    NAME
    --------------------------------------------------------
    */

    if (
        data.name !==
        undefined
    ) {

        const name =
            String(
                data.name
            ).trim();


        if (!name) {

            throw new ApiError(
                400,
                "Name cannot be empty."
            );

        }


        account.name =
            name;

    }


    /*
    --------------------------------------------------------
    PHONE
    --------------------------------------------------------
    */

    if (
        data.phone !==
        undefined
    ) {

        account.phone =
            String(
                data.phone ||
                ""
            ).trim();

    }


    /*
    --------------------------------------------------------
    SALARY
    --------------------------------------------------------
    */

    if (
        data.salary !==
        undefined
    ) {

        if (
            account.type !==
            "WORKER"
        ) {

            throw new ApiError(
                400,
                "Only workers can have salary settings."
            );

        }


        const salary =
            Number(
                data.salary
            );


        if (
            !Number.isFinite(
                salary
            ) ||
            salary < 0
        ) {

            throw new ApiError(
                400,
                "Salary cannot be negative."
            );

        }


        account.salary =
            salary;

    }


    /*
    --------------------------------------------------------
    PAY FREQUENCY
    --------------------------------------------------------
    */

    if (
        data.payFrequency !==
        undefined
    ) {

        if (
            account.type !==
            "WORKER"
        ) {

            throw new ApiError(
                400,
                "Only workers have pay frequencies."
            );

        }


        if (
            ![
                "WEEKLY",
                "MONTHLY",
            ].includes(
                data.payFrequency
            )
        ) {

            throw new ApiError(
                400,
                "Pay frequency must be WEEKLY or MONTHLY."
            );

        }


        account.payFrequency =
            data.payFrequency;

    }


    /*
    --------------------------------------------------------
    MONTHLY PAYDAY
    --------------------------------------------------------
    */

    if (
        data.payDay !==
        undefined
    ) {

        account.payDay =
            data.payDay ===
                null ||
            data.payDay ===
                ""
                ? null
                : Number(
                    data.payDay
                );

    }


    /*
    --------------------------------------------------------
    WEEKLY PAYDAY
    --------------------------------------------------------
    */

    if (
        data.payDayOfWeek !==
        undefined
    ) {

        account.payDayOfWeek =
            data.payDayOfWeek ===
                null ||
            data.payDayOfWeek ===
                ""
                ? null
                : Number(
                    data.payDayOfWeek
                );

    }


    /*
    --------------------------------------------------------
    SALARY PERIOD LABEL
    --------------------------------------------------------
    */

    if (
        data.salaryPeriod !==
        undefined
    ) {

        account.salaryPeriod =
            String(
                data.salaryPeriod ||
                ""
            ).trim();

    }


    /*
    --------------------------------------------------------
    ACTIVE
    --------------------------------------------------------
    */

    if (
        data.isActive !==
        undefined
    ) {

        account.isActive =
            Boolean(
                data.isActive
            );

    }


    /*
    Mongoose model validation checks the final worker
    payFrequency/payDay/payDayOfWeek combination.
    */

    await account.save();


    return getAccountById(
        account._id
    );

};


/*
============================================================
REQUIRE OPEN WORKER LEDGER
============================================================
*/

const requireOpenWorkerLedger = async (
    worker
) => {

    const workerLedger =
        await getOpenWorkerLedger(
            worker._id
        );


    if (!workerLedger) {

        throw new ApiError(
            400,
            "This worker does not have an open ledger. Create a new ledger first."
        );

    }


    return workerLedger;

};


/*
============================================================
ADD CREDIT
============================================================
*/

const addCredit = async (
    data,
    userId
) => {

    const {
        accountId,
        items,
        remarks,
    } = data;


    validateObjectId(
        accountId,
        "account ID"
    );


    validateObjectId(
        userId,
        "user ID"
    );


    if (
        !Array.isArray(
            items
        ) ||
        items.length === 0
    ) {

        throw new ApiError(
            400,
            "At least one product is required."
        );

    }


    const account =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    if (
        !account.isActive
    ) {

        throw new ApiError(
            400,
            "This ledger account is inactive."
        );

    }


    let workerLedger =
        null;


    if (
        account.type ===
        "WORKER"
    ) {

        workerLedger =
            await requireOpenWorkerLedger(
                account
            );

    }


    /*
    ========================================================
    PREPARE PRODUCTS
    ========================================================
    */

    const preparedItems =
        [];


    let grandTotal =
        0;


    for (
        const item
        of items
    ) {

        validateObjectId(
            item.productId,
            "product ID"
        );


        const quantity =
            Number(
                item.quantity
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <= 0
        ) {

            throw new ApiError(
                400,
                "Product quantity must be a positive whole number."
            );

        }


        const product =
            await Product
                .findById(
                    item.productId
                );


        if (!product) {

            throw new ApiError(
                404,
                "Product not found."
            );

        }


        if (
            !product.isActive
        ) {

            throw new ApiError(
                400,
                `${product.name} is inactive.`
            );

        }


        if (
            Number(
                product.stock
            ) <
            quantity
        ) {

            throw new ApiError(
                400,
                `Insufficient stock for ${product.name}. Available: ${product.stock}.`
            );

        }


        /*
        --------------------------------------------------------
        DETERMINE SELLING PRICE
        --------------------------------------------------------
        */

        let unitPrice =
            0;


        if (
            Array.isArray(
                product.pricing
            ) &&
            product.pricing.length >
            0
        ) {

            const sortedPricing =
                [
                    ...product.pricing,
                ].sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            a.quantity
                        ) -
                        Number(
                            b.quantity
                        )
                );


            const applicable =
                sortedPricing
                    .filter(
                        (
                            pricing
                        ) =>
                            Number(
                                pricing.quantity
                            ) <=
                            quantity
                    )
                    .at(-1);


            unitPrice =
                Number(
                    applicable
                        ?.price ??
                    sortedPricing[0]
                        ?.price ??
                    0
                );

        }


        /*
        Fallback to costPrice if your product has no
        pricing configuration.
        */

        if (
            !unitPrice ||
            unitPrice <= 0
        ) {

            unitPrice =
                Number(
                    product.costPrice
                ) || 0;

        }


        if (
            unitPrice <= 0
        ) {

            throw new ApiError(
                400,
                `${product.name} does not have a valid selling price.`
            );

        }


        const total =
            unitPrice *
            quantity;


        preparedItems.push({

            product,

            quantity,

            unitPrice,

            total,

        });


        grandTotal +=
            total;

    }


    /*
    ========================================================
    UPDATE INVENTORY
    ========================================================
    */

    const transactionItems =
        [];


    for (
        const prepared
        of preparedItems
    ) {

        const {
            product,
            quantity,
            unitPrice,
            total,
        } = prepared;


        const previousStock =
            Number(
                product.stock
            ) || 0;


        const newStock =
            previousStock -
            quantity;


        product.stock =
            newStock;


        await product.save();


        await InventoryTransaction.create({

            product:
                product._id,

            type:
                "SALE",

            quantity,

            previousStock,

            newStock,

            remarks:
                `Ledger credit for ${account.name}`,

            createdBy:
                userId,

        });


        transactionItems.push({

            product:
                product._id,

            barcode:
                product.barcode ||
                "",

            name:
                product.name,

            quantity,

            unitPrice,

            total,

        });

    }


    /*
    ========================================================
    CREATE LEDGER TRANSACTION
    ========================================================
    */

    const transaction =
        await LedgerTransaction.create({

            account:
                account._id,

            workerLedger:
                workerLedger
                    ? workerLedger._id
                    : null,

            type:
                "CREDIT",

            description:
                "Grocery Purchase",

            amount:
                grandTotal,

            items:
                transactionItems,

            status:
                "UNPAID",

            remarks:
                remarks?.trim() ||
                "",

            createdBy:
                userId,

        });


    /*
    ========================================================
    UPDATE WORKER LEDGER
    ========================================================
    */

    if (
        workerLedger
    ) {

        workerLedger.totalCredits =
            Number(
                workerLedger
                    .totalCredits
            ) +
            grandTotal;


        await recalculateWorkerLedger(
            workerLedger
        );

    }


    return {

        transaction,

        account:
            await getAccountById(
                account._id
            ),

    };

};


/*
============================================================
ADD CREDIT PAYMENT
============================================================

This is NOT salary payment.
============================================================
*/

const addPayment = async (
    data,
    userId
) => {

    const {
        accountId,
        amount,
        remarks,
    } = data;


    validateObjectId(
        accountId,
        "account ID"
    );


    validateObjectId(
        userId,
        "user ID"
    );


    const paymentAmount =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            paymentAmount
        ) ||
        paymentAmount <= 0
    ) {

        throw new ApiError(
            400,
            "Payment amount must be greater than zero."
        );

    }


    const account =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    if (
        !account.isActive
    ) {

        throw new ApiError(
            400,
            "This ledger account is inactive."
        );

    }


    let workerLedger =
        null;


    let outstanding =
        0;


    /*
    ========================================================
    WORKER
    ========================================================
    */

    if (
        account.type ===
        "WORKER"
    ) {

        workerLedger =
            await requireOpenWorkerLedger(
                account
            );


        outstanding =
            Math.max(
                Number(
                    workerLedger
                        .totalCredits
                ) -
                Number(
                    workerLedger
                        .totalPayments
                ),
                0
            );

    }

    /*
    ========================================================
    CUSTOMER
    ========================================================
    */

    else {

        const balance =
            await calculateBalance(
                account._id
            );


        outstanding =
            balance.creditBalance;

    }


    if (
        paymentAmount >
        outstanding
    ) {

        throw new ApiError(
            400,
            `Payment cannot exceed the outstanding balance of ${outstanding}.`
        );

    }


    const remainingBalance =
        Math.max(
            outstanding -
            paymentAmount,
            0
        );


    const transaction =
        await LedgerTransaction.create({

            account:
                account._id,

            workerLedger:
                workerLedger
                    ? workerLedger._id
                    : null,

            type:
                "PAYMENT",

            description:
                "Payment",

            amount:
                paymentAmount,

            items:
                [],

            status:
                "PAID",

            remarks:
                remarks?.trim() ||
                "",

            createdBy:
                userId,

        });


    if (
        workerLedger
    ) {

        workerLedger.totalPayments =
            Number(
                workerLedger
                    .totalPayments
            ) +
            paymentAmount;


        await workerLedger.save();

    }


    return {

        transaction,

        previousBalance:
            outstanding,

        remainingBalance,

        status:
            remainingBalance <= 0
                ? "PAID"
                : "PARTIAL",

        account:
            await getAccountById(
                account._id
            ),

    };

};


/*
============================================================
ADD CASH ADVANCE
============================================================
*/

const addCashAdvance = async (
    data,
    userId
) => {

    const {
        accountId,
        amount,
        remarks,
    } = data;


    validateObjectId(
        accountId,
        "account ID"
    );


    validateObjectId(
        userId,
        "user ID"
    );


    const advanceAmount =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            advanceAmount
        ) ||
        advanceAmount <= 0
    ) {

        throw new ApiError(
            400,
            "Cash advance amount must be greater than zero."
        );

    }


    const account =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    if (
        !account.isActive
    ) {

        throw new ApiError(
            400,
            "This ledger account is inactive."
        );

    }


    if (
        account.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Cash advances are only available for workers."
        );

    }


    const workerLedger =
        await requireOpenWorkerLedger(
            account
        );


    /*
    Recalculate first so our available salary is current.
    */

    await recalculateWorkerLedger(
        workerLedger
    );


    const remainingSalary =
        Number(
            workerLedger
                .remainingSalary
        ) || 0;


    if (
        advanceAmount >
        remainingSalary
    ) {

        throw new ApiError(
            400,
            `Cash advance cannot exceed the remaining salary of ${remainingSalary}.`
        );

    }


    const transaction =
        await LedgerTransaction.create({

            account:
                account._id,

            workerLedger:
                workerLedger._id,

            type:
                "CASH_ADVANCE",

            description:
                "Cash Advance",

            amount:
                advanceAmount,

            items:
                [],

            status:
                "UNPAID",

            remarks:
                remarks?.trim() ||
                "",

            createdBy:
                userId,

        });


    workerLedger.totalCashAdvances =
        Number(
            workerLedger
                .totalCashAdvances
        ) +
        advanceAmount;


    await recalculateWorkerLedger(
        workerLedger
    );


    return {

        transaction,

        remainingSalary:
            workerLedger
                .remainingSalary,

        account:
            await getAccountById(
                account._id
            ),

    };

};


/*
============================================================
GET ACCOUNT TRANSACTIONS
============================================================
*/

const getTransactions = async (
    accountId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const account =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    return LedgerTransaction
        .find({

            account:
                accountId,

        })
        .populate(
            "createdBy",
            "name username role"
        )
        .populate(
            "items.product",
            "name barcode category"
        )
        .populate(
            "workerLedger",
            `
            periodNumber
            payFrequency
            periodStart
            periodEnd
            scheduledPayDate
            salary
            status
            paidAt
            salaryReleased
            `
        )
        .sort({
            createdAt:
                -1,
        });

};


/*
============================================================
DEACTIVATE ACCOUNT
============================================================
*/

const deactivateAccount = async (
    accountId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const account =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    account.isActive =
        false;


    await account.save();


    return account;

};


/*
============================================================
CREATE NEW WORKER LEDGER
============================================================

RULE:

Worker can only have ONE OPEN ledger.

Allowed:

No previous ledger
    -> create first ledger

Latest ledger PAID
    -> create next ledger

Blocked:

OPEN ledger exists

CLOSED ledger exists as latest period
============================================================
*/

const createAnotherWorkerLedger = async (
    accountId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const worker =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!worker) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    if (
        worker.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Only workers can have salary ledgers."
        );

    }


    if (
        !worker.isActive
    ) {

        throw new ApiError(
            400,
            "This worker is inactive."
        );

    }


    validateWorkerPaySettings(
        worker
    );


    /*
    ========================================================
    OPEN LEDGER CHECK
    ========================================================
    */

    const existingOpenLedger =
        await getOpenWorkerLedger(
            worker._id
        );


    if (
        existingOpenLedger
    ) {

        throw new ApiError(
            400,
            "This worker already has an open ledger. Pay the worker before creating a new ledger."
        );

    }


    /*
    ========================================================
    LATEST LEDGER
    ========================================================
    */

    const latestLedger =
        await getLatestWorkerLedger(
            worker._id
        );


    if (
        latestLedger &&
        latestLedger.status !==
            "PAID"
    ) {

        throw new ApiError(
            400,
            "The previous worker ledger must be paid before creating a new ledger."
        );

    }


    /*
    ========================================================
    NEXT PERIOD NUMBER
    ========================================================
    */

    const nextPeriodNumber =
        latestLedger
            ? Number(
                latestLedger
                    .periodNumber
            ) + 1
            : 1;


    /*
    ========================================================
    BUILD PERIOD
    ========================================================
    */

    const period =
        latestLedger
            ? buildNextWorkerPeriod(
                worker,
                latestLedger
            )
            : buildInitialWorkerPeriod(
                worker,
                new Date()
            );


    /*
    ========================================================
    SALARY SNAPSHOT
    ========================================================
    */

    const salary =
        Number(
            worker.salary
        ) || 0;


    /*
    ========================================================
    CREATE
    ========================================================
    */

    const newLedger =
        await WorkerLedger.create({

            worker:
                worker._id,

            payFrequency:
                worker.payFrequency,

            periodStart:
                period.periodStart,

            periodEnd:
                period.periodEnd,

            scheduledPayDate:
                period
                    .scheduledPayDate,

            periodNumber:
                nextPeriodNumber,

            /*
            Compatibility fields
            */

            year:
                period.year,

            month:
                period.month,

            salary,

            totalCredits:
                0,

            totalCashAdvances:
                0,

            totalPayments:
                0,

            remainingSalary:
                salary,

            status:
                "OPEN",

            closedAt:
                null,

            paidAt:
                null,

            salaryReleased:
                null,

            remarks:
                "",

        });


    return normalizeWorkerLedger(
        newLedger
    );

};


/*
============================================================
PAY WORKER
============================================================

OFFICIAL WORKER SALARY PAYMENT FUNCTION.

Called from WorkersPage.

Signature:

payWorker(
    accountId,
    {
        ledgerId,
        paymentDate
    }
)

ledgerId is optional.

If no ledgerId is provided, the current OPEN ledger is used.

Salary released:

salary
- totalCredits
- totalCashAdvances

Credit payments DO NOT restore the salary amount.

After payment:

status = PAID
salaryReleased = remainingSalary
paidAt = selected payment date
closedAt = selected payment date

The next ledger is NOT automatically created.
============================================================
*/
const payWorker = async (
    accountId,
    {
        ledgerId = null,
        paymentDate = null,
    } = {}
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    /*
    ========================================================
    GET WORKER
    ========================================================
    */

    const worker =
        await LedgerAccount.findById(
            accountId
        );


    if (!worker) {

        throw new ApiError(
            404,
            "Worker account not found."
        );

    }


    if (
        worker.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Only worker accounts can be paid."
        );

    }


    if (!worker.isActive) {

        throw new ApiError(
            400,
            "This worker is inactive."
        );

    }


    /*
    ========================================================
    GET OPEN WORKER LEDGER
    ========================================================
    */

    let workerLedger =
        null;


    if (ledgerId) {

        validateObjectId(
            ledgerId,
            "worker ledger ID"
        );


        workerLedger =
            await WorkerLedger.findOne({
                _id: ledgerId,
                worker: worker._id,
                status: "OPEN",
            });

    } else {

        workerLedger =
            await getOpenWorkerLedger(
                worker._id
            );

    }


    if (!workerLedger) {

        throw new ApiError(
            400,
            "This worker does not have an OPEN ledger to pay."
        );

    }


    /*
    ========================================================
    RECALCULATE SALARY
    ========================================================
    */

    await recalculateWorkerLedger(
        workerLedger
    );


    const salary =
        Number(
            workerLedger.salary
        ) || 0;


    const totalCredits =
        Number(
            workerLedger.totalCredits
        ) || 0;


    const totalCashAdvances =
        Number(
            workerLedger.totalCashAdvances
        ) || 0;


    const totalPayments =
        Number(
            workerLedger.totalPayments
        ) || 0;


    /*
    IMPORTANT:

    Credit payments do NOT restore salary.

    Salary released:

    salary
    - totalCredits
    - totalCashAdvances
    ========================================================
    */

    const salaryReleased =
        Math.max(
            salary -
            totalCredits -
            totalCashAdvances,
            0
        );


    /*
    ========================================================
    PAYMENT DATE
    ========================================================
    */

    const actualPaymentDate =
        paymentDate
            ? new Date(
                paymentDate
            )
            : new Date();


    if (
        Number.isNaN(
            actualPaymentDate.getTime()
        )
    ) {

        throw new ApiError(
            400,
            "Invalid payment date."
        );

    }


    /*
    ========================================================
    MARK LEDGER AS PAID
    ========================================================
    */

    workerLedger.remainingSalary =
        salaryReleased;

    workerLedger.salaryReleased =
        salaryReleased;

    workerLedger.status =
        "PAID";

    workerLedger.paidAt =
        actualPaymentDate;

    workerLedger.closedAt =
        actualPaymentDate;


    await workerLedger.save();


    /*
    ========================================================
    GET ONLY THIS LEDGER'S TRANSACTIONS
    ========================================================

    IMPORTANT:

    This prevents old ledger items from appearing
    on the salary receipt.
    ========================================================
    */

    const transactions =
        await LedgerTransaction
            .find({
                account:
                    worker._id,

                workerLedger:
                    workerLedger._id,
            })
            .populate(
                "items.product",
                "name barcode category"
            )
            .sort({
                createdAt: 1,
            })
            .lean();


    /*
    ========================================================
    PRINT WORKER SALARY RECEIPT
    ========================================================

    Uses your XPrinter through printer.service.js.
    ========================================================
    */

    let printResult =
        null;


    try {

        printResult =
            await printerService
                .printWorkerSalaryReceipt({
                    worker,
                    workerLedger,
                    transactions,
                });


    } catch (printError) {

        console.error(
            "Worker salary payment succeeded but receipt printing failed:",
            printError
        );


        /*
        IMPORTANT:

        Do NOT undo the salary payment just because printing
        failed.

        The worker has already been marked PAID.

        The frontend should be told the payment succeeded,
        but printing failed.
        */

        return {

            success: true,

            paymentSuccess: true,

            printSuccess: false,

            message:
                "Worker was paid successfully, but the receipt failed to print.",

            printError:
                printError.message ||
                "Unknown printer error.",

            worker: {
                id:
                    worker._id,

                _id:
                    worker._id,

                name:
                    worker.name,

                salary:
                    worker.salary,

                payFrequency:
                    worker.payFrequency,

                payDay:
                    worker.payDay,

                payDayOfWeek:
                    worker.payDayOfWeek,
            },

            ledger:
                normalizeWorkerLedger(
                    workerLedger
                ),

            transactions,

            salary,

            totalCredits,

            totalCashAdvances,

            totalPayments,

            salaryReleased,

            paidAt:
                actualPaymentDate,

            canCreateNewLedger:
                true,

        };

    }


    /*
    ========================================================
    SUCCESS
    ========================================================
    */

    return {

        success: true,

        paymentSuccess: true,

        printSuccess: true,

        message:
            `${worker.name} has been paid and the receipt was printed successfully.`,

        worker: {
            id:
                worker._id,

            _id:
                worker._id,

            name:
                worker.name,

            salary:
                worker.salary,

            payFrequency:
                worker.payFrequency,

            payDay:
                worker.payDay,

            payDayOfWeek:
                worker.payDayOfWeek,
        },

        ledger:
            normalizeWorkerLedger(
                workerLedger
            ),

        transactions,

        salary,

        totalCredits,

        totalCashAdvances,

        totalPayments,

        salaryReleased,

        paidAt:
            actualPaymentDate,

        canCreateNewLedger:
            true,

        printResult,

    };

};

/*
============================================================
REPRINT WORKER SALARY RECEIPT
============================================================

Does NOT change worker salary.
Does NOT change ledger status.
Does NOT create another ledger.

Only prints an existing PAID ledger.
============================================================
*/


/*
============================================================
BACKWARD COMPATIBILITY:
MARK WORKER MONTH PAID
============================================================

Temporary compatibility only.

Do NOT use this from the new LedgerPage.

WorkersPage should use payWorker().
============================================================
*/

const markWorkerMonthPaid = async (
    accountId,
    year,
    month,
    ledgerId = null
) => {

    return payWorker(
        accountId,
        {
            ledgerId,

            paymentDate:
                new Date(),
        }
    );

};


/*
============================================================
CLOSE WORKER LEDGER
============================================================
*/

const closeWorkerMonth = async (
    accountId,
    year,
    month,
    ledgerId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const worker =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!worker) {

        throw new ApiError(
            404,
            "Worker account not found."
        );

    }


    const workerLedger =
        await getSpecificWorkerLedger(
            worker,
            ledgerId
        );


    if (
        workerLedger.status !==
        "OPEN"
    ) {

        throw new ApiError(
            400,
            "Only an OPEN worker ledger can be closed."
        );

    }


    workerLedger.status =
        "CLOSED";


    workerLedger.closedAt =
        new Date();


    await workerLedger.save();


    return normalizeWorkerLedger(
        workerLedger
    );

};


/*
============================================================
PRINT SELECTED WORKER LEDGER
============================================================

Prints ONLY the selected worker pay period.
============================================================
*/

const printLedger = async (
    accountId,
    year,
    month,
    ledgerId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    validateObjectId(
        ledgerId,
        "worker ledger ID"
    );


    const account =
        await LedgerAccount
            .findById(
                accountId
            );


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found."
        );

    }


    if (
        account.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Only worker salary ledgers can be printed with this endpoint."
        );

    }


    const workerLedger =
        await getSpecificWorkerLedger(
            account,
            ledgerId
        );


    /*
    ========================================================
    ONLY THIS LEDGER'S TRANSACTIONS
    ========================================================
    */

    const transactions =
        await LedgerTransaction
            .find({

                account:
                    account._id,

                workerLedger:
                    workerLedger._id,

            })
            .populate(
                "createdBy",
                "name username role"
            )
            .populate(
                "items.product",
                "name barcode category"
            )
            .sort({
                createdAt:
                    1,
            })
            .lean();


    /*
    ========================================================
    TOTALS
    ========================================================
    */

    const salary =
        Number(
            workerLedger.salary
        ) || 0;


    const totalCredits =
        Number(
            workerLedger
                .totalCredits
        ) || 0;


    const totalCashAdvances =
        Number(
            workerLedger
                .totalCashAdvances
        ) || 0;


    const totalPayments =
        Number(
            workerLedger
                .totalPayments
        ) || 0;


    const outstanding =
        Math.max(
            totalCredits -
            totalPayments,
            0
        );


    const remainingSalary =
        Math.max(
            salary -
            totalCredits -
            totalCashAdvances,
            0
        );


    const periodLabel =
        formatWorkerLedgerLabel(
            workerLedger
        );


    /*
    ========================================================
    PRINT DATA
    ========================================================
    */

    const printAccount = {

        ...account.toObject(),

        salary,

        salaryPeriod:
            periodLabel,

        payFrequency:
            workerLedger
                .payFrequency,

        creditTotal:
            totalCredits,

        creditBalance:
            outstanding,

        paymentTotal:
            totalPayments,

        cashAdvance:
            totalCashAdvances,

        remainingSalary,

        transactions,

        workerLedger: {

            ...normalizeWorkerLedger(
                workerLedger
            ),

            salary,

            totalCredits,

            totalCashAdvances,

            totalPayments,

            outstanding,

            remainingSalary,

            salaryReleased:
                workerLedger
                    .salaryReleased,

        },

    };


    /*
    ========================================================
    PRINT
    ========================================================
    */

    const printResult =
        await printerService
            .printLedger(
                printAccount
            );


    return {

        success:
            true,

        message:
            "Selected worker ledger printed successfully.",

        account:
            printAccount,

        workerLedger:
            normalizeWorkerLedger(
                workerLedger
            ),

        transactionCount:
            transactions.length,

        printResult,

    };

};

/*
============================================================
REPRINT WORKER SALARY RECEIPT
============================================================

Does NOT change worker salary.
Does NOT change ledger status.
Does NOT create another ledger.

Only prints an existing PAID ledger.
============================================================
*/

const reprintWorkerSalaryReceipt = async (
    accountId,
    ledgerId
) => {

    validateObjectId(
        accountId,
        "account ID"
    );

    validateObjectId(
        ledgerId,
        "worker ledger ID"
    );


    const worker =
        await LedgerAccount.findById(
            accountId
        );


    if (!worker) {

        throw new ApiError(
            404,
            "Worker account not found."
        );

    }


    if (
        worker.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Only worker salary receipts can be reprinted."
        );

    }


    const workerLedger =
        await WorkerLedger.findOne({
            _id: ledgerId,
            worker: worker._id,
        });


    if (!workerLedger) {

        throw new ApiError(
            404,
            "Worker ledger not found."
        );

    }


    if (
        workerLedger.status !==
        "PAID"
    ) {

        throw new ApiError(
            400,
            "Only PAID worker ledgers can be reprinted."
        );

    }


    const transactions =
        await LedgerTransaction
            .find({
                account:
                    worker._id,

                workerLedger:
                    workerLedger._id,
            })
            .populate(
                "items.product",
                "name barcode category"
            )
            .sort({
                createdAt: 1,
            })
            .lean();


    const printResult =
        await printerService
            .printWorkerSalaryReceipt({
                worker,
                workerLedger,
                transactions,
            });


    return {

        success: true,

        message:
            "Worker salary receipt reprinted successfully.",

        worker: {
            _id:
                worker._id,

            name:
                worker.name,
        },

        ledger:
            normalizeWorkerLedger(
                workerLedger
            ),

        transactionCount:
            transactions.length,

        printResult,

    };

};


/*
============================================================
EXPORT
============================================================
*/

export default {
    reprintWorkerSalaryReceipt,
    /*
    --------------------------------------------------------
    ACCOUNTS
    --------------------------------------------------------
    */

    getAccounts,

    getAccountById,

    createAccount,

    updateAccount,

    deactivateAccount,


    /*
    --------------------------------------------------------
    TRANSACTIONS
    --------------------------------------------------------
    */

    addCredit,

    addPayment,

    addCashAdvance,

    getTransactions,


    /*
    --------------------------------------------------------
    WORKER LEDGER PERIODS
    --------------------------------------------------------
    */

    getWorkerMonths,

    getWorkerMonth,

    createAnotherWorkerLedger,

    closeWorkerMonth,


    /*
    --------------------------------------------------------
    WORKER SALARY PAYMENT
    --------------------------------------------------------
    */

    payWorker,


    /*
    --------------------------------------------------------
    LEGACY COMPATIBILITY
    --------------------------------------------------------
    */

    markWorkerMonthPaid,


    /*
    --------------------------------------------------------
    PRINTING
    --------------------------------------------------------
    */

    printLedger,

};