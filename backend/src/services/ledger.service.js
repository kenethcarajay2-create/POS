import mongoose from "mongoose";

import LedgerAccount from "../models/ledgerAccount.model.js";
import LedgerTransaction from "../models/ledgerTransaction.model.js";
import WorkerLedger from "../models/workerLedger.model.js";
import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";

import ApiError from "../utils/ApiError.js";
import withTransaction from "../utils/withTransaction.js";

import printerService from "./printer.service.js";
import branchInventoryService from "./branch-inventory.service.js";
import syncOutboxService from "./syncOutbox.service.js";


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


const normalizeBranchId = (
    value
) => {

    const branchId =
        value?._id ||
        value;


    if (
        !branchId ||
        !mongoose.Types.ObjectId.isValid(
            branchId
        )
    ) {

        return null;

    }


    return String(
        branchId
    );

};


const requireBranchId = (
    value
) => {

    const branchId =
        normalizeBranchId(
            value
        );


    if (!branchId) {

        throw new ApiError(
            400,
            "A valid branch context is required."
        );

    }


    return branchId;

};


const buildBranchContext = (
    activeBranch
) => {

    if (!activeBranch) {

        throw new ApiError(
            400,
            "A valid branch context is required."
        );

    }


    const branchId =
        requireBranchId(
            activeBranch
        );


    if (
        activeBranch.isActive ===
        false
    ) {

        throw new ApiError(
            400,
            "The selected branch is inactive."
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
        ).trim();


    if (
        !code ||
        !name
    ) {

        throw new ApiError(
            400,
            "The selected branch has incomplete branch information."
        );

    }


    return {

        branchId,

        branchSnapshot: {

            code,

            name,

        },

    };

};


const getSnapshotFromDocument = (
    document
) => {

    return {

        code:
            String(
                document
                    ?.branchSnapshot
                    ?.code ||
                ""
            )
                .trim()
                .toUpperCase(),

        name:
            String(
                document
                    ?.branchSnapshot
                    ?.name ||
                ""
            ).trim(),

    };

};


const normalizeCustomItemNote = (
    value
) => {

    return String(
        value ||
        ""
    )
        .trim()
        .slice(
            0,
            80
        );

};


/*
============================================================
SYNC OUTBOX HELPERS
============================================================
*/

const enqueueLedgerSync = async ({
    action,
    aggregateId,
    branchId,
    session,
}) => {

    await syncOutboxService
        .enqueueSyncRequest({

            source:
                "LEDGER",

            action,

            aggregateId,

            branchId,

            session,

        });

};


const enqueueWorkerLedgerSync = async ({
    action,
    aggregateId,
    branchId,
    session,
}) => {

    await syncOutboxService
        .enqueueSyncRequest({

            source:
                "WORKER_LEDGER",

            action,

            aggregateId,

            branchId,

            session,

        });

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
        new Date(
            value
        );


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
        new Date(
            value
        );


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
        new Date(
            value
        );


    date.setDate(
        date.getDate() +
        Number(
            days
        )
    );


    return date;

};


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
                Number(
                    payDay
                ) || 1,
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


const getNextOrSameWeekday = (
    value,
    targetDay
) => {

    const date =
        startOfDay(
            value
        );


    const currentDay =
        date.getDay();


    const difference =
        (
            Number(
                targetDay
            ) -
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
WORKER LEDGER DISPLAY
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
BRANCH-SCOPED ACCOUNT
============================================================
*/

const requireBranchAccount = async (
    accountId,
    branchId,
    session = null
) => {

    validateObjectId(
        accountId,
        "account ID"
    );


    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const query =
        LedgerAccount.findOne({

            _id:
                accountId,

            branch:
                resolvedBranchId,

        });


    if (session) {

        query.session(
            session
        );

    }


    const account =
        await query;


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found in the active branch."
        );

    }


    return account;

};


/*
============================================================
WORKER LEDGER LOOKUPS
============================================================
*/

const getOpenWorkerLedger = async (
    workerId,
    branchId,
    session = null
) => {

    const query =
        WorkerLedger
            .findOne({

                worker:
                    workerId,

                branch:
                    requireBranchId(
                        branchId
                    ),

                status:
                    "OPEN",

            })
            .sort({

                periodNumber:
                    -1,

                createdAt:
                    -1,

            });


    if (session) {

        query.session(
            session
        );

    }


    return query;

};


const getLatestWorkerLedger = async (
    workerId,
    branchId,
    session = null
) => {

    const query =
        WorkerLedger
            .findOne({

                worker:
                    workerId,

                branch:
                    requireBranchId(
                        branchId
                    ),

            })
            .sort({

                periodNumber:
                    -1,

                createdAt:
                    -1,

            });


    if (session) {

        query.session(
            session
        );

    }


    return query;

};


const getSpecificWorkerLedger = async (
    worker,
    ledgerId,
    branchId,
    session = null
) => {

    validateObjectId(
        ledgerId,
        "worker ledger ID"
    );


    const query =
        WorkerLedger.findOne({

            _id:
                ledgerId,

            worker:
                worker._id,

            branch:
                requireBranchId(
                    branchId
                ),

        });


    if (session) {

        query.session(
            session
        );

    }


    const ledger =
        await query;


    if (!ledger) {

        throw new ApiError(
            404,
            "Worker ledger period not found in the active branch."
        );

    }


    return ledger;

};


/*
============================================================
WORKER PAY VALIDATION
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
*/

const recalculateWorkerLedger = async (
    workerLedger,
    session = null
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


    await workerLedger.save(
        session
            ? {
                session,
            }
            : undefined
    );


    return workerLedger;

};


/*
============================================================
CALCULATE ACCOUNT BALANCE
============================================================
*/

const calculateBalance = async (
    accountId,
    branchId,
    session = null
) => {

    const query =
        LedgerTransaction.find({

            account:
                accountId,

            branch:
                requireBranchId(
                    branchId
                ),

        });


    if (session) {

        query.session(
            session
        );

    }


    const transactions =
        await query;


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
GET ACCOUNTS
============================================================
*/

const getAccounts = async (
    {
        type,
        search,
        isActive,
    } = {},
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const query = {

        branch:
            resolvedBranchId,

    };


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
            .find(
                query
            )
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
                account._id,
                resolvedBranchId
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
                    account._id,
                    resolvedBranchId
                );


            latestWorkerLedger =
                currentWorkerLedger ||
                await getLatestWorkerLedger(
                    account._id,
                    resolvedBranchId
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
    accountId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    validateObjectId(
        accountId,
        "account ID"
    );


    const account =
        await LedgerAccount
            .findOne({

                _id:
                    accountId,

                branch:
                    resolvedBranchId,

            })
            .lean();


    if (!account) {

        throw new ApiError(
            404,
            "Ledger account not found in the active branch."
        );

    }


    const balance =
        await calculateBalance(
            account._id,
            resolvedBranchId
        );


    const allTransactions =
        await LedgerTransaction
            .find({

                account:
                    account._id,

                branch:
                    resolvedBranchId,

            })
            .populate(
                "createdBy",
                "name username role"
            )
            .populate(
                "editedBy",
                "name username role"
            )
            .populate(
                "editHistory.editedBy",
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


    const currentWorkerLedger =
        await getOpenWorkerLedger(
            account._id,
            resolvedBranchId
        );


    const latestWorkerLedger =
        currentWorkerLedger ||
        await getLatestWorkerLedger(
            account._id,
            resolvedBranchId
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
WORKER LEDGER HISTORY
============================================================
*/

const getWorkerMonths = async (
    accountId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const worker =
        await requireBranchAccount(
            accountId,
            resolvedBranchId
        );


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

                branch:
                    resolvedBranchId,

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


const getWorkerMonth = async (
    accountId,
    year,
    month,
    ledgerId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const worker =
        await requireBranchAccount(
            accountId,
            resolvedBranchId
        );


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
            ledgerId,
            resolvedBranchId
        );


    const transactions =
        await LedgerTransaction
            .find({

                workerLedger:
                    ledger._id,

                branch:
                    resolvedBranchId,

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
    data,
    activeBranch
) => {

    const {
        branchId,
        branchSnapshot,
    } =
        buildBranchContext(
            activeBranch
        );


    const {
        name,
        phone,
        type,
        salary,
        salaryPeriod,
        payFrequency,
        payDay,
        payDayOfWeek,
    } =
        data;


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
        ].includes(
            type
        )
    ) {

        throw new ApiError(
            400,
            "Account type must be WORKER or CUSTOMER."
        );

    }


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


    return withTransaction(
        async (
            session
        ) => {

            const [
                account,
            ] =
                await LedgerAccount.create(
                    [
                        {
                            branch:
                                branchId,

                            branchSnapshot,

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
                        },
                    ],
                    {
                        session,
                    }
                );


            await enqueueLedgerSync({

                action:
                    "ACCOUNT_CREATE",

                aggregateId:
                    account._id,

                branchId,

                session,

            });


            return account;

        }
    );

};


/*
============================================================
UPDATE ACCOUNT
============================================================
*/

const updateAccount = async (
    accountId,
    data,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const updatedAccountId =
        await withTransaction(
            async (
                session
            ) => {

                const account =
                    await requireBranchAccount(
                        accountId,
                        resolvedBranchId,
                        session
                    );


                if (
                    data.branch !==
                        undefined ||
                    data.branchId !==
                        undefined ||
                    data.branchSnapshot !==
                        undefined
                ) {

                    throw new ApiError(
                        400,
                        "Ledger account branch cannot be changed through this endpoint."
                    );

                }


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


                if (
                    data.isActive !==
                    undefined
                ) {

                    account.isActive =
                        Boolean(
                            data.isActive
                        );

                }


                await account.save({
                    session,
                });


                await enqueueLedgerSync({

                    action:
                        "ACCOUNT_UPDATE",

                    aggregateId:
                        account._id,

                    branchId:
                        resolvedBranchId,

                    session,

                });


                return account._id;

            }
        );


    return getAccountById(
        updatedAccountId,
        resolvedBranchId
    );

};


/*
============================================================
REQUIRE OPEN WORKER LEDGER
============================================================
*/

const requireOpenWorkerLedger = async (
    worker,
    branchId,
    session = null
) => {

    const workerLedger =
        await getOpenWorkerLedger(
            worker._id,
            branchId,
            session
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
PRODUCT PRICE
============================================================
*/

const getLedgerProductPrice = (
    product,
    quantity
) => {

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
                applicable?.price ??
                sortedPricing[0]
                    ?.price ??
                0
            );

    }


    if (
        !unitPrice ||
        unitPrice <= 0
    ) {

        unitPrice =
            Number(
                product.costPrice
            ) || 0;

    }


    return unitPrice;

};


/*
============================================================
PREPARE CREDIT ITEMS
============================================================
*/

const prepareEditedCreditItems = async (
    items,
    session = null
) => {

    if (
        !Array.isArray(
            items
        ) ||
        items.length ===
            0
    ) {

        throw new ApiError(
            400,
            "At least one credit item is required."
        );

    }


    const preparedItems =
        [];


    let grandTotal =
        0;


    for (
        const item
        of items
    ) {

        const itemType =
            item.itemType ===
                "CUSTOM" ||
            item.type ===
                "CUSTOM"
                ? "CUSTOM"
                : "PRODUCT";


        if (
            itemType ===
            "CUSTOM"
        ) {

            const name =
                String(
                    item.name ||
                    "Grocery"
                )
                    .trim()
                    .slice(
                        0,
                        100
                    );


            const note =
                normalizeCustomItemNote(
                    item.note
                );


            const quantity =
                Number(
                    item.quantity ??
                    1
                );


            const unitPrice =
                Number(
                    item.unitPrice ??
                    item.price
                );


            if (!name) {

                throw new ApiError(
                    400,
                    "Custom item name is required."
                );

            }


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity <= 0
            ) {

                throw new ApiError(
                    400,
                    "Custom item quantity must be a positive whole number."
                );

            }


            if (
                !Number.isFinite(
                    unitPrice
                ) ||
                unitPrice <= 0
            ) {

                throw new ApiError(
                    400,
                    `Enter a valid amount for ${name}.`
                );

            }


            const total =
                quantity *
                unitPrice;


            preparedItems.push({

                itemType:
                    "CUSTOM",

                product:
                    null,

                barcode:
                    "",

                name,

                note,

                quantity,

                unitPrice,

                total,

            });


            grandTotal +=
                total;


            continue;

        }


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


        const query =
            Product.findById(
                item.productId
            );


        if (session) {

            query.session(
                session
            );

        }


        const product =
            await query;


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


        const unitPrice =
            getLedgerProductPrice(
                product,
                quantity
            );


        if (
            !Number.isFinite(
                unitPrice
            ) ||
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

            itemType:
                "PRODUCT",

            product,

            barcode:
                product.barcode ||
                "",

            name:
                product.name,

            note:
                "",

            quantity,

            unitPrice,

            total,

        });


        grandTotal +=
            total;

    }


    return {

        preparedItems,

        grandTotal,

    };

};


/*
============================================================
CREATE INVENTORY AUDIT
============================================================
*/

const createInventoryAudit = async ({
    branchId,
    branchSnapshot,
    productId,
    type,
    quantity,
    previousStock,
    newStock,
    remarks,
    userId,
    session,
}) => {

    await InventoryTransaction.create(
        [
            {
                branch:
                    branchId,

                branchSnapshot,

                product:
                    productId,

                type,

                quantity,

                previousStock,

                newStock,

                remarks,

                createdBy:
                    userId,
            },
        ],
        {
            session,
        }
    );

};


/*
============================================================
REVERSE OLD CREDIT INVENTORY
============================================================
*/

const reverseOldCreditInventory = async (
    transaction,
    userId,
    account,
    branchId,
    branchSnapshot,
    session
) => {

    if (
        transaction.type !==
        "CREDIT"
    ) {

        return;

    }


    for (
        const item
        of transaction.items
    ) {

        if (
            item.itemType ===
                "CUSTOM" ||
            !item.product
        ) {

            continue;

        }


        const productId =
            item.product?._id ||
            item.product;


        if (
            !mongoose.Types.ObjectId
                .isValid(
                    productId
                )
        ) {

            continue;

        }


        const quantity =
            Number(
                item.quantity
            ) || 0;


        if (
            quantity <= 0
        ) {

            continue;

        }


        const updatedInventory =
            await branchInventoryService
                .addStock(
                    branchId,
                    productId,
                    quantity,
                    {
                        session,
                    }
                );


        const newStock =
            Number(
                updatedInventory.stock
            ) || 0;


        const previousStock =
            newStock -
            quantity;


        await createInventoryAudit({

            branchId,

            branchSnapshot,

            productId,

            type:
                "ADJUSTMENT",

            quantity,

            previousStock,

            newStock,

            remarks:
                `Admin edit: reversed old ledger credit for ${account.name}`,

            userId,

            session,

        });

    }

};


/*
============================================================
APPLY CREDIT INVENTORY
============================================================
*/

const applyEditedCreditInventory = async (
    preparedItems,
    userId,
    account,
    branchId,
    branchSnapshot,
    session,
    remarksPrefix =
        "Ledger credit"
) => {

    const transactionItems =
        [];


    for (
        const prepared
        of preparedItems
    ) {

        if (
            prepared.itemType ===
            "CUSTOM"
        ) {

            transactionItems.push({

                itemType:
                    "CUSTOM",

                product:
                    null,

                barcode:
                    "",

                name:
                    prepared.name,

                note:
                    prepared.note ||
                    "",

                quantity:
                    prepared.quantity,

                unitPrice:
                    prepared.unitPrice,

                total:
                    prepared.total,

            });


            continue;

        }


        const product =
            prepared.product;


        const quantity =
            prepared.quantity;


        const updatedInventory =
            await branchInventoryService
                .deductStock(
                    branchId,
                    product._id,
                    quantity,
                    {
                        session,
                    }
                );


        const newStock =
            Number(
                updatedInventory.stock
            ) || 0;


        const previousStock =
            newStock +
            quantity;


        await createInventoryAudit({

            branchId,

            branchSnapshot,

            productId:
                product._id,

            type:
                remarksPrefix ===
                    "Ledger credit"
                    ? "SALE"
                    : "ADJUSTMENT",

            quantity,

            previousStock,

            newStock,

            remarks:
                `${remarksPrefix} for ${account.name}`,

            userId,

            session,

        });


        transactionItems.push({

            itemType:
                "PRODUCT",

            product:
                product._id,

            barcode:
                product.barcode ||
                "",

            name:
                product.name,

            note:
                "",

            quantity,

            unitPrice:
                prepared.unitPrice,

            total:
                prepared.total,

        });

    }


    return transactionItems;

};


/*
============================================================
ADD CREDIT
============================================================
*/

const addCredit = async (
    data,
    userId,
    activeBranch
) => {

    const {
        branchId,
        branchSnapshot,
    } =
        buildBranchContext(
            activeBranch
        );


    validateObjectId(
        data.accountId,
        "account ID"
    );


    validateObjectId(
        userId,
        "user ID"
    );


    const result =
        await withTransaction(
            async (
                session
            ) => {

                const account =
                    await requireBranchAccount(
                        data.accountId,
                        branchId,
                        session
                    );


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
                            account,
                            branchId,
                            session
                        );

                }


                const prepared =
                    await prepareEditedCreditItems(
                        data.items,
                        session
                    );


                if (
                    workerLedger
                ) {

                    await recalculateWorkerLedger(
                        workerLedger,
                        session
                    );


                    const remainingSalary =
                        Number(
                            workerLedger
                                .remainingSalary
                        ) || 0;


                    if (
                        prepared.grandTotal >
                        remainingSalary
                    ) {

                        throw new ApiError(
                            400,
                            `Credit cannot exceed the worker's remaining salary of ${remainingSalary}.`
                        );

                    }

                }


                const transactionItems =
                    await applyEditedCreditInventory(
                        prepared.preparedItems,
                        userId,
                        account,
                        branchId,
                        branchSnapshot,
                        session,
                        "Ledger credit"
                    );


                const [
                    transaction,
                ] =
                    await LedgerTransaction.create(
                        [
                            {
                                branch:
                                    branchId,

                                branchSnapshot,

                                account:
                                    account._id,

                                workerLedger:
                                    workerLedger
                                        ? workerLedger._id
                                        : null,

                                type:
                                    "CREDIT",

                                description:
                                    "Credit Purchase",

                                amount:
                                    prepared.grandTotal,

                                items:
                                    transactionItems,

                                status:
                                    "UNPAID",

                                remarks:
                                    data.remarks
                                        ?.trim() ||
                                    "",

                                createdBy:
                                    userId,
                            },
                        ],
                        {
                            session,
                        }
                    );


                if (
                    workerLedger
                ) {

                    workerLedger.totalCredits =
                        Number(
                            workerLedger
                                .totalCredits
                        ) +
                        prepared.grandTotal;


                    await recalculateWorkerLedger(
                        workerLedger,
                        session
                    );

                }


                await enqueueLedgerSync({

                    action:
                        "CREDIT",

                    aggregateId:
                        transaction._id,

                    branchId,

                    session,

                });


                return {

                    transactionId:
                        transaction._id,

                    accountId:
                        account._id,

                };

            }
        );


    const transaction =
        await LedgerTransaction
            .findById(
                result.transactionId
            )
            .populate(
                "createdBy",
                "name username role"
            )
            .populate(
                "items.product",
                "name barcode category"
            );


    return {

        transaction,

        account:
            await getAccountById(
                result.accountId,
                branchId
            ),

    };

};


/*
============================================================
ADD PAYMENT
============================================================
*/

const addPayment = async (
    data,
    userId,
    activeBranch
) => {

    const {
        branchId,
        branchSnapshot,
    } =
        buildBranchContext(
            activeBranch
        );


    validateObjectId(
        data.accountId,
        "account ID"
    );


    validateObjectId(
        userId,
        "user ID"
    );


    const paymentAmount =
        Number(
            data.amount
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


    const result =
        await withTransaction(
            async (
                session
            ) => {

                const account =
                    await requireBranchAccount(
                        data.accountId,
                        branchId,
                        session
                    );


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


                if (
                    account.type ===
                    "WORKER"
                ) {

                    workerLedger =
                        await requireOpenWorkerLedger(
                            account,
                            branchId,
                            session
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

                } else {

                    const balance =
                        await calculateBalance(
                            account._id,
                            branchId,
                            session
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


                const [
                    transaction,
                ] =
                    await LedgerTransaction.create(
                        [
                            {
                                branch:
                                    branchId,

                                branchSnapshot,

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
                                    data.remarks
                                        ?.trim() ||
                                    "",

                                createdBy:
                                    userId,
                            },
                        ],
                        {
                            session,
                        }
                    );


                if (
                    workerLedger
                ) {

                    workerLedger.totalPayments =
                        Number(
                            workerLedger
                                .totalPayments
                        ) +
                        paymentAmount;


                    await workerLedger.save({
                        session,
                    });

                }


                await enqueueLedgerSync({

                    action:
                        "PAYMENT",

                    aggregateId:
                        transaction._id,

                    branchId,

                    session,

                });


                return {

                    transactionId:
                        transaction._id,

                    accountId:
                        account._id,

                    previousBalance:
                        outstanding,

                    remainingBalance,

                };

            }
        );


    return {

        transaction:
            await LedgerTransaction
                .findById(
                    result.transactionId
                ),

        previousBalance:
            result.previousBalance,

        remainingBalance:
            result.remainingBalance,

        status:
            result.remainingBalance <= 0
                ? "PAID"
                : "PARTIAL",

        account:
            await getAccountById(
                result.accountId,
                branchId
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
    userId,
    activeBranch
) => {

    const {
        branchId,
        branchSnapshot,
    } =
        buildBranchContext(
            activeBranch
        );


    validateObjectId(
        data.accountId,
        "account ID"
    );


    validateObjectId(
        userId,
        "user ID"
    );


    const advanceAmount =
        Number(
            data.amount
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


    const result =
        await withTransaction(
            async (
                session
            ) => {

                const account =
                    await requireBranchAccount(
                        data.accountId,
                        branchId,
                        session
                    );


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
                        account,
                        branchId,
                        session
                    );


                await recalculateWorkerLedger(
                    workerLedger,
                    session
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


                const [
                    transaction,
                ] =
                    await LedgerTransaction.create(
                        [
                            {
                                branch:
                                    branchId,

                                branchSnapshot,

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
                                    data.remarks
                                        ?.trim() ||
                                    "",

                                createdBy:
                                    userId,
                            },
                        ],
                        {
                            session,
                        }
                    );


                workerLedger.totalCashAdvances =
                    Number(
                        workerLedger
                            .totalCashAdvances
                    ) +
                    advanceAmount;


                await recalculateWorkerLedger(
                    workerLedger,
                    session
                );


                await enqueueLedgerSync({

                    action:
                        "CASH_ADVANCE",

                    aggregateId:
                        transaction._id,

                    branchId,

                    session,

                });


                return {

                    transactionId:
                        transaction._id,

                    accountId:
                        account._id,

                    remainingSalary:
                        workerLedger
                            .remainingSalary,

                };

            }
        );


    return {

        transaction:
            await LedgerTransaction
                .findById(
                    result.transactionId
                ),

        remainingSalary:
            result.remainingSalary,

        account:
            await getAccountById(
                result.accountId,
                branchId
            ),

    };

};


/*
============================================================
GET TRANSACTIONS
============================================================
*/

const getTransactions = async (
    accountId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    await requireBranchAccount(
        accountId,
        resolvedBranchId
    );


    return LedgerTransaction
        .find({

            account:
                accountId,

            branch:
                resolvedBranchId,

        })
        .populate(
            "createdBy",
            "name username role"
        )
        .populate(
            "editedBy",
            "name username role"
        )
        .populate(
            "editHistory.editedBy",
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
    accountId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    return withTransaction(
        async (
            session
        ) => {

            const account =
                await requireBranchAccount(
                    accountId,
                    resolvedBranchId,
                    session
                );


            if (
                account.isActive ===
                false
            ) {

                return account;

            }


            account.isActive =
                false;


            await account.save({
                session,
            });


            await enqueueLedgerSync({

                action:
                    "ACCOUNT_DEACTIVATE",

                aggregateId:
                    account._id,

                branchId:
                    resolvedBranchId,

                session,

            });


            return account;

        }
    );

};


/*
============================================================
CREATE NEW WORKER LEDGER
============================================================
*/

const createAnotherWorkerLedger = async (
    accountId,
    activeBranch
) => {

    const {
        branchId,
        branchSnapshot,
    } =
        buildBranchContext(
            activeBranch
        );


    return withTransaction(
        async (
            session
        ) => {

            const worker =
                await requireBranchAccount(
                    accountId,
                    branchId,
                    session
                );


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


            const existingOpenLedger =
                await getOpenWorkerLedger(
                    worker._id,
                    branchId,
                    session
                );


            if (
                existingOpenLedger
            ) {

                throw new ApiError(
                    400,
                    "This worker already has an open ledger. Pay the worker before creating a new ledger."
                );

            }


            const latestLedger =
                await getLatestWorkerLedger(
                    worker._id,
                    branchId,
                    session
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


            const nextPeriodNumber =
                latestLedger
                    ? Number(
                        latestLedger
                            .periodNumber
                    ) +
                    1
                    : 1;


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


            const salary =
                Number(
                    worker.salary
                ) || 0;


            const [
                newLedger,
            ] =
                await WorkerLedger.create(
                    [
                        {
                            branch:
                                branchId,

                            branchSnapshot,

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
                        },
                    ],
                    {
                        session,
                    }
                );


            await enqueueWorkerLedgerSync({

                action:
                    "CREATE",

                aggregateId:
                    newLedger._id,

                branchId,

                session,

            });


            return normalizeWorkerLedger(
                newLedger
            );

        }
    );

};


/*
============================================================
PAY WORKER
============================================================
*/

const payWorker = async (
    accountId,
    {
        ledgerId = null,
        paymentDate = null,
    } = {},
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const result =
        await withTransaction(
            async (
                session
            ) => {

                const worker =
                    await requireBranchAccount(
                        accountId,
                        resolvedBranchId,
                        session
                    );


                if (
                    worker.type !==
                    "WORKER"
                ) {

                    throw new ApiError(
                        400,
                        "Only worker accounts can be paid."
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


                let workerLedger =
                    null;


                if (
                    ledgerId
                ) {

                    workerLedger =
                        await getSpecificWorkerLedger(
                            worker,
                            ledgerId,
                            resolvedBranchId,
                            session
                        );


                    if (
                        workerLedger.status !==
                        "OPEN"
                    ) {

                        throw new ApiError(
                            400,
                            "Only an OPEN worker ledger can be paid."
                        );

                    }

                } else {

                    workerLedger =
                        await getOpenWorkerLedger(
                            worker._id,
                            resolvedBranchId,
                            session
                        );

                }


                if (
                    !workerLedger
                ) {

                    throw new ApiError(
                        400,
                        "This worker does not have an OPEN ledger to pay."
                    );

                }


                await recalculateWorkerLedger(
                    workerLedger,
                    session
                );


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


                const salaryReleased =
                    Math.max(
                        salary -
                        totalCredits -
                        totalCashAdvances,
                        0
                    );


                const actualPaymentDate =
                    paymentDate
                        ? new Date(
                            paymentDate
                        )
                        : new Date();


                if (
                    Number.isNaN(
                        actualPaymentDate
                            .getTime()
                    )
                ) {

                    throw new ApiError(
                        400,
                        "Invalid payment date."
                    );

                }


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


                await workerLedger.save({
                    session,
                });


                await enqueueWorkerLedgerSync({

                    action:
                        "PAY",

                    aggregateId:
                        workerLedger._id,

                    branchId:
                        resolvedBranchId,

                    session,

                });


                return {

                    workerId:
                        worker._id,

                    workerLedgerId:
                        workerLedger._id,

                    salary,

                    totalCredits,

                    totalCashAdvances,

                    totalPayments,

                    salaryReleased,

                    actualPaymentDate,

                };

            }
        );


    const worker =
        await LedgerAccount.findOne({

            _id:
                result.workerId,

            branch:
                resolvedBranchId,

        });


    const workerLedger =
        await WorkerLedger.findOne({

            _id:
                result.workerLedgerId,

            branch:
                resolvedBranchId,

        });


    const transactions =
        await LedgerTransaction
            .find({

                account:
                    worker._id,

                workerLedger:
                    workerLedger._id,

                branch:
                    resolvedBranchId,

            })
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
    PRINTING REMAINS OUTSIDE DATABASE TRANSACTION
    ========================================================

    The worker payment is already safely committed before
    attempting the printer.

    Printer failure must never roll back or duplicate payroll.
    ========================================================
    */

    try {

        const printResult =
            await printerService
                .printWorkerSalaryReceipt({
                    worker,
                    workerLedger,
                    transactions,
                });


        return {

            success:
                true,

            paymentSuccess:
                true,

            printSuccess:
                true,

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

            salary:
                result.salary,

            totalCredits:
                result.totalCredits,

            totalCashAdvances:
                result.totalCashAdvances,

            totalPayments:
                result.totalPayments,

            salaryReleased:
                result.salaryReleased,

            paidAt:
                result.actualPaymentDate,

            canCreateNewLedger:
                true,

            printResult,

        };

    } catch (
        printError
    ) {

        console.error(
            "Worker salary payment succeeded but receipt printing failed:",
            printError
        );


        return {

            success:
                true,

            paymentSuccess:
                true,

            printSuccess:
                false,

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

            salary:
                result.salary,

            totalCredits:
                result.totalCredits,

            totalCashAdvances:
                result.totalCashAdvances,

            totalPayments:
                result.totalPayments,

            salaryReleased:
                result.salaryReleased,

            paidAt:
                result.actualPaymentDate,

            canCreateNewLedger:
                true,

        };

    }

};


/*
============================================================
LEGACY MARK WORKER MONTH PAID
============================================================
*/

const markWorkerMonthPaid = async (
    accountId,
    year,
    month,
    ledgerId = null,
    branchId
) => {

    return payWorker(
        accountId,
        {
            ledgerId,

            paymentDate:
                new Date(),
        },
        branchId
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
    ledgerId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    return withTransaction(
        async (
            session
        ) => {

            const worker =
                await requireBranchAccount(
                    accountId,
                    resolvedBranchId,
                    session
                );


            const workerLedger =
                await getSpecificWorkerLedger(
                    worker,
                    ledgerId,
                    resolvedBranchId,
                    session
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


            await workerLedger.save({
                session,
            });


            await enqueueWorkerLedgerSync({

                action:
                    "CLOSE",

                aggregateId:
                    workerLedger._id,

                branchId:
                    resolvedBranchId,

                session,

            });


            return normalizeWorkerLedger(
                workerLedger
            );

        }
    );

};


/*
============================================================
PRINT SELECTED WORKER LEDGER
============================================================
*/

const printLedger = async (
    accountId,
    year,
    month,
    ledgerId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const account =
        await requireBranchAccount(
            accountId,
            resolvedBranchId
        );


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
            ledgerId,
            resolvedBranchId
        );


    const transactions =
        await LedgerTransaction
            .find({

                account:
                    account._id,

                workerLedger:
                    workerLedger._id,

                branch:
                    resolvedBranchId,

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
*/

const reprintWorkerSalaryReceipt = async (
    accountId,
    ledgerId,
    branchId
) => {

    const resolvedBranchId =
        requireBranchId(
            branchId
        );


    const worker =
        await requireBranchAccount(
            accountId,
            resolvedBranchId
        );


    if (
        worker.type !==
        "WORKER"
    ) {

        throw new ApiError(
            400,
            "Only worker salary receipts can be reprinted."
        );

    }


    validateObjectId(
        ledgerId,
        "worker ledger ID"
    );


    const workerLedger =
        await WorkerLedger.findOne({

            _id:
                ledgerId,

            worker:
                worker._id,

            branch:
                resolvedBranchId,

        });


    if (!workerLedger) {

        throw new ApiError(
            404,
            "Worker ledger not found in the active branch."
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

                branch:
                    resolvedBranchId,

            })
            .populate(
                "items.product",
                "name barcode category"
            )
            .sort({
                createdAt:
                    1,
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

        success:
            true,

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
REBUILD WORKER LEDGER TOTALS
============================================================
*/

const rebuildWorkerLedgerTotals = async (
    workerLedger,
    branchId,
    session = null
) => {

    if (!workerLedger) {

        return null;

    }


    const query =
        LedgerTransaction.find({

            workerLedger:
                workerLedger._id,

            branch:
                requireBranchId(
                    branchId
                ),

        });


    if (session) {

        query.session(
            session
        );

    }


    const transactions =
        await query;


    let totalCredits =
        0;

    let totalPayments =
        0;

    let totalCashAdvances =
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

            totalCredits +=
                amount;

        }


        if (
            transaction.type ===
            "PAYMENT"
        ) {

            totalPayments +=
                amount;

        }


        if (
            transaction.type ===
            "CASH_ADVANCE"
        ) {

            totalCashAdvances +=
                amount;

        }

    }


    workerLedger.totalCredits =
        totalCredits;


    workerLedger.totalPayments =
        totalPayments;


    workerLedger.totalCashAdvances =
        totalCashAdvances;


    workerLedger.remainingSalary =
        Math.max(
            Number(
                workerLedger.salary
            ) -
            totalCredits -
            totalCashAdvances,
            0
        );


    await workerLedger.save(
        session
            ? {
                session,
            }
            : undefined
    );


    return workerLedger;

};


/*
============================================================
EDIT LEDGER TRANSACTION
============================================================
*/

const updateTransaction = async (
    accountId,
    transactionId,
    data,
    adminUserId,
    activeBranch
) => {

    const {
        branchId,
        branchSnapshot,
    } =
        buildBranchContext(
            activeBranch
        );


    validateObjectId(
        accountId,
        "account ID"
    );


    validateObjectId(
        transactionId,
        "transaction ID"
    );


    validateObjectId(
        adminUserId,
        "admin user ID"
    );


    const editReason =
        String(
            data.editReason ||
            ""
        ).trim();


    if (!editReason) {

        throw new ApiError(
            400,
            "An edit reason is required."
        );

    }


    const result =
        await withTransaction(
            async (
                session
            ) => {

                const account =
                    await requireBranchAccount(
                        accountId,
                        branchId,
                        session
                    );


                const transaction =
                    await LedgerTransaction
                        .findOne({

                            _id:
                                transactionId,

                            account:
                                account._id,

                            branch:
                                branchId,

                        })
                        .session(
                            session
                        );


                if (!transaction) {

                    throw new ApiError(
                        404,
                        "Ledger transaction not found in the active branch."
                    );

                }


                if (
                    data.type &&
                    data.type !==
                        transaction.type
                ) {

                    throw new ApiError(
                        400,
                        "Transaction type cannot be changed."
                    );

                }


                let workerLedger =
                    null;


                if (
                    transaction.workerLedger
                ) {

                    workerLedger =
                        await WorkerLedger
                            .findOne({

                                _id:
                                    transaction
                                        .workerLedger,

                                branch:
                                    branchId,

                            })
                            .session(
                                session
                            );


                    if (!workerLedger) {

                        throw new ApiError(
                            404,
                            "Worker ledger not found in the active branch."
                        );

                    }


                    if (
                        workerLedger.status !==
                        "OPEN"
                    ) {

                        throw new ApiError(
                            400,
                            "Transactions from a PAID or CLOSED worker ledger cannot be edited."
                        );

                    }

                }


                const previousData = {

                    type:
                        transaction.type,

                    description:
                        transaction.description,

                    amount:
                        transaction.amount,

                    items:
                        transaction.items
                            .map(
                                (
                                    item
                                ) => ({

                                    itemType:
                                        item.itemType,

                                    product:
                                        item.product,

                                    barcode:
                                        item.barcode,

                                    name:
                                        item.name,

                                    note:
                                        item.note ||
                                        "",

                                    quantity:
                                        item.quantity,

                                    unitPrice:
                                        item.unitPrice,

                                    total:
                                        item.total,

                                })
                            ),

                    status:
                        transaction.status,

                    remarks:
                        transaction.remarks,

                };


                if (
                    transaction.type ===
                    "CREDIT"
                ) {

                    const transactionBranchId =
                        requireBranchId(
                            transaction.branch
                        );


                    const storedSnapshot =
                        getSnapshotFromDocument(
                            transaction
                        );


                    const transactionSnapshot =
                        storedSnapshot.code &&
                        storedSnapshot.name
                            ? storedSnapshot
                            : branchSnapshot;


                    await reverseOldCreditInventory(
                        transaction,
                        adminUserId,
                        account,
                        transactionBranchId,
                        transactionSnapshot,
                        session
                    );


                    const prepared =
                        await prepareEditedCreditItems(
                            data.items,
                            session
                        );


                    if (
                        workerLedger
                    ) {

                        const projectedCredits =
                            Math.max(
                                Number(
                                    workerLedger
                                        .totalCredits
                                ) -
                                Number(
                                    transaction.amount
                                ) +
                                prepared.grandTotal,
                                0
                            );


                        const projectedRemaining =
                            Number(
                                workerLedger.salary
                            ) -
                            projectedCredits -
                            Number(
                                workerLedger
                                    .totalCashAdvances
                            );


                        if (
                            projectedRemaining < 0
                        ) {

                            throw new ApiError(
                                400,
                                "The corrected credit exceeds the worker's available salary."
                            );

                        }

                    }


                    const transactionItems =
                        await applyEditedCreditInventory(
                            prepared.preparedItems,
                            adminUserId,
                            account,
                            transactionBranchId,
                            transactionSnapshot,
                            session,
                            "Admin edit: applied corrected ledger credit"
                        );


                    transaction.items =
                        transactionItems;


                    transaction.amount =
                        prepared.grandTotal;


                    transaction.description =
                        data.description
                            ?.trim() ||
                        transaction.description ||
                        "Credit Purchase";


                    transaction.remarks =
                        data.remarks
                            ?.trim() ||
                        "";

                } else if (
                    transaction.type ===
                    "PAYMENT"
                ) {

                    const amount =
                        Number(
                            data.amount
                        );


                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {

                        throw new ApiError(
                            400,
                            "Payment amount must be greater than zero."
                        );

                    }


                    if (
                        workerLedger
                    ) {

                        const totalCredits =
                            Number(
                                workerLedger
                                    .totalCredits
                            ) || 0;


                        const otherPayments =
                            Math.max(
                                Number(
                                    workerLedger
                                        .totalPayments
                                ) -
                                Number(
                                    transaction.amount
                                ),
                                0
                            );


                        const availableOutstanding =
                            Math.max(
                                totalCredits -
                                otherPayments,
                                0
                            );


                        if (
                            amount >
                            availableOutstanding
                        ) {

                            throw new ApiError(
                                400,
                                `Payment cannot exceed the outstanding balance of ${availableOutstanding}.`
                            );

                        }

                    } else {

                        const transactions =
                            await LedgerTransaction
                                .find({

                                    account:
                                        account._id,

                                    branch:
                                        branchId,

                                    _id: {
                                        $ne:
                                            transaction._id,
                                    },

                                })
                                .session(
                                    session
                                );


                        let totalCredits =
                            0;


                        let totalPayments =
                            0;


                        for (
                            const item
                            of transactions
                        ) {

                            if (
                                item.type ===
                                "CREDIT"
                            ) {

                                totalCredits +=
                                    Number(
                                        item.amount
                                    ) || 0;

                            }


                            if (
                                item.type ===
                                "PAYMENT"
                            ) {

                                totalPayments +=
                                    Number(
                                        item.amount
                                    ) || 0;

                            }

                        }


                        const outstanding =
                            Math.max(
                                totalCredits -
                                totalPayments,
                                0
                            );


                        if (
                            amount >
                            outstanding
                        ) {

                            throw new ApiError(
                                400,
                                `Payment cannot exceed the outstanding balance of ${outstanding}.`
                            );

                        }

                    }


                    transaction.amount =
                        amount;


                    transaction.description =
                        data.description
                            ?.trim() ||
                        transaction.description ||
                        "Payment";


                    transaction.remarks =
                        data.remarks
                            ?.trim() ||
                        "";

                } else if (
                    transaction.type ===
                    "CASH_ADVANCE"
                ) {

                    if (
                        !workerLedger
                    ) {

                        throw new ApiError(
                            400,
                            "Cash advance transaction is not attached to a worker ledger."
                        );

                    }


                    const amount =
                        Number(
                            data.amount
                        );


                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {

                        throw new ApiError(
                            400,
                            "Cash advance amount must be greater than zero."
                        );

                    }


                    const projectedCashAdvances =
                        Math.max(
                            Number(
                                workerLedger
                                    .totalCashAdvances
                            ) -
                            Number(
                                transaction.amount
                            ) +
                            amount,
                            0
                        );


                    const projectedRemaining =
                        Number(
                            workerLedger.salary
                        ) -
                        Number(
                            workerLedger
                                .totalCredits
                        ) -
                        projectedCashAdvances;


                    if (
                        projectedRemaining < 0
                    ) {

                        throw new ApiError(
                            400,
                            "The corrected cash advance exceeds the worker's remaining salary."
                        );

                    }


                    transaction.amount =
                        amount;


                    transaction.description =
                        data.description
                            ?.trim() ||
                        transaction.description ||
                        "Cash Advance";


                    transaction.remarks =
                        data.remarks
                            ?.trim() ||
                        "";

                } else {

                    throw new ApiError(
                        400,
                        "This transaction type cannot be edited."
                    );

                }


                transaction.editHistory.push({

                    editedBy:
                        adminUserId,

                    editedAt:
                        new Date(),

                    reason:
                        editReason,

                    previousData,

                });


                transaction.editedBy =
                    adminUserId;


                transaction.editedAt =
                    new Date();


                transaction.editReason =
                    editReason;


                await transaction.save({
                    session,
                });


                if (
                    workerLedger
                ) {

                    await rebuildWorkerLedgerTotals(
                        workerLedger,
                        branchId,
                        session
                    );

                }


                /*
                =================================================
                CLOUD SYNC OUTBOX
                =================================================

                This one event covers:

                - LedgerTransaction
                - WorkerLedger totals
                - BranchInventory reversal/reapplication
                - InventoryTransaction audit rows

                because all changes occur inside this same
                local MongoDB transaction.
                =================================================
                */

                await enqueueLedgerSync({

                    action:
                        "TRANSACTION_UPDATE",

                    aggregateId:
                        transaction._id,

                    branchId,

                    session,

                });


                return {

                    transactionId:
                        transaction._id,

                    accountId:
                        account._id,

                };

            }
        );


    const updatedTransaction =
        await LedgerTransaction
            .findOne({

                _id:
                    result.transactionId,

                branch:
                    branchId,

            })
            .populate(
                "createdBy",
                "name username role"
            )
            .populate(
                "editedBy",
                "name username role"
            )
            .populate(
                "editHistory.editedBy",
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
                totalCredits
                totalCashAdvances
                totalPayments
                remainingSalary
                status
                `
            );


    return {

        transaction:
            updatedTransaction,

        account:
            await getAccountById(
                result.accountId,
                branchId
            ),

    };

};


/*
============================================================
EXPORT
============================================================
*/

export default {

    reprintWorkerSalaryReceipt,

    getAccounts,

    getAccountById,

    createAccount,

    updateAccount,

    deactivateAccount,

    addCredit,

    addPayment,

    addCashAdvance,

    getTransactions,

    updateTransaction,

    getWorkerMonths,

    getWorkerMonth,

    createAnotherWorkerLedger,

    closeWorkerMonth,

    payWorker,

    markWorkerMonthPaid,

    printLedger,

};