import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  itemnr: 'ItemNr',
  manufacturer: 'Manufacturer',
  regnr: 'RegNr',
  machinenr: 'MachineNr',
  itemtypename: 'ItemTypeCode',
  itemcategoryname: 'ItemCategoryName',
  itemmodelname: 'ItemModelName',
  isactive: 'IsActive',
  note: 'Note',
}

export async function getItemTypeOptions() {
  const data = await requestJson('/itemtype')
  const rows = Array.isArray(data) ? data : []

  return rows.map((itemType) => ({
    id: itemType?.id,
    code: itemType?.code ?? '',
    name: itemType?.name ?? '',
  }))
}

export async function searchItems({ conditions = [], sorts, pageNumber = 1, pageSize = 100 } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  const freeTextCondition = conditions.find((entry) => entry?.field === 'freetext' && entry?.operator === 'contains')
  if (typeof freeTextCondition?.value === 'string' && freeTextCondition.value.trim()) {
    query.set('SearchTerm', freeTextCondition.value.trim())
  }

  const itemTypeCondition = conditions.find((entry) => entry?.field === 'itemtypecode' && entry?.operator === 'eq')
  if (typeof itemTypeCondition?.value === 'string' && itemTypeCondition.value.trim()) {
    query.set('ItemTypeCode', itemTypeCondition.value.trim())
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

  const data = await requestJson(`/item?${query.toString()}`)
  const rows = Array.isArray(data?.data) ? data.data : []

  return {
    items: rows.map((item) => ({
      id: item?.id,
      itemNr: item?.itemNr,
      manufacturer: item?.manufacturer,
      regNr: item?.regNr,
      machineNr: item?.machineNr,
      itemTypeCode: item?.itemTypeCode,
      itemTypeName: item?.itemTypeName,
      itemCategoryName: item?.itemCategoryName,
      itemModelName: item?.itemModelName,
      isActive: Boolean(item?.isActive),
      isPartOfPackage: Boolean(item?.isPartOfPackage ?? item?.IsPartOfPackage),
      note: item?.note,
    })),
    totalCount: data?.totalRecords ?? 0,
    pageNumber: data?.page ?? pageNumber,
    pageSize: data?.pageSize ?? pageSize,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  }
}
