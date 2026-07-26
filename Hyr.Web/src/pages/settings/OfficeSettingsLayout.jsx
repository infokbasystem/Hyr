import { Building2, CalendarClock, SlidersHorizontal, HandCoins, Mail, MessageSquareText, PlugZap, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const items = [
    { to: "/settings/office/companyinfo", label: "Foretagsuppgifter", icon: Building2, end: true },
    { to: "/settings/office/settings", label: "Installningar", icon: SlidersHorizontal },
    { to: "/settings/office/finance", label: "Ekonomi", icon: HandCoins },
    { to: "/settings/office/departments", label: "Avdelningar", icon: Users },
    { to: "/settings/office/mailtexts", label: "Mailtexter", icon: Mail },
    { to: "/settings/office/smstexts", label: "Sms-texter", icon: MessageSquareText },
    { to: "/settings/office/webbooking", label: "Web-bokning", icon: CalendarClock },
    { to: "/settings/office/integrations", label: "Integrationer", icon: PlugZap },
];

export default function OfficeSettingsLayout() {
    return (
        <div className="flex w-full pb-10 items-start md:px-[clamp(8px,20vw,20vw)]">
            <aside className="mt-4 w-[257px] shrink-0 px-4 py-2">
                <ul className="flex flex-col gap-2">
                    {items.map((item) => {
                        const Icon = item.icon;

                        return (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    end={item.end}
                                    className={({ isActive }) => [
                                        "group relative flex w-full items-center gap-3 rounded-r-md py-2 pr-3 pl-5 text-left transition",
                                        isActive
                                            ? "bg-lime-50 text-stone-900"
                                            : "text-stone-600 hover:bg-stone-100/70 hover:text-stone-900",
                                    ].join(" ")}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <span
                                                aria-hidden="true"
                                                className={[
                                                    'absolute top-1/2 left-0 h-6 w-[4px] -translate-y-1/2 rounded-r-full transition',
                                                    isActive ? 'bg-lime-500' : 'bg-transparent group-hover:bg-lime-200',
                                                ].join(' ')}
                                            />
                                            <Icon className="h-4 w-4" />
                                            <span className={["text-xs leading-none", isActive ? "font-semibold" : "font-normal"].join(" ")}>{item.label}</span>
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </aside>

            <div aria-hidden="true" className="mt-3 mr-2 w-px self-stretch bg-gray-300" />

            <section className="min-w-0 flex-1 px-0 py-0">
                <Outlet />
            </section>
        </div>
    );
}
