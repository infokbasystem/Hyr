import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  name: 'Name',
  rate: 'Rate',
  externalcode: 'ExternalCode',
  isactive: 'IsActive',
  isdefault: 'IsDefault',
}

export async function searchVatRates({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('SearchTerm', searchTerm.trim())
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [
      { field: 'isDefault', direction: 'desc' },
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'desc' },
    ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Name'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/vat?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiVatRate),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getVatRateById(vatId) {
  const data = await requestJson(`/vat/${vatId}`)
  return mapApiVatRate(data)
}

export async function saveVatRate(body) {
  const data = await requestJson('/vat', {
    method: 'POST',
    body: toVatRateDto(body),
  })

  return mapApiVatRate(data)
}

export function deleteVatRate(vatId) {
  return requestJson(`/vat/${vatId}`, {
    method: 'DELETE',
  })
}

function mapApiVatRate(vatRate) {
  return {
    id: normalizeId(vatRate?.id ?? vatRate?.Id),
    officeId: normalizeId(vatRate?.officeId ?? vatRate?.OfficeId),
    name: `${vatRate?.name ?? vatRate?.Name ?? ''}`,
    rate: normalizeOptionalNumber(vatRate?.rate ?? vatRate?.Rate),
    externalCode: `${vatRate?.externalCode ?? vatRate?.ExternalCode ?? ''}`,
    isActive: Boolean(vatRate?.isActive ?? vatRate?.IsActive),
    isDefault: Boolean(vatRate?.isDefault ?? vatRate?.IsDefault),
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeOptionalNumber(value) {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toVatRateDto(vatRate) {
  return {
    id: Number.isFinite(Number(vatRate?.id)) ? Number(vatRate.id) : 0,
    name: `${vatRate?.name ?? ''}`.trim(),
    rate: toOptionalNumber(vatRate?.rate),
    externalCode: `${vatRate?.externalCode ?? ''}`.trim(),
    isActive: Boolean(vatRate?.isActive),
    isDefault: Boolean(vatRate?.isDefault),
  }
}

function toOptionalNumber(value) {
  if (value == null || `${value}`.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}