import { requestJson } from './apiClient'
import { getSharedRequest } from './sharedRequest'

export async function getPlanningCategories() {
  const data = await getSharedRequest('planning-categories', () => requestJson('/planning/categories'))
  const rows = Array.isArray(data) ? data : []

  return rows.map((category) => ({
    id: category?.id,
    name: category?.name ?? '',
  }))
}

export async function getPlanningVehicles({ categoryIds = [], categoryName = '', modelName = '', availableFrom = '', availableTo = '' } = {}) {
  const query = new URLSearchParams()
  categoryIds
    .filter((id) => Number.isFinite(Number(id)))
    .forEach((id) => query.append('CategoryIds', `${id}`))

  if (categoryName) query.set('CategoryName', categoryName)
  if (modelName) query.set('ModelName', modelName)
  if (availableFrom && availableTo) {
    query.set('AvailableFrom', availableFrom)
    query.set('AvailableTo', availableTo)
  }

  const queryString = query.toString()
  const path = queryString ? `/planning/vehicles?${queryString}` : '/planning/vehicles'
  const data = await getSharedRequest(`planning-vehicles:${queryString}`, () => requestJson(path))
  const rows = Array.isArray(data) ? data : []

  return rows.map((vehicle) => ({
    id: vehicle?.id,
    regNr: vehicle?.regNr ?? '',
    itemNr: vehicle?.itemNr ?? '',
    categoryId: vehicle?.itemCategoryId ?? null,
    category: vehicle?.itemCategoryName ?? '',
    manufacturer: vehicle?.manufacturer ?? '',
    model: vehicle?.itemModelName ?? '',
  }))
}

export async function getPlanningItemTypes() {
  const data = await getSharedRequest('planning-item-types', () => requestJson('/itemtype'))
  const rows = Array.isArray(data) ? data : []

  return rows.map((itemType) => ({
    id: itemType?.id,
    code: String(itemType?.code ?? '').trim().toUpperCase(),
    name: itemType?.name ?? '',
  }))
}

export async function getPlanningCabinTypes() {
  const data = await getSharedRequest('planning-cabin-types', () => requestJson('/planning/cabin-types'))
  const rows = Array.isArray(data) ? data : []

  return rows.map((cabinType) => ({
    code: cabinType?.code ?? '',
    name: cabinType?.name ?? '',
  }))
}

export async function getPlanningCabins({ cabinTypeCodes = [], availableFrom = '', availableTo = '' } = {}) {
  const query = new URLSearchParams()
  cabinTypeCodes
    .filter(Boolean)
    .forEach((code) => query.append('CabinTypeCodes', code))

  if (availableFrom && availableTo) {
    query.set('AvailableFrom', availableFrom)
    query.set('AvailableTo', availableTo)
  }

  const queryString = query.toString()
  const path = queryString ? `/planning/cabins?${queryString}` : '/planning/cabins'
  const data = await getSharedRequest(`planning-cabins:${queryString}`, () => requestJson(path))
  const rows = Array.isArray(data) ? data : []

  return rows.map((cabin) => ({
    id: cabin?.id,
    itemNr: cabin?.itemNr ?? '',
    serialNr: cabin?.serialNr ?? '',
    cabinTypeCode: cabin?.cabinTypeCode ?? '',
    cabinTypeName: cabin?.cabinTypeName ?? '',
    categoryId: cabin?.itemCategoryId ?? null,
    category: cabin?.itemCategoryName ?? '',
    manufacturer: cabin?.manufacturer ?? '',
    model: cabin?.itemModelName ?? '',
  }))
}

export async function getPlanningReservations({ categoryIds = [], vehicleIds = [], itemTypeCode = '', cabinTypeCodes = [], from = '', to = '' } = {}) {
  const query = new URLSearchParams()
  categoryIds
    .filter((id) => Number.isFinite(Number(id)))
    .forEach((id) => query.append('CategoryIds', `${id}`))
  vehicleIds
    .filter((id) => Number.isFinite(Number(id)))
    .forEach((id) => query.append('VehicleIds', `${id}`))
  cabinTypeCodes
    .filter(Boolean)
    .forEach((code) => query.append('CabinTypeCodes', code))

  if (itemTypeCode) query.set('ItemTypeCode', itemTypeCode)
  if (from) query.set('From', from)
  if (to) query.set('To', to)

  const queryString = query.toString()
  const path = queryString ? `/planning/reservations?${queryString}` : '/planning/reservations'
  const data = await getSharedRequest(`planning-reservations:${queryString}`, () => requestJson(path))
  const rows = Array.isArray(data) ? data : []

  return rows.map((reservation) => ({
    id: reservation?.id,
    reservationId: reservation?.reservationId ?? reservation?.id ?? null,
    carId: reservation?.vehicleId,
    reservationNr: reservation?.reservationNr ?? null,
    customer: reservation?.customer ?? '',
    deliveryPlace: reservation?.deliveryPlace ?? '',
    start: reservation?.start,
    end: reservation?.end,
    status: reservation?.status ?? 'booked',
  }))
}

export function updatePlanningReservation(reservationItemId, body) {
  return requestJson(`/planning/reservations/${reservationItemId}`, {
    method: 'PUT',
    body,
  })
}
