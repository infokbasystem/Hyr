import { requestJson } from './apiClient'

export function searchAddresses({ street = '', zipCode = '', city = '', query = '' } = {}) {
  const params = new URLSearchParams()
  const entries = { street, zipCode, city, q: query }
  for (const [key, value] of Object.entries(entries)) {
    const trimmed = String(value ?? '').trim()
    if (trimmed) params.set(key, trimmed)
  }
  return requestJson(`/geocoding/search?${params.toString()}`)
}
