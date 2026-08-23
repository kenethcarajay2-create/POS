import express from "express";

import ledgerController from "../controllers/ledger.controller.js";

import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

import validate from "../middleware/validate.middleware.js";
import ledgerValidator from "../validators/ledger.validator.js";


const router = express.Router();


/*
============================================================
GET ALL LEDGER ACCOUNTS
============================================================

GET /api/ledger

Available to admin and cashier.

Examples:

/api/ledger
/api/ledger?type=WORKER
/api/ledger?type=CUSTOMER
/api/ledger?search=Juan
/api/ledger?isActive=true
============================================================
*/

router.get(
    "/",
    protect,
    authorize("admin", "cashier"),
    ledgerController.getAccounts
);


/*
============================================================
CREATE LEDGER ACCOUNT
============================================================

POST /api/ledger

Admin only.

Used to create:

- Worker
- Customer
============================================================
*/

router.post(
    "/",
    protect,
    authorize("admin"),
    validate(
        ledgerValidator.createAccountSchema
    ),
    ledgerController.createAccount
);


/*
============================================================
GET SINGLE LEDGER ACCOUNT
============================================================

GET /api/ledger/:id
============================================================
*/

router.get(
    "/:id",
    protect,
    authorize("admin", "cashier"),
    ledgerController.getAccountById
);


/*
============================================================
UPDATE LEDGER ACCOUNT
============================================================

PUT /api/ledger/:id

Admin only.
============================================================
*/

router.put(
    "/:id",
    protect,
    authorize("admin"),
    validate(
        ledgerValidator.updateAccountSchema
    ),
    ledgerController.updateAccount
);


/*
============================================================
ADD CREDIT
============================================================

POST /api/ledger/:id/credit

Admin and cashier can add credit.
============================================================
*/

router.post(
    "/:id/credit",
    protect,
    authorize("admin", "cashier"),
    validate(
        ledgerValidator.addCreditSchema
    ),
    ledgerController.addCredit
);


/*
============================================================
ADD CREDIT PAYMENT
============================================================

POST /api/ledger/:id/payment

IMPORTANT:

This is a CREDIT payment.

This is NOT worker salary payment.

Worker salary payment uses:

PATCH /api/ledger/:id/pay-worker
============================================================
*/

router.post(
    "/:id/payment",
    protect,
    authorize("admin", "cashier"),
    validate(
        ledgerValidator.addPaymentSchema
    ),
    ledgerController.addPayment
);


/*
============================================================
ADD CASH ADVANCE
============================================================

POST /api/ledger/:id/cash-advance

Admin only.

Worker cash advances are attached to the worker's
current OPEN ledger.
============================================================
*/

router.post(
    "/:id/cash-advance",
    protect,
    authorize("admin"),
    validate(
        ledgerValidator.cashAdvanceSchema
    ),
    ledgerController.addCashAdvance
);


/*
============================================================
GET ACCOUNT TRANSACTIONS
============================================================

GET /api/ledger/:id/transactions
============================================================
*/

router.get(
    "/:id/transactions",
    protect,
    authorize("admin", "cashier"),
    ledgerController.getTransactions
);


/*
============================================================
DEACTIVATE ACCOUNT
============================================================

PATCH /api/ledger/:id/deactivate
============================================================
*/

router.patch(
    "/:id/deactivate",
    protect,
    authorize("admin"),
    ledgerController.deactivateAccount
);


/*
============================================================
PAY WORKER
============================================================

PATCH /api/ledger/:id/pay-worker

THIS is the official worker salary payment endpoint.

Called from WorkersPage.

Optional request body:

{
    "ledgerId": "...",
    "paymentDate": "2026-08-22"
}

If ledgerId is omitted:

- backend finds the worker's current OPEN ledger

Calculation:

salary
- totalCredits
- totalCashAdvances
=
salaryReleased

After payment:

status = PAID
salaryReleased = calculated amount
paidAt = payment date
closedAt = payment date

IMPORTANT:

This does NOT automatically create a new ledger.
============================================================
*/

