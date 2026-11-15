import React from 'react'
import { useLocation } from "react-router-dom";
import bg from '../assets/login-bg.jpg'
import LoginPanel from '../components/LoginPanel'

const Login = () => {
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  return (
    <main className="relative min-h-screen overflow-hidden text-stone-50">
      <img
        src={bg}
        alt="Login background"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#02040a]/55" />

      <div className="relative flex min-h-screen items-stretch px-3 py-4 sm:px-6 sm:py-6 lg:pl-90 lg:py-8">
        <section className="flex w-full min-w-[450px] flex-col rounded-2xl border border-white/10 bg-[#141820]/96 p-6 shadow-[0_35px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8 lg:w-[40%] lg:max-w-[500px]">
          <LoginPanel redirectTo={from} />
        </section>
      </div>
    </main>
  )
}

export default Login
