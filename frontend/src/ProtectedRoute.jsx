import { useContext, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import RouteLoading from "./components/RouteLoading";

export default function ProtectedRoute({ children }) {
    const { user, verifyToken, loading } = useContext(AuthContext);
    const location = useLocation();
    const authenticated = Boolean(user);

    useEffect(() => {
        if (loading || !authenticated) return;
        const token = localStorage.getItem("token");
        if (token) {
            verifyToken(token);
        }
    }, [location, authenticated, loading, verifyToken]);

    if (loading)
        return <RouteLoading />;

    if (!user)
        return <Navigate to="/login" state={{ from: location }} replace />;

    return children;
}
