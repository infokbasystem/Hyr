import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRentalPeriod, getCustomerRentalGroups, getRentalLocationOptions } from './customerOverview.js';

const rentals = [
  { id: 1, reservationId: 10, customerId: 1, customer: 'Öbergs AB', itemName: 'Kontorsbod', itemNr: '21', regNr: 'ETB 37F', serialNr: '', deliveryPlace: 'Umeå Hamn', status: 'booked' },
  { id: 2, reservationId: 11, customerId: 1, customer: 'Öbergs AB', itemName: 'Grå El', itemNr: '10', regNr: '', serialNr: 'ABC123', deliveryPlace: 'Tomtebo', status: 'out' },
  { id: 3, reservationId: 12, customerId: 2, customer: 'Anderssons AB', itemName: 'Lift', itemNr: '27', regNr: '', serialNr: '', deliveryPlace: 'Ersboda', status: 'late_out' },
  { id: 4, reservationId: 13, customerId: 3, customer: 'Öbergs AB', itemName: 'Lift', itemNr: '28', regNr: '', serialNr: '', deliveryPlace: 'Ersboda', status: 'late_in' },
];

test('groups multiple reservations by customer ID without merging customers with the same name', () => {
  const groups = getCustomerRentalGroups(rentals);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].customer, 'Anderssons AB');
  assert.deepEqual(groups.find(group => group.key === 'customer:1').rentals.map(item => item.id), [1, 2]);
  assert.equal(groups.reduce((count, group) => count + group.rentals.length, 0), 4);
});

test('search matches customer, model, item number, registration, serial number and location', () => {
  for (const search of ['ÖBERGS kontorsbod', '21', 'etb 37f', 'umeå hamn']) {
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

test('location options are unique, sorted and independent of active filters', () => {
  assert.deepEqual(getRentalLocationOptions([...rentals, { deliveryPlace: '' }]), [
    { value: 'Ersboda', label: 'Ersboda' },
    { value: 'Tomtebo', label: 'Tomtebo' },
    { value: 'Umeå Hamn', label: 'Umeå Hamn' },
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
