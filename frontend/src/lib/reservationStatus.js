export const RESERVATION_STATUS_LABELS = {
  BOOKED: 'Bokad',
  ACTIVE: 'Aktiv',
  RETURNED: 'Återlämnad',
  FINISHED: 'Avslutad',
}

export const RESERVATION_STATUS_PILL_CLASSES = {
  BOOKED: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  RETURNED: 'bg-violet-100 text-violet-800',
  FINISHED: 'bg-emerald-100 text-emerald-800',
}

export function getReservationStatusLabel(statusCode) {
  return RESERVATION_STATUS_LABELS[statusCode] ?? statusCode ?? ''
}

export function getReservationStatusPillClass(statusCode) {
  return RESERVATION_STATUS_PILL_CLASSES[statusCode] ?? 'bg-gray-100 text-gray-700'
}
