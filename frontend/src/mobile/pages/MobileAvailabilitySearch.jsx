import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarSearch, PackageSearch } from 'lucide-react'
import { getAvailableItems } from '../../lib/mobileApi'
import MobileHeader from '../components/MobileHeader'
import { EmptyState, ErrorBanner, LoadingCards, SearchField } from '../components/MobileUi'
import useAsyncData from '../useAsyncData'
import { filterAvailableItems, roundToQuarterHour, toDate, toLocalInputValue } from '../mobileFormat'
import { GroupedAvailableItems, ItemTypeChips } from './MobileAvailableNow'

const DAY_MS = 24 * 60 * 60 * 1000

function defaultPeriod() {
    const from = roundToQuarterHour(new Date())
    return { from: toLocalInputValue(from), to: toLocalInputValue(new Date(from.getTime() + DAY_MS)) }
}

const inputClass = 'h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none'

export default function MobileAvailabilitySearch() {
    const [searchParams, setSearchParams] = useSearchParams()
    const activeFrom = searchParams.get('from') || ''
    const activeTo = searchParams.get('to') || ''
    const [form, setForm] = useState(() => (activeFrom && activeTo ? { from: activeFrom, to: activeTo } : defaultPeriod()))
    const [formError, setFormError] = useState('')
    const [search, setSearch] = useState('')
    const [typeCode, setTypeCode] = useState('')

    const { data, error, loading, reload } = useAsyncData(
        () => (activeFrom && activeTo ? getAvailableItems({ from: activeFrom, to: activeTo }) : Promise.resolve(null)),
        [activeFrom, activeTo],
    )

    const handleSubmit = (event) => {
        event.preventDefault()
        const from = toDate(form.from)
        const to = toDate(form.to)
        if (!from || !to) {
            setFormError('Ange både från och till.')
            return
        }
        if (to < from) {
            setFormError('Till måste vara efter från.')
            return
        }
        setFormError('')
        if (form.from === activeFrom && form.to === activeTo) {
            reload()
        } else {
            setSearchParams({ from: form.from, to: form.to }, { replace: true })
        }
    }

    const handleFromChange = (value) => {
        setForm((current) => {
            const from = toDate(value)
            const to = toDate(current.to)
            // Keep the period length sensible when the start is moved past the end.
            const nextTo = from && (!to || to <= from) ? toLocalInputValue(new Date(from.getTime() + DAY_MS)) : current.to
            return { from: value, to: nextTo }
        })
    }

    const hasSearched = Boolean(activeFrom && activeTo)
    const allItems = Array.isArray(data) ? data : []
    const items = filterAvailableItems(allItems, typeCode, search)

    return (
        <>
            <MobileHeader
                title="Sök lediga"
                subtitle={hasSearched && data ? `${items.length} lediga objekt` : 'Välj period'}
            />
            <form onSubmit={handleSubmit} className="space-y-3 border-b border-gray-200 bg-white px-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                    <label className="block min-w-0 text-sm font-medium text-gray-700">
                        Från
                        <input
                            type="datetime-local"
                            step={900}
                            required
                            value={form.from}
                            onChange={(event) => handleFromChange(event.target.value)}
                            className={`mt-1 ${inputClass}`}
                        />
                    </label>
                    <label className="block min-w-0 text-sm font-medium text-gray-700">
                        Till
                        <input
                            type="datetime-local"
                            step={900}
                            required
                            min={form.from}
                            value={form.to}
                            onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))}
                            className={`mt-1 ${inputClass}`}
                        />
                    </label>
                </div>
                {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
                <button
                    type="submit"
                    disabled={loading && hasSearched}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 font-medium text-white active:bg-gray-800 disabled:opacity-60"
                >
                    <CalendarSearch size={18} /> Sök lediga objekt
                </button>
            </form>

            {hasSearched && (
                <>
                    {data && allItems.length > 0 && (
                        <div className="space-y-3 px-4 pt-3">
                            <SearchField value={search} onChange={setSearch} placeholder="Filtrera resultat" />
                            <ItemTypeChips items={allItems} selected={typeCode} onSelect={setTypeCode} />
                        </div>
                    )}
                    <ErrorBanner message={error} onRetry={reload} />
                    {loading && !data ? (
                        <LoadingCards />
                    ) : data && items.length === 0 ? (
                        <EmptyState
                            title={search || typeCode ? 'Inga träffar' : 'Inga lediga objekt'}
                            text={search || typeCode ? undefined : 'Alla objekt är bokade under perioden.'}
                            icon={PackageSearch}
                        />
                    ) : data ? (
                        <GroupedAvailableItems items={items} freeUntilLabel="Nästa bokning" />
                    ) : null}
                </>
            )}
        </>
    )
}
