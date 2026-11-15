import assert from 'node:assert/strict';
import test from 'node:test';
import { getMobileRedirectTarget, isMobileDevice, isMobilePath } from './mobileRouting.js';
import { daysOverdue, filterAvailableItems, getItemState, groupEventsByDay, groupItemsByCategory, isEligibleForAction, NO_ITEM_TYPE } from './mobileFormat.js';

test('desktop entry points map to their mobile counterpart', () => {
    assert.equal(getMobileRedirectTarget('/'), '/m');
    assert.equal(getMobileRedirectTarget('/login'), '/m/login');
    assert.equal(getMobileRedirectTarget('/operations/reservation/42/'), '/m/reservation/42');
    assert.equal(getMobileRedirectTarget('/operations/reservation'), null);
    assert.equal(getMobileRedirectTarget('/finance/invoices'), null);
    assert.equal(isMobilePath('/m'), true);
    assert.equal(isMobilePath('/management'), false);
});

test('only touch devices with a phone-sized screen count as mobile', () => {
    const device = (coarse, width, height) => ({
        matchMedia: () => ({ matches: coarse }),
        screen: { width, height },
    });
    assert.equal(isMobileDevice(device(true, 390, 844)), true);
    assert.equal(isMobileDevice(device(true, 932, 430)), true);
    assert.equal(isMobileDevice(device(true, 820, 1180)), false);
    assert.equal(isMobileDevice(device(false, 390, 844)), false);
});

test('events before today are grouped as overdue and the rest per day', () => {
    const now = new Date(2026, 10, 14, 12, 0);
    const groups = groupEventsByDay([
        { key: 'tomorrow', date: new Date(2026, 10, 15, 7, 0) },
        { key: 'late', date: new Date(2026, 10, 10, 9, 0) },
        { key: 'today-later', date: new Date(2026, 10, 14, 16, 0) },
        { key: 'today-earlier', date: new Date(2026, 10, 14, 8, 0) },
    ], now);

    assert.deepEqual(groups.map(group => group.label), ['Försenade', 'Idag', 'Imorgon']);
    assert.deepEqual(groups[1].events.map(event => event.key), ['today-earlier', 'today-later']);
    assert.equal(daysOverdue(new Date(2026, 10, 10, 9, 0), now), 4);
    assert.equal(daysOverdue(new Date(2026, 10, 14, 8, 0), now), 0);
});

test('item actions follow booked, delivered, returned and checked-in states', () => {
    const booked = {};
    const out = { actualFrom: '2026-11-10T08:00' };
    const returned = { ...out, actualTo: '2026-11-12T08:00' };
    const checkedIn = { ...returned, isCheckedIn: true };

    assert.deepEqual([booked, out, returned, checkedIn].map(item => isEligibleForAction(item, 'deliver')), [true, false, false, false]);
    assert.deepEqual([booked, out, returned, checkedIn].map(item => isEligibleForAction(item, 'return')), [false, true, false, false]);
    assert.deepEqual([booked, out, returned, checkedIn].map(item => isEligibleForAction(item, 'checkin')), [false, false, true, false]);
    assert.deepEqual([booked, out, returned, checkedIn, { isCheckedIn: true }].map(getItemState), ['booked', 'out', 'returned', 'checkedIn', 'booked']);
});

test('available items filter by type and text and group by category', () => {
    const items = [
        { id: 1, itemTypeCode: 'VEHICLE', itemTypeName: 'Fordon', itemCategoryName: 'Skåpbil', regNr: 'ABC123' },
        { id: 2, itemTypeCode: 'VEHICLE', itemTypeName: 'Fordon', itemCategoryName: 'Personbil', regNr: 'XYZ987' },
        { id: 3, itemTypeCode: 'LIFT', itemTypeName: 'Lift', itemCategoryName: '', itemNr: 'L-12' },
        { id: 4, itemTypeCode: '', itemTypeName: '', itemCategoryName: '', itemNr: 'Stege' },
    ];

    assert.deepEqual(filterAvailableItems(items, 'VEHICLE', 'xyz').map(item => item.id), [2]);
    assert.deepEqual(filterAvailableItems(items, '', 'l-1').map(item => item.id), [3]);
    assert.deepEqual(filterAvailableItems(items, NO_ITEM_TYPE, '').map(item => item.id), [4]);
    assert.deepEqual(
        groupItemsByCategory(items).map(group => [group.label, group.items.map(item => item.id)]),
        [['Skåpbil', [1]], ['Personbil', [2]], ['Lift', [3]], ['Övrigt', [4]]],
    );
});
