import { createPortal } from "react-dom";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";
import bg from "../assets/content.png";

import { PdfProvider, usePdf } from "../contexts/PdfContext";
import PdfPanel from "../components/PdfPanel";
import FinanceSubMenu from "../pages/finance/FinanceSubMenu";

const FinanceLayoutContent = () => {
    const { showPdfPanel } = usePdf();
    const navbarSlot = useOutletContext();
    const location = useLocation();
    const activeOverridePath = location.pathname.startsWith("/finance/invoice/")
        ? "/finance/invoice/new"
        : "";

    return (
        <>
            {showPdfPanel && navbarSlot && createPortal(<PdfPanel topOffset="48px" />, navbarSlot)}
            <FinanceSubMenu activeOverridePath={activeOverridePath} />
            <div className="relative flex grow items-stretch bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
                <div className="relative flex-grow min-w-0 overflow-visible">
                    <Outlet />
                </div>
            </div>
        </>
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