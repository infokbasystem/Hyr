import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [loading, setLoading] = useState(true);

    // On initial load, check if token is still valid
    useEffect(() => {
            const token = localStorage.getItem("token");
            if (token) {
                verifyToken(token);
            } else {
                setLoading(false);
            }
    }, []);

    const verifyToken = async (token) => {
        try {
            const res = await fetch(`${apiUrl}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem("user", data.user);
                localStorage.setItem("token", data.token);
                setUser(data.user);
            } else {
                setUser(null);
                localStorage.removeItem("token");
            }
        } catch (error) {
            console.error("Token verification failed", error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (loginData) => {
        const res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });
        if (!res.ok)
            throw new Error("Invalid credentials");
        const data = await res.json();
        localStorage.setItem("user", data.user);
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
        return <Navigate to="/login" />
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, verifyToken }}>
            {children}
        </AuthContext.Provider>
    );
};
