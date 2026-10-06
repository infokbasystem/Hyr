import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getAutoScrollDelta } from './useVehicleTimelineGeometry.js';

const DRAG_THRESHOLD = 5;

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

function findCarIdAt(x, y) {
    const row = document.elementFromPoint(x, y)?.closest('[data-timeline-car-id]');
    return row ? Number(row.dataset.timelineCarId) : null;
}

export default function useVehicleTimelineDrag({
    daysVisible,
    geometry,
    gridRef,
    headerHeight,
    labelWidth,
    minimumDuration,
    onCommit,
    pendingScrollXRef,
    scheduleScrollXRef,
    formatRange,
    setBookings,
    statusColors,
    minimumDay,
    maximumDay,
}) {
    const [dragging, setDragging] = useState(null);
    const [ghost, setGhost] = useState(null);
    const pendingCleanupRef = useRef(null);
    const activeCleanupRef = useRef(null);
    const ghostRef = useRef(null);
    const ghostTextRef = useRef(null);
    const suppressReservationClickRef = useRef(false);
    const boundsRef = useRef({ minimumDay, maximumDay });

    useLayoutEffect(() => {
        boundsRef.current = { minimumDay, maximumDay };
    }, [maximumDay, minimumDay]);

    const beginActiveDrag = useCallback((drag, pointer) => {
        const geometrySnapshot = geometry;
        let pointerX = pointer.x;
        let pointerY = pointer.y;
        let lastDayDelta = null;
        let targetCarId = drag.originalBooking.carId;
        let finalStart = drag.origStart;
        let finalEnd = drag.origEnd;
        let frameId = null;

        setDragging(drag);
        suppressReservationClickRef.current = true;

        if (drag.type === 'move') {
            setGhost({
                x: pointer.x,
                y: pointer.y,
                width: drag.width,
                color: drag.color,
                label: drag.customer,
                start: drag.origStart,
                end: drag.origEnd,
                clickOffsetX: drag.clickOffsetX,
                clickOffsetY: drag.clickOffsetY,
                isCappedLeft: drag.isCappedLeft,
                isCappedRight: drag.isCappedRight,
            });
            if (ghostRef.current) {
                ghostRef.current.style.width = `${Math.max(drag.width, 8)}px`;
            }
            if (ghostTextRef.current) {
                ghostTextRef.current.textContent = formatRange(drag.origStart, drag.origEnd);
            }
        }

        const update = () => {
            const scrollDelta = pendingScrollXRef.current - drag.startScrollX;
            const dayDelta = geometrySnapshot.dayDeltaFromPixels(pointerX - drag.startX + scrollDelta);

            if (drag.type === 'move') {
                if (ghostRef.current) {
                    ghostRef.current.style.transform = `translate3d(${pointerX - drag.clickOffsetX}px, ${pointerY - drag.clickOffsetY}px, 0)`;
                }
                if (ghostTextRef.current) {
                    const textX = clamp(pointerX, 170, window.innerWidth - 170);
                    ghostTextRef.current.style.transform = `translate3d(${textX}px, ${Math.max(8, pointerY - 34)}px, 0) translateX(-50%)`;
                }
                const carId = findCarIdAt(pointerX, pointerY);
                if (carId !== null) targetCarId = carId;
            }

            if (dayDelta === lastDayDelta) return;
            lastDayDelta = dayDelta;
            const bounds = boundsRef.current;

            if (drag.type === 'move') {
                const duration = drag.origEnd - drag.origStart;
                finalStart = clamp(
                    geometrySnapshot.snapDay(drag.origStart + dayDelta),
                    Math.min(bounds.minimumDay, drag.origStart),
                    Math.max(bounds.maximumDay, drag.origEnd) - duration
                );
                finalEnd = finalStart + duration;
                if (ghostTextRef.current) ghostTextRef.current.textContent = formatRange(finalStart, finalEnd);
                return;
            }

            if (drag.type === 'resize-right') {
                finalEnd = clamp(
                    geometrySnapshot.snapDay(drag.origEnd + dayDelta),
                    drag.origStart + minimumDuration,
                    Math.max(bounds.maximumDay, drag.origEnd)
                );
            } else {
                finalStart = clamp(
                    geometrySnapshot.snapDay(drag.origStart + dayDelta),
                    Math.min(bounds.minimumDay, drag.origStart),
                    drag.origEnd - minimumDuration
                );
            }

            setBookings((currentBookings) => currentBookings.map((booking) => (
                booking.id === drag.bookingId && (booking.start !== finalStart || booking.end !== finalEnd)
                    ? { ...booking, start: finalStart, end: finalEnd }
                    : booking
            )));
        };

        const autoScroll = () => {
            const grid = gridRef.current;
            if (!grid) return false;
            const rect = grid.getBoundingClientRect();
            const insideRows = pointerY >= rect.top && pointerY <= rect.bottom;
            const insideColumns = pointerX >= rect.left && pointerX <= rect.right;
            const dx = insideRows ? getAutoScrollDelta(pointerX, rect.left + labelWidth, rect.right) : 0;
            const dy = drag.type === 'move' && insideColumns
                ? getAutoScrollDelta(pointerY, rect.top + headerHeight, rect.bottom)
                : 0;
            if (dx !== 0) scheduleScrollXRef.current?.(previous => previous + dx);
            if (dy !== 0) grid.scrollTop += dy;
            return dx !== 0 || dy !== 0;
        };

        const tick = () => {
            frameId = null;
            const isScrolling = autoScroll();
            update();
            if (isScrolling) frameId = window.requestAnimationFrame(tick);
        };

        const handleMove = (event) => {
            pointerX = event.clientX;
            pointerY = event.clientY;
            if (frameId === null) frameId = window.requestAnimationFrame(tick);
        };

        const finish = (shouldCommit) => {
            activeCleanupRef.current?.();
            activeCleanupRef.current = null;

            if (shouldCommit) {
                update();
                const finalBooking = {
                    ...drag.originalBooking,
                    carId: drag.type === 'move' ? targetCarId : drag.originalBooking.carId,
                    start: finalStart,
                    end: finalEnd,
                };
                const hasChanged = finalBooking.carId !== drag.originalBooking.carId
                    || finalBooking.start !== drag.originalBooking.start
                    || finalBooking.end !== drag.originalBooking.end;

                if (hasChanged) {
                    setBookings((currentBookings) => currentBookings.map((booking) => (
                        booking.id === drag.bookingId ? finalBooking : booking
                    )));
                    Promise.resolve(onCommit?.(finalBooking, drag.originalBooking)).catch(() => {
                        setBookings((currentBookings) => currentBookings.map((booking) => {
                            if (booking.id !== drag.bookingId) return booking;
                            const stillShowsFailedChange = booking.carId === finalBooking.carId
                                && booking.start === finalBooking.start
                                && booking.end === finalBooking.end;
                            return stillShowsFailedChange ? drag.originalBooking : booking;
                        }));
                    });
                }
            } else if (drag.type !== 'move') {
                setBookings((currentBookings) => currentBookings.map((booking) => (
                    booking.id === drag.bookingId ? drag.originalBooking : booking
                )));
            }

            setDragging(null);
            setGhost(null);
            window.setTimeout(() => {
                suppressReservationClickRef.current = false;
            }, 0);
        };

        const handleUp = () => finish(true);
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            finish(false);
        };

        activeCleanupRef.current = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('keydown', handleKeyDown);
            if (frameId !== null) window.cancelAnimationFrame(frameId);
            frameId = null;
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('keydown', handleKeyDown);
    }, [formatRange, geometry, gridRef, headerHeight, labelWidth, minimumDuration, onCommit, pendingScrollXRef, scheduleScrollXRef, setBookings]);

    const onBookingMouseDown = useCallback((event, booking, type) => {
        event.stopPropagation();
        if (type !== 'move') event.preventDefault();

        suppressReservationClickRef.current = false;
        pendingCleanupRef.current?.();

        const color = statusColors[booking.status] || statusColors.booked;
        const width = geometry.durationToPixels(booking.end - booking.start);
        const barRect = event.currentTarget.getBoundingClientRect();
        const gridRect = gridRef.current?.getBoundingClientRect();
        const barLeft = booking.start * geometry.dayWidth - pendingScrollXRef.current;
        const drag = {
            bookingId: booking.id,
            type,
            startX: event.clientX,
            startY: event.clientY,
            startScrollX: pendingScrollXRef.current,
            origStart: booking.start,
            origEnd: booking.end,
            color,
            customer: booking.customer,
            width,
            clickOffsetX: event.clientX - ((gridRect?.left ?? -labelWidth) + labelWidth + barLeft),
            clickOffsetY: event.clientY - barRect.top,
            isCappedLeft: barLeft < 0,
            isCappedRight: barLeft + width > daysVisible * geometry.dayWidth,
            originalBooking: { ...booking },
        };

        const handlePendingMove = (moveEvent) => {
            const distance = Math.hypot(
                moveEvent.clientX - drag.startX,
                moveEvent.clientY - drag.startY
            );
            if (distance < DRAG_THRESHOLD) return;

            pendingCleanupRef.current?.();
            pendingCleanupRef.current = null;
            beginActiveDrag(drag, { x: moveEvent.clientX, y: moveEvent.clientY });
        };
        const handlePendingUp = () => {
            pendingCleanupRef.current?.();
            pendingCleanupRef.current = null;
        };

        pendingCleanupRef.current = () => {
            window.removeEventListener('mousemove', handlePendingMove);
            window.removeEventListener('mouseup', handlePendingUp);
        };
        window.addEventListener('mousemove', handlePendingMove);
        window.addEventListener('mouseup', handlePendingUp);
    }, [beginActiveDrag, daysVisible, geometry, gridRef, labelWidth, pendingScrollXRef, statusColors]);

    const beginResize = useCallback((event, booking) => {
        beginActiveDrag({
            bookingId: booking.id,
            type: 'resize-right',
            startX: event.clientX,
            startScrollX: pendingScrollXRef.current,
            origStart: booking.start,
            origEnd: booking.end,
            color: statusColors[booking.status] || statusColors.booked,
            customer: booking.customer,
            width: geometry.durationToPixels(booking.end - booking.start),
            originalBooking: { ...booking },
        }, { x: event.clientX, y: event.clientY });
    }, [beginActiveDrag, geometry, pendingScrollXRef, statusColors]);

    const isReservationClickSuppressed = useCallback(
        () => suppressReservationClickRef.current,
        []
    );

    useEffect(() => () => {
        pendingCleanupRef.current?.();
        activeCleanupRef.current?.();
    }, []);

    return {
        beginResize,
        dragging,
        ghost,
        ghostRef,
        ghostTextRef,
        isReservationClickSuppressed,
        onBookingMouseDown,
    };
}