import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import LabeledCheckbox from '../components/LabeledCheckbox'
import LabeledSwitch from '../components/LabeledSwitch'
import { importFromFortnox } from '../lib/officeApi'

// Accounts first so imported articles can be linked to their sales account.
const IMPORT_ENTITIES = [
    { id: 'accounts', label: 'Konton' },
    { id: 'articles', label: 'Artiklar' },
    { id: 'customers', label: 'Kunder' },
]

const EMPTY_SELECTION = { accounts: true, articles: true, customers: true }

function createEmptyProgress() {
    return { status: 'pending', total: null, processed: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 }
}

function getErrorText(error, fallback) {
    return error?.payload?.message ?? error?.message ?? fallback
}

export default function FortnoxImportModal({ isOpen, onClose }) {
    const [selection, setSelection] = useState(EMPTY_SELECTION)
    const [updateExisting, setUpdateExisting] = useState(false)
    const [progress, setProgress] = useState({})
    const [errors, setErrors] = useState([])
    const [isRunning, setIsRunning] = useState(false)
    const [isDone, setIsDone] = useState(false)
    const cancelRequestedRef = useRef(false)

    useEffect(() => {
        if (!isOpen) return
        setProgress({})
        setErrors([])
        setIsDone(false)
        cancelRequestedRef.current = false
    }, [isOpen])

    if (!isOpen) return null

    const selectedEntities = IMPORT_ENTITIES.filter((entity) => selection[entity.id])

    function updateProgress(entityId, updater) {
        setProgress((previous) => ({
            ...previous,
            [entityId]: updater(previous[entityId] ?? createEmptyProgress()),
        }))
    }

    async function importEntity(entityId) {
        updateProgress(entityId, (current) => ({ ...current, status: 'running' }))

        let page = 1
        let totalPages = 1
        do {
            if (cancelRequestedRef.current) {
                updateProgress(entityId, (current) => ({ ...current, status: 'cancelled' }))
                return false
            }

            let result
            try {
                result = await importFromFortnox(entityId, { page, updateExisting })
            } catch (error) {
                const label = IMPORT_ENTITIES.find((entity) => entity.id === entityId)?.label ?? entityId
                setErrors((previous) => [...previous, `${label}: ${getErrorText(error, 'Importen misslyckades.')}`])
                updateProgress(entityId, (current) => ({ ...current, status: 'error' }))
                return true
            }

            totalPages = Math.max(result?.totalPages ?? 0, 1)
            updateProgress(entityId, (current) => ({
                ...current,
                total: result?.totalResources ?? current.total,
                processed: current.processed + (result?.processed ?? 0),
                inserted: current.inserted + (result?.inserted ?? 0),
                updated: current.updated + (result?.updated ?? 0),
                skipped: current.skipped + (result?.skipped ?? 0),
                failed: current.failed + (result?.failed ?? 0),
            }))
            if (result?.errors?.length) {
                setErrors((previous) => [...previous, ...result.errors])
            }
            page += 1
        } while (page <= totalPages)

        updateProgress(entityId, (current) => ({ ...current, status: 'done' }))
        return true
    }

    async function handleStart() {
        if (selectedEntities.length === 0 || isRunning) return

        cancelRequestedRef.current = false
        setIsRunning(true)
        setIsDone(false)
        setErrors([])
        setProgress(Object.fromEntries(selectedEntities.map((entity) => [entity.id, createEmptyProgress()])))

        try {
            for (const entity of selectedEntities) {
                const shouldContinue = await importEntity(entity.id)
                if (!shouldContinue) break
            }
        } finally {
            setIsRunning(false)
            setIsDone(true)
        }
    }

    function handleCancel() {
        if (isRunning) {
            cancelRequestedRef.current = true
            return
        }
        onClose?.()
    }

    function renderStatus(entityProgress) {
        if (!entityProgress) return null
        switch (entityProgress.status) {
            case 'running': return <span className="text-cyan-700">Importerar…</span>
            case 'done': return <span className="text-emerald-700">Klar</span>
            case 'error': return <span className="text-rose-700">Fel</span>
            case 'cancelled': return <span className="text-orange-600">Avbruten</span>
            default: return <span className="text-gray-400">Väntar</span>
        }
    }

    const hasProgress = Object.keys(progress).length > 0

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 z-40 bg-black/50" />
            <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={isRunning ? undefined : onClose}>
                <div
                    className="relative mx-4 w-full max-w-xl rounded-sm bg-white p-6 shadow-xl"
                    style={{ background: 'rgb(255, 255, 234)' }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="relative mb-4 flex items-center justify-center">
                        <h2 className="text-center text-sm font-semibold">IMPORTERA FRÅN FORTNOX</h2>
                        {!isRunning && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-l absolute right-0 mb-1 leading-none text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="mx-10 mt-7 text-xs text-gray-700">
                        <div className="flex flex-col gap-2">
                            {IMPORT_ENTITIES.map((entity) => (
                                <LabeledCheckbox
                                    key={entity.id}
                                    id={`fortnox-import-${entity.id}`}
                                    label={entity.label}
                                    labelWidth="w-40"
                                    labelPosition="left"
                                    checked={Boolean(selection[entity.id])}
                                    disabled={isRunning}
                                    onChange={(checked) => setSelection((previous) => ({ ...previous, [entity.id]: checked }))}
                                    color="cyan"
                                    uncheckedBorderColor="#d1d5db"
                                />
                            ))}
                        </div>

                        <LabeledSwitch
                            id="fortnox-import-update-existing"
                            name="fortnox-import-update-existing"
                            label="Uppdatera redan importerade"
                            labelWidth="w-40"
                            marginTop={8}
                            value={updateExisting}
                            disabled={isRunning}
                            onChange={(checked) => setUpdateExisting(Boolean(checked))}
                        />
                        <p className="mt-1 text-tiny text-gray-500">
                            {updateExisting
                                ? 'Nya poster läggs till och redan importerade uppdateras.'
                                : 'Endast nya poster läggs till, redan importerade lämnas orörda.'}
                        </p>

                        {hasProgress && (
                            <div className="mt-5 flex flex-col gap-3 border-t border-gray-200 pt-4">
                                {IMPORT_ENTITIES
                                    .filter((entity) => progress[entity.id])
                                    .map((entity) => {
                                        const entityProgress = progress[entity.id]
                                        const total = entityProgress.total
                                        const percent = total ? Math.min(100, Math.round((entityProgress.processed / total) * 100)) : 0
                                        return (
                                            <div key={entity.id}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{entity.label}</span>
                                                    <span className="tabular-nums">
                                                        {entityProgress.processed} / {total ?? '–'}
                                                        <span className="ml-3">{renderStatus(entityProgress)}</span>
                                                    </span>
                                                </div>
                                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                                    <div
                                                        className="h-full bg-cyan-500 transition-all"
                                                        style={{ width: `${entityProgress.status === 'done' ? 100 : percent}%` }}
                                                    />
                                                </div>
                                                <div className="mt-1 flex gap-4 text-tiny text-gray-500 tabular-nums">
                                                    <span>Nya: {entityProgress.inserted}</span>
                                                    <span>Uppdaterade: {entityProgress.updated}</span>
                                                    <span>Överhoppade: {entityProgress.skipped}</span>
                                                    {entityProgress.failed > 0 && (
                                                        <span className="text-rose-700">Fel: {entityProgress.failed}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}

                        {errors.length > 0 && (
                            <div className="mt-4 max-h-32 overflow-y-auto rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                                {errors.map((error, index) => (
                                    <div key={index}>{error}</div>
                                ))}
                            </div>
                        )}

                        <div className="mb-3 mt-6 flex justify-end gap-4 pt-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="shadow-md/30 bg-orange-400 p-[5px] px-10 text-xs text-white hover:bg-orange-600"
                            >
                                {isRunning ? 'Avbryt import' : isDone ? 'Stäng' : 'Avbryt'}
                            </button>
                            <button
                                type="button"
                                onClick={handleStart}
                                disabled={isRunning || selectedEntities.length === 0}
                                className="shadow-md/30 bg-lime-700 p-[5px] px-10 text-xs text-white hover:bg-lime-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isRunning ? 'Importerar…' : 'Starta import'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
}
