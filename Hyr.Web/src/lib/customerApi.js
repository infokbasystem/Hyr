import { requestJson } from './apiClient'

export function getCustomerById(customerId) {
  return requestJson(`/customer/${customerId}`)
}

export function createCustomer(body) {
  return requestJson('/customer', {
    method: 'POST',
    body,
  })
}

export function updateCustomer(customerId, body) {
  return requestJson(`/customer/${customerId}`, {
    method: 'PUT',
    body,
  })
}
