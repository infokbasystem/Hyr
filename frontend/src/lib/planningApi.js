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

export async function getPlanningReservations({ vehicleIds = [], from = '', to = '' } = {}) {
  const query = new URLSearchParams()
  vehicleIds
    .filter((id) => Number.isFinite(Number(id)))
    .forEach((id) => query.append('VehicleIds', `${id}`))

  if (from) query.set('From', from)
  if (to) query.set('To', to)

  const queryString = query.toString()
  const path = queryString ? `/planning/reservations?${queryString}` : '/planning/reservations'
  const data = await requestJson(path)
  const rows = Array.isArray(data) ? data : []

  return rows.map((reservation) => ({
    id: reservation?.id,
    reservationId: reservation?.reservationId ?? reservation?.id ?? null,
    carId: reservation?.vehicleId,
    reservationNr: reservation?.reservationNr ?? null,
    customer: reservation?.customer ?? '',
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
