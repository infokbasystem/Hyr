import { NavLink } from "react-router-dom";
import bg from "../../assets/content.png";
import overviewIcon from "../../assets/appbar.list.two.svg";
import searchReservationIcon from "../../assets/appbar.page.search.svg";
import smsIcon from "../../assets/appbar.iphone.svg";
import newReservationIcon from "../../assets/appbar.transit.car.svg";
import inboxIcon from "../../assets/appbar.cart.svg";
import checkInOutIcon from "../../assets/appbar.clock.svg";
import customerIcon from "../../assets/appbar.user.svg";

function IconImage({ src }) {
    return <img src={src} alt="" className="h-6 w-6" />;
}

const items = [
    { to: "/operations", label: "Översikt", icon: overviewIcon, end: true },
    { to: "/operations/searchreservation", label: "Sök bokning", icon: searchReservationIcon },
    { to: "/operations", label: "SMS-listor", icon: smsIcon, disabled: true },
    { to: "/operations/reservation", label: "Ny bokning", icon: newReservationIcon, isAction: true },
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
                const icon = <IconImage src={item.icon} />;

                if (item.disabled) {
                    return (
                        <div className={["flex justify-center", item.leftMargin || "ml-4 mr-4"].filter(Boolean).join(" ")} key={item.label}>
                            <div className="flex cursor-default flex-col items-center border-b-[3px] border-transparent pb-[1px] pt-1 text-tiny leading-tight text-stone-400 select-none">
                                {icon}
                                <span className="mt-1 whitespace-nowrap font-medium">{item.label}</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className={["flex justify-center", item.leftMargin || "ml-4 mr-4"].filter(Boolean).join(" ")} key={item.to}>
                        <NavLink
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => {
                                const resolvedActive = isActive || (activeOverridePath && activeOverridePath === item.to);
                                return [
                                    "flex flex-col items-center pb-[1px] pt-1 text-tiny leading-tight transition-colors select-none",
                                    resolvedActive
                                        ? "border-b-[3px] border-amber-500 text-stone-900"
                                        : "border-b-[3px] border-transparent text-stone-600 hover:text-stone-900",
                                ]
                                    .filter(Boolean)
                                    .join(" ");
                            }}
                        >
                            {icon}
                            <span className="mt-1 whitespace-nowrap font-medium">{item.label}</span>
                        </NavLink>
                    </div>
                );
            })}
        </nav>
    );
}
