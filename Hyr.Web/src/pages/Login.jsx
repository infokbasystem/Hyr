import React, { useState, useContext } from 'react'
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import bg from '../assets/login-bg.jpg'
import logoImage from '../assets/logo.png'

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (input.email !== "" && input.password !== "") {
      try {
        await login(input);
        navigate(from, { replace: true });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(false);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setInput((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
          <header className="mb-10 flex items-center justify-between">
            <img src={logoImage} alt="Hyr logo" className="h-9 w-auto" />
          </header>

          <div className="mb-50 flex flex-1 items-center">
            <div className="w-full space-y-6">
              <div>
                <h2 className="text-l text-stone-100">Välkommen till Hyr</h2>
                <p className="mt-1 text-xs text-stone-400">Logga in</p>
              </div>

              <div className="inline-flex w-50 rounded-full border border-white/10 bg-[#1a1f2a] p-1 text-xs text-gray-700">
                <button
                  type="button"
                  className="flex-1 rounded-full bg-lime-200 px-4 py-2 text-black shadow-sm"
                >
                  Login
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full px-4 py-2 text-stone-300"
                  disabled
                >
                  Demo
                </button>
              </div>

              <form className="space-y-4 text-sm" onSubmit={handleLogin}>
                <div className='mb-6 text-white'>
                  <div className="relative">
                    <input
                      name='email'
                      type="email"
                      value={input.email}
                      className="peer block w-full border-x-transparent border-t-transparent border-b-1 border-b-gray-200 bg-transparent py-2.5 pt-3 pe-0 ps-8 text-sm focus:border-x-transparent focus:border-t-transparent focus:border-b-gray-200 focus:outline-none focus:ring-0 disabled:pointer-events-none disabled:opacity-50 sm:py-3"
                      placeholder="Email"
                      onChange={handleInput}
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                      <svg className="size-4 shrink-0 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className='mb-8 text-white'>
                  <div className="relative">
                    <input
                      name='password'
                      type="password"
                      value={input.password}
                      className="peer block w-full border-x-transparent border-t-transparent border-b-1 border-b-gray-200 bg-transparent py-2.5 pt-3 pe-0 ps-8 text-sm focus:border-x-transparent focus:border-t-transparent focus:border-b-gray-200 focus:outline-none focus:ring-0 disabled:pointer-events-none disabled:opacity-50 sm:py-3"
                      placeholder="Ange lösenord"
                      onChange={handleInput}
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                      <svg className="size-4 shrink-0 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"></path>
                        <circle cx="16.5" cy="7.5" r=".5"></circle>
                      </svg>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                <div className='mb-6 text-end'>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`${loading ? 'animate-pulse' : ''} inline-flex items-center gap-x-2 rounded-none border border-transparent bg-teal-500 px-20 py-3 text-sm font-light text-white hover:bg-teal-600 disabled:pointer-events-none disabled:opacity-50`}
                  >
                    {loading ? 'Tänker ...' : 'Logga in'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <footer className="mt-8 space-y-3 text-xs leading-5 text-stone-400">
            <p>Behöver du hjälp? Ring oss så hjälper vi dig.</p>
            <p>Genom att logga in godkänner du våra villkor och säkerhetspolicy.</p>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default Login