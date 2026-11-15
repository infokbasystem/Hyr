const COORDINATE_DECIMALS = 6

export const EMPTY_PLACEMENT = Object.freeze({
  street: '',
  zipCode: '',
  city: '',
  latitude: null,
  longitude: null,
})

// Default map view (Sweden) used when there is neither a pin nor an address to search for.
export const DEFAULT_MAP_CENTER = Object.freeze({ latitude: 62.0, longitude: 15.0, zoom: 5 })

const clean = (value) => String(value ?? '').trim()

export function toCoordinate(value) {
  if (value === null || value === undefined || clean(value) === '') return null
  const number = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(number)) return null
  return Number(number.toFixed(COORDINATE_DECIMALS))
}

export function isValidCoordinatePair(latitude, longitude) {
  const lat = toCoordinate(latitude)
  const lng = toCoordinate(longitude)
  return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function hasPlacementCoordinates(reservation) {
  return isValidCoordinatePair(reservation?.placementLatitude, reservation?.placementLongitude)
}

export function formatPlacementAddress({ street, zipCode, city } = {}) {
  const cityLine = [clean(zipCode), clean(city)].filter(Boolean).join(' ')
  return [clean(street), cityLine].filter(Boolean).join(', ')
}

export function formatCoordinates(latitude, longitude) {
  if (!isValidCoordinatePair(latitude, longitude)) return ''
  return `${toCoordinate(latitude).toFixed(5)}, ${toCoordinate(longitude).toFixed(5)}`
}

export function getPlacement(reservation) {
  const hasCoordinates = hasPlacementCoordinates(reservation)
  return {
    street: clean(reservation?.placementStreet),
    zipCode: clean(reservation?.placementZipCode),
    city: clean(reservation?.placementCity),
    latitude: hasCoordinates ? toCoordinate(reservation.placementLatitude) : null,
    longitude: hasCoordinates ? toCoordinate(reservation.placementLongitude) : null,
  }
}

export function placementToReservationFields(placement) {
  const hasCoordinates = isValidCoordinatePair(placement?.latitude, placement?.longitude)
  return {
    placementStreet: clean(placement?.street),
    placementZipCode: clean(placement?.zipCode),
    placementCity: clean(placement?.city),
    placementLatitude: hasCoordinates ? toCoordinate(placement.latitude) : null,
    placementLongitude: hasCoordinates ? toCoordinate(placement.longitude) : null,
  }
}

export function customerToPlacementAddress(customer) {
  return {
    street: clean(customer?.street1),
    zipCode: clean(customer?.zipCode),
    city: clean(customer?.city),
  }
}

/** Address to prefill the modal with: the saved placement first, then the customer's address. */
export function getInitialPlacement(reservation, customer) {
  const saved = getPlacement(reservation)
  if (saved.latitude !== null || formatPlacementAddress(saved)) return saved
  return { ...EMPTY_PLACEMENT, ...customerToPlacementAddress(customer) }
}

export function buildDirectionsUrl(latitude, longitude) {
  if (!isValidCoordinatePair(latitude, longitude)) return ''
  const destination = `${toCoordinate(latitude)},${toCoordinate(longitude)}`
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
}
