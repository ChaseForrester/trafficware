import { useEffect, useRef } from 'react'
import { circle, map, tileLayer } from 'leaflet'
import type { Circle, LeafletMouseEvent, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Props = {
    lat: number
    lng: number
    radiusM: number
    onPick: (lat: number, lng: number) => void
}

export default function SiteMap({ lat, lng, radiusM, onPick }: Props) {
    const host = useRef<HTMLDivElement>(null)
    const mapRef = useRef<LeafletMap | null>(null)
    const ringRef = useRef<Circle | null>(null)
    const onPickRef = useRef(onPick)
    const pointRef = useRef({ lat, lng })

    useEffect(() => {
        onPickRef.current = onPick
        pointRef.current = { lat, lng }
    })

    useEffect(() => {
        const node = host.current
        if (!node || mapRef.current) return
        const first = pointRef.current
        const next = map(node, { scrollWheelZoom: false }).setView([first.lat, first.lng], 16)
        tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(next)
        next.on('click', (event: LeafletMouseEvent) => {
            onPickRef.current(event.latlng.lat, event.latlng.lng)
        })
        mapRef.current = next
        const frame = requestAnimationFrame(() => next.invalidateSize())
        return () => {
            cancelAnimationFrame(frame)
            next.remove()
            mapRef.current = null
            ringRef.current = null
        }
    }, [])

    useEffect(() => {
        const next = mapRef.current
        if (!next) return
        const metres = radiusM > 0 ? radiusM : 250
        if (!ringRef.current) {
            ringRef.current = circle([lat, lng], {
                radius: metres,
                color: '#f34f27',
                weight: 2,
                fillColor: '#f34f27',
                fillOpacity: 0.2,
            }).addTo(next)
        } else {
            ringRef.current.setLatLng([lat, lng])
            ringRef.current.setRadius(metres)
        }
        next.fitBounds(ringRef.current.getBounds().pad(0.35))
    }, [lat, lng, radiusM])

    return <div ref={host} className="site-map" role="application" aria-label="Site map. Click to place the pin." />
}
