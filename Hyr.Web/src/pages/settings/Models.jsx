import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, Plus, Save, Trash2 } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledInput from '../../components/LabeledInput'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../lib/sharedRequest'
import {
  deleteItemModel,
  getItemModelById,
  saveItemModel,
  searchItemModels,
} from '../../lib/itemModelApi'

const PAGE_SIZE = 200

function createEmptyModelForm() {
  return {
    id: null,
    name: '',
  }
}

function mapModelToListItem(itemModel) {
  return {
    id: itemModel?.id ?? null,
    name: itemModel?.name ?? '',
  }
}

function createModelSnapshot(form) {
  return JSON.stringify({
    name: form?.name ?? '',
  })
}

export default function Models() {
  const initialModelSnapshotRef = useRef('')
  const hasInitializedSnapshotRef = useRef(false)
  const pendingModelTransitionRef = useRef(null)
  const modelListRef = useRef(null)

  const [modelRows, setModelRows] = useState([])
  const [selectedModelId, setSelectedModelId] = useState(null)
  const [isCreatingModel, setIsCreatingModel] = useState(false)
  const [form, setForm] = useState(() => createEmptyModelForm())
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

  function markModelAsSaved(nextForm) {
    initialModelSnapshotRef.current = createModelSnapshot(nextForm)
    hasInitializedSnapshotRef.current = true
  }

  useEffect(() => {
    let isActive = true

    setIsLoading(true)
    setError('')

    const requestKey = `settings:itemmodels:${pageNumber}:${PAGE_SIZE}:${searchValue.trim().toLowerCase()}`

    getSharedRequest(requestKey, () => searchItemModels({
      searchTerm: searchValue,
      pageNumber,
      pageSize: PAGE_SIZE,
    }))
      .then((result) => {
        if (!isActive) {
          return
        }

        const mappedModels = (result?.items ?? []).map((itemModel) => mapModelToListItem(itemModel))
        setModelRows(mappedModels)
        setTotalCount(result?.totalCount ?? 0)
        setTotalPages(result?.totalPages ?? 0)

        if (mappedModels.length === 0) {
          setSelectedModelId(null)

          if (!isCreatingModel) {
            const emptyForm = createEmptyModelForm()
            setForm(emptyForm)
            markModelAsSaved(emptyForm)
          }

          return
        }

        if (isCreatingModel) {
          return
        }

        const selectedFromPage = selectedModelId == null
          ? null
          : mappedModels.find((itemModel) => itemModel.id === selectedModelId)

        setSelectedModelId(selectedFromPage?.id ?? null)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta modeller.')
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

    if (isCreatingModel || selectedModelId == null) {
      setIsDetailLoading(false)
      return () => {
        isActive = false
      }
    }

    setIsDetailLoading(true)

    getItemModelById(selectedModelId)
      .then((result) => {
        if (!isActive) {
          return
        }

        const nextForm = {
          id: result?.id ?? null,
          name: result?.name ?? '',
        }

        setForm(nextForm)
        markModelAsSaved(nextForm)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta modell.')
      })
      .finally(() => {
        if (isActive) {
          setIsDetailLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isCreatingModel, selectedModelId])

  const listRows = useMemo(() => modelRows, [modelRows])

  const isDirty = hasInitializedSnapshotRef.current
    && createModelSnapshot(form) !== initialModelSnapshotRef.current

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

  function requestModelTransition(action) {
    if (!isDirty) {
      action()
      return
    }

    pendingModelTransitionRef.current = action
    setShowUnsavedChangesModal(true)
  }

  function handleSelectModel(itemModel) {
    if (!itemModel) {
      return
    }

    if (itemModel.id == null) {
      setError('Kunde inte läsa modell-id från listan.')
      return
    }

    if (!isCreatingModel && itemModel.id === selectedModelId) {
      return
    }

    setSelectedModelId(itemModel.id)
    setIsCreatingModel(false)
    setSuccessMessage('')
    setError('')
  }

  function handleSearchChange(value) {
    requestModelTransition(() => {
      setSearchValue(value)
      setPageNumber(1)
      setSelectedModelId(null)
      setIsCreatingModel(false)
    })
  }

  function handlePageChange(nextPageNumber) {
    requestModelTransition(() => {
      setPageNumber(nextPageNumber)
    })
  }

  function scrollModelIntoView(modelId) {
    if (modelId == null || !modelListRef.current) {
      return
    }

    const rowElement = modelListRef.current.querySelector(`[data-model-id="${modelId}"]`)
    rowElement?.scrollIntoView({ block: 'nearest' })
  }

  function focusModelRow(modelId) {
    if (modelId == null || !modelListRef.current) {
      return
    }

    const rowElement = modelListRef.current.querySelector(`[data-model-id="${modelId}"]`)
    rowElement?.focus({ preventScroll: true })
  }

  function handleListArrowNavigation(offset) {
    if (listRows.length === 0) {
      return
    }

    const selectedIndex = listRows.findIndex((model) => model.id === selectedModelId)
    const startingIndex = selectedIndex >= 0 ? selectedIndex : (offset > 0 ? -1 : listRows.length)
    const nextIndex = Math.min(listRows.length - 1, Math.max(0, startingIndex + offset))
    const nextModel = listRows[nextIndex]

    if (!nextModel) {
      return
    }

    requestModelTransition(() => {
      handleSelectModel(nextModel)
      requestAnimationFrame(() => {
        scrollModelIntoView(nextModel.id)
        focusModelRow(nextModel.id)
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

  function handleAddModel() {
    requestModelTransition(() => {
      const nextForm = createEmptyModelForm()

      setSelectedModelId(null)
      setIsCreatingModel(true)
      setForm(nextForm)
      markModelAsSaved(nextForm)
      setSuccessMessage('')
      setError('')
    })
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const savedModel = await saveItemModel({
        id: form.id,
        name: form.name,
      })

      const savedModelForm = {
        id: savedModel?.id ?? null,
        name: savedModel?.name ?? '',
      }
      const savedModelRow = mapModelToListItem(savedModel)

      setModelRows((previousModels) => {
        const existingIndex = previousModels.findIndex((model) => model.id === savedModelRow.id)
        if (existingIndex >= 0) {
          const nextModels = [...previousModels]
          nextModels[existingIndex] = savedModelRow
          return nextModels
        }

        return [savedModelRow, ...previousModels].slice(0, PAGE_SIZE)
      })

      if (form.id == null) {
        setTotalCount((previousTotal) => previousTotal + 1)
      }

      setSelectedModelId(savedModelForm.id)
      setIsCreatingModel(false)
      setForm(savedModelForm)
      markModelAsSaved(savedModelForm)
      setSuccessMessage('Modell sparad.')
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte spara modell.')
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
      await deleteItemModel(form.id)

      setModelRows((previousModels) => {
        const nextModels = previousModels.filter((model) => model.id !== form.id)
        const fallbackModel = nextModels[0] ?? null

        if (fallbackModel) {
          setSelectedModelId(fallbackModel.id)
          setIsCreatingModel(false)
        } else {
          const emptyForm = createEmptyModelForm()
          setSelectedModelId(null)
          setIsCreatingModel(false)
          setForm(emptyForm)
          markModelAsSaved(emptyForm)
        }

        return nextModels
      })

      setSuccessMessage('Modell raderad.')
      setTotalCount((previousTotal) => Math.max(0, previousTotal - 1))
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte radera modell.')
    } finally {
      setIsDeleting(false)
    }
  }

  function handleStayOnModel() {
    pendingModelTransitionRef.current = null

    if (blocker.state === 'blocked') {
      blocker.reset()
    }

    setShowUnsavedChangesModal(false)
  }

  function handleDiscardModelChanges() {
    if (blocker.state === 'blocked') {
      setShowUnsavedChangesModal(false)
      blocker.proceed()
      return
    }

    const pendingTransition = pendingModelTransitionRef.current
    pendingModelTransitionRef.current = null
    setShowUnsavedChangesModal(false)
    pendingTransition?.()
  }

  const isDetailDisabled = (selectedModelId == null && !isCreatingModel) || isDetailLoading

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
                  placeholder="Sök modell, fritext"
                  className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                />
                <ActionButton label="Ny" icon={Plus} onClick={handleAddModel} accent="sky" />
              </div>
            </div>

            <div
              ref={modelListRef}
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              className="mt-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 focus:outline-none"
            >
              <div className="mb-1 grid grid-cols-[92px_minmax(0,1fr)] border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700">
                <span>Kod</span>
                <span>Beskrivning</span>
              </div>

              {showListSkeleton && (
                <div className="space-y-1 px-3 py-2">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <Skeleton key={`model-list-skeleton-${index}`} height={16} />
                  ))}
                </div>
              )}

              {isLoading && !showListSkeleton && (
                <div className="py-4 text-xs text-gray-500">Laddar modeller...</div>
              )}

              {!isLoading && listRows.length === 0 && (
                <div className="py-4 text-center text-xs text-gray-500">Inga modeller matchar sökningen.</div>
              )}

              {!isLoading && listRows.map((itemModel) => {
                const isSelected = itemModel.id === selectedModelId

                return (
                  <button
                    key={itemModel.id}
                    type="button"
                    data-model-id={itemModel.id}
                    onClick={() => requestModelTransition(() => handleSelectModel(itemModel))}
                    onKeyDown={handleListKeyDown}
                    className={`w-full px-3 py-1.5 text-left text-xs leading-[1.1] tracking-[-0.01em] transition ${
                      isSelected
                        ? 'bg-lime-200 text-gray-900'
                        : 'text-gray-800 hover:bg-lime-100'
                    }`}
                  >
                    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center">
                      <span>{itemModel.id ?? '-'}</span>
                      <span className="truncate">{itemModel.name || '-'}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
              {totalPages > 1 && (
                <div className="ml-3 text-xs text-gray-500">{totalCount} modeller totalt, {PAGE_SIZE} per sida.</div>
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
          {/* <div aria-hidden="true" className="mt-2 hidden bg-gray-300 lg:block" /> */}

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
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showUnsavedChangesModal}
        onClose={handleStayOnModel}
        onConfirm={handleDiscardModelChanges}
        title="OSPARADE ÄNDRINGAR"
        message="Du har osparade ändringar. Vill du lämna modellen utan att spara?"
        confirmText="Lämna modell"
        cancelText="Stanna kvar"
        isDestructive
      />
    </div>
  )
}
