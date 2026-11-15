import { useCallback, useEffect, useRef, useState } from 'react'

/** Loads data on mount and whenever deps change; stale responses are ignored. */
export default function useAsyncData(loader, deps = []) {
    const [state, setState] = useState({ data: null, error: '', loading: true })
    const requestIdRef = useRef(0)

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const load = useCallback(loader, deps)

    const reload = useCallback(async () => {
        const requestId = ++requestIdRef.current
        setState((prev) => ({ ...prev, error: '', loading: true }))
        try {
            const data = await load()
            if (requestId === requestIdRef.current) {
                setState({ data, error: '', loading: false })
            }
        } catch (error) {
            if (requestId === requestIdRef.current) {
                setState((prev) => ({ ...prev, error: error?.message || 'Kunde inte hämta data', loading: false }))
            }
        }
    }, [load])

    useEffect(() => {
        reload()
    }, [reload])

    return { ...state, reload }
}
