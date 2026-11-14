export const EMPTY_CUSTOMER = {
    id: 0,
    customerNr: null,
    customerName: '',
    orgNr: '',
    vatNr: '',
    street1: '',
    street2: '',
    zipCode: '',
    city: '',
    telephone: '',
    mobilePhone: '',
    email: '',
    note: '',
    isActive: true,
    vatRegisterd: false,
    isCompany: false,
    nrOfInvoiceDays: null,
    creditLimit: null,
    discountPercent: null,
    pgNr: '',
    bgNr: '',
    keyFortnox: '',
    keyWinassist: '',
    crediflowPartyId: null,
    glnnr: null,
}

export function validateCustomer(customer) {
    if (!customer.customerName?.trim()) {
        return 'Namn måste anges.'
    }

    if (customer.discountPercent != null && (customer.discountPercent < 0 || customer.discountPercent > 100)) {
        return 'Rabatt måste vara mellan 0 och 100 %.'
    }

    return null
}
