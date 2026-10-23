import type { AppState, Booking, Docket, DocketSiteCheck, Geofence, HomeState, SiteCheck } from '../types.ts'
import { AU_STATES } from './conduct.ts'
import { fenceFor } from './fences.ts'

const KEY = 'trafficware.v1'
const HOME_STATES = new Set<string>(AU_STATES)

function homeStateOf(value: unknown): HomeState {
  return typeof value === 'string' && HOME_STATES.has(value) ? value as HomeState : 'VIC'
}

function cleanFence(value: unknown, id: string): Geofence | null {
  if (value === undefined) return fenceFor(id)
  if (value === null || typeof value !== 'object') return value === null ? null : fenceFor(id)
  const fence = value as Geofence
  if (typeof fence.lat !== 'number' || typeof fence.lng !== 'number' || typeof fence.radiusM !== 'number') return null
  return { lat: fence.lat, lng: fence.lng, radiusM: fence.radiusM }
}

function cleanChecks(value: unknown): SiteCheck[] {
  if (!Array.isArray(value)) return []
  const checks: SiteCheck[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const check = item as SiteCheck
    if (
      typeof check.id !== 'string'
      || typeof check.personId !== 'string'
      || typeof check.at !== 'string'
      || typeof check.lat !== 'number'
      || typeof check.lng !== 'number'
      || typeof check.accuracyM !== 'number'
      || typeof check.distanceM !== 'number'
      || typeof check.inside !== 'boolean'
    ) continue
    checks.push(check)
    if (checks.length === 12) break
  }
  return checks
}

function cleanSiteCheck(value: unknown): DocketSiteCheck | null {
  if (!value || typeof value !== 'object') return null
  const check = value as DocketSiteCheck
  if (typeof check.inside !== 'boolean' || typeof check.distanceM !== 'number' || typeof check.accuracyM !== 'number' || typeof check.at !== 'string') {
    return null
  }
  return check
}

function normalizeBooking(booking: Booking): Booking {
  return {
    ...booking,
    geofence: cleanFence(booking.geofence, booking.id),
    siteChecks: cleanChecks(booking.siteChecks),
  }
}

function normalizeDocket(docket: Docket): Docket {
  return { ...docket, siteCheck: cleanSiteCheck(docket.siteCheck) }
}

export function normalizeState(raw: AppState): AppState {
  return {
    ...raw,
    settings: { ...raw.settings, homeState: homeStateOf(raw.settings.homeState) },
    bookings: raw.bookings.map(normalizeBooking),
    dockets: Array.isArray(raw.dockets) ? raw.dockets.map(normalizeDocket) : [],
    outbox: Array.isArray(raw.outbox) ? raw.outbox.map(normalizeDocket) : [],
  }
}

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
    return normalizeState(parsed)
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
