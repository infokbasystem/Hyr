import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getAutoScrollDelta,
    getInitialTimelineRange,
    getRowRenderWindow,
    getTimelineRangeExtension,
    getTimelineRenderWindow,
    getTimelineScrollBounds,
} from './useVehicleTimelineGeometry.js';

function makeOffsets(heights) {
    const offsets = [0];
    for (const height of heights) offsets.push(offsets.at(-1) + height);
    return offsets;
}

function makeGeometry(daysVisible, viewportWidth = 1970) {
    return {
        dayWidth: Math.max(12, Math.floor(viewportWidth / daysVisible)),
        timelineViewportWidth: viewportWidth,
        populatedPastDays: daysVisible * 2,
        totalTimelineDays: daysVisible * 5,
    };
}

test('all periods cover the viewport throughout the populated scroll range', () => {
    for (const daysVisible of [3, 7, 31, 90]) {
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
    for (const days of [3, 7, 31, 90]) {
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