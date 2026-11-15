import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Phone, Smile } from 'lucide-react'
import { getReservationInOutEvents } from '../../lib/reservationSearchApi'
import MobileHeader from '../components/MobileHeader'
import { EmptyState, ErrorBanner, LoadingCards, Pill, SearchField } from '../components/MobileUi'
import useAsyncData from '../useAsyncData'
import { daysOverdue, formatDateTime, formatTime, groupEventsByDay, matchesSearch, toDate } from '../mobileFormat'
import { MOBILE_BASE_PATH } from '../mobileRouting'

const PAGE_CONFIG = {
    return: {
        title: 'Ute hos kund',
        dateLabel: 'Åter',
        emptyTitle: 'Inget är ute just nu',
        emptyIcon: Smile,
        lateLabel: (days) => (days > 0 ? `${days} ${days === 1 ? 'dag' : 'dgr'} sen` : 'Sen'),
    },
    delivery: {
        title: 'Nästa utlämning',
        dateLabel: 'Ut',
        emptyTitle: 'Inga utlämningar planerade',
        emptyIcon: CalendarCheck,
        lateLabel: (days) => (days > 0 ? `Ej utlämnad, ${days} ${days === 1 ? 'dag' : 'dgr'}` : 'Ej utlämnad'),
    },
}

function EventCard({ event, config, now }) {
    const date = toDate(event.date)
    const isLate = date && date < now
    const lateDays = daysOverdue(date, now)
    const phone = String(event.phone || '').trim()

    return (
        <li className="flex items-stretch overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <Link to={`${MOBILE_BASE_PATH}/reservation/${event.reservationId}`} className="min-w-0 flex-1 px-4 py-3 active:bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-base font-medium text-gray-900">{event.customer || 'Kund saknas'}</p>
                    {isLate
                        ? <Pill tone={lateDays >= 3 ? 'red' : 'amber'}>{config.lateLabel(lateDays)}</Pill>
                        : <span className="shrink-0 text-sm font-medium text-gray-700">{formatTime(date)}</span>}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                    {event.items.join(', ')}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    {event.reservationNr && <span>#{event.reservationNr}</span>}
                    {event.category && <span className="uppercase tracking-wide">{event.category}</span>}
                    {isLate && <span>{config.dateLabel} {formatDateTime(date, now)}</span>}
                </div>
                {event.internalNote && (
                    <p className="mt-2 line-clamp-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">{event.internalNote}</p>
                )}
            </Link>
            {phone && (
                <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    aria-label={`Ring ${event.customer}`}
                    className="flex w-14 shrink-0 items-center justify-center border-l border-gray-100 text-teal-700 active:bg-teal-50"
                >
                    <Phone size={20} />
                </a>
            )}
        </li>
    )
}

export default function MobileInOutList({ type }) {
    const config = PAGE_CONFIG[type]
    const [search, setSearch] = useState('')
    const { data, error, loading, reload } = useAsyncData(getReservationInOutEvents, [])
    const now = new Date()

    const events = useMemo(() => (Array.isArray(data) ? data : [])
        .filter((event) => event.type === type)
        .filter((event) => matchesSearch(
            [event.customer, event.reservationNr, event.category, event.phone, ...(event.items || [])],
            search,
        )), [data, type, search])

    const groups = groupEventsByDay(events, now)

    return (
        <>
            <MobileHeader
                title={config.title}
                subtitle={data ? `${events.length} ${events.length === 1 ? 'bokning' : 'bokningar'}` : undefined}
                onRefresh={reload}
                refreshing={loading}
            />
            <div className="px-4 pt-3">
                <SearchField value={search} onChange={setSearch} placeholder="Kund, objekt eller bokningsnr" />
            </div>
            <ErrorBanner message={error} onRetry={reload} />
            {loading && !data ? (
                <LoadingCards />
            ) : data && groups.length === 0 ? (
                <EmptyState title={search ? 'Inga träffar' : config.emptyTitle} icon={config.emptyIcon} />
            ) : (
                <div className="space-y-5 px-4 py-4">
                    {groups.map((group) => (
                        <section key={group.key} aria-label={group.label}>
                            <h2 className={`mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase ${group.overdue ? 'text-rose-700' : 'text-gray-500'}`}>
                                {group.label}
                                <span className="rounded-full bg-white px-2 py-0.5 text-gray-600">{group.events.length}</span>
                            </h2>
                            <ul className="space-y-2">
                                {group.events.map((event) => (
                                    <EventCard key={event.key} event={event} config={config} now={now} />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </>
    )
}
