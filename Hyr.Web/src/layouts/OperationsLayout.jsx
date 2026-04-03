import { Outlet, NavLink } from "react-router-dom";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import bg from "../assets/content.png";

import { PdfProvider } from "../contexts/PdfContext";
import PdfPanel from "../components/PdfPanel";

const OperationsLayout = () => {
    return (
        <PdfProvider>
            <div className="flex flex-col min-h-screen">
                <Header />
                <Navbar />
                <div className="flex grow items-stretch bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
                    <div className="flex flex-col w-50 border-r border-gray-300">
                        <ul className="flex flex-col pt-5">
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/operations">ÖVERSIKT</NavLink></li>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/operations/reservation/new">NY BOKNING</NavLink></li>
                            <p className="bg-gray-200 text-gray-600 text-xs px-6 py-1.5 mt-3 mb-1.5">Inbox</p>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">WEBBOKNINGAR</NavLink></li>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">MAIL</NavLink></li>
                            <p className="bg-gray-200 text-gray-600 text-xs px-6 py-1.5 mt-3 mb-1.5">Bokning</p>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">INLISTA</NavLink></li>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">INLISTA</NavLink></li>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">SÖK BOKNING</NavLink></li>
                            <p className="bg-gray-200 text-gray-600 text-xs px-6 py-1.5 mt-3 mb-1.5">Hantering</p>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">CHECKA IN ÅTERLÄMNAT</NavLink></li>
                            <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">HANTERA SKADOR</NavLink></li>
                            {/* <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">KALKYLER</NavLink></li>
                        <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/inquiry">FÖRFRÅGANINGAR</NavLink></li>
                        <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/quotation">OFFERTER</NavLink></li>
                        <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/customerorder">ORDER</NavLink></li>
                        <p className="bg-gray-200 text-xs px-6 py-1.5 mt-3 mb-1">Register</p>
                        <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/sales/customers">KUNDER</NavLink></li>
                        <li className="text-xs text-gray-600 hover:text-gray-950 font-semibold px-6 py-1.5"><NavLink to="/order/customerorder">LEVERANTÖRER</NavLink></li> */}
                        </ul>
                    </div>
                    <div className="flex-grow pt-4 px-5 relative">
                        <Outlet />
                        <PdfPanel />
                    </div>
                </div>
            </div>

        </PdfProvider>
    )
}

export default OperationsLayout