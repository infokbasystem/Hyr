import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  articlenr: 'ArticleNr',
  name: 'Name',
  price: 'Price',
  isactive: 'IsActive',
}

export async function searchArticles({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('SearchTerm', searchTerm.trim())
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [
      { field: 'articleNr', direction: 'asc' },
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'desc' },
    ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Name'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/article?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiArticle),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getArticleById(articleId) {
  const data = await requestJson(`/article/${articleId}`)
  return mapApiArticle(data)
}

export async function saveArticle(body) {
  const data = await requestJson('/article', {
    method: 'POST',
    body: toArticleDto(body),
  })

  return mapApiArticle(data)
}

export function deleteArticle(articleId) {
  return requestJson(`/article/${articleId}`, {
    method: 'DELETE',
  })
}

export async function getArticleFormOptions() {
  const data = await requestJson('/article/form-options')

  const accounts = Array.isArray(data?.accounts)
    ? data.accounts
    : (Array.isArray(data?.Accounts) ? data.Accounts : [])

  const vatRates = Array.isArray(data?.vatRates)
    ? data.vatRates
    : (Array.isArray(data?.VatRates) ? data.VatRates : [])

  return {
    accounts: accounts.map(mapApiAccountOption),
    vatRates: vatRates.map(mapApiVatRateOption),
  }
}

function mapApiArticle(entry) {
  return {
    id: normalizeId(entry?.id ?? entry?.Id),
    officeId: normalizeId(entry?.officeId ?? entry?.OfficeId),
    articleNr: `${entry?.articleNr ?? entry?.ArticleNr ?? ''}`,
    name: `${entry?.name ?? entry?.Name ?? ''}`,
    price: normalizeDecimal(entry?.price ?? entry?.Price),
    accountId: normalizeId(entry?.accountId ?? entry?.AccountId),
    vatRateId: normalizeId(entry?.vatRateId ?? entry?.VatRateId),
    isActive: Boolean(entry?.isActive ?? entry?.IsActive),
    calcPriceTypeCode: entry?.calcPriceTypeCode ?? entry?.CalcPriceTypeCode ?? null,
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeDecimal(value) {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toArticleDto(entry) {
  return {
    id: Number.isFinite(Number(entry?.id)) ? Number(entry.id) : 0,
    articleNr: `${entry?.articleNr ?? ''}`.trim(),
    name: `${entry?.name ?? ''}`.trim(),
    price: normalizeDecimal(entry?.price),
    accountId: Number.isFinite(Number(entry?.accountId)) ? Number(entry.accountId) : null,
    vatRateId: Number.isFinite(Number(entry?.vatRateId)) ? Number(entry.vatRateId) : null,
    isActive: Boolean(entry?.isActive),
  }
}

function mapApiAccountOption(entry) {
  return {
    id: normalizeId(entry?.id ?? entry?.Id),
    accountNr: normalizeInteger(entry?.accountNr ?? entry?.AccountNr),
    name: `${entry?.name ?? entry?.Name ?? ''}`,
  }
}

function mapApiVatRateOption(entry) {
  return {
    id: normalizeId(entry?.id ?? entry?.Id),
    name: `${entry?.name ?? entry?.Name ?? ''}`,
    rate: normalizeDecimal(entry?.rate ?? entry?.Rate),
  }
}

function normalizeInteger(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}