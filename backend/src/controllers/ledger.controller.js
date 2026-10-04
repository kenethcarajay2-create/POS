import ledgerService from "../services/ledger.service.js";
import ApiResponse from "../utils/ApiResponse.js";


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
        } =
            req.query;


        let activeFilter;


        if (
            isActive !==
            undefined
        ) {

            activeFilter =
                isActive ===
                "true";

        }


        const accounts =
            await ledgerService
                .getAccounts(
                    {
                        type,
                        search,
                        isActive:
                            activeFilter,
                    },
                    req.branchId
                );


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


const getAccountById = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService
                .getAccountById(
                    req.params.id,
                    req.branchId
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


const createAccount = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService
                .createAccount(
                    req.body,
                    req.activeBranch
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


const updateAccount = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService
                .updateAccount(
                    req.params.id,
                    req.body,
                    req.branchId
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


const addCredit = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .addCredit(
                    {
                        accountId:
                            req.params.id,

                        items:
                            req.body.items,

                        remarks:
                            req.body.remarks,
                    },
                    req.user.id,
                    req.activeBranch
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


const addPayment = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .addPayment(
                    {
                        accountId:
                            req.params.id,

                        amount:
                            req.body.amount,

                        remarks:
                            req.body.remarks,
                    },
                    req.user.id,
                    req.activeBranch
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


const addCashAdvance = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .addCashAdvance(
                    {
                        accountId:
                            req.params.id,

                        amount:
                            req.body.amount,

                        remarks:
                            req.body.remarks,
                    },
                    req.user.id,
                    req.activeBranch
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


const getTransactions = async (
    req,
    res,
    next
) => {

    try {

        const transactions =
            await ledgerService
                .getTransactions(
                    req.params.id,
                    req.branchId
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


const deactivateAccount = async (
    req,
    res,
    next
) => {

    try {

        const account =
            await ledgerService
                .deactivateAccount(
                    req.params.id,
                    req.branchId
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


const getWorkerMonths = async (
    req,
    res,
    next
) => {

    try {

        const periods =
            await ledgerService
                .getWorkerMonths(
                    req.params.id,
                    req.branchId
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
        } =
            req.params;


        const result =
            await ledgerService
                .getWorkerMonth(
                    id,
                    Number(year),
                    Number(month),
                    ledgerId,
                    req.branchId
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


const createWorkerLedger = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .createAnotherWorkerLedger(
                    req.params.id,
                    req.activeBranch
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


const payWorker = async (
    req,
    res,
    next
) => {

    try {

        const {
            ledgerId,
            paymentDate,
        } =
            req.body ||
            {};


        const result =
            await ledgerService
                .payWorker(
                    req.params.id,
                    {
                        ledgerId:
                            ledgerId ||
                            null,

                        paymentDate:
                            paymentDate ||
                            new Date(),
                    },
                    req.branchId
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
        } =
            req.params;


        const result =
            await ledgerService
                .closeWorkerMonth(
                    id,
                    Number(year),
                    Number(month),
                    ledgerId,
                    req.branchId
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
        } =
            req.params;


        const result =
            await ledgerService
                .markWorkerMonthPaid(
                    id,
                    Number(year),
                    Number(month),
                    ledgerId,
                    req.branchId
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
        } =
            req.params;


        const result =
            await ledgerService
                .printLedger(
                    id,
                    Number(year),
                    Number(month),
                    ledgerId,
                    req.branchId
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


const createAnotherWorkerLedger = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ledgerService
                .createAnotherWorkerLedger(
                    req.params.id,
                    req.activeBranch
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
                    req.params.ledgerId,
                    req.branchId
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
                    req.user.id,
                    req.activeBranch
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


export default {

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

    createWorkerLedger,

    createAnotherWorkerLedger,

    closeWorkerMonth,

    payWorker,

    markWorkerMonthPaid,

    printLedger,

    reprintWorkerSalaryReceipt,

};