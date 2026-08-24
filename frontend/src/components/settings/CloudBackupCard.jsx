import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    FaCloud,
    FaCloudUploadAlt,
    FaCheckCircle,
    FaExclamationTriangle,
    FaSyncAlt,
    FaClock,
    FaDatabase,
    FaWifi,
} from "react-icons/fa";

import syncService from "../../services/sync.service";


/*
============================================================
FORMAT DATE
============================================================
*/

const formatDateTime = (
    value
) => {

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
CLOUD BACKUP CARD
============================================================
*/

function CloudBackupCard() {

    /*
    ========================================================
    STATE
    ========================================================
    */

    const [
        status,
        setStatus,
    ] = useState(null);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        syncing,
        setSyncing,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    const [
        message,
        setMessage,
    ] = useState("");


    /*
    ========================================================
    LOAD STATUS
    ========================================================
    */

    const loadStatus =
        useCallback(
            async () => {

                try {

                    setError("");


                    const result =
                        await syncService
                            .getStatus();


                    setStatus(
                        result
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "SYNC STATUS ERROR:",
                        error
                    );


                    setError(
                        error.response
                            ?.data
                            ?.message ||
                        "Unable to load cloud backup status."
                    );

                } finally {

                    setLoading(
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

            loadStatus();

        },
        [
            loadStatus,
        ]
    );


    /*
    ========================================================
    AUTO REFRESH STATUS
    ========================================================

    Refresh every 30 seconds.

    This does NOT start a cloud sync.
    It only checks the current status.
    ========================================================
    */

    useEffect(
        () => {

            const interval =
                setInterval(
                    () => {

                        loadStatus();

                    },
                    30000
                );


            return () =>
                clearInterval(
                    interval
                );

        },
        [
            loadStatus,
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


                setError(
                    ""
                );


                setMessage(
                    ""
                );


                const result =
                    await syncService
                        .syncNow();


                if (
                    result?.success ===
                    false
                ) {

                    setMessage(
                        result.message ||
                        "Cloud sync is already running."
                    );

                } else {

                    setMessage(
                        "Cloud backup completed successfully."
                    );

                }


                await loadStatus();


            } catch (
                error
            ) {

                console.error(
                    "SYNC NOW ERROR:",
                    error
                );


                setError(
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
    STATUS HELPERS
    ========================================================
    */

    const cloudConnected =
        status?.cloudConnected ===
        true;


    const syncStatus =
        status?.status ||
        "IDLE";


    const successful =
        syncStatus ===
        "SUCCESS";


    const failed =
        syncStatus ===
        "FAILED";


    const currentlySyncing =
        syncing ||
        syncStatus ===
            "SYNCING";


    /*
    ========================================================
    COLLECTION COUNT
    ========================================================
    */

    const collectionCount =
        Array.isArray(
            status?.collections
        )
            ? status
                .collections
                .length
            : 0;


    /*
    ========================================================
    LOADING
    ========================================================
    */

    if (
        loading
    ) {

        return (

            <div
                className="
                    rounded-2xl
                    border
                    border-base-200
                    bg-base-100
                    p-6
                    shadow-sm
                "
            >

                <div
                    className="
                        flex
                        min-h-48
                        items-center
                        justify-center
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

            </div>

        );

    }


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

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


            {/* ==============================================
                HEADER
            ============================================== */}

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

                            Automatically backs up the local
                            StorePOS database to MongoDB Atlas.

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


            {/* ==============================================
                CONNECTION STATUS
            ============================================== */}

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
                                status
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
                                status
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


                        <FaDatabase className="text-primary" />

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


            {/* ==============================================
                SYNC INFORMATION
            ============================================== */}

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

                                    <span className="text-sm">

                                        Cloud backup is currently running.

                                    </span>

                                </>

                            ) : failed ? (

                                <>

                                    <FaExclamationTriangle
                                        className="text-error"
                                    />

                                    <span className="text-sm text-error">

                                        Last backup failed.

                                    </span>

                                </>

                            ) : successful ? (

                                <>

                                    <FaCheckCircle
                                        className="text-success"
                                    />

                                    <span className="text-sm">

                                        Cloud backup is up to date.

                                    </span>

                                </>

                            ) : (

                                <>

                                    <FaCloud
                                        className="text-base-content/40"
                                    />

                                    <span className="text-sm">

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
                            status
                                ?.syncIntervalHours ||
                            6
                        }

                        {" "}hours

                    </p>

                </div>


                {/* SUCCESS MESSAGE */}

                {
                    message && (

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

                            {message}

                        </div>

                    )
                }


                {/* ERROR MESSAGE */}

                {
                    error && (

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

                            {error}

                        </div>

                    )
                }


                {/* LAST SYNC ERROR */}

                {
                    !error &&
                    status?.lastError && (

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
                                status.lastError
                            }

                        </div>

                    )
                }

            </div>

        </div>

    );

}


export default CloudBackupCard;