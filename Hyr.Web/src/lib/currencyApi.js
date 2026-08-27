import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  currencyname: 'CurrencyName',
  keyfortnox: 'KeyFortnox',
  isdefault: 'IsDefault',
}

export async function searchCurrencies({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
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
        { field: 'currencyName', direction: 'asc' },
        { field: 'id', direction: 'desc' },
      ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'CurrencyName'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/currency?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiCurrency),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getCurrencyById(currencyId) {
  const data = await requestJson(`/currency/${currencyId}`)
  return mapApiCurrency(data)
}

export async function saveCurrency(body) {
  const data = await requestJson('/currency', {
    method: 'POST',
    body: toCurrencyDto(body),
  })

  return mapApiCurrency(data)
}

export function deleteCurrency(currencyId) {
  return requestJson(`/currency/${currencyId}`, {
    method: 'DELETE',
  })
}

function mapApiCurrency(currency) {
  return {
    id: normalizeId(currency?.id ?? currency?.Id),
    officeId: normalizeId(currency?.officeId ?? currency?.OfficeId),
    currencyName: `${currency?.currencyName ?? currency?.CurrencyName ?? ''}`,
    purchaseCurrencyRate: normalizeOptionalNumber(currency?.purchaseCurrencyRate ?? currency?.PurchaseCurrencyRate),
    salesCurrencyRate: normalizeOptionalNumber(currency?.salesCurrencyRate ?? currency?.SalesCurrencyRate),
    keyFortnox: `${currency?.keyFortnox ?? currency?.KeyFortnox ?? ''}`,
    isDefault: Boolean(currency?.isDefault ?? currency?.IsDefault),
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

function toCurrencyDto(currency) {
  return {
    id: Number.isFinite(Number(currency?.id)) ? Number(currency.id) : 0,
    currencyName: `${currency?.currencyName ?? ''}`.trim(),
    purchaseCurrencyRate: toOptionalNumber(currency?.purchaseCurrencyRate),
    salesCurrencyRate: toOptionalNumber(currency?.salesCurrencyRate),
    keyFortnox: `${currency?.keyFortnox ?? ''}`.trim(),
    isDefault: Boolean(currency?.isDefault),
  }
}

function toOptionalNumber(value) {
  if (value == null || `${value}`.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}