import { requestJson } from './apiClient'

export function createTinkPaymentRequest(invoiceId) {
  return requestJson(`/tink/invoice/${invoiceId}/payment-request`, {
    method: 'POST',
  })
}

export function sendTinkPaymentRequest(paymentRequestId, channel, to) {
  return requestJson(`/tink/payment-request/${paymentRequestId}/send`, {
    method: 'POST',
    body: { channel, to },
  })
}

export function getTinkPaymentStatus(paymentRequestId) {
  return requestJson(`/tink/payment-request/${paymentRequestId}/status`)
}
