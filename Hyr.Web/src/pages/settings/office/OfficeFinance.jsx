import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Save } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../../components/ActionButton'
import ConfirmationModal from '../../../components/ConfirmationModal'
import LabeledInput from '../../../components/LabeledInput'
import { useDelayedSkeleton } from '../../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../../lib/sharedRequest'
import { getCompanyInfo, updateCompanyInfo } from '../../../lib/officeApi'

const FINANCE_FIELDS = ['defaultPaymentDays', 'latePaymentInterest', 'invoiceFee']

function getFinanceState(value) {
    return FINANCE_FIELDS.reduce((state, field) => ({ ...state, [field]: value?.[field] ?? null }), {})
}

export default function OfficeFinance() {
    const [office, setOffice] = useState(null)
    const [originalFinance, setOriginalFinance] = useState(null)
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
    const skipUnsavedGuardRef = useRef(false)
    const showSkeleton = useDelayedSkeleton(isLoading, 250)

    const hasUnsavedChanges = useCallback(() => {
        if (skipUnsavedGuardRef.current || !office || !originalFinance) return false
        return JSON.stringify(getFinanceState(office)) !== JSON.stringify(originalFinance)
    }, [office, originalFinance])

    const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => (
        hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname
    ))

    useEffect(() => {
        if (navigationBlocker.state === 'blocked') setShowUnsavedWarning(true)
    }, [navigationBlocker.state])

    useEffect(() => {
        function handleBeforeUnload(event) {
            if (!hasUnsavedChanges()) return
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges, office, originalFinance])

    useEffect(() => {
        let isActive = true
        skipUnsavedGuardRef.current = false

        async function loadOffice() {
            setIsLoading(true)
            try {
                const data = await getSharedRequest('office:company-info', () => getCompanyInfo())
                if (!isActive) return
                setOffice(data)
                setOriginalFinance(getFinanceState(data))
            } catch (error) {
                if (isActive) {
                    const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta ekonomiska inställningar.'
                    setMessages([{ type: 'error', text: errorText }])
                }
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        loadOffice()
        return () => { isActive = false }
    }, [])

    function updateField(field, value) {
        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
        setOffice((previous) => ({ ...previous, [field]: value }))
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (!office) return
        setIsSaving(true)

        try {
            const savedOffice = await updateCompanyInfo(office)
            setOffice(savedOffice)
            setOriginalFinance(getFinanceState(savedOffice))
            setMessages([{ type: 'success', text: 'Ekonomiska inställningar sparade.' }])
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte spara ekonomiska inställningar.'
            setMessages([{ type: 'error', text: errorText }])
        } finally {
            setIsSaving(false)
        }
    }

    function closeUnsavedWarning() {
        setShowUnsavedWarning(false)
        if (navigationBlocker.state === 'blocked') navigationBlocker.reset()
    }

    function confirmUnsavedWarning() {
        setShowUnsavedWarning(false)
        if (navigationBlocker.state === 'blocked') navigationBlocker.proceed()
    }

    return (
        <div className="w-full pl-10 py-2">
            <ConfirmationModal
                isOpen={showUnsavedWarning}
                onClose={closeUnsavedWarning}
                onConfirm={confirmUnsavedWarning}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vill du fortsätta utan att spara?"
                confirmText="Fortsätt"
                cancelText="Stanna kvar"
                isDestructive
            />
            <h1 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Ekonomi</h1>
            <div className="mb-1 mt-3 flex items-start justify-between gap-5">
                <ActionButton label="Spara" icon={Save} onClick={handleSubmit} accent="lime" disabled={isSaving || isLoading} />
                {messages.length > 0 && (
                    <div className="pl-4 text-center text-xs text-gray-700">
                        {messages.map((message, index) => (
                            <div key={`${message.type}-${index}`} className={message.type === 'error'
                                ? 'rounded-full border border-rose-200 bg-rose-50 px-5 py-1 text-rose-700'
                                : 'rounded-full border border-emerald-200 bg-emerald-50 px-5 py-1 text-emerald-700'}>
                                {message.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showSkeleton && !office ? (
                <div className="mt-5 space-y-4"><Skeleton height={36} count={3} /></div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-5 max-w-[500px]">
                    <h2 className="mb-2 text-xs uppercase tracking-[0.12em] text-gray-600">Fakturering</h2>
                    <LabeledInput name="defaultPaymentDays" label="Betalningsdagar" labelWidth="w-24" inputWidth="w-20" margintop="0" type="number" integerOnly value={office?.defaultPaymentDays ?? ''} onChange={(value) => updateField('defaultPaymentDays', value)} />
                    <LabeledInput name="latePaymentInterest" label="Dröjsmålsränta" labelWidth="w-24" inputWidth="w-20" margintop="0" type="number" value={office?.latePaymentInterest ?? ''} onChange={(value) => updateField('latePaymentInterest', value)} />
                    <LabeledInput name="invoiceFee" label="Fakturaavgift" labelWidth="w-24" inputWidth="w-20" margintop="0" type="number" value={office?.invoiceFee ?? ''} onChange={(value) => updateField('invoiceFee', value)} />
                </form>
            )}
        </div>
    )
}
