import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    FaArrowLeft,
    FaBuilding,
    FaCheckCircle,
    FaEdit,
    FaMapMarkerAlt,
    FaPhone,
    FaEnvelope,
    FaPlus,
    FaStore,
    FaTimesCircle,
    FaCrown,
} from "react-icons/fa";

import branchService from "../../services/branch.service";

import useBranchStore from "../../store/branch.store";

import useAuthStore from "../../store/auth.store";


/*
============================================================
EMPTY FORM
============================================================
*/

const EMPTY_FORM = {

    code:
        "",

    name:
        "",

    address:
        "",

    phone:
        "",

    email:
        "",

};


/*
============================================================
NORMALIZE ID
============================================================
*/

const getId = (
    value
) => {

    if (
        !value
    ) {

        return "";

    }


    if (
        typeof value ===
        "object"
    ) {

        return String(
            value._id ||
            value.id ||
            ""
        );

    }


    return String(
        value
    );

};


/*
============================================================
BRANCH MANAGEMENT PAGE
============================================================
*/

function BranchManagementPage() {

    const navigate =
        useNavigate();


    /*
    ========================================================
    AUTH
    ========================================================
    */

    const user =
        useAuthStore(
            (
                state
            ) =>
                state.user
        );


    const activeBranchId =
        useAuthStore(
            (
                state
            ) =>
                state.activeBranchId
        );


    /*
    ========================================================
    BRANCH STORE
    ========================================================
    */

    const refreshBranches =
        useBranchStore(
            (
                state
            ) =>
                state.refreshBranches
        );


    /*
    ========================================================
    LOCAL STATE
    ========================================================
    */

    const [
        branches,
        setBranches,
    ] =
        useState(
            []
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );


    const [
        actionId,
        setActionId,
    ] =
        useState(
            ""
        );


    const [
        error,
        setError,
    ] =
        useState(
            ""
        );


    const [
        message,
        setMessage,
    ] =
        useState(
            ""
        );


    const [
        modalOpen,
        setModalOpen,
    ] =
        useState(
            false
        );


    const [
        modalMode,
        setModalMode,
    ] =
        useState(
            "create"
        );


    const [
        selectedBranch,
        setSelectedBranch,
    ] =
        useState(
            null
        );


    const [
        form,
        setForm,
    ] =
        useState(
            EMPTY_FORM
        );


    /*
    ========================================================
    ADMIN PROTECTION
    ========================================================
    */

    const isAdmin =
        user?.role ===
        "admin";


    /*
    ========================================================
    LOAD BRANCHES
    ========================================================
    */

    const loadBranches =
        useCallback(
            async () => {

                try {

                    setLoading(
                        true
                    );


                    setError(
                        ""
                    );


                    const result =
                        await branchService
                            .getBranches(
                                true
                            );


                    setBranches(
                        Array.isArray(
                            result
                        )
                            ? result
                            : []
                    );


                } catch (
                    loadError
                ) {

                    console.error(
                        "LOAD BRANCHES ERROR:",
                        loadError.response
                            ?.data ||
                        loadError
                    );


                    setError(
                        loadError.response
                            ?.data
                            ?.message ||
                        loadError.message ||
                        "Unable to load branches."
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

            if (
                !isAdmin
            ) {

                return;

            }


            loadBranches();

        },
        [
            isAdmin,
            loadBranches,
        ]
    );


    /*
    ========================================================
    CLEAR FEEDBACK
    ========================================================
    */

    const clearFeedback =
        () => {

            setError(
                ""
            );


            setMessage(
                ""
            );

        };


    /*
    ========================================================
    RESET MODAL
    ========================================================
    */

    const resetModal =
        () => {

            setModalOpen(
                false
            );


            setSelectedBranch(
                null
            );


            setModalMode(
                "create"
            );


            setForm(
                EMPTY_FORM
            );

        };


    /*
    ========================================================
    OPEN CREATE
    ========================================================
    */

    const openCreate =
        () => {

            if (
                saving
            ) {

                return;

            }


            clearFeedback();


            setSelectedBranch(
                null
            );


            setModalMode(
                "create"
            );


            setForm(
                EMPTY_FORM
            );


            setModalOpen(
                true
            );

        };


    /*
    ========================================================
    OPEN EDIT
    ========================================================
    */

    const openEdit =
        (
            branch
        ) => {

            if (
                saving
            ) {

                return;

            }


            clearFeedback();


            setSelectedBranch(
                branch
            );


            setModalMode(
                "edit"
            );


            setForm({

                code:
                    branch.code ||
                    "",

                name:
                    branch.name ||
                    "",

                address:
                    branch.address ||
                    "",

                phone:
                    branch.phone ||
                    "",

                email:
                    branch.email ||
                    "",

            });


            setModalOpen(
                true
            );

        };


    /*
    ========================================================
    CLOSE MODAL
    ========================================================
    */

    const closeModal =
        () => {

            if (
                saving
            ) {

                return;

            }


            resetModal();

        };


    /*
    ========================================================
    FORM CHANGE
    ========================================================
    */

    const handleChange =
        (
            event
        ) => {

            const {
                name,
                value,
            } =
                event.target;


            setForm(
                (
                    current
                ) => ({

                    ...current,

                    [name]:
                        name ===
                        "code"
                            ? value
                                .toUpperCase()
                            : value,

                })
            );

        };


    /*
    ========================================================
    REFRESH ALL BRANCH DATA
    ========================================================
    */

    const refreshAllBranchData =
        async () => {

            await loadBranches();


            await refreshBranches();

        };


    /*
    ========================================================
    SAVE CREATE / EDIT
    ========================================================
    */

    const handleSave =
        async (
            event
        ) => {

            event.preventDefault();


            if (
                saving
            ) {

                return;

            }


            if (
                modalMode ===
                    "edit" &&
                !selectedBranch
            ) {

                return;

            }


            const code =
                String(
                    form.code ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const name =
                String(
                    form.name ||
                    ""
                )
                    .trim();


            const address =
                String(
                    form.address ||
                    ""
                )
                    .trim();


            const phone =
                String(
                    form.phone ||
                    ""
                )
                    .trim();


            const email =
                String(
                    form.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                !code
            ) {

                setError(
                    "Branch code is required."
                );

                return;

            }


            if (
                !name
            ) {

                setError(
                    "Branch name is required."
                );

                return;

            }


            const payload = {

                code,

                name,

                address,

                phone,

                email,

            };


            try {

                setSaving(
                    true
                );


                clearFeedback();


                if (
                    modalMode ===
                    "create"
                ) {

                    /*
                    Backend automatically creates BranchInventory
                    records for every global product.

                    New branch stock starts at zero.
                    */

                    await branchService
                        .createBranch({

                            ...payload,

                            isActive:
                                true,

                            isDefault:
                                false,

                        });


                    await refreshAllBranchData();


                    /*
                    Explicit reset avoids depending on stale
                    React state inside closeModal().
                    */

                    resetModal();


                    setMessage(
                        `Branch "${name}" (${code}) created successfully.`
                    );


                } else {

                    await branchService
                        .updateBranch(
                            selectedBranch._id,
                            payload
                        );


                    await refreshAllBranchData();


                    resetModal();


                    setMessage(
                        "Branch updated successfully."
                    );

                }


            } catch (
                saveError
            ) {

                console.error(
                    modalMode ===
                        "create"
                        ? "CREATE BRANCH ERROR:"
                        : "UPDATE BRANCH ERROR:",
                    saveError.response
                        ?.data ||
                    saveError
                );


                setError(
                    saveError.response
                        ?.data
                        ?.message ||
                    saveError.message ||
                    (
                        modalMode ===
                        "create"
                            ? "Unable to create branch."
                            : "Unable to update branch."
                    )
                );


            } finally {

                setSaving(
                    false
                );

            }

        };


    /*
    ========================================================
    SET DEFAULT
    ========================================================
    */

    const handleSetDefault =
        async (
            branch
        ) => {

            const branchId =
                getId(
                    branch
                );


            if (
                !branchId ||
                branch.isDefault
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    `Set "${branch.name}" (${branch.code}) as the default branch?\n\nThe current default branch will remain active, but it will no longer be marked as default.`
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                setActionId(
                    branchId
                );


                clearFeedback();


                /*
                branch.service.js exposes setDefaultBranch()
                through updateBranch(id, { isDefault: true }).
                */

                await branchService
                    .setDefaultBranch(
                        branchId
                    );


                await refreshAllBranchData();


                setMessage(
                    `${branch.name} is now the default branch.`
                );


            } catch (
                actionError
            ) {

                console.error(
                    "SET DEFAULT BRANCH ERROR:",
                    actionError.response
                        ?.data ||
                    actionError
                );


                setError(
                    actionError.response
                        ?.data
                        ?.message ||
                    actionError.message ||
                    "Unable to set the default branch."
                );


            } finally {

                setActionId(
                    ""
                );

            }

        };


    /*
    ========================================================
    DISABLE
    ========================================================
    */

    const handleDisable =
        async (
            branch
        ) => {

            const branchId =
                getId(
                    branch
                );


            if (
                !branchId
            ) {

                return;

            }


            if (
                branch.isDefault
            ) {

                window.alert(
                    "The default branch cannot be disabled. Set another branch as default first."
                );

                return;

            }


            if (
                branchId ===
                String(
                    activeBranchId
                )
            ) {

                window.alert(
                    "Switch to another branch before disabling the currently selected branch."
                );

                return;

            }


            const confirmed =
                window.confirm(
                    `Disable "${branch.name}" (${branch.code})?\n\nHistorical sales, inventory records, ledger records, and other branch data will remain intact.`
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                setActionId(
                    branchId
                );


                clearFeedback();


                await branchService
                    .disableBranch(
                        branchId
                    );


                await refreshAllBranchData();


                setMessage(
                    `${branch.name} was disabled successfully.`
                );


            } catch (
                actionError
            ) {

                console.error(
                    "DISABLE BRANCH ERROR:",
                    actionError.response
                        ?.data ||
                    actionError
                );


                setError(
                    actionError.response
                        ?.data
                        ?.message ||
                    actionError.message ||
                    "Unable to disable branch."
                );


            } finally {

                setActionId(
                    ""
                );

            }

        };


    /*
    ========================================================
    ENABLE
    ========================================================
    */

    const handleEnable =
        async (
            branch
        ) => {

            const branchId =
                getId(
                    branch
                );


            if (
                !branchId
            ) {

                return;

            }


            const confirmed =
                window.confirm(
                    `Enable "${branch.name}" (${branch.code})?`
                );


            if (
                !confirmed
            ) {

                return;

            }


            try {

                setActionId(
                    branchId
                );


                clearFeedback();


                await branchService
                    .enableBranch(
                        branchId
                    );


                await refreshAllBranchData();


                setMessage(
                    `${branch.name} was enabled successfully.`
                );


            } catch (
                actionError
            ) {

                console.error(
                    "ENABLE BRANCH ERROR:",
                    actionError.response
                        ?.data ||
                    actionError
                );


                setError(
                    actionError.response
                        ?.data
                        ?.message ||
                    actionError.message ||
                    "Unable to enable branch."
                );


            } finally {

                setActionId(
                    ""
                );

            }

        };


    /*
    ========================================================
    ACCESS DENIED
    ========================================================
    */

    if (
        !isAdmin
    ) {

        return (

            <div
                className="
                    rounded-2xl
                    border
                    border-error/20
                    bg-error/5
                    p-6
                "
            >

                <h1 className="text-xl font-bold text-error">

                    Access Denied

                </h1>


                <p className="mt-2 text-sm text-base-content/60">

                    Branch Management is available to administrators only.

                </p>

            </div>

        );

    }


    /*
    ========================================================
    RENDER
    ========================================================
    */

    return (

        <div className="space-y-6 pb-8">


            {/* =================================================
                HEADER
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

                <div className="flex items-center gap-3">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/settings"
                            )
                        }
                        className="
                            btn
                            btn-ghost
                            btn-square
                            btn-sm
                        "
                    >

                        <FaArrowLeft />

                    </button>


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

                        <FaBuilding />

                    </div>


                    <div>

                        <h1 className="text-2xl font-bold">

                            Branch Management

                        </h1>


                        <p className="mt-1 text-sm text-base-content/50">

                            Manage StorePOS locations, default branch,
                            and branch availability.

                        </p>

                    </div>

                </div>


                <button
                    type="button"
                    onClick={
                        openCreate
                    }
                    disabled={
                        saving ||
                        Boolean(
                            actionId
                        )
                    }
                    className="
                        btn
                        btn-primary
                        btn-sm
                    "
                >

                    <FaPlus />

                    Add Branch

                </button>

            </div>


            {/* =================================================
                INFORMATION
            ================================================= */}

            <div
                className="
                    rounded-xl
                    border
                    border-info/20
                    bg-info/5
                    px-4
                    py-3
                    text-sm
                    text-base-content/65
                "
            >

                New branches automatically receive an independent
                inventory record for every product. New branch stock
                starts at zero and does not affect stock in other branches.

            </div>


            {/* =================================================
                FEEDBACK
            ================================================= */}

            {
                message &&
                (

                    <div
                        className="
                            rounded-xl
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


            {
                error &&
                (

                    <div
                        className="
                            rounded-xl
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


            {/* =================================================
                BRANCH LIST
            ================================================= */}

            {
                loading
                    ? (

                        <div
                            className="
                                flex
                                min-h-64
                                items-center
                                justify-center
                                rounded-2xl
                                border
                                border-base-200
                                bg-base-100
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

                        <div
                            className="
                                grid
                                grid-cols-1
                                gap-4
                                xl:grid-cols-2
                            "
                        >

                            {
                                branches.map(
                                    (
                                        branch
                                    ) => {

                                        const branchId =
                                            getId(
                                                branch
                                            );


                                        const isActiveBranch =
                                            branchId ===
                                            String(
                                                activeBranchId ||
                                                ""
                                            );


                                        const processing =
                                            actionId ===
                                            branchId;


                                        return (

                                            <div
                                                key={
                                                    branchId
                                                }
                                                className={`
                                                    rounded-2xl
                                                    border
                                                    bg-base-100
                                                    p-5
                                                    shadow-sm

                                                    ${
                                                        isActiveBranch
                                                            ? "border-primary/40"
                                                            : "border-base-200"
                                                    }

                                                    ${
                                                        !branch.isActive
                                                            ? "opacity-75"
                                                            : ""
                                                    }
                                                `}
                                            >

                                                {/* HEADER */}

                                                <div
                                                    className="
                                                        flex
                                                        items-start
                                                        justify-between
                                                        gap-4
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
                                                                h-11
                                                                w-11
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

                                                            <div
                                                                className="
                                                                    flex
                                                                    flex-wrap
                                                                    items-center
                                                                    gap-2
                                                                "
                                                            >

                                                                <h2 className="text-lg font-bold">

                                                                    {
                                                                        branch.name
                                                                    }

                                                                </h2>


                                                                {
                                                                    branch.isDefault &&
                                                                    (

                                                                        <span
                                                                            className="
                                                                                badge
                                                                                badge-primary
                                                                                badge-sm
                                                                                gap-1
                                                                            "
                                                                        >

                                                                            <FaCrown />

                                                                            Default

                                                                        </span>

                                                                    )
                                                                }


                                                                {
                                                                    isActiveBranch &&
                                                                    (

                                                                        <span
                                                                            className="
                                                                                badge
                                                                                badge-info
                                                                                badge-sm
                                                                            "
                                                                        >

                                                                            Selected

                                                                        </span>

                                                                    )
                                                                }

                                                            </div>


                                                            <p
                                                                className="
                                                                    mt-1
                                                                    font-mono
                                                                    text-xs
                                                                    font-semibold
                                                                    text-base-content/50
                                                                "
                                                            >

                                                                {
                                                                    branch.code
                                                                }

                                                            </p>

                                                        </div>

                                                    </div>


                                                    {
                                                        branch.isActive
                                                            ? (

                                                                <span
                                                                    className="
                                                                        inline-flex
                                                                        items-center
                                                                        gap-1.5
                                                                        text-xs
                                                                        font-semibold
                                                                        text-success
                                                                    "
                                                                >

                                                                    <FaCheckCircle />

                                                                    Active

                                                                </span>

                                                            )
                                                            : (

                                                                <span
                                                                    className="
                                                                        inline-flex
                                                                        items-center
                                                                        gap-1.5
                                                                        text-xs
                                                                        font-semibold
                                                                        text-error
                                                                    "
                                                                >

                                                                    <FaTimesCircle />

                                                                    Disabled

                                                                </span>

                                                            )
                                                    }

                                                </div>


                                                {/* DETAILS */}

                                                <div
                                                    className="
                                                        mt-5
                                                        space-y-2
                                                        text-sm
                                                        text-base-content/60
                                                    "
                                                >

                                                    <div className="flex items-start gap-2">

                                                        <FaMapMarkerAlt
                                                            className="
                                                                mt-1
                                                                shrink-0
                                                                text-base-content/35
                                                            "
                                                        />

                                                        <span>

                                                            {
                                                                branch.address ||
                                                                "No address configured"
                                                            }

                                                        </span>

                                                    </div>


                                                    <div className="flex items-center gap-2">

                                                        <FaPhone
                                                            className="
                                                                shrink-0
                                                                text-base-content/35
                                                            "
                                                        />

                                                        <span>

                                                            {
                                                                branch.phone ||
                                                                "No phone configured"
                                                            }

                                                        </span>

                                                    </div>


                                                    <div className="flex items-center gap-2">

                                                        <FaEnvelope
                                                            className="
                                                                shrink-0
                                                                text-base-content/35
                                                            "
                                                        />

                                                        <span>

                                                            {
                                                                branch.email ||
                                                                "No email configured"
                                                            }

                                                        </span>

                                                    </div>

                                                </div>


                                                {/* ACTIONS */}

                                                <div
                                                    className="
                                                        mt-5
                                                        flex
                                                        flex-wrap
                                                        justify-end
                                                        gap-2
                                                        border-t
                                                        border-base-200
                                                        pt-4
                                                    "
                                                >

                                                    {
                                                        branch.isActive &&
                                                        !branch.isDefault &&
                                                        (

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleSetDefault(
                                                                        branch
                                                                    )
                                                                }
                                                                disabled={
                                                                    processing ||
                                                                    Boolean(
                                                                        actionId &&
                                                                        !processing
                                                                    )
                                                                }
                                                                className="
                                                                    btn
                                                                    btn-primary
                                                                    btn-outline
                                                                    btn-sm
                                                                "
                                                            >

                                                                {
                                                                    processing
                                                                        ? (
                                                                            <span
                                                                                className="
                                                                                    loading
                                                                                    loading-spinner
                                                                                    loading-xs
                                                                                "
                                                                            />
                                                                        )
                                                                        : (
                                                                            <FaCrown />
                                                                        )
                                                                }

                                                                Set Default

                                                            </button>

                                                        )
                                                    }


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                branch
                                                            )
                                                        }
                                                        disabled={
                                                            processing ||
                                                            Boolean(
                                                                actionId
                                                            )
                                                        }
                                                        className="
                                                            btn
                                                            btn-outline
                                                            btn-sm
                                                        "
                                                    >

                                                        <FaEdit />

                                                        Edit

                                                    </button>


                                                    {
                                                        branch.isActive
                                                            ? (

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleDisable(
                                                                            branch
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        processing ||
                                                                        Boolean(
                                                                            actionId &&
                                                                            !processing
                                                                        ) ||
                                                                        branch.isDefault ||
                                                                        isActiveBranch
                                                                    }
                                                                    title={
                                                                        branch.isDefault
                                                                            ? "Set another branch as default before disabling this branch."
                                                                            : isActiveBranch
                                                                                ? "Switch to another branch before disabling the selected branch."
                                                                                : ""
                                                                    }
                                                                    className="
                                                                        btn
                                                                        btn-error
                                                                        btn-outline
                                                                        btn-sm
                                                                    "
                                                                >

                                                                    {
                                                                        processing &&
                                                                        (

                                                                            <span
                                                                                className="
                                                                                    loading
                                                                                    loading-spinner
                                                                                    loading-xs
                                                                                "
                                                                            />

                                                                        )
                                                                    }

                                                                    Disable

                                                                </button>

                                                            )
                                                            : (

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleEnable(
                                                                            branch
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        processing ||
                                                                        Boolean(
                                                                            actionId &&
                                                                            !processing
                                                                        )
                                                                    }
                                                                    className="
                                                                        btn
                                                                        btn-success
                                                                        btn-outline
                                                                        btn-sm
                                                                    "
                                                                >

                                                                    {
                                                                        processing &&
                                                                        (

                                                                            <span
                                                                                className="
                                                                                    loading
                                                                                    loading-spinner
                                                                                    loading-xs
                                                                                "
                                                                            />

                                                                        )
                                                                    }

                                                                    Enable

                                                                </button>

                                                            )
                                                    }

                                                </div>

                                            </div>

                                        );

                                    }
                                )
                            }


                            {
                                branches.length ===
                                0 &&
                                (

                                    <div
                                        className="
                                            col-span-full
                                            rounded-2xl
                                            border
                                            border-dashed
                                            border-base-300
                                            bg-base-100
                                            p-10
                                            text-center
                                        "
                                    >

                                        <FaBuilding
                                            className="
                                                mx-auto
                                                text-3xl
                                                text-base-content/25
                                            "
                                        />


                                        <p className="mt-3 font-semibold">

                                            No branches found

                                        </p>

                                    </div>

                                )
                            }

                        </div>

                    )
            }


            {/* =================================================
                CREATE / EDIT MODAL
            ================================================= */}

            {
                modalOpen &&
                (

                    <div
                        className="
                            fixed
                            inset-0
                            z-50
                            flex
                            items-center
                            justify-center
                            bg-black/50
                            p-4
                        "
                    >

                        <div
                            className="
                                w-full
                                max-w-xl
                                rounded-2xl
                                bg-base-100
                                shadow-2xl
                            "
                        >

                            <form
                                onSubmit={
                                    handleSave
                                }
                            >

                                {/* HEADER */}

                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        border-b
                                        border-base-200
                                        px-6
                                        py-5
                                    "
                                >

                                    <div>

                                        <h2 className="text-xl font-bold">

                                            {
                                                modalMode ===
                                                "create"
                                                    ? "Add Branch"
                                                    : "Edit Branch"
                                            }

                                        </h2>


                                        <p className="mt-1 text-xs text-base-content/50">

                                            {
                                                modalMode ===
                                                "create"
                                                    ? "Create a new StorePOS branch location."
                                                    : "Update branch information."
                                            }

                                        </p>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={
                                            closeModal
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="
                                            btn
                                            btn-ghost
                                            btn-circle
                                            btn-sm
                                        "
                                    >

                                        ✕

                                    </button>

                                </div>


                                {/* BODY */}

                                <div
                                    className="
                                        grid
                                        grid-cols-1
                                        gap-4
                                        p-6
                                        sm:grid-cols-2
                                    "
                                >

                                    <label className="form-control">

                                        <div className="label">

                                            <span className="label-text font-medium">

                                                Branch Code

                                            </span>

                                        </div>


                                        <input
                                            type="text"
                                            name="code"
                                            value={
                                                form.code
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="BR03"
                                            maxLength={
                                                20
                                            }
                                            autoComplete="off"
                                            required
                                            disabled={
                                                saving
                                            }
                                            className="
                                                input
                                                input-bordered
                                                w-full
                                                uppercase
                                            "
                                        />


                                        <div className="label">

                                            <span className="label-text-alt text-base-content/40">

                                                Short unique code used to identify the branch.

                                            </span>

                                        </div>

                                    </label>


                                    <label className="form-control">

                                        <div className="label">

                                            <span className="label-text font-medium">

                                                Branch Name

                                            </span>

                                        </div>


                                        <input
                                            type="text"
                                            name="name"
                                            value={
                                                form.name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Branch 3"
                                            maxLength={
                                                120
                                            }
                                            autoComplete="off"
                                            required
                                            disabled={
                                                saving
                                            }
                                            className="
                                                input
                                                input-bordered
                                                w-full
                                            "
                                        />

                                    </label>


                                    <label
                                        className="
                                            form-control
                                            sm:col-span-2
                                        "
                                    >

                                        <div className="label">

                                            <span className="label-text font-medium">

                                                Address

                                            </span>

                                        </div>


                                        <textarea
                                            name="address"
                                            value={
                                                form.address
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Branch address"
                                            maxLength={
                                                300
                                            }
                                            rows={
                                                3
                                            }
                                            disabled={
                                                saving
                                            }
                                            className="
                                                textarea
                                                textarea-bordered
                                                w-full
                                            "
                                        />

                                    </label>


                                    <label className="form-control">

                                        <div className="label">

                                            <span className="label-text font-medium">

                                                Phone

                                            </span>

                                        </div>


                                        <input
                                            type="text"
                                            name="phone"
                                            value={
                                                form.phone
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Branch phone number"
                                            maxLength={
                                                50
                                            }
                                            autoComplete="off"
                                            disabled={
                                                saving
                                            }
                                            className="
                                                input
                                                input-bordered
                                                w-full
                                            "
                                        />

                                    </label>


                                    <label className="form-control">

                                        <div className="label">

                                            <span className="label-text font-medium">

                                                Email

                                            </span>

                                        </div>


                                        <input
                                            type="email"
                                            name="email"
                                            value={
                                                form.email
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="branch@example.com"
                                            maxLength={
                                                120
                                            }
                                            autoComplete="off"
                                            disabled={
                                                saving
                                            }
                                            className="
                                                input
                                                input-bordered
                                                w-full
                                            "
                                        />

                                    </label>


                                    {
                                        modalMode ===
                                        "create" &&
                                        (

                                            <div
                                                className="
                                                    sm:col-span-2
                                                    rounded-xl
                                                    border
                                                    border-info/20
                                                    bg-info/5
                                                    p-4
                                                "
                                            >

                                                <div
                                                    className="
                                                        flex
                                                        items-start
                                                        gap-3
                                                    "
                                                >

                                                    <FaBuilding
                                                        className="
                                                            mt-0.5
                                                            shrink-0
                                                            text-info
                                                        "
                                                    />


                                                    <div>

                                                        <p className="text-sm font-semibold">

                                                            Inventory will be initialized automatically

                                                        </p>


                                                        <p
                                                            className="
                                                                mt-1
                                                                text-xs
                                                                leading-relaxed
                                                                text-base-content/55
                                                            "
                                                        >

                                                            Every existing product will receive an
                                                            inventory record for this branch with
                                                            zero starting stock. Inventory from
                                                            another branch will not be copied.

                                                        </p>

                                                    </div>

                                                </div>

                                            </div>

                                        )
                                    }

                                </div>


                                {/* FOOTER */}

                                <div
                                    className="
                                        flex
                                        justify-end
                                        gap-2
                                        border-t
                                        border-base-200
                                        px-6
                                        py-4
                                    "
                                >

                                    <button
                                        type="button"
                                        onClick={
                                            closeModal
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="
                                            btn
                                            btn-ghost
                                            btn-sm
                                        "
                                    >

                                        Cancel

                                    </button>


                                    <button
                                        type="submit"
                                        disabled={
                                            saving
                                        }
                                        className="
                                            btn
                                            btn-primary
                                            btn-sm
                                        "
                                    >

                                        {
                                            saving &&
                                            (

                                                <span
                                                    className="
                                                        loading
                                                        loading-spinner
                                                        loading-xs
                                                    "
                                                />

                                            )
                                        }


                                        {
                                            saving
                                                ? (
                                                    modalMode ===
                                                    "create"
                                                        ? "Creating..."
                                                        : "Saving..."
                                                )
                                                : (
                                                    modalMode ===
                                                    "create"
                                                        ? "Create Branch"
                                                        : "Save Changes"
                                                )
                                        }

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                )
            }

        </div>

    );

}


export default BranchManagementPage;