router.patch(
    "/:id/pay-worker",
    protect,
    authorize("admin"),
    ledgerController.payWorker
);


/*
============================================================
GET WORKER LEDGER HISTORY
============================================================

GET /api/ledger/:id/months

The route name still says "months" for compatibility,
but this now represents worker pay-period history.

Supports:

- WEEKLY
- MONTHLY
============================================================
*/

router.get(
    "/:id/months",
    protect,
    authorize("admin"),
    ledgerController.getWorkerMonths
);


/*
============================================================
GET SPECIFIC WORKER LEDGER
============================================================

GET /api/ledger/:id/months/:year/:month/:ledgerId

ledgerId identifies the specific worker ledger.

year/month are temporarily retained for frontend
compatibility.
============================================================
*/

router.get(
    "/:id/months/:year/:month/:ledgerId",
    protect,
    authorize("admin"),
    ledgerController.getWorkerMonth
);


/*
============================================================
PRINT SPECIFIC WORKER LEDGER
============================================================

POST
/api/ledger/:id/months/:year/:month/:ledgerId/print

Prints ONLY the selected ledger.
============================================================
*/

router.post(
    "/:id/months/:year/:month/:ledgerId/print",
    protect,
    authorize("admin"),
    ledgerController.printLedger
);


/*
============================================================
CLOSE SPECIFIC WORKER LEDGER
============================================================

PATCH
/api/ledger/:id/months/:year/:month/:ledgerId/close

This is retained for compatibility/admin use.

Normally worker salary processing should use:

PATCH /api/ledger/:id/pay-worker
============================================================
*/

router.patch(
    "/:id/months/:year/:month/:ledgerId/close",
    protect,
    authorize("admin"),
    ledgerController.closeWorkerMonth
);


/*
============================================================
LEGACY MARK AS PAID
============================================================

PATCH
/api/ledger/:id/months/:year/:month/:ledgerId/paid

IMPORTANT:

This is kept temporarily for compatibility.

The NEW LedgerPage should NOT use this route.

WorkersPage should use:

PATCH /api/ledger/:id/pay-worker
============================================================
*/

router.patch(
    "/:id/months/:year/:month/:ledgerId/paid",
    protect,
    authorize("admin"),
    ledgerController.markWorkerMonthPaid
);


/*
============================================================
CREATE NEW WORKER LEDGER - NEW ROUTE
============================================================

POST /api/ledger/:id/worker-ledger

Recommended route for the new frontend.

Rules:

- If no ledger exists -> create first ledger
- If latest ledger is PAID -> create next ledger
- If an OPEN ledger exists -> reject

Backend determines whether the next period is
WEEKLY or MONTHLY.
============================================================
*/

router.post(
    "/:id/worker-ledger",
    protect,
    authorize("admin"),
    ledgerController.createWorkerLedger
);


/*
============================================================
LEGACY CREATE NEW LEDGER ROUTE
============================================================

POST
/api/ledger/:id/months/:year/:month/list

Kept temporarily because your older LedgerPage may still
call this route.

year/month are no longer responsible for creating the
worker period.

The backend determines the actual next pay period.
============================================================
*/

router.post(
    "/:id/months/:year/:month/list",
    protect,
    authorize("admin"),
    ledgerController.createAnotherWorkerLedger
);

/*
============================================================
REPRINT WORKER SALARY RECEIPT
============================================================

POST /api/ledger/:id/worker-ledger/:ledgerId/reprint

Admin only.

Only prints an already PAID ledger.
============================================================
*/

router.post(
    "/:id/worker-ledger/:ledgerId/reprint",
    protect,
    authorize("admin"),
    ledgerController.reprintWorkerSalaryReceipt
);

/*
============================================================
EXPORT ROUTER
============================================================
*/

export default router;