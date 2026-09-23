import React from "react";
import { useState, useEffect } from 'react'
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/AuthProvider";
import apiClient from "../lib/apiClient";

const PrivateRoute = () => {
  const user = useAuth();
  const [isAuth, setIsAuth] = useState();
  console.log("initial")
  console.log(isAuth)

  useEffect(() => {
    apiClient.get('/auth/verify').then(function (res) {
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