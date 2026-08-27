import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, Plus, Save, Trash2 } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledCheckbox from '../../components/LabeledCheckbox'
import LabeledInput from '../../components/LabeledInput'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../lib/sharedRequest'
import {
  deleteVatRate,
  getVatRateById,
  saveVatRate,
  searchVatRates,
} from '../../lib/vatApi'

const PAGE_SIZE = 200

function createEmptyVatForm() {
  return {
    id: null,
    name: '',
    rate: null,
    externalCode: '',
    isActive: true,
    isDefault: false,
  }
}

function mapVatToListItem(vatRate) {
  return {
    id: vatRate?.id ?? null,
    name: vatRate?.name ?? '',
    rate: vatRate?.rate ?? null,
    isActive: Boolean(vatRate?.isActive),
    isDefault: Boolean(vatRate?.isDefault),
  }
}

function mapVatToForm(vatRate) {
  return {
    id: vatRate?.id ?? null,
    name: vatRate?.name ?? '',
    rate: vatRate?.rate ?? null,
    externalCode: vatRate?.externalCode ?? '',
    isActive: Boolean(vatRate?.isActive),
    isDefault: Boolean(vatRate?.isDefault),
  }
}

function createVatSnapshot(form) {
  return JSON.stringify({
    name: form?.name ?? '',
    rate: form?.rate == null ? null : Number(form.rate),
    externalCode: form?.externalCode ?? '',
    isActive: Boolean(form?.isActive),
    isDefault: Boolean(form?.isDefault),
  })
}

