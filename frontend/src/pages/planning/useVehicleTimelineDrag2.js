import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 5;
const DROP_TARGET_PROBE_PX = 10;

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

function getRowIndex(clientY, gridTop, layout, headerHeight) {
    const relativeY = clientY - gridTop - headerHeight;
    if (relativeY < 0) return 0;

    let accumulatedY = 0;
    for (let index = 0; index < layout.length; index += 1) {
        accumulatedY += layout[index].rowH;
        if (relativeY < accumulatedY) return index;
    }

    return layout.length - 1;
}

export default function useVehicleTimelineDrag({
    daysVisible,
    geometry,
    gridRef,
    headerHeight,
    labelWidth,
    layout,
    minimumDuration,
    onCommit,
    pendingScrollXRef,
    setBookings,
    statusColors,
    totalDays,
    visibleCars,
}) {
    const [dragging, setDragging] = useState(null);
    const [ghost, setGhost] = useState(null);
    const pendingCleanupRef = useRef(null);
    const activeCleanupRef = useRef(null);
    const dragPointerRef = useRef({ x: 0, y: 0 });
    const dragRafIdRef = useRef(null);
    const ghostRef = useRef(null);
    const ghostTextRef = useRef(null);
    const suppressReservationClickRef = useRef(false);

    const cancelAnimationFrame = useCallback(() => {
        if (dragRafIdRef.current !== null) {
            window.cancelAnimationFrame(dragRafIdRef.current);
            dragRafIdRef.current = null;
        }
    }, []);

    const beginActiveDrag = useCallback((drag, pointer) => {
        const geometrySnapshot = geometry;
        const layoutSnapshot = layout;
        const visibleCarsSnapshot = visibleCars;
        let lastDropTargetProbeY = pointer.y;
        let lastSnappedDayDelta = null;
        let targetCarIndex = drag.origCarIdx;
        let finalStart = drag.origStart;
        let finalEnd = drag.origEnd;

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
        }

        const handleMove = (event) => {
            const dayDelta = geometrySnapshot.dayDeltaFromPixels(event.clientX - drag.startX);

            if (drag.type === 'move') {
                dragPointerRef.current = { x: event.clientX, y: event.clientY };
                if (dragRafIdRef.current === null) {
                    dragRafIdRef.current = window.requestAnimationFrame(() => {
                        dragRafIdRef.current = null;
                        const currentPointer = dragPointerRef.current;
                        if (ghostRef.current) {
                            ghostRef.current.style.left = `${currentPointer.x - (drag.clickOffsetX ?? 0)}px`;
                            ghostRef.current.style.width = `${Math.max(drag.width, 8)}px`;
                            ghostRef.current.style.top = `${currentPointer.y - (drag.clickOffsetY ?? 0)}px`;
                        }
                        if (ghostTextRef.current) {
                            const clampedX = clamp(currentPointer.x, 170, window.innerWidth - 170);
                            ghostTextRef.current.style.left = `${clampedX}px`;
                            ghostTextRef.current.style.top = `${Math.max(8, currentPointer.y - 34)}px`;
                        }
                    });
                }

                const gridElement = gridRef.current;
                if (gridElement && Math.abs(event.clientY - lastDropTargetProbeY) >= DROP_TARGET_PROBE_PX) {
                    lastDropTargetProbeY = event.clientY;
                    const nextTarget = getRowIndex(
                        event.clientY,
                        gridElement.getBoundingClientRect().top,
                        layoutSnapshot,
                        headerHeight
                    );
                    if (nextTarget !== targetCarIndex) {
                        targetCarIndex = nextTarget;
                    }
                }
            }

            if (dayDelta === lastSnappedDayDelta) return;
            lastSnappedDayDelta = dayDelta;

            if (drag.type === 'move') {
                const duration = drag.origEnd - drag.origStart;
                finalStart = clamp(
                    geometrySnapshot.snapDay(drag.origStart + dayDelta),
                    -totalDays,
                    totalDays - duration
                );
                finalEnd = finalStart + duration;
            } else if (drag.type === 'resize-right') {
                finalStart = drag.origStart;
                finalEnd = clamp(
                    geometrySnapshot.snapDay(drag.origEnd + dayDelta),
                    drag.origStart + minimumDuration,
                    totalDays
                );
            } else {
                finalStart = clamp(
                    geometrySnapshot.snapDay(drag.origStart + dayDelta),
                    0,
                    drag.origEnd - minimumDuration
                );
                finalEnd = drag.origEnd;
            }

            setBookings((currentBookings) => currentBookings.map((booking) => {
                if (booking.id !== drag.bookingId) return booking;

                if (drag.type === 'move') {
                    return booking.start === finalStart && booking.end === finalEnd
                        ? booking
                        : { ...booking, start: finalStart, end: finalEnd };
                }

                if (drag.type === 'resize-right') {
                    return booking.end === finalEnd ? booking : { ...booking, end: finalEnd };
                }

                return booking.start === finalStart ? booking : { ...booking, start: finalStart };
            }));
        };

        const handleUp = () => {
            activeCleanupRef.current?.();
            activeCleanupRef.current = null;

            const targetCar = drag.type === 'move' && targetCarIndex !== null
                ? visibleCarsSnapshot[targetCarIndex]
                : null;
            const finalBooking = {
                ...drag.originalBooking,
                carId: targetCar?.id ?? drag.originalBooking.carId,
                start: finalStart,
                end: finalEnd,
            };
            setBookings((currentBookings) => currentBookings.map((booking) => (
                booking.id === drag.bookingId ? finalBooking : booking
            )));

            const hasChanged = finalBooking.carId !== drag.originalBooking.carId
                || finalBooking.start !== drag.originalBooking.start
                || finalBooking.end !== drag.originalBooking.end;
            if (hasChanged) {
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

            cancelAnimationFrame();
            setDragging(null);
            setGhost(null);
            window.setTimeout(() => {
                suppressReservationClickRef.current = false;
            }, 0);
        };

        activeCleanupRef.current = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    }, [cancelAnimationFrame, geometry, gridRef, headerHeight, layout, minimumDuration, onCommit, setBookings, totalDays, visibleCars]);

    const onBookingMouseDown = useCallback((event, booking, type) => {
        event.stopPropagation();
        if (type !== 'move') event.preventDefault();

        suppressReservationClickRef.current = false;
        pendingCleanupRef.current?.();

        const color = statusColors[booking.status] || statusColors.booked;
        const width = geometry.durationToPixels(booking.end - booking.start);
        const carIndex = visibleCars.findIndex((car) => car.id === booking.carId);
        const barRect = event.currentTarget.getBoundingClientRect();
        const gridRect = gridRef.current?.getBoundingClientRect();
        const barLeft = booking.start * geometry.dayWidth - pendingScrollXRef.current;
        const drag = {
            bookingId: booking.id,
            type,
            startX: event.clientX,
            startY: event.clientY,
            origStart: booking.start,
            origEnd: booking.end,
            origCarIdx: carIndex,
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
    }, [beginActiveDrag, daysVisible, geometry, gridRef, labelWidth, pendingScrollXRef, statusColors, visibleCars]);

    const beginResize = useCallback((event, booking, carIndex) => {
        beginActiveDrag({
            bookingId: booking.id,
            type: 'resize-right',
            startX: event.clientX,
            origStart: booking.start,
            origEnd: booking.end,
            origCarIdx: carIndex,
            color: statusColors[booking.status] || statusColors.booked,
            customer: booking.customer,
            width: geometry.durationToPixels(booking.end - booking.start),
            originalBooking: { ...booking },
        }, { x: event.clientX, y: event.clientY });
    }, [beginActiveDrag, geometry, statusColors]);

    const isReservationClickSuppressed = useCallback(
        () => suppressReservationClickRef.current,
        []
    );

    useEffect(() => () => {
        pendingCleanupRef.current?.();
        activeCleanupRef.current?.();
        cancelAnimationFrame();
    }, [cancelAnimationFrame]);

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