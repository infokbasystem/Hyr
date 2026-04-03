import React, { useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, verifyToken, loading } = useContext(AuthContext);
    const location = useLocation();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let isMounted = true; // prevent state updates after unmount
        setChecking(true); // reset before checking
        const token = localStorage.getItem("token");
        if (token) {
            verifyToken(token)
                .catch((err) => {
                    console.error("Auth check failed:", err);
                })
                .finally(() => {
                    if (isMounted) setChecking(false);
                });
        } else {
            if (isMounted) setChecking(false);
        }
        return () => {
            isMounted = false;
        };
    }, [location]);

    if (loading || checking)
        return <p></p>;
    // return <p>Checking authentication...</p>;

    if (!user)
        return <Navigate to="/login" state={{ from: location }} replace />;

    return children;
}
