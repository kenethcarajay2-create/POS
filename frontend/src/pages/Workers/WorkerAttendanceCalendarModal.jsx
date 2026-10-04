import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    FaCalendarDay,
    FaChevronLeft,
    FaChevronRight,
    FaTimes,
} from "react-icons/fa";

import workerAttendanceService
    from "../../services/workerAttendance.service";


/*
============================================================
HELPERS
============================================================
*/

const getWorkerId = (
    worker
) => {

    return (
        worker?._id ||
        worker?.id ||
        null
    );

};


const pad = (
    value
) => {

    return String(
        value
    ).padStart(
        2,
        "0"
    );

};


const buildDateKey = (
    year,
    monthIndex,
    day
) => {

    return (
        `${year}-` +
        `${pad(monthIndex + 1)}-` +
        `${pad(day)}`
    );

};


const getTodayDateKey = () => {

    const date =
        new Date();


    return buildDateKey(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

};


const getErrorMessage = (
    error,
    fallback
) => {

    return (
        error?.response
            ?.data
            ?.message ||
        error?.message ||
        fallback
    );

};


/*
============================================================
WORKER ATTENDANCE CALENDAR MODAL
============================================================
*/

function WorkerAttendanceCalendarModal({
    worker,
    onClose,
}) {

    const today =
        new Date();


    /*
    ========================================================
    DATE STATE
    ========================================================
    */

    const [
        year,
        setYear,
    ] = useState(
        today.getFullYear()
    );


    const [
        monthIndex,
        setMonthIndex,
    ] = useState(
        today.getMonth()
    );


    /*
    ========================================================
    ATTENDANCE STATE
    ========================================================
    */

    const [
        absentDates,
        setAbsentDates,
    ] = useState(
        new Set()
    );


    const [
        loading,
        setLoading,
    ] = useState(
        true
    );


    const [
        changingDate,
        setChangingDate,
    ] = useState(
        ""
    );


    const [
        error,
        setError,
    ] = useState(
        ""
    );


    const workerId =
        getWorkerId(
            worker
        );


    /*
    ========================================================
    MONTH LABEL
    ========================================================
    */

    const monthLabel =
        useMemo(
            () => {

                return new Date(
                    year,
                    monthIndex,
                    1
                ).toLocaleDateString(
                    "en-PH",
                    {
                        month:
                            "long",

                        year:
                            "numeric",
                    }
                );

            },
            [
                year,
                monthIndex,
            ]
        );


    /*
    ========================================================
    DAYS IN MONTH
    ========================================================
    */

    const daysInMonth =
        useMemo(
            () => {

                return new Date(
                    year,
                    monthIndex + 1,
                    0
                ).getDate();

            },
            [
                year,
                monthIndex,
            ]
        );


    /*
    ========================================================
    FIRST DAY OF WEEK
    ========================================================
    */

    const firstDayOfWeek =
        useMemo(
            () => {

                return new Date(
                    year,
                    monthIndex,
                    1
                ).getDay();

            },
            [
                year,
                monthIndex,
            ]
        );


    /*
    ========================================================
    LOAD ATTENDANCE
    ========================================================
    */

    const loadAttendance =
        useCallback(
            async () => {

                if (
                    !workerId
                ) {

                    return;

                }


                try {

                    setLoading(
                        true
                    );


                    setError(
                        ""
                    );


                    const result =
                        await workerAttendanceService
                            .getMonth(
                                workerId,
                                year,
                                monthIndex + 1
                            );


                    const dates =
                        Array.isArray(
                            result?.absentDates
                        )
                            ? result.absentDates
                            : [];


                    setAbsentDates(
                        new Set(
                            dates
                        )
                    );


                } catch (
                    err
                ) {

                    console.error(
                        "Failed to load attendance:",
                        err
                    );


                    setError(
                        getErrorMessage(
                            err,
                            "Failed to load attendance."
                        )
                    );


                } finally {

                    setLoading(
                        false
                    );

                }

            },
            [
                workerId,
                year,
                monthIndex,
            ]
        );


    useEffect(
        () => {

            loadAttendance();

        },
        [
            loadAttendance,
        ]
    );


    /*
    ========================================================
    PREVIOUS MONTH
    ========================================================
    */

    const previousMonth =
        () => {

            if (
                monthIndex ===
                0
            ) {

                setYear(
                    (
                        current
                    ) =>
                        current -
                        1
                );


                setMonthIndex(
                    11
                );


                return;

            }


            setMonthIndex(
                (
                    current
                ) =>
                    current -
                    1
            );

        };


    /*
    ========================================================
    CURRENT / DISPLAY MONTH VALUES
    ========================================================
    */

    const currentMonthValue =
        today.getFullYear() *
            12 +
        today.getMonth();


    const displayedMonthValue =
        year *
            12 +
        monthIndex;


    const canGoNext =
        displayedMonthValue <
        currentMonthValue;


    /*
    ========================================================
    NEXT MONTH
    ========================================================
    */

    const nextMonth =
        () => {

            if (
                !canGoNext
            ) {

                return;

            }


            if (
                monthIndex ===
                11
            ) {

                setYear(
                    (
                        current
                    ) =>
                        current +
                        1
                );


                setMonthIndex(
                    0
                );


                return;

            }


            setMonthIndex(
                (
                    current
                ) =>
                    current +
                    1
            );

        };


    /*
    ========================================================
    TOGGLE ATTENDANCE
    ========================================================
    */

    const toggleDate =
        async (
            day
        ) => {

            if (
                !workerId ||
                changingDate
            ) {

                return;

            }


            const dateKey =
                buildDateKey(
                    year,
                    monthIndex,
                    day
                );


            const todayKey =
                getTodayDateKey();


            /*
            ------------------------------------------------
            FUTURE DATE
            ------------------------------------------------
            */

            if (
                dateKey >
                todayKey
            ) {

                return;

            }


            const currentlyAbsent =
                absentDates.has(
                    dateKey
                );


            try {

                setChangingDate(
                    dateKey
                );


                setError(
                    ""
                );


                /*
                ------------------------------------------------
                ABSENT -> PRESENT
                ------------------------------------------------
                */

                if (
                    currentlyAbsent
                ) {

                    await workerAttendanceService
                        .markPresent(
                            workerId,
                            dateKey
                        );


                    setAbsentDates(
                        (
                            current
                        ) => {

                            const next =
                                new Set(
                                    current
                                );


                            next.delete(
                                dateKey
                            );


                            return next;

                        }
                    );


                    return;

                }


                /*
                ------------------------------------------------
                PRESENT -> ABSENT
                ------------------------------------------------
                */

                await workerAttendanceService
                    .markAbsent(
                        workerId,
                        dateKey
                    );


                setAbsentDates(
                    (
                        current
                    ) => {

                        const next =
                            new Set(
                                current
                            );


                        next.add(
                            dateKey
                        );


                        return next;

                    }
                );


            } catch (
                err
            ) {

                console.error(
                    "Failed to update attendance:",
                    err
                );


                setError(
                    getErrorMessage(
                        err,
                        "Failed to update attendance."
                    )
                );


            } finally {

                setChangingDate(
                    ""
                );

            }

        };


    /*
    ========================================================
    CALENDAR CELLS
    ========================================================
    */

    const calendarCells =
        useMemo(
            () => {

                const cells =
                    [];


                /*
                Empty cells before first day.
                */

                for (
                    let index = 0;
                    index < firstDayOfWeek;
                    index++
                ) {

                    cells.push({
                        type:
                            "EMPTY",

                        key:
                            `empty-${index}`,
                    });

                }


                /*
                Actual calendar days.
                */

                for (
                    let day = 1;
                    day <= daysInMonth;
                    day++
                ) {

                    cells.push({
                        type:
                            "DAY",

                        day,

                        key:
                            `day-${day}`,
                    });

                }


                return cells;

            },
            [
                firstDayOfWeek,
                daysInMonth,
            ]
        );


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <dialog
            open
            className="modal modal-open"
        >

            <div className="modal-box max-w-md">


                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="flex items-start justify-between gap-4">

                    <div>

                        <div className="flex items-center gap-2">

                            <FaCalendarDay className="text-primary" />


                            <h3 className="text-xl font-bold">
                                Attendance
                            </h3>

                        </div>


                        <p className="mt-1 text-sm text-base-content/60">

                            {
                                worker?.name ||
                                "Worker"
                            }

                        </p>

                    </div>


                    <button
                        type="button"
                        className="btn btn-sm btn-circle btn-ghost"
                        onClick={
                            onClose
                        }
                        disabled={
                            Boolean(
                                changingDate
                            )
                        }
                    >

                        <FaTimes />

                    </button>

                </div>


                {/* ==================================================
                    MONTH NAVIGATION
                ================================================== */}

                <div className="mt-5 flex items-center justify-between rounded-xl bg-base-200 p-2">

                    <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-square"
                        onClick={
                            previousMonth
                        }
                    >

                        <FaChevronLeft />

                    </button>


                    <div className="font-bold">
                        {monthLabel}
                    </div>


                    <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-square"
                        onClick={
                            nextMonth
                        }
                        disabled={
                            !canGoNext
                        }
                    >

                        <FaChevronRight />

                    </button>

                </div>


                {/* ==================================================
                    ERROR
                ================================================== */}

                {
                    error && (

                        <div className="alert alert-error mt-4">

                            <span className="text-sm">
                                {error}
                            </span>

                        </div>

                    )
                }


                {/* ==================================================
                    WEEK DAYS
                ================================================== */}

                <div className="mt-5 grid grid-cols-7 gap-1">

                    {
                        [
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                        ].map(
                            (
                                day
                            ) => (

                                <div
                                    key={
                                        day
                                    }
                                    className="
                                        py-1
                                        text-center
                                        text-[10px]
                                        font-bold
                                        uppercase
                                        text-base-content/45
                                    "
                                >

                                    {day}

                                </div>

                            )
                        )
                    }

                </div>


                {/* ==================================================
                    CALENDAR
                ================================================== */}

                {
                    loading ? (

                        <div className="py-16 text-center">

                            <span className="loading loading-spinner loading-md" />


                            <div className="mt-2 text-sm text-base-content/50">
                                Loading attendance...
                            </div>

                        </div>

                    ) : (

                        <div className="mt-1 grid grid-cols-7 gap-1">

                            {
                                calendarCells.map(
                                    (
                                        cell
                                    ) => {

                                        if (
                                            cell.type ===
                                            "EMPTY"
                                        ) {

                                            return (

                                                <div
                                                    key={
                                                        cell.key
                                                    }
                                                    className="aspect-square"
                                                />

                                            );

                                        }


                                        const dateKey =
                                            buildDateKey(
                                                year,
                                                monthIndex,
                                                cell.day
                                            );


                                        const todayKey =
                                            getTodayDateKey();


                                        const isFuture =
                                            dateKey >
                                            todayKey;


                                        const isAbsent =
                                            absentDates.has(
                                                dateKey
                                            );


                                        const isChanging =
                                            changingDate ===
                                            dateKey;


                                        /*
                                        ----------------------------------------
                                        PRESENT STYLE
                                        ----------------------------------------
                                        */

                                        let stateClass = `
                                            border-success/35
                                            bg-success/10
                                            text-success
                                            hover:border-success
                                            hover:bg-success/20
                                        `;


                                        /*
                                        ----------------------------------------
                                        ABSENT STYLE
                                        ----------------------------------------
                                        */

                                        if (
                                            isAbsent
                                        ) {

                                            stateClass = `
                                                border-error
                                                bg-error
                                                text-error-content
                                                hover:bg-error/90
                                            `;

                                        }


                                        /*
                                        ----------------------------------------
                                        FUTURE STYLE
                                        ----------------------------------------
                                        */

                                        if (
                                            isFuture
                                        ) {

                                            stateClass = `
                                                cursor-not-allowed
                                                border-base-200
                                                bg-base-200
                                                text-base-content/25
                                            `;

                                        }


                                        return (

                                            <button
                                                key={
                                                    cell.key
                                                }
                                                type="button"
                                                disabled={
                                                    isFuture ||
                                                    Boolean(
                                                        changingDate
                                                    )
                                                }
                                                className={`
                                                    relative
                                                    aspect-square
                                                    rounded-lg
                                                    border
                                                    text-sm
                                                    font-semibold
                                                    transition
                                                    ${stateClass}
                                                `}
                                                title={
                                                    isFuture
                                                        ? "Future date"
                                                        : isAbsent
                                                            ? "Absent - click to mark present"
                                                            : "Present - click to mark absent"
                                                }
                                                onClick={() =>
                                                    toggleDate(
                                                        cell.day
                                                    )
                                                }
                                            >

                                                {
                                                    isChanging ? (

                                                        <span className="loading loading-spinner loading-xs" />

                                                    ) : (

                                                        cell.day

                                                    )
                                                }

                                            </button>

                                        );

                                    }
                                )
                            }

                        </div>

                    )
                }


                {/* ==================================================
                    LEGEND
                ================================================== */}

                <div className="mt-5 grid grid-cols-3 gap-2">

                    <div
                        className="
                            flex
                            items-center
                            justify-center
                            gap-2
                            rounded-lg
                            bg-success/10
                            px-2
                            py-2
                        "
                    >

                        <span className="h-3 w-3 rounded-full bg-success" />


                        <span className="text-xs font-medium">
                            Present
                        </span>

                    </div>


                    <div
                        className="
                            flex
                            items-center
                            justify-center
                            gap-2
                            rounded-lg
                            bg-error/10
                            px-2
                            py-2
                        "
                    >

                        <span className="h-3 w-3 rounded-full bg-error" />


                        <span className="text-xs font-medium">
                            Absent
                        </span>

                    </div>


                    <div
                        className="
                            flex
                            items-center
                            justify-center
                            gap-2
                            rounded-lg
                            bg-base-200
                            px-2
                            py-2
                        "
                    >

                        <span className="h-3 w-3 rounded-full bg-base-300" />


                        <span className="text-xs font-medium">
                            Future
                        </span>

                    </div>

                </div>


                {/* ==================================================
                    INSTRUCTIONS
                ================================================== */}

                <div className="mt-4 rounded-xl bg-base-200 px-4 py-3 text-xs text-base-content/60">

                    Click a green date to mark the worker absent.
                    Click a red date to change the worker back to present.

                </div>


                {/* ==================================================
                    CLOSE
                ================================================== */}

                <div className="modal-action">

                    <button
                        type="button"
                        className="btn"
                        onClick={
                            onClose
                        }
                        disabled={
                            Boolean(
                                changingDate
                            )
                        }
                    >

                        Close

                    </button>

                </div>

            </div>

        </dialog>

    );

}


export default WorkerAttendanceCalendarModal;