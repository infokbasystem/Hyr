import LabeledInput from './LabeledInput'
import LabeledSwitch from './LabeledSwitch'
import LabeledTextArea from './LabeledTextArea'
import Input from './Input'

const CONTACT_FIELDS = [
    { name: 'customerName', label: 'Namn', autoComplete: 'organization' },
    { name: 'customerNr', label: 'Kundnr', type: 'number', integerOnly: true },
    { name: 'orgNr', label: 'Org./persnr' },
    { name: 'vatNr', label: 'VAT-nr' },
    { name: 'telephone', label: 'Telefon', autoComplete: 'tel' },
    { name: 'mobilePhone', label: 'Mobiltelefon', autoComplete: 'tel-national' },
    { name: 'email', label: 'Epost', autoComplete: 'email' },
]

const CREDIT_FIELDS = [
    { name: 'nrOfInvoiceDays', label: 'Antal kreditdagar', type: 'number', integerOnly: true, margintop: '1' },
    { name: 'creditLimit', label: 'Kreditlimit (kr)', type: 'number' },
    { name: 'discountPercent', label: 'Rabatt (%)', type: 'number' },
]

const PAYMENT_FIELDS = [
    { name: 'pgNr', label: 'Pg.nr.' },
    { name: 'bgNr', label: 'Bg.nr.' },
    { name: 'keyFortnox', label: 'Nyckel Fortnox' },
    { name: 'keyWinassist', label: 'Nyckel E-ekonomi' },
    { name: 'crediflowPartyId', label: 'Nyckel Crediflow', type: 'number', integerOnly: true },
    { name: 'glnnr', label: 'GLN.nr.', type: 'number', integerOnly: true },
]

export default function CustomerFormFields({ customer, onChange }) {
    function renderInput(field, labelWidth) {
        return (
            <LabeledInput
                key={field.name}
                labelWidth={labelWidth}
                margintop="0"
                autoComplete="off"
                align="left"
                {...field}
                aria-label={field.label}
                value={customer[field.name] ?? (field.type === 'number' ? null : '')}
                onChange={(value) => onChange(field.name, value)}
            />
        )
    }

    return (
        <div className="grid gap-15 md:grid-cols-[360px_380px_200px] overflow-auto">
            <div>
                {CONTACT_FIELDS.map((field) => renderInput(field, 'w-22'))}
                <LabeledSwitch
                    name="isActive"
                    label="Aktiv"
                    value={Boolean(customer.isActive)}
                    onChange={(checked) => onChange('isActive', checked)}
                    labelWidth="w-22"
                    margintop="2"
                />
            </div>

            <div>
                <div className="flex w-full pb-[1px]">
                    <p className="min-w-22 text-xs pt-2 text-gray-700">Besöksadress</p>
                    <div>
                        <Input name="invoiceStreet1" aria-label="Besöksadress" value={customer.street1} onChange={(e) => onChange('street1', e.target.value)} autoComplete="section-invoice billing address-line1" />
                        <Input name="invoiceStreet2" aria-label="Besöksadress rad 2" value={customer.street2} onChange={(e) => onChange('street2', e.target.value)} className="mt-[1px]" autoComplete="section-invoice billing address-line2" />
                        <div className="flex mt-[1px] grid grid-cols-[1fr_2fr] gap-1">
                            <Input name="invoiceZip" aria-label="Postnummer" value={customer.zipCode} onChange={(e) => onChange('zipCode', e.target.value)} autoComplete="section-invoice billing postal-code" />
                            <Input name="invoiceCity" aria-label="Ort" value={customer.city} onChange={(e) => onChange('city', e.target.value)} autoComplete="section-invoice billing address-level2" />
                        </div>
                    </div>
                </div>
                <LabeledTextArea
                    name="note"
                    label="Märkning"
                    aria-label="Märkning"
                    value={customer.note ?? ''}
                    onChange={(value) => onChange('note', value)}
                    labelWidth="w-22"
                    margintop="2"
                    height="h-[80px]"
                />
            </div>

            <div>
                <LabeledSwitch
                    name="vatRegisterd"
                    label="Momspliktig"
                    value={Boolean(customer.vatRegisterd)}
                    onChange={(checked) => onChange('vatRegisterd', checked)}
                    labelWidth="w-28"
                    margintop="0"
                />
                <LabeledSwitch
                    name="isCompany"
                    label="Är försäkringsbolag"
                    value={Boolean(customer.isCompany)}
                    onChange={(checked) => onChange('isCompany', checked)}
                    labelWidth="w-28"
                    margintop="0"
                />
                {CREDIT_FIELDS.map((field) => renderInput(field, 'w-28'))}
                <div className="mt-4">
                    {PAYMENT_FIELDS.map((field) => renderInput(field, 'w-28'))}
                </div>
            </div>
        </div>
    )
}
