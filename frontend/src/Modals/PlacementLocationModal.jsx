import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { MapPin, Save, Search, Trash2, X } from 'lucide-react'
import ActionButton from '../components/ActionButton'
import LabeledInput from '../components/LabeledInput'
import { getCustomerById } from '../lib/customerApi'
import { searchAddresses } from '../lib/geocodingApi'
import { pinIcon, TILE_ATTRIBUTION, TILE_URL } from '../lib/placementMap'
import {
    DEFAULT_MAP_CENTER,
    customerToPlacementAddress,
    formatCoordinates,
    formatPlacementAddress,
    toCoordinate,
} from '../lib/placementLocation'

const PIN_ZOOM = 17

const getErrorMessage = (error, fallback) => error?.payload?.message ?? error?.message ?? fallback

function MapClickHandler({ onPick }) {
    useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) })
    return null
}

function MapViewController({ view }) {
    const map = useMap()

    useEffect(() => {
        // The dialog was hidden when the map was created, so Leaflet needs to re-measure its container.
        map.invalidateSize()
    }, [map])

    useEffect(() => {
        if (view) map.setView([view.latitude, view.longitude], view.zoom)
    }, [map, view])

    return null
}

export default function PlacementLocationModal({ initialPlacement, customerId, fallbackAddress, onClose, onSave }) {
    const dialogRef = useRef(null)
    const searchSeqRef = useRef(0)
    const autoSearchedRef = useRef(false)
    const [isOpen, setIsOpen] = useState(false)
    const [address, setAddress] = useState({
        street: initialPlacement.street,
        zipCode: initialPlacement.zipCode,
        city: initialPlacement.city,
    })
    const [pin, setPin] = useState(
        initialPlacement.latitude !== null ? { latitude: initialPlacement.latitude, longitude: initialPlacement.longitude } : null,
    )
    const [view, setView] = useState(
        initialPlacement.latitude !== null
            ? { latitude: initialPlacement.latitude, longitude: initialPlacement.longitude, zoom: 15 }
            : null,
    )
    const [results, setResults] = useState([])
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [isSearching, setIsSearching] = useState(false)
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const hasInitialPlacement = initialPlacement.latitude !== null || Boolean(formatPlacementAddress(initialPlacement))

    useEffect(() => {
        const dialog = dialogRef.current
        dialog.showModal()
        setIsOpen(true)
        return () => dialog.close()
    }, [])

    function applyResult(result, index) {
        const latitude = toCoordinate(result.latitude)
        const longitude = toCoordinate(result.longitude)
        if (latitude === null || longitude === null) return
        setPin({ latitude, longitude })
        setView({ latitude, longitude, zoom: PIN_ZOOM })
        setSelectedIndex(index)
        setAddress((previous) => ({
            street: result.street || previous.street,
            zipCode: result.zipCode || previous.zipCode,
            city: result.city || previous.city,
        }))
    }

    async function runSearch(searchAddress) {
        const seq = ++searchSeqRef.current
        setIsSearching(true)
        setError('')
        setNotice('')
        try {
            let found = await searchAddresses(searchAddress)
            if (!found.length) {
                found = await searchAddresses({ query: formatPlacementAddress(searchAddress) })
            }
            if (seq !== searchSeqRef.current) return

            setResults(found)
            if (found.length) {
                applyResult(found[0], 0)
            } else {
                setSelectedIndex(-1)
                setNotice('Ingen adress hittades. Justera adressen eller klicka direkt på kartan.')
            }
        } catch (searchError) {
            if (seq !== searchSeqRef.current) return
            setResults([])
            setError(getErrorMessage(searchError, 'Kunde inte söka efter adressen.'))
        } finally {
            if (seq === searchSeqRef.current) setIsSearching(false)
        }
    }

    useEffect(() => {
        if (hasInitialPlacement) return undefined

        let active = true
        const startSearch = (candidate) => {
            if (!active || autoSearchedRef.current || !formatPlacementAddress(candidate)) return
            autoSearchedRef.current = true
            setAddress(candidate)
            runSearch(candidate)
        }

        if (!customerId) {
            startSearch(fallbackAddress)
            return undefined
        }

        setIsLoadingCustomer(true)
        getCustomerById(customerId)
            .then((customer) => {
                const customerAddress = customerToPlacementAddress(customer)
                startSearch(formatPlacementAddress(customerAddress) ? customerAddress : fallbackAddress)
            })
            .catch(() => startSearch(fallbackAddress))
            .finally(() => {
                if (active) setIsLoadingCustomer(false)
            })

        return () => { active = false }
        // Runs once on open: it only prefills the empty form from the customer's address.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handleAddressChange(field, value) {
        setAddress((previous) => ({ ...previous, [field]: value }))
        setError('')
    }

    function handleSearch(event) {
        event.preventDefault()
        event.stopPropagation()
        if (isSearching) return
        if (!formatPlacementAddress(address)) {
            setNotice('')
            setError('Ange en adress att söka efter.')
            return
        }
        runSearch(address)
    }

    function handlePick(latitude, longitude) {
        const picked = { latitude: toCoordinate(latitude), longitude: toCoordinate(longitude) }
        if (picked.latitude === null || picked.longitude === null) return
        setPin(picked)
        setSelectedIndex(-1)
        setError('')
        setNotice('')
    }

    function handleClear() {
        searchSeqRef.current += 1
        setIsSearching(false)
        setAddress({ street: '', zipCode: '', city: '' })
        setPin(null)
        setResults([])
        setSelectedIndex(-1)
        setError('')
        setNotice('')
    }

    function handleApply() {
        onSave({
            ...address,
            latitude: pin?.latitude ?? null,
            longitude: pin?.longitude ?? null,
        })
    }

    const initialCenter = view ?? DEFAULT_MAP_CENTER

    return createPortal(
        <dialog
            ref={dialogRef}
            aria-labelledby="placement-location-title"
            className="top-20 bottom-auto m-auto w-[1040px] max-w-[calc(100%-2rem)] max-h-[calc(var(--app-viewport-height)-6rem)] overflow-auto rounded-sm border border-stone-300 bg-stone-50 p-6 shadow-xl backdrop:bg-black/50"
            onCancel={(event) => {
                event.preventDefault()
                onClose()
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    const rect = event.currentTarget.getBoundingClientRect()
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
                        onClose()
                    }
                }
            }}
        >
            <div className="mb-4 flex items-center justify-between">
                <h2 id="placement-location-title" className="text-sm font-semibold tracking-[0.10em] text-gray-600">Placering</h2>
                <button type="button" aria-label="Stäng" onClick={onClose} className="text-gray-500 hover:text-gray-800">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-6">
                <div className="min-w-0">
                    <form autoComplete="off" onSubmit={handleSearch}>
                        <LabeledInput label="Gata" labelWidth="w-14" name="placementStreet" value={address.street} onChange={(value) => handleAddressChange('street', value)} />
                        <LabeledInput label="Postnr" labelWidth="w-14" name="placementZipCode" value={address.zipCode} onChange={(value) => handleAddressChange('zipCode', value)} />
                        <LabeledInput label="Ort" labelWidth="w-14" name="placementCity" value={address.city} onChange={(value) => handleAddressChange('city', value)} />
                        <div className="mt-3">
                            <ActionButton label={isSearching ? 'Söker...' : 'Sök adress'} icon={Search} accent="sky" type="submit" disabled={isSearching} />
                        </div>
                    </form>

                    {isLoadingCustomer && <p className="mt-3 text-xs text-gray-500">Hämtar kundens adress...</p>}
                    {error && <div role="alert" className="mt-3 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
                    {notice && <div role="status" className="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{notice}</div>}

                    {results.length > 1 && (
                        <ul className="mt-3 max-h-48 overflow-auto rounded-sm border border-gray-300 bg-white text-xs" aria-label="Sökträffar">
                            {results.map((result, index) => (
                                <li key={`${result.latitude},${result.longitude},${index}`}>
                                    <button
                                        type="button"
                                        onClick={() => applyResult(result, index)}
                                        className={`flex w-full items-start gap-2 px-2 py-1.5 text-left hover:bg-sky-50 ${index === selectedIndex ? 'bg-sky-100' : ''}`}
                                    >
                                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-500" />
                                        <span className="min-w-0 break-words">{result.displayName || formatPlacementAddress(result)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <dl className="mt-4 text-xs text-gray-700">
                        <dt className="text-gray-500">Vald position</dt>
                        <dd className="mt-0.5 font-medium">
                            {pin ? formatCoordinates(pin.latitude, pin.longitude) : 'Ingen position vald'}
                        </dd>
                    </dl>
                    {!pin && formatPlacementAddress(address) && (
                        <p className="mt-2 text-xs text-gray-500">Utan vald position visas bara adressen i mobilen och navigering startar inte med exakt läge.</p>
                    )}
                </div>

                <div className="min-w-0">
                    <div className="h-[420px] overflow-hidden rounded-sm border border-gray-300">
                        {isOpen && (
                            <MapContainer
                                center={[initialCenter.latitude, initialCenter.longitude]}
                                zoom={initialCenter.zoom}
                                scrollWheelZoom
                                className="h-full w-full"
                            >
                                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
                                <MapViewController view={view} />
                                <MapClickHandler onPick={handlePick} />
                                {pin && (
                                    <Marker
                                        position={[pin.latitude, pin.longitude]}
                                        icon={pinIcon}
                                        draggable
                                        eventHandlers={{
                                            dragend: (event) => {
                                                const { lat, lng } = event.target.getLatLng()
                                                handlePick(lat, lng)
                                            },
                                        }}
                                    />
                                )}
                            </MapContainer>
                        )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Klicka på kartan för att sätta exakt position. Dra i markören för att justera den.</p>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-6">
                <ActionButton label="Rensa" icon={Trash2} accent="rose" onClick={handleClear} disabled={!pin && !formatPlacementAddress(address)} />
                <div className="flex gap-6">
                    <ActionButton label="Avbryt" icon={X} accent="orange" onClick={onClose} />
                    <ActionButton label="Använd plats" icon={Save} accent="lime" onClick={handleApply} />
                </div>
            </div>
        </dialog>,
        document.body,
    )
}
