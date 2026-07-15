import { requestJson } from './apiClient'

export function searchReservations({ conditions = [], sorts, pageNumber = 1, pageSize = 100 } = {}) {
  return requestJson('/reservation/search', {
    method: 'POST',
    body: {
      filter: {
        conditions,
      },
      pagination: {
        pageNumber,
        pageSize,
      },
      sorts: sorts ?? [
        {
          field: 'id',
          direction: 'desc',
        },
      ],
    },
  })
}

export function getReservationById(reservationId) {
  return requestJson(`/reservation/${reservationId}`)
}

export function getReservationFormOptions() {
  return requestJson('/reservation/form-options')
}

export function updateReservation(reservationId, body) {
  return requestJson(`/reservation/${reservationId}`, {
    method: 'PUT',
    body,
  })
}

export function deleteReservation(reservationId) {
  return requestJson(`/reservation/${reservationId}`, {
    method: 'DELETE',
  })
}

export function getReservationActivityLog(reservationId) {
  return requestJson(`/reservation/${reservationId}/activity-log`)
}
