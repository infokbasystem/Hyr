import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Save } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'


import ActionButton from '../../../components/ActionButton'
import ConfirmationModal from '../../../components/ConfirmationModal'
import LabeledInput from '../../../components/LabeledInput'
import LabeledTextArea from '../../../components/LabeledTextArea'
import Input from '../../../components/Input'
import { useDelayedSkeleton } from '../../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../../lib/sharedRequest'
import { getCompanyInfo, updateCompanyInfo } from '../../../lib/officeApi'

const EMPTY_OFFICE = {
    id: 0,
    name: '',
    street: '',
    zipCode: '',
    city: '',
    country: '',
    generalContractText: '',
    telephone: '',
    faxNr: '',
    email: '',
    web: '',
    organizationNr: '',
    vatNr: '',
    bank: '',
    swiftBic: '',
    bankAccountNr: '',
    bgNr: '',
    pgNr: '',
    vatRegCity: '',
    vatRegText: '',
    iban: '',
    crediflowId: '',
    glnNr: '',
}

function cloneOffice(value) {
    return JSON.parse(JSON.stringify(value))
}

function normalizeText(value) {
    return value ?? ''
}

function toOfficeState(value) {
    return {
        ...cloneOffice(EMPTY_OFFICE),
        ...(value ?? {}),
    }
}

