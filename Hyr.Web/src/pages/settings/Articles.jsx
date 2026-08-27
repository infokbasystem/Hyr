import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, Plus, Save, Trash2 } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledCheckbox from '../../components/LabeledCheckbox'
import LabeledInput from '../../components/LabeledInput'
import LabeledSelect from '../../components/LabeledSelect'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../lib/sharedRequest'
import {
  deleteArticle,
  getArticleFormOptions,
  getArticleById,
  saveArticle,
  searchArticles,
} from '../../lib/articleApi'

const PAGE_SIZE = 200

function createEmptyArticleForm() {
  return {
    id: null,
    officeId: null,
    articleNr: '',
    name: '',
    price: null,
    accountId: null,
    vatRateId: null,
    isActive: true,
    calcPriceTypeCode: null,
  }
}

function mapArticleToListItem(article) {
  return {
    id: article?.id ?? null,
    articleNr: article?.articleNr ?? '',
    name: article?.name ?? '',
  }
}

function createArticleSnapshot(form) {
  return JSON.stringify({
    articleNr: form?.articleNr ?? '',
    name: form?.name ?? '',
    price: form?.price == null ? null : Number(form.price),
    accountId: form?.accountId ?? null,
    vatRateId: form?.vatRateId ?? null,
    isActive: Boolean(form?.isActive),
  })
}

