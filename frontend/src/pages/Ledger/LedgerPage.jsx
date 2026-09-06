        import {
            useEffect,
            useMemo,
            useRef,
            useState,
        } from "react";

        import {
            FaBook,
            FaSearch,
            FaPlus,
            FaMoneyBillWave,
            FaUsers,
            FaUserTie,
            FaExclamationTriangle,
            FaCheckCircle,
            FaClock,
            FaTimes,
            FaReceipt,
            FaWallet,
            FaTrash,
            FaMinus,
            FaPrint,
            FaChevronDown,
            FaChevronUp,
            FaBox,
            FaSyncAlt,
            FaCalendarAlt,
            FaHistory,
            FaEdit,
        } from "react-icons/fa";

        import {
            useSearchParams,
        } from "react-router-dom";

        import ledgerService from "../../services/ledger.service";
        import productService from "../../services/product.service";
        import useAuthStore from "../../store/auth.store";


        /*
        ============================================================
        LEDGER PAGE
        ============================================================

        WORKER RULES

        1. Worker can only have ONE OPEN ledger.
        2. LedgerPage NEVER marks a worker as paid.
        3. Worker payment is handled on WorkersPage.
        4. "Create New List" is shown only when:

        - worker has no ledger yet

        OR

        - latest ledger is PAID

        5. If there is an OPEN ledger:
        - Create New List is hidden
        - Add Credit is allowed
        - Cash Advance is allowed
        - Credit Payment is allowed
        - Print Ledger is allowed

        6. PAID ledgers are history only.

        7. Previous ledgers remain selectable for viewing/printing.
        ============================================================
        */


        function LedgerPage() {

            const [searchParams] =
                useSearchParams();

                /*
        ============================================================
        CURRENT USER
        ============================================================
        */

        const user =
            useAuthStore(
                (state) =>
                    state.user
            );


        const isAdmin =
            user?.role ===
            "admin";


            /*
            ========================================================
            DATA
            ========================================================
            */

            const [
                accounts,
                setAccounts,
            ] = useState([]);

            const [
                products,
                setProducts,
            ] = useState([]);

            const [
                loading,
                setLoading,
            ] = useState(true);

            const [
                productsLoading,
                setProductsLoading,
            ] = useState(true);

            const [
                error,
                setError,
            ] = useState("");

            const [
                productsError,
                setProductsError,
            ] = useState("");

            const [
                saving,
                setSaving,
            ] = useState(false);


            /*
            ========================================================
            FILTERS
            ========================================================
            */

            const [
                activeTab,
                setActiveTab,
            ] = useState("ALL");

            const [
                search,
                setSearch,
            ] = useState("");

            const [
                statusFilter,
                setStatusFilter,
            ] = useState("ALL");


            /*
            ========================================================
            SELECTED ACCOUNT
            ========================================================
            */

            const [
                selectedAccount,
                setSelectedAccount,
            ] = useState(null);

            const [
                selectedAccountLoading,
                setSelectedAccountLoading,
            ] = useState(false);


            /*
            ========================================================
            WORKER LEDGERS
            ========================================================
            */

            const [
                workerLedgers,
                setWorkerLedgers,
            ] = useState([]);

            const [
                selectedWorkerLedger,
                setSelectedWorkerLedger,
            ] = useState(null);

            const [
                workerLedgersLoading,
                setWorkerLedgersLoading,
            ] = useState(false);

            const [
                creatingWorkerLedger,
                setCreatingWorkerLedger,
            ] = useState(false);


            /*
            ========================================================
            ADD CREDIT
            ========================================================
            */

            const [
                showAddCredit,
                setShowAddCredit,
            ] = useState(false);

            const [
                creditAccount,
                setCreditAccount,
            ] = useState(null);

            const [
                creditCart,
                setCreditCart,
            ] = useState([]);

            const [
                productSearch,
                setProductSearch,
            ] = useState("");

            const [
                selectedProductIndex,
                setSelectedProductIndex,
            ] = useState(0);


            /*
            ========================================================
            CUSTOM / OPEN-PRICE CREDIT ITEM
            ========================================================
            */

            const [
                showCustomCredit,
                setShowCustomCredit,
            ] = useState(false);

            const [
            customCreditName,
            setCustomCreditName,
        ] = useState("Grocery");

        const [
            customCreditNote,
            setCustomCreditNote,
        ] = useState("");

        const [
            customCreditAmount,
            setCustomCreditAmount,
        ] = useState("");


            


            /*
            ========================================================
            PRODUCT REFS
            ========================================================
            */

            const productSearchRef =
                useRef(null);

            const productListRef =
                useRef(null);

            const customCreditAmountRef =
                useRef(null);

                const customCreditNoteRef =
            useRef(null);


            /*
            ========================================================
            CASH ADVANCE
            ========================================================
            */

            const [
                showCashAdvance,
                setShowCashAdvance,
            ] = useState(false);

            const [
                cashAdvanceAccount,
                setCashAdvanceAccount,
            ] = useState(null);

            const [
                cashAdvanceAmount,
                setCashAdvanceAmount,
            ] = useState("");

            const [
                cashAdvanceReason,
                setCashAdvanceReason,
            ] = useState("");


            /*
            ========================================================
            CREDIT PAYMENT
            ========================================================
            */

            const [
                showPayment,
                setShowPayment,
            ] = useState(false);

            const [
                paymentAccount,
                setPaymentAccount,
            ] = useState(null);

            const [
                paymentAmount,
                setPaymentAmount,
            ] = useState("");

            const [
                paymentRemarks,
                setPaymentRemarks,
            ] = useState("");

            /*
        ============================================================
        EDIT TRANSACTION
        ============================================================
        */

        const [
            showEditTransaction,
            setShowEditTransaction,
        ] = useState(false);


        const [
            editingTransaction,
            setEditingTransaction,
        ] = useState(null);


        const [
            editTransactionItems,
            setEditTransactionItems,
        ] = useState([]);


        const [
            editTransactionAmount,
            setEditTransactionAmount,
        ] = useState("");


        const [
            editTransactionRemarks,
            setEditTransactionRemarks,
        ] = useState("");


        const [
            editTransactionReason,
            setEditTransactionReason,
        ] = useState("");


        const [
            editProductSearch,
            setEditProductSearch,
        ] = useState("");

            /*
            ========================================================
            TRANSACTION EXPANSION
            ========================================================
            */

            const [
                expandedTransactions,
                setExpandedTransactions,
            ] = useState({});


            /*
            ========================================================
            AUTO OPEN WORKER
            ========================================================
            */

            const autoOpenedWorkerRef =
                useRef(false);


            /*
            ========================================================
            BASIC HELPERS
            ========================================================
            */

            const getId = (
                item
            ) => {

                return (
                    item?._id ??
                    item?.id ??
                    item?.listId ??
                    null
                );

            };


            const formatMoney = (
                value
            ) => {

                return new Intl.NumberFormat(
                    "en-PH",
                    {
                        style: "currency",
                        currency: "PHP",
                    }
                ).format(
                    Number(value) || 0
                );

            };


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

                    return String(value);

                }


                return date.toLocaleDateString(
                    "en-PH",
                    {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }
                );

            };


            const formatPayFrequency = (
                frequency
            ) => {

                if (
                    frequency === "WEEKLY"
                ) {
                    return "Weekly";
                }


                if (
                    frequency === "MONTHLY"
                ) {
                    return "Monthly";
                }


                return "Not Set";

            };


            /*
            ========================================================
            LEDGER LABEL
            ========================================================
            */

            const getLedgerLabel = (
                ledger
            ) => {

                if (!ledger) {
                    return "No Ledger";
                }


                if (ledger.label) {
                    return ledger.label;
                }


                if (
                    ledger.payFrequency ===
                        "WEEKLY" &&
                    ledger.periodStart &&
                    ledger.periodEnd
                ) {

                    return `${formatDate(
                        ledger.periodStart
                    )} - ${formatDate(
                        ledger.periodEnd
                    )}`;

                }


                if (ledger.periodStart) {

                    const date =
                        new Date(
                            ledger.periodStart
                        );


                    if (
                        !Number.isNaN(
                            date.getTime()
                        )
                    ) {

                        return date.toLocaleDateString(
                            "en-US",
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
                        ledger.year,
                        ledger.month - 1,
                        1
                    ).toLocaleDateString(
                        "en-US",
                        {
                            month: "long",
                            year: "numeric",
                        }
                    );

                }


                return `Period #${
                    ledger.periodNumber ||
                    ledger.listNumber ||
                    1
                }`;

            };


            /*
            ========================================================
            PRODUCT HELPERS
            ========================================================
            */

            const getProductPrice = (
                product
            ) => {

                if (!product) {
                    return 0;
                }


                if (
                    Array.isArray(
                        product.pricing
                    ) &&
                    product.pricing.length > 0
                ) {

                    const exactOne =
                        product.pricing.find(
                            (price) =>
                                Number(
                                    price.quantity
                                ) === 1
                        );


                    if (exactOne) {

                        return Number(
                            exactOne.price
                        ) || 0;

                    }


                    const first =
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
                        )[0];


                    return Number(
                        first?.price
                    ) || 0;

                }


                if (
                    product.price != null
                ) {

                    return Number(
                        product.price
                    ) || 0;

                }


                return Number(
                    product.costPrice
                ) || 0;

            };


            const getProductUnit = (
                product
            ) => {

                return (
                    product?.baseUnit ||
                    product?.unit ||
                    "Piece"
                );

            };


            /*
            ========================================================
            NORMALIZE PRODUCT
            ========================================================
            */

            const normalizeProduct = (
                product
            ) => {

                return {

                    ...product,

                    id:
                        getId(product),

                    barcode:
                        product?.barcode ||
                        "",

                    name:
                        product?.name ||
                        "Unnamed Product",

                    category:
                        product?.category ||
                        "Others",

                    price:
                        getProductPrice(
                            product
                        ),

                    stock:
                        Number(
                            product?.stock
                        ) || 0,

                    unit:
                        getProductUnit(
                            product
                        ),

                };

            };


            /*
            ========================================================
            NORMALIZE TRANSACTION
            ========================================================
            */

            const normalizeTransaction = (
        transaction
    ) => {

        const rawItems =
            Array.isArray(
                transaction?.items
            )
                ? transaction.items
                : [];


        /*
        ========================================================
        TRANSACTION REMARKS

        Used as fallback for a CUSTOM item's note when an older
        backend/validator removed items[].note.
        ========================================================
        */

        const transactionRemarks =
            String(
                transaction?.remarks ||
                ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        /*
        ========================================================
        COUNT CUSTOM ITEMS
        ========================================================

        We only use transaction remarks as an item-note fallback
        when there is exactly ONE custom item.

        This prevents accidentally assigning one remark to
        multiple different Grocery/custom items.
        ========================================================
        */

        const customItemCount =
            rawItems.filter(
                (item) => {

                    const itemType =
                        item?.itemType ||
                        (
                            item?.product
                                ? "PRODUCT"
                                : "CUSTOM"
                        );


                    return (
                        itemType ===
                        "CUSTOM"
                    );

                }
            ).length;


        const items =
            rawItems.map(
                (item) => {

                    const itemType =
                        item?.itemType ||
                        (
                            item?.product
                                ? "PRODUCT"
                                : "CUSTOM"
                        );


                    const quantity =
                        Number(
                            item?.quantity
                        ) || 0;


                    const price =
                        Number(
                            item?.price ??
                            item?.unitPrice ??
                            item?.product?.price
                        ) || 0;


                    /*
                    ================================================
                    DIRECT ITEM NOTE
                    ================================================
                    */

                    const directNote =
                        String(
                            item?.note ??
                            item?.description ??
                            item?.remarks ??
                            ""
                        )
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();


                    /*
                    ================================================
                    NOTE FALLBACK

                    New frontend sends:

                    remarks:
                        "Grocery: Rice, vegetables"

                    If items[].note was stripped by validation,
                    this lets the UI still recover/display it.
                    ================================================
                    */

                    let fallbackNote =
                        "";


                    if (
                        itemType ===
                            "CUSTOM" &&
                        customItemCount ===
                            1 &&
                        !directNote &&
                        transactionRemarks &&
                        transactionRemarks !==
                            "Grocery credit" &&
                        transactionRemarks !==
                            "Credit Purchase"
                    ) {

                        /*
                        If remarks is:
                        Grocery: Rice and vegetables

                        display only:
                        Rice and vegetables

                        inside the expanded Grocery item.
                        */

                        const prefix =
                            `${String(
                                item?.name ||
                                "Grocery"
                            ).trim()}:`;


                        if (
                            transactionRemarks
                                .toLowerCase()
                                .startsWith(
                                    prefix.toLowerCase()
                                )
                        ) {

                            fallbackNote =
                                transactionRemarks
                                    .slice(
                                        prefix.length
                                    )
                                    .trim();

                        } else {

                            fallbackNote =
                                transactionRemarks;

                        }

                    }


                    return {

                        ...item,

                        itemType,

                        name:
                            item?.name ||
                            item?.product?.name ||
                            "Product",

                        note:
                            directNote ||
                            fallbackNote,

                        quantity,

                        price,

                        total:
                            Number(
                                item?.total ??
                                item?.totalPrice
                            ) ||
                            (
                                quantity *
                                price
                            ),

                    };

                }
            );


        return {

            ...transaction,

            id:
                getId(
                    transaction
                ),

            type:
                transaction?.type ||
                "CREDIT",


            /*
            ========================================================
            IMPORTANT

            Prefer remarks before description.

            Backend description is usually:
            "Credit Purchase"

            Remarks can now contain:
            "Grocery: Rice and vegetables"
            ========================================================
            */

            description:
                transactionRemarks ||
                transaction?.description ||
                "",


            amount:
                Number(
                    transaction?.amount
                ) || 0,

            status:
                transaction?.status ||
                "",

            date:
                transaction?.date ||
                transaction?.createdAt ||
                "",

            items,

        };

    };

            /*
            ========================================================
            NORMALIZE WORKER LEDGER
            ========================================================
            */

            const normalizeWorkerLedger = (
                ledger
            ) => {

                if (!ledger) {
                    return null;
                }


                const ledgerId =
                    ledger?.listId ||
                    ledger?.ledgerId ||
                    ledger?._id ||
                    ledger?.id ||
                    null;


                const normalized = {

                    ...ledger,

                    id:
                        ledgerId,

                    _id:
                        ledger?._id ||
                        ledgerId,

                    listId:
                        ledgerId,

                    periodNumber:
                        Number(
                            ledger?.periodNumber ??
                            ledger?.listNumber ??
                            1
                        ) || 1,

                    year:
                        Number(
                            ledger?.year
                        ) || 0,

                    month:
                        Number(
                            ledger?.month
                        ) || 0,

                    salary:
                        Number(
                            ledger?.salary
                        ) || 0,

                    totalCredits:
                        Number(
                            ledger?.totalCredits
                        ) || 0,

                    totalCashAdvances:
                        Number(
                            ledger?.totalCashAdvances
                        ) || 0,

                    totalPayments:
                        Number(
                            ledger?.totalPayments
                        ) || 0,

                    remainingSalary:
                        Number(
                            ledger?.remainingSalary
                        ) || 0,

                    salaryReleased:
                        ledger?.salaryReleased ==
                            null
                            ? null
                            : Number(
                                ledger.salaryReleased
                            ) || 0,

                    status:
                        String(
                            ledger?.status ||
                            "OPEN"
                        ).toUpperCase(),

                    payFrequency:
                        ledger?.payFrequency ||
                        "MONTHLY",

                    periodStart:
                        ledger?.periodStart ||
                        null,

                    periodEnd:
                        ledger?.periodEnd ||
                        null,

                    scheduledPayDate:
                        ledger?.scheduledPayDate ||
                        null,

                    paidAt:
                        ledger?.paidAt ||
                        null,

                    createdAt:
                        ledger?.createdAt ||
                        null,

                    transactions:
                        Array.isArray(
                            ledger?.transactions
                        )
                            ? ledger
                                .transactions
                                .map(
                                    normalizeTransaction
                                )
                            : [],

                };


                normalized.label =
                    ledger?.label ||
                    getLedgerLabel(
                        normalized
                    );


                return normalized;

            };


            /*
            ========================================================
            NORMALIZE ACCOUNT
            ========================================================
            */

            const normalizeAccount = (
                account
            ) => {

                const currentWorkerLedger =
                    normalizeWorkerLedger(
                        account?.currentWorkerLedger
                    );


                const latestWorkerLedger =
                    normalizeWorkerLedger(
                        account?.latestWorkerLedger
                    );


                const transactions =
                    Array.isArray(
                        account?.transactions
                    )
                        ? account
                            .transactions
                            .map(
                                normalizeTransaction
                            )
                        : [];


                return {

                    ...account,

                    id:
                        getId(
                            account
                        ),

                    _id:
                        account?._id ??
                        account?.id,

                    name:
                        account?.name ||
                        "Unnamed Account",

                    phone:
                        account?.phone ||
                        "",

                    type:
                        account?.type ||
                        "CUSTOMER",

                    salary:
                        account?.salary ==
                            null
                            ? null
                            : Number(
                                account.salary
                            ) || 0,

                    payFrequency:
                        account?.payFrequency ||
                        null,

                    payDay:
                        account?.payDay ??
                        null,

                    payDayOfWeek:
                        account?.payDayOfWeek ??
                        null,

                    creditTotal:
                        Number(
                            account?.creditTotal
                        ) || 0,

                    paymentTotal:
                        Number(
                            account?.paymentTotal
                        ) || 0,

                    creditBalance:
                        Number(
                            account?.creditBalance
                        ) || 0,

                    cashAdvance:
                        Number(
                            account?.cashAdvance
                        ) || 0,

                    remainingSalary:
                        account?.remainingSalary ==
                            null
                            ? null
                            : Number(
                                account.remainingSalary
                            ) || 0,

                    currentWorkerLedger,

                    latestWorkerLedger,

                    transactions,

                    isActive:
                        account?.isActive !== false,

                };

            };


            /*
            ========================================================
            REMAINING SALARY
            ========================================================
            */

            const getRemainingSalary = (
                account
            ) => {

                if (
                    account?.type !==
                    "WORKER"
                ) {

                    return 0;

                }


                if (
                    account?.currentWorkerLedger
                ) {

                    return Math.max(
                        Number(
                            account
                                .currentWorkerLedger
                                .remainingSalary
                        ) || 0,
                        0
                    );

                }


                return 0;

            };


            /*
            ========================================================
            LOAD ACCOUNTS
            ========================================================
            */

            const loadAccounts =
                async () => {

                    try {

                        setLoading(true);

                        setError("");


                        const result =
                            await ledgerService
                                .getAccounts();


                        const list =
                            Array.isArray(
                                result
                            )
                                ? result
                                : Array.isArray(
                                    result?.data
                                )
                                    ? result.data
                                    : [];


                        setAccounts(
                            list.map(
                                normalizeAccount
                            )
                        );


                    } catch (err) {

                        console.error(
                            "Failed to load ledger accounts:",
                            err
                        );


                        setError(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to load ledger accounts."
                        );


                    } finally {

                        setLoading(false);

                    }

                };


            /*
            ========================================================
            LOAD PRODUCTS
            ========================================================
            */

            const loadProducts =
                async () => {

                    try {

                        setProductsLoading(
                            true
                        );

                        setProductsError("");


                        const result =
                            await productService
                                .getProducts();


                        const list =
                            Array.isArray(
                                result
                            )
                                ? result
                                : Array.isArray(
                                    result?.data
                                )
                                    ? result.data
                                    : [];


                        setProducts(
                            list
                                .map(
                                    normalizeProduct
                                )
                                .filter(
                                    (product) =>
                                        product.id
                                )
                        );


                    } catch (err) {

                        console.error(
                            "Failed to load products:",
                            err
                        );


                        setProductsError(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to load products."
                        );


                    } finally {

                        setProductsLoading(
                            false
                        );

                    }

                };


            /*
            ========================================================
            INITIAL LOAD
            ========================================================
            */

            useEffect(() => {

                loadAccounts();

                loadProducts();

            }, []);


            /*
            ========================================================
            ACCOUNT STATUS
            ========================================================
            */

            const getAccountStatus = (
                account
            ) => {

                if (
                    account?.type ===
                    "WORKER"
                ) {

                    const ledger =
                        account
                            ?.currentWorkerLedger ||
                        account
                            ?.latestWorkerLedger;


                    if (!ledger) {

                        return {

                            label:
                                "No Ledger",

                            className:
                                "badge-neutral",

                            icon:
                                <FaClock />,

                        };

                    }


                    if (
                        ledger.status ===
                        "OPEN"
                    ) {

                        return {

                            label:
                                "Open",

                            className:
                                "badge-success",

                            icon:
                                <FaClock />,

                        };

                    }


                    if (
                        ledger.status ===
                        "PAID"
                    ) {

                        return {

                            label:
                                "Paid",

                            className:
                                "badge-primary",

                            icon:
                                <FaCheckCircle />,

                        };

                    }


                    return {

                        label:
                            ledger.status,

                        className:
                            "badge-neutral",

                        icon:
                            <FaClock />,

                    };

                }


                if (
                    Number(
                        account?.creditBalance
                    ) <= 0
                ) {

                    return {

                        label:
                            "Paid",

                        className:
                            "badge-success",

                        icon:
                            <FaCheckCircle />,

                    };

                }


                return {

                    label:
                        "Unpaid",

                    className:
                        "badge-error",

                    icon:
                        <FaExclamationTriangle />,

                };

            };


            /*
            ========================================================
            FILTERED ACCOUNTS
            ========================================================
            */

            const filteredAccounts =
                useMemo(() => {

                    const query =
                        search
                            .trim()
                            .toLowerCase();


                    return accounts.filter(
                        (account) => {

                            const matchesSearch =
                                !query ||
                                account.name
                                    .toLowerCase()
                                    .includes(
                                        query
                                    ) ||
                                account.phone
                                    .toLowerCase()
                                    .includes(
                                        query
                                    );


                            const matchesTab =
                                activeTab ===
                                    "ALL" ||
                                account.type ===
                                    activeTab;


                            let matchesStatus =
                                true;


                            if (
                                statusFilter !==
                                "ALL"
                            ) {

                                if (
                                    account.type ===
                                    "WORKER"
                                ) {

                                    const status =
                                        account
                                            ?.currentWorkerLedger
                                            ?.status ||
                                        account
                                            ?.latestWorkerLedger
                                            ?.status ||
                                        "NONE";


                                    matchesStatus =
                                        status ===
                                        statusFilter;

                                } else {

                                    if (
                                        statusFilter ===
                                        "PAID"
                                    ) {

                                        matchesStatus =
                                            Number(
                                                account.creditBalance
                                            ) <= 0;

                                    }


                                    if (
                                        statusFilter ===
                                        "UNPAID"
                                    ) {

                                        matchesStatus =
                                            Number(
                                                account.creditBalance
                                            ) > 0;

                                    }

                                }

                            }


                            return (
                                matchesSearch &&
                                matchesTab &&
                                matchesStatus
                            );

                        }
                    );

                }, [
                    accounts,
                    search,
                    activeTab,
                    statusFilter,
                ]);


            /*
            ========================================================
            SUMMARY
            ========================================================
            */

            const totalOutstanding =
                accounts.reduce(
                    (
                        total,
                        account
                    ) =>
                        total +
                        Number(
                            account.creditBalance ||
                            0
                        ),
                    0
                );


            const totalWorkers =
                accounts.filter(
                    (account) =>
                        account.type ===
                        "WORKER"
                ).length;


            const totalCustomers =
                accounts.filter(
                    (account) =>
                        account.type ===
                        "CUSTOMER"
                ).length;


            const workersRemainingSalary =
                accounts
                    .filter(
                        (account) =>
                            account.type ===
                            "WORKER"
                    )
                    .reduce(
                        (
                            total,
                            account
                        ) =>
                            total +
                            getRemainingSalary(
                                account
                            ),
                        0
                    );


            /*
            ========================================================
            PRODUCT SEARCH
            ========================================================
            */

            const filteredProducts =
                useMemo(() => {

                    const query =
                        productSearch
                            .trim()
                            .toLowerCase();


                    if (!query) {

                        return products.slice(
                            0,
                            12
                        );

                    }


                    return products.filter(
                        (product) =>
                            product.name
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||
                            product.barcode
                                .toLowerCase()
                                .includes(
                                    query
                                ) ||
                            product.category
                                .toLowerCase()
                                .includes(
                                    query
                                )
                    );

                }, [
                    products,
                    productSearch,
                ]);


            const creditCartTotal =
                creditCart.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        (
                            Number(
                                item.price
                            ) || 0
                        ) *
                        (
                            Number(
                                item.quantity
                            ) || 0
                        ),
                    0
                );


            /*
            ========================================================
            LOAD ONE WORKER LEDGER
            ========================================================
            */

            const loadWorkerLedger =
                async (
                    accountId,
                    ledger
                ) => {

                    if (
                        !accountId ||
                        !ledger
                    ) {

                        return;

                    }


                    const ledgerId =
                        getId(
                            ledger
                        );


                    if (!ledgerId) {

                        return;

                    }


                    try {

                        const startDate =
                            ledger.periodStart
                                ? new Date(
                                    ledger.periodStart
                                )
                                : new Date();


                        const year =
                            Number(
                                ledger.year
                            ) ||
                            startDate.getFullYear();


                        const month =
                            Number(
                                ledger.month
                            ) ||
                            (
                                startDate.getMonth() +
                                1
                            );


                        const result =
                            await ledgerService
                                .getWorkerMonth(
                                    accountId,
                                    year,
                                    month,
                                    ledgerId
                                );


                        const response =
                            result?.data ||
                            result;


                        const ledgerData =
                            response?.ledger ||
                            response;


                        const normalizedLedger =
                            normalizeWorkerLedger(
                                ledgerData
                            );


                        const transactions =
                            Array.isArray(
                                response?.transactions
                            )
                                ? response
                                    .transactions
                                    .map(
                                        normalizeTransaction
                                    )
                                : [];


                        const completedLedger = {

                            ...normalizedLedger,

                            transactions,

                        };


                        setSelectedWorkerLedger(
                            completedLedger
                        );


                        setSelectedAccount(
                            (current) => {

                                if (!current) {
                                    return current;
                                }


                                return {

                                    ...current,

                                    selectedWorkerLedger:
                                        completedLedger,

                                    transactions,

                                };

                            }
                        );


                    } catch (err) {

                        console.error(
                            "Failed to load worker ledger:",
                            err
                        );


                        alert(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to load worker ledger."
                        );

                    }

                };


            /*
            ========================================================
            LOAD WORKER LEDGER HISTORY
            ========================================================
            */

            const loadWorkerLedgers =
                async (
                    accountId,
                    preferredLedgerId = null
                ) => {

                    if (!accountId) {
                        return;
                    }


                    try {

                        setWorkerLedgersLoading(
                            true
                        );


                        const result =
                            await ledgerService
                                .getWorkerMonths(
                                    accountId
                                );


                        const list =
                            Array.isArray(
                                result
                            )
                                ? result
                                : Array.isArray(
                                    result?.data
                                )
                                    ? result.data
                                    : [];


                        const normalized =
                            list
                                .map(
                                    normalizeWorkerLedger
                                )
                                .filter(Boolean);


                        /*
                        ====================================================
                        NEWEST LEDGER FIRST
                        ====================================================
                        */

                        normalized.sort(
                            (
                                a,
                                b
                            ) => {

                                const numberDifference =
                                    Number(
                                        b.periodNumber ||
                                        b.listNumber ||
                                        0
                                    ) -
                                    Number(
                                        a.periodNumber ||
                                        a.listNumber ||
                                        0
                                    );


                                if (
                                    numberDifference !==
                                    0
                                ) {

                                    return numberDifference;

                                }


                                return (
                                    new Date(
                                        b.createdAt ||
                                        b.periodStart ||
                                        0
                                    ).getTime() -
                                    new Date(
                                        a.createdAt ||
                                        a.periodStart ||
                                        0
                                    ).getTime()
                                );

                            }
                        );


                        setWorkerLedgers(
                            normalized
                        );


                        /*
                        ====================================================
                        NO LEDGERS
                        ====================================================
                        */

                        if (
                            normalized.length ===
                            0
                        ) {

                            setSelectedWorkerLedger(
                                null
                            );


                            setSelectedAccount(
                                (current) => {

                                    if (!current) {
                                        return current;
                                    }


                                    return {

                                        ...current,

                                        currentWorkerLedger:
                                            null,

                                        latestWorkerLedger:
                                            null,

                                        selectedWorkerLedger:
                                            null,

                                        transactions:
                                            [],

                                    };

                                }
                            );


                            return;

                        }


                        /*
                        ====================================================
                        FIND CURRENT OPEN LEDGER
                        ====================================================
                        */

                        const openLedger =
                            normalized.find(
                                (ledger) =>
                                    ledger.status ===
                                    "OPEN"
                            ) || null;


                        /*
                        ====================================================
                        UPDATE ACCOUNT'S CURRENT/LATEST INFORMATION
                        ====================================================
                        */

                        setSelectedAccount(
                            (current) => {

                                if (!current) {
                                    return current;
                                }


                                return {

                                    ...current,

                                    currentWorkerLedger:
                                        openLedger,

                                    latestWorkerLedger:
                                        normalized[0],

                                };

                            }
                        );


                        /*
                        ====================================================
                        PICK LEDGER TO DISPLAY
                        ====================================================
                        */

                        let selected =
                            null;


                        if (
                            preferredLedgerId
                        ) {

                            selected =
                                normalized.find(
                                    (ledger) =>
                                        String(
                                            getId(
                                                ledger
                                            )
                                        ) ===
                                        String(
                                            preferredLedgerId
                                        )
                                ) || null;

                        }


                        /*
                        Always prefer current OPEN ledger.
                        */

                        if (!selected) {

                            selected =
                                openLedger;

                        }


                        /*
                        Otherwise display latest PAID/history ledger.
                        */

                        if (!selected) {

                            selected =
                                normalized[0];

                        }


                        await loadWorkerLedger(
                            accountId,
                            selected
                        );


                    } catch (err) {

                        console.error(
                            "Failed to load worker ledger history:",
                            err
                        );


                        setWorkerLedgers([]);

                        setSelectedWorkerLedger(
                            null
                        );


                    } finally {

                        setWorkerLedgersLoading(
                            false
                        );

                    }

                };


            /*
            ========================================================
            SELECT OLD LEDGER
            ========================================================
            */

            const handleWorkerLedgerChange =
                async (
                    event
                ) => {

                    if (
                        !selectedAccount
                    ) {

                        return;

                    }


                    const ledgerId =
                        event.target.value;


                    const ledger =
                        workerLedgers.find(
                            (item) =>
                                String(
                                    getId(item)
                                ) ===
                                String(
                                    ledgerId
                                )
                        );


                    if (!ledger) {
                        return;
                    }


                    await loadWorkerLedger(
                        getId(
                            selectedAccount
                        ),
                        ledger
                    );

                };


            /*
            ========================================================
            OPEN LEDGER
            ========================================================
            */

            const openWorkerLedger =
                workerLedgers.find(
                    (ledger) =>
                        ledger.status ===
                        "OPEN"
                ) || null;


            /*
            ========================================================
            LATEST LEDGER
            ========================================================
            */

            const latestWorkerLedger =
                workerLedgers.length > 0
                    ? workerLedgers[0]
                    : null;


            /*
            ========================================================
            CREATE NEW LIST BUTTON RULE
            ========================================================

            SHOW ONLY IF:

            A. worker has NEVER had a ledger

            OR

            B. latest ledger is PAID

            AND:

            There must NOT be an OPEN ledger.
            ========================================================
            */

            const canCreateNewWorkerLedger =
                selectedAccount?.type ===
                    "WORKER" &&
                !openWorkerLedger &&
                (
                    workerLedgers.length === 0 ||
                    latestWorkerLedger?.status ===
                        "PAID"
                );


            /*
            ========================================================
            CREATE NEW WORKER LEDGER
            ========================================================

            IMPORTANT:

            We intentionally call:

                createAnotherWorkerLedger(
                    accountId,
                    year,
                    month
                )

            because this matches your currently-existing backend
            /months/:year/:month/list route and avoids the 404 from:

                /ledger/:id/worker-ledger

            The backend must still reject creation if an OPEN
            ledger exists.
            ========================================================
            */

            const handleCreateWorkerLedger =
                async () => {

                    if (
                        !selectedAccount ||
                        selectedAccount.type !==
                            "WORKER"
                    ) {

                        return;

                    }


                    const accountId =
                        getId(
                            selectedAccount
                        );


                    if (!accountId) {

                        alert(
                            "Invalid worker account."
                        );

                        return;

                    }


                    /*
                    ====================================================
                    OPEN LEDGER CHECK
                    ====================================================
                    */

                    const openLedger =
                        workerLedgers.find(
                            (ledger) =>
                                ledger.status ===
                                "OPEN"
                        );


                    if (openLedger) {

                        alert(
                            "This worker still has an OPEN ledger.\n\n" +
                            "Pay the worker from the Workers & Salary page first."
                        );

                        return;

                    }


                    /*
                    ====================================================
                    PREVIOUS LEDGER MUST BE PAID
                    ====================================================
                    */

                    const latestLedger =
                        workerLedgers.length > 0
                            ? workerLedgers[0]
                            : null;


                    if (
                        latestLedger &&
                        latestLedger.status !==
                            "PAID"
                    ) {

                        alert(
                            "The previous ledger must be PAID before creating a new list."
                        );

                        return;

                    }


                    /*
                    ====================================================
                    YEAR / MONTH FOR EXISTING COMPATIBILITY ROUTE
                    ====================================================
                    */

                    const now =
                        new Date();


                    const year =
                        now.getFullYear();


                    const month =
                        now.getMonth() + 1;


                    const confirmed =
                        window.confirm(
                            `Create a new ledger for ${selectedAccount.name}?\n\n` +
                            `Pay Frequency: ${formatPayFrequency(
                                selectedAccount.payFrequency
                            )}\n` +
                            `Salary: ${formatMoney(
                                selectedAccount.salary
                            )}\n\n` +
                            `The new list will start with:\n` +
                            `Credits: ₱0.00\n` +
                            `Cash Advances: ₱0.00\n` +
                            `Credit Payments: ₱0.00`
                        );


                    if (!confirmed) {
                        return;
                    }


                    try {

                        setCreatingWorkerLedger(
                            true
                        );

                        setSaving(
                            true
                        );


                        /*
                        =================================================
                        IMPORTANT FIX FOR YOUR 404
                        =================================================
                        */

                        let result;


                        if (
                            typeof ledgerService
                                .createAnotherWorkerLedger ===
                            "function"
                        ) {

                            result =
                                await ledgerService
                                    .createAnotherWorkerLedger(
                                        accountId,
                                        year,
                                        month
                                    );

                        } else if (
                            typeof ledgerService
                                .createWorkerLedger ===
                            "function"
                        ) {

                            /*
                            Fallback only if your service no longer
                            exports createAnotherWorkerLedger.
                            */

                            result =
                                await ledgerService
                                    .createWorkerLedger(
                                        accountId,
                                        year,
                                        month
                                    );

                        } else {

                            throw new Error(
                                "No worker ledger creation function exists in ledger.service.js."
                            );

                        }


                        const created =
                            result?.data ||
                            result;


                        const createdId =
                            getId(
                                created
                            );


                        /*
                        =================================================
                        RELOAD ACCOUNT
                        =================================================
                        */

                        const accountResult =
                            await ledgerService
                                .getAccountById(
                                    accountId
                                );


                        const normalizedAccount =
                            normalizeAccount(
                                accountResult?.data ||
                                accountResult
                            );


                        setSelectedAccount(
                            normalizedAccount
                        );


                        setAccounts(
                            (current) =>
                                current.map(
                                    (account) =>
                                        String(
                                            getId(
                                                account
                                            )
                                        ) ===
                                        String(
                                            accountId
                                        )
                                            ? normalizedAccount
                                            : account
                                )
                        );


                        /*
                        =================================================
                        RELOAD LEDGERS
                        =================================================
                        */

                        await loadWorkerLedgers(
                            accountId,
                            createdId
                        );


                        alert(
                            "New worker ledger created successfully."
                        );


                    } catch (err) {

                        console.error(
                            "Failed to create worker ledger:",
                            err
                        );


                        alert(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to create worker ledger."
                        );


                    } finally {

                        setCreatingWorkerLedger(
                            false
                        );

                        setSaving(
                            false
                        );

                    }

                };


            /*
            ========================================================
            OPEN ACCOUNT
            ========================================================
            */

            const openAccount =
                async (
                    account
                ) => {

                    const accountId =
                        getId(
                            account
                        );


                    if (!accountId) {
                        return;
                    }


                    setSelectedAccount(
                        account
                    );

                    setWorkerLedgers([]);

                    setSelectedWorkerLedger(
                        null
                    );

                    setExpandedTransactions(
                        {}
                    );


                    try {

                        setSelectedAccountLoading(
                            true
                        );


                        const result =
                            await ledgerService
                                .getAccountById(
                                    accountId
                                );


                        const normalized =
                            normalizeAccount(
                                result?.data ||
                                result
                            );


                        setSelectedAccount(
                            normalized
                        );


                        setAccounts(
                            (current) =>
                                current.map(
                                    (item) =>
                                        String(
                                            getId(item)
                                        ) ===
                                        String(
                                            accountId
                                        )
                                            ? normalized
                                            : item
                                )
                        );


                        if (
                            normalized.type ===
                            "WORKER"
                        ) {

                            await loadWorkerLedgers(
                                accountId,
                                getId(
                                    normalized
                                        .currentWorkerLedger
                                )
                            );

                        }


                    } catch (err) {

                        console.error(
                            "Failed to load account:",
                            err
                        );


                        alert(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to load account."
                        );


                    } finally {

                        setSelectedAccountLoading(
                            false
                        );

                    }

                };


            /*
            ========================================================
            AUTO OPEN FROM WORKERS PAGE

            /ledger?worker=WORKER_ID
            ========================================================
            */

            useEffect(() => {

                const workerId =
                    searchParams.get(
                        "worker"
                    );


                if (
                    !workerId ||
                    loading ||
                    accounts.length === 0 ||
                    autoOpenedWorkerRef.current
                ) {

                    return;

                }


                const worker =
                    accounts.find(
                        (account) =>
                            String(
                                getId(account)
                            ) ===
                            String(
                                workerId
                            )
                    );


                if (!worker) {
                    return;
                }


                autoOpenedWorkerRef.current =
                    true;


                openAccount(
                    worker
                );

            }, [
                loading,
                accounts,
                searchParams,
            ]);


            /*
            ========================================================
            CLOSE ACCOUNT
            ========================================================
            */

            const closeAccount =
                () => {

                    setSelectedAccount(
                        null
                    );

                    setSelectedWorkerLedger(
                        null
                    );

                    setWorkerLedgers([]);

                    setExpandedTransactions(
                        {}
                    );

                };


            /*
            ========================================================
            SELECTED LEDGER IS OPEN?
            ========================================================
            */

            const selectedWorkerLedgerIsOpen =
                selectedAccount?.type ===
                    "WORKER" &&
                selectedWorkerLedger?.status ===
                    "OPEN";


            /*
            ========================================================
            OPEN ADD CREDIT
            ========================================================
            */

            const openAddCredit = (
                account = null
            ) => {

                const target =
                    account ||
                    selectedAccount;


                if (
                    target?.type ===
                    "WORKER"
                ) {

                    const currentOpenLedger =
                        target.currentWorkerLedger ||
                        (
                            selectedWorkerLedger?.status ===
                            "OPEN"
                                ? selectedWorkerLedger
                                : null
                        );


                    if (!currentOpenLedger) {

                        alert(
                            "This worker does not have an OPEN ledger.\n\n" +
                            "Create a new list first."
                        );

                        return;

                    }

                }


                setCreditAccount(
                    target ||
                    null
                );

                setCreditCart([]);

                setProductSearch("");

                setSelectedProductIndex(
                    0
                );

                setShowCustomCredit(
                    false
                );

                setCustomCreditName(
            "Grocery"
        );

        setCustomCreditNote(
            ""
        );

        setCustomCreditAmount(
            ""
        );

                setShowAddCredit(
                    true
                );


                setTimeout(
                    () => {

                        productSearchRef
                            .current
                            ?.focus();

                    },
                    100
                );

            };


            const closeAddCredit =
                () => {

                    setShowAddCredit(
                        false
                    );

                    setShowCustomCredit(
                        false
                    );

                    setCreditAccount(
                        null
                    );

                    setCreditCart([]);

                    setProductSearch("");

                    setSelectedProductIndex(
                        0
                    );

                    setCustomCreditName(
            "Grocery"
        );

        setCustomCreditNote(
            ""
        );

        setCustomCreditAmount(
            ""
        );

                };


            /*
            ========================================================
            ADD PRODUCT
            ========================================================
            */

            const addProductToCredit = (
                product
            ) => {

                if (!product) {
                    return;
                }


                if (
                    Number(
                        product.stock
                    ) <= 0
                ) {

                    alert(
                        "This product is out of stock."
                    );

                    return;

                }


                setCreditCart(
                    (current) => {

                        const existing =
                            current.find(
                                (item) =>
                                    item.itemType !==
                                        "CUSTOM" &&
                                    item.productId ===
                                    product.id
                            );


                        if (existing) {

                            if (
                                existing.quantity >=
                                product.stock
                            ) {

                                alert(
                                    "Cannot exceed available stock."
                                );

                                return current;

                            }


                            return current.map(
                                (item) =>
                                    item.itemType !==
                                        "CUSTOM" &&
                                    item.productId ===
                                    product.id
                                        ? {
                                            ...item,

                                            quantity:
                                                item.quantity +
                                                1,
                                        }
                                        : item
                            );

                        }


                        return [

                            ...current,

                            {
                                cartId:
                                    `product-${product.id}`,

                                itemType:
                                    "PRODUCT",

                                productId:
                                    product.id,

                                barcode:
                                    product.barcode,

                                name:
                                    product.name,

                                price:
                                    product.price,

                                quantity:
                                    1,

                                stock:
                                    product.stock,

                                unit:
                                    product.unit,
                            },

                        ];

                    }
                );


                setProductSearch(
                    ""
                );

                setSelectedProductIndex(
                    0
                );


                setTimeout(
                    () => {

                        productSearchRef
                            .current
                            ?.focus();

                    },
                    40
                );

            };


            /*
            ========================================================
            COMBINED PRODUCT SEARCH / BARCODE
            ========================================================

            One input handles both:

            - barcode scanner
            - typed barcode
            - product name search
            - category search
            ========================================================
            */

            const handleProductSearchKeyDown = (
        event
    ) => {

        /*
        ============================================================
        ARROW DOWN
        ============================================================
        */

        if (
            event.key ===
            "ArrowDown"
        ) {

            event.preventDefault();

            event.stopPropagation();


            if (
                filteredProducts.length ===
                0
            ) {

                return;

            }


            setSelectedProductIndex(
                (current) => {

                    const next =
                        current + 1;


                    return (
                        next >=
                        filteredProducts.length
                            ? 0
                            : next
                    );

                }
            );


            return;

        }


        /*
        ============================================================
        ARROW UP
        ============================================================
        */

        if (
            event.key ===
            "ArrowUp"
        ) {

            event.preventDefault();

            event.stopPropagation();


            if (
                filteredProducts.length ===
                0
            ) {

                return;

            }


            setSelectedProductIndex(
                (current) => {

                    const previous =
                        current - 1;


                    return (
                        previous < 0
                            ? filteredProducts.length -
                                1
                            : previous
                    );

                }
            );


            return;

        }


        /*
        ============================================================
        ENTER
        ============================================================
        */

        if (
            event.key !==
            "Enter"
        ) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        const query =
            String(
                productSearch ||
                ""
            )
                .trim();


        /*
        ============================================================
        1. EXACT BARCODE MATCH
        ============================================================
        */

        if (
            query
        ) {

            const barcodeProduct =
                products.find(
                    (product) =>
                        String(
                            product.barcode ||
                            ""
                        ).trim() ===
                        query
                );


            if (
                barcodeProduct
            ) {

                addProductToCredit(
                    barcodeProduct
                );


                return;

            }

        }


        /*
        ============================================================
        2. CURRENTLY SELECTED SEARCH RESULT
        ============================================================
        */

        const selectedProduct =
            filteredProducts[
                selectedProductIndex
            ];


        if (
            selectedProduct
        ) {

            addProductToCredit(
                selectedProduct
            );


            return;

        }


        /*
        ============================================================
        3. NOTHING FOUND
        ============================================================
        */

        if (
            query
        ) {

            alert(
                `No product found for ${query}.`
            );

        }

    };


            /*
            ========================================================
            CUSTOM / GROCERY CREDIT
            ========================================================
            */

            const openCustomCredit =
                () => {

                setCustomCreditName(
                    "Grocery"
                );

                setCustomCreditNote(
                    ""
                );

                setCustomCreditAmount(
                    ""
                );

                setShowCustomCredit(
                    true
                );

            


                    setTimeout(
                        () => {

                            customCreditAmountRef
                                .current
                                ?.focus();

                        },
                        80
                    );

                };


            const closeCustomCredit =
                () => {

                    setShowCustomCredit(
                        false
                    );

                    setCustomCreditName(
                        "Grocery"
                    );
                    setCustomCreditNote(
            ""
        );

                    setCustomCreditAmount(
                        ""
                    );


                    setTimeout(
                        () => {

                            productSearchRef
                                .current
                                ?.focus();

                        },
                        40
                    );

                };


            const addCustomCreditItem =
                () => {

                    const name =
            String(
                customCreditName ||
                "Grocery"
            )
                .trim()
                .slice(
                    0,
                    100
                ) ||
            "Grocery";


        const note =
            String(
                customCreditNote ||
                ""
            )
                .trim()
                .slice(
                    0,
                    80
                );


        const amount =
            Number(
                customCreditAmount
            );

                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {

                        alert(
                            "Enter a valid custom credit amount."
                        );

                        return;

                    }


                    const customId =
                        `custom-${Date.now()}-${Math.random()}`;


                    setCreditCart(
                        (current) => [

                            ...current,

                            {
                                cartId:
                                    customId,

                                itemType:
                                    "CUSTOM",

                                productId:
                                    null,

                                barcode:
                                    "",

                                name,
                                note,

                                price:
                                    amount,

                                quantity:
                                    1,

                                stock:
                                    null,

                                unit:
                                    "Custom",
                            },

                        ]
                    );


                    closeCustomCredit();

                };


            /*
            ========================================================
            CREDIT MODAL KEYBOARD
            ========================================================
            */

            useEffect(() => {

                if (!showAddCredit) {
                    return;
                }


                const handleKeyboard = (
                    event
                ) => {

                    /*
                    ----------------------------------------------------
                    CUSTOM ITEM POPUP OWNS ITS KEYBOARD
                    ----------------------------------------------------
                    */

                    if (showCustomCredit) {

                        if (
                            event.key ===
                            "Escape"
                        ) {

                            event.preventDefault();

                            event.stopPropagation();

                            closeCustomCredit();

                        }


                        return;

                    }


                    if (
                        event.key ===
                        "Escape"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();

                        closeAddCredit();

                        return;

                    }


                    if (
                        event.key === "F8" ||
                        event.code === "F8"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        if (
                            creditAccount &&
                            creditCart.length > 0 &&
                            !saving
                        ) {

                            completeCredit();

                        }


                        return;

                    }


                    if (
                        event.key ===
                        "ArrowDown"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        if (
                            filteredProducts.length ===
                            0
                        ) {

                            return;

                        }


                        setSelectedProductIndex(
                            (current) =>
                                current + 1 >=
                                filteredProducts.length
                                    ? 0
                                    : current + 1
                        );


                        return;

                    }


                    if (
                        event.key ===
                        "ArrowUp"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        if (
                            filteredProducts.length ===
                            0
                        ) {

                            return;

                        }


                        setSelectedProductIndex(
                            (current) =>
                                current - 1 < 0
                                    ? filteredProducts.length -
                                    1
                                    : current - 1
                        );


                        return;

                    }


                    if (
                        event.key ===
                        "Enter"
                    ) {

                        /*
                        The combined search field handles its own
                        Enter key so barcode scans work correctly.
                        */

                        if (
                            document.activeElement ===
                            productSearchRef.current
                        ) {

                            return;

                        }


                        event.preventDefault();

                        event.stopPropagation();


                        const product =
                            filteredProducts[
                                selectedProductIndex
                            ];


                        if (product) {

                            addProductToCredit(
                                product
                            );

                        }

                    }

                };


                window.addEventListener(
                    "keydown",
                    handleKeyboard,
                    true
                );


                return () => {

                    window.removeEventListener(
                        "keydown",
                        handleKeyboard,
                        true
                    );

                };

            }, [
                showAddCredit,
                showCustomCredit,
                filteredProducts,
                selectedProductIndex,
                productSearch,
                creditAccount,
                creditCart,
                saving,
            ]);


            useEffect(() => {

                setSelectedProductIndex(
                    0
                );

            }, [
                productSearch,
            ]);


            useEffect(() => {

                if (!showAddCredit) {
                    return;
                }


                const container =
                    productListRef.current;


                if (!container) {
                    return;
                }


                const selected =
                    container.querySelector(
                        '[data-selected-product="true"]'
                    );


                selected?.scrollIntoView({
                    block: "nearest",
                });

            }, [
                selectedProductIndex,
                showAddCredit,
                filteredProducts,
            ]);


            /*
            ========================================================
            CART QUANTITY
            ========================================================
            */

            const changeCreditQuantity = (
                itemId,
                amount
            ) => {

                setCreditCart(
                    (current) =>
                        current.map(
                            (item) => {

                                const currentId =
                                    item.cartId ||
                                    item.productId;


                                if (
                                    currentId !==
                                    itemId
                                ) {

                                    return item;

                                }


                                if (
                                    item.itemType ===
                                    "CUSTOM"
                                ) {

                                    return {

                                        ...item,

                                        quantity:
                                            Math.max(
                                                1,
                                                item.quantity +
                                                amount
                                            ),

                                    };

                                }


                                return {

                                    ...item,

                                    quantity:
                                        Math.max(
                                            1,
                                            Math.min(
                                                item.quantity +
                                                amount,
                                                item.stock
                                            )
                                        ),

                                };

                            }
                        )
                );

            };


            const removeCreditItem = (
                itemId
            ) => {

                setCreditCart(
                    (current) =>
                        current.filter(
                            (item) =>
                                (
                                    item.cartId ||
                                    item.productId
                                ) !==
                                itemId
                        )
                );

            };


            /*
            ========================================================
            COMPLETE CREDIT
            ========================================================
            */

            const completeCredit =
        async () => {

            if (!creditAccount) {

                alert(
                    "Please select an account."
                );

                return;

            }


            if (
                creditCart.length === 0
            ) {

                alert(
                    "Please add at least one credit item."
                );

                return;

            }


            const accountId =
                getId(
                    creditAccount
                );


            if (!accountId) {

                alert(
                    "Invalid account."
                );

                return;

            }


            /*
            ========================================================
            BUILD ITEMS FIRST
            ========================================================
            */

            const items =
                creditCart.map(
                    (item) => {

                        if (
                            item.itemType ===
                            "CUSTOM"
                        ) {

                            return {

                                itemType:
                                    "CUSTOM",

                                name:
                                    String(
                                        item.name ||
                                        "Grocery"
                                    )
                                        .trim()
                                        .slice(
                                            0,
                                            100
                                        ) ||
                                    "Grocery",

                                note:
                                    String(
                                        item.note ||
                                        ""
                                    )
                                        .replace(
                                            /\s+/g,
                                            " "
                                        )
                                        .trim()
                                        .slice(
                                            0,
                                            80
                                        ),

                                quantity:
                                    Number(
                                        item.quantity
                                    ) || 1,

                                unitPrice:
                                    Number(
                                        item.price
                                    ),

                            };

                        }


                        return {

                            itemType:
                                "PRODUCT",

                            productId:
                                item.productId,

                            quantity:
                                Number(
                                    item.quantity
                                ) || 1,

                        };

                    }
                );


            /*
            ========================================================
            BUILD CUSTOM NOTE SUMMARY
            ========================================================

            Example:

            Grocery: Rice, vegetables and canned goods

            This is intentionally also stored in remarks.

            Why?

            If an older backend validator strips items[].note,
            the text still survives in transaction.remarks.
            ========================================================
            */

            const customNotes =
                items
                    .filter(
                        (item) =>
                            item.itemType ===
                                "CUSTOM" &&
                            String(
                                item.note ||
                                ""
                            ).trim()
                    )
                    .map(
                        (item) =>
                            `${
                                item.name
                            }: ${
                                item.note
                            }`
                    );


            const remarks =
                customNotes.length > 0
                    ? customNotes
                        .join(
                            " • "
                        )
                        .slice(
                            0,
                            250
                        )
                    : "Grocery credit";


            const payload = {

                items,

                remarks,

            };


            /*
            ========================================================
            TEMPORARY DEBUG

            You can remove this after confirming notes work.
            ========================================================
            */

            console.log(
                "LEDGER CREDIT PAYLOAD:",
                payload
            );


            try {

                setSaving(
                    true
                );


                await ledgerService
                    .addCredit(
                        accountId,
                        payload
                    );


                closeAddCredit();


                await loadProducts();

                await loadAccounts();


                if (
                    selectedAccount &&
                    String(
                        getId(
                            selectedAccount
                        )
                    ) ===
                    String(
                        accountId
                    )
                ) {

                    await openAccount({

                        ...selectedAccount,

                        id:
                            accountId,

                    });

                }


            } catch (err) {

                console.error(
                    "Failed to add credit:",
                    err
                );


                alert(
                    err.response?.data?.message ||
                    err.message ||
                    "Failed to add credit."
                );


            } finally {

                setSaving(
                    false
                );

            }

        };

            /*
            ========================================================
            CASH ADVANCE
            ========================================================
            */

            const openCashAdvance = (
                account
            ) => {

                if (
                    account?.type !==
                    "WORKER"
                ) {

                    return;

                }


                if (
                    !selectedWorkerLedgerIsOpen
                ) {

                    alert(
                        "Cash advances can only be added to an OPEN ledger."
                    );

                    return;

                }


                setCashAdvanceAccount(
                    account
                );

                setCashAdvanceAmount("");

                setCashAdvanceReason("");

                setShowCashAdvance(
                    true
                );

            };


            const closeCashAdvance =
                () => {

                    setShowCashAdvance(
                        false
                    );

                    setCashAdvanceAccount(
                        null
                    );

                    setCashAdvanceAmount("");

                    setCashAdvanceReason("");

                };


            const saveCashAdvance =
                async () => {

                    if (!cashAdvanceAccount) {
                        return;
                    }


                    const amount =
                        Number(
                            cashAdvanceAmount
                        );


                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {

                        alert(
                            "Enter a valid cash advance amount."
                        );

                        return;

                    }


                    const remaining =
                        Number(
                            selectedWorkerLedger
                                ?.remainingSalary
                        ) || 0;


                    if (
                        amount >
                        remaining
                    ) {

                        alert(
                            `Cash advance cannot exceed ${formatMoney(
                                remaining
                            )}.`
                        );

                        return;

                    }


                    const accountId =
                        getId(
                            cashAdvanceAccount
                        );


                    try {

                        setSaving(true);


                        await ledgerService
                            .addCashAdvance(
                                accountId,
                                {
                                    amount,

                                    remarks:
                                        cashAdvanceReason
                                            .trim() ||
                                        "Cash Advance",
                                }
                            );


                        closeCashAdvance();


                        await loadAccounts();


                        await openAccount({

                            ...cashAdvanceAccount,

                            id:
                                accountId,

                        });


                    } catch (err) {

                        console.error(
                            "Failed to record cash advance:",
                            err
                        );


                        alert(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to record cash advance."
                        );


                    } finally {

                        setSaving(false);

                    }

                };


            /*
            ========================================================
            CREDIT PAYMENT

            NOT SALARY PAYMENT.
            ========================================================
            */

            const openPayment = (
                account
            ) => {

                if (
                    Number(
                        account?.creditBalance
                    ) <= 0
                ) {

                    alert(
                        "This account has no outstanding credit."
                    );

                    return;

                }


                if (
                    account.type ===
                        "WORKER" &&
                    !selectedWorkerLedgerIsOpen
                ) {

                    alert(
                        "Worker credit payments can only be added to an OPEN ledger."
                    );

                    return;

                }


                setPaymentAccount(
                    account
                );

                setPaymentAmount("");

                setPaymentRemarks("");

                setShowPayment(
                    true
                );

            };


            const closePayment =
                () => {

                    setShowPayment(
                        false
                    );

                    setPaymentAccount(
                        null
                    );

                    setPaymentAmount("");

                    setPaymentRemarks("");

                };


            const savePayment =
                async () => {

                    if (!paymentAccount) {
                        return;
                    }


                    const amount =
                        Number(
                            paymentAmount
                        );


                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {

                        alert(
                            "Enter a valid payment amount."
                        );

                        return;

                    }


                    if (
                        amount >
                        Number(
                            paymentAccount
                                .creditBalance
                        )
                    ) {

                        alert(
                            "Payment cannot exceed the outstanding credit."
                        );

                        return;

                    }


                    const accountId =
                        getId(
                            paymentAccount
                        );


                    try {

                        setSaving(true);


                        await ledgerService
                            .addPayment(
                                accountId,
                                {
                                    amount,

                                    remarks:
                                        paymentRemarks
                                            .trim() ||
                                        "Payment",
                                }
                            );


                        closePayment();


                        await loadAccounts();


                        await openAccount({

                            ...paymentAccount,

                            id:
                                accountId,

                        });


                    } catch (err) {

                        console.error(
                            "Failed to record payment:",
                            err
                        );


                        alert(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to record payment."
                        );


                    } finally {

                        setSaving(false);

                    }

                };


            /*
            ========================================================
            PRINT
            ========================================================
            */

            const handlePrintLedger =
                async () => {

                    if (!selectedAccount) {
                        return;
                    }


                    if (
                        selectedAccount.type !==
                        "WORKER"
                    ) {

                        alert(
                            "This print action currently supports worker ledgers."
                        );

                        return;

                    }


                    if (
                        !selectedWorkerLedger
                    ) {

                        alert(
                            "Select a ledger first."
                        );

                        return;

                    }


                    const ledgerId =
                        getId(
                            selectedWorkerLedger
                        );


                    if (!ledgerId) {

                        alert(
                            "Invalid worker ledger."
                        );

                        return;

                    }


                    const periodStart =
                        selectedWorkerLedger
                            .periodStart
                            ? new Date(
                                selectedWorkerLedger
                                    .periodStart
                            )
                            : new Date();


                    const year =
                        Number(
                            selectedWorkerLedger
                                .year
                        ) ||
                        periodStart
                            .getFullYear();


                    const month =
                        Number(
                            selectedWorkerLedger
                                .month
                        ) ||
                        (
                            periodStart
                                .getMonth() +
                            1
                        );


                    try {

                        setSaving(true);


                        await ledgerService
                            .printLedger(
                                getId(
                                    selectedAccount
                                ),
                                year,
                                month,
                                ledgerId
                            );


                        alert(
                            "Ledger printed successfully."
                        );


                    } catch (err) {

                        console.error(
                            "Failed to print ledger:",
                            err
                        );


                        alert(
                            err.response?.data?.message ||
                            err.message ||
                            "Failed to print ledger."
                        );


                    } finally {

                        setSaving(false);

                    }

                };


                /*
        ============================================================
        OPEN EDIT TRANSACTION
        ============================================================
        */

        const openEditTransaction = (
            transaction
        ) => {

            if (!isAdmin) {

                return;

            }


            if (!transaction) {

                return;

            }


            /*
            --------------------------------------------------------
            WORKER HISTORY LOCK

            Backend also enforces this.

            PAID/CLOSED worker ledgers cannot be edited.
            --------------------------------------------------------
            */

            if (
                selectedAccount?.type ===
                    "WORKER" &&
                selectedWorkerLedger?.status !==
                    "OPEN"
            ) {

                alert(
                    "Transactions from a PAID or CLOSED worker ledger cannot be edited."
                );

                return;

            }


            setEditingTransaction(
                transaction
            );


            setEditTransactionRemarks(
                transaction.remarks ||
                ""
            );


            setEditTransactionReason(
                ""
            );


            setEditProductSearch(
                ""
            );


            /*
            ========================================================
            CREDIT
            ========================================================
            */

            if (
                transaction.type ===
                "CREDIT"
            ) {

                const items =
                    (
                        transaction.items ||
                        []
                    ).map(
                        (
                            item,
                            index
                        ) => {

                            const itemType =
                                item.itemType ||
                                (
                                    item.product
                                        ? "PRODUCT"
                                        : "CUSTOM"
                                );


                            const productId =
                                item.product?._id ||
                                item.product?.id ||
                                item.product ||
                                item.productId ||
                                null;


                            return {

                                cartId:
                                    `edit-${transaction.id || transaction._id}-${index}`,

                                itemType,

                                productId:
                                    itemType ===
                                    "PRODUCT"
                                        ? String(
                                            productId ||
                                            ""
                                        )
                                        : null,

                                name:
                                    item.name ||
                                    item.product?.name ||
                                    "Item",

                                    note:
            String(
                item.note ||
                ""
            ).trim(),

                                barcode:
                                    item.barcode ||
                                    item.product?.barcode ||
                                    "",

                                quantity:
                                    Number(
                                        item.quantity
                                    ) || 1,

                                unitPrice:
                                    Number(
                                        item.unitPrice ??
                                        item.price
                                    ) || 0,

                            };

                        }
                    );


                setEditTransactionItems(
                    items
                );

            } else {

                /*
                ====================================================
                PAYMENT / CASH ADVANCE
                ====================================================
                */

                setEditTransactionItems(
                    []
                );


                setEditTransactionAmount(
                    String(
                        Number(
                            transaction.amount
                        ) || 0
                    )
                );

            }


            setShowEditTransaction(
                true
            );

        };


        /*
        ============================================================
        CLOSE EDIT TRANSACTION
        ============================================================
        */

        const closeEditTransaction =
            () => {

                if (saving) {

                    return;

                }


                setShowEditTransaction(
                    false
                );


                setEditingTransaction(
                    null
                );


                setEditTransactionItems(
                    []
                );


                setEditTransactionAmount(
                    ""
                );


                setEditTransactionRemarks(
                    ""
                );


                setEditTransactionReason(
                    ""
                );


                setEditProductSearch(
                    ""
                );

            };


        /*
        ============================================================
        EDIT CREDIT TOTAL
        ============================================================
        */

        const editCreditTotal =
            editTransactionItems.reduce(
                (
                    total,
                    item
                ) => {

                    return (
                        total +
                        (
                            Number(
                                item.unitPrice
                            ) || 0
                        ) *
                        (
                            Number(
                                item.quantity
                            ) || 0
                        )
                    );

                },
                0
            );


        /*
        ============================================================
        EDIT PRODUCT SEARCH
        ============================================================
        */

        const editFilteredProducts =
            useMemo(
                () => {

                    const query =
                        editProductSearch
                            .trim()
                            .toLowerCase();


                    if (!query) {

                        return [];

                    }


                    return products
                        .filter(
                            (product) => {

                                return (

                                    product.name
                                        .toLowerCase()
                                        .includes(
                                            query
                                        ) ||

                                    product.barcode
                                        .toLowerCase()
                                        .includes(
                                            query
                                        )

                                );

                            }
                        )
                        .slice(
                            0,
                            8
                        );

                },
                [
                    products,
                    editProductSearch,
                ]
            );


        /*
        ============================================================
        ADD PRODUCT TO EDITED CREDIT
        ============================================================
        */

        const addProductToEditTransaction = (
            product
        ) => {

            if (!product) {

                return;

            }


            setEditTransactionItems(
                (current) => {

                    const existing =
                        current.find(
                            (item) =>
                                item.itemType ===
                                    "PRODUCT" &&
                                String(
                                    item.productId
                                ) ===
                                String(
                                    product.id
                                )
                        );


                    if (existing) {

                        return current.map(
                            (item) => {

                                if (
                                    item.itemType ===
                                        "PRODUCT" &&
                                    String(
                                        item.productId
                                    ) ===
                                    String(
                                        product.id
                                    )
                                ) {

                                    return {

                                        ...item,

                                        quantity:
                                            Number(
                                                item.quantity
                                            ) + 1,

                                    };

                                }


                                return item;

                            }
                        );

                    }


                    return [

                        ...current,

                        {
                            cartId:
                                `edit-product-${product.id}-${Date.now()}`,

                            itemType:
                                "PRODUCT",

                            productId:
                                product.id,

                            name:
                                product.name,

                            barcode:
                                product.barcode ||
                                "",

                            quantity:
                                1,

                            /*
                            Backend recalculates PRODUCT price.
                            */

                            unitPrice:
                                Number(
                                    product.price
                                ) || 0,
                        },

                    ];

                }
            );


            setEditProductSearch(
                ""
            );

        };


        /*
        ============================================================
        ADD CUSTOM ITEM TO EDITED CREDIT
        ============================================================
        */

        const addCustomToEditTransaction =
            () => {

                setEditTransactionItems(
                    (current) => [

                        ...current,

                        {
                            cartId:
                                `edit-custom-${Date.now()}-${Math.random()}`,

                            itemType:
                                "CUSTOM",

                            productId:
                                null,

                            name:
                                "Grocery",
                            
                            note:
                                "",

                            barcode:
                                "",

                            quantity:
                                1,

                            unitPrice:
                                1,
                        },

                    ]
                );

            };


        /*
        ============================================================
        CHANGE EDIT ITEM QUANTITY
        ============================================================
        */

        const changeEditItemQuantity = (
            cartId,
            difference
        ) => {

            setEditTransactionItems(
                (current) =>
                    current.map(
                        (item) => {

                            if (
                                item.cartId !==
                                cartId
                            ) {

                                return item;

                            }


                            return {

                                ...item,

                                quantity:
                                    Math.max(
                                        1,
                                        Number(
                                            item.quantity
                                        ) +
                                        difference
                                    ),

                            };

                        }
                    )
            );

        };


        /*
        ============================================================
        CHANGE EDIT CUSTOM ITEM
        ============================================================
        */

        const updateEditCustomItem = (
            cartId,
            field,
            value
        ) => {

            setEditTransactionItems(
                (current) =>
                    current.map(
                        (item) => {

                            if (
                                item.cartId !==
                                cartId
                            ) {

                                return item;

                            }


                            return {

                                ...item,

                                [field]:
                                    value,

                            };

                        }
                    )
            );

        };


        /*
        ============================================================
        REMOVE EDIT ITEM
        ============================================================
        */

        const removeEditTransactionItem = (
            cartId
        ) => {

            setEditTransactionItems(
                (current) =>
                    current.filter(
                        (item) =>
                            item.cartId !==
                            cartId
                    )
            );

        };


        /*
        ============================================================
        SAVE EDITED TRANSACTION
        ============================================================
        */

        const saveEditedTransaction =
            async () => {

                if (
                    !editingTransaction ||
                    !selectedAccount
                ) {

                    return;

                }


                const accountId =
                    getId(
                        selectedAccount
                    );


                const transactionId =
                    getId(
                        editingTransaction
                    );


                if (
                    !accountId ||
                    !transactionId
                ) {

                    alert(
                        "Invalid ledger transaction."
                    );

                    return;

                }


                const reason =
                    editTransactionReason
                        .trim();


                if (
                    reason.length < 3
                ) {

                    alert(
                        "Please enter a reason for this correction."
                    );

                    return;

                }


                let payload;


                /*
                ====================================================
                CREDIT
                ====================================================
                */

                if (
                    editingTransaction.type ===
                    "CREDIT"
                ) {

                    if (
                        editTransactionItems.length ===
                        0
                    ) {

                        alert(
                            "A credit transaction must contain at least one item."
                        );

                        return;

                    }


                    for (
                        const item
                        of editTransactionItems
                    ) {

                        if (
                            Number(
                                item.quantity
                            ) <= 0
                        ) {

                            alert(
                                "Every item must have a valid quantity."
                            );

                            return;

                        }


                        if (
                            item.itemType ===
                            "CUSTOM"
                        ) {

                            if (
                                !String(
                                    item.name ||
                                    ""
                                ).trim()
                            ) {

                                alert(
                                    "Custom item name is required."
                                );

                                return;

                            }


                            if (
                                Number(
                                    item.unitPrice
                                ) <= 0
                            ) {

                                alert(
                                    "Custom item amount must be greater than zero."
                                );

                                return;

                            }

                        }

                    }


                    payload = {

                        type:
                            "CREDIT",

                        items:
                            editTransactionItems.map(
                                (item) => {

                                    if (
                                        item.itemType ===
                                        "CUSTOM"
                                    ) {

                                        return {

            itemType:
                "CUSTOM",

            name:
                String(
                    item.name
                )
                    .trim()
                    .slice(
                        0,
                        100
                    ),

            note:
                String(
                    item.note ||
                    ""
                )
                    .trim()
                    .slice(
                        0,
                        80
                    ),

            quantity:
                Number(
                    item.quantity
                ),

            unitPrice:
                Number(
                    item.unitPrice
                ),

        };

                                    }


                                    return {

                                        itemType:
                                            "PRODUCT",

                                        productId:
                                            item.productId,

                                        quantity:
                                            Number(
                                                item.quantity
                                            ),

                                    };

                                }
                            ),

                        remarks:
                            editTransactionRemarks
                                .trim(),

                        editReason:
                            reason,

                    };

                }

                /*
                ====================================================
                PAYMENT / CASH ADVANCE
                ====================================================
                */

                else {

                    const amount =
                        Number(
                            editTransactionAmount
                        );


                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {

                        alert(
                            "Enter a valid amount."
                        );

                        return;

                    }


                    payload = {

                        type:
                            editingTransaction.type,

                        amount,

                        remarks:
                            editTransactionRemarks
                                .trim(),

                        editReason:
                            reason,

                    };

                }


                try {

                    setSaving(
                        true
                    );


                    await ledgerService
                        .updateTransaction(
                            accountId,
                            transactionId,
                            payload
                        );


                    closeEditTransaction();


                    /*
                    =================================================
                    REFRESH INVENTORY
                    =================================================
                    */

                    await loadProducts();


                    /*
                    =================================================
                    REFRESH ACCOUNT LIST
                    =================================================
                    */

                    await loadAccounts();


                    /*
                    =================================================
                    REFRESH OPEN ACCOUNT
                    =================================================
                    */

                    const result =
                        await ledgerService
                            .getAccountById(
                                accountId
                            );


                    const normalized =
                        normalizeAccount(
                            result?.data ||
                            result
                        );


                    setSelectedAccount(
                        normalized
                    );


                    setAccounts(
                        (current) =>
                            current.map(
                                (account) =>
                                    String(
                                        getId(
                                            account
                                        )
                                    ) ===
                                    String(
                                        accountId
                                    )
                                        ? normalized
                                        : account
                            )
                    );


                    /*
                    =================================================
                    REFRESH WORKER LEDGER
                    =================================================
                    */

                    if (
                        normalized.type ===
                        "WORKER"
                    ) {

                        await loadWorkerLedgers(
                            accountId,
                            getId(
                                selectedWorkerLedger
                            )
                        );

                    }


                    alert(
                        "Ledger transaction updated successfully."
                    );


                } catch (err) {

                    console.error(
                        "Failed to update ledger transaction:",
                        err
                    );


                    alert(
                        err.response
                            ?.data
                            ?.message ||
                        err.message ||
                        "Failed to update ledger transaction."
                    );


                } finally {

                    setSaving(
                        false
                    );

                }

            };

            /*
            ========================================================
            TRANSACTION EXPANSION
            ========================================================
            */

            const toggleTransaction = (
                transactionId
            ) => {

                setExpandedTransactions(
                    (current) => ({

                        ...current,

                        [transactionId]:
                            !current[
                                transactionId
                            ],

                    })
                );

            };


            /*
            ========================================================
            RENDER
            ========================================================
            */

            return (

                <div className="space-y-6 pb-10">


                    {/* ==================================================
                        HEADER
                    ================================================== */}

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                        <div className="flex items-center gap-3">

                            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">

                                <FaBook />

                            </div>


                            <div>

                                <h1 className="text-2xl font-bold">
                                    Ledger
                                </h1>


                                <p className="text-sm text-base-content/60 mt-1">
                                    Worker salary ledger and customer credit records.
                                </p>

                            </div>

                        </div>


                        <div className="flex gap-2">

                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {

                                    loadAccounts();

                                    loadProducts();

                                }}
                                disabled={
                                    loading ||
                                    productsLoading
                                }
                            >

                                <FaSyncAlt
                                    className={
                                        loading ||
                                        productsLoading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                Refresh

                            </button>


                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() =>
                                    openAddCredit()
                                }
                            >

                                <FaPlus />

                                Add Credit

                            </button>

                        </div>

                    </div>


                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {error && (

                        <div className="alert alert-error">

                            <FaExclamationTriangle />

                            <span>
                                {error}
                            </span>

                        </div>

                    )}


                    {/* ==================================================
                        SUMMARY
                    ================================================== */}

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

                        <SummaryCard
                            label="Total Outstanding"
                            value={
                                formatMoney(
                                    totalOutstanding
                                )
                            }
                            helper="Outstanding credit"
                            icon={
                                <FaWallet />
                            }
                        />


                        <SummaryCard
                            label="Workers"
                            value={
                                totalWorkers
                            }
                            helper="Worker accounts"
                            icon={
                                <FaUserTie />
                            }
                        />


                        <SummaryCard
                            label="Customers"
                            value={
                                totalCustomers
                            }
                            helper="Customer accounts"
                            icon={
                                <FaUsers />
                            }
                        />


                        <SummaryCard
                            label="Worker Salary Remaining"
                            value={
                                formatMoney(
                                    workersRemainingSalary
                                )
                            }
                            helper="Across OPEN worker ledgers"
                            icon={
                                <FaMoneyBillWave />
                            }
                        />

                    </div>


                    {/* ==================================================
                        FILTERS
                    ================================================== */}

                    <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm p-4">

                        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">

                            <div className="relative w-full lg:w-96">

                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm" />


                                <input
                                    type="text"
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Search name or phone..."
                                    className="input input-bordered input-sm w-full pl-9"
                                />

                            </div>


                            <div className="tabs tabs-boxed">

                                {[
                                    ["ALL", "All"],
                                    ["WORKER", "Workers"],
                                    ["CUSTOMER", "Customers"],
                                ].map(
                                    ([
                                        value,
                                        label,
                                    ]) => (

                                        <button
                                            key={value}
                                            type="button"
                                            className={`tab ${
                                                activeTab ===
                                                value
                                                    ? "tab-active"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                setActiveTab(
                                                    value
                                                )
                                            }
                                        >

                                            {label}

                                        </button>

                                    )
                                )}

                            </div>


                            <select
                                value={
                                    statusFilter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setStatusFilter(
                                        event.target.value
                                    )
                                }
                                className="select select-bordered select-sm"
                            >

                                <option value="ALL">
                                    All Status
                                </option>

                                <option value="OPEN">
                                    Open Worker Ledger
                                </option>

                                <option value="PAID">
                                    Paid
                                </option>

                                <option value="UNPAID">
                                    Unpaid Customer
                                </option>

                            </select>

                        </div>

                    </div>


                    {/* ==================================================
                        ACCOUNTS
                    ================================================== */}

                    <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-hidden">

                        <div className="px-5 py-4 border-b border-base-200">

                            <h2 className="font-bold">
                                Ledger Accounts
                            </h2>


                            <p className="text-xs text-base-content/50 mt-1">

                                {
                                    filteredAccounts.length
                                } accounts

                            </p>

                        </div>


                        {loading ? (

                            <div className="py-16 text-center">

                                <span className="loading loading-spinner loading-md text-primary" />

                                <p className="text-sm text-base-content/50 mt-3">
                                    Loading ledger accounts...
                                </p>

                            </div>

                        ) : filteredAccounts.length ===
                            0 ? (

                            <div className="py-16 text-center">

                                <FaSearch className="mx-auto text-2xl text-base-content/20" />

                                <p className="font-semibold mt-3">
                                    No accounts found
                                </p>

                            </div>

                        ) : (

                            <div className="divide-y divide-base-200">

                                {filteredAccounts.map(
                                    (account) => {

                                        const status =
                                            getAccountStatus(
                                                account
                                            );


                                        const remaining =
                                            getRemainingSalary(
                                                account
                                            );


                                        return (

                                            <button
                                                key={
                                                    getId(
                                                        account
                                                    )
                                                }
                                                type="button"
                                                onClick={() =>
                                                    openAccount(
                                                        account
                                                    )
                                                }
                                                className="w-full text-left p-5 hover:bg-base-200/50 transition"
                                            >

                                                <div className="flex flex-col xl:flex-row xl:items-center gap-5">


                                                    <div className="flex items-center gap-3 min-w-[250px]">

                                                        <div
                                                            className={`
                                                                w-11 h-11
                                                                rounded-full
                                                                flex items-center
                                                                justify-center

                                                                ${
                                                                    account.type ===
                                                                    "WORKER"
                                                                        ? "bg-primary/10 text-primary"
                                                                        : "bg-info/10 text-info"
                                                                }
                                                            `}
                                                        >

                                                            {
                                                                account.type ===
                                                                "WORKER"
                                                                    ? <FaUserTie />
                                                                    : <FaUsers />
                                                            }

                                                        </div>


                                                        <div>

                                                            <p className="font-semibold">
                                                                {account.name}
                                                            </p>


                                                            <p className="text-[10px] text-base-content/40 mt-1">

                                                                {account.type}

                                                                {
                                                                    account.phone
                                                                        ? ` • ${account.phone}`
                                                                        : ""
                                                                }

                                                            </p>

                                                        </div>

                                                    </div>


                                                    {account.type ===
                                                    "WORKER" ? (

                                                        <div className="flex-1">

                                                            <p className="text-xs text-base-content/50">
                                                                Current Ledger
                                                            </p>


                                                            <p className="font-semibold mt-1">

                                                                {
                                                                    account
                                                                        .currentWorkerLedger
                                                                        ? getLedgerLabel(
                                                                            account
                                                                                .currentWorkerLedger
                                                                        )
                                                                        : account
                                                                            .latestWorkerLedger
                                                                            ? `${getLedgerLabel(
                                                                                account.latestWorkerLedger
                                                                            )} — ${account.latestWorkerLedger.status}`
                                                                            : "No ledger"
                                                                }

                                                            </p>


                                                            <p className="text-[10px] text-base-content/40 mt-1">

                                                                {
                                                                    formatPayFrequency(
                                                                        account
                                                                            .payFrequency
                                                                    )
                                                                }

                                                                {" • Salary "}

                                                                {
                                                                    formatMoney(
                                                                        account.salary
                                                                    )
                                                                }

                                                            </p>

                                                        </div>

                                                    ) : (

                                                        <div className="flex-1">

                                                            <p className="text-xs text-base-content/50">
                                                                Outstanding Balance
                                                            </p>


                                                            <p className="text-xl font-bold mt-1">

                                                                {
                                                                    formatMoney(
                                                                        account
                                                                            .creditBalance
                                                                    )
                                                                }

                                                            </p>

                                                        </div>

                                                    )}


                                                    {account.type ===
                                                        "WORKER" && (

                                                        <div className="min-w-[180px]">

                                                            <p className="text-xs text-base-content/50">
                                                                Remaining Salary
                                                            </p>


                                                            <p className="font-bold text-success mt-1">

                                                                {
                                                                    account
                                                                        .currentWorkerLedger
                                                                        ? formatMoney(
                                                                            remaining
                                                                        )
                                                                        : "—"
                                                                }

                                                            </p>

                                                        </div>

                                                    )}


                                                    <div>

                                                        <span
                                                            className={`badge badge-sm gap-1 ${status.className}`}
                                                        >

                                                            {status.icon}

                                                            {status.label}

                                                        </span>

                                                    </div>

                                                </div>

                                            </button>

                                        );

                                    }
                                )}

                            </div>

                        )}

                    </div>


                    {/* ==================================================
                        ACCOUNT MODAL
                    ================================================== */}

                    {selectedAccount && (

                        <dialog className="modal modal-open">

                            <div className="modal-box max-w-5xl">


                                <div className="flex items-start justify-between gap-4">

                                    <div className="flex items-center gap-3">

                                        <div
                                            className={`
                                                w-12 h-12
                                                rounded-full
                                                flex items-center
                                                justify-center

                                                ${
                                                    selectedAccount.type ===
                                                    "WORKER"
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-info/10 text-info"
                                                }
                                            `}
                                        >

                                            {
                                                selectedAccount.type ===
                                                "WORKER"
                                                    ? <FaUserTie />
                                                    : <FaUsers />
                                            }

                                        </div>


                                        <div>

                                            <h2 className="text-xl font-bold">

                                                {
                                                    selectedAccount.name
                                                }

                                            </h2>


                                            <p className="text-xs text-base-content/50 mt-1">

                                                {
                                                    selectedAccount.type
                                                }

                                                {
                                                    selectedAccount.phone
                                                        ? ` • ${selectedAccount.phone}`
                                                        : ""
                                                }

                                                {
                                                    selectedAccount.type ===
                                                    "WORKER"
                                                        ? ` • ${formatPayFrequency(
                                                            selectedAccount
                                                                .payFrequency
                                                        )}`
                                                        : ""
                                                }

                                            </p>

                                        </div>

                                    </div>


                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm btn-square"
                                        onClick={
                                            closeAccount
                                        }
                                    >

                                        <FaTimes />

                                    </button>

                                </div>


                                {selectedAccountLoading && (

                                    <p className="mt-4 text-xs text-base-content/50">
                                        Loading account details...
                                    </p>

                                )}


                                {/* ================================================
                                    WORKER LEDGER CONTROL
                                ================================================= */}

                                {selectedAccount.type ===
                                    "WORKER" && (

                                    <div className="mt-5 bg-base-200 rounded-xl p-4">

                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                                            <div>

                                                <div className="flex items-center gap-2">

                                                    <FaCalendarAlt className="text-primary" />


                                                    <p className="font-semibold">
                                                        Worker Ledger
                                                    </p>

                                                </div>


                                                <p className="text-xs text-base-content/50 mt-1">

                                                    One OPEN ledger at a time.

                                                </p>

                                            </div>


                                            <div className="flex flex-col sm:flex-row gap-2">


                                                {/* HISTORY */}

                                                {workerLedgers.length >
                                                    0 && (

                                                    <select
                                                        value={
                                                            getId(
                                                                selectedWorkerLedger
                                                            ) ||
                                                            ""
                                                        }
                                                        onChange={
                                                            handleWorkerLedgerChange
                                                        }
                                                        disabled={
                                                            workerLedgersLoading
                                                        }
                                                        className="select select-bordered select-sm min-w-[300px]"
                                                    >

                                                        {workerLedgers.map(
                                                            (ledger) => (

                                                                <option
                                                                    key={
                                                                        getId(
                                                                            ledger
                                                                        )
                                                                    }
                                                                    value={
                                                                        getId(
                                                                            ledger
                                                                        )
                                                                    }
                                                                >

                                                                    {
                                                                        getLedgerLabel(
                                                                            ledger
                                                                        )
                                                                    }

                                                                    {" — "}

                                                                    {
                                                                        ledger.status
                                                                    }

                                                                </option>

                                                            )
                                                        )}

                                                    </select>

                                                )}


                                                {/* ===================================
                                                    CREATE NEW LIST

                                                    NO OPEN LIST:
                                                        no history -> SHOW

                                                    NO OPEN LIST:
                                                        latest = PAID -> SHOW

                                                    OPEN LIST:
                                                        NEVER SHOW
                                                ==================================== */}

                                                {canCreateNewWorkerLedger && (

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleCreateWorkerLedger
                                                        }
                                                        disabled={
                                                            creatingWorkerLedger
                                                        }
                                                        className="btn btn-primary btn-sm"
                                                    >

                                                        {
                                                            creatingWorkerLedger
                                                                ? (
                                                                    <span className="loading loading-spinner loading-sm" />
                                                                )
                                                                : (
                                                                    <FaPlus />
                                                                )
                                                        }

                                                        Create New List

                                                    </button>

                                                )}

                                            </div>

                                        </div>


                                        {/* NO LEDGER */}

                                        {workerLedgers.length ===
                                            0 && (

                                            <div className="alert mt-4">

                                                <FaExclamationTriangle />


                                                <div>

                                                    <p className="font-semibold">
                                                        No ledger yet
                                                    </p>


                                                    <p className="text-xs mt-1">
                                                        Create the worker's first ledger to begin recording credits and cash advances.
                                                    </p>

                                                </div>

                                            </div>

                                        )}


                                        {/* OPEN LEDGER */}

                                        {openWorkerLedger && (

                                            <div className="alert alert-info mt-4">

                                                <FaClock />


                                                <div>

                                                    <p className="font-semibold">
                                                        Current ledger is OPEN
                                                    </p>


                                                    <p className="text-xs mt-1">

                                                        A new list cannot be created until this worker is paid from the Workers & Salary page.

                                                    </p>

                                                </div>

                                            </div>

                                        )}


                                        {/* PAID */}

                                        {selectedWorkerLedger
                                            ?.status ===
                                            "PAID" && (

                                            <div className="alert alert-success mt-4">

                                                <FaCheckCircle />


                                                <div>

                                                    <p className="font-semibold">
                                                        This ledger has been paid
                                                    </p>


                                                    <p className="text-xs mt-1">

                                                        Paid on{" "}

                                                        {
                                                            formatDate(
                                                                selectedWorkerLedger
                                                                    .paidAt
                                                            )
                                                        }

                                                        {
                                                            selectedWorkerLedger
                                                                .salaryReleased !=
                                                            null
                                                                ? ` • Salary released: ${formatMoney(
                                                                    selectedWorkerLedger
                                                                        .salaryReleased
                                                                )}`
                                                                : ""
                                                        }

                                                    </p>

                                                </div>

                                            </div>

                                        )}

                                    </div>

                                )}


                                {/* ================================================
                                    WORKER SUMMARY
                                ================================================= */}

                                {selectedAccount.type ===
                                    "WORKER" && (

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">

                                        <LedgerSummaryBox
                                            label="Salary"
                                            value={
                                                formatMoney(
                                                    selectedWorkerLedger
                                                        ?.salary ??
                                                    selectedAccount
                                                        .salary
                                                )
                                            }
                                        />


                                        <LedgerSummaryBox
                                            label="Credits"
                                            value={
                                                formatMoney(
                                                    selectedWorkerLedger
                                                        ?.totalCredits ??
                                                    0
                                                )
                                            }
                                        />


                                        <LedgerSummaryBox
                                            label="Cash Advances"
                                            value={
                                                formatMoney(
                                                    selectedWorkerLedger
                                                        ?.totalCashAdvances ??
                                                    0
                                                )
                                            }
                                        />


                                        <LedgerSummaryBox
                                            label="Remaining Salary"
                                            value={
                                                formatMoney(
                                                    selectedWorkerLedger
                                                        ?.remainingSalary ??
                                                    0
                                                )
                                            }
                                            valueClass="text-success"
                                        />

                                    </div>

                                )}


                                {/* ================================================
                                    CUSTOMER SUMMARY
                                ================================================= */}

                                {selectedAccount.type ===
                                    "CUSTOMER" && (

                                    <div className="grid grid-cols-2 gap-3 mt-6">

                                        <LedgerSummaryBox
                                            label="Total Credit"
                                            value={
                                                formatMoney(
                                                    selectedAccount
                                                        .creditTotal
                                                )
                                            }
                                        />


                                        <LedgerSummaryBox
                                            label="Outstanding"
                                            value={
                                                formatMoney(
                                                    selectedAccount
                                                        .creditBalance
                                                )
                                            }
                                            valueClass="text-warning"
                                        />

                                    </div>

                                )}


                                {/* ================================================
                                    WORKER PERIOD DETAILS
                                ================================================= */}

                                {selectedAccount.type ===
                                    "WORKER" &&
                                    selectedWorkerLedger && (

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">

                                        <InfoBox
                                            label="Period"
                                            value={
                                                getLedgerLabel(
                                                    selectedWorkerLedger
                                                )
                                            }
                                        />


                                        <InfoBox
                                            label="Scheduled Payday"
                                            value={
                                                formatDate(
                                                    selectedWorkerLedger
                                                        .scheduledPayDate
                                                )
                                            }
                                        />


                                        <InfoBox
                                            label="Credit Payments"
                                            value={
                                                formatMoney(
                                                    selectedWorkerLedger
                                                        .totalPayments
                                                )
                                            }
                                        />


                                        <InfoBox
                                            label="Status"
                                            value={
                                                selectedWorkerLedger
                                                    .status
                                            }
                                        />

                                    </div>

                                )}


                                {/* ================================================
                                    ACTION BUTTONS
                                ================================================= */}

                                <div className="flex flex-wrap gap-2 mt-5">


                                    <button
                                        type="button"
                                        onClick={() =>
                                            openAddCredit(
                                                selectedAccount
                                            )
                                        }
                                        disabled={
                                            !selectedAccount
                                                .isActive ||
                                            (
                                                selectedAccount
                                                    .type ===
                                                    "WORKER" &&
                                                !selectedWorkerLedgerIsOpen
                                            )
                                        }
                                        className="btn btn-primary btn-sm"
                                    >

                                        <FaPlus />

                                        Add Credit

                                    </button>


                                    {selectedAccount.type ===
                                        "WORKER" && (

                                        <button
                                            type="button"
                                            onClick={() =>
                                                openCashAdvance(
                                                    selectedAccount
                                                )
                                            }
                                            disabled={
                                                !selectedAccount
                                                    .isActive ||
                                                !selectedWorkerLedgerIsOpen
                                            }
                                            className="btn btn-success btn-sm"
                                        >

                                            <FaMoneyBillWave />

                                            Cash Advance

                                        </button>

                                    )}


                                    {Number(
                                        selectedAccount
                                            .creditBalance
                                    ) > 0 && (

                                        <button
                                            type="button"
                                            onClick={() =>
                                                openPayment(
                                                    selectedAccount
                                                )
                                            }
                                            disabled={
                                                !selectedAccount
                                                    .isActive ||
                                                (
                                                    selectedAccount
                                                        .type ===
                                                        "WORKER" &&
                                                    !selectedWorkerLedgerIsOpen
                                                )
                                            }
                                            className="btn btn-outline btn-sm"
                                        >

                                            <FaWallet />

                                            Credit Payment

                                        </button>

                                    )}


                                    {selectedAccount.type ===
                                        "WORKER" &&
                                        selectedWorkerLedger && (

                                        <button
                                            type="button"
                                            onClick={
                                                handlePrintLedger
                                            }
                                            disabled={
                                                saving
                                            }
                                            className="btn btn-outline btn-sm ml-auto"
                                        >

                                            {
                                                saving
                                                    ? (
                                                        <span className="loading loading-spinner loading-sm" />
                                                    )
                                                    : (
                                                        <FaPrint />
                                                    )
                                            }

                                            Print Ledger

                                        </button>

                                    )}

                                </div>


                                {/* ================================================
                                    WORKER PAYMENT INFORMATION

                                    NO MARK AS PAID BUTTON
                                ================================================= */}

                                {selectedAccount.type ===
                                    "WORKER" &&
                                    selectedWorkerLedger
                                        ?.status ===
                                        "OPEN" && (

                                    <div className="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/20">

                                        <p className="font-semibold text-sm">
                                            Salary payment
                                        </p>


                                        <p className="text-xs text-base-content/60 mt-1">

                                            To pay this worker, use the Pay Worker button on the Workers & Salary page.

                                        </p>

                                    </div>

                                )}


                                {/* ================================================
                                    HISTORY
                                ================================================= */}

                                <div className="mt-7">

                                    <div className="flex items-center justify-between gap-3 mb-3">

                                        <div>

                                            <div className="flex items-center gap-2">

                                                <FaHistory className="text-base-content/40" />


                                                <h3 className="font-semibold">
                                                    Account History
                                                </h3>

                                            </div>


                                            <p className="text-xs text-base-content/40 mt-1">

                                                {
                                                    selectedAccount.type ===
                                                    "WORKER"
                                                        ? (
                                                            selectedWorkerLedger
                                                                ? getLedgerLabel(
                                                                    selectedWorkerLedger
                                                                )
                                                                : "No ledger selected"
                                                        )
                                                        : "Customer credit history"
                                                }

                                            </p>

                                        </div>


                                        <span className="text-xs text-base-content/40">

                                            {
                                                (
                                                    selectedAccount
                                                        .transactions ||
                                                    []
                                                ).length
                                            } transactions

                                        </span>

                                    </div>


                                    <TransactionList
            transactions={
                selectedAccount
                    .transactions ||
                []
            }
            expandedTransactions={
                expandedTransactions
            }
            toggleTransaction={
                toggleTransaction
            }
            formatMoney={
                formatMoney
            }
            formatDate={
                formatDate
            }

            isAdmin={
                isAdmin
            }

            canEditTransactions={
                selectedAccount.type !==
                    "WORKER" ||
                selectedWorkerLedger?.status ===
                    "OPEN"
            }

            onEditTransaction={
                openEditTransaction
            }
        />

                                </div>

                            </div>

                        </dialog>

                    )}


                    {/* ==================================================
                        ADD CREDIT MODAL
                    ================================================== */}

                    {showAddCredit && (

                        <dialog className="modal modal-open">

                            <div className="modal-box max-w-6xl">

                                <div className="flex items-start justify-between gap-4">

                                    <div>

                                        <h2 className="text-xl font-bold">
                                            Add Credit
                                        </h2>


                                        <p className="text-xs text-base-content/50 mt-1">

                                            {
                                                creditAccount
                                                    ? `Add products or custom items to ${creditAccount.name}'s account.`
                                                    : "Select an account."
                                            }

                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={
                                            closeAddCredit
                                        }
                                        className="btn btn-ghost btn-sm btn-square"
                                    >

                                        <FaTimes />

                                    </button>

                                </div>


                                <div className="mt-5">

                                    <label className="label">

                                        <span className="label-text font-semibold">
                                            Account
                                        </span>

                                    </label>


                                    <select
                                        value={
                                            creditAccount
                                                ? String(
                                                    getId(
                                                        creditAccount
                                                    )
                                                )
                                                : ""
                                        }
                                        onChange={(
                                            event
                                        ) => {

                                            const account =
                                                accounts.find(
                                                    (item) =>
                                                        String(
                                                            getId(
                                                                item
                                                            )
                                                        ) ===
                                                        event.target
                                                            .value
                                                );


                                            if (
                                                account?.type ===
                                                    "WORKER" &&
                                                !account
                                                    .currentWorkerLedger
                                            ) {

                                                alert(
                                                    "This worker does not have an OPEN ledger."
                                                );

                                                return;

                                            }


                                            setCreditAccount(
                                                account ||
                                                null
                                            );

                                        }}
                                        className="select select-bordered w-full"
                                    >

                                        <option value="">
                                            Select worker or customer
                                        </option>


                                        {accounts
                                            .filter(
                                                (account) =>
                                                    account.type ===
                                                        "CUSTOMER" ||
                                                    Boolean(
                                                        account
                                                            .currentWorkerLedger
                                                    )
                                            )
                                            .map(
                                                (account) => (

                                                    <option
                                                        key={
                                                            getId(
                                                                account
                                                            )
                                                        }
                                                        value={
                                                            getId(
                                                                account
                                                            )
                                                        }
                                                    >

                                                        {account.name}

                                                        {" — "}

                                                        {account.type}

                                                    </option>

                                                )
                                            )}

                                    </select>

                                </div>


                                {productsError && (

                                    <div className="alert alert-error mt-4">

                                        <FaExclamationTriangle />

                                        <span>
                                            {productsError}
                                        </span>

                                    </div>

                                )}


                                <div className="alert mt-4">

                                    <div className="text-sm">

                                        <strong>
                                            Keyboard:
                                        </strong>

                                        {" ↑ ↓ Navigate • Enter Add • Esc Close • F8 Save"}

                                    </div>

                                </div>


                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">


                                    {/* PRODUCTS */}

                                    <div>

                                        <div className="flex items-center justify-between gap-3 mb-3">

                                            <h3 className="font-semibold">
                                                Products
                                            </h3>


                                            <button
                                                type="button"
                                                onClick={
                                                    openCustomCredit
                                                }
                                                className="btn btn-outline btn-sm"
                                            >

                                                <FaPlus />

                                                Grocery / Custom

                                            </button>

                                        </div>


                                        {/* ==========================================
                                            COMBINED BARCODE + SEARCH INPUT
                                        ========================================== */}

                                        <div className="relative">

                                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />


                                            <input
                                                ref={
                                                    productSearchRef
                                                }
                                                type="text"
                                                value={
                                                    productSearch
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setProductSearch(
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                onKeyDown={
                                                    handleProductSearchKeyDown
                                                }
                                                placeholder="Scan barcode or search product..."
                                                className="input input-bordered input-sm w-full pl-9"
                                                autoComplete="off"
                                            />

                                        </div>


                                        <div
                                            ref={
                                                productListRef
                                            }
                                            className="border border-base-200 rounded-lg mt-3 max-h-80 overflow-y-auto"
                                        >

                                            {productsLoading ? (

                                                <div className="py-12 text-center">

                                                    <span className="loading loading-spinner loading-sm" />

                                                </div>

                                            ) : filteredProducts.length ===
                                                0 ? (

                                                <div className="py-12 text-center text-sm text-base-content/50">

                                                    No products found.

                                                </div>

                                            ) : (

                                                filteredProducts.map(
                                                    (
                                                        product,
                                                        index
                                                    ) => {

                                                        const selected =
                                                            index ===
                                                            selectedProductIndex;


                                                        return (

                                                            <button
                                                                key={
                                                                    product.id
                                                                }
                                                                type="button"
                                                                data-selected-product={
                                                                    selected
                                                                        ? "true"
                                                                        : "false"
                                                                }
                                                                disabled={
                                                                    product.stock <=
                                                                    0
                                                                }
                                                                onClick={() => {

                                                                    setSelectedProductIndex(
                                                                        index
                                                                    );

                                                                    addProductToCredit(
                                                                        product
                                                                    );

                                                                }}
                                                                className={`
                                                                    w-full
                                                                    p-3
                                                                    text-left
                                                                    border-b
                                                                    border-base-200
                                                                    transition

                                                                    ${
                                                                        selected
                                                                            ? "bg-primary text-primary-content"
                                                                            : "hover:bg-base-200"
                                                                    }

                                                                    ${
                                                                        product.stock <=
                                                                        0
                                                                            ? "opacity-40"
                                                                            : ""
                                                                    }
                                                                `}
                                                            >

                                                                <div className="flex justify-between gap-4">

                                                                    <div>

                                                                        <p className="font-semibold text-sm">

                                                                            {
                                                                                product.name
                                                                            }

                                                                        </p>


                                                                        <p className="text-[10px] opacity-70 mt-1">

                                                                            {
                                                                                product.barcode ||
                                                                                "No barcode"
                                                                            }

                                                                        </p>

                                                                    </div>


                                                                    <div className="text-right">

                                                                        <p className="font-bold">

                                                                            {
                                                                                formatMoney(
                                                                                    product.price
                                                                                )
                                                                            }

                                                                        </p>


                                                                        <p className="text-[10px] opacity-70">

                                                                            Stock:{" "}

                                                                            {
                                                                                product.stock
                                                                            }

                                                                        </p>

                                                                    </div>

                                                                </div>

                                                            </button>

                                                        );

                                                    }
                                                )

                                            )}

                                        </div>

                                    </div>


                                    {/* CREDIT CART */}

                                    <div className="border border-base-200 rounded-xl overflow-hidden">

                                        <div className="p-4 border-b border-base-200">

                                            <h3 className="font-semibold">
                                                Credit Items
                                            </h3>

                                        </div>


                                        {creditCart.length ===
                                            0 ? (

                                            <div className="py-16 text-center">

                                                <FaReceipt className="mx-auto text-2xl text-base-content/20" />


                                                <p className="mt-3 text-sm">
                                                    No items added
                                                </p>

                                            </div>

                                        ) : (

                                            <div className="max-h-80 overflow-y-auto">

                                                {creditCart.map(
                                                    (item) => {

                                                        const itemId =
                                                            item.cartId ||
                                                            item.productId;


                                                        const isCustom =
                                                            item.itemType ===
                                                            "CUSTOM";


                                                        return (

                                                            <div
                                                                key={
                                                                    itemId
                                                                }
                                                                className="p-3 border-b border-base-200 flex items-center gap-3"
                                                            >

                                                                <div className="flex-1 min-w-0">

                                                                    <div className="flex items-center gap-2">

                                                                        <p className="font-semibold text-sm truncate">

                                                                            {
                                                                                item.name
                                                                            }

                                                                        </p>


                                                                        {isCustom && (

                                                                            <span className="badge badge-info badge-xs">
                                                                                Custom
                                                                            </span>

                                                                        )}

                                                                    </div>
                                                                            {isCustom &&
            item.note && (

            <p className="text-xs text-base-content/60 mt-1 break-words">

                {item.note}

            </p>

        )}

                                                                    <p className="text-[10px] text-base-content/40">

                                                                        {
                                                                            isCustom
                                                                                ? `${formatMoney(
                                                                                    item.price
                                                                                )} custom amount`
                                                                                : `${formatMoney(
                                                                                    item.price
                                                                                )} / ${item.unit}`
                                                                        }

                                                                    </p>

                                                                </div>


                                                                <div className="flex items-center border border-base-200 rounded-lg">

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            changeCreditQuantity(
                                                                                itemId,
                                                                                -1
                                                                            )
                                                                        }
                                                                        className="btn btn-ghost btn-xs btn-square"
                                                                    >

                                                                        <FaMinus />

                                                                    </button>


                                                                    <span className="w-8 text-center text-xs font-bold">

                                                                        {
                                                                            item.quantity
                                                                        }

                                                                    </span>


                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            changeCreditQuantity(
                                                                                itemId,
                                                                                1
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !isCustom &&
                                                                            item.quantity >=
                                                                            item.stock
                                                                        }
                                                                        className="btn btn-ghost btn-xs btn-square"
                                                                    >

                                                                        <FaPlus />

                                                                    </button>

                                                                </div>


                                                                <p className="font-bold w-24 text-right">

                                                                    {
                                                                        formatMoney(
                                                                            item.price *
                                                                            item.quantity
                                                                        )
                                                                    }

                                                                </p>


                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeCreditItem(
                                                                            itemId
                                                                        )
                                                                    }
                                                                    className="btn btn-ghost btn-xs btn-square text-error"
                                                                >

                                                                    <FaTrash />

                                                                </button>

                                                            </div>

                                                        );

                                                    }
                                                )}

                                            </div>

                                        )}


                                        <div className="p-4 bg-base-200/50">

                                            <div className="flex justify-between">

                                                <strong>
                                                    Credit Total
                                                </strong>


                                                <strong className="text-xl">

                                                    {
                                                        formatMoney(
                                                            creditCartTotal
                                                        )
                                                    }

                                                </strong>

                                            </div>


                                            {creditAccount
                                                ?.type ===
                                                "WORKER" &&
                                                creditAccount
                                                    .currentWorkerLedger && (

                                                <div className="mt-3 text-xs text-base-content/50">

                                                    Remaining salary after credit:

                                                    <strong className="ml-1 text-base-content">

                                                        {
                                                            formatMoney(
                                                                Math.max(
                                                                    Number(
                                                                        creditAccount
                                                                            .currentWorkerLedger
                                                                            .remainingSalary
                                                                    ) -
                                                                    creditCartTotal,
                                                                    0
                                                                )
                                                            )
                                                        }

                                                    </strong>

                                                </div>

                                            )}

                                        </div>

                                    </div>

                                </div>


                                <div className="modal-action">

                                    <button
                                        type="button"
                                        onClick={
                                            closeAddCredit
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="btn"
                                    >

                                        Cancel

                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            completeCredit
                                        }
                                        disabled={
                                            saving ||
                                            !creditAccount ||
                                            creditCart.length ===
                                                0
                                        }
                                        className="btn btn-primary"
                                    >

                                        {
                                            saving
                                                ? (
                                                    <span className="loading loading-spinner loading-sm" />
                                                )
                                                : (
                                                    <FaPlus />
                                                )
                                        }

                                        {
                                            saving
                                                ? "Saving..."
                                                : `Add Credit ${formatMoney(
                                                    creditCartTotal
                                                )}`
                                        }

                                    </button>

                                </div>

                            </div>

                        </dialog>

                    )}


                    {/* ==================================================
                        CUSTOM / GROCERY CREDIT MODAL
                    ================================================== */}

                    {showCustomCredit && (

                        <dialog className="modal modal-open">

                            <div className="modal-box max-w-md">

                                <div className="flex items-start justify-between gap-4">

                                    <div>

                                        <h2 className="text-xl font-bold">
                                            Grocery / Custom Item
                                        </h2>


                                        <p className="text-xs text-base-content/50 mt-1">
                                            Add a custom amount without affecting product inventory.
                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm btn-square"
                                        onClick={
                                            closeCustomCredit
                                        }
                                    >

                                        <FaTimes />

                                    </button>

                                </div>


                                <div className="mt-5">

                                    <label className="label">

                                        <span className="label-text font-semibold">
                                            Item Name
                                        </span>

                                    </label>


                                    <input
                                        type="text"
                                        value={
                                            customCreditName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCustomCreditName(
                                                event.target.value
                                            )
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="Grocery"
                                        autoComplete="off"
                                    />

                                </div>

                                <div className="mt-4">

            <label className="label">

                <span className="label-text font-semibold">
                    Description / Note
                </span>

                <span className="label-text-alt text-base-content/40">
                    Optional
                </span>

            </label>


            <input
                ref={
                    customCreditNoteRef
                }
                type="text"
                value={
                    customCreditNote
                }
                onChange={(
                    event
                ) =>
                    setCustomCreditNote(
                        event.target.value
                    )
                }
                onKeyDown={(
                    event
                ) => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();

                        addCustomCreditItem();

                    }


                    if (
                        event.key ===
                        "Escape"
                    ) {

                        event.preventDefault();

                        event.stopPropagation();

                        closeCustomCredit();

                    }

                }}
                maxLength={
                    80
                }
                className="input input-bordered w-full"
                placeholder="e.g. Rice, vegetables, canned goods..."
                autoComplete="off"
            />


            <p className="text-[10px] text-base-content/40 mt-1">

                Optional description that will appear in the ledger and receipt.

            </p>

        </div>


                                <div className="mt-4">

                                    <label className="label">

                                        <span className="label-text font-semibold">
                                            Amount
                                        </span>

                                    </label>


                                    <div className="relative">

                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold">
                                            ₱
                                        </span>


                                        <input
                                            ref={
                                                customCreditAmountRef
                                            }
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={
                                                customCreditAmount
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setCustomCreditAmount(
                                                    event.target.value
                                                )
                                            }
                                            onKeyDown={(
                                                event
                                            ) => {

                                                if (
                                                    event.key ===
                                                    "Enter"
                                                ) {

                                                    event.preventDefault();

                                                    event.stopPropagation();

                                                    addCustomCreditItem();

                                                }


                                                if (
                                                    event.key ===
                                                    "Escape"
                                                ) {

                                                    event.preventDefault();

                                                    event.stopPropagation();

                                                    closeCustomCredit();

                                                }

                                            }}
                                            className="input input-bordered w-full pl-9 text-lg font-bold"
                                            placeholder="0.00"
                                        />

                                    </div>

                                </div>


                                <div className="rounded-xl bg-base-200/50 p-4 mt-5">

                                    <div className="flex justify-between">

                                        <span className="text-sm text-base-content/60">
                                            Credit amount
                                        </span>


                                        <strong className="text-lg">

                                            {
                                                formatMoney(
                                                    customCreditAmount
                                                )
                                            }

                                        </strong>

                                    </div>

                                </div>


                                <div className="modal-action">

                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={
                                            closeCustomCredit
                                        }
                                    >

                                        Cancel

                                    </button>


                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={
                                            addCustomCreditItem
                                        }
                                    >

                                        <FaPlus />

                                        Add Item

                                    </button>

                                </div>

                            </div>

                        </dialog>

                    )}


                    {/* ==================================================
                        CASH ADVANCE MODAL
                    ================================================== */}

                    {showCashAdvance &&
                        cashAdvanceAccount && (

                        <dialog className="modal modal-open">

                            <div className="modal-box max-w-md">

                                <div className="flex items-start justify-between">

                                    <div>

                                        <h2 className="text-xl font-bold">
                                            Cash Advance
                                        </h2>


                                        <p className="text-xs text-base-content/50 mt-1">

                                            {
                                                cashAdvanceAccount.name
                                            }

                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={
                                            closeCashAdvance
                                        }
                                        className="btn btn-ghost btn-sm btn-square"
                                    >

                                        <FaTimes />

                                    </button>

                                </div>


                                <div className="mt-5 bg-base-200 rounded-lg p-4 space-y-2">

                                    <InfoRow
                                        label="Salary"
                                        value={
                                            formatMoney(
                                                selectedWorkerLedger
                                                    ?.salary ??
                                                cashAdvanceAccount
                                                    .salary
                                            )
                                        }
                                    />


                                    <InfoRow
                                        label="Credits"
                                        value={
                                            formatMoney(
                                                selectedWorkerLedger
                                                    ?.totalCredits ??
                                                0
                                            )
                                        }
                                    />


                                    <InfoRow
                                        label="Cash Advances"
                                        value={
                                            formatMoney(
                                                selectedWorkerLedger
                                                    ?.totalCashAdvances ??
                                                0
                                            )
                                        }
                                    />


                                    <InfoRow
                                        label="Available Salary"
                                        value={
                                            formatMoney(
                                                selectedWorkerLedger
                                                    ?.remainingSalary ??
                                                0
                                            )
                                        }
                                    />

                                </div>


                                <div className="mt-4">

                                    <label className="label">

                                        <span className="label-text">
                                            Advance Amount
                                        </span>

                                    </label>


                                    <input
                                        type="number"
                                        autoFocus
                                        min="0"
                                        step="0.01"
                                        value={
                                            cashAdvanceAmount
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCashAdvanceAmount(
                                                event.target.value
                                            )
                                        }
                                        className="input input-bordered w-full"
                                        placeholder="0.00"
                                    />

                                </div>


                                <div className="mt-4">

                                    <label className="label">

                                        <span className="label-text">
                                            Reason
                                        </span>

                                    </label>


                                    <textarea
                                        value={
                                            cashAdvanceReason
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCashAdvanceReason(
                                                event.target.value
                                            )
                                        }
                                        rows="3"
                                        className="textarea textarea-bordered w-full"
                                        placeholder="Reason for cash advance..."
                                    />

                                </div>


                                <div className="modal-action">

                                    <button
                                        type="button"
                                        onClick={
                                            closeCashAdvance
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="btn"
                                    >

                                        Cancel

                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            saveCashAdvance
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="btn btn-success"
                                    >

                                        {
                                            saving
                                                ? (
                                                    <span className="loading loading-spinner loading-sm" />
                                                )
                                                : (
                                                    <FaMoneyBillWave />
                                                )
                                        }

                                        Give Cash Advance

                                    </button>

                                </div>

                            </div>

                        </dialog>

                    )}


                    {/* ==================================================
                        CREDIT PAYMENT MODAL
                    ================================================== */}

                    {showPayment &&
                        paymentAccount && (

                        <dialog className="modal modal-open">

                            <div className="modal-box max-w-md">

                                <div className="flex items-start justify-between">

                                    <div>

                                        <h2 className="text-xl font-bold">
                                            Credit Payment
                                        </h2>


                                        <p className="text-xs text-base-content/50 mt-1">

                                            {
                                                paymentAccount.name
                                            }

                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={
                                            closePayment
                                        }
                                        className="btn btn-ghost btn-sm btn-square"
                                    >

                                        <FaTimes />

                                    </button>

                                </div>


                                <div className="mt-5 bg-base-200 rounded-lg p-4">

                                    <InfoRow
                                        label="Outstanding Credit"
                                        value={
                                            formatMoney(
                                                paymentAccount
                                                    .creditBalance
                                            )
                                        }
                                    />

                                </div>


                                <div className="mt-4">

                                    <label className="label">

                                        <span className="label-text">
                                            Payment Amount
                                        </span>

                                    </label>


                                    <input
                                        type="number"
                                        autoFocus
                                        min="0"
                                        max={
                                            paymentAccount
                                                .creditBalance
                                        }
                                        step="0.01"
                                        value={
                                            paymentAmount
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPaymentAmount(
                                                event.target.value
                                            )
                                        }
                                        placeholder="0.00"
                                        className="input input-bordered w-full"
                                    />

                                </div>


                                <div className="mt-4">

                                    <label className="label">

                                        <span className="label-text">
                                            Remarks
                                        </span>

                                    </label>


                                    <textarea
                                        value={
                                            paymentRemarks
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPaymentRemarks(
                                                event.target.value
                                            )
                                        }
                                        rows="3"
                                        className="textarea textarea-bordered w-full"
                                        placeholder="Payment details..."
                                    />

                                </div>


                                <div className="modal-action">

                                    <button
                                        type="button"
                                        onClick={
                                            closePayment
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="btn"
                                    >

                                        Cancel

                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            savePayment
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="btn btn-success"
                                    >

                                        {
                                            saving
                                                ? (
                                                    <span className="loading loading-spinner loading-sm" />
                                                )
                                                : (
                                                    <FaMoneyBillWave />
                                                )
                                        }

                                        Record Payment

                                    </button>

                                </div>
                                        
                            </div>

                        </dialog>

                    )}
                    {/* ==================================================
            EDIT TRANSACTION MODAL
        ================================================== */}

        {showEditTransaction &&
            editingTransaction && (

            <dialog className="modal modal-open">

                <div className="modal-box max-w-4xl">

                    {/* ==========================================
                        HEADER
                    ========================================== */}

                    <div className="flex items-start justify-between gap-4">

                        <div>

                            <div className="flex items-center gap-2">

                                <FaEdit className="text-primary" />


                                <h2 className="text-xl font-bold">

                                    Edit{" "}

                                    {
                                        editingTransaction.type ===
                                            "CREDIT"
                                            ? "Credit Transaction"
                                            : editingTransaction.type ===
                                                "PAYMENT"
                                                ? "Credit Payment"
                                                : "Cash Advance"
                                    }

                                </h2>

                            </div>


                            <p className="text-xs text-base-content/50 mt-1">

                                {
                                    selectedAccount?.name
                                }

                            </p>


                            <p className="text-[10px] text-warning mt-2">

                                Administrative correction. This change will be recorded
                                in the transaction audit history.

                            </p>

                        </div>


                        <button
                            type="button"
                            onClick={
                                closeEditTransaction
                            }
                            disabled={
                                saving
                            }
                            className="btn btn-ghost btn-sm btn-square"
                        >

                            <FaTimes />

                        </button>

                    </div>


                    {/* ==========================================
                        CREDIT EDITOR
                    ========================================== */}

                    {editingTransaction.type ===
                        "CREDIT" && (

                        <div className="mt-6">

                            {/* ==================================
                                ADD PRODUCT
                            ================================== */}

                            <div className="rounded-xl border border-base-200 p-4">

                                <div className="flex items-center justify-between gap-3">

                                    <div>

                                        <h3 className="font-semibold">
                                            Add Product
                                        </h3>


                                        <p className="text-xs text-base-content/50 mt-1">
                                            Search a product to add it to the corrected transaction.
                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={
                                            addCustomToEditTransaction
                                        }
                                        className="btn btn-outline btn-sm"
                                    >

                                        <FaPlus />

                                        Grocery / Custom

                                    </button>

                                </div>


                                <div className="relative mt-4">

                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />


                                    <input
                                        type="text"
                                        value={
                                            editProductSearch
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setEditProductSearch(
                                                event.target.value
                                            )
                                        }
                                        className="input input-bordered input-sm w-full pl-9"
                                        placeholder="Search product or barcode..."
                                    />

                                </div>


                                {editFilteredProducts.length >
                                    0 && (

                                    <div className="border border-base-200 rounded-lg mt-2 overflow-hidden max-h-48 overflow-y-auto">

                                        {editFilteredProducts.map(
                                            (product) => (

                                                <button
                                                    key={
                                                        product.id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        addProductToEditTransaction(
                                                            product
                                                        )
                                                    }
                                                    className="w-full flex items-center justify-between gap-4 p-3 border-b last:border-0 border-base-200 text-left hover:bg-base-200/50"
                                                >

                                                    <div>

                                                        <p className="text-sm font-semibold">
                                                            {product.name}
                                                        </p>


                                                        <p className="text-[10px] text-base-content/40 mt-1">
                                                            {product.barcode || "No barcode"}
                                                        </p>

                                                    </div>


                                                    <div className="text-right">

                                                        <p className="font-semibold">
                                                            {formatMoney(product.price)}
                                                        </p>


                                                        <p className="text-[10px] text-base-content/40">
                                                            Stock: {product.stock}
                                                        </p>

                                                    </div>

                                                </button>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>


                            {/* ==================================
                                CREDIT ITEMS
                            ================================== */}

                            <div className="mt-4 border border-base-200 rounded-xl overflow-hidden">

                                <div className="p-4 border-b border-base-200">

                                    <h3 className="font-semibold">
                                        Corrected Credit Items
                                    </h3>

                                </div>


                                {editTransactionItems.length ===
                                    0 ? (

                                    <div className="py-10 text-center text-sm text-base-content/50">

                                        No items.

                                    </div>

                                ) : (

                                    <div className="divide-y divide-base-200">

                                        {editTransactionItems.map(
                                            (item) => {

                                                const isCustom =
                                                    item.itemType ===
                                                    "CUSTOM";


                                                return (

                                                    <div
                                                        key={
                                                            item.cartId
                                                        }
                                                        className="p-4"
                                                    >

                                                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                                                            {/* NAME */}

                                                            <div className="flex-1">

                                                                {isCustom ? (

            <>

                <label className="text-[10px] text-base-content/50">
                    Custom Item Name
                </label>


                <input
                    type="text"
                    value={
                        item.name
                    }
                    onChange={(
                        event
                    ) =>
                        updateEditCustomItem(
                            item.cartId,
                            "name",
                            event.target.value
                        )
                    }
                    className="input input-bordered input-sm w-full mt-1"
                />


                <label className="text-[10px] text-base-content/50 block mt-3">
                    Description / Note
                </label>


                <input
                    type="text"
                    value={
                        item.note ||
                        ""
                    }
                    onChange={(
                        event
                    ) =>
                        updateEditCustomItem(
                            item.cartId,
                            "note",
                            event.target.value
                        )
                    }
                    maxLength={
                        80
                    }
                    className="input input-bordered input-sm w-full mt-1"
                    placeholder="Optional description..."
                />

            </>

        ) : (

                                                                    <>

                                                                        <div className="flex items-center gap-2">

                                                                            <FaBox className="text-base-content/30" />


                                                                            <p className="font-semibold">
                                                                                {item.name}
                                                                            </p>

                                                                        </div>


                                                                        <p className="text-[10px] text-base-content/40 mt-1">
                                                                            {item.barcode || "No barcode"}
                                                                        </p>

                                                                    </>

                                                                )}

                                                            </div>


                                                            {/* CUSTOM PRICE */}

                                                            {isCustom && (

                                                                <div className="w-full lg:w-40">

                                                                    <label className="text-[10px] text-base-content/50">
                                                                        Unit Amount
                                                                    </label>


                                                                    <input
                                                                        type="number"
                                                                        min="0.01"
                                                                        step="0.01"
                                                                        value={
                                                                            item.unitPrice
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            updateEditCustomItem(
                                                                                item.cartId,
                                                                                "unitPrice",
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                        className="input input-bordered input-sm w-full mt-1"
                                                                    />

                                                                </div>

                                                            )}


                                                            {/* QUANTITY */}

                                                            <div>

                                                                <p className="text-[10px] text-base-content/50 mb-1">
                                                                    Quantity
                                                                </p>


                                                                <div className="flex items-center border border-base-200 rounded-lg">

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            changeEditItemQuantity(
                                                                                item.cartId,
                                                                                -1
                                                                            )
                                                                        }
                                                                        className="btn btn-ghost btn-xs btn-square"
                                                                    >

                                                                        <FaMinus />

                                                                    </button>


                                                                    <span className="w-10 text-center text-sm font-bold">

                                                                        {
                                                                            item.quantity
                                                                        }

                                                                    </span>


                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            changeEditItemQuantity(
                                                                                item.cartId,
                                                                                1
                                                                            )
                                                                        }
                                                                        className="btn btn-ghost btn-xs btn-square"
                                                                    >

                                                                        <FaPlus />

                                                                    </button>

                                                                </div>

                                                            </div>


                                                            {/* TOTAL */}

                                                            <div className="w-28 text-right">

                                                                <p className="text-[10px] text-base-content/50">
                                                                    Total
                                                                </p>


                                                                <p className="font-bold mt-1">

                                                                    {
                                                                        formatMoney(
                                                                            Number(
                                                                                item.unitPrice
                                                                            ) *
                                                                            Number(
                                                                                item.quantity
                                                                            )
                                                                        )
                                                                    }

                                                                </p>

                                                            </div>


                                                            {/* DELETE */}

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeEditTransactionItem(
                                                                        item.cartId
                                                                    )
                                                                }
                                                                className="btn btn-ghost btn-sm btn-square text-error"
                                                            >

                                                                <FaTrash />

                                                            </button>

                                                        </div>

                                                    </div>

                                                );

                                            }
                                        )}

                                    </div>

                                )}


                                <div className="p-4 bg-base-200/40 flex justify-between">

                                    <strong>
                                        Corrected Total
                                    </strong>


                                    <strong className="text-xl">

                                        {
                                            formatMoney(
                                                editCreditTotal
                                            )
                                        }

                                    </strong>

                                </div>

                            </div>

                        </div>

                    )}


                    {/* ==========================================
                        PAYMENT / CASH ADVANCE AMOUNT
                    ========================================== */}

                    {editingTransaction.type !==
                        "CREDIT" && (

                        <div className="mt-6">

                            <label className="label">

                                <span className="label-text font-semibold">

                                    {
                                        editingTransaction.type ===
                                            "PAYMENT"
                                            ? "Payment Amount"
                                            : "Cash Advance Amount"
                                    }

                                </span>

                            </label>


                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={
                                    editTransactionAmount
                                }
                                onChange={(
                                    event
                                ) =>
                                    setEditTransactionAmount(
                                        event.target.value
                                    )
                                }
                                className="input input-bordered w-full"
                                placeholder="0.00"
                            />

                        </div>

                    )}


                    {/* ==========================================
                        REMARKS
                    ========================================== */}

                    <div className="mt-5">

                        <label className="label">

                            <span className="label-text font-semibold">
                                Remarks
                            </span>

                        </label>


                        <textarea
                            value={
                                editTransactionRemarks
                            }
                            onChange={(
                                event
                            ) =>
                                setEditTransactionRemarks(
                                    event.target.value
                                )
                            }
                            rows="3"
                            className="textarea textarea-bordered w-full"
                            placeholder="Transaction remarks..."
                        />

                    </div>


                    {/* ==========================================
                        EDIT REASON
                    ========================================== */}

                    <div className="mt-5">

                        <label className="label">

                            <span className="label-text font-semibold">
                                Reason for Edit *
                            </span>

                        </label>


                        <textarea
                            value={
                                editTransactionReason
                            }
                            onChange={(
                                event
                            ) =>
                                setEditTransactionReason(
                                    event.target.value
                                )
                            }
                            rows="3"
                            className="textarea textarea-bordered w-full"
                            placeholder="Example: Wrong quantity entered by cashier"
                        />


                        <p className="text-[10px] text-base-content/40 mt-1">

                            This reason is permanently saved in the transaction edit history.

                        </p>

                    </div>


                    {/* ==========================================
                        ACTIONS
                    ========================================== */}

                    <div className="modal-action">

                        <button
                            type="button"
                            onClick={
                                closeEditTransaction
                            }
                            disabled={
                                saving
                            }
                            className="btn"
                        >

                            Cancel

                        </button>


                        <button
                            type="button"
                            onClick={
                                saveEditedTransaction
                            }
                            disabled={
                                saving ||
                                !editTransactionReason
                                    .trim()
                            }
                            className="btn btn-primary"
                        >

                            {
                                saving
                                    ? (
                                        <span className="loading loading-spinner loading-sm" />
                                    )
                                    : (
                                        <FaEdit />
                                    )
                            }

                            {
                                saving
                                    ? "Saving..."
                                    : "Save Changes"
                            }

                        </button>

                    </div>

                </div>

            </dialog>

        )}  
                </div>

            );

        }


        /*
        ============================================================
        SUMMARY CARD
        ============================================================
        */

        function SummaryCard({
            label,
            value,
            helper,
            icon,
        }) {

            return (

                <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">

                    <div className="flex items-start justify-between">

                        <div>

                            <p className="text-xs text-base-content/50">
                                {label}
                            </p>


                            <p className="text-2xl font-bold mt-2">
                                {value}
                            </p>

                        </div>


                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">

                            {icon}

                        </div>

                    </div>


                    <p className="text-[10px] text-base-content/50 mt-2">
                        {helper}
                    </p>

                </div>

            );

        }


        /*
        ============================================================
        LEDGER SUMMARY BOX
        ============================================================
        */

        function LedgerSummaryBox({
            label,
            value,
            valueClass = "",
        }) {

            return (

                <div className="bg-base-200 rounded-xl p-4">

                    <p className="text-xs text-base-content/50">
                        {label}
                    </p>


                    <p
                        className={`font-bold text-xl mt-1 ${valueClass}`}
                    >
                        {value}
                    </p>

                </div>

            );

        }


        /*
        ============================================================
        INFO BOX
        ============================================================
        */

        function InfoBox({
            label,
            value,
        }) {

            return (

                <div className="bg-base-100 border border-base-200 rounded-lg p-3">

                    <p className="text-[10px] text-base-content/50">
                        {label}
                    </p>


                    <p className="font-semibold mt-1">
                        {value}
                    </p>

                </div>

            );

        }


        /*
        ============================================================
        INFO ROW
        ============================================================
        */

        function InfoRow({
            label,
            value,
        }) {

            return (

                <div className="flex justify-between gap-3">

                    <span className="text-xs text-base-content/50">
                        {label}
                    </span>


                    <span className="font-semibold text-sm">
                        {value}
                    </span>

                </div>

            );

        }

    /*
    ============================================================
    TRANSACTION LIST
    ============================================================
    */

   /*
============================================================
TRANSACTION LIST
============================================================
*/

function TransactionList({
    transactions,
    expandedTransactions,
    toggleTransaction,
    formatMoney,
    formatDate,

    isAdmin,
    canEditTransactions,
    onEditTransaction,
}) {

    if (
        !transactions ||
        transactions.length === 0
    ) {

        return (

            <div className="border border-base-200 rounded-xl py-12 text-center">

                <FaReceipt className="mx-auto text-2xl text-base-content/20" />


                <p className="font-semibold mt-3">
                    No transactions
                </p>

            </div>

        );

    }


    return (

        <div className="border border-base-200 rounded-xl overflow-hidden">

            {transactions.map(
                (
                    transaction,
                    index
                ) => {

                    const transactionId =
                        transaction.id ||
                        transaction._id ||
                        `${transaction.type}-${index}`;


                    const expanded =
                        Boolean(
                            expandedTransactions[
                                transactionId
                            ]
                        );


                    const isPayment =
                        transaction.type ===
                        "PAYMENT";


                    const isAdvance =
                        transaction.type ===
                        "CASH_ADVANCE";


                    const isCredit =
                        transaction.type ===
                        "CREDIT";


                    /*
                    ====================================================
                    CREDIT TYPE
                    ====================================================
                    */

                    const hasCustomItem =
                        isCredit &&
                        Array.isArray(
                            transaction.items
                        ) &&
                        transaction.items.some(
                            (item) =>
                                item?.itemType ===
                                "CUSTOM"
                        );


                    const hasProductItem =
                        isCredit &&
                        Array.isArray(
                            transaction.items
                        ) &&
                        transaction.items.some(
                            (item) =>
                                item?.itemType ===
                                "PRODUCT"
                        );


                    /*
                    ====================================================
                    TITLE
                    ====================================================

                    CUSTOM only   = Grocery Credit
                    PRODUCT only  = Credit Purchase
                    Mixed         = Credit Purchase
                    PAYMENT       = Credit Payment
                    ADVANCE       = Cash Advance
                    ====================================================
                    */

                    const transactionTitle =
                        isPayment
                            ? "Credit Payment"

                            : isAdvance
                                ? "Cash Advance"

                                : hasCustomItem &&
                                    !hasProductItem
                                    ? "Grocery Credit"

                                    : "Grocery Credit";


                    /*
                    ====================================================
                    TRANSACTION NOTE ITEMS
                    ====================================================
                    */

                    const noteItems =
                        isCredit &&
                        Array.isArray(
                            transaction.items
                        )
                            ? transaction.items
                                .map(
                                    (
                                        item,
                                        noteIndex
                                    ) => {

                                        const note =
                                            String(
                                                item?.note ??
                                                item?.description ??
                                                item?.remarks ??
                                                ""
                                            )
                                                .replace(
                                                    /\s+/g,
                                                    " "
                                                )
                                                .trim();


                                        if (!note) {

                                            return null;

                                        }


                                        return {

                                            key:
                                                `${transactionId}-note-${noteIndex}`,

                                            name:
                                                item?.name ||
                                                item?.product?.name ||
                                                "Item",

                                            note,

                                        };

                                    }
                                )
                                .filter(Boolean)
                            : [];


                    return (

                        <div
                            key={
                                transactionId
                            }
                            className="border-b last:border-0 border-base-200"
                        >

                            {/* ==========================================
                                TRANSACTION HEADER
                            ========================================== */}

                            <div className="flex items-stretch">


                                {/* ======================================
                                    CLICKABLE TRANSACTION AREA
                                ====================================== */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleTransaction(
                                            transactionId
                                        )
                                    }
                                    className="flex-1 min-w-0 text-left p-4 hover:bg-base-200/40 transition"
                                >

                                    <div className="flex justify-between gap-4">

                                        <div className="min-w-0">

                                            {/* ==============================
                                                TITLE
                                            ============================== */}

                                            <p className="font-semibold">

                                                {
                                                    transactionTitle
                                                }

                                            </p>


                                            {/* ==============================
                                                DESCRIPTION / REMARKS

                                                For Grocery/custom-only
                                                transactions we do NOT show
                                                this because the note appears
                                                below through noteItems.

                                                This prevents:

                                                Grocery: Rice
                                                Grocery: Rice
                                            ============================== */}

                                            


                                            {/* ==============================
                                                GROCERY / CUSTOM NOTE
                                            ============================== */}

                                            


                                            {/* ==============================
                                                DATE
                                            ============================== */}

                                            <p className="text-[10px] text-base-content/40 mt-1">

                                                {
                                                    formatDate(
                                                        transaction.date
                                                    )
                                                }

                                            </p>

                                        </div>


                                        {/* ==================================
                                            AMOUNT + EXPAND ICON
                                        ================================== */}

                                        <div className="flex items-center gap-3 shrink-0">

                                            <p
                                                className={`
                                                    font-bold

                                                    ${
                                                        isPayment
                                                            ? "text-success"
                                                            : isAdvance
                                                                ? "text-warning"
                                                                : "text-error"
                                                    }
                                                `}
                                            >

                                                {
                                                    isPayment
                                                        ? "-"
                                                        : "+"
                                                }

                                                {
                                                    formatMoney(
                                                        transaction.amount
                                                    )
                                                }

                                            </p>


                                            {
                                                transaction.items
                                                    ?.length >
                                                0 &&
                                                (
                                                    expanded
                                                        ? <FaChevronUp />
                                                        : <FaChevronDown />
                                                )
                                            }

                                        </div>

                                    </div>

                                </button>


                                {/* ======================================
                                    EDIT BUTTON

                                    SIBLING — NOT NESTED
                                ====================================== */}

                                {isAdmin &&
                                    canEditTransactions && (

                                    <div className="flex items-center px-3">

                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => {

                                                onEditTransaction(
                                                    transaction
                                                );

                                            }}
                                            title="Edit transaction"
                                        >

                                            <FaEdit />

                                            Edit

                                        </button>

                                    </div>

                                )}

                            </div>


                            {/* ==========================================
                                EXPANDED TRANSACTION ITEMS
                            ========================================== */}

                            {expanded &&
                                transaction.items
                                    ?.length >
                                    0 && (

                                <div className="px-4 pb-4">

                                    <div className="rounded-lg bg-base-200/40 overflow-hidden">

                                        {transaction.items.map(
                                            (
                                                item,
                                                itemIndex
                                            ) => {

                                                const isCustom =
                                                    item.itemType ===
                                                    "CUSTOM";


                                                const itemName =
                                                    item?.name ||
                                                    item?.product?.name ||
                                                    "Item";


                                                const itemNote =
                                                    String(
                                                        item?.note ??
                                                        item?.description ??
                                                        item?.remarks ??
                                                        ""
                                                    )
                                                        .replace(
                                                            /\s+/g,
                                                            " "
                                                        )
                                                        .trim();


                                                const quantity =
                                                    Number(
                                                        item?.quantity
                                                    ) || 0;


                                                const price =
                                                    Number(
                                                        item?.price ??
                                                        item?.unitPrice ??
                                                        item?.product?.price
                                                    ) || 0;


                                                const total =
                                                    Number(
                                                        item?.total ??
                                                        item?.totalPrice
                                                    ) ||
                                                    (
                                                        quantity *
                                                        price
                                                    );


                                                return (

                                                    <div
                                                        key={
                                                            `${transactionId}-${itemIndex}`
                                                        }
                                                        className="px-4 py-3 border-b last:border-0 border-base-200 flex justify-between gap-4"
                                                    >

                                                        <div className="flex items-start gap-3 min-w-0">

                                                            <FaBox className="text-base-content/30 mt-1 shrink-0" />


                                                            <div className="min-w-0">

                                                                <div className="flex flex-wrap items-center gap-2">

                                                                    <p className="text-sm font-semibold">

                                                                        {
                                                                            itemName
                                                                        }

                                                                    </p>


                                                                    {isCustom && (

                                                                        <span className="badge badge-info badge-xs">

                                                                            Custom

                                                                        </span>

                                                                    )}

                                                                </div>


                                                                {/* ==================================
                                                                    ITEM NOTE
                                                                ================================== */}

                                                                {itemNote && (

                                                                    <p className="text-xs text-base-content/70 mt-1 break-words whitespace-normal">

                                                                        {
                                                                            itemNote
                                                                        }

                                                                    </p>

                                                                )}


                                                                <p className="text-[10px] text-base-content/40 mt-1">

                                                                    {
                                                                        quantity
                                                                    }

                                                                    {" × "}

                                                                    {
                                                                        formatMoney(
                                                                            price
                                                                        )
                                                                    }


                                                                    {isCustom && (

                                                                        <>
                                                                            {" • Custom Item"}
                                                                        </>

                                                                    )}

                                                                </p>

                                                            </div>

                                                        </div>


                                                        <p className="font-semibold shrink-0">

                                                            {
                                                                formatMoney(
                                                                    total
                                                                )
                                                            }

                                                        </p>

                                                    </div>

                                                );

                                            }
                                        )}

                                    </div>

                                </div>

                            )}

                        </div>

                    );

                }
            )}

        </div>

    );

}


        export default LedgerPage;