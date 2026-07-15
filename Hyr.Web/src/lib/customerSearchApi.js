import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  customernr: 'CustomerNr',
  customername: 'CustomerName',
  postaladdress: 'City',
  mobilephone: 'MobilePhone',
  email: 'Email',
  isactive: 'IsActive',
  note: 'Note',
}

export async function searchCustomers({ conditions = [], sorts, pageNumber = 1, pageSize = 100 } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  const freeTextCondition = conditions.find((entry) => entry?.field === 'freetext' && entry?.operator === 'contains')
  if (typeof freeTextCondition?.value === 'string' && freeTextCondition.value.trim()) {
    query.set('SearchTerm', freeTextCondition.value.trim())
  }

  const standardSearchCondition = conditions.find((entry) => entry?.field === 'standardsearch' && entry?.operator === 'eq')
  if (standardSearchCondition?.value === 'all-with-email' && !query.has('SearchTerm')) {
    query.set('SearchTerm', '@')
  }

  const activeCondition = conditions.find((entry) => entry?.field === 'isactive' && entry?.operator === 'eq')
  if (typeof activeCondition?.value === 'boolean') {
    query.set('IsActive', `${activeCondition.value}`)
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [{ field: 'id', direction: 'desc' }]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Id'
    const direction = `${sortEntry?.direction ?? 'desc'}`.toLowerCase() === 'asc' ? 'asc' : 'desc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/customer?${query.toString()}`)
  const rows = Array.isArray(data?.data) ? data.data : []

  return {
    items: rows.map((customer) => ({
      id: customer?.id,
      customerNr: customer?.customerNr,
      customerName: customer?.customerName,
      postalAddress: customer?.city,
      mobilePhone: customer?.mobilePhone,
      email: customer?.email,
      isActive: Boolean(customer?.isActive),
      note: customer?.note,
    })),
    totalCount: data?.totalRecords ?? 0,
    pageNumber: data?.page ?? pageNumber,
    pageSize: data?.pageSize ?? pageSize,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  }
}