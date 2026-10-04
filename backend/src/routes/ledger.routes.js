import express from "express";

import ledgerController
    from "../controllers/ledger.controller.js";

import workerAttendanceController
    from "../controllers/workerAttendance.controller.js";

import protect
    from "../middleware/auth.middleware.js";

import authorize
    from "../middleware/role.middleware.js";

import resolveActiveBranch
    from "../middleware/branch.middleware.js";

import validate
    from "../middleware/validate.middleware.js";

import ledgerValidator
    from "../validators/ledger.validator.js";


const router =
    express.Router();


/*
============================================================
LEDGER ACCOUNTS
============================================================
*/

router.get(
    "/",

    protect,

    resolveActiveBranch,

    authorize(
        "admin",
        "cashier"
    ),

    ledgerController.getAccounts
);


router.post(
    "/",

    protect,

    resolveActiveBranch,

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
WORKER ATTENDANCE
============================================================

GET
/api/ledger/:id/attendance?year=2026&month=9

PUT
/api/ledger/:id/attendance/2026-09-13
    → mark absent

DELETE
/api/ledger/:id/attendance/2026-09-13
    → mark present

Attendance is admin-only for now.
============================================================
*/

router.get(
    "/:id/attendance",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    workerAttendanceController
        .getMonth
);


router.put(
    "/:id/attendance/:dateKey",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    workerAttendanceController
        .markAbsent
);


router.delete(
    "/:id/attendance/:dateKey",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    workerAttendanceController
        .markPresent
);


/*
============================================================
TRANSACTIONS
============================================================
*/

router.post(
    "/:id/credit",

    protect,

    resolveActiveBranch,

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


router.post(
    "/:id/payment",

    protect,

    resolveActiveBranch,

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


router.post(
    "/:id/cash-advance",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    validate(
        ledgerValidator
            .cashAdvanceSchema
    ),

    ledgerController.addCashAdvance
);


router.get(
    "/:id/transactions",

    protect,

    resolveActiveBranch,

    authorize(
        "admin",
        "cashier"
    ),

    ledgerController.getTransactions
);


router.patch(
    "/:id/transactions/:transactionId",

    protect,

    resolveActiveBranch,

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

router.patch(
    "/:id/pay-worker",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.payWorker
);


router.get(
    "/:id/months",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.getWorkerMonths
);


router.get(
    "/:id/months/:year/:month/:ledgerId",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.getWorkerMonth
);


router.post(
    "/:id/months/:year/:month/:ledgerId/print",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.printLedger
);


router.patch(
    "/:id/months/:year/:month/:ledgerId/close",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.closeWorkerMonth
);


router.patch(
    "/:id/months/:year/:month/:ledgerId/paid",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.markWorkerMonthPaid
);


router.post(
    "/:id/worker-ledger",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.createWorkerLedger
);


router.post(
    "/:id/months/:year/:month/list",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.createAnotherWorkerLedger
);


router.post(
    "/:id/worker-ledger/:ledgerId/reprint",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController
        .reprintWorkerSalaryReceipt
);


/*
============================================================
ACCOUNT MANAGEMENT
============================================================
*/

router.patch(
    "/:id/deactivate",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    ledgerController.deactivateAccount
);


router.put(
    "/:id",

    protect,

    resolveActiveBranch,

    authorize(
        "admin"
    ),

    validate(
        ledgerValidator
            .updateAccountSchema
    ),

    ledgerController.updateAccount
);


router.get(
    "/:id",

    protect,

    resolveActiveBranch,

    authorize(
        "admin",
        "cashier"
    ),

    ledgerController.getAccountById
);


export default router;