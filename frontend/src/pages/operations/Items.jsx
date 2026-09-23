import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftCircle, ArrowRightCircle, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import ActiveInactiveSwitch from '../../components/ActiveInactiveSwitch'
import SegmentedFilter from '../../components/SegmentedFilter'
import { getSharedRequest } from '../../lib/sharedRequest'
import { updateItemType } from '../../lib/itemApi'
import { getItemTypeOptions, searchItems } from '../../lib/itemSearchApi'

const PAGE_SIZE = 100
const ITEM_SEARCH_CACHE_KEY = 'operations-item-search-page-state'
const SHARED_ITEM_TYPES_KEY = 'operations-item-types'

const columns = [
  { key: 'itemNr', label: 'Namn', align: 'left', width: 'w-[220px]', sortable: true, sortField: 'itemnr' },
  { key: 'machineNr', label: 'Nr', align: 'left', width: 'w-[120px]', sortable: true, sortField: 'machinenr' },
  { key: 'itemCategoryName', label: 'Kategori', align: 'left', width: 'w-[10%]', sortable: true, sortField: 'itemcategoryname' },
  { key: 'itemModelName', label: 'Modell', align: 'left', width: 'w-[10%]', sortable: true, sortField: 'itemmodelname' },
  { key: 'manufacturer', label: 'Fabrikat', align: 'left', width: 'w-[10%]', sortable: true, sortField: 'manufacturer' },
  { key: 'itemTypeName', label: 'Objekttyp', align: 'left', width: 'w-[80px]', sortable: true, sortField: 'itemtypename' },
  { key: 'regNr', label: 'Regnr', align: 'left', width: 'w-80px]', sortable: true, sortField: 'regnr' },
  { key: 'isActive', label: 'Aktiv', align: 'center', width: 'w-[80px]', sortable: true, sortField: 'isactive' },
  { key: 'note', label: 'Notering', align: 'left', width: 'w-[24%]', sortable: true, sortField: 'note' },
]

