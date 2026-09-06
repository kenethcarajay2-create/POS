import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    FaUserPlus,
    FaUsers,
    FaCalendarCheck,
    FaExclamationTriangle,
    FaMoneyBillWave,
    FaSearch,
    FaFilter,
    FaBook,
    FaHistory,
    FaEdit,
    FaUserSlash,
    FaUserCheck,
    FaEllipsisV,
    FaWallet,
    FaClock,
    FaCalendarDay,
    FaReceipt,
    FaPrint,
    FaTimes,
    FaCheck,
    FaSyncAlt,
    FaInfoCircle,
} from "react-icons/fa";

import ledgerService from "../../services/ledger.service";


/*
============================================================
WORKERS & SALARY PAGE
============================================================

FRONTEND RESPONSIBILITIES

- Create workers
- Edit workers
- Weekly / monthly salary schedules
- Payday configuration
- Payroll due / overdue visibility
- Open worker ledger
- Pay worker
- Salary history
- Salary details
- Receipt reprint
- Deactivate / reactivate workers

IMPORTANT

The backend must still guarantee that paying a worker is atomic
and idempotent.

The frontend cannot prevent duplicate payroll payments caused by:

- multiple browser tabs
- multiple devices
- retries after timeout
- duplicated network requests

Backend rule should be:

OPEN ledger
    ↓ atomic update
PAID ledger

Any later payment attempt must return 409 / already paid.
============================================================
*/


/*
============================================================
DEFAULT WORKER
============================================================
*/

const DEFAULT_WORKER = {
    name: "",
    phone: "",
    type: "WORKER",
    salary: "",
    payFrequency: "MONTHLY",
    payDay: "",
    payDayOfWeek: "",
    salaryPeriod: "",
};


/*
============================================================
WEEK DAYS
============================================================
*/

const WEEK_DAYS = [
    {
        value: "0",
        label: "Sunday",
    },
    {
        value: "1",
        label: "Monday",
    },
    {
        value: "2",
        label: "Tuesday",
    },
    {
        value: "3",
        label: "Wednesday",
    },
    {
        value: "4",
        label: "Thursday",
    },
    {
        value: "5",
        label: "Friday",
    },
    {
        value: "6",
        label: "Saturday",
    },
];


/*
============================================================
FORMAT CURRENCY
============================================================
*/

const formatCurrency = (
    value
) => {

    const amount =
        Number(value) || 0;


    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    ).format(
        amount
    );

};


/*
============================================================
FORMAT DATE
============================================================
*/

const formatDate = (
    value
) => {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return new Intl.DateTimeFormat(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
        }
    ).format(
        date
    );

};


/*
============================================================
FORMAT DATE TIME
============================================================
*/

const formatDateTime = (
    value
) => {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return new Intl.DateTimeFormat(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }
    ).format(
        date
    );

};


/*
============================================================
PARSE LOCAL INPUT DATE
============================================================
*/

const parseLocalInputDate = (
    value
) => {

    if (!value) {
        return null;
    }


    const parts =
        String(value)
            .split("-")
            .map(Number);


    if (
        parts.length !== 3
    ) {
        return null;
    }


    const [
        year,
        month,
        day,
    ] = parts;


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }


    return date;

};


/*
============================================================
TODAY INPUT VALUE
============================================================
*/

const getTodayInputValue = () => {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

};


/*
============================================================
START OF DAY
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


/*
============================================================
GET ACCOUNT ID
============================================================
*/

const getAccountId = (
    account
) => {

    return (
        account?._id ||
        account?.id ||
        null
    );

};


/*
============================================================
GET LEDGER ID
============================================================
*/

const getLedgerId = (
    ledger
) => {

    return (
        ledger?._id ||
        ledger?.id ||
        ledger?.listId ||
        null
    );

};


/*
============================================================
ORDINAL SUFFIX
============================================================
*/

const getOrdinalSuffix = (
    number
) => {

    const value =
        Number(number);


    if (
        value >= 11 &&
        value <= 13
    ) {
        return "th";
    }


    switch (
        value % 10
    ) {

        case 1:
            return "st";

        case 2:
            return "nd";

        case 3:
            return "rd";

        default:
            return "th";

    }

};


/*
============================================================
PAYDAY TEXT
============================================================
*/

const getPaydayText = (
    worker
) => {

    if (
        worker?.payFrequency ===
        "WEEKLY"
    ) {

        const day =
            WEEK_DAYS.find(
                (item) =>
                    Number(
                        item.value
                    ) ===
                    Number(
                        worker.payDayOfWeek
                    )
            );


        return day
            ? `Every ${day.label}`
            : "Not set";

    }


    if (
        worker?.payFrequency ===
        "MONTHLY"
    ) {

        if (
            worker.payDay
        ) {

            return (
                `Every ${worker.payDay}${getOrdinalSuffix(
                    worker.payDay
                )}`
            );

        }

    }


    return "Not set";

};


/*
============================================================
SAFE MONTHLY PAYDAY
============================================================

If worker is configured for 29 / 30 / 31 and the month
does not contain that date, use the final calendar day.

Examples:

31st in February
→ February 28 / 29

31st in April
→ April 30
============================================================
*/

const getSafeMonthlyDate = (
    year,
    monthIndex,
    payDay
) => {

    const lastDay =
        new Date(
            year,
            monthIndex + 1,
            0
        ).getDate();


    const safeDay =
        Math.min(
            Math.max(
                Number(payDay) || 1,
                1
            ),
            lastDay
        );


    return new Date(
        year,
        monthIndex,
        safeDay
    );

};


/*
============================================================
CALCULATE LEDGER DUE DATE
============================================================
*/

const getLedgerDueDate = (
    worker,
    ledger
) => {

    if (
        ledger?.scheduledPayDate
    ) {

        const scheduled =
            new Date(
                ledger.scheduledPayDate
            );


        if (
            !Number.isNaN(
                scheduled.getTime()
            )
        ) {
            return scheduled;
        }

    }


    /*
    --------------------------------------------------------
    MONTHLY
    --------------------------------------------------------
    */

    if (
        worker?.payFrequency ===
        "MONTHLY" &&
        worker?.payDay
    ) {

        const reference =
            ledger?.periodEnd
                ? new Date(
                    ledger.periodEnd
                )
                : new Date();


        if (
            !Number.isNaN(
                reference.getTime()
            )
        ) {

            return getSafeMonthlyDate(
                reference.getFullYear(),
                reference.getMonth(),
                Number(
                    worker.payDay
                )
            );

        }

    }


    /*
    --------------------------------------------------------
    WEEKLY
    --------------------------------------------------------
    */

    if (
        worker?.payFrequency ===
            "WEEKLY" &&
        worker?.payDayOfWeek !==
            undefined &&
        worker?.payDayOfWeek !==
            null &&
        worker?.payDayOfWeek !==
            ""
    ) {

        const targetDay =
            Number(
                worker.payDayOfWeek
            );


        let reference =
            ledger?.periodStart
                ? startOfDay(
                    ledger.periodStart
                )
                : startOfDay(
                    new Date()
                );


        /*
        Find the target weekday beginning
        from the ledger period start.
        */

        for (
            let index = 0;
            index < 7;
            index++
        ) {

            const candidate =
                new Date(
                    reference
                );


            candidate.setDate(
                reference.getDate() +
                index
            );


            if (
                candidate.getDay() ===
                targetDay
            ) {
                return candidate;
            }

        }

    }


    return null;

};


/*
============================================================
LEDGER PERIOD LABEL
============================================================
*/

const getLedgerPeriodLabel = (
    ledger
) => {

    if (!ledger) {
        return "Unknown Period";
    }


    if (
        ledger.label
    ) {
        return ledger.label;
    }


    if (
        ledger.periodStart &&
        ledger.periodEnd
    ) {

        if (
            ledger.payFrequency ===
            "WEEKLY"
        ) {

            return (
                `${formatDate(
                    ledger.periodStart
                )} - ${formatDate(
                    ledger.periodEnd
                )}`
            );

        }


        const start =
            new Date(
                ledger.periodStart
            );


        if (
            !Number.isNaN(
                start.getTime()
            )
        ) {

            return start.toLocaleDateString(
                "en-PH",
                {
                    month: "long",
                    year: "numeric",
                }
            );

        }

    }


    if (
        ledger.year &&
        ledger.month
    ) {

        return new Date(
            Number(
                ledger.year
            ),
            Number(
                ledger.month
            ) - 1,
            1
        ).toLocaleDateString(
            "en-PH",
            {
                month: "long",
                year: "numeric",
            }
        );

    }


    return (
        `Period #${
            ledger.periodNumber ||
            ledger.listNumber ||
            1
        }`
    );

};


/*
============================================================
LEDGER SALARY
============================================================
*/

const getLedgerSalary = (
    worker,
    ledger
) => {

    return (
        Number(
            ledger?.salary ??
            worker?.salary ??
            0
        ) || 0
    );

};


/*
============================================================
LEDGER CREDITS
============================================================
*/

const getLedgerCredits = (
    ledger
) => {

    return (
        Number(
            ledger?.totalCredits
        ) || 0
    );

};


/*
============================================================
LEDGER CASH ADVANCES
============================================================
*/

const getLedgerCashAdvances = (
    ledger
) => {

    return (
        Number(
            ledger?.totalCashAdvances
        ) || 0
    );

};


/*
============================================================
NET PAY
============================================================
*/

const calculateLedgerNetPay = (
    worker,
    ledger
) => {

    if (!ledger) {
        return 0;
    }


    const salary =
        getLedgerSalary(
            worker,
            ledger
        );


    const credits =
        getLedgerCredits(
            ledger
        );


    const advances =
        getLedgerCashAdvances(
            ledger
        );


    return Math.max(
        salary -
        credits -
        advances,
        0
    );

};


/*
============================================================
EXCESS DEDUCTIONS
============================================================
*/

const calculateExcessDeductions = (
    worker,
    ledger
) => {

    if (!ledger) {
        return 0;
    }


    const salary =
        getLedgerSalary(
            worker,
            ledger
        );


    const deductions =
        getLedgerCredits(
            ledger
        ) +
        getLedgerCashAdvances(
            ledger
        );


    return Math.max(
        deductions - salary,
        0
    );

};


/*
============================================================
PAYROLL STATUS
============================================================
*/