export default function OfficeCompanyInfo() {
    const [office, setOffice] = useState(null)
    const [originalOffice, setOriginalOffice] = useState(null)
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
    const showSkeleton = useDelayedSkeleton(isLoading, 250)
    const skipUnsavedGuardRef = useRef(false)

    function hasUnsavedChanges() {
        if (skipUnsavedGuardRef.current) {
            return false
        }

        if (!office || !originalOffice) {
            return false
        }

        return JSON.stringify(office) !== JSON.stringify(originalOffice)
    }

    const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
        return hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname
    })

    useEffect(() => {
        if (navigationBlocker.state === 'blocked') {
            setShowUnsavedWarning(true)
        }
    }, [navigationBlocker.state])

    useEffect(() => {
        function handleBeforeUnload(event) {
            if (!hasUnsavedChanges()) {
                return
            }

            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [office, originalOffice])

    function handleUnsavedWarningClose() {
        setShowUnsavedWarning(false)

        if (navigationBlocker.state === 'blocked') {
            navigationBlocker.reset()
        }
    }

    function handleUnsavedWarningConfirm() {
        setShowUnsavedWarning(false)

        if (navigationBlocker.state === 'blocked') {
            navigationBlocker.proceed()
        }
    }

    useEffect(() => {
        let isActive = true
        skipUnsavedGuardRef.current = false

        async function loadOffice() {
            setIsLoading(true)

            try {
                const data = await getSharedRequest('office:company-info', () => getCompanyInfo())

                if (!isActive) {
                    return
                }

                const nextOffice = toOfficeState(data)

                setOffice(nextOffice)
                setOriginalOffice(cloneOffice(nextOffice))
            } catch (error) {
                if (!isActive) {
                    return
                }

                const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta foretagsuppgifter.'
                setMessages([{ type: 'error', text: errorText }])
            } finally {
                if (isActive) {
                    setIsLoading(false)
                }
            }
        }

        loadOffice()

        return () => {
            isActive = false
        }
    }, [])

    function updateField(field, value) {
        setMessages((prev) => prev.filter((message) => message.type !== 'success'))
        setOffice((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function handleSubmit(event) {
        event.preventDefault()

        if (!office) {
            return
        }

        setIsSaving(true)

        try {
            const payload = {
                ...office,
                name: normalizeText(office.name),
                street: normalizeText(office.street),
                zipCode: normalizeText(office.zipCode),
                city: normalizeText(office.city),
                country: normalizeText(office.country),
                generalContractText: normalizeText(office.generalContractText),
                deductibleReductionText: normalizeText(office.deductibleReductionText),
                telephone: normalizeText(office.telephone),
                mobilePhone: normalizeText(office.mobilePhone),
                emergencyNumber: normalizeText(office.emergencyNumber),
                faxNr: normalizeText(office.faxNr),
                email: normalizeText(office.email),
                web: normalizeText(office.web),
                organizationNr: normalizeText(office.organizationNr),
                vatNr: normalizeText(office.vatNr),
                bank: normalizeText(office.bank),
                swiftBic: normalizeText(office.swiftBic),
                bankAccountNr: normalizeText(office.bankAccountNr),
                bgNr: normalizeText(office.bgNr),
                pgNr: normalizeText(office.pgNr),
                vatRegCity: normalizeText(office.vatRegCity),
                vatRegText: normalizeText(office.vatRegText),
                iban: normalizeText(office.iban),
                crediflowId: normalizeText(office.crediflowId),
                glnNr: normalizeText(office.glnNr),
            }

            const savedOffice = toOfficeState(await updateCompanyInfo(payload))
            setOffice(savedOffice)
            setOriginalOffice(cloneOffice(savedOffice))
            setMessages([{ type: 'success', text: 'Företagsuppgifter sparade.' }])
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte spara foretagsuppgifter.'
            setMessages([{ type: 'error', text: errorText }])
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="w-full pl-10 py-2">
            <ConfirmationModal
                isOpen={showUnsavedWarning}
                onClose={handleUnsavedWarningClose}
                onConfirm={handleUnsavedWarningConfirm}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vill du fortsätta utan att spara?"
                confirmText="Fortsätt"
                cancelText="Stanna kvar"
                isDestructive
            />

            <h1 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Företagsuppgifter</h1>

            <div className="mb-1 mt-3 flex items-start justify-between gap-5">
                <div className="flex items-center gap-6">
                    <ActionButton label="Spara" icon={Save} onClick={handleSubmit} accent="lime" disabled={isSaving || isLoading} />
                </div>

                <div>
                    {messages.length > 0 && (
                        <div className="pl-4 text-xs text-center text-gray-700">
                            {messages.map((message, index) => (
                                <div
                                    key={`${message.type}-${index}`}
                                    className={message.type === 'error'
                                        ? 'rounded-full border border-rose-200 bg-rose-50 px-5 py-1 text-rose-700'
                                        : 'rounded-full border border-emerald-200 bg-emerald-50 px-5 py-1 text-emerald-700'}
                                >
                                    {message.text}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showSkeleton && !office ? (
                <div className="mt-5 space-y-4">
                    <Skeleton height={36} count={6} />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-5 space-y-6">
                    <div className="grid gap-20 2xl:grid-cols-2">

                        <div className="max-w-[500px]">
                            <div>
                                <h2 className="mb-2 text-xs uppercase tracking-[0.12em] text-gray-600">Namn och adress</h2>
                                <LabeledInput
                                    name="workshopName"
                                    label="Namn"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.name ?? ''}
                                    onChange={(value) => updateField('name', value ?? '')}
                                />
                                <LabeledInput
                                    name="street"
                                    label="Adress"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.street ?? ''}
                                    onChange={(value) => updateField('street', value ?? '')}
                                />
                                <div className="mt-0 flex items-center gap-1">
                                    <LabeledInput
                                        name="zipCode"
                                        label=""
                                        labelWidth="w-15"
                                        inputWidth="w-20"
                                        margintop="0"
                                        value={office?.zipCode ?? ''}
                                        onChange={(value) => updateField('zipCode', value ?? '')}
                                    />
                                    <Input
                                        name="postalAddress"
                                        value={office?.city ?? ''}
                                        onChange={(event) => updateField('city', event.target.value ?? '')}
                                        className="w-full uppercase"
                                    />
                                </div>
                                <LabeledInput
                                    name="country"
                                    label="Land"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.country ?? ''}
                                    onChange={(value) => updateField('country', value ?? '')}
                                />
                            </div>

                            <div>
                                <h2 className="mb-2 mt-10 text-xs uppercase tracking-[0.12em] text-gray-600">Fakturering och avtal</h2>
                                <LabeledInput
                                    name="organizationNr"
                                    label="Org.nr"
                                    labelWidth="w-20"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.organizationNr ?? ''}
                                    onChange={(value) => updateField('organizationNr', value ?? '')}
                                />
                                <LabeledInput
                                    name="vatNr"
                                    label="Momsnr"
                                    labelWidth="w-20"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.vatNr ?? ''}
                                    onChange={(value) => updateField('vatNr', value ?? '')}
                                />
                                <LabeledInput
                                    name="vatRegCity"
                                    label="Momsreg.ort"
                                    labelWidth="w-20"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.vatRegCity ?? ''}
                                    onChange={(value) => updateField('vatRegCity', value ?? '')}
                                />
                                <LabeledTextArea
                                    name="vatRegText"
                                    label="Momsreg.text"
                                    labelWidth="w-20"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.vatRegText ?? ''}
                                    onChange={(value) => updateField('vatRegText', value ?? '')}
                                    height="h-10"
                                />
                                <LabeledTextArea
                                    name="generalContractText"
                                    label="Generell avtalstext"
                                    labelWidth="w-20"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.generalContractText ?? ''}
                                    onChange={(value) => updateField('generalContractText', value ?? '')}
                                    height="h-14"
                                />
                                <LabeledTextArea
                                    name="deductibleReductionText"
                                    label="Självrisk-reducerings-text"
                                    labelWidth="w-20"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.deductibleReductionText ?? ''}
                                    onChange={(value) => updateField('deductibleReductionText', value ?? '')}
                                    height="h-14"
                                />
                            </div>
                        </div>

                        <div className="max-w-[450px]">
                            <div>
                                <h2 className="mb-2 text-xs uppercase tracking-[0.12em] text-gray-600">Kontakt</h2>
                                <LabeledInput
                                    name="telephone"
                                    label="Telefon"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.telephone ?? ''}
                                    onChange={(value) => updateField('telephone', value ?? '')}
                                />
                                <LabeledInput
                                    name="mobilePhone"
                                    label="Mobil"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.mobilePhone ?? ''}
                                    onChange={(value) => updateField('mobilePhone', value ?? '')}
                                />
                                <LabeledInput
                                    name="emergencyNumber"
                                    label="Journr"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.emergencyNumber ?? ''}
                                    onChange={(value) => updateField('emergencyNumber', value ?? '')}
                                />
                                <LabeledInput
                                    name="faxNr"
                                    label="Faxnr."
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.faxNr ?? ''}
                                    onChange={(value) => updateField('faxNr', value ?? '')}
                                />
                                <LabeledInput
                                    name="web"
                                    label="Web"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.web ?? ''}
                                    onChange={(value) => updateField('web', value ?? '')}
                                />
                                <LabeledInput
                                    name="email"
                                    label="Email"
                                    labelWidth="w-15"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.email ?? ''}
                                    onChange={(value) => updateField('email', value ?? '')}
                                />
                            </div>

                            <div className="mt-10">
                                <h2 className="mb-2 text-xs uppercase tracking-[0.12em] text-gray-600">Bankuppgifter</h2>
                                <LabeledInput
                                    name="bank"
                                    label="Bank"
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.bank ?? ''}
                                    onChange={(value) => updateField('bank', value ?? '')}
                                />
                                <LabeledInput
                                    name="swiftBic"
                                    label="SWIFT/BIC"
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.swiftBic ?? ''}
                                    onChange={(value) => updateField('swiftBic', value ?? '')}
                                />
                                <LabeledInput
                                    name="bankAccountNr"
                                    label="Bankkontonr."
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.bankAccountNr ?? ''}
                                    onChange={(value) => updateField('bankAccountNr', value ?? '')}
                                />
                                <LabeledInput
                                    name="iban"
                                    label="IBAN"
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.iban ?? ''}
                                    onChange={(value) => updateField('iban', value ?? '')}
                                />
                                <LabeledInput
                                    name="bgNr"
                                    label="Bankgiro"
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.bgNr ?? ''}
                                    onChange={(value) => updateField('bgNr', value ?? '')}
                                />
                                <LabeledInput
                                    name="pgNr"
                                    label="Plusgiro"
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.pgNr ?? ''}
                                    onChange={(value) => updateField('pgNr', value ?? '')}
                                />
                                <LabeledInput
                                    name="crediflowId"
                                    label="Crediflow ID"
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.crediflowId ?? ''}
                                    onChange={(value) => updateField('crediflowId', value ?? '')}
                                />
                                <LabeledInput
                                    name="glnNr"
                                    label="GLN-nummer"
                                    labelWidth="w-22"
                                    inputWidth="w-full"
                                    margintop="0"
                                    value={office?.glnNr ?? ''}
                                    onChange={(value) => updateField('glnNr', value ?? '')}
                                />
                            </div>
                        </div>

                    </div>

                </form>
            )}
        </div>
    )
}
