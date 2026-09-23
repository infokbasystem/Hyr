import { useContext, createContext, useState } from "react";
import { data, useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  // const navigate = useNavigate();

  const loginAction = async (data) => {
    try {
      const response = await apiClient.post('/auth/login', data);
      const res = response.data;
      if (response.status >= 200 && response.status < 300) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem("token", res.token);
        // navigate("/dashboard");
        return { success: true };
      } else {
        return { success: false, error: 'Login failed' };
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
      const response = await apiClient.post('/auth/verify', null);
      const res = response.data;
      if (response.status >= 200 && response.status < 300) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem("token", res.token);
        // navigate("/dashboard");
        return { success: true };
      } else {
        return { success: false, error: 'Login failed' };
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