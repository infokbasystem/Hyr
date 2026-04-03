import React, { use, useState, useContext, useEffect } from 'react'
import { useNavigate, useLocation } from "react-router-dom";
// import { useAuth } from "../hooks/AuthProvider";
import { AuthContext } from "../AuthContext";
import bg from '../assets/login-bg.jpeg'

const apiUrl = import.meta.env.VITE_API_URL;

const Login = () => {
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const [input, setInput] = useState({
    email: "",
    password: "",
  });

  // const auth = useAuth();

  const handleLogin = async (e) => {
    console.log('handleLogin');
    // e.preventDefault();
    if (input.email !== "" && input.password !== "") {
      try {
        await login(input);
        navigate(from, { replace: true });
      } catch (err) {
        setError(err.message);
      }
      // const res = await auth.loginAction(input);
      // navigate("/");
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setInput((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // const fetchData = async () => {
  //   try {
  //     const response = await fetch('http://localhost:3001/employees/1');
  //     if (!response.ok) {
  //       throw new Error('Network response was not ok');
  //     }
  //     const data = await response.json();
  //     window.location.href = '/';
  //   } catch (error) {
  //     setError(error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  // useEffect(() => {
  //   fetchData();
  // }, []);

  // useEffect(() => {
  //   debugger
  //   console.log('i fire once');
  //   document.body.classList.add('flex', 'flex-col', 'h-screen');
  //   return () => {
  //     // body.classList.remove('flex, flex-col, h-screen')
  //   }
  // }, [])

  return (
    <div
      className='[&_input]:outline-none min-h-screen bg-cover bg-no-repeat bg-center relative flex justify-center items-center
      before:absolute before:w-full before:h-full before:backdrop-grayscale before:bg-white/5 
      after:absolute after:w-full after:h-full after:bg-gray-900 after:opacity-80'
      style={{ backgroundImage: `url(${bg})` }}>
      {/* <div>{employee.name}</div> */}
      <div className='relaateive z-10'>
        <form className='w-96'>

          {/* <p>API URL: {apiUrl}</p> */}

          <div className='text-white mb-6'>
            <div className="relative">
              <input
                name='email'
                className="text-sm peer py-2.5 pt-3 sm:py-3 pe-0 ps-8 block w-full bg-transparent border-t-transparent border-b-1 border-x-transparent border-b-gray-200 sm:text-sm focus:border-t-transparent focus:border-x-transparent focus:border-b-teal-200 focus:ring-0 disabled:opacity-50 disabled:pointer-events-none dark:border-b-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 dark:focus:border-b-neutral-600"
                placeholder="Email"
                onChange={handleInput}
              />
              <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none ps-2 peer-disabled:opacity-50 peer-disabled:pointer-events-none">
                <svg className="shrink-0 size-4 text-gray-500 dark:text-neutral-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>
          </div>
          <div className='text-white mb-8'>
            <div className="relative">
              <input
                name='password'
                className="text-sm peer py-2.5 pt-3 sm:py-3 pe-0 ps-8 block w-full bg-transparent border-t-transparent border-b-1 border-x-transparent border-b-gray-200 sm:text-sm focus:border-t-transparent focus:border-x-transparent focus:border-b-teal-200 focus:ring-0 disabled:opacity-50 disabled:pointer-events-none dark:border-b-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 dark:focus:border-b-neutral-600"
                placeholder="Ange lösen"
                onChange={handleInput}
              />
              <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none ps-2 peer-disabled:opacity-50 peer-disabled:pointer-events-none">
                <svg className="shrink-0 size-4 text-gray-500 dark:text-neutral-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"></path>
                  <circle cx="16.5" cy="7.5" r=".5"></circle>
                </svg>
              </div>
            </div>
          </div>
          <div className='text-end mb-6'>
            <button
              type="button"
              className={`${loading ? 'animate-pulse' : ''} text-sm py-2 px-16 inline-flex items-center gap-x-2 text-sm font-light rounded-none border border-transparent bg-teal-500 text-white hover:bg-teal-600 focus:outline-hidden focus:bg-teal-600 disabled:opacity-50 disabled:pointer-events-none`}
              onClick={() => {
                setLoading(true);
                setTimeout(() => { handleLogin(); }, 0);
              }}>
              Logga in
            </button>

            {error && <p style={{ color: "red" }}>{error}</p>}

            {/* <button onClick={handleLogin}>Login</button> */}
          </div>

        </form>
      </div>
    </div>
  )
}

export default Login    