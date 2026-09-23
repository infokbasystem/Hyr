import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, Plus, Save, Trash2 } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../../components/ActionButton'
import ConfirmationModal from '../../../components/ConfirmationModal'
import LabeledInput from '../../../components/LabeledInput'
import LabeledTextArea from '../../../components/LabeledTextArea'
import { useDelayedSkeleton } from '../../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../../lib/sharedRequest'
import {
    deleteSmsText,
    getSmsTextById,
    saveSmsText,
    searchSmsTexts,
} from '../../../lib/smsTextApi'

const PAGE_SIZE = 200

function createEmptySmsTextForm() {
    return {
        id: null,
        officeId: null,
        item: '',
        titel: '',
        text: '',
    }
}

function mapSmsTextToListItem(smsText) {
    return {
        id: smsText?.id ?? null,
        officeId: smsText?.officeId ?? null,
        item: smsText?.item ?? '',
        titel: smsText?.titel ?? '',
    }
}

function createSmsTextSnapshot(form) {
    return JSON.stringify({
        item: form?.item ?? '',
        titel: form?.titel ?? '',
        text: form?.text ?? '',
    })
}

export default function OfficeSmsTexts() {
    const initialSnapshotRef = useRef('')
    const hasInitializedSnapshotRef = useRef(false)
    const pendingTransitionRef = useRef(null)
    const listRef = useRef(null)

    const [rows, setRows] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [form, setForm] = useState(() => createEmptySmsTextForm())
    const [searchValue, setSearchValue] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)

    const showListSkeleton = useDelayedSkeleton(isLoading, 300, 200)
    const showDetailSkeleton = useDelayedSkeleton(isDetailLoading, 300, 200)

    function markAsSaved(nextForm) {
        initialSnapshotRef.current = createSmsTextSnapshot(nextForm)
        hasInitializedSnapshotRef.current = true
    }

    useEffect(() => {
        let isActive = true

        setIsLoading(true)
        setError('')

        const requestKey = `settings:smstexts:${pageNumber}:${PAGE_SIZE}:${searchValue.trim().toLowerCase()}`

        getSharedRequest(requestKey, () => searchSmsTexts({
            searchTerm: searchValue,
            pageNumber,
            pageSize: PAGE_SIZE,
        }))
            .then((result) => {
                if (!isActive) {
                    return
                }

                const mappedRows = (result?.items ?? []).map((entry) => mapSmsTextToListItem(entry))
                setRows(mappedRows)
                setTotalCount(result?.totalCount ?? 0)
                setTotalPages(result?.totalPages ?? 0)

                if (mappedRows.length === 0) {
                    setSelectedId(null)

                    if (!isCreating) {
                        const emptyForm = createEmptySmsTextForm()
                        setForm(emptyForm)
                        markAsSaved(emptyForm)
                    }

                    return
                }

                if (isCreating) {
                    return
                }

                const selectedFromPage = selectedId == null
                    ? null
                    : mappedRows.find((entry) => entry.id === selectedId)

                setSelectedId(selectedFromPage?.id ?? null)
            })
            .catch((requestError) => {
                if (!isActive) {
                    return
                }

                setError(requestError?.message || 'Kunde inte hämta sms-texter.')
            })
            .finally(() => {
                if (isActive) {
                    setIsLoading(false)
                }
            })

        return () => {
            isActive = false
        }
    }, [pageNumber, searchValue])

    useEffect(() => {
        let isActive = true

        if (isCreating || selectedId == null) {
            setIsDetailLoading(false)
            return () => {
                isActive = false
            }
        }

        setIsDetailLoading(true)

        getSmsTextById(selectedId)
            .then((result) => {
                if (!isActive) {
                    return
                }

                const nextForm = {
                    id: result?.id ?? null,
                    officeId: result?.officeId ?? null,
                    item: result?.item ?? '',
                    titel: result?.titel ?? '',
                    text: result?.text ?? '',
                }

                setForm(nextForm)
                markAsSaved(nextForm)
            })
            .catch((requestError) => {
                if (!isActive) {
                    return
                }

                setError(requestError?.message || 'Kunde inte hämta sms-text.')
            })
            .finally(() => {
                if (isActive) {
                    setIsDetailLoading(false)
                }
            })

        return () => {
            isActive = false
        }
    }, [isCreating, selectedId])

    const listRows = useMemo(() => rows, [rows])

    const isDirty = hasInitializedSnapshotRef.current
        && createSmsTextSnapshot(form) !== initialSnapshotRef.current

    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        return isDirty && currentLocation.pathname !== nextLocation.pathname
    })

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
        if (blocker.state === 'blocked') {
            setShowUnsavedChangesModal(true)
        }
    }, [blocker.state])

    function requestTransition(action) {
        if (!isDirty) {
            action()
            return
        }

        pendingTransitionRef.current = action
        setShowUnsavedChangesModal(true)
    }

    function handleSelectRow(row) {
        if (!row) {
            return
        }

        if (row.id == null) {
            setError('Kunde inte läsa sms-text-id från listan.')
            return
        }

        if (!isCreating && row.id === selectedId) {
            return
        }

        setSelectedId(row.id)
        setIsCreating(false)
        setSuccessMessage('')
        setError('')
    }

    function handleSearchChange(value) {
        requestTransition(() => {
            setSearchValue(value)
            setPageNumber(1)
            setSelectedId(null)
            setIsCreating(false)
        })
    }

    function handlePageChange(nextPageNumber) {
        requestTransition(() => {
            setPageNumber(nextPageNumber)
        })
    }

    function scrollRowIntoView(id) {
        if (id == null || !listRef.current) {
            return
        }

        const rowElement = listRef.current.querySelector(`[data-smstext-id="${id}"]`)
        rowElement?.scrollIntoView({ block: 'nearest' })
    }

    function focusRow(id) {
        if (id == null || !listRef.current) {
            return
        }

        const rowElement = listRef.current.querySelector(`[data-smstext-id="${id}"]`)
        rowElement?.focus({ preventScroll: true })
    }

    function handleListArrowNavigation(offset) {
        if (listRows.length === 0) {
            return
        }

        const selectedIndex = listRows.findIndex((row) => row.id === selectedId)
        const startingIndex = selectedIndex >= 0 ? selectedIndex : (offset > 0 ? -1 : listRows.length)
        const nextIndex = Math.min(listRows.length - 1, Math.max(0, startingIndex + offset))
        const nextRow = listRows[nextIndex]

        if (!nextRow) {
            return
        }

        requestTransition(() => {
            handleSelectRow(nextRow)
            requestAnimationFrame(() => {
                scrollRowIntoView(nextRow.id)
                focusRow(nextRow.id)
            })
        })
    }

    function handleListKeyDown(event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            handleListArrowNavigation(1)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            handleListArrowNavigation(-1)
        }
    }

    function handleFieldChange(field, value) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))
    }

    function handleAddSmsText() {
        requestTransition(() => {
            const nextForm = createEmptySmsTextForm()

            setSelectedId(null)
            setIsCreating(true)
            setForm(nextForm)
            markAsSaved(nextForm)
            setSuccessMessage('')
            setError('')
        })
    }

    async function handleSave() {
        setIsSaving(true)
        setError('')
        setSuccessMessage('')

        try {
            const savedSmsText = await saveSmsText({
                id: form.id,
                item: form.item,
                titel: form.titel,
                text: form.text,
            })

            const savedForm = {
                id: savedSmsText?.id ?? null,
                officeId: savedSmsText?.officeId ?? null,
                item: savedSmsText?.item ?? '',
                titel: savedSmsText?.titel ?? '',
                text: savedSmsText?.text ?? '',
            }
            const savedRow = mapSmsTextToListItem(savedSmsText)

            setRows((previousRows) => {
                const existingIndex = previousRows.findIndex((entry) => entry.id === savedRow.id)
                if (existingIndex >= 0) {
                    const nextRows = [...previousRows]
                    nextRows[existingIndex] = savedRow
                    return nextRows
                }

                return [savedRow, ...previousRows].slice(0, PAGE_SIZE)
            })

            if (form.id == null) {
                setTotalCount((previousTotal) => previousTotal + 1)
            }

            setSelectedId(savedForm.id)
            setIsCreating(false)
            setForm(savedForm)
            markAsSaved(savedForm)
            setSuccessMessage('Sms-text sparad.')
        } catch (requestError) {
            setError(requestError?.message || 'Kunde inte spara sms-text.')
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (form.id == null || isDeleting) {
            return
        }

        setIsDeleting(true)
        setError('')
        setSuccessMessage('')

        try {
            await deleteSmsText(form.id)

            setRows((previousRows) => {
                const nextRows = previousRows.filter((entry) => entry.id !== form.id)
                const fallbackRow = nextRows[0] ?? null

                if (fallbackRow) {
                    setSelectedId(fallbackRow.id)
                    setIsCreating(false)
                } else {
                    const emptyForm = createEmptySmsTextForm()
                    setSelectedId(null)
                    setIsCreating(false)
                    setForm(emptyForm)
                    markAsSaved(emptyForm)
                }

                return nextRows
            })

            setSuccessMessage('Sms-text raderad.')
            setTotalCount((previousTotal) => Math.max(0, previousTotal - 1))
        } catch (requestError) {
            setError(requestError?.message || 'Kunde inte radera sms-text.')
        } finally {
            setIsDeleting(false)
        }
    }

    function handleStayOnPage() {
        pendingTransitionRef.current = null

        if (blocker.state === 'blocked') {
            blocker.reset()
        }

        setShowUnsavedChangesModal(false)
    }

    function handleDiscardChanges() {
        if (blocker.state === 'blocked') {
            setShowUnsavedChangesModal(false)
            blocker.proceed()
            return
        }

        const pendingTransition = pendingTransitionRef.current
        pendingTransitionRef.current = null
        setShowUnsavedChangesModal(false)
        pendingTransition?.()
    }

    const isDetailDisabled = (selectedId == null && !isCreating) || isDetailLoading

    return (
        <div className="flex h-full min-h-full w-full flex-col pl-9 py-2 pb-10">
            <h1 className="pl-1 pb-4 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Sms-texter</h1>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 flex-1 lg:items-stretch lg:grid-cols-[300px_1px_minmax(0,1fr)] lg:gap-8">
                    <aside className="mb-8 border-b border-gray-300 pr-4 text-gray-700 lg:border-b-0">
                        <div className="mr-5">
                            <div className="flex items-center justify-between gap-2">
                                <input
                                    value={searchValue}
                                    onChange={(event) => handleSearchChange(event.target.value)}
                                    placeholder="Sök sms-text, fritext"
                                    className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                                />
                                <ActionButton label="Ny" icon={Plus} onClick={handleAddSmsText} accent="sky" />
                            </div>
                        </div>

                        <div
                            ref={listRef}
                            tabIndex={0}
                            onKeyDown={handleListKeyDown}
                            className="mt-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 focus:outline-none"
                        >
                            <div className="mb-1 border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700">
                                <span>Sms</span>
                            </div>

                            {showListSkeleton && (
                                <div className="space-y-1 px-3 py-2">
                                    {Array.from({ length: 12 }).map((_, index) => (
                                        <Skeleton key={`smstext-list-skeleton-${index}`} height={16} />
                                    ))}
                                </div>
                            )}

                            {isLoading && !showListSkeleton && (
                                <div className="py-4 text-xs text-gray-500">Laddar sms-texter...</div>
                            )}

                            {!isLoading && listRows.length === 0 && (
                                <div className="py-4 text-center text-xs text-gray-500">Inga sms-texter matchar sökningen.</div>
                            )}

                            {!isLoading && listRows.map((row) => {
                                const isSelected = row.id === selectedId

                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        data-smstext-id={row.id}
                                        onClick={() => requestTransition(() => handleSelectRow(row))}
                                        onKeyDown={handleListKeyDown}
                                        className={`w-full px-3 py-1.5 text-left text-xs leading-[1.1] tracking-[-0.01em] transition ${
                                            isSelected
                                                ? 'bg-lime-200 text-gray-900'
                                                : 'text-gray-800 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="items-center">
                                            <span className="truncate">{row.item || '-'}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                            {totalPages > 1 && (
                                <div className="ml-3 text-xs text-gray-500">{totalCount} sms-texter totalt, {PAGE_SIZE} per sida.</div>
                            )}

                            {totalPages > 1 && (
                                <div className="mr-5 flex items-center justify-end text-xs text-gray-700">
                                    <span className="text-xs text-gray-700">
                                        Sida {Math.min(pageNumber, Math.max(1, totalPages || 1))} av {Math.max(1, totalPages || 1)}
                                    </span>

                                    <div className="ml-4 flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                                            disabled={pageNumber <= 1 || isLoading}
                                            className="disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label="Föregående sida"
                                        >
                                            <ArrowLeftCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePageChange(pageNumber + 1)}
                                            disabled={isLoading || pageNumber >= totalPages}
                                            className="disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label="Nästa sida"
                                        >
                                            <ArrowRightCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    <div aria-hidden="true" className="mt-6 bg-gray-300" />

                    <section className="px-3 lg:px-4">
                        <div className="mb-4 flex items-start justify-between gap-5">
                            <div className="flex items-center gap-5">
                                <ActionButton label="Spara" icon={Save} onClick={handleSave} accent="lime" disabled={isSaving || isDetailDisabled} />
                                <ActionButton label="Radera" icon={Trash2} onClick={handleDelete} accent="rose" disabled={form.id == null || isSaving || isDetailDisabled || isDeleting} />
                            </div>

                            <div className="mb-0 min-h-[42px] w-80">
                                {error && (
                                    <div className="rounded-full border border-rose-200 bg-rose-50 px-5 py-1 text-center text-xs text-rose-700">
                                        {error}
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-1 text-center text-xs text-emerald-700">
                                        {successMessage}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
                            <div className="max-w-[420px]">
                                {showDetailSkeleton ? (
                                    <div className="space-y-2 pt-1">
                                        <Skeleton height={28} width={220} />
                                        <Skeleton height={28} width={220} />
                                        <Skeleton height={110} width={620} />
                                    </div>
                                ) : (
                                    <>
                                        <LabeledInput
                                            name="item"
                                            label="Item"
                                            labelWidth="w-20"
                                            inputWidth="w-[620px]"
                                            margintop="0"
                                            value={form.item}
                                            disabled={isDetailDisabled}
                                            maxLength={200}
                                            onChange={(value) => handleFieldChange('item', value ?? '')}
                                        />
                                        <LabeledInput
                                            name="titel"
                                            label="Titel"
                                            labelWidth="w-20"
                                            inputWidth="w-[620px]"
                                            margintop="0"
                                            value={form.titel}
                                            disabled={isDetailDisabled}
                                            maxLength={200}
                                            onChange={(value) => handleFieldChange('titel', value ?? '')}
                                        />
                                        <LabeledTextArea
                                            name="text"
                                            label="Text"
                                            labelWidth="w-20"
                                            inputWidth="w-[620px]"
                                            height="h-56"
                                            margintop="0"
                                            value={form.text}
                                            disabled={isDetailDisabled}
                                            maxLength={4000}
                                            onChange={(value) => handleFieldChange('text', value ?? '')}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showUnsavedChangesModal}
                onClose={handleStayOnPage}
                onConfirm={handleDiscardChanges}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vill du lämna sms-texten utan att spara?"
                confirmText="Lämna sms-text"
                cancelText="Stanna kvar"
                isDestructive
            />
        </div>
    )
}
