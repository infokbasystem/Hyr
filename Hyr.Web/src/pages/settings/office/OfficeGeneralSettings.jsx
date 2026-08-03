import { useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Save } from 'lucide-react'

import ActionButton from '../../../components/ActionButton'
import ConfirmationModal from '../../../components/ConfirmationModal'
import LabeledSwitch from '../../../components/LabeledSwitch'
import TimeDropdownInput from '../../../components/TimeDropdownInput'
import { getSharedRequest } from '../../../lib/sharedRequest'
import { getOfficeItemTypeSettings, updateOfficeItemTypeSettings } from '../../../lib/officeApi'

function createSelectionSnapshot(itemTypes, defaultBookedFromTime, defaultBookedToTime) {
    const selectedIds = (itemTypes ?? [])
        .filter((itemType) => itemType?.isSelected)
        .map((itemType) => Number(itemType.id))
        .filter((itemTypeId) => Number.isInteger(itemTypeId) && itemTypeId > 0)
        .sort((a, b) => a - b)

    return JSON.stringify({
        selectedIds,
        defaultBookedFromTime: String(defaultBookedFromTime ?? '').trim(),
        defaultBookedToTime: String(defaultBookedToTime ?? '').trim(),
    })
}

function mapMessage(type, text) {
    return { type, text }
}

export default function OfficeGeneralSettings() {
    const [itemTypes, setItemTypes] = useState([])
    const [initialSnapshot, setInitialSnapshot] = useState('[]')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [messages, setMessages] = useState([])
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
    const [defaultBookedFromTime, setDefaultBookedFromTime] = useState('')
    const [defaultBookedToTime, setDefaultBookedToTime] = useState('')

    const currentSnapshot = useMemo(() => (
        createSelectionSnapshot(itemTypes, defaultBookedFromTime, defaultBookedToTime)
    ), [itemTypes, defaultBookedFromTime, defaultBookedToTime])
    const isDirty = currentSnapshot !== initialSnapshot
    const isVehicleEnabled = itemTypes.some((itemType) => (
        Boolean(itemType?.isSelected) && String(itemType?.code ?? '').toUpperCase() === 'VEHICLE'
    ))

    const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
        return isDirty && currentLocation.pathname !== nextLocation.pathname
    })

    useEffect(() => {
        if (navigationBlocker.state === 'blocked') {
            setShowUnsavedWarning(true)
        }
    }, [navigationBlocker.state])

    useEffect(() => {
        function handleBeforeUnload(event) {
            if (!isDirty) {
                return
            }

            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isDirty])

    useEffect(() => {
        let isActive = true

        async function loadSettings() {
            setIsLoading(true)

            try {
                const data = await getSharedRequest('office:item-type-settings', () => getOfficeItemTypeSettings())

                if (!isActive) {
                    return
                }

                const nextItemTypes = Array.isArray(data?.itemTypes) ? data.itemTypes : []
                const nextDefaultBookedFromTime = String(data?.defaultBookedFromTime ?? '').trim()
                const nextDefaultBookedToTime = String(data?.defaultBookedToTime ?? '').trim()

                setItemTypes(nextItemTypes)
                setDefaultBookedFromTime(nextDefaultBookedFromTime)
                setDefaultBookedToTime(nextDefaultBookedToTime)
                setInitialSnapshot(createSelectionSnapshot(nextItemTypes, nextDefaultBookedFromTime, nextDefaultBookedToTime))
            } catch (error) {
                if (!isActive) {
                    return
                }

                const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta objekttypsinställningar.'
                setMessages([mapMessage('error', errorText)])
            } finally {
                if (isActive) {
                    setIsLoading(false)
                }
            }
        }

        loadSettings()

        return () => {
            isActive = false
        }
    }, [])

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

    function handleToggleItemType(itemTypeId) {
        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
        setItemTypes((previous) => previous.map((itemType) => {
            if (itemType.id !== itemTypeId) {
                return itemType
            }

            return {
                ...itemType,
                isSelected: !itemType.isSelected,
            }
        }))
    }

    async function handleSave() {
        setIsSaving(true)

        try {
            const selectedIds = itemTypes
                .filter((itemType) => itemType.isSelected)
                .map((itemType) => itemType.id)

            const saved = await updateOfficeItemTypeSettings({
                itemTypeIds: selectedIds,
                defaultBookedFromTime,
                defaultBookedToTime,
            })

            const nextItemTypes = Array.isArray(saved?.itemTypes) ? saved.itemTypes : []
            const nextDefaultBookedFromTime = String(saved?.defaultBookedFromTime ?? '').trim()
            const nextDefaultBookedToTime = String(saved?.defaultBookedToTime ?? '').trim()

            setItemTypes(nextItemTypes)
            setDefaultBookedFromTime(nextDefaultBookedFromTime)
            setDefaultBookedToTime(nextDefaultBookedToTime)
            setInitialSnapshot(createSelectionSnapshot(nextItemTypes, nextDefaultBookedFromTime, nextDefaultBookedToTime))
            setMessages([mapMessage('success', 'Objekttypsinställningar sparade.')])
        } catch (error) {
            const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte spara objekttypsinställningar.'
            setMessages([mapMessage('error', errorText)])
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

            <h1 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Inställningar</h1>

            <div className="mb-1 mt-3 flex items-start justify-between gap-5">
                <div className="flex items-center gap-6">
                    <ActionButton
                        label="Spara"
                        icon={Save}
                        onClick={handleSave}
                        accent="lime"
                        disabled={isLoading || isSaving}
                    />
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

            <div className="mt-5 max-w-[300px]">
                <h2 className="text-xs uppercase tracking-[0.12em] text-gray-600">Objekttyper för kontoret</h2>
                <p className="mt-2 text-xs text-gray-500">Välj vilka objekttyper detta kontor ska kunna hantera.</p>

                {isLoading ? (
                    <div className="mt-4 text-xs text-gray-500">Laddar objekttyper...</div>
                ) : itemTypes.length === 0 ? (
                    <div className="mt-4 text-xs text-gray-500">Inga objekttyper hittades.</div>
                ) : (
                    <div className="mt-4">
                        {itemTypes.map((itemType) => (
                            <LabeledSwitch
                                id={`office-item-type-${itemType.id}`}
                                name={`office-item-type-${itemType.id}`}
                                label={`${itemType.name}`}
                                labelWidth="w-16"
                                value={Boolean(itemType.isSelected)}
                                onChange={() => handleToggleItemType(itemType.id)}
                                disabled={isSaving}
                            />
                        ))}
                    </div>
                )}

                {isVehicleEnabled && (
                    <>
                        <h2 className="mt-6 text-xs uppercase tracking-[0.12em] text-gray-600">Standardtid för bokning</h2>
                        <p className="mt-2 text-xs text-gray-500">Används som förvald tid när bil läggs till i bokning.</p>

                        <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-3 text-xs text-gray-700">
                                <span className="w-28">Bokad från</span>
                                <TimeDropdownInput
                                    value={defaultBookedFromTime}
                                    onChange={(value) => {
                                        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
                                        setDefaultBookedFromTime(value)
                                    }}
                                    disabled={isLoading || isSaving}
                                />
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-700">
                                <span className="w-28">Bokad till</span>
                                <TimeDropdownInput
                                    value={defaultBookedToTime}
                                    onChange={(value) => {
                                        setMessages((previous) => previous.filter((message) => message.type !== 'success'))
                                        setDefaultBookedToTime(value)
                                    }}
                                    disabled={isLoading || isSaving}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
