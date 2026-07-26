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
  deleteItemCategory,
  getItemCategoryById,
  saveItemCategory,
  searchItemCategories,
} from '../../lib/itemCategoryApi'

const PAGE_SIZE = 200

function createEmptyCategoryForm() {
  return {
    id: null,
    name: '',
  }
}

function mapCategoryToListItem(itemCategory) {
  return {
    id: itemCategory?.id ?? null,
    name: itemCategory?.name ?? '',
  }
}

function createCategorySnapshot(form) {
  return JSON.stringify({
    name: form?.name ?? '',
  })
}

export default function Categories() {
  const initialCategorySnapshotRef = useRef('')
  const hasInitializedSnapshotRef = useRef(false)
  const pendingCategoryTransitionRef = useRef(null)
  const categoryListRef = useRef(null)

  const [categoryRows, setCategoryRows] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [form, setForm] = useState(() => createEmptyCategoryForm())
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

  function markCategoryAsSaved(nextForm) {
    initialCategorySnapshotRef.current = createCategorySnapshot(nextForm)
    hasInitializedSnapshotRef.current = true
  }

  useEffect(() => {
    let isActive = true

    setIsLoading(true)
    setError('')

    const requestKey = `settings:itemcategories:${pageNumber}:${PAGE_SIZE}:${searchValue.trim().toLowerCase()}`

    getSharedRequest(requestKey, () => searchItemCategories({
      searchTerm: searchValue,
      pageNumber,
      pageSize: PAGE_SIZE,
    }))
      .then((result) => {
        if (!isActive) {
          return
        }

        const mappedCategories = (result?.items ?? []).map((itemCategory) => mapCategoryToListItem(itemCategory))
        setCategoryRows(mappedCategories)
        setTotalCount(result?.totalCount ?? 0)
        setTotalPages(result?.totalPages ?? 0)

        if (mappedCategories.length === 0) {
          setSelectedCategoryId(null)

          if (!isCreatingCategory) {
            const emptyForm = createEmptyCategoryForm()
            setForm(emptyForm)
            markCategoryAsSaved(emptyForm)
          }

          return
        }

        if (isCreatingCategory) {
          return
        }

        const selectedFromPage = selectedCategoryId == null
          ? null
          : mappedCategories.find((itemCategory) => itemCategory.id === selectedCategoryId)

        const nextSelected = selectedFromPage ?? mappedCategories[0]
        setSelectedCategoryId(nextSelected.id)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta kategorier.')
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

    if (isCreatingCategory || selectedCategoryId == null) {
      setIsDetailLoading(false)
      return () => {
        isActive = false
      }
    }

    setIsDetailLoading(true)

    getItemCategoryById(selectedCategoryId)
      .then((result) => {
        if (!isActive) {
          return
        }

        const nextForm = {
          id: result?.id ?? null,
          name: result?.name ?? '',
        }

        setForm(nextForm)
        markCategoryAsSaved(nextForm)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta kategori.')
      })
      .finally(() => {
        if (isActive) {
          setIsDetailLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isCreatingCategory, selectedCategoryId])

  const listRows = useMemo(() => categoryRows, [categoryRows])

  const isDirty = hasInitializedSnapshotRef.current
    && createCategorySnapshot(form) !== initialCategorySnapshotRef.current

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

  function requestCategoryTransition(action) {
    if (!isDirty) {
      action()
      return
    }

    pendingCategoryTransitionRef.current = action
    setShowUnsavedChangesModal(true)
  }

  function handleSelectCategory(itemCategory) {
    if (!itemCategory) {
      return
    }

    if (itemCategory.id == null) {
      setError('Kunde inte läsa kategori-id från listan.')
      return
    }

    if (!isCreatingCategory && itemCategory.id === selectedCategoryId) {
      return
    }

    setSelectedCategoryId(itemCategory.id)
    setIsCreatingCategory(false)
    setSuccessMessage('')
    setError('')
  }

  function handleSearchChange(value) {
    requestCategoryTransition(() => {
      setSearchValue(value)
      setPageNumber(1)
      setSelectedCategoryId(null)
      setIsCreatingCategory(false)
    })
  }

  function handlePageChange(nextPageNumber) {
    requestCategoryTransition(() => {
      setPageNumber(nextPageNumber)
    })
  }

  function scrollCategoryIntoView(categoryId) {
    if (categoryId == null || !categoryListRef.current) {
      return
    }

    const rowElement = categoryListRef.current.querySelector(`[data-category-id="${categoryId}"]`)
    rowElement?.scrollIntoView({ block: 'nearest' })
  }

  function focusCategoryRow(categoryId) {
    if (categoryId == null || !categoryListRef.current) {
      return
    }

    const rowElement = categoryListRef.current.querySelector(`[data-category-id="${categoryId}"]`)
    rowElement?.focus({ preventScroll: true })
  }

  function handleListArrowNavigation(offset) {
    if (listRows.length === 0) {
      return
    }

    const selectedIndex = listRows.findIndex((category) => category.id === selectedCategoryId)
    const startingIndex = selectedIndex >= 0 ? selectedIndex : (offset > 0 ? -1 : listRows.length)
    const nextIndex = Math.min(listRows.length - 1, Math.max(0, startingIndex + offset))
    const nextCategory = listRows[nextIndex]

    if (!nextCategory) {
      return
    }

    requestCategoryTransition(() => {
      handleSelectCategory(nextCategory)
      requestAnimationFrame(() => {
        scrollCategoryIntoView(nextCategory.id)
        focusCategoryRow(nextCategory.id)
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

  function handleAddCategory() {
    requestCategoryTransition(() => {
      const nextForm = createEmptyCategoryForm()

      setSelectedCategoryId(null)
      setIsCreatingCategory(true)
      setForm(nextForm)
      markCategoryAsSaved(nextForm)
      setSuccessMessage('')
      setError('')
    })
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const savedCategory = await saveItemCategory({
        id: form.id,
        name: form.name,
      })

      const savedCategoryForm = {
        id: savedCategory?.id ?? null,
        name: savedCategory?.name ?? '',
      }
      const savedCategoryRow = mapCategoryToListItem(savedCategory)

      setCategoryRows((previousCategories) => {
        const existingIndex = previousCategories.findIndex((category) => category.id === savedCategoryRow.id)
        if (existingIndex >= 0) {
          const nextCategories = [...previousCategories]
          nextCategories[existingIndex] = savedCategoryRow
          return nextCategories
        }

        return [savedCategoryRow, ...previousCategories].slice(0, PAGE_SIZE)
      })

      if (form.id == null) {
        setTotalCount((previousTotal) => previousTotal + 1)
      }

      setSelectedCategoryId(savedCategoryForm.id)
      setIsCreatingCategory(false)
      setForm(savedCategoryForm)
      markCategoryAsSaved(savedCategoryForm)
      setSuccessMessage('Kategori sparad.')
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte spara kategori.')
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
      await deleteItemCategory(form.id)

      setCategoryRows((previousCategories) => {
        const nextCategories = previousCategories.filter((category) => category.id !== form.id)
        const fallbackCategory = nextCategories[0] ?? null

        if (fallbackCategory) {
          setSelectedCategoryId(fallbackCategory.id)
          setIsCreatingCategory(false)
        } else {
          const emptyForm = createEmptyCategoryForm()
          setSelectedCategoryId(null)
          setIsCreatingCategory(false)
          setForm(emptyForm)
          markCategoryAsSaved(emptyForm)
        }

        return nextCategories
      })

      setSuccessMessage('Kategori raderad.')
      setTotalCount((previousTotal) => Math.max(0, previousTotal - 1))
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte radera kategori.')
    } finally {
      setIsDeleting(false)
    }
  }

  function handleStayOnCategory() {
    pendingCategoryTransitionRef.current = null

    if (blocker.state === 'blocked') {
      blocker.reset()
    }

    setShowUnsavedChangesModal(false)
  }

  function handleDiscardCategoryChanges() {
    if (blocker.state === 'blocked') {
      setShowUnsavedChangesModal(false)
      blocker.proceed()
      return
    }

    const pendingTransition = pendingCategoryTransitionRef.current
    pendingCategoryTransitionRef.current = null
    setShowUnsavedChangesModal(false)
    pendingTransition?.()
  }

  const isDetailDisabled = (selectedCategoryId == null && !isCreatingCategory) || isDetailLoading

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
                  placeholder="Sök kategori, fritext"
                  className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                />
                <ActionButton label="Ny" icon={Plus} onClick={handleAddCategory} accent="sky" />
              </div>
            </div>


            <div
              ref={categoryListRef}
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              className="mt-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 focus:outline-none"
            >
              <div className="mb-2 grid grid-cols-[92px_minmax(0,1fr)] border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700">
                <span>Kod</span>
                <span>Beskrivning</span>
              </div>

              {showListSkeleton && (
                <div className="space-y-1 px-3 py-2">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <Skeleton key={`category-list-skeleton-${index}`} height={16} />
                  ))}
                </div>
              )}

              {isLoading && !showListSkeleton && (
                <div className="py-4 text-xs text-gray-500">Laddar kategorier...</div>
              )}

              {!isLoading && listRows.length === 0 && (
                <div className="py-4 text-center text-xs text-gray-500">Inga kategorier matchar sökningen.</div>
              )}

              {!isLoading && listRows.map((itemCategory) => {
                const isSelected = itemCategory.id === selectedCategoryId

                return (
                  <button
                    key={itemCategory.id}
                    type="button"
                    data-category-id={itemCategory.id}
                    onClick={() => requestCategoryTransition(() => handleSelectCategory(itemCategory))}
                    onKeyDown={handleListKeyDown}
                    className={`w-full px-3 py-1.5 text-left text-xs leading-[1.1] tracking-[-0.01em] transition ${
                      isSelected
                        ? 'bg-lime-200 text-gray-900'
                        : 'text-gray-800 hover:bg-lime-100'
                    }`}
                  >
                    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center">
                      <span>{itemCategory.id ?? '-'}</span>
                      <span className="truncate">{itemCategory.name || '-'}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
              {totalPages > 1 && (
                <div className="ml-3 text-xs text-gray-500">{totalCount} kategorier totalt, {PAGE_SIZE} per sida.</div>
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
                  <div className="w-full border border-rose-200 bg-rose-50 py-2 pl-4 text-xs text-rose-800">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="w-full border border-emerald-200 bg-emerald-100 py-2 pl-4 text-xs text-emerald-800">
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
        onClose={handleStayOnCategory}
        onConfirm={handleDiscardCategoryChanges}
        title="OSPARADE ÄNDRINGAR"
        message="Du har osparade ändringar. Vill du lämna kategorin utan att spara?"
        confirmText="Lämna kategori"
        cancelText="Stanna kvar"
        isDestructive
      />
    </div>
  )
}