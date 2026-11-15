import { useEffect, useId, useMemo, useState } from 'react'
import { Check, LoaderCircle, X } from 'lucide-react'
import { MOBILE_ITEM_ACTIONS, updateReservationItemStatus } from '../../lib/mobileApi'
import {
    formatDateTime,
    getItemDisplayName,
    isAccessoryRow,
    isEligibleForAction,
    isVehicleRow,
    roundToQuarterHour,
    toDate,
    toLocalInputValue,
} from '../mobileFormat'

const ACTION_CONFIG = {
    [MOBILE_ITEM_ACTIONS.DELIVER]: {
        title: 'Lämna ut',
        confirm: 'Markera som utlämnad',
        timeLabel: 'Utlämnad',
        done: (count) => `${count} objekt markerade som utlämnade`,
        dateHint: (item) => `Bokad ut ${formatDateTime(item.bookedFrom)}`,
    },
    [MOBILE_ITEM_ACTIONS.RETURN]: {
        title: 'Återlämna',
        confirm: 'Markera som återlämnad',
        timeLabel: 'Återlämnad',
        done: (count) => `${count} objekt markerade som återlämnade`,
        dateHint: (item) => `Utlämnad ${formatDateTime(item.actualFrom)} · bokad åter ${formatDateTime(item.bookedTo)}`,
    },
    [MOBILE_ITEM_ACTIONS.CHECK_IN]: {
        title: 'Checka in',
        confirm: 'Markera som incheckad',
        timeLabel: null,
        done: (count) => `${count} objekt incheckade`,
        dateHint: (item) => `Återlämnad ${formatDateTime(item.actualTo)}`,
    },
}

function itemLabel(item) {
    const name = getItemDisplayName(item)
    const regNr = String(item.regNr || '').trim()
    return regNr && !name.includes(regNr) ? `${regNr} · ${name}` : name
}

/** Accessories follow the vehicle (same rule as the backend and the desktop reservation page). */
function withFollowingAccessories(selectedIds, eligibleItems) {
    const vehicleSelected = eligibleItems.some((item) => isVehicleRow(item) && selectedIds.has(item.id))
    if (!vehicleSelected) return selectedIds
    const next = new Set(selectedIds)
    eligibleItems.filter(isAccessoryRow).forEach((item) => next.add(item.id))
    return next
}

export default function ItemActionSheet({ reservationId, action, items, onClose, onCompleted }) {
    const config = ACTION_CONFIG[action]
    const titleId = useId()
    const eligibleItems = useMemo(
        () => items.filter((item) => isEligibleForAction(item, action)),
        [items, action],
    )
    const [selectedIds, setSelectedIds] = useState(() => new Set(eligibleItems.map((item) => item.id)))
    const [at, setAt] = useState(() => toLocalInputValue(roundToQuarterHour(new Date())))
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const effectiveIds = withFollowingAccessories(selectedIds, eligibleItems)
    const vehicleSelected = eligibleItems.some((item) => isVehicleRow(item) && effectiveIds.has(item.id))

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !submitting) onClose()
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose, submitting])

    const toggle = (id) => {
        setSelectedIds((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (effectiveIds.size === 0) return
        if (config.timeLabel) {
            const atDate = toDate(at)
            if (!atDate) {
                setError('Ange en giltig tid.')
                return
            }
            if (action === MOBILE_ITEM_ACTIONS.RETURN) {
                const tooEarly = eligibleItems.find((item) => effectiveIds.has(item.id) && toDate(item.actualFrom) > atDate)
                if (tooEarly) {
                    setError(`Återlämning kan inte vara före utlämning (${formatDateTime(tooEarly.actualFrom)}).`)
                    return
                }
            }
        }

        setSubmitting(true)
        setError('')
        try {
            const result = await updateReservationItemStatus(reservationId, {
                action,
                reservationItemIds: [...effectiveIds],
                at: config.timeLabel ? at : undefined,
            })
            const count = result?.updatedReservationItemIds?.length ?? effectiveIds.size
            onCompleted(config.done(count))
        } catch (requestError) {
            setError(requestError?.message || 'Kunde inte spara.')
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end" role="presentation">
            <button
                type="button"
                aria-label="Stäng"
                tabIndex={-1}
                onClick={() => !submitting && onClose()}
                className="absolute inset-0 bg-gray-950/50"
            />
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onSubmit={handleSubmit}
                className="relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h2 id={titleId} className="text-lg font-semibold text-gray-900">{config.title}</h2>
                    <button
                        type="button"
                        aria-label="Stäng"
                        onClick={onClose}
                        disabled={submitting}
                        className="-mr-2 flex size-10 items-center justify-center rounded-full text-gray-500 active:bg-gray-100"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <fieldset>
                        <legend className="mb-2 text-sm font-medium text-gray-700">Objekt</legend>
                        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                            {eligibleItems.map((item) => {
                                const followsVehicle = vehicleSelected && isAccessoryRow(item)
                                const checked = effectiveIds.has(item.id)
                                return (
                                    <li key={item.id}>
                                        <label className={`flex min-h-14 items-center gap-3 px-3 py-2 ${followsVehicle ? 'opacity-70' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={followsVehicle || submitting}
                                                onChange={() => toggle(item.id)}
                                                className="size-5 shrink-0 accent-teal-700"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-gray-900">
                                                    {itemLabel(item)}
                                                </span>
                                                <span className="block text-xs text-gray-500">
                                                    {followsVehicle ? 'Följer fordonet' : config.dateHint(item)}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                )
                            })}
                        </ul>
                    </fieldset>

                    {config.timeLabel && (
                        <label className="block text-sm font-medium text-gray-700">
                            {config.timeLabel}
                            <input
                                type="datetime-local"
                                step={900}
                                required
                                value={at}
                                onChange={(event) => setAt(event.target.value)}
                                disabled={submitting}
                                className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                            />
                        </label>
                    )}

                    {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
                </div>

                <div className="border-t border-gray-100 px-4 py-3">
                    <button
                        type="submit"
                        disabled={submitting || effectiveIds.size === 0}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 font-medium text-white active:bg-teal-800 disabled:opacity-50"
                    >
                        {submitting
                            ? <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" />
                            : <Check size={20} />}
                        {config.confirm} ({effectiveIds.size})
                    </button>
                </div>
            </form>
        </div>
    )
}
