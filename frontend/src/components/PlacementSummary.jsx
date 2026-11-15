import { lazy, Suspense } from 'react'
import { formatCoordinates, formatPlacementAddress, getPlacement } from '../lib/placementLocation'

const PlacementMapPreview = lazy(() => import('./PlacementMapPreview'))

export default function PlacementSummary({ reservation, onOpen }) {
    const placement = getPlacement(reservation)
    const address = formatPlacementAddress(placement)
    const coordinates = formatCoordinates(placement.latitude, placement.longitude)

    return (
        <div className="relative isolate">
            <button
                type="button"
                aria-label="Öppna placering"
                aria-haspopup="dialog"
                title="Öppna placering"
                onClick={onOpen}
                className="absolute inset-0 z-[900] w-full cursor-pointer rounded-sm hover:ring-1 hover:ring-teal-600 focus-visible:outline-2 focus-visible:outline-teal-600"
            />
            {coordinates && (
                <Suspense fallback={<div className="h-32 rounded-sm border border-gray-300 bg-gray-100" />}>
                    <PlacementMapPreview
                        key={`${placement.latitude},${placement.longitude}`}
                        latitude={placement.latitude}
                        longitude={placement.longitude}
                    />
                </Suspense>
            )}
            {!coordinates && (
                <p className="mt-1 text-xs text-gray-500">{address ? 'Ingen position vald' : 'Ingen plats vald'}</p>
            )}
            {/* <p className="mt-1 break-words text-xs text-gray-700">
                {address}
                {coordinates && <span className="block text-gray-500">{coordinates}</span>}
            </p> */}
        </div>
    )
}
