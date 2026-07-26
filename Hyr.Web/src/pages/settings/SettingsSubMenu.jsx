import { NavLink } from "react-router-dom";
import { BookText, Percent } from 'lucide-react'
import bg from "../../assets/content.png";

import factoryIcon from '../../assets/appbar.factory-1067.svg'
import usersIcon from '../../assets/appbar.user.svg'
import modelsIcon from "../../assets/appbar.cabinet.files.svg";
import articlesIcon from "../../assets/appbar.barcode.svg";
import serviceTypesIcon from "../../assets/appbar.tools.svg";
import pricingIcon from "../../assets/appbar.money.black.svg";
import currenciesIcon from "../../assets/appbar.currency.dollar.svg";

const DEFAULT_ICON_WIDTH = "w-6";
const DEFAULT_ICON_HEIGHT = "h-6";



function IconImage({ src, className = "", width = DEFAULT_ICON_WIDTH, height = DEFAULT_ICON_HEIGHT }) {
    return <img src={src} alt="" className={[height, width, className].filter(Boolean).join(" ")} />;
}

const items = [
    { to: "/settings/office", label: "Företaget", icon: factoryIcon, end: true },
    { to: "/settings/users", label: "Användare", icon: usersIcon , leftMargin: 'ml-4 mr-4' },
    { to: "/settings/pricing", label: "Prissättning", icon: pricingIcon, leftMargin: 'ml-16 mr-4' },
    { to: "/settings/categories", label: "Kategorier", icon: modelsIcon },
    { to: "/settings/models", label: "Modeller", icon: modelsIcon },
    { to: "/settings/articles", label: "Artiklar", icon: articlesIcon },
    { to: "/settings/servicetypes", label: "Service", icon: serviceTypesIcon },
    { to: "/settings/currencies", label: "Valutor", icon: currenciesIcon, leftMargin: "ml-16 mr-4" },
    { to: "/settings/vat", label: "Moms", iconComponent: Percent },
    { to: "/settings/accounts", label: "Kontoplan", iconComponent: BookText },
];

export default function SettingsSubMenu({ activeOverridePath = "" }) {
    return (
        <nav
            className="sticky top-[52px] z-20 flex items-end justify-center gap-0 px-8 pt-2 pb-4"
            style={{ backgroundImage: `url(${bg})` }}
        >
            {items.map((item) => {
                return (
                    <div className={["flex justify-center", item.leftMargin || "ml-3 mr-3"].filter(Boolean).join(" ")} key={item.label}>
                        <NavLink
                            to={item.to}
                            end={item.end}
                            onClick={item.disabled ? (event) => event.preventDefault() : undefined}
                            aria-disabled={item.disabled ? "true" : undefined}
                            className={({ isActive }) => {
                                const resolvedActive = !item.disabled && (isActive || (activeOverridePath && activeOverridePath === item.to));
                                return [
                                    "group flex flex-col items-center pb-[1px] pt-1 text-tiny leading-tight transition-colors select-none",
                                    resolvedActive
                                        ? "border-b-[3px] border-amber-500 text-stone-900"
                                        : "border-b-[3px] border-transparent text-stone-600 opacity-80 hover:text-stone-900 hover:opacity-100",
                                ]
                                    .filter(Boolean)
                                    .join(" ");
                            }}
                        >
                            {({ isActive }) => {
                                const resolvedActive = !item.disabled && (isActive || (activeOverridePath && activeOverridePath === item.to));

                                return (
                                    <>
                                        {item.iconComponent ? (
                                            <item.iconComponent
                                                className={[
                                                    item.iconHeight ?? DEFAULT_ICON_HEIGHT,
                                                    item.iconWidth ?? DEFAULT_ICON_WIDTH,
                                                    resolvedActive
                                                        ? "opacity-100"
                                                        : "opacity-100 transition-opacity group-hover:opacity-100",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                            />
                                        ) : (
                                            <IconImage
                                                src={item.icon}
                                                width={item.iconWidth ?? DEFAULT_ICON_WIDTH}
                                                height={item.iconHeight ?? DEFAULT_ICON_HEIGHT}
                                                className={
                                                    resolvedActive
                                                        ? "opacity-100"
                                                        : "opacity-55 transition-opacity group-hover:opacity-100"
                                                }
                                            />
                                        )}
                                        <span className="mt-1 whitespace-nowrap font-medium">{item.label}</span>
                                    </>
                                );
                            }}
                        </NavLink>
                    </div>
                );
            })}
        </nav>
    );
}
