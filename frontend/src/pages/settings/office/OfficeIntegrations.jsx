import { useEffect, useState } from 'react'
import { Plug, Save, Trash2 } from 'lucide-react'

import ActionButton from '../../../components/ActionButton'
import LabeledCheckbox from '../../../components/LabeledCheckbox'
import LabeledInput from '../../../components/LabeledInput'
import LabeledSelect from '../../../components/LabeledSelect'
import { getSharedRequest } from '../../../lib/sharedRequest'
import {
    clearFortnoxToken,
    getFortnoxSettings,
    getTinkSettings,
    startFortnoxPairing,
    updateFortnoxSettings,
    updateTinkSettings,
} from '../../../lib/officeApi'

const ACCOUNT_TYPES = [
    { id: 'iban', name: 'IBAN' },
    { id: 'se', name: 'Svenskt kontonummer (BBAN)' },
]

function formatDateTime(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('sv-SE')
}

function formatExpiry(createdAt, expiresInSeconds) {
    if (!createdAt || !Number.isFinite(expiresInSeconds)) return '-'
    const created = new Date(createdAt)
    if (Number.isNaN(created.getTime())) return '-'
    return formatDateTime(new Date(created.getTime() + expiresInSeconds * 1000))
}

export default function OfficeIntegrations() {
    const [settings, setSettings] = useState(null)
    const [clientSecret, setClientSecret] = useState('')
    const [messages, setMessages] = useState([])
    const [isSaving, setIsSaving] = useState(false)
    const [fortnoxSettings, setFortnoxSettings] = useState(null)
    const [isPairingFortnox, setIsPairingFortnox] = useState(false)
    const [isClearingFortnoxToken, setIsClearingFortnoxToken] = useState(false)

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

    useEffect(() => {
        let isActive = true

        getSharedRequest('office:fortnox-settings', () => getFortnoxSettings())
            .then((data) => {
                if (isActive) setFortnoxSettings(data)
            })
            .catch((error) => {
                if (!isActive) return
                const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta Fortnox-inställningar.'
                setMessages([{ type: 'error', text: errorText }])
            })

        return () => { isActive = false }
    }, [])

    function updateField(field, value) {
        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
        setSettings((previous) => ({ ...previous, [field]: value }))
    }

    function updateFortnoxField(field, value) {
        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
        setFortnoxSettings((previous) => ({ ...previous, [field]: value }))
    }

    async function handleSubmit(event) {
        event?.preventDefault?.()
        if (!settings) return

        setIsSaving(true)
        try {
            const [savedTink, savedFortnox] = await Promise.all([
                updateTinkSettings({ ...settings, tinkClientSecret: clientSecret }),
                fortnoxSettings ? updateFortnoxSettings(fortnoxSettings) : Promise.resolve(fortnoxSettings),
            ])
            setSettings(savedTink)
            setClientSecret('')
            if (savedFortnox) setFortnoxSettings(savedFortnox)
            setMessages([{ type: 'success', text: 'Integrationsinställningar sparade.' }])
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte spara integrationsinställningar.'
            setMessages([{ type: 'error', text: errorText }])
        } finally {
            setIsSaving(false)
        }
    }

    async function handleStartFortnoxPairing() {
        setIsPairingFortnox(true)
        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
        try {
            const redirectUrl = `${window.location.origin}/settings/fortnoxredirect`
            const response = await startFortnoxPairing(redirectUrl)
            if (response?.redirectUrl) {
                window.location.href = response.redirectUrl
            }
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte starta parkoppling med Fortnox.'
            setMessages([{ type: 'error', text: errorText }])
        } finally {
            setIsPairingFortnox(false)
        }
    }

    async function handleClearFortnoxToken() {
        setIsClearingFortnoxToken(true)
        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
        try {
            const saved = await clearFortnoxToken()
            setFortnoxSettings(saved)
            setMessages([{ type: 'success', text: 'Fortnox-token rensad.' }])
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte rensa Fortnox-token.'
            setMessages([{ type: 'error', text: errorText }])
        } finally {
            setIsClearingFortnoxToken(false)
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

            <form onSubmit={handleSubmit} className="mt-5 max-w-[600px]">
                <h2 className="mb-2 text-xs uppercase tracking-[0.12em] text-gray-600">Fortnox</h2>

                <div className="flex items-center gap-6">
                    <LabeledCheckbox
                        label="Använd Fortnox"
                        checked={Boolean(fortnoxSettings?.useFortnox)}
                        onChange={(checked) => updateFortnoxField('useFortnox', checked)}
                        color="cyan"
                        uncheckedBorderColor="#d1d5db"
                    />

                    <ActionButton
                        label="Starta parkoppling"
                        icon={Plug}
                        onClick={handleStartFortnoxPairing}
                        disabled={!fortnoxSettings?.useFortnox || isPairingFortnox}
                    />

                    <ActionButton
                        label="Rensa Fortnox-token"
                        icon={Trash2}
                        onClick={handleClearFortnoxToken}
                        disabled={isClearingFortnoxToken || (!fortnoxSettings?.hasAccessToken && !fortnoxSettings?.hasRefreshToken)}
                        accent='rose'
                    />

                </div>

                {fortnoxSettings?.useFortnox && (
                    <>
                        <LabeledInput
                            label="Fortnox-token"
                            labelWidth="w-40"
                            margintop="2"
                            disabled
                            value=""
                            placeholder={fortnoxSettings?.hasAccessToken && fortnoxSettings?.hasRefreshToken ? '•••••••• (sparad)' : 'Ej sparad'}
                        />

                        <LabeledInput
                            label="Token skapad"
                            labelWidth="w-40"
                            margintop="0"
                            disabled
                            value={fortnoxSettings?.fortnoxTokenCreated ? formatDateTime(fortnoxSettings.fortnoxTokenCreated) : ''}
                            placeholder="-"
                        />

                        <LabeledInput
                            label="Token går ut"
                            labelWidth="w-40"
                            margintop="0"
                            disabled
                            value={fortnoxSettings?.fortnoxTokenCreated
                                ? formatExpiry(fortnoxSettings.fortnoxTokenCreated, fortnoxSettings.fortnoxTokenExpiresInSeconds)
                                : ''}
                            placeholder="-"
                        />
                    </>
                )}

                <div className="h-6" />

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
