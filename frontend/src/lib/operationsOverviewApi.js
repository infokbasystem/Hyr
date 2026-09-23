import { requestJson } from './apiClient'
import { getSharedRequest } from './sharedRequest'

export function getOperationsOverview() {
  return getSharedRequest('operations-overview', () => requestJson('/operations/overview'))
}
