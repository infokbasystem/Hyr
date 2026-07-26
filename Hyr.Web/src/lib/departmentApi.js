import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  name: 'Name',
}

export async function searchDepartments({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
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

  const data = await requestJson(`/department?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiDepartment),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getDepartmentById(departmentId) {
  const data = await requestJson(`/department/${departmentId}`)
  return mapApiDepartment(data)
}

export async function saveDepartment(body) {
  const data = await requestJson('/department', {
    method: 'POST',
    body: toDepartmentDto(body),
  })

  return mapApiDepartment(data)
}

export function deleteDepartment(departmentId) {
  return requestJson(`/department/${departmentId}`, {
    method: 'DELETE',
  })
}

function mapApiDepartment(department) {
  return {
    id: normalizeId(department?.id ?? department?.Id),
    officeId: normalizeId(department?.officeId ?? department?.OfficeId),
    name: `${department?.name ?? department?.Name ?? ''}`,
    isActive: Boolean(department?.isActive ?? department?.IsActive),
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toDepartmentDto(department) {
  return {
    id: Number.isFinite(Number(department?.id)) ? Number(department.id) : 0,
    officeId: Number.isFinite(Number(department?.officeId)) ? Number(department.officeId) : null,
    name: `${department?.name ?? ''}`.trim(),
    isActive: Boolean(department?.isActive),
  }
}