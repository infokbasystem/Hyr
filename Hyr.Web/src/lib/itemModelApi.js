import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  name: 'Name',
}

export async function searchItemModels({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('SearchTerm', searchTerm.trim())
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'desc' },
    ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Name'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/itemmodel?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiItemModel),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getItemModelById(itemModelId) {
  const data = await requestJson(`/itemmodel/${itemModelId}`)
  return mapApiItemModel(data)
}

export async function saveItemModel(body) {
  const data = await requestJson('/itemmodel', {
    method: 'POST',
    body: toItemModelDto(body),
  })

  return mapApiItemModel(data)
}

export function deleteItemModel(itemModelId) {
  return requestJson(`/itemmodel/${itemModelId}`, {
    method: 'DELETE',
  })
}

function mapApiItemModel(itemModel) {
  return {
    id: normalizeId(itemModel?.id ?? itemModel?.Id),
    officeId: normalizeId(itemModel?.officeId ?? itemModel?.OfficeId),
    name: `${itemModel?.name ?? itemModel?.Name ?? ''}`,
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toItemModelDto(itemModel) {
  return {
    id: Number.isFinite(Number(itemModel?.id)) ? Number(itemModel.id) : 0,
    officeId: Number.isFinite(Number(itemModel?.officeId)) ? Number(itemModel.officeId) : null,
    name: `${itemModel?.name ?? ''}`.trim(),
  }
}
