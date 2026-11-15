import { useState } from 'react'
import L from 'leaflet'
import { AttributionControl, MapContainer, Marker, TileLayer } from 'react-leaflet'
import { TILE_ATTRIBUTION, TILE_URL } from '../lib/placementMap'
import previewPin from '../assets/placement-preview-pin.svg'

const previewPinIcon = L.icon({
    iconUrl: previewPin,
    iconSize: [20, 28],
    iconAnchor: [10, 27],
})

export default function PlacementMapPreview({ latitude, longitude }) {
    const [tileError, setTileError] = useState(false)
    const position = [latitude, longitude]

    return (
        <div role="group" aria-label="Karta över placering">
            <MapContainer
                center={position}
                zoom={16}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
                boxZoom={false}
                keyboard={false}
                className="relative h-32 w-full overflow-hidden rounded-sm border border-gray-300 [&_.leaflet-control-attribution]:text-[8px]"
            >
                <TileLayer
                    url={TILE_URL}
                    attribution={TILE_ATTRIBUTION}
                    maxZoom={19}
                    eventHandlers={{ tileerror: () => setTileError(true) }}
                />
                <Marker position={position} icon={previewPinIcon} interactive={false} keyboard={false} />
                <AttributionControl prefix={false} />
            </MapContainer>
            {tileError && <p role="status" className="mt-1 text-xs text-rose-700">Kunde inte ladda kartan.</p>}
        </div>
    )
}
