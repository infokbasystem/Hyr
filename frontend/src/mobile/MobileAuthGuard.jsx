import { useContext, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthContext } from '../AuthContext'
import { MOBILE_BASE_PATH } from './mobileRouting'

/**
 * Auth guard for the mobile tree. Unlike ProtectedRoute it re-verifies the token in the background
 * on page changes without unmounting the page, so the header/tab bar stay put and query-string
 * updates (e.g. the availability search) don't remount the page.
 */
export default function MobileAuthGuard() {
    const { user, loading, verifyToken } = useContext(AuthContext)
    const location = useLocation()

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token && user) {
            verifyToken(token)
        }
        // Only re-verify when the page changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname])

    if (loading) return null

    if (!user || !localStorage.getItem('token')) {
        return <Navigate to={`${MOBILE_BASE_PATH}/login`} state={{ from: location }} replace />
    }

    return <Outlet />
}
