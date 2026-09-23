
import { useState, useEffect, useRef } from "react";

/**
 * useDelayedSkeleton
 * 
 * Shows a skeleton only if loading takes longer than a delay.
 * 
 * @param {boolean} loading - true while data is being fetched
 * @param {number} delay - delay in ms before showing skeleton (default: 200)
 * @param {number} minimumVisibleDuration - minimum visible time in ms once shown (default: 0)
 * @returns {boolean} showSkeleton - whether the skeleton should be visible
 */

export function useDelayedSkeleton(loading, delay = 200, minimumVisibleDuration = 0) {
    const [showSkeleton, setShowSkeleton] = useState(false);
    const shownAtRef = useRef(0);
    const showTimerRef = useRef(null);
    const hideTimerRef = useRef(null);

    useEffect(() => {
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }

        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        if (loading) {
            if (!showSkeleton) {
                showTimerRef.current = setTimeout(() => {
                    shownAtRef.current = Date.now();
                    setShowSkeleton(true);
                }, delay);
            }

            return () => {
                if (showTimerRef.current) {
                    clearTimeout(showTimerRef.current);
                    showTimerRef.current = null;
                }
            };
        }

        if (!showSkeleton) {
            return;
        }

        const elapsed = Date.now() - shownAtRef.current;
        const remaining = Math.max(0, minimumVisibleDuration - elapsed);

        hideTimerRef.current = setTimeout(() => {
            setShowSkeleton(false);
        }, remaining);

        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };
    }, [loading, delay, minimumVisibleDuration, showSkeleton]);

    return showSkeleton;
}

