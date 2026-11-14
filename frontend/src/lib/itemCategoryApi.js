import { requestJson } from './apiClient'

const SORT_FIELD_TO_API_FIELD = {
  id: 'Id',
  name: 'Name',
  sortorder: 'SortOrder',
}

export async function searchItemCategories({ searchTerm = '', pageNumber = 1, pageSize = 200, sorts } = {}) {
  const query = new URLSearchParams()
  query.set('Page', `${pageNumber}`)
  query.set('PageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('SearchTerm', searchTerm.trim())
  }

  const appliedSorts = Array.isArray(sorts) && sorts.length > 0
    ? sorts
    : [
      { field: 'sortorder', direction: 'asc' },
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'desc' },
    ]

  appliedSorts.forEach((sortEntry) => {
    const apiField = SORT_FIELD_TO_API_FIELD[`${sortEntry?.field ?? ''}`.toLowerCase()] ?? 'Name'
    const direction = `${sortEntry?.direction ?? 'asc'}`.toLowerCase() === 'desc' ? 'desc' : 'asc'
    query.append('SortBy', `${apiField}:${direction}`)
  })

  const data = await requestJson(`/itemcategory?${query.toString()}`)
  const rows = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.Data) ? data.Data : [])

  return {
    items: rows.map(mapApiItemCategory),
    totalCount: data?.totalRecords ?? data?.TotalRecords ?? 0,
    pageNumber: data?.page ?? data?.Page ?? pageNumber,
    pageSize: data?.pageSize ?? data?.PageSize ?? pageSize,
    totalPages: data?.totalPages ?? data?.TotalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage ?? data?.HasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage ?? data?.HasNextPage),
  }
}

export async function getItemCategoryById(itemCategoryId) {
  const data = await requestJson(`/itemcategory/${itemCategoryId}`)
  return mapApiItemCategory(data)
}

export async function getItemCategoryFormOptions() {
  const data = await requestJson('/itemcategory/form-options')
  const articles = data?.articles ?? data?.Articles ?? []

  return {
    articles: articles.map((article) => ({
      id: article.id ?? article.Id,
      articleNr: article.articleNr ?? article.ArticleNr ?? '',
      name: article.name ?? article.Name ?? '',
      isActive: Boolean(article.isActive ?? article.IsActive),
      price: article.price ?? article.Price ?? null,
    })),
  }
}

export async function saveItemCategory(body) {
  const data = await requestJson('/itemcategory', {
    method: 'POST',
    body: toItemCategoryDto(body),
  })

  return mapApiItemCategory(data)
}

export function deleteItemCategory(itemCategoryId) {
  return requestJson(`/itemcategory/${itemCategoryId}`, {
    method: 'DELETE',
  })
}

function mapApiItemCategory(itemCategory) {
  return {
    id: normalizeId(itemCategory?.id ?? itemCategory?.Id),
    officeId: normalizeId(itemCategory?.officeId ?? itemCategory?.OfficeId),
    name: `${itemCategory?.name ?? itemCategory?.Name ?? ''}`,
    sortOrder: Number(itemCategory?.sortOrder ?? itemCategory?.SortOrder) || 0,
    articleIds: itemCategory?.articleIds ?? itemCategory?.ArticleIds ?? [],
    articles: (itemCategory?.articles ?? itemCategory?.Articles
      ?? (itemCategory?.articleIds ?? itemCategory?.ArticleIds ?? []).map((articleId) => ({ articleId, quantity: 1 })))
      .map((article) => ({
        articleId: article.articleId ?? article.ArticleId,
        quantity: article.quantity ?? article.Quantity,
      })),
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function toItemCategoryDto(itemCategory) {
  return {
    id: Number.isFinite(Number(itemCategory?.id)) ? Number(itemCategory.id) : 0,
    officeId: Number.isFinite(Number(itemCategory?.officeId)) ? Number(itemCategory.officeId) : null,
    name: `${itemCategory?.name ?? ''}`.trim(),
    sortOrder: Number.isFinite(Number(itemCategory?.sortOrder)) ? Number(itemCategory.sortOrder) : 0,
    articleIds: itemCategory?.articleIds,
    articles: itemCategory?.articles?.map((article) => ({
      articleId: article.articleId,
      quantity: article.quantity,
    })),
  }
}