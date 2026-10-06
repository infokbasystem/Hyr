import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getInitialTimelineRange, getTimelineRangeExtension } from './useVehicleTimelineGeometry.js';

export function mergePlanningReservations(current, incoming) {
    const merged = new Map(current.map(booking => [booking.id, booking]));
    for (const booking of incoming) {
        if (!merged.has(booking.id)) merged.set(booking.id, booking);
    }
    return [...merged.values()];
}

export function createPlanningRangeLoader({ initialRange, fetchRange, publish, isBusy, getRevision, onError, onLoading }) {
    let range = initialRange;
    let active = true;
    let ready = false;
    let inFlight = false;
    let staged = null;
    let refreshQueued = false;
    let failedRequest = null;

    const flush = () => {
        if (!active || isBusy()) return;
        if (staged) {
            const result = staged;
            staged = null;
            if (result.initial || !result.replace || result.revision === getRevision()) {
                range = result.range;
                publish(range, result.rows, result.replace);
                ready = true;
            }
        }
        if (refreshQueued && ready && !inFlight) {
            refreshQueued = false;
            void load(range, true, range);
        }
    };

    const load = async (interval, replace, nextRange, initial = false) => {
        if (!active || inFlight || staged) return;
        inFlight = true;
        const revision = getRevision();
        onLoading(true);
        try {
            const rows = await fetchRange(interval);
            if (!active) return;
            failedRequest = null;
            staged = { range: nextRange, rows, replace, revision, initial };
            flush();
        } catch (error) {
            if (active) {
                failedRequest = { interval, replace, nextRange, initial };
                onError(error);
            }
        } finally {
            inFlight = false;
            if (active) {
                onLoading(false);
                flush();
            }
        }
    };

    return {
        start: () => load(range, true, range, true),
        extend(viewportStart, viewportDays, direction) {
            if (!ready || inFlight || staged) return;
            const interval = getTimelineRangeExtension(range, viewportStart, viewportDays, direction);
            if (interval) {
                return load(interval, false, {
                    startDay: Math.min(range.startDay, interval.startDay),
                    endDay: Math.max(range.endDay, interval.endDay),
                });
            }
        },
        ensureCoverage(viewportStart, viewportDays) {
            if (!ready || inFlight || staged || failedRequest) return;
            const viewportEnd = Math.ceil(viewportStart + viewportDays);
            if (viewportEnd > range.endDay) {
                return load({ startDay: range.endDay, endDay: viewportEnd }, false, {
                    ...range, endDay: viewportEnd,
                });
            }
        },
        refresh() {
            if (!ready || inFlight || staged || isBusy()) {
                refreshQueued = true;
                return;
            }
            return load(range, true, range);
        },
        retry() {
            if (failedRequest) {
                const { interval, replace, nextRange, initial } = failedRequest;
                return load(interval, replace, nextRange, initial);
            }
        },
        flush,
        dispose() {
            active = false;
            staged = null;
        },
    };
}

function rangeDate(origin, day) {
    const date = new Date(origin);
    date.setDate(date.getDate() + day);
    return date.toISOString();
}

export default function useProgressivePlanningReservations({
    vehicleKey,
    startDate,
    daysVisible,
    viewportDays,
    initialScrollDay,
    restoredRange,
    restoredQueryKey,
    enabled,
    fetchReservations,
    setBookings,
    isBusy,
    getRevision,
}) {
    const queryKey = `${vehicleKey}|${startDate.getTime()}|${daysVisible}`;
    const initialRange = useMemo(() => (
        restoredQueryKey === queryKey && restoredRange
            ? restoredRange
            : getInitialTimelineRange(viewportDays, initialScrollDay)
    ), [initialScrollDay, queryKey, restoredQueryKey, restoredRange, viewportDays]);
    const [rangeState, setRangeState] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const controllerRef = useRef(null);
    const configRef = useRef(null);

    useLayoutEffect(() => {
        configRef.current = { initialRange, vehicleKey, startDate, fetchReservations, setBookings, isBusy, getRevision };
    }, [fetchReservations, getRevision, initialRange, isBusy, setBookings, startDate, vehicleKey]);

    useEffect(() => {
        if (!enabled) return;
        const config = configRef.current;
        const vehicleIds = config.vehicleKey ? config.vehicleKey.split(',').map(Number) : [];
        config.setBookings([]);
        setRangeState({ queryKey, range: config.initialRange });
        setError(null);
        if (vehicleIds.length === 0) {
            setLoading(false);
            return;
        }

        const controller = createPlanningRangeLoader({
            initialRange: config.initialRange,
            isBusy: config.isBusy,
            getRevision: config.getRevision,
            onError: setError,
            onLoading: (value) => {
                if (value) setError(null);
                setLoading(value);
            },
            fetchRange: async (range) => {
                const rows = await config.fetchReservations({
                    vehicleIds,
                    from: rangeDate(config.startDate, range.startDay),
                    to: rangeDate(config.startDate, range.endDay),
                });
                return rows.map(booking => ({
                    ...booking,
                    start: (new Date(booking.start).getTime() - config.startDate.getTime()) / 86400000,
                    end: (new Date(booking.end).getTime() - config.startDate.getTime()) / 86400000,
                })).filter(booking => Number.isFinite(booking.start) && Number.isFinite(booking.end) && booking.end > booking.start);
            },
            publish: (range, rows, replace) => {
                config.setBookings(current => replace ? rows : mergePlanningReservations(current, rows));
                setRangeState({ queryKey, range });
            },
        });
        controllerRef.current = controller;
        void controller.start();
        return () => {
            controller.dispose();
            if (controllerRef.current === controller) controllerRef.current = null;
        };
    }, [enabled, queryKey]);

    const extend = useCallback((viewportStart, screenDays, direction) => {
        void controllerRef.current?.extend(viewportStart, screenDays, direction);
    }, []);
    const refresh = useCallback(() => { void controllerRef.current?.refresh(); }, []);
    const retry = useCallback(() => { void controllerRef.current?.retry(); }, []);
    const flush = useCallback(() => { controllerRef.current?.flush(); }, []);
    const ensureCoverage = useCallback((viewportStart, screenDays) => {
        void controllerRef.current?.ensureCoverage(viewportStart, screenDays);
    }, []);

    return {
        loadedRange: rangeState?.queryKey === queryKey ? rangeState.range : initialRange,
        queryKey,
        loading,
        error,
        extend,
        refresh,
        retry,
        flush,
        ensureCoverage,
    };
}