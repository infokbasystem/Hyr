import { useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Save } from 'lucide-react'

import ActionButton from '../../../components/ActionButton'
import ConfirmationModal from '../../../components/ConfirmationModal'
import LabeledSwitch from '../../../components/LabeledSwitch'
import { getSharedRequest } from '../../../lib/sharedRequest'
import { getOfficeItemTypeSettings, updateOfficeItemTypeSettings } from '../../../lib/officeApi'

function createSelectionSnapshot(itemTypes) {
    const selectedIds = (itemTypes ?? [])
        .filter((itemType) => itemType?.isSelected)
        .map((itemType) => Number(itemType.id))
        .filter((itemTypeId) => Number.isInteger(itemTypeId) && itemTypeId > 0)
        .sort((a, b) => a - b)

    return JSON.stringify(selectedIds)
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

    const currentSnapshot = useMemo(() => createSelectionSnapshot(itemTypes), [itemTypes])
    const isDirty = currentSnapshot !== initialSnapshot

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
                setItemTypes(nextItemTypes)
                setInitialSnapshot(createSelectionSnapshot(nextItemTypes))
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

            const saved = await updateOfficeItemTypeSettings({ itemTypeIds: selectedIds })
            const nextItemTypes = Array.isArray(saved?.itemTypes) ? saved.itemTypes : []

            setItemTypes(nextItemTypes)
            setInitialSnapshot(createSelectionSnapshot(nextItemTypes))
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
                        <div className="w-80 border border-gray-200 bg-white py-2 pl-4 text-xs text-gray-700 shadow-sm">
                            {messages.map((message, index) => (
                                <div key={`${message.type}-${index}`} className={message.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}>
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
            </div>
        </div>
    )
}