const getWorkerPayrollStatus = (
    worker
) => {

    if (
        worker?.isActive ===
        false
    ) {

        return {
            value:
                "INACTIVE",

            label:
                "Inactive",

            className:
                "badge badge-ghost badge-sm",
        };

    }


    const current =
        worker?.currentWorkerLedger;


    if (
        current &&
        current.status ===
            "OPEN"
    ) {

        const dueDate =
            getLedgerDueDate(
                worker,
                current
            );


        if (!dueDate) {

            return {
                value:
                    "OPEN",

                label:
                    "Open",

                className:
                    "badge badge-warning badge-sm",
            };

        }


        const today =
            startOfDay(
                new Date()
            );


        const due =
            startOfDay(
                dueDate
            );


        if (
            due.getTime() <
            today.getTime()
        ) {

            const daysOverdue =
                Math.floor(
                    (
                        today.getTime() -
                        due.getTime()
                    ) /
                    86400000
                );


            return {
                value:
                    "OVERDUE",

                label:
                    daysOverdue ===
                    1
                        ? "1 Day Overdue"
                        : `${daysOverdue} Days Overdue`,

                className:
                    "badge badge-error badge-sm",
            };

        }


        if (
            due.getTime() ===
            today.getTime()
        ) {

            return {
                value:
                    "DUE",

                label:
                    "Due Today",

                className:
                    "badge badge-warning badge-sm",
            };

        }


        return {
            value:
                "UPCOMING",

            label:
                "Upcoming",

            className:
                "badge badge-info badge-sm",
        };

    }


    const latest =
        worker?.latestWorkerLedger;


    if (
        latest?.status ===
        "PAID"
    ) {

        return {
            value:
                "PAID",

            label:
                "Paid",

            className:
                "badge badge-success badge-sm",
        };

    }


    return {
        value:
            "NO_LEDGER",

        label:
            "No Ledger",

        className:
            "badge badge-ghost badge-sm",
    };

};


/*
============================================================
WORKERS PAGE
============================================================
*/

