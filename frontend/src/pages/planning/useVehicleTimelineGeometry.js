import { useMemo } from 'react';

export function getInitialTimelineRange(viewportDays, startDay = 0) {
    const screenDays = Math.max(3, Math.ceil(viewportDays));
    const bufferDays = Math.ceil(screenDays / 2);
    return {
        startDay: Math.floor(startDay) - bufferDays,
        endDay: Math.ceil(startDay) + screenDays + bufferDays,
    };
}

export function getTimelineRangeExtension(range, viewportStart, viewportDays, direction) {
    const screenDays = Math.max(3, Math.ceil(viewportDays));
    const threshold = screenDays / 2;
    if (direction < 0 && viewportStart - range.startDay < threshold) {
        return { startDay: range.startDay - screenDays, endDay: range.startDay };
    }
    if (direction > 0 && range.endDay - viewportStart - viewportDays < threshold) {
        return { startDay: range.endDay, endDay: range.endDay + screenDays };
    }
    return null;
}

export function getTimelineScrollBounds(range, dayWidth, viewportWidth) {
    const minScrollX = range.startDay * dayWidth;
    const maxScrollX = Math.max(minScrollX, range.endDay * dayWidth - viewportWidth);
    return {
        minScrollX,
        maxScrollX,
        scrollRangeX: maxScrollX - minScrollX,
        thumbRatio: Math.min(1, viewportWidth / ((range.endDay - range.startDay) * dayWidth)),
    };
}

export function getTimelineRenderWindow(geometry, scrollX, previousWindow = null) {
    const { dayWidth, timelineViewportWidth, populatedPastDays, totalTimelineDays } = geometry;
    const firstDay = -populatedPastDays;
    const lastDay = firstDay + totalTimelineDays;
    const visibleStart = Math.floor(scrollX / dayWidth);
    const visibleEnd = Math.ceil((scrollX + Math.max(dayWidth, timelineViewportWidth)) / dayWidth);
    const bufferDays = Math.max(2, visibleEnd - visibleStart);
    const guardDays = Math.max(1, Math.floor(bufferDays / 2));
    const guardedStart = Math.max(firstDay, visibleStart - guardDays);
    const guardedEnd = Math.min(lastDay, visibleEnd + guardDays);

    if (previousWindow
        && previousWindow.startDay <= guardedStart
        && previousWindow.endDay >= guardedEnd) {
        return previousWindow;
    }

    return {
        startDay: Math.max(firstDay, Math.min(lastDay, visibleStart - bufferDays)),
        endDay: Math.max(firstDay, Math.min(lastDay, visibleEnd + bufferDays)),
    };
}

export function getAutoScrollDelta(position, minimum, maximum, edge = 48, maxSpeed = 20) {
    const zone = Math.min(edge, Math.max(0, (maximum - minimum) / 2));
    if (zone <= 0) return 0;
    if (position < minimum + zone) {
        const depth = Math.min(1, (minimum + zone - position) / zone);
        return -Math.max(1, Math.round(depth * maxSpeed));
    }
    if (position > maximum - zone) {
        const depth = Math.min(1, (position - (maximum - zone)) / zone);
        return Math.max(1, Math.round(depth * maxSpeed));
    }
    return 0;
}

function findRowIndexAt(offsets, y) {
    let low = 0;
    let high = offsets.length - 2;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (offsets[middle] <= y) low = middle;
        else high = middle - 1;
    }
    return low;
}

// offsets[i] is the top of row i relative to the first row; offsets[rowCount] is the total height.
export function getRowRenderWindow(offsets, viewTop, viewHeight, previousWindow = null) {
    const rowCount = offsets.length - 1;
    if (rowCount <= 0) return { startIndex: 0, endIndex: 0 };

    const totalHeight = offsets[rowCount];
    const height = Math.max(1, viewHeight);
    const guard = height / 2;
    const neededTop = Math.max(0, viewTop - guard);
    const neededBottom = Math.min(totalHeight, viewTop + height + guard);

    if (previousWindow
        && previousWindow.endIndex <= rowCount
        && offsets[previousWindow.startIndex] <= neededTop
        && offsets[previousWindow.endIndex] >= neededBottom) {
        return previousWindow;
    }

    return {
        startIndex: findRowIndexAt(offsets, Math.max(0, viewTop - height)),
        endIndex: findRowIndexAt(offsets, Math.min(totalHeight - 1, viewTop + height * 2)) + 1,
    };
}

function resolveMinimumDayWidth(daysVisible) {
    if (daysVisible <= 3) return 120;
    if (daysVisible <= 7) return 100;
    if (daysVisible <= 14) return 80;
    if (daysVisible <= 31) return 28;
    return 12;
}

export default function useVehicleTimelineGeometry({
    containerWidth,
    daysVisible,
    labelWidth,
    snapDays,
    loadedRange = null,
}) {
    return useMemo(() => {
        const availableWidth = Math.max(0, containerWidth - labelWidth);
        const minimumDayWidth = resolveMinimumDayWidth(daysVisible);
        const dayWidth = availableWidth > 0
            ? Math.max(minimumDayWidth, Math.floor(availableWidth / daysVisible))
            : minimumDayWidth;
        const populatedPastDays = loadedRange ? -loadedRange.startDay : daysVisible * 2;
        const populatedFutureDays = loadedRange ? loadedRange.endDay : daysVisible * 3;
        const totalTimelineDays = populatedPastDays + populatedFutureDays;
        const bounds = loadedRange
            ? getTimelineScrollBounds(loadedRange, dayWidth, availableWidth || daysVisible * dayWidth)
            : {
                minScrollX: -Math.max(0, populatedPastDays - 2) * dayWidth,
                maxScrollX: (populatedFutureDays + 2 - daysVisible) * dayWidth,
                thumbRatio: daysVisible / totalTimelineDays,
            };
        const { minScrollX, maxScrollX, thumbRatio } = bounds;
        const scrollRangeX = Math.max(0, maxScrollX - minScrollX);

        const snapDay = (value) => Math.round(value / snapDays) * snapDays;

        return {
            dayWidth,
            timelineViewportWidth: availableWidth,
            populatedPastDays,
            populatedFutureDays,
            totalTimelineDays,
            minScrollX,
            maxScrollX,
            scrollRangeX,
            thumbRatio,
            snapDay,
            dayDeltaFromPixels: (pixels) => snapDay(pixels / dayWidth),
            dayAtPixel: (pixels, scrollX = 0) => snapDay((pixels + scrollX) / dayWidth),
            durationToPixels: (durationDays) => durationDays * dayWidth,
        };
    }, [containerWidth, daysVisible, labelWidth, loadedRange, snapDays]);
}