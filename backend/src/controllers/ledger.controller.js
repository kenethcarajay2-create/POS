import ledgerService from "../services/ledger.service.js";
import ApiResponse from "../utils/ApiResponse.js";


/*
============================================================
GET ALL LEDGER ACCOUNTS
============================================================

GET /api/ledger

Optional:

?type=WORKER
?type=CUSTOMER
?search=Juan
?isActive=true
============================================================
*/

const getAccounts = async (
    req,
    res,
    next
) => {

    try {

        const {
            type,
            search,
            isActive,
        } = req.query;


        let activeFilter;


        if (
            isActive !== undefined
        ) {

            activeFilter =
                isActive === "true";

        }


        const accounts =
            await ledgerService.getAccounts({
                type,
                search,
                isActive: activeFilter,
            });


        res.status(200).json(
            new ApiResponse(
                true,
                "Ledger accounts retrieved successfully",
                accounts
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
GET SINGLE LEDGER ACCOUNT
============================================================

GET /api/ledger/:id
============================================================
*/

const getAccountById = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService.getAccountById(
                req.params.id
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Ledger account retrieved successfully",
                account
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
CREATE LEDGER ACCOUNT
============================================================

POST /api/ledger

WEEKLY WORKER EXAMPLE:

{
    "name": "Juan Dela Cruz",
    "phone": "09171234567",
    "type": "WORKER",
    "salary": 4000,
    "payFrequency": "WEEKLY",
    "payDayOfWeek": 5
}

5 = Friday


MONTHLY WORKER EXAMPLE:

{
    "name": "Maria Santos",
    "phone": "09181234567",
    "type": "WORKER",
    "salary": 15000,
    "payFrequency": "MONTHLY",
    "payDay": 30
}


CUSTOMER EXAMPLE:

{
    "name": "Pedro Cruz",
    "phone": "09190000000",
    "type": "CUSTOMER"
}
============================================================
*/

const createAccount = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService.createAccount(
                req.body
            );


        res.status(201).json(
            new ApiResponse(
                true,
                "Ledger account created successfully",
                account
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
UPDATE LEDGER ACCOUNT
============================================================

PUT /api/ledger/:id
============================================================
*/

const updateAccount = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService.updateAccount(
                req.params.id,
                req.body
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Ledger account updated successfully",
                account
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
ADD CREDIT
============================================================

POST /api/ledger/:id/credit

Worker:
Credit is attached to the current OPEN WorkerLedger.

Customer:
Credit works against the normal customer balance.
============================================================
*/

const addCredit = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService.addCredit(
                {
                    accountId:
                        req.params.id,

                    items:
                        req.body.items,

                    remarks:
                        req.body.remarks,
                },
                req.user.id
            );


        res.status(201).json(
            new ApiResponse(
                true,
                "Credit added successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
ADD PAYMENT
============================================================

POST /api/ledger/:id/payment

NOTE:

This is a CREDIT payment.

It is NOT the same as paying a worker's salary.

Worker salary payment uses:

PATCH /api/ledger/:id/pay-worker
============================================================
*/

const addPayment = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService.addPayment(
                {
                    accountId:
                        req.params.id,

                    amount:
                        req.body.amount,

                    remarks:
                        req.body.remarks,
                },
                req.user.id
            );


        res.status(201).json(
            new ApiResponse(
                true,
                "Payment recorded successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
ADD CASH ADVANCE
============================================================

POST /api/ledger/:id/cash-advance

Worker only.

Cash advance is attached to the worker's current
OPEN pay-period ledger.
============================================================
*/

const addCashAdvance = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService.addCashAdvance(
                {
                    accountId:
                        req.params.id,

                    amount:
                        req.body.amount,

                    remarks:
                        req.body.remarks,
                },
                req.user.id
            );


        res.status(201).json(
            new ApiResponse(
                true,
                "Cash advance recorded successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
GET ALL ACCOUNT TRANSACTIONS
============================================================

GET /api/ledger/:id/transactions
============================================================
*/

const getTransactions = async (
    req,
    res,
    next
) => {

    try {

        const transactions =
            await ledgerService.getTransactions(
                req.params.id
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Ledger transactions retrieved successfully",
                transactions
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
DEACTIVATE ACCOUNT
============================================================

PATCH /api/ledger/:id/deactivate
============================================================
*/

const deactivateAccount = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService.deactivateAccount(
                req.params.id
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Ledger account deactivated successfully",
                account
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
GET WORKER PAY-PERIOD HISTORY
============================================================

GET /api/ledger/:id/months

The endpoint is temporarily still called "/months"
for frontend compatibility.

It now returns WorkerLedger PAY PERIODS.

Example:

Weekly:

Period #1
Aug 3 - Aug 9
PAID

Period #2
Aug 10 - Aug 16
OPEN


Monthly:

Period #1
August 2026
PAID

Period #2
September 2026
OPEN
============================================================
*/

const getWorkerMonths = async (
    req,
    res,
    next
) => {

    try {

        const periods =
            await ledgerService.getWorkerMonths(
                req.params.id
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Worker pay periods retrieved successfully",
                periods
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
GET SPECIFIC WORKER PAY PERIOD
============================================================

GET
/api/ledger/:id/months/:year/:month/:ledgerId

year/month remain in the route temporarily for
frontend compatibility.

ledgerId identifies the actual WorkerLedger.
============================================================
*/

const getWorkerMonth = async (
    req,
    res,
    next
) => {

    try {

        const {
            id,
            year,
            month,
            ledgerId,
        } = req.params;


        const result =
            await ledgerService.getWorkerMonth(
                id,
                Number(year),
                Number(month),
                ledgerId
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Worker pay period retrieved successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
CREATE NEW WORKER LEDGER
============================================================

POST /api/ledger/:id/worker-ledger

IMPORTANT RULE:

The worker can have only ONE OPEN ledger.

Allowed:

No previous ledger
        ↓
Create

OR

Previous ledger = PAID
        ↓
Create


Rejected:

Current ledger = OPEN
        ↓
Cannot create another ledger


The service automatically calculates the next WEEKLY
or MONTHLY pay period.
============================================================
*/

const createWorkerLedger = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .createAnotherWorkerLedger(
                    req.params.id
                );


        res.status(201).json(
            new ApiResponse(
                true,
                "New worker ledger created successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
PAY WORKER
============================================================

PATCH /api/ledger/:id/pay-worker

THIS is now the official salary-payment action.

This should be called from WorkersPage.

Optional body:

{
    "ledgerId": "...",
    "paymentDate": "2026-08-30"
}

If ledgerId is not provided, the current OPEN ledger
is automatically selected.

Calculation:

salary
- totalCredits
- totalCashAdvances
=
salaryReleased

After payment:

status = PAID
paidAt = paymentDate
salaryReleased = calculated amount

A new ledger is NOT automatically created.

The Ledger page will then allow:
"Create New List"
============================================================
*/
/*
============================================================
PAY WORKER
============================================================

PATCH /api/ledger/:id/pay-worker

Official worker salary payment endpoint.

Optional body:

{
    "ledgerId": "...",
    "paymentDate": "2026-08-30"
}

If ledgerId is omitted, the worker's current OPEN
ledger is automatically selected.

Salary released:

salary
- totalCredits
- totalCashAdvances
=
salaryReleased

After payment:

status = PAID
paidAt = paymentDate
closedAt = paymentDate
salaryReleased = calculated salary

IMPORTANT:

This DOES NOT automatically create another ledger.

After payment, LedgerPage may allow Create New List.
============================================================
*/

const payWorker = async (
    req,
    res,
    next
) => {

    try {

        const {
            ledgerId,
            paymentDate,
        } = req.body || {};


        const result =
            await ledgerService.payWorker(
                req.params.id,
                {
                    ledgerId:
                        ledgerId ||
                        null,

                    paymentDate:
                        paymentDate ||
                        new Date(),
                }
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Worker paid successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
CLOSE WORKER LEDGER
============================================================

PATCH
/api/ledger/:id/months/:year/:month/:ledgerId/close

This is retained mainly for compatibility/admin use.

Normally you should use Pay Worker instead.

CLOSED is NOT equivalent to PAID.
============================================================
*/

const closeWorkerMonth = async (
    req,
    res,
    next
) => {

    try {

        const {
            id,
            year,
            month,
            ledgerId,
        } = req.params;


        const result =
            await ledgerService.closeWorkerMonth(
                id,
                Number(year),
                Number(month),
                ledgerId
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Worker ledger closed successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
LEGACY MARK-AS-PAID CONTROLLER
============================================================

This remains temporarily so older frontend code does
not immediately crash.

DO NOT use this button on the new LedgerPage.

WorkersPage should use:

PATCH /api/ledger/:id/pay-worker
============================================================
*/

const markWorkerMonthPaid = async (
    req,
    res,
    next
) => {

    try {

        const {
            id,
            year,
            month,
            ledgerId,
        } = req.params;


        const result =
            await ledgerService
                .markWorkerMonthPaid(
                    id,
                    Number(year),
                    Number(month),
                    ledgerId
                );


        res.status(200).json(
            new ApiResponse(
                true,
                "Worker paid successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
PRINT SELECTED WORKER LEDGER
============================================================

POST
/api/ledger/:id/months/:year/:month/:ledgerId/print

IMPORTANT:

Only transactions belonging to ledgerId are printed.

Old periods will NOT be mixed with the selected period.
============================================================
*/

const printLedger = async (
    req,
    res,
    next
) => {

    try {

        const {
            id,
            year,
            month,
            ledgerId,
        } = req.params;


        const result =
            await ledgerService.printLedger(
                id,
                Number(year),
                Number(month),
                ledgerId
            );


        res.status(200).json(
            new ApiResponse(
                true,
                "Selected worker ledger printed successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};


/*
============================================================
BACKWARD-COMPATIBILITY:
CREATE ANOTHER WORKER LEDGER
============================================================

Your previous controller had:

createAnotherWorkerLedger()

We keep the controller name available temporarily.

year/month are no longer used.

It follows the SAME one-open-ledger rule.
============================================================
*/

const createAnotherWorkerLedger = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .createAnotherWorkerLedger(
                    req.params.id
                );


        res.status(201).json(
            new ApiResponse(
                true,
                "New worker ledger created successfully",
                result
            )
        );

    } catch (error) {

        next(error);

    }

};
/*
============================================================
REPRINT WORKER SALARY RECEIPT
============================================================

POST /api/ledger/:id/worker-ledger/:ledgerId/reprint
============================================================
*/

const reprintWorkerSalaryReceipt = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .reprintWorkerSalaryReceipt(
                    req.params.id,
                    req.params.ledgerId
                );


        res.status(200).json(
            new ApiResponse(
                true,
                "Worker salary receipt reprinted successfully",
                result
            )
        );


    } catch (error) {

        next(error);

    }

};

/*
============================================================
UPDATE LEDGER TRANSACTION
============================================================

PATCH /api/ledger/:id/transactions/:transactionId

ADMIN ONLY.

Supports editing:

CREDIT
- product items
- quantities
- custom/open-price items
- remarks

PAYMENT
- amount
- remarks

CASH_ADVANCE
- amount
- remarks

The service handles:
- inventory reversal/reapply
- worker ledger recalculation
- customer balance recalculation
- edit history
============================================================
*/

const updateTransaction = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .updateTransaction(
                    req.params.id,
                    req.params.transactionId,
                    req.body,
                    req.user.id
                );


        res.status(200).json(
            new ApiResponse(
                true,
                "Ledger transaction updated successfully",
                result
            )
        );


    } catch (error) {

        next(error);

    }

};

/*
============================================================
EXPORT
============================================================
*/
export default {

    /*
    Accounts
    */

    getAccounts,

    getAccountById,

    createAccount,

    updateAccount,

    deactivateAccount,


    /*
    Ledger transactions
    */

    addCredit,

    addPayment,

    addCashAdvance,

    getTransactions,

    updateTransaction,


    /*
    Worker pay periods
    */

    getWorkerMonths,

    getWorkerMonth,

    createWorkerLedger,

    createAnotherWorkerLedger,

    closeWorkerMonth,


    /*
    Worker salary payment
    */

    payWorker,


    /*
    Legacy compatibility only
    */

    markWorkerMonthPaid,


    /*
    Printing
    */

    printLedger,

    reprintWorkerSalaryReceipt,

};