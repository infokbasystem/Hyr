import { requestJson } from './apiClient'
import { getSharedRequest } from './sharedRequest'

export function getFinanceWeeklyOverview(weeks = 15, weekOffset = 0) {
  const safeWeeks = Math.max(1, Math.min(52, Number(weeks) || 15))
  const safeWeekOffset = Math.max(0, Number(weekOffset) || 0)
  const path = `/finance/overview/weekly?weeks=${safeWeeks}&weekOffset=${safeWeekOffset}`
  return getSharedRequest(`finance-weekly:${safeWeeks}:${safeWeekOffset}`, () => requestJson(path))
}

export function getFinanceOutstandingOverview() {
  return getSharedRequest('finance-outstanding', () => requestJson('/finance/overview/outstanding'))
}

export function getFinanceOverdueInvoicesPage(pageNumber = 1, pageSize = 20) {
  const safePageNumber = Math.max(1, Number(pageNumber) || 1)
  const safePageSize = Math.max(1, Math.min(200, Number(pageSize) || 20))
  const path = `/finance/overview/overdue?pageNumber=${safePageNumber}&pageSize=${safePageSize}`
  return getSharedRequest(`finance-overdue:${safePageNumber}:${safePageSize}`, () => requestJson(path))
}
