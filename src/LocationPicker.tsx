import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { formatCoordinates, parseCoordinates } from './coordinates'
import './AdminPanel.css'

const pinIcon = L.divIcon({ className: 'guess-pin-wrapper', html: '<span class="guess-pin"><span></span></span>', iconSize: [28, 36], iconAnchor: [14, 34] })

function MapController({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
	const map = useMap()
	useMapEvents({ click: ({ latlng }) => onPick(latlng.lat, latlng.lng) })
	useEffect(() => {
		if (!map.getBounds().pad(-0.15).contains([lat, lng])) map.panTo([lat, lng])
	}, [map, lat, lng])
	return null
}

export default function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
	const [text, setText] = useState(() => formatCoordinates(lat, lng))
	const typed = useRef(false)

	useEffect(() => {
		if (typed.current) { typed.current = false; return }
		setText(formatCoordinates(lat, lng))
	}, [lat, lng])

	const invalid = text.trim() !== '' && parseCoordinates(text) === null

	const updateText = (value: string) => {
		setText(value)
		const parsed = parseCoordinates(value)
		if (!parsed) return
		typed.current = parsed.lat !== lat || parsed.lng !== lng
		onChange(parsed.lat, parsed.lng)
	}

	const place = (nextLat: number, nextLng: number) => onChange(Number(nextLat.toFixed(6)), Number(nextLng.toFixed(6)))

	return <div className="admin-field admin-field-wide admin-location">
		<label className="admin-field"><span>LOCATION · PASTE (LAT, LONG)</span>
			<input value={text} onChange={(event) => updateText(event.target.value)} onBlur={() => { if (parseCoordinates(text)) setText(formatCoordinates(lat, lng)) }} placeholder="(30.6188, -96.3365)" aria-invalid={invalid} inputMode="text" spellCheck={false} autoComplete="off" />
		</label>
		{invalid && <small className="admin-location-error">Use decimal degrees, e.g. 30.6188, -96.3365, or degrees/minutes/seconds, e.g. 30°37'08.5"N 96°20'13.2"W (parentheses optional).</small>}
		<MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom className="admin-map">
			<TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
			<MapController lat={lat} lng={lng} onPick={place} />
			<Marker position={[lat, lng]} icon={pinIcon} draggable eventHandlers={{ dragend: (event) => { const point = (event.target as L.Marker).getLatLng(); place(point.lat, point.lng) } }} />
		</MapContainer>
		<small>Drag the pin, click the map, or pan the map and click to place it. Changes update the coordinates above.</small>
	</div>
}
