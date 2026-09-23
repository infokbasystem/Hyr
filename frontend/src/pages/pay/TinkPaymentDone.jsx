import { useSearchParams } from 'react-router-dom'

export default function TinkPaymentDone() {
    const [searchParams] = useSearchParams()
    const paymentRequestId = searchParams.get('payment_request_id')

    return (
        <div className="flex min-h-screen items-start justify-center bg-gray-50 pt-24">
            <div className="w-full max-w-md rounded-sm border border-gray-200 bg-white p-8 text-center">
                <h1 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-700">
                    {paymentRequestId ? 'Tack för din betalning' : 'Betalningen slutfördes inte'}
                </h1>
                <p className="mt-4 text-xs text-gray-600">
                    {paymentRequestId
                        ? 'Din betalning har skickats till din bank. Du kan stänga den här sidan.'
                        : 'Betalningen avbröts eller kunde inte genomföras. Försök igen via länken du fick.'}
                </p>
            </div>
        </div>
    )
}
