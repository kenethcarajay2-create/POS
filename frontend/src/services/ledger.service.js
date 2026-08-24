import api from "../api/api";


/*
============================================================
GET ALL LEDGER ACCOUNTS
============================================================
*/

const getAccounts = async (
    params = {}
) => {

    const response =
        await api.get(
            "/ledger",
            {
                params,
            }
        );

    return response.data.data;
};


/*
============================================================
GET SINGLE LEDGER ACCOUNT
============================================================
*/

const getAccountById = async (
    accountId
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }

    const response =
        await api.get(
            `/ledger/${accountId}`
        );

    return response.data.data;
};


/*
============================================================
CREATE LEDGER ACCOUNT
============================================================
*/

const createAccount = async (
    account
) => {

    if (!account) {

        throw new Error(
            "Account data is required."
        );

    }

    const response =
        await api.post(
            "/ledger",
            account
        );

    return response.data.data;
};


/*
============================================================
UPDATE LEDGER ACCOUNT
============================================================
*/

const updateAccount = async (
    accountId,
    account
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }

    if (!account) {

        throw new Error(
            "Account data is required."
        );

    }

    const response =
        await api.put(
            `/ledger/${accountId}`,
            account
        );

    return response.data.data;
};


/*
============================================================
DEACTIVATE ACCOUNT
============================================================
*/

const deactivateAccount = async (
    accountId
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }

    const response =
        await api.patch(
            `/ledger/${accountId}/deactivate`
        );

    return response.data.data;
};


/*
============================================================
ADD CREDIT
============================================================
*/

const addCredit = async (
    accountId,
    data
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }

    const response =
        await api.post(
            `/ledger/${accountId}/credit`,
            data
        );

    return response.data.data;
};


/*
============================================================
ADD CREDIT PAYMENT
============================================================

IMPORTANT:

This is repayment of store credit.

This is NOT worker salary payment.

Worker salary payment uses payWorker().
============================================================
*/

const addPayment = async (
    accountId,
    data
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }

    const response =
        await api.post(
            `/ledger/${accountId}/payment`,
            data
        );

    return response.data.data;
};


/*
============================================================
ADD CASH ADVANCE
============================================================
*/

const addCashAdvance = async (
    accountId,
    data
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }

    const response =
        await api.post(
            `/ledger/${accountId}/cash-advance`,
            data
        );

    return response.data.data;
};


/*
============================================================
GET ALL ACCOUNT TRANSACTIONS
============================================================
*/

const getTransactions = async (
    accountId
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }

    const response =
        await api.get(
            `/ledger/${accountId}/transactions`
        );

    return response.data.data;
};

/*
============================================================
UPDATE LEDGER TRANSACTION
============================================================

ADMIN ONLY.

Backend route:

PATCH /api/ledger/:id/transactions/:transactionId

Supports:

CREDIT
- Product items
- Custom/open-price items
- Remarks

PAYMENT
- Amount
- Remarks

CASH_ADVANCE
- Amount
- Remarks

The backend is responsible for:

- reversing old inventory
- applying corrected inventory
- recalculating worker ledger totals
- recalculating balances
- recording edit history
============================================================
*/

const updateTransaction = async (
    accountId,
    transactionId,
    data
) => {

    if (!accountId) {

        throw new Error(
            "Account ID is required."
        );

    }


    if (!transactionId) {

        throw new Error(
            "Transaction ID is required."
        );

    }


    if (!data) {

        throw new Error(
            "Transaction update data is required."
        );

    }


    const response =
        await api.patch(
            `/ledger/${accountId}/transactions/${transactionId}`,
            data
        );


    return response.data.data;

};


/*
============================================================
GET WORKER LEDGER HISTORY
============================================================

Backend route:

GET /api/ledger/:id/months

The backend still uses "months" in the route for
compatibility, but the returned records may represent:

- WEEKLY pay periods
- MONTHLY pay periods
============================================================
*/

const getWorkerMonths = async (
    accountId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    const response =
        await api.get(
            `/ledger/${accountId}/months`
        );

    return response.data.data;
};


