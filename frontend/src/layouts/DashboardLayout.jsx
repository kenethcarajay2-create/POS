import {
    useEffect,
    useState,
} from "react";

import {
    Outlet,
    useLocation,
} from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";


function DashboardLayout() {

    /*
    ============================================================
    ROUTE
    ============================================================
    */

    const location =
        useLocation();


    /*
    ============================================================
    FULLSCREEN STATE
    ============================================================
    */

    const [
        isFullscreen,
        setIsFullscreen,
    ] = useState(
        Boolean(
            document.fullscreenElement
        )
    );


    /*
    ============================================================
    LISTEN FOR FULLSCREEN CHANGES
    ============================================================

    This detects fullscreen changes triggered from:

    - POS
    - Bulk Orders
    - ESC key
    - Browser fullscreen exit
    ============================================================
    */

    useEffect(
        () => {

            const handleFullscreenChange =
                () => {

                    setIsFullscreen(
                        Boolean(
                            document.fullscreenElement
                        )
                    );

                };


            document.addEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );


            return () => {

                document.removeEventListener(
                    "fullscreenchange",
                    handleFullscreenChange
                );

            };

        },
        []
    );


    /*
    ============================================================
    FULLSCREEN-ENABLED PAGES
    ============================================================
    */

    const isFullscreenPage =

        location.pathname ===
            "/pos" ||

        location.pathname ===
            "/bulk-orders";


    /*
    ============================================================
    FOCUS MODE
    ============================================================

    Sidebar and Navbar disappear only when:

    1. We are on POS or Bulk Orders
    2. Browser fullscreen is active

    Other dashboard pages are unaffected.
    ============================================================
    */

    const focusMode =

        isFullscreenPage &&
        isFullscreen;


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <div
            className="
                flex
                h-screen
                bg-base-200
            "
        >

            {/* =================================================
                SIDEBAR
            ================================================= */}

            {
                !focusMode && (

                    <Sidebar />

                )
            }


            {/* =================================================
                MAIN AREA
            ================================================= */}

            <div
                className="
                    flex
                    min-w-0
                    flex-1
                    flex-col
                    overflow-hidden
                "
            >

                {/* =============================================
                    NAVBAR
                ============================================= */}

                {
                    !focusMode && (

                        <Navbar />

                    )
                }


                {/* =============================================
                    PAGE CONTENT
                ============================================= */}

                <main
                    className={

                        focusMode

                            ? `
                                flex-1
                                min-h-0
                                overflow-hidden
                                p-0
                            `

                            : `
                                flex-1
                                min-h-0
                                overflow-auto
                                p-6
                            `

                    }
                >

                    <Outlet />

                </main>

            </div>

        </div>

    );

}


export default DashboardLayout;