import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { Outlet } from "react-router-dom";

function DashboardLayout() {
    return (
        <div className="flex h-screen bg-base-200">

            <Sidebar />

            <div className="flex flex-col flex-1 overflow-hidden">

                <Navbar />

                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>

            </div>

        </div>
    );
}

export default DashboardLayout;