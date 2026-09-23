import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import { CircleDollarSign, Pencil, Plus, Tags, Save, Trash2, X } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import FilterSelect from '../../components/FilterSelect'
import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledInput from '../../components/LabeledInput'
import LabeledSelect from '../../components/LabeledSelect'
import TimeDropdownInput from '../../components/TimeDropdownInput'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../lib/sharedRequest'
import {
  getCategoryPricing,
  getPricingFormOptions,
  savePriceLists,
  saveCategoryPricing,
  searchItemPricing,
} from '../../lib/pricingApi'

const PAGE_SIZE = 200
const PRICING_SEARCH_CACHE_KEY = 'settings-pricing-page-state'
const DAY_OF_WEEK_OPTIONS = [
  { value: '0', label: 'Sön' },
  { value: '1', label: 'Mån' },
  { value: '2', label: 'Tis' },
  { value: '3', label: 'Ons' },
  { value: '4', label: 'Tor' },
  { value: '5', label: 'Fre' },
  { value: '6', label: 'Lör' },
]
const DAY_OF_WEEK_SELECT_ITEMS = DAY_OF_WEEK_OPTIONS.map((option) => ({
  id: option.value,
  name: option.label,
}))

function readCachedPricingState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(PRICING_SEARCH_CACHE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch {
    return null
  }
}

function createEmptyItemForm() {
  return {
    id: null,
    itemNr: '',
    manufacturer: '',
    regNr: '',
    machineNr: '',
    basePrice: null,
    pricePerHour: null,
    pricePerDay: null,
    pricePerWeek: null,
    pricePerMonth: null,
    pricePerKm: null,
  }
}

function createEmptyCategoryPricing() {
  return {
    day: {
      pricePerDay: null,
      pricePerKm: null,
    },
    dayFreeKm: {
      pricePerDay: null,
    },
    weekIncludedKm: {
      pricePerWeek: null,
      includedKmPerWeek: null,
      pricePerExtraDay: null,
      includedKmPerExtraDay: null,
      pricePerExcessKm: null,
    },
    weekFreeKm: {
      pricePerWeek: null,
      pricePerExtraDay: null,
    },
    thirtyDayIncludedKm: {
      pricePer30Days: null,
      includedKmPer30Days: null,
      pricePerExtraDay: null,
      includedKmPerExtraDay: null,
      pricePerExcessKm: null,
    },
    weekend: {
      fromDayOfWeek: null,
      fromTime: '',
      toDayOfWeek: null,
      toTime: '',
      weekendPrice: null,
      pricePerKm: null,
    },
    weekendIncludedKm: {
      fromDayOfWeek: null,
      fromTime: '',
      toDayOfWeek: null,
      toTime: '',
      weekendPrice: null,
      includedKm: null,
      pricePerExcessKm: null,
    },
    weekendFreeKm: {
      fromDayOfWeek: null,
      fromTime: '',
      toDayOfWeek: null,
      toTime: '',
      weekendPrice: null,
    },
    hourIncludedKm: {
      pricePerHour: null,
      includedKmPerHour: null,
      pricePerExcessKm: null,
    },
    service: {
      pricePerServiceDay: null,
      includedKmPerDay: null,
      pricePerExcessKm: null,
    },
    guarantee: {
      pricePerGuaranteeDay: null,
    },
  }
}

