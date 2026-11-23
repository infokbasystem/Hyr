import { Suspense, useState } from "react";
import { Outlet, useMatches } from "react-router-dom";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import RouteLoading from "../components/RouteLoading";
import bg from "../assets/content.png";

export default function DesktopLayout() {
    const [navbarSlot, setNavbarSlot] = useState(null);
    const sectionMenu = useMatches().some(({ handle }) => handle?.sectionMenu);

    return (
        <div className="relative flex min-h-screen flex-col">
            <Header />
            <div className={`sticky top-0 ${sectionMenu ? "z-50" : "z-30"}`}>
                <Navbar />
                <div ref={setNavbarSlot} />
            </div>
            <Suspense fallback={
                <div className="flex grow bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
                    <RouteLoading />
                </div>
            }>
                <Outlet context={navbarSlot} />
            </Suspense>
        </div>
    );
}
