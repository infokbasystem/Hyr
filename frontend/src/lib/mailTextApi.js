import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  officeid: 'OfficeId',
  item: 'Item',
  subject: 'Subject',
}

export async function searchMailTexts({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
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

  const data = await requestJson(`/mailtext?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiMailText),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getMailTextById(mailTextId) {
  const data = await requestJson(`/mailtext/${mailTextId}`)
  return mapApiMailText(data)
}

export async function saveMailText(body) {
  const data = await requestJson('/mailtext', {
    method: 'POST',
    body: toMailTextDto(body),
  })

  return mapApiMailText(data)
}

export function deleteMailText(mailTextId) {
  return requestJson(`/mailtext/${mailTextId}`, {
    method: 'DELETE',
  })
}

function mapApiMailText(mailText) {
  return {
    id: normalizeId(mailText?.id ?? mailText?.Id),
    officeId: normalizeId(mailText?.officeId ?? mailText?.OfficeId),
    item: `${mailText?.item ?? mailText?.Item ?? ''}`,
    subject: `${mailText?.subject ?? mailText?.Subject ?? ''}`,
    bodyHtml: `${mailText?.bodyHtml ?? mailText?.BodyHtml ?? ''}`,
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toMailTextDto(mailText) {
  return {
    id: Number.isFinite(Number(mailText?.id)) ? Number(mailText.id) : 0,
    item: `${mailText?.item ?? ''}`.trim(),
    subject: `${mailText?.subject ?? ''}`.trim(),
    bodyHtml: `${mailText?.bodyHtml ?? ''}`,
  }
}
