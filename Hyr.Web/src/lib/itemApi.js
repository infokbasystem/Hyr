import { requestJson } from './apiClient'

export function getItemById(itemId) {
  return requestJson(`/item/${itemId}`)
}

export function createItem(body) {
  return requestJson('/item', {
    method: 'POST',
    body: toItemUpsertDto(body),
  })
}

export function updateItem(itemId, body) {
  return requestJson(`/item/${itemId}`, {
    method: 'PUT',
    body: toItemUpsertDto(body),
  })
}

export function updateItemType(itemId, itemTypeCode) {
  return requestJson(`/item/${itemId}/type`, {
    method: 'PUT',
    body: {
      itemTypeCode,
    },
  })
}

export async function getItemPackageItems(itemId) {
  const data = await requestJson(`/item/${itemId}/package-items`)

  const mapOption = (item) => ({
    id: item?.id,
    itemNr: item?.itemNr ?? '',
    manufacturer: item?.manufacturer ?? '',
    serialNr: item?.serialNr ?? '',
    quantity: Number.isFinite(Number(item?.quantity)) && Number(item?.quantity) > 0 ? Number(item?.quantity) : 1,
  })

  return {
    availablePackageItems: Array.isArray(data?.availablePackageItems)
      ? data.availablePackageItems.map(mapOption)
      : [],
    connectedPackageItems: Array.isArray(data?.connectedPackageItems)
      ? data.connectedPackageItems.map(mapOption)
      : [],
  }
}

export async function getItemFormOptions() {
  const data = await requestJson('/item/form-options')

  return {
    itemTypeOptions: Array.isArray(data?.itemTypes)
      ? data.itemTypes.map((itemType) => ({
        id: itemType?.id,
        code: itemType?.code ?? '',
        name: itemType?.name ?? '',
      }))
      : [],
    itemCategoryOptions: Array.isArray(data?.itemCategories)
      ? data.itemCategories.map((itemCategory) => ({
        id: itemCategory?.id,
        name: itemCategory?.name ?? '',
      }))
      : [],
    itemModelOptions: Array.isArray(data?.itemModels)
      ? data.itemModels.map((itemModel) => ({
        id: itemModel?.id,
        name: itemModel?.name ?? '',
      }))
      : [],
  }
}

function toItemUpsertDto(item) {
  const packageItems = Array.isArray(item?.packageItems)
    ? item.packageItems
      .map((entry) => ({
        packageItemId: Number(entry?.packageItemId),
        quantity: Number(entry?.quantity),
      }))
      .filter((entry) => Number.isInteger(entry.packageItemId) && entry.packageItemId > 0)
      .map((entry) => ({
        packageItemId: entry.packageItemId,
        quantity: Number.isFinite(entry.quantity) && entry.quantity > 0 ? entry.quantity : 1,
      }))
    : []

  const packageItemIds = Array.isArray(item?.packageItemIds)
    ? item.packageItemIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : []

  return {
    itemTypeCode: item?.itemTypeCode ?? '',
    itemCategoryId: item?.itemCategoryId ?? null,
    itemModelId: item?.itemModelId ?? null,
    regNr: item?.regNr ?? '',
    machineNr: item?.machineNr ?? '',
    serialNr: item?.serialNr ?? '',
    yearModel: item?.yearModel ?? '',
    fuel: item?.fuel ?? '',
    equipment: item?.equipment ?? '',
    note: item?.note ?? '',
    itemNr: item?.itemNr ?? '',
    popupText: item?.popupText ?? '',
    isActive: Boolean(item?.isActive),
    manufacturer: item?.manufacturer ?? '',
    articleNr: item?.articleNr ?? '',
    isStorageItem: Boolean(item?.isStorageItem),
    isPartOfPackage: Boolean(item?.isPartOfPackage),
    calculatePriceFromPartPrices: Boolean(item?.calculatePriceFromPartPrices),
    showInPlanning: Boolean(item?.showInPlanning),
    sortNr: item?.sortNr ?? null,
    platformHeightMm: item?.platformHeightMm ?? null,
    platformLengthMm: item?.platformLengthMm ?? null,
    weightKg: item?.weightKg ?? null,
    hourMeter: item?.hourMeter ?? null,
    kmReading: item?.kmReading ?? null,
    basePrice: item?.basePrice ?? null,
    pricePerHour: item?.pricePerHour ?? null,
    pricePerDay: item?.pricePerDay ?? null,
    pricePerWeek: item?.pricePerWeek ?? null,
    pricePerMonth: item?.pricePerMonth ?? null,
    pricePerKm: item?.pricePerKm ?? null,
    fuelConsumptionLitresPerKm: item?.fuelConsumptionLitresPerKm ?? null,
    fuelConsumptionLitresPerHour: item?.fuelConsumptionLitresPerHour ?? null,
    replacementCost: item?.replacementCost ?? null,
    nrOfItemsTotal: item?.nrOfItemsTotal ?? null,
    unavailableForReservation: Boolean(item?.unavailableForReservation),
    unavailableReason: item?.unavailableReason ?? '',
    unavailableFrom: item?.unavailableFrom ?? null,
    unavailableTo: item?.unavailableTo ?? null,
    accountNr: item?.accountNr ?? '',
    costCenterNr: item?.costCenterNr ?? '',
    packageItemIds,
    packageItems,
  }
}
