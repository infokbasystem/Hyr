import assert from 'node:assert/strict'
import test from 'node:test'
import { getPdfFilename } from './pdfFilename.js'

test('uses the server filename, including RFC 5987 UTF-8 names', () => {
  assert.equal(getPdfFilename('attachment; filename="invoice_12.pdf"', 'invoice', 12, 3), 'invoice_12.pdf')
  assert.equal(getPdfFilename("attachment; filename=invoice.pdf; filename*=UTF-8''faktura_%C3%85.pdf", 'invoice', 12, 3), 'faktura_Å.pdf')
  assert.equal(getPdfFilename(`attachment; filename*="UTF-8''faktura_%C3%85.pdf"`, 'invoice', 12, 3), 'faktura_Å.pdf')
})

test('falls back safely when the server does not supply a usable filename', () => {
  assert.equal(getPdfFilename('', 'invoice', 12, 3), 'invoice_12.pdf')
  assert.equal(getPdfFilename("attachment; filename*=UTF-8''bad%ZZ; filename=reservation.pdf", 'reservation', 1, 2), 'reservation.pdf')
  assert.equal(getPdfFilename('attachment; filename="../invoice.pdf"', 'invoice', null, 3), 'invoice.pdf')
  assert.equal(getPdfFilename(null, 'reservation', null, 7), 'reservation_7.pdf')
})