export default function Vat() {
  const initialSnapshotRef = useRef('')
  const hasInitializedSnapshotRef = useRef(false)
  const pendingTransitionRef = useRef(null)
  const listRef = useRef(null)

  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState(() => createEmptyVatForm())
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
    initialSnapshotRef.current = createVatSnapshot(nextForm)
    hasInitializedSnapshotRef.current = true
  }

  useEffect(() => {
    let isActive = true

    setIsLoading(true)
    setError('')

    const requestKey = `settings:vat:${pageNumber}:${PAGE_SIZE}:${searchValue.trim().toLowerCase()}`

    getSharedRequest(requestKey, () => searchVatRates({
      searchTerm: searchValue,
      pageNumber,
      pageSize: PAGE_SIZE,
    }))
      .then((result) => {
        if (!isActive) {
          return
        }

        const mappedRows = (result?.items ?? []).map((entry) => mapVatToListItem(entry))
        setRows(mappedRows)
        setTotalCount(result?.totalCount ?? 0)
        setTotalPages(result?.totalPages ?? 0)

        if (mappedRows.length === 0) {
          setSelectedId(null)

          if (!isCreating) {
            const emptyForm = createEmptyVatForm()
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

        setError(requestError?.message || 'Kunde inte hämta moms.')
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

    getVatRateById(selectedId)
      .then((result) => {
        if (!isActive) {
          return
        }

        const nextForm = mapVatToForm(result)
        setForm(nextForm)
        markAsSaved(nextForm)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta moms.')
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
    && createVatSnapshot(form) !== initialSnapshotRef.current

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

  function handleSelect(entry) {
    if (!entry) {
      return
    }

    if (entry.id == null) {
      setError('Kunde inte läsa moms-id från listan.')
      return
    }

    if (!isCreating && entry.id === selectedId) {
      return
    }

    setSelectedId(entry.id)
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

  function scrollRowIntoView(rowId) {
    if (rowId == null || !listRef.current) {
      return
    }

    const rowElement = listRef.current.querySelector(`[data-vat-id="${rowId}"]`)
    rowElement?.scrollIntoView({ block: 'nearest' })
  }

  function focusRow(rowId) {
    if (rowId == null || !listRef.current) {
      return
    }

    const rowElement = listRef.current.querySelector(`[data-vat-id="${rowId}"]`)
    rowElement?.focus({ preventScroll: true })
  }

  function handleListArrowNavigation(offset) {
    if (listRows.length === 0) {
      return
    }

    const selectedIndex = listRows.findIndex((entry) => entry.id === selectedId)
    const startingIndex = selectedIndex >= 0 ? selectedIndex : (offset > 0 ? -1 : listRows.length)
    const nextIndex = Math.min(listRows.length - 1, Math.max(0, startingIndex + offset))
    const nextRow = listRows[nextIndex]

    if (!nextRow) {
      return
    }

    requestTransition(() => {
      handleSelect(nextRow)
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

  function handleAdd() {
    requestTransition(() => {
      const nextForm = createEmptyVatForm()

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
      const saved = await saveVatRate({
        id: form.id,
        name: form.name,
        rate: form.rate,
        externalCode: form.externalCode,
        isActive: form.isActive,
        isDefault: form.isDefault,
      })

      const savedForm = mapVatToForm(saved)
      const savedRow = mapVatToListItem(saved)

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
      setSuccessMessage('Moms sparad.')
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte spara moms.')
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
      await deleteVatRate(form.id)

      setRows((previousRows) => {
        const nextRows = previousRows.filter((entry) => entry.id !== form.id)
        const fallbackRow = nextRows[0] ?? null

        if (fallbackRow) {
          setSelectedId(fallbackRow.id)
          setIsCreating(false)
        } else {
          const emptyForm = createEmptyVatForm()
          setSelectedId(null)
          setIsCreating(false)
          setForm(emptyForm)
          markAsSaved(emptyForm)
        }

        return nextRows
      })

      setSuccessMessage('Moms raderad.')
      setTotalCount((previousTotal) => Math.max(0, previousTotal - 1))
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte radera moms.')
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
    <div className="flex h-full min-h-full w-full flex-col px-0 pb-10 md:px-[clamp(8px,15vw,10vw)]">
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 lg:items-stretch lg:grid-cols-[450px_1px_minmax(0,1fr)] lg:gap-8">
          <aside className="mb-8 border-b border-gray-300 pr-4 text-gray-700 lg:border-b-0">
            <div className="mr-5">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={searchValue}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Sök moms, externkod"
                  className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                />
                <ActionButton label="Ny" icon={Plus} onClick={handleAdd} accent="sky" />
              </div>
            </div>

            <div
              ref={listRef}
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              className="mt-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 focus:outline-none"
            >
              <div className="mb-1 grid grid-cols-[92px_92px_minmax(0,1fr)] border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700">
                <span>Kod</span>
                <span>Sats</span>
                <span>Namn</span>
              </div>

              {showListSkeleton && (
                <div className="space-y-1 px-3 py-2">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <Skeleton key={`vat-list-skeleton-${index}`} height={16} />
                  ))}
                </div>
              )}

              {isLoading && !showListSkeleton && (
                <div className="py-4 text-xs text-gray-500">Laddar moms...</div>
              )}

              {!isLoading && listRows.length === 0 && (
                <div className="py-4 text-center text-xs text-gray-500">Ingen moms matchar sökningen.</div>
              )}

              {!isLoading && listRows.map((entry) => {
                const isSelected = entry.id === selectedId

                return (
                  <button
                    key={entry.id}
                    type="button"
                    data-vat-id={entry.id}
                    onClick={() => requestTransition(() => handleSelect(entry))}
                    onKeyDown={handleListKeyDown}
                    className={`w-full px-3 py-1.5 text-left text-xs leading-[1.1] tracking-[-0.01em] transition ${
                      isSelected
                        ? 'bg-lime-200 text-gray-900'
                        : 'text-gray-800 hover:bg-lime-100'
                    }`}
                  >
                    <div className="grid grid-cols-[92px_92px_minmax(0,1fr)] items-center gap-2">
                      <span>{entry.id ?? '-'}</span>
                      <span>{entry.rate == null ? '-' : `${entry.rate}`}</span>
                      <span className="truncate">
                        {entry.name || '-'}
                        {entry.isDefault ? ' (standard)' : ''}
                        {!entry.isActive ? ' (inaktiv)' : ''}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
              {totalPages > 1 && (
                <div className="ml-3 text-xs text-gray-500">{totalCount} momsrader totalt, {PAGE_SIZE} per sida.</div>
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

            <div className="grid grid-cols-1 gap-8">
              <div className="max-w-[300px]">
                {showDetailSkeleton ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton height={28} width={250} />
                    <Skeleton height={28} width={300} />
                    <Skeleton height={28} width={220} />
                    <Skeleton height={28} width={300} />
                  </div>
                ) : (
                  <>
                    <LabeledInput
                      name="name"
                      label="Namn"
                      labelWidth="w-20"
                      margintop="0"
                      value={form.name}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleFieldChange('name', value ?? '')}
                    />
                    <LabeledInput
                      name="rate"
                      type="number"
                      label="Sats"
                      labelWidth="w-20"
                      inputWidth="w-30"
                      margintop="0"
                      value={form.rate}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleFieldChange('rate', value)}
                    />
                    <LabeledInput
                      name="externalCode"
                      label="Externkod"
                      labelWidth="w-20"
                      inputWidth="w-30"
                      margintop="0"
                      value={form.externalCode}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleFieldChange('externalCode', value ?? '')}
                    />
                    <LabeledCheckbox
                      id="vat-active"
                      name="vat-active"
                      label="Aktiv"
                      labelWidth="w-20"
                      labelPosition="left"
                      checked={Boolean(form.isActive)}
                      disabled={isDetailDisabled}
                      onChange={(checked) => handleFieldChange('isActive', checked)}
                      color="green"
                    />
                    <LabeledCheckbox
                      id="vat-default"
                      name="vat-default"
                      label="Standard"
                      labelWidth="w-20"
                      labelPosition="left"
                      checked={Boolean(form.isDefault)}
                      disabled={isDetailDisabled}
                      onChange={(checked) => handleFieldChange('isDefault', checked)}
                      color="green"
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
        message="Du har osparade ändringar. Vill du lämna moms utan att spara?"
        confirmText="Lämna moms"
        cancelText="Stanna kvar"
        isDestructive
      />
    </div>
  )
}