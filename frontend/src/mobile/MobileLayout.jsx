import { NavLink, Outlet } from 'react-router-dom'
import { ArrowUpRight, CalendarClock, CircleCheckBig, Search } from 'lucide-react'
import { MOBILE_BASE_PATH } from './mobileRouting'

const TABS = [
    { to: `${MOBILE_BASE_PATH}/out`, label: 'Ute', icon: ArrowUpRight },
    { to: `${MOBILE_BASE_PATH}/upcoming`, label: 'Utlämning', icon: CalendarClock },
    { to: `${MOBILE_BASE_PATH}/available`, label: 'Lediga', icon: CircleCheckBig },
    { to: `${MOBILE_BASE_PATH}/search`, label: 'Sök', icon: Search },
]

export default function MobileLayout() {
    return (
        <div className="min-h-dvh bg-stone-100 pb-[calc(4rem+env(safe-area-inset-bottom))] text-gray-900">
            <Outlet />
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
                <ul className="grid h-16 grid-cols-4">
                    {TABS.map((tab) => (
                        <li key={tab.to}>
                            <NavLink
                                to={tab.to}
                                className={({ isActive }) => `flex h-full flex-col items-center justify-center gap-1 text-xs ${isActive ? 'font-medium text-teal-700' : 'text-gray-500'}`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive ? 'bg-lime-200 text-gray-900' : ''}`}>
                                            <tab.icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                                        </span>
                                        {tab.label}
                                    </>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    )
}
