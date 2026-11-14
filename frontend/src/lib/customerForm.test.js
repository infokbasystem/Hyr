import assert from 'node:assert/strict'
import test from 'node:test'
import { EMPTY_CUSTOMER, validateCustomer } from './customerForm.js'

test('new customers start active with empty contact information and automatic numbering', () => {
    assert.equal(EMPTY_CUSTOMER.isActive, true)
    assert.equal(EMPTY_CUSTOMER.customerNr, null)
    assert.equal(EMPTY_CUSTOMER.customerName, '')
    assert.equal(EMPTY_CUSTOMER.email, '')
    assert.equal(EMPTY_CUSTOMER.discountPercent, null)
})

test('customer names are required, including whitespace-only names', () => {
    for (const customerName of ['', '   ', null, undefined]) {
        assert.equal(validateCustomer({ ...EMPTY_CUSTOMER, customerName }), 'Namn måste anges.')
    }
    assert.equal(validateCustomer({ ...EMPTY_CUSTOMER, customerName: ' Ny kund ' }), null)
})

test('customer discount accepts inclusive boundaries and rejects values outside 0–100', () => {
    const customer = { ...EMPTY_CUSTOMER, customerName: 'Ny kund' }
    for (const discountPercent of [null, 0, 25.5, 100]) {
        assert.equal(validateCustomer({ ...customer, discountPercent }), null)
    }
    for (const discountPercent of [-0.01, 100.01]) {
        assert.equal(validateCustomer({ ...customer, discountPercent }), 'Rabatt måste vara mellan 0 och 100 %.')
    }
})
