import { Outlet, useLocation } from "react-router-dom";
import bg from "../assets/content.png";
import SettingsSubMenu from "../pages/settings/SettingsSubMenu";

const SettingsLayout = () => {
    const location = useLocation();
    const activeOverridePath = location.pathname.startsWith("/settings/office/")
        ? "/settings/office"
        : "";

    return (
        <>
            <SettingsSubMenu activeOverridePath={activeOverridePath} />
            <div className="relative flex grow items-stretch bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50" style={{ backgroundImage: `url(${bg})` }}>
                <div className="flex-grow min-w-0 overflow-visible pt-2 px-0">
                    <Outlet />
                </div>
            </div>
        </>
    )
}

export default SettingsLayout