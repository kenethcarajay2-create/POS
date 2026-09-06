import express from "express";

import ledgerController from "../controllers/ledger.controller.js";

import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

import validate from "../middleware/validate.middleware.js";
import ledgerValidator from "../validators/ledger.validator.js";


const router =
    express.Router();


/*
============================================================
LEDGER ACCOUNTS
============================================================
*/


/*
GET ALL LEDGER ACCOUNTS

GET /api/ledger
*/
router.get(
    "/",
    protect,
    authorize(
        "admin",
        "cashier"
    ),
    ledgerController.getAccounts
);


/*
CREATE LEDGER ACCOUNT

POST /api/ledger

Admin only.
*/
router.post(
    "/",
    protect,
    authorize(
        "admin"
    ),
    validate(
        ledgerValidator
            .createAccountSchema
    ),
    ledgerController.createAccount
);


/*
============================================================
TRANSACTIONS
============================================================
*/


/*
ADD CREDIT

POST /api/ledger/:id/credit

Admin and cashier.
*/
router.post(
    "/:id/credit",
    protect,
    authorize(
        "admin",
        "cashier"
    ),
    validate(
        ledgerValidator
            .addCreditSchema
    ),
    ledgerController.addCredit
);


/*
ADD CREDIT PAYMENT

POST /api/ledger/:id/payment
*/
router.post(
    "/:id/payment",
    protect,
    authorize(
        "admin",
        "cashier"
    ),
    validate(
        ledgerValidator
            .addPaymentSchema
    ),
    ledgerController.addPayment
);


/*
ADD CASH ADVANCE

POST /api/ledger/:id/cash-advance

Admin only.
*/
router.post(
    "/:id/cash-advance",
    protect,
    authorize(
        "admin"
    ),
    validate(
        ledgerValidator
            .cashAdvanceSchema
    ),
    ledgerController.addCashAdvance
);


/*
GET ACCOUNT TRANSACTIONS

GET /api/ledger/:id/transactions
*/
router.get(
    "/:id/transactions",
    protect,
    authorize(
        "admin",
        "cashier"
    ),
    ledgerController.getTransactions
);


/*
EDIT TRANSACTION

PATCH /api/ledger/:id/transactions/:transactionId

Admin only.

Supports:
- CREDIT
- PAYMENT
- CASH_ADVANCE

For CREDIT custom items,
ledgerValidator.updateTransactionSchema
must allow:

{
    itemType: "CUSTOM",
    name: "...",
    note: "...",
    quantity: 1,
    unitPrice: 100
}
*/
router.patch(
    "/:id/transactions/:transactionId",
    protect,
    authorize(
        "admin"
    ),
    validate(
        ledgerValidator
            .updateTransactionSchema
    ),
    ledgerController.updateTransaction
);


/*
============================================================
WORKER SALARY / LEDGER
============================================================
*/


/*
PAY WORKER

PATCH /api/ledger/:id/pay-worker
*/
router.patch(
    "/:id/pay-worker",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.payWorker
);


/*
GET WORKER LEDGER HISTORY

GET /api/ledger/:id/months
*/
router.get(
    "/:id/months",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.getWorkerMonths
);


/*
GET SPECIFIC WORKER LEDGER

GET
/api/ledger/:id/months/:year/:month/:ledgerId
*/
router.get(
    "/:id/months/:year/:month/:ledgerId",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.getWorkerMonth
);


/*
PRINT WORKER LEDGER

POST
/api/ledger/:id/months/:year/:month/:ledgerId/print
*/
router.post(
    "/:id/months/:year/:month/:ledgerId/print",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.printLedger
);


/*
CLOSE WORKER LEDGER

PATCH
/api/ledger/:id/months/:year/:month/:ledgerId/close
*/
router.patch(
    "/:id/months/:year/:month/:ledgerId/close",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.closeWorkerMonth
);


/*
LEGACY MARK WORKER LEDGER PAID

PATCH
/api/ledger/:id/months/:year/:month/:ledgerId/paid
*/
router.patch(
    "/:id/months/:year/:month/:ledgerId/paid",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.markWorkerMonthPaid
);


/*
CREATE NEW WORKER LEDGER

POST /api/ledger/:id/worker-ledger
*/
router.post(
    "/:id/worker-ledger",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.createWorkerLedger
);


/*
LEGACY CREATE WORKER LEDGER

POST
/api/ledger/:id/months/:year/:month/list
*/
router.post(
    "/:id/months/:year/:month/list",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.createAnotherWorkerLedger
);


/*
REPRINT WORKER SALARY RECEIPT

POST
/api/ledger/:id/worker-ledger/:ledgerId/reprint
*/
router.post(
    "/:id/worker-ledger/:ledgerId/reprint",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.reprintWorkerSalaryReceipt
);


/*
============================================================
ACCOUNT MANAGEMENT
============================================================
*/


/*
DEACTIVATE ACCOUNT

PATCH /api/ledger/:id/deactivate
*/
router.patch(
    "/:id/deactivate",
    protect,
    authorize(
        "admin"
    ),
    ledgerController.deactivateAccount
);


/*
UPDATE LEDGER ACCOUNT

PUT /api/ledger/:id

Admin only.
*/
router.put(
    "/:id",
    protect,
    authorize(
        "admin"
    ),
    validate(
        ledgerValidator
            .updateAccountSchema
    ),
    ledgerController.updateAccount
);


/*
GET SINGLE LEDGER ACCOUNT

GET /api/ledger/:id

Keep this generic /:id route near the bottom so
more specific routes above are easier to reason about.
*/
router.get(
    "/:id",
    protect,
    authorize(
        "admin",
        "cashier"
    ),
    ledgerController.getAccountById
);


export default router;