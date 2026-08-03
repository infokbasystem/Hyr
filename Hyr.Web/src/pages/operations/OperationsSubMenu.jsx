import { NavLink } from "react-router-dom";
import bg from "../../assets/content.png";
import overviewIcon from "../../assets/appbar.page.powerpoint.svg";
import searchReservationIcon from "../../assets/appbar.page.search.svg";
import smsIcon from "../../assets/appbar.iphone.svg";
import newReservationIcon from "../../assets/appbar.draw.pen.black.svg";
import inboxIcon from "../../assets/appbar.cabinet.files.svg";
import checkInOutIcon from "../../assets/appbar.checkmark.pencil.top.svg";
import customerIcon from "../../assets/appbar.man.suitcase.svg";
import itemsIcon from "../../assets/appbar.barcode.svg";

function IconImage({ src, className = "", width = "w-6", height = "h-6" }) {
    return <img src={src} alt="" className={[height, width, className].filter(Boolean).join(" ")} />;
}

const items = [
    { to: "/operations", label: "Översikt", icon: overviewIcon, end: true },
    { to: "/operations/reservations", label: "Sök bokning", icon: searchReservationIcon },
    { to: "/operations", label: "SMS-listor", icon: smsIcon, disabled: true, leftMargin: "ml-12" },
    { to: "/operations", label: "Inbox", icon: inboxIcon, disabled: true },
    { to: "/operations/reservation", label: "Ny bokning", icon: newReservationIcon, leftMargin: "ml-12" },
    { to: "/operations", label: "In/Ut-checkning", icon: checkInOutIcon, iconWidth: "w-10", disabled: true },
    { to: "/operations/customers", label: "Kunder", icon: customerIcon, leftMargin: "ml-12" },
    { to: "/operations/items", label: "Hyresobjekt", icon: itemsIcon },
];

export default function OperationsSubMenu({ activeOverridePath = "" }) {
    return (
        <nav
            className="sticky top-[52px] z-20 flex items-end justify-center gap-0 px-8 pt-2 pb-4"
            style={{ backgroundImage: `url(${bg})` }}
        >
            {items.map((item) => {
                return (
                    <div className={["flex justify-center", item.leftMargin || "ml-4 mr-4"].filter(Boolean).join(" ")} key={item.label}>
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
                                        <IconImage
                                            src={item.icon}
                                            width={item.iconWidth}
                                            height={item.iconHeight}
                                            className={
                                                resolvedActive
                                                    ? "opacity-100"
                                                    : "opacity-55 transition-opacity group-hover:opacity-100"
                                            }
                                        />
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
