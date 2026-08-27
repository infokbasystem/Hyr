import { ArrowLeftCircle, ArrowRightCircle } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import {
  getFinanceOutstandingOverview,
  getFinanceOverdueInvoicesPage,
  getFinanceWeeklyOverview,
} from '../../lib/financeOverviewApi'

const WEEK_BUCKET_COUNT = 15
const FinanceWeeklyChart = lazy(() => import('./FinanceWeeklyChart'))

function formatCell(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  return value
}

function formatWeekLabel(week) {
  if (!Number.isFinite(week)) {
    return ''
  }

  return `v.${week}`
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return parsed.toLocaleDateString('sv-SE')
}

function formatKronor(value) {
  return `${new Intl.NumberFormat('sv-SE').format(Math.round(value))} kr`
}

function buildPlaceholderWeeklyData(weeks) {
  return Array.from({ length: weeks }, (_, index) => ({
    label: `v.${index + 1}`,
    intakter: 0,
    kassaflode: 0,
  }))
}

function normalizePagedResult(payload) {
  return {
    items: payload?.items ?? [],
    pageNumber: payload?.pageNumber ?? 1,
    pageSize: payload?.pageSize ?? 20,
    totalCount: payload?.totalCount ?? 0,
    totalPages: payload?.totalPages ?? 0,
  }
}

function Section({ title, children, className = '', headerRight = null }) {
  return (
    <section className={`w-full ${className}`}>
      <div className="relative mb-2 flex items-center justify-center">
        <h2 className="text-center text-xs leading-none font-medium text-stone-500">{title}</h2>
        {headerRight ? <div className="absolute right-0 top-1/2 -translate-y-1/2">{headerRight}</div> : null}
      </div>
      <div className="border-t border-stone-300/80" />
      <div className="pt-1">{children}</div>
    </section>
  )
}