export default function Articles() {
  const initialSnapshotRef = useRef('')
  const hasInitializedSnapshotRef = useRef(false)
  const pendingTransitionRef = useRef(null)
  const listRef = useRef(null)

  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState(() => createEmptyArticleForm())
  const [searchValue, setSearchValue] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFormOptionsLoading, setIsFormOptionsLoading] = useState(true)
  const [accountOptions, setAccountOptions] = useState([])
  const [vatRateOptions, setVatRateOptions] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)

  const showListSkeleton = useDelayedSkeleton(isLoading, 300, 200)
  const showDetailSkeleton = useDelayedSkeleton(isDetailLoading, 300, 200)

  function markAsSaved(nextForm) {
    initialSnapshotRef.current = createArticleSnapshot(nextForm)
    hasInitializedSnapshotRef.current = true
  }

  useEffect(() => {
    let isActive = true

    setIsFormOptionsLoading(true)

    getSharedRequest('settings:articles:form-options', () => getArticleFormOptions())
      .then((options) => {
        if (!isActive) {
          return
        }

        setAccountOptions(Array.isArray(options?.accounts) ? options.accounts : [])
        setVatRateOptions(Array.isArray(options?.vatRates) ? options.vatRates : [])
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta formulärval för artiklar.')
      })
      .finally(() => {
        if (isActive) {
          setIsFormOptionsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    setIsLoading(true)
    setError('')

    const requestKey = `settings:articles:${pageNumber}:${PAGE_SIZE}:${searchValue.trim().toLowerCase()}`

    getSharedRequest(requestKey, () => searchArticles({
      searchTerm: searchValue,
      pageNumber,
      pageSize: PAGE_SIZE,
    }))
      .then((result) => {
        if (!isActive) {
          return
        }

        const mappedRows = (result?.items ?? []).map((entry) => mapArticleToListItem(entry))
        setRows(mappedRows)
        setTotalCount(result?.totalCount ?? 0)
        setTotalPages(result?.totalPages ?? 0)

        if (mappedRows.length === 0) {
          setSelectedId(null)

          if (!isCreating) {
            const emptyForm = createEmptyArticleForm()
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

        setError(requestError?.message || 'Kunde inte hämta artiklar.')
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

    getArticleById(selectedId)
      .then((result) => {
        if (!isActive) {
          return
        }

        const nextForm = {
          id: result?.id ?? null,
          officeId: result?.officeId ?? null,
          articleNr: result?.articleNr ?? '',
          name: result?.name ?? '',
          price: result?.price ?? null,
          accountId: result?.accountId ?? null,
          vatRateId: result?.vatRateId ?? null,
          isActive: Boolean(result?.isActive),
          calcPriceTypeCode: result?.calcPriceTypeCode ?? null,
        }

        setForm(nextForm)
        markAsSaved(nextForm)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta artikel.')
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

  const isSystemArticle = Boolean(form.calcPriceTypeCode)

  const accountSelectItems = useMemo(() => {
    return accountOptions
      .map((account) => {
        const id = account?.id
        if (id == null) {
          return null
        }

        const accountNr = account?.accountNr == null ? '' : `${account.accountNr}`
        const name = `${account?.name ?? ''}`
        const label = accountNr && name
          ? `${accountNr} - ${name}`
          : (accountNr || name || `${id}`)

        return {
          id,
          name: label,
        }
      })
      .filter((entry) => entry != null)
  }, [accountOptions])

  const vatRateSelectItems = useMemo(() => {
    return vatRateOptions
      .map((vatRate) => {
        const id = vatRate?.id
        if (id == null) {
          return null
        }

        const rate = vatRate?.rate == null
          ? ''
          : `${vatRate.rate}`.replace('.', ',')
        const name = `${vatRate?.name ?? ''}`
        const label = rate && name
          ? `${name} (${rate}%)`
          : (name || (rate ? `${rate}%` : `${id}`))

        return {
          id,
          name: label,
        }
      })
      .filter((entry) => entry != null)
  }, [vatRateOptions])

  const isDirty = hasInitializedSnapshotRef.current
    && createArticleSnapshot(form) !== initialSnapshotRef.current

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
      setError('Kunde inte läsa artikel-id från listan.')
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

    const rowElement = listRef.current.querySelector(`[data-article-id="${rowId}"]`)
    rowElement?.scrollIntoView({ block: 'nearest' })
  }

  function focusRow(rowId) {
    if (rowId == null || !listRef.current) {
      return
    }

    const rowElement = listRef.current.querySelector(`[data-article-id="${rowId}"]`)
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

  function handleToggleActive(nextChecked) {
    setForm((previous) => ({
      ...previous,
      isActive: typeof nextChecked === 'boolean' ? nextChecked : !previous.isActive,
    }))
  }

  function handleSelectChange(field, value) {
    const parsed = Number(value)
    const nextValue = Number.isInteger(parsed) && parsed > 0 ? parsed : null
    handleFieldChange(field, nextValue)
  }

  function handleAdd() {
    requestTransition(() => {
      const nextForm = createEmptyArticleForm()

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
      const saved = await saveArticle({
        id: form.id,
        articleNr: form.articleNr,
        name: form.name,
        price: form.price,
        accountId: form.accountId,
        vatRateId: form.vatRateId,
        isActive: form.isActive,
      })

      const savedForm = {
        id: saved?.id ?? null,
        officeId: saved?.officeId ?? null,
        articleNr: saved?.articleNr ?? '',
        name: saved?.name ?? '',
        price: saved?.price ?? null,
        accountId: saved?.accountId ?? null,
        vatRateId: saved?.vatRateId ?? null,
        isActive: Boolean(saved?.isActive),
        calcPriceTypeCode: saved?.calcPriceTypeCode ?? null,
      }
      const savedRow = mapArticleToListItem(saved)

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
      setSuccessMessage('Artikel sparad.')
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte spara artikel.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (form.id == null || isDeleting || isSystemArticle) {
      return
    }

    setIsDeleting(true)
    setError('')
    setSuccessMessage('')

    try {
      await deleteArticle(form.id)

      setRows((previousRows) => {
        const nextRows = previousRows.filter((entry) => entry.id !== form.id)
        const fallbackRow = nextRows[0] ?? null

        if (fallbackRow) {
          setSelectedId(fallbackRow.id)
          setIsCreating(false)
        } else {
          const emptyForm = createEmptyArticleForm()
          setSelectedId(null)
          setIsCreating(false)
          setForm(emptyForm)
          markAsSaved(emptyForm)
        }

        return nextRows
      })

      setSuccessMessage('Artikel raderad.')
      setTotalCount((previousTotal) => Math.max(0, previousTotal - 1))
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte radera artikel.')
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

  const isDetailDisabled = (selectedId == null && !isCreating) || isDetailLoading || isFormOptionsLoading

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
                  placeholder="Sök artikel, fritext"
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
              <div className="mb-1 grid grid-cols-[110px_minmax(0,1fr)] border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700">
                <span>Nr</span>
                <span>Namn</span>
              </div>

              {showListSkeleton && (
                <div className="space-y-1 px-3 py-2">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <Skeleton key={`article-list-skeleton-${index}`} height={16} />
                  ))}
                </div>
              )}

              {isLoading && !showListSkeleton && (
                <div className="py-4 text-xs text-gray-500">Laddar artiklar...</div>
              )}

              {!isLoading && listRows.length === 0 && (
                <div className="py-4 text-center text-xs text-gray-500">Inga artiklar matchar sökningen.</div>
              )}

              {!isLoading && listRows.map((entry) => {
                const isSelected = entry.id === selectedId

                return (
                  <button
                    key={entry.id}
                    type="button"
                    data-article-id={entry.id}
                    onClick={() => requestTransition(() => handleSelect(entry))}
                    onKeyDown={handleListKeyDown}
                    className={`w-full px-3 py-1.5 text-left text-xs leading-[1.1] tracking-[-0.01em] transition ${
                      isSelected
                        ? 'bg-lime-200 text-gray-900'
                        : 'text-gray-800 hover:bg-lime-100'
                    }`}
                  >
                    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-2">
                      <span>{entry.articleNr || '-'}</span>
                      <span className="truncate">{entry.name || '-'}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
              {totalPages > 1 && (
                <div className="ml-3 text-xs text-gray-500">{totalCount} artiklar totalt, {PAGE_SIZE} per sida.</div>
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
                <span title={isSystemArticle ? 'Systemartiklar kan inte tas bort.' : undefined}>
                  <ActionButton label="Radera" icon={Trash2} onClick={handleDelete} accent="rose" disabled={form.id == null || isSaving || isDetailDisabled || isDeleting || isSystemArticle} />
                </span>
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
                    <Skeleton height={28} width={150} />
                  </div>
                ) : (
                  <>
                    <LabeledInput
                      name="articleNr"
                      label="Art.nr"
                      labelWidth="w-20"
                      inputWidth="w-28"
                      margintop="0"
                      value={form.articleNr}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleFieldChange('articleNr', value ?? '')}
                    />
                    <LabeledInput
                      name="name"
                      label="Namn"
                      labelWidth="w-20"
                      inputWidth="w-70"
                      margintop="0"
                      value={form.name}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleFieldChange('name', value ?? '')}
                    />
                    <LabeledInput
                      name="price"
                      type="number"
                      label="Pris"
                      labelWidth="w-20"
                      inputWidth="w-28"
                      margintop="0"
                      value={form.price}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleFieldChange('price', value)}
                    />
                    <LabeledSelect
                      name="accountId"
                      label="Konto"
                      labelWidth="w-20"
                      inputWidth="w-28"
                      margintop="0"
                      placeholder="-"
                      value={form.accountId ?? ''}
                      items={accountSelectItems}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleSelectChange('accountId', value)}
                    />
                    <LabeledSelect
                      name="vatRateId"
                      label="Moms"
                      labelWidth="w-20"
                      inputWidth="w-28"
                      margintop="0"
                      placeholder="-"
                      value={form.vatRateId ?? ''}
                      items={vatRateSelectItems}
                      disabled={isDetailDisabled}
                      onChange={(value) => handleSelectChange('vatRateId', value)}
                    />
                    <LabeledCheckbox
                      id="article-active"
                      name="article-active"
                      label="Aktiv"
                      labelWidth="w-20"
                      labelPosition="left"
                      checked={Boolean(form.isActive)}
                      disabled={isDetailDisabled}
                      onChange={handleToggleActive}
                      color="green"                      
                    />
                    {isSystemArticle && (
                      <div className="mt-4 flex items-center text-tiny tracking-[0.06em] text-gray-500">
                        <span className="w-20">System</span>
                        <span>Systemartikel ({form.calcPriceTypeCode})</span>
                      </div>
                    )}
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
        message="Du har osparade ändringar. Vill du lämna artiklar utan att spara?"
        confirmText="Lämna artiklar"
        cancelText="Stanna kvar"
        isDestructive
      />
    </div>
  )
}