import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import useAuthStore from "../../store/auth.store";


/*
============================================================
BACKEND URL
============================================================

Uploaded profile photos are served by the backend.

Example stored value:

/uploads/profiles/profile-123.jpg

Browser needs:

http://localhost:5000/uploads/profiles/profile-123.jpg

IMPORTANT:

If your backend uses another port,
change this value.
============================================================
*/

const BACKEND_URL =
    "http://localhost:5000";


function LoginPage() {

    /*
    ============================================================
    NAVIGATION
    ============================================================
    */

    const navigate =
        useNavigate();


    /*
    ============================================================
    AUTH STORE
    ============================================================
    */

    const login =
        useAuthStore(
            (state) =>
                state.login
        );


    const rfidLogin =
        useAuthStore(
            (state) =>
                state.rfidLogin
        );


    const loading =
        useAuthStore(
            (state) =>
                state.loading
        );


    const rfidLoading =
        useAuthStore(
            (state) =>
                state.rfidLoading
        );


    const error =
        useAuthStore(
            (state) =>
                state.error
        );


    const clearError =
        useAuthStore(
            (state) =>
                state.clearError
        );


    /*
    ============================================================
    LOGIN FORM
    ============================================================
    */

    const [
        form,
        setForm,
    ] = useState({

        username:
            "",

        password:
            "",

    });


    /*
    ============================================================
    RFID INPUT
    ============================================================

    Many USB RFID/NFC readers behave like keyboards.

    Example:

    Card tap
        ↓
    Reader types:
    0944697426
        ↓
    Reader sends Enter
        ↓
    Login automatically
    ============================================================
    */

    const rfidInputRef =
        useRef(null);


    const [
        rfidValue,
        setRfidValue,
    ] = useState("");


    const [
        rfidMessage,
        setRfidMessage,
    ] = useState(
        "RFID/NFC reader ready"
    );


    /*
    ============================================================
    LOGIN TRANSITION
    ============================================================
    */

    const [
        showWelcome,
        setShowWelcome,
    ] = useState(
        false
    );


    const [
        fadeOut,
        setFadeOut,
    ] = useState(
        false
    );


    const [
        welcomeName,
        setWelcomeName,
    ] = useState(
        ""
    );


    const [
        welcomeUser,
        setWelcomeUser,
    ] = useState(
        null
    );


    /*
    ============================================================
    PROFILE IMAGE ERROR
    ============================================================

    If the saved profile image cannot load,
    fall back to the user's first letter.
    ============================================================
    */

    const [
        profileImageFailed,
        setProfileImageFailed,
    ] = useState(
        false
    );


    /*
    ============================================================
    GET PROFILE IMAGE URL
    ============================================================

    Converts:

    /uploads/profiles/photo.jpg

    into:

    http://localhost:5000/uploads/profiles/photo.jpg

    Complete URLs are left untouched.
    ============================================================
    */

    const getProfileImageUrl =
        (
            image
        ) => {

            if (
                !image
            ) {

                return "";

            }


            const value =
                String(
                    image
                ).trim();


            if (
                !value
            ) {

                return "";

            }


            /*
            ----------------------------------------------------
            ALREADY COMPLETE
            ----------------------------------------------------
            */

            if (
                value.startsWith(
                    "http://"
                ) ||

                value.startsWith(
                    "https://"
                ) ||

                value.startsWith(
                    "data:"
                ) ||

                value.startsWith(
                    "blob:"
                )
            ) {

                return value;

            }


            /*
            ----------------------------------------------------
            BACKEND UPLOAD
            ----------------------------------------------------
            */

            return `${BACKEND_URL}${
                value.startsWith(
                    "/"
                )
                    ? value
                    : `/${value}`
            }`;

        };


    /*
    ============================================================
    START WELCOME ANIMATION
    ============================================================

    Shared by:

    - Password login
    - RFID/NFC login
    ============================================================
    */

    const startWelcomeAnimation =
        (
            user,
            fallbackName =
                "User"
        ) => {

            /*
            ----------------------------------------------------
            DISPLAY NAME
            ----------------------------------------------------

            Priority:

            nickname
            ↓
            full name
            ↓
            username
            ↓
            fallback
            ----------------------------------------------------
            */

            const name =

                user?.profile
                    ?.nickname ||

                user?.name ||

                user?.username ||

                fallbackName ||

                "User";


            setWelcomeUser(
                user ||
                null
            );


            setWelcomeName(
                name
            );


            /*
            Reset image fallback in case
            another user logs in later.
            */

            setProfileImageFailed(
                false
            );


            setFadeOut(
                false
            );


            setShowWelcome(
                true
            );

        };


    /*
    ============================================================
    NORMALIZE RFID UID
    ============================================================
    */

    const normalizeRfidUid =
        (
            value
        ) => {

            return String(
                value ||
                ""
            )
                .replace(
                    /[^a-zA-Z0-9]/g,
                    ""
                )
                .toUpperCase()
                .trim();

        };


    /*
    ============================================================
    FOCUS RFID READER
    ============================================================
    */

    const focusRfidReader =
        () => {

            if (
                showWelcome
            ) {

                return;

            }


            requestAnimationFrame(
                () => {

                    rfidInputRef
                        .current
                        ?.focus();

                }
            );

        };


    /*
    ============================================================
    INITIAL RFID FOCUS
    ============================================================
    */

    useEffect(
        () => {

            const timer =
                setTimeout(
                    () => {

                        focusRfidReader();

                    },
                    150
                );


            return () => {

                clearTimeout(
                    timer
                );

            };

        },
        []
    );


    /*
    ============================================================
    INPUT CHANGE
    ============================================================
    */

    const handleChange =
        (
            event
        ) => {

            setForm(
                (
                    previous
                ) => ({

                    ...previous,

                    [event.target.name]:
                        event.target.value,

                })
            );


            if (
                error
            ) {

                clearError();

            }

        };


    /*
    ============================================================
    NORMAL PASSWORD LOGIN
    ============================================================
    */

    const handleSubmit =
        async (
            event
        ) => {

            event.preventDefault();


            if (
                loading ||
                rfidLoading
            ) {

                return;

            }


            const success =
                await login(
                    form
                );


            if (
                !success
            ) {

                return;

            }


            /*
            ----------------------------------------------------
            GET LATEST AUTH USER
            ----------------------------------------------------
            */

            const authState =
                useAuthStore
                    .getState();


            /*
            ----------------------------------------------------
            START PROFILE ANIMATION
            ----------------------------------------------------
            */

            startWelcomeAnimation(
                authState.user,
                form.username
            );

        };


    /*
    ============================================================
    RFID LOGIN
    ============================================================
    */

    const handleRfidLogin =
        async (
            rawUid
        ) => {

            if (
                loading ||
                rfidLoading ||
                showWelcome
            ) {

                return;

            }


            const uid =
                normalizeRfidUid(
                    rawUid
                );


            if (
                !uid
            ) {

                return;

            }


            /*
            ----------------------------------------------------
            UI STATUS
            ----------------------------------------------------
            */

            setRfidMessage(
                "Reading card..."
            );


            if (
                error
            ) {

                clearError();

            }


            /*
            ----------------------------------------------------
            RFID LOGIN
            ----------------------------------------------------
            */

            const success =
                await rfidLogin(
                    uid
                );


            /*
            ----------------------------------------------------
            CLEAR READER
            ----------------------------------------------------
            */

            setRfidValue(
                ""
            );


            if (
                rfidInputRef.current
            ) {

                rfidInputRef
                    .current
                    .value =
                    "";

            }


            /*
            ----------------------------------------------------
            FAILED
            ----------------------------------------------------
            */

            if (
                !success
            ) {

                setRfidMessage(
                    "Card not recognized. Try again."
                );


                setTimeout(
                    () => {

                        focusRfidReader();

                    },
                    100
                );


                return;

            }


            /*
            ----------------------------------------------------
            GET LOGGED-IN USER
            ----------------------------------------------------
            */

            const authState =
                useAuthStore
                    .getState();


            setRfidMessage(
                "Card accepted!"
            );


            /*
            ----------------------------------------------------
            PROFILE ANIMATION
            ----------------------------------------------------
            */

            startWelcomeAnimation(
                authState.user,
                "User"
            );

        };


    /*
    ============================================================
    RFID ENTER
    ============================================================
    */

    const handleRfidKeyDown =
        (
            event
        ) => {

            if (
                event.key !==
                "Enter"
            ) {

                return;

            }


            event.preventDefault();

            event.stopPropagation();


            const value =

                rfidInputRef
                    .current
                    ?.value ||

                rfidValue;


            handleRfidLogin(
                value
            );

        };


    /*
    ============================================================
    RFID CHANGE
    ============================================================
    */

    const handleRfidChange =
        (
            event
        ) => {

            const value =
                event.target.value;


            setRfidValue(
                value
            );


            if (
                value
            ) {

                setRfidMessage(
                    "Reading card..."
                );

            } else {

                setRfidMessage(
                    "RFID/NFC reader ready"
                );

            }

        };


    /*
    ============================================================
    ACTIVATE RFID READER
    ============================================================
    */

    const activateRfidReader =
        () => {

            if (
                loading ||
                rfidLoading
            ) {

                return;

            }


            setRfidMessage(
                "RFID/NFC reader ready"
            );


            setRfidValue(
                ""
            );


            if (
                rfidInputRef.current
            ) {

                rfidInputRef
                    .current
                    .value =
                    "";

            }


            focusRfidReader();

        };


    /*
    ============================================================
    LOGIN TRANSITION TIMER
    ============================================================

    0.0s
    Profile shoots onto screen

    0.3s
    Big pop

    0.6 - 1.8s
    Shake / squash / wobble

    2.0s
    Welcome text

    3.8s
    Fade begins

    4.5s
    Enter application
    ============================================================
    */

    useEffect(
        () => {

            if (
                !showWelcome
            ) {

                return;

            }


            /*
            ----------------------------------------------------
            FADE
            ----------------------------------------------------
            */

            const fadeTimer =
                setTimeout(
                    () => {

                        setFadeOut(
                            true
                        );

                    },
                    3800
                );


            /*
            ----------------------------------------------------
            NAVIGATE
            ----------------------------------------------------
            */

            const navigationTimer =
                setTimeout(
                    () => {

                        navigate(
                            "/",
                            {
                                replace:
                                    true,
                            }
                        );

                    },
                    4500
                );


            return () => {

                clearTimeout(
                    fadeTimer
                );


                clearTimeout(
                    navigationTimer
                );

            };

        },
        [
            showWelcome,
            navigate,
        ]
    );


    /*
    ============================================================
    LOGIN SUCCESS ANIMATION
    ============================================================
    */

    if (
        showWelcome
    ) {

        /*
        ========================================================
        FIRST LETTER FALLBACK
        ========================================================
        */

        const firstLetter =
            String(
                welcomeName ||
                "U"
            )
                .charAt(
                    0
                )
                .toUpperCase();


        /*
        ========================================================
        PROFILE IMAGE
        ========================================================
        */

        const rawProfileImage =

            welcomeUser
                ?.profile
                ?.image ||

            "";


        const profileImage =
            getProfileImageUrl(
                rawProfileImage
            );


        /*
        ========================================================
        FULL NAME
        ========================================================
        */

        const fullName =

            welcomeUser
                ?.name ||

            welcomeName;


        /*
        ========================================================
        ROLE
        ========================================================
        */

        const role =
            welcomeUser
                ?.role ||
            "";


        const roleLabel =
            role ===
            "admin"

                ? "Administrator"

                : role ===
                    "manager"

                    ? "Manager"

                    : role ===
                        "cashier"

                        ? "Cashier"

                        : role ===
                            "inventory"

                            ? "Inventory Staff"

                            : role ===
                                "payroll"

                                ? "Payroll"

                                : role ===
                                    "custom"

                                    ? "Staff"

                                    : "";


        return (

            <div
                className={`
                    login-transition-screen

                    ${
                        fadeOut
                            ? "login-transition-fade"
                            : ""
                    }
                `}
            >


                {/* =================================================
                    BACKGROUND
                ================================================= */}

                <div
                    className="
                        login-background-circle
                        login-background-circle-one
                    "
                />


                <div
                    className="
                        login-background-circle
                        login-background-circle-two
                    "
                />


                <div
                    className="
                        login-background-circle
                        login-background-circle-three
                    "
                />


                {/* =================================================
                    MAIN ANIMATION
                ================================================= */}

                <div className="login-animation-container">


                    {/* =============================================
                        AVATAR SHADOW
                    ============================================= */}

                    <div className="login-avatar-shadow" />


                    {/* =============================================
                        PROFILE HEAD
                    ============================================= */}

                    <div className="login-avatar-container">

                        <div
                            className={`
                                login-avatar

                                ${
                                    profileImage &&
                                    !profileImageFailed

                                        ? "login-avatar-has-photo"

                                        : ""
                                }
                            `}
                        >

                            {
                                profileImage &&
                                !profileImageFailed ? (

                                    <img
                                        src={
                                            profileImage
                                        }

                                        alt={
                                            fullName
                                        }

                                        className="
                                            login-profile-image
                                        "

                                        onError={() => {

                                            console.error(
                                                "Failed to load profile image:",
                                                profileImage
                                            );


                                            setProfileImageFailed(
                                                true
                                            );

                                        }}
                                    />

                                ) : (

                                    <span className="login-avatar-letter">

                                        {
                                            firstLetter
                                        }

                                    </span>

                                )
                            }

                        </div>


                        {/* =========================================
                            SPARKS
                        ========================================= */}

                        <span
                            className="
                                login-spark
                                login-spark-one
                            "
                        >
                            ✦
                        </span>


                        <span
                            className="
                                login-spark
                                login-spark-two
                            "
                        >
                            ★
                        </span>


                        <span
                            className="
                                login-spark
                                login-spark-three
                            "
                        >
                            ✦
                        </span>


                        <span
                            className="
                                login-spark
                                login-spark-four
                            "
                        >
                            ★
                        </span>

                    </div>


                    {/* =============================================
                        WELCOME MESSAGE
                    ============================================= */}

                    <div className="login-welcome-text">

                        <div className="login-small-text">

                            LOGIN SUCCESSFUL

                        </div>


                        <h1>

                            Welcome back!

                        </h1>


                        <div className="login-user-name">

                            {
                                welcomeName
                            }

                        </div>


                        {
                            welcomeName !==
                            fullName && (

                                <div className="login-full-name">

                                    {
                                        fullName
                                    }

                                </div>

                            )
                        }


                        {
                            roleLabel && (

                                <div className="login-role">

                                    {
                                        roleLabel
                                    }

                                </div>

                            )
                        }


                        <div className="login-ready-text">

                            Let's get to work.

                        </div>

                    </div>

                </div>


                {/* =================================================
                    LOADING DOTS
                ================================================= */}

                <div className="login-loading">

                    <span />

                    <span />

                    <span />

                </div>


                {/* =================================================
                    ANIMATION CSS
                ================================================= */}

                <style>
                    {`

                    /*
                    ==================================================
                    SCREEN
                    ==================================================
                    */

                    .login-transition-screen {

                        position: fixed;

                        inset: 0;

                        z-index: 99999;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        background:
                            hsl(var(--b2));

                        overflow: hidden;

                        opacity: 1;

                        transition:
                            opacity
                            0.7s
                            ease,
                            transform
                            0.7s
                            ease;

                    }


                    /*
                    ==================================================
                    FINAL FADE
                    ==================================================
                    */

                    .login-transition-screen.login-transition-fade {

                        opacity: 0;

                        transform:
                            scale(1.10);

                    }


                    /*
                    ==================================================
                    MAIN
                    ==================================================
                    */

                    .login-animation-container {

                        position: relative;

                        z-index: 10;

                        display: flex;

                        flex-direction: column;

                        align-items: center;

                        justify-content: center;

                    }


                    /*
                    ==================================================
                    BACKGROUND CIRCLES
                    ==================================================
                    */

                    .login-background-circle {

                        position: absolute;

                        border-radius: 9999px;

                        background:
                            hsl(var(--p));

                        opacity: 0.05;

                        pointer-events: none;

                    }


                    .login-background-circle-one {

                        width: 400px;

                        height: 400px;

                        top: -180px;

                        left: -150px;

                        animation:
                            backgroundFloatOne
                            5s
                            ease-in-out
                            infinite;

                    }


                    .login-background-circle-two {

                        width: 500px;

                        height: 500px;

                        right: -250px;

                        bottom: -250px;

                        animation:
                            backgroundFloatTwo
                            6s
                            ease-in-out
                            infinite;

                    }


                    .login-background-circle-three {

                        width: 180px;

                        height: 180px;

                        right: 15%;

                        top: 15%;

                        animation:
                            backgroundFloatOne
                            4s
                            ease-in-out
                            infinite;

                    }


                    @keyframes backgroundFloatOne {

                        0%,
                        100% {

                            transform:
                                translateY(0)
                                translateX(0);

                        }


                        50% {

                            transform:
                                translateY(25px)
                                translateX(15px);

                        }

                    }


                    @keyframes backgroundFloatTwo {

                        0%,
                        100% {

                            transform:
                                translateY(0)
                                translateX(0);

                        }


                        50% {

                            transform:
                                translateY(-25px)
                                translateX(-20px);

                        }

                    }


                    /*
                    ==================================================
                    AVATAR CONTAINER
                    ==================================================
                    */

                    .login-avatar-container {

                        position: relative;

                        width: 200px;

                        height: 200px;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        z-index: 10;

                    }


                    /*
                    ==================================================
                    PROFILE AVATAR
                    ==================================================
                    */

                    .login-avatar {

                        position: relative;

                        z-index: 5;

                        width: 165px;

                        height: 165px;

                        border-radius: 9999px;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        overflow: hidden;

                        background:
                            hsl(var(--p));

                        color:
                            hsl(var(--pc));

                        font-size: 4.5rem;

                        font-weight: 900;

                        border:
                            6px solid
                            hsl(var(--b1));

                        box-shadow:
                            0 25px 60px
                            rgba(
                                0,
                                0,
                                0,
                                0.30
                            ),
                            0 0 0 8px
                            hsl(var(--p) / 0.10);

                        user-select: none;

                        transform-origin:
                            50% 70%;

                        animation:
                            funnyLoginHead
                            3.4s
                            cubic-bezier(
                                0.22,
                                1,
                                0.36,
                                1
                            )
                            both;

                    }


                    /*
                    ==================================================
                    AVATAR WITH PHOTO
                    ==================================================
                    */

                    .login-avatar-has-photo {

                        background:
                            hsl(var(--b1));

                    }


                    /*
                    ==================================================
                    PROFILE IMAGE
                    ==================================================
                    */

                    .login-profile-image {

                        position: absolute;

                        inset: 0;

                        width: 100%;

                        height: 100%;

                        object-fit: cover;

                        object-position: center;

                        pointer-events: none;

                        user-select: none;

                    }


                    /*
                    ==================================================
                    FALLBACK LETTER
                    ==================================================
                    */

                    .login-avatar-letter {

                        position: relative;

                        z-index: 2;

                    }


                    /*
                    ==================================================
                    FUNNY PROFILE ANIMATION
                    ==================================================
                    */

                    @keyframes funnyLoginHead {

                        /*
                        Start underground 😂
                        */

                        0% {

                            opacity: 0;

                            transform:
                                translateY(220px)
                                scale(0.03)
                                rotate(-55deg);

                        }


                        /*
                        BOOM
                        */

                        8% {

                            opacity: 1;

                            transform:
                                translateY(-50px)
                                scale(1.75)
                                rotate(22deg);

                        }


                        /*
                        Pancake
                        */

                        14% {

                            transform:
                                translateY(12px)
                                scaleX(1.42)
                                scaleY(0.68)
                                rotate(-15deg);

                        }


                        /*
                        Stretch
                        */

                        20% {

                            transform:
                                translateY(-22px)
                                scaleX(0.78)
                                scaleY(1.34)
                                rotate(15deg);

                        }


                        /*
                        SHAKE SHAKE SHAKE
                        */

                        26% {

                            transform:
                                translateX(-31px)
                                scale(1.14)
                                rotate(-25deg);

                        }


                        31% {

                            transform:
                                translateX(31px)
                                scale(1.14)
                                rotate(25deg);

                        }


                        36% {

                            transform:
                                translateX(-25px)
                                scale(1.11)
                                rotate(-21deg);

                        }


                        41% {

                            transform:
                                translateX(25px)
                                scale(1.11)
                                rotate(21deg);

                        }


                        46% {

                            transform:
                                translateX(-19px)
                                scale(1.08)
                                rotate(-16deg);

                        }


                        51% {

                            transform:
                                translateX(19px)
                                scale(1.08)
                                rotate(16deg);

                        }


                        56% {

                            transform:
                                translateX(-12px)
                                rotate(-11deg)
                                scale(1.06);

                        }


                        61% {

                            transform:
                                translateX(12px)
                                rotate(11deg)
                                scale(1.06);

                        }


                        /*
                        BOUNCE
                        */

                        67% {

                            transform:
                                translateY(-28px)
                                scale(1.13)
                                rotate(8deg);

                        }


                        73% {

                            transform:
                                translateY(8px)
                                scaleX(1.18)
                                scaleY(0.87)
                                rotate(-6deg);

                        }


                        79% {

                            transform:
                                translateY(-14px)
                                scale(1.07)
                                rotate(5deg);

                        }


                        85% {

                            transform:
                                translateY(3px)
                                scale(0.97)
                                rotate(-3deg);

                        }


                        91% {

                            transform:
                                translateY(-8px)
                                scale(1.04)
                                rotate(2deg);

                        }


                        96% {

                            transform:
                                translateY(1px)
                                scale(0.99)
                                rotate(-1deg);

                        }


                        /*
                        Finally behaves
                        */

                        100% {

                            opacity: 1;

                            transform:
                                translateY(0)
                                translateX(0)
                                scale(1)
                                rotate(0deg);

                        }

                    }


                    /*
                    ==================================================
                    SHADOW
                    ==================================================
                    */

                    .login-avatar-shadow {

                        position: absolute;

                        width: 125px;

                        height: 24px;

                        margin-top: 205px;

                        border-radius: 50%;

                        background:
                            rgba(
                                0,
                                0,
                                0,
                                0.18
                            );

                        filter:
                            blur(7px);

                        animation:
                            funnyShadow
                            3.4s
                            ease
                            both;

                    }


                    @keyframes funnyShadow {

                        0% {

                            opacity: 0;

                            transform:
                                scale(0.15);

                        }


                        10% {

                            opacity: 0.12;

                            transform:
                                scale(0.60);

                        }


                        20% {

                            opacity: 0.30;

                            transform:
                                scale(1.30);

                        }


                        40% {

                            transform:
                                scale(0.80);

                        }


                        67% {

                            transform:
                                scale(0.55);

                        }


                        73% {

                            transform:
                                scale(1.25);

                        }


                        100% {

                            opacity: 0.18;

                            transform:
                                scale(1);

                        }

                    }


                    /*
                    ==================================================
                    SPARKS
                    ==================================================
                    */

                    .login-spark {

                        position: absolute;

                        z-index: 2;

                        color:
                            hsl(var(--p));

                        opacity: 0;

                        font-weight: bold;

                        pointer-events: none;

                    }


                    .login-spark-one {

                        top: -5px;

                        left: -20px;

                        font-size: 2rem;

                        animation:
                            sparkOne
                            1.2s
                            ease
                            0.2s
                            both;

                    }


                    .login-spark-two {

                        top: 5px;

                        right: -30px;

                        font-size: 1.4rem;

                        animation:
                            sparkTwo
                            1.3s
                            ease
                            0.3s
                            both;

                    }


                    .login-spark-three {

                        bottom: 5px;

                        left: -25px;

                        font-size: 1.3rem;

                        animation:
                            sparkThree
                            1.2s
                            ease
                            0.45s
                            both;

                    }


                    .login-spark-four {

                        bottom: -10px;

                        right: -20px;

                        font-size: 1.8rem;

                        animation:
                            sparkFour
                            1.4s
                            ease
                            0.4s
                            both;

                    }


                    @keyframes sparkOne {

                        0% {

                            opacity: 0;

                            transform:
                                scale(0)
                                rotate(0deg);

                        }


                        40% {

                            opacity: 1;

                            transform:
                                scale(1.5)
                                rotate(100deg);

                        }


                        100% {

                            opacity: 0;

                            transform:
                                translate(
                                    -40px,
                                    -35px
                                )
                                scale(0.5)
                                rotate(220deg);

                        }

                    }


                    @keyframes sparkTwo {

                        0% {

                            opacity: 0;

                            transform:
                                scale(0);

                        }


                        40% {

                            opacity: 1;

                            transform:
                                scale(1.4)
                                rotate(-80deg);

                        }


                        100% {

                            opacity: 0;

                            transform:
                                translate(
                                    42px,
                                    -25px
                                )
                                scale(0.4)
                                rotate(-200deg);

                        }

                    }


                    @keyframes sparkThree {

                        0% {

                            opacity: 0;

                            transform:
                                scale(0);

                        }


                        40% {

                            opacity: 1;

                            transform:
                                scale(1.3)
                                rotate(60deg);

                        }


                        100% {

                            opacity: 0;

                            transform:
                                translate(
                                    -42px,
                                    35px
                                )
                                scale(0.4)
                                rotate(180deg);

                        }

                    }


                    @keyframes sparkFour {

                        0% {

                            opacity: 0;

                            transform:
                                scale(0);

                        }


                        40% {

                            opacity: 1;

                            transform:
                                scale(1.5)
                                rotate(-70deg);

                        }


                        100% {

                            opacity: 0;

                            transform:
                                translate(
                                    38px,
                                    38px
                                )
                                scale(0.4)
                                rotate(-190deg);

                        }

                    }


                    /*
                    ==================================================
                    TEXT
                    ==================================================
                    */

                    .login-welcome-text {

                        margin-top: 38px;

                        text-align: center;

                    }


                    /*
                    ==================================================
                    LOGIN SUCCESSFUL
                    ==================================================
                    */

                    .login-small-text {

                        margin-bottom: 8px;

                        font-size: 0.7rem;

                        font-weight: 800;

                        letter-spacing: 0.18em;

                        opacity: 0;

                        transform:
                            translateY(10px);

                        animation:
                            smallTextAppear
                            0.4s
                            ease
                            1.8s
                            forwards;

                    }


                    @keyframes smallTextAppear {

                        to {

                            opacity: 0.5;

                            transform:
                                translateY(0);

                        }

                    }


                    /*
                    ==================================================
                    WELCOME BACK
                    ==================================================
                    */

                    .login-welcome-text h1 {

                        margin: 0;

                        font-size: 2rem;

                        font-weight: 900;

                        opacity: 0;

                        transform:
                            translateY(25px)
                            scale(0.8);

                        animation:
                            welcomeTextPop
                            0.55s
                            cubic-bezier(
                                0.34,
                                1.56,
                                0.64,
                                1
                            )
                            2s
                            forwards;

                    }


                    @keyframes welcomeTextPop {

                        0% {

                            opacity: 0;

                            transform:
                                translateY(25px)
                                scale(0.8);

                        }


                        70% {

                            opacity: 1;

                            transform:
                                translateY(-3px)
                                scale(1.08);

                        }


                        100% {

                            opacity: 1;

                            transform:
                                translateY(0)
                                scale(1);

                        }

                    }


                    /*
                    ==================================================
                    NICKNAME / NAME
                    ==================================================
                    */

                    .login-user-name {

                        margin-top: 5px;

                        font-size: 1.35rem;

                        font-weight: 800;

                        color:
                            hsl(var(--p));

                        opacity: 0;

                        transform:
                            translateY(15px);

                        animation:
                            userNameAppear
                            0.45s
                            ease
                            2.35s
                            forwards;

                    }


                    @keyframes userNameAppear {

                        to {

                            opacity: 1;

                            transform:
                                translateY(0);

                        }

                    }


                    /*
                    ==================================================
                    FULL NAME
                    ==================================================
                    */

                    .login-full-name {

                        margin-top: 3px;

                        font-size: 0.8rem;

                        opacity: 0;

                        animation:
                            secondaryTextAppear
                            0.4s
                            ease
                            2.55s
                            forwards;

                    }


                    /*
                    ==================================================
                    ROLE
                    ==================================================
                    */

                    .login-role {

                        display: inline-flex;

                        align-items: center;

                        justify-content: center;

                        margin-top: 8px;

                        padding:
                            4px 10px;

                        border-radius:
                            9999px;

                        background:
                            hsl(var(--p) / 0.10);

                        color:
                            hsl(var(--p));

                        font-size:
                            0.68rem;

                        font-weight:
                            700;

                        opacity:
                            0;

                        transform:
                            scale(0.8);

                        animation:
                            roleAppear
                            0.4s
                            cubic-bezier(
                                0.34,
                                1.56,
                                0.64,
                                1
                            )
                            2.7s
                            forwards;

                    }


                    @keyframes roleAppear {

                        to {

                            opacity: 1;

                            transform:
                                scale(1);

                        }

                    }


                    @keyframes secondaryTextAppear {

                        to {

                            opacity: 0.5;

                        }

                    }


                    /*
                    ==================================================
                    READY TEXT
                    ==================================================
                    */

                    .login-ready-text {

                        margin-top: 8px;

                        font-size: 0.85rem;

                        opacity: 0;

                        transform:
                            translateY(10px);

                        animation:
                            readyTextAppear
                            0.4s
                            ease
                            2.9s
                            forwards;

                    }


                    @keyframes readyTextAppear {

                        to {

                            opacity: 0.55;

                            transform:
                                translateY(0);

                        }

                    }


                    /*
                    ==================================================
                    LOADING DOTS
                    ==================================================
                    */

                    .login-loading {

                        position: absolute;

                        bottom: 50px;

                        display: flex;

                        align-items: center;

                        gap: 6px;

                        opacity: 0;

                        animation:
                            loadingAppear
                            0.4s
                            ease
                            3s
                            forwards;

                    }


                    .login-loading span {

                        width: 6px;

                        height: 6px;

                        border-radius: 9999px;

                        background:
                            hsl(var(--p));

                        animation:
                            loadingDot
                            0.8s
                            ease-in-out
                            infinite;

                    }


                    .login-loading span:nth-child(2) {

                        animation-delay:
                            0.15s;

                    }


                    .login-loading span:nth-child(3) {

                        animation-delay:
                            0.30s;

                    }


                    @keyframes loadingAppear {

                        to {

                            opacity: 0.6;

                        }

                    }


                    @keyframes loadingDot {

                        0%,
                        100% {

                            transform:
                                translateY(0);

                            opacity:
                                0.4;

                        }


                        50% {

                            transform:
                                translateY(-7px);

                            opacity:
                                1;

                        }

                    }

                    `}
                </style>

            </div>

        );

    }


    /*
    ============================================================
    NORMAL LOGIN PAGE
    ============================================================
    */

    return (

        <div
            className="
                min-h-screen
                flex
                items-center
                justify-center
                bg-base-200
                px-4
            "
        >


            {/* =================================================
                HIDDEN RFID INPUT
            ================================================= */}

            <input
                ref={
                    rfidInputRef
                }

                type="text"

                tabIndex={
                    -1
                }

                autoComplete="off"

                aria-label="RFID card reader"

                className="
                    fixed
                    -left-[10000px]
                    top-0
                    w-px
                    h-px
                    opacity-0
                    pointer-events-none
                "

                value={
                    rfidValue
                }

                onChange={
                    handleRfidChange
                }

                onKeyDown={
                    handleRfidKeyDown
                }
            />


            {/* =================================================
                LOGIN CARD
            ================================================= */}

            <div
                className="
                    card
                    w-full
                    max-w-md
                    bg-base-100
                    shadow-xl
                "
            >

                <div className="card-body">


                    {/* =========================================
                        TITLE
                    ========================================= */}

                    <h1
                        className="
                            text-3xl
                            font-bold
                            text-center
                        "
                    >

                        StorePOS

                    </h1>


                    <p
                        className="
                            text-center
                            text-base-content/50
                            mb-4
                        "
                    >

                        Sign in to continue

                    </p>


                    {/* =========================================
                        RFID / NFC
                    ========================================= */}

                    <button
                        type="button"

                        className={`
                            w-full
                            rounded-xl
                            border
                            p-4
                            text-left
                            transition-all

                            ${
                                rfidLoading

                                    ? "border-primary bg-primary/10"

                                    : "border-base-300 hover:border-primary/50 hover:bg-base-200/50"
                            }
                        `}

                        onClick={
                            activateRfidReader
                        }

                        disabled={
                            loading ||
                            rfidLoading
                        }
                    >

                        <div className="flex items-center gap-4">


                            {/* RFID ICON */}

                            <div
                                className={`
                                    w-12
                                    h-12
                                    rounded-xl
                                    flex
                                    items-center
                                    justify-center
                                    text-2xl

                                    ${
                                        rfidLoading

                                            ? "bg-primary text-primary-content"

                                            : "bg-primary/10 text-primary"
                                    }
                                `}
                            >

                                {
                                    rfidLoading ? (

                                        <span
                                            className="
                                                loading
                                                loading-spinner
                                                loading-sm
                                            "
                                        />

                                    ) : (

                                        "📡"

                                    )
                                }

                            </div>


                            {/* RFID TEXT */}

                            <div className="flex-1">

                                <div className="font-bold">

                                    Tap RFID / NFC Card

                                </div>


                                <div className="text-xs text-base-content/50 mt-1">

                                    {
                                        rfidLoading

                                            ? "Authenticating card..."

                                            : rfidMessage
                                    }

                                </div>

                            </div>


                            <div className="text-xs text-base-content/40">

                                TAP

                            </div>

                        </div>

                    </button>


                    {/* =========================================
                        DIVIDER
                    ========================================= */}

                    <div className="divider text-xs text-base-content/40">

                        OR USE PASSWORD

                    </div>


                    {/* =========================================
                        PASSWORD LOGIN FORM
                    ========================================= */}

                    <form
                        onSubmit={
                            handleSubmit
                        }

                        className="space-y-4"
                    >


                        {/* USERNAME */}

                        <div>

                            <label className="label">

                                <span className="label-text">

                                    Username

                                </span>

                            </label>


                            <input
                                type="text"

                                name="username"

                                placeholder="Username"

                                className="
                                    input
                                    input-bordered
                                    w-full
                                "

                                value={
                                    form.username
                                }

                                onChange={
                                    handleChange
                                }

                                onFocus={() => {

                                    setRfidMessage(
                                        "Click Tap RFID / NFC Card to reactivate reader"
                                    );

                                }}

                                autoComplete="username"

                                required
                            />

                        </div>


                        {/* PASSWORD */}

                        <div>

                            <label className="label">

                                <span className="label-text">

                                    Password

                                </span>

                            </label>


                            <input
                                type="password"

                                name="password"

                                placeholder="Password"

                                className="
                                    input
                                    input-bordered
                                    w-full
                                "

                                value={
                                    form.password
                                }

                                onChange={
                                    handleChange
                                }

                                onFocus={() => {

                                    setRfidMessage(
                                        "Click Tap RFID / NFC Card to reactivate reader"
                                    );

                                }}

                                autoComplete="current-password"

                                required
                            />

                        </div>


                        {/* =====================================
                            ERROR
                        ===================================== */}

                        {
                            error && (

                                <div
                                    className="
                                        alert
                                        alert-error
                                        py-2
                                        text-sm
                                    "
                                >

                                    <span>

                                        {
                                            error
                                        }

                                    </span>

                                </div>

                            )
                        }


                        {/* =====================================
                            LOGIN BUTTON
                        ===================================== */}

                        <button
                            type="submit"

                            className="
                                btn
                                btn-primary
                                w-full
                            "

                            disabled={
                                loading ||
                                rfidLoading
                            }
                        >

                            {
                                loading ? (

                                    <>

                                        <span
                                            className="
                                                loading
                                                loading-spinner
                                                loading-sm
                                            "
                                        />

                                        Signing in...

                                    </>

                                ) : (

                                    "Login"

                                )
                            }

                        </button>

                    </form>


                    {/* =========================================
                        RFID HELP
                    ========================================= */}

                    <div
                        className="
                            text-center
                            text-[10px]
                            text-base-content/35
                            mt-2
                        "
                    >

                        RFID/NFC cards must be registered to a StorePOS user.

                    </div>

                </div>

            </div>

        </div>

    );

}


export default LoginPage;