function WeeklyHeaderLabels() {
  return (
    <span className="inline-flex items-center gap-8">
      <span>Intäkter per vecka</span>
      <span className="inline-flex items-center gap-2">
        <span className="h-[11px] w-[11px] bg-[#d9601f]" />
        fakturerat
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-[11px] w-[11px] bg-[#efc236]" />
        kassaflöde
      </span>
    </span>
  )
}

function WeeklyNavigationControls({ loading, weekOffset, onPrevious, onNext }) {
  return (
    <div className="flex items-center" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={loading}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Föregående vecka"
        >
          <ArrowLeftCircle className="h-4 w-4 text-red-300 hover:text-red-400" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={loading || weekOffset <= 0}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Nästa vecka"
        >
          <ArrowRightCircle className="h-4 w-4 text-red-300 hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}

function DataTable({ columns, rows }) {
  const [selectedRowId, setSelectedRowId] = useState(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (!target.closest('[data-overview-row]')) {
        setSelectedRowId(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!selectedRowId) {
      return
    }

    const stillExists = rows.some((row, index) => {
      const rowId = row.id ?? row.fakturanr ?? `row-${index}`
      return rowId === selectedRowId
    })

    if (!stillExists) {
      setSelectedRowId(null)
    }
  }, [rows, selectedRowId])

  return (
    <div className="overflow-hidden">
      <table className="w-full table-fixed text-stone-800" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`pb-[5px] pl-[6px] text-tiny font-normal tracking-[0.05em] text-stone-500 ${column.align === 'right' ? 'text-right' : 'text-left'} ${column.widthClass || ''}`.trim()}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = row.id ?? row.fakturanr ?? `row-${index}`
            const isSelected = selectedRowId === rowId

            return (
              <tr
                key={`${rowId}-${index}`}
                data-overview-row
                className={isSelected ? 'bg-lime-100' : 'bg-transparent hover:bg-lime-50'}
                onClick={() => setSelectedRowId((prev) => (prev === rowId ? null : rowId))}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`truncate py-[4px] pl-[6px] pr-2 text-xs leading-[1.2] font-normal text-stone-900 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {formatCell(column.render(row))}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WeeklyBars({ data }) {
  return (
    <div className="pt-1">
      <Suspense fallback={<div className="h-[248px] w-full" />}>
        <FinanceWeeklyChart data={data} />
      </Suspense>
    </div>
  )
}

function FinancePieLegend({ ejForfallet, forfallet }) {
  const ejForfalletText = ejForfallet > 0 ? formatKronor(ejForfallet) : 'kr'

  return (
    <div className="min-w-[250px] text-[0.75rem] leading-[1.15] text-stone-700" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
      <div className="grid grid-cols-[16px_80px_80px] items-center gap-x-3 gap-y-3">
        <span className="h-3 w-3 bg-[#85c33f]" />
        <span>Ej förfallet</span>
        <span className="min-w-[40px] text-right">{ejForfalletText}</span>

        <span className="h-3 w-3 bg-[#2f97cc]" />
        <span>Förfallet</span>
        <span className="min-w-[40px] text-right">{formatKronor(forfallet)}</span>
      </div>
    </div>
  )
}

function OutstandingPieChart({ ejForfallet, forfallet }) {
  const chartData = [
    { name: 'Ej förfallet', value: ejForfallet, color: '#85c33f' },
    { name: 'Förfallet', value: forfallet, color: '#2f97cc' },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-10 pt-2">
      <div className="h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={72}
              innerRadius={0}
              stroke="#f8fafc"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <FinancePieLegend ejForfallet={ejForfallet} forfallet={forfallet} />
    </div>
  )
}

function PaginationControls({ pageNumber, totalPages, totalCount, loading, onPrevious, onNext }) {
  const canGoPrevious = pageNumber > 1 && !loading
  const canGoNext = pageNumber < totalPages && !loading

  return (
    <div className="flex items-center" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
      <span className="mr-3 text-xs text-gray-700">
        Sida <strong>{pageNumber}</strong> av <strong>{totalPages || 1}</strong>
      </span>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Föregående sida"
        >
          <ArrowLeftCircle className="h-4 w-4 text-red-300 hover:text-red-400" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Nästa sida"
        >
          <ArrowRightCircle className="h-4 w-4 text-red-300 hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}

export default function FinanceOverviewPage() {
  const navigate = useNavigate()
  const [weeklyData, setWeeklyData] = useState([])
  const [weeklyWindowOffset, setWeeklyWindowOffset] = useState(0)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [outstandingData, setOutstandingData] = useState({ ejForfallet: 0, forfallet: 0 })
  const [overdueData, setOverdueData] = useState(() => normalizePagedResult())
  const [loading, setLoading] = useState(true)
  const [overdueLoading, setOverdueLoading] = useState(false)
  const [error, setError] = useState('')
  const placeholderWeeklyData = useMemo(() => buildPlaceholderWeeklyData(WEEK_BUCKET_COUNT), [])

  useEffect(() => {
    let disposed = false

    async function loadOverviewRows() {
      setLoading(true)
      setError('')

      try {
        const [outstandingResponse, overdueResponse] = await Promise.all([
          getFinanceOutstandingOverview(),
          getFinanceOverdueInvoicesPage(1, 10),
        ])

        if (disposed) {
          return
        }

        setOutstandingData({
          ejForfallet: outstandingResponse?.ejForfallet ?? 0,
          forfallet: outstandingResponse?.forfallet ?? 0,
        })
        setOverdueData(normalizePagedResult(overdueResponse))
      } catch (requestError) {
        if (disposed) {
          return
        }

        setOutstandingData({ ejForfallet: 0, forfallet: 0 })
        setOverdueData(normalizePagedResult())
        setError(requestError?.message || 'Kunde inte hämta översikten.')
      } finally {
        if (!disposed) {
          setLoading(false)
        }
      }
    }

    void loadOverviewRows()

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    let disposed = false

    async function loadWeeklyRows() {
      setWeeklyLoading(true)
      setError('')

      try {
        const weeklyResponse = await getFinanceWeeklyOverview(WEEK_BUCKET_COUNT, weeklyWindowOffset)

        if (disposed) {
          return
        }

        setWeeklyData((weeklyResponse ?? []).map((entry) => ({
          label: entry.label || formatWeekLabel(entry.week),
          intakter: entry.intakter ?? 0,
          kassaflode: entry.kassaflode ?? 0,
        })))
      } catch (requestError) {
        if (disposed) {
          return
        }

        setWeeklyData([])
        setError(requestError?.message || 'Kunde inte hämta veckodata.')
      } finally {
        if (!disposed) {
          setWeeklyLoading(false)
        }
      }
    }

    void loadWeeklyRows()

    return () => {
      disposed = true
    }
  }, [weeklyWindowOffset])

  async function changeOverduePage(pageNumber) {
    if (pageNumber < 1 || pageNumber > overdueData.totalPages) {
      return
    }

    setOverdueLoading(true)
    setError('')

    try {
      const response = await getFinanceOverdueInvoicesPage(pageNumber, overdueData.pageSize || 20)
      setOverdueData(normalizePagedResult(response))
    } catch (requestError) {
      setError(requestError?.message || 'Kunde inte hämta förfallna fakturor.')
    } finally {
      setOverdueLoading(false)
    }
  }

  const overdueColumns = useMemo(
    () => [
      {
        key: 'fakturanr',
        label: 'FAKTURANR',
        widthClass: 'w-[18%]',
        render: (row) => (
          <button
            type="button"
            className="text-left text-sky-700 decoration-sky-300 underline-offset-2 hover:underline hover:text-sky-800"
            onClick={(event) => {
              event.stopPropagation()

              if (!row.id) {
                return
              }

              navigate(`/finance/invoice/${row.id}`)
            }}
          >
            {row.fakturanr}
          </button>
        ),
      },
      { key: 'forfaller', label: 'FÖRFALLER', widthClass: 'w-[16%]', render: (row) => formatDate(row.forfaller) },
      { key: 'kund', label: 'KUND', widthClass: 'w-[46%]', render: (row) => row.kund },
      {
        key: 'belopp',
        label: 'SUMMA INKL MOMS',
        widthClass: 'w-[20%]',
        align: 'right',
        render: (row) => formatKronor(row.belopp ?? 0),
      },
    ],
    [navigate]
  )

  return (
    <div className="flex h-full flex-col px-2 pt-8 md:px-[clamp(10px,14vw,24vw)]">
      <main className="h-full w-full overflow-hidden px-6 py-2 text-stone-800 md:px-10">
        {error ? <p className="mb-3 text-[1.2rem] text-red-700">{error}</p> : null}

        <div className="grid h-full content-start grid-cols-1 gap-x-20 gap-y-4 xl:grid-cols-[50%_50%]">
          <Section
            title={<WeeklyHeaderLabels />}
            headerRight={
              <WeeklyNavigationControls
                loading={loading || weeklyLoading}
                weekOffset={weeklyWindowOffset}
                onPrevious={() => setWeeklyWindowOffset((prev) => prev + 1)}
                onNext={() => setWeeklyWindowOffset((prev) => Math.max(0, prev - 1))}
              />
            }
          >
            <div className="relative h-[248px]">
              <WeeklyBars data={loading || weeklyLoading ? placeholderWeeklyData : weeklyData} />
              {loading || weeklyLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="bg-white/70 px-2 text-[1.2rem] text-stone-500"></p>
                </div>
              ) : null}
            </div>
          </Section>

          <Section title="Utestående fakturor" className="xl:mt-0">
            <OutstandingPieChart
              ejForfallet={outstandingData.ejForfallet}
              forfallet={outstandingData.forfallet}
            />
          </Section>

          <Section className="mt-8"
            title="Förfallna fakturor"
            headerRight={
              !loading ? (
                <PaginationControls
                  pageNumber={overdueData.pageNumber}
                  totalPages={overdueData.totalPages}
                  totalCount={overdueData.totalCount}
                  loading={overdueLoading}
                  onPrevious={() => changeOverduePage(overdueData.pageNumber - 1)}
                  onNext={() => changeOverduePage(overdueData.pageNumber + 1)}
                />
              ) : null
            }
          >
            {loading || overdueLoading ? (
              <p className="text-[1.2rem] text-stone-500"></p>
            ) : (
              <DataTable columns={overdueColumns} rows={overdueData.items} />
            )}
          </Section>
        </div>
      </main>
    </div>
  )
}
