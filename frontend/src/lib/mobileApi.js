import { requestJson } from './apiClient'

export const MOBILE_ITEM_ACTIONS = {
  DELIVER: 'deliver',
  RETURN: 'return',
  CHECK_IN: 'checkin',
}

export function getAvailableItems({ from, to, itemTypeCode, searchTerm } = {}) {
  const query = new URLSearchParams()
  if (from) query.set('From', from)
  if (to) query.set('To', to)
  if (itemTypeCode) query.set('ItemTypeCode', itemTypeCode)
  if (searchTerm?.trim()) query.set('SearchTerm', searchTerm.trim())

  const suffix = query.toString()
  return requestJson(`/mobile/available-items${suffix ? `?${suffix}` : ''}`)
}

export function updateReservationItemStatus(reservationId, { action, reservationItemIds, at }) {
  return requestJson(`/mobile/reservations/${reservationId}/item-status`, {
    method: 'POST',
    body: { action, reservationItemIds, at },
  })
}
