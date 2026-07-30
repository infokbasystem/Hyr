import { requestJson } from './apiClient'

export function getCompanyInfo() {
  return requestJson('/office/company-info')
}

export function updateCompanyInfo(body) {
  return requestJson('/office/company-info', {
    method: 'PUT',
    body: toCompanyInfoDto(body),
  })
}

export async function getOfficeItemTypeSettings() {
  const data = await requestJson('/office/settings/item-types')
  return mapOfficeItemTypeSettings(data)
}

export async function updateOfficeItemTypeSettings(body) {
  const data = await requestJson('/office/settings/item-types', {
    method: 'PUT',
    body: {
      itemTypeIds: normalizeItemTypeIds(body?.itemTypeIds),
      defaultBookedFromTime: normalizeTimeOfDay(body?.defaultBookedFromTime),
      defaultBookedToTime: normalizeTimeOfDay(body?.defaultBookedToTime),
    },
  })

  return mapOfficeItemTypeSettings(data)
}

function toCompanyInfoDto(office) {
  return {
    name: office?.name ?? '',
    street: office?.street ?? '',
    zipCode: office?.zipCode ?? '',
    city: office?.city ?? '',
    country: office?.country ?? '',
    invoiceFee: normalizeNumber(office?.invoiceFee),
    generalContractText: office?.generalContractText ?? '',
    deductibleReductionText: office?.deductibleReductionText ?? '',
    latePaymentInterest: normalizeNumber(office?.latePaymentInterest),
    telephone: office?.telephone ?? '',
    mobilePhone: office?.mobilePhone ?? '',
    emergencyNumber: office?.emergencyNumber ?? '',
    faxNr: office?.faxNr ?? '',
    email: office?.email ?? '',
    web: office?.web ?? '',
    organizationNr: office?.organizationNr ?? '',
    vatNr: office?.vatNr ?? '',
    bank: office?.bank ?? '',
    swiftBic: office?.swiftBic ?? '',
    bankAccountNr: office?.bankAccountNr ?? '',
    bgNr: office?.bgNr ?? '',
    pgNr: office?.pgNr ?? '',
    defaultPaymentDays: normalizeInteger(office?.defaultPaymentDays),
    viewContractPricesOnPrint: Boolean(office?.viewContractPricesOnPrint),
    vatRegCity: office?.vatRegCity ?? '',
    vatRegText: office?.vatRegText ?? '',
    iban: office?.iban ?? '',
    crediflowId: office?.crediflowId ?? '',
    glnNr: office?.glnNr ?? '',
  }
}

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeInteger(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function normalizeItemTypeIds(value) {
  if (!Array.isArray(value)) {
    return []
  }

  const result = []
  const seen = new Set()

  value.forEach((entry) => {
    const parsed = Number(entry)
    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) {
      return
    }

    seen.add(parsed)
    result.push(parsed)
  })

  return result
}

function mapOfficeItemTypeSettings(data) {
  const rows = Array.isArray(data?.itemTypes) ? data.itemTypes : []

  return {
    defaultBookedFromTime: normalizeTimeOfDay(data?.defaultBookedFromTime),
    defaultBookedToTime: normalizeTimeOfDay(data?.defaultBookedToTime),
    itemTypes: rows.map((itemType) => ({
      id: Number(itemType?.id),
      code: `${itemType?.code ?? ''}`,
      name: `${itemType?.name ?? ''}`,
      isSelected: Boolean(itemType?.isSelected),
    })).filter((itemType) => Number.isInteger(itemType.id) && itemType.id > 0),
  }
}

function normalizeTimeOfDay(value) {
  return typeof value === 'string' ? value.trim() : ''
}