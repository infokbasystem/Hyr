import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  name: 'Name',
  organizationnr: 'OrganizationNr',
}

export async function searchInsuranceCompanies({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
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

  const data = await requestJson(`/insurancecompany?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiInsuranceCompany),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getInsuranceCompanyById(insuranceCompanyId) {
  const data = await requestJson(`/insurancecompany/${insuranceCompanyId}`)
  return mapApiInsuranceCompany(data)
}

export async function saveInsuranceCompany(body) {
  const data = await requestJson('/insurancecompany', {
    method: 'POST',
    body: toInsuranceCompanyDto(body),
  })

  return mapApiInsuranceCompany(data)
}

export function deleteInsuranceCompany(insuranceCompanyId) {
  return requestJson(`/insurancecompany/${insuranceCompanyId}`, {
    method: 'DELETE',
  })
}

function mapApiInsuranceCompany(entry) {
  return {
    id: normalizeId(entry?.id ?? entry?.Id),
    officeId: normalizeId(entry?.officeId ?? entry?.OfficeId),
    name: `${entry?.name ?? entry?.Name ?? ''}`,
    organizationNr: `${entry?.organizationNr ?? entry?.OrganizationNr ?? ''}`,
    contactPerson: `${entry?.contactPerson ?? entry?.ContactPerson ?? ''}`,
    telephone: `${entry?.telephone ?? entry?.Telephone ?? ''}`,
    email: `${entry?.email ?? entry?.Email ?? ''}`,
    street: `${entry?.street ?? entry?.Street ?? ''}`,
    zipCode: `${entry?.zipCode ?? entry?.ZipCode ?? ''}`,
    city: `${entry?.city ?? entry?.City ?? ''}`,
    country: `${entry?.country ?? entry?.Country ?? ''}`,
    paymentDays: normalizeOptionalInt(entry?.paymentDays ?? entry?.PaymentDays),
    keyFortnox: `${entry?.keyFortnox ?? entry?.KeyFortnox ?? ''}`,
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeOptionalInt(value) {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function toInsuranceCompanyDto(entry) {
  return {
    id: Number.isFinite(Number(entry?.id)) ? Number(entry.id) : 0,
    name: `${entry?.name ?? ''}`.trim(),
    organizationNr: `${entry?.organizationNr ?? ''}`.trim(),
    contactPerson: `${entry?.contactPerson ?? ''}`.trim(),
    telephone: `${entry?.telephone ?? ''}`.trim(),
    email: `${entry?.email ?? ''}`.trim(),
    street: `${entry?.street ?? ''}`.trim(),
    zipCode: `${entry?.zipCode ?? ''}`.trim(),
    city: `${entry?.city ?? ''}`.trim(),
    country: `${entry?.country ?? ''}`.trim(),
    paymentDays: toOptionalInt(entry?.paymentDays),
    keyFortnox: `${entry?.keyFortnox ?? ''}`.trim(),
  }
}

function toOptionalInt(value) {
  if (value == null || `${value}`.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}
