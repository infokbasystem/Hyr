import { requestJson } from './apiClient'

export function getCustomerById(customerId) {
  return requestJson(`/customer/${customerId}`)
}

export function createCustomer(body) {
  return requestJson('/customer', {
    method: 'POST',
    body: toCustomerUpsertDto(body),
  })
}

export function updateCustomer(customerId, body) {
  return requestJson(`/customer/${customerId}`, {
    method: 'PUT',
    body: toCustomerUpsertDto(body),
  })
}

function toCustomerUpsertDto(customer) {
  return {
    customerNr: customer?.customerNr ?? null,
    customerName: customer?.customerName ?? '',
    orgNr: customer?.orgNr ?? '',
    vatNr: customer?.vatNr ?? '',
    street1: customer?.street1 ?? '',
    street2: customer?.street2 ?? '',
    zipCode: customer?.zipCode ?? '',
    city: customer?.city ?? '',
    telephone: customer?.telephone ?? '',
    mobilePhone: customer?.mobilePhone ?? '',
    email: customer?.email ?? '',
    nrOfInvoiceDays: customer?.nrOfInvoiceDays ?? null,
    note: customer?.note ?? '',
    creditLimit: customer?.creditLimit ?? null,
    importId: customer?.importId ?? null,
    importSource: customer?.importSource ?? '',
    keySpcs: customer?.keySpcs ?? '',
    keyFortnox: customer?.keyFortnox ?? '',
    keyWinassist: customer?.keyWinassist ?? '',
    isActive: Boolean(customer?.isActive),
    regNr: customer?.regNr ?? '',
    isCompany: Boolean(customer?.isCompany),
    vatRegisterd: Boolean(customer?.vatRegisterd),
    pgNr: customer?.pgNr ?? '',
    bgNr: customer?.bgNr ?? '',
    efakturaAddresseeIntermediator: customer?.efakturaAddresseeIntermediator ?? '',
    efakturaAddresseeID: customer?.efakturaAddresseeID ?? '',
    efakturaAddresseeIDType: customer?.efakturaAddresseeIDType ?? '',
    efakturaBankCode: customer?.efakturaBankCode ?? '',
    efakturaBankId: customer?.efakturaBankId ?? '',
    efakturaBankName: customer?.efakturaBankName ?? '',
    efakturaVatHomeTown: customer?.efakturaVatHomeTown ?? '',
    efakturaVatRegistration: customer?.efakturaVatRegistration ?? '',
    crediflowPartyId: customer?.crediflowPartyId ?? null,
    glnnr: customer?.glnnr ?? null,
  }
}
