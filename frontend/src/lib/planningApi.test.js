import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function createHarness(respond = async () => []) {
    const calls = [];
    const context = vm.createContext({ URLSearchParams });
    const api = new vm.SourceTextModule(await readFile(new URL('./planningApi.js', import.meta.url), 'utf8'), { context });
    const shared = new vm.SourceTextModule(await readFile(new URL('./sharedRequest.js', import.meta.url), 'utf8'), { context });
    const client = new vm.SyntheticModule(['requestJson'], function () {
        this.setExport('requestJson', (path, options) => {
            calls.push({ path, options });
            return respond(path, options);
        });
    }, { context });
    await api.link(specifier => {
        if (specifier === './apiClient') return client;
        if (specifier === './sharedRequest') return shared;
        throw new Error(`Unexpected import: ${specifier}`);
    });
    await api.evaluate();
    return { api: api.namespace, calls };
}

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

function queryFor(call) {
    return new URL(call.path, 'http://localhost').searchParams;
}

test('customer rentals use the all-item endpoint without date or type restrictions', async () => {
    const expected = [{ id: 1, customerId: 2, itemName: 'Lift', status: 'out' }];
    const harness = await createHarness(async () => expected);
    assert.deepEqual(plain(await harness.api.getPlanningCustomerRentals()), expected);
    assert.equal(harness.calls[0].path, '/planning/customer-rentals');
});

test('customer rentals surface failed requests and invalid responses', async () => {
    const invalid = await createHarness(async () => ({ message: 'Invalid response' }));
    await assert.rejects(invalid.api.getPlanningCustomerRentals(), /ogiltigt svar/);
    const failed = await createHarness(async () => { throw new Error('Unauthorized'); });
    await assert.rejects(failed.api.getPlanningCustomerRentals(), /Unauthorized/);
});

test('typed categories isolate cabin, lift and untyped calls while deduplicating normalized types', async () => {
    const releases = [];
    const harness = await createHarness(path => new Promise(resolve => {
        const type = new URL(path, 'http://localhost').searchParams.get('ItemTypeCode') || 'ALL';
        releases.push(() => resolve([{ id: type, name: type }]));
    }));
    const pending = [
        harness.api.getPlanningCategories({ itemTypeCode: ' cabin ' }),
        harness.api.getPlanningCategories({ itemTypeCode: 'CABIN' }),
        harness.api.getPlanningCategories({ itemTypeCode: 'LIFT' }),
        harness.api.getPlanningCategories(),
    ];
    await Promise.resolve();
    assert.equal(harness.calls.length, 3);
    releases.forEach(release => release());
    const results = plain(await Promise.all(pending));
    assert.deepEqual(results.map(rows => rows[0].name), ['CABIN', 'CABIN', 'LIFT', 'ALL']);
    assert.equal(harness.calls[2].path, '/planning/categories');
});

test('cabin categories intersect serialized legacy types and preserve availability dates', async () => {
    const harness = await createHarness();
    await harness.api.getPlanningCabins({
        categoryIds: [2, 1, 'invalid'],
        cabinTypeCodes: ['OFFICE', ''],
        availableFrom: '2026-11-08T00:00:00',
        availableTo: '2026-11-10T23:59:59',
    });
    const query = queryFor(harness.calls[0]);
    assert.deepEqual(query.getAll('CategoryIds'), ['2', '1']);
    assert.deepEqual(query.getAll('CabinTypeCodes'), ['OFFICE']);
    assert.equal(query.get('AvailableFrom'), '2026-11-08T00:00:00');
    assert.equal(query.get('AvailableTo'), '2026-11-10T23:59:59');
});

test('lift rows map the common timeline shape without cabin fields or price snapshots', async () => {
    const harness = await createHarness(async () => [{
        id: 21, itemNr: 'L21', serialNr: 'S21', itemCategoryId: 3,
        itemCategoryName: 'Lift category', manufacturer: 'Maker', itemModelName: 'Model',
        basePrice: 100, cabinTypeName: 'Not a cabin',
    }]);
    const rows = await harness.api.getPlanningLifts({ categoryIds: [3] });
    assert.deepEqual(plain(rows), [{
        id: 21, itemNr: 'L21', serialNr: 'S21', categoryId: 3,
        category: 'Lift category', manufacturer: 'Maker', model: 'Model',
    }]);
    assert.equal(queryFor(harness.calls[0]).get('CategoryIds'), '3');
});

test('item list endpoints retain current item status', async () => {
    const harness = await createHarness(async path => {
        if (path === '/planning/vehicles') return [{ id: 1, currentStatus: 1 }];
        if (path === '/planning/cabins') return [{ id: 2, currentStatus: 2 }];
        if (path === '/planning/lifts') return [{ id: 3, currentStatus: 3 }];
        return [];
    });

    const [vehicles, cabins, lifts] = await Promise.all([
        harness.api.getPlanningVehicles(),
        harness.api.getPlanningCabins(),
        harness.api.getPlanningLifts(),
    ]);

    assert.deepEqual(
        [vehicles[0].currentStatus, cabins[0].currentStatus, lifts[0].currentStatus],
        [1, 2, 3],
    );
});

test('empty selection omits category filters and partial availability never becomes a range', async () => {
    const harness = await createHarness();
    await harness.api.getPlanningCabins({ categoryIds: [] });
    await harness.api.getPlanningLifts({ categoryIds: [], availableFrom: '2026-11-08' });
    assert.deepEqual(harness.calls.map(call => call.path), ['/planning/cabins', '/planning/lifts']);
});

test('lift rows and reservations send the same category IDs with distinct request identities', async () => {
    const releases = [];
    const harness = await createHarness(() => new Promise(resolve => releases.push(() => resolve([]))));
    const selection = { categoryIds: [1, 3] };
    const pending = [
        harness.api.getPlanningLifts({ ...selection, availableFrom: '2026-11-08', availableTo: '2026-11-10' }),
        harness.api.getPlanningReservations({ ...selection, itemTypeCode: 'LIFT', from: '2026-11-01', to: '2026-12-01' }),
        harness.api.getPlanningReservations({ ...selection, itemTypeCode: 'CABIN', from: '2026-11-01', to: '2026-12-01' }),
    ];
    await Promise.resolve();
    assert.equal(harness.calls.length, 3);
    for (const call of harness.calls) assert.deepEqual(queryFor(call).getAll('CategoryIds'), ['1', '3']);
    assert.equal(queryFor(harness.calls[1]).get('ItemTypeCode'), 'LIFT');
    assert.equal(queryFor(harness.calls[2]).get('ItemTypeCode'), 'CABIN');
    releases.forEach(release => release());
    await Promise.all(pending);
});

test('failed typed category requests clear their in-flight entry for retry', async () => {
    let fail = true;
    const harness = await createHarness(async () => {
        if (fail) throw new Error('offline');
        return [{ id: 3, name: 'Lift category' }];
    });
    await assert.rejects(harness.api.getPlanningCategories({ itemTypeCode: 'LIFT' }), /offline/);
    fail = false;
    const result = await harness.api.getPlanningCategories({ itemTypeCode: 'LIFT' });
    assert.equal(result[0].id, 3);
    assert.equal(harness.calls.length, 2);
});