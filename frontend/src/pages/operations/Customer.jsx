import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, Save, Trash2 } from 'lucide-react'

import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledInput from '../../components/LabeledInput'
import LabeledSwitch from '../../components/LabeledSwitch'
import LabeledTextArea from '../../components/LabeledTextArea'
import Input from '../../components/Input'
import { formatUserName } from '../../utils/nameFormatters'
import { createCustomer, getCustomerById, updateCustomer } from '../../lib/customerApi'
import { getSharedRequest } from '../../lib/sharedRequest'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'

const EMPTY_CUSTOMER = {
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
    pgNr: '',
    bgNr: '',
    keyFortnox: '',
    keyWinassist: '',
    crediflowPartyId: null,
    glnnr: null,
}

function cloneCustomer(value) {
    return JSON.parse(JSON.stringify(value))
}

function formatDateTime(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return ''
    }

    return date.toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function Customer() {
    const navigate = useNavigate()
    const params = useParams()
    const routeCustomerId = params.id ?? 'new'

    const [customer, setCustomer] = useState(null)
    const [originalCustomer, setOriginalCustomer] = useState(null)
    const [messages, setMessages] = useState([])
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
    const showCustomerSkeleton = useDelayedSkeleton(isLoadingCustomer, 250)
    const skipUnsavedGuardRef = useRef(false)

    function hasUnsavedChanges() {
        if (skipUnsavedGuardRef.current) {
            return false
        }

        if (!customer) {
            return false
        }

        if (!originalCustomer) {
            return false
        }

        return JSON.stringify(customer) !== JSON.stringify(originalCustomer)
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
    }, [customer, originalCustomer])

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

    function handleChange(field, value) {
        setMessages((prev) => prev.filter((message) => message.type !== 'success'))
        setCustomer((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function loadCustomer(customerId, { dedupe = false, isActive = () => true } = {}) {
        setIsLoadingCustomer(true)

        try {
            if (customerId === 'new') {
                if (!isActive()) {
                    return
                }

                const emptyCustomer = cloneCustomer(EMPTY_CUSTOMER)
                setCustomer(emptyCustomer)
                setOriginalCustomer(cloneCustomer(emptyCustomer))
                return
            }

            const fetchCustomer = () => getCustomerById(customerId)
            const data = dedupe
                ? await getSharedRequest(`customer:${customerId}`, fetchCustomer)
                : await fetchCustomer()

            if (!isActive()) {
                return
            }

            setCustomer(data)
            setOriginalCustomer(cloneCustomer(data))
        } catch (error) {
            if (!isActive()) {
                return
            }

            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta kund.'
            setMessages([{ type: 'error', text: errorText }])
        } finally {
            if (isActive()) {
                setIsLoadingCustomer(false)
            }
        }
    }

    function handleBackClick() {
        if (window.history.length > 1) {
            navigate(-1)
            return
        }

        window.close()
    }

    useEffect(() => {
        let isActive = true

        skipUnsavedGuardRef.current = false

        loadCustomer(routeCustomerId, {
            dedupe: true,
            isActive: () => isActive,
        })

        return () => {
            isActive = false
        }
    }, [routeCustomerId])

    async function submitCustomer(event) {
        event.preventDefault()

        if (!customer) {
            return
        }

        if (!customer.customerName?.trim()) {
            setMessages([{ type: 'error', text: 'Namn måste anges.' }])
            return
        }

        const payload = {
            ...customer,
            customerName: customer.customerName.trim(),
            orgNr: customer.orgNr ?? '',
            vatNr: customer.vatNr ?? '',
            street1: customer.street1 ?? '',
            street2: customer.street2 ?? '',
            zipCode: customer.zipCode ?? '',
            city: customer.city ?? '',
            telephone: customer.telephone ?? '',
            mobilePhone: customer.mobilePhone ?? '',
            email: customer.email ?? '',
            note: customer.note ?? '',
            isActive: Boolean(customer.isActive),
        }

        try {
            let customerId = customer.id

            if (routeCustomerId === 'new' || !customer.id) {
                customerId = await createCustomer(payload)
            } else {
                customerId = await updateCustomer(customer.id, payload)
            }

            const refreshedCustomer = await getCustomerById(customerId)
            setCustomer(refreshedCustomer)
            setOriginalCustomer(cloneCustomer(refreshedCustomer))
            setMessages([{ type: 'success', text: 'Kunden sparad' }])

            if (`${routeCustomerId}` !== `${customerId}`) {
                skipUnsavedGuardRef.current = true
                navigate(`/customer/${customerId}`, { replace: true, state: { originModule: 'operations' } })
            }
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte spara kund.'
            setMessages([{ type: 'error', text: errorText }])
        }
    }

    async function handleSaveOrClose(event) {
        event.preventDefault()

        if (hasUnsavedChanges()) {
            await submitCustomer(event)
            return
        }

        navigate('/operations/searchcustomer')
    }

    function showLogPlaceholder() {
        setMessages([{ type: 'info', text: 'Logg för kund är inte implementerad ännu.' }])
    }

    function showDeletePlaceholder() {
        setMessages([{ type: 'error', text: 'Radera kund är inte implementerad ännu.' }])
    }

    if (!customer) {
        if (showCustomerSkeleton) {
            return (
                <div className="flex h-full min-h-full w-full flex-1 flex-col px-0 py-0 md:px-[clamp(8px,5vw,10vw)]">
                    <div className="mt-1 flex min-h-0 flex-1 flex-col">
                        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start">
                            <div className="mt-6 mb-8 pr-3 border-b border-gray-300 lg:mb-6 lg:self-stretch lg:border-b-0 lg:border-r">
                                <aside className="text-gray-700 lg:sticky lg:top-[calc(52px+72px+1rem)] lg:z-10 lg:self-start">
                                    <div className="space-y-4 pr-0 pb-4 ml-2">
                                        <h2 className="text-4 text-center text-gray-700 text-sm">Info</h2>
                                        <div className="space-y-2 text-xs text-gray-600">
                                            <Skeleton height={14} width="92%" />
                                            <Skeleton height={14} width="88%" />
                                        </div>
                                    </div>
                                    <div className="border-b border-gray-300" />

                                    <div className="space-y-4 pr-0 py-4 ml-2">
                                        <h2 className="text-4 text-center text-gray-700 text-sm">Meddelanden</h2>
                                        <div className="space-y-2 text-xs text-gray-600">
                                            <Skeleton height={30} />
                                            <Skeleton height={30} width="92%" />
                                        </div>
                                    </div>

                                    <div className="border-b border-gray-300" />
                                </aside>
                            </div>

                            <section className="lg:pl-2">
                                <div className="pb-3">
                                    <Skeleton height={14} width={220} />
                                </div>

                                <div className="mb-4 flex w-full justify-between space-x-4">
                                    <div className="flex items-center space-x-6">
                                        <Skeleton height={30} width={92} />
                                        <Skeleton height={30} width={92} />
                                        <Skeleton height={30} width={92} />
                                        <Skeleton height={30} width={92} />
                                    </div>
                                </div>

                                <div className="grid gap-15 md:grid-cols-[360px_380px_200px] overflow-auto">
                                    <div className="space-y-2">
                                        <Skeleton height={24} count={8} />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton height={24} count={8} />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton height={24} count={6} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            null
        )
    }

    const renderMetaRow = (label, value, userName) => {
        return (
            <div className="grid grid-cols-21 gap-1">
                <div className="col-span-5"><span className="font-medium">{label}</span></div>
                <div className="col-span-8">{value && formatDateTime(value)}</div>
                <div className="col-span-8 text-gray-500">{userName && `av ${userName}`}</div>
            </div>
        );
    };

    return (
        <div className="flex h-full min-h-full w-full flex-1 flex-col px-0 py-0 md:px-[clamp(8px,5vw,10vw)]">
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

            <div className="mt-1 flex min-h-0 flex-1 flex-col">

                <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start">

                    <div className="mt-6 mb-8 pr-3 border-b border-gray-300 lg:mb-6 lg:self-stretch lg:border-b-0 lg:border-r">
                        <aside className="lg:sticky lg:top-[calc(52px+72px+1rem)] lg:z-10 lg:self-start">
                            <div className="space-y-4 pr-0 pb-4 ml-2">
                                <h2 className="text-4 text-center text-gray-500 text-sm">Info</h2>
                                <div className="space-y-2 text-xs text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                    {renderMetaRow('Skapad:', customer.createdAt, customer.createdByName)}
                                    {renderMetaRow('Ändrad:', customer.updatedAt, customer.updatedByName)}
                                </div>
                            </div>
                            
                            <div className="border-b border-gray-300" />

                            <div className="space-y-4 pr-0 py-4 ml-2">
                                <h2 className="text-4 text-center text-gray-500 text-sm">Meddelanden</h2>
                                <div className="space-y-2 text-xs text-gray-600">
                                    {messages.length === 0 && (
                                        <></>
                                    )}

                                    {messages.map((message, index) => (
                                        <div
                                            key={message.id ?? `${message.type}-${message.text}-${index}`}
                                            className={`rounded-sm border px-3 py-2 text-xs text-center ${message.type === 'error'
                                                ? 'border-rose-200 bg-rose-50 text-rose-800'
                                                : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                                }`}
                                        >
                                            {message.text}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-b border-gray-300" />
                        </aside>
                    </div>

                    <section className="lg:pl-2">
                        <h2 className="text-sm pb-3 text-gray-500 uppercase tracking-[0.10em] font-semibold">{customer.customerName}</h2>
                        <div className="mb-4 flex w-full justify-between space-x-4">
                            <div className="flex items-center space-x-6">
                                <ActionButton label="Tillbaka" icon={ArrowLeft} onClick={handleBackClick} accent="sky" />
                                <ActionButton label="Spara" icon={Save} onClick={submitCustomer} accent="lime" />
                                <ActionButton label="Logg" icon={Clock3} onClick={showLogPlaceholder} accent="violet" disabled={!customer?.id} />
                                <ActionButton label="Radera" icon={Trash2} onClick={showDeletePlaceholder} accent="rose" disabled={!customer?.id} />
                            </div>
                            {/* <div className="flex items-center space-x-4">
                                {isLoadingCustomer && <span className="text-xs text-gray-500">Laddar kund...</span>}
                                {saveStatus === 'saved' && <span className="text-xs text-lime-700">Sparad</span>}
                                {saveStatus === 'error' && <span className="text-xs text-rose-700">{saveError || 'Kunde inte spara.'}</span>}
                            </div> */}
                        </div>

                        <form autoComplete="off" className="grid gap-15 md:grid-cols-[360px_380px_200px] overflow-auto">
                            <div>
                                <LabeledInput
                                    name="customerName"
                                    label="Namn"
                                    value={customer.customerName ?? ''}
                                    onChange={(value) => handleChange('customerName', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="organization"
                                />
                                <LabeledInput
                                    name="customerNr"
                                    label="Kundnr"
                                    type="number"
                                    integerOnly
                                    value={customer.customerNr}
                                    onChange={(value) => handleChange('customerNr', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="off"
                                />
                                <LabeledInput
                                    name="orgNr"
                                    label="Org./persnr"
                                    value={customer.orgNr ?? ''}
                                    onChange={(value) => handleChange('orgNr', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="off"
                                />
                                <LabeledInput
                                    name="vatNr"
                                    label="VAT-nr"
                                    value={customer.vatNr ?? ''}
                                    onChange={(value) => handleChange('vatNr', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="off"
                                />
                                <LabeledInput
                                    name="telephone"
                                    label="Telefon"
                                    value={customer.telephone ?? ''}
                                    onChange={(value) => handleChange('telephone', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="tel"
                                />
                                <LabeledInput
                                    name="mobilePhone"
                                    label="Mobiltelefon"
                                    value={customer.mobilePhone ?? ''}
                                    onChange={(value) => handleChange('mobilePhone', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="tel-national"
                                />
                                <LabeledInput
                                    name="email"
                                    label="Epost"
                                    value={customer.email ?? ''}
                                    onChange={(value) => handleChange('email', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="email"
                                />

                                <LabeledSwitch
                                    name="isActive"
                                    label="Aktiv"
                                    value={Boolean(customer.isActive)}
                                    onChange={(checked) => handleChange('isActive', checked)}
                                    labelWidth="w-22"
                                    margintop="2"
                                />
                            </div>

                            <div>
                                <div className="flex space-x-1 w-full pb-[1px]">
                                    <p className="w-22 text-xs pt-2 text-gray-700">Besöksadress</p>
                                    <div className="">
                                        <Input name="invoiceStreet1" value={customer.street1} onChange={(e) => handleChange('street1', e.target.value)} autoComplete="section-invoice billing address-line1" />
                                        <Input name="invoiceStreet2" value={customer.street2} onChange={(e) => handleChange('street2', e.target.value)} className="mt-[1px]" autoComplete="section-invoice billing address-line2" />
                                        <div className="flex space-x-1 w-full mt-[1px]">
                                            <Input name="invoiceZip" value={customer.zipCode} onChange={(e) => handleChange('zipCode', e.target.value)} className="w-1/3" autoComplete="section-invoice billing postal-code" />
                                            <Input name="invoiceCity" value={customer.city} onChange={(e) => handleChange('city', e.target.value)} className="w-2/3" autoComplete="section-invoice billing address-level2" />
                                        </div>
                                    </div>
                                </div>


                                <LabeledTextArea
                                    name="note"
                                    label="Märkning"
                                    value={customer.note ?? ''}
                                    onChange={(value) => handleChange('note', value)}
                                    labelWidth="w-22"
                                    margintop="2"
                                    height="h-[130px]"
                                />
                            </div>

                            <div>
                                <LabeledSwitch
                                    name="vatRegisterd"
                                    label="Momspliktig"
                                    value={Boolean(customer.vatRegisterd)}
                                    onChange={(checked) => handleChange('vatRegisterd', checked)}
                                    labelWidth="w-28"
                                    margintop="0"
                                />
                                <LabeledSwitch
                                    name="isCompany"
                                    label="Är försäkringsbolag"
                                    value={Boolean(customer.isCompany)}
                                    onChange={(checked) => handleChange('isCompany', checked)}
                                    labelWidth="w-28"
                                    margintop="0"
                                />

                                <LabeledInput
                                    name="nrOfInvoiceDays"
                                    label="Antal kreditdagar"
                                    type="number"
                                    integerOnly
                                    value={customer.nrOfInvoiceDays}
                                    onChange={(value) => handleChange('nrOfInvoiceDays', value)}
                                    labelWidth="w-28"
                                    margintop="1"
                                    autoComplete="off"
                                />
                                <LabeledInput
                                    name="creditLimit"
                                    label="Kreditlimit (kr)"
                                    type="number"
                                    value={customer.creditLimit}
                                    onChange={(value) => handleChange('creditLimit', value)}
                                    labelWidth="w-28"
                                    margintop="0"
                                    autoComplete="off"
                                />

                                <div className="mt-4">
                                    <LabeledInput
                                        name="pgNr"
                                        label="Pg.nr."
                                        value={customer.pgNr ?? ''}
                                        onChange={(value) => handleChange('pgNr', value)}
                                        labelWidth="w-28"
                                        margintop="0"
                                        autoComplete="off"
                                    />
                                    <LabeledInput
                                        name="bgNr"
                                        label="Bg.nr."
                                        value={customer.bgNr ?? ''}
                                        onChange={(value) => handleChange('bgNr', value)}
                                        labelWidth="w-28"
                                        margintop="0"
                                        autoComplete="off"
                                    />
                                    <LabeledInput
                                        name="keyFortnox"
                                        label="Nyckel Fortnox"
                                        value={customer.keyFortnox ?? ''}
                                        onChange={(value) => handleChange('keyFortnox', value)}
                                        labelWidth="w-28"
                                        margintop="0"
                                        autoComplete="off"
                                    />
                                    <LabeledInput
                                        name="keyWinassist"
                                        label="Nyckel E-ekonomi"
                                        value={customer.keyWinassist ?? ''}
                                        onChange={(value) => handleChange('keyWinassist', value)}
                                        labelWidth="w-28"
                                        margintop="0"
                                        autoComplete="off"
                                    />
                                    <LabeledInput
                                        name="crediflowPartyId"
                                        label="Nyckel Crediflow"
                                        type="number"
                                        integerOnly
                                        value={customer.crediflowPartyId}
                                        onChange={(value) => handleChange('crediflowPartyId', value)}
                                        labelWidth="w-28"
                                        margintop="0"
                                        autoComplete="off"
                                    />
                                    <LabeledInput
                                        name="glnnr"
                                        label="GLN.nr."
                                        type="number"
                                        integerOnly
                                        value={customer.glnnr}
                                        onChange={(value) => handleChange('glnnr', value)}
                                        labelWidth="w-28"
                                        margintop="0"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                        </form>
                    </section>

                </div>

            </div>

        </div>
    )
}
