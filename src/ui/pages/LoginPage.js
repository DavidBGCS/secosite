import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/LoginPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/context/AuthContext";
export function LoginPage() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        if (user) {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);
    const handleLogin = async () => {
        try {
            setBusy(true);
            setError("");
            console.log("Attempting login...", email);
            await login(email, password);
            console.log("Login success");
            navigate("/", { replace: true });
        }
        catch (err) {
            console.error("Login failed:", err);
            setError(err instanceof Error ? err.message : "Login failed.");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx("div", { style: {
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#f4f6f8",
            padding: 16,
        }, children: _jsxs("div", { style: {
                width: "100%",
                maxWidth: 420,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 24,
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            }, children: [_jsx("div", { style: {
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }, children: "SeCoSite" }), _jsx("h1", { style: { margin: "8px 0 6px", fontSize: 28 }, children: "Login" }), _jsx("p", { style: { margin: 0, color: "#6b7280" }, children: "Sign in to access company sites." }), _jsxs("div", { style: { display: "grid", gap: 12, marginTop: 20 }, children: [_jsxs("label", { style: { display: "grid", gap: 6 }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Email" }), _jsx("input", { value: email, onChange: (e) => setEmail(e.target.value), style: inputStyle, placeholder: "you@company.com" })] }), _jsxs("label", { style: { display: "grid", gap: 6 }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), style: inputStyle, placeholder: "Password" })] }), error ? (_jsx("div", { style: { color: "#b91c1c", fontSize: 14 }, children: error })) : null, _jsx("button", { onClick: handleLogin, disabled: busy, style: {
                                minHeight: 46,
                                borderRadius: 14,
                                border: "1px solid #111827",
                                background: "#111827",
                                color: "#fff",
                                fontWeight: 700,
                                cursor: "pointer",
                            }, children: busy ? "Signing in..." : "Login" })] })] }) }));
}
const inputStyle = {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid #d1d5db",
    padding: "12px 14px",
    fontSize: 16,
    boxSizing: "border-box",
};
