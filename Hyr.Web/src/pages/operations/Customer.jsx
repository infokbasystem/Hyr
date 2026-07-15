import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, Save, Trash2 } from 'lucide-react'

import ActionButton from '../../components/ActionButton'
import LabeledInput from '../../components/LabeledInput'
import LabeledSwitch from '../../components/LabeledSwitch'
import LabeledTextArea from '../../components/LabeledTextArea'
import Input from '../../components/Input'
import { formatUserName } from '../../utils/nameFormatters'
import { createCustomer, getCustomerById, updateCustomer } from '../../lib/customerApi'

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

export default function Customer() {
    const navigate = useNavigate()
    const params = useParams()

    const [customer, setCustomer] = useState(null)
    const [originalCustomer, setOriginalCustomer] = useState(null)
    const [messages, setMessages] = useState([])

    function hasUnsavedChanges() {
        if (!originalCustomer) {
            return true
        }

        if (!customer) {
            return false
        }

        return JSON.stringify(customer) !== JSON.stringify(originalCustomer)
    }

    function handleChange(field, value) {
        setMessages((prev) => prev.filter((message) => message.type !== 'success'))
        setCustomer((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function loadCustomer(customerId) {
        if (customerId === 'new') {
            setCustomer(cloneCustomer(EMPTY_CUSTOMER))
            setOriginalCustomer(null)
            return
        }

        try {
            const data = await getCustomerById(customerId)
            setCustomer(data)
            setOriginalCustomer(cloneCustomer(data))
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta kund.'
            setMessages([{ type: 'error', text: errorText }])
        }
    }

    useEffect(() => {
        loadCustomer(params.id)
    }, [params.id])

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

            if (params.id === 'new' || !customer.id) {
                customerId = await createCustomer(payload)
            } else {
                customerId = await updateCustomer(customer.id, payload)
            }

            const refreshedCustomer = await getCustomerById(customerId)
            setCustomer(refreshedCustomer)
            setOriginalCustomer(cloneCustomer(refreshedCustomer))
            setMessages([{ type: 'success', text: 'Kunden sparad' }])

            if (`${params.id}` !== `${customerId}`) {
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
        return (
            <div className="relative flex h-full flex-col p-2">
                <h2 className="ml-5 pb-2 text-sm text-gray-700">Laddar kund...</h2>
            </div>
        )
    }

    return (
        <div className="relative flex h-full flex-col py-2">
            <h2 className="ml-10 pb-2 text-sm text-gray-700">{customer?.customerName || 'Ny kund'}</h2>

            <div className="mt-1 mx-8 flex h-full items-stretch">
                <div className="flex-grow pe-10">
                    <form onSubmit={submitCustomer} autoComplete="off" className="flex h-full flex-col">
                        <div className="mb-3 flex items-center gap-5">
                            <ActionButton label="Tillbaka" icon={ArrowLeft} accent="slate" onClick={() => navigate('/operations/searchcustomer')} />
                            <ActionButton label="Spara" icon={Save} accent="lime" onClick={submitCustomer} />
                            <ActionButton label="Logg" icon={Clock3} accent="sky" onClick={showLogPlaceholder} />
                            <ActionButton label="Radera" icon={Trash2} accent="rose" onClick={showDeletePlaceholder} disabled={!customer?.id} />
                        </div>

                        <div className="grid flex-1 grid-cols-[1.05fr_1.05fr_0.75fr] gap-15 overflow-auto pb-5 pr-30">
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
                                    onClick={(checked) => handleChange('isActive', checked)}
                                    labelWidth="w-22"
                                    margintop="2"
                                />
                            </div>

                            <div>
                                <div className="flex space-x-1 w-full pb-[1px]">
                                    <p className="w-22 text-xs pt-2 text-gray-700">Besöksadress</p>
                                    <div className="">
                                        <Input name="invoiceStreet1" value={customer.street1} onChange={(e) => handleChange('street1', value)} autoComplete="section-invoice billing address-line1" />
                                        <Input name="invoiceStreet2" value={customer.street2} onChange={(e) => handleChange('street2', e.target.value)} className="mt-[1px]" autoComplete="section-invoice billing address-line2" />
                                        <div className="flex space-x-1 w-full mt-[1px]">
                                            <Input name="invoiceZip" value={customer.zipCode} onChange={(e) => handleChange('zipCode', e.target.value)} className="w-1/3" autoComplete="section-invoice billing postal-code" />
                                            <Input name="invoiceCity" value={customer.city} onChange={(e) => handleChange('city', e.target.value)} className="w-2/3" autoComplete="section-invoice billing address-level2" />
                                        </div>
                                    </div>
                                </div>
                                {/* <LabeledInput
                                    name="street1"
                                    label="Besöksadress"
                                    value={customer.street1 ?? ''}
                                    onChange={(value) => handleChange('street1', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="address-line1"
                                />
                                <LabeledInput
                                    name="street2"
                                    label=""
                                    value={customer.street2 ?? ''}
                                    onChange={(value) => handleChange('street2', value)}
                                    labelWidth="w-22"
                                    margintop="0"
                                    autoComplete="address-line2"
                                />
                                <div className="mt-0 grid grid-cols-[1fr_2fr] gap-1 pl-[93px]">
                                    <LabeledInput
                                        name="zipCode"
                                        label=""
                                        value={customer.zipCode ?? ''}
                                        onChange={(value) => handleChange('zipCode', value)}
                                        labelWidth="w-0"
                                        margintop="0"
                                        autoComplete="postal-code"
                                    />
                                    <LabeledInput
                                        name="city"
                                        label=""
                                        value={customer.city ?? ''}
                                        onChange={(value) => handleChange('city', value)}
                                        labelWidth="w-0"
                                        margintop="0"
                                        autoComplete="address-level2"
                                    />
                                </div> */}

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
                                    onClick={(checked) => handleChange('vatRegisterd', checked)}
                                    labelWidth="w-28"
                                    margintop="0"
                                />
                                <LabeledSwitch
                                    name="isCompany"
                                    label="Är försäkringsbolag"
                                    value={Boolean(customer.isCompany)}
                                    onClick={(checked) => handleChange('isCompany', checked)}
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
                        </div>
                    </form>
                </div>

                <div className="flex flex-col w-70 border-l border-gray-300 px-4 py-2 mb-20">
                    <div className="space-y-3">
                        <h2 className="text-sm text-center text-gray-500">Info</h2>
                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                {customer?.createdDate && (
                                    <>
                                        <div className="text-gray-500">
                                            <span className="font-medium">Skapad:</span>
                                        </div>
                                        <div className="text-gray-700">
                                            {new Date(customer.createdDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-gray-500">
                                            {customer?.createdByUserName && `av ${formatUserName(customer.createdByUserName)}`}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                {customer?.modifiedDate && (
                                    <>
                                        <div className="text-gray-500">
                                            <span className="font-medium">Redigerad:</span>
                                        </div>
                                        <div className="text-gray-700">
                                            {new Date(customer.modifiedDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-gray-500">
                                            {customer?.modifiedByUserName && `av ${formatUserName(customer.modifiedByUserName)}`}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <hr className="mt-7 border-gray-300 dark:border-white" />
                    <h2 className="text-sm text-center text-gray-500 mt-5">Meddelanden</h2>
                    {messages.length === 0 ? (
                        <p className="text-xs text-center font-light mt-5">Inga meddelanden</p>
                    ) : (
                        <ul className="mt-2 space-y-2">
                            {messages.map((message, index) => (
                                <li
                                    key={index}
                                    className={`text-center text-xs p-2 rounded border border-gray-200 ${message.type === 'error' ? 'bg-red-100 text-red-700' : message.type === 'info' ? 'bg-sky-100 text-sky-700' : 'bg-green-100 text-green-700'}`}
                                >
                                    {message.text}
                                </li>
                            ))}
                        </ul>
                    )}
                    <hr className="mt-7 border-gray-300 dark:border-white" />
                </div>
            </div>
        </div>
    )
}
