import { Link } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { Pill } from './MobileUi'
import { formatDateTime } from '../mobileFormat'
import { MOBILE_BASE_PATH } from '../mobileRouting'

function itemTitle(item) {
    const nr = String(item.itemNr || '').trim()
    const regNr = String(item.regNr || '').trim()
    return nr || regNr || item.itemModelName || 'Objekt'
}

function itemSubtitle(item) {
    const title = itemTitle(item)
    return [
        item.regNr && item.regNr !== title ? item.regNr : '',
        [item.manufacturer, item.itemModelName].filter(Boolean).join(' '),
        item.serialNr && !item.regNr ? `S/N ${item.serialNr}` : '',
    ].filter(Boolean).join(' · ')
}

export default function AvailableItemList({ items, freeUntilLabel = 'Ledig till' }) {
    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-base font-medium text-gray-900">{itemTitle(item)}</p>
                        <span className="shrink-0 text-xs tracking-wide text-gray-500 uppercase">{item.itemTypeName}</span>
                    </div>
                    {itemSubtitle(item) && <p className="mt-0.5 text-sm text-gray-600">{itemSubtitle(item)}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {item.nextBookedFrom
                            ? <Pill tone="amber">{freeUntilLabel} {formatDateTime(item.nextBookedFrom)}</Pill>
                            : <Pill tone="lime">Inga kommande bokningar</Pill>}
                        {item.checkInReservationId && (
                            <Link
                                to={`${MOBILE_BASE_PATH}/reservation/${item.checkInReservationId}`}
                                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800 active:bg-violet-100"
                            >
                                <ClipboardCheck size={14} /> Ej incheckad
                            </Link>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    )
}
