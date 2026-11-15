import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDirectionsUrl,
  formatCoordinates,
  formatPlacementAddress,
  getInitialPlacement,
  getPlacement,
  hasPlacementCoordinates,
  placementToReservationFields,
  toCoordinate,
} from './placementLocation.js'

test('coordinates are parsed, rounded to six decimals and validated', () => {
  assert.equal(toCoordinate('65,5848194'), 65.584819)
  assert.equal(toCoordinate(22.1567034), 22.156703)
  assert.equal(toCoordinate(''), null)
  assert.equal(toCoordinate(null), null)
  assert.equal(toCoordinate('abc'), null)
  assert.equal(hasPlacementCoordinates({ placementLatitude: 0, placementLongitude: 0 }), true)
  assert.equal(hasPlacementCoordinates({ placementLatitude: 65.5, placementLongitude: null }), false)
  assert.equal(hasPlacementCoordinates({ placementLatitude: 91, placementLongitude: 20 }), false)
  assert.equal(hasPlacementCoordinates({ placementLatitude: 60, placementLongitude: -181 }), false)
})

test('address and coordinates are formatted for display', () => {
  assert.equal(formatPlacementAddress({ street: 'Storgatan 1', zipCode: '972 31', city: 'Luleå' }), 'Storgatan 1, 972 31 Luleå')
  assert.equal(formatPlacementAddress({ city: 'Luleå' }), 'Luleå')
  assert.equal(formatPlacementAddress({}), '')
  assert.equal(formatCoordinates(65.584819, 22.156703), '65.58482, 22.15670')
  assert.equal(formatCoordinates(null, 22), '')
})

test('placement round-trips between reservation fields and the modal and never stores half a coordinate', () => {
  const fields = placementToReservationFields({ street: ' Storgatan 1 ', zipCode: '972 31', city: 'Luleå', latitude: '65.5', longitude: 22.1 })
  assert.deepEqual(fields, {
    placementStreet: 'Storgatan 1',
    placementZipCode: '972 31',
    placementCity: 'Luleå',
    placementLatitude: 65.5,
    placementLongitude: 22.1,
  })
  assert.deepEqual(getPlacement(fields), { street: 'Storgatan 1', zipCode: '972 31', city: 'Luleå', latitude: 65.5, longitude: 22.1 })

  const halfSet = placementToReservationFields({ street: 'x', latitude: 65.5, longitude: null })
  assert.equal(halfSet.placementLatitude, null)
  assert.equal(halfSet.placementLongitude, null)
})

test('modal prefills from the saved placement before the customer address', () => {
  const customer = { street1: 'Kundvägen 2', zipCode: '111 22', city: 'Boden' }
  assert.deepEqual(getInitialPlacement({}, customer), { street: 'Kundvägen 2', zipCode: '111 22', city: 'Boden', latitude: null, longitude: null })
  assert.equal(getInitialPlacement({ placementStreet: 'Plats 1' }, customer).street, 'Plats 1')
  assert.equal(getInitialPlacement({ placementLatitude: 65.5, placementLongitude: 22.1 }, customer).street, '')
  assert.deepEqual(getInitialPlacement(null, null), { street: '', zipCode: '', city: '', latitude: null, longitude: null })
})

test('directions url targets the exact coordinates and is empty without a pin', () => {
  assert.equal(
    buildDirectionsUrl(65.584819, 22.156703),
    'https://www.google.com/maps/dir/?api=1&destination=65.584819,22.156703&travelmode=driving',
  )
  assert.equal(buildDirectionsUrl(null, null), '')
  assert.equal(buildDirectionsUrl(95, 10), '')
})
