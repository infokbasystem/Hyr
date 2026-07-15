import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import bg from "../assets/content.png";

import { PdfProvider } from "../contexts/PdfContext";
import PdfPanel from "../components/PdfPanel";
import OperationsSubMenu from "../pages/operations/OperationsSubMenu";

const OperationsLayout = () => {
    const location = useLocation();
    const activeOverridePath = location.pathname.startsWith("/customer/") ? "/operations/searchcustomer" : "";

    return (
        <PdfProvider>
            <div className="flex flex-col min-h-screen">
                <Header />
                <div className="sticky top-0 z-50">
                    <Navbar />
                </div>
                <OperationsSubMenu activeOverridePath={activeOverridePath} />
                <div className="relative flex grow items-stretch bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
                    <div className="relative flex-grow min-w-0 overflow-hidden pt-4 px-0">
                        <Outlet />
                        <PdfPanel />
                    </div>
                </div>
            </div>

        </PdfProvider>
    )
}

export default OperationsLayout