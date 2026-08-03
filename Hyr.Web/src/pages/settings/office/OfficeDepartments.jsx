import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, Plus, Save, Trash2 } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../../components/ActionButton'
import ConfirmationModal from '../../../components/ConfirmationModal'
import LabeledInput from '../../../components/LabeledInput'
import LabeledSwitch from '../../../components/LabeledSwitch'
import { useDelayedSkeleton } from '../../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../../lib/sharedRequest'
import {
    deleteDepartment,
    getDepartmentById,
    saveDepartment,
    searchDepartments,
} from '../../../lib/departmentApi'

const PAGE_SIZE = 200

function createEmptyDepartmentForm() {
    return {
        id: null,
        name: '',
        isActive: true,
    }
}

function mapDepartmentToListItem(department) {
    return {
        id: department?.id ?? null,
        name: department?.name ?? '',
        isActive: Boolean(department?.isActive),
    }
}

function createDepartmentSnapshot(form) {
    return JSON.stringify({
        name: form?.name ?? '',
        isActive: Boolean(form?.isActive),
    })
}

export default function OfficeDepartments() {
    const initialDepartmentSnapshotRef = useRef('')
    const hasInitializedSnapshotRef = useRef(false)
    const pendingDepartmentTransitionRef = useRef(null)
    const departmentListRef = useRef(null)

    const [departmentRows, setDepartmentRows] = useState([])
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null)
    const [isCreatingDepartment, setIsCreatingDepartment] = useState(false)
    const [form, setForm] = useState(() => createEmptyDepartmentForm())
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

    function markDepartmentAsSaved(nextForm) {
        initialDepartmentSnapshotRef.current = createDepartmentSnapshot(nextForm)
        hasInitializedSnapshotRef.current = true
    }

    useEffect(() => {
        let isActive = true

        setIsLoading(true)
        setError('')

        const requestKey = `settings:departments:${pageNumber}:${PAGE_SIZE}:${searchValue.trim().toLowerCase()}`

        getSharedRequest(requestKey, () => searchDepartments({
            searchTerm: searchValue,
            pageNumber,
            pageSize: PAGE_SIZE,
        }))
            .then((result) => {
                if (!isActive) {
                    return
                }

                const mappedDepartments = (result?.items ?? []).map((department) => mapDepartmentToListItem(department))
                setDepartmentRows(mappedDepartments)
                setTotalCount(result?.totalCount ?? 0)
                setTotalPages(result?.totalPages ?? 0)

                if (mappedDepartments.length === 0) {
                    setSelectedDepartmentId(null)

                    if (!isCreatingDepartment) {
                        const emptyForm = createEmptyDepartmentForm()
                        setForm(emptyForm)
                        markDepartmentAsSaved(emptyForm)
                    }

                    return
                }

                if (isCreatingDepartment) {
                    return
                }

                const selectedFromPage = selectedDepartmentId == null
                    ? null
                    : mappedDepartments.find((department) => department.id === selectedDepartmentId)

                const nextSelected = selectedFromPage ?? mappedDepartments[0]
                setSelectedDepartmentId(nextSelected.id)
            })
            .catch((requestError) => {
                if (!isActive) {
                    return
                }

                setError(requestError?.message || 'Kunde inte hämta avdelningar.')
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

        if (isCreatingDepartment || selectedDepartmentId == null) {
            setIsDetailLoading(false)
            return () => {
                isActive = false
            }
        }

        setIsDetailLoading(true)

        getDepartmentById(selectedDepartmentId)
            .then((result) => {
                if (!isActive) {
                    return
                }

                const nextForm = {
                    id: result?.id ?? null,
                    name: result?.name ?? '',
                    isActive: Boolean(result?.isActive),
                }

                setForm(nextForm)
                markDepartmentAsSaved(nextForm)
            })
            .catch((requestError) => {
                if (!isActive) {
                    return
                }

                setError(requestError?.message || 'Kunde inte hämta avdelning.')
            })
            .finally(() => {
                if (isActive) {
                    setIsDetailLoading(false)
                }
            })

        return () => {
            isActive = false
        }
    }, [isCreatingDepartment, selectedDepartmentId])

    const listRows = useMemo(() => departmentRows, [departmentRows])

    const isDirty = hasInitializedSnapshotRef.current
        && createDepartmentSnapshot(form) !== initialDepartmentSnapshotRef.current

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

    function requestDepartmentTransition(action) {
        if (!isDirty) {
            action()
            return
        }

        pendingDepartmentTransitionRef.current = action
        setShowUnsavedChangesModal(true)
    }

    function handleSelectDepartment(department) {
        if (!department) {
            return
        }

        if (department.id == null) {
            setError('Kunde inte läsa avdelnings-id från listan.')
            return
        }

        if (!isCreatingDepartment && department.id === selectedDepartmentId) {
            return
        }

        setSelectedDepartmentId(department.id)
        setIsCreatingDepartment(false)
        setSuccessMessage('')
        setError('')
    }

    function handleSearchChange(value) {
        requestDepartmentTransition(() => {
            setSearchValue(value)
            setPageNumber(1)
            setSelectedDepartmentId(null)
            setIsCreatingDepartment(false)
        })
    }

    function handlePageChange(nextPageNumber) {
        requestDepartmentTransition(() => {
            setPageNumber(nextPageNumber)
        })
    }

    function scrollDepartmentIntoView(departmentId) {
        if (departmentId == null || !departmentListRef.current) {
            return
        }

        const rowElement = departmentListRef.current.querySelector(`[data-department-id="${departmentId}"]`)
        rowElement?.scrollIntoView({ block: 'nearest' })
    }

    function focusDepartmentRow(departmentId) {
        if (departmentId == null || !departmentListRef.current) {
            return
        }

        const rowElement = departmentListRef.current.querySelector(`[data-department-id="${departmentId}"]`)
        rowElement?.focus({ preventScroll: true })
    }

    function handleListArrowNavigation(offset) {
        if (listRows.length === 0) {
            return
        }

        const selectedIndex = listRows.findIndex((department) => department.id === selectedDepartmentId)
        const startingIndex = selectedIndex >= 0 ? selectedIndex : (offset > 0 ? -1 : listRows.length)
        const nextIndex = Math.min(listRows.length - 1, Math.max(0, startingIndex + offset))
        const nextDepartment = listRows[nextIndex]

        if (!nextDepartment) {
            return
        }

        requestDepartmentTransition(() => {
            handleSelectDepartment(nextDepartment)
            requestAnimationFrame(() => {
                scrollDepartmentIntoView(nextDepartment.id)
                focusDepartmentRow(nextDepartment.id)
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

    function handleAddDepartment() {
        requestDepartmentTransition(() => {
            const nextForm = createEmptyDepartmentForm()

            setSelectedDepartmentId(null)
            setIsCreatingDepartment(true)
            setForm(nextForm)
            markDepartmentAsSaved(nextForm)
            setSuccessMessage('')
            setError('')
        })
    }

    async function handleSave() {
        setIsSaving(true)
        setError('')
        setSuccessMessage('')

        try {
            const savedDepartment = await saveDepartment({
                id: form.id,
                name: form.name,
                isActive: form.isActive,
            })

            const savedDepartmentForm = {
                id: savedDepartment?.id ?? null,
                name: savedDepartment?.name ?? '',
                isActive: Boolean(savedDepartment?.isActive),
            }
            const savedDepartmentRow = mapDepartmentToListItem(savedDepartment)

            setDepartmentRows((previousDepartments) => {
                const existingIndex = previousDepartments.findIndex((department) => department.id === savedDepartmentRow.id)
                if (existingIndex >= 0) {
                    const nextDepartments = [...previousDepartments]
                    nextDepartments[existingIndex] = savedDepartmentRow
                    return nextDepartments
                }

                return [savedDepartmentRow, ...previousDepartments].slice(0, PAGE_SIZE)
            })

            if (form.id == null) {
                setTotalCount((previousTotal) => previousTotal + 1)
            }

            setSelectedDepartmentId(savedDepartmentForm.id)
            setIsCreatingDepartment(false)
            setForm(savedDepartmentForm)
            markDepartmentAsSaved(savedDepartmentForm)
            setSuccessMessage('Avdelning sparad.')
        } catch (requestError) {
            setError(requestError?.message || 'Kunde inte spara avdelning.')
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
            await deleteDepartment(form.id)

            setDepartmentRows((previousDepartments) => {
                const nextDepartments = previousDepartments.filter((department) => department.id !== form.id)
                const fallbackDepartment = nextDepartments[0] ?? null

                if (fallbackDepartment) {
                    setSelectedDepartmentId(fallbackDepartment.id)
                    setIsCreatingDepartment(false)
                } else {
                    const emptyForm = createEmptyDepartmentForm()
                    setSelectedDepartmentId(null)
                    setIsCreatingDepartment(false)
                    setForm(emptyForm)
                    markDepartmentAsSaved(emptyForm)
                }

                return nextDepartments
            })

            setSuccessMessage('Avdelning raderad.')
            setTotalCount((previousTotal) => Math.max(0, previousTotal - 1))
        } catch (requestError) {
            setError(requestError?.message || 'Kunde inte radera avdelning.')
        } finally {
            setIsDeleting(false)
        }
    }

    function handleStayOnDepartment() {
        pendingDepartmentTransitionRef.current = null

        if (blocker.state === 'blocked') {
            blocker.reset()
        }

        setShowUnsavedChangesModal(false)
    }

    function handleDiscardDepartmentChanges() {
        if (blocker.state === 'blocked') {
            setShowUnsavedChangesModal(false)
            blocker.proceed()
            return
        }

        const pendingTransition = pendingDepartmentTransitionRef.current
        pendingDepartmentTransitionRef.current = null
        setShowUnsavedChangesModal(false)
        pendingTransition?.()
    }

    const isDetailDisabled = (selectedDepartmentId == null && !isCreatingDepartment) || isDetailLoading

    return (
        <div className="flex h-full min-h-full w-full flex-col pl-9 py-2 pb-10">
            <h1 className="pl-1 pb-4 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Avdelningar</h1>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 flex-1 lg:items-stretch lg:grid-cols-[300px_1px_minmax(0,1fr)] lg:gap-8">
                    <aside className="mb-8 border-b border-gray-300 pr-4 text-gray-700 lg:border-b-0">
                        <div className="mr-5">
                            <div className="flex items-center justify-between gap-2">
                                <input
                                    value={searchValue}
                                    onChange={(event) => handleSearchChange(event.target.value)}
                                    placeholder="Sök avdelning, fritext"
                                    className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                                />
                                <ActionButton label="Ny" icon={Plus} onClick={handleAddDepartment} accent="sky" />
                            </div>
                        </div>

                        <div
                            ref={departmentListRef}
                            tabIndex={0}
                            onKeyDown={handleListKeyDown}
                            className="mt-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 focus:outline-none"
                        >
                            <div className="mb-2 grid grid-cols-[52px_minmax(0,1fr)] border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700">
                                <span>Kod</span>
                                <span>Beskrivning</span>
                            </div>

                            {showListSkeleton && (
                                <div className="space-y-1 px-3 py-2">
                                    {Array.from({ length: 12 }).map((_, index) => (
                                        <Skeleton key={`department-list-skeleton-${index}`} height={16} />
                                    ))}
                                </div>
                            )}

                            {isLoading && !showListSkeleton && (
                                <div className="py-4 text-xs text-gray-500">Laddar avdelningar...</div>
                            )}

                            {!isLoading && listRows.length === 0 && (
                                <div className="py-4 text-center text-xs text-gray-500">Inga avdelningar matchar sökningen.</div>
                            )}

                            {!isLoading && listRows.map((department) => {
                                const isSelected = department.id === selectedDepartmentId

                                return (
                                    <button
                                        key={department.id}
                                        type="button"
                                        data-department-id={department.id}
                                        onClick={() => requestDepartmentTransition(() => handleSelectDepartment(department))}
                                        onKeyDown={handleListKeyDown}
                                        className={`w-full px-3 py-1.5 text-left text-xs leading-[1.1] tracking-[-0.01em] transition ${
                                            isSelected
                                                ? 'bg-lime-200 text-gray-900'
                                                : 'text-gray-800 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center">
                                            <span>{department.id ?? '-'}</span>
                                            <span className="truncate">{department.name || '-'}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                            {totalPages > 1 && (
                                <div className="ml-3 text-xs text-gray-500">{totalCount} avdelningar totalt, {PAGE_SIZE} per sida.</div>
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

                    <div aria-hidden="true" className="mt-2 hidden bg-gray-300 lg:block" />

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

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[620px_minmax(0,1fr)]">
                            <div className="max-w-[620px]">
                                {showDetailSkeleton ? (
                                    <div className="space-y-2 pt-1">
                                        <Skeleton height={28} width={250} />
                                        <Skeleton height={28} width={350} />
                                        <Skeleton height={28} width={180} />
                                    </div>
                                ) : (
                                    <>
                                        <LabeledInput
                                            name="id"
                                            label="Kod"
                                            labelWidth="w-12"
                                            inputWidth="w-50"
                                            margintop="0"
                                            value={form.id ?? ''}
                                            disabled
                                        />
                                        <LabeledInput
                                            name="name"
                                            label="Text"
                                            labelWidth="w-12"
                                            inputWidth="w-70"
                                            margintop="0"
                                            value={form.name}
                                            disabled={isDetailDisabled}
                                            onChange={(value) => handleFieldChange('name', value ?? '')}
                                        />
                                        <LabeledSwitch
                                            id="department-is-active"
                                            name="department-is-active"
                                            label="Aktiv"
                                            labelWidth="w-12"
                                            value={Boolean(form.isActive)}
                                            disabled={isDetailDisabled}
                                            onChange={(value) => handleFieldChange('isActive', Boolean(value))}
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
                onClose={handleStayOnDepartment}
                onConfirm={handleDiscardDepartmentChanges}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vill du lämna avdelningen utan att spara?"
                confirmText="Lämna avdelning"
                cancelText="Stanna kvar"
                isDestructive
            />
        </div>
    )
}
