import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import ActionButton from '../../../components/ActionButton'
import LabeledCheckbox from '../../../components/LabeledCheckbox'
import LabeledInput from '../../../components/LabeledInput'
import LabeledSelect from '../../../components/LabeledSelect'
import { getSharedRequest } from '../../../lib/sharedRequest'
import { getTinkSettings, updateTinkSettings } from '../../../lib/officeApi'

const ACCOUNT_TYPES = [
    { id: 'iban', name: 'IBAN' },
    { id: 'se', name: 'Svenskt kontonummer (BBAN)' },
]

export default function OfficeIntegrations() {
    const [settings, setSettings] = useState(null)
    const [clientSecret, setClientSecret] = useState('')
    const [messages, setMessages] = useState([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        let isActive = true

        getSharedRequest('office:tink-settings', () => getTinkSettings())
            .then((data) => {
                if (isActive) setSettings(data)
            })
            .catch((error) => {
                if (!isActive) return
                const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta Tink-inställningar.'
                setMessages([{ type: 'error', text: errorText }])
            })

        return () => { isActive = false }
    }, [])

    function updateField(field, value) {
        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
        setSettings((previous) => ({ ...previous, [field]: value }))
    }

    async function handleSubmit(event) {
        event?.preventDefault?.()
        if (!settings) return

        setIsSaving(true)
        try {
            const saved = await updateTinkSettings({ ...settings, tinkClientSecret: clientSecret })
            setSettings(saved)
            setClientSecret('')
            setMessages([{ type: 'success', text: 'Tink-inställningar sparade.' }])
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte spara Tink-inställningar.'
            setMessages([{ type: 'error', text: errorText }])
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="w-full pl-10 py-2">
            <h1 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Integrationer</h1>

            <div className="mb-1 mt-3 flex items-start justify-between gap-5">
                <ActionButton label="Spara" icon={Save} onClick={handleSubmit} accent="lime" disabled={isSaving || !settings} />
                {messages.length > 0 && (
                    <div className="pl-4 text-center text-xs text-gray-700">
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

            <form onSubmit={handleSubmit} className="mt-5 max-w-[560px]">
                <h2 className="mb-2 text-xs uppercase tracking-[0.12em] text-gray-600">Tink</h2>

                <LabeledCheckbox
                    label="Aktivera Tink-betalningar"
                    checked={Boolean(settings?.tinkEnabled)}
                    onChange={(checked) => updateField('tinkEnabled', checked)}
                    color="cyan"
                    uncheckedBorderColor="#d1d5db"
                />

                {settings?.tinkEnabled && (
                    <>
                        <LabeledInput
                            label="Client id"
                            labelWidth="w-40"
                            margintop="2"
                            value={settings?.tinkClientId ?? ''}
                            onChange={(value) => updateField('tinkClientId', value)}
                        />

                        <LabeledInput
                            label="Client secret"
                            labelWidth="w-40"
                            margintop="0"
                            type="password"
                            placeholder={settings?.hasClientSecret ? 'Sparad – fyll i för att byta' : 'Ej sparad'}
                            value={clientSecret}
                            onChange={(value) => setClientSecret(value)}
                        />

                        <LabeledInput
                            label="Marknad"
                            labelWidth="w-40"
                            margintop="0"
                            placeholder="SE"
                            value={settings?.tinkMarket ?? ''}
                            onChange={(value) => updateField('tinkMarket', value)}
                        />

                        <LabeledInput
                            label="Språk"
                            labelWidth="w-40"
                            margintop="0"
                            placeholder="sv_SE"
                            value={settings?.tinkLocale ?? ''}
                            onChange={(value) => updateField('tinkLocale', value)}
                        />

                        <LabeledInput
                            label="Mottagarnamn"
                            labelWidth="w-40"
                            margintop="2"
                            value={settings?.tinkRecipientName ?? ''}
                            onChange={(value) => updateField('tinkRecipientName', value)}
                        />

                        <LabeledInput
                            label="Mottagarkonto"
                            labelWidth="w-40"
                            margintop="0"
                            value={settings?.tinkRecipientAccountNumber ?? ''}
                            onChange={(value) => updateField('tinkRecipientAccountNumber', value)}
                        />

                        <LabeledSelect
                            label="Kontotyp"
                            labelWidth="w-40"
                            margintop="0"
                            value={settings?.tinkRecipientAccountType ?? 'iban'}
                            items={ACCOUNT_TYPES}
                            onChange={(value) => updateField('tinkRecipientAccountType', value)}
                        />

                        <LabeledInput
                            label="Betalningsschema"
                            labelWidth="w-40"
                            margintop="0"
                            placeholder="SEPA_CREDIT_TRANSFER"
                            value={settings?.tinkPaymentScheme ?? ''}
                            onChange={(value) => updateField('tinkPaymentScheme', value)}
                        />
                    </>
                )}
            </form>
        </div>
    )
}
