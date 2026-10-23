import type { AppState } from '../types.ts'

const KEY = 'trafficware.v1'

/**
 * Browser stand-in for the central database.
 * Swap this module for Firebase (or another backend) later.
 * Screens only talk to the store, and the store only loads and saves here.
 */
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppState
    if (parsed?.version !== 1) return null
    if (!Array.isArray(parsed.people) || !Array.isArray(parsed.bookings)) return null
    if (!parsed.settings || !Array.isArray(parsed.integrations)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearState() {
  localStorage.removeItem(KEY)
}
