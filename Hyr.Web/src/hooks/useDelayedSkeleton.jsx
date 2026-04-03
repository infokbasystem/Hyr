
import { useState, useEffect } from "react";

/**
 * useDelayedSkeleton
 * 
 * Shows a skeleton only if loading takes longer than a delay.
 * 
 * @param {boolean} loading - true while data is being fetched
 * @param {number} delay - delay in ms before showing skeleton (default: 200)
 * @returns {boolean} showSkeleton - whether the skeleton should be visible
 */

export function useDelayedSkeleton(loading, delay = 200) {
    const [showSkeleton, setShowSkeleton] = useState(false);

    useEffect(() => {
        if (!loading) {
            setShowSkeleton(false);
            return;
        }

        const timer = setTimeout(() => setShowSkeleton(true), delay);

        return () => clearTimeout(timer);
    }, [loading, delay]);

    return showSkeleton;
}

