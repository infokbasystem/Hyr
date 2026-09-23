import { requestJson } from './apiClient'

export async function searchItemPricing({ searchTerm = '', pageNumber = 1, pageSize = 200 } = {}) {
  const query = new URLSearchParams()
  query.set('page', `${pageNumber}`)
  query.set('pageSize', `${pageSize}`)

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('searchTerm', searchTerm.trim())
  }

  const data = await requestJson(`/pricing/items?${query.toString()}`)
  const rows = Array.isArray(data?.data) ? data.data : []

  return {
    items: rows.map((item) => ({
      id: item?.id ?? null,
      itemNr: item?.itemNr ?? '',
      manufacturer: item?.manufacturer ?? '',
      regNr: item?.regNr ?? '',
      machineNr: item?.machineNr ?? '',
      basePrice: item?.basePrice ?? null,
      pricePerHour: item?.pricePerHour ?? null,
      pricePerDay: item?.pricePerDay ?? null,
      pricePerWeek: item?.pricePerWeek ?? null,
      pricePerMonth: item?.pricePerMonth ?? null,
      pricePerKm: item?.pricePerKm ?? null,
    })),
    totalCount: data?.totalRecords ?? 0,
    pageNumber: data?.page ?? pageNumber,
    pageSize: data?.pageSize ?? pageSize,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  }
}

export async function getPricingFormOptions() {
  const data = await requestJson('/reservation/form-options')

  return {
    priceLists: Array.isArray(data?.priceLists)
      ? data.priceLists.map((entry) => ({
        id: entry?.id,
        name: entry?.name ?? '',
      }))
      : [],
    itemCategories: Array.isArray(data?.itemCategories)
      ? data.itemCategories.map((entry) => ({
        id: entry?.id,
        name: entry?.name ?? '',
      }))
      : [],
  }
}

export async function getCategoryDayPricing({ priceListId, itemCategoryId }) {
  const query = new URLSearchParams()
  query.set('priceListId', `${priceListId}`)
  query.set('itemCategoryId', `${itemCategoryId}`)

  const data = await requestJson(`/pricing/category-day?${query.toString()}`)

  return {
    priceListId: data?.priceListId ?? null,
    itemCategoryId: data?.itemCategoryId ?? null,
    pricePerDay: data?.pricePerDay ?? null,
    pricePerKm: data?.pricePerKm ?? null,
    freeKmPricePerDay: data?.freeKmPricePerDay ?? null,
  }
}

function normalizeTimeValue(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function normalizeCategoryPricingSection(section = {}) {
  return {
    ...section,
    fromTime: normalizeTimeValue(section.fromTime),
    toTime: normalizeTimeValue(section.toTime),
  }
}

export async function getCategoryPricing({ priceListId, itemCategoryId }) {
  const query = new URLSearchParams()
  query.set('priceListId', `${priceListId}`)
  query.set('itemCategoryId', `${itemCategoryId}`)

  const data = await requestJson(`/pricing/category-pricing?${query.toString()}`)

  return {
    priceListId: data?.priceListId ?? null,
    itemCategoryId: data?.itemCategoryId ?? null,
    day: normalizeCategoryPricingSection(data?.day),
    dayFreeKm: normalizeCategoryPricingSection(data?.dayFreeKm),
    weekIncludedKm: normalizeCategoryPricingSection(data?.weekIncludedKm),
    weekFreeKm: normalizeCategoryPricingSection(data?.weekFreeKm),
    thirtyDayIncludedKm: normalizeCategoryPricingSection(data?.thirtyDayIncludedKm),
    weekend: normalizeCategoryPricingSection(data?.weekend),
    weekendIncludedKm: normalizeCategoryPricingSection(data?.weekendIncludedKm),
    weekendFreeKm: normalizeCategoryPricingSection(data?.weekendFreeKm),
    hourIncludedKm: normalizeCategoryPricingSection(data?.hourIncludedKm),
    service: normalizeCategoryPricingSection(data?.service),
    guarantee: normalizeCategoryPricingSection(data?.guarantee),
  }
}

export async function saveCategoryPricing(categoryPricing) {
  const data = await requestJson('/pricing/category-pricing', {
    method: 'PUT',
    body: categoryPricing,
  })

  return {
    priceListId: data?.priceListId ?? null,
    itemCategoryId: data?.itemCategoryId ?? null,
    day: normalizeCategoryPricingSection(data?.day),
    dayFreeKm: normalizeCategoryPricingSection(data?.dayFreeKm),
    weekIncludedKm: normalizeCategoryPricingSection(data?.weekIncludedKm),
    weekFreeKm: normalizeCategoryPricingSection(data?.weekFreeKm),
    thirtyDayIncludedKm: normalizeCategoryPricingSection(data?.thirtyDayIncludedKm),
    weekend: normalizeCategoryPricingSection(data?.weekend),
    weekendIncludedKm: normalizeCategoryPricingSection(data?.weekendIncludedKm),
    weekendFreeKm: normalizeCategoryPricingSection(data?.weekendFreeKm),
    hourIncludedKm: normalizeCategoryPricingSection(data?.hourIncludedKm),
    service: normalizeCategoryPricingSection(data?.service),
    guarantee: normalizeCategoryPricingSection(data?.guarantee),
  }
}

export async function savePriceLists(priceLists) {
  const data = await requestJson('/pricing/price-lists', {
    method: 'PUT',
    body: {
      priceLists: Array.isArray(priceLists)
        ? priceLists.map((entry) => {
          const numericId = Number(entry?.id)

          return {
            id: Number.isInteger(numericId) && numericId > 0 ? numericId : null,
            name: entry?.name ?? '',
          }
        })
        : [],
    },
  })

  return Array.isArray(data)
    ? data.map((entry) => ({
      id: entry?.id ?? null,
      name: entry?.name ?? '',
    }))
    : []
}
