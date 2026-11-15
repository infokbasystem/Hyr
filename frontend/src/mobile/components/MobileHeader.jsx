import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CircleUserRound, LogOut, Monitor, RefreshCw } from 'lucide-react'
import { AuthContext } from '../../AuthContext'
import { MOBILE_BASE_PATH, setPrefersDesktop } from '../mobileRouting'

function UserMenu() {
    const { user, logout } = useContext(AuthContext)
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        if (!open) return undefined
        const close = (event) => {
            if (!menuRef.current?.contains(event.target)) setOpen(false)
        }
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
    }, [open])

    const handleDesktop = () => {
        setPrefersDesktop(true)
        navigate('/')
    }

    const handleLogout = () => {
        logout()
        navigate(`${MOBILE_BASE_PATH}/login`, { replace: true })
    }

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                aria-label="Meny"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="flex size-10 items-center justify-center rounded-full text-stone-200 active:bg-white/10"
            >
                <CircleUserRound size={24} />
            </button>
            {open && (
                <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-800 shadow-xl">
                    {user?.name && (
                        <div className="border-b border-gray-100 px-4 py-3">
                            <p className="truncate text-sm font-medium">{user.name}</p>
                            {user.email && <p className="truncate text-xs text-gray-500">{user.email}</p>}
                        </div>
                    )}
                    <button type="button" onClick={handleDesktop} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm active:bg-gray-100">
                        <Monitor size={18} className="text-gray-500" /> Desktopversion
                    </button>
                    <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rose-700 active:bg-gray-100">
                        <LogOut size={18} /> Logga ut
                    </button>
                </div>
            )}
        </div>
    )
}

export default function MobileHeader({ title, subtitle, onBack, onRefresh, refreshing = false }) {
    return (
        <header className="sticky top-0 z-40 bg-[#141820] pt-[env(safe-area-inset-top)] text-stone-50 shadow-md">
            <div className="flex h-14 items-center gap-1 px-2">
                {onBack ? (
                    <button
                        type="button"
                        aria-label="Tillbaka"
                        onClick={onBack}
                        className="flex size-10 items-center justify-center rounded-full active:bg-white/10"
                    >
                        <ChevronLeft size={26} />
                    </button>
                ) : (
                    <span className="w-2" />
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg leading-tight font-medium">{title}</h1>
                    {subtitle && <p className="truncate text-xs text-stone-400">{subtitle}</p>}
                </div>
                {onRefresh && (
                    <button
                        type="button"
                        aria-label="Uppdatera"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="flex size-10 items-center justify-center rounded-full text-stone-200 active:bg-white/10 disabled:opacity-60"
                    >
                        <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                )}
                <UserMenu />
            </div>
        </header>
    )
}
