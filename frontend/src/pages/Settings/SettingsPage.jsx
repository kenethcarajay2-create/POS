import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    FaCog,
    FaStore,
    FaCloudUploadAlt,
    FaShieldAlt,
    FaDatabase,
    FaCheckCircle,
    FaServer,
    FaWifi,
    FaClock,
    FaSyncAlt,
    FaExclamationTriangle,
    FaBuilding,
    FaChevronRight,
} from "react-icons/fa";

import syncService from "../../services/sync.service";


/*
============================================================
FORMAT DATE / TIME
============================================================
*/

const formatDateTime =
    (
        value
    ) => {

        if (
            !value
        ) {

            return "Never";

        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Unknown";

        }


        return date.toLocaleString(
            "en-PH",
            {
                year:
                    "numeric",

                month:
                    "short",

                day:
                    "numeric",

                hour:
                    "numeric",

                minute:
                    "2-digit",
            }
        );

    };


/*
============================================================
SETTINGS PAGE
============================================================
*/

function SettingsPage() {

    /*
    ========================================================
    NAVIGATION
    ========================================================
    */

    const navigate =
        useNavigate();


    /*
    ========================================================
    CLOUD SYNC STATE
    ========================================================
    */

    const [
        syncStatus,
        setSyncStatus,
    ] =
        useState(
            null
        );


    const [
        syncLoading,
        setSyncLoading,
    ] =
        useState(
            true
        );


    const [
        syncing,
        setSyncing,
    ] =
        useState(
            false
        );


    const [
        syncError,
        setSyncError,
    ] =
        useState(
            ""
        );


    const [
        syncMessage,
        setSyncMessage,
    ] =
        useState(
            ""
        );


    /*
    ========================================================
    PRICED PRODUCT SYNC STATE
    ========================================================
    */

    const [
        pricedSyncStatus,
        setPricedSyncStatus,
    ] =
        useState(
            null
        );


    const [
        pricedSyncLoading,
        setPricedSyncLoading,
    ] =
        useState(
            true
        );


    const [
        pricedSyncing,
        setPricedSyncing,
    ] =
        useState(
            false
        );


    const [
        pricedSyncError,
        setPricedSyncError,
    ] =
        useState(
            ""
        );


    const [
        pricedSyncMessage,
        setPricedSyncMessage,
    ] =
        useState(
            ""
        );


    const [
        pricedSyncResult,
        setPricedSyncResult,
    ] =
        useState(
            null
        );


    /*
    ========================================================
    LOAD CLOUD STATUS
    ========================================================
    */

    const loadSyncStatus =
        useCallback(
            async () => {

                try {

                    setSyncError(
                        ""
                    );


                    const result =
                        await syncService
                            .getStatus();


                    setSyncStatus(
                        result
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "SYNC STATUS ERROR:",
                        error
                    );


                    setSyncError(
                        error.response
                            ?.data
                            ?.message ||
                        "Unable to load cloud backup status."
                    );


                } finally {

                    setSyncLoading(
                        false
                    );

                }

            },
            []
        );


    /*
    ========================================================
    LOAD PRICED PRODUCT SYNC STATUS
    ========================================================
    */

    const loadPricedSyncStatus =
        useCallback(
            async () => {

                try {

                    setPricedSyncError(
                        ""
                    );


                    const result =
                        await syncService
                            .getPricedProductsStatus();


                    setPricedSyncStatus(
                        result
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "PRICED PRODUCT SYNC STATUS ERROR:",
                        error
                    );


                    setPricedSyncError(
                        error.response
                            ?.data
                            ?.message ||
                        error.message ||
                        "Unable to load Product Pricing sync status."
                    );


                } finally {

                    setPricedSyncLoading(
                        false
                    );

                }

            },
            []
        );


    /*
    ========================================================
    INITIAL LOAD
    ========================================================
    */

    useEffect(
        () => {

            loadSyncStatus();

            loadPricedSyncStatus();

        },
        [
            loadSyncStatus,
            loadPricedSyncStatus,
        ]
    );


    /*
    ========================================================
    AUTO REFRESH STATUS
    ========================================================
    */

    useEffect(
        () => {

            const interval =
                setInterval(
                    () => {

                        loadSyncStatus();

                        loadPricedSyncStatus();

                    },
                    30000
                );


            return () => {

                clearInterval(
                    interval
                );

            };

        },
        [
            loadSyncStatus,
            loadPricedSyncStatus,
        ]
    );


    /*
    ========================================================
    SYNC NOW
    ========================================================
    */

    const handleSyncNow =
        async () => {

            if (
                syncing
            ) {

                return;

            }


            try {

                setSyncing(
                    true
                );


                setSyncError(
                    ""
                );


                setSyncMessage(
                    ""
                );


                const result =
                    await syncService
                        .syncNow();


                if (
                    result?.success ===
                    false
                ) {

                    setSyncMessage(
                        result.message ||
                        "A cloud sync is already running."
                    );

                } else {

                    setSyncMessage(
                        "Cloud backup completed successfully."
                    );

                }


                await loadSyncStatus();


            } catch (
                error
            ) {

                console.error(
                    "SYNC NOW ERROR:",
                    error
                );


                setSyncError(
                    error.response
                        ?.data
                        ?.message ||
                    error.message ||
                    "Cloud backup failed."
                );


            } finally {

                setSyncing(
                    false
                );

            }

        };


    /*
    ========================================================
    SYNC PRICED PRODUCTS
    ========================================================
    */

    const handlePricedProductSync =
        async () => {

            if (
                pricedSyncing
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    "Sync finalized priced products into StorePOS?\n\n" +
                    "Product names, barcodes, units, cost prices, pricing tiers, " +
                    "and active status may be updated.\n\n" +
                    "Branch inventory quantities will NOT be changed."
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                setPricedSyncing(
                    true
                );


                setPricedSyncError(
                    ""
                );


                setPricedSyncMessage(
                    ""
                );


                setPricedSyncResult(
                    null
                );


                const result =
                    await syncService
                        .syncPricedProducts();


                setPricedSyncResult(
                    result
                );


                if (
                    result?.success ===
                    false
                ) {

                    setPricedSyncMessage(
                        result.message ||
                        "A priced-product sync is already running."
                    );

                } else if (
                    Number(
                        result?.failed ||
                        0
                    ) >
                    0
                ) {

                    setPricedSyncMessage(
                        `Sync completed with ${result.failed} failed product(s).`
                    );

                } else {

                    setPricedSyncMessage(
                        "Priced products synchronized successfully."
                    );

                }


                await loadPricedSyncStatus();


            } catch (
                error
            ) {

                console.error(
                    "PRICED PRODUCT SYNC ERROR:",
                    error
                );


                setPricedSyncError(
                    error.response
                        ?.data
                        ?.message ||
                    error.message ||
                    "Priced-product synchronization failed."
                );


                await loadPricedSyncStatus();


            } finally {

                setPricedSyncing(
                    false
                );

            }

        };


    /*
    ========================================================
    PRICED PRODUCT SYNC HELPERS
    ========================================================
    */

    const pricedSyncSummary =
        pricedSyncResult ||
        pricedSyncStatus ||
        {};


    const pricedSyncState =
        pricedSyncStatus
            ?.status ||
        "IDLE";


    const pricedSyncBusy =
        pricedSyncing ||
        pricedSyncState ===
            "SYNCING";


    const pricedSyncPartial =
        pricedSyncState ===
            "PARTIAL";


    const pricedSyncFailed =
        pricedSyncState ===
            "FAILED";


    /*
    ========================================================
    CLOUD STATUS HELPERS
    ========================================================
    */

    const cloudConnected =
        syncStatus
            ?.cloudConnected ===
        true;


    const currentSyncStatus =
        syncStatus
            ?.status ||
        "IDLE";


    const successful =
        currentSyncStatus ===
        "SUCCESS";


    const failed =
        currentSyncStatus ===
        "FAILED";


    const currentlySyncing =
        syncing ||
        currentSyncStatus ===
            "SYNCING";


    const collectionCount =
        Array.isArray(
            syncStatus
                ?.collections
        )
            ? syncStatus
                .collections
                .length
            : 0;


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <div
            className="
                w-full
                space-y-6
                pb-8
            "
        >

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div
                className="
                    flex
                    flex-col
                    gap-4
                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <div
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            bg-primary/10
                            text-primary
                        "
                    >

                        <FaCog />

                    </div>


                    <div>

                        <h1
                            className="
                                text-2xl
                                font-bold
                                tracking-tight
                            "
                        >

                            Settings

                        </h1>


                        <p
                            className="
                                mt-1
                                text-sm
                                text-base-content/50
                            "
                        >

                            Manage StorePOS system settings,
                            branches, and cloud backup.

                        </p>

                    </div>

                </div>

            </div>


            {/* =================================================
                SETTINGS OVERVIEW
            ================================================= */}

            <div
                className="
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-3
                "
            >

                {/* =============================================
                    STORE SETTINGS
                ============================================= */}

                <button
                    type="button"

                    onClick={() => {

                        navigate(
                            "/settings/branches"
                        );

                    }}

                    className="
                        group
                        rounded-2xl
                        border
                        border-base-200
                        bg-base-100
                        p-5
                        text-left
                        shadow-sm
                        transition-all
                        duration-200
                        hover:border-primary/40
                        hover:shadow-md
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            justify-between
                            gap-3
                        "
                    >

                        <div
                            className="
                                flex
                                items-start
                                gap-3
                            "
                        >

                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-primary/10
                                    text-primary
                                "
                            >

                                <FaStore />

                            </div>


                            <div>

                                <h2
                                    className="
                                        font-semibold
                                    "
                                >

                                    Store Settings

                                </h2>


                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        leading-relaxed
                                        text-base-content/50
                                    "
                                >

                                    Manage branch locations,
                                    branch information, and
                                    StorePOS store configuration.

                                </p>

                            </div>

                        </div>


                        <FaChevronRight
                            className="
                                mt-1
                                shrink-0
                                text-base-content/30
                                transition
                                group-hover:translate-x-1
                                group-hover:text-primary
                            "
                        />

                    </div>


                    <div
                        className="
                            mt-4
                            flex
                            items-center
                            gap-2
                            text-xs
                            font-medium
                            text-primary
                        "
                    >

                        <FaBuilding />

                        Branch Management

                    </div>

                </button>


                {/* =============================================
                    CLOUD BACKUP
                ============================================= */}

                <div
                    className="
                        rounded-2xl
                        border
                        border-base-200
                        bg-base-100
                        p-5
                        shadow-sm
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            gap-3
                        "
                    >

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-info/10
                                text-info
                            "
                        >

                            <FaCloudUploadAlt />

                        </div>


                        <div>

                            <h2
                                className="
                                    font-semibold
                                "
                            >

                                Cloud Backup

                            </h2>


                            <p
                                className="
                                    mt-1
                                    text-xs
                                    leading-relaxed
                                    text-base-content/50
                                "
                            >

                                Back up the local StorePOS
                                database to MongoDB Atlas.

                            </p>

                        </div>

                    </div>

                </div>


                {/* =============================================
                    SECURITY
                ============================================= */}

                <div
                    className="
                        rounded-2xl
                        border
                        border-base-200
                        bg-base-100
                        p-5
                        shadow-sm
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            gap-3
                        "
                    >

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-warning/10
                                text-warning
                            "
                        >

                            <FaShieldAlt />

                        </div>


                        <div>

                            <h2
                                className="
                                    font-semibold
                                "
                            >

                                Security

                            </h2>


                            <p
                                className="
                                    mt-1
                                    text-xs
                                    leading-relaxed
                                    text-base-content/50
                                "
                            >

                                Manage user access and
                                StorePOS security configuration.

                            </p>

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                DATABASE CONFIGURATION
            ================================================= */}

            <div
                className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-base-200
                    bg-base-100
                    shadow-sm
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-3
                        border-b
                        border-base-200
                        px-6
                        py-5
                    "
                >

                    <div
                        className="
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            bg-base-200
                            text-base-content/60
                        "
                    >

                        <FaDatabase />

                    </div>


                    <div>

                        <h2 className="font-semibold">

                            Database Configuration

                        </h2>


                        <p
                            className="
                                mt-0.5
                                text-xs
                                text-base-content/45
                            "
                        >

                            StorePOS uses a local-first database architecture.

                        </p>

                    </div>

                </div>


                <div
                    className="
                        grid
                        grid-cols-1
                        gap-4
                        p-6
                        lg:grid-cols-2
                    "
                >

                    {/* LOCAL DATABASE */}

                    <div
                        className="
                            rounded-xl
                            border
                            border-base-200
                            bg-base-200/20
                            p-5
                        "
                    >

                        <div
                            className="
                                flex
                                items-start
                                justify-between
                                gap-4
                            "
                        >

                            <div>

                                <p
                                    className="
                                        text-xs
                                        font-medium
                                        uppercase
                                        tracking-wide
                                        text-base-content/45
                                    "
                                >

                                    Primary Database

                                </p>


                                <h3
                                    className="
                                        mt-2
                                        text-lg
                                        font-bold
                                    "
                                >

                                    Local MongoDB

                                </h3>

                            </div>


                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-success/10
                                    text-success
                                "
                            >

                                <FaServer />

                            </div>

                        </div>


                        <p
                            className="
                                mt-3
                                text-sm
                                leading-relaxed
                                text-base-content/55
                            "
                        >

                            All POS transactions are saved to
                            the local database first. StorePOS
                            can continue operating locally even
                            when the internet is unavailable.

                        </p>


                        <div
                            className="
                                mt-4
                                inline-flex
                                items-center
                                gap-2
                                rounded-full
                                bg-success/10
                                px-3
                                py-1.5
                                text-xs
                                font-medium
                                text-success
                            "
                        >

                            <FaCheckCircle />

                            Primary Database

                        </div>

                    </div>


                    {/* CLOUD DATABASE */}

                    <div
                        className="
                            rounded-xl
                            border
                            border-base-200
                            bg-base-200/20
                            p-5
                        "
                    >

                        <div
                            className="
                                flex
                                items-start
                                justify-between
                                gap-4
                            "
                        >

                            <div>

                                <p
                                    className="
                                        text-xs
                                        font-medium
                                        uppercase
                                        tracking-wide
                                        text-base-content/45
                                    "
                                >

                                    Cloud Database

                                </p>


                                <h3
                                    className="
                                        mt-2
                                        text-lg
                                        font-bold
                                    "
                                >

                                    MongoDB Atlas

                                </h3>

                            </div>


                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-info/10
                                    text-info
                                "
                            >

                                <FaCloudUploadAlt />

                            </div>

                        </div>


                        <p
                            className="
                                mt-3
                                text-sm
                                leading-relaxed
                                text-base-content/55
                            "
                        >

                            MongoDB Atlas stores cloud backup
                            copies of your StorePOS data through
                            the synchronization system.

                        </p>


                        <div
                            className={`
                                mt-4
                                inline-flex
                                items-center
                                gap-2
                                rounded-full
                                px-3
                                py-1.5
                                text-xs
                                font-medium

                                ${
                                    cloudConnected
                                        ? `
                                            bg-success/10
                                            text-success
                                        `
                                        : `
                                            bg-error/10
                                            text-error
                                        `
                                }
                            `}
                        >

                            <FaWifi />

                            {
                                cloudConnected
                                    ? "Connected"
                                    : "Offline"
                            }

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                PRODUCT PRICING SYNC
            ================================================= */}

            <div
                className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-base-200
                    bg-base-100
                    shadow-sm
                "
            >

                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        border-b
                        border-base-200
                        px-6
                        py-5
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                        "
                    >

                        <div
                            className="
                                flex
                                h-11
                                w-11
                                items-center
                                justify-center
                                rounded-xl
                                bg-primary/10
                                text-primary
                            "
                        >

                            <FaDatabase />

                        </div>


                        <div>

                            <h2
                                className="
                                    text-lg
                                    font-bold
                                "
                            >

                                Product Pricing Sync

                            </h2>


                            <p
                                className="
                                    mt-0.5
                                    text-xs
                                    text-base-content/50
                                "
                            >

                                Import finalized products and
                                pricing from the online Product
                                Pricing database.

                            </p>

                        </div>

                    </div>


                    <button
                        type="button"

                        onClick={
                            handlePricedProductSync
                        }

                        disabled={
                            pricedSyncBusy ||
                            pricedSyncStatus
                                ?.sourceConfigured ===
                                false
                        }

                        className="
                            btn
                            btn-primary
                            btn-sm
                        "
                    >

                        <FaSyncAlt
                            className={
                                pricedSyncBusy
                                    ? "animate-spin"
                                    : ""
                            }
                        />


                        {
                            pricedSyncBusy
                                ? "Syncing Products..."
                                : "Sync Priced Products"
                        }

                    </button>

                </div>


                {
                    pricedSyncLoading
                        ? (

                            <div
                                className="
                                    flex
                                    min-h-40
                                    items-center
                                    justify-center
                                    p-6
                                "
                            >

                                <span
                                    className="
                                        loading
                                        loading-spinner
                                        loading-lg
                                        text-primary
                                    "
                                />

                            </div>

                        )
                        : (

                            <>

                                <div
                                    className="
                                        grid
                                        grid-cols-2
                                        gap-3
                                        p-6
                                        sm:grid-cols-3
                                        xl:grid-cols-6
                                    "
                                >

                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <p className="text-[10px] text-base-content/45">

                                            Received

                                        </p>


                                        <p className="mt-2 text-lg font-black">

                                            {
                                                Number(
                                                    pricedSyncSummary
                                                        ?.received ||
                                                    0
                                                )
                                            }

                                        </p>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <p className="text-[10px] text-base-content/45">

                                            Created

                                        </p>


                                        <p className="mt-2 text-lg font-black text-success">

                                            {
                                                Number(
                                                    pricedSyncSummary
                                                        ?.created ||
                                                    0
                                                )
                                            }

                                        </p>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <p className="text-[10px] text-base-content/45">

                                            Updated

                                        </p>


                                        <p className="mt-2 text-lg font-black text-info">

                                            {
                                                Number(
                                                    pricedSyncSummary
                                                        ?.updated ||
                                                    0
                                                )
                                            }

                                        </p>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <p className="text-[10px] text-base-content/45">

                                            Unchanged

                                        </p>


                                        <p className="mt-2 text-lg font-black">

                                            {
                                                Number(
                                                    pricedSyncSummary
                                                        ?.unchanged ||
                                                    0
                                                )
                                            }

                                        </p>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <p className="text-[10px] text-base-content/45">

                                            Failed

                                        </p>


                                        <p
                                            className={`
                                                mt-2
                                                text-lg
                                                font-black

                                                ${
                                                    Number(
                                                        pricedSyncSummary
                                                            ?.failed ||
                                                        0
                                                    ) >
                                                    0
                                                        ? "text-error"
                                                        : ""
                                                }
                                            `}
                                        >

                                            {
                                                Number(
                                                    pricedSyncSummary
                                                        ?.failed ||
                                                    0
                                                )
                                            }

                                        </p>

                                    </div>


                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <p className="text-[10px] text-base-content/45">

                                            New Inventories

                                        </p>


                                        <p className="mt-2 text-lg font-black">

                                            {
                                                Number(
                                                    pricedSyncSummary
                                                        ?.branchInventoriesCreated ||
                                                    0
                                                )
                                            }

                                        </p>

                                    </div>

                                </div>


                                <div
                                    className="
                                        border-t
                                        border-base-200
                                        px-6
                                        py-4
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            flex-col
                                            gap-3
                                            lg:flex-row
                                            lg:items-center
                                            lg:justify-between
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                flex-wrap
                                                items-center
                                                gap-x-5
                                                gap-y-2
                                                text-xs
                                            "
                                        >

                                            <span>

                                                Last completed:{" "}

                                                <strong>

                                                    {
                                                        formatDateTime(
                                                            pricedSyncStatus
                                                                ?.lastCompletedAt
                                                        )
                                                    }

                                                </strong>

                                            </span>


                                            <span>

                                                Source:{" "}

                                                <strong>

                                                    {
                                                        pricedSyncStatus
                                                            ?.sourceDatabase ||
                                                        (
                                                            pricedSyncStatus
                                                                ?.sourceConfigured
                                                                ? "Configured"
                                                                : "Not configured"
                                                        )
                                                    }

                                                </strong>

                                            </span>

                                        </div>


                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-2
                                                text-xs
                                                font-medium
                                                text-success
                                            "
                                        >

                                            <FaCheckCircle />

                                            Branch inventory quantities are preserved.

                                        </div>

                                    </div>


                                    {
                                        pricedSyncStatus
                                            ?.sourceConfigured ===
                                            false && (

                                            <div
                                                className="
                                                    mt-4
                                                    rounded-lg
                                                    bg-warning/10
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-warning
                                                "
                                            >

                                                MONGO_PRICING_URI is not configured
                                                on the StorePOS backend.

                                            </div>

                                        )
                                    }


                                    {
                                        pricedSyncMessage && (

                                            <div
                                                className={`
                                                    mt-4
                                                    rounded-lg
                                                    px-4
                                                    py-3
                                                    text-sm

                                                    ${
                                                        Number(
                                                            pricedSyncSummary
                                                                ?.failed ||
                                                            0
                                                        ) >
                                                        0
                                                            ? "bg-warning/10 text-warning"
                                                            : "bg-success/10 text-success"
                                                    }
                                                `}
                                            >

                                                {
                                                    pricedSyncMessage
                                                }

                                            </div>

                                        )
                                    }


                                    {
                                        pricedSyncError && (

                                            <div
                                                className="
                                                    mt-4
                                                    rounded-lg
                                                    bg-error/10
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-error
                                                "
                                            >

                                                {
                                                    pricedSyncError
                                                }

                                            </div>

                                        )
                                    }


                                    {
                                        !pricedSyncError &&
                                        pricedSyncStatus
                                            ?.lastError && (

                                            <div
                                                className={`
                                                    mt-4
                                                    rounded-lg
                                                    px-4
                                                    py-3
                                                    text-sm

                                                    ${
                                                        pricedSyncPartial
                                                            ? "bg-warning/10 text-warning"
                                                            : pricedSyncFailed
                                                                ? "bg-error/10 text-error"
                                                                : "bg-base-200"
                                                    }
                                                `}
                                            >

                                                {
                                                    pricedSyncStatus
                                                        .lastError
                                                }

                                            </div>

                                        )
                                    }


                                    {
                                        Array.isArray(
                                            pricedSyncSummary
                                                ?.failures
                                        ) &&
                                        pricedSyncSummary
                                            .failures
                                            .length >
                                            0 && (

                                            <div
                                                className="
                                                    mt-4
                                                    overflow-hidden
                                                    rounded-xl
                                                    border
                                                    border-error/20
                                                "
                                            >

                                                <div
                                                    className="
                                                        border-b
                                                        border-error/20
                                                        bg-error/5
                                                        px-4
                                                        py-2
                                                        text-xs
                                                        font-bold
                                                        text-error
                                                    "
                                                >

                                                    Failed Products

                                                </div>


                                                <div
                                                    className="
                                                        max-h-52
                                                        overflow-auto
                                                    "
                                                >

                                                    {
                                                        pricedSyncSummary
                                                            .failures
                                                            .map(
                                                                (
                                                                    failure,
                                                                    index
                                                                ) => (

                                                                    <div
                                                                        key={
                                                                            `${failure.pricingSourceId || failure.barcode || index}-${index}`
                                                                        }
                                                                        className="
                                                                            border-b
                                                                            border-base-200
                                                                            px-4
                                                                            py-2
                                                                            text-xs
                                                                            last:border-b-0
                                                                        "
                                                                    >

                                                                        <div className="font-semibold">

                                                                            {
                                                                                failure.name ||
                                                                                failure.barcode ||
                                                                                "Unknown product"
                                                                            }

                                                                        </div>


                                                                        <div className="mt-0.5 text-error">

                                                                            {
                                                                                failure.reason
                                                                            }

                                                                        </div>

                                                                    </div>

                                                                )
                                                            )
                                                    }

                                                </div>

                                            </div>

                                        )
                                    }

                                </div>

                            </>

                        )
                }

            </div>


            {/* =================================================
                LIVE CLOUD BACKUP
            ================================================= */}

            <div
                className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-base-200
                    bg-base-100
                    shadow-sm
                "
            >

                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        border-b
                        border-base-200
                        px-6
                        py-5
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                        "
                    >

                        <div
                            className="
                                flex
                                h-11
                                w-11
                                items-center
                                justify-center
                                rounded-xl
                                bg-info/10
                                text-info
                            "
                        >

                            <FaCloudUploadAlt />

                        </div>


                        <div>

                            <h2
                                className="
                                    text-lg
                                    font-bold
                                "
                            >

                                Cloud Backup

                            </h2>


                            <p
                                className="
                                    mt-0.5
                                    text-xs
                                    text-base-content/50
                                "
                            >

                                Local MongoDB to MongoDB Atlas synchronization.

                            </p>

                        </div>

                    </div>


                    <button
                        type="button"

                        onClick={
                            handleSyncNow
                        }

                        disabled={
                            currentlySyncing
                        }

                        className="
                            btn
                            btn-primary
                            btn-sm
                        "
                    >

                        <FaSyncAlt
                            className={
                                currentlySyncing
                                    ? "animate-spin"
                                    : ""
                            }
                        />


                        {
                            currentlySyncing
                                ? "Syncing..."
                                : "Sync Now"
                        }

                    </button>

                </div>


                {
                    syncLoading
                        ? (

                            <div
                                className="
                                    flex
                                    min-h-48
                                    items-center
                                    justify-center
                                    p-6
                                "
                            >

                                <span
                                    className="
                                        loading
                                        loading-spinner
                                        loading-lg
                                        text-primary
                                    "
                                />

                            </div>

                        )
                        : (

                            <>

                                <div
                                    className="
                                        grid
                                        grid-cols-1
                                        gap-4
                                        p-6
                                        sm:grid-cols-2
                                        xl:grid-cols-4
                                    "
                                >

                                    {/* CLOUD STATUS */}

                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                            "
                                        >

                                            <p className="text-xs text-base-content/50">

                                                Cloud Status

                                            </p>


                                            <FaWifi
                                                className={
                                                    cloudConnected
                                                        ? "text-success"
                                                        : "text-error"
                                                }
                                            />

                                        </div>


                                        <p
                                            className={`
                                                mt-3
                                                font-semibold

                                                ${
                                                    cloudConnected
                                                        ? "text-success"
                                                        : "text-error"
                                                }
                                            `}
                                        >

                                            {
                                                cloudConnected
                                                    ? "Connected"
                                                    : "Offline"
                                            }

                                        </p>

                                    </div>


                                    {/* LAST SYNC */}

                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                            "
                                        >

                                            <p className="text-xs text-base-content/50">

                                                Last Sync

                                            </p>


                                            <FaCheckCircle
                                                className={
                                                    successful
                                                        ? "text-success"
                                                        : "text-base-content/30"
                                                }
                                            />

                                        </div>


                                        <p
                                            className="
                                                mt-3
                                                text-sm
                                                font-semibold
                                            "
                                        >

                                            {
                                                formatDateTime(
                                                    syncStatus
                                                        ?.lastSuccessAt
                                                )
                                            }

                                        </p>

                                    </div>


                                    {/* NEXT SYNC */}

                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                            "
                                        >

                                            <p className="text-xs text-base-content/50">

                                                Next Sync

                                            </p>


                                            <FaClock className="text-info" />

                                        </div>


                                        <p
                                            className="
                                                mt-3
                                                text-sm
                                                font-semibold
                                            "
                                        >

                                            {
                                                formatDateTime(
                                                    syncStatus
                                                        ?.nextSyncAt
                                                )
                                            }

                                        </p>

                                    </div>


                                    {/* COLLECTIONS */}

                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-base-200
                                            bg-base-200/20
                                            p-4
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                            "
                                        >

                                            <p className="text-xs text-base-content/50">

                                                Collections

                                            </p>


                                            <FaDatabase className="text-primary" />

                                        </div>


                                        <p className="mt-3 text-lg font-bold">

                                            {collectionCount}

                                        </p>


                                        <p className="text-[10px] text-base-content/40">

                                            Included in cloud backup

                                        </p>

                                    </div>

                                </div>


                                {/* =================================
                                    SYNC INFORMATION
                                ================================= */}

                                <div
                                    className="
                                        border-t
                                        border-base-200
                                        px-6
                                        py-4
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            flex-col
                                            gap-3
                                            sm:flex-row
                                            sm:items-center
                                            sm:justify-between
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-2
                                            "
                                        >

                                            {
                                                currentlySyncing
                                                    ? (

                                                        <>

                                                            <FaSyncAlt
                                                                className="
                                                                    animate-spin
                                                                    text-primary
                                                                "
                                                            />


                                                            <span className="text-sm">

                                                                Cloud backup is currently running.

                                                            </span>

                                                        </>

                                                    )
                                                    : failed
                                                        ? (

                                                            <>

                                                                <FaExclamationTriangle
                                                                    className="text-error"
                                                                />


                                                                <span
                                                                    className="
                                                                        text-sm
                                                                        text-error
                                                                    "
                                                                >

                                                                    Last backup failed.

                                                                </span>

                                                            </>

                                                        )
                                                        : successful
                                                            ? (

                                                                <>

                                                                    <FaCheckCircle
                                                                        className="text-success"
                                                                    />


                                                                    <span className="text-sm">

                                                                        Cloud backup is up to date.

                                                                    </span>

                                                                </>

                                                            )
                                                            : (

                                                                <>

                                                                    <FaCloudUploadAlt
                                                                        className="
                                                                            text-base-content/40
                                                                        "
                                                                    />


                                                                    <span
                                                                        className="
                                                                            text-sm
                                                                            text-base-content/50
                                                                        "
                                                                    >

                                                                        Waiting for cloud backup.

                                                                    </span>

                                                                </>

                                                            )
                                            }

                                        </div>


                                        <p className="text-xs text-base-content/45">

                                            Automatic sync every{" "}

                                            {
                                                syncStatus
                                                    ?.syncIntervalHours ||
                                                6
                                            }

                                            {" "}hours

                                        </p>

                                    </div>


                                    {
                                        syncMessage &&
                                        (

                                            <div
                                                className="
                                                    mt-4
                                                    rounded-lg
                                                    bg-success/10
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-success
                                                "
                                            >

                                                {syncMessage}

                                            </div>

                                        )
                                    }


                                    {
                                        syncError &&
                                        (

                                            <div
                                                className="
                                                    mt-4
                                                    rounded-lg
                                                    bg-error/10
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-error
                                                "
                                            >

                                                {syncError}

                                            </div>

                                        )
                                    }


                                    {
                                        !syncError &&
                                        syncStatus
                                            ?.lastError &&
                                        (

                                            <div
                                                className="
                                                    mt-4
                                                    rounded-lg
                                                    bg-error/10
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    text-error
                                                "
                                            >

                                                {
                                                    syncStatus
                                                        .lastError
                                                }

                                            </div>

                                        )
                                    }

                                </div>

                            </>

                        )
                }

            </div>


            {/* =================================================
                ADDITIONAL SETTINGS
            ================================================= */}

            <div
                className="
                    rounded-2xl
                    border
                    border-dashed
                    border-base-300
                    bg-base-100
                    p-6
                "
            >

                <h2 className="font-semibold">

                    Additional Settings

                </h2>


                <p
                    className="
                        mt-2
                        text-sm
                        leading-relaxed
                        text-base-content/50
                    "
                >

                    Receipt configuration, printer settings,
                    database maintenance, and other StorePOS
                    options can be added here later.

                </p>

            </div>

        </div>

    );

}


export default SettingsPage;