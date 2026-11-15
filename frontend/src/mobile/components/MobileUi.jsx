import { AlertTriangle, Inbox, Search, X } from 'lucide-react'
import { ITEM_STATE_LABELS } from '../mobileFormat'

export function ErrorBanner({ message, onRetry }) {
    if (!message) return null
    return (
        <div role="alert" className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1 whitespace-pre-line">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="shrink-0 font-medium underline">
                    Försök igen
                </button>
            )}
        </div>
    )
}

export function EmptyState({ title, text, icon = Inbox }) {
    const Icon = icon
    return (
        <div className="flex flex-col items-center px-8 py-16 text-center text-gray-500">
            <Icon size={40} strokeWidth={1.5} className="mb-3 text-gray-400" />
            <p className="text-base font-medium text-gray-700">{title}</p>
            {text && <p className="mt-1 text-sm">{text}</p>}
        </div>
    )
}

export function LoadingCards({ count = 4 }) {
    return (
        <div className="space-y-3 px-4 py-4" aria-busy="true" aria-label="Laddar">
            {Array.from({ length: count }, (_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-white/80 motion-reduce:animate-none" />
            ))}
        </div>
    )
}

export function SearchField({ value, onChange, placeholder = 'Sök' }) {
    return (
        <div className="relative">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-10 pl-10 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
            {value && (
                <button
                    type="button"
                    aria-label="Rensa sökning"
                    onClick={() => onChange('')}
                    className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center text-gray-400"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    )
}

const STATE_CLASSES = {
    booked: 'border-amber-200 bg-amber-50 text-amber-800',
    out: 'border-blue-200 bg-blue-50 text-blue-800',
    returned: 'border-violet-200 bg-violet-50 text-violet-800',
    checkedIn: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

export function ItemStateBadge({ state }) {
    return (
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATE_CLASSES[state] ?? ''}`}>
            {ITEM_STATE_LABELS[state] ?? state}
        </span>
    )
}

export function Pill({ children, tone = 'gray' }) {
    const tones = {
        gray: 'bg-gray-100 text-gray-700',
        red: 'bg-rose-100 text-rose-800',
        amber: 'bg-amber-100 text-amber-800',
        lime: 'bg-lime-100 text-lime-800',
        teal: 'bg-teal-50 text-teal-800',
    }
    return (
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
            {children}
        </span>
    )
}
