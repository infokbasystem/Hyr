import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getAutoScrollDelta,
    getInitialTimelineRange,
    getRowRenderWindow,
    getTimelineBookingRange,
    getTimelineDayWidth,
    getTimelineRangeExtension,
    getTimelineRenderWindow,
    getTimelineScrollBounds,
    getTimelineYearSpans,
} from './useVehicleTimelineGeometry.js';

test('daily reservation bounds include the end date without changing stored times', () => {
    for (const [start, end, expectedStart, expectedEnd] of [
        [2.4, 2.6, 2, 3],
        [2.4, 5.6, 2, 6],
        [2.4, 5, 2, 6],
        [2, 5, 2, 6],
        [-2.6, -0.4, -3, 0],
        [-2.6, 0, -3, 1],
        [2, 2, 2, 3],
    ]) {
        const booking = Object.freeze({ start, end });
        const range = getTimelineBookingRange(booking);
        assert.ok(range.start === expectedStart);
        assert.ok(range.end === expectedEnd);
        assert.deepEqual(getTimelineBookingRange(booking, false), { start, end });
    }
});

test('a reservation from 22 November through 4 December includes all of 4 December', () => {
    const range = getTimelineBookingRange({ start: 21, end: 33 });
    assert.deepEqual(range, { start: 21, end: 34 });
    assert.equal(range.end - range.start, 13);
    assert.deepEqual(getTimelineBookingRange({ start: 21, end: 33 }, false), {
        start: 21, end: 33,
    });
});

test('daily rendering separates same-day bookings but allows adjacent days in one lane', () => {
    const morning = getTimelineBookingRange({ start: 2.25, end: 2.5 });
    const afternoon = getTimelineBookingRange({ start: 2.6, end: 2.75 });
    const tomorrow = getTimelineBookingRange({ start: 3.25, end: 3.5 });
    assert.ok(morning.end > afternoon.start);
    assert.equal(afternoon.end, tomorrow.start);
    for (const dayWidth of [1.5, 3, 12, 28, 80]) {
        assert.equal((morning.end - morning.start) * dayWidth, dayWidth);
    }
});

test('year header spans group adjacent months and preserve year boundaries', () => {
    assert.deepEqual(getTimelineYearSpans([]), []);
    assert.deepEqual(getTimelineYearSpans([
        { year: 2026, startPx: -46.5, widthPx: 46.5 },
        { year: 2027, startPx: 0, widthPx: 46.5 },
        { year: 2027, startPx: 46.5, widthPx: 42 },
        { year: 2028, startPx: 88.5, widthPx: 46.5 },
        { year: 2028, startPx: 135, widthPx: 43.5 },
    ]), [
        { year: 2026, startPx: -46.5, widthPx: 46.5 },
        { year: 2027, startPx: 0, widthPx: 88.5 },
        { year: 2028, startPx: 88.5, widthPx: 90 },
    ]);
});

function makeOffsets(heights) {
    const offsets = [0];
    for (const height of heights) offsets.push(offsets.at(-1) + height);
    return offsets;
}

function makeGeometry(daysVisible, viewportWidth = 1970) {
    return {
        dayWidth: getTimelineDayWidth(viewportWidth, daysVisible),
        timelineViewportWidth: viewportWidth,
        populatedPastDays: daysVisible * 2,
        totalTimelineDays: daysVisible * 5,
    };
}

test('yearly weeks are compact and still scale with the viewport', () => {
    for (const [viewportWidth, expectedDayWidth] of [
        [0, 3], [320, 3], [1024, 3], [1440, 3], [1970, 5], [3840, 10],
    ]) {
        const dayWidth = getTimelineDayWidth(viewportWidth, 365);
        assert.equal(dayWidth, expectedDayWidth);
        assert.equal(dayWidth * 7, expectedDayWidth * 7);
        assert.ok(dayWidth < Math.max(12, Math.floor(viewportWidth / 365)));
    }
});

test('shorter periods retain their minimum widths and responsive sizing', () => {
    for (const [daysVisible, minimumWidth] of [
        [3, 120], [7, 100], [14, 80], [31, 28], [90, 12], [92, 12], [183, 12],
    ]) {
        for (const viewportWidth of [0, 320, 1970]) {
            assert.equal(
                getTimelineDayWidth(viewportWidth, daysVisible),
                Math.max(minimumWidth, Math.floor(viewportWidth / daysVisible)),
            );
        }
    }
});

test('two-year views use a more compact scale than yearly views', () => {
    for (const [viewportWidth, expectedDayWidth] of [
        [0, 1.5], [320, 1.5], [1024, 1.5], [1440, 1.5], [1970, 2], [3840, 5],
    ]) {
        assert.equal(getTimelineDayWidth(viewportWidth, 730), expectedDayWidth);
        assert.ok(expectedDayWidth < getTimelineDayWidth(viewportWidth, 365));
    }
});

