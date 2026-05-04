import { jsx as _jsx } from "react/jsx-runtime";
// src/app/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, } from "firebase/auth";
import { auth } from "../../lib/firebase";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setLoading(false);
        });
        return () => unsub();
    }, []);
    const login = async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
    };
    const logout = async () => {
        await signOut(auth);
    };
    return (_jsx(AuthContext.Provider, { value: { user, loading, login, logout }, children: children }));
}
export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return value;
}
