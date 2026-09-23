import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  accountnr: 'AccountNr',
  name: 'Name',
  isactive: 'IsActive',
}

export async function searchAccounts({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('SearchTerm', searchTerm.trim())
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [
      { field: 'accountNr', direction: 'asc' },
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'desc' },
    ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Name'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/account?${query.toString()}`)
  const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiAccount),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
  }
}

export async function getAccountById(accountId) {
  return mapApiAccount(await requestJson(`/account/${accountId}`))
}

export async function saveAccount(body) {
  return mapApiAccount(await requestJson('/account', {
    method: 'POST',
    body: {
      id: Number.isFinite(Number(body?.id)) ? Number(body.id) : 0,
      accountNr: toOptionalNumber(body?.accountNr),
      name: `${body?.name ?? ''}`.trim(),
      isActive: Boolean(body?.isActive),
    },
  }))
}

export function deleteAccount(accountId) {
  return requestJson(`/account/${accountId}`, { method: 'DELETE' })
}

function mapApiAccount(account) {
  return {
    id: normalizeId(account?.id ?? account?.Id),
    officeId: normalizeId(account?.officeId ?? account?.OfficeId),
    accountNr: toOptionalNumber(account?.accountNr ?? account?.AccountNr),
    systemCode: account?.systemCode ?? account?.SystemCode ?? null,
    name: `${account?.name ?? account?.Name ?? ''}`,
    isActive: Boolean(account?.isActive ?? account?.IsActive),
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toOptionalNumber(value) {
  if (value == null || `${value}`.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
