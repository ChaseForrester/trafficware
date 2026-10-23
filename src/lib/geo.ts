import type { Geofence } from '../types.ts'

const EARTH_M = 6_371_000

export function distanceMetres(aLat: number, aLng: number, bLat: number, bLng: number) {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(bLat - aLat)
    const dLng = toRad(bLng - aLng)
    const lat1 = toRad(aLat)
    const lat2 = toRad(bLat)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function insideFence(lat: number, lng: number, fence: Geofence) {
    return distanceMetres(lat, lng, fence.lat, fence.lng) <= fence.radiusM
}

export type FenceDraft = { lat: string; lng: string; radiusM: string }

export function fenceDraft(fence: Geofence | null | undefined): FenceDraft {
    if (!fence) return { lat: '', lng: '', radiusM: '250' }
    return { lat: String(fence.lat), lng: String(fence.lng), radiusM: String(fence.radiusM) }
}

/** Empty fields clear the boundary. A half-filled pin, or a radius outside 50–5000 m, is rejected. */
export function parseFence(draft: FenceDraft): Geofence | null | 'bad' {
    const latText = draft.lat.trim()
    const lngText = draft.lng.trim()
    if (!latText && !lngText) return null
    const lat = Number(latText)
    const lng = Number(lngText)
    const radiusM = Number((draft.radiusM.trim() || '250'))
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusM)) return 'bad'
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'bad'
    if (radiusM < 50 || radiusM > 5000) return 'bad'
    return { lat, lng, radiusM: Math.round(radiusM) }
}