/*
============================================================
GET SPECIFIC WORKER LEDGER
============================================================
*/

const getWorkerMonth = async (
    accountId,
    year,
    month,
    ledgerId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    if (!ledgerId) {

        throw new Error(
            "Worker ledger ID is required."
        );

    }

    /*
    --------------------------------------------------------
    YEAR / MONTH COMPATIBILITY
    --------------------------------------------------------

    The backend still expects year/month in the URL.

    The actual ledger is identified using ledgerId.
    --------------------------------------------------------
    */

    const now =
        new Date();

    const resolvedYear =
        Number(year) ||
        now.getFullYear();

    const resolvedMonth =
        Number(month) ||
        (
            now.getMonth() +
            1
        );

    const response =
        await api.get(
            `/ledger/${accountId}/months/${resolvedYear}/${resolvedMonth}/${ledgerId}`
        );

    return response.data.data;
};


/*
============================================================
GET CURRENT WORKER LEDGER
============================================================

The account endpoint already returns:

currentWorkerLedger
============================================================
*/

const getCurrentWorkerLedger = async (
    accountId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    const account =
        await getAccountById(
            accountId
        );

    return (
        account?.currentWorkerLedger ||
        null
    );
};


/*
============================================================
CREATE WORKER LEDGER
============================================================

NEW OFFICIAL ROUTE:

POST /api/ledger/:id/worker-ledger

Backend determines:

- WEEKLY or MONTHLY
- periodStart
- periodEnd
- scheduledPayDate
- periodNumber

RULE:

No OPEN ledger
+
No previous ledger OR latest ledger PAID
=
Can create new ledger
============================================================
*/

const createWorkerLedger = async (
    accountId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    const response =
        await api.post(
            `/ledger/${accountId}/worker-ledger`
        );

    return response.data.data;
};


/*
============================================================
CREATE ANOTHER WORKER LEDGER
============================================================

Compatibility alias.

The frontend should eventually use only:

createWorkerLedger(accountId)
============================================================
*/

const createAnotherWorkerLedger = async (
    accountId
) => {

    return createWorkerLedger(
        accountId
    );
};


/*
============================================================
CAN CREATE WORKER LEDGER
============================================================

Rules:

1. OPEN ledger exists
   -> false

2. No ledger history
   -> true

3. Latest ledger is PAID
   -> true

4. Anything else
   -> false
============================================================
*/

const canCreateWorkerLedger = async (
    accountId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    const account =
        await getAccountById(
            accountId
        );


    /*
    --------------------------------------------------------
    USE BACKEND RESULT FIRST
    --------------------------------------------------------
    */

    if (
        typeof account
            ?.canCreateNewLedger ===
        "boolean"
    ) {

        return account
            .canCreateNewLedger;

    }


    /*
    --------------------------------------------------------
    OPEN LEDGER
    --------------------------------------------------------
    */

    if (
        account
            ?.currentWorkerLedger
            ?.status ===
        "OPEN"
    ) {

        return false;

    }


    /*
    --------------------------------------------------------
    NO HISTORY
    --------------------------------------------------------
    */

    if (
        !account
            ?.latestWorkerLedger
    ) {

        return true;

    }


    /*
    --------------------------------------------------------
    PREVIOUS PAID
    --------------------------------------------------------
    */

    return (
        account
            .latestWorkerLedger
            .status ===
        "PAID"
    );
};


/*
============================================================
PAY WORKER
============================================================

OFFICIAL SALARY PAYMENT FUNCTION.

Backend:

PATCH /api/ledger/:id/pay-worker

Example:

await ledgerService.payWorker(
    workerId,
    {
        ledgerId,
        paymentDate: "2026-08-22"
    }
);

ledgerId is optional.

If ledgerId is omitted, backend uses the worker's
current OPEN ledger.

Backend calculation:

salary
- totalCredits
- totalCashAdvances
=
salaryReleased
============================================================
*/

