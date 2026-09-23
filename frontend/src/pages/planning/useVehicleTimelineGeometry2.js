import { useMemo } from 'react';

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
}) {
    return useMemo(() => {
        const availableWidth = Math.max(0, containerWidth - labelWidth);
        const minimumDayWidth = resolveMinimumDayWidth(daysVisible);
        const dayWidth = availableWidth > 0
            ? Math.max(minimumDayWidth, Math.floor(availableWidth / daysVisible))
            : minimumDayWidth;
        const populatedPastDays = daysVisible * 2;
        const populatedFutureDays = daysVisible * 3;
        const totalTimelineDays = populatedPastDays + populatedFutureDays;
        const minScrollX = -Math.max(0, populatedPastDays - 2) * dayWidth;
        const maxScrollDayOffset = populatedFutureDays + 2 - daysVisible;
        const maxScrollX = Math.max(minScrollX, maxScrollDayOffset * dayWidth);
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
            snapDay,
            dayDeltaFromPixels: (pixels) => snapDay(pixels / dayWidth),
            dayAtPixel: (pixels, scrollX = 0) => snapDay((pixels + scrollX) / dayWidth),
            durationToPixels: (durationDays) => durationDays * dayWidth,
        };
    }, [containerWidth, daysVisible, labelWidth, snapDays]);
}