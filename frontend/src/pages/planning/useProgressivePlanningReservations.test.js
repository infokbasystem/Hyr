import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlanningRangeLoader, mergePlanningReservations } from './useProgressivePlanningReservations.js';

function createHarness(fetchRange = async () => []) {
    const requests = [];
    const publications = [];
    const errors = [];
    let busy = false;
    let revision = 0;
    const loader = createPlanningRangeLoader({
        initialRange: { startDay: -16, endDay: 47 },
        fetchRange: range => { requests.push(range); return fetchRange(range); },
        publish: (range, rows, replace) => publications.push({ range, rows, replace }),
        isBusy: () => busy,
        getRevision: () => revision,
        onError: error => errors.push(error.message),
        onLoading: () => {},
    });
    return { loader, requests, publications, errors, setBusy: value => { busy = value; }, edit: () => { revision += 1; } };
}

test('extensions request only missing intervals and grow both bounds', async () => {
    const harness = createHarness();
    await harness.loader.start();
    await harness.loader.extend(3, 31, 1);
    await harness.loader.extend(-3, 31, -1);
    assert.deepEqual(harness.requests, [
        { startDay: -16, endDay: 47 },
        { startDay: 47, endDay: 78 },
        { startDay: -47, endDay: -16 },
    ]);
    assert.deepEqual(harness.publications.at(-1).range, { startDay: -47, endDay: 78 });
    assert.equal(harness.publications.at(-1).replace, false);
});

test('extensions preserve local edits and deduplicate by item rather than reservation', () => {
    const edited = { id: 1, reservationId: 10, start: 5 };
    const result = mergePlanningReservations([edited], [
        { id: 1, reservationId: 10, start: 1 },
        { id: 2, reservationId: 10, start: 3 },
        { id: 2, reservationId: 10, start: 3 },
    ]);
    assert.equal(result[0], edited);
    assert.equal(result.length, 2);
});

test('in-flight extensions serialize and publication waits for gestures to finish', async () => {
    let resolveRequest;
    let pending = false;
    const harness = createHarness(() => pending
        ? new Promise(resolve => { resolveRequest = resolve; })
        : Promise.resolve([]));
    await harness.loader.start();
    pending = true;
    harness.setBusy(true);
    const loading = harness.loader.extend(3, 31, 1);
    harness.loader.extend(3, 31, 1);
    harness.loader.extend(-3, 31, -1);
    assert.equal(harness.requests.length, 2);
    resolveRequest([]);
    await loading;
    assert.equal(harness.publications.length, 1);
    harness.setBusy(false);
    harness.loader.flush();
    assert.equal(harness.publications.length, 2);
});

test('failed extensions keep existing bounds and retry the exact interval', async () => {
    let fail = false;
    const harness = createHarness(async () => {
        if (fail) throw new Error('offline');
        return [];
    });
    await harness.loader.start();
    fail = true;
    await harness.loader.extend(3, 31, 1);
    assert.equal(harness.publications.length, 1);
    assert.deepEqual(harness.errors, ['offline']);
    fail = false;
    await harness.loader.retry();
    assert.deepEqual(harness.requests[1], harness.requests[2]);
    assert.equal(harness.publications.length, 2);
});

test('disposed requests and refreshes overtaken by local edits cannot publish', async () => {
    let resolveRequest;
    let pending = false;
    const harness = createHarness(() => pending
        ? new Promise(resolve => { resolveRequest = resolve; })
        : Promise.resolve([]));
    await harness.loader.start();
    pending = true;
    const refresh = harness.loader.refresh();
    harness.edit();
    resolveRequest([]);
    await refresh;
    assert.equal(harness.publications.length, 1);
    const next = harness.loader.refresh();
    harness.loader.dispose();
    resolveRequest([]);
    await next;
    assert.equal(harness.publications.length, 1);
});

test('focus refresh waits for interactions and replaces authoritative data', async () => {
    const harness = createHarness();
    await harness.loader.start();
    harness.setBusy(true);
    harness.loader.refresh();
    assert.equal(harness.requests.length, 1);
    harness.setBusy(false);
    harness.loader.flush();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(harness.requests.length, 2);
    assert.equal(harness.publications.at(-1).replace, true);
});

test('resize fills only the uncovered dates without refetching the loaded interval', async () => {
    const harness = createHarness();
    await harness.loader.start();
    await harness.loader.ensureCoverage(0, 70);
    assert.deepEqual(harness.requests.at(-1), { startDay: 47, endDay: 70 });
    assert.deepEqual(harness.publications.at(-1).range, { startDay: -16, endDay: 70 });
    await harness.loader.ensureCoverage(0, 31);
    assert.equal(harness.requests.length, 2);
});

test('a new initial load survives a revision change from the old view', async () => {
    let resolveRequest;
    const harness = createHarness(() => new Promise(resolve => { resolveRequest = resolve; }));
    const request = harness.loader.start();
    harness.edit();
    resolveRequest([]);
    await request;
    assert.equal(harness.publications.length, 1);
});

test('a failed resize coverage request does not trigger an automatic retry loop', async () => {
    let fail = false;
    const harness = createHarness(async () => {
        if (fail) throw new Error('offline');
        return [];
    });
    await harness.loader.start();
    fail = true;
    await harness.loader.ensureCoverage(0, 70);
    await harness.loader.ensureCoverage(0, 70);
    await harness.loader.ensureCoverage(0, 70);
    assert.equal(harness.requests.length, 2);
    fail = false;
    await harness.loader.retry();
    assert.equal(harness.requests.length, 3);
    assert.equal(harness.publications.at(-1).range.endDay, 70);
});