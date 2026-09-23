import { useEffect, useRef, useState } from 'react'
import { ArrowLeftCircle, ArrowRightCircle, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import DateRangePicker from '../../components/DaterangePicker'
import SegmentedFilter from '../../components/SegmentedFilter'
import { searchToBeInvoiced } from '../../lib/toBeInvoicedApi'
import { getReservationStatusLabel, getReservationStatusPillClass } from '../../lib/reservationStatus'

const PAGE_SIZE = 50
const TOBEINVOICED_CACHE_KEY = 'finance-tobeinvoiced-page-state'

const INVOICE_MODES = [
  { value: 'RETURNED', label: 'Återlämnade bokningar' },
  { value: 'PERIOD', label: 'Periodfaktura' },
]

const PAYER_LABELS = {
  CUSTOMER: 'Kund',
  INSURANCECOMPANY: 'Försäkring',
  INTERNAL: 'Intern',
}

const PAYER_PILL_CLASSES = {
  CUSTOMER: 'bg-sky-50 border border-sky-200 text-sky-800',
  INSURANCECOMPANY: 'bg-violet-50 border border-violet-200 text-violet-800',
  INTERNAL: 'bg-gray-100 border border-gray-200 text-gray-700',
}

const columns = [
  { key: 'reservationNr', label: 'Nr', align: 'left', width: 'w-[50px]', sortable: true, sortField: 'reservationnr' },
  { key: 'customerName', label: 'Kund', align: 'left', width: 'w-[18%]', sortable: true, sortField: 'customername' },
  { key: 'startDate', label: 'Från', align: 'left', width: 'w-[120px]', sortable: true, sortField: 'startdate' },
  { key: 'endDate', label: 'Till', align: 'left', width: 'w-[120px]', sortable: true, sortField: 'enddate' },
  { key: 'statusCode', label: 'Status', align: 'left', width: 'w-[100px]', sortable: true, sortField: 'statuscode' },
  { key: 'payers', label: 'Betalare', align: 'left', width: 'w-[180px]', sortable: false },
  { key: 'items', label: 'Objekt', align: 'left', width: 'w-[18%]', sortable: false },
//   { key: 'officeLocation', label: 'Kontor', align: 'left', width: 'w-[120px]', sortable: true, sortField: 'officelocation' },
  { key: 'note', label: 'Notering', align: 'left', width: '', sortable: true, sortField: 'note' },
]

function readCachedState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(TOBEINVOICED_CACHE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch {
    return null
  }
}

function formatDateOnly(value) {
  if (!value) {
    return null
  }

  const parsed = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const year = parsed.getFullYear()
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  const day = `${parsed.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateOnly(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function getSorts(sortConfig) {
  const column = columns.find((entry) => entry.key === sortConfig.key)

  if (!column?.sortField) {
    return [{ field: 'id', direction: 'desc' }]
  }

  return [
    { field: column.sortField, direction: sortConfig.direction },
    { field: 'id', direction: 'desc' },
  ]
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function NoteCell({ note }) {
  const textRef = useRef(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = textRef.current
    if (!element) {
      return
    }

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }

    checkTruncation()

    const resizeObserver = new ResizeObserver(checkTruncation)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [note])

  if (!note) {
    return <div ref={textRef} className="truncate" />
  }

  return (
    <div className="relative group">
      <div ref={textRef} className="truncate">{note}</div>
      {isTruncated && (
        <div className="absolute right-0 top-full mt-1 z-50 hidden w-80 max-w-[24rem] border bg-gray-50 px-5 py-3 text-xs text-gray-700 shadow-md group-hover:block break-words">
          {note}
        </div>
      )}
    </div>
  )
}

export default function ToBeInvoiced() {
  const cachedState = readCachedState()
  const skeletonTimerRef = useRef(null)
  const requestSequenceRef = useRef(0)
  const didMountRef = useRef(false)
  const hadCachedSnapshotRef = useRef(Boolean(cachedState?.searchLoaded))

  const [rows, setRows] = useState(cachedState?.rows ?? [])
  const [loading, setLoading] = useState(!cachedState?.searchLoaded)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [error, setError] = useState('')
  const [hasSearchSnapshot, setHasSearchSnapshot] = useState(Boolean(cachedState?.searchLoaded))
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(Boolean(cachedState?.searchLoaded))

  const [filters, setFilters] = useState({
    freeText: cachedState?.filters?.freeText ?? '',
    mode: cachedState?.filters?.mode ?? 'RETURNED',
    periodStart: cachedState?.filters?.periodStart ?? null,
    periodEnd: cachedState?.filters?.periodEnd ?? null,
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.setItem(
      TOBEINVOICED_CACHE_KEY,
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
        const periodCondition = filters.periodStart || filters.periodEnd
          ? [{ field: 'itemperiod', operator: 'overlaps', value: { from: filters.periodStart, to: filters.periodEnd } }]
          : []
        const conditions = [...freeTextConditions, ...periodCondition]

        const data = await searchToBeInvoiced({
          mode: filters.mode,
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
        setSelectedRowId(null)
        setError(requestError?.message || 'Kunde inte hämta bokningar.')
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

  function handleModeChange(mode) {
    setFilters((prev) => ({ ...prev, mode }))
    setPagination((prev) => ({ ...prev, pageNumber: 1 }))
  }

  function handlePeriodApply({ startDate, endDate }) {
    setFilters((prev) => ({
      ...prev,
      periodStart: formatDateOnly(startDate),
      periodEnd: formatDateOnly(endDate),
    }))
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

  function toggleRow(rowId) {
    setSelectedRowId((prev) => (prev === rowId ? null : rowId))
  }

  return (
    <div className="flex h-full flex-col px-0 py-2 md:px-[clamp(8px,10vw,20vw)]">
      <div className={`mt-3 flex flex-wrap items-center gap-5 ${loading && !hasSearchSnapshot ? 'pointer-events-none opacity-70' : ''}`}>

        <SegmentedFilter
          value={filters.mode}
          onChange={handleModeChange}
          options={INVOICE_MODES}
          theme="sky"
        />

        {/* <DateRangePicker
          presets={['this-month', 'last-month', 'last-3-months', 'last-12-months', 'last-year', 'year-to-date']}
          placeholder="Välj period"
          onApply={handlePeriodApply}
          initialStartDate={parseDateOnly(filters.periodStart)}
          initialEndDate={parseDateOnly(filters.periodEnd)}
          triggerRadius="full"
          triggerClassName="h-7 w-[260px] border-lime-600 px-3 text-xs text-gray-700 focus:border-lime-700"
          openTriggerClassName="border-lime-700 ring-1 ring-lime-200"
          closedTriggerClassName="border-lime-600 hover:border-lime-700"
          widthClassName='w-60'
        />

        <div className="w-[200px]">
          <input
            value={filters.freeText}
            onChange={(event) => handleFilterChange(event.target.value)}
            placeholder="Sök"
            className="h-7 w-full rounded-full border border-[#84cc16] bg-white pt-[1px] px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-[#65a30d]"
          />
        </div> */}

        <div className="mr-4 ml-auto flex justify-end items-center" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
          {initialLoadCompleted && (
            <div className="text-xs text-gray-500">
              Bokningar: <strong>{pagination.totalCount}</strong>
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

      {error && (
        <div className="mt-3 w-fit rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="border-t border-gray-300 rounded-sm py-1 mt-4 h-full overflow-y-auto">
        <table className="table-fixed min-w-[1250px] w-full border-collapse text-xs" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.width || ''} whitespace-nowrap px-2 pt-1.5 pb-2 text-tiny font-medium text-gray-400 tracking-wider ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
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
                <tr key={`tobeinvoiced-skeleton-${index}`} className="border-b border-gray-100">
                  {columns.map((column) => (
                    <td key={`tobeinvoiced-skeleton-cell-${column.key}`} className="px-2 py-1">
                      <Skeleton height={14} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 && !loading && initialLoadCompleted ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-xs text-gray-400">
                  Inga bokningar hittades för valt urval
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = selectedRowId === row.id
                const payers = Array.isArray(row.payers) ? row.payers : []

                return (
                  <tr
                    key={row.id}
                    className={selected ? 'bg-lime-100' : 'bg-transparent hover:bg-lime-50'}
                    onClick={() => toggleRow(row.id)}
                  >
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                      {row.id ? (
                        <Link
                          to={`/operations/reservation/${row.id}`}
                          className="text-sky-700 decoration-sky-300 underline-offset-2 hover:underline hover:text-sky-800"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.reservationNr ?? ''}
                        </Link>
                      ) : (
                        row.reservationNr ?? ''
                      )}
                    </td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.customerName ?? ''}</td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{formatDateTime(row.startDate)}</td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{formatDateTime(row.endDate)}</td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getReservationStatusPillClass(row.statusCode)}`}>
                        {getReservationStatusLabel(row.statusCode)}
                      </span>
                    </td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                      <div className="flex flex-wrap gap-1">
                        {payers.map((payer) => (
                          <span
                            key={`${row.id}-payer-${payer}`}
                            className={`inline-block px-3 py-0.5 rounded-full text-tiny font-medium tracking-[0.12em] uppercase ${PAYER_PILL_CLASSES[payer] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {PAYER_LABELS[payer] ?? payer}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.items ?? ''}</td>
                    {/* <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.officeLocation ?? ''}</td> */}
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                      <NoteCell note={row.note} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
