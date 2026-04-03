import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthProvider";

import './Header.css'
import bg from '../assets/header.png'
import logo from '../assets/logo.png'


const Header = () => {
    const auth = useAuth();

    const handleLogin = async (e) => {
        console.log('handleLogin');
        const res = await auth.logOut();
        // navigate("/login");
    };

    return (
        <div id='header' className='flex items-center' style={{ backgroundImage: `url(${bg})` }}>
            <div className="flex-1 basis-0">
                <p className='place-self-center mt-1'><img src={logo} /></p>
            </div>
            <div className="flex-grow">
                <div className='grow place-self-center text-center'>
                    <p className='text-xs text-white-500 leading-0 p-1 mt-1'><span>Välkommen</span><span className='ms-1 text-white'>Stefan Loyd</span></p>
                    <button type='button' onClick={(event) => handleLogin()} className="text-xs text-white-500 bg-transparent hover:text-white-600 leading-0 p-1">Logga ut</button>
                </div>
            </div>
            <div className="flex-1 basis-0">
                <div className='place-self-center'>
                    <div className="relative text-gray-600 mr-9">
                        <input type="search" name="serch" placeholder="Sök" className="bg-gray-200 h-7 px-5 pr-10 rounded text-xs focus:outline-none" />
                        <button type="submit" className="absolute right-0 top-0 mt-1.5 mr-4">
                            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 56.966 56.966" xmlSpace="preserve" width="512px" height="512px">
                                <path d="M55.146,51.887L41.588,37.786c3.486-4.144,5.396-9.358,5.396-14.786c0-12.682-10.318-23-23-23s-23,10.318-23,23  s10.318,23,23,23c4.761,0,9.298-1.436,13.177-4.162l13.661,14.208c0.571,0.593,1.339,0.92,2.162,0.92  c0.779,0,1.518-0.297,2.079-0.837C56.255,54.982,56.293,53.08,55.146,51.887z M23.984,6c9.374,0,17,7.626,17,17s-7.626,17-17,17  s-17-7.626-17-17S14.61,6,23.984,6z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Header