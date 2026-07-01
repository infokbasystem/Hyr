import React, { createContext, useState, useEffect } from "react";
import apiClient from "./lib/apiClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
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
            const res = await apiClient.get('/auth/verify', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = res.data;
            localStorage.setItem("user", data.user);
            localStorage.setItem("token", data.token);
            setUser(data.user);
        } catch (error) {
            setUser(null);
            localStorage.removeItem("token");
            console.error("Token verification failed", error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (loginData) => {
        let res;
        try {
            res = await apiClient.post('/auth/login', loginData);
        } catch {
            throw new Error("Invalid credentials");
        }
        const data = res.data;
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
