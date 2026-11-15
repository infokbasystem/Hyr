import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { setPrefersDesktop } from './mobileRouting'

/** Root of every /m route: switches off the desktop zoom and forgets an earlier "desktop" choice. */
export default function MobileShell() {
    useLayoutEffect(() => {
        const root = document.documentElement
        root.classList.add('mobile-app')
        setPrefersDesktop(false)
        return () => root.classList.remove('mobile-app')
    }, [])

    return <Outlet />
}
