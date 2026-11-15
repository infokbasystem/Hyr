import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Mail, MapPin, Monitor, Navigation, Phone } from 'lucide-react'
import { getReservationById } from '../../lib/reservationSearchApi'
import { MOBILE_ITEM_ACTIONS } from '../../lib/mobileApi'
import { buildDirectionsUrl, formatCoordinates, formatPlacementAddress, getPlacement } from '../../lib/placementLocation'
import { getReservationStatusLabel, getReservationStatusPillClass } from '../../lib/reservationStatus'
import MobileHeader from '../components/MobileHeader'
import ItemActionSheet from '../components/ItemActionSheet'
import { ErrorBanner, ItemStateBadge, LoadingCards } from '../components/MobileUi'
import useAsyncData from '../useAsyncData'
import { formatDateTime, getItemDisplayName, getItemState, isEligibleForAction } from '../mobileFormat'
import { MOBILE_BASE_PATH, setPrefersDesktop } from '../mobileRouting'

const ACTIONS = [
    { action: MOBILE_ITEM_ACTIONS.DELIVER, label: 'Lämna ut', icon: ArrowUpFromLine },
    { action: MOBILE_ITEM_ACTIONS.RETURN, label: 'Återlämna', icon: ArrowDownToLine },
    { action: MOBILE_ITEM_ACTIONS.CHECK_IN, label: 'Checka in', icon: ClipboardCheck },
]

const clean = (value) => String(value ?? '').trim()

function Section({ title, children }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.08em] text-gray-500 uppercase">{title}</h2>
            {children}
        </section>
    )
}

function InfoRow({ label, value }) {
    if (!clean(value)) return null
    return (
        <div className="flex gap-3 py-1 text-sm">
            <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
            <dd className="min-w-0 flex-1 break-words whitespace-pre-line text-gray-900">{value}</dd>
        </div>
    )
}