const WorkersPage = () => {

    const navigate =
        useNavigate();


    /*
    ========================================================
    MAIN STATE
    ========================================================
    */

    const [
        workers,
        setWorkers,
    ] = useState([]);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        saving,
        setSaving,
    ] = useState(false);


    const [
        paying,
        setPaying,
    ] = useState(false);


    const [
        loadingPayData,
        setLoadingPayData,
    ] = useState(false);


    const [
        refreshing,
        setRefreshing,
    ] = useState(false);


    /*
    ========================================================
    FILTER STATE
    ========================================================
    */

    const [
        search,
        setSearch,
    ] = useState("");


    const [
        statusFilter,
        setStatusFilter,
    ] = useState(
        "ACTIVE"
    );


    const [
        frequencyFilter,
        setFrequencyFilter,
    ] = useState(
        "ALL"
    );


    const [
        payrollFilter,
        setPayrollFilter,
    ] = useState(
        "ALL"
    );


    /*
    ========================================================
    WORKER MODAL
    ========================================================
    */

    const [
        showWorkerModal,
        setShowWorkerModal,
    ] = useState(false);


    const [
        editingWorker,
        setEditingWorker,
    ] = useState(null);


    const [
        form,
        setForm,
    ] = useState({
        ...DEFAULT_WORKER,
    });


    /*
    ========================================================
    PAY MODAL
    ========================================================
    */

    const [
        showPayModal,
        setShowPayModal,
    ] = useState(false);


    const [
        showFinalPayConfirm,
        setShowFinalPayConfirm,
    ] = useState(false);


    const [
        selectedWorker,
        setSelectedWorker,
    ] = useState(null);


    const [
        currentLedger,
        setCurrentLedger,
    ] = useState(null);


    const [
        paymentDate,
        setPaymentDate,
    ] = useState(
        getTodayInputValue()
    );


    /*
    ========================================================
    SALARY HISTORY
    ========================================================
    */

    const [
        showHistoryModal,
        setShowHistoryModal,
    ] = useState(false);


    const [
        historyWorker,
        setHistoryWorker,
    ] = useState(null);


    const [
        salaryHistory,
        setSalaryHistory,
    ] = useState([]);


    const [
        loadingHistory,
        setLoadingHistory,
    ] = useState(false);


    const [
        historyError,
        setHistoryError,
    ] = useState("");


    /*
    ========================================================
    HISTORY DETAIL
    ========================================================
    */

    const [
        showHistoryDetails,
        setShowHistoryDetails,
    ] = useState(false);


    const [
        selectedHistoryLedger,
        setSelectedHistoryLedger,
    ] = useState(null);


    const [
        historyTransactions,
        setHistoryTransactions,
    ] = useState([]);


    const [
        loadingHistoryDetails,
        setLoadingHistoryDetails,
    ] = useState(false);


    /*
    ========================================================
    REPRINTING
    ========================================================
    */

    const [
        reprintingLedgerId,
        setReprintingLedgerId,
    ] = useState(null);


    /*
    ========================================================
    ERRORS
    ========================================================
    */

    const [
        error,
        setError,
    ] = useState("");


    const [
        payError,
        setPayError,
    ] = useState("");


    /*
    ========================================================
    LOAD WORKERS
    ========================================================
    */

    const loadWorkers =
        useCallback(
            async (
                manual = false
            ) => {

                try {

                    if (manual) {

                        setRefreshing(
                            true
                        );

                    } else {

                        setLoading(
                            true
                        );

                    }


                    setError("");


                    const accounts =
                        await ledgerService
                            .getAccounts({
                                type:
                                    "WORKER",
                            });


                    setWorkers(
                        Array.isArray(
                            accounts
                        )
                            ? accounts
                            : []
                    );


                } catch (err) {

                    console.error(
                        "Failed to load workers:",
                        err
                    );


                    setError(
                        err?.response
                            ?.data
                            ?.message ||
                        err?.message ||
                        "Failed to load workers."
                    );


                } finally {

                    setLoading(
                        false
                    );


                    setRefreshing(
                        false
                    );

                }

            },
            []
        );


    useEffect(
        () => {

            loadWorkers();

        },
        [
            loadWorkers,
        ]
    );


    /*
    ========================================================
    FILTER WORKERS
    ========================================================
    */

    const filteredWorkers =
        useMemo(
            () => {

                const searchValue =
                    search
                        .trim()
                        .toLowerCase();


                return workers.filter(
                    (
                        worker
                    ) => {

                        const name =
                            worker.name ||
                            "";


                        const phone =
                            worker.phone ||
                            "";


                        const matchesSearch =
                            !searchValue ||
                            name
                                .toLowerCase()
                                .includes(
                                    searchValue
                                ) ||
                            phone
                                .toLowerCase()
                                .includes(
                                    searchValue
                                );


                        const matchesStatus =
                            statusFilter ===
                            "ALL"
                                ? true
                                : statusFilter ===
                                  "ACTIVE"
                                    ? worker.isActive !==
                                      false
                                    : worker.isActive ===
                                      false;


                        const matchesFrequency =
                            frequencyFilter ===
                            "ALL"
                                ? true
                                : worker.payFrequency ===
                                  frequencyFilter;


                        const payrollStatus =
                            getWorkerPayrollStatus(
                                worker
                            );


                        const matchesPayroll =
                            payrollFilter ===
                            "ALL"
                                ? true
                                : payrollStatus.value ===
                                  payrollFilter;


                        return (
                            matchesSearch &&
                            matchesStatus &&
                            matchesFrequency &&
                            matchesPayroll
                        );

                    }
                );

            },
            [
                workers,
                search,
                statusFilter,
                frequencyFilter,
                payrollFilter,
            ]
        );


    /*
    ========================================================
    ADD WORKER
    ========================================================
    */

    const handleAddWorker =
        () => {

            setEditingWorker(
                null
            );


            setForm({
                ...DEFAULT_WORKER,
            });


            setError("");


            setShowWorkerModal(
                true
            );

        };


    /*
    ========================================================
    EDIT WORKER
    ========================================================
    */

    const handleEditWorker = (
        worker
    ) => {

        setEditingWorker(
            worker
        );


        setForm({

            name:
                worker.name ||
                "",

            phone:
                worker.phone ||
                "",

            type:
                "WORKER",

            salary:
                worker.salary ??
                "",

            payFrequency:
                worker.payFrequency ||
                "MONTHLY",

            payDay:
                worker.payDay ??
                "",

            payDayOfWeek:
                worker.payDayOfWeek ??
                "",

            salaryPeriod:
                worker.salaryPeriod ||
                "",

        });


        setError("");


        setShowWorkerModal(
            true
        );

    };


    /*
    ========================================================
    CLOSE WORKER MODAL
    ========================================================
    */

    const closeWorkerModal =
        () => {

            if (saving) {
                return;
            }


            setShowWorkerModal(
                false
            );


            setEditingWorker(
                null
            );


            setForm({
                ...DEFAULT_WORKER,
            });


            setError("");

        };


    /*
    ========================================================
    FORM CHANGE
    ========================================================
    */

    const handleChange = (
        event
    ) => {

        const {
            name,
            value,
        } =
            event.target;


        setForm(
            (
                previous
            ) => ({

                ...previous,

                [name]:
                    value,

            })
        );

    };


    /*
    ========================================================
    FREQUENCY CHANGE
    ========================================================
    */

    const handleFrequencyChange = (
        event
    ) => {

        const frequency =
            event.target.value;


        setForm(
            (
                previous
            ) => ({

                ...previous,

                payFrequency:
                    frequency,

                payDay:
                    frequency ===
                    "MONTHLY"
                        ? previous.payDay
                        : "",

                payDayOfWeek:
                    frequency ===
                    "WEEKLY"
                        ? previous.payDayOfWeek
                        : "",

            })
        );

    };


    /*
    ========================================================
    SAVE WORKER
    ========================================================
    */

    const handleSubmit =
        async (
            event
        ) => {

            event.preventDefault();


            setError("");


            const name =
                form.name.trim();


            if (!name) {

                setError(
                    "Worker name is required."
                );

                return;

            }


            const salary =
                form.salary ===
                ""
                    ? null
                    : Number(
                        form.salary
                    );


            if (
                salary === null ||
                Number.isNaN(
                    salary
                ) ||
                salary < 0
            ) {

                setError(
                    "Salary must be a valid amount."
                );

                return;

            }


            /*
            ------------------------------------------------
            MONTHLY
            ------------------------------------------------
            */

            if (
                form.payFrequency ===
                "MONTHLY"
            ) {

                const payDay =
                    Number(
                        form.payDay
                    );


                if (
                    !payDay ||
                    payDay < 1 ||
                    payDay > 31
                ) {

                    setError(
                        "Please select a valid monthly payday."
                    );

                    return;

                }

            }


            /*
            ------------------------------------------------
            WEEKLY
            ------------------------------------------------
            */

            if (
                form.payFrequency ===
                    "WEEKLY" &&
                form.payDayOfWeek ===
                    ""
            ) {

                setError(
                    "Please select a weekly payday."
                );

                return;

            }


            try {

                setSaving(
                    true
                );


                const payload = {

                    name,

                    phone:
                        form.phone.trim(),

                    type:
                        "WORKER",

                    salary,

                    payFrequency:
                        form.payFrequency,

                    payDay:
                        form.payFrequency ===
                        "MONTHLY"
                            ? Number(
                                form.payDay
                            )
                            : null,

                    payDayOfWeek:
                        form.payFrequency ===
                        "WEEKLY"
                            ? Number(
                                form.payDayOfWeek
                            )
                            : null,

                    salaryPeriod:
                        form.salaryPeriod
                            .trim(),

                };


                if (
                    editingWorker
                ) {

                    const id =
                        getAccountId(
                            editingWorker
                        );


                    await ledgerService
                        .updateAccount(
                            id,
                            payload
                        );

                } else {

                    await ledgerService
                        .createAccount(
                            payload
                        );

                }


                setShowWorkerModal(
                    false
                );


                setEditingWorker(
                    null
                );


                setForm({
                    ...DEFAULT_WORKER,
                });


                await loadWorkers();


            } catch (err) {

                console.error(
                    "Failed to save worker:",
                    err
                );


                setError(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to save worker."
                );


            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    DEACTIVATE WORKER
    ========================================================
    */

    const handleDeactivate =
        async (
            worker
        ) => {

            const id =
                getAccountId(
                    worker
                );


            if (!id) {
                return;
            }


            /*
            Prevent casual deactivation of a worker who
            still has an open payroll ledger.
            */

            if (
                worker?.currentWorkerLedger?.status ===
                "OPEN"
            ) {

                window.alert(
                    `${worker.name} still has an OPEN payroll ledger. Settle or review the ledger before deactivating this worker.`
                );

                return;

            }


            const confirmed =
                window.confirm(
                    `Deactivate ${worker.name}?\n\nThey will no longer appear in the Active Workers list.`
                );


            if (!confirmed) {
                return;
            }


            try {

                await ledgerService
                    .deactivateAccount(
                        id
                    );


                await loadWorkers();


            } catch (err) {

                console.error(
                    "Failed to deactivate worker:",
                    err
                );


                window.alert(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to deactivate worker."
                );

            }

        };


    /*
    ========================================================
    REACTIVATE WORKER
    ========================================================

    Uses the existing updateAccount service.

    If your backend has a dedicated reactivateAccount()
    endpoint later, replace only this function.
    ========================================================
    */

    const handleReactivate =
        async (
            worker
        ) => {

            const id =
                getAccountId(
                    worker
                );


            if (!id) {
                return;
            }


            const confirmed =
                window.confirm(
                    `Reactivate ${worker.name}?`
                );


            if (!confirmed) {
                return;
            }


            try {

                const payload = {

                    name:
                        worker.name ||
                        "",

                    phone:
                        worker.phone ||
                        "",

                    type:
                        "WORKER",

                    salary:
                        Number(
                            worker.salary
                        ) || 0,

                    payFrequency:
                        worker.payFrequency ||
                        "MONTHLY",

                    payDay:
                        worker.payFrequency ===
                        "MONTHLY"
                            ? Number(
                                worker.payDay
                            ) ||
                              null
                            : null,

                    payDayOfWeek:
                        worker.payFrequency ===
                        "WEEKLY"
                            ? Number(
                                worker.payDayOfWeek
                            )
                            : null,

                    salaryPeriod:
                        worker.salaryPeriod ||
                        "",

                    isActive:
                        true,

                };


                await ledgerService
                    .updateAccount(
                        id,
                        payload
                    );


                await loadWorkers();


            } catch (err) {

                console.error(
                    "Failed to reactivate worker:",
                    err
                );


                window.alert(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to reactivate worker."
                );

            }

        };


    /*
    ========================================================
    OPEN PAY WORKER
    ========================================================
    */

    const handleOpenPayWorker =
        async (
            worker
        ) => {

            const workerId =
                getAccountId(
                    worker
                );


            if (!workerId) {
                return;
            }


            setSelectedWorker(
                worker
            );


            setCurrentLedger(
                null
            );


            setPaymentDate(
                getTodayInputValue()
            );


            setPayError("");


            setShowFinalPayConfirm(
                false
            );


            setShowPayModal(
                true
            );


            try {

                setLoadingPayData(
                    true
                );


                const freshWorker =
                    await ledgerService
                        .getAccountById(
                            workerId
                        );


                if (
                    freshWorker
                ) {

                    setSelectedWorker(
                        freshWorker
                    );

                }


                let ledger =
                    freshWorker
                        ?.currentWorkerLedger ||
                    null;


                /*
                ------------------------------------------------
                FALLBACK
                ------------------------------------------------
                */

                if (!ledger) {

                    const history =
                        await ledgerService
                            .getWorkerMonths(
                                workerId
                            );


                    if (
                        Array.isArray(
                            history
                        )
                    ) {

                        ledger =
                            history.find(
                                (
                                    item
                                ) =>
                                    item?.status ===
                                    "OPEN"
                            ) ||
                            null;

                    }

                }


                setCurrentLedger(
                    ledger
                );


                if (!ledger) {

                    setPayError(
                        "This worker does not have an OPEN ledger to pay."
                    );

                }


            } catch (err) {

                console.error(
                    "Failed to load worker payment information:",
                    err
                );


                setPayError(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to load worker payment information."
                );


            } finally {

                setLoadingPayData(
                    false
                );

            }

        };


    /*
    ========================================================
    CLOSE PAY MODAL
    ========================================================
    */

    const closePayModal =
        () => {

            if (paying) {
                return;
            }


            setShowPayModal(
                false
            );


            setShowFinalPayConfirm(
                false
            );


            setSelectedWorker(
                null
            );


            setCurrentLedger(
                null
            );


            setPayError("");


            setPaymentDate(
                getTodayInputValue()
            );

        };


    /*
    ========================================================
    PAYMENT CALCULATION
    ========================================================
    */

    const ledgerSalary =
        getLedgerSalary(
            selectedWorker,
            currentLedger
        );


    const ledgerCredits =
        getLedgerCredits(
            currentLedger
        );


    const ledgerCashAdvances =
        getLedgerCashAdvances(
            currentLedger
        );


    const calculatedSalaryRelease =
        calculateLedgerNetPay(
            selectedWorker,
            currentLedger
        );


    const excessDeductions =
        calculateExcessDeductions(
            selectedWorker,
            currentLedger
        );


    const currentWorkerSalary =
        Number(
            selectedWorker?.salary
        ) || 0;


    const hasSalarySnapshotDifference =
        Boolean(
            currentLedger &&
            currentLedger.salary !==
                undefined &&
            Number(
                currentLedger.salary
            ) !==
                currentWorkerSalary
        );


    /*
    ========================================================
    VALIDATE PAYMENT
    ========================================================
    */

    const validatePayment =
        () => {

            if (
                !selectedWorker
            ) {

                setPayError(
                    "Worker is missing."
                );

                return false;

            }


            if (
                !currentLedger
            ) {

                setPayError(
                    "This worker does not have an OPEN ledger to pay."
                );

                return false;

            }


            if (
                currentLedger.status &&
                currentLedger.status !==
                "OPEN"
            ) {

                setPayError(
                    "This payroll ledger is no longer OPEN."
                );

                return false;

            }


            if (
                !paymentDate
            ) {

                setPayError(
                    "Please select the payment date."
                );

                return false;

            }


            const payment =
                parseLocalInputDate(
                    paymentDate
                );


            if (!payment) {

                setPayError(
                    "The payment date is invalid."
                );

                return false;

            }


            const today =
                startOfDay(
                    new Date()
                );


            if (
                payment.getTime() >
                today.getTime()
            ) {

                setPayError(
                    "Payment date cannot be in the future."
                );

                return false;

            }


            if (
                currentLedger.periodStart
            ) {

                const periodStart =
                    startOfDay(
                        currentLedger.periodStart
                    );


                if (
                    payment.getTime() <
                    periodStart.getTime()
                ) {

                    setPayError(
                        "Payment date cannot be before the payroll period started."
                    );

                    return false;

                }

            }


            setPayError(
                ""
            );


            return true;

        };


    /*
    ========================================================
    PAY WORKER
    ========================================================

    First click opens the final confirmation.
    ========================================================
    */

    const handlePayWorker =
        () => {

            if (
                !validatePayment()
            ) {
                return;
            }


            setShowFinalPayConfirm(
                true
            );

        };


    /*
    ========================================================
    EXECUTE PAY WORKER
    ========================================================
    */

    const executePayWorker =
        async () => {

            if (
                !validatePayment()
            ) {
                return;
            }


            const workerId =
                getAccountId(
                    selectedWorker
                );


            const ledgerId =
                getLedgerId(
                    currentLedger
                );


            if (!workerId) {

                setPayError(
                    "Worker ID is missing."
                );

                return;

            }


            if (!ledgerId) {

                setPayError(
                    "Worker ledger ID is missing."
                );

                return;

            }


            try {

                setPaying(
                    true
                );


                setPayError("");


                /*
                IMPORTANT:

                Backend should atomically verify:

                status === OPEN

                before changing this ledger to PAID.
                */

                const result =
                    await ledgerService
                        .payWorker(
                            workerId,
                            {
                                ledgerId,
                                paymentDate,
                            }
                        );


                await loadWorkers();


                setShowFinalPayConfirm(
                    false
                );


                setShowPayModal(
                    false
                );


                setSelectedWorker(
                    null
                );


                setCurrentLedger(
                    null
                );


                if (
                    result?.printSuccess ===
                    false
                ) {

                    window.alert(
                        "Worker payment completed, but the receipt failed to print. You can reprint it from Salary History."
                    );

                } else {

                    window.alert(
                        "Worker payment completed successfully."
                    );

                }


            } catch (err) {

                console.error(
                    "Failed to pay worker:",
                    err
                );


                setShowFinalPayConfirm(
                    false
                );


                setPayError(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to pay worker."
                );


            } finally {

                setPaying(
                    false
                );

            }

        };


    /*
    ========================================================
    OPEN LEDGER
    ========================================================
    */

    const handleViewLedger = (
        worker
    ) => {

        const workerId =
            getAccountId(
                worker
            );


        if (!workerId) {
            return;
        }


        navigate(
            `/ledger?worker=${workerId}`
        );

    };


    /*
    ========================================================
    OPEN SALARY HISTORY
    ========================================================
    */

    const handleOpenHistory =
        async (
            worker
        ) => {

            const workerId =
                getAccountId(
                    worker
                );


            if (!workerId) {
                return;
            }


            setHistoryWorker(
                worker
            );


            setSalaryHistory(
                []
            );


            setHistoryError(
                ""
            );


            setShowHistoryModal(
                true
            );


            setShowHistoryDetails(
                false
            );


            setSelectedHistoryLedger(
                null
            );


            setHistoryTransactions(
                []
            );


            try {

                setLoadingHistory(
                    true
                );


                const history =
                    await ledgerService
                        .getWorkerMonths(
                            workerId
                        );


                const ledgers =
                    Array.isArray(
                        history
                    )
                        ? history
                        : [];


                const paidLedgers =
                    ledgers
                        .filter(
                            (
                                ledger
                            ) =>
                                ledger.status ===
                                "PAID"
                        )
                        .sort(
                            (
                                a,
                                b
                            ) => {

                                const aDate =
                                    new Date(
                                        a.paidAt ||
                                        a.periodEnd ||
                                        a.createdAt ||
                                        0
                                    ).getTime();


                                const bDate =
                                    new Date(
                                        b.paidAt ||
                                        b.periodEnd ||
                                        b.createdAt ||
                                        0
                                    ).getTime();


                                return (
                                    bDate -
                                    aDate
                                );

                            }
                        );


                setSalaryHistory(
                    paidLedgers
                );


            } catch (err) {

                console.error(
                    "Failed to load salary history:",
                    err
                );


                setHistoryError(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to load salary history."
                );


            } finally {

                setLoadingHistory(
                    false
                );

            }

        };


    /*
    ========================================================
    CLOSE HISTORY
    ========================================================
    */

    const closeHistoryModal =
        () => {

            if (
                loadingHistory ||
                loadingHistoryDetails ||
                reprintingLedgerId
            ) {
                return;
            }


            setShowHistoryModal(
                false
            );


            setHistoryWorker(
                null
            );


            setSalaryHistory(
                []
            );


            setHistoryError(
                ""
            );


            setShowHistoryDetails(
                false
            );


            setSelectedHistoryLedger(
                null
            );


            setHistoryTransactions(
                []
            );

        };


    /*
    ========================================================
    VIEW HISTORY DETAILS
    ========================================================
    */

    const handleViewHistoryDetails =
        async (
            ledger
        ) => {

            if (
                !historyWorker ||
                !ledger
            ) {
                return;
            }


            const workerId =
                getAccountId(
                    historyWorker
                );


            const ledgerId =
                getLedgerId(
                    ledger
                );


            if (
                !workerId ||
                !ledgerId
            ) {
                return;
            }


            try {

                setLoadingHistoryDetails(
                    true
                );


                setHistoryError(
                    ""
                );


                const periodDate =
                    ledger.periodStart
                        ? new Date(
                            ledger.periodStart
                        )
                        : new Date();


                const year =
                    Number(
                        ledger.year
                    ) ||
                    periodDate.getFullYear();


                const month =
                    Number(
                        ledger.month
                    ) ||
                    (
                        periodDate.getMonth() +
                        1
                    );


                const result =
                    await ledgerService
                        .getWorkerMonth(
                            workerId,
                            year,
                            month,
                            ledgerId
                        );


                const actualLedger =
                    result?.ledger ||
                    result?.data
                        ?.ledger ||
                    ledger;


                const transactions =
                    Array.isArray(
                        result?.transactions
                    )
                        ? result.transactions
                        : Array.isArray(
                            result?.data
                                ?.transactions
                        )
                            ? result.data.transactions
                            : [];


                setSelectedHistoryLedger(
                    actualLedger
                );


                setHistoryTransactions(
                    transactions
                );


                setShowHistoryDetails(
                    true
                );


            } catch (err) {

                console.error(
                    "Failed to load salary history details:",
                    err
                );


                setHistoryError(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to load salary details."
                );


            } finally {

                setLoadingHistoryDetails(
                    false
                );

            }

        };


    /*
    ========================================================
    CLOSE HISTORY DETAILS
    ========================================================
    */

    const closeHistoryDetails =
        () => {

            if (
                loadingHistoryDetails ||
                reprintingLedgerId
            ) {
                return;
            }


            setShowHistoryDetails(
                false
            );


            setSelectedHistoryLedger(
                null
            );


            setHistoryTransactions(
                []
            );

        };


    /*
    ========================================================
    REPRINT SPECIFIC SALARY RECEIPT
    ========================================================
    */

    const handleReprintHistoryReceipt =
        async (
            ledger
        ) => {

            if (
                !historyWorker
            ) {
                return;
            }


            const workerId =
                getAccountId(
                    historyWorker
                );


            const ledgerId =
                getLedgerId(
                    ledger
                );


            if (
                !workerId ||
                !ledgerId
            ) {

                window.alert(
                    "Worker or ledger ID is missing."
                );

                return;

            }


            const confirmed =
                window.confirm(
                    `Reprint salary receipt for ${historyWorker.name}?\n\n${getLedgerPeriodLabel(
                        ledger
                    )}`
                );


            if (!confirmed) {
                return;
            }


            try {

                setReprintingLedgerId(
                    ledgerId
                );


                await ledgerService
                    .reprintWorkerSalaryReceipt(
                        workerId,
                        ledgerId
                    );


                window.alert(
                    "Salary receipt reprinted successfully."
                );


            } catch (err) {

                console.error(
                    "Failed to reprint salary receipt:",
                    err
                );


                window.alert(
                    err?.response
                        ?.data
                        ?.message ||
                    err?.message ||
                    "Failed to reprint salary receipt."
                );


            } finally {

                setReprintingLedgerId(
                    null
                );

            }

        };


    /*
    ========================================================
    SUMMARY
    ========================================================
    */

    const payrollSummary =
        useMemo(
            () => {

                let activeWorkers =
                    0;


                let dueToday =
                    0;


                let overdue =
                    0;


                let payrollDue =
                    0;


                for (
                    const worker
                    of workers
                ) {

                    if (
                        worker.isActive ===
                        false
                    ) {
                        continue;
                    }


                    activeWorkers++;


                    const payrollStatus =
                        getWorkerPayrollStatus(
                            worker
                        );


                    if (
                        payrollStatus.value ===
                        "DUE"
                    ) {
                        dueToday++;
                    }


                    if (
                        payrollStatus.value ===
                        "OVERDUE"
                    ) {
                        overdue++;
                    }


                    if (
                        worker
                            ?.currentWorkerLedger
                            ?.status ===
                        "OPEN"
                    ) {

                        payrollDue +=
                            calculateLedgerNetPay(
                                worker,
                                worker.currentWorkerLedger
                            );

                    }

                }


                return {
                    activeWorkers,
                    dueToday,
                    overdue,
                    payrollDue,
                };

            },
            [
                workers,
            ]
        );


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <div className="space-y-6 p-4 md:p-6">


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                <div>

                    <h1 className="text-2xl font-bold">
                        Workers & Salary
                    </h1>


                    <p className="mt-1 text-sm text-base-content/60">
                        Manage workers, payroll schedules, deductions, salary payments and salary history.
                    </p>

                </div>


                <div className="flex flex-wrap gap-2">

                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() =>
                            loadWorkers(
                                true
                            )
                        }
                        disabled={
                            refreshing
                        }
                    >

                        <FaSyncAlt
                            className={
                                refreshing
                                    ? "animate-spin"
                                    : ""
                            }
                        />


                        {refreshing
                            ? "Refreshing"
                            : "Refresh"}

                    </button>


                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={
                            handleAddWorker
                        }
                    >

                        <FaUserPlus />

                        Add Worker

                    </button>

                </div>

            </div>


            {/* ==================================================
                PAYROLL SUMMARY
            ================================================== */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <SummaryCard
                    label="Active Workers"
                    value={
                        payrollSummary
                            .activeWorkers
                    }
                    description="Currently active workers"
                    icon={
                        FaUsers
                    }
                    iconClass="bg-primary/10 text-primary"
                />


                <SummaryCard
                    label="Due Today"
                    value={
                        payrollSummary
                            .dueToday
                    }
                    description="Payroll scheduled for today"
                    icon={
                        FaCalendarCheck
                    }
                    iconClass="bg-warning/10 text-warning"
                />


                <SummaryCard
                    label="Overdue Payroll"
                    value={
                        payrollSummary
                            .overdue
                    }
                    description="Workers past their scheduled payday"
                    icon={
                        FaExclamationTriangle
                    }
                    iconClass="bg-error/10 text-error"
                />


                <SummaryCard
                    label="Payroll Amount Due"
                    value={
                        formatCurrency(
                            payrollSummary
                                .payrollDue
                        )
                    }
                    description="Net amount on all open ledgers"
                    icon={
                        FaMoneyBillWave
                    }
                    iconClass="bg-success/10 text-success"
                />

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error &&
                !showWorkerModal &&
                !showPayModal && (

                <div className="alert alert-error">

                    <span>
                        {error}
                    </span>

                </div>

            )}


            {/* ==================================================
                FILTERS
            ================================================== */}

            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">

                <div className="mb-3 flex items-center gap-2">

                    <FaFilter className="text-base-content/40" />

                    <span className="text-sm font-semibold">
                        Filters
                    </span>

                </div>


                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

                    <div className="relative">

                        <FaSearch
                            className="
                                absolute
                                left-3
                                top-1/2
                                -translate-y-1/2
                                text-sm
                                text-base-content/35
                            "
                        />


                        <input
                            type="text"
                            className="input input-bordered w-full pl-9"
                            placeholder="Search worker or phone..."
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />

                    </div>


                    <select
                        className="select select-bordered w-full"
                        value={
                            statusFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setStatusFilter(
                                event
                                    .target
                                    .value
                            )
                        }
                    >

                        <option value="ACTIVE">
                            Active Workers
                        </option>

                        <option value="INACTIVE">
                            Inactive Workers
                        </option>

                        <option value="ALL">
                            All Workers
                        </option>

                    </select>


                    <select
                        className="select select-bordered w-full"
                        value={
                            frequencyFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setFrequencyFilter(
                                event
                                    .target
                                    .value
                            )
                        }
                    >

                        <option value="ALL">
                            All Pay Frequencies
                        </option>

                        <option value="WEEKLY">
                            Weekly
                        </option>

                        <option value="MONTHLY">
                            Monthly
                        </option>

                    </select>


                    <select
                        className="select select-bordered w-full"
                        value={
                            payrollFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setPayrollFilter(
                                event
                                    .target
                                    .value
                            )
                        }
                    >

                        <option value="ALL">
                            All Payroll Statuses
                        </option>

                        <option value="DUE">
                            Due Today
                        </option>

                        <option value="OVERDUE">
                            Overdue
                        </option>

                        <option value="UPCOMING">
                            Upcoming
                        </option>

                        <option value="PAID">
                            Paid
                        </option>

                        <option value="NO_LEDGER">
                            No Ledger
                        </option>

                    </select>

                </div>

            </div>


            {/* ==================================================
                COUNT
            ================================================== */}

            <div className="text-sm text-base-content/60">

                Showing{" "}

                <span className="font-semibold text-base-content">

                    {
                        filteredWorkers.length
                    }

                </span>

                {" "}worker

                {
                    filteredWorkers.length !==
                    1
                        ? "s"
                        : ""
                }

            </div>


            {/* ==================================================
                WORKERS TABLE
            ================================================== */}

            <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100 shadow-sm">

                <table className="table">

                    <thead>

                        <tr>

                            <th>
                                Worker
                            </th>

                            <th>
                                Salary
                            </th>

                            <th>
                                Frequency
                            </th>

                            <th>
                                Current Period
                            </th>

                            <th>
                                Due Date
                            </th>

                            <th>
                                Net Pay Due
                            </th>

                            <th>
                                Payroll Status
                            </th>

                            <th className="text-right">
                                Actions
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {loading ? (

                            <tr>

                                <td
                                    colSpan="8"
                                    className="py-14 text-center"
                                >

                                    <span className="loading loading-spinner loading-md" />


                                    <div className="mt-2 text-sm text-base-content/60">
                                        Loading workers...
                                    </div>

                                </td>

                            </tr>

                        ) : filteredWorkers.length ===
                            0 ? (

                            <tr>

                                <td
                                    colSpan="8"
                                    className="py-14 text-center"
                                >

                                    <FaUsers className="mx-auto text-4xl text-base-content/15" />


                                    <div className="mt-3 font-semibold">
                                        No workers found
                                    </div>


                                    <div className="mt-1 text-sm text-base-content/60">
                                        Try changing the filters or add a new worker.
                                    </div>

                                </td>

                            </tr>

                        ) : (

                            filteredWorkers.map(
                                (
                                    worker
                                ) => {

                                    const current =
                                        worker
                                            .currentWorkerLedger;


                                    const payrollStatus =
                                        getWorkerPayrollStatus(
                                            worker
                                        );


                                    const dueDate =
                                        current
                                            ? getLedgerDueDate(
                                                worker,
                                                current
                                            )
                                            : null;


                                    const netPay =
                                        current
                                            ? calculateLedgerNetPay(
                                                worker,
                                                current
                                            )
                                            : 0;


                                    return (

                                        <tr
                                            key={
                                                getAccountId(
                                                    worker
                                                )
                                            }
                                            className="hover"
                                        >


                                            {/* WORKER */}

                                            <td>

                                                <div className="flex items-center gap-3">

                                                    <div className="avatar placeholder">

                                                        <div className="w-10 rounded-full bg-primary text-primary-content">

                                                            <span>

                                                                {(
                                                                    worker.name ||
                                                                    "W"
                                                                )
                                                                    .charAt(
                                                                        0
                                                                    )
                                                                    .toUpperCase()}

                                                            </span>

                                                        </div>

                                                    </div>


                                                    <div>

                                                        <div className="font-semibold">

                                                            {
                                                                worker.name
                                                            }

                                                        </div>


                                                        <div className="text-xs text-base-content/45">

                                                            {
                                                                worker.phone ||
                                                                "No phone"
                                                            }

                                                        </div>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* SALARY */}

                                            <td>

                                                <div className="font-semibold">

                                                    {
                                                        formatCurrency(
                                                            worker.salary
                                                        )
                                                    }

                                                </div>


                                                <div className="mt-1 text-[10px] text-base-content/40">

                                                    {
                                                        getPaydayText(
                                                            worker
                                                        )
                                                    }

                                                </div>

                                            </td>


                                            {/* FREQUENCY */}

                                            <td>

                                                {worker.payFrequency ===
                                                    "WEEKLY" ? (

                                                    <span className="badge badge-info badge-outline">
                                                        Weekly
                                                    </span>

                                                ) : (

                                                    <span className="badge badge-primary badge-outline">
                                                        Monthly
                                                    </span>

                                                )}

                                            </td>


                                            {/* CURRENT PERIOD */}

                                            <td>

                                                {current ? (

                                                    <>

                                                        <div className="text-sm font-medium">

                                                            {
                                                                getLedgerPeriodLabel(
                                                                    current
                                                                )
                                                            }

                                                        </div>


                                                        <div className="mt-1 text-[10px] text-base-content/40">
                                                            OPEN ledger
                                                        </div>

                                                    </>

                                                ) : (

                                                    <span className="text-sm text-base-content/40">
                                                        —
                                                    </span>

                                                )}

                                            </td>


                                            {/* DUE DATE */}

                                            <td>

                                                {dueDate ? (

                                                    <>

                                                        <div className="text-sm font-medium">

                                                            {
                                                                formatDate(
                                                                    dueDate
                                                                )
                                                            }

                                                        </div>


                                                        <div className="mt-1 text-[10px] text-base-content/40">

                                                            {
                                                                getPaydayText(
                                                                    worker
                                                                )
                                                            }

                                                        </div>

                                                    </>

                                                ) : (

                                                    <span className="text-sm text-base-content/40">
                                                        —
                                                    </span>

                                                )}

                                            </td>


                                            {/* NET PAY */}

                                            <td>

                                                {current ? (

                                                    <span className="font-bold text-success">

                                                        {
                                                            formatCurrency(
                                                                netPay
                                                            )
                                                        }

                                                    </span>

                                                ) : (

                                                    <span className="text-base-content/40">
                                                        —
                                                    </span>

                                                )}

                                            </td>


                                            {/* STATUS */}

                                            <td>

                                                <span
                                                    className={
                                                        payrollStatus.className
                                                    }
                                                >

                                                    {
                                                        payrollStatus.label
                                                    }

                                                </span>

                                            </td>


                                            {/* ACTIONS */}

                                            <td>

                                                <div className="flex items-center justify-end gap-2">

                                                    {worker.isActive !==
                                                        false &&
                                                        current && (

                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-success"
                                                            onClick={() =>
                                                                handleOpenPayWorker(
                                                                    worker
                                                                )
                                                            }
                                                        >

                                                            <FaWallet />

                                                            Pay

                                                        </button>

                                                    )}


                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() =>
                                                            handleViewLedger(
                                                                worker
                                                            )
                                                        }
                                                    >

                                                        <FaBook />

                                                        Ledger

                                                    </button>


                                                    <details className="dropdown dropdown-end">

                                                        <summary className="btn btn-sm btn-ghost btn-square">

                                                            <FaEllipsisV />

                                                        </summary>


                                                        <ul
                                                            className="
                                                                menu
                                                                dropdown-content
                                                                z-[20]
                                                                mt-2
                                                                w-52
                                                                rounded-box
                                                                border
                                                                border-base-300
                                                                bg-base-100
                                                                p-2
                                                                shadow-xl
                                                            "
                                                        >

                                                            <li>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOpenHistory(
                                                                            worker
                                                                        )
                                                                    }
                                                                >

                                                                    <FaHistory />

                                                                    Salary History

                                                                </button>

                                                            </li>


                                                            <li>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleEditWorker(
                                                                            worker
                                                                        )
                                                                    }
                                                                >

                                                                    <FaEdit />

                                                                    Edit Worker

                                                                </button>

                                                            </li>


                                                            {worker.isActive !==
                                                            false ? (

                                                                <li>

                                                                    <button
                                                                        type="button"
                                                                        className="text-error"
                                                                        onClick={() =>
                                                                            handleDeactivate(
                                                                                worker
                                                                            )
                                                                        }
                                                                    >

                                                                        <FaUserSlash />

                                                                        Deactivate

                                                                    </button>

                                                                </li>

                                                            ) : (

                                                                <li>

                                                                    <button
                                                                        type="button"
                                                                        className="text-success"
                                                                        onClick={() =>
                                                                            handleReactivate(
                                                                                worker
                                                                            )
                                                                        }
                                                                    >

                                                                        <FaUserCheck />

                                                                        Reactivate

                                                                    </button>

                                                                </li>

                                                            )}

                                                        </ul>

                                                    </details>

                                                </div>

                                            </td>

                                        </tr>

                                    );

                                }
                            )

                        )}

                    </tbody>

                </table>

            </div>


            {/* ==================================================
                ADD / EDIT WORKER MODAL
            ================================================== */}

            {showWorkerModal && (

                <dialog
                    open
                    className="modal modal-open"
                >

                    <div className="modal-box max-w-lg">

                        <div className="flex items-start justify-between">

                            <div>

                                <h3 className="text-xl font-bold">

                                    {
                                        editingWorker
                                            ? "Edit Worker"
                                            : "Add Worker"
                                    }

                                </h3>


                                <p className="mt-1 text-sm text-base-content/60">

                                    {
                                        editingWorker
                                            ? "Update worker information and payroll schedule."
                                            : "Create a worker and configure their payroll schedule."
                                    }

                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={
                                    closeWorkerModal
                                }
                                disabled={
                                    saving
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        {error && (

                            <div className="alert alert-error mt-4">

                                <span>
                                    {error}
                                </span>

                            </div>

                        )}


                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="mt-5 space-y-4"
                        >


                            {/* NAME */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Worker Name
                                    </span>

                                </label>


                                <input
                                    type="text"
                                    name="name"
                                    className="input input-bordered w-full"
                                    placeholder="Juan Dela Cruz"
                                    value={
                                        form.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                />

                            </div>


                            {/* PHONE */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Phone Number
                                    </span>

                                </label>


                                <input
                                    type="text"
                                    name="phone"
                                    className="input input-bordered w-full"
                                    placeholder="09171234567"
                                    value={
                                        form.phone
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                            </div>


                            {/* SALARY */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Salary
                                    </span>

                                </label>


                                <label className="input input-bordered flex items-center gap-2">

                                    <span>
                                        ₱
                                    </span>


                                    <input
                                        type="number"
                                        name="salary"
                                        className="grow"
                                        min="0"
                                        step="0.01"
                                        value={
                                            form.salary
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />

                                </label>

                            </div>


                            {/* FREQUENCY */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Pay Frequency
                                    </span>

                                </label>


                                <select
                                    name="payFrequency"
                                    className="select select-bordered w-full"
                                    value={
                                        form.payFrequency
                                    }
                                    onChange={
                                        handleFrequencyChange
                                    }
                                >

                                    <option value="MONTHLY">
                                        Monthly
                                    </option>

                                    <option value="WEEKLY">
                                        Weekly
                                    </option>

                                </select>

                            </div>


                            {/* MONTHLY */}

                            {form.payFrequency ===
                                "MONTHLY" && (

                                <div>

                                    <label className="label">

                                        <span className="label-text font-medium">
                                            Monthly Payday
                                        </span>

                                    </label>


                                    <select
                                        name="payDay"
                                        className="select select-bordered w-full"
                                        value={
                                            form.payDay
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    >

                                        <option value="">
                                            Select day
                                        </option>


                                        {Array.from(
                                            {
                                                length:
                                                    31,
                                            },
                                            (
                                                _,
                                                index
                                            ) => {

                                                const day =
                                                    index +
                                                    1;


                                                return (

                                                    <option
                                                        key={
                                                            day
                                                        }
                                                        value={
                                                            day
                                                        }
                                                    >

                                                        {day}
                                                        {
                                                            getOrdinalSuffix(
                                                                day
                                                            )
                                                        }

                                                    </option>

                                                );

                                            }
                                        )}

                                    </select>


                                    <div className="mt-2 rounded-lg bg-base-200 px-3 py-2 text-xs text-base-content/60">

                                        For months without the selected date, payroll falls on the final calendar day of that month.

                                    </div>

                                </div>

                            )}


                            {/* WEEKLY */}

                            {form.payFrequency ===
                                "WEEKLY" && (

                                <div>

                                    <label className="label">

                                        <span className="label-text font-medium">
                                            Weekly Payday
                                        </span>

                                    </label>


                                    <select
                                        name="payDayOfWeek"
                                        className="select select-bordered w-full"
                                        value={
                                            form.payDayOfWeek
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    >

                                        <option value="">
                                            Select day
                                        </option>


                                        {WEEK_DAYS.map(
                                            (
                                                day
                                            ) => (

                                                <option
                                                    key={
                                                        day.value
                                                    }
                                                    value={
                                                        day.value
                                                    }
                                                >

                                                    {
                                                        day.label
                                                    }

                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                            )}


                            {/* PERIOD LABEL */}

                            <div>

                                <label className="label">

                                    <span className="label-text font-medium">
                                        Salary Period Label
                                    </span>

                                </label>


                                <input
                                    type="text"
                                    name="salaryPeriod"
                                    className="input input-bordered w-full"
                                    placeholder="Optional"
                                    value={
                                        form.salaryPeriod
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                            </div>


                            {editingWorker &&
                                editingWorker
                                    ?.currentWorkerLedger
                                    ?.status ===
                                "OPEN" && (

                                <div className="alert alert-warning">

                                    <FaInfoCircle />

                                    <span className="text-sm">

                                        This worker already has an OPEN payroll ledger. Changing the worker's current salary should not change that ledger's salary snapshot.

                                    </span>

                                </div>

                            )}


                            <div className="modal-action">

                                <button
                                    type="button"
                                    className="btn"
                                    onClick={
                                        closeWorkerModal
                                    }
                                    disabled={
                                        saving
                                    }
                                >

                                    Cancel

                                </button>


                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        saving
                                    }
                                >

                                    {saving ? (

                                        <>
                                            <span className="loading loading-spinner loading-sm" />
                                            Saving...
                                        </>

                                    ) : editingWorker ? (

                                        "Save Changes"

                                    ) : (

                                        "Create Worker"

                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </dialog>

            )}


            {/* ==================================================
                PAY WORKER MODAL
            ================================================== */}

            {showPayModal &&
                selectedWorker && (

                <dialog
                    open
                    className="modal modal-open"
                >

                    <div className="modal-box max-w-xl">

                        <div className="flex items-start justify-between gap-4">

                            <div>

                                <h3 className="text-xl font-bold">
                                    Pay Worker
                                </h3>


                                <p className="mt-1 text-sm text-base-content/60">
                                    Review payroll details before payment.
                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={
                                    closePayModal
                                }
                                disabled={
                                    paying
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        <div className="mt-5 rounded-xl border border-base-300 bg-base-200 p-4">

                            <div className="text-lg font-bold">

                                {
                                    selectedWorker.name
                                }

                            </div>


                            <div className="mt-1 text-sm text-base-content/60">

                                {
                                    selectedWorker.payFrequency ===
                                    "WEEKLY"
                                        ? "Weekly worker"
                                        : "Monthly worker"
                                }

                                {" • "}

                                {
                                    getPaydayText(
                                        selectedWorker
                                    )
                                }

                            </div>

                        </div>


                        {loadingPayData ? (

                            <LoadingBlock
                                text="Loading current ledger..."
                            />

                        ) : currentLedger ? (

                            <>

                                {/* LEDGER INFORMATION */}

                                <div className="mt-4 rounded-xl border border-base-300 p-4">

                                    <div className="mb-3 flex items-center justify-between">

                                        <div className="font-semibold">
                                            Current Payroll Ledger
                                        </div>


                                        <span className="badge badge-warning">
                                            OPEN
                                        </span>

                                    </div>


                                    <InfoRow
                                        label="Period"
                                        value={
                                            getLedgerPeriodLabel(
                                                currentLedger
                                            )
                                        }
                                    />


                                    <InfoRow
                                        label="Scheduled Payday"
                                        value={
                                            formatDate(
                                                getLedgerDueDate(
                                                    selectedWorker,
                                                    currentLedger
                                                )
                                            )
                                        }
                                    />


                                    <InfoRow
                                        label="Current Worker Salary"
                                        value={
                                            formatCurrency(
                                                currentWorkerSalary
                                            )
                                        }
                                    />


                                    <InfoRow
                                        label="Ledger Salary Snapshot"
                                        value={
                                            formatCurrency(
                                                ledgerSalary
                                            )
                                        }
                                    />

                                </div>


                                {/* SALARY SNAPSHOT WARNING */}

                                {hasSalarySnapshotDifference && (

                                    <div className="alert alert-warning mt-4">

                                        <FaExclamationTriangle />


                                        <span className="text-sm">

                                            The worker's current salary is{" "}

                                            <strong>
                                                {
                                                    formatCurrency(
                                                        currentWorkerSalary
                                                    )
                                                }
                                            </strong>

                                            , but this payroll period uses the saved ledger salary of{" "}

                                            <strong>
                                                {
                                                    formatCurrency(
                                                        ledgerSalary
                                                    )
                                                }
                                            </strong>

                                            . The ledger amount will be used for this payment.

                                        </span>

                                    </div>

                                )}


                                {/* SALARY CALCULATION */}

                                <div className="mt-4 overflow-hidden rounded-xl border border-base-300">

                                    <div className="bg-base-200 px-4 py-3 font-semibold">
                                        Salary Calculation
                                    </div>


                                    <div className="space-y-3 p-4">

                                        <AmountRow
                                            label="Salary"
                                            value={
                                                ledgerSalary
                                            }
                                        />


                                        <AmountRow
                                            label="Credit Purchases"
                                            value={
                                                ledgerCredits
                                            }
                                            negative
                                        />


                                        <AmountRow
                                            label="Cash Advances"
                                            value={
                                                ledgerCashAdvances
                                            }
                                            negative
                                        />


                                        <div className="divider my-1" />


                                        <div className="flex items-center justify-between">

                                            <span className="font-bold">
                                                Salary to Release
                                            </span>


                                            <span className="text-xl font-bold text-success">

                                                {
                                                    formatCurrency(
                                                        calculatedSalaryRelease
                                                    )
                                                }

                                            </span>

                                        </div>

                                    </div>

                                </div>


                                {/* EXCESS DEDUCTIONS */}

                                {excessDeductions >
                                    0 && (

                                    <div className="alert alert-warning mt-4">

                                        <FaExclamationTriangle />


                                        <div>

                                            <div className="font-semibold">
                                                Deductions exceed salary
                                            </div>


                                            <div className="mt-1 text-sm">

                                                Excess deductions:{" "}

                                                <strong>
                                                    {
                                                        formatCurrency(
                                                            excessDeductions
                                                        )
                                                    }
                                                </strong>

                                                . Salary release is therefore ₱0.00. Your backend should explicitly define whether this excess balance carries forward.

                                            </div>

                                        </div>

                                    </div>

                                )}


                                {/* PAYMENT DATE */}

                                <div className="mt-4">

                                    <label className="label">

                                        <span className="label-text font-medium">
                                            Payment Date
                                        </span>

                                    </label>


                                    <input
                                        type="date"
                                        className="input input-bordered w-full"
                                        value={
                                            paymentDate
                                        }
                                        max={
                                            getTodayInputValue()
                                        }
                                        onChange={(
                                            event
                                        ) => {

                                            setPaymentDate(
                                                event.target.value
                                            );


                                            setPayError(
                                                ""
                                            );

                                        }}
                                    />

                                </div>


                                <div className="alert alert-info mt-4">

                                    <FaReceipt />


                                    <span className="text-sm">

                                        After the backend confirms payment, the salary receipt will be sent to the configured XPrinter. Failed receipts can be reprinted from Salary History.

                                    </span>

                                </div>

                            </>

                        ) : (

                            <div className="alert alert-warning mt-4">

                                <FaExclamationTriangle />


                                <span>
                                    This worker does not have an OPEN ledger to pay.
                                </span>

                            </div>

                        )}


                        {payError && (

                            <div className="alert alert-error mt-4">

                                <span>
                                    {payError}
                                </span>

                            </div>

                        )}


                        <div className="modal-action">

                            <button
                                type="button"
                                className="btn"
                                onClick={
                                    closePayModal
                                }
                                disabled={
                                    paying
                                }
                            >

                                Cancel

                            </button>


                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={
                                    handlePayWorker
                                }
                                disabled={
                                    paying ||
                                    loadingPayData ||
                                    !currentLedger
                                }
                            >

                                <FaCheck />


                                {calculatedSalaryRelease >
                                0
                                    ? `Review Payment ${formatCurrency(
                                        calculatedSalaryRelease
                                    )}`
                                    : "Review Payroll Close ₱0.00"}

                            </button>

                        </div>

                    </div>

                </dialog>

            )}


            {/* ==================================================
                FINAL PAY CONFIRMATION
            ================================================== */}

            {showFinalPayConfirm &&
                selectedWorker &&
                currentLedger && (

                <dialog
                    open
                    className="modal modal-open"
                >

                    <div className="modal-box max-w-md">

                        <div className="flex items-start justify-between gap-4">

                            <div>

                                <h3 className="text-xl font-bold">
                                    Confirm Payroll Payment
                                </h3>


                                <p className="mt-1 text-sm text-base-content/60">
                                    Verify these details carefully. This action records the payroll as paid.
                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-sm btn-circle btn-ghost"
                                disabled={
                                    paying
                                }
                                onClick={() =>
                                    setShowFinalPayConfirm(
                                        false
                                    )
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        <div className="mt-5 space-y-2 rounded-xl border border-base-300 p-4">

                            <InfoRow
                                label="Worker"
                                value={
                                    selectedWorker.name
                                }
                            />


                            <InfoRow
                                label="Period"
                                value={
                                    getLedgerPeriodLabel(
                                        currentLedger
                                    )
                                }
                            />


                            <InfoRow
                                label="Salary"
                                value={
                                    formatCurrency(
                                        ledgerSalary
                                    )
                                }
                            />


                            <InfoRow
                                label="Credits"
                                value={
                                    `-${formatCurrency(
                                        ledgerCredits
                                    )}`
                                }
                            />


                            <InfoRow
                                label="Cash Advances"
                                value={
                                    `-${formatCurrency(
                                        ledgerCashAdvances
                                    )}`
                                }
                            />


                            <InfoRow
                                label="Payment Date"
                                value={
                                    formatDate(
                                        parseLocalInputDate(
                                            paymentDate
                                        )
                                    )
                                }
                            />

                        </div>


                        <div className="mt-4 rounded-xl bg-success/10 p-4">

                            <div className="text-sm text-base-content/60">
                                Salary to Release
                            </div>


                            <div className="mt-1 text-3xl font-bold text-success">

                                {
                                    formatCurrency(
                                        calculatedSalaryRelease
                                    )
                                }

                            </div>

                        </div>


                        {calculatedSalaryRelease ===
                            0 && (

                            <div className="alert alert-warning mt-4">

                                <FaInfoCircle />


                                <span className="text-sm">

                                    This payroll will close with no cash salary release because deductions consume the full salary amount.

                                </span>

                            </div>

                        )}


                        {payError && (

                            <div className="alert alert-error mt-4">

                                <span>
                                    {payError}
                                </span>

                            </div>

                        )}


                        <div className="modal-action">

                            <button
                                type="button"
                                className="btn"
                                disabled={
                                    paying
                                }
                                onClick={() =>
                                    setShowFinalPayConfirm(
                                        false
                                    )
                                }
                            >

                                Back

                            </button>


                            <button
                                type="button"
                                className="btn btn-success"
                                disabled={
                                    paying
                                }
                                onClick={
                                    executePayWorker
                                }
                            >

                                {paying ? (

                                    <>
                                        <span className="loading loading-spinner loading-sm" />
                                        Processing...
                                    </>

                                ) : (

                                    <>

                                        <FaCheck />

                                        {calculatedSalaryRelease >
                                        0
                                            ? `Confirm ${formatCurrency(
                                                calculatedSalaryRelease
                                            )}`
                                            : "Close Payroll"}

                                    </>

                                )}

                            </button>

                        </div>

                    </div>

                </dialog>

            )}


            {/* ==================================================
                SALARY HISTORY MODAL
            ================================================== */}

            {showHistoryModal &&
                historyWorker && (

                <dialog
                    open
                    className="modal modal-open"
                >

                    <div className="modal-box max-w-6xl">

                        <div className="flex items-start justify-between gap-4">

                            <div>

                                <h3 className="text-xl font-bold">
                                    Salary History
                                </h3>


                                <p className="mt-1 text-sm text-base-content/60">

                                    {
                                        historyWorker.name
                                    }

                                    {" • "}

                                    {
                                        historyWorker
                                            .payFrequency ===
                                        "WEEKLY"
                                            ? "Weekly"
                                            : "Monthly"
                                    }

                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={
                                    closeHistoryModal
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        {historyError && (

                            <div className="alert alert-error mt-4">

                                <span>
                                    {historyError}
                                </span>

                            </div>

                        )}


                        {loadingHistory ? (

                            <LoadingBlock
                                text="Loading salary history..."
                            />

                        ) : salaryHistory.length ===
                            0 ? (

                            <div className="py-16 text-center">

                                <FaReceipt className="mx-auto text-4xl text-base-content/15" />


                                <h4 className="mt-3 font-semibold">
                                    No salary history yet
                                </h4>


                                <p className="mt-1 text-sm text-base-content/50">
                                    Paid worker ledgers will appear here.
                                </p>

                            </div>

                        ) : (

                            <div className="mt-5 overflow-x-auto rounded-xl border border-base-300">

                                <table className="table">

                                    <thead>

                                        <tr>

                                            <th>
                                                Period
                                            </th>

                                            <th>
                                                Salary
                                            </th>

                                            <th>
                                                Credits
                                            </th>

                                            <th>
                                                Advances
                                            </th>

                                            <th>
                                                Salary Released
                                            </th>

                                            <th>
                                                Payment
                                            </th>

                                            <th className="text-right">
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {salaryHistory.map(
                                            (
                                                ledger
                                            ) => {

                                                const ledgerId =
                                                    getLedgerId(
                                                        ledger
                                                    );


                                                return (

                                                    <tr
                                                        key={
                                                            ledgerId
                                                        }
                                                    >

                                                        <td>

                                                            <div className="font-semibold">

                                                                {
                                                                    getLedgerPeriodLabel(
                                                                        ledger
                                                                    )
                                                                }

                                                            </div>


                                                            <div className="text-xs text-base-content/50">

                                                                Period #

                                                                {
                                                                    ledger.periodNumber ||
                                                                    ledger.listNumber ||
                                                                    "—"
                                                                }

                                                            </div>

                                                        </td>


                                                        <td>

                                                            {
                                                                formatCurrency(
                                                                    ledger.salary
                                                                )
                                                            }

                                                        </td>


                                                        <td className="text-error">

                                                            {
                                                                formatCurrency(
                                                                    ledger.totalCredits
                                                                )
                                                            }

                                                        </td>


                                                        <td className="text-warning">

                                                            {
                                                                formatCurrency(
                                                                    ledger.totalCashAdvances
                                                                )
                                                            }

                                                        </td>


                                                        <td>

                                                            <span className="font-bold text-success">

                                                                {
                                                                    formatCurrency(
                                                                        ledger.salaryReleased ??
                                                                        ledger.remainingSalary
                                                                    )
                                                                }

                                                            </span>

                                                        </td>


                                                        <td>

                                                            <div className="badge badge-success">
                                                                PAID
                                                            </div>


                                                            <div className="mt-1 text-xs text-base-content/50">

                                                                {
                                                                    formatDateTime(
                                                                        ledger.paidAt
                                                                    )
                                                                }

                                                            </div>


                                                            {ledger.paidBy && (

                                                                <div className="mt-1 text-[10px] text-base-content/40">

                                                                    Paid by:{" "}

                                                                    {
                                                                        ledger.paidBy
                                                                            ?.name ||
                                                                        ledger.paidBy
                                                                            ?.username ||
                                                                        ledger.paidBy
                                                                    }

                                                                </div>

                                                            )}

                                                        </td>


                                                        <td>

                                                            <div className="flex justify-end gap-2">

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline"
                                                                    onClick={() =>
                                                                        handleViewHistoryDetails(
                                                                            ledger
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        loadingHistoryDetails
                                                                    }
                                                                >

                                                                    View

                                                                </button>


                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() =>
                                                                        handleReprintHistoryReceipt(
                                                                            ledger
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        reprintingLedgerId ===
                                                                        ledgerId
                                                                    }
                                                                >

                                                                    {reprintingLedgerId ===
                                                                    ledgerId ? (

                                                                        <>
                                                                            <span className="loading loading-spinner loading-xs" />
                                                                            Printing
                                                                        </>

                                                                    ) : (

                                                                        <>
                                                                            <FaPrint />
                                                                            Reprint
                                                                        </>

                                                                    )}

                                                                </button>

                                                            </div>

                                                        </td>

                                                    </tr>

                                                );

                                            }
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        )}


                        <div className="modal-action">

                            <button
                                type="button"
                                className="btn"
                                onClick={
                                    closeHistoryModal
                                }
                            >

                                Close

                            </button>

                        </div>

                    </div>

                </dialog>

            )}


            {/* ==================================================
                SALARY HISTORY DETAILS
            ================================================== */}

            {showHistoryDetails &&
                selectedHistoryLedger &&
                historyWorker && (

                <dialog
                    open
                    className="modal modal-open"
                >

                    <div className="modal-box max-w-4xl">

                        <div className="flex items-start justify-between gap-4">

                            <div>

                                <h3 className="text-xl font-bold">

                                    {
                                        historyWorker.name
                                    }

                                </h3>


                                <p className="mt-1 text-sm text-base-content/60">

                                    {
                                        getLedgerPeriodLabel(
                                            selectedHistoryLedger
                                        )
                                    }

                                    {" • Paid "}

                                    {
                                        formatDateTime(
                                            selectedHistoryLedger
                                                .paidAt
                                        )
                                    }

                                </p>

                            </div>


                            <button
                                type="button"
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={
                                    closeHistoryDetails
                                }
                            >

                                <FaTimes />

                            </button>

                        </div>


                        {loadingHistoryDetails ? (

                            <LoadingBlock
                                text="Loading salary details..."
                            />

                        ) : (

                            <>

                                {/* SUMMARY */}

                                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

                                    <HistorySummaryCard
                                        label="Salary"
                                        value={
                                            formatCurrency(
                                                selectedHistoryLedger
                                                    .salary
                                            )
                                        }
                                    />


                                    <HistorySummaryCard
                                        label="Credits"
                                        value={
                                            formatCurrency(
                                                selectedHistoryLedger
                                                    .totalCredits
                                            )
                                        }
                                    />


                                    <HistorySummaryCard
                                        label="Cash Advances"
                                        value={
                                            formatCurrency(
                                                selectedHistoryLedger
                                                    .totalCashAdvances
                                            )
                                        }
                                    />


                                    <HistorySummaryCard
                                        label="Salary Released"
                                        value={
                                            formatCurrency(
                                                selectedHistoryLedger
                                                    .salaryReleased ??
                                                selectedHistoryLedger
                                                    .remainingSalary
                                            )
                                        }
                                        valueClass="text-success"
                                    />

                                </div>


                                {/* PAYMENT METADATA */}

                                <div className="mt-5 rounded-xl border border-base-300 p-4">

                                    <h4 className="font-bold">
                                        Payment Information
                                    </h4>


                                    <div className="mt-3">

                                        <InfoRow
                                            label="Paid At"
                                            value={
                                                formatDateTime(
                                                    selectedHistoryLedger
                                                        .paidAt
                                                )
                                            }
                                        />


                                        {selectedHistoryLedger
                                            .paymentDate && (

                                            <InfoRow
                                                label="Payment Date"
                                                value={
                                                    formatDate(
                                                        selectedHistoryLedger
                                                            .paymentDate
                                                    )
                                                }
                                            />

                                        )}


                                        {selectedHistoryLedger
                                            .referenceNumber && (

                                            <InfoRow
                                                label="Reference"
                                                value={
                                                    selectedHistoryLedger
                                                        .referenceNumber
                                                }
                                            />

                                        )}


                                        {selectedHistoryLedger
                                            .receiptNumber && (

                                            <InfoRow
                                                label="Receipt #"
                                                value={
                                                    selectedHistoryLedger
                                                        .receiptNumber
                                                }
                                            />

                                        )}

                                    </div>

                                </div>


                                {/* CREDIT ITEMS */}

                                <div className="mt-6">

                                    <h4 className="font-bold">
                                        Credit Purchases
                                    </h4>


                                    <p className="mt-1 text-xs text-base-content/50">
                                        Items deducted during this salary period.
                                    </p>


                                    <div className="mt-3 overflow-hidden rounded-xl border border-base-300">

                                        <HistoryCreditTransactions
                                            transactions={
                                                historyTransactions
                                            }
                                        />

                                    </div>

                                </div>


                                {/* CASH ADVANCES */}

                                <div className="mt-6">

                                    <h4 className="font-bold">
                                        Cash Advances
                                    </h4>


                                    <div className="mt-3 overflow-hidden rounded-xl border border-base-300">

                                        <HistoryCashAdvances
                                            transactions={
                                                historyTransactions
                                            }
                                        />

                                    </div>

                                </div>


                                {/* FINAL SUMMARY */}

                                <div className="mt-6 rounded-xl bg-base-200 p-4">

                                    <AmountRow
                                        label="Basic Salary"
                                        value={
                                            selectedHistoryLedger
                                                .salary
                                        }
                                    />


                                    <div className="mt-2">

                                        <AmountRow
                                            label="Less Credits"
                                            value={
                                                selectedHistoryLedger
                                                    .totalCredits
                                            }
                                            negative
                                        />

                                    </div>


                                    <div className="mt-2">

                                        <AmountRow
                                            label="Less Cash Advances"
                                            value={
                                                selectedHistoryLedger
                                                    .totalCashAdvances
                                            }
                                            negative
                                        />

                                    </div>


                                    <div className="divider my-3" />


                                    <div className="flex items-center justify-between">

                                        <span className="font-bold">
                                            Salary Released
                                        </span>


                                        <span className="text-2xl font-bold text-success">

                                            {
                                                formatCurrency(
                                                    selectedHistoryLedger
                                                        .salaryReleased ??
                                                    selectedHistoryLedger
                                                        .remainingSalary
                                                )
                                            }

                                        </span>

                                    </div>

                                </div>

                            </>

                        )}


                        <div className="modal-action">

                            <button
                                type="button"
                                className="btn"
                                onClick={
                                    closeHistoryDetails
                                }
                            >

                                Back

                            </button>


                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={
                                    Boolean(
                                        reprintingLedgerId
                                    )
                                }
                                onClick={() =>
                                    handleReprintHistoryReceipt(
                                        selectedHistoryLedger
                                    )
                                }
                            >

                                {reprintingLedgerId ? (

                                    <>
                                        <span className="loading loading-spinner loading-sm" />
                                        Printing...
                                    </>

                                ) : (

                                    <>
                                        <FaPrint />
                                        Reprint Receipt
                                    </>

                                )}

                            </button>

                        </div>

                    </div>

                </dialog>

            )}

        </div>

    );

};


/*
============================================================
SUMMARY CARD
============================================================
*/

const SummaryCard = ({
    label,
    value,
    description,
    icon: Icon,
    iconClass,
}) => {

    return (

        <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">

            <div className="flex items-start justify-between gap-3">

                <div>

                    <div className="text-xs text-base-content/50">
                        {label}
                    </div>


                    <div className="mt-2 text-2xl font-bold">
                        {value}
                    </div>

                </div>


                <div
                    className={`
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        ${iconClass}
                    `}
                >

                    <Icon />

                </div>

            </div>


            <div className="mt-3 text-[11px] text-base-content/45">
                {description}
            </div>

        </div>

    );

};


/*
============================================================
HISTORY SUMMARY CARD
============================================================
*/

const HistorySummaryCard = ({
    label,
    value,
    valueClass = "",
}) => {

    return (

        <div className="rounded-xl border border-base-300 bg-base-100 p-4">

            <div className="text-xs text-base-content/50">
                {label}
            </div>


            <div
                className={`mt-1 text-lg font-bold ${valueClass}`}
            >
                {value}
            </div>

        </div>

    );

};


/*
============================================================
INFO ROW
============================================================
*/

const InfoRow = ({
    label,
    value,
}) => {

    return (

        <div className="flex justify-between gap-4 py-1 text-sm">

            <span className="text-base-content/50">
                {label}
            </span>


            <span className="font-medium text-right">
                {value}
            </span>

        </div>

    );

};


/*
============================================================
AMOUNT ROW
============================================================
*/

const AmountRow = ({
    label,
    value,
    negative = false,
}) => {

    return (

        <div className="flex justify-between gap-4">

            <span className="text-base-content/60">
                {label}
            </span>


            <span
                className={
                    negative
                        ? "font-semibold text-error"
                        : "font-semibold"
                }
            >

                {negative
                    ? "-"
                    : ""
                }

                {
                    formatCurrency(
                        value
                    )
                }

            </span>

        </div>

    );

};


/*
============================================================
LOADING BLOCK
============================================================
*/

const LoadingBlock = ({
    text,
}) => {

    return (

        <div className="py-10 text-center">

            <span className="loading loading-spinner loading-md" />


            <div className="mt-2 text-sm text-base-content/60">
                {text}
            </div>

        </div>

    );

};


/*
============================================================
HISTORY CREDIT TRANSACTIONS
============================================================
*/

const HistoryCreditTransactions = ({
    transactions,
}) => {

    const credits =
        (
            Array.isArray(
                transactions
            )
                ? transactions
                : []
        ).filter(
            (
                transaction
            ) =>
                transaction.type ===
                "CREDIT"
        );


    if (
        credits.length ===
        0
    ) {

        return (

            <div className="p-8 text-center text-sm text-base-content/50">
                No credit purchases in this salary period.
            </div>

        );

    }


    return (

        <div className="divide-y divide-base-300">

            {credits.map(
                (
                    transaction,
                    transactionIndex
                ) => {

                    const items =
                        Array.isArray(
                            transaction.items
                        )
                            ? transaction.items
                            : [];


                    return (

                        <div
                            key={
                                transaction._id ||
                                transaction.id ||
                                transactionIndex
                            }
                            className="p-4"
                        >

                            <div className="flex justify-between gap-4">

                                <div>

                                    <div className="font-semibold">
                                        Credit Purchase
                                    </div>


                                    <div className="text-xs text-base-content/50">

                                        {
                                            formatDate(
                                                transaction.createdAt ||
                                                transaction.date
                                            )
                                        }

                                    </div>

                                </div>


                                <div className="font-bold text-error">

                                    {
                                        formatCurrency(
                                            transaction.amount
                                        )
                                    }

                                </div>

                            </div>


                            {items.length >
                            0 && (

                                <div className="mt-3 overflow-hidden rounded-lg bg-base-200">

                                    {items.map(
                                        (
                                            item,
                                            itemIndex
                                        ) => {

                                            const quantity =
                                                Number(
                                                    item.quantity ||
                                                    0
                                                );


                                            const unitPrice =
                                                Number(
                                                    item.unitPrice ??
                                                    item.price ??
                                                    0
                                                );


                                            const total =
                                                Number(
                                                    item.total ??
                                                    item.subtotal ??
                                                    (
                                                        quantity *
                                                        unitPrice
                                                    )
                                                );


                                            return (

                                                <div
                                                    key={
                                                        `${transactionIndex}-${itemIndex}`
                                                    }
                                                    className="flex items-center justify-between gap-4 border-b border-base-300 px-3 py-2 last:border-0"
                                                >

                                                    <div>

                                                        <div className="text-sm font-medium">

                                                            {
                                                                item.name ||
                                                                item.product
                                                                    ?.name ||
                                                                "Product"
                                                            }

                                                        </div>


                                                        <div className="text-xs text-base-content/50">

                                                            {
                                                                quantity
                                                            }

                                                            {" × "}

                                                            {
                                                                formatCurrency(
                                                                    unitPrice
                                                                )
                                                            }

                                                        </div>

                                                    </div>


                                                    <div className="font-semibold">

                                                        {
                                                            formatCurrency(
                                                                total
                                                            )
                                                        }

                                                    </div>

                                                </div>

                                            );

                                        }
                                    )}

                                </div>

                            )}

                        </div>

                    );

                }
            )}

        </div>

    );

};


/*
============================================================
HISTORY CASH ADVANCES
============================================================
*/

const HistoryCashAdvances = ({
    transactions,
}) => {

    const advances =
        (
            Array.isArray(
                transactions
            )
                ? transactions
                : []
        ).filter(
            (
                transaction
            ) =>
                transaction.type ===
                "CASH_ADVANCE"
        );


    if (
        advances.length ===
        0
    ) {

        return (

            <div className="p-8 text-center text-sm text-base-content/50">
                No cash advances in this salary period.
            </div>

        );

    }


    return (

        <div className="divide-y divide-base-300">

            {advances.map(
                (
                    transaction,
                    index
                ) => (

                    <div
                        key={
                            transaction._id ||
                            transaction.id ||
                            index
                        }
                        className="flex items-center justify-between gap-4 p-4"
                    >

                        <div>

                            <div className="font-semibold">

                                {
                                    transaction.remarks ||
                                    transaction.description ||
                                    "Cash Advance"
                                }

                            </div>


                            <div className="text-xs text-base-content/50">

                                {
                                    formatDate(
                                        transaction.createdAt ||
                                        transaction.date
                                    )
                                }

                            </div>

                        </div>


                        <div className="font-bold text-warning">

                            {
                                formatCurrency(
                                    transaction.amount
                                )
                            }

                        </div>

                    </div>

                )
            )}

        </div>

    );

};


export default WorkersPage;