import type { Geofence } from '../types.ts'

/** Public-place centres for the sample week. Radius covers GPS error and a small worksite. */
export const SAMPLE_FENCES: Record<string, Geofence> = {
    'b-princes': { lat: -37.8315, lng: 144.8832, radiusM: 250 },
    'b-marvel': { lat: -37.816, lng: 144.947, radiusM: 250 },
    'b-m80': { lat: -37.7, lng: 144.85, radiusM: 250 },
    'b-geelong': { lat: -38.15, lng: 144.36, radiusM: 250 },
    'b-footscray': { lat: -37.801, lng: 144.903, radiusM: 250 },
    'b-ballarat': { lat: -37.562, lng: 143.85, radiusM: 250 },
}

export function fenceFor(id: string): Geofence | null {
    return SAMPLE_FENCES[id] ?? null
}
