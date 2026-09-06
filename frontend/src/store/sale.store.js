    import { create } from "zustand";
    import saleService from "../services/sale.service";


    const useSaleStore = create((set, get) => ({

        /*
        ============================================================
        STATE
        ============================================================
        */

        sales: [],

        loading: false,

        search: "",

        dateFilter: "today",

        selectedSale: null,

        receiptOpen: false,


        /*
        ============================================================
        SEARCH
        ============================================================
        */

        setSearch: (value) => {

            set({
                search: value,
            });

        },


        /*
        ============================================================
        DATE FILTER
        ============================================================
        */

        setDateFilter: (value) => {

            set({
                dateFilter: value,
            });

        },


        /*
        ============================================================
        FILTER SALES
        ============================================================
        */

        filteredSales: () => {

            /*
            --------------------------------------------------------
            DATE RANGE HELPER
            --------------------------------------------------------
            */

            const isWithinDateRange = (
                saleDate,
                filter
            ) => {

                const now =
                    new Date();


                const date =
                    new Date(
                        saleDate
                    );


                /*
                ----------------------------------------------------
                TODAY
                ----------------------------------------------------
                */

                if (
                    filter ===
                    "today"
                ) {

                    const start =
                        new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate()
                        );


                    const end =
                        new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate() + 1
                        );


                    return (
                        date >= start &&
                        date < end
                    );

                }


                /*
                ----------------------------------------------------
                YESTERDAY
                ----------------------------------------------------
                */

                if (
                    filter ===
                    "yesterday"
                ) {

                    const start =
                        new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate() - 1
                        );


                    const end =
                        new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate()
                        );


                    return (
                        date >= start &&
                        date < end
                    );

                }


                /*
                ----------------------------------------------------
                THIS WEEK

                Monday = first day
                ----------------------------------------------------
                */

                if (
                    filter ===
                    "week"
                ) {

                    const start =
                        new Date(
                            now
                        );


                    const day =
                        start.getDay();


                    const difference =
                        day === 0
                            ? 6
                            : day - 1;


                    start.setDate(
                        start.getDate() -
                        difference
                    );


                    start.setHours(
                        0,
                        0,
                        0,
                        0
                    );


                    const end =
                        new Date(
                            start
                        );


                    end.setDate(
                        end.getDate() +
                        7
                    );


                    return (
                        date >= start &&
                        date < end
                    );

                }


                /*
                ----------------------------------------------------
                THIS MONTH
                ----------------------------------------------------
                */

                if (
                    filter ===
                    "month"
                ) {

                    const start =
                        new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            1
                        );


                    const end =
                        new Date(
                            now.getFullYear(),
                            now.getMonth() + 1,
                            1
                        );


                    return (
                        date >= start &&
                        date < end
                    );

                }


                /*
                ----------------------------------------------------
                THIS YEAR
                ----------------------------------------------------
                */

                if (
                    filter ===
                    "year"
                ) {

                    const start =
                        new Date(
                            now.getFullYear(),
                            0,
                            1
                        );


                    const end =
                        new Date(
                            now.getFullYear() + 1,
                            0,
                            1
                        );


                    return (
                        date >= start &&
                        date < end
                    );

                }


                /*
                ----------------------------------------------------
                ALL
                ----------------------------------------------------
                */

                if (
                    filter ===
                    "all"
                ) {

                    return true;

                }


                return true;

            };


            /*
            --------------------------------------------------------
            STORE VALUES
            --------------------------------------------------------
            */

            const {
                sales,
                search,
                dateFilter,
            } = get();


            const keyword =
                String(
                    search || ""
                )
                    .trim()
                    .toLowerCase();


            /*
            --------------------------------------------------------
            FILTER
            --------------------------------------------------------
            */

            return sales.filter(
                (
                    sale
                ) => {

                    /*
                    =================================================
                    SEARCH
                    =================================================
                    */

                    const receiptMatch =
                        String(
                            sale.receiptNumber ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                keyword
                            );


                    const cashierMatch =
                        String(
                            sale.cashier
                                ?.name ||
                            sale.cashier
                                ?.username ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                keyword
                            );


                    const itemMatch =
                        Array.isArray(
                            sale.items
                        )
                            ? sale.items.some(
                                (
                                    item
                                ) => {

                                    const name =
                                        String(
                                            item.name ||
                                            ""
                                        )
                                            .toLowerCase();


                                    const barcode =
                                        String(
                                            item.barcode ||
                                            ""
                                        )
                                            .toLowerCase();


                                    return (
                                        name.includes(
                                            keyword
                                        ) ||
                                        barcode.includes(
                                            keyword
                                        )
                                    );

                                }
                            )
                            : false;


                    /*
                    =================================================
                    DATE
                    =================================================
                    */

                    const dateMatch =
                        isWithinDateRange(
                            sale.createdAt,
                            dateFilter
                        );


                    /*
                    Empty search should match everything.
                    */

                    const searchMatch =
                        keyword === ""
                            ? true
                            : (
                                receiptMatch ||
                                cashierMatch ||
                                itemMatch
                            );


                    return (
                        searchMatch &&
                        dateMatch
                    );

                }
            );

        },


        /*
        ============================================================
        FETCH SALES
        ============================================================
        */

        fetchSales: async () => {

            try {

                set({
                    loading: true,
                });


                const sales =
                    await saleService
                        .getSales();


                set({
                    sales:
                        Array.isArray(
                            sales
                        )
                            ? sales
                            : [],

                    loading:
                        false,
                });


                return sales;


            } catch (
                error
            ) {

                console.error(
                    "FETCH SALES ERROR:",
                    error.response
                        ?.data ||
                    error
                );


                set({
                    loading: false,
                });


                throw error;

            }

        },


        /*
        ============================================================
        OPEN RECEIPT
        ============================================================
        */

        openReceipt: async (
            id
        ) => {

            try {

                const sale =
                    await saleService
                        .getSaleById(
                            id
                        );


                set({
                    selectedSale:
                        sale,

                    receiptOpen:
                        true,
                });


                return sale;


            } catch (
                error
            ) {

                console.error(
                    "OPEN RECEIPT ERROR:",
                    error.response
                        ?.data ||
                    error
                );


                throw error;

            }

        },


        /*
        ============================================================
        CLOSE RECEIPT
        ============================================================
        */

        closeReceipt: () => {

            set({

                receiptOpen:
                    false,

                selectedSale:
                    null,

            });

        },


        /*
        ============================================================
        VOID SALE
        ============================================================

        After void:

        - refresh all sales
        - update selectedSale if that receipt is currently open
        ============================================================
        */

        voidSale: async (
            id
        ) => {

            try {

                set({
                    loading: true,
                });


                const result =
                    await saleService
                        .voidSale(
                            id
                        );


                const sales =
                    await saleService
                        .getSales();


                const currentSelected =
                    get()
                        .selectedSale;


                let selectedSale =
                    currentSelected;


                /*
                If the currently opened receipt is the one
                being voided, refresh it.
                */

                if (
                    currentSelected?._id &&
                    String(
                        currentSelected._id
                    ) ===
                    String(
                        id
                    )
                ) {

                    try {

                        selectedSale =
                            await saleService
                                .getSaleById(
                                    id
                                );

                    } catch {

                        selectedSale =
                            result;

                    }

                }


                set({

                    sales:
                        Array.isArray(
                            sales
                        )
                            ? sales
                            : [],

                    selectedSale,

                    loading:
                        false,

                });


                return result;


            } catch (
                error
            ) {

                console.error(
                    "VOID SALE ERROR:",
                    error.response
                        ?.data ||
                    error
                );


                set({
                    loading: false,
                });


                throw error;

            }

        },


        /*
        ============================================================
        REFUND SALE
        ============================================================

        After refund:

        - update selected receipt immediately
        - refresh Sales History
        - totals/cards recalculate automatically
        ============================================================
        */

        refundSale: async (
            saleId,
            items
        ) => {

            try {

                set({
                    loading: true,
                });


                /*
                Perform refund.
                */

                const refundedSale =
                    await saleService
                        .refundSale(
                            saleId,
                            items
                        );


                /*
                Reload all Sales History data.
                */

                const sales =
                    await saleService
                        .getSales();


                /*
                Fetch full populated receipt again.

                This is preferable to relying only on
                refundSale() response because getSaleById()
                may include populated cashier information.
                */

                let selectedSale =
                    refundedSale;


                try {

                    selectedSale =
                        await saleService
                            .getSaleById(
                                saleId
                            );

                } catch (
                    receiptError
                ) {

                    console.warn(
                        "Could not refresh receipt after refund:",
                        receiptError
                    );

                }


                set({

                    sales:
                        Array.isArray(
                            sales
                        )
                            ? sales
                            : [],

                    selectedSale,

                    loading:
                        false,

                });


                return selectedSale;


            } catch (
                error
            ) {

                console.error(
                    "REFUND SALE ERROR:",
                    error.response
                        ?.data ||
                    error
                );


                set({
                    loading: false,
                });


                throw error;

            }

        },

    }));


    export default useSaleStore;