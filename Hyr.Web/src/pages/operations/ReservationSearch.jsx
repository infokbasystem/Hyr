import { useEffect, useRef, useState } from 'react'
import { ArrowLeftCircle, ArrowRightCircle, ChevronDown, ChevronUp, ChevronsUpDown, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import Select from 'react-select'
import DateRangePicker from '../../components/DaterangePicker'
import { searchReservations } from '../../lib/reservationSearchApi'

const PAGE_SIZE = 50
const RESERVATION_SEARCH_CACHE_KEY = 'operations-reservation-search-page-state'

const STANDARD_SEARCH_OPTIONS = [
  { value: 'last-100-created', label: 'Senast 100 skapade' },
  { value: 'active-reservations', label: 'Aktiva bokningar' },
]

const columns = [
  { key: 'reservationNr', label: 'Bokningsnr', align: 'left', width: 'w-[90px]', sortable: true, sortField: 'reservationnr' },
  { key: 'customerName', label: 'Kund', align: 'left', width: 'w-[22%]', sortable: true, sortField: 'customername' },
  { key: 'startDate', label: 'Från', align: 'left', width: 'w-[110px]', sortable: true, sortField: 'startdate' },
  { key: 'endDate', label: 'Till', align: 'left', width: 'w-[110px]', sortable: true, sortField: 'enddate' },
  { key: 'statusCode', label: 'Status', align: 'left', width: 'w-[100px]', sortable: true, sortField: 'statuscode' },
  { key: 'officeLocation', label: 'Kontor', align: 'left', width: 'w-[120px]', sortable: true, sortField: 'officelocation' },
  { key: 'note', label: 'Notering', align: 'left', width: 'w-[26%]', sortable: true, sortField: 'note' },
]

function readCachedSearchState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(RESERVATION_SEARCH_CACHE_KEY)
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

function getSorts(sortConfig, selectedPreset) {
  const column = columns.find((entry) => entry.key === sortConfig.key)

  if (selectedPreset === 'last-100-created') {
    return [
      { field: 'id', direction: 'desc' },
      { field: 'reservationnr', direction: 'desc' },
    ]
  }

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

function getPresetConditions(preset) {
  switch (preset) {
    case 'last-100-created':
      return [{ field: 'standardsearch', operator: 'eq', value: 'last-100-created' }]
    case 'active-reservations':
      return [{ field: 'standardsearch', operator: 'eq', value: 'active-reservations' }]
    default:
      return []
  }
}

function getSelectStyles() {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 28,
      height: 28,
      borderRadius: 9999,
      borderColor: state.isFocused ? '#65a30d' : '#84cc16',
      boxShadow: 'none',
      ':hover': {
        borderColor: state.isFocused ? '#65a30d' : '#84cc16',
      },
      backgroundColor: 'white',
    }),
    valueContainer: (base) => ({
      ...base,
      height: 28,
      padding: '0 12px',
      fontSize: '12px',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: 28,
    }),
    clearIndicator: (base, state) => ({
      ...base,
      padding: '0 0px 0 6px',
      color: state.isFocused ? '#d97706' : '#f59e0b',
      cursor: 'pointer',
      ':hover': {
        color: '#d97706',
      },
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: '0 8px 0 0px',
      color: state.isFocused ? '#6b7280' : '#9ca3af',
      ':hover': {
        color: '#6b7280',
      },
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: '12px',
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '12px',
      backgroundColor: state.isFocused ? '#f7fee7' : 'white',
      color: '#374151',
    }),
    singleValue: (base) => ({
      ...base,
      fontSize: '12px',
      color: '#374151',
    }),
    placeholder: (base) => ({
      ...base,
      fontSize: '12px',
      color: '#374151',
      fontWeight: 400,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 60,
    }),
  }
}