function ContactButton({ href, icon, label, primary = false, external = false }) {
    const Icon = icon
    const tone = primary
        ? 'border-teal-700 bg-teal-700 text-white active:bg-teal-800'
        : 'border-gray-200 text-teal-800 active:bg-teal-50'
    return (
        <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium ${tone}`}
        >
            <Icon size={18} className="shrink-0" />
            <span className="truncate">{label}</span>
        </a>
    )
}

function ItemCard({ item }) {
    const state = getItemState(item)
    const title = getItemDisplayName(item)
    const regNr = clean(item.regNr)
    const subtitle = [regNr && !title.includes(regNr) ? regNr : '', clean(item.category)].filter(Boolean).join(' · ')
    const km = [clean(item.kmOut) && `ut ${item.kmOut}`, clean(item.kmIn) && `in ${item.kmIn}`].filter(Boolean).join(' · ')
    return (
        <li className="py-3 first:pt-1 last:pb-1">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{title}</p>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
                <ItemStateBadge state={state} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                    <dt className="text-gray-500">Bokad ut</dt>
                    <dd className="text-gray-900">{formatDateTime(item.bookedFrom) || '–'}</dd>
                </div>
                <div>
                    <dt className="text-gray-500">Bokad åter</dt>
                    <dd className="text-gray-900">{formatDateTime(item.bookedTo) || '–'}</dd>
                </div>
                {item.actualFrom && (
                    <div>
                        <dt className="text-gray-500">Utlämnad</dt>
                        <dd className="text-gray-900">{formatDateTime(item.actualFrom)}</dd>
                    </div>
                )}
                {item.actualTo && (
                    <div>
                        <dt className="text-gray-500">Återlämnad</dt>
                        <dd className="text-gray-900">{formatDateTime(item.actualTo)}</dd>
                    </div>
                )}
                {km && (
                    <div className="col-span-2">
                        <dt className="text-gray-500">Mätarställning</dt>
                        <dd className="text-gray-900">{km}</dd>
                    </div>
                )}
            </dl>
            {clean(item.itemNote) && (
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs whitespace-pre-line text-amber-900">{item.itemNote}</p>
            )}
        </li>
    )
}

export default function MobileReservation() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { data: reservation, error, loading, reload } = useAsyncData(() => getReservationById(id), [id])
    const [activeAction, setActiveAction] = useState(null)
    const [toast, setToast] = useState('')

    useEffect(() => {
        if (!toast) return undefined
        const timer = window.setTimeout(() => setToast(''), 3500)
        return () => window.clearTimeout(timer)
    }, [toast])

    const handleBack = () => {
        if (location.key !== 'default') navigate(-1)
        else navigate(MOBILE_BASE_PATH)
    }

    const closeSheet = useCallback(() => setActiveAction(null), [])
    const handleCompleted = useCallback((message) => {
        setActiveAction(null)
        setToast(message)
        reload()
    }, [reload])

    const openInDesktop = () => {
        setPrefersDesktop(true)
        navigate(`/operations/reservation/${id}`)
    }

    const items = [...(reservation?.reservationItems ?? [])].sort((a, b) => (a.sortNr ?? 0) - (b.sortNr ?? 0) || a.id - b.id)
    const actionCounts = Object.fromEntries(ACTIONS.map(({ action }) => [action, items.filter((item) => isEligibleForAction(item, action)).length]))
    const availableActions = ACTIONS.filter(({ action }) => actionCounts[action] > 0)

    const phone = clean(reservation?.mobilePhone) || clean(reservation?.telephoneWorkplace)
    const email = clean(reservation?.email)
    const address = [clean(reservation?.address), clean(reservation?.zipCode)].filter(Boolean).join(', ')
    const placement = getPlacement(reservation)
    const placementAddress = formatPlacementAddress(placement)
    const placementCoordinates = formatCoordinates(placement.latitude, placement.longitude)
    const directionsUrl = buildDirectionsUrl(placement.latitude, placement.longitude)
    const mapQuery = placementAddress || address
    const driver = [clean(reservation?.driverName), clean(reservation?.driverMobilePhone)].filter(Boolean).join(', ')
    const hasDelivery = [reservation?.deliveryPlace, placementAddress, placementCoordinates, address, reservation?.deliveryPlaceNote, reservation?.pickupPlaceNote, reservation?.pickUpBy, driver]
        .some((value) => clean(value))

    return (
        <>
            <MobileHeader
                title={reservation?.reservationNr ? `Bokning ${reservation.reservationNr}` : 'Bokning'}
                subtitle={reservation?.customerName}
                onBack={handleBack}
                onRefresh={reload}
                refreshing={loading}
            />
            <ErrorBanner message={error} onRetry={reload} />

            {loading && !reservation ? (
                <LoadingCards count={3} />
            ) : reservation ? (
                <div className={`space-y-3 px-4 py-4 ${availableActions.length ? 'pb-24' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getReservationStatusPillClass(reservation.statusCode)}`}>
                            {getReservationStatusLabel(reservation.statusCode)}
                        </span>
                    </div>

                    <Section title="Kund">
                        <p className="text-base font-medium text-gray-900">{reservation.customerName || 'Kund saknas'}</p>
                        <dl className="mt-1">
                            <InfoRow label="Beställare" value={reservation.orderer} />
                            <InfoRow label="Referens" value={reservation.reference} />
                            <InfoRow label="Märkning" value={reservation.customerMarking} />
                            <InfoRow label="Telefon" value={phone} />
                        </dl>
                        {(phone || email) && (
                            <div className="mt-3 flex gap-2">
                                {phone && <ContactButton href={`tel:${phone.replace(/\s+/g, '')}`} icon={Phone} label="Ring" />}
                                {email && <ContactButton href={`mailto:${email}`} icon={Mail} label={email} />}
                            </div>
                        )}
                    </Section>

                    {hasDelivery && (
                        <Section title="Leverans">
                            <dl>
                                <InfoRow label="Plats" value={reservation.deliveryPlace} />
                                <InfoRow label="Placering" value={placementAddress} />
                                <InfoRow label="Adress" value={address} />
                                <InfoRow label="Utlämning" value={reservation.deliveryPlaceNote} />
                                <InfoRow label="Återlämning" value={reservation.pickupPlaceNote} />
                                <InfoRow label="Hämtas av" value={reservation.pickUpBy} />
                                <InfoRow label="Förare" value={driver} />
                            </dl>
                            {(directionsUrl || mapQuery) && (
                                <div className="mt-3 flex">
                                    {directionsUrl ? (
                                        <ContactButton
                                            href={directionsUrl}
                                            icon={Navigation}
                                            label="Navigera"
                                            primary
                                            external
                                        />
                                    ) : (
                                        <ContactButton
                                            href={`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`}
                                            icon={MapPin}
                                            label="Visa på karta"
                                            external
                                        />
                                    )}
                                </div>
                            )}
                        </Section>
                    )}

                    {(clean(reservation.note) || clean(reservation.noteExternal)) && (
                        <Section title="Anteckningar">
                            {clean(reservation.note) && (
                                <div className="mb-2 last:mb-0">
                                    <p className="text-xs text-gray-500">Intern</p>
                                    <p className="text-sm whitespace-pre-line text-gray-900">{reservation.note}</p>
                                </div>
                            )}
                            {clean(reservation.noteExternal) && (
                                <div>
                                    <p className="text-xs text-gray-500">Till kund</p>
                                    <p className="text-sm whitespace-pre-line text-gray-900">{reservation.noteExternal}</p>
                                </div>
                            )}
                        </Section>
                    )}

                    <Section title={`Objekt (${items.length})`}>
                        {items.length ? (
                            <ul className="divide-y divide-gray-100">
                                {items.map((item) => <ItemCard key={item.id} item={item} />)}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">Bokningen saknar objekt.</p>
                        )}
                    </Section>

                    <button
                        type="button"
                        onClick={openInDesktop}
                        className="flex w-full items-center justify-center gap-2 py-3 text-sm text-gray-600 underline-offset-2 active:underline"
                    >
                        <Monitor size={16} /> Öppna i desktopversionen
                    </button>
                </div>
            ) : null}

            {reservation && availableActions.length > 0 && (
                <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-gray-200 bg-white/95 px-3 py-2 backdrop-blur">
                    <div className="flex gap-2">
                        {availableActions.map((entry, index) => (
                            <button
                                key={entry.action}
                                type="button"
                                onClick={() => setActiveAction(entry.action)}
                                className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium ${index === 0 ? 'bg-teal-700 text-white active:bg-teal-800' : 'border border-gray-200 bg-white text-gray-900 active:bg-gray-50'}`}
                            >
                                <entry.icon size={18} className="shrink-0" />
                                <span className="truncate">{entry.label}</span>
                                <span className="opacity-70">{actionCounts[entry.action]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeAction && reservation && (
                <ItemActionSheet
                    reservationId={reservation.id}
                    action={activeAction}
                    items={items}
                    onClose={closeSheet}
                    onCompleted={handleCompleted}
                />
            )}

            {toast && (
                <div
                    role="status"
                    className="fixed inset-x-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-50 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
                >
                    {toast}
                </div>
            )}
        </>
    )
}
