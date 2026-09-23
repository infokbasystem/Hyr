import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  servicecode: 'ServiceCode',
  name: 'Name',
}

export async function searchServiceTypes({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('SearchTerm', searchTerm.trim())
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [
      { field: 'serviceCode', direction: 'asc' },
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'desc' },
    ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Name'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/servicetype?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiServiceType),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getServiceTypeById(serviceTypeId) {
  const data = await requestJson(`/servicetype/${serviceTypeId}`)
  return mapApiServiceType(data)
}

export async function saveServiceType(body) {
  const data = await requestJson('/servicetype', {
    method: 'POST',
    body: toServiceTypeDto(body),
  })

  return mapApiServiceType(data)
}

export function deleteServiceType(serviceTypeId) {
  return requestJson(`/servicetype/${serviceTypeId}`, {
    method: 'DELETE',
  })
}

function mapApiServiceType(entry) {
  return {
    id: normalizeId(entry?.id ?? entry?.Id),
    officeId: normalizeId(entry?.officeId ?? entry?.OfficeId),
    serviceCode: `${entry?.serviceCode ?? entry?.ServiceCode ?? ''}`,
    name: `${entry?.name ?? entry?.Name ?? ''}`,
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toServiceTypeDto(entry) {
  return {
    id: Number.isFinite(Number(entry?.id)) ? Number(entry.id) : 0,
    serviceCode: `${entry?.serviceCode ?? ''}`.trim(),
    name: `${entry?.name ?? ''}`.trim(),
  }
}