function exportRowsAsCsv(rows) {
  const header = ['Bokningsnr', 'Kund', 'Från', 'Till', 'Status', 'Kontor', 'Notering']
  const values = rows.map((row) => [
    row.reservationNr ?? '',
    row.customerName ?? '',
    row.startDate ?? '',
    row.endDate ?? '',
    row.statusCode ?? '',
    row.officeLocation ?? '',
    row.note ?? '',
  ])

  const csv = [header, ...values]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'bokningar.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function ReservationSearch() {
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
  const [hasSearchSnapshot, setHasSearchSnapshot] = useState(Boolean(cachedState?.searchLoaded))
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(Boolean(cachedState?.searchLoaded))

  const [filters, setFilters] = useState({
    freeText: cachedState?.filters?.freeText ?? '',
    preset: cachedState?.filters?.preset ?? '',
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
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.setItem(
      RESERVATION_SEARCH_CACHE_KEY,
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
        const conditions = [...freeTextConditions, ...getPresetConditions(filters.preset), ...periodCondition]

        const data = await searchReservations({
          conditions,
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          sorts: getSorts(sortConfig, filters.preset),
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

  function handlePresetChange(selectedOption) {
    setFilters((prev) => ({ ...prev, preset: selectedOption?.value ?? '' }))
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

  function handleNewReservation() {
    navigate('/operations/reservation/new')
  }

  function handlePrintSelected() {
    if (!selectedRow) {
      return
    }

    window.print()
  }

  function handleExportExcel() {
    if (!selectedRow) {
      return
    }

    exportRowsAsCsv([selectedRow])
  }

  return (
    <div className="flex flex-col h-full py-2">
      <div className='ml-10 text-sm text-gray-500'>Sök bokningar</div>
      <div className={`mt-3 mx-8 flex flex-wrap items-center gap-5 ${loading && !hasSearchSnapshot ? 'pointer-events-none opacity-70' : ''}`}>

        <DateRangePicker
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

        <div className="w-[220px]">
          <Select
            value={STANDARD_SEARCH_OPTIONS.find((option) => option.value === filters.preset) ?? null}
            onChange={handlePresetChange}
            options={STANDARD_SEARCH_OPTIONS}
            isSearchable={false}
            isClearable
            placeholder="Standardurval"
            styles={getSelectStyles()}
          />
        </div>

        <div className="w-[200px]">
          <input
            value={filters.freeText}
            onChange={(event) => handleFilterChange(event.target.value)}
            placeholder="Sök"
            className="h-7 w-full rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
          />
        </div>

        <div className="ml-auto mr-auto flex shrink-0 items-center gap-8 leading-none text-slate-700 whitespace-nowrap">
          <button
            type="button"
            onClick={handleNewReservation}
            className="h-7 rounded-full bg-lime-100 border border-lime-600 px-4 text-xs font-medium text-gray-700 transition hover:border-lime-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ny bokning
          </button>
          {/* <button
            type="button"
            onClick={handlePrintSelected}
            disabled={!selectedRow}
            className="inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 text-stone-500">
              <Printer className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-[0.01em] text-slate-700">Skriv ut valda</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!selectedRow}
            className="text-xs uppercase tracking-[0.01em] text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Excel
          </button> */}
        </div>

        <div className="mr-4 flex justify-end items-center" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
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
        <div className="mx-8 mt-3 w-fit rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mx-8 border-t border-gray-300 rounded-sm py-1 mt-4 h-full overflow-y-auto">
        <table className="table-fixed min-w-[1150px] w-full border-collapse text-xs" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
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
                <tr key={`reservation-skeleton-${index}`} className="border-b border-gray-100">
                  {columns.map((column) => (
                    <td key={`reservation-skeleton-cell-${column.key}`} className="px-2 py-1">
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

                return (
                  <tr
                    key={row.id}
                    className={selected ? 'bg-lime-100' : 'bg-transparent hover:bg-lime-50'}
                    onClick={() => toggleRow(row.id)}
                  >
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                      <button
                        type="button"
                        className="font-medium text-sky-700 decoration-sky-300 underline-offset-2 hover:underline hover:text-sky-800"
                        onClick={(event) => {
                          event.stopPropagation()

                          if (!row.id) {
                            return
                          }

                          navigate(`/operations/reservation/${row.id}`)
                        }}
                      >
                        {row.reservationNr ?? ''}
                      </button>
                    </td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.customerName ?? ''}</td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.startDate ?? ''}</td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.endDate ?? ''}</td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {row.statusCode ?? ''}
                      </span>
                    </td>
                    <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{row.officeLocation ?? ''}</td>
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
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
