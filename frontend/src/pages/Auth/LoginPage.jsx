import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/auth.store";

function LoginPage() {
    const navigate = useNavigate();

    const login = useAuthStore((state) => state.login);
    const loading = useAuthStore((state) => state.loading);
    const error = useAuthStore((state) => state.error);

    const [form, setForm] = useState({
        username: "",
        password: "",
    });

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const success = await login(form);

        if (success) {
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body">
                    <h1 className="text-3xl font-bold text-center">
                        StorePOS
                    </h1>

                    <p className="text-center text-gray-500 mb-6">
                        Sign in to continue
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            className="input input-bordered w-full"
                            value={form.username}
                            onChange={handleChange}
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="input input-bordered w-full"
                            value={form.password}
                            onChange={handleChange}
                        />

                        {error && (
                            <div className="text-error text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;