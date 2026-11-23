import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRentalPeriod, getCustomerRentalGroups, getRentalLocationOptions, getRentalMarkingOptions } from './customerOverview.js';

const rentals = [
  { id: 1, reservationId: 10, customerId: 1, customer: 'Öbergs AB', itemName: 'Kontorsbod', itemNr: '21', regNr: 'ETB 37F', serialNr: '', deliveryPlace: 'Old delivery place', placementStreet: 'Storgatan 1', placementZipCode: '972 31', placementCity: 'Luleå', customerMarking: 'Projekt Å', status: 'booked' },
  { id: 2, reservationId: 11, customerId: 1, customer: 'Öbergs AB', itemName: 'Grå El', itemNr: '10', regNr: '', serialNr: 'ABC123', deliveryPlace: 'Old Tomtebo', placementStreet: 'Tomtebo 2', placementZipCode: '907 00', placementCity: 'Umeå', customerMarking: 'Referens-42', status: 'out' },
  { id: 3, reservationId: 12, customerId: 2, customer: 'Anderssons AB', itemName: 'Lift', itemNr: '27', regNr: '', serialNr: '', deliveryPlace: 'Old Ersboda', placementCity: 'Ersboda', customerMarking: '', status: 'late_out' },
  { id: 4, reservationId: 13, customerId: 3, customer: 'Öbergs AB', itemName: 'Lift', itemNr: '28', regNr: '', serialNr: '', deliveryPlace: 'Old Ersboda', placementCity: 'Ersboda', customerMarking: 'Projekt Å', status: 'late_in' },
];

test('groups multiple reservations by customer ID without merging customers with the same name', () => {
  const groups = getCustomerRentalGroups(rentals);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].customer, 'Anderssons AB');
  assert.deepEqual(groups.find(group => group.key === 'customer:1').rentals.map(item => item.id), [1, 2]);
  assert.equal(groups.reduce((count, group) => count + group.rentals.length, 0), 4);
});

test('search matches customer, model, item number, registration, serial number and placement', () => {
  for (const search of ['ÖBERGS kontorsbod', '21', 'etb 37f', 'storgatan 1']) {
    assert.deepEqual(getCustomerRentalGroups(rentals, { search }).flatMap(group => group.rentals.map(item => item.id)), [1]);
  }
  assert.equal(getCustomerRentalGroups(rentals, { search: 'abc123' })[0].rentals[0].id, 2);
  assert.equal(getCustomerRentalGroups(rentals, { search: 'does not exist' }).length, 0);
});

test('combines location, status and search filters before counting and grouping', () => {
  const groups = getCustomerRentalGroups(rentals, { search: 'lift', location: 'Ersboda', status: 'late_in' });
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].rentals.map(item => item.id), [4]);
  for (const status of ['booked', 'out', 'late_out', 'late_in']) {
    assert.equal(getCustomerRentalGroups(rentals, { status }).flatMap(group => group.rentals).length, 1);
  }
});

test('filters by reservation marking', () => {
  assert.deepEqual(
    getCustomerRentalGroups(rentals, { marking: 'Projekt Å' }).flatMap(group => group.rentals.map(item => item.id)),
    [1, 4],
  );
});

test('placement options are unique and sorted, ignoring legacy place values', () => {
  assert.deepEqual(getRentalLocationOptions([...rentals, { deliveryPlace: 'Legacy only' }]), [
    { value: 'Ersboda', label: 'Ersboda' },
    { value: 'Storgatan 1, 972 31 Luleå', label: 'Storgatan 1, 972 31 Luleå' },
    { value: 'Tomtebo 2, 907 00 Umeå', label: 'Tomtebo 2, 907 00 Umeå' },
  ]);
});

test('placement options are limited to the selected status, or all statuses when cleared', () => {
  assert.deepEqual(getRentalLocationOptions(rentals, 'out'), [
    { value: 'Tomtebo 2, 907 00 Umeå', label: 'Tomtebo 2, 907 00 Umeå' },
  ]);
  assert.deepEqual(getRentalLocationOptions(rentals, ''), getRentalLocationOptions(rentals));
});

test('marking options are unique, sorted and omit blank values', () => {
  assert.deepEqual(getRentalMarkingOptions([...rentals, { customerMarking: ' Projekt Å ' }]), [
    { value: 'Projekt Å', label: 'Projekt Å' },
    { value: 'Referens-42', label: 'Referens-42' },
  ]);
});

test('unlinked named customers group together while unidentified customers stay separate', () => {
  const unlinked = [
    { ...rentals[0], customerId: null },
    { ...rentals[1], customerId: null },
    { ...rentals[2], customerId: null, customer: 'Kund saknas' },
    { ...rentals[3], customerId: null, customer: 'Kund saknas' },
  ];
  assert.equal(getCustomerRentalGroups(unlinked).length, 3);
  assert.deepEqual(getCustomerRentalGroups([]), []);
});

test('period formatting supports open-ended rentals and dates across years', () => {
  assert.match(formatRentalPeriod('2026-11-12T08:30:00', '2026-11-25T08:30:00'), /12 nov.*25 nov/);
  assert.match(formatRentalPeriod('2026-12-12T08:30:00', '2027-01-25T08:30:00'), /2026.*2027/);
  assert.match(formatRentalPeriod('2026-11-12T08:30:00', null), /12 nov.*–/);
});