function readCachedSearchState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(ITEM_SEARCH_CACHE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getSorts(sortConfig) {
  const column = columns.find((entry) => entry.key === sortConfig.key)

  if (!column?.sortField) {
    return [
      { field: 'id', direction: 'desc' },
    ]
  }

  return [
    { field: column.sortField, direction: sortConfig.direction },
    { field: 'id', direction: 'desc' },
  ]
}

export default function Items() {
  const navigate = useNavigate()
  const cachedState = readCachedSearchState()
  const skeletonTimerRef = useRef(null)
  const requestSequenceRef = useRef(0)
  const didMountRef = useRef(false)
  const hadCachedSnapshotRef = useRef(Boolean(cachedState?.searchLoaded))

  const [rows, setRows] = useState(cachedState?.rows ?? [])
  const [loading, setLoading] = useState(!cachedState?.searchLoaded)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [error, setError] = useState('')
  const [itemTypeError, setItemTypeError] = useState('')
  const [itemTypeOptions, setItemTypeOptions] = useState([])
  const [hasSearchSnapshot, setHasSearchSnapshot] = useState(Boolean(cachedState?.searchLoaded))
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(Boolean(cachedState?.searchLoaded))
  const [showItemTypeModal, setShowItemTypeModal] = useState(false)
  const [pendingItem, setPendingItem] = useState(null)
  const [savingItemType, setSavingItemType] = useState(false)

  const [filters, setFilters] = useState({
    freeText: cachedState?.filters?.freeText ?? '',
    itemTypeCode: cachedState?.filters?.itemTypeCode ?? '',
    activity: cachedState?.filters?.activity === 'inactive' ? 'includeInactive' : (cachedState?.filters?.activity ?? 'active'),
  })

  const [pagination, setPagination] = useState({
    pageNumber: cachedState?.pagination?.pageNumber ?? 1,
    pageSize: cachedState?.pagination?.pageSize ?? PAGE_SIZE,
    totalCount: cachedState?.pagination?.totalCount ?? 0,
    totalPages: cachedState?.pagination?.totalPages ?? 0,
    hasPreviousPage: Boolean(cachedState?.pagination?.hasPreviousPage),
    hasNextPage: Boolean(cachedState?.pagination?.hasNextPage),
  })

  const [sortConfig, setSortConfig] = useState({
    key: cachedState?.sortConfig?.key ?? 'id',
    direction: cachedState?.sortConfig?.direction ?? 'desc',
  })
  const [selectedRowId, setSelectedRowId] = useState(cachedState?.selectedRowId ?? null)

  const segmentedOptions = useMemo(() => {
    const dynamicOptions = itemTypeOptions
      .filter((option) => option.code)
      .map((option) => ({
        value: option.code,
        label: option.name || option.code,
      }))

    return [{ value: '', label: 'Alla' }, ...dynamicOptions]
  }, [itemTypeOptions])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.setItem(
      ITEM_SEARCH_CACHE_KEY,
      JSON.stringify({
        rows,
        filters,
        pagination,
        sortConfig,
        selectedRowId,
        searchLoaded: hasSearchSnapshot,
      })
    )
  }, [rows, filters, pagination, sortConfig, selectedRowId, hasSearchSnapshot])

  useEffect(() => {
    let isActive = true

    getSharedRequest(SHARED_ITEM_TYPES_KEY, () => getItemTypeOptions())
      .then((options) => {
        if (!isActive) {
          return
        }

        setItemTypeOptions(options)
        setItemTypeError('')
      })
      .catch((requestError) => {
        if (!isActive) {
          return
        }

        setItemTypeOptions([])
        setItemTypeError(requestError?.message || 'Kunde inte hämta objekttyper.')
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isDisposed = false

    const timer = setTimeout(async () => {
      const requestId = ++requestSequenceRef.current
      const isWarmStartRefresh = !didMountRef.current && hadCachedSnapshotRef.current

      if (!isWarmStartRefresh) {
        setLoading(true)
      }

      setShowSkeleton(false)
      setError('')
      clearTimeout(skeletonTimerRef.current)

      if (!isWarmStartRefresh) {
        skeletonTimerRef.current = setTimeout(() => setShowSkeleton(true), 180)
      }

      try {
        const query = filters.freeText.trim()
        const freeTextConditions = query ? [{ field: 'freetext', operator: 'contains', value: query }] : []
        const itemTypeConditions = filters.itemTypeCode
          ? [{ field: 'itemtypecode', operator: 'eq', value: filters.itemTypeCode }]
          : []
        const activityCondition = filters.activity === 'active'
          ? [{ field: 'isactive', operator: 'eq', value: true }]
          : []
        const conditions = [...freeTextConditions, ...itemTypeConditions, ...activityCondition]

        const data = await searchItems({
          conditions,
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          sorts: getSorts(sortConfig),
        })

        if (isDisposed || requestId !== requestSequenceRef.current) {
          return
        }

        const incomingRows = data?.items ?? []
        setRows(incomingRows)
        setSelectedRowId((prev) => (incomingRows.some((row) => row.id === prev) ? prev : null))

        setPagination((prev) => ({
          ...prev,
          pageNumber: data?.pageNumber ?? prev.pageNumber,
          pageSize: data?.pageSize ?? prev.pageSize,
          totalCount: data?.totalCount ?? 0,
          totalPages: data?.totalPages ?? 0,
          hasPreviousPage: Boolean(data?.hasPreviousPage),
          hasNextPage: Boolean(data?.hasNextPage),
        }))
      } catch (requestError) {
        if (isDisposed || requestId !== requestSequenceRef.current) {
          return
        }

        setRows([])
        setError(requestError?.message || 'Kunde inte hämta objekt.')
        setPagination((prev) => ({
          ...prev,
          totalCount: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        }))
      } finally {
        if (!isDisposed && requestId === requestSequenceRef.current) {
          clearTimeout(skeletonTimerRef.current)
          setShowSkeleton(false)

          if (!isWarmStartRefresh) {
            setLoading(false)
          }

          setHasSearchSnapshot(true)

          if (!didMountRef.current) {
            didMountRef.current = true
            setInitialLoadCompleted(true)
          }
        }
      }
    }, didMountRef.current ? 250 : 0)

    return () => {
      isDisposed = true
      clearTimeout(timer)
      clearTimeout(skeletonTimerRef.current)
    }
  }, [filters, pagination.pageNumber, pagination.pageSize, sortConfig])

  function onPageChange(nextPage) {
    if (nextPage < 1 || (pagination.totalPages > 0 && nextPage > pagination.totalPages)) {
      return
    }

    setPagination((prev) => ({ ...prev, pageNumber: nextPage }))
  }

  function handleFilterChange(freeText) {
    setFilters((prev) => ({ ...prev, freeText }))
    setPagination((prev) => ({ ...prev, pageNumber: 1 }))
  }

  function handleItemTypeChange(itemTypeCode) {
    setFilters((prev) => ({ ...prev, itemTypeCode }))
    setPagination((prev) => ({ ...prev, pageNumber: 1 }))
  }

  function handleActivityChange(activity) {
    setFilters((prev) => ({ ...prev, activity }))
    setPagination((prev) => ({ ...prev, pageNumber: 1 }))
  }

  function handleSort(key) {
    const column = columns.find((entry) => entry.key === key)
    if (!column?.sortable) {
      return
    }

    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))

    setPagination((prev) => ({ ...prev, pageNumber: 1 }))
  }

  function renderSortIcon(column) {
    if (!column.sortable) {
      return null
    }

    if (sortConfig.key !== column.key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
    }

    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
    }

    return <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
  }

  function handleNewItem() {
    setError('')
    openItemTypeModal(null)
  }

  function toggleRowSelection(rowId) {
    setSelectedRowId((prev) => (prev === rowId ? null : rowId))
  }

  function openItemTypeModal(row) {
    setPendingItem(row)
    setShowItemTypeModal(true)
  }

  function closeItemTypeModal({ force = false } = {}) {
    if (savingItemType && !force) {
      return
    }

    setShowItemTypeModal(false)
    setPendingItem(null)
  }

  function handleItemLinkClick(event, row) {
    event.stopPropagation()

    if ((row.itemTypeCode ?? '').trim()) {
      return
    }

    event.preventDefault()
    openItemTypeModal(row)
  }

  async function handleItemTypeClick(itemTypeCode) {
    if (!itemTypeCode) {
      return
    }

    if (!pendingItem?.id) {
      navigate('/item/new', {
        state: {
          originModule: 'operations',
          initialItemTypeCode: itemTypeCode,
        },
      })
      closeItemTypeModal({ force: true })
      return
    }

    try {
      setSavingItemType(true)
      setError('')

      await updateItemType(pendingItem.id, itemTypeCode)

      const option = itemTypeOptions.find((entry) => entry.code === itemTypeCode)
      setRows((prev) => prev.map((row) => (
        row.id === pendingItem.id
          ? { ...row, itemTypeCode: itemTypeCode, itemTypeName: option?.name ?? row.itemTypeName }
          : row
      )))

      navigate(`/item/${pendingItem.id}`, { state: { originModule: 'operations' } })
      closeItemTypeModal({ force: true })
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte spara objekttyp.')
    } finally {
      setSavingItemType(false)
    }
  }

  return (
    <div className="flex h-full flex-col px-0 py-2 md:px-[clamp(8px,10vw,20vw)]">
      <div className={`mt-3 mx-8 flex flex-wrap items-center gap-5 ${loading && !hasSearchSnapshot ? 'pointer-events-none opacity-70' : ''}`}>

        <div className="w-[220px]">
          <input
            value={filters.freeText}
            onChange={(event) => handleFilterChange(event.target.value)}
            placeholder="Sök"
            className="h-7 w-full rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
          />
        </div>

        <SegmentedFilter
          value={filters.itemTypeCode}
          onChange={handleItemTypeChange}
          options={segmentedOptions}
          theme="green"
        />

        <ActiveInactiveSwitch
          name="item-overview-include-inactive"
          value={filters.activity}
          onChange={handleActivityChange}
        />

        <div className="ml-auto mr-auto flex shrink-0 items-center gap-8 leading-none text-slate-700 whitespace-nowrap">
          <button
            type="button"
            onClick={handleNewItem}
            className="h-7 rounded-full bg-lime-100 border border-lime-600 px-4 text-xs font-medium text-gray-700 transition hover:border-lime-700"
          >
            Nytt objekt
          </button>
        </div>

        <div className="mr-4 flex justify-end items-center" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
          {initialLoadCompleted && (
            <div className="text-xs text-gray-500">
              Objekt: <strong>{pagination.totalCount}</strong>
            </div>
          )}

          {initialLoadCompleted && (
            <div className="ml-6 flex items-center">
              <span className="mr-3 text-xs text-gray-700">
                Sida {pagination.pageNumber} av {Math.max(1, pagination.totalPages || 1)}
              </span>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onPageChange(pagination.pageNumber - 1)}
                  disabled={loading || !pagination.hasPreviousPage}
                  className="disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeftCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(pagination.pageNumber + 1)}
                  disabled={loading || !pagination.hasNextPage}
                  className="disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowRightCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {itemTypeError && (
        <div className="mx-8 mt-3 w-fit rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          {itemTypeError}
        </div>
      )}

      {error && (
        <div className="mx-8 mt-3 w-fit rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {showItemTypeModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={closeItemTypeModal} />
          <div className="relative z-10 flex min-h-screen items-start justify-center pt-24">
            <div className="w-full max-w-sm rounded-sm bg-[rgb(255,255,234)] py-6 px-12 shadow-xl" onClick={(event) => event.stopPropagation()}>
              <h2 className="mb-3 text-xs text-center font-semibold text-gray-800">Välj objekttyp</h2>
              {pendingItem?.id ? (
                <>
                  <p className="mt-2 text-xs text-gray-700 text-center">
                    Objektet saknar objekttyp.
                  </p>
                  <p className="mb-4 text-xs text-gray-700 text-center">
                    Välj objekttyp för att fortsätta till objektkortet.
                  </p>
                </>
              ) : (
                <p className="mb-4 mt-2 text-xs text-gray-700 text-center">
                  Välj objekttyp för det nya objektet.
                </p>
              )}

              <div className="mb-5 max-h-72 overflow-y-auto rounded-sm border border-lime-600 bg-white">
                {itemTypeOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">Inga objekttyper hittades.</div>
                ) : (
                  itemTypeOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handleItemTypeClick(option.code)}
                      className="block w-full border-b border-lime-100 px-3 py-3 text-center text-xs text-gray-700 hover:bg-lime-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingItemType}
                    >
                      {option.name}
                    </button>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-3 mt-2 mb-2">
                <button
                  type="button"
                  onClick={closeItemTypeModal}
                  className="bg-orange-400 px-6 py-1 text-xs text-white hover:bg-orange-600"
                  disabled={savingItemType}
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-8 border-t border-gray-300 rounded-sm py-1 mt-4 h-full overflow-y-auto">
        <table className="table-fixed min-w-[1280px] w-full border-collapse text-xs" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.width || ''} whitespace-nowrap px-2 pt-1 pb-2 text-tiny font-medium text-gray-400 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className={`inline-flex items-center gap-1 hover:text-gray-600 ${column.align === 'right' ? 'ml-auto' : ''}`}
                    >
                      <span>{column.label}</span>
                      {renderSortIcon(column)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className={`divide-y divide-gray-100 ${!loading && rows.length > 0 ? 'bg-white' : 'bg-transparent'}`}>
            {showSkeleton ? (
              Array.from({ length: 12 }).map((_, index) => (
                <tr key={`item-skeleton-${index}`} className="border-b border-gray-100">
                  {columns.map((column) => (
                    <td key={`item-skeleton-cell-${column.key}`} className="px-2 py-1">
                      <Skeleton height={14} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 && !loading && initialLoadCompleted ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-xs text-gray-400">
                  Inga objekt hittades för valt urval
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = selectedRowId === row.id
                const isPartOfPackage = Boolean(row.isPartOfPackage ?? row.IsPartOfPackage)

                return (
                <tr
                  key={row.id}
                  className={selected ? 'bg-lime-100 hover:bg-lime-100' : 'bg-transparent hover:bg-lime-50'}
                  onClick={() => toggleRowSelection(row.id)}
                >
                  <td className="px-2 pb-[2px] pt-[3px] text-xs text-gray-800">
                    <div className="flex items-center gap-2">
                      {isPartOfPackage && (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.25 text-[9px] font-medium tracking-[0.03em] text-amber-700">
                          Del i paket
                        </span>
                      )}
                      <Link
                        to={`/item/${row.id}`}
                        state={{ originModule: 'operations' }}
                        className="text-sky-700 decoration-sky-300 underline-offset-2 hover:text-sky-800 hover:underline"
                        onClick={(event) => handleItemLinkClick(event, row)}
                      >
                        {row.itemNr ?? ''}
                      </Link>
                    </div>
                  </td>
                  <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.machineNr ?? ''}</td>
                  <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.itemCategoryName ?? ''}</td>
                  <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.itemModelName ?? ''}</td>
                  <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.manufacturer ?? ''}</td>
                  <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.itemTypeName || row.itemTypeCode || ''}</td>
                  <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.regNr ?? ''}</td>
                  <td className="px-2 pb-[2px] pt-[3px] text-xs text-gray-800 text-center">
                    {!row.isActive && (
                      <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.25 text-[9px] font-medium uppercase tracking-[0.03em] text-rose-700">
                        Inaktiv
                      </span>
                    )}
                  </td>
                  <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                    <div className="relative group">
                      <div className="truncate">{row.note || ''}</div>
                      {row.note && (
                        <div className="absolute left-0 top-full mt-1 z-50 hidden w-[min(40rem,60vw)] max-w-[60vw] border bg-gray-50 px-5 py-3 text-xs text-gray-700 shadow-md group-hover:block break-words">
                          {row.note}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
