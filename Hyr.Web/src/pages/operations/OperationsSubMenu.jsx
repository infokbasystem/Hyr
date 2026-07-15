import { NavLink } from "react-router-dom";
import bg from "../../assets/content.png";
import overviewIcon from "../../assets/appbar.list.two.svg";
import searchReservationIcon from "../../assets/appbar.page.search.svg";
import smsIcon from "../../assets/appbar.iphone.svg";
import newReservationIcon from "../../assets/appbar.transit.car.svg";
import inboxIcon from "../../assets/appbar.cart.svg";
import checkInOutIcon from "../../assets/appbar.clock.svg";
import customerIcon from "../../assets/appbar.user.svg";

function IconImage({ src, className = "" }) {
    return <img src={src} alt="" className={["h-6 w-6", className].filter(Boolean).join(" ")} />;
}

const items = [
    { to: "/operations", label: "Översikt", icon: overviewIcon, end: true },
    { to: "/operations/searchreservation", label: "Sök bokning", icon: searchReservationIcon },
    { to: "/operations", label: "SMS-listor", icon: smsIcon, disabled: true },
    { to: "/operations/reservation", label: "Ny bokning", icon: newReservationIcon },
    { to: "/operations", label: "Inbox", icon: inboxIcon, disabled: true },
    { to: "/operations", label: "In- och utcheckning", icon: checkInOutIcon, disabled: true },
    { to: "/operations/searchcustomer", label: "Kunder", icon: customerIcon, leftMargin: "ml-16" },
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
