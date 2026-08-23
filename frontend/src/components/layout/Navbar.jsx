import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/auth.store";

function Navbar() {
    const navigate = useNavigate();

    const logout = useAuthStore(
        (state) => state.logout
    );

    const user = useAuthStore(
        (state) => state.user
    );

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="navbar bg-base-100 border-b">

            <div className="flex-1">
                <h1 className="text-xl font-bold">
                    StorePOS
                </h1>
            </div>

            <div className="flex items-center gap-4">

                <span>
                    {user?.name || "Administrator"}
                </span>

                <button
                    className="btn btn-error btn-sm"
                    onClick={handleLogout}
                >
                    Logout
                </button>

            </div>

        </div>
    );
}

export default Navbar;