test('all periods cover the viewport throughout the populated scroll range', () => {
    for (const daysVisible of [3, 7, 31, 90, 92, 183, 365, 730]) {
        for (const viewportWidth of [320, 1970]) {
            const geometry = makeGeometry(daysVisible, viewportWidth);
            let previousWindow = null;

            for (let offset = -daysVisible * 2 + 2; offset <= daysVisible * 2 + 2; offset += 0.25) {
                const scrollX = offset * geometry.dayWidth;
                const renderWindow = getTimelineRenderWindow(geometry, scrollX, previousWindow);
                const visibleEnd = Math.min(daysVisible * 3, Math.ceil(
                    (scrollX + viewportWidth) / geometry.dayWidth
                ));

                assert.ok(renderWindow.startDay >= -daysVisible * 2);
                assert.ok(renderWindow.endDay <= daysVisible * 3);
                assert.ok(renderWindow.startDay <= Math.floor(offset));
                assert.ok(renderWindow.endDay >= visibleEnd);
                previousWindow = renderWindow;
            }
        }
    }
});

test('small scrolls reuse the buffer while jumps replenish it in either direction', () => {
    const geometry = makeGeometry(31);
    const initial = getTimelineRenderWindow(geometry, 0);
    assert.equal(getTimelineRenderWindow(geometry, geometry.dayWidth, initial), initial);

    const future = getTimelineRenderWindow(geometry, geometry.dayWidth * 64, initial);
    assert.notEqual(future, initial);
    assert.equal(future.endDay, 93);

    const past = getTimelineRenderWindow(geometry, geometry.dayWidth * -60, future);
    assert.notEqual(past, future);
    assert.equal(past.startDay, -62);
});

test('an unmeasured viewport still renders a buffered day', () => {
    const geometry = makeGeometry(3, 0);
    assert.deepEqual(getTimelineRenderWindow(geometry, 0), {
        startDay: -2,
        endDay: 3,
    });
});

test('progressive ranges start near two screens and add only the approached interval', () => {
    for (const days of [3, 7, 31, 90, 92, 183, 365, 730]) {
        const range = getInitialTimelineRange(days);
        assert.ok(range.endDay - range.startDay <= days * 2 + 1);
        assert.equal(getTimelineRangeExtension(range, 0, days, 1), null);
        assert.deepEqual(getTimelineRangeExtension(range, 2, days, 1), {
            startDay: range.endDay,
            endDay: range.endDay + days,
        });
        assert.deepEqual(getTimelineRangeExtension(range, -2, days, -1), {
            startDay: range.startDay - days,
            endDay: range.startDay,
        });
    }
});

test('auto-scroll speed grows towards each edge and is zero in the middle', () => {
    assert.equal(getAutoScrollDelta(500, 0, 1000), 0);
    assert.ok(getAutoScrollDelta(40, 0, 1000) < 0);
    assert.ok(getAutoScrollDelta(5, 0, 1000) < getAutoScrollDelta(40, 0, 1000));
    assert.equal(getAutoScrollDelta(-200, 0, 1000), -20);
    assert.equal(getAutoScrollDelta(1200, 0, 1000), 20);
    assert.ok(getAutoScrollDelta(960, 0, 1000) > 0);
    assert.equal(getAutoScrollDelta(10, 0, 0), 0);
});

test('row window covers the viewport with overscan for variable row heights', () => {
    const heights = Array.from({ length: 400 }, (_, index) => (index % 7 === 0 ? 53 : 27));
    const offsets = makeOffsets(heights);
    for (const viewTop of [0, 137, 4000, offsets.at(-1) - 600]) {
        const window = getRowRenderWindow(offsets, viewTop, 600);
        assert.ok(offsets[window.startIndex] <= Math.max(0, viewTop - 300));
        assert.ok(offsets[window.endIndex] >= Math.min(offsets.at(-1), viewTop + 900));
        assert.ok(window.endIndex - window.startIndex < 120);
    }
    assert.deepEqual(getRowRenderWindow([0], 0, 600), { startIndex: 0, endIndex: 0 });
    assert.deepEqual(getRowRenderWindow(makeOffsets([27, 27]), 0, 600), { startIndex: 0, endIndex: 2 });
});

test('row window reuses the previous window for small scrolls and replaces it for jumps', () => {
    const offsets = makeOffsets(Array(400).fill(27));
    const initial = getRowRenderWindow(offsets, 2000, 600);
    assert.equal(getRowRenderWindow(offsets, 2100, 600, initial), initial);
    assert.notEqual(getRowRenderWindow(offsets, 6000, 600, initial), initial);
    assert.notEqual(getRowRenderWindow(makeOffsets(Array(10).fill(27)), 0, 600, initial), initial);
});

test('range growth preserves coordinates and uses the real viewport for scroll limits', () => {
    const initial = getInitialTimelineRange(31);
    const before = getTimelineScrollBounds(initial, 60, 1970);
    const after = getTimelineScrollBounds({ startDay: initial.startDay - 31, endDay: initial.endDay + 31 }, 60, 1970);
    assert.equal(before.maxScrollX + 1970, initial.endDay * 60);
    assert.equal(after.minScrollX, before.minScrollX - 31 * 60);
    assert.equal(after.maxScrollX, before.maxScrollX + 31 * 60);
    assert.ok(after.thumbRatio < before.thumbRatio);
    assert.deepEqual(getInitialTimelineRange(31, 200), { startDay: 184, endDay: 247 });
});