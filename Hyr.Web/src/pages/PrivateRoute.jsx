import React from "react";
import { useState, useEffect } from 'react'
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/AuthProvider";

const PrivateRoute = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const user = useAuth();
  const [isAuth, setIsAuth] = useState();
  console.log("initial")
  console.log(isAuth)

  useEffect(() => {

    const token = localStorage.getItem('token');
    fetch(`${apiUrl}/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    }).then(function (res) {
      console.log("setting IsAuth")
      console.log(res)
      return <div>Lll</div>;
      return true;
    }).catch((err) => {
      return <div>Err</div>;
      // <Navigate to="/login" />
    });
  }, []);

  console.log(isAuth);

  return <div>Loading authentication status…</div>;

  if (isAuth === undefined)
    return null; // or loading indicator, etc...

  return isAuth ? <Outlet /> : <Navigate to="/login" />;

};

export default PrivateRoute;