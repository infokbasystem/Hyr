import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import bg from "../assets/content.png";

import { PdfProvider, usePdf } from "../contexts/PdfContext";
import PdfPanel from "../components/PdfPanel";
import OperationsSubMenu from "../pages/operations/OperationsSubMenu";

const OperationsLayoutContent = () => {
    const { showPdfPanel } = usePdf();
    const location = useLocation();
    const activeOverridePath = location.pathname.startsWith("/customer/")
        ? "/operations/customers"
        : location.pathname.startsWith("/item/")
            ? "/operations/items"
            : "";

    return (
        <PdfProvider>
            <div className="relative flex flex-col min-h-screen">
                <Header />
                <div className="sticky top-0 z-50">
                    <Navbar />
                </div>
                <OperationsSubMenu activeOverridePath={activeOverridePath} />
                <div className="relative flex grow items-stretch bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
                    <div className="relative flex-grow min-w-0 overflow-visible">
                        <Outlet />
                    </div>
                </div>
            </div>
            {showPdfPanel && <PdfPanel topOffset="107px" />}

        </PdfProvider>
    )
}

    const OperationsLayout = () => {
        return (
            <PdfProvider>
                <OperationsLayoutContent />
            </PdfProvider>
        )
    }

export default OperationsLayout