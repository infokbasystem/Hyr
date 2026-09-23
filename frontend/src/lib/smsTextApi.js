import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  officeid: 'OfficeId',
  item: 'Item',
  titel: 'Titel',
}

export async function searchSmsTexts({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('SearchTerm', searchTerm.trim())
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [
      { field: 'item', direction: 'asc' },
      { field: 'id', direction: 'asc' },
    ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Item'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/smstext?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiSmsText),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getSmsTextById(smsTextId) {
  const data = await requestJson(`/smstext/${smsTextId}`)
  return mapApiSmsText(data)
}

export async function saveSmsText(body) {
  const data = await requestJson('/smstext', {
    method: 'POST',
    body: toSmsTextDto(body),
  })

  return mapApiSmsText(data)
}

export function deleteSmsText(smsTextId) {
  return requestJson(`/smstext/${smsTextId}`, {
    method: 'DELETE',
  })
}

function mapApiSmsText(smsText) {
  return {
    id: normalizeId(smsText?.id ?? smsText?.Id),
    officeId: normalizeId(smsText?.officeId ?? smsText?.OfficeId),
    item: `${smsText?.item ?? smsText?.Item ?? ''}`,
    titel: `${smsText?.titel ?? smsText?.Titel ?? ''}`,
    text: `${smsText?.text ?? smsText?.Text ?? ''}`,
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toSmsTextDto(smsText) {
  return {
    id: Number.isFinite(Number(smsText?.id)) ? Number(smsText.id) : 0,
    item: `${smsText?.item ?? ''}`.trim(),
    titel: `${smsText?.titel ?? ''}`.trim(),
    text: `${smsText?.text ?? ''}`,
  }
}