const payWorker = async (
    accountId,
    {
        ledgerId = null,
        paymentDate = null,
    } = {}
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }


    const payload =
        {};


    if (ledgerId) {

        payload.ledgerId =
            ledgerId;

    }


    if (paymentDate) {

        payload.paymentDate =
            paymentDate;

    }


    const response =
        await api.patch(
            `/ledger/${accountId}/pay-worker`,
            payload
        );

    return response.data.data;
};


/*
============================================================
CLOSE WORKER LEDGER
============================================================

Legacy/admin function.

Normal salary processing should use payWorker().
============================================================
*/

const closeWorkerMonth = async (
    accountId,
    year,
    month,
    ledgerId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    if (!ledgerId) {

        throw new Error(
            "Worker ledger ID is required."
        );

    }


    const now =
        new Date();

    const resolvedYear =
        Number(year) ||
        now.getFullYear();

    const resolvedMonth =
        Number(month) ||
        (
            now.getMonth() +
            1
        );


    const response =
        await api.patch(
            `/ledger/${accountId}/months/${resolvedYear}/${resolvedMonth}/${ledgerId}/close`
        );

    return response.data.data;
};


/*
============================================================
LEGACY MARK WORKER LEDGER PAID
============================================================

DO NOT USE THIS FROM THE NEW WORKERS PAGE.

DO NOT USE THIS FROM THE NEW LEDGER PAGE.

Kept temporarily because older frontend code may still
reference the function.
============================================================
*/

const markWorkerMonthPaid = async (
    accountId,
    year,
    month,
    ledgerId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    if (!ledgerId) {

        throw new Error(
            "Worker ledger ID is required."
        );

    }


    const now =
        new Date();

    const resolvedYear =
        Number(year) ||
        now.getFullYear();

    const resolvedMonth =
        Number(month) ||
        (
            now.getMonth() +
            1
        );


    const response =
        await api.patch(
            `/ledger/${accountId}/months/${resolvedYear}/${resolvedMonth}/${ledgerId}/paid`
        );

    return response.data.data;
};


/*
============================================================
PRINT WORKER LEDGER
============================================================

Prints ONLY the specified worker ledger.
============================================================
*/

const printLedger = async (
    accountId,
    year,
    month,
    ledgerId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }

    if (!ledgerId) {

        throw new Error(
            "Worker ledger ID is required."
        );

    }


    const now =
        new Date();

    const resolvedYear =
        Number(year) ||
        now.getFullYear();

    const resolvedMonth =
        Number(month) ||
        (
            now.getMonth() +
            1
        );


    const response =
        await api.post(
            `/ledger/${accountId}/months/${resolvedYear}/${resolvedMonth}/${ledgerId}/print`
        );

    return response.data.data;
};


/*
============================================================
EXPORT SERVICE
============================================================
*/

/*
============================================================
REPRINT WORKER SALARY RECEIPT
============================================================
*/

const reprintWorkerSalaryReceipt = async (
    accountId,
    ledgerId
) => {

    if (!accountId) {

        throw new Error(
            "Worker account ID is required."
        );

    }


    if (!ledgerId) {

        throw new Error(
            "Worker ledger ID is required."
        );

    }


    const response =
        await api.post(
            `/ledger/${accountId}/worker-ledger/${ledgerId}/reprint`
        );


    return response.data.data;
};

const ledgerService = {

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

    updateTransaction,


    /*
    --------------------------------------------------------
    WORKER LEDGER
    --------------------------------------------------------
    */

    getWorkerMonths,

    getWorkerMonth,

    getCurrentWorkerLedger,

    createWorkerLedger,

    createAnotherWorkerLedger,

    canCreateWorkerLedger,


    /*
    --------------------------------------------------------
    WORKER SALARY
    --------------------------------------------------------
    */

    payWorker,


    /*
    --------------------------------------------------------
    LEGACY / ADMIN
    --------------------------------------------------------
    */

    closeWorkerMonth,

    markWorkerMonthPaid,


    /*
    --------------------------------------------------------
    PRINTING
    --------------------------------------------------------
    */

    printLedger,
    reprintWorkerSalaryReceipt
};


export default ledgerService;