import {
    useCallback,
    useEffect,
    useState,
} from "react";

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
} from "react-icons/fa";

import syncService from "../../services/sync.service";


/*
============================================================
FORMAT DATE / TIME
============================================================
*/

const formatDateTime = (value) => {

    if (!value) {

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
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
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
    CLOUD SYNC STATE
    ========================================================
    */

    const [
        syncStatus,
        setSyncStatus,
    ] = useState(null);


    const [
        syncLoading,
        setSyncLoading,
    ] = useState(true);


    const [
        syncing,
        setSyncing,
    ] = useState(false);


    const [
        syncError,
        setSyncError,
    ] = useState("");


    const [
        syncMessage,
        setSyncMessage,
    ] = useState("");


    /*
    ========================================================
    LOAD CLOUD STATUS
    ========================================================
    */

    const loadSyncStatus =
        useCallback(
            async () => {

                try {

                    setSyncError("");


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
    INITIAL LOAD
    ========================================================
    */

    useEffect(
        () => {

            loadSyncStatus();

        },
        [
            loadSyncStatus,
        ]
    );


    /*
    ========================================================
    AUTO REFRESH STATUS
    ========================================================

    Every 30 seconds.

    This only checks status.
    It does NOT trigger a sync.
    ========================================================
    */

    useEffect(
        () => {

            const interval =
                setInterval(
                    () => {

                        loadSyncStatus();

                    },
                    30000
                );


            return () =>
                clearInterval(
                    interval
                );

        },
        [
            loadSyncStatus,
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

                            Manage StorePOS system settings
                            and cloud backup.

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

                                Store information, branch
                                configuration, receipt details,
                                and POS preferences.

                            </p>

                        </div>

                    </div>

                </div>


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

                {/* HEADER */}

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

                        <h2
                            className="
                                font-semibold
                            "
                        >

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


                {/* DATABASE CARDS */}

                <div
                    className="
                        grid
                        grid-cols-1
                        gap-4
                        p-6
                        lg:grid-cols-2
                    "
                >

                    {/* =========================================
                        LOCAL DATABASE
                    ========================================= */}

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


                    {/* =========================================
                        CLOUD DATABASE
                    ========================================= */}

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

                {/* =============================================
                    CLOUD BACKUP HEADER
                ============================================= */}

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


                    {/* SYNC NOW */}

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


                {/* =============================================
                    CLOUD STATUS LOADING
                ============================================= */}

                {
                    syncLoading ? (

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

                    ) : (

                        <>

                            {/* =================================
                                STATUS CARDS
                            ================================= */}

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

                                        <p
                                            className="
                                                text-xs
                                                text-base-content/50
                                            "
                                        >

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

                                        <p
                                            className="
                                                text-xs
                                                text-base-content/50
                                            "
                                        >

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

                                        <p
                                            className="
                                                text-xs
                                                text-base-content/50
                                            "
                                        >

                                            Next Sync

                                        </p>


                                        <FaClock
                                            className="
                                                text-info
                                            "
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

                                        <p
                                            className="
                                                text-xs
                                                text-base-content/50
                                            "
                                        >

                                            Collections

                                        </p>


                                        <FaDatabase
                                            className="
                                                text-primary
                                            "
                                        />

                                    </div>


                                    <p
                                        className="
                                            mt-3
                                            text-lg
                                            font-bold
                                        "
                                    >

                                        {collectionCount}

                                    </p>


                                    <p
                                        className="
                                            text-[10px]
                                            text-base-content/40
                                        "
                                    >

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
                                            currentlySyncing ? (

                                                <>

                                                    <FaSyncAlt
                                                        className="
                                                            animate-spin
                                                            text-primary
                                                        "
                                                    />


                                                    <span
                                                        className="
                                                            text-sm
                                                        "
                                                    >

                                                        Cloud backup is currently running.

                                                    </span>

                                                </>

                                            ) : failed ? (

                                                <>

                                                    <FaExclamationTriangle
                                                        className="
                                                            text-error
                                                        "
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

                                            ) : successful ? (

                                                <>

                                                    <FaCheckCircle
                                                        className="
                                                            text-success
                                                        "
                                                    />


                                                    <span
                                                        className="
                                                            text-sm
                                                        "
                                                    >

                                                        Cloud backup is up to date.

                                                    </span>

                                                </>

                                            ) : (

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


                                    <p
                                        className="
                                            text-xs
                                            text-base-content/45
                                        "
                                    >

                                        Automatic sync every{" "}

                                        {
                                            syncStatus
                                                ?.syncIntervalHours ||
                                            6
                                        }

                                        {" "}hours

                                    </p>

                                </div>


                                {/* SUCCESS MESSAGE */}

                                {
                                    syncMessage && (

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


                                {/* ERROR MESSAGE */}

                                {
                                    syncError && (

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


                                {/* LAST SERVER ERROR */}

                                {
                                    !syncError &&
                                    syncStatus
                                        ?.lastError && (

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
                FUTURE SETTINGS
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

                <h2
                    className="
                        font-semibold
                    "
                >

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

                    Store information, receipt configuration,
                    printer settings, branch management,
                    database maintenance, and other StorePOS
                    options can be added here later.

                </p>

            </div>

        </div>

    );

}


export default SettingsPage;