function normalizeTimeValue(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function mapCategoryPricingToForm(data) {
  const emptyPricing = createEmptyCategoryPricing()

  return {
    priceListId: data?.priceListId ?? null,
    itemCategoryId: data?.itemCategoryId ?? null,
    day: {
      ...emptyPricing.day,
      ...(data?.day ?? {}),
    },
    dayFreeKm: {
      ...emptyPricing.dayFreeKm,
      ...(data?.dayFreeKm ?? {}),
    },
    weekIncludedKm: {
      ...emptyPricing.weekIncludedKm,
      ...(data?.weekIncludedKm ?? {}),
    },
    weekFreeKm: {
      ...emptyPricing.weekFreeKm,
      ...(data?.weekFreeKm ?? {}),
    },
    thirtyDayIncludedKm: {
      ...emptyPricing.thirtyDayIncludedKm,
      ...(data?.thirtyDayIncludedKm ?? {}),
    },
    weekend: {
      ...emptyPricing.weekend,
      ...(data?.weekend ?? {}),
      fromTime: normalizeTimeValue(data?.weekend?.fromTime),
      toTime: normalizeTimeValue(data?.weekend?.toTime),
    },
    weekendIncludedKm: {
      ...emptyPricing.weekendIncludedKm,
      ...(data?.weekendIncludedKm ?? {}),
      fromTime: normalizeTimeValue(data?.weekendIncludedKm?.fromTime),
      toTime: normalizeTimeValue(data?.weekendIncludedKm?.toTime),
    },
    weekendFreeKm: {
      ...emptyPricing.weekendFreeKm,
      ...(data?.weekendFreeKm ?? {}),
      fromTime: normalizeTimeValue(data?.weekendFreeKm?.fromTime),
      toTime: normalizeTimeValue(data?.weekendFreeKm?.toTime),
    },
    hourIncludedKm: {
      ...emptyPricing.hourIncludedKm,
      ...(data?.hourIncludedKm ?? {}),
    },
    service: {
      ...emptyPricing.service,
      ...(data?.service ?? {}),
    },
    guarantee: {
      ...emptyPricing.guarantee,
      ...(data?.guarantee ?? {}),
    },
  }
}

function createEmptyPriceListDraft() {
  return {
    id: null,
    name: '',
  }
}

function mapItemToForm(item) {
  return {
    id: item?.id ?? null,
    itemNr: item?.itemNr ?? '',
    manufacturer: item?.manufacturer ?? '',
    regNr: item?.regNr ?? '',
    machineNr: item?.machineNr ?? '',
    basePrice: item?.basePrice ?? null,
    pricePerHour: item?.pricePerHour ?? null,
    pricePerDay: item?.pricePerDay ?? null,
    pricePerWeek: item?.pricePerWeek ?? null,
    pricePerMonth: item?.pricePerMonth ?? null,
    pricePerKm: item?.pricePerKm ?? null,
  }
}

function createCategoryPricingSnapshot(pricing) {
  return JSON.stringify(pricing ?? createEmptyCategoryPricing())
}

export default function Pricing() {
  const cachedState = readCachedPricingState()
  const initialCategoryPricingSnapshotRef = useRef('')
  const hasInitializedCategoryPricingSnapshotRef = useRef(false)
  const pendingTransitionRef = useRef(null)
  const [mode, setMode] = useState(cachedState?.mode ?? 'item')

  const [itemRows, setItemRows] = useState(cachedState?.itemRows ?? [])
  const [selectedItemId, setSelectedItemId] = useState(cachedState?.selectedItemId ?? null)
  const [itemForm, setItemForm] = useState(cachedState?.itemForm ?? createEmptyItemForm())
  const [itemSearchValue, setItemSearchValue] = useState(cachedState?.itemSearchValue ?? '')
  const [isLoadingItems, setIsLoadingItems] = useState(!cachedState?.searchLoaded)
  const [hasSearchSnapshot, setHasSearchSnapshot] = useState(Boolean(cachedState?.searchLoaded))

  const [priceListOptions, setPriceListOptions] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [selectedPriceListId, setSelectedPriceListId] = useState(cachedState?.selectedPriceListId ?? '')
  const [selectedCategoryId, setSelectedCategoryId] = useState(cachedState?.selectedCategoryId ?? '')
  const [showPriceListModal, setShowPriceListModal] = useState(false)
  const [priceListDrafts, setPriceListDrafts] = useState([])
  const [priceListForm, setPriceListForm] = useState(() => createEmptyPriceListDraft())
  const [categoryPricing, setCategoryPricing] = useState(() => createEmptyCategoryPricing())
  const [isLoadingCategoryOptions, setIsLoadingCategoryOptions] = useState(false)
  const [isLoadingCategoryPricing, setIsLoadingCategoryPricing] = useState(false)
  const [isSavingCategoryPricing, setIsSavingCategoryPricing] = useState(false)
  const [isSavingPriceLists, setIsSavingPriceLists] = useState(false)

  const [error, setError] = useState('')
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)

  const showCategoryPricingSkeleton = useDelayedSkeleton(isLoadingCategoryPricing, 300, 200)

  const isItemMode = mode === 'item'
  const isCategoryMode = mode === 'category'
  const priceListSelectOptions = useMemo(
    () => priceListOptions
      .filter((entry) => entry?.id != null)
      .map((entry) => ({
        value: String(entry.id),
        label: entry?.name ?? '',
      })),
    [priceListOptions]
  )
  const selectedPriceListOption = useMemo(
    () => priceListSelectOptions.find((entry) => entry.value === String(selectedPriceListId)) ?? null,
    [priceListSelectOptions, selectedPriceListId]
  )
  const isCategoryPricingDirty = isCategoryMode
    && !!selectedPriceListId
    && !!selectedCategoryId
    && hasInitializedCategoryPricingSnapshotRef.current
    && createCategoryPricingSnapshot(categoryPricing) !== initialCategoryPricingSnapshotRef.current

  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    isCategoryPricingDirty && currentLocation.pathname !== nextLocation.pathname
  ))

  function markCategoryPricingAsSaved(nextPricing) {
    initialCategoryPricingSnapshotRef.current = createCategoryPricingSnapshot(nextPricing)
    hasInitializedCategoryPricingSnapshotRef.current = true
  }

  function requestTransition(action) {
    if (!isCategoryPricingDirty) {
      action()
      return
    }

    pendingTransitionRef.current = action
    setShowUnsavedChangesModal(true)
  }

  function handleStayOnPage() {
    setShowUnsavedChangesModal(false)
    pendingTransitionRef.current = null

    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }

  function handleDiscardChanges() {
    setShowUnsavedChangesModal(false)

    if (blocker.state === 'blocked') {
      blocker.proceed()
      return
    }

    const pendingTransition = pendingTransitionRef.current
    pendingTransitionRef.current = null
    pendingTransition?.()
  }

  function handleCategoryPricingChange(sectionKey, fieldName, value) {
    setCategoryPricing((previous) => ({
      ...previous,
      [sectionKey]: {
        ...previous[sectionKey],
        [fieldName]: value,
      },
    }))
  }

  useEffect(() => {
    let isActive = true
    const wasRestoredFromCache = Boolean(cachedState?.searchLoaded)

    if (!wasRestoredFromCache) {
      setIsLoadingItems(true)
    }
    setError('')

    const requestKey = `settings:pricing:items:${PAGE_SIZE}:${itemSearchValue.trim().toLowerCase()}`

    getSharedRequest(requestKey, () => searchItemPricing({
      searchTerm: itemSearchValue,
      pageNumber: 1,
      pageSize: PAGE_SIZE,
    }))
      .then((result) => {
        if (!isActive) {
          return
        }

        const rows = result?.items ?? []
        setItemRows(rows)
        setHasSearchSnapshot(true)

        if (rows.length === 0) {
          setSelectedItemId(null)
          setItemForm(createEmptyItemForm())
          return
        }

        const selectedItem = rows.find((entry) => entry.id === selectedItemId)
        const nextSelected = selectedItem ?? rows[0]

        setSelectedItemId(nextSelected.id)
        setItemForm(mapItemToForm(nextSelected))
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setHasSearchSnapshot(true)
        setError(requestError?.message || 'Kunde inte hämta artiklarnas priser.')
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingItems(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [itemSearchValue, cachedState?.searchLoaded])

  useEffect(() => {
    let isActive = true

    if (!isCategoryMode) {
      return () => {
        isActive = false
      }
    }

    setIsLoadingCategoryOptions(true)
    setError('')

    getSharedRequest('settings:pricing:category:options', () => getPricingFormOptions())
      .then((options) => {
        if (!isActive) {
          return
        }

        const nextPriceLists = options?.priceLists ?? []

        setPriceListOptions(nextPriceLists)
        setCategoryOptions(options?.itemCategories ?? [])

        if (nextPriceLists.length === 1) {
          setSelectedPriceListId((previous) => previous || String(nextPriceLists[0]?.id ?? ''))
        }
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta prislistor och kategorier.')
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCategoryOptions(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isCategoryMode])

  useEffect(() => {
    let isActive = true

    if (!isCategoryMode || !selectedPriceListId || !selectedCategoryId) {
      setCategoryPricing(createEmptyCategoryPricing())
      hasInitializedCategoryPricingSnapshotRef.current = false
      setIsLoadingCategoryPricing(false)
      return () => {
        isActive = false
      }
    }

    setIsLoadingCategoryPricing(true)
    setError('')

    getCategoryPricing({
      priceListId: Number(selectedPriceListId),
      itemCategoryId: Number(selectedCategoryId),
    })
      .then((result) => {
        if (!isActive) {
          return
        }

        const nextCategoryPricing = mapCategoryPricingToForm(result)
        setCategoryPricing(nextCategoryPricing)
        markCategoryPricingAsSaved(nextCategoryPricing)
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setError(requestError?.message || 'Kunde inte hämta kategoripris för vald prislista.')
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCategoryPricing(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isCategoryMode, selectedPriceListId, selectedCategoryId])

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!isCategoryPricingDirty) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isCategoryPricingDirty])

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedChangesModal(true)
    }
  }, [blocker.state])

  function handleSelectMode(nextMode) {
    if (nextMode === mode) {
      return
    }

    requestTransition(() => {
      setMode(nextMode)
      setError('')

      if (nextMode === 'item') {
        setSelectedPriceListId('')
        setSelectedCategoryId('')
        setCategoryPricing(createEmptyCategoryPricing())
        return
      }

      setSelectedItemId(null)
      setItemForm(createEmptyItemForm())
    })
  }

  function handleSelectPriceList(option) {
    const nextPriceListId = option?.value ?? ''

    if (String(nextPriceListId) === String(selectedPriceListId)) {
      return
    }

    requestTransition(() => {
      setSelectedPriceListId(nextPriceListId)
    })
  }

  function handleSelectCategory(categoryId) {
    if (String(categoryId) === String(selectedCategoryId)) {
      return
    }

    requestTransition(() => {
      setSelectedCategoryId(categoryId)
    })
  }

  async function handleSaveCategoryPricing() {
    if (!selectedPriceListId || !selectedCategoryId) {
      return
    }

    setIsSavingCategoryPricing(true)
    setError('')

    try {
      const savedPricing = await saveCategoryPricing({
        priceListId: Number(selectedPriceListId),
        itemCategoryId: Number(selectedCategoryId),
        ...categoryPricing,
      })

      const nextCategoryPricing = mapCategoryPricingToForm(savedPricing)
      setCategoryPricing(nextCategoryPricing)
      markCategoryPricingAsSaved(nextCategoryPricing)
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte spara kategoripriser.')
    } finally {
      setIsSavingCategoryPricing(false)
    }
  }

  function openPriceListModal() {
    setError('')
    setPriceListDrafts(priceListOptions.map((entry) => ({ ...entry })))
    setPriceListForm(createEmptyPriceListDraft())
    setShowPriceListModal(true)
  }

  function closePriceListModal() {
    if (isSavingPriceLists) {
      return
    }

    setShowPriceListModal(false)
    setPriceListForm(createEmptyPriceListDraft())
  }

  function handlePriceListFormChange(value) {
    setError('')
    setPriceListForm((previous) => ({
      ...previous,
      name: value,
    }))
  }

  function handleSavePriceListDraft() {
    const trimmedName = priceListForm.name.trim()

    if (!trimmedName) {
      return
    }

    const duplicateExists = priceListDrafts.some((entry) => (
      String(entry.id) !== String(priceListForm.id)
      && (entry.name ?? '').trim().toLowerCase() === trimmedName.toLowerCase()
    ))

    if (duplicateExists) {
      setError('Prislistans namn finns redan.')
      return
    }

    setError('')

    if (priceListForm.id) {
      setPriceListDrafts((previous) => previous.map((entry) => (
        String(entry.id) === String(priceListForm.id)
          ? { ...entry, name: trimmedName }
          : entry
      )))
    } else {
      setPriceListDrafts((previous) => [
        ...previous,
        {
          id: `local-${Date.now()}`,
          name: trimmedName,
        },
      ])
    }

    setPriceListForm(createEmptyPriceListDraft())
  }

  function handleEditPriceList(entry) {
    setPriceListForm({
      id: entry.id,
      name: entry.name ?? '',
    })
  }

  function handleRemovePriceList(id) {
    setError('')
    setPriceListDrafts((previous) => previous.filter((entry) => String(entry.id) !== String(id)))

    if (String(selectedPriceListId) === String(id)) {
      setSelectedPriceListId('')
      setCategoryPricing(createEmptyCategoryPricing())
    }
  }

  async function handleApplyPriceListChanges() {
    const nextPriceLists = priceListDrafts
      .map((entry) => ({ ...entry, name: (entry.name ?? '').trim() }))
      .filter((entry) => entry.name)

    const duplicateExists = nextPriceLists.some((entry, index) => (
      nextPriceLists.findIndex((candidate) => candidate.name.toLowerCase() === entry.name.toLowerCase()) !== index
    ))

    if (duplicateExists) {
      setError('Prislistornas namn måste vara unika.')
      return
    }

    setError('')
    setIsSavingPriceLists(true)

    try {
      const savedPriceLists = await savePriceLists(nextPriceLists)

      setPriceListOptions(savedPriceLists)
      setPriceListDrafts(savedPriceLists.map((entry) => ({ ...entry })))

      if (savedPriceLists.length === 1) {
        setSelectedPriceListId((previous) => previous || String(savedPriceLists[0]?.id ?? ''))
      }

      if (selectedPriceListId && !savedPriceLists.some((entry) => String(entry.id) === String(selectedPriceListId))) {
        setSelectedPriceListId('')
        setCategoryPricing(createEmptyCategoryPricing())
      }

      closePriceListModal()
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte spara prislistor.')
    } finally {
      setIsSavingPriceLists(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.setItem(
      PRICING_SEARCH_CACHE_KEY,
      JSON.stringify({
        mode,
        itemRows,
        selectedItemId,
        itemForm,
        itemSearchValue,
        selectedPriceListId,
        selectedCategoryId,
        searchLoaded: hasSearchSnapshot,
      })
    )
  }, [mode, itemRows, selectedItemId, itemForm, itemSearchValue, selectedPriceListId, selectedCategoryId, hasSearchSnapshot])

  return (
    <div className="flex h-full min-h-full w-full flex-col px-0 pb-10 md:px-[clamp(8px,15vw,10vw)]">
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 lg:items-stretch lg:grid-cols-[200px_1px_minmax(0,1fr)] lg:gap-8">
          <aside className="mb-8 border-b border-gray-300 pr-4 text-gray-700 lg:sticky lg:top-[120px] lg:self-start lg:border-b-0">
            <div className="mt-15 mr-0 lg:pb-4">
              <h3 className="text-xs font-semibold tracking-[0.08em] text-gray-700">VISA PRISSÄTTNING</h3>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectMode('item')}
                  className={[
                    'group relative flex w-full items-center gap-3 rounded-r-md py-2 pr-3 pl-5 text-left transition',
                    isItemMode
                      ? 'bg-lime-50 text-stone-900'
                      : 'text-stone-600 hover:bg-stone-100/70 hover:text-stone-900',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'absolute top-1/2 left-0 h-6 w-[4px] -translate-y-1/2 rounded-r-full transition',
                      isItemMode ? 'bg-lime-500' : 'bg-transparent group-hover:bg-lime-200',
                    ].join(' ')}
                  />
                  <CircleDollarSign className="h-4 w-4" />
                  <span className={["text-xs leading-none", isItemMode ? 'font-semibold' : 'font-normal'].join(' ')}>Prissättning per hyresobjekt</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('category')}
                  className={[
                    'group relative flex w-full items-center gap-3 rounded-r-md py-2 pr-3 pl-5 text-left transition',
                    isCategoryMode
                      ? 'bg-lime-50 text-stone-900'
                      : 'text-stone-600 hover:bg-stone-100/70 hover:text-stone-900',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'absolute top-1/2 left-0 h-6 w-[4px] -translate-y-1/2 rounded-r-full transition',
                      isCategoryMode ? 'bg-lime-500' : 'bg-transparent group-hover:bg-lime-200',
                    ].join(' ')}
                  />
                  <Tags className="h-4 w-4" />
                  <span className={["text-xs leading-none", isCategoryMode ? 'font-semibold' : 'font-normal'].join(' ')}>Prissättning per kategori</span>
                </button>
              </div>
            </div>
          </aside>

          <div aria-hidden="true" className="mt-6 bg-gray-300" />

          <section className="px-3 lg:px-4">
            <div className="mb-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs ml-1 uppercase font-semibold tracking-[0.09em] text-gray-700">
                  {isItemMode ? 'Prissättning per hyresobjekt' : 'Prissättning per kategori'}
                </h2>
              </div>
            </div>

            {!!error && (
              <div className="mb-5 w-80 rounded-full border border-rose-200 bg-rose-50 px-5 py-1 text-center text-xs text-rose-700">
                {error}
              </div>
            )}

            {isItemMode && (
              <>
                <div className="mb-5">
                  <input
                    value={itemSearchValue}
                    onChange={(event) => {
                      setItemSearchValue(event.target.value)
                    }}
                    placeholder="Sök artikel, regnr, maskinnr"
                    className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                  />
                </div>

                <div className="mb-5 overflow-x-auto">
                  <table className="min-w-[860px] w-full text-xs">
                    <thead>
                      <tr className="text-gray-700">
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-left">Kod</th>
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-left">Artikel</th>
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-right">Baspris</th>
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-right">Timpris</th>
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-right">Dygnspris</th>
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-right">Veckopris</th>
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-right">Månad</th>
                        <th className="whitespace-nowrap px-3 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider text-right">Pris/km</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((item) => (
                        <tr
                          key={`table-${item.id}`}
                          className={`cursor-pointer ${item.id === selectedItemId ? 'bg-lime-50' : 'hover:bg-lime-50/60'}`}
                          onClick={() => {
                            setSelectedItemId(item.id)
                            setItemForm(mapItemToForm(item))
                          }}
                        >
                          <td className="border-t border-gray-200 px-3 py-2">
                            {item.id != null ? (
                              <Link
                                to={`/item/${item.id}`}
                                state={{ originModule: 'settings' }}
                                onClick={(event) => event.stopPropagation()}
                                className="text-sky-700 decoration-sky-300 underline-offset-2 hover:text-sky-800 hover:underline"
                              >
                                {item.id}
                              </Link>
                            ) : ''}
                          </td>
                          <td className="border-t border-gray-200 px-3 py-2">
                            {item.id != null ? (
                              <Link
                                to={`/item/${item.id}`}
                                state={{ originModule: 'settings' }}
                                onClick={(event) => event.stopPropagation()}
                                className="text-sky-700 decoration-sky-300 underline-offset-2 hover:text-sky-800 hover:underline"
                              >
                                {item.itemNr || item.manufacturer || ''}
                              </Link>
                            ) : (
                              item.itemNr || item.manufacturer || ''
                            )}
                          </td>
                          <td className="border-t border-gray-200 px-3 py-2 text-right">{item.basePrice ?? ''}</td>
                          <td className="border-t border-gray-200 px-3 py-2 text-right">{item.pricePerHour ?? ''}</td>
                          <td className="border-t border-gray-200 px-3 py-2 text-right">{item.pricePerDay ?? ''}</td>
                          <td className="border-t border-gray-200 px-3 py-2 text-right">{item.pricePerWeek ?? ''}</td>
                          <td className="border-t border-gray-200 px-3 py-2 text-right">{item.pricePerMonth ?? ''}</td>
                          <td className="border-t border-gray-200 px-3 py-2 text-right">{item.pricePerKm ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </>
            )}

            {isCategoryMode && (
              <div className="">
                <div className="grid gap-8 grid-cols-[300px_1px_minmax(0,1fr)]">
                  <div>
                    <div className="flex items-center justify-between">
                      <FilterSelect
                        value={selectedPriceListOption}
                        onChange={handleSelectPriceList}
                        options={priceListSelectOptions}
                        isSearchable={false}
                        isClearable
                        isDisabled={isLoadingCategoryOptions}
                        placeholder={isLoadingCategoryOptions ? 'Laddar prislistor...' : 'Välj prislista'}
                        width="w-45"
                      />

                      <ActionButton
                        type="button"
                        label="Hantera"
                        icon={Tags}
                        accent="lime"
                        onClick={openPriceListModal}
                      />
                    </div>

                    <div>
                      <div className="mt-8">
                        <div className="mb-1 grid grid-cols-[minmax(0,1fr)] border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700">
                          <span>Kategori</span>
                        </div>

                        {isLoadingCategoryOptions ? (
                          <div className="px-3 py-3 text-xs text-gray-500">Laddar kategorier...</div>
                        ) : categoryOptions.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-gray-500">Inga kategorier att välja.</div>
                        ) : (
                          <div className="">
                            {categoryOptions.map((entry) => {
                              const categoryId = String(entry?.id ?? '')
                              const isSelected = categoryId === String(selectedCategoryId)

                              return (
                                <button
                                  key={entry?.id ?? entry?.name}
                                  type="button"
                                  onClick={() => handleSelectCategory(categoryId)}
                                  className={[
                                    'w-full px-3 py-1.5 text-left text-xs leading-[1.1] tracking-[-0.01em] transition',
                                    isSelected
                                      ? 'bg-lime-200 text-gray-900'
                                      : 'text-gray-800 hover:bg-lime-100',
                                  ].join(' ')}
                                >
                                  <div className="grid grid-cols-[minmax(0,1fr)] items-center">
                                    <span className="truncate">{entry?.name ?? '-'}</span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div aria-hidden="true" className="mt-0 bg-gray-300" />

                  <div className="pt-0">
                    {!selectedPriceListId || !selectedCategoryId ? (
                      <div className="text-center mt-4 ml-20 w-80 rounded-md border border-amber-200 bg-amber-50 px-4 py-5 text-xs text-amber-700">
                        Välj först prislista och kategori.
                      </div>
                    ) : showCategoryPricingSkeleton ? (
                      <div className="pb-3 pt-1">
                        <div className="flex items-center gap-2 pb-5">
                          <Skeleton height={30} width={190} />
                        </div>

                        <div className="grid grid-cols-[4fr_5fr_5fr] gap-10 mb-4">
                          <div className="flex flex-col gap-4">
                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={120} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                              </div>
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={140} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={24} />
                              </div>
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={170} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={180} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                              </div>
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={150} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={110} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={30} />
                                <Skeleton height={30} />
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                              </div>
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={150} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={30} />
                                <Skeleton height={30} />
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                                <Skeleton height={24} />
                              </div>
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <Skeleton height={12} width={140} />
                              <div className="mt-3 space-y-2">
                                <Skeleton height={30} />
                                <Skeleton height={30} />
                                <Skeleton height={24} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pb-3">
                        <div className="flex items-center gap-2 pb-5">
                          <ActionButton
                            type="button"
                            label={isSavingCategoryPricing ? 'Sparar...' : 'Spara kategoripriser'}
                            icon={Save}
                            accent="lime"
                            onClick={handleSaveCategoryPricing}
                            disabled={isSavingCategoryPricing}
                          />
                        </div>
                        <div className="grid grid-cols-[4fr_5fr_5fr] gap-10 mb-4">
                          <span className="flex flex-col gap-4">
                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">DYGNSPRIS</h3>
                              <LabeledInput
                                name="day-pricePerDay"
                                label="Pris per dag"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.day?.pricePerDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('day', 'pricePerDay', value ?? null)}
                              />
                              <LabeledInput
                                name="day-pricePerKm"
                                label="Pris per km"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.day?.pricePerKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('day', 'pricePerKm', value ?? null)}
                              />
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">DYGNSPRIS FRIA KM</h3>
                              <LabeledInput
                                name="dayFreeKm-pricePerDay"
                                label="Pris per dag"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.dayFreeKm?.pricePerDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('dayFreeKm', 'pricePerDay', value ?? null)}
                              />
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">TIMPRIS MED INKL KM</h3>
                              <LabeledInput
                                name="hourIncludedKm-pricePerHour"
                                label="Pris per tim"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.hourIncludedKm?.pricePerHour ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('hourIncludedKm', 'pricePerHour', value ?? null)}
                              />
                              <LabeledInput
                                name="hourIncludedKm-includedKmPerHour"
                                label="Inkl km/tim"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.hourIncludedKm?.includedKmPerHour ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('hourIncludedKm', 'includedKmPerHour', value ?? null)}
                              />
                              <LabeledInput
                                name="hourIncludedKm-pricePerExcessKm"
                                label="Pris över-km"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.hourIncludedKm?.pricePerExcessKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('hourIncludedKm', 'pricePerExcessKm', value ?? null)}
                              />
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">SERVICEPRIS</h3>
                              <LabeledInput
                                name="service-pricePerServiceDay"
                                label="Pris per dag"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.service?.pricePerServiceDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('service', 'pricePerServiceDay', value ?? null)}
                              />
                              <LabeledInput
                                name="service-includedKmPerDay"
                                label="Inkl km/dag"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.service?.includedKmPerDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('service', 'includedKmPerDay', value ?? null)}
                              />
                              <LabeledInput
                                name="service-pricePerExcessKm"
                                label="Pris över-km"
                                labelWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.service?.pricePerExcessKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('service', 'pricePerExcessKm', value ?? null)}
                              />
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">GARANTIPRIS</h3>
                              <LabeledInput
                                name="guarantee-pricePerGuaranteeDay"
                                label="Pris per garantidag"
                                labelWidth="w-28"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.guarantee?.pricePerGuaranteeDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('guarantee', 'pricePerGuaranteeDay', value ?? null)}
                              />
                            </div>
                          </span>

                          <span className="flex flex-col gap-4">
                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">VECKOPRIS MED INKL KM</h3>
                              <LabeledInput
                                name="weekIncludedKm-pricePerWeek"
                                label="Pris per vecka"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekIncludedKm?.pricePerWeek ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekIncludedKm', 'pricePerWeek', value ?? null)}
                              />
                              <LabeledInput
                                name="weekIncludedKm-includedKmPerWeek"
                                label="Inkl km/vecka"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekIncludedKm?.includedKmPerWeek ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekIncludedKm', 'includedKmPerWeek', value ?? null)}
                              />
                              <LabeledInput
                                name="weekIncludedKm-pricePerExtraDay"
                                label="Pris per extra dag"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekIncludedKm?.pricePerExtraDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekIncludedKm', 'pricePerExtraDay', value ?? null)}
                              />
                              <LabeledInput
                                name="weekIncludedKm-includedKmPerExtraDay"
                                label="Inkl km/extra dag"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekIncludedKm?.includedKmPerExtraDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekIncludedKm', 'includedKmPerExtraDay', value ?? null)}
                              />
                              <LabeledInput
                                name="weekIncludedKm-pricePerExcessKm"
                                label="Pris över-km"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekIncludedKm?.pricePerExcessKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekIncludedKm', 'pricePerExcessKm', value ?? null)}
                              />
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">VECKOPRIS FRIA KM</h3>
                              <LabeledInput
                                name="weekFreeKm-pricePerWeek"
                                label="Pris per vecka"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekFreeKm?.pricePerWeek ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekFreeKm', 'pricePerWeek', value ?? null)}
                              />
                              <LabeledInput
                                name="weekFreeKm-pricePerExtraDay"
                                label="Pris per extra dag"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekFreeKm?.pricePerExtraDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekFreeKm', 'pricePerExtraDay', value ?? null)}
                              />
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">30 DAGAR MED INKL KM</h3>
                              <LabeledInput
                                name="thirtyDayIncludedKm-pricePer30Days"
                                label="Pris per 30 dagar"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.thirtyDayIncludedKm?.pricePer30Days ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('thirtyDayIncludedKm', 'pricePer30Days', value ?? null)}
                              />
                              <LabeledInput
                                name="thirtyDayIncludedKm-includedKmPer30Days"
                                label="Inkl km/30 dagar"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.thirtyDayIncludedKm?.includedKmPer30Days ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('thirtyDayIncludedKm', 'includedKmPer30Days', value ?? null)}
                              />
                              <LabeledInput
                                name="thirtyDayIncludedKm-pricePerExtraDay"
                                label="Pris per extra dag"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.thirtyDayIncludedKm?.pricePerExtraDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('thirtyDayIncludedKm', 'pricePerExtraDay', value ?? null)}
                              />
                              <LabeledInput
                                name="thirtyDayIncludedKm-includedKmPerExtraDay"
                                label="Inkl km/extra dag"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.thirtyDayIncludedKm?.includedKmPerExtraDay ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('thirtyDayIncludedKm', 'includedKmPerExtraDay', value ?? null)}
                              />
                              <LabeledInput
                                name="thirtyDayIncludedKm-pricePerExcessKm"
                                label="Pris över-km"
                                labelWidth="w-26"
                                inputWidth="w-full"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.thirtyDayIncludedKm?.pricePerExcessKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('thirtyDayIncludedKm', 'pricePerExcessKm', value ?? null)}
                              />
                            </div>
                          </span>

                          <span className="flex flex-col gap-4">
                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">HELGPRIS</h3>
                              <div className="flex flex-row items-center gap-2">
                                <LabeledSelect
                                  name="weekend-fromDayOfWeek"
                                  label="Från dag/tid"
                                  labelWidth="w-22"
                                  margintop="0"
                                  placeholder="Välj"
                                  value={categoryPricing?.weekend?.fromDayOfWeek == null ? '' : String(categoryPricing.weekend.fromDayOfWeek)}
                                  items={DAY_OF_WEEK_SELECT_ITEMS}
                                  onChange={(value) => handleCategoryPricingChange('weekend', 'fromDayOfWeek', value === '' ? null : Number(value))}
                                />
                                <TimeDropdownInput
                                  value={categoryPricing?.weekend?.fromTime ?? ''}
                                  onChange={(value) => handleCategoryPricingChange('weekend', 'fromTime', value ?? '')}
                                  disabled={false}
                                />
                              </div>
                              <div className="flex flex-row items-center gap-2">
                                <LabeledSelect
                                  name="weekend-toDayOfWeek"
                                  label="Till dag/tid"
                                  labelWidth="w-22"
                                  margintop="0"
                                  placeholder="Välj"
                                  value={categoryPricing?.weekend?.toDayOfWeek == null ? '' : String(categoryPricing.weekend.toDayOfWeek)}
                                  items={DAY_OF_WEEK_SELECT_ITEMS}
                                  onChange={(value) => handleCategoryPricingChange('weekend', 'toDayOfWeek', value === '' ? null : Number(value))}
                                />
                                <TimeDropdownInput
                                  label="Till tid"
                                  labelWidth="w-32"
                                  margintop="0"
                                  value={categoryPricing?.weekend?.toTime ?? ''}
                                  disabled={false}
                                  onChange={(value) => handleCategoryPricingChange('weekend', 'toTime', value ?? '')}
                                />
                              </div>
                              <LabeledInput
                                name="weekend-weekendPrice"
                                label="Helgpris"
                                labelWidth="w-22"
                                inputWidth="w-22"
                                margintop="2"
                                type="number"
                                value={categoryPricing?.weekend?.weekendPrice ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekend', 'weekendPrice', value ?? null)}
                              />
                              <LabeledInput
                                name="weekend-pricePerKm"
                                label="Pris per km"
                                labelWidth="w-22"
                                inputWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekend?.pricePerKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekend', 'pricePerKm', value ?? null)}
                              />                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">HELGPRIS INKL KM</h3>
                              <div className="flex flex-row items-center gap-2">
                                <LabeledSelect
                                  name="weekendIncludedKm-fromDayOfWeek"
                                  label="Från dag/tid"
                                  labelWidth="w-22"
                                  margintop="0"
                                  placeholder="Välj"
                                  value={categoryPricing?.weekendIncludedKm?.fromDayOfWeek == null ? '' : String(categoryPricing.weekendIncludedKm.fromDayOfWeek)}
                                  items={DAY_OF_WEEK_SELECT_ITEMS}
                                  onChange={(value) => handleCategoryPricingChange('weekendIncludedKm', 'fromDayOfWeek', value === '' ? null : Number(value))}
                                />
                                <TimeDropdownInput
                                  value={categoryPricing?.weekendIncludedKm?.fromTime ?? ''}
                                  onChange={(value) => handleCategoryPricingChange('weekendIncludedKm', 'fromTime', value ?? '')}
                                  disabled={false}
                                />
                              </div>
                              <div className="flex flex-row items-center gap-2">
                                <LabeledSelect
                                  name="weekendIncludedKm-toDayOfWeek"
                                  label="Till dag/tid"
                                  labelWidth="w-22"
                                  margintop="0"
                                  placeholder="Välj"
                                  value={categoryPricing?.weekendIncludedKm?.toDayOfWeek == null ? '' : String(categoryPricing.weekendIncludedKm.toDayOfWeek)}
                                  items={DAY_OF_WEEK_SELECT_ITEMS}
                                  onChange={(value) => handleCategoryPricingChange('weekendIncludedKm', 'toDayOfWeek', value === '' ? null : Number(value))}
                                />
                                <TimeDropdownInput
                                  label="Till tid"
                                  labelWidth="w-22"
                                  inputWidth="w-full"
                                  margintop="0"
                                  value={categoryPricing?.weekend?.toTime ?? ''}
                                  disabled={false}
                                  onChange={(value) => handleCategoryPricingChange('weekend', 'toTime', value ?? '')}
                                />
                              </div>
                              <LabeledInput
                                name="weekendIncludedKm-weekendPrice"
                                label="Helgpris"
                                labelWidth="w-22"
                                inputWidth="w-22"
                                margintop="2"
                                type="number"
                                value={categoryPricing?.weekendIncludedKm?.weekendPrice ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekendIncludedKm', 'weekendPrice', value ?? null)}
                              />
                              <LabeledInput
                                name="weekendIncludedKm-includedKm"
                                label="Inkl km"
                                labelWidth="w-22"
                                inputWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekendIncludedKm?.includedKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekendIncludedKm', 'includedKm', value ?? null)}
                              />
                              <LabeledInput
                                name="weekendIncludedKm-pricePerExcessKm"
                                label="Pris över-km"
                                labelWidth="w-22"
                                inputWidth="w-22"
                                margintop="0"
                                type="number"
                                value={categoryPricing?.weekendIncludedKm?.pricePerExcessKm ?? null}
                                disabled={false}
                                onChange={(value) => handleCategoryPricingChange('weekendIncludedKm', 'pricePerExcessKm', value ?? null)}
                              />

                            </div>

                            <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
                              <h3 className="mb-1 text-tiny font-semibold tracking-[0.10em] text-stone-600">HELGPRIS FRIA KM</h3>
                              <div className="flex flex-row items-center gap-2">
                                <LabeledSelect
                                  name="weekendFreeKm-fromDayOfWeek"
                                  label="Från dag/tid"
                                  labelWidth="w-22"
                                  margintop="0"
                                  placeholder="Välj"
                                  value={categoryPricing?.weekendFreeKm?.fromDayOfWeek == null ? '' : String(categoryPricing.weekendFreeKm.fromDayOfWeek)}
                                  items={DAY_OF_WEEK_SELECT_ITEMS}
                                  onChange={(value) => handleCategoryPricingChange('weekendFreeKm', 'fromDayOfWeek', value === '' ? null : Number(value))}
                                />
                                <TimeDropdownInput
                                  value={categoryPricing?.weekendFreeKm?.fromTime ?? ''}
                                  onChange={(value) => handleCategoryPricingChange('weekendFreeKm', 'fromTime', value ?? '')}
                                  disabled={false}
                                />
                              </div>
                              <div className="flex flex-row items-center gap-2">
                                <LabeledSelect
                                  name="weekendFreeKm-toDayOfWeek"
                                  label="Till dag/tid"
                                  labelWidth="w-22"
                                  margintop="0"
                                  placeholder="Välj"
                                  value={categoryPricing?.weekendFreeKm?.toDayOfWeek == null ? '' : String(categoryPricing.weekendFreeKm.toDayOfWeek)}
                                  items={DAY_OF_WEEK_SELECT_ITEMS}
                                  onChange={(value) => handleCategoryPricingChange('weekendFreeKm', 'toDayOfWeek', value === '' ? null : Number(value))}
                                />
                                <TimeDropdownInput
                                  value={categoryPricing?.weekendFreeKm?.toTime ?? ''}
                                  onChange={(value) => handleCategoryPricingChange('weekendFreeKm', 'toTime', value ?? '')}
                                  disabled={false}
                                />
                              </div>
                                <LabeledInput
                                  name="weekendFreeKm-weekendPrice"
                                  label="Helgpris"
                                  labelWidth="w-22"
                                  inputWidth="w-22"
                                  margintop="2"
                                  type="number"
                                  value={categoryPricing?.weekendFreeKm?.weekendPrice ?? null}
                                  disabled={false}
                                  onChange={(value) => handleCategoryPricingChange('weekendFreeKm', 'weekendPrice', value ?? null)}
                                />
                            </div>
                          </span>
                        </div>

                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}
          </section>
        </div>
      </div>

      {showPriceListModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-md border border-gray-200 bg-[#fffde7] shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Hantera prislistor</h3>
                <p className="text-xs text-gray-600">Visa, lägga till, redigera eller ta bort prislistor.</p>
              </div>
              <button
                type="button"
                onClick={closePriceListModal}
                className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-md border border-gray-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-700">Prislistor</h4>
                  <button
                    type="button"
                    onClick={() => setPriceListForm(createEmptyPriceListDraft())}
                    className="flex items-center gap-1 rounded-full border border-lime-600 px-2.5 py-1 text-xs font-medium text-lime-700 transition hover:bg-lime-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ny
                  </button>
                </div>

                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {priceListDrafts.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
                      Inga prislistor har lagts till ännu.
                    </div>
                  ) : (
                    priceListDrafts.map((entry) => (
                      <div key={entry.id ?? `${entry.name}-${Math.random()}`} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleEditPriceList(entry)}
                          className="flex-1 text-left text-xs text-gray-700 hover:text-gray-900"
                        >
                          {entry.name || '-'}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditPriceList(entry)}
                            className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            aria-label={`Redigera ${entry.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePriceList(entry.id)}
                            className="rounded-full p-1 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                            aria-label={`Ta bort ${entry.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-md border border-gray-200 bg-white p-3">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-gray-700">
                  {priceListForm.id ? 'Redigera prislista' : 'Ny prislista'}
                </h4>
                <label className="block text-xs font-medium text-gray-700" htmlFor="priceListName">
                  Prislistans namn
                </label>
                <input
                  id="priceListName"
                  value={priceListForm.name}
                  onChange={(event) => handlePriceListFormChange(event.target.value)}
                  disabled={isSavingPriceLists}
                  className="mt-2 h-8 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-lime-600"
                  placeholder="Skriv namn"
                />
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSavePriceListDraft}
                    disabled={isSavingPriceLists}
                    className="rounded-md bg-lime-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-lime-700"
                  >
                    {priceListForm.id ? 'Spara ändring' : 'Lägg till'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceListForm(createEmptyPriceListDraft())}
                    disabled={isSavingPriceLists}
                    className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Rensa
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                onClick={closePriceListModal}
                disabled={isSavingPriceLists}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleApplyPriceListChanges}
                disabled={isSavingPriceLists}
                className="rounded-md bg-lime-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-lime-700"
              >
                {isSavingPriceLists ? 'Sparar...' : 'Spara ändringar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showUnsavedChangesModal}
        onClose={handleStayOnPage}
        onConfirm={handleDiscardChanges}
        title="OSPARADE ÄNDRINGAR"
        message="Du har osparade ändringar. Vill du fortsätta utan att spara?"
        confirmText="Fortsätt"
        cancelText="Stanna kvar"
      />
    </div>
  )
}
