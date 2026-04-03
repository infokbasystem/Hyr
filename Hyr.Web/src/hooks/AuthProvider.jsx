import { useContext, createContext, useState } from "react";
import { data, useNavigate } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL;

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  // const navigate = useNavigate();

  const loginAction = async (data) => {
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const res = await response.json();
      if (response.ok) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem("token", res.token);
        // navigate("/dashboard");
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }
    } catch (err) {
      console.error(err);
    }
  };

  const verify = async (data) => {
    setTimeout(() => {
      console.log("This message is shown after 3 seconds.");
      return { success: true };
    }, 3000);
    return;
    try {
      const response = await fetch(`${apiUrl}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: null,
      });
      const res = await response.json();
      if (response.ok) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem("token", res.token);
        // navigate("/dashboard");
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }
    } catch (err) {
      console.error(err);
    }
  }

  const logOut = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("token");
    return <Navigate to="/login" />
    // navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ token, user, loginAction, verify, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => {
  return useContext(AuthContext);
};