import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import bg from "../assets/content.png";

import { PdfProvider, usePdf } from "../contexts/PdfContext";
import PdfPanel from "../components/PdfPanel";
import FinanceSubMenu from "../pages/finance/FinanceSubMenu";

const FinanceLayoutContent = () => {
    const { showPdfPanel } = usePdf();
    const location = useLocation();
    const activeOverridePath = location.pathname.startsWith("/finance/invoice/")
        ? "/finance/invoice/new"
        : "";

    return (        
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="relative sticky top-0 z-50">
                <Navbar />
                {showPdfPanel && <PdfPanel topOffset="52px" />}
            </div>
            <FinanceSubMenu activeOverridePath={activeOverridePath} />
            <div className="relative flex grow items-stretch bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
                <div className="relative flex-grow min-w-0 overflow-visible">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

const FinanceLayout = () => {
    return (
        <PdfProvider>
            <FinanceLayoutContent />
        </PdfProvider>
    )
}

export default FinanceLayout