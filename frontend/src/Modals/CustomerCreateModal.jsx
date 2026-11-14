import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Save, X } from 'lucide-react'
import ActionButton from '../components/ActionButton'
import CustomerFormFields from '../components/CustomerFormFields'
import { createCustomer, getCustomerById } from '../lib/customerApi'
import { EMPTY_CUSTOMER, validateCustomer } from '../lib/customerForm'
import bg from '../assets/content.png'

export default function CustomerCreateModal({ initialName = '', onClose, onSaved }) {
    const dialogRef = useRef(null)
    const savingRef = useRef(false)
    const createdIdRef = useRef(null)
    const [customer, setCustomer] = useState(() => ({ ...EMPTY_CUSTOMER, customerName: initialName }))
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const dialog = dialogRef.current
        dialog.showModal()
        dialog.querySelector('[name="customerName"]')?.focus()
        return () => dialog.close()
    }, [])

    function handleClose() {
        if (!savingRef.current) {
            onClose()
        }
    }

    async function handleSave(event) {
        event.preventDefault()
        event.stopPropagation()
        if (savingRef.current) return

        const validationError = validateCustomer(customer)
        if (validationError) {
            setError(validationError)
            return
        }

        savingRef.current = true
        setIsSaving(true)
        setError('')

        let savedCustomer
        try {
            if (createdIdRef.current === null) {
                createdIdRef.current = await createCustomer({
                    ...customer,
                    customerName: customer.customerName.trim(),
                })
            }
            savedCustomer = await getCustomerById(createdIdRef.current)
        } catch (error) {
            const message = error?.payload?.message ?? error?.message ?? 'Kunde inte spara kund.'
            setError(createdIdRef.current === null
                ? message
                : `Kunden är sparad men kunde inte hämtas. Försök igen för att använda kunden. ${message}`)
        } finally {
            savingRef.current = false
            setIsSaving(false)
        }

        if (savedCustomer) {
            onSaved(savedCustomer)
        }
    }

    return createPortal(
        <dialog
            ref={dialogRef}
            aria-labelledby="create-customer-title"
            className="m-auto w-[1120px] max-w-[calc(100%-2rem)] max-h-[calc(var(--app-viewport-height)-4rem)] overflow-auto rounded-sm border border-stone-300 bg-stone-50 p-6 shadow-xl backdrop:bg-black/50"
            style={{ backgroundImage: `url(${bg})` }}
            onCancel={(event) => {
                event.preventDefault()
                handleClose()
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    const rect = event.currentTarget.getBoundingClientRect()
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
                        handleClose()
                    }
                }
            }}
        >
            <div className="mb-6 flex items-center justify-between">
                <h2 id="create-customer-title" className="text-sm font-semibold tracking-[0.10em] text-gray-600">NY KUND</h2>
                <button type="button" aria-label="Stäng" disabled={isSaving} onClick={handleClose} className="text-gray-500 hover:text-gray-800 disabled:opacity-50">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <form autoComplete="off" onSubmit={handleSave}>
                {error && <div role="alert" className="mb-4 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
                <fieldset disabled={isSaving || createdIdRef.current !== null}>
                    <CustomerFormFields customer={customer} onChange={(field, value) => {
                        setCustomer((previous) => ({ ...previous, [field]: value }))
                        setError('')
                    }} />
                </fieldset>
                <div className="mt-6 flex justify-end gap-6">
                    <ActionButton label="Avbryt" icon={X} accent="orange" disabled={isSaving} onClick={handleClose} />
                    <ActionButton label={isSaving ? 'Sparar...' : createdIdRef.current !== null ? 'Använd kund' : 'Spara'} icon={Save} accent="lime" disabled={isSaving} type="submit" />
                </div>
            </form>
        </dialog>,
        document.body,
    )
}
